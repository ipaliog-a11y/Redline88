import { soundEngine } from '../audio/soundEngine';
import {
  computeAeroDragAccel,
  computeCarPerformance,
  getCarById,
  getEffectiveTuning,
  getStripDistanceSpec,
  getTierById,
  getTierDriveScale,
  getTierSpeedScale,
  HALF_MILE_FT,
  QUARTER_MILE_FT,
} from '../data/gameData';
import {
  CarConfig,
  CarSpec,
  ComputedPerformance,
  DrivetrainTuning,
  RacePhase,
  RaceReplayData,
  RaceResult,
  RaceTelemetry,
  ReplaySample,
  ReplayShiftEvent,
  RivalSpec,
  ShiftRating,
  StripDistanceId,
  StripDistanceSpec,
  TierId,
  TimeOfDay,
} from '../types/game';
import { HiBitStripRenderer } from './hibitStripRenderer';

export interface RaceCallbacks {
  onTelemetry: (telemetry: RaceTelemetry) => void;
  onFinish: (result: RaceResult) => void;
}

export class RaceSimulation {
  private stripRenderer: HiBitStripRenderer;
  private rafId = 0;
  private lastTime = 0;
  private paused = false;
  private destroyed = false;

  // Config
  private car: CarSpec;
  private config: CarConfig;
  private tuning: DrivetrainTuning;
  private perf: ComputedPerformance;
  private tierId: TierId;
  private timeOfDay: TimeOfDay;
  private distanceId: StripDistanceId;
  private distanceSpec: StripDistanceSpec;
  private rival: RivalSpec | null;
  private callbacks: RaceCallbacks;

  // Input states (continuous held vs edge-triggered)
  private throttleHeld = false;
  private clutchHeld = false;
  private brakeHeld = false;
  private shiftUpQueued = false;
  private shiftDownQueued = false;
  private nitrousQueued = false;

  // Race state
  private phase: RacePhase = 'BURNOUT';
  private stageTimer = 0;
  private treeStep = -2; // -2=off(burnout), 0=pre, 1=stage, 2=amb1, 3=amb2, 4=amb3, 5=green, -1=foul
  private greenLightTime = 0;
  private simTime = 0;
  private raceElapsed = 0;
  private playerRunElapsed = 0;
  private foul = false;
  private hitstopTimer = 0;
  private shakeAmp = 0;

  // Pre-race Burnout mini-game state
  private readonly burnoutDuration = 5.0;
  private burnoutTimeLeft = 5.0;
  private burnoutTemp = 0; // 0..100
  private burnoutEfficiency = 15; // 0..100
  private burnoutSkipped = false;
  private burnoutScrubSoundTimer = 0;

  // Player physics
  private playerDistFt = 0;
  private playerVelFps = 0;
  private playerRpm = 1100;
  private playerGear = 1;
  private shiftLockTimer = 0;
  private boostTimer = 0;
  private boostStrength = 1;
  private nitrousLeft = 0;
  private nitrousTimer = 0;
  private wheelspin = 0;
  private pitchDeg = 0;
  private squatPx = 0;
  private wheelAngle = 0;
  private exhaustFlame = 0;
  private chuteOpen = 0;
  private launched = false;
  private reactionSec = 0;
  private sixtyFtSec = 0;
  private quarterSplitSec = 0;
  private halfSplitSec = 0;
  private playerFinishSec = 0;
  private playerTrapMph = 0;
  private perfectLaunch = false;
  private perfectShifts = 0;
  private perfectClutchShifts = 0;
  private overRevCount = 0;
  private nitrousUsedCount = 0;
  private topGearOverRevTimer = 0;
  private revProtectionActive = false;
  private topGearRevProtectionUsed = false;

  // Rival physics
  private rivalDistFt = 0;
  private rivalVelFps = 0;
  private rivalFinishSec = 0;
  private rivalTrapMph = 0;
  private rivalWheelAngle = 0;
  private rivalLaunched = false;
  private rivalPitchDeg = 0;
  private rivalChuteOpen = 0;
  private rivalAccelCurveA = 0;
  private rivalTargetEt = 14;

  // Callout HUD feedback
  private calloutText = '';
  private calloutTimer = 0;
  private calloutColor = '#22c55e';

  // Camera & telemetry
  private cameraFt = 0;
  private finishCoastTimer = 0;
  private resultDispatched = false;
  private lastHudEmit = 0;

  // Compact replay recording
  private replaySamples: ReplaySample[] = [];
  private replayEvents: ReplayShiftEvent[] = [];
  private lastReplaySampleSec = -1;

  constructor(
    container: HTMLElement,
    carId: string,
    config: CarConfig,
    tierId: TierId,
    timeOfDay: TimeOfDay,
    distanceId: StripDistanceId,
    rival: RivalSpec | null,
    callbacks: RaceCallbacks
  ) {
    this.car = getCarById(carId);
    this.config = config;
    this.tuning = getEffectiveTuning(carId, config);
    this.perf = computeCarPerformance(carId, config);
    this.tierId = tierId;
    this.timeOfDay = timeOfDay;
    this.distanceId = rival ? rival.distance : distanceId;
    this.distanceSpec = getStripDistanceSpec(this.distanceId);
    this.rival = rival;
    this.callbacks = callbacks;

    const tierSpec = getTierById(this.tierId);
    this.stripRenderer = new HiBitStripRenderer(
      container,
      tierSpec.theme,
      this.timeOfDay,
      this.distanceSpec.feet,
      {
        chassis: this.car.chassis,
        bodyVariant: this.car.bodyVariant,
        visuals: this.config.visuals,
        upgrades: this.config.upgrades,
      },
      this.rival
        ? {
            chassis: this.rival.chassis,
            bodyVariant: this.rival.bodyVariant,
            visuals: {
              paintColor: this.rival.paintColor,
              stripe: this.rival.stripe,
              rims: this.rival.rims,
            },
            upgrades: this.rival.upgrades,
          }
        : null
    );

    this.reset();
  }

  public updateConfig(config: CarConfig): void {
    this.config = config;
    this.tuning = getEffectiveTuning(this.car.id, config);
    this.perf = computeCarPerformance(this.car.id, config);
    this.stripRenderer.setPlayerCar({
      chassis: this.car.chassis,
      bodyVariant: this.car.bodyVariant,
      visuals: this.config.visuals,
      upgrades: this.config.upgrades,
    });
  }

