#!/usr/bin/env python3
"""Original Vesper molded-clay chips; deterministic SVG, no downloaded artwork."""
from pathlib import Path
import base64, math
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
ROOT=Path(__file__).resolve().parents[1]
FONT=Path('/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf')
font=TTFont(FONT); glyphs=font.getGlyphSet(); cmap=font.getBestCmap()
crest=base64.b64encode((ROOT/'public/baccarat/art/unity-engraving.png').read_bytes()).decode()
# Palette, insert frequency, and distinct sub-insert arrangements identify every value.
SPECS=[(100,'1','#c7c0ac','#e9dfc2','#343b43',8,1),(500,'5','#9a3b48','#ce6a70','#f1d9b1',6,2),(1000,'10','#285e78','#4e91a4','#e4c88e',8,2),(5000,'50','#367467','#64a18b','#ead3a2',10,1),(10000,'100','#584778','#8e78ad','#e6c58f',6,3),(50000,'500','#292e3d','#53596c','#cba770',8,3)]
def digits(text):
    pieces=[];x=0
    for ch in text:
        name=cmap[ord(ch)]; pen=SVGPathPen(glyphs); glyphs[name].draw(pen)
        pieces.append(f'<path transform="translate({x} 0)" d="{pen.getCommands()}"/>');x+=font['hmtx'][name][0]
    scale=min(0.031,108/x)
    return f'<g transform="translate({128-x*scale/2:.3f} 155) scale({scale} {-scale})">'+''.join(pieces)+'</g>'
def generate(amount,label,base,light,insert,n,sub):
    edge=[]
    for i in range(n):
        a=i*360/n
        edge.append(f'<g transform="rotate({a} 128 128)"><path d="M116 13 L140 13 L137 47 L119 47Z" fill="{insert}" stroke="#171b22" stroke-opacity=".25"/>')
        for j in range(sub):
            x=120+j*(16/max(1,sub-1)) if sub>1 else 128
            edge.append(f'<path d="M{x} 17 L{x} 41" stroke="{base}" stroke-width="2.4"/>')
        edge.append('</g>')
    ticks=''.join(f'<path transform="rotate({i*6} 128 128)" d="M128 32v4"/>' for i in range(60))
    etch=''.join(f'<ellipse cx="128" cy="128" rx="{70-i*2}" ry="{62-i*1.5}" transform="rotate({i*19} 128 128)"/>' for i in range(7))
    return f'''<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 256 256" role="img" aria-label="{label} Unity chip">
<defs><linearGradient id="clay" x2=".75" y2="1"><stop stop-color="{light}"/><stop offset=".45" stop-color="{base}"/><stop offset="1" stop-color="#171b25"/></linearGradient><linearGradient id="medal" x2=".7" y2="1"><stop stop-color="#f4e6bc"/><stop offset=".45" stop-color="#d5bd83"/><stop offset="1" stop-color="#a4864f"/></linearGradient><radialGradient id="face"><stop stop-color="{light}"/><stop offset="1" stop-color="{base}"/></radialGradient><filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".73" numOctaves="3" seed="{amount}"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope=".09"/></feComponentTransfer><feBlend in="SourceGraphic" mode="multiply"/></filter><clipPath id="disc"><circle cx="128" cy="125" r="116"/></clipPath></defs>
<circle cx="128" cy="132" r="119" fill="#111722"/><circle cx="128" cy="129" r="118" fill="{base}" stroke="#111722" stroke-width="3"/>
<g clip-path="url(#disc)"><circle cx="128" cy="125" r="117" fill="url(#clay)"/>{''.join(edge)}<circle cx="128" cy="125" r="114" fill="none" stroke="#fff6d3" stroke-opacity=".27" stroke-width="1.4"/><circle cx="128" cy="125" r="98" fill="none" stroke="#111722" stroke-opacity=".55" stroke-width="2"/><g stroke="#f4e5bd" stroke-opacity=".55" stroke-width="1">{ticks}</g><circle cx="128" cy="125" r="88" fill="url(#medal)" stroke="#111722" stroke-width="2"/><circle cx="128" cy="125" r="81" fill="url(#face)" stroke="#f1d8a0" stroke-width="1"/><g fill="none" stroke="#f6e2aa" stroke-width=".6" opacity=".19">{etch}</g><circle cx="128" cy="125" r="76" fill="none" stroke="#e4c792" stroke-dasharray="1 3" opacity=".65"/><g opacity=".8"><image x="114" y="61" width="28" height="36.5" xlink:href="data:image/png;base64,{crest}"/></g><path d="M92 103h72M104 169h48" stroke="#e8d19a" stroke-opacity=".55"/>
<g fill="#101c26" opacity=".45" transform="translate(0 1.6)">{digits(label)}</g><g fill="{'#28333d' if amount == 100 else '#fff0c9'}">{digits(label)}</g><g fill="#e5cc94"><path d="M100 180l4-3 4 3-4 3zM148 180l4-3 4 3-4 3z"/><path d="M116 180h24" stroke="#e5cc94" stroke-width="1"/></g><circle cx="128" cy="125" r="116" fill="transparent" filter="url(#grain)"/></g><path d="M34 61A113 113 0 0 1 205 39" fill="none" stroke="#fff7da" stroke-opacity=".25" stroke-width="2"/></svg>'''
for spec in SPECS:
    (ROOT/f'public/baccarat/chips/{spec[0]}.svg').write_text(generate(*spec))
print('Generated six original chip SVGs.')
