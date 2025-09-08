// Lightweight ambient audio controller for welcome.mp3
// - Starts only on explicit user gesture (Explore click)
// - Smooth fade-in, subtle breathing pulse while active
// - Smooth fade-out and cleanup on stop

let audioElement: HTMLAudioElement | null = null;
let isStarting: boolean = false;
let pulseAnimationId: number | null = null;
let fadeAnimationId: number | null = null;

const AUDIO_SRC = "/welcome.mp3"; // served from public/
const BASE_VOLUME = 0.3; // slightly louder background level
const PULSE_AMPLITUDE = 0.08; // wider subtle pulse around base
const PULSE_PERIOD_MS = 4000; // 4s breathing cycle

function cancelPulse() {
  if (pulseAnimationId !== null) {
    cancelAnimationFrame(pulseAnimationId);
    pulseAnimationId = null;
  }
}

function cancelFade() {
  if (fadeAnimationId !== null) {
    cancelAnimationFrame(fadeAnimationId);
    fadeAnimationId = null;
  }
}

function clampVolume(v: number): number {
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

function startPulse() {
  if (!audioElement) return;
  const startTime = performance.now();
  cancelPulse();

  const tick = () => {
    if (!audioElement) {
      pulseAnimationId = null;
      return;
    }
    const elapsed = performance.now() - startTime;
    const phase = (elapsed % PULSE_PERIOD_MS) / PULSE_PERIOD_MS; // 0..1
    const sine = Math.sin(phase * Math.PI * 2); // -1..1
    const target = BASE_VOLUME + PULSE_AMPLITUDE * 0.5 * (sine + 1); // BASE..BASE+AMP
    audioElement.volume = clampVolume(target);
    pulseAnimationId = requestAnimationFrame(tick);
  };

  pulseAnimationId = requestAnimationFrame(tick);
}

function fadeTo(targetVolume: number, durationMs: number): Promise<void> {
  return new Promise((resolve) => {
    if (!audioElement) {
      resolve();
      return;
    }
    cancelFade();
    const startVolume = audioElement.volume || 0;
    const start = performance.now();

    const step = () => {
      if (!audioElement) {
        fadeAnimationId = null;
        resolve();
        return;
      }
      const elapsed = performance.now() - start;
      const t = Math.min(1, elapsed / durationMs);
      const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; // easeInOutQuad
      const v = startVolume + (targetVolume - startVolume) * eased;
      audioElement.volume = clampVolume(v);
      if (t < 1) {
        fadeAnimationId = requestAnimationFrame(step);
      } else {
        fadeAnimationId = null;
        resolve();
      }
    };

    fadeAnimationId = requestAnimationFrame(step);
  });
}

export async function startWelcomeAudio(): Promise<void> {
  if (audioElement || isStarting) {
    return; // already started or in progress
  }
  isStarting = true;
  try {
    audioElement = new Audio(AUDIO_SRC);
    audioElement.loop = true;
    audioElement.preload = "auto";
    audioElement.volume = 0;

    // play() must be called in response to a user gesture
    await audioElement.play();

    // Fade in quickly to base volume, then start gentle pulse
    await fadeTo(BASE_VOLUME, 1000);
    startPulse();
  } catch (err) {
    // If autoplay restrictions still fail, clean up gracefully
    console.warn("[AUDIO] Failed to start welcome audio:", err);
    if (audioElement) {
      try {
        audioElement.pause();
      } catch {}
    }
    audioElement = null;
  } finally {
    isStarting = false;
  }
}

export async function stopWelcomeAudio(): Promise<void> {
  cancelPulse();
  if (!audioElement) return;

  try {
    await fadeTo(0, 900);
  } finally {
    try {
      audioElement.pause();
    } catch {}
    // Release resource
    audioElement.src = "";
    audioElement.load();
    audioElement = null;
  }
}

export function isWelcomeAudioActive(): boolean {
  return !!audioElement;
}


