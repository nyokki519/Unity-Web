"""Original VESPER engraved deck. Exact indices/pips; no generated type or third-party art."""
from pathlib import Path
import json,math,base64
root=Path(__file__).resolve().parents[1];out=root/'public/baccarat/cards';out.mkdir(parents=True,exist_ok=True)
paths=['M10 1C6 6 1 8 1 12C1 17 7 18 9 14L7 20H13L11 14C13 18 19 17 19 12C19 8 14 6 10 1Z','M10 19C8 16 1 11 1 6C1 0 8 0 10 5C12 0 19 0 19 6C19 11 12 16 10 19Z','M10 0L19 10L10 20L1 10Z','M10 1C4 1 4 7 7 9C2 6 0 10 1 13C2 17 7 17 9 14L7 20H13L11 14C13 17 18 17 19 13C20 10 18 6 13 9C16 7 16 1 10 1Z']
positions={1:[(250,350)],2:[(250,185),(250,515)],3:[(250,185),(250,350),(250,515)],4:[(160,185),(340,185),(160,515),(340,515)],5:[(160,185),(340,185),(250,350),(160,515),(340,515)],6:[(x,y)for y in [185,350,515]for x in [160,340]],7:[(x,y)for y in [185,350,515]for x in [160,340]]+[(250,270)],8:[(x,y)for y in [185,350,515]for x in [160,340]]+[(250,270),(250,430)],9:[(x,y)for y in [170,290,410,530]for x in [160,340]]+[(250,350)],10:[(x,y)for y in [170,290,410,530]for x in [160,340]]+[(250,230),(250,470)]}
# Embedded original paper image works both data-URL card meshes and editable SVG masters.
paper='data:image/webp;base64,'+base64.b64encode((root/'public/baccarat/art/paper.webp').read_bytes()).decode()
mark='data:image/png;base64,'+base64.b64encode((root/'public/baccarat/art/unity-engraving.png').read_bytes()).decode()
def defs():
 return f'<defs><pattern id="paper" patternUnits="userSpaceOnUse" width="256" height="256"><image href="{paper}" width="256" height="256"/></pattern><linearGradient id="foil" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#7e642e"/><stop offset=".32" stop-color="#d3bd83"/><stop offset=".55" stop-color="#a18448"/><stop offset=".8" stop-color="#e4d3a4"/><stop offset="1" stop-color="#8e713c"/></linearGradient><pattern id="weave" width="5" height="5" patternUnits="userSpaceOnUse"><path d="M0 0L5 5M-2 2L2 6M3 -1L6 2" stroke="#c3ad77" stroke-width=".3" opacity=".2"/></pattern></defs>'
def pip(s,x,y,scale=3,cls=''):
 return f'<g class="{cls}" transform="translate({x},{y}) rotate({180 if y>350 else 0}) scale({scale}) translate(-10,-10)"><path d="{paths[s]}"/></g>'
def leaves(cx,cy,mirror=False):
 bits=[]
 for k in range(9):
  y=cy+k*13;x=cx+math.sin(k*.27)*12
  bits.append(f'<path d="M{x:.1f} {y}q-22 -20 -26 -3q5 14 26 3q21 -22 26 -4q-4 15 -26 4"/>')
 return '<g fill="none" stroke="url(#foil)" stroke-width="1.1">'+''.join(bits)+'</g>'
def court(rank,suit,col):
 # Original generated engraved illustration, exact suit/indices composed separately.
 name={11:'jack',12:'queen',13:'king'}[rank]
 src='data:image/webp;base64,'+base64.b64encode((root/f'public/baccarat/art/{name}.webp').read_bytes()).decode()
 frame='<rect x="115" y="126" width="270" height="448" rx="42" fill="#e9dec3" stroke="url(#foil)" stroke-width="2"/>'
 art=f'<defs><clipPath id="portrait"><rect x="122" y="133" width="256" height="434" rx="37"/></clipPath></defs><image href="{src}" x="122" y="133" width="256" height="434" preserveAspectRatio="xMidYMin slice" clip-path="url(#portrait)"/>'
 # Number/suit cannot be generated: two precise suit cartouches label the original court art.
 cartouche=f'<path d="M250 540L273 564L250 589L227 564Z" fill="{col}" stroke="url(#foil)" stroke-width="2"/>'
 stamp=f'<g fill="#f0e5c8">{pip(suit,250,564,1.1)}</g>'
 rules='<path d="M115 165V535M385 165V535M145 126H355M145 574H355" stroke="url(#foil)" stroke-width="1.4"/>'
 return f'<g data-court="{rank}-{suit}">{frame}{art}{rules}{cartouche}{stamp}</g>'

