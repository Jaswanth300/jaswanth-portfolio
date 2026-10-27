# Naga Jaswanth — Interactive Portfolio

A custom, static portfolio designed around an experimental engineering field-lab concept. Built with semantic HTML, CSS, and vanilla JavaScript; no build step or framework is required.

## Features

- Responsive editorial layout with custom neural-network canvas art
- Reduced-motion support and keyboard-accessible navigation
- `Ctrl/Cmd + K` command palette and single-key navigation shortcuts
- Filterable project index and accessible project case-study dialogs
- Local-only URL pattern inspector with transparent heuristic scoring (not the trained model, not a safety verdict)
- Custom SVG favicon, metadata, and GitHub project links
- No tracking scripts, backend, API keys, or external data collection

## Run locally

Open `index.html` in a browser, or start a static server from this directory:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000`.

## Deploy to GitHub Pages

1. Create a public repository named `jaswanth-portfolio` under your GitHub account.
2. Upload the contents of this folder to the repository root (the `index.html` file must be at the root).
3. Open **Settings → Pages**.
4. Choose **Deploy from a branch**, select `main` and `/ (root)`, then save.
5. GitHub Pages will publish the site at `https://jaswanth300.github.io/jaswanth-portfolio/` after the deployment completes.

## Content and evidence notes

- The 90.6% SVM accuracy is described as the project's reported test accuracy, not a universal guarantee.
- The visual charts on the stress and result projects are explicitly labelled illustrative, not actual measured results.
- The URL inspector is a hand-written educational heuristic. It does not call the trained phishing classifier, fetch URLs, or provide a reliable security verdict.
- Review project links, claims, and personal details before sharing publicly.

## Customise

Edit project details in `index.html` and case-study copy in `script.js`. Colors, typography, spacing, and responsive breakpoints live in `styles.css`.
