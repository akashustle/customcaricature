// Currency/money sound using uploaded MP3 file
let cachedAudio: HTMLAudioElement | null = null;
let cachedPaymentAudio: HTMLAudioElement | null = null;

const playMp3Sound = () => {
  try {
    if (!cachedAudio) {
      cachedAudio = new Audio('/sounds/currency.mp3');
    }
    const audio = cachedAudio.cloneNode() as HTMLAudioElement;
    audio.volume = 0.5;
    audio.play().catch(() => {});
  } catch {}
};

export const playPaymentSuccessSound = () => {
  try {
    if (!cachedPaymentAudio) {
      cachedPaymentAudio = new Audio('/sounds/payment-success.mp3');
    }
    const audio = cachedPaymentAudio.cloneNode() as HTMLAudioElement;
    audio.volume = 0.7;
    audio.play().catch(() => {});
  } catch {}
};

export const playCurrencySound = playMp3Sound;
export const playCoinDrop = playMp3Sound;
export const playCashRegister = playMp3Sound;

export const playEnterSound = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = ctx.currentTime;
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
