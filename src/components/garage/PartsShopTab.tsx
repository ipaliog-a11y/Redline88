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
      <div className="ng-vfd px-3 py-2 text-xs font-mono-num text-[#f4ecd8] flex items-center gap-2 border-l-4 border-l-[#f7b519]">
        <PixelIcon name="bolt" className="w-4 h-4 shrink-0" />
        <span>
          HOVER OR SELECT ANY PERFORMANCE MODULE TO PREVIEW BOLT-ON HARDWARE &amp; DYNO DELTAS LIVE.
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
                isPreviewing ? 'ng-plate-gold' : 'ng-plate'
              } flex flex-col justify-between overflow-hidden`}
            >
              {/* Steel Module Header Bar */}
              <div className="bg-[#18161e] border-b-2 border-[#323642] px-3 py-1.5 flex items-center justify-between gap-2">
                <h4 className="font-pixel text-[9px] sm:text-[10px] text-[#f4ecd8] truncate">
                  {cat.name.toUpperCase()}
                </h4>
                <span className="bg-[#0b0a0f] border border-[#525866] px-2 py-0.5 font-mono-num text-[11px] text-[#f7b519] font-bold shrink-0">
                  LV {lvl}/5
                </span>
              </div>

              <div className="p-3 flex-1 flex flex-col justify-between gap-2.5">
                <div>
                  <div className="flex items-start gap-3">
                    <div className="ng-vfd p-1.5 shrink-0 border-2 border-[#525866]">
                      <PixelPartSprite partKey={cat.key} className="w-11 h-11" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-[#b8c0cc] leading-snug">{cat.shortDesc}</p>
                      <div className="text-xs font-mono-num text-[#f4ecd8] mt-1.5">
                        <span className="text-[#94a3b8]">PART:</span>{' '}
                        <span className="font-bold">{cat.tierNames[lvl]}</span>
                        {!isMax && (
                          <span className="text-[#f7b519] font-bold"> → {cat.tierNames[lvl + 1]}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 5-Bar Segmented VFD LED Level Meter */}
                  <div className="grid grid-cols-5 gap-1.5 mt-3 bg-[#0b0a0f] p-1.5 border border-[#323642]">
                    {[1, 2, 3, 4, 5].map((step) => (
                      <div
                        key={step}
                        className={`h-2.5 border border-[#141218] ${
                          step <= lvl
                            ? 'bg-[#2ee66b]'
                            : isPreviewing && step === lvl + 1
                            ? 'bg-[#f7b519]'
                            : 'bg-[#1c1a22]'
                        }`}
                      />
                    ))}
                  </div>

                  {/* Exact Stat Impact & Characteristic Changes */}
                  {impact && (
                    <div className="mt-2.5 ng-vfd p-2 space-y-1">
                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 font-mono-num text-xs">
                        {impact.statChanges.map((sc, i) => (
                          <span key={sc.label} className="text-[#2ee66b] font-bold">
                            {i > 0 && <span className="text-[#525866] mr-2">·</span>}
                            {sc.label} {sc.delta}
                          </span>
                        ))}
                      </div>
                      {impact.characteristics.map((trait) => (
                        <div key={trait} className="text-[11px] font-mono-num text-[#f7b519]">
                          ► {trait}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Action Footer */}
                <div className="flex items-center justify-between pt-2 border-t-2 border-[#323642]">
                  <span className="font-mono-num text-sm font-bold text-[#2ee66b]">
                    {isMax ? 'MAXED OUT' : formatCash(nextCost)}
                  </span>
                  <button
                    type="button"
                    disabled={isMax || !canAfford}
                    onClick={() => {
                      soundEngine.playShopBuy();
                      onBuyUpgrade(car.id, cat.key);
                    }}
                    className={`ng-keycap px-4 py-1.5 font-pixel text-[9px] uppercase whitespace-nowrap border-2 ${
                      isMax
                        ? 'bg-[#18161e] text-[#64748b] border-[#323642] cursor-default'
                        : canAfford
                        ? 'bg-[#2ee66b] hover:bg-[#4ff588] text-[#141218] border-[#141218] cursor-pointer'
                        : 'bg-[#18161e] text-[#64748b] border-[#323642] cursor-not-allowed'
                    }`}
                  >
                    {isMax ? 'MAXED' : canAfford ? 'INSTALL' : 'NEED CASH'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
