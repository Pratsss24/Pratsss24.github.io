# pratsss24.github.io

Source for <https://pratsss24.github.io> — a front page for seventeen public
engineering repositories: manufacturing analytics, quality, metrology and
simulation first, applied statistics on Formula 1 timing data second.

Hand-written static site. No framework, no build step, no dependencies.

```
index.html     the whole page, including every project card
style.css      light and dark, one set of custom properties
site.js        group filter, figure lightbox, colour-scheme toggle
figures/       one representative PNG per project, copied from each repo's out/
```

Serve it locally with anything that serves a directory:

```bash
python -m http.server 8000
```

## Adding a project

Copy its representative figure into `figures/<repo-name>.png`, duplicate a
`<article class="card">` block in `index.html`, and update the count in the
filter bar. Figure `width`/`height` attributes are the PNG's real pixel size,
so the layout does not shift while images load.

## Why the figures are copied, not hot-linked

Each project repository commits its `out/` directory, so the PNGs are already
public and could be linked from `raw.githubusercontent.com`. They are copied
here instead: the site then has no cross-repository runtime dependency, it
keeps working if a project repository is renamed or its figures are
regenerated, and it serves from one origin. The cost is that a regenerated
figure has to be copied over again.
