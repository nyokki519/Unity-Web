# カフェの大穴チャレンジ / 琥珀の三段塔

Approved scope is the user's detailed implementation request. Independent local bonus game, not rooms or CPU simulation. Original green/ivory/brass canvas machine. No external dependencies, paid services or assets. Scope includes real geometric collisions/holes, three bowls, deterministic seed, practice/normal/hard, 100 balls, keyboard/pointer controls, reduced motion/audio OFF, pause when hidden and explicit debug panel. No server changes.

## Module contract

`config.js` exports `WIDTH=420`, `HEIGHT=760`, `BALL_RADIUS=4`, `FIXED_DT=1/240`, `DIFFICULTIES` object practice/normal/hard, `getBoard(difficulty)`.
Board: `{width,height,pins:[{x,y,r}],left:12,right:408,entry:{x:210,y:220,width},launcher:{x:380,y:210},trays:[{cx:210,cy:330|500|670,radius:112,scaleY:0.43,holes:[{id,x,y,r,win:boolean}],tiltX,tiltY, spring,drag}],...}`. Hole x/y are tray-local unprojected coordinates. Screen coordinates are cx+x,cy+y*scaleY. All visible holes exactly the geometry used by physics. Center hole is visible drain or practice winning hole; each tray exactly one winning hole. Transfers follow visible pipe to right inlet of next bowl.

`model.js` exports `createGame({difficulty='practice',seed='cafe',initialBalls=100,debug=false}={})`. Returns live model with methods:
- `fire(power=55)` -> boolean; rate and max active limited (interval ~.45s, max 12). Remaining counts unfired balls only; status running remains until unfired AND in-flight both zero, or explicit end.
- `step(dt=FIXED_DT)` -> advances simulation elapsed seconds; model internally uses fixed dt/accumulator so equivalent dt chunking deterministic. No browser APIs.
- `pause()` / `resume()` / `end()`; end status finished with reason quit and retire all active balls counted safely.
- `debugDrop(stage,{outcome='natural'}={})` -> bool, stage 0(board) or 1..3 trays, only debug=true. `outcome='win'|'miss'` starts a ball physically above/inside that visible hole and follows normal geometric adjudication; not hidden outcome override. Remaining decremented and fired increments. natural starts at rim. `debugEmpty()` -> bool, only debug; zero unfired, finishes after in-flight drains. All debug use marked by `debugUsed=true`.
Fields: `board`, `difficulty`, `seed`, `initialBalls`, `remaining`, `fired`, `score`, `jackpots`, `passes:[0,0,0]`, `lost`, `elapsed`, `status:'running'|'paused'|'finished'`, `endReason:null|'empty'|'quit'`, `debugUsed`, `balls:[]`, `events:[]` bounded last 30.
Ball: `{id,zone:'board'|'tray'|'transfer',stage:0(board) or 1..3(tray/destination transfer),x,y,vx,vy,age,r=4, screenX?,screenY?}`; x/y on board are global; in tray are local. Transfer has screenX/screenY. Removed immediately when final win/miss, no lost/invisible lingering ball. Renderer must not mutate model.
Event `{id,type:'entry'|'pass'|'miss'|'jackpot'|'recover'|'finish'|'fire',stage,at}`. IDs monotonic, at=elapsed. Optional x/y/message allowed. No audio in model. Holes collision uses swept geometry, no speed gate or random outcome. Sample reproducible seeds verified by model tests.

`render.js` exports `drawBoard(ctx,game,{reducedMotion=false,time=0}={})`. Caller sets canvas DPR transform to native420x760; renderer draws entire machine each call using board geometry. No listeners or globals; no mutation. Text min12 logical px. Render visible labels for ENTRY and each tray, one winning hole clearly indicated brass ring, other drain holes charcoal; balls ivory/brass with distinct shadow; transfers visible pipes. Renderer can export a stateless `ballScreenPosition(ball,board)` helper if useful.

`screen.js` exports `mountBonus({onBack})` -> `{node,destroy}`; all listeners/rAF/audio managed/destroyed. Root handles home entry and route. No state changes to existing rooms. Settings/start, play, pause, results/retry, rules and explicit debug panel, URL `?bonus=jackpot` or `?bonus=jackpot&debug=1&seed=...`. Root module owns CSS in separate `/bonus.css` loaded by index, not existing style overhaul.

## Verification
Physics tests: swept pin/wall/hole collisions, each tray pass/fail, seeded natural whole-game wins, repeatability across dt chunking, 100-ball accounting, rate/active cap, pause, no stuck/NaN/out of bounds, debug gated. Browser actual input: home/standalone route no room API, three widths, pointer/keyboard/hold, pause/hidden/resume, win/miss/empty/retry, simultaneous balls, resize, audio/reduced motion, debug marked. Existing npm suite and representative CPU and room regression retained.
