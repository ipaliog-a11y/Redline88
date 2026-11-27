import React, { useMemo } from 'react';
import { soundEngine } from '../../audio/soundEngine';
import {
  formatCash,
  getStripDistanceSpec,
  getTierById,
  RIVALS,
  STRIP_DISTANCES,
  TIERS,
} from '../../data/gameData';
import {
  PlayerSave,
  RivalSpec,
  StripDistanceId,
  TierId,
} from '../../types/game';
import { PixelIcon, PixelRivalPortrait } from '../PixelSpritesUI';

interface RaceStripTabProps {
  save: PlayerSave;
  selectedTier: TierId;
  selectedDistance: StripDistanceId;
  onSelectTier: (tier: TierId) => void;
  onSelectDistance: (distance: StripDistanceId) => void;
  onOpenTuning: () => void;
  onStartRace: (tierId: TierId, distanceId: StripDistanceId, rival: RivalSpec | null) => void;
}

export const RaceStripTab: React.FC<RaceStripTabProps> = ({
  save,
  selectedTier,
  selectedDistance,
  onSelectTier,
  onSelectDistance,
  onOpenTuning,
  onStartRace,
}) => {
  const tierSpec = getTierById(selectedTier);
  const distSpec = getStripDistanceSpec(selectedDistance);

  const tierRivals = useMemo(
    () => RIVALS.filter((r) => r.tier === selectedTier && r.distance === selectedDistance),
    [selectedTier, selectedDistance]
  );

  return (
    <>
      {/* Tier 1..5 Class Tabs */}
      <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
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
              className={`arcade-btn rounded-xl p-2 sm:p-2.5 text-center sm:text-left border whitespace-nowrap ${
                !unlocked
                  ? 'bg-[#0f1426] border-[#1f2947] text-[#64748b] cursor-not-allowed'
                  : active
                  ? 'bg-[#26355c] border-[#facc15] text-[#f7f3e3] cursor-pointer'
                  : 'bg-[#161f38] border-[#3c5080]/65 text-[#cbd5e1] hover:border-[#6884bf] cursor-pointer'
              }`}
            >
              <div className="flex items-center justify-center sm:justify-between gap-1 text-[10px] font-mono-num">
                <span className={active ? 'text-[#facc15] font-bold' : ''}>
                  <span className="sm:hidden font-bold text-xs">T{t.id}</span>
                  <span className="hidden sm:inline">TIER {t.id}</span>
                </span>
                {!unlocked && <PixelIcon name="lock" className="w-3.5 h-3.5" />}
              </div>
              <div className="hidden sm:block font-bold text-xs mt-1 truncate">
                {t.className}
              </div>
            </button>
          );
        })}
      </div>

      {/* Strip Distance Selector: 1/4 Mile · 1/2 Mile · 1 Mile */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
        {STRIP_DISTANCES.map((d) => {
          const active = selectedDistance === d.id;
          const distRivals = RIVALS.filter((r) => r.tier === selectedTier && r.distance === d.id);
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
              className={`arcade-btn rounded-xl p-2.5 text-left border cursor-pointer ${
                active
                  ? 'bg-[#1b3354] border-[#38bdf8] text-[#f7f3e3]'
                  : 'bg-[#151e36] border-[#3c5080]/65 text-[#cbd5e1] hover:border-[#6884bf]'
              }`}
            >
              <div className="flex items-center justify-between gap-1 font-mono-num text-[10px]">
                <span className={active ? 'text-[#38bdf8] font-bold' : 'text-[#94a3b8]'}>
                  {d.feet.toLocaleString()} FT
                </span>
                <span className="text-[#22c55e] font-bold">
                  {clearedCount}/{distRivals.length}
                </span>
              </div>
              <div className="font-bold text-xs sm:text-sm mt-0.5">{d.label}</div>
            </button>
          );
        })}
      </div>

      {/* Venue Event Header & Solo Test Bar */}
      <div className="arcade-panel p-3.5 flex flex-wrap items-center justify-between gap-2.5 sm:gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm sm:text-base font-bold text-[#f7f3e3] arcade-shadow-text">
            {tierSpec.name} · <span className="text-[#38bdf8]">{distSpec.label}</span>
          </h3>
          <p className="text-[11px] sm:text-xs text-[#94a3b8] mt-0.5">
            <span className="hidden sm:inline">
              {tierSpec.venueName} · {distSpec.description} ·{' '}
            </span>
            <span className="text-[#facc15]">{distSpec.tuningHint}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
          <button
            type="button"
            onClick={onOpenTuning}
            className="arcade-btn rounded-full flex-1 sm:flex-initial justify-center px-3.5 py-2 bg-[#16203a] hover:bg-[#223052] border border-[#5670a6]/70 text-xs font-bold text-[#facc15] flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <PixelIcon name="gears" className="w-4 h-4" />
            <span>Tune Gears</span>
          </button>
          <button
            type="button"
            onClick={() => onStartRace(selectedTier, selectedDistance, null)}
            className="arcade-btn rounded-full flex-1 sm:flex-initial px-4 py-2 bg-[#213054] hover:bg-[#2c3f6b] border border-[#627db8]/75 text-xs font-bold text-[#f7f3e3] whitespace-nowrap cursor-pointer"
          >
            Solo {distSpec.shortLabel} Test · $0
          </button>
        </div>
      </div>

      {/* Race Event Cards with Pixel Rival Portraits */}
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
              className={`${
                rival.isBoss ? 'arcade-panel-gold' : 'arcade-panel'
              } overflow-hidden flex flex-col justify-between ${!unlocked ? 'opacity-60' : ''}`}
            >
              {/* Card Top Strip */}
              <div className="flex items-center justify-between gap-2 px-3.5 py-2 bg-[#101627]/80 border-b border-[#2c3a5c]/60 font-mono-num text-[11px]">
                <span
                  className={
                    rival.isBoss
                      ? 'font-pixel text-[9px] text-[#facc15]'
                      : 'text-[#94a3b8] font-bold'
                  }
                >
                  {rival.isBoss
                    ? '★ TIER BOSS'
                    : selectedDistance === 'quarter'
                    ? `STAGE ${rival.stageIndex} / ${tierRivals.length}`
                    : `${distSpec.shortLabel.toUpperCase()} HEAT ${rival.stageIndex}/${tierRivals.length}`}
                </span>
                <span className="text-[#22c55e] font-bold flex items-center gap-1">
                  <PixelIcon name="coin" className="w-3.5 h-3.5" />
                  {defeated
                    ? `Rematch ${formatCash(Math.round(rival.winPurse * 0.65))}`
                    : formatCash(rival.winPurse)}
                </span>
              </div>

              {/* Flyer Main Body: Pixel Portrait + Matchup Specs */}
              <div className="p-3.5 flex items-start gap-3">
                <PixelRivalPortrait rival={rival} className="w-16 h-16 shrink-0" />
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-3 h-3 rounded-full shrink-0 border border-white/30"
                      style={{ backgroundColor: rival.paintColor }}
                    />
                    <h4 className="font-bold text-base text-[#f7f3e3] truncate arcade-shadow-text">
                      {rival.name}
                    </h4>
                  </div>
                  <div className="text-xs text-[#cbd5e1] font-semibold truncate">
                    {rival.carName}
                  </div>
                  <div className="font-mono-num text-[11px] font-bold text-[#facc15]">
                    TARGET {rival.targetEtSec.toFixed(2)}s · {rival.targetTrapMph} MPH
                  </div>
                  {rival.challengeNote && (
                    <p className="text-[11px] text-[#94a3b8] leading-snug pt-0.5">
                      {rival.challengeNote}
                    </p>
                  )}
                </div>
              </div>

              {/* Flyer Action Footer */}
              <div className="px-3.5 py-2.5 bg-[#11182b]/75 border-t border-[#2c3a5c]/60 flex items-center justify-between gap-3">
                <span className="text-xs font-mono-num flex items-center gap-1.5">
                  {defeated ? (
                    <>
                      <PixelIcon name="check" className="w-3.5 h-3.5" />
                      <span className="text-[#4ade80] font-bold">CLEARED</span>
                    </>
                  ) : unlocked ? (
                    <span className="text-[#38bdf8] font-bold">READY TO STAGE</span>
                  ) : (
                    <>
                      <PixelIcon name="lock" className="w-3.5 h-3.5" />
                      <span className="text-[#64748b]">LOCKED</span>
                    </>
                  )}
                </span>
                <button
                  type="button"
                  disabled={!unlocked}
                  onClick={() => onStartRace(selectedTier, selectedDistance, rival)}
                  className={`arcade-btn rounded-full px-4 py-2 text-xs font-bold uppercase flex items-center gap-1.5 whitespace-nowrap border ${
                    !unlocked
                      ? 'bg-[#12182b] text-[#64748b] border-[#1f2947] cursor-not-allowed'
                      : rival.isBoss
                      ? 'bg-[#facc15] hover:bg-[#fde047] text-[#090d1a] border-[#fef9c3] cursor-pointer'
                      : 'bg-gradient-to-b from-[#ff5a4a] to-[#e6392a] hover:from-[#ff6d5e] hover:to-[#f04435] text-white border-[#fca5a5]/70 cursor-pointer'
                  }`}
                >
                  <span>{defeated ? 'Rematch' : 'Race Now'}</span>
                  <PixelIcon name="chevronRight" className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
};