  public reset(): void {
    this.phase = 'BURNOUT';
    this.stageTimer = 0;
    this.treeStep = -2;
    this.greenLightTime = 0;
    this.simTime = 0;
    this.raceElapsed = 0;
    this.playerRunElapsed = 0;
    this.foul = false;
    this.hitstopTimer = 0;
    this.shakeAmp = 0;

    this.brakeHeld = false;
    this.burnoutTimeLeft = this.burnoutDuration;
    this.burnoutTemp = 0;
    this.burnoutEfficiency = 15;
    this.burnoutSkipped = false;
    this.burnoutScrubSoundTimer = 0;

    this.playerDistFt = -12;
    this.playerVelFps = 0;
    this.playerRpm = this.car.idleRpm;
    this.playerGear = 1;
    this.shiftLockTimer = 0;
    this.boostTimer = 0;
    this.boostStrength = 1;
    this.nitrousLeft = this.perf.nitrousShots;
    this.nitrousTimer = 0;
    this.wheelspin = 0;
    this.pitchDeg = 0;
    this.squatPx = 0;
    this.wheelAngle = 0;
    this.exhaustFlame = 0;
    this.chuteOpen = 0;
    this.launched = false;
    this.reactionSec = 0;
    this.sixtyFtSec = 0;
    this.quarterSplitSec = 0;
    this.halfSplitSec = 0;
    this.playerFinishSec = 0;
    this.playerTrapMph = 0;
    this.perfectLaunch = false;
    this.perfectShifts = 0;
    this.perfectClutchShifts = 0;
    this.overRevCount = 0;
    this.nitrousUsedCount = 0;
    this.topGearOverRevTimer = 0;
    this.revProtectionActive = false;
    this.topGearRevProtectionUsed = false;

    this.rivalDistFt = 0;
    this.rivalVelFps = 0;
    this.rivalFinishSec = 0;
    this.rivalTrapMph = 0;
    this.rivalWheelAngle = 0;
    this.rivalLaunched = false;
    this.rivalPitchDeg = 0;
    this.rivalChuteOpen = 0;

    const variance = 1 + (Math.random() * 0.03 - 0.015);
    this.rivalTargetEt = this.rival ? this.rival.targetEtSec * variance : 12;
    const curveExp = this.distanceId === 'mile' ? 1.42 : this.distanceId === 'half' ? 1.58 : 1.82;
    this.rivalAccelCurveA = this.distanceSpec.feet / Math.pow(this.rivalTargetEt, curveExp);

    this.calloutText = '';
    this.calloutTimer = 0;
    this.cameraFt = -14;
    this.finishCoastTimer = 0;
    this.resultDispatched = false;

    this.replaySamples = [];
    this.replayEvents = [];
    this.lastReplaySampleSec = -1;
    this.stripRenderer.clearParticles();

    soundEngine.startEngine(this.car.tier);
    this.emitTelemetry(true);
  }

  public start(): void {
    this.lastTime = performance.now();
    const loop = () => {
      if (this.destroyed) return;
      const now = performance.now();
      const rawDt = (now - this.lastTime) / 1000;
      this.lastTime = now;
      const dt = Math.min(Math.max(rawDt, 0), 0.05);

      if (!this.paused) {
        this.step(dt);
      }

      this.stripRenderer.updateAndRender(
        {
          cameraFt: this.cameraFt,
          playerDistFt: this.playerDistFt,
          playerMph: this.playerVelFps * 0.681818,
          playerWheelAngle: this.wheelAngle,
          playerPitchDeg: this.pitchDeg,
          playerSquatPx: this.squatPx,
          playerExhaustFlame: this.exhaustFlame,
          playerNitrousFlame: this.nitrousTimer > 0 ? 1 : 0,
          playerChuteOpen: this.chuteOpen,
          rivalDistFt: this.rivalDistFt,
          rivalWheelAngle: this.rivalWheelAngle,
          rivalPitchDeg: this.rivalPitchDeg,
          rivalExhaustFlame:
            this.rival && this.rivalLaunched && this.rivalFinishSec === 0 && this.rival.tier >= 4
              ? 0.75
              : 0,
          rivalChuteOpen: this.rivalChuteOpen,
          treeStep: this.treeStep,
          shakeAmp: this.shakeAmp,
          simTime: this.simTime,
          elapsedSec: this.playerFinishSec > 0 ? this.playerFinishSec : this.playerRunElapsed,
        },
        dt
      );

      this.rafId = requestAnimationFrame(loop);
    };

    this.rafId = requestAnimationFrame(loop);
  }

  public destroy(): void {
    this.destroyed = true;
    cancelAnimationFrame(this.rafId);
    this.stripRenderer.dispose();
    soundEngine.stopEngine();
  }

  public setPaused(p: boolean): void {
    this.paused = p;
    if (p) {
      soundEngine.stopEngine();
      this.clearInputs();
    } else if (this.phase !== 'RESULTS') {
      soundEngine.startEngine(this.car.tier);
    }
  }

  public clearInputs(): void {
    this.throttleHeld = false;
    this.clutchHeld = false;
    this.brakeHeld = false;
    this.shiftUpQueued = false;
    this.shiftDownQueued = false;
    this.nitrousQueued = false;
  }

  public setThrottle(held: boolean): void {
    if (this.paused || this.phase === 'RESULTS') return;
    this.throttleHeld = held;
  }

  public setBrake(held: boolean): void {
    if (this.paused || this.phase === 'RESULTS') return;
    this.brakeHeld = held;
  }

  public setClutch(held: boolean): void {
    if (this.paused || this.phase === 'RESULTS') return;
    if (this.phase === 'BURNOUT') {
      this.brakeHeld = held;
      return;
    }
    // After launch, only the shifter is used (clutch is launch-only)
    if (this.launched) {
      this.clutchHeld = false;
      return;
    }

    const wasHeld = this.clutchHeld;
    this.clutchHeld = held;

    // Releasing clutch before green light triggers immediate JUMPSTART disqualification!
    if (wasHeld && !held) {
      if (this.phase === 'COUNTDOWN') {
        this.playerVelFps = Math.max(8, 8 + this.car.tier * 2.2);
        this.pitchDeg = -3.2;
        this.exhaustFlame = 0.8;
        this.spawnTireSmoke(10, 14);
        this.triggerFoul();
      } else if (this.phase === 'RACING' && !this.launched) {
        this.executeLaunch();
      }
    }
  }

  public skipBurnout(): void {
    if (this.paused || this.phase !== 'BURNOUT') return;
    const rolledEfficiency = Math.floor(20 + Math.random() * 61); // 20%..80% inclusive
    this.burnoutEfficiency = rolledEfficiency;
    this.burnoutSkipped = true;
    this.burnoutTemp = Math.round(12 + (rolledEfficiency / 100) * 66);
    this.burnoutTimeLeft = 0;
    this.completeBurnout(true);
  }

  public triggerShiftUp(): void {
    if (this.paused || this.phase !== 'RACING' || !this.launched) return;
    this.shiftUpQueued = true;
  }

  public triggerShiftDown(): void {
    if (this.paused || this.phase !== 'RACING' || !this.launched) return;
    this.shiftDownQueued = true;
  }

  public triggerNitrous(): void {
    if (this.paused || this.phase !== 'RACING' || !this.launched) return;
    this.nitrousQueued = true;
  }

