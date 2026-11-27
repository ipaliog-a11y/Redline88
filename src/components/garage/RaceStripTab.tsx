import React, { useMemo } from 'react';
import { soundEngine } from '../../audio/soundEngine';
import {
  formatCash,
  getStripDistanceSpec,
  getTierById,
  resolveTimeOfDay,
  RIVALS,
  STRIP_DISTANCES,
  TIERS,
  TIME_OF_DAY_OPTIONS,
} from '../../data/gameData';
import {
  PlayerSave,
  RivalSpec,
  StripDistanceId,
  TierId,
  TimeOfDayMode,
} from '../../types/game';
import { PixelIcon, PixelRivalPortrait } from '../PixelSpritesUI';

interface RaceStripTabProps {
  save: PlayerSave;
  selectedTier: TierId;
  selectedDistance: StripDistanceId;
  timeOfDayMode: TimeOfDayMode;
  onSelectTier: (tier: TierId) => void;
  onSelectDistance: (distance: StripDistanceId) => void;
  onChangeTimeOfDayMode: (mode: TimeOfDayMode) => void;
  onOpenTuning: () => void;
  onStartRace: (tierId: TierId, distanceId: StripDistanceId, rival: RivalSpec | null) => void;
}

export const RaceStripTab: React.FC<RaceStripTabProps> = ({
  save,
  selectedTier,
  selectedDistance,
  timeOfDayMode,
  onSelectTier,
  onSelectDistance,
  onChangeTimeOfDayMode,
  onOpenTuning,
  onStartRace,
}) => {
  const tierSpec = getTierById(selectedTier);
  const distSpec = getStripDistanceSpec(selectedDistance);
  const resolvedTod = resolveTimeOfDay(selectedTier, timeOfDayMode);
  const todAutoLabel = resolveTimeOfDay(selectedTier, 'auto').toUpperCase();

  const tierRivals = useMemo(
    () => RIVALS.filter((r) => r.tier === selectedTier && r.distance === selectedDistance),
    [selectedTier, selectedDistance]
  );

  // Featured next rival for the quick-launch hazard chevron CTA
  const featuredRival = useMemo(() => {
    const nextUnclear = tierRivals.find((r, i) => {
      const defeated = save.defeatedRivals.includes(r.id);
      const prev = i > 0 ? tierRivals[i - 1] : null;
      const unlocked = !prev || save.defeatedRivals.includes(prev.id);
      return unlocked && !defeated;
    });
    return nextUnclear ?? tierRivals[tierRivals.length - 1] ?? null;
  }, [tierRivals, save.defeatedRivals]);

  return (
    <div className="space-y-3">
      {/* TOP CONTROL RACK: DIP-SWITCH TIER BANK + STRIP DISTANCE ROCKERS + LIGHTING */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-3">
        {/* Left/Main: Strip Distance Hardware Rockers + Venue Event Header */}
        <div className="xl:col-span-9 space-y-2.5">
          {/* Distance Selector Rockers */}
          <div className="grid grid-cols-3 gap-2">
            {STRIP_DISTANCES.map((d) => {
              const active = selectedDistance === d.id;
              const distRivals = RIVALS.filter(
                (r) => r.tier === selectedTier && r.distance === d.id
              );
              const clearedCount = distRivals.filter((r) =>
                save.defeatedRivals.includes(r.id)
              ).length;
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => {
                    soundEngine.playUiClick();
                    onSelectDistance(d.id);
                  }}
                  className={`ng-keycap px-3 py-2 text-left border-2 cursor-pointer ${
                    active
                      ? 'bg-[#19d4e6] border-[#141218] text-[#141218]'
                      : 'bg-[#26232e] border-[#525866] text-[#f4ecd8] hover:border-[#19d4e6]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 font-mono-num text-[10px] font-bold">
                    <span className={active ? 'text-[#141218]' : 'text-[#b8c0cc]'}>
                      {d.feet.toLocaleString()} FT
                    </span>
                    <span
                      className={`px-1 ${
                        active
                          ? 'bg-[#141218] text-[#2ee66b]'
                          : 'bg-[#0b0a0f] text-[#2ee66b]'
                      }`}
                    >
                      {clearedCount}/{distRivals.length}
                    </span>
                  </div>
                  <div className="font-pixel text-[10px] sm:text-xs mt-1">{d.label.toUpperCase()}</div>
                </button>
              );
            })}
          </div>

          {/* Venue Strip Banner & Quick Actions */}
          <div className="ng-plate overflow-hidden">
            <div className="ng-checkered-bar h-2 w-full" />
            <div className="p-3 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="bg-[#e83b24] text-white font-pixel text-[8px] px-1.5 py-0.5 border border-[#141218]">
                    TIER {tierSpec.id}
                  </span>
                  <h3 className="font-pixel text-[10px] sm:text-xs text-[#f7b519] pixel-text-shadow truncate">
                    {tierSpec.className} · {tierSpec.venueName.toUpperCase()}
                  </h3>
                </div>
                <p className="text-[11px] font-mono-num text-[#b8c0cc] mt-1">
                  <span className="text-[#f4ecd8]">{distSpec.tuningHint}</span>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={onOpenTuning}
                  className="ng-keycap px-3 py-2 bg-[#2d2a36] hover:bg-[#3c3847] border-2 border-[#525866] text-xs font-mono-num font-bold text-[#f7b519] flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                >
                  <PixelIcon name="gears" className="w-3.5 h-3.5" />
                  <span>TUNE</span>
                </button>
                <button
                  type="button"
                  onClick={() => onStartRace(selectedTier, selectedDistance, null)}
                  className="ng-keycap px-3 py-2 bg-[#2d2a36] hover:bg-[#3c3847] border-2 border-[#19d4e6] text-xs font-mono-num font-bold text-[#19d4e6] whitespace-nowrap cursor-pointer"
                >
                  SOLO TEST · $0
                </button>
                {featuredRival && (
                  <button
                    type="button"
                    onClick={() => onStartRace(selectedTier, selectedDistance, featuredRival)}
                    className="ng-chevron-cta cursor-pointer"
                  >
                    <span className="ng-chevron-inner font-pixel text-[10px] tracking-wider whitespace-nowrap">
                      RACE NOW
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Lighting Selector Strip */}
          <div className="ng-plate px-3 py-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-mono-num text-[11px]">
              <span className="bg-[#f7b519] text-[#141218] font-pixel text-[7px] px-1.5 py-0.5">
                SKY
              </span>
              <span className="text-[#b8c0cc]">
                <span className="text-[#f4ecd8] font-bold uppercase">{resolvedTod}</span>
                {timeOfDayMode === 'auto' && (
                  <span className="text-[#19d4e6]"> (T{selectedTier} DEFAULT)</span>
                )}
              </span>
            </div>
            <div className="grid grid-cols-4 sm:flex items-center gap-1.5 w-full sm:w-auto">
              {TIME_OF_DAY_OPTIONS.map((opt) => {
                const active = timeOfDayMode === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      soundEngine.playUiClick();
                      onChangeTimeOfDayMode(opt.id);
                    }}
                    className={`ng-keycap px-2.5 py-1 border-2 text-[10px] font-mono-num font-bold whitespace-nowrap cursor-pointer ${
                      active
                        ? 'bg-[#f7b519] border-[#141218] text-[#141218]'
                        : 'bg-[#1c1a22] border-[#525866] text-[#b8c0cc] hover:border-[#f7b519]'
                    }`}
                  >
                    {opt.id === 'auto' ? `AUTO(${todAutoLabel.slice(0, 3)})` : opt.shortLabel.toUpperCase()}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Physical Arcade Dip-Switch Bank for Tiers T1–T5 */}
        <div className="xl:col-span-3 ng-plate p-2.5 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between border-b border-[#323642] pb-1">
            <span className="font-pixel text-[8px] text-[#f7b519]">CLASS DIP-SW</span>
            <span className="font-mono-num text-[10px] text-[#2ee66b] font-bold">
              T{selectedTier} ON
            </span>
          </div>
          <div className="grid grid-cols-5 xl:grid-cols-1 gap-1.5">
            {TIERS.map((t) => {
              const unlocked = t.id <= save.highestUnlockedTier;
              const active = t.id === selectedTier;
              return (
                <button
                  key={t.id}
                  type="button"
                  disabled={!unlocked}
                  onClick={() => {
                    soundEngine.playUiClick();
                    onSelectTier(t.id);
                  }}
                  className={`flex items-center justify-between gap-2 px-2 py-1 border-2 font-mono-num text-[11px] font-bold transition-colors ${
                    !unlocked
                      ? 'bg-[#121016] border-[#26232e] text-[#525866] cursor-not-allowed'
                      : active
                      ? 'bg-[#2c2536] border-[#f7b519] text-[#f7b519] cursor-pointer'
                      : 'bg-[#1a1820] border-[#3a3e4d] text-[#b8c0cc] hover:border-[#b8c0cc] cursor-pointer'
                  }`}
                >
                  <span className="flex items-center gap-1.5 min-w-0">
                    <span className="font-pixel text-[8px]">T{t.id}</span>
                    <span className="hidden xl:inline text-[10px] truncate">{t.className}</span>
                  </span>
                  {/* Physical Dip-Switch Track + Sliding Metallic Cap */}
                  {!unlocked ? (
                    <PixelIcon name="lock" className="w-3 h-3 shrink-0" />
                  ) : (
                    <span className="ng-dip-switch w-8 h-4 shrink-0">
                      <span
                        className={`ng-dip-cap w-3.5 h-2.5 transition-transform ${
                          active ? 'translate-x-3 !bg-[#f7b519]' : 'translate-x-0'
                        }`}
                      />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* CREAM CHECKERED-HEADER NEO-GEO RIVAL RACE TICKETS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {tierRivals.map((rival) => {
          const defeated = save.defeatedRivals.includes(rival.id);
          const prevRival = tierRivals.find((r) => r.stageIndex === rival.stageIndex - 1);
          const unlocked =
            rival.stageIndex === 1 ||
            (prevRival ? save.defeatedRivals.includes(prevRival.id) : true);

          return (
            <div
              key={rival.id}
              className={`ng-ticket ${rival.isBoss ? 'ng-ticket-boss' : ''} flex flex-col justify-between ${
                !unlocked ? 'opacity-55 grayscale-[0.4]' : ''
              }`}
            >
              {/* Checkered Header Banner */}
              <div className="bg-[#e83b24] text-white border-b-2 border-[#141218]">
                <div className="ng-checkered-bar h-2 w-full" />
                <div className="px-3 py-1.5 flex items-center justify-between gap-2">
                  <span className="font-pixel text-[8px] sm:text-[9px] tracking-wide pixel-text-shadow">
                    {rival.isBoss
                      ? '★ TIER BOSS CHALLENGE'
                      : selectedDistance === 'quarter'
                      ? `RIVAL HEAT ${rival.stageIndex}/${tierRivals.length}`
                      : `${distSpec.shortLabel} HEAT ${rival.stageIndex}/${tierRivals.length}`}
                  </span>
                  <span className="bg-[#141218] text-[#2ee66b] font-mono-num text-[11px] font-bold px-2 py-0.5 flex items-center gap-1">
                    <PixelIcon name="coin" className="w-3 h-3" />
                    {defeated
                      ? `${formatCash(Math.round(rival.winPurse * 0.65))} RM`
                      : formatCash(rival.winPurse)}
                  </span>
                </div>
              </div>

              {/* Ticket Body: 24x24 Hi-Res Portrait + Stamped Specs */}
              <div className="p-3 flex items-start gap-3">
                <PixelRivalPortrait rival={rival} className="w-16 h-16 sm:w-[72px] sm:h-[72px]" />
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-3 h-3 shrink-0 border-2 border-[#141218]"
                      style={{ backgroundColor: rival.paintColor }}
                    />
                    <h4 className="font-bold text-sm sm:text-base text-[#141218] uppercase tracking-tight truncate">
                      {rival.name}
                    </h4>
                  </div>
                  <div className="text-xs font-bold text-[#3f3a47] truncate">{rival.carName}</div>
                  <div className="inline-flex items-center gap-2 bg-[#141218] text-[#f7b519] font-mono-num text-[11px] font-bold px-2 py-0.5">
                    <span>TARGET {rival.targetEtSec.toFixed(2)}s</span>
                    <span className="text-[#19d4e6]">{rival.targetTrapMph} MPH</span>
                  </div>
                  {rival.challengeNote && (
                    <p className="text-[11px] text-[#3f3a47] leading-snug pt-0.5 font-medium">
                      {rival.challengeNote}
                    </p>
                  )}
                </div>
              </div>

              {/* Ticket Footer: Status Stamp + Hazard Chevron CTA */}
              <div className="px-3 py-2 bg-[#e6dcc2] border-t-2 border-dashed border-[#8a7f66] flex items-center justify-between gap-2 pr-5">
                <span className="font-mono-num text-[11px] font-bold flex items-center gap-1.5">
                  {defeated ? (
                    <span className="border-2 border-[#15803d] text-[#15803d] px-1.5 py-0.5 text-[10px] font-pixel -rotate-2">
                      CLEARED
                    </span>
                  ) : unlocked ? (
                    <span className="border-2 border-[#141218] text-[#141218] px-1.5 py-0.5 text-[10px] font-bold">
                      READY
                    </span>
                  ) : (
                    <span className="text-[#6b6355] flex items-center gap-1">
                      <PixelIcon name="lock" className="w-3.5 h-3.5" /> LOCKED
                    </span>
                  )}
                </span>

                <button
                  type="button"
                  disabled={!unlocked}
                  onClick={() => onStartRace(selectedTier, selectedDistance, rival)}
                  className="ng-chevron-cta cursor-pointer"
                >
                  <span className="ng-chevron-inner font-pixel text-[9px] py-1.5 px-3 whitespace-nowrap">
                    {defeated ? 'REMATCH' : 'RACE NOW'}
                  </span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
