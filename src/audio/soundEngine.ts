// Procedural Hi-Bit Web Audio API synthesizer for REDLINE '88
import { TierId } from '../types/game';
import {
  clampTierId,
  createAsymmetricDriveCurve,
  createEnginePeriodicWave,
  EngineSoundProfile,
  getEngineProfile,
} from './engineProfiles';

export interface EngineUpdateParams {
  rpm: number;
  redline: number;
  throttle: boolean;
  clutch: boolean;
  tier: number;
  boost: boolean;
  inductionLevel: number;
  overRev?: boolean;
  wheelspin?: number;
  nitrousActive?: boolean;
  burnout?: boolean;
}

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterComp: DynamicsCompressorNode | null = null;
  private masterGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private muted = false;

  // Per-tier cached PeriodicWaves and WaveShaper curves
  private waveCache = new Map<TierId, PeriodicWave>();
  private driveCurveCache = new Map<TierId, Float32Array<ArrayBuffer>>();

  // Continuous engine synth nodes
  private engineActive = false;
  private activeTier: TierId = 1;
  private activeProfile: EngineSoundProfile = getEngineProfile(1);

  private oscPrimary: OscillatorNode | null = null;
  private oscHarmonic: OscillatorNode | null = null;
  private oscSub: OscillatorNode | null = null;
  private oscFm: OscillatorNode | null = null;
  private lopeOsc: OscillatorNode | null = null;
  private noiseSource: AudioBufferSourceNode | null = null;
  private oscInd1: OscillatorNode | null = null;
  private oscInd2: OscillatorNode | null = null;

  private harmonicGain: GainNode | null = null;
  private subGain: GainNode | null = null;
  private fmGain: GainNode | null = null;
  private lopeGain: GainNode | null = null;
  private preDriveGain: GainNode | null = null;
  private waveshaper: WaveShaperNode | null = null;
  private engineLowpass: BiquadFilterNode | null = null;
  private engineFormant: BiquadFilterNode | null = null;
  private noiseFilter: BiquadFilterNode | null = null;
  private noiseGain: GainNode | null = null;
  private engineModGain: GainNode | null = null;
  private engineGain: GainNode | null = null;

  private ind2Gain: GainNode | null = null;
  private indFilter: BiquadFilterNode | null = null;
  private indGain: GainNode | null = null;

  // Dynamic transition tracking (BOV / decel crackle)
  private lastThrottle = false;
  private lastRpmNorm = 0;
  private lastLiftSfxTime = 0;

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
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();

      this.masterComp = this.ctx.createDynamicsCompressor();
      this.masterComp.threshold.value = -15;
      this.masterComp.knee.value = 10;
      this.masterComp.ratio.value = 6;
      this.masterComp.attack.value = 0.003;
      this.masterComp.release.value = 0.11;

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : 0.34;

      this.masterComp.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  private getOutputBus(): AudioNode | null {
    return this.masterComp ?? this.masterGain;
  }

  private getNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (!this.noiseBuffer || this.noiseBuffer.sampleRate !== ctx.sampleRate) {
      const length = Math.max(1, Math.floor(ctx.sampleRate * 2.0));
      const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      this.noiseBuffer = buffer;
    }
    return this.noiseBuffer;
  }

  private getTierWave(ctx: AudioContext, profile: EngineSoundProfile): PeriodicWave {
    let wave = this.waveCache.get(profile.tier);
    if (!wave) {
      wave = createEnginePeriodicWave(ctx, profile.harmonics);
      this.waveCache.set(profile.tier, wave);
    }
    return wave;
  }

  private getTierDriveCurve(profile: EngineSoundProfile): Float32Array<ArrayBuffer> {
    let curve = this.driveCurveCache.get(profile.tier);
    if (!curve) {
      curve = createAsymmetricDriveCurve(profile.driveLoad, profile.asymmetry);
      this.driveCurveCache.set(profile.tier, curve);
    }
    return curve;
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
      this.masterGain.gain.setTargetAtTime(this.muted ? 0 : 0.34, this.ctx.currentTime, 0.02);
    }
    return this.muted;
  }

  public startEngine(tier: number): void {
    const ctx = this.ensureContext();
    const outBus = this.getOutputBus();
    if (!ctx || !outBus) return;

    const clampedTier = clampTierId(tier);
    if (this.engineActive) {
      if (this.activeTier === clampedTier) return;
      this.stopEngine();
    }

    const profile = getEngineProfile(clampedTier);
    this.activeTier = clampedTier;
    this.activeProfile = profile;
    this.lastThrottle = false;
    this.lastRpmNorm = 0;

    // 1. Core oscillator stack
    this.oscPrimary = ctx.createOscillator();
    this.oscPrimary.setPeriodicWave(this.getTierWave(ctx, profile));
    this.oscPrimary.frequency.value = profile.baseFreq;

    this.oscHarmonic = ctx.createOscillator();
    this.oscHarmonic.type = profile.harmonicWave;
    this.oscHarmonic.frequency.value = profile.baseFreq * profile.harmonicRatio;

    this.harmonicGain = ctx.createGain();
    this.harmonicGain.gain.value = profile.harmonicGain;

    this.oscSub = ctx.createOscillator();
    this.oscSub.type = clampedTier === 1 ? 'triangle' : 'sawtooth';
    this.oscSub.frequency.value = profile.baseFreq * profile.subRatio;

    this.subGain = ctx.createGain();
    this.subGain.gain.value = profile.subGain;

    // 2. Audio-rate FM grit / metallic scream modulator
    this.oscFm = ctx.createOscillator();
    this.oscFm.type = profile.fmWave;
    this.oscFm.frequency.value = profile.baseFreq * profile.fmRatio;

    this.fmGain = ctx.createGain();
    this.fmGain.gain.value = profile.fmIdleDepth;

    // 3. Asymmetric exhaust waveshaper + pre-drive stage
    this.preDriveGain = ctx.createGain();
    this.preDriveGain.gain.value = 0.45;

    this.waveshaper = ctx.createWaveShaper();
    this.waveshaper.curve = this.getTierDriveCurve(profile);
    this.waveshaper.oversample = '2x';

    // 4. Dual-stage exhaust formant shaping
    this.engineLowpass = ctx.createBiquadFilter();
    this.engineLowpass.type = 'lowpass';
    this.engineLowpass.frequency.value = profile.lpIdle;
    this.engineLowpass.Q.value = profile.lpQ;

    this.engineFormant = ctx.createBiquadFilter();
    this.engineFormant.type = 'peaking';
    this.engineFormant.frequency.value = profile.formantBaseHz;
    this.engineFormant.Q.value = profile.formantQ;
    this.engineFormant.gain.value = profile.formantGainDb * 0.5;

    // 5. Continuous filtered combustion / zoomie exhaust noise
    this.noiseSource = ctx.createBufferSource();
    this.noiseSource.buffer = this.getNoiseBuffer(ctx);
    this.noiseSource.loop = true;

    this.noiseFilter = ctx.createBiquadFilter();
    this.noiseFilter.type = 'bandpass';
    this.noiseFilter.frequency.value = profile.noiseFreqBase;
    this.noiseFilter.Q.value = profile.noiseQ;

    this.noiseGain = ctx.createGain();
    this.noiseGain.gain.value = profile.noiseIdle;

    // 6. Idle cam-lope / nitro cackle / rev-limiter AM modulation stage
    this.engineModGain = ctx.createGain();
    this.engineModGain.gain.value = 1.0;

    this.lopeOsc = ctx.createOscillator();
    this.lopeOsc.type = clampedTier >= 4 ? 'sawtooth' : 'sine';
    this.lopeOsc.frequency.value = profile.lopeRateIdle;

    this.lopeGain = ctx.createGain();
    this.lopeGain.gain.value = profile.lopeDepthIdle;

    this.engineGain = ctx.createGain();
    this.engineGain.gain.value = 0.001;

    // 7. Dual-oscillator forced induction (turbo whistle / Roots blower / 14-71 nitro scream)
    this.oscInd1 = ctx.createOscillator();
    this.oscInd1.type = profile.inductionStyle === 'nitro_blower' ? 'sawtooth' : 'triangle';
    this.oscInd1.frequency.value = profile.indBaseHz;

    this.oscInd2 = ctx.createOscillator();
    this.oscInd2.type = profile.inductionStyle === 'turbo' ? 'sine' : 'triangle';
    this.oscInd2.frequency.value = profile.indBaseHz * profile.indHarmonicRatio;

    this.ind2Gain = ctx.createGain();
    this.ind2Gain.gain.value = profile.inductionStyle === 'turbo' ? 0.3 : 0.48;

    this.indFilter = ctx.createBiquadFilter();
    this.indFilter.type = profile.inductionStyle === 'turbo' ? 'bandpass' : 'peaking';
    this.indFilter.frequency.value = profile.indBaseHz * 1.4;
    this.indFilter.Q.value = profile.inductionStyle === 'turbo' ? 2.6 : 1.8;
    if (this.indFilter.type === 'peaking') {
      this.indFilter.gain.value = 6.0;
    }

    this.indGain = ctx.createGain();
    this.indGain.gain.value = 0.001;

    // Wire FM modulator -> primary & harmonic frequency
    this.oscFm.connect(this.fmGain);
    this.fmGain.connect(this.oscPrimary.frequency);
    this.fmGain.connect(this.oscHarmonic.frequency);

    // Wire core engine chain
    this.oscPrimary.connect(this.preDriveGain);
    this.oscHarmonic.connect(this.harmonicGain);
    this.harmonicGain.connect(this.preDriveGain);
    this.oscSub.connect(this.subGain);
    this.subGain.connect(this.preDriveGain);

    this.preDriveGain.connect(this.waveshaper);
    this.waveshaper.connect(this.engineLowpass);
    this.engineLowpass.connect(this.engineFormant);
    this.engineFormant.connect(this.engineModGain);

    // Wire exhaust noise into modulation stage (so cackle & rev-limiter chop it too)
    this.noiseSource.connect(this.noiseFilter);
    this.noiseFilter.connect(this.noiseGain);
    this.noiseGain.connect(this.engineModGain);

    // Wire lope / limiter LFO -> engineModGain.gain
    this.lopeOsc.connect(this.lopeGain);
    this.lopeGain.connect(this.engineModGain.gain);

    this.engineModGain.connect(this.engineGain);
    this.engineGain.connect(outBus);

    // Wire induction chain
    this.oscInd1.connect(this.indFilter);
    this.oscInd2.connect(this.ind2Gain);
    this.ind2Gain.connect(this.indFilter);
    this.indFilter.connect(this.indGain);
    this.indGain.connect(outBus);

    // Start all continuous sources
    this.oscPrimary.start();
    this.oscHarmonic.start();
    this.oscSub.start();
    this.oscFm.start();
    this.lopeOsc.start();
    this.noiseSource.start();
    this.oscInd1.start();
    this.oscInd2.start();

    this.engineActive = true;
  }

  public updateEngine(params: EngineUpdateParams): void {
    if (
      !this.engineActive ||
      !this.ctx ||
      !this.oscPrimary ||
      !this.oscHarmonic ||
      !this.oscSub ||
      !this.oscFm ||
      !this.fmGain ||
      !this.lopeOsc ||
      !this.lopeGain ||
      !this.preDriveGain ||
      !this.engineLowpass ||
      !this.engineFormant ||
      !this.noiseFilter ||
      !this.noiseGain ||
      !this.engineGain ||
      !this.oscInd1 ||
      !this.oscInd2 ||
      !this.indFilter ||
      !this.indGain
    ) {
      return;
    }

    const clampedTier = clampTierId(params.tier);
    if (clampedTier !== this.activeTier) {
      this.startEngine(clampedTier);
      return;
    }

    const profile = this.activeProfile;
    const now = this.ctx.currentTime;
    const norm = Math.max(0, Math.min(1.12, params.rpm / Math.max(1000, params.redline)));
    const load = params.throttle ? 1 : 0;
    const boostMult = params.boost ? 1.24 : 1.0;
    const nosMult = params.nitrousActive ? 1.18 : 1.0;
    const burnoutMult = params.burnout ? 1.15 : 1.0;
    const wheelspin = Math.max(0, Math.min(1, params.wheelspin ?? 0));

    // Idle factor (1 at idle, fades to 0 by ~40% redline)
    const idleFactor = Math.max(0, 1 - norm * 2.5);

    // Chaotic nitro cackle jitter at low RPM for Tiers 4-5
    const cackleJitter =
      profile.cackleChaos > 0 && idleFactor > 0.1 && !params.throttle
        ? (Math.random() - 0.5) * 2 * profile.cackleChaos * idleFactor
        : 0;

    // 1. Core frequencies (convex curve makes top-end climb dramatically)
    const pitchCurve = Math.pow(norm, 1.08);
    const freq = Math.max(
      24,
      profile.baseFreq +
        pitchCurve * (profile.maxFreq - profile.baseFreq) +
        cackleJitter * 9 +
        (params.nitrousActive ? 18 * norm : 0)
    );

    this.oscPrimary.frequency.setTargetAtTime(freq, now, 0.022);
    this.oscHarmonic.frequency.setTargetAtTime(freq * profile.harmonicRatio, now, 0.022);
    this.oscSub.frequency.setTargetAtTime(freq * profile.subRatio, now, 0.024);

    // 2. Audio-rate FM depth (cackle at idle -> searing metallic scream at high RPM!)
    const fmCurve = Math.pow(Math.min(1.12, norm), profile.fmCurveExp);
    const fmLoadScale = params.throttle ? 1.0 : 0.32;
    const fmDepth =
      profile.fmIdleDepth * idleFactor * (1 + Math.abs(cackleJitter) * 0.9) +
      profile.fmPeakDepth * fmCurve * fmLoadScale * boostMult * nosMult;

    this.oscFm.frequency.setTargetAtTime(freq * profile.fmRatio, now, 0.02);
    this.fmGain.gain.setTargetAtTime(fmDepth, now, 0.024);

    // 3. Idle cam-lope / nitro cackle / redline ignition-cut rev limiter
    if (params.overRev) {
      this.lopeOsc.frequency.setTargetAtTime(21 + profile.tier * 2.2, now, 0.015);
      this.lopeGain.gain.setTargetAtTime(0.52, now, 0.015);
    } else {
      const lopeRate = profile.lopeRateIdle + norm * 7.5 + cackleJitter * 4.5;
      const lopeDepth = profile.lopeDepthIdle * idleFactor * (params.throttle ? 0.35 : 1.0);
      this.lopeOsc.frequency.setTargetAtTime(Math.max(4, lopeRate), now, 0.03);
      this.lopeGain.gain.setTargetAtTime(Math.max(0, lopeDepth), now, 0.03);
    }

    // 4. Pre-drive into asymmetric waveshaper
    const driveRatio = profile.driveIdle / Math.max(0.5, profile.driveLoad);
    const preDrive =
      (params.throttle ? 0.85 + norm * 0.45 : Math.max(0.32, driveRatio * 0.85)) *
      (params.boost ? 1.22 : 1.0) *
      (params.nitrousActive ? 1.15 : 1.0) *
      burnoutMult;
    this.preDriveGain.gain.setTargetAtTime(preDrive, now, 0.025);

    // 5. Dynamic lowpass & screaming formant filter
    const lpCutoff = Math.min(
      11000,
      (params.throttle ? profile.lpLoadBase : profile.lpIdle) +
        norm * profile.lpRpmSpan * (params.throttle ? boostMult * nosMult : 0.55)
    );
    this.engineLowpass.frequency.setTargetAtTime(lpCutoff, now, 0.026);

    const formantHz = Math.min(6500, profile.formantBaseHz + norm * profile.formantRpmSpan);
    const formantDb =
      profile.formantGainDb *
      (params.throttle ? 0.7 + norm * 0.45 : 0.38) *
      (params.boost ? 1.18 : 1.0);
    this.engineFormant.frequency.setTargetAtTime(formantHz, now, 0.03);
    this.engineFormant.gain.setTargetAtTime(formantDb, now, 0.03);

    // 6. Continuous combustion / open-zoomie exhaust noise
    const cacklePop =
      profile.cackleChaos > 0.3 && idleFactor > 0.25 && Math.random() < 0.22 * profile.cackleChaos
        ? 0.08 * profile.cackleChaos
        : 0;
    const noiseFreq = Math.min(
      8500,
      profile.noiseFreqBase +
        norm * profile.noiseFreqSpan +
        (params.nitrousActive ? 750 : 0) +
        wheelspin * 450
    );
    const noiseVol =
      ((params.throttle ? profile.noiseLoad : profile.noiseIdle) *
        (0.38 + norm * 0.85) *
        boostMult *
        nosMult *
        burnoutMult +
        cacklePop) *
      (params.clutch && !params.burnout ? 0.78 : 1.0);
    this.noiseFilter.frequency.setTargetAtTime(noiseFreq, now, 0.028);
    this.noiseGain.gain.setTargetAtTime(Math.max(0.001, noiseVol), now, 0.03);

    // 7. Engine bus volume
    const baseVol = params.throttle ? (params.clutch ? 0.23 : 0.33) : 0.14;
    const rpmEnergy = 0.78 + norm * 0.32;
    const totalVol = baseVol * rpmEnergy * profile.volumeScale * (params.boost ? 1.1 : 1.0);
    this.engineGain.gain.setTargetAtTime(totalVol, now, 0.025);

    // 8. Forced induction (turbo whistle / Roots blower / 14-71 nitro scream)
    const hasInduction = profile.alwaysForcedInduction || params.inductionLevel >= 2;
    if (hasInduction) {
      const indFreq = Math.min(
        9500,
        profile.indBaseHz +
          Math.pow(norm, 1.12) * profile.indRpmSpan +
          (params.boost ? 420 : 0) +
          (params.nitrousActive ? 560 : 0)
      );
      const upgradeBoost = 1 + Math.max(0, params.inductionLevel - 1) * 0.1;
      const idleWhine = profile.inductionStyle === 'nitro_blower' ? 0.022 : profile.inductionStyle === 'blower' ? 0.012 : 0.002;
      const indVol = params.throttle
        ? (idleWhine + Math.pow(norm, 1.15) * profile.indMaxGain) *
          upgradeBoost *
          (params.boost ? 1.32 : 1.0) *
          (params.nitrousActive ? 1.2 : 1.0)
        : idleWhine * (0.4 + norm * 0.8);

      this.oscInd1.frequency.setTargetAtTime(indFreq, now, 0.026);
      this.oscInd2.frequency.setTargetAtTime(
        Math.min(12000, indFreq * profile.indHarmonicRatio),
        now,
        0.026
      );
      this.indFilter.frequency.setTargetAtTime(Math.min(10000, indFreq * 1.25), now, 0.03);
      this.indGain.gain.setTargetAtTime(Math.max(0.001, indVol), now, 0.035);
    } else {
      this.indGain.gain.setTargetAtTime(0.001, now, 0.04);
    }

    // 9. Throttle-lift transients (Tier 3 turbo BOV flutter / Tier 4-5 zoomie decel crackle)
    if (
      this.lastThrottle &&
      !load &&
      this.lastRpmNorm > 0.52 &&
      now - this.lastLiftSfxTime > 0.35
    ) {
      this.lastLiftSfxTime = now;
      if (profile.sfxStyle === 'turbo_bov' || (profile.tier <= 2 && params.inductionLevel >= 2)) {
        this.playTurboBov(this.lastRpmNorm);
      } else if (profile.tier >= 4) {
        this.playExhaustCrackle(profile.tier);
      }
    }

    this.lastThrottle = params.throttle;
    this.lastRpmNorm = norm;
  }

  public stopEngine(): void {
    if (!this.engineActive) return;
    const stopAndDisconnect = (node: AudioScheduledSourceNode | null) => {
      if (!node) return;
      try {
        node.stop();
      } catch {
        // already stopped
      }
      try {
        node.disconnect();
      } catch {
        // ignore
      }
    };
    const disconnect = (node: AudioNode | null) => {
      if (!node) return;
      try {
        node.disconnect();
      } catch {
        // ignore
      }
    };

    stopAndDisconnect(this.oscPrimary);
    stopAndDisconnect(this.oscHarmonic);
    stopAndDisconnect(this.oscSub);
    stopAndDisconnect(this.oscFm);
    stopAndDisconnect(this.lopeOsc);
    stopAndDisconnect(this.noiseSource);
    stopAndDisconnect(this.oscInd1);
    stopAndDisconnect(this.oscInd2);

    disconnect(this.harmonicGain);
    disconnect(this.subGain);
    disconnect(this.fmGain);
    disconnect(this.lopeGain);
    disconnect(this.preDriveGain);
    disconnect(this.waveshaper);
    disconnect(this.engineLowpass);
    disconnect(this.engineFormant);
    disconnect(this.noiseFilter);
    disconnect(this.noiseGain);
    disconnect(this.engineModGain);
    disconnect(this.engineGain);
    disconnect(this.ind2Gain);
    disconnect(this.indFilter);
    disconnect(this.indGain);

    this.oscPrimary = null;
    this.oscHarmonic = null;
    this.oscSub = null;
    this.oscFm = null;
    this.lopeOsc = null;
    this.noiseSource = null;
    this.oscInd1 = null;
    this.oscInd2 = null;

    this.harmonicGain = null;
    this.subGain = null;
    this.fmGain = null;
    this.lopeGain = null;
    this.preDriveGain = null;
    this.waveshaper = null;
    this.engineLowpass = null;
    this.engineFormant = null;
    this.noiseFilter = null;
    this.noiseGain = null;
    this.engineModGain = null;
    this.engineGain = null;

    this.ind2Gain = null;
    this.indFilter = null;
    this.indGain = null;

    this.engineActive = false;
    this.lastThrottle = false;
    this.lastRpmNorm = 0;
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
    const outBus = this.getOutputBus();
    if (!ctx || !outBus) return;
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
    gain.connect(outBus);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  private playNoise(
    duration: number,
    volume = 0.25,
    cutoff = 1200,
    delay = 0,
    q = 1.0
  ): void {
    const ctx = this.ensureContext();
    const outBus = this.getOutputBus();
    if (!ctx || !outBus) return;
    const now = ctx.currentTime + delay;
    const buffer = this.getNoiseBuffer(ctx);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = duration > buffer.duration;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(cutoff, now);
    filter.Q.setValueAtTime(q, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(outBus);
    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
    source.start(now, 0, duration + 0.02);
  }

  private playTurboBov(intensity = 0.8): void {
    // Signature "stu-tu-tu-psshhh" turbo blow-off valve flutter
    const vol = Math.min(0.22, 0.1 + intensity * 0.12);
    this.playNoise(0.065, vol, 3200, 0, 2.4);
    this.playNoise(0.055, vol * 0.82, 2700, 0.055, 2.8);
    this.playNoise(0.05, vol * 0.62, 2250, 0.105, 3.0);
    this.playTone(2600, 0.14, 'sine', vol * 0.35, 1150, 0);
  }

  private playExhaustCrackle(tier: TierId): void {
    const heavy = tier >= 5;
    this.playNoise(0.06, heavy ? 0.3 : 0.2, heavy ? 780 : 950, 0, 1.1);
    this.playNoise(0.05, heavy ? 0.24 : 0.15, heavy ? 540 : 720, 0.06, 1.2);
    if (heavy) {
      this.playTone(95, 0.09, 'sawtooth', 0.22, 38, 0);
    }
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

  public playLaunchHook(perfect: boolean, tier?: number): void {
    const t = clampTierId(tier ?? this.activeTier);
    // Tier-scaled launch exhaust blast & hook punch
    if (t >= 5) {
      this.playNoise(0.34, perfect ? 0.44 : 0.32, 680, 0, 0.8);
      this.playTone(115, 0.24, 'sawtooth', 0.34, 34, 0);
    } else if (t === 4) {
      this.playNoise(0.28, perfect ? 0.38 : 0.28, 760, 0, 0.9);
      this.playTone(105, 0.18, 'sawtooth', 0.26, 42, 0);
    } else if (t === 2) {
      this.playNoise(0.24, perfect ? 0.34 : 0.22, 620, 0, 1.0);
      this.playTone(92, 0.14, 'triangle', 0.22, 46, 0);
    } else {
      this.playNoise(0.24, perfect ? 0.34 : 0.22, perfect ? 900 : 1800);
    }

    if (perfect) {
      this.playTone(523.25, 0.09, 'square', 0.24);
      this.playTone(659.25, 0.09, 'square', 0.24, undefined, 0.06);
      this.playTone(1046.5, 0.18, 'square', 0.26, undefined, 0.12);
    }
  }

  public playShift(
    quality: 'perfect_clutch' | 'perfect' | 'good' | 'miss',
    tier?: number
  ): void {
    const t = clampTierId(tier ?? this.activeTier);
    // Tier-scaled mechanical gearbox clunk + exhaust transient
    if (t >= 5) {
      this.playNoise(0.14, 0.38, 520, 0, 0.85);
      this.playTone(105, 0.11, 'sawtooth', 0.28, 36, 0);
    } else if (t === 4) {
      this.playNoise(0.12, 0.34, 580, 0, 0.95);
      this.playTone(120, 0.09, 'sawtooth', 0.22, 48, 0);
    } else if (t === 3) {
      this.playNoise(0.08, 0.26, 700, 0, 1.1);
      this.playTurboBov(quality === 'miss' ? 0.45 : 0.85);
    } else if (t === 2) {
      this.playNoise(0.1, 0.32, 460, 0, 1.0);
      this.playTone(110, 0.08, 'triangle', 0.18, 54, 0);
    } else {
      this.playNoise(0.085, 0.28, 680, 0, 1.2);
    }

    // Crisp arcade rating chime
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

  public playNitrous(tier?: number): void {
    const t = clampTierId(tier ?? this.activeTier);
    const boostScale = t >= 4 ? 1.2 : 1.0;
    this.playNoise(0.58, 0.28 * boostScale, t >= 4 ? 2900 : 2400, 0, 1.2);
    this.playTone(t >= 4 ? 380 : 320, 0.48, 'sawtooth', 0.18 * boostScale, t >= 4 ? 1380 : 980);
    if (t >= 4) {
      this.playTone(95, 0.22, 'sawtooth', 0.24, 42, 0);
    }
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

  public playBurnoutScrub(intensity = 1): void {
    const vol = Math.min(0.24, 0.1 + intensity * 0.12);
    const cutoff = 1250 + intensity * 950;
    this.playNoise(0.11, vol, cutoff);
  }

  public playBurnoutComplete(efficiency: number, skipped: boolean): void {
    if (skipped) {
      this.playTone(460, 0.08, 'triangle', 0.18);
      this.playTone(580, 0.11, 'triangle', 0.18, undefined, 0.06);
      return;
    }
    if (efficiency >= 88) {
      this.playTone(587.33, 0.08, 'square', 0.22);
      this.playTone(880, 0.1, 'square', 0.24, undefined, 0.06);
      this.playTone(1174.66, 0.18, 'square', 0.24, undefined, 0.12);
    } else if (efficiency >= 60) {
      this.playTone(523.25, 0.08, 'square', 0.2);
      this.playTone(783.99, 0.14, 'square', 0.2, undefined, 0.07);
    } else {
      this.playTone(320, 0.14, 'sawtooth', 0.18, 240);
    }
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
