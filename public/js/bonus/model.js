import { getBoard, FIXED_DT, BALL_RADIUS, DIFFICULTIES } from "./config.js";
import { moveBoard, moveTray } from "./physics.js";
export function createGame({
  difficulty = "practice",
  seed = "cafe",
  initialBalls = 100,
  debug = false,
} = {}) {
  difficulty = DIFFICULTIES[difficulty] ? difficulty : "practice";
  initialBalls = Number.isFinite(initialBalls)
    ? Math.max(0, Math.min(1000, Math.floor(initialBalls)))
    : 100;
  let state = 2166136261;
  for (const c of String(seed))
    state = Math.imul(state ^ c.charCodeAt(0), 16777619) >>> 0;
  const random = () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
  let accumulator = 0,
    ticks = 0,
    nextBall = 0,
    nextEvent = 0,
    lastFire = -Infinity;
  const g = {
    board: getBoard(difficulty),
    difficulty,
    seed,
    initialBalls,
    fireInterval: difficulty === "practice" ? 0.45 : 1.5,
    remaining: initialBalls,
    fired: 0,
    score: 0,
    jackpots: 0,
    passes: [0, 0, 0],
    lost: 0,
    elapsed: 0,
    status: "running",
    endReason: null,
    debugUsed: false,
    balls: [],
    events: [],
  };
  const event = (type, stage = 0, message) => {
    g.events.push({
      id: ++nextEvent,
      type,
      stage,
      at: g.elapsed,
      ...(message ? { message } : {}),
    });
    if (g.events.length > 30) g.events.shift();
  };
  const finish = (reason) => {
    g.status = "finished";
    g.endReason = reason;
    event("finish");
  };
  const empty = () => {
    if (!g.remaining && !g.balls.length && g.status === "running")
      finish("empty");
  };
  const add = (stage, x, y, vx, vy) => {
    const b = {
      id: ++nextBall,
      zone: stage ? "tray" : "board",
      stage,
      x,
      y,
      vx,
      vy,
      age: 0,
      r: BALL_RADIUS,
    };
    g.remaining--;
    g.fired++;
    g.balls.push(b);
    event("fire", stage);
    return b;
  };
  const canAdd = () =>
    g.status === "running" && g.remaining > 0 && g.balls.length < 12;
  const trayStart = (b) => {
    b.zone = "tray";
    b.x = 96;
    b.y = 0;
    b.vx = -20;
    b.vy = b.tangent ?? 65;
    delete b.screenX;
    delete b.screenY;
  };
  g.fire = (power = 55) => {
    if (!canAdd() || g.elapsed - lastFire < g.fireInterval - 1e-8) return false;
    lastFire = g.elapsed;
    const scatter = random() - 0.5;
    const launchPower = Number.isFinite(Number(power))
      ? Math.max(0, Math.min(100, Number(power)))
      : 55;
    add(
      0,
      380,
      210,
      -160 - launchPower * 0.6 + scatter * 60,
      -400 + scatter * 30,
    ).tangent = 65 + scatter * 45;
    return true;
  };
  g.pause = () => {
    if (g.status === "running") g.status = "paused";
  };
  g.resume = () => {
    if (g.status === "paused") g.status = "running";
  };
  g.end = () => {
    if (g.status === "finished") return;
    g.lost += g.balls.length;
    g.balls.length = 0;
    finish("quit");
  };
  g.debugDrop = (stage, { outcome = "natural" } = {}) => {
    if (
      !debug ||
      !canAdd() ||
      !Number.isInteger(stage) ||
      stage < 0 ||
      stage > 3
    )
      return false;
    g.debugUsed = true;
    if (!stage) {
      add(0, 210, 30, 0, 0);
      return true;
    }
    const tray = g.board.trays[stage - 1],
      h = tray.holes.find((h) => h.win === (outcome === "win"));
    const b = add(stage, 96, 0, -20, 65);
    if (outcome === "win" || outcome === "miss") {
      b.x = h.x;
      b.y = h.y;
      b.vx = b.vy = 0;
    }
    return true;
  };
  g.debugEmpty = () => {
    if (!debug || g.status === "finished") return false;
    g.debugUsed = true;
    g.remaining = 0;
    empty();
    return true;
  };
  g.step = (dt = FIXED_DT) => {
    if (g.status !== "running" || !Number.isFinite(dt) || dt <= 0) return;
    accumulator += dt;
    while (accumulator + 1e-12 >= FIXED_DT && g.status === "running") {
      accumulator -= FIXED_DT;
      ticks++;
      g.elapsed = ticks * FIXED_DT;
      const removed = new Set();
      for (const b of g.balls) {
        b.age += FIXED_DT;
        // A stalled/invalid ball is retired visibly as a loss, never promoted.
        if (b.age > 60 || ![b.x, b.y, b.vx, b.vy].every(Number.isFinite)) {
          removed.add(b.id);
          g.lost++;
          event(
            "recover",
            b.stage,
            "60秒停滞または計算異常の球を回収（ロスト）",
          );
          continue;
        }
        if (b.zone === "board") {
          const oldY = b.y;
          moveBoard(b, g.board, FIXED_DT);
          if (b.y >= 220 && oldY < 220 && b.vy > 0) {
            if (Math.abs(b.x - 210) <= g.board.entry.width / 2) {
              b.entryOffset = (b.x - 210) * 0.08;
              b.stage = 1;
              b.zone = "transfer";
              b.transferElapsed = 0;
              b.screenX = b.x;
              b.screenY = 220;
              b.transferFromX = b.x;
              b.transferFromY = 220;
              event("entry", 1);
            } else {
              removed.add(b.id);
              g.lost++;
              event("miss", 0);
            }
          }
        } else if (b.zone === "transfer") {
          b.transferElapsed += FIXED_DT;
          const t = Math.min(1, b.transferElapsed / 0.6),
            source = g.board.trays[b.stage - 2],
            dest = g.board.trays[b.stage - 1];
          b.screenX =
            (1 - t) * (b.transferFromX ?? source?.cx ?? 210) +
            t * (dest.cx + 96) +
            Math.sin(t * Math.PI) *
              (b.stage === 1
                ? Math.min(
                    110,
                    400 - Math.max(b.transferFromX ?? 210, dest.cx + 96),
                  )
                : 110);
          b.screenY =
            (1 - t) * (b.transferFromY ?? source?.cy ?? 220) +
            t * (dest.cy + (b.entryOffset ?? 0) * dest.scaleY);
          if (t >= 1) {
            trayStart(b);
            b.y = b.entryOffset ?? 0;
            delete b.entryOffset;
            delete b.transferFromX;
            delete b.transferFromY;
          }
        } else {
          const h = moveTray(b, g.board.trays[b.stage - 1], FIXED_DT);
          if (h) {
            if (!h.win) {
              removed.add(b.id);
              g.lost++;
              event("miss", b.stage);
            } else {
              g.passes[b.stage - 1]++;
              event("pass", b.stage);
              if (b.stage === 3) {
                g.jackpots++;
                g.score += 10000;
                event("jackpot", 3);
                removed.add(b.id);
              } else {
                b.stage++;
                b.zone = "transfer";
                b.transferElapsed = 0;
                const source = g.board.trays[b.stage - 2];
                b.screenX = source.cx + b.x;
                b.screenY = source.cy + b.y * source.scaleY;
                b.transferFromX = b.screenX;
                b.transferFromY = b.screenY;
              }
            }
          }
        }
      }
      g.balls = g.balls.filter((b) => !removed.has(b.id));
      empty();
    }
  };
  empty();
  return g;
}
