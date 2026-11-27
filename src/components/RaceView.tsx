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
    <div className="relative w-full h-[100dvh] overflow-hidden bg-[#141218] flex flex-col select-none">
      {/* Full-Viewport Hi-Bit 16-Bit Pixel Art Drag Strip */}
      <div className="relative flex-1 min-h-0 w-full overflow-hidden">
        <div ref={viewportRef} className="w-full h-full" />

        {/* TOP NEO-GEO ARCADE HUD OVERLAY */}
        <div className="pointer-events-none absolute top-0 left-0 right-0 z-10 px-2.5 sm:px-4 pt-2.5 sm:pt-3 flex flex-col gap-1.5">
          <div className="flex items-start justify-between gap-2 sm:gap-4">
            {/* Left: Steel Event Plate */}
            <div className="ng-plate px-2.5 sm:px-3.5 py-1.5 min-w-0 max-w-[54%] sm:max-w-none flex items-center gap-2.5">
              {rival && (
                <PixelRivalPortrait rival={rival} className="hidden sm:block w-10 h-10" />
              )}
              <div className="min-w-0">
                <div className="font-pixel text-[8px] sm:text-[9px] text-[#f7b519] pixel-text-shadow leading-tight truncate">
                  {tierSpec.className} · {distSpec.shortLabel}
                </div>
                <div className="text-[11px] sm:text-xs font-bold text-[#f4ecd8] mt-0.5 truncate uppercase">
                  {rival ? `VS ${rival.name}` : `${distSpec.label} SOLO TEST`}
                </div>
              </div>
            </div>

            {/* Center: Strip Progress Rail & VFD Live ET Timer (Desktop) */}
            <div className="hidden md:flex flex-col items-center ng-plate px-4 py-1.5 min-w-[320px]">
              <div className="w-full flex items-center justify-between text-[11px] font-mono-num text-[#b8c0cc] mb-1">
                <span className="font-pixel text-[8px] text-[#b8c0cc]">START</span>
                <span className="ng-vfd px-2.5 py-0.5 font-pixel text-xs text-[#f7b519]">
                  {hud.elapsedSec.toFixed(3)}s
                </span>
                <span className="font-pixel text-[8px] text-[#19d4e6]">{distSpec.shortLabel}</span>
              </div>
              <div className="relative w-full h-3.5 ng-vfd overflow-hidden">
                {rival && (
                  <div
                    className="absolute top-0.5 h-1 w-3.5 bg-[#b8c0cc]"
                    style={{ left: `calc(${rivalPct}% - 7px)` }}
                  />
                )}
                <div
                  className="absolute bottom-0.5 h-1.5 w-4 bg-[#e83b24]"
                  style={{ left: `calc(${playerPct}% - 8px)` }}
                />
              </div>
            </div>

            {/* Right: Live ET (mobile) + Arcade Keycap Audio & Pause */}
            <div className="pointer-events-auto flex items-center gap-1.5 shrink-0">
              <div className="md:hidden ng-vfd border-2 border-[#525866] px-2.5 py-1.5 font-mono-num text-xs font-bold text-[#f7b519]">
                {hud.elapsedSec.toFixed(2)}s
              </div>
              <button
                type="button"
                onClick={onToggleMute}
                aria-label={muted ? 'Unmute audio' : 'Mute audio'}
                className="ng-keycap h-10 w-10 flex items-center justify-center bg-[#201e26] hover:bg-[#2d2a36] border-2 border-[#525866] cursor-pointer"
              >
                <PixelIcon name={muted ? 'soundOff' : 'soundOn'} className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={togglePause}
                aria-label="Pause race"
                className="ng-keycap h-10 w-10 flex items-center justify-center bg-[#201e26] hover:bg-[#2d2a36] border-2 border-[#525866] text-[#f4ecd8] cursor-pointer"
              >
                <PixelIcon name="pause" className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Mobile Compact Strip Progress Rail */}
          <div className="md:hidden flex items-center gap-2 ng-plate px-2.5 py-1 font-mono-num text-[10px] text-[#b8c0cc]">
            <span className="shrink-0 font-pixel text-[8px] text-[#f7b519]">GO</span>
            <div className="relative flex-1 h-2.5 ng-vfd overflow-hidden">
              {rival && (
                <div
                  className="absolute top-0.5 h-1 w-2.5 bg-[#b8c0cc]"
                  style={{ left: `calc(${rivalPct}% - 5px)` }}
                />
              )}
              <div
                className="absolute bottom-0.5 h-1 w-3 bg-[#e83b24]"
                style={{ left: `calc(${playerPct}% - 6px)` }}
              />
            </div>
            <span className="shrink-0 font-pixel text-[8px] text-[#19d4e6]">{distSpec.shortLabel}</span>
          </div>
        </div>

        {/* Floating Skewed Arcade Shift / Launch Callout Banner */}
        {hud.calloutText && !result && (
          <div className="pointer-events-none absolute top-[24%] left-1/2 -translate-x-1/2 z-10 text-center">
            <div
              className="-skew-x-10 font-pixel text-sm sm:text-lg tracking-wider px-5 py-2 bg-[#141218]/95 border-2 border-[#f7b519] shadow-[4px_4px_0_#07060a]"
              style={{ color: hud.calloutColor }}
            >
              {hud.calloutText}
            </div>
          </div>
        )}

        {/* Staging Instruction Banner */}
        {isStagingPhase && !hud.foul && (
          <div className="pointer-events-none absolute top-[92px] md:top-[78px] left-1/2 -translate-x-1/2 z-10 max-w-[94%] ng-plate-gold px-4 sm:px-5 py-1.5 text-center">
            <p className="font-mono-num text-[10px] sm:text-xs text-[#ffd557] font-bold tracking-wide">
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

      {/* BOTTOM NEO-GEO ARCADE COCKPIT DECK */}
      <div className="shrink-0 w-full bg-[#1c1a22] border-t-2 border-[#525866] px-2.5 sm:px-4 py-2.5 pb-[max(0.6rem,env(safe-area-inset-bottom))] z-20">
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

          {/* Tactile Multi-Touch Arcade Switch Pedals */}
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
              className={`ng-keycap touch-none select-none min-h-[50px] lg:h-14 px-2.5 sm:px-4 border-2 font-pixel text-[9px] sm:text-[10px] whitespace-nowrap cursor-pointer ${
                hud.clutch
                  ? 'bg-[#f7b519] border-[#141218] text-[#141218]'
                  : 'bg-[#2c2935] border-[#525866] text-[#f4ecd8] hover:bg-[#3a3647]'
              }`}
            >
              CLUTCH
              <span className="hidden lg:block font-mono-num text-[10px] opacity-80 mt-1">[SHIFT]</span>
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
              className={`ng-keycap touch-none select-none min-h-[50px] lg:h-14 px-2.5 sm:px-5 border-2 font-pixel text-[9px] sm:text-[10px] whitespace-nowrap cursor-pointer ${
                hud.throttle
                  ? 'bg-[#2ee66b] border-[#141218] text-[#141218]'
                  : 'bg-[#163022] border-[#2ee66b] text-[#bbf7d0] hover:bg-[#1e4230]'
              }`}
            >
              GAS
              <span className="hidden lg:block font-mono-num text-[10px] opacity-80 mt-1">[W]</span>
            </button>

            <button
              type="button"
              onContextMenu={(e) => e.preventDefault()}
              onPointerDown={(e) => {
                e.preventDefault();
                simRef.current?.triggerShiftUp();
              }}
              className={`ng-keycap touch-none select-none min-h-[50px] lg:h-14 px-2.5 sm:px-5 border-2 font-pixel text-[9px] sm:text-[10px] whitespace-nowrap cursor-pointer ${
                hud.inShiftZone
                  ? 'bg-[#f7b519] border-[#141218] text-[#141218]'
                  : 'bg-[#e83b24] border-[#141218] text-[#ffffff] hover:bg-[#ff563f]'
              }`}
            >
              SHIFT+
              <span className="hidden lg:block font-mono-num text-[10px] opacity-85 mt-1">[SPACE]</span>
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
                className={`ng-keycap touch-none select-none min-h-[50px] lg:h-14 px-2.5 sm:px-3.5 border-2 font-pixel text-[9px] sm:text-[10px] whitespace-nowrap cursor-pointer ${
                  hud.nitrousActive
                    ? 'bg-[#19d4e6] border-[#141218] text-[#141218]'
                    : hud.nitrousLeft > 0
                    ? 'bg-[#0e4f63] border-[#19d4e6] text-[#e0f2fe] hover:bg-[#136a85]'
                    : 'bg-[#141218] border-[#323642] text-[#64748b] cursor-not-allowed'
                }`}
              >
                NOS ({hud.nitrousLeft})
                <span className="hidden lg:block font-mono-num text-[10px] opacity-80 mt-1">[N]</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* NEO-GEO PAUSE MODAL */}
      {paused && !result && (
        <div className="absolute inset-0 z-30 bg-[#07060a]/82 flex items-center justify-center p-4">
          <div className="ng-plate-gold max-w-sm w-full overflow-hidden text-center">
            <div className="ng-hazard-bar h-2.5 w-full" />
            <div className="p-6 space-y-5">
              <h2 className="font-pixel text-lg text-[#f7b519] pixel-text-shadow">PAUSED</h2>
              <p className="text-sm font-mono-num text-[#f4ecd8] font-bold">
                {car.name} · {tierSpec.venueName}
              </p>
              <div className="flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={togglePause}
                  className="ng-keycap w-full py-3 bg-[#2ee66b] hover:bg-[#4ff588] text-[#141218] border-2 border-[#141218] font-pixel text-[10px] flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
                >
                  <PixelIcon name="play" className="w-4 h-4" /> RESUME RACE
                </button>
                <button
                  type="button"
                  onClick={handleRestart}
                  className="ng-keycap w-full py-3 bg-[#2c2935] hover:bg-[#3a3647] border-2 border-[#525866] text-[#f4ecd8] font-mono-num font-bold text-sm flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
                >
                  <PixelIcon name="restart" className="w-4 h-4" /> RESTART RUN
                </button>
                <button
                  type="button"
                  onClick={onExitToGarage}
                  className="ng-keycap w-full py-3 bg-[#18161e] hover:bg-[#24212c] border-2 border-[#3a3e4d] text-[#b8c0cc] font-mono-num font-bold text-sm whitespace-nowrap cursor-pointer"
                >
                  RETURN TO PADDOCK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREAM CHECKERED OFFICIAL TIME SLIP RESULTS TICKET MODAL */}
      {result && (
        <div className="absolute inset-0 z-30 bg-[#07060a]/84 flex items-center justify-center p-3 sm:p-4">
          <div className="ng-ticket max-w-xl w-full max-h-[92dvh] overflow-y-auto shadow-[6px_6px_0_#07060a]">
            {/* Checkered Ticket Header */}
            <div className="bg-[#e83b24] text-white border-b-2 border-[#141218]">
              <div className="ng-checkered-bar h-2.5 w-full" />
              <div className="px-4 sm:px-5 py-3 flex items-start justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  {result.rival && (
                    <PixelRivalPortrait rival={result.rival} className="w-12 h-12" />
                  )}
                  <div className="min-w-0">
                    <div
                      className={`font-pixel text-sm sm:text-lg pixel-text-shadow ${
                        result.foul
                          ? 'text-[#ffd557]'
                          : result.won
                          ? 'text-[#ffffff]'
                          : 'text-[#ffd557]'
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
                    <p className="text-[11px] font-mono-num text-[#f4ecd8] mt-1">
                      {tierSpec.name} · {distSpec.label} · {tierSpec.venueName}
                    </p>
                  </div>
                </div>
                {result.isNewPersonalBest && !result.foul && (
                  <div className="bg-[#f7b519] text-[#141218] border-2 border-[#141218] px-2.5 py-1 text-right shrink-0">
                    <div className="font-pixel text-[8px]">NEW RECORD</div>
                    <div className="font-mono-num text-[10px] font-bold">PERSONAL BEST</div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 sm:p-5 space-y-4">
              {/* Official VFD Time-Slip Comparison Table */}
              <div className="ng-vfd p-4 font-mono-num text-sm space-y-2 text-[#f4ecd8]">
                <div className="grid grid-cols-3 text-xs text-[#94a3b8] pb-1.5 border-b border-[#323642]">
                  <span>METRIC</span>
                  <span className="text-right text-[#f4ecd8]">YOU ({car.name})</span>
                  <span className="text-right">
                    {result.rival ? result.rival.name.split(' ')[0].toUpperCase() : 'TARGET'}
                  </span>
                </div>
                <div className="grid grid-cols-3 items-center">
                  <span className="text-xs text-[#94a3b8]">{distSpec.shortLabel} ET</span>
                  <span className="text-right font-bold text-[#f7b519]">
                    {result.foul ? 'FOUL' : formatEt(result.playerEtMs)}
                  </span>
                  <span className="text-right text-[#b8c0cc]">
                    {result.rival ? formatEt(result.rivalEtMs) : '—'}
                  </span>
                </div>
                <div className="grid grid-cols-3 items-center">
                  <span className="text-xs text-[#94a3b8]">TRAP SPEED</span>
                  <span className="text-right font-semibold text-[#f4ecd8]">
                    {result.foul ? '—' : `${result.playerTrapMph.toFixed(1)} MPH`}
                  </span>
                  <span className="text-right text-[#b8c0cc]">
                    {result.rival ? `${result.rivalTrapMph.toFixed(1)} MPH` : '—'}
                  </span>
                </div>
                <div className="grid grid-cols-3 items-center">
                  <span className="text-xs text-[#94a3b8]">REACTION</span>
                  <span className="text-right text-[#b8c0cc]">
                    {result.foul ? 'EARLY' : `${(result.reactionMs / 1000).toFixed(3)}s`}
                  </span>
                  <span className="text-right text-[#94a3b8]">
                    {result.rival ? `${result.rival.reactionSec.toFixed(3)}s` : '—'}
                  </span>
                </div>
                <div className="grid grid-cols-3 items-center">
                  <span className="text-xs text-[#94a3b8]">60-FT / SHIFTS</span>
                  <span className="text-right text-[#b8c0cc]">
                    {result.foul ? '—' : `${result.sixtyFtSec.toFixed(2)}s`}
                  </span>
                  <span className="text-right text-[#2ee66b]">
                    {result.perfectShifts} Perfect ({result.perfectClutchShifts} Clutch)
                  </span>
                </div>
                {!result.foul && (result.quarterSplitSec || result.halfSplitSec) && (
                  <div className="grid grid-cols-3 items-center pt-1 border-t border-[#323642] text-xs">
                    <span className="text-[#94a3b8]">SPLITS</span>
                    <span className="text-right text-[#b8c0cc]">
                      {result.quarterSplitSec ? `1/4: ${result.quarterSplitSec.toFixed(2)}s` : '—'}
                    </span>
                    <span className="text-right text-[#19d4e6]">
                      {result.halfSplitSec ? `1/2: ${result.halfSplitSec.toFixed(2)}s` : ''}
                    </span>
                  </div>
                )}
              </div>

              {/* Payout Breakdown */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono-num bg-[#e6dcc2] border-2 border-[#141218] px-3.5 py-2.5 text-[#141218]">
                {result.isTimeTrial ? (
                  <>
                    <div className="font-semibold">
                      Solo Test Session · No Cash Payout ·{' '}
                      <span className="font-bold">
                        {result.foul ? 'Foul Run' : 'Time & Replay Saved'}
                      </span>
                    </div>
                    <div className="text-base font-bold">$0</div>
                  </>
                ) : (
                  <>
                    <div className="font-semibold space-x-2.5">
                      <span>
                        Purse {formatCash(result.basePurse)}
                        {result.isRematch ? ' (Rematch)' : ''}
                      </span>
                      {result.launchBonusCash > 0 && (
                        <span className="text-[#15803d] font-bold">
                          · Launch +{formatCash(result.launchBonusCash)}
                        </span>
                      )}
                      {result.shiftBonusCash > 0 && (
                        <span className="text-[#996908] font-bold">
                          · Shifts +{formatCash(result.shiftBonusCash)}
                        </span>
                      )}
                      {result.recordBonusCash > 0 && (
                        <span className="text-[#0e7490] font-bold">
                          · Record +{formatCash(result.recordBonusCash)}
                        </span>
                      )}
                    </div>
                    <div className="bg-[#141218] text-[#2ee66b] px-2.5 py-1 text-base font-bold flex items-center gap-1.5">
                      <PixelIcon name="coin" className="w-4 h-4" />
                      <span>+{formatCash(result.totalCashEarned)}</span>
                    </div>
                  </>
                )}
              </div>

              {result.unlockedNextTier && (
                <div className="bg-[#141218] border-2 border-[#2ee66b] px-4 py-2.5 text-xs font-mono-num font-bold text-[#2ee66b]">
                  ★ TIER BOSS DEFEATED! NEXT RACING CLASS &amp; NEW DEALERSHIP CHASSIS UNLOCKED.
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-end gap-2.5 pt-1 pr-2">
                <button
                  type="button"
                  onClick={onExitToGarage}
                  className="ng-keycap px-4 py-2.5 bg-[#201e26] hover:bg-[#2d2a36] border-2 border-[#141218] text-[#f4ecd8] font-mono-num font-bold text-xs uppercase whitespace-nowrap cursor-pointer"
                >
                  PADDOCK &amp; SHOP
                </button>
                <button
                  type="button"
                  onClick={handleRestart}
                  className="ng-keycap px-4 py-2.5 bg-[#f7b519] hover:bg-[#ffd557] border-2 border-[#141218] text-[#141218] font-mono-num font-bold text-xs uppercase whitespace-nowrap cursor-pointer"
                >
                  RACE AGAIN
                </button>
                {result.won && nextRival && onNextRival && (
                  <button
                    type="button"
                    onClick={() => onNextRival(nextRival)}
                    className="ng-chevron-cta cursor-pointer"
                  >
                    <span className="ng-chevron-inner font-pixel text-[10px] whitespace-nowrap">
                      NEXT RIVAL
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
