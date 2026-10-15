import { createBoard, FIXED_DT } from "./config.js";
import { createBoard as createLegacyBoard } from "./legacy/config.js";
const KINDS = ["history", "presets", "replays", "research"];
const LIMIT = 100;
function plain(v) {
  if (
    !v ||
    typeof v !== "object" ||
    Array.isArray(v) ||
    ![Object.prototype, null].includes(Object.getPrototypeOf(v))
  )
    throw new Error("Expected plain object");
  return v;
}
function safe(v, depth = 0) {
  if (depth > 12) throw new Error("Data too deeply nested");
  if (typeof v === "number" && !Number.isFinite(v))
    throw new Error("Non-finite number");
  if (typeof v === "string" && v.length > 100000)
    throw new Error("String too long");
  if (Array.isArray(v)) {
    if (v.length > 1000000) throw new Error("Array too long");
    v.forEach((x) => safe(x, depth + 1));
  } else if (v && typeof v === "object") {
    plain(v);
    for (const [k, x] of Object.entries(v)) {
      if (["__proto__", "prototype", "constructor"].includes(k))
        throw new Error("Unsafe key");
      safe(x, depth + 1);
    }
  } else if (v !== null && !["string", "number", "boolean"].includes(typeof v))
    throw new Error("Unsupported value");
}
export function validateImport(value) {
  safe(value);
  plain(value);
  const si = value.version === 2;
  if (si && !["si-1","si-2"].includes(value.physicsVersion)) throw new Error("Unsupported physics version");
  if (value.kind === "preset") {
    if (
      Object.keys(value).some(
        (k) => !["version", "kind", "difficulty", "seed", "config", ...(si ? ["physicsVersion"] : [])].includes(k),
      ) ||
      (!si && value.version !== 1) ||
      !["easy", "normal", "abyss", "custom"].includes(value.difficulty) ||
      typeof value.seed !== "string" ||
      value.seed.length > 128
    )
      throw new Error("Invalid preset");
    plain(value.config);
    validateConfig(value.config, si);
    return structuredClone(value);
  }
  const allowed = [
    ...(si ? ["physicsVersion"] : []),
    "version",
    "difficulty",
    "seed",
    "initialBalls",
    "config",
    "inputs",
    "elapsed",
    "result",
    "status",
    "endReason",
  ];
  if (
    Object.keys(value).some((k) => !allowed.includes(k)) ||
    (!si && value.version !== 1)
  )
    throw new Error("Unsupported session schema");
  if (!["easy", "normal", "abyss", "custom"].includes(value.difficulty))
    throw new Error("Invalid difficulty");
  if (typeof value.seed !== "string" || value.seed.length > 128)
    throw new Error("Invalid seed");
  if (
    !Number.isInteger(value.initialBalls) ||
    value.initialBalls < 1 ||
    value.initialBalls > 1000000
  )
    throw new Error("Invalid ball count");
  plain(value.config);
  validateConfig(value.config, si);
  if (!Array.isArray(value.inputs) || value.inputs.length > 1000000)
    throw new Error("Invalid inputs");
  const minimumFireTicks = Math.ceil(
    (si ? createBoard : createLegacyBoard)(value.difficulty, value.config).fireInterval / FIXED_DT - 1e-7,
  );
  let last = -1,
    lastFire = -Infinity,
    ended = false,
    shots = 0;
  for (const input of value.inputs) {
    plain(input);
    const end = input.type === "end";
    if (
      ended ||
      Object.keys(input).some(
        (k) =>
          !(
            end ? ["tick", "type"] : ["tick", "type", "power", "angle"]
          ).includes(k),
      ) ||
      !Number.isInteger(input.tick) ||
      input.tick < 0 ||
      input.tick < last ||
      input.tick > 100000000 ||
      (input.type !== undefined && !["fire", "end"].includes(input.type)) ||
      (!end &&
        (!Number.isFinite(input.power) ||
          input.power < 1 ||
          input.power > 100 ||
          !Number.isFinite(input.angle) ||
          input.angle < -175 ||
          input.angle > -5 ||
          (si && input.angle !== -90)))
    )
      throw new Error("Invalid replay input");
    last = input.tick;
    if (end) ended = true;
    else {
      if (input.tick - lastFire < minimumFireTicks)
        throw new Error("Invalid replay fire cadence");
      lastFire = input.tick;
      shots++;
    }
  }
  if (
    !Number.isFinite(value.elapsed) ||
    value.elapsed < 0 ||
    value.elapsed > 1e7
  )
    throw new Error("Invalid elapsed time");
  plain(value.result);
  const resultKeys = ["score", "lost", "jackpots", "fired"];
  if (
    Object.keys(value.result).length !== resultKeys.length ||
    Object.keys(value.result).some((k) => !resultKeys.includes(k)) ||
    resultKeys.some(
      (k) => !Number.isSafeInteger(value.result[k]) || value.result[k] < 0,
    )
  )
    throw new Error("Invalid session result");
  if (
    value.result.fired > value.initialBalls ||
    value.result.lost + value.result.jackpots > value.result.fired ||
    value.result.fired !== shots ||
    last > Math.round(value.elapsed * 240)
  )
    throw new Error("Inconsistent session totals");
  if (
    value.status !== undefined &&
    !["running", "paused", "finished"].includes(value.status)
  )
    throw new Error("Invalid session status");
  if (
    value.endReason !== undefined &&
    value.endReason !== null &&
    (typeof value.endReason !== "string" || value.endReason.length > 64)
  )
    throw new Error("Invalid end reason");
  return structuredClone(value);
}
function validateConfig(v, si = false) {
  if (si) return validateSIConfig(v);
  const ranges = {
    gravity: [0, 3000],
    restitution: [0, 1],
    friction: [0, 1],
    fireInterval: [0.1, 10],
    maxBalls: [1, 32],
    launchAngle: [-175, -5],
    holeScale: [0.35, 1.5],
    launchVariance: [0, 12],
    gatePeriod: [0.1, 60],
    gateOpenDuration: [0, 60],
  };
  for (const [key, x] of Object.entries(v)) {
    if (key === "gate") {
      plain(x);
      for (const [k, n] of Object.entries(x)) {
        const r = {
          period: [0.1, 60],
          openDuration: [0, 60],
          phase: [0, 60],
          width: [0, 600],
        }[k];
        if (!r || !Number.isFinite(n) || n < r[0] || n > r[1])
          throw new Error("Invalid gate configuration");
      }
      continue;
    }
    if (key === "pinPreset") {
      if (!["left", "right", "default"].includes(x))
        throw new Error("Invalid pin preset");
      continue;
    }
    if (key === "pinAdjustments") {
      if (!Array.isArray(x) || x.length > 300)
        throw new Error("Invalid pin adjustments");
      for (const a of x) {
        plain(a);
        if (
          Object.keys(a).some((k) => !["index", "dx", "dy"].includes(k)) ||
          !Number.isInteger(a.index) ||
          a.index < 0 ||
          a.index >= 300 ||
          !Number.isFinite(a.dx) ||
          Math.abs(a.dx) > 20 ||
          !Number.isFinite(a.dy) ||
          Math.abs(a.dy) > 12
        )
          throw new Error("Invalid pin adjustment");
      }
      continue;
    }
    if (key === "trayRPM") {
      if (
        !Array.isArray(x) ||
        x.length !== 3 ||
        x.some((n) => !Number.isFinite(n) || Math.abs(n) > 60)
      )
        throw new Error("Invalid tray rpm");
      continue;
    }
    const r = ranges[key];
    if (
      !r ||
      !Number.isFinite(x) ||
      x < r[0] ||
      x > r[1] ||
      (key === "maxBalls" && !Number.isInteger(x))
    )
      throw new Error("Invalid configuration: " + key);
  }
}
function validateSIConfig(v) {
  const ranges = { gravity: [1,15], restitution: [0,.9], friction: [.01,1], fireInterval: [.1,3], maxBalls: [1,32], launchVariance: [0,.1], holeScale: [.7,1.3], gatePeriod: [.5,15], gateOpenDuration: [.15,12], cradleScale: [.8,1.2], cradleDepthScale: [.7,1.3] };
  for (const [key, value] of Object.entries(v)) {
    if (key === "pinPreset") {
      if (!["default","left","right"].includes(value)) throw new Error("Invalid pin preset");
    } else if (key === "pinAdjustments") {
      if (!Array.isArray(value) || value.length > 109) throw new Error("Invalid pin adjustments");
      const seen = new Set();
      for (const a of value) {
        plain(a);
        if (Object.keys(a).some(k => !["index","dx","dy","angle","restitution"].includes(k)) || !Number.isInteger(a.index) || a.index < 0 || a.index >= 109 || seen.has(a.index)) throw new Error("Invalid pin adjustment");
        seen.add(a.index);
        for (const [k,n] of Object.entries(a)) {
          if (k === "index") continue;
          const [min,max] = {dx:[-.006,.006],dy:[-.006,.006],angle:[-15,15],restitution:[0,.9]}[k];
          if (!Number.isFinite(n) || n < min || n > max) throw new Error("Invalid pin adjustment");
        }
      }
    } else {
      const r = ranges[key];
      if (!r || !Number.isFinite(value) || value < r[0] || value > r[1] || (key === "maxBalls" && !Number.isInteger(value))) throw new Error("Invalid configuration: " + key);
    }
  }
}
export function exportSession(game) {
  if (game.debugUsed)
    throw new Error(
      "デバッグ操作を含むセッションは再現できないため保存できません",
    );
  if (game.inputsTruncated)
    throw new Error("Replay input history was truncated");
  return validateImport({
    version: ["si-1","si-2"].includes(game.board?.physicsVersion) ? 2 : 1,
    ...(["si-1","si-2"].includes(game.board?.physicsVersion) ? { physicsVersion: game.board.physicsVersion } : {}),
    difficulty: game.difficulty || game.board?.difficulty || "easy",
    seed: String(game.seed ?? "abyss"),
    initialBalls: game.initialBalls ?? game.remaining + game.fired,
    config: game.config || game.board,
    inputs: game.inputs.map(({ tick, type, power, angle }) =>
      type === "end" ? { tick, type } : { tick, type: "fire", power, angle },
    ),
    elapsed: game.elapsed,
    ...(game.status ? { status: game.status } : {}),
    ...(game.endReason !== undefined ? { endReason: game.endReason } : {}),
    result: {
      score: game.score,
      lost: game.lost,
      jackpots: game.jackpots,
      fired: game.fired,
    },
  });
}
function openDB() {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) {
      reject(new Error("IndexedDB is unavailable"));
      return;
    }
    const r = indexedDB.open("abyss", 1);
    r.onupgradeneeded = () => {
      for (const k of [...KINDS, "settings"])
        if (!r.result.objectStoreNames.contains(k))
          r.result.createObjectStore(k, { keyPath: "id", autoIncrement: true });
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error || new Error("Database open failed"));
    r.onblocked = () => reject(new Error("Database upgrade blocked"));
  });
}
async function transact(kind, mode, run) {
  const db = await openDB();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(kind, mode);
      let result;
      tx.oncomplete = () => resolve(result);
      tx.onerror = tx.onabort = () =>
        reject(tx.error || new Error("Storage transaction failed"));
      run(tx.objectStore(kind), (v) => {
        result = v;
      });
    });
  } finally {
    db.close();
  }
}
export async function saveRecord(kind, value) {
  if (!KINDS.includes(kind)) throw new Error("Invalid record kind");
  safe(value);
  if (["replays", "history", "presets"].includes(kind))
    value = validateImport(value);
  return transact(kind, "readwrite", (s, done) => {
    const r = s.add({ value: structuredClone(value), createdAt: Date.now() });
    r.onsuccess = () => done(r.result);
    const keys = s.getAllKeys();
    keys.onsuccess = () => {
      for (const key of keys.result.slice(
        0,
        Math.max(0, keys.result.length - LIMIT),
      ))
        s.delete(key);
    };
  });
}
export async function loadRecords(kind) {
  if (!KINDS.includes(kind)) throw new Error("Invalid record kind");
  return transact(kind, "readonly", (s, done) => {
    const r = s.getAll();
    r.onsuccess = () => done(r.result.reverse().map((record) => record.value));
  });
}
export async function saveSettings(value) {
  safe(value);
  plain(value);
  validateSettings(value);
  return transact("settings", "readwrite", (s) => {
    const r = s.get(1);
    r.onsuccess = () => {
      const previous = r.result?.value;
      if (value.physicsVersion && previous && previous.physicsVersion !== value.physicsVersion)
        s.put({ id: previous.physicsVersion === "si-1" ? -1 : 0, value: structuredClone(previous) });
      s.put({ id: 1, value: structuredClone(value) });
    };
  });
}
export async function loadSettings() {
  return transact("settings", "readonly", (s, done) => {
    const r = s.get(1);
    r.onsuccess = () => {
      const value = r.result?.value ?? null;
      if (value !== null) {
        try {
          safe(value);
          plain(value);
          validateSettings(value);
        } catch {
          done(null);
          return;
        }
      }
      done(value);
    };
  });
}

