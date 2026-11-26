import { soundEngine } from '../audio/soundEngine';
import {
  computeCarPerformance,
  getCarById,
  getEffectiveTuning,
  getStripDistanceSpec,
  getTierById,
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
  RaceResult,
  RaceTelemetry,
  RivalSpec,
  ShiftRating,
  StripDistanceId,
  StripDistanceSpec,
  TierId,
} from '../types/game';
import {
  drawChristmasTree,
  drawEnvironment,
  drawPixelCar,
  LOGICAL_H,
  LOGICAL_W,
  PLAYER_LANE_Y,
  PX_PER_FT,
  RIVAL_LANE_Y,
  START_LINE_X,
  TREE_BASE_Y,
  TREE_X_OFFSET,
} from './pixelSprites';

interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
}

export interface RaceCallbacks {
  onTelemetry: (telemetry: RaceTelemetry) => void;
  onFinish: (result: RaceResult) => void;
}

export class RaceSimulation {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private rafId: number | null = null;
  private lastTime = 0;
  private paused = false;
  private destroyed = false;

  // Config
  private car: CarSpec;
  private config: CarConfig;
  private tuning: DrivetrainTuning;
  private perf: ComputedPerformance;
  private tierId: TierId;
  private distanceId: StripDistanceId;
  private distanceSpec: StripDistanceSpec;
  private rival: RivalSpec | null;
  private callbacks: RaceCallbacks;

  // Input states (continuous held vs edge-triggered)
  private throttleHeld = false;
  private clutchHeld = false;
  private shiftUpQueued = false;
  private shiftDownQueued = false;
  private nitrousQueued = false;

  // Race state
  private phase: RacePhase = 'STAGING';
  private stageTimer = 0;
  private treeStep = 0; // 0=pre, 1=stage, 2=amb1, 3=amb2, 4=amb3, 5=green, -1=foul
  private greenLightTime = 0;
  private simTime = 0;
  private raceElapsed = 0;
  private foul = false;
  private hitstopTimer = 0;
  private shakeAmp = 0;

  // Player physics
  private playerDistFt = 0;
  private playerVelFps = 0; // feet per second
  private playerRpm = 1100;
  private playerGear = 1; // 1..N
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
  private calloutText: ShiftRating | '' = '';
  private calloutTimer = 0;
  private calloutColor = '#22c55e';

  // Camera
  private cameraFt = 0;
  private finishCoastTimer = 0;
  private resultDispatched = false;
  private lastHudEmit = 0;

  // Pooled particles
  private particles: Particle[] = [];

  constructor(
    canvas: HTMLCanvasElement,
    carId: string,
    config: CarConfig,
    tierId: TierId,
    distanceId: StripDistanceId,
    rival: RivalSpec | null,
    callbacks: RaceCallbacks
  ) {
    this.canvas = canvas;
    this.canvas.width = LOGICAL_W;
    this.canvas.height = LOGICAL_H;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D context unavailable');
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = false;

    this.car = getCarById(carId);
    this.config = config;
    this.tuning = getEffectiveTuning(carId, config);
    this.perf = computeCarPerformance(carId, config);
    this.tierId = tierId;
    this.distanceId = rival ? rival.distance : distanceId;
    this.distanceSpec = getStripDistanceSpec(this.distanceId);
    this.rival = rival;
    this.callbacks = callbacks;

    for (let i = 0; i < 120; i++) {
      this.particles.push({
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        size: 2,
        color: '#ffffff',
        life: 0,
        maxLife: 1,
      });
    }

    this.reset();
  }

  public reset(): void {
    this.phase = 'STAGING';
    this.stageTimer = 0;
    this.treeStep = 0;
    this.greenLightTime = 0;
    this.simTime = 0;
    this.raceElapsed = 0;
    this.foul = false;
    this.hitstopTimer = 0;
    this.shakeAmp = 0;

    this.playerDistFt = 0;
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

    this.rivalDistFt = 0;
    this.rivalVelFps = 0;
    this.rivalFinishSec = 0;
    this.rivalTrapMph = 0;
    this.rivalWheelAngle = 0;
    this.rivalLaunched = false;
    this.rivalPitchDeg = 0;
    this.rivalChuteOpen = 0;

    // Give rival tiny realistic race-to-race variance (+/- 1.5%)
    const variance = 1 + (Math.random() * 0.03 - 0.015);
    this.rivalTargetEt = this.rival ? this.rival.targetEtSec * variance : 12;
    const curveExp = this.distanceId === 'mile' ? 1.42 : this.distanceId === 'half' ? 1.58 : 1.82;
    this.rivalAccelCurveA = this.distanceSpec.feet / Math.pow(this.rivalTargetEt, curveExp);

    this.calloutText = '';
    this.calloutTimer = 0;
    this.cameraFt = -4;
    this.finishCoastTimer = 0;
    this.resultDispatched = false;

    for (const p of this.particles) p.active = false;

    soundEngine.startEngine(this.car.tier);
    this.emitTelemetry(true);
  }