  private showCallout(text: string, color: string): void {
    this.calloutText = text;
    this.calloutColor = color;
    this.calloutTimer = 1.25;
  }

  private computeBurnoutEfficiency(temp: number): number {
    const t = Math.max(0, Math.min(100, temp));
    if (t < 75) {
      return Math.round(15 + (t / 75) * 77);
    }
    if (t <= 92) {
      const dist = Math.abs(t - 84) / 9;
      return Math.round(100 - dist * dist * 8);
    }
    return Math.round(92 - ((t - 92) / 8) * 30);
  }

  private getBurnoutGripMultiplier(): number {
    return 0.94 + (this.burnoutEfficiency / 100) * 0.24;
  }

  private completeBurnout(skipped: boolean): void {
    this.phase = 'STAGING';
    this.stageTimer = 0;
    this.treeStep = 0;
    this.brakeHeld = false;
    this.clutchHeld = false;
    this.pitchDeg = 0;
    this.squatPx = 0;
    soundEngine.playBurnoutComplete(this.burnoutEfficiency, skipped);

    const gripPct = Math.round((this.getBurnoutGripMultiplier() - 1) * 100);
    const sign = gripPct >= 0 ? '+' : '';
    if (skipped) {
      this.showCallout(
        `SKIPPED · ${this.burnoutEfficiency}% (${sign}${gripPct}% GRIP)`,
        this.burnoutEfficiency >= 60 ? '#38bdf8' : '#f5b82e'
      );
    } else if (this.burnoutEfficiency >= 92) {
      this.showCallout(`PERFECT BURNOUT! ${this.burnoutEfficiency}% (+${gripPct}% GRIP)`, '#22c55e');
    } else if (this.burnoutEfficiency >= 70) {
      this.showCallout(`GOOD BURNOUT · ${this.burnoutEfficiency}% (${sign}${gripPct}% GRIP)`, '#38bdf8');
    } else {
      this.showCallout(`COLD TIRES · ${this.burnoutEfficiency}% (${sign}${gripPct}% GRIP)`, '#f97316');
    }

    this.emitTelemetry(true);
  }

  private spawnTireSmoke(count: number, speedFt = 14): void {
    this.stripRenderer.spawnSmoke(this.playerDistFt - 5.5, 0, count, speedFt);
  }

  private spawnLaunchSparks(count: number): void {
    this.stripRenderer.spawnWheelieSparks(this.playerDistFt - 11.5, 0, count);
  }

  private triggerFoul(): void {
    if (this.foul) return;
    this.foul = true;
    this.treeStep = -1;
    this.phase = 'FINISH_COAST';
    this.finishCoastTimer = 1.25;
    this.showCallout('JUMPSTART! DISQUALIFIED!', '#ff4d3d');
    soundEngine.playFoul();
    this.emitTelemetry(true);
  }

  private getLaunchWindow(): { min: number; max: number } {
    const rawMin = this.car.launchRpmMin + this.tuning.launchRpmOffset - this.perf.shiftWindowBonus * 0.5;
    const rawMax = this.car.launchRpmMax + this.tuning.launchRpmOffset + this.perf.shiftWindowBonus * 0.5;
    const min = Math.max(this.car.idleRpm + 500, Math.min(this.perf.redlineRpm - 1400, rawMin));
    const max = Math.max(min + 650, Math.min(this.perf.redlineRpm - 350, rawMax));
    return { min, max };
  }

  private getShiftWindow(): { min: number; max: number } {
    const rawMin = this.car.shiftRpmMin + this.tuning.shiftRpmOffset - this.perf.shiftWindowBonus;
    const rawMax = this.car.shiftRpmMax + this.tuning.shiftRpmOffset + this.perf.shiftWindowBonus * 0.4;
    const min = Math.max(this.car.idleRpm + 1800, Math.min(this.perf.redlineRpm - 700, rawMin));
    const max = Math.min(this.perf.redlineRpm + 120, Math.max(min + 500, rawMax));
    return { min, max };
  }

  private executeLaunch(): void {
    if (this.launched) return;
    this.launched = true;
    this.clutchHeld = false;
    this.reactionSec = Math.max(0.001, this.simTime - this.greenLightTime);

    const { min: launchMin, max: launchMax } = this.getLaunchWindow();
    const launchRpmSnapshot = Math.round(this.playerRpm);
    const burnoutGripMult = this.getBurnoutGripMultiplier();
    const burnoutBonus = burnoutGripMult - 1; // -0.06 .. +0.18
    let launchRating: ShiftRating = 'BOG LAUNCH';
    let launchColor = '#94a3b8';

    if (this.playerRpm >= launchMin && this.playerRpm <= launchMax) {
      this.perfectLaunch = true;
      launchRating = 'PERFECT LAUNCH!';
      launchColor = '#22c55e';
      const launchAggression = Math.max(-0.04, Math.min(0.06, this.tuning.launchRpmOffset / 10000));
      this.boostTimer = 0.75 + Math.max(0, burnoutBonus * 0.8);
      this.boostStrength = 1.12 + launchAggression + Math.max(0, burnoutBonus * 0.3);
      this.pitchDeg = -Math.min(8.5, 4.2 + this.car.tier * 0.9);
      this.squatPx = 1.2;
      this.shakeAmp = 2.4; // Slight pixel screen shake on launch only
      this.hitstopTimer = 0.03;
      this.exhaustFlame = 1.0;
      this.playerVelFps = Math.max(
        8,
        10 + this.car.tier * 3.5 + Math.max(0, this.tuning.launchRpmOffset * 0.006) + burnoutBonus * 18
      );
      this.showCallout(launchRating, launchColor);
      soundEngine.playLaunchHook(true, this.car.tier);
      this.spawnTireSmoke(10, 18);
      this.spawnLaunchSparks(8);
    } else if (this.playerRpm > launchMax) {
      launchRating = 'WHEELSPIN!';
      launchColor = '#f59e0b';
      const spinDamping = 1.16 - (this.burnoutEfficiency / 100) * 0.48;
      this.wheelspin = Math.max(
        0.08,
        Math.min(1, (0.55 + (this.playerRpm - launchMax) / 2600) * spinDamping)
      );
      this.playerVelFps = Math.max(6, 7 + this.car.tier * 2 + burnoutBonus * 12);
      this.pitchDeg = -2.5;
      this.shakeAmp = 1.8; // Slight pixel screen shake on launch only
      this.showCallout(launchRating, launchColor);
      soundEngine.playLaunchHook(false, this.car.tier);
      this.spawnTireSmoke(14, 15);
    } else {
      launchRating = 'BOG LAUNCH';
      launchColor = '#94a3b8';
      this.playerVelFps = Math.max(5, 6 + this.car.tier * 1.5 + burnoutBonus * 9);
      this.playerRpm = Math.max(this.car.idleRpm + 300, this.playerRpm * 0.65);
      this.shakeAmp = 1.0;
      this.showCallout(launchRating, launchColor);
      soundEngine.playLaunchHook(false, this.car.tier);
    }

    this.replayEvents.push({
      t: Number(this.playerRunElapsed.toFixed(3)),
      distFt: Number(this.playerDistFt.toFixed(1)),
      mph: Math.round(this.playerVelFps * 0.681818),
      rpm: launchRpmSnapshot,
      fromGear: 0,
      toGear: 1,
      rating: launchRating,
      color: launchColor,
      kind: 'launch',
    });
  }

