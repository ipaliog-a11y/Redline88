import React, { useEffect, useMemo, useState } from 'react';
import { User } from 'firebase/auth';
import { soundEngine } from '../audio/soundEngine';
import {
  computeCarPerformance,
  createDefaultCarConfig,
  formatCash,
  formatEt,
  getCarById,
  getCarCharacteristics,
  getCarConfig,
  getCarsByTier,
  getStripDistanceSpec,
  getTierById,
  getUpgradeCost,
  getUpgradeImpactPreview,
  PAINT_COLORS,
  resolveTimeOfDay,
  RIM_OPTIONS,
  RIVALS,
  STRIP_DISTANCES,
  STRIPE_OPTIONS,
  TIERS,
  TIME_OF_DAY_OPTIONS,
  UPGRADE_CATEGORIES,
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
  TimeOfDayMode,
  UpgradeKey,
} from '../types/game';
import { DrivetrainTuningPanel } from './DrivetrainTuningPanel';
import { HiBitShowcaseCanvas } from './HiBitShowcaseCanvas';
import {
  PixelIcon,
  PixelIconName,
  PixelPartSprite,
  PixelRivalPortrait,
} from './PixelSpritesUI';
import { RaceReplayModal } from './RaceReplayModal';

interface GarageHubProps {
  save: PlayerSave;
  user: User | null;
  muted: boolean;
  timeOfDayMode: TimeOfDayMode;
  localRecords: LocalRecord[];
  globalRecords: GlobalLeaderboardEntry[];
  globalLoading: boolean;
  globalError: string | null;
  onToggleMute: () => void;
  onChangeTimeOfDayMode: (mode: TimeOfDayMode) => void;
  onSignIn: () => void;
  onSignOut: () => void;
  onRefreshGlobal: () => void;
  onUpdateCallsign: (callsign: string) => void;
  onSelectCar: (carId: string) => void;
  onBuyCar: (carId: string) => void;
  onBuyUpgrade: (carId: string, key: UpgradeKey) => void;
  onUpdateTuning: (carId: string, tuning: DrivetrainTuning) => void;
  onBuyVisual: (
    carId: string,
    patch: { paintColor?: string; stripe?: StripeStyle; rims?: RimStyle },
    cost: number
  ) => void;
  onStartRace: (tierId: TierId, distanceId: StripDistanceId, rival: RivalSpec | null) => void;
}