  public start(): void {
    this.lastTime = performance.now();
    const loop = (now: number) => {
      if (this.destroyed) return;
      const rawDt = (now - this.lastTime) / 1000;
      this.lastTime = now;
      const dt = Math.min(Math.max(rawDt, 0), 0.05);

      if (!this.paused) {
        this.step(dt);
      }
      this.render();
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  public destroy(): void {
    this.destroyed = true;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    soundEngine.stopEngine();
  }

  public setPaused(p: boolean): void {
    this.paused = p;
    if (p) {
      this.clearInputs();
      soundEngine.stopEngine();
    } else if (this.phase !== 'RESULTS') {
      soundEngine.startEngine(this.car.tier);
    }
  }

  public setThrottle(held: boolean): void {
    this.throttleHeld = held;
  }

  public setClutch(held: boolean): void {
    const prev = this.clutchHeld;
    this.clutchHeld = held;
    // Detect clutch release edge for launch!
    if (prev && !held) {
      this.onClutchReleased();
    }
  }

  public triggerShiftUp(): void {
    this.shiftUpQueued = true;
  }

  public triggerShiftDown(): void {
    this.shiftDownQueued = true;
  }

  public triggerNitrous(): void {
    this.nitrousQueued = true;
  }

  public clearInputs(): void {
    this.throttleHeld = false;
    this.clutchHeld = false;
    this.shiftUpQueued = false;
    this.shiftDownQueued = false;
    this.nitrousQueued = false;
  }

  private showCallout(text: ShiftRating, color: string): void {
    this.calloutText = text;
    this.calloutColor = color;
    this.calloutTimer = 1.15;
  }

  private spawnParticle(
    x: number,
    y: number,
    vx: number,
    vy: number,
    size: number,
    color: string,
    maxLife: number
  ): void {
    for (const p of this.particles) {
      if (!p.active) {
        p.active = true;
        p.x = x;
        p.y = y;
        p.vx = vx;
        p.vy = vy;
        p.size = size;
        p.color = color;
        p.life = maxLife;
        p.maxLife = maxLife;
        return;
      }
    }
  }

  private spawnBurst(x: number, y: number, color: string, count: number, speed = 90): void {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = (0.3 + Math.random() * 0.7) * speed;
      this.spawnParticle(x, y, Math.cos(a) * s - 40, Math.sin(a) * s - 15, 2 + Math.floor(Math.random() * 2), color, 0.28 + Math.random() * 0.25);
    }
  }

  private onClutchReleased(): void {
    if (this.phase === 'COUNTDOWN' && this.treeStep >= 2 && this.treeStep < 5) {
      // Dropped clutch before green light -> RED LIGHT FOUL!
      this.triggerFoul();
    } else if (this.phase === 'RACING' && !this.launched) {
      this.executeLaunch();
    }
  }

  private triggerFoul(): void {
    if (this.foul) return;
    this.foul = true;
    this.treeStep = -1;
    this.phase = 'FINISH_COAST';
    this.finishCoastTimer = 1.4;
    this.shakeAmp = 5;
    this.showCallout('RED LIGHT FOUL!', '#ef4444');
    soundEngine.playFoul();
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
    this.reactionSec = Math.max(0.005, this.simTime - this.greenLightTime);

    const { min: launchMin, max: launchMax } = this.getLaunchWindow();

    if (this.playerRpm >= launchMin && this.playerRpm <= launchMax) {
      // PERFECT LAUNCH! Higher tuned launch RPM gives extra jump if tires can hook
      this.perfectLaunch = true;
      const launchAggression = Math.max(-0.04, Math.min(0.06, this.tuning.launchRpmOffset / 10000));
      this.boostTimer = 0.85;
      this.boostStrength = 1.2 + launchAggression;
      this.pitchDeg = -(5.5 + this.car.tier * 1.4);
      this.squatPx = 2.5;
      this.shakeAmp = 4.5;
      this.hitstopTimer = 0.035;
      this.exhaustFlame = 1.0;
      this.playerVelFps = 18 + this.car.tier * 6 + Math.max(0, this.tuning.launchRpmOffset * 0.008);
      this.showCallout('PERFECT LAUNCH!', '#22c55e');
      soundEngine.playLaunchHook(true);
      this.spawnBurst(96, PLAYER_LANE_Y - 10, '#facc15', 16, 130);
      this.spawnBurst(92, PLAYER_LANE_Y - 6, '#e2e8f0', 14, 85);
    } else if (this.playerRpm > launchMax) {
      // WHEELSPIN!
      this.wheelspin = Math.min(1, 0.55 + (this.playerRpm - launchMax) / 2600);
      this.playerVelFps = 10 + this.car.tier * 3;
      this.pitchDeg = -2.5;
      this.shakeAmp = 3;
      this.showCallout('WHEELSPIN!', '#f59e0b');
      soundEngine.playLaunchHook(false);
      this.spawnBurst(92, PLAYER_LANE_Y - 6, '#cbd5e1', 20, 100);
    } else {
      // BOGGED LAUNCH
      this.playerVelFps = 7 + this.car.tier * 2;
      this.playerRpm = Math.max(this.car.idleRpm + 300, this.playerRpm * 0.65);
      this.showCallout('BOG LAUNCH', '#94a3b8');
      soundEngine.playLaunchHook(false);
    }
  }

  private handleShiftUp(): void {
    if (this.phase !== 'RACING' || !this.launched) return;
    if (this.playerGear >= this.tuning.gearRatios.length) return;
    if (this.shiftLockTimer > 0) return;

    const { min: minSweet, max: maxSweet } = this.getShiftWindow();
    const oldRatio = this.tuning.gearRatios[this.playerGear - 1];
    this.playerGear += 1;
    const newRatio = this.tuning.gearRatios[this.playerGear - 1];

    const rpmBefore = this.playerRpm;
    this.playerRpm = Math.max(this.car.idleRpm + 800, rpmBefore * (newRatio / oldRatio));
    this.shiftLockTimer = this.perf.shiftSpeedSec;
    this.exhaustFlame = 1.0;

    if (rpmBefore >= minSweet && rpmBefore <= maxSweet) {
      // PERFECT SHIFT! Extra bonus if clutch was engaged cleanly
      this.perfectShifts += 1;
      if (this.clutchHeld) {
        this.perfectClutchShifts += 1;
        this.boostTimer = 0.95;
        this.boostStrength = this.perf.shiftBoostMult + 0.08;
        this.hitstopTimer = 0.048;
        this.shakeAmp = 5.5;
        this.pitchDeg = -(4.5 + this.car.tier * 1.1);
        this.showCallout('PERFECT CLUTCH!', '#facc15');
        soundEngine.playShift('perfect_clutch');
        this.spawnBurst(98, PLAYER_LANE_Y - 14, '#facc15', 18, 155);
      } else {
        this.boostTimer = 0.78;
        this.boostStrength = this.perf.shiftBoostMult;
        this.hitstopTimer = 0.036;
        this.shakeAmp = 3.8;
        this.pitchDeg = -(3.2 + this.car.tier * 0.8);
        this.showCallout('PERFECT SHIFT!', '#22c55e');
        soundEngine.playShift('perfect');
        this.spawnBurst(98, PLAYER_LANE_Y - 14, '#4ade80', 14, 125);
      }
      // Instant velocity kick for crisp rewarding punch!
      this.playerVelFps *= this.clutchHeld ? 1.065 : 1.045;
    } else if (rpmBefore > maxSweet) {
      this.boostTimer = 0.25;
      this.boostStrength = 1.02;
      this.showCallout('OVER-REV!', '#f97316');
      soundEngine.playShift('miss');
    } else if (rpmBefore >= minSweet - 900) {
      this.boostTimer = 0.35;
      this.boostStrength = 1.06;
      this.showCallout('GOOD SHIFT', '#38bdf8');
      soundEngine.playShift('good');
    } else {
      this.shiftLockTimer += 0.12;
      this.showCallout('EARLY SHIFT', '#94a3b8');
      soundEngine.playShift('miss');
    }
  }

  private handleShiftDown(): void {
    if (this.phase !== 'RACING' || !this.launched) return;
    if (this.playerGear <= 1 || this.shiftLockTimer > 0) return;
    const oldRatio = this.tuning.gearRatios[this.playerGear - 1];
    this.playerGear -= 1;
    const newRatio = this.tuning.gearRatios[this.playerGear - 1];
    this.playerRpm = Math.min(this.perf.redlineRpm + 250, this.playerRpm * (newRatio / oldRatio));
    this.shiftLockTimer = 0.1;
    soundEngine.playShift('good');
  }

  private handleNitrous(): void {
    if (this.phase !== 'RACING' || !this.launched) return;
    if (this.nitrousLeft <= 0 || this.nitrousTimer > 0) return;
    this.nitrousLeft -= 1;
    this.nitrousTimer = 1.65;
    this.shakeAmp = 4.2;
    this.pitchDeg = Math.min(this.pitchDeg, -(3.5 + this.car.tier * 0.7));
    this.showCallout('NITROUS BOOST!', '#38bdf8');
    soundEngine.playNitrous();
    this.spawnBurst(88, PLAYER_LANE_Y - 12, '#38bdf8', 22, 165);
  }

  private step(dt: number): void {
    if (this.hitstopTimer > 0) {
      this.hitstopTimer = Math.max(0, this.hitstopTimer - dt);
      this.updateParticles(dt * 0.35);
      return;
    }

    this.simTime += dt;
    this.shakeAmp = Math.max(0, this.shakeAmp - dt * 14);
    this.calloutTimer = Math.max(0, this.calloutTimer - dt);
    this.exhaustFlame = Math.max(0, this.exhaustFlame - dt * 3.8);

    // Handle edge-triggered inputs
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

    // --- PHASE PROGRESSION ---
    if (this.phase === 'STAGING') {
      this.stageTimer += dt;
      if (this.stageTimer >= 0.45 && this.treeStep === 0) {
        this.treeStep = 1; // Staged
      }
      if (this.stageTimer >= 1.15) {
        this.phase = 'COUNTDOWN';
        this.stageTimer = 0;
        this.treeStep = 2;
        soundEngine.playTreeAmber();
      }
      this.updateStagingRpm(dt);
    } else if (this.phase === 'COUNTDOWN') {
      this.stageTimer += dt;
      if (this.stageTimer >= 0.55 && this.treeStep === 2) {
        this.treeStep = 3;
        soundEngine.playTreeAmber();
      } else if (this.stageTimer >= 1.1 && this.treeStep === 3) {
        this.treeStep = 4;
        soundEngine.playTreeAmber();
      } else if (this.stageTimer >= 1.65 && this.treeStep === 4) {
        this.treeStep = 5;
        this.phase = 'RACING';
        this.greenLightTime = this.simTime;
        soundEngine.playTreeGreen();

        // If player is NOT holding clutch on green, auto-launch if pressing gas!
        if (!this.clutchHeld && this.throttleHeld) {
          this.executeLaunch();
        }
      }
      this.updateStagingRpm(dt);
    } else if (this.phase === 'RACING') {
      this.raceElapsed += dt;

      // If player held clutch past green, wait until release; or if they press gas without clutch, launch!
      if (!this.launched && !this.clutchHeld && this.throttleHeld) {
        this.executeLaunch();
      }

      if (!this.launched) {
        this.updateStagingRpm(dt);
      } else {
        this.updatePlayerRacingPhysics(dt);
      }

      if (this.rival) {
        this.updateRivalPhysics(dt);
      }

      // Check intermediate splits (60 ft, 1/4 mile, 1/2 mile)
      if (this.sixtyFtSec === 0 && this.playerDistFt >= 60) {
        this.sixtyFtSec = this.raceElapsed;
      }
      if (this.distanceId !== 'quarter' && this.quarterSplitSec === 0 && this.playerDistFt >= QUARTER_MILE_FT) {
        this.quarterSplitSec = this.raceElapsed;
      }
      if (this.distanceId === 'mile' && this.halfSplitSec === 0 && this.playerDistFt >= HALF_MILE_FT) {
        this.halfSplitSec = this.raceElapsed;
      }

      // Check Player Finish at dynamic strip distance (1320, 2640, or 5280 ft)
      if (this.playerFinishSec === 0 && this.playerDistFt >= this.distanceSpec.feet) {
        this.playerFinishSec = this.raceElapsed;
        this.playerTrapMph = this.playerVelFps * 0.681818;
        if (this.car.hasParachute) {
          soundEngine.playParachute();
        }
        // Finish celebration sparks
        this.spawnBurst(180, 180, '#facc15', 26, 165);
      }

      // Transition to Finish Coast once player finishes
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

      // Coast player car down smoothly & deploy parachute on Tier 4/5
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

      if (this.rival) {
        if (this.rivalFinishSec > 0) {
          if (this.rival.tier >= 4) {
            this.rivalChuteOpen = Math.min(1, this.rivalChuteOpen + dt * 2.5);
          }
          this.rivalVelFps *= Math.pow(0.97, dt * 60);
          this.rivalDistFt += this.rivalVelFps * dt;
          this.rivalWheelAngle += (this.rivalVelFps / 12) * dt * 6;
        }
      }

      if (this.finishCoastTimer <= 0 && !this.resultDispatched) {
        this.finalizeRace();
      }
    }

    // Smooth camera tracking
    const leadOffset = Math.min(18, (this.playerVelFps * 0.6818) * 0.045);
    const targetCam = this.playerDistFt - 6 - leadOffset * 0.25;
    this.cameraFt += (targetCam - this.cameraFt) * Math.min(1, dt * 14);

    this.updateParticles(dt);

    // Update continuous engine audio
    soundEngine.updateEngine({
      rpm: this.playerRpm,
      redline: this.perf.redlineRpm,
      throttle: this.throttleHeld && this.phase !== 'FINISH_COAST' && this.phase !== 'RESULTS',
      clutch: this.clutchHeld || !this.launched,
      tier: this.car.tier,
      boost: this.boostTimer > 0 || this.nitrousTimer > 0,
      inductionLevel: this.config.upgrades.induction,
    });

    this.emitTelemetry(false);
  }

  private updateStagingRpm(dt: number): void {
    const targetRpm = this.throttleHeld ? this.perf.redlineRpm * 0.96 : this.car.idleRpm;
    const climbRate = this.throttleHeld ? 5400 + this.car.tier * 950 : 3800;
    if (this.playerRpm < targetRpm) {
      this.playerRpm = Math.min(targetRpm, this.playerRpm + climbRate * dt);
    } else {
      this.playerRpm = Math.max(targetRpm, this.playerRpm - climbRate * 0.85 * dt);
    }
    // Slight idle & staging exhaust puffs
    if (this.throttleHeld && Math.random() < dt * 16) {
      this.exhaustFlame = Math.max(this.exhaustFlame, this.car.tier >= 4 ? 0.55 : 0.2);
      this.spawnParticle(68, PLAYER_LANE_Y - 10, -45 - Math.random() * 28, -10 - Math.random() * 16, 4, '#cbd5e1', 0.38);
    }
    // Bounce off two-step limiter near redline
    if (this.playerRpm > this.perf.redlineRpm * 0.93) {
      this.playerRpm -= (Math.random() * 240);
    }
  }

  private updatePlayerRacingPhysics(dt: number): void {
    this.shiftLockTimer = Math.max(0, this.shiftLockTimer - dt);
    this.boostTimer = Math.max(0, this.boostTimer - dt);
    this.nitrousTimer = Math.max(0, this.nitrousTimer - dt);
    this.wheelspin = Math.max(0, this.wheelspin - dt * (0.9 + this.perf.grip * 0.45));

    const gearIdx = Math.min(this.playerGear - 1, this.tuning.gearRatios.length - 1);
    const gearRatio = this.tuning.gearRatios[gearIdx];
    const totalRatio = gearRatio * this.tuning.finalDrive;
    const stockTotalRatio = this.car.gearRatios[gearIdx] * this.car.finalDrive;
    const gearingTorqueFactor = Math.max(0.72, Math.min(1.32, Math.pow(totalRatio / stockTotalRatio, 0.42)));

    // Power curve peaks around 82% of redline, hard rev-limiter cut above redline!
    const rpmNorm = Math.max(0.15, Math.min(1.08, this.playerRpm / this.perf.redlineRpm));
    let torqueShape = 0.62 + Math.sin(Math.min(1, rpmNorm) * Math.PI * 0.78) * 0.55;
    if (this.playerRpm >= this.perf.redlineRpm) {
      torqueShape *= 0.08; // Hard rev limiter — forces taller gearing on 1/2 & 1 mile!
    }

    const boostMult = this.boostTimer > 0 ? this.boostStrength : 1;
    const nosMult = this.nitrousTimer > 0 ? this.perf.nitrousPowerMult : 1;
    const clutchFactor = this.clutchHeld ? 0.15 : 1;
    const shiftCut = this.shiftLockTimer > 0 ? 0.22 : 1;
    const spinLoss = 1 - this.wheelspin * 0.38;

    // Calibrated acceleration in ft/s^2 so each car hits authentic 1/4, 1/2 & 1 mile ETs
    const hpPerTon = this.perf.hp / (this.perf.weightLbs / 2000);
    const tierDriveScale = [0.22, 0.235, 0.245, 0.275, 0.335][this.car.tier - 1];
    let driveAccel =
      (this.throttleHeld ? 1 : 0) *
      hpPerTon *
      tierDriveScale *
      torqueShape *
      (0.55 + gearRatio * 0.26) *
      gearingTorqueFactor *
      boostMult *
      nosMult *
      clutchFactor *
      shiftCut *
      spinLoss;

    // Traction cap based on drag slicks
    const maxTractionAccel = (26 + this.perf.grip * 32) * (1 + (this.car.tier - 1) * 0.42);
    if (driveAccel > maxTractionAccel) {
      driveAccel = maxTractionAccel + (driveAccel - maxTractionAccel) * 0.35;
    }

    // Aerodynamic drag (chassis upgrades also trim aero drag slightly)
    const effectiveDrag = Math.max(0.18, this.car.dragCoeff * (1 - this.config.upgrades.chassis * 0.025));
    const dragAccel = 0.00022 * effectiveDrag * this.playerVelFps * this.playerVelFps;
    const engineBrake = !this.throttleHeld ? 9.5 : 0;

    const netAccel = driveAccel - dragAccel - engineBrake;
    this.playerVelFps = Math.max(0, this.playerVelFps + netAccel * dt);
    this.playerDistFt += this.playerVelFps * dt;
    this.wheelAngle += (this.playerVelFps / 11) * dt * 6;

    // Derive RPM from wheel speed + tuned final drive & gear ratio
    const speedScale = getTierSpeedScale(this.car.tier);
    const wheelLinkedRpm = this.car.idleRpm + this.playerVelFps * totalRatio * speedScale;

    if (this.clutchHeld) {
      const target = this.throttleHeld ? this.perf.redlineRpm * 0.98 : this.car.idleRpm;
      this.playerRpm += (target - this.playerRpm) * Math.min(1, dt * 10);
    } else {
      const slipOffset = this.wheelspin * 1500;
      const target = Math.min(this.perf.redlineRpm + 240, Math.max(this.car.idleRpm + 400, wheelLinkedRpm + slipOffset));
      this.playerRpm += (target - this.playerRpm) * Math.min(1, dt * 18);
    }

    // Visual pitch (wheelie) & squat decay
    const accelPitchTarget = this.playerGear === 1 && this.throttleHeld && !this.clutchHeld
      ? -Math.min(10, netAccel * 0.075)
      : -Math.min(4, netAccel * 0.025);
    this.pitchDeg += (accelPitchTarget - this.pitchDeg) * Math.min(1, dt * 7);
    this.squatPx += ((this.throttleHeld ? 1.5 : 0) - this.squatPx) * Math.min(1, dt * 8);

    // Exhaust flames for Top Fuel / Funny Car / Boost
    if (this.throttleHeld && (this.car.tier >= 4 || this.boostTimer > 0)) {
      this.exhaustFlame = Math.max(this.exhaustFlame, this.car.tier === 5 ? 0.9 : this.car.tier === 4 ? 0.65 : 0.45);
    }

    // Tire smoke when spinning or launching hard
    if ((this.wheelspin > 0.12 || this.playerDistFt < 90) && Math.random() < dt * 30) {
      this.spawnParticle(
        86 + Math.random() * 12,
        PLAYER_LANE_Y - 6,
        -75 - this.playerVelFps * 0.32,
        -14 - Math.random() * 22,
        4 + Math.floor(Math.random() * 3),
        '#cbd5e1',
        0.42
      );
    }
    if (this.nitrousTimer > 0 && Math.random() < dt * 34) {
      this.spawnParticle(64, PLAYER_LANE_Y - 14, -170, (Math.random() - 0.5) * 24, 3, '#38bdf8', 0.24);
    }
  }

  private updateRivalPhysics(dt: number): void {
    if (!this.rival) return;
    if (!this.rivalLaunched && this.raceElapsed >= this.rival.reactionSec) {
      this.rivalLaunched = true;
      this.rivalPitchDeg = -(3 + this.rival.tier * 1.1);
    }
    if (!this.rivalLaunched) return;

    const t = Math.max(0.001, this.raceElapsed - this.rival.reactionSec);
    // Smooth authentic dragster distance curve calibrated to strip length
    const curveExp = this.distanceId === 'mile' ? 1.42 : this.distanceId === 'half' ? 1.58 : 1.82;
    const nextDist = this.rivalAccelCurveA * Math.pow(t, curveExp);
    this.rivalVelFps = Math.max(0, (nextDist - this.rivalDistFt) / Math.max(0.001, dt));
    this.rivalDistFt = nextDist;
    this.rivalWheelAngle += (this.rivalVelFps / 11) * dt * 6;
    this.rivalPitchDeg *= Math.pow(0.92, dt * 60);

    if (this.rivalFinishSec === 0 && this.rivalDistFt >= this.distanceSpec.feet) {
      this.rivalFinishSec = this.raceElapsed;
      this.rivalTrapMph = this.rival.targetTrapMph * (0.98 + Math.random() * 0.04);
    }
  }

  private updateParticles(dt: number): void {
    for (const p of this.particles) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy -= 8 * dt;
    }
  }