  private handleShiftUp(): void {
    if (this.phase !== 'RACING' || !this.launched) return;
    if (this.playerGear >= this.tuning.gearRatios.length) return;
    if (this.shiftLockTimer > 0) return;

    const { min: minSweet, max: maxSweet } = this.getShiftWindow();
    const fromGear = this.playerGear;
    const oldRatio = this.tuning.gearRatios[this.playerGear - 1];
    this.playerGear += 1;
    const newRatio = this.tuning.gearRatios[this.playerGear - 1];

    const rpmBefore = this.playerRpm;
    const mphBefore = Math.round(this.playerVelFps * 0.681818);
    this.playerRpm = Math.max(this.car.idleRpm + 800, rpmBefore * (newRatio / oldRatio));
    this.shiftLockTimer = this.perf.shiftSpeedSec;
    this.exhaustFlame = 1.0;

    let shiftRating: ShiftRating = 'EARLY SHIFT';
    let shiftColor = '#94a3b8';

    if (rpmBefore >= minSweet && rpmBefore <= maxSweet) {
      this.perfectShifts += 1;
      shiftRating = 'PERFECT SHIFT!';
      shiftColor = '#22c55e';
      this.boostTimer = 0.72;
      this.boostStrength = this.perf.shiftBoostMult + 0.03;
      this.hitstopTimer = 0.028;
      this.pitchDeg = -(3.8 + this.car.tier * 0.9);
      this.showCallout(shiftRating, shiftColor);
      soundEngine.playShift('perfect', this.car.tier);
      this.playerVelFps *= 1.032;
    } else if (rpmBefore > maxSweet) {
      this.overRevCount += 1;
      shiftRating = 'OVER-REV!';
      shiftColor = '#f97316';
      this.boostTimer = 0.25;
      this.boostStrength = 1.02;
      this.showCallout(shiftRating, shiftColor);
      soundEngine.playShift('miss', this.car.tier);
    } else if (rpmBefore >= minSweet - 900) {
      shiftRating = 'GOOD SHIFT';
      shiftColor = '#38bdf8';
      this.boostTimer = 0.35;
      this.boostStrength = 1.05;
      this.showCallout(shiftRating, shiftColor);
      soundEngine.playShift('good', this.car.tier);
    } else {
      shiftRating = 'EARLY SHIFT';
      shiftColor = '#94a3b8';
      this.shiftLockTimer += 0.12;
      this.showCallout(shiftRating, shiftColor);
      soundEngine.playShift('miss', this.car.tier);
    }

    this.replayEvents.push({
      t: Number(this.playerRunElapsed.toFixed(3)),
      distFt: Number(this.playerDistFt.toFixed(1)),
      mph: mphBefore,
      rpm: Math.round(rpmBefore),
      fromGear,
      toGear: this.playerGear,
      rating: shiftRating,
      color: shiftColor,
      usedClutch: false,
      kind: 'shift',
    });
  }

  private handleShiftDown(): void {
    if (this.phase !== 'RACING' || !this.launched) return;
    if (this.playerGear <= 1 || this.shiftLockTimer > 0) return;
    const oldRatio = this.tuning.gearRatios[this.playerGear - 1];
    this.playerGear -= 1;
    const newRatio = this.tuning.gearRatios[this.playerGear - 1];
    this.playerRpm = Math.min(this.perf.redlineRpm + 250, this.playerRpm * (newRatio / oldRatio));
    this.shiftLockTimer = 0.1;
    soundEngine.playShift('good', this.car.tier);
  }

  private handleNitrous(): void {
    if (this.phase !== 'RACING' || !this.launched) return;
    if (this.nitrousLeft <= 0 || this.nitrousTimer > 0) return;
    this.nitrousLeft -= 1;
    this.nitrousUsedCount += 1;
    this.nitrousTimer = 1.5;
    this.pitchDeg = Math.min(this.pitchDeg, -(3.0 + this.car.tier * 0.6));
    this.showCallout('NITROUS BOOST!', '#38bdf8');
    soundEngine.playNitrous(this.car.tier);
    this.replayEvents.push({
      t: Number(this.playerRunElapsed.toFixed(3)),
      distFt: Number(this.playerDistFt.toFixed(1)),
      mph: Math.round(this.playerVelFps * 0.681818),
      rpm: Math.round(this.playerRpm),
      fromGear: this.playerGear,
      toGear: this.playerGear,
      rating: 'NITROUS BOOST!',
      color: '#38bdf8',
      kind: 'nitrous',
    });
  }

