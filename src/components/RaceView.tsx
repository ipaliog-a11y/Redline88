import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import {
  formatCash,
  formatEt,
  getCarById,
  getCarConfig,
  getStripDistanceSpec,
  getTierById,
  QUARTER_MILE_FT,
} from '../data/gameData';
import { RaceSimulation } from '../engine/raceSimulation';
import {
  PlayerSave,
  RaceResult,
  RaceTelemetry,
  RivalSpec,
  StripDistanceId,
  TierId,
} from '../types/game';

interface RaceViewProps {
  save: PlayerSave;
  tierId: TierId;
  distanceId: StripDistanceId;
  rival: RivalSpec | null;
  muted: boolean;
  onToggleMute: () => void;
  onRaceFinished: (result: RaceResult) => RaceResult;
  onExitToGarage: () => void;
  onNextRival?: (nextRival: RivalSpec) => void;
  nextRival?: RivalSpec | null;
}

const INITIAL_TELEMETRY: RaceTelemetry = {
  phase: 'STAGING',
  distance: 'quarter',
  distanceFt: QUARTER_MILE_FT,
  treeStep: 0,
  elapsedSec: 0,
  playerDistFt: 0,
  rivalDistFt: 0,
  playerMph: 0,
  rivalMph: 0,
  rpm: 1100,
  redlineRpm: 7600,
  launchMinRpm: 3600,
  launchMaxRpm: 4700,
  shiftMinRpm: 6600,
  shiftMaxRpm: 7350,
  gear: 0,
  maxGears: 5,
  throttle: false,
  clutch: false,
  boostTimer: 0,
  nitrousLeft: 0,
  nitrousMax: 0,
  nitrousActive: false,
  wheelspin: 0,
  inLaunchZone: false,
  inShiftZone: false,
  calloutText: '',
  calloutTimer: 0,
  calloutColor: '#22c55e',
  foul: false,
};

