import {
  createBoard,
  holesAt,
  gateAt,
  FIXED_DT,
  BALL_RADIUS,
} from "./config.js";
import { moveBoard, moveTray, resolveBalls, impulse } from "./physics.js";
export function createSimulation({
  difficulty = "easy",
  seed = "abyss",
  initialBalls = 100,
  config = {},
  debug = false,
} = {}) {
  const reserve = Number.isFinite(Number(initialBalls))
    ? Math.max(0, Math.min(1e6, Math.floor(Number(initialBalls))))
    : 100;
  let randomState = 2166136261;
  for (const ch of String(seed)) {
    randomState ^= ch.codePointAt(0);
    randomState = Math.imul(randomState, 16777619) >>> 0;
  }
  function random() {
    randomState = (randomState + 0x6d2b79f5) >>> 0;
    let n = randomState;
    n = Math.imul(n ^ (n >>> 15), n | 1);
    n ^= n + Math.imul(n ^ (n >>> 7), n | 61);
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  }
  const board = createBoard(difficulty, config),
    balls = [],
    events = [],
    inputs = [],
    traces = [],
    successRoutes = [];
  let accumulator = 0,
    nextId = 1,
    eventId = 1,
    lastFire = -Infinity;
  const stats = {
    dwellTotals: [0, 0, 0, 0, 0],
    dwellCounts: [0, 0, 0, 0, 0],
    speedSum: 0,
    speedSamples: 0,
    outflow: Array(20).fill(0),
    pinHits: Array(300).fill(0),
    angleBins: {},
    stalled: Array(640).fill(0),
    shots: 0,
    forestAttempts: 0,
    forestPasses: 0,
    gateAttempts: 0,
    gateReached: 0,
    gatePasses: 0,
    trayEntries: [0, 0, 0],
    trayPasses: [0, 0, 0],
    trayMisses: [0, 0, 0],
    trayTimeouts: [0, 0, 0],
    contacts: { pin: 0, wall: 0, ball: 0, gate: 0, rim: 0 },
    heatmap: Array(640).fill(0),
    heatmapCols: 20,
    heatmapRows: 32,
  };
  const game = {
    board,
    balls,
    events,
    inputs,
    traces,
    successRoutes,
    stats,
    seed: String(seed),
    difficulty: board.difficulty,
    config: structuredClone(config),
    initialBalls: reserve,
    debugUsed: false,
    inputsTruncated: false,
    endReason: null,
    status: "running",
    elapsed: 0,
    tick: 0,
    remaining: reserve,
    fired: 0,
    lost: 0,
    jackpots: 0,
    score: 0,
    passes: [0, 0, 0],
    fire,
    step,
    pause() {
      if (game.status === "running") game.status = "paused";
    },
    resume() {
      if (game.status === "paused") game.status = "running";
    },
    end() {
      if (game.status === "finished") return;
      record({ tick: game.tick, type: "end" });
      for (const b of balls) {
        game.lost++;
        retire(b, false);
        emit("lost", b);
      }
      balls.length = 0;
      game.status = "finished";
      game.endReason = "quit";
      emit("quit");
    },
    debugDrop,
    debugEmpty() {
      if (!debug) return false;
      game.debugUsed = true;
      game.remaining = 0;
      return true;
    },
    snapshot,
  };
  function record(input) {
    if (inputs.length < 1000000) inputs.push(input);
    else game.inputsTruncated = true;
  }
  function emit(type, b, energy) {
    events.push({
      id: eventId++,
      type,
      stage: b?.stage || 0,
      at: game.elapsed,
      ...(b ? { x: b.renderX ?? b.x, y: b.renderY ?? b.y } : {}),
      ...(energy === undefined ? {} : { energy }),
    });
    if (events.length > 512) events.splice(0, events.length - 512);
  }
  function contact(type, b, pinId) {
    stats.contacts[type]++;
    if (type === "pin" && Number.isInteger(pinId)) stats.pinHits[pinId]++;
    emit(
      type === "ball" ? "ball-contact" : type === "gate" ? "gate-block" : type,
      b,
      0.5 * (b.vx * b.vx + b.vy * b.vy),
    );
  }
  function add(x, y, zone = "board", stage = 0) {
    const b = {
      id: nextId++,
      zone,
      stage,
      x,
      y,
      vx: 0,
      vy: 0,
      r: BALL_RADIUS,
      spin: 0,
      age: 0,
      renderX: x,
      renderY: y,
      renderZ: 12,
    };
    balls.push(b);
    stats.dwellCounts[0]++;
    traces.push({ id: b.id, angle: null, points: [] });
    if (traces.length > 32) traces.shift();
    game.fired++;
    stats.shots++;
    return b;
  }
  function fire(power = 55, angle = board.launchAngle ?? -103) {
    if (
      game.status !== "running" ||
      !game.remaining ||
      balls.length >= board.maxBalls ||
      game.elapsed - lastFire < board.fireInterval - 1e-9
    )
      return false;
    power = Number.isFinite(Number(power))
      ? Math.max(1, Math.min(100, Number(power)))
      : 55;
    angle = Number.isFinite(Number(angle))
      ? Math.max(-175, Math.min(-5, Number(angle)))
      : -103;
    const b = add(board.launcher.x, board.launcher.y, "board");
    b.launching = true;
    b.launchAngle = angle;
    b.angleBin = String(Math.floor(angle / 5) * 5);
    stats.angleBins[b.angleBin] ??= { shots: 0, jackpots: 0, lost: 0 };
    stats.angleBins[b.angleBin].shots++;
    traces.find((t) => t.id === b.id).angle = angle;
    const actualAngle = angle + board.launchVariance * (random() * 2 - 1);
    const speed = 1300 + power * 7;
    b.vx = Math.cos((actualAngle * Math.PI) / 180) * speed;
    b.vy = Math.sin((actualAngle * Math.PI) / 180) * speed;
    game.remaining--;
    lastFire = game.elapsed;
    record({ tick: game.tick, type: "fire", power, angle });
    emit("fire", b);
    return true;
  }
  function retire(b, win) {
    const trace = traces.find((t) => t.id === b.id);
    if (win && trace) {
      successRoutes.push(structuredClone(trace));
      if (successRoutes.length > 10) successRoutes.shift();
    }
    if (b.angleBin && stats.angleBins[b.angleBin])
      stats.angleBins[b.angleBin][win ? "jackpots" : "lost"]++;
    if (!win)
      stats.outflow[
        Math.max(0, Math.min(19, Math.floor((b.renderX ?? b.x) / 50)))
      ]++;
    const i = traces.findIndex((t) => t.id === b.id);
    if (i >= 0) traces.splice(i, 1);
  }
  function enter(b, stage) {
    stats.dwellCounts[stage]++;
    b.zone = "tray";
    b.stage = stage;
    const tray = board.trays[stage - 1];
    b.x = -tray.radius * 0.88;
    b.y = -tray.radius * 0.15;
    b.vx = 25;
    b.vy = -Math.sqrt(tray.spring) * tray.radius * 0.9;
    b.age = 0;
    stats.trayEntries[stage - 1]++;
    emit("tray-enter", b);
  }
  function transfer(b) {
    renderPosition(b);
    b.transferX = b.renderX;
    b.transferY = b.renderY;
    b.transferZ = b.renderZ;
    b.zone = "transfer";
    stats.dwellCounts[4]++;
    b.age = 0;
    b.transferDuration = 0.55;
  }
  function falling(b, win) {
    stats.dwellCounts[4]++;
    b.zone = "fall";
    b.age = 0;
    b.fallWin = win;
    b.fallX = b.renderX;
    b.fallY = b.renderY;
    b.fallZ = b.renderZ;
    b.fallVX = b.vx;
    b.fallVY = b.vy;
  }
  function renderPosition(b) {
    if (b.zone === "tray") {
      const t = board.trays[b.stage - 1];
      b.renderX = t.cx + b.x;
      b.renderY = t.cy + b.y;
      b.renderZ =
        t.z + b.r + ((b.x * b.x + b.y * b.y) / (t.radius * t.radius)) * 12;
    } else if (b.zone === "fall") {
      b.renderX = b.fallX + b.fallVX * b.age;
      b.renderY = b.fallY + b.fallVY * b.age;
      b.renderZ = b.fallZ - 0.5 * 900 * b.age * b.age;
    } else if (b.zone === "transfer") {
      const t = board.trays[b.stage];
      const u = Math.min(1, b.age / b.transferDuration),
        targetX = t.cx - t.radius * 0.88,
        targetY = t.cy - t.radius * 0.15,
        targetZ = t.z + b.r + 12 * (0.88 * 0.88 + 0.15 * 0.15);
      b.renderX = b.transferX + (targetX - b.transferX) * u;
      b.renderY = b.transferY + (targetY - b.transferY) * u;
      b.renderZ = b.transferZ + (targetZ - b.transferZ) * u;
    } else {
      b.renderX = b.x;
      b.renderY = b.y;
      b.renderZ = 12;
    }
  }
  function update(b) {
    b.prevX = b.x;
    b.prevY = b.y;
    b.prevZone = b.zone;
    b.prevStage = b.stage;
    const dwell = ["fall", "transfer"].includes(b.zone) ? 4 : b.stage;
    stats.dwellTotals[dwell] += FIXED_DT;
    stats.speedSum += Math.hypot(b.vx, b.vy);
    stats.speedSamples++;
    b.age += FIXED_DT;
    if (b.zone === "fall") {
      if (b.age >= 0.35) {
        if (b.fallWin && b.stage < 3) {
          transfer(b);
        } else {
          if (b.fallWin) {
            game.jackpots++;
            game.score += 10000;
            emit("jackpot", b);
            retire(b, true);
          } else {
            game.lost++;
            retire(b, false);
            emit("lost", b);
          }
          return false;
        }
      }
    } else if (b.zone === "transfer") {
      if (b.age >= b.transferDuration) enter(b, b.stage + 1);
    } else if (b.zone === "tray") {
      if (b.age > 40) {
        stats.trayTimeouts[b.stage - 1]++;
        renderPosition(b);
        emit("timeout", b);
        falling(b, false);
        return true;
      }
      const h = moveTray(
        b,
        board.trays[b.stage - 1],
        game.elapsed,
        FIXED_DT,
        contact,
      );
      if (h) {
        renderPosition(b);
        if (h.win) {
          stats.trayPasses[b.stage - 1]++;
          game.passes[b.stage - 1]++;
        } else stats.trayMisses[b.stage - 1]++;
        emit(h.win ? "hole-win" : "hole-miss", b);
        falling(b, h.win);
      }
    } else {
      const oldY = b.y;
      if (b.launching) {
        b.vy += board.gravity * FIXED_DT;
        b.x += b.vx * FIXED_DT;
        b.y += b.vy * FIXED_DT;
        if (b.x < board.right - b.r) {
          b.launching = false;
          b.x = Math.min(board.right - b.r, b.x);
        }
        if (b.y > 1650) {
          renderPosition(b);
          falling(b, false);
        }
      } else {
        moveBoard(b, board, FIXED_DT, contact);
        if (!b.forestChecked && oldY < board.entry.y && b.y >= board.entry.y) {
          b.forestChecked = true;
          stats.forestAttempts++;
          if (Math.abs(b.x - board.entry.x) < board.entry.width / 2 - b.r) {
            stats.forestPasses++;
            stats.gateReached++;
            b.zone = "gate";
          } else {
            renderPosition(b);
            falling(b, false);
          }
        }
        if (
          b.zone === "gate" &&
          b.y + b.r >= board.gate.y - board.gate.height / 2 &&
          b.vy > 0
        ) {
          stats.gateAttempts++;
          const pose = gateAt(board.gate, game.elapsed);
          if (
            Math.abs(b.x - pose.barX) > board.gate.width / 2 + b.r &&
            Math.abs(b.x - board.gate.x) < board.gate.width / 2 - b.r
          ) {
            stats.gatePasses++;
            emit("gate-pass", b);
            transfer(b);
          } else {
            b.y = board.gate.y - board.gate.height / 2 - b.r - 0.01;
            impulse(b, 0, -1, 0.38, 0.2);
            contact("gate", b);
          }
        }
        if (
          (b.zone === "board" || b.zone === "gate") &&
          (b.y > 1600 || b.y < -200 || b.age > 40)
        ) {
          renderPosition(b);
          falling(b, false);
        }
      }
    }
    renderPosition(b);
    return true;
  }
  function step(seconds) {
    if (game.status !== "running" || !Number.isFinite(seconds) || seconds <= 0)
      return;
    accumulator += Math.min(seconds, 60);
    while (accumulator + 1e-10 >= FIXED_DT) {
      accumulator -= FIXED_DT;
      game.elapsed = game.tick * FIXED_DT;
      for (let i = balls.length - 1; i >= 0; i--)
        if (!update(balls[i])) balls.splice(i, 1);
      resolveBalls(balls, contact);
      for (const b of balls) {
        if (![b.x, b.y, b.vx, b.vy].every(Number.isFinite)) {
          b.x = 500;
          b.y = 1000;
          b.vx = b.vy = 0;
          renderPosition(b);
          emit("invalid-state", b);
          falling(b, false);
        }
        if (b.zone === "tray") {
          const t = board.trays[b.stage - 1],
            d = Math.hypot(b.x, b.y),
            limit = t.radius - b.r;
          if (d > limit) {
            b.x *= limit / d;
            b.y *= limit / d;
          }
        } else if (!b.launching && ["board", "gate"].includes(b.zone)) {
          b.x = Math.max(board.left + b.r, Math.min(board.right - b.r, b.x));
        }
        renderPosition(b);
        if (["board", "gate", "tray"].includes(b.zone)) {
          const ix = Math.floor(b.renderX / 50),
            iy = Math.floor(b.renderY / 50);
          if (ix >= 0 && ix < 20 && iy >= 0 && iy < 32) {
            stats.heatmap[iy * 20 + ix]++;
            if (Math.hypot(b.vx, b.vy) < 10) stats.stalled[iy * 20 + ix]++;
          }
        }
        if (game.tick % 12 === 0) {
          const route = traces.find((t) => t.id === b.id);
          if (route) {
            route.points.push({
              tick: game.tick,
              x: b.renderX,
              y: b.renderY,
              z: b.renderZ,
              stage: b.stage,
              zone: b.zone,
            });
            if (route.points.length > 500) route.points.shift();
          }
        }
      }
      game.tick++;
      game.elapsed = game.tick * FIXED_DT;
      if (!game.remaining && !balls.length) {
        game.status = "finished";
        game.endReason = "natural";
        accumulator = 0;
        break;
      }
    }
  }
  function debugDrop(stage, { outcome = "win" } = {}) {
    if (
      !debug ||
      game.status !== "running" ||
      !game.remaining ||
      balls.length >= board.maxBalls
    )
      return false;
    if (
      !Number.isInteger(stage) ||
      stage < 0 ||
      stage > 3 ||
      !["win", "miss", "natural"].includes(outcome)
    )
      return false;
    game.debugUsed = true;
    const b = add(0, 0);
    game.remaining--;
    if (stage === 0) {
      b.x = board.gate.x;
      b.y = board.gate.y - board.gate.height / 2 - b.r - 1;
      b.vy = 150;
      b.zone = "gate";
      b.forestChecked = true;
      stats.gateReached++;
    } else {
      enter(b, stage);
      const tray = board.trays[stage - 1];
      if (outcome !== "natural") {
        const h = holesAt(tray, game.elapsed).find(
          (h) => h.win === (outcome === "win"),
        );
        b.x = h.x;
        b.y = h.y;
        b.vx = -tray.omega * h.y;
        b.vy = tray.omega * h.x;
      }
    }
    renderPosition(b);
    return b;
  }
  function snapshot() {
    return structuredClone({
      schemaVersion: 1,
      seed: game.seed,
      difficulty: game.difficulty,
      config: game.config,
      initialBalls: game.initialBalls,
      debugUsed: game.debugUsed,
      inputsTruncated: game.inputsTruncated,
      status: game.status,
      endReason: game.endReason,
      tick: game.tick,
      elapsed: game.elapsed,
      remaining: game.remaining,
      fired: game.fired,
      lost: game.lost,
      jackpots: game.jackpots,
      score: game.score,
      passes: game.passes,
      balls,
      stats,
      inputs,
      traces,
      successRoutes,
    });
  }
  return game;
}
