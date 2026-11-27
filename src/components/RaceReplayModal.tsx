import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';
import {
  formatEt,
  getCarById,
  getStripDistanceSpec,
  getTierById,
  resolveTimeOfDay,
} from '../data/gameData';
import { HiBitStripRenderer } from '../engine/hibitStripRenderer';
import { LocalRecord, RaceReplayData, ReplaySample, ReplayShiftEvent } from '../types/game';
import { AnalogPixelTach } from './AnalogPixelTach';
import { PixelIcon } from './PixelSpritesUI';

interface RaceReplayModalProps {
  record: LocalRecord;
  onClose: () => void;
}

const SPEED_OPTIONS = [0.25, 0.5, 1, 2] as const;

interface InterpolatedFrame {
  t: number;
  distFt: number;
  mph: number;
  rpm: number;
  gear: number;
  pitchDeg: number;
  rivalDistFt: number;
  boost: boolean;
}

function sampleAtTime(replay: RaceReplayData, t: number): InterpolatedFrame {
  const samples = replay.samples;
  if (samples.length === 0) {
    return {
      t,
      distFt: 0,
      mph: 0,
      rpm: 1200,
      gear: 1,
      pitchDeg: 0,
      rivalDistFt: 0,
      boost: false,
    };
  }
  if (t <= samples[0].t) {
    const s = samples[0];
    return {
      t,
      distFt: s.d,
      mph: s.v,
      rpm: s.r,
      gear: s.g,
      pitchDeg: s.p,
      rivalDistFt: s.rd ?? 0,
      boost: s.b === 1,
    };
  }
  const last = samples[samples.length - 1];
  if (t >= last.t) {
    return {
      t: last.t,
      distFt: last.d,
      mph: last.v,
      rpm: last.r,
      gear: last.g,
      pitchDeg: last.p,
      rivalDistFt: last.rd ?? 0,
      boost: last.b === 1,
    };
  }

  let lo = 0;
  let hi = samples.length - 1;
  while (lo + 1 < hi) {
    const mid = (lo + hi) >> 1;
    if (samples[mid].t <= t) lo = mid;
    else hi = mid;
  }

  const a: ReplaySample = samples[lo];
  const b: ReplaySample = samples[hi];
  const span = Math.max(0.0001, b.t - a.t);
  const alpha = Math.max(0, Math.min(1, (t - a.t) / span));

  return {
    t,
    distFt: a.d + (b.d - a.d) * alpha,
    mph: Math.round(a.v + (b.v - a.v) * alpha),
    rpm: Math.round(a.r + (b.r - a.r) * alpha),
    gear: alpha < 0.92 ? a.g : b.g,
    pitchDeg: a.p + (b.p - a.p) * alpha,
    rivalDistFt: (a.rd ?? 0) + ((b.rd ?? 0) - (a.rd ?? 0)) * alpha,
    boost: a.b === 1 || b.b === 1,
  };
}

function getEventBadgeLabel(ev: ReplayShiftEvent): string {
  if (ev.kind === 'launch') return 'LAUNCH';
  if (ev.kind === 'nitrous') return 'NOS';
  return `${ev.fromGear}→${ev.toGear}`;
}

