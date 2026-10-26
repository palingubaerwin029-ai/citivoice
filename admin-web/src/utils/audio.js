/**
 * Web Audio API synthesizer for the CitiVoice Admin Notification Bell.
 * Generates an authentic, harmonic dual-tone chime without external audio files.
 */

let audioCtx = null;

const getAudioContext = () => {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;

  if (!audioCtx) {
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
};

// Auto-unlock AudioContext on first user interaction in the admin portal
if (typeof window !== 'undefined') {
  const unlockEvents = ['click', 'keydown', 'touchstart'];
  const unlock = () => {
    try {
      const ctx = getAudioContext();
      if (ctx && ctx.state === 'running') {
        unlockEvents.forEach((ev) => window.removeEventListener(ev, unlock));
      }
    } catch {
      // ignore
    }
  };
  unlockEvents.forEach((ev) => window.addEventListener(ev, unlock, { once: false, passive: true }));
}

/**
 * Check if notification sound is enabled (persisted in localStorage, default true)
 */
export const isSoundEnabled = () => {
  if (typeof window === 'undefined') return true;
  const val = localStorage.getItem('cv_admin_bell_sound');
  return val === null ? true : val === 'true';
};

/**
 * Set sound enabled state
 */
export const setSoundEnabled = (enabled) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('cv_admin_bell_sound', enabled ? 'true' : 'false');
};

/**
 * Play harmonic notification bell chime
 * @param {number} volume - Volume from 0.0 to 1.0 (default 0.6)
 * @param {boolean} force - If true, play even if sound is muted (used for 'Test Ring')
 */
export const playChimeSound = (volume = 0.6, force = false) => {
  if (!force && !isSoundEnabled()) return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().then(() => playChimeSequence(ctx, volume)).catch(() => {});
    } else {
      playChimeSequence(ctx, volume);
    }
  } catch (err) {
    console.warn('[Audio] Failed to play chime:', err);
  }
};

function playChimeSequence(ctx, volume) {
  const now = ctx.currentTime;

  const playTone = (freq, startTime, duration, gainMax) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);
    // Subtle physical bell resonance decay
    osc.frequency.exponentialRampToValueAtTime(freq * 0.998, startTime + duration);

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(gainMax * volume, startTime + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);
  };

  // Tone 1: Crisp bell strike at 987.77 Hz (B5) + overtone 1975.5 Hz
  playTone(987.77, now, 0.6, 0.35);
  playTone(1975.53, now, 0.3, 0.12);

  // Tone 2: Warm harmonic resolution at 1318.51 Hz (E6) at +0.13s
  playTone(1318.51, now + 0.13, 0.85, 0.45);
  playTone(2637.02, now + 0.13, 0.45, 0.15);

  // Tone 3: Shimmering sustain at 1567.98 Hz (G6) at +0.26s
  playTone(1567.98, now + 0.26, 1.1, 0.28);
}
