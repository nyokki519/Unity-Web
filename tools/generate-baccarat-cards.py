"""Original vector artwork. No generated text, third-party images or Unity logo."""
from pathlib import Path
import json
out=Path(__file__).resolve().parents[1]/'public/baccarat/cards';out.mkdir(parents=True,exist_ok=True)
paths=["M10 1C6 6 1 8 1 12C1 17 7 18 9 14L7 20H13L11 14C13 18 19 17 19 12C19 8 14 6 10 1Z","M10 19C8 16 1 11 1 6C1 0 8 0 10 5C12 0 19 0 19 6C19 11 12 16 10 19Z","M10 0L19 10L10 20L1 10Z","M10 1C4 1 4 7 7 9C2 6 0 10 1 13C2 17 7 17 9 14L7 20H13L11 14C13 17 18 17 19 13C20 10 18 6 13 9C16 7 16 1 10 1Z"]
positions={1:[(250,350)],2:[(250,185),(250,515)],3:[(250,185),(250,350),(250,515)],4:[(160,185),(340,185),(160,515),(340,515)],5:[(160,185),(340,185),(250,350),(160,515),(340,515)],6:[(x,y)for y in [185,350,515]for x in [160,340]],7:[(x,y)for y in [185,350,515]for x in [160,340]]+[(250,270)],8:[(x,y)for y in [185,350,515]for x in [160,340]]+[(250,270),(250,430)],9:[(x,y)for y in [170,290,410,530]for x in [160,340]]+[(250,350)],10:[(x,y)for y in [170,290,410,530]for x in [160,340]]+[(250,230),(250,470)]}
def pip(s,x,y,scale=3,cls=''):
 return f'<g class="{cls}" transform="translate({x},{y}) rotate({180 if y>350 else 0}) scale({scale}) translate(-10,-10)"><path d="{paths[s]}"/></g>'
for suit in range(4):
 for rank in range(1,14):
  index=suit*13+rank-1;label={1:'A',11:'J',12:'Q',13:'K'}.get(rank,str(rank));col='#8b303c'if suit in [1,2]else'#142c3a'
  corner=f'<g fill="{col}"><text x="28" y="102" font-family="Georgia,serif" font-weight="bold" font-size="94" letter-spacing="-6">{label}</text><g transform="translate(40,120) scale(2.9)"><path d="{paths[suit]}"/></g></g>'
  content=''
  if rank<=10:
   content=''.join(pip(suit,x,y,7.2 if rank==1 else 2.8,'main-pip')for x,y in positions[rank])
   if rank==1:content+='<path d="M155 470V250Q250 140 345 250V470M180 440V265Q250 180 320 265V440" fill="none" stroke="#bda776" stroke-width="3"/>'
  else:
   crown={11:'M190 220L215 185L250 215L285 185L310 220Z',12:'M190 215L205 165L235 190L250 155L265 190L295 165L310 215Z',13:'M188 220L190 170L220 190L250 145L280 190L310 170L312 220Z'}[rank]
   half=f'<g><path d="M145 350L170 285L220 265H280L330 285L355 350Z" fill="{col}"/><path d="M180 347L220 285H280L320 347" fill="none" stroke="#c1ad7c" stroke-width="6"/><path d="{crown}" fill="#c3ad76"/><path d="M215 223H285L275 268H225Z" fill="#e7d7b9"/><path d="M232 238H242M258 238H268M247 255H258" stroke="{col}" stroke-width="5"/><path d="M110 350V235L135 210L150 235V350M350 350V235L365 210L390 235V350" stroke="#bda776" stroke-width="3" fill="none"/></g>'
   motif={11:'<circle cx="224" cy="376" r="9"/><circle cx="276" cy="324" r="9"/><path d="M230 370L270 330M243 357L250 364M257 343L250 336"/>',12:'<path d="M250 320Q230 330 250 348Q270 330 250 320ZM280 350Q270 330 252 350Q270 370 280 350ZM250 380Q270 370 250 352Q230 370 250 380ZM220 350Q230 370 248 350Q230 330 220 350Z"/><circle cx="250" cy="350" r="4"/>',13:'<path d="M250 315V385M238 338H262M238 362H262M250 310L259 319L250 328L241 319ZM250 390L259 381L250 372L241 381Z"/>'}[rank]
   content=half+f'<g transform="rotate(180 250 350)">{half}</g><g fill="none" stroke="#ede1bf" stroke-width="4" stroke-linecap="round">{motif}</g>'
  svg=f'<svg xmlns="http://www.w3.org/2000/svg" width="500" height="700" viewBox="0 0 500 700" data-rank="{rank}" data-suit="{suit}"><rect x="2" y="2" width="496" height="696" rx="27" fill="#f4efe3" stroke="#d7cfba" stroke-width="4"/><rect x="15" y="15" width="470" height="670" rx="18" fill="none" stroke="#c4b58c" stroke-width="1"/>{corner}<g transform="rotate(180 250 350)">{corner}</g><g fill="{col}">{content}</g></svg>'
  (out/f'{index}.svg').write_text(svg)
half='<path d="M45 335V70Q45 45 70 45H430Q455 45 455 70V335M80 330V110H420V330M110 305V145H390V305"/><path d="M145 320V220Q250 105 355 220V320M185 315V238Q250 165 315 238V315M250 190V320"/><path d="M70 185L95 210L70 235L45 210ZM430 185L455 210L430 235L405 210Z"/><text x="250" y="90" text-anchor="middle" fill="#c6b78f" stroke="none" font-family="Georgia,serif" font-size="28" letter-spacing="8">VESPER</text>'
(out/'back.svg').write_text(f'<svg xmlns="http://www.w3.org/2000/svg" width="500" height="700" viewBox="0 0 500 700"><rect x="2" y="2" width="496" height="696" rx="27" fill="#142b38" stroke="#d3c098" stroke-width="4"/><g fill="none" stroke="#baa77c" stroke-width="2">{half}<g transform="rotate(180 250 350)">{half}</g><path d="M210 350L250 310L290 350L250 390Z"/><path d="M228 350L250 328L272 350L250 372Z"/></g></svg>')
(out/'manifest.json').write_text(json.dumps({'count':52,'jokers':0,'size':[500,700],'backs':1,'design':'Original hotel-window geometry; no Unity Technologies logo','generator':'tools/generate-baccarat-cards.py','license':'Original project artwork; no third-party art or font files bundled','symmetry':'back upper half repeated with 180-degree transform; identical back for all ranks and decks'},indent=2))
(out.parent/'card-data.js').write_text('// Generated original vector assets. Run tools/generate-baccarat-cards.py to rebuild.\nexport const FACES='+json.dumps([(out/f'{i}.svg').read_text() for i in range(52)],ensure_ascii=False)+';\nexport const BACK='+json.dumps((out/'back.svg').read_text())+';\n')
print('Generated 52 faces and one symmetric back')
