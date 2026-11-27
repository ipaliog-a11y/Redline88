import React, { useCallback, useEffect, useRef, useState } from 'react';
import { soundEngine } from '../audio/soundEngine';
import {
  formatCash,
  formatEt,
  getCarById,
  getCarConfig,
  getEngineHealth,
  getEngineHealthStatus,
  getEngineRepairCost,
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
  onRepairEngine: (carId: string) => void;
  onExitToGarage: () => void;
  onNextRival?: (nextRival: RivalSpec) => void;
  nextRival?: RivalSpec | null;
}

const INITIAL_TELEMETRY: RaceTelemetry = {
  phase: 'BURNOUT',
  distance: 'quarter',
  distanceFt: QUARTER_MILE_FT,
  treeStep: -2,
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
  brake: false,
  burnoutTimeLeft: 5.0,
  burnoutDuration: 5.0,
  burnoutTemp: 0,
  burnoutEfficiency: 15,
  burnoutGripBonusPct: -2,
  burnoutSkipped: false,
  boostTimer: 0,
  nitrousLeft: 0,
  nitrousMax: 0,
  nitrousActive: false,
  wheelspin: 0,
  inLaunchZone: false,
  inShiftZone: false,
  calloutText: '',
  calloutTimer: 0,
  calloutColor: '#2ee66b',
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
  onRepairEngine,
  onExitToGarage,
  onNextRival,
  nextRival,
}) => {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const simRef = useRef<RaceSimulation | null>(null);
  const [hud, setHud] = useState<RaceTelemetry>(INITIAL_TELEMETRY);
  const [paused, setPaused] = useState(false);
  const [result, setResult] = useState<RaceResult | null>(null);
  const [pendingAction, setPendingAction] = useState<'retry' | 'next' | null>(null);

  const onRaceFinishedRef = useRef(onRaceFinished);
  onRaceFinishedRef.current = onRaceFinished;

  const car = getCarById(save.activeCarId);
  const carConfig = getCarConfig(save, save.activeCarId);
  const carConfigRef = useRef(carConfig);
  carConfigRef.current = carConfig;
  const liveEngineHealth = getEngineHealth(carConfig);
  const repairCost = getEngineRepairCost(car, carConfig);
  const canAffordRepair = save.cash >= repairCost;
  const tierSpec = getTierById(tierId);
  const activeDistance: StripDistanceId = rival ? rival.distance : distanceId;
  const distSpec = getStripDistanceSpec(activeDistance);

  // Mount isolated Hi-Bit 16-Bit Pixel Art Race Simulation
  useEffect(() => {
    const container = viewportRef.current;
    if (!container) return;

    setResult(null);
    setPendingAction(null);
    setPaused(false);

    const sim = new RaceSimulation(
      container,
      save.activeCarId,
      carConfigRef.current,
      tierId,
      timeOfDay,
      activeDistance,
      rival,
      {
        onTelemetry: (t) => setHud(t),
        onFinish: (rawResult) => {
          const enriched = onRaceFinishedRef.current(rawResult);
          setPendingAction(null);
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

  const executeRestartNow = useCallback((repaired = false) => {
    setResult(null);
    setPendingAction(null);
    setPaused(false);
    simRef.current?.setPaused(false);
    const nextCfg = repaired
      ? { ...carConfigRef.current, engineHealth: 100 }
      : carConfigRef.current;
    simRef.current?.updateConfig(nextCfg);
    simRef.current?.reset();
  }, []);

  const handleRestart = useCallback(() => {
    if (result && liveEngineHealth < 100) {
      soundEngine.playUiClick();
      setPendingAction('retry');
      return;
    }
    executeRestartNow(false);
  }, [result, liveEngineHealth, executeRestartNow]);

  const handleNextRivalClick = useCallback(() => {
    if (!nextRival || !onNextRival) return;
    if (liveEngineHealth < 100) {
      soundEngine.playUiClick();
      setPendingAction('next');
      return;
    }
    setPendingAction(null);
    onNextRival(nextRival);
  }, [nextRival, onNextRival, liveEngineHealth]);

  const handleDirectRepair = useCallback(() => {
    if (liveEngineHealth >= 100 || !canAffordRepair) return;
    soundEngine.playShopBuy();
    onRepairEngine(save.activeCarId);
  }, [liveEngineHealth, canAffordRepair, onRepairEngine, save.activeCarId]);

  const handleConfirmRepairAndProceed = useCallback(
    (doRepair: boolean) => {
      const action = pendingAction;
      if (!action) return;
      if (doRepair && liveEngineHealth < 100 && canAffordRepair) {
        soundEngine.playShopBuy();
        onRepairEngine(save.activeCarId);
      } else {
        soundEngine.playUiClick();
      }
      setPendingAction(null);
      if (action === 'retry') {
        executeRestartNow(doRepair && canAffordRepair);
      } else if (action === 'next' && nextRival && onNextRival) {
        onNextRival(nextRival);
      }
    },
    [
      pendingAction,
      liveEngineHealth,
      canAffordRepair,
      onRepairEngine,
      save.activeCarId,
      executeRestartNow,
      nextRival,
      onNextRival,
    ]
  );

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
        if (result && !pendingAction && (e.code === 'KeyR' || e.code === 'Enter')) {
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
        e.code === 'ArrowDown' ||
        e.code === 'KeyC'
      ) {
        e.preventDefault();
        sim.setClutch(true);
      } else if (e.code === 'Tab') {
        e.preventDefault();
        if (!e.repeat) sim.skipBurnout();
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
        e.code === 'ArrowDown' ||
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
  }, [paused, result, pendingAction, togglePause, handleRestart]);

  const isBurnoutPhase = hud.phase === 'BURNOUT';
  const isStagingPhase =
    hud.phase === 'STAGING' ||
    hud.phase === 'COUNTDOWN' ||
    (hud.phase === 'RACING' && hud.gear === 0);
  const isLaunchedRacing = hud.phase === 'RACING' && hud.gear > 0;
  const showVirtualTree =
    !result &&
    !paused &&
    (isStagingPhase || (hud.phase === 'RACING' && hud.playerDistFt < 95) || hud.foul);
  const stripFt = hud.distanceFt || distSpec.feet;
  const playerPct = Math.min(100, (hud.playerDistFt / stripFt) * 100);
  const rivalPct = Math.min(100, (hud.rivalDistFt / stripFt) * 100);

  const burnoutZone =
    hud.burnoutTemp > 92
      ? { label: 'OVERHEAT', color: '#e83b24' }
      : hud.burnoutTemp >= 75
      ? { label: 'OPTIMAL', color: '#2ee66b' }
      : hud.burnoutTemp >= 35
      ? { label: 'WARMING', color: '#f7b519' }
      : { label: 'COLD', color: '#19d4e6' };

  const burnoutHint =
    hud.burnoutTemp > 92
      ? 'EASE OFF GAS TO COOL BACK INTO GREEN!'
      : hud.burnoutTemp >= 75
      ? 'HOLD STEADY IN THE GREEN ZONE!'
      : hud.throttle && !hud.brake
      ? 'HOLD BRAKE TO LOCK FRONT WHEELS!'
      : 'HOLD BRAKE + GAS TO HEAT REAR SLICKS';

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
          <div
            className={`pointer-events-none absolute ${
              showVirtualTree ? 'top-[40%] sm:top-[38%]' : 'top-[24%]'
            } left-1/2 -translate-x-1/2 z-10 text-center`}
          >
            <div
              className="-skew-x-10 font-pixel text-sm sm:text-lg tracking-wider px-5 py-2 bg-[#141218]/95 border-2 border-[#f7b519] shadow-[4px_4px_0_#07060a]"
              style={{ color: hud.calloutColor }}
            >
              {hud.calloutText}
            </div>
          </div>
        )}

        {/* Pre-Race Burnout Mini-Game Panel (Neo-Geo Style) */}
        {isBurnoutPhase && !paused && !result && (
          <div className="absolute top-[86px] md:top-[76px] left-1/2 -translate-x-1/2 z-10 w-[min(94%,490px)] ng-plate-gold overflow-hidden">
            <div className="ng-hazard-bar h-1.5 w-full" />
            <div className="px-3.5 sm:px-4 py-2.5 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-pixel text-[9px] sm:text-[10px] text-[#f7b519] whitespace-nowrap">
                    BURNOUT BOX
                  </span>
                  <span className="ng-vfd px-2 py-0.5 font-mono-num text-xs font-bold text-[#f4ecd8] whitespace-nowrap">
                    {hud.burnoutTimeLeft.toFixed(1)}s
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => simRef.current?.skipBurnout()}
                  className="ng-keycap px-2.5 py-1 bg-[#2c2935] hover:bg-[#3a3647] border-2 border-[#525866] text-[10px] font-mono-num font-bold text-[#f4ecd8] whitespace-nowrap shrink-0 cursor-pointer"
                >
                  SKIP (20–80%) <span className="hidden sm:inline opacity-70">[TAB]</span>
                </button>
              </div>

              {/* Tire Temperature Bar with Optimal 75–92% Sweet Spot Window */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] font-mono-num">
                  <span className="text-[#b8c0cc]">
                    TIRE TEMP:{' '}
                    <span className="font-bold" style={{ color: burnoutZone.color }}>
                      {hud.burnoutTemp}% · {burnoutZone.label}
                    </span>
                  </span>
                  <span className="font-bold text-[#f4ecd8] whitespace-nowrap">
                    {hud.burnoutEfficiency}% EFF{' '}
                    <span
                      className={
                        hud.burnoutGripBonusPct >= 0 ? 'text-[#2ee66b]' : 'text-[#f7b519]'
                      }
                    >
                      ({hud.burnoutGripBonusPct >= 0 ? '+' : ''}
                      {hud.burnoutGripBonusPct}% GRIP)
                    </span>
                  </span>
                </div>

                <div className="relative w-full h-3.5 ng-vfd overflow-hidden">
                  <div
                    className="absolute top-0 bottom-0 bg-[#2ee66b]/30 border-x border-[#2ee66b]"
                    style={{ left: '75%', width: '17%' }}
                  />
                  <div
                    className="absolute top-0 bottom-0 bg-[#e83b24]/25"
                    style={{ left: '92%', width: '8%' }}
                  />
                  <div
                    className="h-full transition-[width] duration-75"
                    style={{
                      width: `${hud.burnoutTemp}%`,
                      backgroundColor: burnoutZone.color,
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 text-[10px] sm:text-[11px] font-mono-num">
                <span
                  className="font-bold truncate"
                  style={{
                    color:
                      hud.throttle && !hud.brake
                        ? '#f7b519'
                        : hud.burnoutTemp > 92
                        ? '#e83b24'
                        : hud.burnoutTemp >= 75
                        ? '#2ee66b'
                        : '#ffd557',
                  }}
                >
                  {burnoutHint}
                </span>
                <span className="hidden sm:inline text-[#b8c0cc] whitespace-nowrap shrink-0">
                  [S/SHIFT] + [W]
                </span>
              </div>
            </div>
          </div>
        )}

        {/* BIGGER VIRTUAL CHRISTMAS TREE LIGHTS ABOVE THE CARS */}
        {showVirtualTree && (
          <div className="pointer-events-none absolute top-[72px] md:top-[68px] left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1.5 w-[min(94%,460px)]">
            {/* Large Twin-Bulb NHRA Virtual Tree Housing */}
            <div className="bg-[#121118]/95 border-2 border-[#525866] shadow-[4px_4px_0_#07060a] px-4 sm:px-5 py-2.5 flex flex-col items-center gap-2">
              {/* Pre-Stage & Stage Twin Indicator Row */}
              <div className="flex items-center gap-5 border-b border-[#2e3342] pb-1.5 w-full justify-center">
                <div className="flex items-center gap-1.5">
                  <span className="font-pixel text-[7px] sm:text-[8px] text-[#94a3b8]">PRE</span>
                  <span
                    className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border-2 border-[#0a0a0f] transition-all ${
                      hud.treeStep >= 0
                        ? 'bg-[#fef08a] shadow-[0_0_10px_#fef08a]'
                        : 'bg-[#2a271c]'
                    }`}
                  />
                  <span
                    className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border-2 border-[#0a0a0f] transition-all ${
                      hud.treeStep >= 0
                        ? 'bg-[#fef08a] shadow-[0_0_10px_#fef08a]'
                        : 'bg-[#2a271c]'
                    }`}
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-pixel text-[7px] sm:text-[8px] text-[#94a3b8]">STG</span>
                  <span
                    className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border-2 border-[#0a0a0f] transition-all ${
                      hud.treeStep >= 1
                        ? 'bg-[#facc15] shadow-[0_0_12px_#facc15]'
                        : 'bg-[#2a271c]'
                    }`}
                  />
                  <span
                    className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border-2 border-[#0a0a0f] transition-all ${
                      hud.treeStep >= 1
                        ? 'bg-[#facc15] shadow-[0_0_12px_#facc15]'
                        : 'bg-[#2a271c]'
                    }`}
                  />
                </div>
              </div>

              {/* Big High-Visibility Countdown Bulbs: 3 Ambers + Green + Red Foul */}
              <div className="flex items-center gap-3 sm:gap-4">
                {[0, 1, 2].map((idx) => {
                  const lit = hud.treeStep >= 2 + idx && hud.treeStep !== -1;
                  return (
                    <div key={idx} className="flex flex-col items-center gap-1">
                      <div
                        className={`w-8 h-8 sm:w-11 sm:h-11 rounded-full border-2 transition-all flex items-center justify-center ${
                          lit
                            ? 'bg-[#facc15] border-[#fffbeb] shadow-[0_0_20px_#facc15,inset_0_0_8px_#ffffff]'
                            : 'bg-[#2b2210] border-[#4d3d1c]'
                        }`}
                      >
                        {lit && <span className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-white/85" />}
                      </div>
                      <span className="font-pixel text-[7px] text-[#94a3b8]">{idx + 1}</span>
                    </div>
                  );
                })}

                <div className="w-px h-10 bg-[#323642]" />

                {/* BIG GREEN GO LIGHT */}
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={`w-9 h-9 sm:w-12 sm:h-12 rounded-full border-2 transition-all flex items-center justify-center ${
                      hud.treeStep >= 5
                        ? 'bg-[#2ee66b] border-[#dcfce7] shadow-[0_0_26px_#2ee66b,inset_0_0_10px_#ffffff]'
                        : 'bg-[#10291b] border-[#1f4d32]'
                    }`}
                  >
                    {hud.treeStep >= 5 && (
                      <span className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-white/90" />
                    )}
                  </div>
                  <span
                    className={`font-pixel text-[7px] ${
                      hud.treeStep >= 5 ? 'text-[#2ee66b]' : 'text-[#64748b]'
                    }`}
                  >
                    GO
                  </span>
                </div>

                {/* BIG RED FOUL LIGHT */}
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={`w-8 h-8 sm:w-11 sm:h-11 rounded-full border-2 transition-all flex items-center justify-center ${
                      hud.treeStep === -1
                        ? 'bg-[#ff3b30] border-[#fee2e2] shadow-[0_0_26px_#ff3b30,inset_0_0_10px_#ffffff]'
                        : 'bg-[#2e1214] border-[#542024]'
                    }`}
                  >
                    {hud.treeStep === -1 && (
                      <span className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-white/90" />
                    )}
                  </div>
                  <span
                    className={`font-pixel text-[7px] ${
                      hud.treeStep === -1 ? 'text-[#ff3b30]' : 'text-[#64748b]'
                    }`}
                  >
                    FOUL
                  </span>
                </div>
              </div>
            </div>

            {/* Launch Preparation Prompt */}
            {isStagingPhase && !hud.foul && (
              <div
                className={`px-3.5 sm:px-4 py-1.5 text-center border-2 shadow-[3px_3px_0_#07060a] ${
                  hud.phase === 'STAGING'
                    ? 'bg-[#241d0f]/95 border-[#f7b519] animate-pulse'
                    : hud.treeStep >= 5
                    ? 'bg-[#0e2e1b]/95 border-[#2ee66b]'
                    : 'bg-[#141218]/95 border-[#f7b519]'
                }`}
              >
                <p className="font-mono-num text-[10px] sm:text-xs font-bold tracking-wide">
                  <span className="text-[#19d4e6] mr-2">
                    TIRES {hud.burnoutEfficiency}% ({hud.burnoutGripBonusPct >= 0 ? '+' : ''}
                    {hud.burnoutGripBonusPct}% GRIP)
                  </span>
                  {hud.phase === 'STAGING' ? (
                    <span className="text-[#ffd557]">
                      · PRESS &amp; HOLD CLUTCH [SHIFT] TO START LIGHTS
                    </span>
                  ) : hud.treeStep < 5 ? (
                    <span className="text-[#ffd557]">
                      · HOLD CLUTCH + REV TO GREEN · RELEASE ON GREEN!
                    </span>
                  ) : (
                    <span className="text-[#2ee66b]">
                      · GREEN! RELEASE CLUTCH TO LAUNCH!
                    </span>
                  )}
                </p>
              </div>
            )}
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
            isStaging={isStagingPhase || isBurnoutPhase}
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
              disabled={isLaunchedRacing}
              onContextMenu={(e) => e.preventDefault()}
              onPointerDown={(e) => {
                if (isLaunchedRacing) return;
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
              className={`ng-keycap touch-none select-none min-h-[50px] lg:h-14 px-2.5 sm:px-4 border-2 font-pixel text-[9px] sm:text-[10px] whitespace-nowrap ${
                isLaunchedRacing
                  ? 'bg-[#141218] border-[#323642] text-[#64748b] cursor-not-allowed opacity-60'
                  : isBurnoutPhase
                  ? hud.brake
                    ? 'bg-[#e83b24] border-[#141218] text-[#ffffff] cursor-pointer'
                    : 'bg-[#361b1d] border-[#e83b24] text-[#fecaca] hover:bg-[#472226] cursor-pointer'
                  : hud.clutch
                  ? 'bg-[#f7b519] border-[#141218] text-[#141218] cursor-pointer'
                  : hud.phase === 'STAGING'
                  ? 'bg-[#362b12] border-[#f7b519] text-[#ffd557] hover:bg-[#4a3b18] animate-pulse cursor-pointer'
                  : 'bg-[#2c2935] border-[#525866] text-[#f4ecd8] hover:bg-[#3a3647] cursor-pointer'
              }`}
            >
              {isBurnoutPhase ? 'BRAKE' : 'CLUTCH'}
              <span className="hidden lg:block font-mono-num text-[10px] opacity-80 mt-1">
                {isBurnoutPhase
                  ? '[S / SHIFT]'
                  : isLaunchedRacing
                  ? 'LAUNCH ONLY'
                  : '[SHIFT]'}
              </span>
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
              disabled={isBurnoutPhase}
              onContextMenu={(e) => e.preventDefault()}
              onPointerDown={(e) => {
                e.preventDefault();
                simRef.current?.triggerShiftUp();
              }}
              className={`ng-keycap touch-none select-none min-h-[50px] lg:h-14 px-2.5 sm:px-5 border-2 font-pixel text-[9px] sm:text-[10px] whitespace-nowrap cursor-pointer ${
                isBurnoutPhase
                  ? 'bg-[#141218] border-[#323642] text-[#64748b] cursor-not-allowed'
                  : hud.inShiftZone
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
                disabled={isBurnoutPhase || hud.nitrousLeft <= 0 || hud.nitrousActive}
                onContextMenu={(e) => e.preventDefault()}
                onPointerDown={(e) => {
                  e.preventDefault();
                  simRef.current?.triggerNitrous();
                }}
                className={`ng-keycap touch-none select-none min-h-[50px] lg:h-14 px-2.5 sm:px-3.5 border-2 font-pixel text-[9px] sm:text-[10px] whitespace-nowrap cursor-pointer ${
                  isBurnoutPhase
                    ? 'bg-[#141218] border-[#323642] text-[#64748b] cursor-not-allowed'
                    : hud.nitrousActive
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
                        ? 'JUMPSTART · DISQUALIFIED'
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

            <div className="p-4 sm:p-5 space-y-3.5">
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
                    {result.perfectShifts} Perfect
                  </span>
                </div>
                {typeof result.burnoutEfficiency === 'number' && (
                  <div className="grid grid-cols-3 items-center">
                    <span className="text-xs text-[#94a3b8]">BURNOUT</span>
                    <span
                      className={`text-right font-semibold ${
                        result.burnoutEfficiency >= 85
                          ? 'text-[#2ee66b]'
                          : result.burnoutEfficiency >= 55
                          ? 'text-[#19d4e6]'
                          : 'text-[#f7b519]'
                      }`}
                    >
                      {result.burnoutEfficiency}% Efficiency
                    </span>
                    <span className="text-right text-[#94a3b8]">
                      {result.burnoutSkipped ? 'Skipped Roll' : 'Manual Heat'}
                    </span>
                  </div>
                )}
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

              {/* Engine Health & Post-Run Repair Panel */}
              {(() => {
                const liveStatus = getEngineHealthStatus(liveEngineHealth);
                return (
                  <div className="ng-vfd px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs font-mono-num text-[#f4ecd8]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <PixelIcon name="wrench" className="w-3.5 h-3.5 shrink-0" />
                      <span className="text-[#94a3b8]">ENGINE</span>
                      <span className="font-bold" style={{ color: liveStatus.color }}>
                        {liveEngineHealth}% · {liveStatus.label}
                      </span>
                      {liveEngineHealth < 100 &&
                        typeof result.engineWearApplied === 'number' &&
                        result.engineWearApplied > 0 && (
                          <span className="text-[#94a3b8]">(-{result.engineWearApplied}% wear)</span>
                        )}
                      {result.topGearRevProtectionUsed && (
                        <span className="bg-[#162b22] border border-[#2ee66b] text-[#2ee66b] px-1.5 py-0.5 text-[10px] font-bold">
                          REV GUARD
                        </span>
                      )}
                    </div>
                    {liveEngineHealth < 100 ? (
                      <button
                        type="button"
                        disabled={!canAffordRepair}
                        onClick={handleDirectRepair}
                        className={`ng-keycap px-3 py-1 border-2 font-mono-num font-bold text-[11px] uppercase whitespace-nowrap ${
                          canAffordRepair
                            ? 'bg-[#2ee66b] hover:bg-[#4ff588] border-[#141218] text-[#141218] cursor-pointer'
                            : 'bg-[#1f1d26] border-[#3a3e4d] text-[#64748b] cursor-not-allowed'
                        }`}
                      >
                        {canAffordRepair
                          ? `REPAIR TO 100% (${formatCash(repairCost)})`
                          : `NEED ${formatCash(repairCost)}`}
                      </button>
                    ) : (
                      <span className="text-[#2ee66b] font-bold">✓ 100% READY</span>
                    )}
                  </div>
                );
              })()}

              {result.unlockedNextTier && (
                <div className="bg-[#141218] border-2 border-[#2ee66b] px-4 py-2.5 text-xs font-mono-num font-bold text-[#2ee66b]">
                  ★ TIER BOSS DEFEATED! NEXT RACING CLASS &amp; NEW DEALERSHIP CHASSIS UNLOCKED.
                </div>
              )}

              {/* Pre-Race / Retry Repair Confirmation Prompt */}
              {pendingAction && liveEngineHealth < 100 ? (
                <div className="bg-[#141218] border-2 border-[#f7b519] p-3.5 space-y-2.5 text-[#f4ecd8]">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-pixel text-[10px] text-[#f7b519]">
                      REPAIR ENGINE BEFORE {pendingAction === 'next' ? 'NEXT RIVAL' : 'RETRY'}?
                    </div>
                    <span className="font-mono-num text-[11px] text-[#b8c0cc]">
                      CASH: <strong className="text-[#2ee66b]">{formatCash(save.cash)}</strong>
                    </span>
                  </div>
                  <p className="font-mono-num text-xs text-[#cbd5e1]">
                    Engine health is at{' '}
                    <strong className="text-[#f7b519]">{liveEngineHealth}%</strong>. Rebuild to 100%
                    for <strong>{formatCash(repairCost)}</strong> before lining up?
                  </p>
                  <div className="flex flex-wrap items-center justify-end gap-2 pt-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playUiClick();
                        setPendingAction(null);
                      }}
                      className="ng-keycap px-3 py-2 bg-[#201e26] hover:bg-[#2d2a36] border-2 border-[#525866] text-[#b8c0cc] font-mono-num font-bold text-xs uppercase cursor-pointer"
                    >
                      BACK
                    </button>
                    <button
                      type="button"
                      onClick={() => handleConfirmRepairAndProceed(false)}
                      className="ng-keycap px-3.5 py-2 bg-[#2c2935] hover:bg-[#3a3647] border-2 border-[#525866] text-[#f4ecd8] font-mono-num font-bold text-xs uppercase cursor-pointer"
                    >
                      SKIP REPAIR &amp; {pendingAction === 'next' ? 'NEXT' : 'RETRY'}
                    </button>
                    <button
                      type="button"
                      disabled={!canAffordRepair}
                      onClick={() => handleConfirmRepairAndProceed(true)}
                      className={`ng-keycap px-4 py-2 border-2 font-pixel text-[9px] uppercase whitespace-nowrap ${
                        canAffordRepair
                          ? 'bg-[#2ee66b] hover:bg-[#4ff588] border-[#141218] text-[#141218] cursor-pointer'
                          : 'bg-[#1f1d26] border-[#3a3e4d] text-[#64748b] cursor-not-allowed'
                      }`}
                    >
                      {canAffordRepair
                        ? `REPAIR (${formatCash(repairCost)}) & ${
                            pendingAction === 'next' ? 'NEXT' : 'RETRY'
                          }`
                        : `NEED ${formatCash(repairCost)}`}
                    </button>
                  </div>
                </div>
              ) : (
                /* Action Buttons */
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
                      onClick={handleNextRivalClick}
                      className="ng-chevron-cta cursor-pointer"
                    >
                      <span className="ng-chevron-inner font-pixel text-[10px] whitespace-nowrap">
                        NEXT RIVAL
                      </span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
