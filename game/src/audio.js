// Procedural Web Audio sound synthesizer for chopping, sizzling, plating, bells, and alerts.

export function createAudioEngine() {
  let ctx = null;
  let muted = false;
  let disabled = false;

  function ensureContext() {
    if (disabled || muted) return null;
    if (!ctx) {
      const AudioCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtor) {
        disabled = true;
        return null;
      }
      ctx = new AudioCtor();
    }
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    return ctx;
  }

  function tone(freq, endFreq, duration, type = 'triangle', gainPeak = 0.14, delay = 0) {
    const audio = ensureContext();
    if (!audio) return;
    const now = audio.currentTime + delay;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq !== freq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(30, endFreq), now + duration);
    }
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(gainPeak, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(audio.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  function noiseBurst(duration, filterFreq, gainPeak = 0.08) {
    const audio = ensureContext();
    if (!audio) return;
    const frames = Math.max(1, Math.floor(audio.sampleRate * duration));
    const buffer = audio.createBuffer(1, frames, audio.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
    }
    const source = audio.createBufferSource();
    source.buffer = buffer;
    const filter = audio.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq;
    const gain = audio.createGain();
    gain.gain.value = gainPeak;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(audio.destination);
    source.start();
  }

  return {
    unlock() {
      ensureContext();
    },
    setMuted(nextMuted) {
      muted = Boolean(nextMuted);
    },
    isMuted() {
      return muted;
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    disable() {
      disabled = true;
    },
    playChop() {
      noiseBurst(0.055, 2200, 0.14);
      tone(290, 140, 0.06, 'triangle', 0.11);
    },
    playPickup() {
      tone(420, 620, 0.08, 'sine', 0.1);
    },
    playPlateClink() {
      tone(1180, 1480, 0.09, 'sine', 0.08);
      tone(1760, 1520, 0.08, 'triangle', 0.05, 0.02);
    },
    playSearStart() {
      noiseBurst(0.24, 3400, 0.07);
      tone(220, 310, 0.12, 'sawtooth', 0.04);
    },
    playSweetSpotChime() {
      tone(660, 880, 0.11, 'sine', 0.11);
      tone(990, 1320, 0.14, 'triangle', 0.1, 0.07);
    },
    playBellServe() {
      tone(1318, 1318, 0.35, 'sine', 0.15);
      tone(1975, 1975, 0.28, 'sine', 0.09, 0.01);
      tone(880, 1175, 0.18, 'triangle', 0.08, 0.1);
    },
    playDash() {
      noiseBurst(0.11, 900, 0.09);
      tone(240, 480, 0.1, 'sine', 0.07);
    },
    playErrorBuzz() {
      tone(185, 120, 0.15, 'sawtooth', 0.08);
    },
    playOrderTicket() {
      tone(540, 720, 0.09, 'triangle', 0.06);
    },
    playShiftComplete() {
      tone(523, 523, 0.16, 'triangle', 0.12, 0.0);
      tone(659, 659, 0.16, 'triangle', 0.12, 0.11);
      tone(784, 784, 0.2, 'triangle', 0.13, 0.22);
      tone(1046, 1046, 0.36, 'sine', 0.14, 0.34);
    },
  };
}
