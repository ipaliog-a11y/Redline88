import React from 'react';
import { soundEngine } from '../../audio/soundEngine';
import {
  formatCash,
  getUpgradeCost,
  getUpgradeImpactPreview,
  UPGRADE_CATEGORIES,
} from '../../data/gameData';
import { CarConfig, CarSpec, UpgradeKey } from '../../types/game';
import { PixelIcon, PixelPartSprite } from '../PixelSpritesUI';

interface PartsShopTabProps {
  car: CarSpec;
  config: CarConfig;
  cash: number;
  hoveredUpgrade: UpgradeKey | null;
  onHoverUpgrade: (key: UpgradeKey | null) => void;
  onBuyUpgrade: (carId: string, key: UpgradeKey) => void;
}

export const PartsShopTab: React.FC<PartsShopTabProps> = ({
  car,
  config,
  cash,
  hoveredUpgrade,
  onHoverUpgrade,
  onBuyUpgrade,
}) => {
  return (
    <div className="space-y-3">
      <div className="arcade-inset px-3 py-2 text-xs text-[#cbd5e1] flex items-center gap-2">
        <PixelIcon name="bolt" className="w-4 h-4 shrink-0" />
        <span>
          Hover or select any part upgrade to preview bolt-on pixel hardware and dyno deltas live.
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {UPGRADE_CATEGORIES.map((cat) => {
          const lvl = config.upgrades[cat.key];
          const isMax = lvl >= 5;
          const impact = getUpgradeImpactPreview(car.id, config, cat.key);
          const nextCost = isMax ? 0 : getUpgradeCost(car, cat.key, lvl + 1);
          const canAfford = cash >= nextCost;
          const isPreviewing = hoveredUpgrade === cat.key && !isMax;

          return (
            <div
              key={cat.key}
              onMouseEnter={() => !isMax && onHoverUpgrade(cat.key)}
              onMouseLeave={() => {
                if (hoveredUpgrade === cat.key) onHoverUpgrade(null);
              }}
              onFocus={() => !isMax && onHoverUpgrade(cat.key)}
              className={`${
                isPreviewing ? 'arcade-panel-gold' : 'arcade-panel'
              } p-3.5 flex flex-col justify-between gap-3`}
            >
              <div>
                <div className="flex items-start gap-3">
                  <div className="arcade-inset p-1.5 shrink-0">
                    <PixelPartSprite partKey={cat.key} className="w-11 h-11" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-bold text-base text-[#f7f3e3] truncate arcade-shadow-text">
                        {cat.name}
                      </h4>
                      <span className="font-mono-num text-xs text-[#facc15] font-bold shrink-0">
                        LV {lvl}/5
                      </span>
                    </div>
                    <p className="text-xs text-[#94a3b8] mt-0.5">{cat.shortDesc}</p>
                  </div>
                </div>

                {/* 5-segment rounded progress bar */}
                <div className="grid grid-cols-5 gap-1.5 mt-3">
                  {[1, 2, 3, 4, 5].map((step) => (
                    <div
                      key={step}
                      className={`h-2 rounded-full transition-colors ${
                        step <= lvl
                          ? 'bg-[#22c55e]'
                          : isPreviewing && step === lvl + 1
                          ? 'bg-[#facc15]'
                          : 'bg-[#0c1221]'
                      }`}
                    />
                  ))}
                </div>

                <div className="text-xs font-mono-num text-[#cbd5e1] mt-2">
                  Part: <span className="text-[#f7f3e3] font-semibold">{cat.tierNames[lvl]}</span>
                  {!isMax && (
                    <span className="text-[#facc15]"> → {cat.tierNames[lvl + 1]}</span>
                  )}
                </div>

                {/* Exact Stat Impact & Characteristic Changes */}
                {impact && (
                  <div className="mt-2.5 pt-2 border-t border-[#2b3859]/70 space-y-1">
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono-num text-xs">
                      {impact.statChanges.map((sc, i) => (
                        <span key={sc.label} className="text-[#22c55e] font-bold">
                          {i > 0 && <span className="text-[#475569] mr-2.5">·</span>}
                          {sc.label} {sc.delta}
                        </span>
                      ))}
                    </div>
                    {impact.characteristics.map((trait) => (
                      <div key={trait} className="text-xs text-[#cbd5e1]">
                        Effect: <span className="text-[#fef08a]">{trait}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-2.5 border-t border-[#2b3859]/70">
                <span className="font-mono-num text-sm font-bold text-[#22c55e]">
                  {isMax ? 'MAXED' : formatCash(nextCost)}
                </span>
                <button
                  type="button"
                  disabled={isMax || !canAfford}
                  onClick={() => {
                    soundEngine.playShopBuy();
                    onBuyUpgrade(car.id, cat.key);
                  }}
                  className={`arcade-btn rounded-full px-4 py-2 text-xs font-bold uppercase whitespace-nowrap border ${
                    isMax
                      ? 'bg-[#12182b] text-[#64748b] border-[#1f2947] cursor-default'
                      : canAfford
                      ? 'bg-[#22c55e] hover:bg-[#16a34a] text-[#090d1a] border-[#bbf7d0] cursor-pointer'
                      : 'bg-[#12182b] text-[#64748b] border-[#1f2947] cursor-not-allowed'
                  }`}
                >
                  {isMax ? 'Max Level' : canAfford ? 'Install Part' : 'Need Cash'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
