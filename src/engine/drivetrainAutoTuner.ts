import {
  computeAeroDragAccel,
  computeCarPerformance,
  computeGearMaxMph,
  getCarById,
  getEffectiveTuning,
  getStripDistanceSpec,
  getTierDriveScale,
  getTierSpeedScale,
} from '../data/gameData';
import {
  CarConfig,
  CarSpec,
  DrivetrainTuning,
  StripDistanceId,
} from '../types/game';

export interface SimulatedRunMetrics {
  etSec: number;
  trapMph: number;
  topGearRedlineSec: number;
  finalGear: number;
  topGearMaxMph: number;
}

export interface AutoTuneResult {
  tuning: DrivetrainTuning;
  distance: StripDistanceId;
  projectedEtSec: number;
  projectedTrapMph: number;
  topGearMaxMph: number;
  topGearRedlineSec: number;
}

function getGearBounds(car: CarSpec, idx: number): { min: number; max: number } {
  const def = car.gearRatios[idx];
  return {
    min: Math.max(0.45, Number((def * 0.65).toFixed(2))),
    max: Math.min(4.6, Number((def * 1.4).toFixed(2))),
  };
}

function clampTuningForCar(car: CarSpec, raw: DrivetrainTuning): DrivetrainTuning {
  const finalDrive = Number(Math.max(2.1, Math.min(5.5, raw.finalDrive)).toFixed(2));
  const gearRatios = car.gearRatios.map((_, idx) => {
    const { min, max } = getGearBounds(car, idx);
    const r = raw.gearRatios[idx] ?? car.gearRatios[idx];
    return Number(Math.max(min, Math.min(max, r)).toFixed(2));
  });
  // Ensure strictly descending gear ratios so every upshift drops RPM cleanly
  for (let i = 1; i < gearRatios.length; i++) {
    if (gearRatios[i] >= gearRatios[i - 1] - 0.08) {
      const { min } = getGearBounds(car, i);
      gearRatios[i] = Number(Math.max(min, gearRatios[i - 1] - 0.1).toFixed(2));
    }
  }
  return {
    finalDrive,
    gearRatios,
    launchRpmOffset: Math.max(-600, Math.min(600, Math.round(raw.launchRpmOffset || 0))),
    shiftRpmOffset: Math.max(-600, Math.min(350, Math.round(raw.shiftRpmOffset || 0))),
    topGearRevProtection: Boolean(raw.topGearRevProtection),
  };
}

/**
 * Deterministic headless run using the exact RaceSimulation physics model
 * (assuming clean 85% burnout, perfect launch, and clean shifts in the sweet spot).
 */
