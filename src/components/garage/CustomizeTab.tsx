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
      {/* Inline Live Hi-Bit Paint Preview on Mobile (desktop sees top Hero Pit Bay) */}
      {mountMobilePaintBay && (
        <div className="lg:hidden ng-plate p-1.5">
          <div className="w-full aspect-[2/1] ng-vfd overflow-hidden">
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

      {/* Spray Booth Checkout Bar */}
      <div
        className={`${
          visualCheckout.hasChanges ? 'ng-plate-gold' : 'ng-plate'
        } p-3 flex flex-wrap items-center justify-between gap-3`}
      >
        <div className="space-y-0.5 min-w-0">
          <div className="font-pixel text-[9px] sm:text-[10px] text-[#f7b519]">
            {visualCheckout.hasChanges
              ? 'SPRAY BOOTH PREVIEW ACTIVE'
              : 'SELECT PAINT, DECAL, OR RIMS TO PREVIEW LIVE'}
          </div>
          {visualCheckout.hasChanges ? (
            <div className="text-xs font-mono-num text-[#f4ecd8] flex flex-wrap items-center gap-x-2">
              {visualCheckout.items.map((item, idx) => (
                <span key={item.label}>
                  {idx > 0 && <span className="text-[#525866] mr-2">·</span>}
                  {item.label} ({item.cost === 0 ? 'FREE' : formatCash(item.cost)})
                </span>
              ))}
            </div>
          ) : (
            <div className="text-xs font-mono-num text-[#b8c0cc]">
              Nothing is charged until you press APPLY PAINT.
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
              className="ng-keycap px-3.5 py-2 bg-[#2c2935] hover:bg-[#3a3647] border-2 border-[#525866] text-xs font-mono-num font-bold text-[#f4ecd8] whitespace-nowrap cursor-pointer"
            >
              RESET
            </button>
            <button
              type="button"
              disabled={cash < visualCheckout.totalCost}
              onClick={() => {
                soundEngine.playShopBuy();
                onBuyVisual(car.id, visualCheckout.patch, visualCheckout.totalCost);
                onResetDraft();
              }}
              className="ng-chevron-cta cursor-pointer"
            >
              <span className="ng-chevron-inner font-pixel text-[9px] whitespace-nowrap">
                {cash >= visualCheckout.totalCost
                  ? `APPLY (${
                      visualCheckout.totalCost === 0
                        ? 'FREE'
                        : formatCash(visualCheckout.totalCost)
                    })`
                  : `NEED ${formatCash(visualCheckout.totalCost)}`}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Paint Coats */}
      <div className="ng-plate overflow-hidden">
        <div className="bg-[#18161e] border-b-2 border-[#323642] px-3 py-1.5 flex items-center justify-between">
          <h4 className="font-pixel text-[9px] text-[#f7b519]">BODY PAINT COAT</h4>
          <span className="font-mono-num text-[10px] text-[#19d4e6]">HI-BIT CEL FINISH</span>
        </div>
        <div className="p-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
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
                className={`ng-keycap p-2 border-2 text-left flex items-center gap-2.5 cursor-pointer ${
                  previewing
                    ? 'bg-[#2e2738] border-[#f7b519]'
                    : equipped
                    ? 'bg-[#162b22] border-[#2ee66b]'
                    : 'bg-[#18161e] border-[#3a3e4d] hover:border-[#f7b519]'
                }`}
              >
                <span
                  className="w-6 h-6 shrink-0 border-2 border-[#141218] shadow-[inset_1px_1px_0_rgba(255,255,255,0.4)]"
                  style={{ backgroundColor: p.hex }}
                />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-[#f4ecd8] truncate">{p.name}</div>
                  <div className="font-mono-num text-[10px] text-[#b8c0cc]">
                    {previewing ? (
                      <span className="text-[#f7b519] font-bold">
                        PREVIEW · {p.cost === 0 ? 'FREE' : formatCash(p.cost)}
                      </span>
                    ) : equipped ? (
                      <span className="text-[#2ee66b] font-bold">EQUIPPED</span>
                    ) : p.cost === 0 ? (
                      'FREE'
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
      <div className="ng-plate overflow-hidden">
        <div className="bg-[#18161e] border-b-2 border-[#323642] px-3 py-1.5">
          <h4 className="font-pixel text-[9px] text-[#f7b519]">RACING STRIPES &amp; DECALS</h4>
        </div>
        <div className="p-3 grid grid-cols-2 sm:grid-cols-5 gap-2">
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
                className={`ng-keycap p-2.5 border-2 text-left cursor-pointer ${
                  previewing
                    ? 'bg-[#2e2738] border-[#f7b519]'
                    : equipped
                    ? 'bg-[#162b22] border-[#2ee66b]'
                    : 'bg-[#18161e] border-[#3a3e4d] hover:border-[#f7b519]'
                }`}
              >
                <div className="text-xs font-bold text-[#f4ecd8]">{opt.name}</div>
                <div className="font-mono-num text-[10px] text-[#b8c0cc] mt-1">
                  {previewing ? (
                    <span className="text-[#f7b519] font-bold">
                      PREVIEW · {opt.cost === 0 ? 'FREE' : formatCash(opt.cost)}
                    </span>
                  ) : equipped ? (
                    <span className="text-[#2ee66b] font-bold">EQUIPPED</span>
                  ) : opt.cost === 0 ? (
                    'FREE'
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
      <div className="ng-plate overflow-hidden">
        <div className="bg-[#18161e] border-b-2 border-[#323642] px-3 py-1.5">
          <h4 className="font-pixel text-[9px] text-[#f7b519]">DRAG WHEEL RIMS</h4>
        </div>
        <div className="p-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
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
                className={`ng-keycap p-2.5 border-2 text-left cursor-pointer ${
                  previewing
                    ? 'bg-[#2e2738] border-[#f7b519]'
                    : equipped
                    ? 'bg-[#162b22] border-[#2ee66b]'
                    : 'bg-[#18161e] border-[#3a3e4d] hover:border-[#f7b519]'
                }`}
              >
                <div className="text-xs font-bold text-[#f4ecd8]">{opt.name}</div>
                <div className="font-mono-num text-[10px] text-[#b8c0cc] mt-1">
                  {previewing ? (
                    <span className="text-[#f7b519] font-bold">
                      PREVIEW · {opt.cost === 0 ? 'FREE' : formatCash(opt.cost)}
                    </span>
                  ) : equipped ? (
                    <span className="text-[#2ee66b] font-bold">EQUIPPED</span>
                  ) : opt.cost === 0 ? (
                    'FREE'
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
