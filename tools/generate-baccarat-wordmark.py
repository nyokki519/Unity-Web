"""Original outlined community wordmark; existing OFL Cormorant font, no source logo."""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
root=Path(__file__).resolve().parents[1];font=TTFont(root/'public/assets/fonts/cormorant-garamond-latin.woff');glyphs=font.getGlyphSet();cmap=font.getBestCmap()
def word(text,y,width,spacing):
 names=[cmap[ord(c)] for c in text];units=sum(glyphs[n].width for n in names)+spacing*(len(names)-1);scale=width/units;offset=(620-width)/2;paths=[]
 for name in names:
  pen=SVGPathPen(glyphs);glyphs[name].draw(TransformPen(pen,(scale,0,0,-scale,offset,y)));paths.append('<path d="'+pen.getCommands()+'"/>');offset+=(glyphs[name].width+spacing)*scale
 return ''.join(paths)
svg='<svg xmlns="http://www.w3.org/2000/svg" width="620" height="214" viewBox="0 0 620 214" role="img" aria-labelledby="title desc"><title id="title">Unity Baccarat</title><desc id="desc">Unity community original upright serif wordmark</desc><defs><linearGradient id="gold" x2="0" y2="1"><stop stop-color="#fff2bc"/><stop offset=".55" stop-color="#dcc077"/><stop offset="1" stop-color="#b18b3e"/></linearGradient></defs><g fill="url(#gold)">'+word('UNITY',48,120,150)+word('BACCARAT',143,552,35)+'</g><g fill="none" stroke="#ddc482" stroke-width="1.5"><path d="M70 172h206m68 0h206"/><path d="M295 172l15-12 15 12-15 12z"/><path d="M291 172h-10m48 0h10"/></g></svg>'
p=root/'public/baccarat/salon-assets/unity-baccarat-wordmark.svg';p.write_text(svg);print(p)
