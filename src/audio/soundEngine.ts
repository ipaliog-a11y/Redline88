// Procedural 8-bit Web Audio API synthesizer for REDLINE '88

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private muted = false;

  // Continuous engine synth nodes
  private engineActive = false;
  private oscMain: OscillatorNode | null = null;
  private oscSub: OscillatorNode | null = null;
  private oscWhine: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private whineGain: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;

  constructor() {
    try {
      const saved = localStorage.getItem('redline88_muted');
      if (saved === 'true') this.muted = true;
    } catch {
      // ignore
    }
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : 0.32;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    try {
      localStorage.setItem('redline88_muted', String(this.muted));
    } catch {
      // ignore
    }
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.muted ? 0 : 0.32, this.ctx.currentTime, 0.02);
    }
    return this.muted;
  }

  public startEngine(tier: number): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || this.engineActive) return;

    this.engineFilter = ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.value = 340;
    this.engineFilter.Q.value = 3.2;

    this.engineGain = ctx.createGain();
    this.engineGain.gain.value = 0.001;

    this.oscMain = ctx.createOscillator();
    this.oscMain.type = tier >= 4 ? 'sawtooth' : 'square';
    this.oscMain.frequency.value = 55;

    this.oscSub = ctx.createOscillator();
    this.oscSub.type = 'sawtooth';
    this.oscSub.frequency.value = 28;

    const subGain = ctx.createGain();
    subGain.gain.value = tier >= 4 ? 0.85 : 0.55;

    // Supercharger / Turbo whine
    this.oscWhine = ctx.createOscillator();
    this.oscWhine.type = 'triangle';
    this.oscWhine.frequency.value = 420;
    this.whineGain = ctx.createGain();
    this.whineGain.gain.value = 0.001;

    this.oscMain.connect(this.engineFilter);
    this.oscSub.connect(subGain);
    subGain.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.masterGain);

    this.oscWhine.connect(this.whineGain);
    this.whineGain.connect(this.masterGain);

    this.oscMain.start();
    this.oscSub.start();
    this.oscWhine.start();
    this.engineActive = true;
  }

  public updateEngine(params: {
    rpm: number;
    redline: number;
    throttle: boolean;
    clutch: boolean;
    tier: number;
    boost: boolean;
    inductionLevel: number;
  }): void {
    if (!this.engineActive || !this.ctx || !this.oscMain || !this.oscSub || !this.engineFilter || !this.engineGain || !this.oscWhine || !this.whineGain) {
      return;
    }
    const now = this.ctx.currentTime;
    const norm = Math.max(0, Math.min(1.1, params.rpm / params.redline));
    const tierBase = params.tier >= 5 ? 36 : params.tier >= 4 ? 42 : params.tier === 2 ? 46 : 56;
    const freq = tierBase + norm * (params.tier >= 4 ? 195 : 165);

    this.oscMain.frequency.setTargetAtTime(freq, now, 0.025);
    this.oscSub.frequency.setTargetAtTime(freq * 0.503, now, 0.025);

    const filterCutoff = (params.throttle ? 480 : 210) + norm * (params.boost ? 1950 : 1250);
    this.engineFilter.frequency.setTargetAtTime(filterCutoff, now, 0.03);

    const vol = params.throttle ? (params.clutch ? 0.22 : 0.34) : 0.12;
    this.engineGain.gain.setTargetAtTime(vol, now, 0.03);

    const hasForcedInduction = params.inductionLevel >= 2 || params.tier >= 3;
    const whineTarget = hasForcedInduction && params.throttle ? 0.02 + norm * (params.boost ? 0.1 : 0.055) : 0.001;
    this.oscWhine.frequency.setTargetAtTime(500 + norm * 1650 + (params.boost ? 350 : 0), now, 0.03);
    this.whineGain.gain.setTargetAtTime(whineTarget, now, 0.04);
  }

  public stopEngine(): void {
    if (!this.engineActive) return;
    try {
      this.oscMain?.stop();
      this.oscSub?.stop();
      this.oscWhine?.stop();
      this.oscMain?.disconnect();
      this.oscSub?.disconnect();
      this.oscWhine?.disconnect();
      this.engineFilter?.disconnect();
      this.engineGain?.disconnect();
      this.whineGain?.disconnect();
    } catch {
      // ignore
    }
    this.oscMain = null;
    this.oscSub = null;
    this.oscWhine = null;
    this.engineFilter = null;
    this.engineGain = null;
    this.whineGain = null;
    this.engineActive = false;
  }

  private playTone(
    freq: number,
    duration: number,
    type: OscillatorType = 'square',
    volume = 0.24,
    slideToFreq?: number,
    delay = 0
  ): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideToFreq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideToFreq), now + duration);
    }
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  private playNoise(duration: number, volume = 0.25, cutoff = 1200, delay = 0): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const now = ctx.currentTime + delay;
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(cutoff, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    source.start(now);
  }

  public playTreeAmber(): void {
    this.playTone(440, 0.14, 'square', 0.24);
  }

  public playTreeGreen(): void {
    this.playTone(880, 0.28, 'square', 0.3);
    this.playTone(1320, 0.24, 'triangle', 0.18, undefined, 0.04);
  }

  public playFoul(): void {
    this.playTone(170, 0.38, 'sawtooth', 0.32, 110);
    this.playTone(135, 0.38, 'square', 0.2, 95, 0.06);
  }

  public playLaunchHook(perfect: boolean): void {
    this.playNoise(0.24, perfect ? 0.34 : 0.22, perfect ? 900 : 1800);
    if (perfect) {
      this.playTone(523.25, 0.09, 'square', 0.24);
      this.playTone(659.25, 0.09, 'square', 0.24, undefined, 0.06);
      this.playTone(1046.5, 0.18, 'square', 0.26, undefined, 0.12);
    }
  }

  public playShift(quality: 'perfect_clutch' | 'perfect' | 'good' | 'miss'): void {
    // Mechanical gearbox clunk + exhaust pop
    this.playNoise(0.09, 0.3, 620);
    if (quality === 'perfect_clutch') {
      this.playTone(587.33, 0.07, 'square', 0.24);
      this.playTone(880, 0.08, 'square', 0.26, undefined, 0.05);
      this.playTone(1174.66, 0.16, 'square', 0.28, undefined, 0.1);
    } else if (quality === 'perfect') {
      this.playTone(523.25, 0.07, 'square', 0.22);
      this.playTone(783.99, 0.13, 'square', 0.24, undefined, 0.055);
    } else if (quality === 'good') {
      this.playTone(392, 0.08, 'triangle', 0.2);
    } else {
      this.playTone(190, 0.15, 'sawtooth', 0.22, 130);
    }
  }

  public playNitrous(): void {
    this.playNoise(0.55, 0.28, 2400);
    this.playTone(320, 0.45, 'sawtooth', 0.18, 980);
  }

  public playParachute(): void {
    this.playNoise(0.25, 0.32, 420);
  }

  public playShopBuy(): void {
    this.playTone(659.25, 0.07, 'square', 0.2);
    this.playTone(987.77, 0.14, 'square', 0.22, undefined, 0.065);
  }

  public playUiClick(): void {
    this.playTone(540, 0.04, 'square', 0.12);
  }

  public playVictory(): void {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, i) => {
      this.playTone(n, i === 3 ? 0.35 : 0.11, 'square', 0.24, undefined, i * 0.095);
    });
  }

  public playDefeat(): void {
    const notes = [392, 349.23, 311.13, 261.63];
    notes.forEach((n, i) => {
      this.playTone(n, 0.16, 'sawtooth', 0.2, undefined, i * 0.11);
    });
  }
}

export const soundEngine = new SoundEngine();