export const RaceView: React.FC<RaceViewProps> = ({
  save,
  tierId,
  distanceId,
  rival,
  muted,
  onToggleMute,
  onRaceFinished,
  onExitToGarage,
  onNextRival,
  nextRival,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const simRef = useRef<RaceSimulation | null>(null);
  const [hud, setHud] = useState<RaceTelemetry>(INITIAL_TELEMETRY);
  const [paused, setPaused] = useState(false);
  const [result, setResult] = useState<RaceResult | null>(null);

  const onRaceFinishedRef = useRef(onRaceFinished);
  onRaceFinishedRef.current = onRaceFinished;

  const car = getCarById(save.activeCarId);
  const carConfig = getCarConfig(save, save.activeCarId);
  const tierSpec = getTierById(tierId);
  const activeDistance: StripDistanceId = rival ? rival.distance : distanceId;
  const distSpec = getStripDistanceSpec(activeDistance);

  // Mount isolated 60fps simulation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setResult(null);
    setPaused(false);

    const sim = new RaceSimulation(canvas, save.activeCarId, carConfig, tierId, activeDistance, rival, {
      onTelemetry: (t) => setHud(t),
      onFinish: (rawResult) => {
        const enriched = onRaceFinishedRef.current(rawResult);
        setResult(enriched);
      },
    });
    simRef.current = sim;
    sim.start();

    return () => {
      sim.destroy();
      simRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [save.activeCarId, tierId, activeDistance, rival?.id]);

  const handleRestart = useCallback(() => {
    setResult(null);
    setPaused(false);
    simRef.current?.setPaused(false);
    simRef.current?.reset();
  }, []);

  const togglePause = useCallback(() => {
    if (result) return;
    setPaused((prev) => {
      const next = !prev;
      simRef.current?.setPaused(next);
      return next;
    });
  }, [result]);

  // Keyboard controls (continuous held vs edge-triggered + window blur reset)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        e.preventDefault();
        togglePause();
        return;
      }
      if (paused || result) {
        if (result && (e.code === 'KeyR' || e.code === 'Enter')) {
          e.preventDefault();
          handleRestart();
        }
        return;
      }

      const sim = simRef.current;
      if (!sim) return;

      if (e.code === 'KeyW' || e.code === 'ArrowUp' || e.code === 'KeyD') {
        e.preventDefault();
        sim.setThrottle(true);
      } else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyS' || e.code === 'KeyC') {
        e.preventDefault();
        sim.setClutch(true);
      } else if (e.code === 'Space' || e.code === 'KeyE' || e.code === 'ArrowRight') {
        e.preventDefault();
        if (!e.repeat) sim.triggerShiftUp();
      } else if (e.code === 'KeyQ' || e.code === 'ArrowLeft') {
        e.preventDefault();
        if (!e.repeat) sim.triggerShiftDown();
      } else if (e.code === 'KeyN' || e.code === 'KeyF') {
        e.preventDefault();
        if (!e.repeat) sim.triggerNitrous();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const sim = simRef.current;
      if (!sim) return;
      if (e.code === 'KeyW' || e.code === 'ArrowUp' || e.code === 'KeyD') {
        sim.setThrottle(false);
      } else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyS' || e.code === 'KeyC') {
        sim.setClutch(false);
      }
    };

    const onBlur = () => {
      simRef.current?.clearInputs();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [paused, result, togglePause, handleRestart]);

  // Tachometer calculations
  const rpmPct = Math.max(0, Math.min(100, (hud.rpm / (hud.redlineRpm * 1.04)) * 100));
  const launchStartPct = (hud.launchMinRpm / (hud.redlineRpm * 1.04)) * 100;
  const launchWidthPct = ((hud.launchMaxRpm - hud.launchMinRpm) / (hud.redlineRpm * 1.04)) * 100;
  const shiftStartPct = (hud.shiftMinRpm / (hud.redlineRpm * 1.04)) * 100;
  const shiftWidthPct = ((hud.shiftMaxRpm - hud.shiftMinRpm) / (hud.redlineRpm * 1.04)) * 100;

  const isStagingPhase = hud.phase === 'STAGING' || hud.phase === 'COUNTDOWN' || (hud.phase === 'RACING' && hud.gear === 0);
  const stripFt = hud.distanceFt || distSpec.feet;
  const playerPct = Math.min(100, (hud.playerDistFt / stripFt) * 100);
  const rivalPct = Math.min(100, (hud.rivalDistFt / stripFt) * 100);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#0d0b14] flex flex-col">
      {/* Isolated Full-Viewport Pixel Canvas */}
      <div className="relative flex-1 w-full h-full overflow-hidden">
        <canvas
          ref={canvasRef}
          className="pixel-canvas w-full h-full object-cover block"
        />

        {/* TOP SLIM HUD OVERLAY (pointer-events-none wrapper) */}
        <div className="pointer-events-none absolute top-0 left-0 right-0 z-10 px-4 py-3 flex items-start justify-between gap-4">
          {/* Left: Event Info */}
          <div className="bg-[#0d0b14]/85 border-2 border-[#352d4d] px-3.5 py-2 flex items-center gap-3">
            <div>
              <div className="font-pixel text-[10px] text-[#f5b82e] leading-tight">
                {tierSpec.className} · {distSpec.shortLabel}
              </div>
              <div className="text-xs font-semibold text-[#f4f1e6] mt-0.5 whitespace-nowrap">
                {rival ? `vs ${rival.name}` : `${distSpec.label} Time Trial`}
              </div>
            </div>
          </div>

          {/* Center: Dynamic Strip Progress Track & Live ET Timer */}
          <div className="hidden md:flex flex-col items-center bg-[#0d0b14]/85 border-2 border-[#352d4d] px-4 py-2 min-w-[320px]">
            <div className="w-full flex items-center justify-between text-[11px] font-mono-num text-[#cbd5e1] mb-1.5">
              <span>START</span>
              <span className="text-sm font-bold text-[#f4f1e6]">
                {hud.elapsedSec.toFixed(3)}s
              </span>
              <span>{distSpec.shortLabel}</span>
            </div>
            <div className="relative w-full h-3 bg-[#1d1830] border border-[#3a3154]">
              {/* Rival dot */}
              {rival && (
                <div
                  className="absolute top-0.5 h-1 w-2.5 bg-[#94a3b8]"
                  style={{ left: `calc(${rivalPct}% - 5px)` }}
                />
              )}
              {/* Player marker */}
              <div
                className="absolute bottom-0.5 h-1.5 w-3 bg-[#ff4d2e]"
                style={{ left: `calc(${playerPct}% - 6px)` }}
              />
            </div>
          </div>

          {/* Right: Live ET (mobile) + Audio & Pause controls */}
          <div className="pointer-events-auto flex items-center gap-2">
            <div className="md:hidden bg-[#0d0b14]/85 border-2 border-[#352d4d] px-2.5 py-2 font-mono-num text-xs font-bold">
              {hud.elapsedSec.toFixed(3)}s
            </div>
            <button
              type="button"
              onClick={onToggleMute}
              aria-label={muted ? 'Unmute audio' : 'Mute audio'}
              className="arcade-btn h-10 w-10 flex items-center justify-center bg-[#0d0b14]/85 border-2 border-[#352d4d] text-[#f4f1e6] hover:border-[#f5b82e]"
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={togglePause}
              aria-label="Pause race"
              className="arcade-btn h-10 w-10 flex items-center justify-center bg-[#0d0b14]/85 border-2 border-[#352d4d] text-[#f4f1e6] hover:border-[#f5b82e]"
            >
              <Pause className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Subtle Staging Hint Banner (only before launch) */}
        {isStagingPhase && !hud.foul && (
          <div className="pointer-events-none absolute top-16 left-1/2 -translate-x-1/2 z-10 bg-[#0d0b14]/88 border-2 border-[#f5b82e] px-4 py-1.5 text-center">
            <p className="font-mono-num text-xs text-[#fef08a] font-bold tracking-wide whitespace-nowrap">
              {hud.treeStep < 5
                ? 'HOLD CLUTCH (SHIFT) + REV INTO GREEN ZONE · RELEASE CLUTCH ON GREEN!'
                : 'GO! RELEASE CLUTCH & FLOOR THROTTLE!'}
            </p>
          </div>
        )}
      </div>

      {/* BOTTOM COMPACT COCKPIT BAR (keeps >= 85% of drag strip unobstructed) */}
      <div className="w-full bg-[#120f1c] border-t-2 border-[#352d4d] px-4 py-2.5 z-20">
        <div className="max-w-6xl mx-auto flex flex-wrap lg:flex-nowrap items-center justify-between gap-3">
          {/* Left: Gear + Speed Digital Readout */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="bg-[#09070f] border-2 border-[#352d4d] px-3 py-1.5 text-center min-w-[64px]">
              <div className="text-[10px] text-[#94a3b8] font-semibold tracking-wider">GEAR</div>
              <div className={`font-pixel text-xl leading-none mt-1 ${hud.inShiftZone ? 'text-[#22c55e]' : 'text-[#f5b82e]'}`}>
                {hud.gear === 0 ? 'N' : hud.gear}
              </div>
            </div>
            <div className="bg-[#09070f] border-2 border-[#352d4d] px-3 py-1.5 text-right min-w-[92px]">
              <div className="text-[10px] text-[#94a3b8] font-semibold tracking-wider">SPEED</div>
              <div className="font-mono-num text-xl font-bold text-[#f4f1e6] leading-none mt-1">
                {hud.playerMph} <span className="text-xs text-[#94a3b8]">MPH</span>
              </div>
            </div>
          </div>

          {/* Center: Retro Pixel Tachometer with Launch & Shift Sweet Spots */}
          <div className="flex-1 min-w-[240px]">
            <div className="flex items-center justify-between text-xs font-mono-num mb-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#f4f1e6]">{hud.rpm} RPM</span>
                <span className="text-[#94a3b8]">/</span>
                <span className="text-[#94a3b8]">{hud.redlineRpm} MAX</span>
              </div>
              <div className="flex items-center gap-2">
                {hud.inLaunchZone && isStagingPhase && (
                  <span className="font-bold text-[#22c55e]">LAUNCH ZONE READY</span>
                )}
                {hud.inShiftZone && (
                  <span className="font-bold text-[#facc15]">SHIFT NOW! [SPACE]</span>
                )}
                {!hud.inShiftZone && !isStagingPhase && hud.boostTimer > 0 && (
                  <span className="font-bold text-[#38bdf8]">BOOST SURGE</span>
                )}
                {!hud.inShiftZone && !isStagingPhase && hud.wheelspin > 0.2 && (
                  <span className="font-bold text-[#f97316]">WHEELSPIN</span>
                )}
              </div>
            </div>

            {/* Segmented Tach Bar */}
            <div className="relative h-6 bg-[#09070f] border-2 border-[#352d4d] overflow-hidden">
              {/* Launch RPM Sweet Spot highlight (visible while staging) */}
              {isStagingPhase && (
                <div
                  className="absolute top-0 bottom-0 bg-[#22c55e]/30 border-x-2 border-[#22c55e]"
                  style={{ left: `${launchStartPct}%`, width: `${launchWidthPct}%` }}
                />
              )}
              {/* Perfect Shift Sweet Spot highlight (visible while racing) */}
              {!isStagingPhase && hud.gear < hud.maxGears && (
                <div
                  className="absolute top-0 bottom-0 bg-[#facc15]/30 border-x-2 border-[#facc15]"
                  style={{ left: `${shiftStartPct}%`, width: `${shiftWidthPct}%` }}
                />
              )}
              {/* Redline warning zone */}
              <div
                className="absolute top-0 bottom-0 right-0 bg-[#ef4444]/25 border-l border-[#ef4444]"
                style={{ width: '6%' }}
              />
              {/* Active RPM fill */}
              <div
                className={`h-full transition-none ${
                  hud.rpm >= hud.redlineRpm
                    ? 'bg-[#ef4444]'
                    : hud.inShiftZone
                    ? 'bg-[#facc15]'
                    : hud.inLaunchZone && isStagingPhase
                    ? 'bg-[#22c55e]'
                    : 'bg-[#ff4d2e]'
                }`}
                style={{ width: `${rpmPct}%` }}
              />
              {/* Pixel tick divisions */}
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(90deg, transparent 0px, transparent 14px, rgba(9,7,15,0.65) 14px, rgba(9,7,15,0.65) 16px)',
                }}
              />
            </div>
          </div>

          {/* Right: Tactile Interactive Arcade Pedals & Shifter (Mouse/Touch + Key Mirror) */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onPointerDown={() => simRef.current?.setClutch(true)}
              onPointerUp={() => simRef.current?.setClutch(false)}
              onPointerLeave={() => simRef.current?.setClutch(false)}
              className={`arcade-btn h-11 px-3.5 border-2 font-bold text-xs whitespace-nowrap cursor-pointer ${
                hud.clutch
                  ? 'bg-[#eab308] text-[#09070f] border-[#fef08a]'
                  : 'bg-[#1c172e] text-[#f4f1e6] border-[#433863] hover:border-[#eab308]'
              }`}
            >
              CLUTCH <span className="opacity-70 font-mono-num">[SHIFT]</span>
            </button>

            <button
              type="button"
              onPointerDown={() => simRef.current?.setThrottle(true)}
              onPointerUp={() => simRef.current?.setThrottle(false)}
              onPointerLeave={() => simRef.current?.setThrottle(false)}
              className={`arcade-btn h-11 px-4 border-2 font-bold text-xs whitespace-nowrap cursor-pointer ${
                hud.throttle
                  ? 'bg-[#22c55e] text-[#09070f] border-[#bbf7d0]'
                  : 'bg-[#1c172e] text-[#f4f1e6] border-[#433863] hover:border-[#22c55e]'
              }`}
            >
              GAS <span className="opacity-70 font-mono-num">[W]</span>
            </button>

            <button
              type="button"
              onPointerDown={() => simRef.current?.triggerShiftUp()}
              className={`arcade-btn h-11 px-4 border-2 font-bold text-xs whitespace-nowrap cursor-pointer ${
                hud.inShiftZone
                  ? 'bg-[#facc15] text-[#09070f] border-[#ffffff]'
                  : 'bg-[#ff4d2e] text-white border-[#fca5a5] hover:bg-[#ff6247]'
              }`}
            >
              SHIFT+ <span className="opacity-80 font-mono-num">[SPACE]</span>
            </button>

            {hud.nitrousMax > 0 && (
              <button
                type="button"
                disabled={hud.nitrousLeft <= 0 || hud.nitrousActive}
                onPointerDown={() => simRef.current?.triggerNitrous()}
                className={`arcade-btn h-11 px-3 border-2 font-bold text-xs whitespace-nowrap cursor-pointer ${
                  hud.nitrousActive
                    ? 'bg-[#38bdf8] text-[#09070f] border-[#e0f2fe]'
                    : hud.nitrousLeft > 0
                    ? 'bg-[#0c4a6e] text-[#e0f2fe] border-[#38bdf8] hover:bg-[#0369a1]'
                    : 'bg-[#181426] text-[#64748b] border-[#2c2542] cursor-not-allowed'
                }`}
              >
                NOS ({hud.nitrousLeft}) <span className="opacity-75 font-mono-num">[N]</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* PAUSE MODAL */}
      {paused && !result && (
        <div className="absolute inset-0 z-30 bg-[#09070f]/80 flex items-center justify-center p-4">
          <div className="arcade-panel max-w-sm w-full p-6 text-center space-y-5">
            <h2 className="font-pixel text-lg text-[#f5b82e]">PAUSED</h2>
            <p className="text-sm text-[#cbd5e1]">
              {car.name} · {tierSpec.venueName}
            </p>
            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={togglePause}
                className="arcade-btn w-full py-3 bg-[#22c55e] hover:bg-[#16a34a] text-[#09070f] font-bold text-sm flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
              >
                <Play className="w-4 h-4" /> Resume Race
              </button>
              <button
                type="button"
                onClick={handleRestart}
                className="arcade-btn w-full py-3 bg-[#1f1a33] hover:bg-[#2a2345] border-2 border-[#3d345c] text-[#f4f1e6] font-semibold text-sm flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" /> Restart Run
              </button>
              <button
                type="button"
                onClick={onExitToGarage}
                className="arcade-btn w-full py-3 bg-[#151221] hover:bg-[#221c36] border-2 border-[#352d4d] text-[#cbd5e1] font-semibold text-sm whitespace-nowrap cursor-pointer"
              >
                Return to Garage
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OFFICIAL DRAG STRIP TIME SLIP RESULTS MODAL */}
      {result && (
        <div className="absolute inset-0 z-30 bg-[#09070f]/82 flex items-center justify-center p-4">
          <div className="arcade-panel max-w-xl w-full p-6 space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-[#352d4d] pb-4">
              <div>
                <div
                  className={`font-pixel text-base sm:text-lg ${
                    result.foul
                      ? 'text-[#ef4444]'
                      : result.won
                      ? 'text-[#22c55e]'
                      : 'text-[#f97316]'
                  }`}
                >
                  {result.foul
                    ? 'RED LIGHT FOUL'
                    : result.isTimeTrial
                    ? 'TIME SLIP RECORDED'
                    : result.won
                    ? 'VICTORY!'
                    : 'DEFEATED'}
                </div>
                <p className="text-xs text-[#94a3b8] mt-1.5">
                  {tierSpec.name} · {distSpec.label} · {tierSpec.venueName}
                </p>
              </div>
              {result.isNewPersonalBest && !result.foul && (
                <div className="text-right">
                  <div className="font-pixel text-[10px] text-[#facc15]">NEW RECORD</div>
                  <div className="text-xs text-[#cbd5e1] mt-0.5">Personal Best</div>
                </div>
              )}
            </div>

            {/* Time Slip Comparison Table */}
            <div className="bg-[#0c0a14] border border-[#2d2645] p-4 font-mono-num text-sm space-y-2">
              <div className="grid grid-cols-3 text-xs text-[#94a3b8] pb-1.5 border-b border-[#251f38]">
                <span>METRIC</span>
                <span className="text-right text-[#f4f1e6]">YOU ({car.name})</span>
                <span className="text-right">
                  {result.rival ? result.rival.name.split(' ')[0].toUpperCase() : 'TARGET'}
                </span>
              </div>
              <div className="grid grid-cols-3 items-center">
                <span className="text-xs text-[#94a3b8]">{distSpec.shortLabel} ET</span>
                <span className="text-right font-bold text-[#facc15]">
                  {result.foul ? 'FOUL' : formatEt(result.playerEtMs)}
                </span>
                <span className="text-right text-[#cbd5e1]">
                  {result.rival ? formatEt(result.rivalEtMs) : '—'}
                </span>
              </div>
              <div className="grid grid-cols-3 items-center">
                <span className="text-xs text-[#94a3b8]">TRAP SPEED</span>
                <span className="text-right font-semibold text-[#f4f1e6]">
                  {result.foul ? '—' : `${result.playerTrapMph.toFixed(1)} MPH`}
                </span>
                <span className="text-right text-[#cbd5e1]">
                  {result.rival ? `${result.rivalTrapMph.toFixed(1)} MPH` : '—'}
                </span>
              </div>
              <div className="grid grid-cols-3 items-center">
                <span className="text-xs text-[#94a3b8]">REACTION</span>
                <span className="text-right text-[#cbd5e1]">
                  {result.foul ? 'EARLY' : `${(result.reactionMs / 1000).toFixed(3)}s`}
                </span>
                <span className="text-right text-[#94a3b8]">
                  {result.rival ? `${result.rival.reactionSec.toFixed(3)}s` : '—'}
                </span>
              </div>
              <div className="grid grid-cols-3 items-center">
                <span className="text-xs text-[#94a3b8]">60-FT / SHIFTS</span>
                <span className="text-right text-[#cbd5e1]">
                  {result.foul ? '—' : `${result.sixtyFtSec.toFixed(2)}s`}
                </span>
                <span className="text-right text-[#22c55e]">
                  {result.perfectShifts} Perfect ({result.perfectClutchShifts} Clutch)
                </span>
              </div>
              {!result.foul && (result.quarterSplitSec || result.halfSplitSec) && (
                <div className="grid grid-cols-3 items-center pt-1 border-t border-[#251f38] text-xs">
                  <span className="text-[#94a3b8]">SPLITS</span>
                  <span className="text-right text-[#cbd5e1]">
                    {result.quarterSplitSec ? `1/4: ${result.quarterSplitSec.toFixed(2)}s` : '—'}
                  </span>
                  <span className="text-right text-[#38bdf8]">
                    {result.halfSplitSec ? `1/2: ${result.halfSplitSec.toFixed(2)}s` : ''}
                  </span>
                </div>
              )}
            </div>

            {/* Payout Breakdown */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono-num bg-[#1a152b] border border-[#352d4d] px-4 py-3">
              <div className="text-[#cbd5e1] space-x-3">
                <span>Purse {formatCash(result.basePurse)}</span>
                {result.launchBonusCash > 0 && (
                  <span className="text-[#22c55e]">· Launch +{formatCash(result.launchBonusCash)}</span>
                )}
                {result.shiftBonusCash > 0 && (
                  <span className="text-[#facc15]">· Shifts +{formatCash(result.shiftBonusCash)}</span>
                )}
                {result.recordBonusCash > 0 && (
                  <span className="text-[#38bdf8]">· Record +{formatCash(result.recordBonusCash)}</span>
                )}
              </div>
              <div className="text-base font-bold text-[#22c55e]">
                +{formatCash(result.totalCashEarned)}
              </div>
            </div>

            {result.unlockedNextTier && (
              <div className="bg-[#1b2e1f] border border-[#22c55e] px-4 py-2.5 text-xs font-semibold text-[#bbf7d0]">
                Tier Boss defeated! Next racing class & new dealership chassis unlocked.
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={onExitToGarage}
                className="arcade-btn px-4 py-2.5 bg-[#1b162b] hover:bg-[#27203d] border-2 border-[#3a3154] text-[#f4f1e6] font-semibold text-sm whitespace-nowrap cursor-pointer"
              >
                Garage & Shop
              </button>
              <button
                type="button"
                onClick={handleRestart}
                className="arcade-btn px-4 py-2.5 bg-[#2a2345] hover:bg-[#372e59] border-2 border-[#50437d] text-[#f4f1e6] font-semibold text-sm whitespace-nowrap cursor-pointer"
              >
                Race Again
              </button>
              {result.won && nextRival && onNextRival && (
                <button
                  type="button"
                  onClick={() => onNextRival(nextRival)}
                  className="arcade-btn px-5 py-2.5 bg-[#ff4d2e] hover:bg-[#ff6247] border-2 border-[#fff3b0] text-white font-bold text-sm whitespace-nowrap cursor-pointer"
                >
                  Next Rival
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
