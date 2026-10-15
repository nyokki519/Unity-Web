/** Original procedural sound only. Call setEnabled(true) directly from a user gesture. */
export function createAudio() {
  const volumes = { master: 0.65, effects: 0.8, ambience: 0.3 };
  const voices = new Set();
  const lastHit = new Map();
  let context, master, effects, ambience, noiseBuffer;
  let enabled = false,
    destroyed = false,
    running = false,
    ambientVoice = null;
  let generation = 0;
  const clamp = (n, fallback = 0) =>
    Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : fallback;

  function stopVoice(voice) {
    if (!voice || voice.stopped) return;
    voice.stopped = true;
    voices.delete(voice);
    for (const source of voice.sources) {
      source.onended = null;
      try {
        source.stop();
      } catch {
        /* Source may already have ended. */
      }
      source.disconnect();
    }
    for (const node of voice.nodes) node.disconnect();
    if (ambientVoice === voice) ambientVoice = null;
  }

  function stopAll() {
    for (const voice of [...voices]) stopVoice(voice);
    lastHit.clear();
  }

  function voice(bus, duration, ambient = false) {
    if (voices.size >= 12) {
      const oldest = [...voices].find((v) => v !== ambientVoice);
      if (!oldest) return null;
      stopVoice(oldest);
    }
    const gain = context.createGain();
    gain.connect(bus);
    const result = { sources: [], nodes: [gain], gain, stopped: false };
    voices.add(result);
    if (!ambient) {
      // One silent clock source cleans every node after the entire sound ends.
      const clock = context.createBufferSource();
      clock.buffer = noiseBuffer;
      clock.onended = () => stopVoice(result);
      clock.start(context.currentTime);
      clock.stop(context.currentTime + duration);
      result.sources.push(clock);
    }
    return result;
  }

  function tone(
    v,
    frequency,
    amplitude,
    decay,
    delay = 0,
    endFrequency = frequency,
    kind = "sine",
  ) {
    const now = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = kind;
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(15, endFrequency),
      now + decay,
    );
    envelope.gain.setValueAtTime(0, context.currentTime);
    envelope.gain.setValueAtTime(amplitude, now);
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + decay);
    oscillator.connect(envelope);
    envelope.connect(v.gain);
    oscillator.start(now);
    oscillator.stop(now + decay + 0.02);
    v.sources.push(oscillator);
    v.nodes.push(envelope);
  }

  function noise(v, amplitude, duration, frequency = 1800) {
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const envelope = context.createGain();
    source.buffer = noiseBuffer;
    filter.type = "bandpass";
    filter.frequency.value = frequency;
    filter.Q.value = 0.8;
    envelope.gain.setValueAtTime(amplitude, context.currentTime);
    envelope.gain.exponentialRampToValueAtTime(
      0.0001,
      context.currentTime + duration,
    );
    source.connect(filter);
    filter.connect(envelope);
    envelope.connect(v.gain);
    source.start();
    source.stop(context.currentTime + duration);
    v.sources.push(source);
    v.nodes.push(filter, envelope);
  }

  function syncAmbience() {
    const audible =
      enabled &&
      running &&
      context?.state === "running" &&
      volumes.master > 0 &&
      volumes.ambience > 0;
    if (!audible) {
      stopVoice(ambientVoice);
      return;
    }
    if (ambientVoice) return;
    const v = voice(ambience, 0, true);
    if (!v) return;
    ambientVoice = v;
    const now = context.currentTime;
    v.gain.gain.setValueAtTime(0, now);
    v.gain.gain.linearRampToValueAtTime(0.035, now + 0.3);
    for (const frequency of [73, 109.7]) {
      const oscillator = context.createOscillator();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      oscillator.connect(v.gain);
      oscillator.start();
      v.sources.push(oscillator);
    }
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    source.buffer = noiseBuffer;
    source.loop = true;
    filter.type = "lowpass";
    filter.frequency.value = 240;
    source.connect(filter);
    filter.connect(v.gain);
    source.start();
    v.sources.push(source);
    v.nodes.push(filter);
  }

  async function setEnabled(value) {
    const request = ++generation;
    enabled = Boolean(value) && !destroyed;
    if (!enabled) {
      stopAll();
      if (context && context.state === "running") await context.suspend();
      return;
    }
    try {
      if (!context) {
        const AudioContext =
          globalThis.AudioContext || globalThis.webkitAudioContext;
        if (!AudioContext) {
          enabled = false;
          return;
        }
        context = new AudioContext();
        master = context.createGain();
        effects = context.createGain();
        ambience = context.createGain();
        effects.connect(master);
        ambience.connect(master);
        // Soft limiting keeps simultaneous metallic transients comfortable.
        const limiter = context.createDynamicsCompressor();
        limiter.threshold.value = -12;
        limiter.ratio.value = 8;
        master.connect(limiter);
        limiter.connect(context.destination);
        for (const [name, node] of Object.entries({
          master,
          effects,
          ambience,
        }))
          node.gain.value = volumes[name];
        noiseBuffer = context.createBuffer(
          1,
          Math.ceil(context.sampleRate * 2),
          context.sampleRate,
        );
        const data = noiseBuffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      }
      await context.resume();
      if (request !== generation || destroyed || !enabled) return;
      syncAmbience();
    } catch {
      if (request === generation) {
        enabled = false;
        stopAll();
      }
    }
  }

  function setVolume(group, value) {
    if (!(group in volumes) || !Number.isFinite(value) || destroyed) return;
    volumes[group] = clamp(value);
    const node = { master, effects, ambience }[group];
    if (node)
      node.gain.setTargetAtTime(volumes[group], context.currentTime, 0.025);
    if (volumes.master === 0) stopAll();
    else if (volumes.effects === 0) {
      for (const v of [...voices]) if (v !== ambientVoice) stopVoice(v);
    }
    syncAmbience();
  }

  function play(event) {
    if (
      !enabled ||
      destroyed ||
      context?.state !== "running" ||
      !volumes.master ||
      !volumes.effects
    )
      return;
    const type = typeof event === "string" ? event : event?.type;
    if (
      ![
        "fire",
        "pin",
        "wall",
        "ball-contact",
        "gate-block",
        "gate-pass",
        "tray-enter",
        "hole-win",
        "hole-miss",
        "jackpot",
        "lost",
      ].includes(type)
    )
      return;
    const collision = ["pin", "wall", "ball-contact", "gate-block"].includes(
      type,
    );
    const now = context.currentTime;
    if (collision && now - (lastHit.get("collision") ?? -Infinity) < 0.028)
      return;
    if (now - (lastHit.get(type) ?? -Infinity) < (collision ? 0.045 : 0.08))
      return;
    lastHit.set(type, now);
    if (collision) lastHit.set("collision", now);
    const energy = Math.max(
      0.12,
      Math.min(1, Math.sqrt(Math.max(0, Number(event?.energy) || 0)) / 150),
    );
    const v = voice(effects, type === "jackpot" ? 2 : 0.85);
    if (!v) return;
    if (collision) {
      const base =
        type === "pin"
          ? 2100
          : type === "gate-block"
            ? 660
            : type === "wall"
              ? 1250
              : 1600;
      const pitch = base * (0.94 + Math.random() * 0.12);
      // Inharmonic, individually decaying modes mimic a struck metal pin.
      [1, 1.47, 2.09].forEach((ratio, i) =>
        tone(v, pitch * ratio, (energy * 0.12) / (i + 1), 0.12 + i * 0.05),
      );
      noise(v, energy * 0.12, 0.025, 3500);
    } else if (type === "fire") {
      noise(v, 0.45, 0.16, 900);
      tone(v, 170, 0.2, 0.22, 0, 48, "triangle");
    } else if (type === "jackpot") {
      [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98].forEach((f, i) =>
        tone(v, f, 0.13, 0.75, i * 0.16),
      );
    } else if (type === "hole-win" || type === "gate-pass") {
      [660, 990, 1320].forEach((f, i) => tone(v, f, 0.11, 0.3, i * 0.085));
    } else if (type === "tray-enter") {
      tone(v, 420, 0.15, 0.4);
      tone(v, 613, 0.08, 0.25);
      noise(v, 0.13, 0.08, 700);
    } else {
      tone(v, type === "lost" ? 190 : 310, 0.13, 0.32, 0, 80, "triangle");
      noise(v, 0.1, 0.1, 450);
    }
  }

  function update(game) {
    running = game?.status === "running";
    syncAmbience();
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    enabled = false;
    generation++;
    stopAll();
    if (context) {
      master.disconnect();
      effects.disconnect();
      ambience.disconnect();
      context.close().catch(() => {});
    }
    noiseBuffer = null;
  }

  return { setEnabled, setVolume, play, update, destroy };
}