export const GarageHub: React.FC<GarageHubProps> = ({
  save,
  user,
  muted,
  timeOfDayMode,
  localRecords,
  globalRecords,
  globalLoading,
  globalError,
  onToggleMute,
  onChangeTimeOfDayMode,
  onSignIn,
  onSignOut,
  onRefreshGlobal,
  onUpdateCallsign,
  onSelectCar,
  onBuyCar,
  onBuyUpgrade,
  onUpdateTuning,
  onBuyVisual,
  onStartRace,
}) => {
  const [activeTab, setActiveTab] = useState<GarageTab>('RACES');
  const [selectedTier, setSelectedTier] = useState<TierId>(save.highestUnlockedTier);
  const [selectedDistance, setSelectedDistance] = useState<StripDistanceId>('quarter');
  const [boardScope, setBoardScope] = useState<'GLOBAL' | 'LOCAL'>('GLOBAL');
  const [boardTierFilter, setBoardTierFilter] = useState<number>(0); // 0 = All
  const [boardDistanceFilter, setBoardDistanceFilter] = useState<StripDistanceId>('quarter');
  const [callsignDraft, setCallsignDraft] = useState(save.callsign);

  // Parts Shop live preview state
  const [hoveredUpgrade, setHoveredUpgrade] = useState<UpgradeKey | null>(null);

  // Paint & Mods preview-before-buying state
  const [visualDraft, setVisualDraft] = useState<{
    paintColor?: string;
    stripe?: StripeStyle;
    rims?: RimStyle;
  }>({});

  // 3D Car Showroom turntable state
  const [showroomTier, setShowroomTier] = useState<TierId>(() => getCarById(save.activeCarId).tier);
  const [showroomCarId, setShowroomCarId] = useState<string>(save.activeCarId);
  const [turntableSpinning, setTurntableSpinning] = useState<boolean>(true);
  const [showroomSpecMode, setShowroomSpecMode] = useState<'CURRENT' | 'MAXED'>('CURRENT');
  const [snapQuarterTick, setSnapQuarterTick] = useState<number>(0);

  // Mobile collapsible Dyno/Garage drawer
  const [mobileDynoOpen, setMobileDynoOpen] = useState<boolean>(false);

  // Track viewport breakpoint so hidden responsive WebGL viewports never waste GPU contexts
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
  const perf = useMemo(() => computeCarPerformance(save.activeCarId, config), [save.activeCarId, config]);
  const tierSpec = getTierById(selectedTier);

  // Compute effective Dyno preview config (applies Paint/Mod preview OR Parts Shop hover preview!)
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
    };
  }, [activeTab, activeUpgradePreview, hoveredUpgrade, config, visualDraft]);

  // Calculate pending visual preview checkout changes & cost
  const visualCheckout = useMemo(() => {
    const patch: { paintColor?: string; stripe?: StripeStyle; rims?: RimStyle } = {};
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

  // Showroom Car & Config
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

  const distSpec = getStripDistanceSpec(selectedDistance);
  const boardDistSpec = getStripDistanceSpec(boardDistanceFilter);

  const tierRivals = useMemo(
    () => RIVALS.filter((r) => r.tier === selectedTier && r.distance === selectedDistance),
    [selectedTier, selectedDistance]
  );

  const filteredGlobal = useMemo(() => {
    const byDist = globalRecords.filter((e) => (e.distance ?? 'quarter') === boardDistanceFilter);
    const list =
      boardTierFilter === 0 ? byDist : byDist.filter((e) => e.tier === boardTierFilter);
    return list.slice(0, 50);
  }, [globalRecords, boardTierFilter, boardDistanceFilter]);

  const filteredLocal = useMemo(() => {
    const byDist = localRecords.filter((e) => (e.distance ?? 'quarter') === boardDistanceFilter);
    const list =
      boardTierFilter === 0 ? byDist : byDist.filter((e) => e.tier === boardTierFilter);
    return list.slice(0, 50);
  }, [localRecords, boardTierFilter, boardDistanceFilter]);

  const handleSaveCallsign = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = sanitizeCallsign(callsignDraft);
    setCallsignDraft(cleaned);
    onUpdateCallsign(cleaned);
    soundEngine.playUiClick();
  };

  const tabs: { id: GarageTab; label: string; shortLabel: string; icon: PixelIconName }[] = [
    { id: 'RACES', label: 'Race Strip', shortLabel: 'Race', icon: 'flag' },
    { id: 'SHOP', label: 'Parts Shop', shortLabel: 'Parts', icon: 'wrench' },
    { id: 'TUNING', label: 'Drivetrain', shortLabel: 'Tune', icon: 'gears' },
    { id: 'CUSTOMIZE', label: 'Paint & Mods', shortLabel: 'Paint', icon: 'paint' },
    { id: 'DEALER', label: 'Showroom', shortLabel: 'Cars', icon: 'car' },
    { id: 'LEADERBOARD', label: 'Leaderboards', shortLabel: 'Ranks', icon: 'trophy' },
  ];

  const handleSelectTab = (tabId: GarageTab) => {
    soundEngine.playUiClick();
    setActiveTab(tabId);
    setMobileDynoOpen(false);
    if (tabId === 'DEALER') {
      setShowroomTier(car.tier);
      setShowroomCarId(save.activeCarId);
    }
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

  // Showroom stat bar helpers
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

  // Strict WebGL context budget: only mount visible 3D viewports and pause them during Replay Theater
  const mountLeftPitBay = (isDesktop || mobileDynoOpen) && !replayRecord;
  const mountMobilePaintBay =
    !isDesktop && !mobileDynoOpen && activeTab === 'CUSTOMIZE' && !replayRecord;
  const mountShowroomTurntable = activeTab === 'DEALER' && !mobileDynoOpen && !replayRecord;

  const resolvedTod = resolveTimeOfDay(selectedTier, timeOfDayMode);
  const todAutoLabel = resolveTimeOfDay(selectedTier, 'auto').toUpperCase();

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
                  T{car.tier} · {perf.hp.toLocaleString()} HP · {perf.estimatedEtSec.toFixed(2)}s
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
      <div className="flex-1 min-h-0 max-w-[1440px] w-full mx-auto flex flex-col lg:grid lg:grid-cols-12 gap-3 lg:gap-4 p-2.5 sm:p-3 lg:p-4 overflow-hidden">
        {/* LEFT COLUMN: HI-BIT PIT GARAGE & DYNO TELEMETRY */}
        <aside
          className={`${
            mobileDynoOpen ? 'flex flex-1' : 'hidden'
          } lg:flex lg:col-span-4 flex-col gap-3 min-h-0 overflow-y-auto pr-0.5 lg:pr-1`}
        >
          <div className="arcade-panel overflow-hidden">
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
                    {previewHpDiff > 0 && (
                      <span className="text-[11px] text-[#22c55e]">
                        +{previewHpDiff.toLocaleString()}
                      </span>
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
                      {(activeUpgradePreview ? activeUpgradePreview.nextPerf.grip : perf.grip).toFixed(
                        2
                      )}{' '}
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
          <div className="arcade-panel p-3.5 space-y-3">
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
          } lg:flex lg:col-span-8 flex-col min-h-0`}
        >
          {/* Desktop Rounded Pill Tab Strip */}
          <div className="hidden lg:flex shrink-0 items-center gap-1.5 arcade-panel rounded-2xl p-1.5 mb-3.5 overflow-x-auto no-scrollbar">
            {tabs.map((tab) => {
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
          <div className="flex-1 min-h-0 overflow-y-auto pr-0.5 lg:pr-1 space-y-3 lg:space-y-3.5">
            {/* TAB 1: RACE LADDER & 90s ARCADE RACE FLYERS */}
            {activeTab === 'RACES' && (
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
                          setSelectedTier(t.id);
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
                          setSelectedDistance(d.id);
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

                {/* Race-Day Time-of-Day Lighting Selector */}
                <div className="arcade-panel px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-mono-num text-[11px]">
                    <span className="font-pixel text-[8px] text-[#f5b82e]">LIGHTING</span>
                    <span className="text-[#94a3b8]">
                      Active:{' '}
                      <span className="text-[#f8fafc] font-bold uppercase">{resolvedTod}</span>
                      {timeOfDayMode === 'auto' && (
                        <span className="text-[#38bdf8]"> (Tier {selectedTier} Default)</span>
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
                          className={`arcade-btn rounded-full px-3 py-1.5 border text-[11px] font-mono-num font-bold whitespace-nowrap cursor-pointer ${
                            active
                              ? 'bg-[#263457] border-[#f5b82e] text-[#f5b82e]'
                              : 'bg-[#141b2d] border-[#425582]/65 text-[#cbd5e1] hover:border-[#6884bf]'
                          }`}
                        >
                          {opt.id === 'auto' ? `Auto (${todAutoLabel.slice(0, 3)})` : opt.shortLabel}
                        </button>
                      );
                    })}
                  </div>
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
                      onClick={() => handleSelectTab('TUNING')}
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
                        } overflow-hidden flex flex-col justify-between ${
                          !unlocked ? 'opacity-60' : ''
                        }`}
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
            )}

            {/* TAB 2: PERFORMANCE PARTS SHOP (CUSTOM PIXEL PART SPRITES + LIVE PREVIEW) */}
            {activeTab === 'SHOP' && (
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
                    const canAfford = save.cash >= nextCost;
                    const isPreviewing = hoveredUpgrade === cat.key && !isMax;

                    return (
                      <div
                        key={cat.key}
                        onMouseEnter={() => !isMax && setHoveredUpgrade(cat.key)}
                        onMouseLeave={() =>
                          setHoveredUpgrade((prev) => (prev === cat.key ? null : prev))
                        }
                        onFocus={() => !isMax && setHoveredUpgrade(cat.key)}
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
            )}

            {/* TAB 3: DRIVETRAIN TUNING */}
            {activeTab === 'TUNING' && (
              <DrivetrainTuningPanel
                carId={car.id}
                config={config}
                onUpdateTuning={onUpdateTuning}
              />
            )}

            {/* TAB 4: VISUAL CUSTOMIZATION (LIVE HI-BIT PAINT, STRIPE & RIM PREVIEW) */}
            {activeTab === 'CUSTOMIZE' && (
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
                          setVisualDraft({});
                        }}
                        className="arcade-btn rounded-full px-4 py-2 bg-[#141b2d] hover:bg-[#232d47] border border-[#495f8f]/70 text-xs font-bold text-[#cbd5e1] whitespace-nowrap cursor-pointer"
                      >
                        Reset
                      </button>
                      <button
                        type="button"
                        disabled={save.cash < visualCheckout.totalCost}
                        onClick={() => {
                          soundEngine.playShopBuy();
                          onBuyVisual(car.id, visualCheckout.patch, visualCheckout.totalCost);
                          setVisualDraft({});
                        }}
                        className={`arcade-btn rounded-full px-5 py-2 text-xs font-bold uppercase whitespace-nowrap border ${
                          save.cash >= visualCheckout.totalCost
                            ? 'bg-[#22c55e] hover:bg-[#16a34a] text-[#090d1a] border-[#bbf7d0] cursor-pointer'
                            : 'bg-[#12182b] text-[#64748b] border-[#26324d] cursor-not-allowed'
                        }`}
                      >
                        {save.cash >= visualCheckout.totalCost
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
                      const equipped =
                        config.visuals.paintColor.toLowerCase() === p.hex.toLowerCase();
                      const previewing =
                        previewConfig.visuals.paintColor.toLowerCase() === p.hex.toLowerCase() &&
                        !equipped;
                      return (
                        <button
                          key={p.hex}
                          type="button"
                          onClick={() => {
                            soundEngine.playUiClick();
                            setVisualDraft((prev) => ({ ...prev, paintColor: p.hex }));
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
                            <div className="text-xs font-bold text-[#f7f3e3] truncate">
                              {p.name}
                            </div>
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
                  <h4 className="font-pixel text-[10px] text-[#facc15]">
                    RACING STRIPES &amp; DECALS
                  </h4>
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
                            setVisualDraft((prev) => ({ ...prev, stripe: opt.id }));
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
                            setVisualDraft((prev) => ({ ...prev, rims: opt.id }));
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
            )}

            {/* TAB 5: 3D VOXEL CAR SHOWROOM (25 CARS · 360° ORBIT TURNTABLE + SIDE STATS) */}
            {activeTab === 'DEALER' && (
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
                        <div className="hidden sm:block font-bold text-xs mt-1 truncate">
                          {t.className}
                        </div>
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
                        <div className="text-[10px] text-[#facc15] truncate mt-0.5">
                          {c.specialty}
                        </div>
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
                            <PixelIcon
                              name={turntableSpinning ? 'pause' : 'play'}
                              className="w-3.5 h-3.5"
                            />
                          </button>
                        </div>
                      </div>

                      {/* 4-Angle Hi-Bit Showroom Turntable (SIDE R / FRONT / SIDE L / REAR) */}
                      <div className="w-full aspect-[340/180] arcade-inset rounded-2xl overflow-hidden relative">
                        {mountShowroomTurntable ? (
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
                            {save.cash >= showroomCar.price
                              ? 'Purchase Chassis'
                              : 'Insufficient Cash'}
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
                            {Math.round(
                              showroomPerf.hp / (showroomPerf.weightLbs / 2000)
                            ).toLocaleString()}{' '}
                            · {(showroomPerf.redlineRpm / 1000).toFixed(1)}k
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
                      <div className="font-pixel text-[9px] text-[#94a3b8]">
                        CHASSIS CHARACTERISTICS
                      </div>
                      <div className="text-xs text-[#cbd5e1] leading-relaxed">
                        {getCarCharacteristics(showroomCar).join(' · ')}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 6: LOCAL & GLOBAL LEADERBOARDS + 3D VOXEL REPLAY THEATER */}
            {activeTab === 'LEADERBOARD' && (
              <div className="arcade-panel p-3.5 sm:p-4 space-y-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1 arcade-inset rounded-full p-1">
                      <button
                        type="button"
                        onClick={() => setBoardScope('GLOBAL')}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-bold uppercase whitespace-nowrap cursor-pointer transition-colors ${
                          boardScope === 'GLOBAL'
                            ? 'bg-[#ef3b2d] text-white'
                            : 'text-[#94a3b8] hover:text-white'
                        }`}
                      >
                        Global Top 50
                      </button>
                      <button
                        type="button"
                        onClick={() => setBoardScope('LOCAL')}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-bold uppercase whitespace-nowrap cursor-pointer transition-colors ${
                          boardScope === 'LOCAL'
                            ? 'bg-[#ef3b2d] text-white'
                            : 'text-[#94a3b8] hover:text-white'
                        }`}
                      >
                        Local Records
                      </button>
                    </div>

                    {/* Strip Distance Filter */}
                    <div className="flex items-center gap-1 arcade-inset rounded-full p-1 font-mono-num">
                      {STRIP_DISTANCES.map((d) => (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => setBoardDistanceFilter(d.id)}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap cursor-pointer transition-colors ${
                            boardDistanceFilter === d.id
                              ? 'bg-[#38bdf8] text-[#090d1a]'
                              : 'text-[#94a3b8] hover:text-white'
                          }`}
                        >
                          {d.shortLabel}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[0, 1, 2, 3, 4, 5].map((tf) => (
                      <button
                        key={tf}
                        type="button"
                        onClick={() => setBoardTierFilter(tf)}
                        className={`arcade-btn rounded-full px-3 py-1 text-xs font-mono-num font-bold border whitespace-nowrap cursor-pointer ${
                          boardTierFilter === tf
                            ? 'bg-[#26355c] text-[#facc15] border-[#facc15]'
                            : 'bg-[#141d34] text-[#94a3b8] border-[#3c5080]/65 hover:text-white'
                        }`}
                      >
                        {tf === 0 ? 'ALL' : `T${tf}`}
                      </button>
                    ))}
                    {boardScope === 'GLOBAL' && (
                      <button
                        type="button"
                        onClick={onRefreshGlobal}
                        aria-label="Refresh global leaderboard"
                        className="arcade-btn rounded-full h-8 w-8 flex items-center justify-center bg-[#141d34] border border-[#3c5080]/65 text-[#cbd5e1] hover:border-[#facc15] cursor-pointer"
                      >
                        <PixelIcon
                          name="restart"
                          className={`w-4 h-4 ${globalLoading ? 'animate-spin' : ''}`}
                        />
                      </button>
                    )}
                  </div>
                </div>

                {boardScope === 'GLOBAL' && !user && (
                  <div className="flex flex-wrap items-center justify-between gap-3 arcade-inset px-4 py-2.5 text-xs text-[#cbd5e1]">
                    <span>
                      Sign in with Google to post your 1/4, 1/2, and 1 Mile ETs to the Global
                      Leaderboard and sync your garage.
                    </span>
                    <button
                      type="button"
                      onClick={onSignIn}
                      className="arcade-btn rounded-full px-4 py-1.5 bg-[#facc15] text-[#090d1a] border border-[#fef08a] font-bold uppercase whitespace-nowrap cursor-pointer"
                    >
                      Sign In
                    </button>
                  </div>
                )}

                {boardScope === 'GLOBAL' && globalError && (
                  <div className="bg-[#2c1518] border border-[#ef3b2d]/80 rounded-xl px-4 py-2.5 text-xs text-[#fecaca]">
                    {globalError}
                  </div>
                )}

                {boardScope === 'LOCAL' && filteredLocal[0]?.replay && (
                  <div className="arcade-panel-gold p-3.5 flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2 font-pixel text-[9px] text-[#f5b82e]">
                        <PixelIcon name="film" className="w-4 h-4 shrink-0" />
                        <span>
                          BEST {boardDistSpec.shortLabel.toUpperCase()} REPLAY
                          {boardTierFilter > 0 ? ` · T${boardTierFilter}` : ''}
                        </span>
                      </div>
                      <div className="text-xs sm:text-sm font-bold text-[#f8fafc] truncate">
                        {filteredLocal[0].carName} ·{' '}
                        <span className="font-mono-num text-[#22c55e]">
                          {formatEt(filteredLocal[0].etMs)}
                        </span>{' '}
                        <span className="font-mono-num text-[#cbd5e1]">
                          @ {filteredLocal[0].trapMph.toFixed(1)} MPH
                        </span>
                      </div>
                      <div className="text-[11px] text-[#94a3b8] font-mono-num">
                        {filteredLocal[0].perfectShifts} Perfect Shifts ·{' '}
                        {filteredLocal[0].replay.events.length} Shift &amp; Launch Markers Recorded
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playUiClick();
                        setReplayRecord(filteredLocal[0]);
                      }}
                      className="arcade-btn rounded-full px-4 py-2 bg-[#f5b82e] hover:bg-[#fde047] text-[#0e1320] border border-[#fef08a] text-xs font-bold uppercase flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                    >
                      <PixelIcon name="play" className="w-3.5 h-3.5" />
                      <span>Watch Replay</span>
                    </button>
                  </div>
                )}

                <div className="overflow-x-auto arcade-inset p-2.5">
                  <table className="w-full text-left border-collapse font-mono-num text-xs">
                    <thead>
                      <tr className="border-b border-[#26355c] text-[#facc15]">
                        <th className="py-2 pr-2 sm:pr-3">#</th>
                        <th className="py-2 pr-2 sm:pr-3">DRIVER</th>
                        <th className="py-2 pr-2 sm:pr-3">CLS</th>
                        <th className="py-2 pr-2 sm:pr-3">CAR</th>
                        <th className="py-2 pr-2 sm:pr-3 text-right">
                          {boardDistSpec.shortLabel} ET
                        </th>
                        <th className="py-2 pr-2 sm:pr-3 text-right">TRAP</th>
                        <th className="hidden sm:table-cell py-2 pr-2 sm:pr-3 text-right">RT</th>
                        {boardScope === 'LOCAL' && <th className="py-2 text-right">REPLAY</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {boardScope === 'GLOBAL' ? (
                        globalLoading && filteredGlobal.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-8 text-center text-[#94a3b8]">
                              Loading global records...
                            </td>
                          </tr>
                        ) : filteredGlobal.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-8 text-center text-[#94a3b8]">
                              No global {boardDistSpec.label.toLowerCase()} runs recorded in this
                              class yet. Set the first track record!
                            </td>
                          </tr>
                        ) : (
                          filteredGlobal.map((entry, idx) => {
                            const isMe = user && entry.uid === user.uid;
                            return (
                              <tr
                                key={entry.id}
                                className={`border-b border-[#19233d] ${
                                  isMe ? 'bg-[#1f2e52]' : 'hover:bg-[#131b31]'
                                }`}
                              >
                                <td className="py-2 pr-2 sm:pr-3 font-bold text-[#facc15]">
                                  {idx + 1}
                                </td>
                                <td className="py-2 pr-2 sm:pr-3 font-semibold text-[#f7f3e3] max-w-[90px] sm:max-w-none truncate">
                                  {entry.driverName}
                                </td>
                                <td className="py-2 pr-2 sm:pr-3 text-[#94a3b8]">T{entry.tier}</td>
                                <td className="py-2 pr-2 sm:pr-3 text-[#cbd5e1] max-w-[100px] sm:max-w-none truncate">
                                  <span
                                    className="inline-block w-2.5 h-2.5 rounded-full mr-1.5 align-middle border border-white/25"
                                    style={{ backgroundColor: entry.paintColor }}
                                  />
                                  {entry.carName}
                                </td>
                                <td className="py-2 pr-2 sm:pr-3 text-right font-bold text-[#22c55e]">
                                  {formatEt(entry.etMs)}
                                </td>
                                <td className="py-2 pr-0 sm:pr-3 text-right text-[#f7f3e3]">
                                  {entry.trapMph.toFixed(1)}
                                </td>
                                <td className="hidden sm:table-cell py-2 text-right text-[#94a3b8]">
                                  {(entry.reactionMs / 1000).toFixed(3)}s
                                </td>
                              </tr>
                            );
                          })
                        )
                      ) : filteredLocal.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-[#94a3b8]">
                            Complete a clean {boardDistSpec.label.toLowerCase()} run to log your
                            local track records and shift-timing replays.
                          </td>
                        </tr>
                      ) : (
                        filteredLocal.map((entry, idx) => (
                          <tr
                            key={entry.id}
                            className="border-b border-[#19233d] hover:bg-[#131b31]"
                          >
                            <td className="py-2 pr-2 sm:pr-3 font-bold text-[#facc15]">
                              {idx + 1}
                            </td>
                            <td className="py-2 pr-2 sm:pr-3 font-semibold text-[#f7f3e3] max-w-[82px] sm:max-w-none truncate">
                              {entry.driverName}
                            </td>
                            <td className="py-2 pr-2 sm:pr-3 text-[#94a3b8]">T{entry.tier}</td>
                            <td className="py-2 pr-2 sm:pr-3 text-[#cbd5e1] max-w-[92px] sm:max-w-none truncate">
                              <span
                                className="inline-block w-2.5 h-2.5 rounded-full mr-1.5 align-middle border border-white/25"
                                style={{ backgroundColor: entry.paintColor }}
                              />
                              {entry.carName}
                            </td>
                            <td className="py-2 pr-2 sm:pr-3 text-right font-bold text-[#22c55e]">
                              {formatEt(entry.etMs)}
                            </td>
                            <td className="py-2 pr-2 sm:pr-3 text-right text-[#f7f3e3]">
                              {entry.trapMph.toFixed(1)}
                            </td>
                            <td className="hidden sm:table-cell py-2 pr-2 sm:pr-3 text-right text-[#94a3b8]">
                              {(entry.reactionMs / 1000).toFixed(3)}s
                            </td>
                            <td className="py-1.5 text-right">
                              {entry.replay ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    soundEngine.playUiClick();
                                    setReplayRecord(entry);
                                  }}
                                  className={`arcade-btn rounded-full px-2.5 py-1 text-[11px] font-bold inline-flex items-center gap-1 whitespace-nowrap cursor-pointer border ${
                                    idx === 0
                                      ? 'bg-[#facc15] hover:bg-[#fde047] text-[#090d1a] border-[#fef9c3]'
                                      : 'bg-[#1a2542] hover:bg-[#26355c] text-[#f7f3e3] border-[#526ba3]/70'
                                  }`}
                                >
                                  <PixelIcon name="play" className="w-3 h-3" />
                                  <span>Watch</span>
                                </button>
                              ) : (
                                <span className="text-[10px] text-[#64748b]">—</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Mobile Fixed Bottom Thumb Navigation Bar */}
      <nav
        aria-label="Garage sections"
        className="lg:hidden shrink-0 bg-[#171f33] border-t border-[#4d6599]/40 grid grid-cols-6 gap-1 px-1.5 py-1 pb-[max(0.25rem,env(safe-area-inset-bottom))]"
      >
        {tabs.map((tab) => {
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

      {/* 3D Voxel Race Replay Theater Modal */}
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