export const RaceReplayModal: React.FC<RaceReplayModalProps> = ({ record, onClose }) => {
  const replay = record.replay;
  const mountRef = useRef<HTMLDivElement | null>(null);

  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState<(typeof SPEED_OPTIONS)[number]>(1);
  const [currentTime, setCurrentTime] = useState(0);

  const playingRef = useRef(playing);
  playingRef.current = playing;
  const speedRef = useRef(speed);
  speedRef.current = speed;
  const timeRef = useRef(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.code === 'Space') {
        e.preventDefault();
        setPlaying((p) => {
          if (!p && replay && timeRef.current >= replay.totalEtSec) {
            timeRef.current = 0;
            setCurrentTime(0);
          }
          return !p;
        });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, replay]);

  // Mount Hi-Bit 16-Bit Pixel Art Replay Renderer
  useEffect(() => {
    if (!replay) return;
    const container = mountRef.current;
    if (!container) return;

    const car = getCarById(replay.carId);
    const tierSpec = getTierById(replay.tier);
    const totalSec = Math.max(0.5, replay.totalEtSec);
    const tod = replay.timeOfDay ?? resolveTimeOfDay(replay.tier, 'auto');

    const renderer = new HiBitStripRenderer(
      container,
      tierSpec.theme,
      tod,
      replay.distanceFt,
      {
        chassis: car.chassis,
        bodyVariant: car.bodyVariant,
        visuals: replay.visuals,
        upgrades: replay.upgrades,
      },
      replay.rival
        ? {
            chassis: replay.rival.chassis,
            bodyVariant: replay.rival.bodyVariant,
            visuals: {
              paintColor: replay.rival.paintColor,
              stripe: replay.rival.stripe,
              rims: replay.rival.rims,
            },
            upgrades: replay.rival.upgrades,
          }
        : null
    );

    let alive = true;
    let rafId = 0;
    let lastNow = performance.now();
    let lastUiSync = 0;

    const tick = () => {
      if (!alive) return;
      const now = performance.now();
      const dt = Math.min(0.05, Math.max(0.001, (now - lastNow) / 1000));
      lastNow = now;

      if (playingRef.current) {
        const nextT = timeRef.current + dt * speedRef.current;
        if (nextT >= totalSec) {
          timeRef.current = totalSec;
          playingRef.current = false;
          setPlaying(false);
          setCurrentTime(totalSec);
        } else {
          timeRef.current = nextT;
          if (now - lastUiSync >= 32) {
            lastUiSync = now;
            setCurrentTime(nextT);
          }
        }
      }

      const t = timeRef.current;
      const frame = sampleAtTime(replay, t);
      const isShiftPulse = replay.events.some((ev) => t >= ev.t && t - ev.t <= 0.28);
      const isLaunchPulse = replay.events.some(
        (ev) => ev.kind === 'launch' && t >= ev.t && t - ev.t <= 0.24
      );
      const isNosActive = replay.events.some(
        (ev) => ev.kind === 'nitrous' && t >= ev.t && t <= ev.t + 1.65
      );

      if (playingRef.current && frame.distFt < 80 && t > 0.02 && Math.random() < dt * 16) {
        renderer.spawnSmoke(frame.distFt - 5.5, 0, 2, 14);
      }

      renderer.updateAndRender(
        {
          cameraFt: frame.distFt - 6,
          playerDistFt: frame.distFt,
          playerMph: frame.mph,
          playerWheelAngle: frame.distFt * 0.52,
          playerPitchDeg: frame.pitchDeg,
          playerSquatPx: t > 0.05 && t < totalSec ? 1.4 : 0,
          playerExhaustFlame: isShiftPulse || frame.boost || replay.tier >= 4 ? 0.85 : 0.15,
          playerNitrousFlame: isNosActive ? 1 : 0,
          playerChuteOpen: car.hasParachute && t >= totalSec - 0.05 ? 0.85 : 0,
          rivalDistFt: frame.rivalDistFt,
          rivalWheelAngle: frame.rivalDistFt * 0.48,
          rivalPitchDeg: frame.rivalDistFt < 40 && t > 0.05 ? -3 : 0,
          rivalExhaustFlame: replay.tier >= 4 && t > 0.1 && t < totalSec ? 0.65 : 0,
          rivalChuteOpen: replay.tier >= 4 && frame.rivalDistFt >= replay.distanceFt ? 0.7 : 0,
          treeStep: 5,
          shakeAmp: isLaunchPulse ? 2.0 : 0,
          simTime: t,
          elapsedSec: t,
        },
        dt
      );

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      alive = false;
      cancelAnimationFrame(rafId);
      renderer.dispose();
    };
  }, [replay]);

  const frame = useMemo(
    () => (replay ? sampleAtTime(replay, currentTime) : null),
    [replay, currentTime]
  );

  if (!replay || !frame) return null;

  const car = getCarById(replay.carId);
  const tierSpec = getTierById(replay.tier);
  const distSpec = getStripDistanceSpec(replay.distance);
  const totalSec = Math.max(0.5, replay.totalEtSec);
  const progressPct = Math.max(0, Math.min(100, (currentTime / totalSec) * 100));
  const isNearLaunch = currentTime <= Math.max(0.25, replay.reactionSec + 0.15);

  const activeEventIndex = replay.events.reduce((bestIdx, ev, idx) => {
    if (currentTime >= ev.t - 0.05 && currentTime <= ev.t + 0.85) return idx;
    return bestIdx;
  }, -1);
  const activeEvent = activeEventIndex >= 0 ? replay.events[activeEventIndex] : null;

  const handleSeek = (nextT: number) => {
    const clamped = Math.max(0, Math.min(totalSec, nextT));
    timeRef.current = clamped;
    setCurrentTime(clamped);
  };

  const handleJumpToEvent = (ev: ReplayShiftEvent) => {
    soundEngine.playUiClick();
    handleSeek(Math.max(0, ev.t - 0.12));
    setPlaying(true);
    playingRef.current = true;
  };

  const handleTogglePlay = () => {
    soundEngine.playUiClick();
    if (!playing && timeRef.current >= totalSec - 0.01) {
      handleSeek(0);
    }
    setPlaying((p) => !p);
  };

  const handleRestart = () => {
    soundEngine.playUiClick();
    handleSeek(0);
    setPlaying(true);
    playingRef.current = true;
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#07060a]/86 flex items-center justify-center p-2.5 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Run Replay"
    >
      <div className="ng-plate-gold max-w-4xl w-full max-h-[94dvh] overflow-y-auto">
        <div className="ng-checkered-bar h-2.5 w-full" />
        <div className="p-4 sm:p-5 space-y-3.5 sm:space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 border-b-2 border-[#323642] pb-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <PixelIcon name="film" className="w-4 h-4" />
                <h2 className="font-pixel text-xs sm:text-sm text-[#f7b519] pixel-text-shadow truncate">
                  RUN REPLAY · {distSpec.shortLabel}
                </h2>
              </div>
              <p className="text-xs font-mono-num text-[#b8c0cc] mt-1 truncate">
                {record.driverName} · <span className="text-[#f4ecd8] font-bold">{car.name}</span> ·{' '}
                {tierSpec.name}
                {replay.rival ? ` vs ${replay.rival.name}` : ' (Solo Test)'}
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right font-mono-num ng-vfd px-2.5 py-1">
                <div className="text-sm sm:text-base font-bold text-[#2ee66b]">
                  {formatEt(record.etMs)}
                </div>
                <div className="text-[11px] text-[#19d4e6]">{replay.trapMph.toFixed(1)} MPH</div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close replay"
                className="ng-keycap h-9 w-9 flex items-center justify-center bg-[#2c2935] hover:bg-[#3a3647] border-2 border-[#525866] text-[#f4ecd8] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Hi-Bit 16-Bit Pixel Art Replay Viewport */}
          <div className="relative w-full aspect-[16/9] sm:aspect-[21/9] ng-vfd overflow-hidden">
            <div ref={mountRef} className="w-full h-full" />

            {/* Top-Left Speed Indicator */}
            <div className="pointer-events-none absolute top-2.5 left-2.5 bg-[#0b0a0f]/92 border-2 border-[#525866] px-2.5 py-1 font-pixel text-[8px] text-[#f7b519]">
              REPLAY · {speed}X
            </div>

            {/* Top-Right ET & Distance Readout */}
            <div className="pointer-events-none absolute top-2.5 right-2.5 bg-[#0b0a0f]/92 border-2 border-[#525866] px-2.5 py-1 font-mono-num text-[11px] sm:text-xs flex items-center gap-3">
              <span className="text-[#f7b519] font-bold">ET {currentTime.toFixed(2)}s</span>
              <span className="text-[#f4ecd8]">
                {Math.round(frame.distFt).toLocaleString()} / {replay.distanceFt.toLocaleString()} FT
              </span>
            </div>

            {/* On-Viewport Active Shift Timing Callout */}
            {activeEvent && (
              <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 bg-[#141218]/94 border-2 border-[#f7b519] shadow-[3px_3px_0_#07060a] px-4 py-1.5 text-center">
                <div
                  className="font-pixel text-[10px] sm:text-xs pixel-text-shadow"
                  style={{ color: activeEvent.color }}
                >
                  {activeEvent.rating}
                </div>
                <div className="font-mono-num text-[10px] text-[#f4ecd8] mt-0.5">
                  {getEventBadgeLabel(activeEvent)} · {activeEvent.rpm.toLocaleString()} RPM · {activeEvent.mph} MPH
                </div>
              </div>
            )}
          </div>

          {/* Pixel Tachometer + Timeline Scrubber */}
          <div className="ng-vfd p-3 space-y-3">
            <AnalogPixelTach
              rpm={frame.rpm}
              redlineRpm={replay.redlineRpm}
              launchMinRpm={replay.launchMinRpm}
              launchMaxRpm={replay.launchMaxRpm}
              shiftMinRpm={replay.shiftMinRpm}
              shiftMaxRpm={replay.shiftMaxRpm}
              gear={frame.gear}
              maxGears={car.gearRatios.length}
              mph={frame.mph}
              isStaging={isNearLaunch}
              boostActive={frame.boost}
              compact
            />

            {/* Interactive Timeline Scrubber with Shift Markers */}
            <div className="space-y-1.5 pt-1 border-t border-[#323642]">
              <div className="relative pt-4 pb-1">
                <div className="pointer-events-none absolute left-0 right-0 top-0 h-4">
                  {replay.events.map((ev, idx) => {
                    const pct = Math.max(1, Math.min(99, (ev.t / totalSec) * 100));
                    const isActive = idx === activeEventIndex;
                    return (
                      <div
                        key={`${ev.kind}-${ev.t}-${idx}`}
                        className="absolute -translate-x-1/2 flex flex-col items-center"
                        style={{ left: `${pct}%` }}
                      >
                        <span
                          className={`font-mono-num text-[9px] font-bold leading-none whitespace-nowrap ${
                            isActive ? 'scale-110' : 'opacity-85'
                          }`}
                          style={{ color: ev.color }}
                        >
                          {getEventBadgeLabel(ev)}
                        </span>
                        <span className="w-0.5 h-2 mt-0.5" style={{ backgroundColor: ev.color }} />
                      </div>
                    );
                  })}
                </div>

                <input
                  type="range"
                  min={0}
                  max={totalSec}
                  step={0.01}
                  value={currentTime}
                  aria-label="Replay timeline"
                  onChange={(e) => {
                    setPlaying(false);
                    playingRef.current = false;
                    handleSeek(parseFloat(e.target.value));
                  }}
                  className="w-full accent-[#f7b519] cursor-pointer"
                />
              </div>

              {/* Playback Controls */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleTogglePlay}
                    className="ng-keycap px-4 py-1.5 bg-[#e83b24] hover:bg-[#ff563f] border-2 border-[#141218] text-[#ffffff] font-pixel text-[9px] flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                  >
                    <PixelIcon name={playing ? 'pause' : 'play'} className="w-3.5 h-3.5" />
                    <span>{playing ? 'PAUSE' : currentTime >= totalSec - 0.01 ? 'REPLAY' : 'PLAY'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleRestart}
                    className="ng-keycap px-3.5 py-1.5 bg-[#2c2935] hover:bg-[#3a3647] border-2 border-[#525866] text-[#f4ecd8] font-mono-num text-xs font-bold flex items-center gap-1 whitespace-nowrap cursor-pointer"
                  >
                    <PixelIcon name="restart" className="w-3.5 h-3.5" />
                    <span>RESTART</span>
                  </button>
                </div>

                <div className="flex items-center gap-1 font-mono-num">
                  <span className="text-[10px] text-[#94a3b8] mr-1 hidden sm:inline">SPEED</span>
                  {SPEED_OPTIONS.map((sp) => (
                    <button
                      key={sp}
                      type="button"
                      onClick={() => {
                        soundEngine.playUiClick();
                        setSpeed(sp);
                      }}
                      className={`ng-keycap px-2.5 py-1 text-xs font-bold border-2 whitespace-nowrap cursor-pointer ${
                        speed === sp
                          ? 'bg-[#f7b519] border-[#141218] text-[#141218]'
                          : 'bg-[#1c1a22] border-[#525866] text-[#b8c0cc] hover:bg-[#2c2935]'
                      }`}
                    >
                      {sp}x
                    </button>
                  ))}
                </div>

                <div className="font-mono-num text-[11px] text-[#b8c0cc] whitespace-nowrap">
                  {progressPct.toFixed(0)}% · RT {replay.reactionSec.toFixed(3)}s · 60ft {replay.sixtyFtSec.toFixed(2)}s
                </div>
              </div>
            </div>
          </div>

          {/* Clickable Shift Timing Breakdown */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-pixel text-[10px] text-[#f7b519]">
                SHIFT TIMING BREAKDOWN
              </h3>
              <span className="text-[11px] font-mono-num text-[#b8c0cc]">Click any shift to inspect timing</span>
            </div>

            {replay.events.length === 0 ? (
              <div className="ng-vfd p-3 text-xs text-[#94a3b8]">
                No shift events recorded on this run.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {replay.events.map((ev, idx) => {
                  const isActive = idx === activeEventIndex;
                  return (
                    <button
                      key={`${ev.kind}-${ev.t}-${idx}`}
                      type="button"
                      onClick={() => handleJumpToEvent(ev)}
                      className={`ng-keycap text-left p-2.5 border-2 cursor-pointer ${
                        isActive
                          ? 'bg-[#2c2536] border-[#f7b519]'
                          : 'bg-[#1a1820] border-[#3a3e4d] hover:border-[#b8c0cc]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 font-mono-num text-[11px]">
                        <span className="font-bold text-[#f4ecd8]">{getEventBadgeLabel(ev)}</span>
                        <span className="text-[#94a3b8]">{ev.t.toFixed(2)}s</span>
                      </div>
                      <div
                        className="text-[11px] font-bold mt-1 truncate"
                        style={{ color: ev.color }}
                      >
                        {ev.rating}
                      </div>
                      <div className="font-mono-num text-[10px] text-[#b8c0cc] mt-0.5 flex items-center justify-between gap-1">
                        <span>{ev.rpm.toLocaleString()} RPM</span>
                        <span>{ev.mph} MPH</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
