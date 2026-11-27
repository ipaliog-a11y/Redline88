import React, { useEffect, useMemo, useState } from 'react';
import { User } from 'firebase/auth';
import { soundEngine } from '../audio/soundEngine';
import {
  computeCarPerformance,
  formatCash,
  getCarById,
  getCarConfig,
  getEngineHealth,
  getEngineHealthStatus,
  getEngineRepairCost,
  getUpgradeImpactPreview,
  PAINT_COLORS,
  RIM_OPTIONS,
  STRIPE_OPTIONS,
} from '../data/gameData';
import { sanitizeCallsign } from '../services/firebase';
import {
  CarConfig,
  DrivetrainTuning,
  GarageTab,
  GlobalLeaderboardEntry,
  LocalRecord,
  PlayerSave,
  RimStyle,
  RivalSpec,
  StripDistanceId,
  StripeStyle,
  TierId,
  UpgradeKey,
} from '../types/game';
import { DrivetrainTuningPanel } from './DrivetrainTuningPanel';
import { CustomizeTab, VisualCheckoutSummary, VisualDraft } from './garage/CustomizeTab';
import { LeaderboardTab } from './garage/LeaderboardTab';
import { PartsShopTab } from './garage/PartsShopTab';
import { RaceStripTab } from './garage/RaceStripTab';
import { ShowroomTab } from './garage/ShowroomTab';
import { HiBitShowcaseCanvas } from './HiBitShowcaseCanvas';
import { PixelIcon, PixelIconName } from './PixelSpritesUI';
import { RaceReplayModal } from './RaceReplayModal';

interface GarageHubProps {
  save: PlayerSave;
  user: User | null;
  muted: boolean;
  localRecords: LocalRecord[];
  globalRecords: GlobalLeaderboardEntry[];
  globalLoading: boolean;
  globalError: string | null;
  onToggleMute: () => void;
  onSignIn: () => void;
  onSignOut: () => void;
  onRefreshGlobal: () => void;
  onUpdateCallsign: (callsign: string) => void;
  onSelectCar: (carId: string) => void;
  onBuyCar: (carId: string) => void;
  onBuyUpgrade: (carId: string, key: UpgradeKey) => void;
  onRepairEngine: (carId: string) => void;
  onUpdateTuning: (carId: string, tuning: DrivetrainTuning) => void;
  onBuyVisual: (
    carId: string,
    patch: { paintColor?: string; stripe?: StripeStyle; rims?: RimStyle },
    cost: number
  ) => void;
  onStartRace: (tierId: TierId, distanceId: StripDistanceId, rival: RivalSpec | null) => void;
}

const TABS: { id: GarageTab; label: string; shortLabel: string; icon: PixelIconName }[] = [
  { id: 'RACES', label: 'Race Strip', shortLabel: 'Race', icon: 'flag' },
  { id: 'SHOP', label: 'Parts Shop', shortLabel: 'Parts', icon: 'wrench' },
  { id: 'TUNING', label: 'Drivetrain', shortLabel: 'Tune', icon: 'gears' },
  { id: 'CUSTOMIZE', label: 'Paint & Mods', shortLabel: 'Paint', icon: 'paint' },
  { id: 'DEALER', label: 'Showroom', shortLabel: 'Cars', icon: 'car' },
  { id: 'LEADERBOARD', label: 'Leaderboards', shortLabel: 'Ranks', icon: 'trophy' },
];