  private step(dt: number): void {
    if (this.hitstopTimer > 0) {
      this.hitstopTimer = Math.max(0, this.hitstopTimer - dt);
      return;
    }

    this.simTime += dt;
    this.shakeAmp = Math.max(0, this.shakeAmp - dt * 14);
    this.calloutTimer = Math.max(0, this.calloutTimer - dt);
    this.exhaustFlame = Math.max(0, this.exhaustFlame - dt * 3.8);

    if (this.shiftUpQueued) {
      this.shiftUpQueued = false;
      this.handleShiftUp();
    }
    if (this.shiftDownQueued) {
      this.shiftDownQueued = false;
      this.handleShiftDown();
    }
    if (this.nitrousQueued) {
      this.nitrousQueued = false;
      this.handleNitrous();
    }

    if (this.phase === 'BURNOUT') {
      this.updateBurnout(dt);
    } else if (this.phase === 'STAGING') {
      this.stageTimer += dt;
      // Roll smoothly forward out of the burnout box up to the starting beam (0 ft)
      if (this.playerDistFt < 0) {
        const rollStep = Math.min(-this.playerDistFt, Math.max(14, -this.playerDistFt * 6.5) * dt);
        this.playerDistFt += rollStep;
        this.wheelAngle += rollStep * 0.55;
      }
      // Both cars wait at the line until the player presses & holds CLUTCH to stage and start the light sequence
      if (this.playerDistFt >= -0.25 && this.clutchHeld) {
        this.playerDistFt = 0;
        this.phase = 'COUNTDOWN';
        this.stageTimer = 0;
        this.treeStep = 1; // STAGED bulb lit; ambers begin next
        soundEngine.playUiClick();
      }
      this.updateStagingRpm(dt);
    } else if (this.phase === 'COUNTDOWN') {
      this.stageTimer += dt;
      if (this.stageTimer >= 0.45 && this.treeStep === 1) {
        this.treeStep = 2;
        soundEngine.playTreeAmber();
      } else if (this.stageTimer >= 1.0 && this.treeStep === 2) {
        this.treeStep = 3;
        soundEngine.playTreeAmber();
      } else if (this.stageTimer >= 1.55 && this.treeStep === 3) {
        this.treeStep = 4;
        soundEngine.playTreeAmber();
      } else if (this.stageTimer >= 2.1 && this.treeStep === 4) {
        this.treeStep = 5;
        this.phase = 'RACING';
        this.greenLightTime = this.simTime;
        soundEngine.playTreeGreen();

        // Launch only when clutch is released (if somehow already released, launch immediately)
        if (!this.clutchHeld) {
          this.executeLaunch();
        }
      }
      this.updateStagingRpm(dt);
    } else if (this.phase === 'RACING') {
      this.raceElapsed += dt;

      if (!this.launched && !this.clutchHeld) {
        this.executeLaunch();
      }

      const prevDistFt = this.playerDistFt;
      const prevRunElapsed = this.playerRunElapsed;

      if (!this.launched) {
        this.updateStagingRpm(dt);
      } else {
        this.playerRunElapsed += dt;
        this.updatePlayerRacingPhysics(dt);
      }

      if (this.rival) {
        this.updateRivalPhysics(dt);
      }

      if (this.launched) {
        const distDelta = this.playerDistFt - prevDistFt;
        const interpolateCrossing = (targetFt: number): number => {
          if (distDelta <= 0.0001) return this.playerRunElapsed;
          const frac = Math.max(0, Math.min(1, (targetFt - prevDistFt) / distDelta));
          return prevRunElapsed + frac * dt;
        };

        if (this.sixtyFtSec === 0 && this.playerDistFt >= 60) {
          this.sixtyFtSec = interpolateCrossing(60);
        }
        if (
          this.distanceId !== 'quarter' &&
          this.quarterSplitSec === 0 &&
          this.playerDistFt >= QUARTER_MILE_FT
        ) {
          this.quarterSplitSec = interpolateCrossing(QUARTER_MILE_FT);
        }
        if (this.distanceId === 'mile' && this.halfSplitSec === 0 && this.playerDistFt >= HALF_MILE_FT) {
          this.halfSplitSec = interpolateCrossing(HALF_MILE_FT);
        }

        const sampleInterval =
          this.distanceId === 'mile' ? 0.14 : this.distanceId === 'half' ? 0.09 : 0.06;
        if (
          this.lastReplaySampleSec < 0 ||
          this.playerRunElapsed - this.lastReplaySampleSec >= sampleInterval
        ) {
          this.pushReplaySample(this.playerRunElapsed);
          this.lastReplaySampleSec = this.playerRunElapsed;
        }

        if (this.playerFinishSec === 0 && this.playerDistFt >= this.distanceSpec.feet) {
          this.playerFinishSec = interpolateCrossing(this.distanceSpec.feet);
          this.playerTrapMph = this.playerVelFps * 0.681818;
          this.pushReplaySample(this.playerFinishSec, true);
          if (this.car.hasParachute) {
            soundEngine.playParachute();
          }
        }
      }

      if (this.playerFinishSec > 0) {
        this.phase = 'FINISH_COAST';
        this.finishCoastTimer = 1.55;
      }
    } else if (this.phase === 'FINISH_COAST') {
      this.finishCoastTimer -= dt;
      this.raceElapsed += dt;

      if (this.rival && this.rivalFinishSec === 0) {
        this.updateRivalPhysics(dt);
      }

      if (this.car.hasParachute && !this.foul) {
        this.chuteOpen = Math.min(1, this.chuteOpen + dt * 2.8);
      }
      const brakeDrag = this.car.hasParachute ? 0.962 : 0.985;
      this.playerVelFps *= Math.pow(brakeDrag, dt * 60);
      this.playerDistFt += this.playerVelFps * dt;
      this.playerRpm = Math.max(this.car.idleRpm, this.playerRpm - dt * 5200);
      this.pitchDeg *= Math.pow(0.85, dt * 60);
      this.squatPx *= Math.pow(0.85, dt * 60);
      this.wheelAngle += (this.playerVelFps / 12) * dt * 6;

      if (this.rival && this.rivalFinishSec > 0) {
        if (this.rival.tier >= 4) {
          this.rivalChuteOpen = Math.min(1, this.rivalChuteOpen + dt * 2.5);
        }
        this.rivalVelFps *= Math.pow(0.97, dt * 60);
        this.rivalDistFt += this.rivalVelFps * dt;
        this.rivalWheelAngle += (this.rivalVelFps / 12) * dt * 6;
      }

      if (this.finishCoastTimer <= 0 && !this.resultDispatched) {
        this.finalizeRace();
      }
    }

    const leadOffset = Math.min(18, this.playerVelFps * 0.6818 * 0.045);
    const targetCam = this.playerDistFt - 6 - leadOffset * 0.25;
    this.cameraFt += (targetCam - this.cameraFt) * Math.min(1, dt * 14);

    soundEngine.updateEngine({
      rpm: this.playerRpm,
      redline: this.perf.redlineRpm,
      throttle: this.throttleHeld && this.phase !== 'FINISH_COAST' && this.phase !== 'RESULTS',
      clutch: this.clutchHeld || !this.launched,
      tier: this.car.tier,
      boost: this.boostTimer > 0 || this.nitrousTimer > 0,
      inductionLevel: this.config.upgrades.induction,
      overRev: this.playerRpm >= this.perf.redlineRpm * 0.985 && this.throttleHeld,
      wheelspin: this.wheelspin,
      nitrousActive: this.nitrousTimer > 0,
      burnout: this.phase === 'BURNOUT' && this.brakeHeld && this.throttleHeld,
    });

    this.emitTelemetry(false);
  }