for suit in range(4):
 for rank in range(1,14):
  index=suit*13+rank-1;label={1:'A',11:'J',12:'Q',13:'K'}.get(rank,str(rank));col='#9b3446' if suit in [1,2] else '#143c39'
  corner=f'<g fill="{col}"><text x="29" y="102" font-family="Georgia,serif" font-weight="bold" font-size="94" letter-spacing="-6">{label}</text><g transform="translate(40,120) scale(2.9)"><path d="{paths[suit]}"/></g></g>'
  if rank<=10:
   content=''.join(pip(suit,x,y,6.4 if rank==1 else 2.8,'main-pip')for x,y in positions[rank])
   if rank==1:
    content=leaves(151,258)+leaves(349,258)+content+'<path d="M170 350Q170 240 250 218Q330 240 330 350Q330 460 250 482Q170 460 170 350Z" fill="none" stroke="url(#foil)" stroke-width="1.4"/>'
    content+=f'<image href="{mark}" x="231" y="500" width="38" height="50"/><g transform="rotate(180 250 350)"><image href="{mark}" x="231" y="500" width="38" height="50"/></g>'
  else:content=court(rank,suit,col)
  borders='<rect x="16" y="16" width="468" height="668" rx="20" fill="none" stroke="#c4ae7d" stroke-width="1"/><path d="M100 30H400M100 670H400M30 200V500M470 200V500" stroke="#c4ae7d" stroke-width=".6"/>'
  svg=f'<svg xmlns="http://www.w3.org/2000/svg" width="500" height="700" viewBox="0 0 500 700" data-rank="{rank}" data-suit="{suit}">{defs()}<rect x="2" y="2" width="496" height="696" rx="27" fill="url(#paper)" stroke="#d5c9ac" stroke-width="4"/>{borders}{corner}<g transform="rotate(180 250 350)">{corner}</g><g fill="{col}">{content}</g></svg>'
  (out/f'{index}.svg').write_text(svg)
# Bilaterally engraved botanical guilloche: repeat the entire half with180degree rotation.
lines=[]
for k in range(23):
 d=[]
 for j in range(151):
  t=j/150*math.pi*2;r=82+10*math.sin(t*9+k*.21);xx=250+math.cos(t)*r*(1+.008*k);yy=214+math.sin(t)*r*.74
  d.append(('M' if j==0 else 'L')+f'{xx:.2f} {yy:.2f}')
 lines.append('<path d="'+' '.join(d)+'Z"/>')
half='<g fill="none" stroke="url(#foil)"><path d="M35 350V72Q35 35 72 35H428Q465 35 465 72V350M47 350V74Q47 47 74 47H426Q453 47 453 74V350M66 350V91Q66 66 91 66H409Q434 66 434 91V350" stroke-width="2"/>'
half+='<g stroke-width=".45" opacity=".75">'+''.join(lines)+'</g>'
half+=leaves(100,118)+leaves(400,118)
half+='<path d="M145 350V182Q250 95 355 182V350M153 350V186Q250 107 347 186V350M164 350V194Q250 124 336 194V350" stroke-width="1.4"/><path d="M190 300Q250 277 310 300M195 307Q250 287 305 307" stroke-width="1"/></g>'
half+=f'<image href="{mark}" x="222" y="170" width="56" height="73"/><text x="250" y="278" text-anchor="middle" fill="#d4c18d" font-family="Georgia,serif" font-size="18" letter-spacing="6">VESPER</text><text x="250" y="93" text-anchor="middle" fill="#bfa774" font-family="Georgia,serif" font-size="10" letter-spacing="4">UNITY · PRIVATE TABLE</text>'
back=f'<svg xmlns="http://www.w3.org/2000/svg" width="500" height="700" viewBox="0 0 500 700">{defs()}<rect x="2" y="2" width="496" height="696" rx="27" fill="#13332f" stroke="#cfbc8e" stroke-width="4"/><rect x="10" y="10" width="480" height="680" rx="22" fill="url(#weave)"/>{half}<g transform="rotate(180 250 350)">{half}</g><path d="M217 350L250 317L283 350L250 383Z" fill="#14332f" stroke="url(#foil)" stroke-width="2"/><path d="M235 350L250 335L265 350L250 365Z" fill="none" stroke="url(#foil)"/></svg>'
(out/'back.svg').write_text(back)
(out/'manifest.json').write_text(json.dumps({'count':52,'jokers':0,'size':[500,700],'backs':1,'design':'Original VESPER engraved botanical court deck; existing Unity community heart-cup mark','generator':'tools/generate-baccarat-cards.py','license':'Original project artwork; community mark user authorized; no third-party art or font files bundled','symmetry':'Entire back upper half repeated at180degrees; identical backs across all ranks/decks','materials':'Embedded deterministic paper grain and restrained foil gradients','court':'Three original generated engraved court portraits, composed into twelve precise suit variants with vector indices/cartouches. Generated art contains no numbers or suits.'},indent=2))
# Transfer each embedded raster once; expand exact self-contained SVG masters in memory.
shared=[paper,mark]+['data:image/webp;base64,'+base64.b64encode((root/f'public/baccarat/art/{n}.webp').read_bytes()).decode() for n in ['jack','queen','king']]
def packed(svg):
 for i,value in enumerate(shared):svg=svg.replace(value,f'__VESPER_ASSET_{i}__')
 return svg
header='// Generated original assets. Shared raster payloads are expanded into exact self-contained SVG masters.\nconst shared='+json.dumps(shared)+';\nconst expand=s=>shared.reduce((v,r,i)=>v.replaceAll(`__VESPER_ASSET_${i}__`,r),s);\n'
(out.parent/'card-data.js').write_text(header+'export const FACES='+json.dumps([packed((out/f'{i}.svg').read_text()) for i in range(52)],ensure_ascii=False)+'.map(expand);\nexport const BACK=expand('+json.dumps(packed(back))+');\n')

print('Generated52precise faces,12engraved courts and one symmetric back')