  private finalizeRace(): void {
    this.resultDispatched = true;
    this.phase = 'RESULTS';
    soundEngine.stopEngine();

    const isTimeTrial = !this.rival;
    const playerEtMs = this.foul ? 0 : Math.round(this.playerFinishSec * 1000);
    const rivalEtSec = this.rival
      ? (this.rivalFinishSec > 0 ? this.rivalFinishSec : this.rivalTargetEt + this.rival.reactionSec)
      : 0;
    const rivalEtMs = Math.round(rivalEtSec * 1000);
    const rivalTrapMph = this.rival
      ? Number((this.rivalTrapMph > 0 ? this.rivalTrapMph : this.rival.targetTrapMph).toFixed(1))
      : 0;

    const won = !this.foul && (isTimeTrial ? true : playerEtMs <= rivalEtMs);
    if (won) {
      soundEngine.playVictory();
    } else {
      soundEngine.playDefeat();
    }

    const tierMult = [1, 1.8, 3.1, 5.5, 9.5][this.tierId - 1];
    const basePurse = isTimeTrial
      ? (this.foul ? 0 : Math.round(220 * tierMult * this.distanceSpec.purseMultiplier))
      : won
      ? this.rival!.winPurse
      : this.rival!.lossPurse;

    const shiftBonusCash = this.foul
      ? 0
      : Math.round((this.perfectShifts * 45 + this.perfectClutchShifts * 35) * tierMult);
    const launchBonusCash = !this.foul && this.perfectLaunch ? Math.round(75 * tierMult) : 0;

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
    };

