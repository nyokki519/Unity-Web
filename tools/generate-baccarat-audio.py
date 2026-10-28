"""Original composition and synthesis; no recordings, melodies or samples copied.
Rebuild: python3 tools/generate-baccarat-audio.py (numpy/scipy + ffmpeg).
"""
from pathlib import Path
import numpy as np
from scipy.signal import lfilter,butter,sosfilt
from scipy.io.wavfile import write
import subprocess,tempfile,json
SR=44100;BPM=78;BEAT=60/BPM;rng=np.random.default_rng(281028);out=Path(__file__).resolve().parents[1]/'public/baccarat/audio';out.mkdir(exist_ok=True)
def freq(note):return 440*2**((note-69)/12)
def envelope(n,attack=.006,decay=1):
 t=np.arange(n)/SR;return np.minimum(1,t/attack)*np.exp(-t/decay)*np.minimum(1,(n/SR-t)/.06)
def piano(note,duration=2.5,velocity=.6):
 t=np.arange(int(duration*SR))/SR;f=freq(note);a=np.sin(2*np.pi*f*t+1.5*np.exp(-t*5)*np.sin(2*np.pi*f*2*t));a+=.2*np.sin(2*np.pi*f*2*t)*np.exp(-t*2)+.055*np.sin(2*np.pi*f*3*t);return a*envelope(len(t),.004,1.1)*velocity

def bass(note):
 t=np.arange(int(1.1*SR))/SR;f=freq(note);a=np.sin(2*np.pi*f*t)+.28*np.sin(2*np.pi*2*f*t)+.12*np.sin(2*np.pi*3*f*t);a+=sosfilt(butter(1,900,fs=SR,output='sos'),rng.normal(0,.11,len(t)))*np.exp(-t*40);return a*envelope(len(t),.008,.36)
def brush():
 t=np.arange(int(.105*SR))/SR;a=sosfilt(butter(2,[700,5000],btype='bandpass',fs=SR,output='sos'),rng.normal(0,1,len(t)));return a*np.exp(-t*50)*np.minimum(1,t/.005)
def export(name,a,peak=.8):
 a=np.asarray(a);a=a/(max(.001,np.max(np.abs(a))))*peak
 with tempfile.NamedTemporaryFile(suffix='.wav') as f:
  write(f.name,SR,(a*32767).astype(np.int16));subprocess.run(['ffmpeg','-y','-v','error','-i',f.name,'-codec:a','libmp3lame','-b:a','128k','-metadata','title='+name,'-metadata','artist=Unity MIX original synthesis',str(out/(name+'.mp3'))],check=True)
 return {'durationSeconds':len(a)/SR,'peakBeforeMp3':peak,'bytes':(out/(name+'.mp3')).stat().st_size}

def put(track,signal,beat,gain=.15,pan=0):
 start=int(beat*BEAT*SR);n=len(track);i=(start+np.arange(len(signal)))%n;track[i,0]+=signal*gain*np.sqrt((1-pan)/2);track[i,1]+=signal*gain*np.sqrt((1+pan)/2)
# 16 bars. Common ii/V/I vocabulary, original voicing, rhythm and melody.
chords=[[60,64,67,71,74],[57,60,64,67,71],[62,65,69,72,76],[55,59,64,65,69],[64,67,71,74,78],[57,61,65,67,72],[62,65,69,72,76],[55,59,64,65,69],[60,64,67,71,74],[59,62,65,69,74],[64,68,71,74,77],[57,60,64,67,71],[62,65,69,72,76],[55,59,64,65,69],[60,64,67,71,74],[55,59,64,65,69]]
roots=[36,33,38,31,40,33,38,31,36,35,40,33,38,31,36,31]
track=np.zeros((round(64*BEAT*SR),2))
for bar,(chord,root) in enumerate(zip(chords,roots)):
 for when,strength in [(0,.75),(1+2/3,.45),(3,.56)]:
  for j,note in enumerate(chord[1:]):put(track,piano(note,2.4,.7+float(rng.random())*.15),bar*4+when+j*.018,.12*strength,-.16)
 for beat,note in enumerate([root,root+7,root+12,root+7]):put(track,bass(note),bar*4+beat,.23)
 for beat in range(4):
  put(track,brush(),bar*4+beat,.018,.2);put(track,brush(),bar*4+beat+2/3,.008,.33)
 if bar%4 in [1,3]:
  for j in range(3):put(track,piano(chord[[2,4,3][j]]+12,1.4,.5),bar*4+1+j*2/3,.045,.1)
# Short periodic room reflections wrap into the loop, not a fade-to-silence seam.
for delay,gain in [(.043,.11),(.079,.07),(.137,.035)]:track+=np.roll(track,int(delay*SR),axis=0)[:,::-1]*gain
meta={'composition':'Original 16-bar late-night cafe lounge','bpm':BPM,'bars':16,'sources':'All oscillators / filtered procedural noise, no external samples','files':{}}
meta['files']['lounge-jazz']=export('lounge-jazz',np.tanh(track*1.3),.72)

def bell(note,duration=.9):
 t=np.arange(round(duration*SR))/SR;f=freq(note);a=np.sin(2*np.pi*f*t)+.24*np.sin(2*np.pi*f*2.76*t)*np.exp(-t*5)+.1*np.sin(2*np.pi*f*4.08*t)*np.exp(-t*9);return a*envelope(len(t),.003,.23)
for tier,notes in [('blue',[76]),('green',[72,79,83]),('red',[74,81,86,90]),('rainbow',[72,76,79,83,86])]:
 fx=np.zeros((int(1.35*SR),2))
 for i,note in enumerate(notes):put(fx,bell(note,.85),i*.12/BEAT,.22,(-.3+i*.13))
 if tier in ['red','rainbow']:
  t=np.arange(int(.5*SR))/SR;phase=2*np.pi*(480*t+900*t*t/2);rise=(np.sin(phase)+.16*np.sin(phase*2))*np.sin(np.pi*t/.5)**2*.12
  put(fx,rise,0,.6)
 meta['files']['preview-'+tier]=export('preview-'+tier,fx,.58)
fx=np.zeros((int(1.3*SR),2))
for i,note in enumerate([60,67,72,76,79,83]):put(fx,bell(note,1.05),i*.065/BEAT,.16,(i-2.5)*.12)
meta['files']['win']=export('win',fx,.65)
fx=np.zeros((int(.38*SR),2));put(fx,bell(88,.3),0,.06);put(fx,piano(76,.35,.3),.03/BEAT,.1)
meta['files']['reveal']=export('reveal',fx,.4)
(out/'manifest.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2));print(json.dumps(meta,ensure_ascii=False,indent=2))
