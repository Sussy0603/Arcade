// sound.js
// All audio is synthesized at runtime with the Web Audio API — no sound
// files to license, download, or ship. When a Season theme (Été, Printemps,
// Automne, Hiver) is active, both the interaction sound effects and the
// background music switch to match that season's mood.

const SoundManager = (() => {
  let ctx = null;
  let musicGain = null;
  let sfxGain = null;
  let musicOn = true;
  let sfxOn = true;
  let musicStarted = false;
  let currentTheme = "default"; // "default" | "ete" | "printemps" | "automne" | "hiver"
  let musicSession = null;      // { stop() }

  function ensureCtx() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
      musicGain = ctx.createGain();
      musicGain.gain.value = 0.16;
      musicGain.connect(ctx.destination);
      sfxGain = ctx.createGain();
      sfxGain.gain.value = 0.35;
      sfxGain.connect(ctx.destination);
    }
    if (ctx.state === "suspended") ctx.resume();
  }

  // ---------- low-level building blocks ----------
  function tone(freq, startTime, duration, type, gainNode, peak) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type || "sine";
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, startTime);
    g.gain.linearRampToValueAtTime(peak != null ? peak : 0.3, startTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
    osc.connect(g);
    g.connect(gainNode);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
    return osc;
  }

  function bellTone(freq, startTime, gainNode, peak, decay) {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const g = ctx.createGain();
    const g2 = ctx.createGain();
    osc1.type = "sine"; osc1.frequency.value = freq;
    osc2.type = "sine"; osc2.frequency.value = freq * 2.01; // slight detune for bell shimmer
    g2.gain.value = 0.28;
    g.gain.setValueAtTime(0.0001, startTime);
    g.gain.linearRampToValueAtTime(peak, startTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, startTime + decay);
    osc2.connect(g2);
    g2.connect(g);
    osc1.connect(g);
    g.connect(gainNode);
    osc1.start(startTime); osc1.stop(startTime + decay + 0.1);
    osc2.start(startTime); osc2.stop(startTime + decay + 0.1);
  }

  function createNoiseBuffer(durationSeconds) {
    const sampleRate = ctx.sampleRate;
    const length = Math.max(1, Math.floor(sampleRate * durationSeconds));
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  function noiseBurst(startTime, duration, filterFreq, gainNode, peak, filterType) {
    const buffer = createNoiseBuffer(duration + 0.05);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filt = ctx.createBiquadFilter();
    filt.type = filterType || "bandpass";
    filt.frequency.value = filterFreq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, startTime);
    g.gain.linearRampToValueAtTime(peak, startTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
    src.connect(filt); filt.connect(g); g.connect(gainNode);
    src.start(startTime);
    src.stop(startTime + duration + 0.05);
  }

  // ---------- themed interaction SFX ----------
  function playClick() {
    if (!sfxOn) return;
    ensureCtx();
    tone(660, ctx.currentTime, 0.08, "triangle", sfxGain, 0.18);
  }

  function playPlace() {
    if (!sfxOn) return;
    ensureCtx();
    const now = ctx.currentTime;
    switch (currentTheme) {
      case "ete": // sun-like: warm bright double chime
        tone(523.25, now, 0.14, "triangle", sfxGain, 0.22);
        tone(659.25, now + 0.03, 0.16, "sine", sfxGain, 0.14);
        break;
      case "printemps": // sparkle: quick ascending twinkle
        [1046.5, 1318.5, 1568.0].forEach((f, i) => tone(f, now + i * 0.035, 0.12, "sine", sfxGain, 0.15));
        break;
      case "automne": // crunchy leaves: staccato filtered noise bursts
        for (let i = 0; i < 3; i++) {
          noiseBurst(now + i * 0.035, 0.05, 2200 + Math.random() * 1800, sfxGain, 0.18, "bandpass");
        }
        break;
      case "hiver": // snow: soft airy puff
        noiseBurst(now, 0.2, 900, sfxGain, 0.09, "lowpass");
        break;
      default:
        tone(440, now, 0.12, "sine", sfxGain, 0.22);
    }
  }

  function playInvalid() {
    if (!sfxOn) return;
    ensureCtx();
    tone(150, ctx.currentTime, 0.12, "sawtooth", sfxGain, 0.12);
  }

  function playClear(lines) {
    if (!sfxOn) return;
    ensureCtx();
    const now = ctx.currentTime;
    const count = Math.max(1, Math.min(4, lines + 1));
    switch (currentTheme) {
      case "ete": {
        const base = [523.25, 659.25, 783.99, 987.77];
        for (let i = 0; i < count; i++) tone(base[i], now + i * 0.07, 0.3, "triangle", sfxGain, 0.26);
        break;
      }
      case "printemps": {
        const base = [1046.5, 1318.5, 1568.0, 2093.0];
        for (let i = 0; i < count; i++) tone(base[i], now + i * 0.06, 0.2, "sine", sfxGain, 0.2);
        break;
      }
      case "automne": {
        for (let i = 0; i < count + 2; i++) {
          noiseBurst(now + i * 0.045, 0.06, 1800 + Math.random() * 2000, sfxGain, 0.2, "bandpass");
        }
        break;
      }
      case "hiver": {
        const base = [1568.0, 1760.0, 1975.5, 2093.0];
        for (let i = 0; i < count; i++) bellTone(base[i], now + i * 0.09, sfxGain, 0.2, 0.5);
        break;
      }
      default: {
        const base = 523.25;
        const semis = [0, 4, 7, 12];
        for (let i = 0; i < count; i++) {
          tone(base * Math.pow(2, semis[i] / 12), now + i * 0.07, 0.25, "triangle", sfxGain, 0.28);
        }
      }
    }
  }

  function playGameOver() {
    if (!sfxOn) return;
    ensureCtx();
    [0, -2, -4, -7].forEach((semi, i) => {
      const freq = 392 * Math.pow(2, semi / 12);
      tone(freq, ctx.currentTime + i * 0.15, 0.35, "sine", sfxGain, 0.28);
    });
  }

  function playAchievement() {
    if (!sfxOn) return;
    ensureCtx();
    [0, 4, 7, 12, 16].forEach((semi, i) => {
      const freq = 523.25 * Math.pow(2, semi / 12);
      tone(freq, ctx.currentTime + i * 0.08, 0.3, "sine", sfxGain, 0.22);
    });
  }

  // ---------- background music sessions ----------
  // Each start*Music() returns { stop() } so we can cleanly swap themes.

  function startDefaultMusic() {
    const CHORDS = [
      [261.63, 329.63, 392.00, 493.88],
      [220.00, 261.63, 329.63, 392.00],
      [174.61, 220.00, 261.63, 349.23],
      [196.00, 246.94, 293.66, 392.00]
    ];
    let idx = 0;
    let timer = null;
    function step() {
      const now = ctx.currentTime + 0.05;
      const chord = CHORDS[idx % CHORDS.length];
      idx++;
      chord.forEach(freq => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        g.gain.setValueAtTime(0.0001, now);
        g.gain.linearRampToValueAtTime(0.05, now + 1.4);
        g.gain.linearRampToValueAtTime(0.0001, now + 3.6);
        osc.connect(g); g.connect(musicGain);
        osc.start(now); osc.stop(now + 3.7);
      });
      timer = setTimeout(step, 3600);
    }
    step();
    return { stop: () => { if (timer) clearTimeout(timer); } };
  }

  // Été — soft rolling water: filtered noise with a slow "wave" LFO on the filter cutoff
  function startWaterMusic() {
    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = createNoiseBuffer(4);
    noiseSrc.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 500;
    const gain = ctx.createGain();
    gain.gain.value = 0.06;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.13;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 260;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    noiseSrc.connect(filter);
    filter.connect(gain);
    gain.connect(musicGain);
    lfo.start();
    noiseSrc.start();
    return {
      stop: () => {
        try { noiseSrc.stop(); } catch (e) {}
        try { lfo.stop(); } catch (e) {}
      }
    };
  }

  // Printemps — soft, sparse bird chirps at randomized intervals
  function startBirdsMusic() {
    let timer = null;
    function scheduleChirp() {
      const now = ctx.currentTime;
      const chirpCount = 2 + Math.floor(Math.random() * 2);
      for (let i = 0; i < chirpCount; i++) {
        const start = now + i * 0.18;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = "sine";
        const baseFreq = 1800 + Math.random() * 900;
        osc.frequency.setValueAtTime(baseFreq, start);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.35, start + 0.05);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.9, start + 0.11);
        g.gain.setValueAtTime(0.0001, start);
        g.gain.linearRampToValueAtTime(0.045, start + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, start + 0.14);
        osc.connect(g); g.connect(musicGain);
        osc.start(start); osc.stop(start + 0.16);
      }
      timer = setTimeout(scheduleChirp, 2600 + Math.random() * 3600);
    }
    scheduleChirp();
    return { stop: () => { if (timer) clearTimeout(timer); } };
  }

  // Automne — warm slow lofi chords through a lowpass "warmth" filter, plus quiet vinyl crackle
  function startLofiMusic() {
    const LOFI_CHORDS = [
      [220.00, 261.63, 329.63, 415.30],
      [196.00, 246.94, 293.66, 369.99],
      [174.61, 220.00, 261.63, 349.23],
      [164.81, 207.65, 261.63, 311.13]
    ];
    let idx = 0;
    let chordTimer = null;
    function step() {
      const now = ctx.currentTime + 0.05;
      const chord = LOFI_CHORDS[idx % LOFI_CHORDS.length];
      idx++;
      chord.forEach(freq => {
        const osc = ctx.createOscillator();
        const filt = ctx.createBiquadFilter();
        filt.type = "lowpass";
        filt.frequency.value = 900;
        const g = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.value = freq;
        g.gain.setValueAtTime(0.0001, now);
        g.gain.linearRampToValueAtTime(0.045, now + 1.6);
        g.gain.linearRampToValueAtTime(0.0001, now + 4.4);
        osc.connect(filt); filt.connect(g); g.connect(musicGain);
        osc.start(now); osc.stop(now + 4.5);
      });
      chordTimer = setTimeout(step, 4400);
    }
    step();

    const crackleSrc = ctx.createBufferSource();
    crackleSrc.buffer = createNoiseBuffer(3);
    crackleSrc.loop = true;
    const crackleFilter = ctx.createBiquadFilter();
    crackleFilter.type = "highpass";
    crackleFilter.frequency.value = 3000;
    const crackleGain = ctx.createGain();
    crackleGain.gain.value = 0.012;
    crackleSrc.connect(crackleFilter);
    crackleFilter.connect(crackleGain);
    crackleGain.connect(musicGain);
    crackleSrc.start();

    return {
      stop: () => {
        if (chordTimer) clearTimeout(chordTimer);
        try { crackleSrc.stop(); } catch (e) {}
      }
    };
  }

  // Hiver — a small original bell motif, softly looped (not a copy of any specific carol)
  function startBellsMusic() {
    const melody = [784.0, 784.0, 784.0, 880.0, 784.0, 698.46, 659.25, 659.25, 698.46, 784.0];
    let timer = null;
    function playMelody() {
      const now = ctx.currentTime + 0.05;
      melody.forEach((freq, i) => {
        bellTone(freq, now + i * 0.34, musicGain, 0.055, 1.0);
      });
      timer = setTimeout(playMelody, melody.length * 340 + 2200);
    }
    playMelody();
    return { stop: () => { if (timer) clearTimeout(timer); } };
  }

  function startMusic() {
    ensureCtx();
    if (musicStarted || !musicOn) return;
    musicStarted = true;
    switch (currentTheme) {
      case "ete": musicSession = startWaterMusic(); break;
      case "printemps": musicSession = startBirdsMusic(); break;
      case "automne": musicSession = startLofiMusic(); break;
      case "hiver": musicSession = startBellsMusic(); break;
      default: musicSession = startDefaultMusic(); break;
    }
  }

  function stopMusic() {
    if (musicSession && musicSession.stop) musicSession.stop();
    musicSession = null;
    musicStarted = false;
  }

  function setMusicOn(on) {
    musicOn = on;
    if (on) startMusic(); else stopMusic();
  }

  function setSfxOn(on) { sfxOn = on; }

  function setSoundTheme(themeId) {
    const seasonIds = ["ete", "printemps", "automne", "hiver"];
    const next = seasonIds.includes(themeId) ? themeId : "default";
    if (next === currentTheme) return;
    currentTheme = next;
    if (musicOn && musicStarted) {
      stopMusic();
      musicStarted = false;
      startMusic();
    }
  }

  function unlockAudioOnFirstGesture() {
    const handler = () => {
      ensureCtx();
      if (musicOn) startMusic();
      window.removeEventListener("pointerdown", handler);
    };
    window.addEventListener("pointerdown", handler, { once: true });
  }

  return {
    playClick, playPlace, playInvalid, playClear, playGameOver, playAchievement,
    setMusicOn, setSfxOn, setSoundTheme, unlockAudioOnFirstGesture
  };
})();