export function validateSettings(value) {
  safe(value);
  plain(value);
  const si = ["si-1","si-2"].includes(value.physicsVersion);
  if (value.physicsVersion !== undefined && !si) throw new Error("Unsupported physics version");
  const ranges = {
    power: [1, 100],
    angle: [-175, -5],
    interval: [0.1, 10],
    gravity: [0, 3000],
    restitution: [0, 1],
    friction: [0, 1],
    gatePeriod: [0.1, 60],
    gateOpenDuration: [0, 60],
    holeScale: [0.35, 1.5],
    volume: [0, 1],
  };
  if (si) Object.assign(ranges, { angle: [-90,-90], interval:[.1,3], gravity:[1,15], restitution:[0,.9], friction:[.01,1], gatePeriod:[.5,15], gateOpenDuration:[.15,12], holeScale:[.7,1.3] });
  for (const [key, v] of Object.entries(value)) {
    if (key === "physicsVersion") continue;
    if (key === "volumes") {
      plain(v);
      if (
        Object.keys(v).some(
          (k) => !["master", "effects", "ambience"].includes(k),
        ) ||
        Object.values(v).some((n) => !Number.isFinite(n) || n < 0 || n > 1)
      )
        throw new Error("Invalid volumes");
    } else if (key === "config") {
      plain(v);
      validateConfig(v, si);
    } else if (key === "difficulty") {
      if (!["easy", "normal", "abyss", "custom"].includes(v))
        throw new Error("Invalid difficulty");
    } else if (key === "seed") {
      if (typeof v !== "string" || v.length > 128)
        throw new Error("Invalid seed");
    } else if (key === "quality") {
      if (!["low", "medium", "high", "auto"].includes(v))
        throw new Error("Invalid quality");
    } else if (key === "reduceMotion") {
      if (typeof v !== "boolean") throw new Error("Invalid reduced motion");
    } else if (key === "rpm") {
      if (
        !Array.isArray(v) ||
        v.length !== 3 ||
        v.some((n) => !Number.isFinite(n) || Math.abs(n) > 60)
      )
        throw new Error("Invalid rpm");
    } else {
      const r = ranges[key];
      if (!r || !Number.isFinite(v) || v < r[0] || v > r[1])
        throw new Error("Invalid settings field: " + key);
    }
  }
}
