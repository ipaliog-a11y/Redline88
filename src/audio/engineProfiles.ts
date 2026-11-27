// Per-tier procedural Web Audio synthesis profiles for REDLINE '88
import { TierId } from '../types/game';

export type InductionStyle = 'none' | 'turbo' | 'blower' | 'nitro_blower';
export type ExhaustSfxStyle = 'street' | 'muscle' | 'turbo_bov' | 'funny_zoomie' | 'topfuel_nitro';

export interface EngineSoundProfile {
  tier: TierId;
  label: string;
  // Core firing oscillator frequencies (Hz)
  baseFreq: number;
  maxFreq: number;
  // Fourier harmonic amplitudes [1st, 2nd, 3rd, ...] for primary PeriodicWave
  harmonics: number[];
  // Secondary harmonic oscillator
  harmonicRatio: number;
  harmonicGain: number;
  harmonicWave: OscillatorType;
  // Sub-bass rumble oscillator
  subRatio: number;
  subGain: number;
  // Audio-rate FM grit / screaming metallic sidebands
  fmRatio: number;
  fmWave: OscillatorType;
  fmIdleDepth: number;
  fmPeakDepth: number;
  // Power curve exponent for how quickly FM scream ramps up with RPM (higher = more explosive top-end)
  fmCurveExp: number;
  // Idle cam lope / nitro cackle modulation
  lopeRateIdle: number;
  lopeDepthIdle: number;
  cackleChaos: number; // 0..1 stochastic idle detonation jitter (Tier 4-5)
  // Asymmetric exhaust waveshaper
  driveIdle: number;
  driveLoad: number;
  asymmetry: number;
  // Dynamic load lowpass filter
  lpIdle: number;
  lpLoadBase: number;
  lpRpmSpan: number;
  lpQ: number;
  // Exhaust throat / screaming resonance peaking filter
  formantBaseHz: number;
  formantRpmSpan: number;
  formantQ: number;
  formantGainDb: number;
  // Continuous combustion / zoomie exhaust noise
  noiseIdle: number;
  noiseLoad: number;
  noiseFreqBase: number;
  noiseFreqSpan: number;
  noiseQ: number;
  // Forced induction (turbo whistle / Roots blower scream)
  inductionStyle: InductionStyle;
  alwaysForcedInduction: boolean;
  indBaseHz: number;
  indRpmSpan: number;
  indHarmonicRatio: number;
  indMaxGain: number;
  // Overall mix scaling into master compressor
  volumeScale: number;
  // Shift / launch / decel transient flavor
  sfxStyle: ExhaustSfxStyle;
}