export function simulateHeadlessRun(
  carId: string,
  config: CarConfig,
  tuningInput: DrivetrainTuning,
  distanceId: StripDistanceId,
  options?: { burnoutEfficiency?: number; useNitrous?: boolean; clutchShifts?: boolean }
): SimulatedRunMetrics {
  const car = getCarById(carId);
  const tuning = clampTuningForCar(car, tuningInput);
  const evalConfig: CarConfig = { ...config, tuning };
  const perf = computeCarPerformance(carId, evalConfig);
  const distFt = getStripDistanceSpec(distanceId).feet;

  const burnoutEfficiency = options?.burnoutEfficiency ?? 85;
  const useNitrous = options?.useNitrous ?? true;
  const clutchShifts = options?.clutchShifts ?? false;

  const burnoutGripMult = 0.94 + (burnoutEfficiency / 100) * 0.24;
  const burnoutBonus = burnoutGripMult - 1;

  const rawShiftMin = car.shiftRpmMin + tuning.shiftRpmOffset - perf.shiftWindowBonus;
  const rawShiftMax = car.shiftRpmMax + tuning.shiftRpmOffset + perf.shiftWindowBonus * 0.4;
  const shiftMin = Math.max(car.idleRpm + 1800, Math.min(perf.redlineRpm - 700, rawShiftMin));
  const shiftMax = Math.min(perf.redlineRpm + 120, Math.max(shiftMin + 500, rawShiftMax));
  const targetShiftRpm = Math.min(perf.redlineRpm - 60, shiftMin + (shiftMax - shiftMin) * 0.72);

  // Perfect launch initial conditions (mirrors RaceSimulation.executeLaunch)
  const launchAggression = Math.max(-0.04, Math.min(0.06, tuning.launchRpmOffset / 10000));
  let boostTimer = 0.75 + Math.max(0, burnoutBonus * 0.8);
  let boostStrength = 1.12 + launchAggression + Math.max(0, burnoutBonus * 0.3);
  let velFps = Math.max(
    8,
    10 + car.tier * 3.5 + Math.max(0, tuning.launchRpmOffset * 0.006) + burnoutBonus * 18
  );

  let dist = 0;
  let elapsed = 0;
  let gear = 1;
  let rpm = Math.max(car.idleRpm + 600, (car.launchRpmMin + car.launchRpmMax) * 0.5 + tuning.launchRpmOffset);
  let shiftLockTimer = 0;
  let nitrousLeft = useNitrous ? perf.nitrousShots : 0;
  let nitrousTimer = 0;
  let topGearRedlineSec = 0;

  const maxGears = tuning.gearRatios.length;
  const speedScale = getTierSpeedScale(car.tier);
  const tierDriveScale = getTierDriveScale(car.tier);
  const hpPerTon = perf.hp / (perf.weightLbs / 2000);
  const effectiveDrag = Math.max(0.18, car.dragCoeff * (1 - config.upgrades.chassis * 0.02));

  const dt = 0.016; // 62.5 Hz deterministic step
  const maxSimTime = 55;

  while (dist < distFt && elapsed < maxSimTime) {
    // Trigger nitrous in upper half of run once traction settles
    if (nitrousLeft > 0 && nitrousTimer <= 0) {
      const distFrac = dist / distFt;
      const nosTriggerFrac =
        distanceId === 'quarter'
          ? 0.28 + (perf.nitrousShots - nitrousLeft) * 0.24
          : distanceId === 'half'
          ? 0.32 + (perf.nitrousShots - nitrousLeft) * 0.22
          : 0.36 + (perf.nitrousShots - nitrousLeft) * 0.2;
      if (distFrac >= nosTriggerFrac && gear >= Math.min(2, maxGears)) {
        nitrousLeft -= 1;
        nitrousTimer = 1.5;
      }
    }

    // Upshift when reaching target RPM in non-top gear
    if (gear < maxGears && shiftLockTimer <= 0 && rpm >= targetShiftRpm) {
      const oldRatio = tuning.gearRatios[gear - 1];
      gear += 1;
      const newRatio = tuning.gearRatios[gear - 1];
      rpm = Math.max(car.idleRpm + 800, rpm * (newRatio / oldRatio));
      shiftLockTimer = perf.shiftSpeedSec;
      boostTimer = clutchShifts ? 0.8 : 0.65;
      boostStrength = clutchShifts ? perf.shiftBoostMult + 0.06 : perf.shiftBoostMult;
      velFps *= clutchShifts ? 1.04 : 1.025;
    }

    shiftLockTimer = Math.max(0, shiftLockTimer - dt);
    boostTimer = Math.max(0, boostTimer - dt);
    nitrousTimer = Math.max(0, nitrousTimer - dt);

    const launchZoneWeight = Math.max(0, 1 - dist / 330);
    const effectiveGrip = perf.grip * (1 + (burnoutGripMult - 1) * launchZoneWeight);
    const launchHookBoost = 1 + (burnoutGripMult - 1) * 0.35 * Math.max(0, 1 - dist / 180);

    const gearIdx = Math.min(gear - 1, maxGears - 1);
    const gearRatio = tuning.gearRatios[gearIdx];
    const totalRatio = gearRatio * tuning.finalDrive;
    const stockTotalRatio = car.gearRatios[gearIdx] * car.finalDrive;
    const gearingTorqueFactor = Math.max(
      0.75,
      Math.min(1.25, Math.pow(totalRatio / stockTotalRatio, 0.36))
    );

    const inTopGear = gear === maxGears;
    const softCutRpm = perf.redlineRpm - 90;
    const rpmNorm = Math.max(0.15, Math.min(1.08, rpm / perf.redlineRpm));
    let torqueShape = 0.65 + Math.sin(Math.min(1, rpmNorm) * Math.PI * 0.78) * 0.5;

    if (inTopGear && tuning.topGearRevProtection && rpm >= softCutRpm) {
      // Soft-cut limiter smoothly holds safe peak speed without redline engine damage
      torqueShape *= 0.22;
      topGearRedlineSec += dt * 0.25;
    } else if (rpm >= perf.redlineRpm) {
      torqueShape *= 0.08;
      if (inTopGear) {
        topGearRedlineSec += dt;
      }
    }

    const boostMult = boostTimer > 0 ? boostStrength : 1;
    const nosMult = nitrousTimer > 0 ? perf.nitrousPowerMult : 1;
    const shiftCut = shiftLockTimer > 0 ? 0.25 : 1;

    let driveAccel =
      hpPerTon *
      tierDriveScale *
      torqueShape *
      (0.58 + gearRatio * 0.24) *
      gearingTorqueFactor *
      boostMult *
      nosMult *
      launchHookBoost *
      shiftCut;

    const maxTractionAccel = (24 + effectiveGrip * 30) * (1 + (car.tier - 1) * 0.45);
    if (driveAccel > maxTractionAccel) {
      driveAccel = maxTractionAccel + (driveAccel - maxTractionAccel) * 0.35;
    }

    const dragAccel = computeAeroDragAccel(effectiveDrag, velFps);
    const netAccel = driveAccel - dragAccel;
    const prevDist = dist;
    velFps = Math.max(0, velFps + netAccel * dt);
    dist += velFps * dt;
    elapsed += dt;

    const wheelLinkedRpm = car.idleRpm + velFps * totalRatio * speedScale;
    const rpmCap = inTopGear && tuning.topGearRevProtection ? softCutRpm : perf.redlineRpm + 240;
    const targetRpm = Math.min(rpmCap, Math.max(car.idleRpm + 400, wheelLinkedRpm));
    rpm += (targetRpm - rpm) * Math.min(1, dt * 18);

    if (dist >= distFt) {
      const delta = dist - prevDist;
      const frac = delta > 0.0001 ? Math.max(0, Math.min(1, (distFt - prevDist) / delta)) : 1;
      elapsed = elapsed - dt + frac * dt;
      break;
    }
  }

  const topGearMaxMph = computeGearMaxMph(
    car,
    perf.redlineRpm,
    tuning.gearRatios[maxGears - 1],
    tuning.finalDrive
  );

  return {
    etSec: Number(elapsed.toFixed(3)),
    trapMph: Number((velFps * 0.681818).toFixed(1)),
    topGearRedlineSec: Number(topGearRedlineSec.toFixed(3)),
    finalGear: gear,
    topGearMaxMph,
  };
}