  private updateBurnout(dt: number): void {
    this.burnoutTimeLeft = Math.max(0, this.burnoutTimeLeft - dt);
    this.burnoutScrubSoundTimer = Math.max(0, this.burnoutScrubSoundTimer - dt);

    const lineLocked = this.brakeHeld && this.throttleHeld;
    const rpmNorm = Math.max(
      0,
      Math.min(1, (this.playerRpm - this.car.idleRpm) / Math.max(1000, this.perf.redlineRpm - this.car.idleRpm))
    );

    if (lineLocked) {
      // Front line-lock brakes engaged + throttle open: spin rear slicks hard in the water box!
      const targetRpm = this.perf.redlineRpm * 0.89;
      const climbRate = 5600 + this.car.tier * 850;
      this.playerRpm = Math.min(targetRpm, this.playerRpm + climbRate * dt);
      if (this.playerRpm > targetRpm * 0.97) {
        this.playerRpm -= Math.random() * 190;
      }

      const heatRate = 26 + rpmNorm * 24;
      this.burnoutTemp = Math.min(100, this.burnoutTemp + heatRate * dt);
      this.wheelAngle += (28 + rpmNorm * 44) * dt;
      // Front brakes bite slightly while rear squats during line-lock burnout
      this.pitchDeg += (1.1 - this.pitchDeg) * Math.min(1, dt * 8);
      this.squatPx += (0.8 - this.squatPx) * Math.min(1, dt * 9);

      if (Math.random() < dt * 28) {
        this.spawnTireSmoke(2, 16 + rpmNorm * 12);
      }
      if (this.car.tier >= 4 && Math.random() < dt * 10) {
        this.exhaustFlame = Math.max(this.exhaustFlame, 0.45);
      }
      if (this.burnoutScrubSoundTimer <= 0) {
        soundEngine.playBurnoutScrub(0.45 + rpmNorm * 0.55);
        this.burnoutScrubSoundTimer = 0.14;
      }
    } else if (this.throttleHeld && !this.brakeHeld) {
      // Pressing gas without brake: car creeps forward out of the water box & heats slowly
      const targetRpm = this.perf.redlineRpm * 0.52;
      this.playerRpm += (targetRpm - this.playerRpm) * Math.min(1, dt * 5);
      if (this.playerDistFt < -3.5) {
        const creep = 5.5 * dt;
        this.playerDistFt = Math.min(-3.5, this.playerDistFt + creep);
        this.wheelAngle += creep * 0.9;
      }
      this.burnoutTemp = Math.min(100, this.burnoutTemp + 6 * dt);
      this.pitchDeg += (-0.8 - this.pitchDeg) * Math.min(1, dt * 6);
      this.squatPx += (0.2 - this.squatPx) * Math.min(1, dt * 6);
      if (Math.random() < dt * 6) {
        this.spawnTireSmoke(1, 9);
      }
    } else {
      // Off throttle: engine settles and tires cool smoothly so player can feather back into optimal band
      this.playerRpm = Math.max(this.car.idleRpm, this.playerRpm - 4400 * dt);
      const coolRate = this.brakeHeld ? 16 : 13;
      this.burnoutTemp = Math.max(0, this.burnoutTemp - coolRate * dt);
      this.pitchDeg += (0 - this.pitchDeg) * Math.min(1, dt * 8);
      this.squatPx += (0 - this.squatPx) * Math.min(1, dt * 8);
    }

    this.burnoutEfficiency = this.computeBurnoutEfficiency(this.burnoutTemp);

    if (this.burnoutTimeLeft <= 0) {
      this.completeBurnout(false);
    }
  }

  private updateStagingRpm(dt: number): void {
    const targetRpm = this.throttleHeld ? this.perf.redlineRpm * 0.96 : this.car.idleRpm;
    const climbRate = this.throttleHeld ? 5400 + this.car.tier * 950 : 3800;
    if (this.playerRpm < targetRpm) {
      this.playerRpm = Math.min(targetRpm, this.playerRpm + climbRate * dt);
    } else {
      this.playerRpm = Math.max(targetRpm, this.playerRpm - climbRate * 0.85 * dt);
    }
    if (this.throttleHeld && Math.random() < dt * 12) {
      this.exhaustFlame = Math.max(this.exhaustFlame, this.car.tier >= 4 ? 0.55 : 0.22);
      this.spawnTireSmoke(2, 10);
    }
    if (this.playerRpm > this.perf.redlineRpm * 0.93) {
      this.playerRpm -= Math.random() * 240;
    }
  }

  private updatePlayerRacingPhysics(dt: number): void {
    this.shiftLockTimer = Math.max(0, this.shiftLockTimer - dt);
    this.boostTimer = Math.max(0, this.boostTimer - dt);
    this.nitrousTimer = Math.max(0, this.nitrousTimer - dt);

    const burnoutGripMult = this.getBurnoutGripMultiplier();
    const launchZoneWeight = Math.max(0, 1 - this.playerDistFt / 330);
    const effectiveGrip = this.perf.grip * (1 + (burnoutGripMult - 1) * launchZoneWeight);
    const launchHookBoost = 1 + (burnoutGripMult - 1) * 0.35 * Math.max(0, 1 - this.playerDistFt / 180);

    this.wheelspin = Math.max(0, this.wheelspin - dt * (0.9 + effectiveGrip * 0.45));

    const maxGears = this.tuning.gearRatios.length;
    const gearIdx = Math.min(this.playerGear - 1, maxGears - 1);
    const gearRatio = this.tuning.gearRatios[gearIdx];
    const totalRatio = gearRatio * this.tuning.finalDrive;
    const stockTotalRatio = this.car.gearRatios[gearIdx] * this.car.finalDrive;
    const gearingTorqueFactor = Math.max(
      0.75,
      Math.min(1.25, Math.pow(totalRatio / stockTotalRatio, 0.36))
    );

    const inTopGear = this.playerGear === maxGears;
    const softCutRpm = this.perf.redlineRpm - 90;
    const rpmNorm = Math.max(0.15, Math.min(1.08, this.playerRpm / this.perf.redlineRpm));
    let torqueShape = 0.65 + Math.sin(Math.min(1, rpmNorm) * Math.PI * 0.78) * 0.5;

    this.revProtectionActive = false;
    if (
      inTopGear &&
      this.tuning.topGearRevProtection &&
      this.throttleHeld &&
      !this.clutchHeld &&
      this.playerRpm >= softCutRpm
    ) {
      // Electronic top-gear over-rev protection: smooth soft-cut limiter prevents engine damage
      torqueShape *= 0.22;
      this.revProtectionActive = true;
      this.topGearRevProtectionUsed = true;
      this.topGearOverRevTimer = 0;
    } else if (this.playerRpm >= this.perf.redlineRpm) {
      torqueShape *= 0.08;
      if (inTopGear && this.throttleHeld && !this.clutchHeld) {
        this.topGearOverRevTimer += dt;
        if (this.topGearOverRevTimer >= 0.65) {
          this.topGearOverRevTimer = 0;
          this.overRevCount += 1;
          this.showCallout('TOP-GEAR OVER-REV!', '#ff4d3d');
        }
      }
    } else {
      this.topGearOverRevTimer = Math.max(0, this.topGearOverRevTimer - dt * 1.5);
    }

    const boostMult = this.boostTimer > 0 ? this.boostStrength : 1;
    const nosMult = this.nitrousTimer > 0 ? this.perf.nitrousPowerMult : 1;
    const clutchFactor = this.clutchHeld ? 0.15 : 1;
    const shiftCut = this.shiftLockTimer > 0 ? 0.25 : 1;
    const spinLoss = 1 - this.wheelspin * 0.38;

    const hpPerTon = this.perf.hp / (this.perf.weightLbs / 2000);
    const tierDriveScale = getTierDriveScale(this.car.tier);
    let driveAccel =
      (this.throttleHeld ? 1 : 0) *
      hpPerTon *
      tierDriveScale *
      torqueShape *
      (0.58 + gearRatio * 0.24) *
      gearingTorqueFactor *
      boostMult *
      nosMult *
      launchHookBoost *
      clutchFactor *
      shiftCut *
      spinLoss;

    const maxTractionAccel = (24 + effectiveGrip * 30) * (1 + (this.car.tier - 1) * 0.45);
    if (driveAccel > maxTractionAccel) {
      driveAccel = maxTractionAccel + (driveAccel - maxTractionAccel) * 0.35;
    }

    const effectiveDrag = Math.max(0.18, this.car.dragCoeff * (1 - this.config.upgrades.chassis * 0.02));
    const dragAccel = computeAeroDragAccel(effectiveDrag, this.playerVelFps);
    const engineBrake = !this.throttleHeld ? 9.5 : 0;

    const netAccel = driveAccel - dragAccel - engineBrake;
    this.playerVelFps = Math.max(0, this.playerVelFps + netAccel * dt);
    this.playerDistFt += this.playerVelFps * dt;
    this.wheelAngle += (this.playerVelFps / 11) * dt * 6;

    const speedScale = getTierSpeedScale(this.car.tier);
    const wheelLinkedRpm = this.car.idleRpm + this.playerVelFps * totalRatio * speedScale;

    if (this.clutchHeld) {
      const target = this.throttleHeld ? this.perf.redlineRpm * 0.98 : this.car.idleRpm;
      this.playerRpm += (target - this.playerRpm) * Math.min(1, dt * 10);
    } else {
      const slipOffset = this.wheelspin * 1500;
      const rpmCap = inTopGear && this.tuning.topGearRevProtection ? softCutRpm : this.perf.redlineRpm + 240;
      const target = Math.min(rpmCap, Math.max(this.car.idleRpm + 400, wheelLinkedRpm + slipOffset));
      this.playerRpm += (target - this.playerRpm) * Math.min(1, dt * 18);
    }

    const accelPitchTarget =
      netAccel >= 0
        ? this.playerGear === 1 && this.throttleHeld && !this.clutchHeld
          ? -Math.min(8.2, netAccel * 0.065)
          : -Math.min(3.5, netAccel * 0.022)
        : Math.min(1.6, -netAccel * 0.04); // subtle nose dip only when lifting/braking
    this.pitchDeg += (accelPitchTarget - this.pitchDeg) * Math.min(1, dt * 7);
    this.squatPx += ((this.throttleHeld && netAccel > 5 ? 1.0 : 0) - this.squatPx) * Math.min(1, dt * 8);

    if (this.throttleHeld && (this.car.tier >= 4 || this.boostTimer > 0)) {
      this.exhaustFlame = Math.max(this.exhaustFlame, this.car.tier === 5 ? 0.9 : this.car.tier === 4 ? 0.65 : 0.45);
    }

    if ((this.wheelspin > 0.12 || this.playerDistFt < 85) && Math.random() < dt * 20) {
      this.spawnTireSmoke(2, 14);
    }
  }

