import React, { useMemo, useState } from 'react';
import { soundEngine } from '../../audio/soundEngine';
import {
  computeCarPerformance,
  createDefaultCarConfig,
  formatCash,
  getCarById,
  getCarCharacteristics,
  getCarConfig,
  getCarsByTier,
  TIERS,
} from '../../data/gameData';
import { CarConfig, PlayerSave, TierId } from '../../types/game';
import { HiBitShowcaseCanvas } from '../HiBitShowcaseCanvas';
import { PixelIcon } from '../PixelSpritesUI';

interface ShowroomTabProps {
  save: PlayerSave;
  mountTurntable: boolean;
  onSelectCar: (carId: string) => void;
  onBuyCar: (carId: string) => void;
}

export const ShowroomTab: React.FC<ShowroomTabProps> = ({
  save,
  mountTurntable,
  onSelectCar,
  onBuyCar,
}) => {
  const [showroomTier, setShowroomTier] = useState<TierId>(() => getCarById(save.activeCarId).tier);
  const [showroomCarId, setShowroomCarId] = useState<string>(save.activeCarId);
  const [turntableSpinning, setTurntableSpinning] = useState<boolean>(true);
  const [showroomSpecMode, setShowroomSpecMode] = useState<'CURRENT' | 'MAXED'>('CURRENT');
  const [snapQuarterTick, setSnapQuarterTick] = useState<number>(0);

  const showroomCar = getCarById(showroomCarId);
  const showroomOwned = save.ownedCars.includes(showroomCar.id);
  const showroomTierCars = useMemo(() => getCarsByTier(showroomTier), [showroomTier]);

  const showroomConfig: CarConfig = useMemo(() => {
    const base = showroomOwned
      ? getCarConfig(save, showroomCar.id)
      : createDefaultCarConfig(showroomCar.id);
    if (showroomSpecMode === 'MAXED') {
      return {
        visuals: base.visuals,
        upgrades: { engine: 5, induction: 5, transmission: 5, tires: 5, chassis: 5, nitrous: 5 },
        tuning: base.tuning,
      };
    }
    return base;
  }, [showroomOwned, save, showroomCar.id, showroomSpecMode]);

  const showroomPerf = useMemo(
    () => computeCarPerformance(showroomCar.id, showroomConfig),
    [showroomCar.id, showroomConfig]
  );

  const handleStepTurntable = () => {
    soundEngine.playUiClick();
    setSnapQuarterTick((t) => t + 1);
  };

  const hpBarPct = Math.min(
    100,
    Math.round(((Math.log10(showroomPerf.hp) - 2.0) / (4.15 - 2.0)) * 100)
  );
  const gripBarPct = Math.min(100, Math.round((showroomPerf.grip / 3.8) * 100));
  const paceBarPct = Math.min(
    100,
    Math.max(12, Math.round(((16.8 - showroomPerf.estimatedEtSec) / (16.8 - 3.6)) * 100))
  );
  const agilityBarPct = Math.min(
    100,
    Math.max(18, Math.round(((3400 - showroomPerf.weightLbs) / 1650) * 100))
  );

  return (
    <div className="space-y-3">
      {/* Tier 1..5 Showroom Class Selector */}
      <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
        {TIERS.map((t) => {
          const active = showroomTier === t.id;
          const tierCars = getCarsByTier(t.id);
          const ownedInTier = tierCars.filter((c) => save.ownedCars.includes(c.id)).length;
          const unlocked = t.id <= save.highestUnlockedTier;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                soundEngine.playUiClick();
                setShowroomTier(t.id);
                setShowroomCarId(tierCars[0].id);
                setShowroomSpecMode('CURRENT');
              }}
              className={`arcade-btn rounded-xl p-2 sm:p-2.5 text-center sm:text-left border cursor-pointer ${
                active
                  ? 'bg-[#26355c] border-[#facc15] text-[#f7f3e3]'
                  : 'bg-[#151e36] border-[#3c5080]/65 text-[#cbd5e1] hover:border-[#6884bf]'
              }`}
            >
              <div className="flex items-center justify-center sm:justify-between gap-1 text-[10px] font-mono-num">
                <span className={active ? 'text-[#facc15] font-bold' : 'text-[#94a3b8]'}>
                  <span className="sm:hidden text-xs">T{t.id}</span>
                  <span className="hidden sm:inline">TIER {t.id}</span>
                </span>
                {!unlocked ? (
                  <PixelIcon name="lock" className="w-3.5 h-3.5" />
                ) : (
                  <span className="hidden sm:inline text-[#4ade80] font-bold">
                    {ownedInTier}/{tierCars.length}
                  </span>
                )}
              </div>
              <div className="hidden sm:block font-bold text-xs mt-1 truncate">{t.className}</div>
            </button>
          );
        })}
      </div>

      {/* 5-Car Tier Selector Bar */}
      <div className="flex overflow-x-auto no-scrollbar gap-2 pb-0.5 sm:grid sm:grid-cols-5 sm:overflow-visible">
        {showroomTierCars.map((c) => {
          const owned = save.ownedCars.includes(c.id);
          const selected = showroomCar.id === c.id;
          const unlocked = c.tier <= save.highestUnlockedTier;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                soundEngine.playUiClick();
                setShowroomCarId(c.id);
                setShowroomSpecMode('CURRENT');
              }}
              className={`arcade-btn rounded-xl min-w-[132px] sm:min-w-0 shrink-0 p-2 sm:p-2.5 text-left border cursor-pointer ${
                selected
                  ? 'bg-[#291e38] border-[#ef3b2d] text-[#f7f3e3]'
                  : 'bg-[#151e36] border-[#3c5080]/65 text-[#cbd5e1] hover:border-[#6884bf]'
              }`}
            >
              <div className="flex items-center justify-between gap-1 text-[10px] font-mono-num">
                <span
                  className="w-3 h-3 rounded-full shrink-0 border border-white/30"
                  style={{ backgroundColor: c.defaultPaint }}
                />
                {owned ? (
                  <span className="text-[#4ade80] font-bold">OWNED</span>
                ) : !unlocked ? (
                  <PixelIcon name="lock" className="w-3.5 h-3.5" />
                ) : (
                  <span className="text-[#cbd5e1]">{formatCash(c.price)}</span>
                )}
              </div>
              <div className="font-bold text-xs mt-1 truncate">{c.name}</div>
              <div className="text-[10px] text-[#facc15] truncate mt-0.5">{c.specialty}</div>
            </button>
          );
        })}
      </div>

      {/* Split Showroom Stage: 4-Angle Hi-Bit Turntable Left · Detailed Stats Right */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-3.5 items-stretch">
        {/* Left: Illuminated 4-Angle Hi-Bit Pixel Turntable Stage */}
        <div className="xl:col-span-7 arcade-panel overflow-hidden flex flex-col justify-between">
          <div className="p-3.5 flex-1 flex flex-col justify-between gap-3.5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] font-mono-num text-[#f5b82e] font-bold">
                  TIER {showroomCar.tier} · {showroomCar.specialty.toUpperCase()} ·{' '}
                  {showroomCar.gearRatios.length}-SPD
                  {showroomCar.hasParachute ? ' · CHUTE' : ''}
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-[#f8fafc] mt-0.5 arcade-shadow-text">
                  {showroomCar.name}
                </h3>
                <p className="text-xs text-[#94a3b8]">{showroomCar.subtitle}</p>
              </div>

              {/* 4-Angle Turntable Controls */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={handleStepTurntable}
                  aria-label="Rotate car 90 degrees"
                  className="arcade-btn rounded-full h-8 px-3 bg-[#141b2d] hover:bg-[#232d47] border border-[#5670a6]/70 text-xs font-bold text-[#f8fafc] flex items-center gap-1 cursor-pointer"
                >
                  <PixelIcon name="rotate" className="w-3.5 h-3.5" />
                  <span>90°</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playUiClick();
                    setTurntableSpinning((s) => !s);
                  }}
                  aria-label={turntableSpinning ? 'Pause turntable' : 'Spin turntable'}
                  className="arcade-btn rounded-full h-8 w-8 bg-[#141b2d] hover:bg-[#232d47] border border-[#5670a6]/70 text-[#f5b82e] flex items-center justify-center cursor-pointer"
                >
                  <PixelIcon name={turntableSpinning ? 'pause' : 'play'} className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* 4-Angle Hi-Bit Showroom Turntable (SIDE R / FRONT / SIDE L / REAR) */}
            <div className="w-full aspect-[340/180] arcade-inset rounded-2xl overflow-hidden relative">
              {mountTurntable ? (
                <HiBitShowcaseCanvas
                  mode="turntable"
                  chassis={showroomCar.chassis}
                  bodyVariant={showroomCar.bodyVariant}
                  visuals={showroomConfig.visuals}
                  upgrades={showroomConfig.upgrades}
                  spinning={turntableSpinning}
                  snapQuarterTick={snapQuarterTick}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-mono-num text-xs text-[#64748b]">
                  SHOWROOM STANDBY
                </div>
              )}
            </div>

            {/* Purchase / Select Action Footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-[#2b3859]/70">
              <div className="font-mono-num">
                <div className="text-[9px] text-[#94a3b8]">SHOWROOM PRICE</div>
                <div className="text-base sm:text-lg font-bold text-[#22c55e] leading-tight">
                  {showroomOwned
                    ? 'IN GARAGE'
                    : showroomCar.price === 0
                    ? 'STARTER'
                    : formatCash(showroomCar.price)}
                </div>
              </div>

              {showroomOwned ? (
                <button
                  type="button"
                  disabled={save.activeCarId === showroomCar.id}
                  onClick={() => {
                    soundEngine.playUiClick();
                    onSelectCar(showroomCar.id);
                  }}
                  className={`arcade-btn rounded-full px-5 py-2.5 text-xs font-bold uppercase flex items-center gap-1.5 whitespace-nowrap border ${
                    save.activeCarId === showroomCar.id
                      ? 'bg-[#132b23] text-[#4ade80] border-[#22c55e] cursor-default'
                      : 'bg-gradient-to-b from-[#ff5a4a] to-[#e6392a] hover:from-[#ff6d5e] hover:to-[#f04435] text-white border-[#facc15] cursor-pointer'
                  }`}
                >
                  {save.activeCarId === showroomCar.id ? (
                    <>
                      <PixelIcon name="check" className="w-4 h-4" /> Active Car
                    </>
                  ) : (
                    'Drive This Car'
                  )}
                </button>
              ) : showroomCar.tier > save.highestUnlockedTier ? (
                <div className="text-xs font-mono-num text-[#cbd5e1] flex items-center gap-1.5 arcade-inset rounded-full px-3.5 py-2">
                  <PixelIcon name="lock" className="w-4 h-4" />
                  <span>Beat Tier {showroomCar.tier - 1} Boss to Unlock</span>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={save.cash < showroomCar.price}
                  onClick={() => {
                    soundEngine.playShopBuy();
                    onBuyCar(showroomCar.id);
                  }}
                  className={`arcade-btn rounded-full px-5 py-2.5 text-xs font-bold uppercase whitespace-nowrap border ${
                    save.cash >= showroomCar.price
                      ? 'bg-gradient-to-b from-[#ff5a4a] to-[#e6392a] hover:from-[#ff6d5e] hover:to-[#f04435] text-white border-[#facc15] cursor-pointer'
                      : 'bg-[#12182b] text-[#64748b] border-[#1f2947] cursor-not-allowed'
                  }`}
                >
                  {save.cash >= showroomCar.price ? 'Purchase Chassis' : 'Insufficient Cash'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right: Detailed Car Stats & Characteristics Side Panel */}
        <div className="xl:col-span-5 arcade-panel p-3.5 flex flex-col justify-between gap-3.5">
          <div className="space-y-3.5">
            <div className="flex items-center justify-between gap-2 border-b border-[#2b3859]/70 pb-2.5">
              <div>
                <h4 className="font-pixel text-[10px] text-[#facc15]">SPECIFICATIONS</h4>
                <div className="font-mono-num text-xs text-[#cbd5e1] mt-1">
                  PI {showroomPerf.pi} · Est. {showroomPerf.estimatedEtSec.toFixed(2)}s
                </div>
              </div>

              {/* Stock/Owned vs Maxed Inspector Toggle */}
              <div className="flex items-center gap-1 arcade-inset rounded-full p-1 text-[11px] font-mono-num">
                <button
                  type="button"
                  onClick={() => setShowroomSpecMode('CURRENT')}
                  className={`px-2.5 py-1 rounded-full font-bold cursor-pointer transition-colors ${
                    showroomSpecMode === 'CURRENT'
                      ? 'bg-[#ef3b2d] text-white'
                      : 'text-[#94a3b8] hover:text-white'
                  }`}
                >
                  {showroomOwned ? 'Owned' : 'Stock'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowroomSpecMode('MAXED')}
                  className={`px-2.5 py-1 rounded-full font-bold cursor-pointer transition-colors ${
                    showroomSpecMode === 'MAXED'
                      ? 'bg-[#facc15] text-[#090d1a]'
                      : 'text-[#94a3b8] hover:text-white'
                  }`}
                >
                  Maxed
                </button>
              </div>
            </div>

            {/* Core Stat Bars */}
            <div className="space-y-2.5 font-mono-num text-xs">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-[#94a3b8]">POWER OUTPUT</span>
                  <span className="font-bold text-[#f7f3e3]">
                    {showroomPerf.hp.toLocaleString()} HP
                  </span>
                </div>
                <div className="h-2.5 arcade-inset rounded-full p-0.5 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#ef3b2d]"
                    style={{ width: `${hpBarPct}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-[#94a3b8]">1/4 MILE PACE</span>
                  <span className="font-bold text-[#facc15]">
                    {showroomPerf.estimatedEtSec.toFixed(2)}s
                  </span>
                </div>
                <div className="h-2.5 arcade-inset rounded-full p-0.5 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#facc15]"
                    style={{ width: `${paceBarPct}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-[#94a3b8]">LAUNCH TRACTION</span>
                  <span className="font-bold text-[#22c55e]">
                    {showroomPerf.grip.toFixed(2)} G
                  </span>
                </div>
                <div className="h-2.5 arcade-inset rounded-full p-0.5 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#22c55e]"
                    style={{ width: `${gripBarPct}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-[#94a3b8]">WEIGHT / AGILITY</span>
                  <span className="font-bold text-[#38bdf8]">
                    {showroomPerf.weightLbs.toLocaleString()} LBS
                  </span>
                </div>
                <div className="h-2.5 arcade-inset rounded-full p-0.5 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#38bdf8]"
                    style={{ width: `${agilityBarPct}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Technical Readout Grid */}
            <div className="grid grid-cols-2 gap-2 font-mono-num text-xs pt-1">
              <div className="led-readout px-2.5 py-2">
                <div className="text-[9px] text-[#94a3b8]">1/2 MI · 1 MILE</div>
                <div className="font-bold text-[#38bdf8] mt-0.5">
                  {showroomPerf.estimatedHalfEtSec.toFixed(2)}s ·{' '}
                  {showroomPerf.estimatedMileEtSec.toFixed(2)}s
                </div>
              </div>
              <div className="led-readout px-2.5 py-2">
                <div className="text-[9px] text-[#94a3b8]">TOP SPEED · DRAG</div>
                <div className="font-bold text-[#f7f3e3] mt-0.5">
                  {showroomPerf.topSpeedMph} MPH · {showroomCar.dragCoeff.toFixed(2)} Cd
                </div>
              </div>
              <div className="led-readout px-2.5 py-2">
                <div className="text-[9px] text-[#94a3b8]">HP / TON · REDLINE</div>
                <div className="font-bold text-[#f7f3e3] mt-0.5">
                  {Math.round(showroomPerf.hp / (showroomPerf.weightLbs / 2000)).toLocaleString()} ·{' '}
                  {(showroomPerf.redlineRpm / 1000).toFixed(1)}k
                </div>
              </div>
              <div className="led-readout px-2.5 py-2">
                <div className="text-[9px] text-[#94a3b8]">LAUNCH · BOOST</div>
                <div className="font-bold text-[#22c55e] mt-0.5">
                  {(showroomCar.launchRpmMin / 1000).toFixed(1)}k–
                  {(showroomCar.launchRpmMax / 1000).toFixed(1)}k · +
                  {Math.round((showroomPerf.shiftBoostMult - 1) * 100)}%
                </div>
              </div>
            </div>
          </div>

          {/* Chassis Characteristics */}
          <div className="pt-2.5 border-t border-[#2b3859]/70 space-y-1">
            <div className="font-pixel text-[9px] text-[#94a3b8]">CHASSIS CHARACTERISTICS</div>
            <div className="text-xs text-[#cbd5e1] leading-relaxed">
              {getCarCharacteristics(showroomCar).join(' · ')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
