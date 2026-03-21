// Realistic currency/coin sound effects using Web Audio API

const audioCtx = () => new (window.AudioContext || (window as any).webkitAudioContext)();

export const playCurrencySound = () => {
  try {
    const ctx = audioCtx();
    const now = ctx.currentTime;

    // Layer 1: Metallic coin hit
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(3200, now);
    osc1.frequency.exponentialRampToValueAtTime(1800, now + 0.08);
    osc1.frequency.exponentialRampToValueAtTime(900, now + 0.3);
    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Layer 2: Coin ring
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(4400, now);
    osc2.frequency.exponentialRampToValueAtTime(2200, now + 0.15);
    gain2.gain.setValueAtTime(0.06, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now);
    osc2.stop(now + 0.4);

    // Layer 3: Second coin bounce
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.type = "sine";
    osc3.frequency.setValueAtTime(2800, now + 0.1);
    osc3.frequency.exponentialRampToValueAtTime(1400, now + 0.25);
    gain3.gain.setValueAtTime(0, now);
    gain3.gain.setValueAtTime(0.08, now + 0.1);
    gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc3.connect(gain3);
    gain3.connect(ctx.destination);
    osc3.start(now);
    osc3.stop(now + 0.5);

    // Layer 4: Cash register ding
    const osc4 = ctx.createOscillator();
    const gain4 = ctx.createGain();
    osc4.type = "sine";
    osc4.frequency.setValueAtTime(1568, now + 0.15); // G6
    gain4.gain.setValueAtTime(0, now);
    gain4.gain.setValueAtTime(0.1, now + 0.15);
    gain4.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
    osc4.connect(gain4);
    gain4.connect(ctx.destination);
    osc4.start(now);
    osc4.stop(now + 0.7);
  } catch {}
};

export const playCoinDrop = () => {
  try {
    const ctx = audioCtx();
    const now = ctx.currentTime;
    // Multiple coin drops in sequence
    [0, 0.08, 0.18, 0.3].forEach((delay, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const freq = 2400 + (i * 300);
      osc.type = i % 2 === 0 ? "sine" : "triangle";
      osc.frequency.setValueAtTime(freq, now + delay);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.4, now + delay + 0.12);
      gain.gain.setValueAtTime(0, now);
      gain.gain.setValueAtTime(0.1 - i * 0.015, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + delay);
      osc.stop(now + delay + 0.25);
    });
  } catch {}
};

export const playEnterSound = () => {
  try {
    const ctx = audioCtx();
    const now = ctx.currentTime;
    // Ascending chime
    [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + i * 0.12);
      gain.gain.setValueAtTime(0, now);
      gain.gain.setValueAtTime(0.1, now + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.12);
      osc.stop(now + i * 0.12 + 0.5);
    });
  } catch {}
};

export const playCashRegister = () => {
  try {
    const ctx = audioCtx();
    const now = ctx.currentTime;
    // Mechanical click
    const noise = ctx.createBufferSource();
    const bufferSize = ctx.sampleRate * 0.05;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.1));
    }
    noise.buffer = buffer;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.08, now);
    noise.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start(now);

    // Bell ding
    const bell = ctx.createOscillator();
    const bellGain = ctx.createGain();
    bell.type = "sine";
    bell.frequency.setValueAtTime(2093, now + 0.05); // C7
    bellGain.gain.setValueAtTime(0, now);
    bellGain.gain.setValueAtTime(0.15, now + 0.05);
    bellGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
    bell.connect(bellGain);
    bellGain.connect(ctx.destination);
    bell.start(now + 0.05);
    bell.stop(now + 0.8);
  } catch {}
};
