(() => {
  'use strict';
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  $('#year').textContent = new Date().getFullYear();

  // Small canvas artwork: local-only, pointer-reactive, and respectful of reduced motion.
  const canvas = $('#network-canvas');
  const ctx = canvas?.getContext('2d');
  if (canvas && ctx) {
    let width = 0, height = 0, points = [], raf = 0;
    const pointer = { x: -999, y: -999 };
    function resize() {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width; height = rect.height;
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.max(35, Math.min(80, Math.round(width * height / 4700)));
      points = Array.from({ length: count }, (_, i) => ({
        x: Math.random() * width, y: Math.random() * height,
        ox: Math.random() * width, oy: Math.random() * height,
        phase: Math.random() * Math.PI * 2, r: i % 8 === 0 ? 2.2 : 1.15
      }));
      draw(0);
    }
    function draw(time) {
      ctx.clearRect(0, 0, width, height);
      const t = reducedMotion ? 0 : time * .00025;
      const coords = points.map(p => {
        const x = p.ox + Math.sin(t + p.phase) * (reducedMotion ? 0 : 13) + (Math.abs(pointer.x - p.ox) < 100 ? (pointer.x - p.ox) * .07 : 0);
        const y = p.oy + Math.cos(t * 1.3 + p.phase) * (reducedMotion ? 0 : 13) + (Math.abs(pointer.y - p.oy) < 100 ? (pointer.y - p.oy) * .07 : 0);
        return { ...p, x, y };
      });
      for (let i = 0; i < coords.length; i++) {
        for (let j = i + 1; j < coords.length; j++) {
          const a = coords[i], b = coords[j], d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < 90) {
            ctx.strokeStyle = `rgba(184, 230, 132, ${.2 * (1 - d / 90)})`;
            ctx.lineWidth = .7; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
        const p = coords[i];
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = i % 8 === 0 ? '#d4ff73' : 'rgba(198, 225, 174, .7)'; ctx.fill();
      }
      if (!reducedMotion) raf = requestAnimationFrame(draw);
    }
    canvas.addEventListener('pointermove', e => { const r = canvas.getBoundingClientRect(); pointer.x = e.clientX - r.left; pointer.y = e.clientY - r.top; });
    canvas.addEventListener('pointerleave', () => { pointer.x = pointer.y = -999; });
    window.addEventListener('resize', () => { cancelAnimationFrame(raf); resize(); });
    resize();
  }

  // Project filters.
  $$('.filter').forEach(button => button.addEventListener('click', () => {
    const filter = button.dataset.filter;
    $$('.filter').forEach(b => { const active = b === button; b.classList.toggle('is-active', active); b.setAttribute('aria-pressed', String(active)); });
    $$('.project-row').forEach(row => { row.hidden = filter !== 'all' && !row.dataset.category.split(' ').includes(filter); });
  }));

  // URL signal inspector: intentionally a simple, transparent heuristic, not the trained model.
  const urlInput = $('#url-input'), scoreNode = $('#risk-score'), levelNode = $('#risk-level'), gauge = $('#risk-gauge-fill'), output = $('#console-output'), signalList = $('#signal-list');
  function inspectUrl(raw) {
    const checks = [];
    let url;
    try { url = new URL(raw.trim()); if (!['http:', 'https:'].includes(url.protocol)) throw new Error('unsupported'); }
    catch { output.innerHTML = '<span class="output-prefix">[ INPUT ERROR ]</span> Enter a valid http:// or https:// URL. Nothing was sent anywhere.'; scoreNode.textContent = '—'; levelNode.textContent = 'INVALID'; gauge.style.width = '0%'; signalList.innerHTML = '<div><span class="signal-led signal-warn"></span><span>URL format</span><b>CHECK INPUT</b></div>'; return; }
    let score = 0;
    const host = url.hostname.toLowerCase(), full = `${url.hostname}${url.pathname}${url.search}`.toLowerCase();
    const isHttps = url.protocol === 'https:';
    const longUrl = raw.length > 75;
    const manyHyphens = (host.match(/-/g) || []).length >= 2;
    const manySubdomains = host.split('.').length >= 5;
    const hasIp = /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
    const bait = /verify|login|signin|secure|account|update|password|wallet|confirm|support|recover/.test(full);
    const punycode = host.includes('xn--');
    const oddPort = url.port && !['80', '443'].includes(url.port);
    const shortener = /^(bit\.ly|tinyurl\.com|t\.co|is\.gd|cutt\.ly)$/i.test(host);
    const items = [
      ['HTTPS scheme', isHttps, isHttps ? 'HTTPS PRESENT' : 'HTTP ONLY', isHttps ? 0 : 18],
      ['URL length', !longUrl, longUrl ? 'LONG URL' : 'NORMAL LENGTH', longUrl ? 10 : 0],
      ['Hyphen pattern', !manyHyphens, manyHyphens ? 'MULTIPLE HYPHENS' : 'NO STRONG SIGNAL', manyHyphens ? 12 : 0],
      ['Subdomain depth', !manySubdomains, manySubdomains ? 'MANY LABELS' : 'NO STRONG SIGNAL', manySubdomains ? 14 : 0],
      ['IP / encoded host', !hasIp && !punycode, hasIp ? 'IP HOST' : punycode ? 'PUNYCODE HOST' : 'NO STRONG SIGNAL', hasIp || punycode ? 22 : 0],
      ['Bait terms', !bait, bait ? 'SENSITIVE TERM FOUND' : 'NONE FOUND', bait ? 12 : 0],
      ['Redirect / port hints', !shortener && !oddPort, shortener ? 'SHORTENER DOMAIN' : oddPort ? 'UNUSUAL PORT' : 'NO STRONG SIGNAL', shortener || oddPort ? 12 : 0]
    ];
    items.forEach(([, , , points]) => score += points);
    score = Math.min(100, score);
    const level = score >= 45 ? 'ELEVATED' : score >= 20 ? 'CAUTION' : 'LOW SIGNAL';
    scoreNode.textContent = String(score); levelNode.textContent = level; gauge.style.width = `${score}%`;
    gauge.style.background = score >= 45 ? 'var(--red)' : score >= 20 ? '#e6ca68' : 'var(--acid)';
    signalList.innerHTML = items.map(([label, okay, text, points]) => `<div><span class="signal-led ${points ? 'signal-warn' : 'signal-good'}"></span><span>${label}</span><b>${text}</b></div>`).join('');
    output.innerHTML = `<span class="output-prefix">[ INSPECTED ]</span> ${escapeHtml(url.hostname)}<br><span class="output-prefix">[ RESULT ]</span> ${level} · ${items.filter(i => i[3] > 0).length} signal(s) flagged.<br><span class="output-prefix">[ NOTE ]</span> This score is a hand-written heuristic, not a probability or the trained ML model.`;
  }
  function escapeHtml(value) { return value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]); }
  $('#inspect-url').addEventListener('click', () => inspectUrl(urlInput.value));
  urlInput.addEventListener('keydown', e => { if (e.key === 'Enter') inspectUrl(urlInput.value); });
  $$('[data-sample]').forEach(b => b.addEventListener('click', () => { urlInput.value = b.dataset.sample; inspectUrl(urlInput.value); }));
  inspectUrl(urlInput.value);

  // Case-study dialogs. Claims are deliberately limited to known project facts.
  const cases = {
    phishing: {title:'Phishing URL Detection', accent:'A security problem, treated as a model-evaluation problem.', lead:'A machine-learning pipeline that compares classifiers on structured URL features to distinguish legitimate websites from phishing attempts.', blocks:[['THE QUESTION','Can URL-derived features support a useful first-pass phishing classifier, and how do different models compare on the same evaluation setup?'],['THE APPROACH','The project benchmarks Logistic Regression, Support Vector Machine (SVM), and a tuned Random Forest. Random Forest hyperparameters are explored with GridSearchCV; evaluation includes accuracy, precision, recall, F1-score, and confusion matrices.'],['REPORTED RESULT','SVM recorded the best reported test accuracy at 90.6%, followed by tuned Random Forest at about 90.1% and Logistic Regression at about 88.2%. These figures describe this project’s test run, not expected performance on every real-world URL.'],['ENGINEERING NOTES','The repository includes model serialization and a Flask REST API for predictions. The next quality checks should include leakage review, class-wise error analysis, reproducible data splits, and drift testing.']], caution:'A classifier output is not a guarantee that a website is safe or malicious. Do not use this demo as a browser protection tool. Review the repository for the implementation and dataset details.',url:'https://github.com/Jaswanth300/Phishing-URL-Detection'},
    stress: {title:'Student Stress Prediction',accent:'A classification experiment with an interpretability lens.',lead:'A Decision Tree-based machine-learning project exploring classification from student-related data.',blocks:[['THE QUESTION','Can a simple classification model learn patterns in the available student-stress dataset, and how can its mistakes be inspected?'],['THE APPROACH','The project uses a Decision Tree and evaluates results with accuracy and a confusion matrix, alongside feature-importance visualisation.'],['WHAT MATTERS','A single score cannot describe every error. Class balance, false positives, false negatives, data quality, and the meaning of each feature matter when interpreting the model.'],['NEXT INVESTIGATION','Validate the data collection process, document the target definition, compare a baseline with alternative models, and use appropriate metrics before making any real-world claims.']],caution:'Stress prediction is sensitive and context-dependent. This project should be treated as a learning experiment, not as a clinical or individual assessment tool.',url:'https://github.com/Jaswanth300/Student-Stress-Prediction'},
    results: {title:'Student Result Prediction',accent:'Prediction is only useful when error is understood.',lead:'A regression project that predicts student scores and compares estimates against observed outcomes.',blocks:[['THE QUESTION','How closely can a simple regression model estimate scores from the available dataset?'],['THE APPROACH','The project explores Linear Regression and reports evaluation with Mean Absolute Error (MAE) and R², supported by an actual-versus-predicted plot.'],['HOW TO READ IT','MAE expresses typical absolute error in the target’s units. R² describes fit relative to a baseline; it is not an accuracy percentage and can be negative on held-out data.'],['NEXT INVESTIGATION','Check the split strategy, compare against a simple baseline, inspect residuals, and ensure the features would be available at prediction time.']],caution:'The scatter visual on this page is illustrative and is not copied from the project’s measured predictions. Use the repository for the actual code and results.',url:'https://github.com/Jaswanth300/Student-Result-Prediction'}
  };
  const caseDialog = $('#case-dialog'), caseContent = $('#case-content');
  $$('[data-case]').forEach(button => button.addEventListener('click', () => {
    const data = cases[button.dataset.case];
    caseContent.innerHTML = `<h2>${escapeHtml(data.title)}</h2><p class="case-lead">${escapeHtml(data.accent)} ${escapeHtml(data.lead)}</p><div class="case-grid">${data.blocks.map(([h, p]) => `<section class="case-block"><h3>${escapeHtml(h)}</h3><p>${escapeHtml(p)}</p></section>`).join('')}</div><div class="case-caution">${escapeHtml(data.caution)}</div><p style="margin-top:24px"><a class="button button-primary" href="${data.url}" target="_blank" rel="noreferrer">Open source repository ↗</a></p>`;
    if (typeof caseDialog.showModal === 'function') { caseDialog.showModal(); document.body.classList.add('modal-open'); }
  }));
  $$('.case-close').forEach(button => button.addEventListener('click', () => caseDialog.close()));
  caseDialog.addEventListener('close', () => document.body.classList.remove('modal-open'));
  caseDialog.addEventListener('click', e => { if (e.target === caseDialog) caseDialog.close(); });

  // Command menu supports search, keyboard access, and Escape dismissal.
  const overlay = $('#command-overlay'), commandInput = $('#command-input'), commandItems = $('#command-items');
  let lastFocused = null, activeIndex = 0;
  function openCommand() { lastFocused = document.activeElement; overlay.hidden = false; document.body.classList.add('modal-open'); commandInput.value = ''; filterCommands(''); commandInput.focus(); }
  function closeCommand() { overlay.hidden = true; document.body.classList.remove('modal-open'); if (lastFocused?.focus) lastFocused.focus(); }
  function filterCommands(query) { const q = query.toLowerCase(); const items = $$('button,a', commandItems); items.forEach(item => { item.hidden = !item.textContent.toLowerCase().includes(q); }); activeIndex = 0; }
  $$('.command-trigger').forEach(b => b.addEventListener('click', openCommand));
  $$('[data-close-command]').forEach(b => b.addEventListener('click', closeCommand));
  commandInput.addEventListener('input', () => filterCommands(commandInput.value));
  commandItems.addEventListener('click', e => { const item = e.target.closest('[data-command]'); if (!item) return; closeCommand(); document.getElementById(item.dataset.command)?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' }); });
  commandInput.addEventListener('keydown', e => {
    const items = $$('button:not([hidden]),a:not([hidden])', commandItems);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); activeIndex = (activeIndex + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length; items[activeIndex]?.focus(); }
    if (e.key === 'Enter' && items[activeIndex]) items[activeIndex].click();
  });
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); overlay.hidden ? openCommand() : closeCommand(); }
    if (e.key === 'Escape' && !overlay.hidden) closeCommand();
    if (overlay.hidden && !e.ctrlKey && !e.metaKey && !e.altKey && !['INPUT','TEXTAREA'].includes(document.activeElement.tagName)) {
      const map = { w:'work', l:'lab', f:'log', c:'contact', g:null };
      const target = map[e.key.toLowerCase()]; if (target) document.getElementById(target)?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' }); else if (e.key.toLowerCase() === 'g') window.open('https://github.com/Jaswanth300','_blank','noopener,noreferrer');
    }
  });
  const menuToggle = $('.menu-toggle'), nav = $('.desktop-nav');
  menuToggle.addEventListener('click', () => { const open = menuToggle.getAttribute('aria-expanded') !== 'true'; menuToggle.setAttribute('aria-expanded', String(open)); nav.classList.toggle('is-open', open); });
  $$('.desktop-nav a').forEach(a => a.addEventListener('click', () => { nav.classList.remove('is-open'); menuToggle.setAttribute('aria-expanded','false'); }));
  const toast = $('#toast'); let toastTimer;
  function showToast(text) { toast.textContent = text; toast.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('show'), 2200); }
  $('#copy-handle').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText('Jaswanth300'); $('#copy-feedback').textContent = 'Handle copied to clipboard.'; showToast('GitHub handle copied'); }
    catch { $('#copy-feedback').textContent = 'Visit github.com/Jaswanth300 to connect.'; showToast('GitHub: Jaswanth300'); }
  });
})();