export const TIER_ENGINE_PROFILES: Record<TierId, EngineSoundProfile> = {
  // TIER 1 · STREET CLASS — Scrappy, high-revving 4-cyl tuner buzz & nasal intake rasp
  1: {
    tier: 1,
    label: 'Street 4-Cyl Rasp',
    baseFreq: 52,
    maxFreq: 268,
    harmonics: [1.0, 0.55, 0.78, 0.28, 0.52, 0.18, 0.34, 0.12, 0.2, 0.08],
    harmonicRatio: 2.006,
    harmonicGain: 0.48,
    harmonicWave: 'sawtooth',
    subRatio: 0.502,
    subGain: 0.24,
    fmRatio: 1.5,
    fmWave: 'triangle',
    fmIdleDepth: 3,
    fmPeakDepth: 28,
    fmCurveExp: 1.6,
    lopeRateIdle: 11.5,
    lopeDepthIdle: 0.08,
    cackleChaos: 0,
    driveIdle: 1.2,
    driveLoad: 2.8,
    asymmetry: 0.14,
    lpIdle: 520,
    lpLoadBase: 840,
    lpRpmSpan: 2250,
    lpQ: 1.9,
    formantBaseHz: 780,
    formantRpmSpan: 640,
    formantQ: 3.1,
    formantGainDb: 6.5,
    noiseIdle: 0.014,
    noiseLoad: 0.075,
    noiseFreqBase: 700,
    noiseFreqSpan: 1150,
    noiseQ: 1.6,
    inductionStyle: 'turbo',
    alwaysForcedInduction: false,
    indBaseHz: 760,
    indRpmSpan: 1850,
    indHarmonicRatio: 1.5,
    indMaxGain: 0.06,
    volumeScale: 0.86,
    sfxStyle: 'street',
  },

  // TIER 2 · STREET MOD — Deep, lopey American cross-plane V8 muscle growl
  2: {
    tier: 2,
    label: 'Muscle V8 Rumble',
    baseFreq: 34,
    maxFreq: 182,
    harmonics: [1.0, 0.88, 0.62, 0.48, 0.3, 0.24, 0.16, 0.12, 0.08, 0.05],
    harmonicRatio: 1.504, // Classic 3:2 cross-plane V8 firing burble
    harmonicGain: 0.64,
    harmonicWave: 'sawtooth',
    subRatio: 0.501,
    subGain: 0.86,
    fmRatio: 0.5,
    fmWave: 'sawtooth',
    fmIdleDepth: 11,
    fmPeakDepth: 36,
    fmCurveExp: 1.4,
    lopeRateIdle: 7.2,
    lopeDepthIdle: 0.34,
    cackleChaos: 0.12,
    driveIdle: 2.0,
    driveLoad: 4.6,
    asymmetry: 0.32,
    lpIdle: 310,
    lpLoadBase: 560,
    lpRpmSpan: 1700,
    lpQ: 2.2,
    formantBaseHz: 215,
    formantRpmSpan: 280,
    formantQ: 2.4,
    formantGainDb: 8.0,
    noiseIdle: 0.03,
    noiseLoad: 0.13,
    noiseFreqBase: 320,
    noiseFreqSpan: 720,
    noiseQ: 1.2,
    inductionStyle: 'blower',
    alwaysForcedInduction: false,
    indBaseHz: 540,
    indRpmSpan: 1650,
    indHarmonicRatio: 1.5,
    indMaxGain: 0.075,
    volumeScale: 0.96,
    sfxStyle: 'muscle',
  },

  // TIER 3 · PRO STREET — Tight twin-turbo street rocket wail + BOV flutter
  3: {
    tier: 3,
    label: 'Pro Street Twin-Turbo',
    baseFreq: 58,
    maxFreq: 338,
    harmonics: [1.0, 0.82, 0.72, 0.58, 0.48, 0.38, 0.3, 0.24, 0.18, 0.14, 0.1, 0.08],
    harmonicRatio: 2.009,
    harmonicGain: 0.66,
    harmonicWave: 'sawtooth',
    subRatio: 0.503,
    subGain: 0.45,
    fmRatio: 2.0,
    fmWave: 'sine',
    fmIdleDepth: 6,
    fmPeakDepth: 78,
    fmCurveExp: 1.7,
    lopeRateIdle: 13.0,
    lopeDepthIdle: 0.06,
    cackleChaos: 0,
    driveIdle: 1.5,
    driveLoad: 4.0,
    asymmetry: 0.22,
    lpIdle: 600,
    lpLoadBase: 1180,
    lpRpmSpan: 3250,
    lpQ: 2.0,
    formantBaseHz: 960,
    formantRpmSpan: 1200,
    formantQ: 3.0,
    formantGainDb: 7.2,
    noiseIdle: 0.022,
    noiseLoad: 0.145,
    noiseFreqBase: 1100,
    noiseFreqSpan: 2300,
    noiseQ: 1.8,
    inductionStyle: 'turbo',
    alwaysForcedInduction: true,
    indBaseHz: 920,
    indRpmSpan: 3150,
    indHarmonicRatio: 1.5,
    indMaxGain: 0.115,
    volumeScale: 1.0,
    sfxStyle: 'turbo_bov',
  },

  // TIER 4 · FUNNY CAR — Brutal blown alcohol/nitro V8 + Roots supercharger scream
  4: {
    tier: 4,
    label: 'Funny Car Blown Nitro V8',
    baseFreq: 42,
    maxFreq: 258,
    harmonics: [1.0, 0.92, 0.84, 0.66, 0.58, 0.46, 0.4, 0.32, 0.26, 0.2, 0.16, 0.12],
    harmonicRatio: 1.508,
    harmonicGain: 0.78,
    harmonicWave: 'sawtooth',
    subRatio: 0.502,
    subGain: 0.95,
    fmRatio: 2.5,
    fmWave: 'sawtooth',
    fmIdleDepth: 26,
    fmPeakDepth: 160,
    fmCurveExp: 1.65,
    lopeRateIdle: 9.5,
    lopeDepthIdle: 0.42,
    cackleChaos: 0.42,
    driveIdle: 3.2,
    driveLoad: 7.2,
    asymmetry: 0.42,
    lpIdle: 420,
    lpLoadBase: 940,
    lpRpmSpan: 3200,
    lpQ: 2.6,
    formantBaseHz: 520,
    formantRpmSpan: 1280,
    formantQ: 2.8,
    formantGainDb: 8.5,
    noiseIdle: 0.055,
    noiseLoad: 0.24,
    noiseFreqBase: 540,
    noiseFreqSpan: 1700,
    noiseQ: 1.1,
    inductionStyle: 'blower',
    alwaysForcedInduction: true,
    indBaseHz: 620,
    indRpmSpan: 2650,
    indHarmonicRatio: 1.502,
    indMaxGain: 0.145,
    volumeScale: 1.12,
    sfxStyle: 'funny_zoomie',
  },

  // TIER 5 · TOP FUEL — Iconic over-the-top screaming nitro dragster!
  5: {
    tier: 5,
    label: 'Top Fuel Screaming Nitro',
    baseFreq: 48,
    maxFreq: 392,
    harmonics: [
      1.0, 0.95, 0.92, 0.82, 0.78, 0.68, 0.62, 0.54,
      0.48, 0.42, 0.36, 0.32, 0.28, 0.24, 0.2, 0.16,
    ],
    harmonicRatio: 2.014,
    harmonicGain: 0.92,
    harmonicWave: 'sawtooth',
    subRatio: 0.5,
    subGain: 1.0,
    fmRatio: 3.01, // Inharmonic metallic ratio for blistering top-end shriek
    fmWave: 'sawtooth',
    fmIdleDepth: 55,
    fmPeakDepth: 350,
    fmCurveExp: 1.45,
    lopeRateIdle: 15.5,
    lopeDepthIdle: 0.55,
    cackleChaos: 1.0, // Violent irregular nitro cackle at idle
    driveIdle: 4.5,
    driveLoad: 11.0,
    asymmetry: 0.48,
    lpIdle: 520,
    lpLoadBase: 1480,
    lpRpmSpan: 4900,
    lpQ: 3.1,
    formantBaseHz: 1150,
    formantRpmSpan: 1950,
    formantQ: 3.4,
    formantGainDb: 9.5,
    noiseIdle: 0.09,
    noiseLoad: 0.34,
    noiseFreqBase: 780,
    noiseFreqSpan: 2850,
    noiseQ: 0.95,
    inductionStyle: 'nitro_blower',
    alwaysForcedInduction: true,
    indBaseHz: 880,
    indRpmSpan: 3850,
    indHarmonicRatio: 1.498,
    indMaxGain: 0.18,
    volumeScale: 1.28,
    sfxStyle: 'topfuel_nitro',
  },
};