/**
 * Physics-aware Gearbox Autotuner:
 * Adapts Final Drive, individual gear ratios, Launch RPM, and Shift RPM
 * to the car's CURRENT upgrades, HP, weight, grip, redline, and engine health
 * for the selected strip length (1/4, 1/2, or 1 Mile).
 */
export function autoTuneDrivetrain(
  carId: string,
  config: CarConfig,
  distanceId: StripDistanceId
): AutoTuneResult {
  const car = getCarById(carId);
  const currentTuning = getEffectiveTuning(carId, config);
  const perf = computeCarPerformance(carId, config);
  const preserveRevProtection = Boolean(currentTuning.topGearRevProtection);

  // Adapt launch & shift offsets to current grip & power-to-weight
  const gripGainRatio = perf.grip / Math.max(0.5, car.baseGrip);
  const launchRpmOffset = Math.max(
    -350,
    Math.min(
      500,
      Math.round(
        ((gripGainRatio - 1) * 900 + (distanceId === 'quarter' ? 120 : distanceId === 'half' ? 50 : 0)) /
          50
      ) * 50
    )
  );
  const shiftRpmOffset =
    distanceId === 'quarter' ? 150 : distanceId === 'half' ? 50 : -50;

  const numGears = car.gearRatios.length;

  const buildCandidateRatios = (firstScale: number, topScale: number): number[] => {
    const out: number[] = [];
    for (let i = 0; i < numGears; i++) {
      const frac = numGears <= 1 ? 0 : i / (numGears - 1);
      // Smooth progressive curve from launch gear to top gear
      const curve = Math.pow(frac, 1.15);
      const scale = firstScale + (topScale - firstScale) * curve;
      const { min, max } = getGearBounds(car, i);
      out.push(Number(Math.max(min, Math.min(max, car.gearRatios[i] * scale)).toFixed(2)));
    }
    return out;
  };

  // Coarse search grid across finalDrive and gear-spread profiles
  const fdCandidates: number[] = [];
  const fdMin = Math.max(2.15, Number((car.finalDrive * 0.62).toFixed(2)));
  const fdMax = Math.min(5.45, Number((car.finalDrive * 1.32).toFixed(2)));
  const fdSteps = 14;
  for (let s = 0; s <= fdSteps; s++) {
    fdCandidates.push(Number((fdMin + ((fdMax - fdMin) * s) / fdSteps).toFixed(2)));
  }

  const shapeProfiles: [number, number][] =
    distanceId === 'quarter'
      ? [
          [1.12, 1.08],
          [1.08, 1.0],
          [1.04, 0.94],
          [1.0, 0.88],
          [1.16, 1.02],
        ]
      : distanceId === 'half'
      ? [
          [1.08, 0.92],
          [1.04, 0.84],
          [1.0, 0.78],
          [0.96, 0.72],
          [1.12, 0.86],
        ]
      : [
          [1.04, 0.82],
          [0.98, 0.74],
          [0.94, 0.68],
          [0.9, 0.65],
          [1.08, 0.76],
        ];

  const scoreRun = (run: SimulatedRunMetrics): number => {
    // Primary objective: lowest ET. Penalize bouncing on top-gear limiter before finish.
    const redlinePenalty = run.topGearRedlineSec * (preserveRevProtection ? 0.35 : 0.65);
    return run.etSec + redlinePenalty;
  };

  let bestTuning: DrivetrainTuning = clampTuningForCar(car, {
    ...currentTuning,
    launchRpmOffset,
    shiftRpmOffset,
    topGearRevProtection: preserveRevProtection,
  });
  let bestMetrics = simulateHeadlessRun(carId, config, bestTuning, distanceId);
  let bestScore = scoreRun(bestMetrics);

  for (const fd of fdCandidates) {
    for (const [firstScale, topScale] of shapeProfiles) {
      const candidate = clampTuningForCar(car, {
        finalDrive: fd,
        gearRatios: buildCandidateRatios(firstScale, topScale),
        launchRpmOffset,
        shiftRpmOffset,
        topGearRevProtection: preserveRevProtection,
      });
      const metrics = simulateHeadlessRun(carId, config, candidate, distanceId);
      const score = scoreRun(metrics);
      if (score < bestScore) {
        bestScore = score;
        bestTuning = candidate;
        bestMetrics = metrics;
      }
    }
  }

  // Fine local refinement around the best finalDrive and top gear ratio
  const fineFdOffsets = [-0.15, -0.1, -0.05, 0, 0.05, 0.1, 0.15];
  const fineTopOffsets = [-0.08, -0.04, 0, 0.04, 0.08];
  const seedTuning = bestTuning;

  for (const dfd of fineFdOffsets) {
    for (const dTop of fineTopOffsets) {
      const ratios = [...seedTuning.gearRatios];
      ratios[numGears - 1] = Number((ratios[numGears - 1] + dTop).toFixed(2));
      const candidate = clampTuningForCar(car, {
        ...seedTuning,
        finalDrive: Number((seedTuning.finalDrive + dfd).toFixed(2)),
        gearRatios: ratios,
      });
      const metrics = simulateHeadlessRun(carId, config, candidate, distanceId);
      const score = scoreRun(metrics);
      if (score < bestScore) {
        bestScore = score;
        bestTuning = candidate;
        bestMetrics = metrics;
      }
    }
  }

  return {
    tuning: bestTuning,
    distance: distanceId,
    projectedEtSec: bestMetrics.etSec,
    projectedTrapMph: bestMetrics.trapMph,
    topGearMaxMph: bestMetrics.topGearMaxMph,
    topGearRedlineSec: bestMetrics.topGearRedlineSec,
  };
}