export const GarageHub: React.FC<GarageHubProps> = ({
  save,
  user,
  muted,
  localRecords,
  globalRecords,
  globalLoading,
  globalError,
  onToggleMute,
  onSignIn,
  onSignOut,
  onRefreshGlobal,
  onUpdateCallsign,
  onSelectCar,
  onBuyCar,
  onBuyUpgrade,
  onRepairEngine,
  onUpdateTuning,
  onBuyVisual,
  onStartRace,
}) => {
  const [activeTab, setActiveTab] = useState<GarageTab>('RACES');
  const [selectedTier, setSelectedTier] = useState<TierId>(save.highestUnlockedTier);
  const [selectedDistance, setSelectedDistance] = useState<StripDistanceId>('quarter');
  const [callsignDraft, setCallsignDraft] = useState(save.callsign);

  // Parts Shop live preview state
  const [hoveredUpgrade, setHoveredUpgrade] = useState<UpgradeKey | null>(null);

  // Paint & Mods preview-before-buying state
  const [visualDraft, setVisualDraft] = useState<VisualDraft>({});

  // Mobile collapsible Dyno/Garage drawer
  const [mobileDynoOpen, setMobileDynoOpen] = useState<boolean>(false);

  // Track viewport breakpoint so hidden responsive canvases never waste RAF cycles
  const [isDesktop, setIsDesktop] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 1024px)').matches : true
  );

  // Active Local Record Replay modal
  const [replayRecord, setReplayRecord] = useState<LocalRecord | null>(null);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    setIsDesktop(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    setCallsignDraft(save.callsign);
  }, [save.callsign]);

  // Clear temporary previews when switching cars or leaving tabs
  useEffect(() => {
    setVisualDraft({});
    setHoveredUpgrade(null);
  }, [save.activeCarId, activeTab]);

  const car = getCarById(save.activeCarId);
  const config = getCarConfig(save, save.activeCarId);
  const engineHealth = getEngineHealth(config);
  const healthStatus = getEngineHealthStatus(engineHealth);
  const repairCost = getEngineRepairCost(car, config);
  const canAffordRepair = save.cash >= repairCost;
  const perf = useMemo(
    () => computeCarPerformance(save.activeCarId, config),
    [save.activeCarId, config]
  );

  // Compute effective Dyno preview config (applies Paint/Mod preview OR Parts Shop hover preview)
  const activeUpgradePreview = useMemo(() => {
    if (activeTab !== 'SHOP' || !hoveredUpgrade) return null;
    return getUpgradeImpactPreview(save.activeCarId, config, hoveredUpgrade);
  }, [activeTab, hoveredUpgrade, save.activeCarId, config]);

  const previewConfig: CarConfig = useMemo(() => {
    const nextUpgrades =
      activeUpgradePreview && hoveredUpgrade
        ? { ...config.upgrades, [hoveredUpgrade]: activeUpgradePreview.nextLevel }
        : config.upgrades;

    const nextVisuals =
      activeTab === 'CUSTOMIZE'
        ? {
            paintColor: visualDraft.paintColor ?? config.visuals.paintColor,
            stripe: visualDraft.stripe ?? config.visuals.stripe,
            rims: visualDraft.rims ?? config.visuals.rims,
          }
        : config.visuals;

    return {
      upgrades: nextUpgrades,
      visuals: nextVisuals,
      tuning: config.tuning,
      engineHealth: config.engineHealth,
    };
  }, [activeTab, activeUpgradePreview, hoveredUpgrade, config, visualDraft]);

  // Calculate pending visual preview checkout changes & cost
  const visualCheckout: VisualCheckoutSummary = useMemo(() => {
    const patch: VisualDraft = {};
    const items: { label: string; cost: number }[] = [];
    let totalCost = 0;

    if (
      visualDraft.paintColor &&
      visualDraft.paintColor.toLowerCase() !== config.visuals.paintColor.toLowerCase()
    ) {
      const paintOpt = PAINT_COLORS.find(
        (p) => p.hex.toLowerCase() === visualDraft.paintColor!.toLowerCase()
      );
      if (paintOpt) {
        patch.paintColor = paintOpt.hex;
        items.push({ label: `Paint: ${paintOpt.name}`, cost: paintOpt.cost });
        totalCost += paintOpt.cost;
      }
    }

    if (visualDraft.stripe && visualDraft.stripe !== config.visuals.stripe) {
      const stripeOpt = STRIPE_OPTIONS.find((s) => s.id === visualDraft.stripe);
      if (stripeOpt) {
        patch.stripe = stripeOpt.id;
        items.push({ label: `Decal: ${stripeOpt.name}`, cost: stripeOpt.cost });
        totalCost += stripeOpt.cost;
      }
    }

    if (visualDraft.rims && visualDraft.rims !== config.visuals.rims) {
      const rimOpt = RIM_OPTIONS.find((r) => r.id === visualDraft.rims);
      if (rimOpt) {
        patch.rims = rimOpt.id;
        items.push({ label: `Rims: ${rimOpt.name}`, cost: rimOpt.cost });
        totalCost += rimOpt.cost;
      }
    }

    return { patch, items, totalCost, hasChanges: items.length > 0 };
  }, [visualDraft, config.visuals]);

  const handleSaveCallsign = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = sanitizeCallsign(callsignDraft);
    setCallsignDraft(cleaned);
    onUpdateCallsign(cleaned);
    soundEngine.playUiClick();
  };

  const handleSelectTab = (tabId: GarageTab) => {
    soundEngine.playUiClick();
    setActiveTab(tabId);
    setMobileDynoOpen(false);
    if (tabId === 'LEADERBOARD') {
      onRefreshGlobal();
    }
  };

  // Live preview deltas for left Dyno panel
  const previewHpDiff = activeUpgradePreview ? activeUpgradePreview.nextPerf.hp - perf.hp : 0;
  const previewWeightDiff = activeUpgradePreview
    ? activeUpgradePreview.nextPerf.weightLbs - perf.weightLbs
    : 0;
  const previewGripDiff = activeUpgradePreview
    ? Number((activeUpgradePreview.nextPerf.grip - perf.grip).toFixed(2))
    : 0;
  const previewEtDiff = activeUpgradePreview
    ? Number((activeUpgradePreview.nextPerf.estimatedEtSec - perf.estimatedEtSec).toFixed(2))
    : 0;
  const previewBoostDiff = activeUpgradePreview
    ? Math.round((activeUpgradePreview.nextPerf.shiftBoostMult - perf.shiftBoostMult) * 100)
    : 0;
  const previewNosDiff = activeUpgradePreview
    ? activeUpgradePreview.nextPerf.nitrousShots - perf.nitrousShots
    : 0;

  // Only mount visible 2D pixel canvases and pause them during Replay Theater
  const mountLeftPitBay = (isDesktop || mobileDynoOpen) && !replayRecord;
  const mountMobilePaintBay =
    !isDesktop && !mobileDynoOpen && activeTab === 'CUSTOMIZE' && !replayRecord;
  const mountShowroomTurntable = activeTab === 'DEALER' && !mobileDynoOpen && !replayRecord;

  return (
    <div className="h-[100dvh] w-full bg-[#111623] text-[#f8fafc] flex flex-col overflow-hidden">
      {/* Sleek Modern Header Bar */}
      <header className="shrink-0 bg-[#171f33] border-b border-[#4d6599]/40 px-3 sm:px-5 py-2.5 flex items-center justify-between gap-2 sm:gap-4">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <div className="flex items-center gap-2 shrink-0">
            <PixelIcon name="flag" className="w-5 h-5 hidden sm:block" />
            <span className="font-pixel text-[11px] sm:text-base text-[#f5b82e] pixel-text-shadow whitespace-nowrap">
              REDLINE &apos;88
            </span>
          </div>
          <div className="hidden md:flex items-center gap-2 text-xs text-[#94a3b8] font-mono-num whitespace-nowrap">
            <span className="text-[#f5b82e] font-bold">{save.callsign}</span>
            <span>·</span>
            <span>TIER {save.highestUnlockedTier}/5</span>
            <span>·</span>
            <span className="text-[#22c55e] font-bold">{save.totalWins} WINS</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Cash Bankroll */}
          <div className="led-readout rounded-full px-3 sm:px-4 py-1 sm:py-1.5 font-mono-num text-xs sm:text-base font-bold text-[#22c55e] flex items-center gap-1.5 whitespace-nowrap">
            <PixelIcon name="coin" className="w-4 h-4" />
            <span>{formatCash(save.cash)}</span>
          </div>

          {user && !user.emailVerified && (
            <span
              title="Verify your email to enable cloud sync and global leaderboards"
              className="hidden sm:inline-flex items-center rounded-full px-2.5 py-1 bg-[#2c2414] border border-[#f5b82e]/70 text-[10px] font-mono-num font-bold text-[#fef08a] whitespace-nowrap"
            >
              Unverified Email
            </span>
          )}

          {user ? (
            <button
              type="button"
              onClick={onSignOut}
              aria-label="Sign out"
              className="arcade-btn rounded-full h-9 sm:h-10 px-3 sm:px-3.5 bg-[#151e33] hover:bg-[#232f4d] border border-[#526ba3]/60 text-xs font-bold text-[#cbd5e1] flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <PixelIcon name="logout" className="w-4 h-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onSignIn}
              className="arcade-btn rounded-full h-9 sm:h-10 px-3 sm:px-4 bg-[#26233d] hover:bg-[#322e52] border border-[#f5b82e]/85 text-xs font-bold text-[#fef08a] flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <PixelIcon name="login" className="w-4 h-4" />
              <span className="hidden sm:inline">Sign In</span>
            </button>
          )}

          <button
            type="button"
            onClick={onToggleMute}
            aria-label={muted ? 'Unmute audio' : 'Mute audio'}
            className="arcade-btn rounded-full h-9 w-9 sm:h-10 sm:w-10 flex items-center justify-center bg-[#151e33] border border-[#526ba3]/60 hover:border-[#f5b82e] cursor-pointer"
          >
            <PixelIcon name={muted ? 'soundOff' : 'soundOn'} className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Mobile Compact Active Car Bar (toggles Pit Dyno & Garage Switcher without blocking menus) */}
      <div className="lg:hidden shrink-0 bg-[#0f1524] border-b border-[#3c4d73]/50 px-3 py-1.5 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => {
            soundEngine.playUiClick();
            setMobileDynoOpen((v) => !v);
          }}
          className="flex-1 min-w-0 flex items-center justify-between gap-2 text-left cursor-pointer"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="w-3.5 h-3.5 rounded-full shrink-0 border border-white/30"
              style={{ backgroundColor: config.visuals.paintColor }}
            />
            <div className="min-w-0">
              <div className="text-xs font-bold text-[#f8fafc] truncate">
                {car.name}
                <span className="font-mono-num text-[11px] font-normal text-[#94a3b8] ml-1.5">
                  T{car.tier} · {perf.hp.toLocaleString()} HP · {perf.estimatedEtSec.toFixed(2)}s ·{' '}
                  <span style={{ color: healthStatus.color }} className="font-bold">
                    {engineHealth}% ENG
                  </span>
                </span>
              </div>
            </div>
          </div>
          <span className="shrink-0 arcade-inset rounded-full px-2.5 py-0.5 font-mono-num text-[10px] font-bold text-[#f5b82e] uppercase">
            {mobileDynoOpen ? '▲ Close Bay' : '▼ Pit Dyno'}
          </span>
        </button>
      </div>

      {/* Main Split Paddock Layout */}
      <div className="flex-1 min-h-0 max-w-[1440px] w-full mx-auto flex flex-col lg:grid lg:grid-cols-12 lg:grid-rows-[minmax(0,1fr)] gap-3 lg:gap-4 p-2.5 sm:p-3 lg:p-4 overflow-hidden">
        {/* LEFT COLUMN: HI-BIT PIT GARAGE & DYNO TELEMETRY */}
        <aside
          className={`${
            mobileDynoOpen ? 'flex flex-1' : 'hidden'
          } lg:flex lg:col-span-4 flex-col gap-3 min-h-0 h-full overflow-y-auto overscroll-y-contain pr-0.5 lg:pr-1 pb-2`}
        >
          <div className="arcade-panel shrink-0 overflow-hidden">
            <div className="p-3.5 sm:p-4 space-y-3.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base sm:text-lg font-bold text-[#f7f3e3] leading-tight arcade-shadow-text">
                      {car.name}
                    </h2>
                    {(visualCheckout.hasChanges || activeUpgradePreview) && (
                      <span className="font-pixel text-[8px] text-[#facc15] bg-[#0e1422] border border-[#facc15]/80 rounded-full px-2 py-0.5">
                        PREVIEW
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#94a3b8] mt-0.5">
                    Tier {car.tier} · {car.subtitle}
                  </p>
                </div>
                <div className="led-readout px-3 py-1.5 text-right font-mono-num shrink-0">
                  <div className="text-[9px] text-[#94a3b8]">EST. 1/4 MI</div>
                  <div className="text-sm sm:text-base font-bold text-[#facc15] leading-tight">
                    {activeUpgradePreview
                      ? activeUpgradePreview.nextPerf.estimatedEtSec.toFixed(2)
                      : perf.estimatedEtSec.toFixed(2)}
                    s
                  </div>
                  {previewEtDiff < 0 && (
                    <div className="text-[10px] font-bold text-[#22c55e]">
                      {previewEtDiff.toFixed(2)}s
                    </div>
                  )}
                </div>
              </div>

              {/* Hi-Bit 2D Pit Garage Dyno Bay */}
              <div className="w-full aspect-[2/1] arcade-inset rounded-2xl overflow-hidden relative">
                {mountLeftPitBay ? (
                  <HiBitShowcaseCanvas
                    mode="pitbay"
                    chassis={car.chassis}
                    bodyVariant={car.bodyVariant}
                    visuals={previewConfig.visuals}
                    upgrades={previewConfig.upgrades}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-mono-num text-xs text-[#64748b]">
                    PIT BAY STANDBY
                  </div>
                )}
                <div className="pointer-events-none absolute top-2 left-2 bg-[#0e1422]/88 border border-[#5670a6]/55 rounded-full px-2.5 py-0.5 font-pixel text-[8px] text-[#f5b82e] backdrop-blur-sm">
                  PIT DYNO BAY
                </div>
              </div>

              {/* Engine Health Indicator & Repair Bay */}
              <div
                className={`led-readout p-2.5 space-y-2 ${
                  engineHealth < 50
                    ? 'border-[#ff4d3d]/70'
                    : engineHealth < 80
                    ? 'border-[#f5b82e]/65'
                    : ''
                }`}
              >
                <div className="flex items-center justify-between gap-2 font-mono-num">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-wide text-[#94a3b8]">
                    <PixelIcon name="wrench" className="w-3.5 h-3.5" />
                    <span>ENGINE HEALTH</span>
                  </div>
                  <div
                    className="text-xs font-bold whitespace-nowrap"
                    style={{ color: healthStatus.color }}
                  >
                    {engineHealth}% · {healthStatus.label}
                  </div>
                </div>

                <div
                  role="progressbar"
                  aria-label="Engine health"
                  aria-valuenow={engineHealth}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  className="w-full h-2 rounded-full bg-[#090d18] border border-[#2c3a59]/80 overflow-hidden"
                >
                  <div
                    className="h-full rounded-full transition-[width] duration-300"
                    style={{
                      width: `${engineHealth}%`,
                      backgroundColor: healthStatus.color,
                    }}
                  />
                </div>

                <div className="flex items-center justify-between gap-2 font-mono-num">
                  <div className="text-[11px] leading-tight min-w-0">
                    {perf.wearPenaltyPct > 0 ? (
                      <span style={{ color: healthStatus.color }} className="font-bold">
                        -{perf.wearPenaltyPct}% HP ({perf.hp - perf.rawHp} HP wear)
                      </span>
                    ) : (
                      <span className="text-[#94a3b8]">
                        {engineHealth < 100 ? 'Full Power · Minor Wear' : 'Peak Compression'}
                      </span>
                    )}
                  </div>

                  {engineHealth < 100 ? (
                    <button
                      type="button"
                      disabled={!canAffordRepair}
                      onClick={() => {
                        soundEngine.playShopBuy();
                        onRepairEngine(car.id);
                      }}
                      className={`arcade-btn rounded-full min-h-[32px] px-3 py-1 text-[11px] font-bold border whitespace-nowrap shrink-0 cursor-pointer ${
                        canAffordRepair
                          ? engineHealth < 80
                            ? 'bg-gradient-to-b from-[#22c55e] to-[#16a34a] text-[#09120c] border-[#bbf7d0]'
                            : 'bg-[#1e2d4a] hover:bg-[#273a5e] text-[#f8fafc] border-[#5b76b0]/80'
                          : 'bg-[#121828] text-[#64748b] border-[#2a3654] cursor-not-allowed'
                      }`}
                    >
                      Repair · {formatCash(repairCost)}
                    </button>
                  ) : (
                    <span className="text-[10px] font-bold text-[#22c55e] uppercase whitespace-nowrap">
                      Fresh
                    </span>
                  )}
                </div>
              </div>

              {/* Mechanic's Note (shown when Engine Health < 50%) */}
              {engineHealth < 50 && (
                <section
                  aria-label="Mechanic's Note"
                  className="rounded-2xl bg-[#24141b] border border-[#ff4d3d]/60 p-3 space-y-2 shadow-[0_6px_16px_rgba(8,10,20,0.35)]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 font-pixel text-[9px] text-[#fca5a5]">
                      <PixelIcon name="wrench" className="w-3.5 h-3.5 shrink-0" />
                      <span>MECHANIC&apos;S NOTE</span>
                    </div>
                    <span className="font-mono-num text-[10px] font-bold text-[#ff4d3d] whitespace-nowrap">
                      UNDER 50%
                    </span>
                  </div>
                  <p className="text-xs text-[#f1d5d9] leading-relaxed">
                    Your block is running hot and losing compression. Take it easy on the strip until
                    we can rebuild it:
                  </p>
                  <ul className="space-y-1 text-[11px] text-[#e2cbd0] leading-snug list-disc pl-4">
                    <li>
                      Shift right in the target RPM window—bouncing off redline adds heavy extra wear
                      each gear.
                    </li>
                    {perf.nitrousShots > 0 ? (
                      <li>
                        Hold off on Nitrous shots unless a rival forces your hand; bottle blasts
                        accelerate cylinder wear.
                      </li>
                    ) : (
                      <li>
                        Feather the throttle into the green launch arc instead of holding full
                        redline on the starting tree.
                      </li>
                    )}
                    <li>
                      Stick to shorter 1/4-mile passes while saving for a repair—or install an Engine
                      upgrade to reset health to 100%.
                    </li>
                  </ul>
                </section>
              )}

              {/* LED Performance Telemetry Grid */}
              <div className="grid grid-cols-2 gap-2 font-mono-num text-xs">
                <div className="led-readout p-2">
                  <div className="text-[#94a3b8] text-[10px]">HORSEPOWER</div>
                  <div className="text-sm sm:text-base font-bold text-[#f7f3e3] mt-0.5 flex items-baseline gap-1.5 flex-wrap">
                    <span>
                      {(activeUpgradePreview
                        ? activeUpgradePreview.nextPerf.hp
                        : perf.hp
                      ).toLocaleString()}{' '}
                      HP
                    </span>
                    {previewHpDiff > 0 ? (
                      <span className="text-[11px] text-[#22c55e]">
                        +{previewHpDiff.toLocaleString()}
                      </span>
                    ) : (
                      !activeUpgradePreview &&
                      perf.wearPenaltyPct > 0 && (
                        <span
                          className="text-[11px] font-bold"
                          style={{ color: healthStatus.color }}
                        >
                          -{perf.wearPenaltyPct}%
                        </span>
                      )
                    )}
                  </div>
                </div>
                <div className="led-readout p-2">
                  <div className="text-[#94a3b8] text-[10px]">CURB WEIGHT</div>
                  <div className="text-sm sm:text-base font-bold text-[#f7f3e3] mt-0.5 flex items-baseline gap-1.5 flex-wrap">
                    <span>
                      {(activeUpgradePreview
                        ? activeUpgradePreview.nextPerf.weightLbs
                        : perf.weightLbs
                      ).toLocaleString()}{' '}
                      LBS
                    </span>
                    {previewWeightDiff < 0 && (
                      <span className="text-[11px] text-[#22c55e]">{previewWeightDiff}</span>
                    )}
                  </div>
                </div>
                <div className="led-readout p-2">
                  <div className="text-[#94a3b8] text-[10px]">TIRE GRIP</div>
                  <div className="text-sm sm:text-base font-bold text-[#22c55e] mt-0.5 flex items-baseline gap-1.5 flex-wrap">
                    <span>
                      {(activeUpgradePreview
                        ? activeUpgradePreview.nextPerf.grip
                        : perf.grip
                      ).toFixed(2)}{' '}
                      G
                    </span>
                    {previewGripDiff > 0 && (
                      <span className="text-[11px] text-[#86efac]">
                        +{previewGripDiff.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="led-readout p-2">
                  <div className="text-[#94a3b8] text-[10px]">NITROUS / BOOST</div>
                  <div className="text-sm sm:text-base font-bold text-[#38bdf8] mt-0.5 flex items-baseline gap-1.5 flex-wrap">
                    <span>
                      {(activeUpgradePreview
                        ? activeUpgradePreview.nextPerf.nitrousShots
                        : perf.nitrousShots) > 0
                        ? `${
                            activeUpgradePreview
                              ? activeUpgradePreview.nextPerf.nitrousShots
                              : perf.nitrousShots
                          } NOS`
                        : 'None'}{' '}
                      · +
                      {Math.round(
                        ((activeUpgradePreview
                          ? activeUpgradePreview.nextPerf.shiftBoostMult
                          : perf.shiftBoostMult) -
                          1) *
                          100
                      )}
                      %
                    </span>
                    {(previewBoostDiff > 0 || previewNosDiff > 0) && (
                      <span className="text-[11px] text-[#22c55e]">
                        {previewNosDiff > 0 ? `+${previewNosDiff} NOS` : `+${previewBoostDiff}%`}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Projected Multi-Strip Speed & ET Strip */}
              <div className="grid grid-cols-3 gap-2 font-mono-num text-[11px]">
                <div className="led-readout px-2 py-1.5">
                  <div className="text-[#94a3b8] text-[9px]">EST. 1/2 MI</div>
                  <div className="font-bold text-[#38bdf8] mt-0.5">
                    {(activeUpgradePreview
                      ? activeUpgradePreview.nextPerf.estimatedHalfEtSec
                      : perf.estimatedHalfEtSec
                    ).toFixed(2)}
                    s
                  </div>
                </div>
                <div className="led-readout px-2 py-1.5">
                  <div className="text-[#94a3b8] text-[9px]">EST. 1 MILE</div>
                  <div className="font-bold text-[#c084fc] mt-0.5">
                    {(activeUpgradePreview
                      ? activeUpgradePreview.nextPerf.estimatedMileEtSec
                      : perf.estimatedMileEtSec
                    ).toFixed(2)}
                    s
                  </div>
                </div>
                <div className="led-readout px-2 py-1.5">
                  <div className="text-[#94a3b8] text-[9px]">GEAR TOP</div>
                  <div className="font-bold text-[#f7f3e3] mt-0.5">
                    {activeUpgradePreview
                      ? activeUpgradePreview.nextPerf.topSpeedMph
                      : perf.topSpeedMph}{' '}
                    MPH
                  </div>
                </div>
              </div>

              {/* Garage Car Switcher (only shown if player owns > 1 car) */}
              {save.ownedCars.length > 1 && (
                <div className="pt-2.5 border-t border-[#2b3859]/70 space-y-2">
                  <div className="font-pixel text-[9px] text-[#94a3b8]">YOUR GARAGE</div>
                  <div className="flex flex-wrap gap-1.5">
                    {save.ownedCars.map((cid) => {
                      const spec = getCarById(cid);
                      const active = cid === save.activeCarId;
                      return (
                        <button
                          key={cid}
                          type="button"
                          onClick={() => {
                            soundEngine.playUiClick();
                            onSelectCar(cid);
                          }}
                          className={`arcade-btn rounded-full px-3 py-1.5 text-xs font-bold border whitespace-nowrap cursor-pointer ${
                            active
                              ? 'bg-[#ef3b2d] text-white border-[#facc15]'
                              : 'bg-[#172038] text-[#cbd5e1] border-[#3d5282]/70 hover:border-[#facc15]'
                          }`}
                        >
                          T{spec.tier} · {spec.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Driver Callsign & Controls Plaque */}
          <div className="arcade-panel shrink-0 p-3.5 space-y-3">
            <form onSubmit={handleSaveCallsign} className="space-y-1.5">
              <label
                htmlFor="callsign-input"
                className="block font-pixel text-[9px] text-[#facc15]"
              >
                DRIVER CALLSIGN
              </label>
              <div className="flex gap-2">
                <input
                  id="callsign-input"
                  type="text"
                  maxLength={18}
                  value={callsignDraft}
                  onChange={(e) => setCallsignDraft(e.target.value)}
                  className="flex-1 min-w-0 arcade-inset rounded-full focus:border-[#facc15] focus:outline-none px-3.5 py-1.5 text-sm font-mono-num text-[#f7f3e3]"
                />
                <button
                  type="submit"
                  className="arcade-btn rounded-full px-4 py-1.5 bg-[#223052] hover:bg-[#2c3f6b] border border-[#5b76b0]/75 text-xs font-bold text-[#f7f3e3] whitespace-nowrap cursor-pointer"
                >
                  SAVE
                </button>
              </div>
            </form>
            <div className="text-xs text-[#94a3b8] leading-relaxed border-t border-[#2b3859]/70 pt-2.5">
              Hold <span className="text-[#f7f3e3] font-mono-num font-bold">SHIFT</span> (Clutch) +{' '}
              <span className="text-[#f7f3e3] font-mono-num font-bold">W</span> (Gas) in green launch
              zone, release on Green, tap{' '}
              <span className="text-[#facc15] font-mono-num font-bold">SPACE</span> at peak RPM for a
              boost surge.
            </div>
          </div>
        </aside>

        {/* RIGHT COLUMN: SLEEK HUB TABS & CONTENT */}
        <section
          className={`${
            mobileDynoOpen ? 'hidden' : 'flex flex-1'
          } lg:flex lg:col-span-8 flex-col min-h-0 h-full`}
        >
          {/* Desktop Rounded Pill Tab Strip */}
          <div className="hidden lg:flex shrink-0 items-center gap-1.5 arcade-panel rounded-2xl p-1.5 mb-3.5 overflow-x-auto no-scrollbar">
            {TABS.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleSelectTab(tab.id)}
                  className={`arcade-btn rounded-xl flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap shrink-0 cursor-pointer border ${
                    active
                      ? 'bg-gradient-to-b from-[#ff5a4a] to-[#e6392a] text-white border-[#facc15] arcade-shadow-text'
                      : 'bg-[#141c32] text-[#cbd5e1] border-[#3c5080]/55 hover:border-[#6884bf] hover:text-white'
                  }`}
                >
                  <PixelIcon name={tab.icon} className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Scrollable Tab Body */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain pr-0.5 lg:pr-1 pb-2 space-y-3 lg:space-y-3.5">
            {engineHealth < 50 && (
              <section
                aria-label="Mechanic's Note"
                className="lg:hidden rounded-2xl bg-[#24141b] border border-[#ff4d3d]/60 p-3 space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 font-pixel text-[9px] text-[#fca5a5]">
                    <PixelIcon name="wrench" className="w-3.5 h-3.5 shrink-0" />
                    <span>MECHANIC&apos;S NOTE · {engineHealth}% ENG</span>
                  </div>
                  <button
                    type="button"
                    disabled={!canAffordRepair}
                    onClick={() => {
                      soundEngine.playShopBuy();
                      onRepairEngine(car.id);
                    }}
                    className={`arcade-btn rounded-full px-2.5 py-1 font-mono-num text-[10px] font-bold border whitespace-nowrap shrink-0 cursor-pointer ${
                      canAffordRepair
                        ? 'bg-[#22c55e] text-[#09120c] border-[#bbf7d0]'
                        : 'bg-[#121828] text-[#64748b] border-[#2a3654] cursor-not-allowed'
                    }`}
                  >
                    Repair · {formatCash(repairCost)}
                  </button>
                </div>
                <p className="text-xs text-[#f1d5d9] leading-snug">
                  Drive gently until repaired: shift before redline,{' '}
                  {perf.nitrousShots > 0
                    ? 'save Nitrous for close rivals, '
                    : 'feather launches in the green RPM arc, '}
                  and run shorter 1/4-mile passes to minimize engine wear.
                </p>
              </section>
            )}

            {activeTab === 'RACES' && (
              <RaceStripTab
                save={save}
                selectedTier={selectedTier}
                selectedDistance={selectedDistance}
                onSelectTier={setSelectedTier}
                onSelectDistance={setSelectedDistance}
                onOpenTuning={() => handleSelectTab('TUNING')}
                onStartRace={onStartRace}
              />
            )}

            {activeTab === 'SHOP' && (
              <PartsShopTab
                car={car}
                config={config}
                cash={save.cash}
                hoveredUpgrade={hoveredUpgrade}
                onHoverUpgrade={setHoveredUpgrade}
                onBuyUpgrade={onBuyUpgrade}
              />
            )}

            {activeTab === 'TUNING' && (
              <DrivetrainTuningPanel
                carId={car.id}
                config={config}
                onUpdateTuning={onUpdateTuning}
              />
            )}

            {activeTab === 'CUSTOMIZE' && (
              <CustomizeTab
                car={car}
                config={config}
                previewConfig={previewConfig}
                cash={save.cash}
                mountMobilePaintBay={mountMobilePaintBay}
                visualCheckout={visualCheckout}
                onChangeDraft={setVisualDraft}
                onResetDraft={() => setVisualDraft({})}
                onBuyVisual={onBuyVisual}
              />
            )}

            {activeTab === 'DEALER' && (
              <ShowroomTab
                save={save}
                mountTurntable={mountShowroomTurntable}
                onSelectCar={onSelectCar}
                onBuyCar={onBuyCar}
              />
            )}

            {activeTab === 'LEADERBOARD' && (
              <LeaderboardTab
                user={user}
                localRecords={localRecords}
                globalRecords={globalRecords}
                globalLoading={globalLoading}
                globalError={globalError}
                onSignIn={onSignIn}
                onRefreshGlobal={onRefreshGlobal}
                onWatchReplay={setReplayRecord}
              />
            )}
          </div>
        </section>
      </div>

      {/* Mobile Fixed Bottom Thumb Navigation Bar */}
      <nav
        aria-label="Garage sections"
        className="lg:hidden shrink-0 bg-[#171f33] border-t border-[#4d6599]/40 grid grid-cols-6 gap-1 px-1.5 py-1 pb-[max(0.25rem,env(safe-area-inset-bottom))]"
      >
        {TABS.map((tab) => {
          const active = activeTab === tab.id && !mobileDynoOpen;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleSelectTab(tab.id)}
              className={`min-h-[48px] rounded-xl flex flex-col items-center justify-center gap-0.5 px-1 transition-colors cursor-pointer ${
                active
                  ? 'bg-gradient-to-b from-[#ff5a4a] to-[#e6392a] text-white border border-[#f5b82e]/85 shadow-sm'
                  : 'text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[#1f2942]'
              }`}
            >
              <PixelIcon name={tab.icon} className="w-4 h-4" />
              <span className="text-[10px] font-bold leading-none whitespace-nowrap">
                {tab.shortLabel}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Hi-Bit Pixel Race Replay Theater Modal */}
      {replayRecord && (
        <RaceReplayModal
          record={replayRecord}
          onClose={() => {
            soundEngine.playUiClick();
            setReplayRecord(null);
          }}
        />
      )}
    </div>
  );
};