  private updateRivalPhysics(dt: number): void {
    if (!this.rival) return;
    if (!this.rivalLaunched && this.raceElapsed >= this.rival.reactionSec) {
      this.rivalLaunched = true;
      this.rivalPitchDeg = -(3 + this.rival.tier * 1.1);
    }
    if (!this.rivalLaunched) return;

    const prevRivalDist = this.rivalDistFt;
    const t = Math.max(0.001, this.raceElapsed - this.rival.reactionSec);
    const curveExp = this.distanceId === 'mile' ? 1.42 : this.distanceId === 'half' ? 1.58 : 1.82;
    const nextDist = this.rivalAccelCurveA * Math.pow(t, curveExp);
    this.rivalVelFps = Math.max(0, (nextDist - prevRivalDist) / Math.max(0.001, dt));
    this.rivalDistFt = nextDist;
    this.rivalWheelAngle += (this.rivalVelFps / 11) * dt * 6;
    this.rivalPitchDeg *= Math.pow(0.92, dt * 60);

    if (this.rivalFinishSec === 0 && this.rivalDistFt >= this.distanceSpec.feet) {
      const distDelta = this.rivalDistFt - prevRivalDist;
      const frac =
        distDelta > 0.0001
          ? Math.max(0, Math.min(1, (this.distanceSpec.feet - prevRivalDist) / distDelta))
          : 1;
      // Rival finish time measured from green light (RT + ET) with sub-frame interpolation
      this.rivalFinishSec = Math.max(0, this.raceElapsed - dt) + frac * dt;
      this.rivalTrapMph = this.rival.targetTrapMph * (0.98 + Math.random() * 0.04);
    }
  }

