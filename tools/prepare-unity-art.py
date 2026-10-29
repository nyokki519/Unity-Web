"""Rebuild deployment WebPs from original project art masters. Requires Pillow."""
from PIL import Image
from pathlib import Path
root=Path(__file__).resolve().parents[1];src=root/'docs/art-source';b=root/'public/baccarat/art';s=root/'public/shooting/art';b.mkdir(exist_ok=True);s.mkdir(exist_ok=True)
Image.open(src/'vesper-salon.png').save(b/'salon.webp',quality=88,method=6)
im=Image.open(src/'vesper-courts.png');w,h=im.size
for i,k in enumerate(['jack','queen','king']):im.crop((w*i//3,0,w*(i+1)//3,h)).resize((420,840),Image.Resampling.LANCZOS).save(b/(k+'.webp'),quality=86,method=6)
im=Image.open(src/'shooting-stages.png');w,h=im.size
for i in range(6):
 x=i%3;y=i//3;im.crop((w*x//3,h*y//2,w*(x+1)//3,h*(y+1)//2)).save(s/f'stage-{i}.webp',quality=87,method=6)
print('Prepared original salon, court portraits and six stage plates')
