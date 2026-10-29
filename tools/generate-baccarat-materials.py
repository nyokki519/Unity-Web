"""Original deterministic material maps; no external images or fonts downloaded."""
from pathlib import Path
from PIL import Image,ImageFilter
import numpy as np
import json
root=Path(__file__).resolve().parents[1];out=root/'public/baccarat/art';out.mkdir(exist_ok=True)
rng=np.random.default_rng(291029)
n=512;y,x=np.mgrid[:n,:n]
fine=rng.normal(0,2.7,(n,n));warp=4*np.sin(x*2*np.pi/5)+3*np.sin(y*2*np.pi/4)
fibers=np.asarray(Image.fromarray(np.uint8(np.clip(128+rng.normal(0,22,(n,n)),0,255))).filter(ImageFilter.GaussianBlur(.7)),dtype=float)-128
felt=np.clip(128+warp+fine+fibers*.32,0,255).astype('uint8');Image.fromarray(felt).convert('RGB').save(out/'felt.webp',quality=88)
noise=np.asarray(Image.fromarray(np.uint8(np.clip(128+rng.normal(0,35,(n,n)),0,255))).filter(ImageFilter.GaussianBlur(.8)),dtype=float)-128
vein=np.asarray(Image.fromarray(np.uint8(np.clip(128+rng.normal(0,38,(n,n)),0,255))).filter(ImageFilter.GaussianBlur(3)),dtype=float)-128
leather=np.clip(34+noise*.38+vein*.9,8,65).astype('uint8');Image.fromarray(np.stack([leather*1.06,leather,leather*.91],axis=-1).astype('uint8')).save(out/'leather.webp',quality=88)
paper=np.clip(246+rng.normal(0,1.4,(256,256)),235,252);Image.fromarray(np.stack([paper,paper-3,paper-11],axis=-1).astype('uint8')).save(out/'paper.webp',quality=90)
# Remove beige surround from existing user-owned community icon, not a technology-company mark.
src=Image.open(root/'public/assets/unity-mark.webp').convert('RGB');a=np.array(src).astype(float);lum=a.mean(axis=2);alpha=np.clip((205-lum)/130,0,1)*255
rgba=np.zeros((src.height,src.width,4),dtype='uint8');rgba[:,:,:3]=[192,165,105];rgba[:,:,3]=alpha.astype('uint8');Image.fromarray(rgba).save(out/'unity-engraving.png')
(out/'materials.json').write_text(json.dumps({'generator':'tools/generate-baccarat-materials.py','license':'Original project procedural material maps; icon derived from existing Unity community mark, user authorized','tileSize':[512,512],'paperSize':[256,256],'seed':291029,'maps':['felt.webp','leather.webp','paper.webp'],'note':'Stylized image-based surface detail, not measured BRDF scans.'},indent=2))
print('Generated original felt, leather, paper and transparent community engraving')