    this.emitTelemetry(true);
    this.callbacks.onFinish(result);
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
      elapsedSec: this.playerFinishSec > 0 ? this.playerFinishSec : this.raceElapsed,
      playerDistFt: Math.min(this.distanceSpec.feet, this.playerDistFt),
      rivalDistFt: Math.min(this.distanceSpec.feet, this.rivalDistFt),
      playerMph: Math.round(this.playerVelFps * 0.681818),
      rivalMph: Math.round(this.rivalVelFps * 0.681818),
      rpm: Math.round(this.playerRpm),
      redlineRpm: this.perf.redlineRpm,
      launchMinRpm: launchMin,
      launchMaxRpm: launchMax,
      shiftMinRpm: shiftMin,
      shiftMaxRpm: shiftMax,
      gear: this.launched ? this.playerGear : 0,
      maxGears: this.tuning.gearRatios.length,
      throttle: this.throttleHeld,
      clutch: this.clutchHeld,
      boostTimer: this.boostTimer,
      nitrousLeft: this.nitrousLeft,
      nitrousMax: this.perf.nitrousShots,
      nitrousActive: this.nitrousTimer > 0,
      wheelspin: this.wheelspin,
      inLaunchZone: this.playerRpm >= launchMin && this.playerRpm <= launchMax,
      inShiftZone: this.launched && this.playerGear < this.tuning.gearRatios.length && this.playerRpm >= shiftMin && this.playerRpm <= shiftMax,
      calloutText: this.calloutTimer > 0 ? this.calloutText : '',
      calloutTimer: this.calloutTimer,
      calloutColor: this.calloutColor,
      foul: this.foul,
    });
  }

  private render(): void {
    const ctx = this.ctx;
    const tierSpec = getTierById(this.tierId);
    const playerMph = this.playerVelFps * 0.681818;

    ctx.save();
    if (this.shakeAmp > 0.1) {
      const sx = Math.round((Math.random() - 0.5) * this.shakeAmp * 2.4);
      const sy = Math.round((Math.random() - 0.5) * this.shakeAmp * 1.8);
      ctx.translate(sx, sy);
    }

    // 1. High-detail 16-bit parallax environment with dynamic strip length
    drawEnvironment(
      ctx,
      tierSpec.theme,
      this.cameraFt,
      this.simTime,
      playerMph,
      PX_PER_FT,
      this.distanceSpec.feet,
      this.distanceSpec.shortLabel
    );

    // 2. Rival Car (Upper Lane, slight depth scale)
    if (this.rival) {
      const rivalScreenX = Math.round(START_LINE_X + (this.rivalDistFt - this.cameraFt) * PX_PER_FT);
      if (rivalScreenX > -190 && rivalScreenX < LOGICAL_W + 190) {
        drawPixelCar(ctx, {
          x: rivalScreenX,
          y: RIVAL_LANE_Y,
          scale: 0.9,
          chassis: this.rival.chassis,
          bodyVariant: this.rival.bodyVariant,
          visuals: {
            paintColor: this.rival.paintColor,
            stripe: this.rival.stripe,
            rims: this.rival.rims,
          },
          upgrades: this.rival.upgrades,
          wheelAngle: this.rivalWheelAngle,
          pitchDeg: this.rivalPitchDeg,
          squatPx: 0,
          exhaustFlame: this.rivalLaunched && this.rivalFinishSec === 0 && this.rival.tier >= 4 ? 0.7 : 0,
          nitrousFlame: 0,
          chuteOpen: this.rivalChuteOpen,
          dimmed: true,
        });
      }
    }

    // 3. NHRA Pixel Christmas Tree (stands between lanes at the start line)
    const treeX = Math.round(START_LINE_X + TREE_X_OFFSET - this.cameraFt * PX_PER_FT);
    if (treeX > -40 && treeX < LOGICAL_W + 40) {
      drawChristmasTree(ctx, treeX, TREE_BASE_Y, this.treeStep);
    }

    // 4. Player Car (Foreground Lane, crisp full scale)
    const playerScreenX = Math.round(START_LINE_X + (this.playerDistFt - this.cameraFt) * PX_PER_FT);
    drawPixelCar(ctx, {
      x: playerScreenX,
      y: PLAYER_LANE_Y,
      scale: 1.08,
      chassis: this.car.chassis,
      bodyVariant: this.car.bodyVariant,
      visuals: this.config.visuals,
      upgrades: this.config.upgrades,
      wheelAngle: this.wheelAngle,
      pitchDeg: this.pitchDeg,
      squatPx: this.squatPx,
      exhaustFlame: this.exhaustFlame,
      nitrousFlame: this.nitrousTimer > 0 ? 1 : 0,
      chuteOpen: this.chuteOpen,
    });

    // 5. Pooled Particles (smoke, sparks, nitrous)
    for (const p of this.particles) {
      if (!p.active) continue;
      const alpha = Math.max(0, Math.min(1, p.life / p.maxLife));
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
    }
    ctx.globalAlpha = 1;

    // 6. On-Canvas crisp arcade shift/launch callout flash
    if (this.calloutTimer > 0 && this.calloutText) {
      const rise = (1.15 - this.calloutTimer) * 24;
      ctx.font = 'bold 15px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#09070f';
      ctx.fillText(this.calloutText, LOGICAL_W / 2 + 1.5, 108 - rise + 1.5);
      ctx.fillStyle = this.calloutColor;
      ctx.fillText(this.calloutText, LOGICAL_W / 2, 108 - rise);
    }

    ctx.restore();
  }
}
