#!/usr/bin/env bash
# Render the Urban Stone chevron logo from its TikZ source (brand/logo.tex).
# - If a TeX engine (tectonic or pdflatex) is installed, logo.tex is compiled to logo.pdf first.
# - Otherwise the committed logo.pdf (compiled from the same logo.tex) is used.
# Output: logo.png (transparent, high-res) and logo.svg, via poppler's pdftocairo.
set -euo pipefail
cd "$(dirname "$0")"
if command -v tectonic >/dev/null; then tectonic -q logo.tex
elif command -v pdflatex >/dev/null; then pdflatex -interaction=nonstopmode logo.tex >/dev/null
else echo "no TeX engine found; using committed logo.pdf" >&2; fi
pdftocairo -png -transp -singlefile -r 1200 logo.pdf logo
pdftocairo -svg logo.pdf logo.svg
echo "rendered logo.png + logo.svg"
