import React from 'react';
import { soundEngine } from '../../audio/soundEngine';
import { formatCash, PAINT_COLORS, RIM_OPTIONS, STRIPE_OPTIONS } from '../../data/gameData';
import { CarConfig, CarSpec, RimStyle, StripeStyle } from '../../types/game';
import { HiBitShowcaseCanvas } from '../HiBitShowcaseCanvas';

export interface VisualDraft {
  paintColor?: string;
  stripe?: StripeStyle;
  rims?: RimStyle;
}

export interface VisualCheckoutSummary {
  patch: VisualDraft;
  items: { label: string; cost: number }[];
  totalCost: number;
  hasChanges: boolean;
}

interface CustomizeTabProps {
  car: CarSpec;
  config: CarConfig;
  previewConfig: CarConfig;
  cash: number;
  mountMobilePaintBay: boolean;
  visualCheckout: VisualCheckoutSummary;
  onChangeDraft: (updater: (prev: VisualDraft) => VisualDraft) => void;
  onResetDraft: () => void;
  onBuyVisual: (carId: string, patch: VisualDraft, cost: number) => void;
}

export const CustomizeTab: React.FC<CustomizeTabProps> = ({
  car,
  config,
  previewConfig,
  cash,
  mountMobilePaintBay,
  visualCheckout,
  onChangeDraft,
  onResetDraft,
  onBuyVisual,
}) => {
  return (
    <div className="space-y-3">
      {/* Inline Live Hi-Bit Paint Preview on Mobile (desktop sees left Pit Bay) */}
      {mountMobilePaintBay && (
        <div className="lg:hidden arcade-panel p-2">
          <div className="w-full aspect-[2/1] arcade-inset overflow-hidden">
            <HiBitShowcaseCanvas
              mode="pitbay"
              chassis={car.chassis}
              bodyVariant={car.bodyVariant}
              visuals={previewConfig.visuals}
              upgrades={previewConfig.upgrades}
            />
          </div>
        </div>
      )}

      {/* Preview & Checkout Action Bar */}
      <div
        className={`${
          visualCheckout.hasChanges ? 'arcade-panel-gold' : 'arcade-panel'
        } p-3.5 flex flex-wrap items-center justify-between gap-3`}
      >
        <div className="space-y-0.5 min-w-0">
          <div className="text-sm font-bold text-[#f8fafc]">
            {visualCheckout.hasChanges
              ? 'Previewing Custom Paint & Mods'
              : 'Select any paint, decal, or rim to preview live'}
          </div>
          {visualCheckout.hasChanges ? (
            <div className="text-xs font-mono-num text-[#cbd5e1] flex flex-wrap items-center gap-x-2">
              {visualCheckout.items.map((item, idx) => (
                <span key={item.label}>
                  {idx > 0 && <span className="text-[#64748b] mr-2">·</span>}
                  {item.label} ({item.cost === 0 ? 'Free' : formatCash(item.cost)})
                </span>
              ))}
            </div>
          ) : (
            <div className="text-xs text-[#94a3b8]">
              Nothing is charged until you press Buy &amp; Apply.
            </div>
          )}
        </div>

        {visualCheckout.hasChanges && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick();
                onResetDraft();
              }}
              className="arcade-btn rounded-full px-4 py-2 bg-[#141b2d] hover:bg-[#232d47] border border-[#495f8f]/70 text-xs font-bold text-[#cbd5e1] whitespace-nowrap cursor-pointer"
            >
              Reset
            </button>
            <button
              type="button"
              disabled={cash < visualCheckout.totalCost}
              onClick={() => {
                soundEngine.playShopBuy();
                onBuyVisual(car.id, visualCheckout.patch, visualCheckout.totalCost);
                onResetDraft();
              }}
              className={`arcade-btn rounded-full px-5 py-2 text-xs font-bold uppercase whitespace-nowrap border ${
                cash >= visualCheckout.totalCost
                  ? 'bg-[#22c55e] hover:bg-[#16a34a] text-[#090d1a] border-[#bbf7d0] cursor-pointer'
                  : 'bg-[#12182b] text-[#64748b] border-[#26324d] cursor-not-allowed'
              }`}
            >
              {cash >= visualCheckout.totalCost
                ? `Buy & Apply (${
                    visualCheckout.totalCost === 0
                      ? 'Free'
                      : formatCash(visualCheckout.totalCost)
                  })`
                : `Need ${formatCash(visualCheckout.totalCost)}`}
            </button>
          </div>
        )}
      </div>

      {/* Paint Coats */}
      <div className="arcade-panel p-3.5 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-pixel text-[10px] text-[#f5b82e]">BODY PAINT COAT</h4>
          <span className="text-xs text-[#94a3b8]">Live cel-shaded coat</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {PAINT_COLORS.map((p) => {
            const equipped = config.visuals.paintColor.toLowerCase() === p.hex.toLowerCase();
            const previewing =
              previewConfig.visuals.paintColor.toLowerCase() === p.hex.toLowerCase() && !equipped;
            return (
              <button
                key={p.hex}
                type="button"
                onClick={() => {
                  soundEngine.playUiClick();
                  onChangeDraft((prev) => ({ ...prev, paintColor: p.hex }));
                }}
                className={`arcade-btn rounded-xl p-2.5 border text-left flex items-center gap-2.5 cursor-pointer ${
                  previewing
                    ? 'bg-[#272445] border-[#facc15]'
                    : equipped
                    ? 'bg-[#132b23] border-[#22c55e]'
                    : 'bg-[#141d34] border-[#3c5080]/65 hover:border-[#facc15]'
                }`}
              >
                <span
                  className="w-6 h-6 rounded-full shrink-0 border-2 border-white/25 shadow-inner"
                  style={{ backgroundColor: p.hex }}
                />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-[#f7f3e3] truncate">{p.name}</div>
                  <div className="font-mono-num text-[11px] text-[#94a3b8]">
                    {previewing ? (
                      <span className="text-[#facc15] font-bold">
                        Preview · {p.cost === 0 ? 'Free' : formatCash(p.cost)}
                      </span>
                    ) : equipped ? (
                      <span className="text-[#4ade80]">Equipped</span>
                    ) : p.cost === 0 ? (
                      'Free'
                    ) : (
                      formatCash(p.cost)
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Racing Stripes & Decals */}
      <div className="arcade-panel p-3.5 space-y-3">
        <h4 className="font-pixel text-[10px] text-[#facc15]">RACING STRIPES &amp; DECALS</h4>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {STRIPE_OPTIONS.map((opt) => {
            const equipped = config.visuals.stripe === opt.id;
            const previewing = previewConfig.visuals.stripe === opt.id && !equipped;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  soundEngine.playUiClick();
                  onChangeDraft((prev) => ({ ...prev, stripe: opt.id }));
                }}
                className={`arcade-btn rounded-xl p-2.5 border text-left cursor-pointer ${
                  previewing
                    ? 'bg-[#272445] border-[#facc15]'
                    : equipped
                    ? 'bg-[#132b23] border-[#22c55e]'
                    : 'bg-[#141d34] border-[#3c5080]/65 hover:border-[#facc15]'
                }`}
              >
                <div className="text-xs font-bold text-[#f7f3e3]">{opt.name}</div>
                <div className="font-mono-num text-[11px] text-[#94a3b8] mt-1">
                  {previewing ? (
                    <span className="text-[#facc15] font-bold">
                      Preview · {opt.cost === 0 ? 'Free' : formatCash(opt.cost)}
                    </span>
                  ) : equipped ? (
                    <span className="text-[#4ade80]">Equipped</span>
                  ) : opt.cost === 0 ? (
                    'Free'
                  ) : (
                    formatCash(opt.cost)
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Drag Rims */}
      <div className="arcade-panel p-3.5 space-y-3">
        <h4 className="font-pixel text-[10px] text-[#facc15]">WHEEL RIMS</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {RIM_OPTIONS.map((opt) => {
            const equipped = config.visuals.rims === opt.id;
            const previewing = previewConfig.visuals.rims === opt.id && !equipped;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  soundEngine.playUiClick();
                  onChangeDraft((prev) => ({ ...prev, rims: opt.id }));
                }}
                className={`arcade-btn rounded-xl p-2.5 border text-left cursor-pointer ${
                  previewing
                    ? 'bg-[#272445] border-[#facc15]'
                    : equipped
                    ? 'bg-[#132b23] border-[#22c55e]'
                    : 'bg-[#141d34] border-[#3c5080]/65 hover:border-[#facc15]'
                }`}
              >
                <div className="text-xs font-bold text-[#f7f3e3]">{opt.name}</div>
                <div className="font-mono-num text-[11px] text-[#94a3b8] mt-1">
                  {previewing ? (
                    <span className="text-[#facc15] font-bold">
                      Preview · {opt.cost === 0 ? 'Free' : formatCash(opt.cost)}
                    </span>
                  ) : equipped ? (
                    <span className="text-[#4ade80]">Equipped</span>
                  ) : opt.cost === 0 ? (
                    'Free'
                  ) : (
                    formatCash(opt.cost)
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