export function clampTierId(tier: number): TierId {
  if (tier <= 1) return 1;
  if (tier === 2) return 2;
  if (tier === 3) return 3;
  if (tier === 4) return 4;
  return 5;
}

export function getEngineProfile(tier: number): EngineSoundProfile {
  return TIER_ENGINE_PROFILES[clampTierId(tier)];
}

/**
 * Builds a custom PeriodicWave from harmonic amplitudes.
 * Index 0 is DC offset (0); harmonics[k] maps to Fourier partial k+1.
 */
export function createEnginePeriodicWave(
  ctx: AudioContext,
  harmonics: number[]
): PeriodicWave {
  const real = new Float32Array(harmonics.length + 1);
  const imag = new Float32Array(harmonics.length + 1);
  real[0] = 0;
  imag[0] = 0;
  for (let i = 0; i < harmonics.length; i++) {
    // Mix sine and cosine phases slightly for punchy asymmetric pulse character
    imag[i + 1] = harmonics[i];
    real[i + 1] = harmonics[i] * (i % 2 === 0 ? 0.18 : -0.12);
  }
  return ctx.createPeriodicWave(real, imag, { disableNormalization: false });
}

/**
 * Generates an asymmetric soft-to-hard clipping WaveShaper transfer curve.
 * Asymmetric clipping introduces both even and odd exhaust harmonics.
 */
export function createAsymmetricDriveCurve(
  drive: number,
  asymmetry: number,
  samples = 1024
): Float32Array<ArrayBuffer> {
  const curve = new Float32Array(new ArrayBuffer(samples * 4));
  const k = Math.max(0.5, drive);
  const kPos = k * (1 + asymmetry * 0.85);
  const kNeg = k * Math.max(0.35, 1 - asymmetry * 0.45);
  const gritAmount = k > 6 ? 0.08 * Math.min(1, (k - 6) / 5) : 0;

  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / (samples - 1) - 1;
    const shaped = x >= 0 ? Math.tanh(x * kPos) : Math.tanh(x * kNeg);
    // Subtle foldback harmonic sheen at extreme drive (Tier 4-5)
    const grit = gritAmount > 0 ? Math.sin(x * Math.PI * 2) * gritAmount : 0;
    curve[i] = Math.max(-1, Math.min(1, shaped + grit));
  }
  return curve;
}