  private finalizeRace(): void {
    this.resultDispatched = true;
    this.phase = 'RESULTS';
    soundEngine.stopEngine();

    const isTimeTrial = !this.rival;
    // Pure track ET (measured from launch, excluding reaction time)
    const playerEtMs = this.foul ? 0 : Math.round(this.playerFinishSec * 1000);
    const rivalTotalSec = this.rival
      ? this.rivalFinishSec > 0
        ? this.rivalFinishSec
        : this.rivalTargetEt + this.rival.reactionSec
      : 0;
    const rivalPureEtSec = this.rival
      ? Math.max(0.01, rivalTotalSec - this.rival.reactionSec)
      : 0;
    const rivalEtMs = Math.round(rivalPureEtSec * 1000);
    const rivalTrapMph = this.rival
      ? Number((this.rivalTrapMph > 0 ? this.rivalTrapMph : this.rival.targetTrapMph).toFixed(1))
      : 0;

    // Head-to-head drag race winner is first to the finish stripe (Reaction Time + Track ET)
    const playerTotalSec = this.reactionSec + this.playerFinishSec;
    const won = !this.foul && (isTimeTrial ? true : playerTotalSec <= rivalTotalSec);
    if (won) {
      soundEngine.playVictory();
    } else {
      soundEngine.playDefeat();
    }

    const tierMult = [1, 1.65, 2.7, 4.6, 7.8][this.tierId - 1];
    const basePurse = isTimeTrial
      ? 0
      : won
      ? this.rival!.winPurse
      : this.rival!.lossPurse;

    const shiftBonusCash =
      this.foul || isTimeTrial
        ? 0
        : Math.round((this.perfectShifts * 20 + this.perfectClutchShifts * 18) * tierMult);
    const launchBonusCash =
      !this.foul && !isTimeTrial && this.perfectLaunch ? Math.round(35 * tierMult) : 0;

    const { min: launchMin, max: launchMax } = this.getLaunchWindow();
    const { min: shiftMin, max: shiftMax } = this.getShiftWindow();

    const replay: RaceReplayData | undefined =
      !this.foul && this.playerFinishSec > 0 && this.replaySamples.length > 0
        ? {
            tier: this.tierId,
            timeOfDay: this.timeOfDay,
            distance: this.distanceId,
            distanceFt: this.distanceSpec.feet,
            carId: this.car.id,
            visuals: { ...this.config.visuals },
            upgrades: { ...this.config.upgrades },
            redlineRpm: this.perf.redlineRpm,
            launchMinRpm: Math.round(launchMin),
            launchMaxRpm: Math.round(launchMax),
            shiftMinRpm: Math.round(shiftMin),
            shiftMaxRpm: Math.round(shiftMax),
            totalEtSec: Number(this.playerFinishSec.toFixed(3)),
            trapMph: Number(this.playerTrapMph.toFixed(1)),
            reactionSec: Number(this.reactionSec.toFixed(3)),
            sixtyFtSec: Number((this.sixtyFtSec || 0).toFixed(3)),
            quarterSplitSec:
              this.quarterSplitSec > 0 ? Number(this.quarterSplitSec.toFixed(3)) : undefined,
            halfSplitSec:
              this.halfSplitSec > 0 ? Number(this.halfSplitSec.toFixed(3)) : undefined,
            rival: this.rival
              ? {
                  name: this.rival.name,
                  carName: this.rival.carName,
                  chassis: this.rival.chassis,
                  bodyVariant: this.rival.bodyVariant,
                  paintColor: this.rival.paintColor,
                  stripe: this.rival.stripe,
                  rims: this.rival.rims,
                  upgrades: { ...this.rival.upgrades },
                }
              : undefined,
            events: this.replayEvents,
            samples: this.replaySamples,
          }
        : undefined;

    const result: RaceResult = {
      won,
      foul: this.foul,
      isTimeTrial,
      distance: this.distanceId,
      rival: this.rival,
      tier: this.tierId,
      carId: this.car.id,
      carName: this.car.name,
      paintColor: this.config.visuals.paintColor,
      playerEtMs,
      rivalEtMs,
      playerTrapMph: Number(this.playerTrapMph.toFixed(1)),
      rivalTrapMph,
      reactionMs: this.foul ? 0 : Math.round(this.reactionSec * 1000),
      sixtyFtSec: Number((this.sixtyFtSec || 0).toFixed(3)),
      quarterSplitSec: this.quarterSplitSec > 0 ? Number(this.quarterSplitSec.toFixed(3)) : undefined,
      halfSplitSec: this.halfSplitSec > 0 ? Number(this.halfSplitSec.toFixed(3)) : undefined,
      perfectLaunch: this.perfectLaunch,
      perfectShifts: this.perfectShifts,
      perfectClutchShifts: this.perfectClutchShifts,
      basePurse,
      shiftBonusCash,
      launchBonusCash,
      recordBonusCash: 0,
      totalCashEarned: basePurse + shiftBonusCash + launchBonusCash,
      unlockedNextTier: false,
      isNewPersonalBest: false,
      overRevCount: this.overRevCount,
      nitrousUsedCount: this.nitrousUsedCount,
      topGearRevProtectionUsed: this.topGearRevProtectionUsed,
      burnoutEfficiency: this.burnoutEfficiency,
      burnoutSkipped: this.burnoutSkipped,
      replay,
    };

    this.emitTelemetry(true);
    this.callbacks.onFinish(result);
  }

  private pushReplaySample(tSec: number, clampFinish = false): void {
    const sample: ReplaySample = {
      t: Number(tSec.toFixed(3)),
      d: Number((clampFinish ? this.distanceSpec.feet : Math.min(this.distanceSpec.feet, this.playerDistFt)).toFixed(1)),
      v: Math.round(this.playerVelFps * 0.681818),
      r: Math.round(this.playerRpm),
      g: this.playerGear,
      p: Number(this.pitchDeg.toFixed(1)),
    };
    if (this.rival) {
      sample.rd = Number(Math.min(this.distanceSpec.feet + 80, this.rivalDistFt).toFixed(1));
    }
    if (this.boostTimer > 0 || this.nitrousTimer > 0) {
      sample.b = 1;
    }
    this.replaySamples.push(sample);
  }

  private emitTelemetry(force: boolean): void {
    const now = performance.now();
    if (!force && now - this.lastHudEmit < 32) return;
    this.lastHudEmit = now;

    const { min: launchMin, max: launchMax } = this.getLaunchWindow();
    const { min: shiftMin, max: shiftMax } = this.getShiftWindow();

    this.callbacks.onTelemetry({
      phase: this.phase,
      distance: this.distanceId,
      distanceFt: this.distanceSpec.feet,
      treeStep: this.treeStep,
      elapsedSec: this.playerFinishSec > 0 ? this.playerFinishSec : this.playerRunElapsed,
      playerDistFt: Math.max(0, Math.min(this.distanceSpec.feet, this.playerDistFt)),
      rivalDistFt: Math.min(this.distanceSpec.feet, this.rivalDistFt),
      playerMph: Math.round(this.playerVelFps * 0.681818),
      rivalMph: Math.round(this.rivalVelFps * 0.681818),
      rpm: Math.round(this.playerRpm),
      redlineRpm: this.perf.redlineRpm,
      launchMinRpm: Math.round(launchMin),
      launchMaxRpm: Math.round(launchMax),
      shiftMinRpm: Math.round(shiftMin),
      shiftMaxRpm: Math.round(shiftMax),
      gear: this.launched ? this.playerGear : 0,
      maxGears: this.tuning.gearRatios.length,
      throttle: this.throttleHeld,
      clutch: this.clutchHeld,
      brake: this.brakeHeld,
      burnoutTimeLeft: Number(this.burnoutTimeLeft.toFixed(1)),
      burnoutDuration: this.burnoutDuration,
      burnoutTemp: Math.round(this.burnoutTemp),
      burnoutEfficiency: this.burnoutEfficiency,
      burnoutGripBonusPct: Math.round((this.getBurnoutGripMultiplier() - 1) * 100),
      burnoutSkipped: this.burnoutSkipped,
      boostTimer: this.boostTimer,
      nitrousLeft: this.nitrousLeft,
      nitrousMax: this.perf.nitrousShots,
      nitrousActive: this.nitrousTimer > 0,
      wheelspin: this.wheelspin,
      inLaunchZone: !this.launched && this.playerRpm >= launchMin && this.playerRpm <= launchMax,
      inShiftZone:
        this.launched &&
        this.playerGear < this.tuning.gearRatios.length &&
        this.playerRpm >= shiftMin &&
        this.playerRpm <= shiftMax,
      calloutText: this.calloutTimer > 0 ? this.calloutText : '',
      calloutTimer: this.calloutTimer,
      calloutColor: this.calloutColor,
      foul: this.foul,
      revProtectionActive: this.revProtectionActive,
    });
  }
}
