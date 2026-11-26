import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  TimeOfDay,
} from '../types/game';
import { AnalogPixelTach } from './AnalogPixelTach';
import { PixelIcon, PixelRivalPortrait } from './PixelSpritesUI';

interface RaceViewProps {
  save: PlayerSave;
  tierId: TierId;
  timeOfDay: TimeOfDay;
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
  timeOfDay,
  distanceId,
  rival,
  muted,
  onToggleMute,
  onRaceFinished,
  onExitToGarage,
  onNextRival,
  nextRival,
}) => {
  const viewportRef = useRef<HTMLDivElement | null>(null);
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

  // Mount isolated Hi-Bit 16-Bit Pixel Art Race Simulation
  useEffect(() => {
    const container = viewportRef.current;
    if (!container) return;

    setResult(null);
    setPaused(false);

    const sim = new RaceSimulation(
      container,
      save.activeCarId,
      carConfig,
      tierId,
      timeOfDay,
      activeDistance,
      rival,
      {
        onTelemetry: (t) => setHud(t),
        onFinish: (rawResult) => {
          const enriched = onRaceFinishedRef.current(rawResult);
          setResult(enriched);
        },
      }
    );
    simRef.current = sim;
    sim.start();

    return () => {
      sim.destroy();
      simRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [save.activeCarId, tierId, timeOfDay, activeDistance, rival?.id]);

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
      } else if (
        e.code === 'ShiftLeft' ||
        e.code === 'ShiftRight' ||
        e.code === 'KeyS' ||
        e.code === 'KeyC'
      ) {
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
      } else if (
        e.code === 'ShiftLeft' ||
        e.code === 'ShiftRight' ||
        e.code === 'KeyS' ||
        e.code === 'KeyC'
      ) {
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

  const isStagingPhase =
    hud.phase === 'STAGING' ||
    hud.phase === 'COUNTDOWN' ||
    (hud.phase === 'RACING' && hud.gear === 0);
  const stripFt = hud.distanceFt || distSpec.feet;
  const playerPct = Math.min(100, (hud.playerDistFt / stripFt) * 100);
  const rivalPct = Math.min(100, (hud.rivalDistFt / stripFt) * 100);

  return (
    <div className="relative w-full h-[100dvh] overflow-hidden bg-[#111623] flex flex-col select-none">
      {/* Full-Viewport Hi-Bit 16-Bit Pixel Art Drag Strip */}
      <div className="relative flex-1 min-h-0 w-full overflow-hidden">
        <div ref={viewportRef} className="w-full h-full" />

        {/* TOP CLEAN MODERN PIXEL HUD OVERLAY */}
        <div className="pointer-events-none absolute top-0 left-0 right-0 z-10 px-2 sm:px-4 pt-2 sm:pt-3 flex flex-col gap-1.5">
          <div className="flex items-start justify-between gap-2 sm:gap-4">
            {/* Left: Event Box */}
            <div className="pixel-panel px-2.5 sm:px-3.5 py-1.5 sm:py-2 min-w-0 max-w-[54%] sm:max-w-none flex items-center gap-2.5">
              {rival && (
                <PixelRivalPortrait rival={rival} className="hidden sm:block w-9 h-9" />
              )}
              <div className="min-w-0">
                <div className="font-pixel text-[8px] sm:text-[10px] text-[#f5b82e] pixel-text-shadow leading-tight truncate">
                  {tierSpec.className} · {distSpec.shortLabel}
                </div>
                <div className="text-[11px] sm:text-xs font-bold text-[#f8fafc] mt-0.5 truncate">
                  {rival ? `VS ${rival.name.toUpperCase()}` : `${distSpec.label} SOLO TEST`}
                </div>
              </div>
            </div>

            {/* Center: Strip Progress Rail & Live ET Timer (Desktop) */}
            <div className="hidden md:flex flex-col items-center pixel-panel px-4 py-2 min-w-[320px]">
              <div className="w-full flex items-center justify-between text-[11px] font-mono-num text-[#cbd5e1] mb-1.5">
                <span className="font-pixel text-[8px] text-[#94a3b8]">START</span>
                <span className="font-pixel text-xs text-[#f5b82e]">
                  {hud.elapsedSec.toFixed(3)}s
                </span>
                <span className="font-pixel text-[8px] text-[#38bdf8]">{distSpec.shortLabel}</span>
              </div>
              <div className="relative w-full h-3.5 pixel-inset overflow-hidden">
                {rival && (
                  <div
                    className="absolute top-0.5 h-1 w-3 bg-[#94a3b8]"
                    style={{ left: `calc(${rivalPct}% - 6px)` }}
                  />
                )}
                <div
                  className="absolute bottom-0.5 h-1.5 w-3.5 bg-[#ff4d3d]"
                  style={{ left: `calc(${playerPct}% - 7px)` }}
                />
              </div>
            </div>

            {/* Right: Live ET (mobile) + Audio & Pause Switches */}
            <div className="pointer-events-auto flex items-center gap-1.5 shrink-0">
              <div className="md:hidden pixel-panel px-2.5 py-2 font-mono-num text-xs font-bold text-[#f5b82e]">
                {hud.elapsedSec.toFixed(2)}s
              </div>
              <button
                type="button"
                onClick={onToggleMute}
                aria-label={muted ? 'Unmute audio' : 'Mute audio'}
                className="pixel-btn h-10 w-10 flex items-center justify-center bg-[#192033] hover:bg-[#232d47] border-[3px] border-[#3c4d73] cursor-pointer"
              >
                <PixelIcon name={muted ? 'soundOff' : 'soundOn'} className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={togglePause}
                aria-label="Pause race"
                className="pixel-btn h-10 w-10 flex items-center justify-center bg-[#192033] hover:bg-[#232d47] border-[3px] border-[#3c4d73] text-[#f8fafc] cursor-pointer"
              >
                <PixelIcon name="pause" className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Mobile Compact Strip Progress Rail */}
          <div className="md:hidden flex items-center gap-2 pixel-panel px-2.5 py-1 font-mono-num text-[10px] text-[#cbd5e1]">
            <span className="shrink-0 font-pixel text-[8px] text-[#f5b82e]">GO</span>
            <div className="relative flex-1 h-2.5 pixel-inset overflow-hidden">
              {rival && (
                <div
                  className="absolute top-0.5 h-1 w-2.5 bg-[#94a3b8]"
                  style={{ left: `calc(${rivalPct}% - 5px)` }}
                />
              )}
              <div
                className="absolute bottom-0.5 h-1 w-3 bg-[#ff4d3d]"
                style={{ left: `calc(${playerPct}% - 6px)` }}
              />
            </div>
            <span className="shrink-0 font-pixel text-[8px] text-[#38bdf8]">{distSpec.shortLabel}</span>
          </div>
        </div>

        {/* Floating Shift / Launch Callout Banner */}
        {hud.calloutText && !result && (
          <div className="pointer-events-none absolute top-[24%] left-1/2 -translate-x-1/2 z-10 text-center">
            <div
              className="font-pixel text-sm sm:text-lg tracking-wider px-3.5 py-1.5 bg-[#111623] border-[3px] border-[#3c4d73] shadow-[2px_2px_0_#070a12]"
              style={{ color: hud.calloutColor }}
            >
              {hud.calloutText}
            </div>
          </div>
        )}

        {/* Staging Instruction Banner */}
        {isStagingPhase && !hud.foul && (
          <div className="pointer-events-none absolute top-[92px] md:top-[78px] left-1/2 -translate-x-1/2 z-10 max-w-[94%] pixel-panel-accent px-3 sm:px-4 py-1.5 text-center">
            <p className="font-mono-num text-[10px] sm:text-xs text-[#fef08a] font-bold tracking-wide">
              <span className="sm:hidden">
                {hud.treeStep < 5
                  ? 'HOLD CLUTCH + GAS INTO GREEN · RELEASE ON GO!'
                  : 'GO! RELEASE CLUTCH & HOLD GAS!'}
              </span>
              <span className="hidden sm:inline whitespace-nowrap">
                {hud.treeStep < 5
                  ? 'HOLD CLUTCH (SHIFT) + REV INTO GREEN ARC · RELEASE CLUTCH ON GREEN!'
                  : 'GO! RELEASE CLUTCH & FLOOR THROTTLE!'}
              </span>
            </p>
          </div>
        )}
      </div>

      {/* BOTTOM CLEAN PIXEL COCKPIT DECK */}
      <div className="shrink-0 w-full bg-[#192033] border-t-[3px] border-[#3c4d73] px-2 sm:px-4 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] z-20">
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-2 sm:gap-3">
          {/* Pixel Font Tachometer + Shift Light + Gear/MPH */}
          <AnalogPixelTach
            rpm={hud.rpm}
            redlineRpm={hud.redlineRpm}
            launchMinRpm={hud.launchMinRpm}
            launchMaxRpm={hud.launchMaxRpm}
            shiftMinRpm={hud.shiftMinRpm}
            shiftMaxRpm={hud.shiftMaxRpm}
            gear={hud.gear}
            maxGears={hud.maxGears}
            mph={hud.playerMph}
            isStaging={isStagingPhase}
            boostActive={hud.boostTimer > 0}
            wheelspin={hud.wheelspin}
          />

          {/* Tactile Multi-Touch Pedals */}
          <div
            className={`grid ${
              hud.nitrousMax > 0 ? 'grid-cols-4' : 'grid-cols-3'
            } lg:flex items-center gap-1.5 sm:gap-2 shrink-0 touch-none`}
          >
            <button
              type="button"
              onContextMenu={(e) => e.preventDefault()}
              onPointerDown={(e) => {
                e.preventDefault();
                e.currentTarget.setPointerCapture(e.pointerId);
                simRef.current?.setClutch(true);
              }}
              onPointerUp={(e) => {
                if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                  e.currentTarget.releasePointerCapture(e.pointerId);
                }
                simRef.current?.setClutch(false);
              }}
              onPointerCancel={() => simRef.current?.setClutch(false)}
              className={`pixel-btn touch-none select-none min-h-[50px] lg:h-14 px-2 sm:px-4 border-[3px] font-pixel text-[9px] sm:text-[10px] whitespace-nowrap cursor-pointer ${
                hud.clutch
                  ? 'bg-[#f5b82e] border-[#fef08a] text-[#0e1320]'
                  : 'bg-[#222c45] border-[#495f8f] text-[#f8fafc] hover:bg-[#2a3654]'
              }`}
            >
              CLUTCH
              <span className="hidden lg:block font-mono-num text-[10px] opacity-75 mt-1">[SHIFT]</span>
            </button>

            <button
              type="button"
              onContextMenu={(e) => e.preventDefault()}
              onPointerDown={(e) => {
                e.preventDefault();
                e.currentTarget.setPointerCapture(e.pointerId);
                simRef.current?.setThrottle(true);
              }}
              onPointerUp={(e) => {
                if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                  e.currentTarget.releasePointerCapture(e.pointerId);
                }
                simRef.current?.setThrottle(false);
              }}
              onPointerCancel={() => simRef.current?.setThrottle(false)}
              className={`pixel-btn touch-none select-none min-h-[50px] lg:h-14 px-2 sm:px-5 border-[3px] font-pixel text-[9px] sm:text-[10px] whitespace-nowrap cursor-pointer ${
                hud.throttle
                  ? 'bg-[#22c55e] border-[#bbf7d0] text-[#0e1320]'
                  : 'bg-[#173329] border-[#22c55e] text-[#bbf7d0] hover:bg-[#1e4235]'
              }`}
            >
              GAS
              <span className="hidden lg:block font-mono-num text-[10px] opacity-75 mt-1">[W]</span>
            </button>

            <button
              type="button"
              onContextMenu={(e) => e.preventDefault()}
              onPointerDown={(e) => {
                e.preventDefault();
                simRef.current?.triggerShiftUp();
              }}
              className={`pixel-btn touch-none select-none min-h-[50px] lg:h-14 px-2 sm:px-5 border-[3px] font-pixel text-[9px] sm:text-[10px] whitespace-nowrap cursor-pointer ${
                hud.inShiftZone
                  ? 'bg-[#f5b82e] border-[#fef08a] text-[#0e1320]'
                  : 'bg-[#ff4d3d] border-[#fca5a5] text-[#ffffff] hover:bg-[#ff6254]'
              }`}
            >
              SHIFT+
              <span className="hidden lg:block font-mono-num text-[10px] opacity-80 mt-1">[SPACE]</span>
            </button>

            {hud.nitrousMax > 0 && (
              <button
                type="button"
                disabled={hud.nitrousLeft <= 0 || hud.nitrousActive}
                onContextMenu={(e) => e.preventDefault()}
                onPointerDown={(e) => {
                  e.preventDefault();
                  simRef.current?.triggerNitrous();
                }}
                className={`pixel-btn touch-none select-none min-h-[50px] lg:h-14 px-2 sm:px-3.5 border-[3px] font-pixel text-[9px] sm:text-[10px] whitespace-nowrap cursor-pointer ${
                  hud.nitrousActive
                    ? 'bg-[#38bdf8] border-[#bae6fd] text-[#0e1320]'
                    : hud.nitrousLeft > 0
                    ? 'bg-[#0369a1] border-[#38bdf8] text-[#e0f2fe] hover:bg-[#0284c7]'
                    : 'bg-[#141a2b] border-[#2a3552] text-[#64748b] cursor-not-allowed'
                }`}
              >
                NOS ({hud.nitrousLeft})
                <span className="hidden lg:block font-mono-num text-[10px] opacity-75 mt-1">[N]</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* CLEAN PIXEL PAUSE MODAL */}
      {paused && !result && (
        <div className="absolute inset-0 z-30 bg-[#0b0f1a]/82 flex items-center justify-center p-4">
          <div className="pixel-panel-accent max-w-sm w-full p-6 text-center space-y-5">
            <h2 className="font-pixel text-lg text-[#f5b82e] pixel-text-shadow">PAUSED</h2>
            <p className="text-sm text-[#cbd5e1] font-semibold">
              {car.name} · {tierSpec.venueName}
            </p>
            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={togglePause}
                className="pixel-btn w-full py-3 bg-[#22c55e] hover:bg-[#16a34a] text-[#0e1320] border-[3px] border-[#bbf7d0] font-pixel text-[11px] flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
              >
                <PixelIcon name="play" className="w-4 h-4" /> Resume Race
              </button>
              <button
                type="button"
                onClick={handleRestart}
                className="pixel-btn w-full py-3 bg-[#222c45] hover:bg-[#2a3654] border-[3px] border-[#495f8f] text-[#f8fafc] font-bold text-sm flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
              >
                <PixelIcon name="restart" className="w-4 h-4" /> Restart Run
              </button>
              <button
                type="button"
                onClick={onExitToGarage}
                className="pixel-btn w-full py-3 bg-[#141b2d] hover:bg-[#1e2842] border-[3px] border-[#3c4d73] text-[#cbd5e1] font-bold text-sm whitespace-nowrap cursor-pointer"
              >
                Return to Garage
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REACTION-TIME & ET OFFICIAL TIME SLIP RESULTS MODAL */}
      {result && (
        <div className="absolute inset-0 z-30 bg-[#0b0f1a]/84 flex items-center justify-center p-3 sm:p-4">
          <div className="pixel-panel-accent max-w-xl w-full max-h-[92dvh] overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b-2 border-[#3c4d73] pb-4">
              <div className="flex items-center gap-3 min-w-0">
                {result.rival && (
                  <PixelRivalPortrait rival={result.rival} className="w-12 h-12" />
                )}
                <div className="min-w-0">
                  <div
                    className={`font-pixel text-base sm:text-lg pixel-text-shadow ${
                      result.foul
                        ? 'text-[#ff4d3d]'
                        : result.won
                        ? 'text-[#22c55e]'
                        : 'text-[#f97316]'
                    }`}
                  >
                    {result.foul
                      ? 'RED LIGHT FOUL'
                      : result.isTimeTrial
                      ? 'TIME SLIP LOGGED'
                      : result.won
                      ? 'VICTORY!'
                      : 'DEFEATED'}
                  </div>
                  <p className="text-xs text-[#94a3b8] mt-1.5">
                    {tierSpec.name} · {distSpec.label} · {tierSpec.venueName}
                  </p>
                </div>
              </div>
              {result.isNewPersonalBest && !result.foul && (
                <div className="text-right shrink-0">
                  <div className="font-pixel text-[10px] text-[#f5b82e]">
                    NEW RECORD
                  </div>
                  <div className="text-xs text-[#cbd5e1] mt-0.5">Personal Best</div>
                </div>
              )}
            </div>

            {/* Reaction-Time & ET Comparison Table */}
            <div className="pixel-inset p-4 font-mono-num text-sm space-y-2">
              <div className="grid grid-cols-3 text-xs text-[#94a3b8] pb-1.5 border-b border-[#2c3a59]">
                <span>METRIC</span>
                <span className="text-right text-[#f8fafc]">YOU ({car.name})</span>
                <span className="text-right">
                  {result.rival ? result.rival.name.split(' ')[0].toUpperCase() : 'TARGET'}
                </span>
              </div>
              <div className="grid grid-cols-3 items-center">
                <span className="text-xs text-[#94a3b8]">{distSpec.shortLabel} ET</span>
                <span className="text-right font-bold text-[#f5b82e]">
                  {result.foul ? 'FOUL' : formatEt(result.playerEtMs)}
                </span>
                <span className="text-right text-[#cbd5e1]">
                  {result.rival ? formatEt(result.rivalEtMs) : '—'}
                </span>
              </div>
              <div className="grid grid-cols-3 items-center">
                <span className="text-xs text-[#94a3b8]">TRAP SPEED</span>
                <span className="text-right font-semibold text-[#f8fafc]">
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
                <div className="grid grid-cols-3 items-center pt-1 border-t border-[#2c3a59] text-xs">
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
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono-num pixel-inset px-4 py-3">
              {result.isTimeTrial ? (
                <>
                  <div className="text-[#94a3b8]">
                    Solo Test Session · No Cash Payout ·{' '}
                    <span className="text-[#cbd5e1]">
                      {result.foul ? 'Foul Run' : 'Time & Replay Saved to Local Records'}
                    </span>
                  </div>
                  <div className="text-base font-bold text-[#94a3b8]">$0</div>
                </>
              ) : (
                <>
                  <div className="text-[#cbd5e1] space-x-3">
                    <span>
                      Purse {formatCash(result.basePurse)}
                      {result.isRematch ? ' (Rematch)' : ''}
                    </span>
                    {result.launchBonusCash > 0 && (
                      <span className="text-[#22c55e]">· Launch +{formatCash(result.launchBonusCash)}</span>
                    )}
                    {result.shiftBonusCash > 0 && (
                      <span className="text-[#f5b82e]">· Shifts +{formatCash(result.shiftBonusCash)}</span>
                    )}
                    {result.recordBonusCash > 0 && (
                      <span className="text-[#38bdf8]">· Record +{formatCash(result.recordBonusCash)}</span>
                    )}
                  </div>
                  <div className="text-base font-bold text-[#22c55e] flex items-center gap-1.5">
                    <PixelIcon name="coin" className="w-4 h-4" />
                    <span>+{formatCash(result.totalCashEarned)}</span>
                  </div>
                </>
              )}
            </div>

            {result.unlockedNextTier && (
              <div className="bg-[#152e22] border-[3px] border-[#22c55e] shadow-[2px_2px_0_#070a12] px-4 py-2.5 text-xs font-bold text-[#bbf7d0]">
                Tier Boss defeated! Next racing class &amp; new dealership chassis unlocked.
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={onExitToGarage}
                className="pixel-btn px-4 py-2.5 bg-[#1b243b] hover:bg-[#253152] border-[3px] border-[#3c4d73] text-[#f8fafc] font-bold text-sm whitespace-nowrap cursor-pointer"
              >
                Garage &amp; Shop
              </button>
              <button
                type="button"
                onClick={handleRestart}
                className="pixel-btn px-4 py-2.5 bg-[#263457] hover:bg-[#314370] border-[3px] border-[#52699e] text-[#f8fafc] font-bold text-sm whitespace-nowrap cursor-pointer"
              >
                Race Again
              </button>
              {result.won && nextRival && onNextRival && (
                <button
                  type="button"
                  onClick={() => onNextRival(nextRival)}
                  className="pixel-btn px-5 py-2.5 bg-[#ff4d3d] hover:bg-[#ff6254] border-[3px] border-[#f5b82e] text-[#ffffff] font-pixel text-[10px] whitespace-nowrap cursor-pointer"
                >
                  NEXT RIVAL
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
