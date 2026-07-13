let audioContext: AudioContext | null = null;

type SoundName = "enter" | "escape" | "post";

const sounds: Record<SoundName, { frequency: number; duration: number; gain: number }> = {
  enter: { frequency: 880, duration: 0.035, gain: 0.018 },
  escape: { frequency: 440, duration: 0.045, gain: 0.014 },
  post: { frequency: 760, duration: 0.12, gain: 0.038 },
};

export function playUiSound(name: SoundName) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      return;
    }

    audioContext ??= new AudioContextClass();
    const config = sounds[name];
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const now = audioContext.currentTime;

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(config.frequency, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(config.gain, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + config.duration);

    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + config.duration + 0.01);
  } catch {
    // Audio feedback is intentionally best-effort.
  }
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
