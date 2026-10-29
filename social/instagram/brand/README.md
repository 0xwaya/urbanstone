# Brand assets
- `logo.tex`: TikZ source of the Urban Stone logo (gold chevron + three towers + wordmark). Copied from /workspace/urbanstone/brand/.
- `logo.pdf`: compiled from logo.tex. `render_logo.sh` recompiles it if a TeX engine (tectonic/pdflatex) exists, else reuses logo.pdf, then renders `logo.png` (transparent, 1200 dpi) and `logo.svg` with pdftocairo.
- `logo-icon.png`: the chevron + three towers only, cropped from logo.png. This is the post stamp.
- Overlay colors in config.json (navy #0B1220, gold #C4A35A) are Edward's Instagram spec; the logo itself keeps its TikZ golds (colors.txt).
