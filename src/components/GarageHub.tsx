import React, { useEffect, useMemo, useRef, useState } from 'react';
import { User } from 'firebase/auth';
import {
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Flag,
  Lock,
  LogIn,
  LogOut,
  Paintbrush,
  Pause,
  Play,
  RefreshCw,
  RotateCw,
  ShoppingBag,
  SlidersHorizontal,
  Trophy,
  Volume2,
  VolumeX,
  Wrench,
} from 'lucide-react';
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
  RIM_OPTIONS,
  RIVALS,
  STRIP_DISTANCES,
  STRIPE_OPTIONS,
  TIERS,
  UPGRADE_CATEGORIES,
} from '../data/gameData';
import {
  drawGarageShowcase,
  drawShowroomTurntable,
  getShowroomAngleLabel,
} from '../engine/pixelSprites';
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

  // Car Showroom turntable state
  const [showroomTier, setShowroomTier] = useState<TierId>(() => getCarById(save.activeCarId).tier);
  const [showroomCarId, setShowroomCarId] = useState<string>(save.activeCarId);
  const [turntableSpinning, setTurntableSpinning] = useState<boolean>(true);
  const [showroomSpecMode, setShowroomSpecMode] = useState<'CURRENT' | 'MAXED'>('CURRENT');
  const [angleLabel, setAngleLabel] = useState<'SIDE R' | 'FRONT' | 'SIDE L' | 'REAR'>('SIDE R');
  const turntableAngleRef = useRef<number>(0);

  // Mobile collapsible Dyno/Garage drawer (keeps active tab immediately visible without scrolling)
  const [mobileDynoOpen, setMobileDynoOpen] = useState<boolean>(false);

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

  // Live pixel-art dyno bay showcase canvas (renders previewConfig live!)
  const dynoCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const mobilePaintCanvasRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = dynoCanvasRef.current;
    if (!canvas) return;
    canvas.width = 440;
    canvas.height = 210;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    const mobileCanvas = mobilePaintCanvasRef.current;
    let mobileCtx: CanvasRenderingContext2D | null = null;
    if (mobileCanvas) {
      mobileCanvas.width = 440;
      mobileCanvas.height = 170;
      mobileCtx = mobileCanvas.getContext('2d');
      if (mobileCtx) mobileCtx.imageSmoothingEnabled = false;
    }

    let rafId = 0;
    const startMs = performance.now();
    const draw = (now: number) => {
      const t = (now - startMs) / 1000;
      drawGarageShowcase(
        ctx,
        440,
        210,
        car.chassis,
        previewConfig.visuals,
        previewConfig.upgrades,
        t,
        car.bodyVariant
      );
      if (mobileCtx) {
        drawGarageShowcase(
          mobileCtx,
          440,
          170,
          car.chassis,
          previewConfig.visuals,
          previewConfig.upgrades,
          t,
          car.bodyVariant
        );
      }
      rafId = requestAnimationFrame(draw);
    };
    rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  }, [car.chassis, car.bodyVariant, previewConfig.visuals, previewConfig.upgrades, activeTab]);

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

  // Live 8-bit Showroom Turntable Canvas
  const turntableCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const spinningRef = useRef(turntableSpinning);
  spinningRef.current = turntableSpinning;

  useEffect(() => {
    if (activeTab !== 'DEALER') return;
    const canvas = turntableCanvasRef.current;
    if (!canvas) return;
    canvas.width = 520;
    canvas.height = 270;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    let rafId = 0;
    let lastMs = performance.now();
    const startMs = lastMs;
    let lastLabel: 'SIDE R' | 'FRONT' | 'SIDE L' | 'REAR' = getShowroomAngleLabel(
      turntableAngleRef.current
    );

    const draw = (now: number) => {
      const dt = Math.min(0.05, Math.max(0, (now - lastMs) / 1000));
      lastMs = now;
      if (spinningRef.current) {
        turntableAngleRef.current = (turntableAngleRef.current + dt * 0.72) % (Math.PI * 2);
      }
      const lbl = getShowroomAngleLabel(turntableAngleRef.current);
      if (lbl !== lastLabel) {
        lastLabel = lbl;
        setAngleLabel(lbl);
      }
      drawShowroomTurntable(
        ctx,
        520,
        270,
        showroomCar.chassis,
        showroomConfig.visuals,
        showroomConfig.upgrades,
        turntableAngleRef.current,
        (now - startMs) / 1000,
        showroomCar.bodyVariant
      );
      rafId = requestAnimationFrame(draw);
    };

    rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  }, [activeTab, showroomCar.chassis, showroomCar.bodyVariant, showroomConfig.visuals, showroomConfig.upgrades]);

  const handleStepTurntable = () => {
    soundEngine.playUiClick();
    // Snap cleanly to next 90-degree angle (Side R -> Front -> Side L -> Rear)
    const step = Math.PI / 2;
    const nextQuarter = Math.floor(turntableAngleRef.current / step + 1) % 4;
    turntableAngleRef.current = nextQuarter * step;
    setAngleLabel(getShowroomAngleLabel(turntableAngleRef.current));
  };

  const distSpec = getStripDistanceSpec(selectedDistance);
  const boardDistSpec = getStripDistanceSpec(boardDistanceFilter);

  const tierRivals = useMemo(
    () => RIVALS.filter((r) => r.tier === selectedTier && r.distance === selectedDistance),
    [selectedTier, selectedDistance]
  );

  const filteredGlobal = useMemo(() => {
    const byDist = globalRecords.filter((e) => (e.distance ?? 'quarter') === boardDistanceFilter);
    const list = boardTierFilter === 0
      ? byDist
      : byDist.filter((e) => e.tier === boardTierFilter);
    return list.slice(0, 50);
  }, [globalRecords, boardTierFilter, boardDistanceFilter]);

  const filteredLocal = useMemo(() => {
    const byDist = localRecords.filter((e) => (e.distance ?? 'quarter') === boardDistanceFilter);
    const list = boardTierFilter === 0
      ? byDist
      : byDist.filter((e) => e.tier === boardTierFilter);
    return list.slice(0, 50);
  }, [localRecords, boardTierFilter, boardDistanceFilter]);

  const handleSaveCallsign = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = sanitizeCallsign(callsignDraft);
    setCallsignDraft(cleaned);
    onUpdateCallsign(cleaned);
    soundEngine.playUiClick();
  };

  const tabs: { id: GarageTab; label: string; shortLabel: string; icon: React.ReactNode }[] = [
    { id: 'RACES', label: 'Race Strip', shortLabel: 'Race', icon: <Flag className="w-4 h-4" /> },
    { id: 'SHOP', label: 'Parts Shop', shortLabel: 'Parts', icon: <Wrench className="w-4 h-4" /> },
    { id: 'TUNING', label: 'Drivetrain', shortLabel: 'Tune', icon: <SlidersHorizontal className="w-4 h-4" /> },
    { id: 'CUSTOMIZE', label: 'Paint & Mods', shortLabel: 'Paint', icon: <Paintbrush className="w-4 h-4" /> },
    { id: 'DEALER', label: 'Showroom', shortLabel: 'Cars', icon: <ShoppingBag className="w-4 h-4" /> },
    { id: 'LEADERBOARD', label: 'Leaderboards', shortLabel: 'Ranks', icon: <Trophy className="w-4 h-4" /> },
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

  // Showroom stat bar helpers (normalized across Tier 1..5 scale using log/curved scaling so Tier 1 cars still read clearly)
  const hpBarPct = Math.min(100, Math.round((Math.log10(showroomPerf.hp) - 2.0) / (4.15 - 2.0) * 100));
  const gripBarPct = Math.min(100, Math.round((showroomPerf.grip / 3.8) * 100));
  const paceBarPct = Math.min(100, Math.max(12, Math.round(((16.8 - showroomPerf.estimatedEtSec) / (16.8 - 3.6)) * 100)));
  const agilityBarPct = Math.min(100, Math.max(18, Math.round(((3400 - showroomPerf.weightLbs) / 1650) * 100)));

  return (
    <div className="h-[100dvh] w-full bg-[#0d0b14] text-[#f4f1e6] flex flex-col overflow-hidden">
      {/* Compact Arcade Paddock Top Strip */}
      <header className="shrink-0 bg-[#141020] border-b-2 border-[#302847] px-3 sm:px-5 py-2 sm:py-3 flex items-center justify-between gap-2 sm:gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <span className="font-pixel text-xs sm:text-base text-[#ff4d2e] whitespace-nowrap shrink-0">
            REDLINE &apos;88
          </span>
          <div className="hidden md:flex items-center gap-2 text-xs text-[#94a3b8] font-mono-num whitespace-nowrap">
            <span className="text-[#f4f1e6] font-semibold">{save.callsign}</span>
            <span>·</span>
            <span>Tier {save.highestUnlockedTier}/5</span>
            <span>·</span>
            <span>{save.totalWins} Wins</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <div className="bg-[#0a0812] border-2 border-[#2d3b2f] px-2.5 sm:px-3.5 py-1 sm:py-1.5 font-mono-num text-xs sm:text-base font-bold text-[#22c55e] whitespace-nowrap">
            {formatCash(save.cash)}
          </div>

          {user ? (
            <button
              type="button"
              onClick={onSignOut}
              aria-label="Sign out"
              className="arcade-btn h-9 sm:h-10 px-2.5 sm:px-3 bg-[#1d1830] hover:bg-[#2a2244] border-2 border-[#3a3154] text-xs font-semibold text-[#cbd5e1] flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onSignIn}
              className="arcade-btn h-9 sm:h-10 px-2.5 sm:px-3 bg-[#1d1830] hover:bg-[#2a2244] border-2 border-[#f5b82e] text-xs font-semibold text-[#fef08a] flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span className="hidden xs:inline sm:inline">Sign In</span>
            </button>
          )}

          <button
            type="button"
            onClick={onToggleMute}
            aria-label={muted ? 'Unmute audio' : 'Mute audio'}
            className="arcade-btn h-9 w-9 sm:h-10 sm:w-10 flex items-center justify-center bg-[#1d1830] border-2 border-[#3a3154] text-[#f4f1e6] hover:border-[#f5b82e] cursor-pointer"
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Mobile Compact Active Car Bar (toggles Dyno & Garage Switcher without blocking menus) */}
      <div className="lg:hidden shrink-0 bg-[#110e1c] border-b border-[#2c2544] px-3 py-1.5 flex items-center justify-between gap-2">
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
              className="w-3 h-3 shrink-0 border border-white/30"
              style={{ backgroundColor: config.visuals.paintColor }}
            />
            <div className="min-w-0">
              <div className="text-xs font-bold text-[#f4f1e6] truncate">
                {car.name}
                <span className="font-mono-num text-[11px] font-normal text-[#94a3b8] ml-1.5">
                  T{car.tier} · {perf.hp.toLocaleString()} HP · {perf.estimatedEtSec.toFixed(2)}s
                </span>
              </div>
            </div>
          </div>
          <span className="shrink-0 flex items-center gap-1 font-mono-num text-[11px] font-bold text-[#f5b82e]">
            <span>{mobileDynoOpen ? 'Hide Dyno' : 'Dyno'}</span>
            {mobileDynoOpen ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </span>
        </button>
      </div>

      {/* Main Split Paddock Layout (Mobile: full-height active tab + collapsible dyno; Desktop: 12-col split) */}
      <div className="flex-1 min-h-0 max-w-[1440px] w-full mx-auto flex flex-col lg:grid lg:grid-cols-12 gap-3 lg:gap-5 p-3 lg:p-5 overflow-hidden">
        {/* LEFT COLUMN (4 cols on desktop; collapsible full-height drawer on mobile) */}
        <aside
          className={`${
            mobileDynoOpen ? 'flex flex-1' : 'hidden'
          } lg:flex lg:col-span-4 flex-col gap-3 lg:gap-4 min-h-0 overflow-y-auto pr-0.5 lg:pr-1`}
        >
          <div className="arcade-panel p-4 space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-[#f4f1e6] leading-tight">
                    {car.name}
                  </h2>
                  {(visualCheckout.hasChanges || activeUpgradePreview) && (
                    <span className="font-mono-num text-[11px] font-bold text-[#f5b82e]">
                      · PREVIEW
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#94a3b8] mt-0.5">
                  Tier {car.tier} · {car.subtitle}
                </p>
              </div>
              <div className="text-right font-mono-num shrink-0">
                <div className="text-[10px] text-[#94a3b8]">EST. 1/4 MI</div>
                <div className="text-base font-bold text-[#f5b82e]">
                  {activeUpgradePreview
                    ? activeUpgradePreview.nextPerf.estimatedEtSec.toFixed(2)
                    : perf.estimatedEtSec.toFixed(2)}
                  s
                </div>
                {previewEtDiff < 0 && (
                  <div className="text-[11px] font-bold text-[#22c55e]">
                    {previewEtDiff.toFixed(2)}s
                  </div>
                )}
              </div>
            </div>

            {/* Crisp High-Fidelity Dyno Canvas */}
            <div className="w-full aspect-[440/210] bg-[#0b0914] border-2 border-[#2e2747] overflow-hidden">
              <canvas
                ref={dynoCanvasRef}
                className="pixel-canvas w-full h-full block"
              />
            </div>

            {/* Performance Telemetry Grid (with live Parts Preview deltas!) */}
            <div className="grid grid-cols-2 gap-2.5 font-mono-num text-xs">
              <div className="bg-[#0e0b18] border border-[#2c2544] p-2.5">
                <div className="text-[#94a3b8] text-[11px]">HORSEPOWER</div>
                <div className="text-base font-bold text-[#f4f1e6] mt-0.5 flex items-baseline gap-1.5 flex-wrap">
                  <span>
                    {(activeUpgradePreview ? activeUpgradePreview.nextPerf.hp : perf.hp).toLocaleString()} HP
                  </span>
                  {previewHpDiff > 0 && (
                    <span className="text-xs text-[#22c55e]">+{previewHpDiff.toLocaleString()}</span>
                  )}
                </div>
              </div>
              <div className="bg-[#0e0b18] border border-[#2c2544] p-2.5">
                <div className="text-[#94a3b8] text-[11px]">CURB WEIGHT</div>
                <div className="text-base font-bold text-[#f4f1e6] mt-0.5 flex items-baseline gap-1.5 flex-wrap">
                  <span>
                    {(activeUpgradePreview ? activeUpgradePreview.nextPerf.weightLbs : perf.weightLbs).toLocaleString()} LBS
                  </span>
                  {previewWeightDiff < 0 && (
                    <span className="text-xs text-[#22c55e]">{previewWeightDiff}</span>
                  )}
                </div>
              </div>
              <div className="bg-[#0e0b18] border border-[#2c2544] p-2.5">
                <div className="text-[#94a3b8] text-[11px]">TIRE GRIP</div>
                <div className="text-base font-bold text-[#22c55e] mt-0.5 flex items-baseline gap-1.5 flex-wrap">
                  <span>
                    {(activeUpgradePreview ? activeUpgradePreview.nextPerf.grip : perf.grip).toFixed(2)} G
                  </span>
                  {previewGripDiff > 0 && (
                    <span className="text-xs text-[#86efac]">+{previewGripDiff.toFixed(2)}</span>
                  )}
                </div>
              </div>
              <div className="bg-[#0e0b18] border border-[#2c2544] p-2.5">
                <div className="text-[#94a3b8] text-[11px]">NITROUS / BOOST</div>
                <div className="text-base font-bold text-[#38bdf8] mt-0.5 flex items-baseline gap-1.5 flex-wrap">
                  <span>
                    {(activeUpgradePreview ? activeUpgradePreview.nextPerf.nitrousShots : perf.nitrousShots) > 0
                      ? `${activeUpgradePreview ? activeUpgradePreview.nextPerf.nitrousShots : perf.nitrousShots} Shots`
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
                    <span className="text-xs text-[#22c55e]">
                      {previewNosDiff > 0 ? `+${previewNosDiff} NOS` : `+${previewBoostDiff}%`}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Projected Multi-Strip Speed & ET Strip */}
            <div className="grid grid-cols-3 gap-2 font-mono-num text-[11px]">
              <div className="bg-[#0e0b18] border border-[#2c2544] px-2.5 py-2">
                <div className="text-[#94a3b8] text-[10px]">EST. 1/2 MI</div>
                <div className="font-bold text-[#38bdf8] mt-0.5">
                  {(activeUpgradePreview
                    ? activeUpgradePreview.nextPerf.estimatedHalfEtSec
                    : perf.estimatedHalfEtSec
                  ).toFixed(2)}
                  s
                </div>
              </div>
              <div className="bg-[#0e0b18] border border-[#2c2544] px-2.5 py-2">
                <div className="text-[#94a3b8] text-[10px]">EST. 1 MILE</div>
                <div className="font-bold text-[#c084fc] mt-0.5">
                  {(activeUpgradePreview
                    ? activeUpgradePreview.nextPerf.estimatedMileEtSec
                    : perf.estimatedMileEtSec
                  ).toFixed(2)}
                  s
                </div>
              </div>
              <div className="bg-[#0e0b18] border border-[#2c2544] px-2.5 py-2">
                <div className="text-[#94a3b8] text-[10px]">GEAR TOP</div>
                <div className="font-bold text-[#f4f1e6] mt-0.5">
                  {activeUpgradePreview
                    ? activeUpgradePreview.nextPerf.topSpeedMph
                    : perf.topSpeedMph}{' '}
                  MPH
                </div>
              </div>
            </div>

            {/* Garage Car Switcher (only shown if player owns > 1 car) */}
            {save.ownedCars.length > 1 && (
              <div className="pt-2 border-t border-[#2c2544] space-y-2">
                <div className="text-xs font-semibold text-[#94a3b8]">Your Garage</div>
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
                        className={`arcade-btn px-2.5 py-1.5 text-xs font-semibold border whitespace-nowrap cursor-pointer ${
                          active
                            ? 'bg-[#ff4d2e] text-white border-[#fff3b0]'
                            : 'bg-[#1b162b] text-[#cbd5e1] border-[#352d4d] hover:border-[#f5b82e]'
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

          {/* Driver Callsign & Quick Controls Reference */}
          <div className="arcade-panel p-4 space-y-3">
            <form onSubmit={handleSaveCallsign} className="space-y-2">
              <label htmlFor="callsign-input" className="block text-xs font-semibold text-[#94a3b8]">
                Driver Callsign (Leaderboards)
              </label>
              <div className="flex gap-2">
                <input
                  id="callsign-input"
                  type="text"
                  maxLength={18}
                  value={callsignDraft}
                  onChange={(e) => setCallsignDraft(e.target.value)}
                  className="flex-1 min-w-0 bg-[#0a0812] border-2 border-[#352d4d] focus:border-[#f5b82e] focus:outline-none px-3 py-1.5 text-sm font-mono-num text-[#f4f1e6]"
                />
                <button
                  type="submit"
                  className="arcade-btn px-3.5 py-1.5 bg-[#261f3d] hover:bg-[#352b54] border-2 border-[#463a6e] text-xs font-semibold text-[#f4f1e6] whitespace-nowrap cursor-pointer"
                >
                  Save
                </button>
              </div>
            </form>
            <div className="text-xs text-[#94a3b8] leading-relaxed border-t border-[#2a2342] pt-3">
              Hold <span className="text-[#f4f1e6] font-mono-num">Shift</span> (Clutch) +{' '}
              <span className="text-[#f4f1e6] font-mono-num">W</span> (Gas) in the green zone, release Clutch on Green, and hit{' '}
              <span className="text-[#facc15] font-mono-num">Space</span> at peak RPM for a boost surge.
            </div>
          </div>
        </aside>

        {/* RIGHT COLUMN (8 cols on desktop; full workspace on mobile when Dyno drawer closed) */}
        <section
          className={`${
            mobileDynoOpen ? 'hidden' : 'flex flex-1'
          } lg:flex lg:col-span-8 flex-col min-h-0`}
        >
          {/* Desktop Segmented Navigation Bar (mobile uses fixed bottom thumb tab bar) */}
          <div className="hidden lg:flex shrink-0 items-center gap-1.5 bg-[#141020] border-2 border-[#302847] p-1.5 mb-4 overflow-x-auto no-scrollbar">
            {tabs.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleSelectTab(tab.id)}
                  className={`arcade-btn flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-bold whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-[#ff4d2e] text-white border border-[#fff3b0]'
                      : 'text-[#cbd5e1] hover:bg-[#1e1830] hover:text-white border border-transparent'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Scrollable Tab Body */}
          <div className="flex-1 min-h-0 overflow-y-auto pr-0.5 lg:pr-1 space-y-3 lg:space-y-4">
            {/* TAB 1: RACE LADDER & TIER PROGRESSION */}
            {activeTab === 'RACES' && (
              <>
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
                        className={`arcade-btn p-2 sm:p-2.5 text-center sm:text-left border-2 transition-colors whitespace-nowrap ${
                          !unlocked
                            ? 'bg-[#100d1a] border-[#221c36] text-[#64748b] cursor-not-allowed'
                            : active
                            ? 'bg-[#221c38] border-[#f5b82e] text-[#f4f1e6] cursor-pointer'
                            : 'bg-[#151221] border-[#302847] text-[#cbd5e1] hover:border-[#53467a] cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center justify-center sm:justify-between gap-1 text-[10px] font-mono-num">
                          <span>
                            <span className="sm:hidden font-bold text-xs">T{t.id}</span>
                            <span className="hidden sm:inline">TIER {t.id}</span>
                          </span>
                          {!unlocked && <Lock className="w-3 h-3" />}
                        </div>
                        <div className="hidden sm:block font-bold text-xs mt-1 truncate">{t.className}</div>
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
                        className={`arcade-btn p-2 sm:p-3 text-left border-2 transition-colors cursor-pointer ${
                          active
                            ? 'bg-[#221c38] border-[#38bdf8] text-[#f4f1e6]'
                            : 'bg-[#141120] border-[#302847] text-[#cbd5e1] hover:border-[#53467a]'
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

                <div className="arcade-panel p-3 sm:p-4 flex flex-wrap items-center justify-between gap-2.5 sm:gap-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm sm:text-base font-bold text-[#f4f1e6]">
                      {tierSpec.name} · <span className="text-[#38bdf8]">{distSpec.label}</span>
                    </h3>
                    <p className="text-[11px] sm:text-xs text-[#94a3b8] mt-0.5">
                      <span className="hidden sm:inline">{tierSpec.venueName} · {distSpec.description} · </span>
                      <span className="text-[#f5b82e]">{distSpec.tuningHint}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => handleSelectTab('TUNING')}
                      className="arcade-btn flex-1 sm:flex-initial justify-center px-3 py-2 sm:py-2.5 bg-[#171326] hover:bg-[#241e3b] border-2 border-[#3d345c] text-xs font-bold text-[#f5b82e] flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      <span>Tune Gears</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onStartRace(selectedTier, selectedDistance, null)}
                      className="arcade-btn flex-1 sm:flex-initial px-3.5 py-2 sm:py-2.5 bg-[#1e1933] hover:bg-[#2a2347] border-2 border-[#4d3f7a] text-xs font-bold text-[#f4f1e6] whitespace-nowrap cursor-pointer"
                    >
                      Solo {distSpec.shortLabel} Trial
                    </button>
                  </div>
                </div>

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
                        className={`arcade-panel p-4 flex flex-col justify-between gap-4 ${
                          rival.isBoss ? 'border-[#f5b82e]' : ''
                        } ${!unlocked ? 'opacity-60' : ''}`}
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2 text-xs font-mono-num">
                            <span className={rival.isBoss ? 'text-[#f5b82e] font-bold' : 'text-[#94a3b8]'}>
                              {rival.isBoss
                                ? 'TIER BOSS'
                                : selectedDistance === 'quarter'
                                ? `STAGE ${rival.stageIndex} / ${tierRivals.length}`
                                : `${distSpec.shortLabel} CHALLENGE ${rival.stageIndex} / ${tierRivals.length}`}
                            </span>
                            <span className="text-[#22c55e] font-bold">
                              Purse {formatCash(rival.winPurse)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className="w-3 h-3 shrink-0 border border-white/30"
                              style={{ backgroundColor: rival.paintColor }}
                            />
                            <h4 className="font-bold text-base text-[#f4f1e6] truncate">
                              {rival.name}
                            </h4>
                          </div>
                          <p className="text-xs text-[#94a3b8]">
                            {rival.carName} · Target {rival.targetEtSec.toFixed(2)}s @ {rival.targetTrapMph} MPH
                          </p>
                          {rival.challengeNote && (
                            <p className="text-xs text-[#cbd5e1] leading-snug pt-0.5">
                              {rival.challengeNote}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center justify-between gap-3 pt-2 border-t border-[#292240]">
                          <span className="text-xs font-mono-num text-[#94a3b8]">
                            {defeated
                              ? 'Defeated'
                              : unlocked
                              ? 'Ready to Race'
                              : 'Beat previous challenge'}
                          </span>
                          <button
                            type="button"
                            disabled={!unlocked}
                            onClick={() => onStartRace(selectedTier, selectedDistance, rival)}
                            className={`arcade-btn px-4 py-2 text-xs font-bold flex items-center gap-1.5 whitespace-nowrap ${
                              !unlocked
                                ? 'bg-[#191529] text-[#64748b] border border-[#2c2542] cursor-not-allowed'
                                : rival.isBoss
                                ? 'bg-[#f5b82e] hover:bg-[#fbbf24] text-[#09070f] border border-[#fef08a] cursor-pointer'
                                : 'bg-[#ff4d2e] hover:bg-[#ff6247] text-white border border-[#fca5a5] cursor-pointer'
                            }`}
                          >
                            <span>{defeated ? 'Rematch' : 'Race Now'}</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* TAB 2: PERFORMANCE PARTS SHOP (WITH LIVE STAT & CHARACTERISTIC IMPACT PREVIEW) */}
            {activeTab === 'SHOP' && (
              <div className="space-y-3">
                <div className="text-xs text-[#94a3b8] px-1">
                  Hover any part upgrade to preview visual modifications and exact stat deltas on the dyno.
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
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
                        onMouseLeave={() => setHoveredUpgrade((prev) => (prev === cat.key ? null : prev))}
                        onFocus={() => !isMax && setHoveredUpgrade(cat.key)}
                        className={`arcade-panel p-4 flex flex-col justify-between gap-3.5 transition-colors ${
                          isPreviewing ? 'border-[#f5b82e] bg-[#1a152b]' : ''
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="font-bold text-base text-[#f4f1e6]">{cat.name}</h4>
                            <span className="font-mono-num text-xs text-[#f5b82e] font-bold">
                              LV {lvl} / 5
                            </span>
                          </div>
                          <p className="text-xs text-[#94a3b8] mt-0.5">{cat.shortDesc}</p>

                          {/* 5-segment crisp pixel progress bar (next level highlighted when previewing) */}
                          <div className="grid grid-cols-5 gap-1.5 mt-3">
                            {[1, 2, 3, 4, 5].map((step) => (
                              <div
                                key={step}
                                className={`h-2 ${
                                  step <= lvl
                                    ? 'bg-[#22c55e]'
                                    : isPreviewing && step === lvl + 1
                                    ? 'bg-[#f5b82e]'
                                    : 'bg-[#231d38]'
                                }`}
                              />
                            ))}
                          </div>

                          <div className="text-xs font-mono-num text-[#cbd5e1] mt-2">
                            Installed: <span className="text-[#f4f1e6]">{cat.tierNames[lvl]}</span>
                            {!isMax && (
                              <span className="text-[#f5b82e]"> → {cat.tierNames[lvl + 1]}</span>
                            )}
                          </div>

                          {/* Exact Stat Impact & Characteristic Changes */}
                          {impact && (
                            <div className="mt-3 pt-2.5 border-t border-[#28213e] space-y-1.5">
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

                        <div className="flex items-center justify-between pt-2 border-t border-[#292240]">
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
                            className={`arcade-btn px-4 py-2 text-xs font-bold whitespace-nowrap ${
                              isMax
                                ? 'bg-[#191529] text-[#64748b] border border-[#2c2542] cursor-default'
                                : canAfford
                                ? 'bg-[#22c55e] hover:bg-[#16a34a] text-[#09070f] border border-[#bbf7d0] cursor-pointer'
                                : 'bg-[#191529] text-[#64748b] border border-[#2c2542] cursor-not-allowed'
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

            {/* TAB 3: DRIVETRAIN TUNING (GEAR RATIOS, FINAL DRIVE & SHIFT POINTS) */}
            {activeTab === 'TUNING' && (
              <DrivetrainTuningPanel
                carId={car.id}
                config={config}
                onUpdateTuning={onUpdateTuning}
              />
            )}

            {/* TAB 4: VISUAL CUSTOMIZATION (LIVE PAINT, STRIPE & RIM PREVIEW BEFORE BUYING) */}
            {activeTab === 'CUSTOMIZE' && (
              <div className="space-y-3 sm:space-y-4">
                {/* Inline Live Paint Preview Canvas on Mobile (desktop sees left Dyno Bay) */}
                <div className="lg:hidden arcade-panel p-2">
                  <div className="w-full aspect-[440/170] bg-[#0b0914] border border-[#2e2747] overflow-hidden">
                    <canvas
                      ref={mobilePaintCanvasRef}
                      className="pixel-canvas w-full h-full block"
                    />
                  </div>
                </div>

                {/* Preview & Checkout Action Bar */}
                <div
                  className={`arcade-panel p-4 flex flex-wrap items-center justify-between gap-3 ${
                    visualCheckout.hasChanges ? 'border-[#f5b82e] bg-[#1b162d]' : ''
                  }`}
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="text-sm font-bold text-[#f4f1e6]">
                      {visualCheckout.hasChanges
                        ? 'Previewing Custom Look on Dyno'
                        : 'Select any paint, stripe, or rim to preview before buying'}
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
                        Nothing is charged until you click Buy &amp; Apply.
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
                        className="arcade-btn px-3.5 py-2 bg-[#171326] hover:bg-[#241e3b] border-2 border-[#3a3154] text-xs font-semibold text-[#cbd5e1] whitespace-nowrap cursor-pointer"
                      >
                        Reset Preview
                      </button>
                      <button
                        type="button"
                        disabled={save.cash < visualCheckout.totalCost}
                        onClick={() => {
                          soundEngine.playShopBuy();
                          onBuyVisual(car.id, visualCheckout.patch, visualCheckout.totalCost);
                          setVisualDraft({});
                        }}
                        className={`arcade-btn px-4 py-2 text-xs font-bold whitespace-nowrap ${
                          save.cash >= visualCheckout.totalCost
                            ? 'bg-[#22c55e] hover:bg-[#16a34a] text-[#09070f] border-2 border-[#bbf7d0] cursor-pointer'
                            : 'bg-[#191529] text-[#64748b] border-2 border-[#2c2542] cursor-not-allowed'
                        }`}
                      >
                        {save.cash >= visualCheckout.totalCost
                          ? `Buy & Apply (${visualCheckout.totalCost === 0 ? 'Free' : formatCash(visualCheckout.totalCost)})`
                          : `Need ${formatCash(visualCheckout.totalCost)}`}
                      </button>
                    </div>
                  )}
                </div>

                {/* Paint Coats */}
                <div className="arcade-panel p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm text-[#f4f1e6]">Body Paint Coat</h4>
                    <span className="text-xs text-[#94a3b8]">Click any color to preview</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {PAINT_COLORS.map((p) => {
                      const equipped = config.visuals.paintColor.toLowerCase() === p.hex.toLowerCase();
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
                          className={`arcade-btn p-2.5 border-2 text-left flex items-center gap-2.5 cursor-pointer ${
                            previewing
                              ? 'bg-[#292140] border-[#f5b82e]'
                              : equipped
                              ? 'bg-[#1b2b22] border-[#22c55e]'
                              : 'bg-[#171326] border-[#352d4d] hover:border-[#f5b82e]'
                          }`}
                        >
                          <span
                            className="w-6 h-6 shrink-0 border border-white/30"
                            style={{ backgroundColor: p.hex }}
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-[#f4f1e6] truncate">{p.name}</div>
                            <div className="font-mono-num text-[11px] text-[#94a3b8]">
                              {previewing ? (
                                <span className="text-[#f5b82e] font-bold">
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
                <div className="arcade-panel p-4 space-y-3">
                  <h4 className="font-bold text-sm text-[#f4f1e6]">Racing Stripes &amp; Decals</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
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
                          className={`arcade-btn p-3 border-2 text-left cursor-pointer ${
                            previewing
                              ? 'bg-[#292140] border-[#f5b82e]'
                              : equipped
                              ? 'bg-[#1b2b22] border-[#22c55e]'
                              : 'bg-[#171326] border-[#352d4d] hover:border-[#f5b82e]'
                          }`}
                        >
                          <div className="text-xs font-bold text-[#f4f1e6]">{opt.name}</div>
                          <div className="font-mono-num text-[11px] text-[#94a3b8] mt-1">
                            {previewing ? (
                              <span className="text-[#f5b82e] font-bold">
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
                <div className="arcade-panel p-4 space-y-3">
                  <h4 className="font-bold text-sm text-[#f4f1e6]">Wheel Rims</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
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
                          className={`arcade-btn p-3 border-2 text-left cursor-pointer ${
                            previewing
                              ? 'bg-[#292140] border-[#f5b82e]'
                              : equipped
                              ? 'bg-[#1b2b22] border-[#22c55e]'
                              : 'bg-[#171326] border-[#352d4d] hover:border-[#f5b82e]'
                          }`}
                        >
                          <div className="text-xs font-bold text-[#f4f1e6]">{opt.name}</div>
                          <div className="font-mono-num text-[11px] text-[#94a3b8] mt-1">
                            {previewing ? (
                              <span className="text-[#f5b82e] font-bold">
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

            {/* TAB 5: CAR SHOWROOM (25 CARS · 5 PER TIER · TURNTABLE STAGE + SIDE STATS PANEL) */}
            {activeTab === 'DEALER' && (
              <div className="space-y-3 sm:space-y-4">
                {/* Tier 1..5 Showroom Class Selector (Single compact row on mobile & desktop) */}
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
                        className={`arcade-btn p-2 sm:p-2.5 text-center sm:text-left border-2 transition-colors cursor-pointer ${
                          active
                            ? 'bg-[#221c38] border-[#f5b82e] text-[#f4f1e6]'
                            : 'bg-[#141120] border-[#302847] text-[#cbd5e1] hover:border-[#53467a]'
                        }`}
                      >
                        <div className="flex items-center justify-center sm:justify-between gap-1 text-[10px] font-mono-num">
                          <span className={active ? 'text-[#f5b82e] font-bold' : 'text-[#94a3b8]'}>
                            <span className="sm:hidden text-xs">T{t.id}</span>
                            <span className="hidden sm:inline">TIER {t.id}</span>
                          </span>
                          {!unlocked ? (
                            <Lock className="w-3 h-3 text-[#64748b]" />
                          ) : (
                            <span className="hidden sm:inline text-[#4ade80]">
                              {ownedInTier}/{tierCars.length}
                            </span>
                          )}
                        </div>
                        <div className="hidden sm:block font-bold text-xs mt-1 truncate">{t.className}</div>
                      </button>
                    );
                  })}
                </div>

                {/* 5-Car Tier Selector Bar (Single horizontal swipe row on mobile, 5-col grid on desktop) */}
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
                        className={`arcade-btn min-w-[132px] sm:min-w-0 shrink-0 p-2 sm:p-2.5 text-left border-2 transition-colors cursor-pointer ${
                          selected
                            ? 'bg-[#241d3c] border-[#ff4d2e] text-[#f4f1e6]'
                            : 'bg-[#151221] border-[#302847] text-[#cbd5e1] hover:border-[#53467a]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 text-[10px] font-mono-num">
                          <span
                            className="w-2.5 h-2.5 shrink-0 border border-white/30"
                            style={{ backgroundColor: c.defaultPaint }}
                          />
                          {owned ? (
                            <span className="text-[#4ade80]">OWNED</span>
                          ) : !unlocked ? (
                            <Lock className="w-3 h-3 text-[#64748b]" />
                          ) : (
                            <span className="text-[#94a3b8]">{formatCash(c.price)}</span>
                          )}
                        </div>
                        <div className="font-bold text-xs mt-1 truncate">{c.name}</div>
                        <div className="text-[10px] text-[#f5b82e] truncate mt-0.5">
                          {c.specialty}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Split Showroom Stage: Turntable Left · Detailed Stats Right */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch">
                  {/* Left: Illuminated Turntable Stage */}
                  <div className="xl:col-span-7 arcade-panel p-4 flex flex-col justify-between gap-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs font-mono-num text-[#f5b82e]">
                          TIER {showroomCar.tier} · {showroomCar.specialty.toUpperCase()} ·{' '}
                          {showroomCar.gearRatios.length}-SPEED
                          {showroomCar.hasParachute ? ' · CHUTE' : ''}
                        </div>
                        <h3 className="text-xl font-bold text-[#f4f1e6] mt-0.5">
                          {showroomCar.name}
                        </h3>
                        <p className="text-xs text-[#94a3b8]">{showroomCar.subtitle}</p>
                      </div>

                      {/* Turntable Controls */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="font-mono-num text-[11px] text-[#94a3b8] mr-1">
                          {angleLabel}
                        </span>
                        <button
                          type="button"
                          onClick={handleStepTurntable}
                          aria-label="Rotate car 90 degrees"
                          className="arcade-btn h-8 px-2.5 bg-[#1b162e] hover:bg-[#282144] border border-[#3d345c] text-xs font-semibold text-[#f4f1e6] flex items-center gap-1 cursor-pointer"
                        >
                          <RotateCw className="w-3.5 h-3.5" />
                          <span>90°</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            soundEngine.playUiClick();
                            setTurntableSpinning((s) => !s);
                          }}
                          aria-label={turntableSpinning ? 'Pause turntable' : 'Spin turntable'}
                          className="arcade-btn h-8 w-8 bg-[#1b162e] hover:bg-[#282144] border border-[#3d345c] text-[#f4f1e6] flex items-center justify-center cursor-pointer"
                        >
                          {turntableSpinning ? (
                            <Pause className="w-3.5 h-3.5" />
                          ) : (
                            <Play className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* High-Fidelity Showroom Turntable Canvas */}
                    <div className="w-full aspect-[520/270] bg-[#0a0812] border-2 border-[#302847] overflow-hidden">
                      <canvas
                        ref={turntableCanvasRef}
                        className="pixel-canvas w-full h-full block"
                      />
                    </div>

                    {/* Purchase / Select Action Footer */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#2a2342]">
                      <div className="font-mono-num">
                        <div className="text-[11px] text-[#94a3b8]">SHOWROOM PRICE</div>
                        <div className="text-lg font-bold text-[#22c55e]">
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
                          className={`arcade-btn px-5 py-2.5 text-xs font-bold flex items-center gap-1.5 whitespace-nowrap ${
                            save.activeCarId === showroomCar.id
                              ? 'bg-[#1b2e1f] text-[#4ade80] border-2 border-[#22c55e] cursor-default'
                              : 'bg-[#ff4d2e] hover:bg-[#ff6247] text-white border-2 border-[#fff3b0] cursor-pointer'
                          }`}
                        >
                          {save.activeCarId === showroomCar.id ? (
                            <>
                              <Check className="w-4 h-4" /> Active Car
                            </>
                          ) : (
                            'Drive This Car'
                          )}
                        </button>
                      ) : showroomCar.tier > save.highestUnlockedTier ? (
                        <div className="text-xs font-mono-num text-[#94a3b8] flex items-center gap-1.5 bg-[#120f1e] border border-[#2c2544] px-3.5 py-2">
                          <Lock className="w-3.5 h-3.5 text-[#f5b82e]" />
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
                          className={`arcade-btn px-5 py-2.5 text-xs font-bold whitespace-nowrap ${
                            save.cash >= showroomCar.price
                              ? 'bg-[#ff4d2e] hover:bg-[#ff6247] text-white border-2 border-[#fff3b0] cursor-pointer'
                              : 'bg-[#191529] text-[#64748b] border-2 border-[#2c2542] cursor-not-allowed'
                          }`}
                        >
                          {save.cash >= showroomCar.price ? 'Purchase Chassis' : 'Insufficient Cash'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Right: Detailed Car Stats & Characteristics Side Panel */}
                  <div className="xl:col-span-5 arcade-panel p-4 flex flex-col justify-between gap-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between gap-2 border-b border-[#2a2342] pb-3">
                        <div>
                          <h4 className="font-bold text-sm text-[#f4f1e6]">Car Specifications</h4>
                          <div className="font-mono-num text-[11px] text-[#94a3b8]">
                            PI {showroomPerf.pi} · Est. {showroomPerf.estimatedEtSec.toFixed(2)}s 1/4 Mi
                          </div>
                        </div>

                        {/* Stock/Current vs Maxed Build Inspector Toggle */}
                        <div className="flex items-center gap-1 bg-[#0c0a14] border border-[#302847] p-0.5 text-[11px] font-mono-num">
                          <button
                            type="button"
                            onClick={() => setShowroomSpecMode('CURRENT')}
                            className={`px-2 py-1 font-bold cursor-pointer ${
                              showroomSpecMode === 'CURRENT'
                                ? 'bg-[#ff4d2e] text-white'
                                : 'text-[#94a3b8] hover:text-white'
                            }`}
                          >
                            {showroomOwned ? 'Owned' : 'Stock'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowroomSpecMode('MAXED')}
                            className={`px-2 py-1 font-bold cursor-pointer ${
                              showroomSpecMode === 'MAXED'
                                ? 'bg-[#f5b82e] text-[#09070f]'
                                : 'text-[#94a3b8] hover:text-white'
                            }`}
                          >
                            Maxed
                          </button>
                        </div>
                      </div>

                      {/* Core Stat Bars */}
                      <div className="space-y-3 font-mono-num text-xs">
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-[#94a3b8]">POWER OUTPUT</span>
                            <span className="font-bold text-[#f4f1e6]">
                              {showroomPerf.hp.toLocaleString()} HP
                            </span>
                          </div>
                          <div className="h-2.5 bg-[#0a0812] border border-[#2c2544]">
                            <div
                              className="h-full bg-[#ff4d2e]"
                              style={{ width: `${hpBarPct}%` }}
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-[#94a3b8]">1/4 MILE PACE</span>
                            <span className="font-bold text-[#f5b82e]">
                              {showroomPerf.estimatedEtSec.toFixed(2)}s
                            </span>
                          </div>
                          <div className="h-2.5 bg-[#0a0812] border border-[#2c2544]">
                            <div
                              className="h-full bg-[#f5b82e]"
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
                          <div className="h-2.5 bg-[#0a0812] border border-[#2c2544]">
                            <div
                              className="h-full bg-[#22c55e]"
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
                          <div className="h-2.5 bg-[#0a0812] border border-[#2c2544]">
                            <div
                              className="h-full bg-[#38bdf8]"
                              style={{ width: `${agilityBarPct}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Technical Readout Grid */}
                      <div className="grid grid-cols-2 gap-2 font-mono-num text-xs pt-1">
                        <div className="bg-[#0e0b18] border border-[#292240] px-2.5 py-2">
                          <div className="text-[10px] text-[#94a3b8]">1/2 MI · 1 MILE</div>
                          <div className="font-bold text-[#38bdf8] mt-0.5">
                            {showroomPerf.estimatedHalfEtSec.toFixed(2)}s ·{' '}
                            {showroomPerf.estimatedMileEtSec.toFixed(2)}s
                          </div>
                        </div>
                        <div className="bg-[#0e0b18] border border-[#292240] px-2.5 py-2">
                          <div className="text-[10px] text-[#94a3b8]">TOP SPEED · DRAG</div>
                          <div className="font-bold text-[#f4f1e6] mt-0.5">
                            {showroomPerf.topSpeedMph} MPH · {showroomCar.dragCoeff.toFixed(2)} Cd
                          </div>
                        </div>
                        <div className="bg-[#0e0b18] border border-[#292240] px-2.5 py-2">
                          <div className="text-[10px] text-[#94a3b8]">HP / TON · REDLINE</div>
                          <div className="font-bold text-[#f4f1e6] mt-0.5">
                            {Math.round(showroomPerf.hp / (showroomPerf.weightLbs / 2000)).toLocaleString()} ·{' '}
                            {(showroomPerf.redlineRpm / 1000).toFixed(1)}k
                          </div>
                        </div>
                        <div className="bg-[#0e0b18] border border-[#292240] px-2.5 py-2">
                          <div className="text-[10px] text-[#94a3b8]">LAUNCH · BOOST</div>
                          <div className="font-bold text-[#22c55e] mt-0.5">
                            {(showroomCar.launchRpmMin / 1000).toFixed(1)}k–{(showroomCar.launchRpmMax / 1000).toFixed(1)}k · +
                            {Math.round((showroomPerf.shiftBoostMult - 1) * 100)}%
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Chassis Characteristics (clean unboxed typographic list) */}
                    <div className="pt-3 border-t border-[#2a2342] space-y-1.5">
                      <div className="text-[11px] font-semibold text-[#94a3b8]">
                        Chassis Characteristics
                      </div>
                      <div className="text-xs text-[#cbd5e1] leading-relaxed">
                        {getCarCharacteristics(showroomCar).join(' · ')}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 6: LOCAL & GLOBAL LEADERBOARDS */}
            {activeTab === 'LEADERBOARD' && (
              <div className="arcade-panel p-4 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1 bg-[#0c0a14] border border-[#302847] p-1">
                      <button
                        type="button"
                        onClick={() => setBoardScope('GLOBAL')}
                        className={`px-3.5 py-1.5 text-xs font-bold whitespace-nowrap cursor-pointer ${
                          boardScope === 'GLOBAL'
                            ? 'bg-[#ff4d2e] text-white'
                            : 'text-[#94a3b8] hover:text-white'
                        }`}
                      >
                        Global Top 50
                      </button>
                      <button
                        type="button"
                        onClick={() => setBoardScope('LOCAL')}
                        className={`px-3.5 py-1.5 text-xs font-bold whitespace-nowrap cursor-pointer ${
                          boardScope === 'LOCAL'
                            ? 'bg-[#ff4d2e] text-white'
                            : 'text-[#94a3b8] hover:text-white'
                        }`}
                      >
                        Local Records
                      </button>
                    </div>

                    {/* Strip Distance Filter */}
                    <div className="flex items-center gap-1 bg-[#0c0a14] border border-[#302847] p-1 font-mono-num">
                      {STRIP_DISTANCES.map((d) => (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => setBoardDistanceFilter(d.id)}
                          className={`px-2.5 py-1.5 text-xs font-bold whitespace-nowrap cursor-pointer ${
                            boardDistanceFilter === d.id
                              ? 'bg-[#38bdf8] text-[#09070f]'
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
                        className={`px-2.5 py-1 text-xs font-mono-num border whitespace-nowrap cursor-pointer ${
                          boardTierFilter === tf
                            ? 'bg-[#2a2345] text-[#f5b82e] border-[#f5b82e]'
                            : 'bg-[#120f1e] text-[#94a3b8] border-[#2c2544] hover:text-white'
                        }`}
                      >
                        {tf === 0 ? 'All' : `T${tf}`}
                      </button>
                    ))}
                    {boardScope === 'GLOBAL' && (
                      <button
                        type="button"
                        onClick={onRefreshGlobal}
                        aria-label="Refresh global leaderboard"
                        className="h-7 w-7 flex items-center justify-center bg-[#120f1e] border border-[#2c2544] text-[#cbd5e1] hover:border-[#f5b82e] cursor-pointer"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${globalLoading ? 'animate-spin' : ''}`} />
                      </button>
                    )}
                  </div>
                </div>

                {boardScope === 'GLOBAL' && !user && (
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-[#1b162e] border border-[#3d345c] px-3.5 py-2.5 text-xs text-[#cbd5e1]">
                    <span>
                      Sign in with Google to post your 1/4, 1/2, and 1 Mile ETs to the Global Leaderboard and sync your garage.
                    </span>
                    <button
                      type="button"
                      onClick={onSignIn}
                      className="arcade-btn px-3 py-1.5 bg-[#f5b82e] text-[#09070f] font-bold whitespace-nowrap cursor-pointer"
                    >
                      Sign In
                    </button>
                  </div>
                )}

                {boardScope === 'GLOBAL' && globalError && (
                  <div className="bg-[#2c1518] border border-[#ef4444] px-3.5 py-2.5 text-xs text-[#fecaca]">
                    {globalError}
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse font-mono-num text-xs">
                    <thead>
                      <tr className="border-b border-[#302847] text-[#94a3b8]">
                        <th className="py-2 pr-2 sm:pr-3">#</th>
                        <th className="py-2 pr-2 sm:pr-3">DRIVER</th>
                        <th className="py-2 pr-2 sm:pr-3">CLS</th>
                        <th className="py-2 pr-2 sm:pr-3">CAR</th>
                        <th className="py-2 pr-2 sm:pr-3 text-right">{boardDistSpec.shortLabel} ET</th>
                        <th className="py-2 pr-0 sm:pr-3 text-right">TRAP</th>
                        <th className="hidden sm:table-cell py-2 text-right">RT</th>
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
                              No global {boardDistSpec.label.toLowerCase()} runs recorded in this class yet. Set the first track record!
                            </td>
                          </tr>
                        ) : (
                          filteredGlobal.map((entry, idx) => {
                            const isMe = user && entry.uid === user.uid;
                            return (
                              <tr
                                key={entry.id}
                                className={`border-b border-[#221c36] ${
                                  isMe ? 'bg-[#261d38]' : 'hover:bg-[#1a152b]'
                                }`}
                              >
                                <td className="py-2 pr-2 sm:pr-3 font-bold text-[#f5b82e]">
                                  {idx + 1}
                                </td>
                                <td className="py-2 pr-2 sm:pr-3 font-semibold text-[#f4f1e6] max-w-[90px] sm:max-w-none truncate">
                                  {entry.driverName}
                                </td>
                                <td className="py-2 pr-2 sm:pr-3 text-[#94a3b8]">T{entry.tier}</td>
                                <td className="py-2 pr-2 sm:pr-3 text-[#cbd5e1] max-w-[100px] sm:max-w-none truncate">
                                  <span
                                    className="inline-block w-2 h-2 sm:w-2.5 sm:h-2.5 mr-1.5 sm:mr-2 align-middle border border-white/30"
                                    style={{ backgroundColor: entry.paintColor }}
                                  />
                                  {entry.carName}
                                </td>
                                <td className="py-2 pr-2 sm:pr-3 text-right font-bold text-[#22c55e]">
                                  {formatEt(entry.etMs)}
                                </td>
                                <td className="py-2 pr-0 sm:pr-3 text-right text-[#f4f1e6]">
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
                          <td colSpan={7} className="py-8 text-center text-[#94a3b8]">
                            Complete a clean {boardDistSpec.label.toLowerCase()} run to log your local track records.
                          </td>
                        </tr>
                      ) : (
                        filteredLocal.map((entry, idx) => (
                          <tr
                            key={entry.id}
                            className="border-b border-[#221c36] hover:bg-[#1a152b]"
                          >
                            <td className="py-2 pr-2 sm:pr-3 font-bold text-[#f5b82e]">
                              {idx + 1}
                            </td>
                            <td className="py-2 pr-2 sm:pr-3 font-semibold text-[#f4f1e6] max-w-[90px] sm:max-w-none truncate">
                              {entry.driverName}
                            </td>
                            <td className="py-2 pr-2 sm:pr-3 text-[#94a3b8]">T{entry.tier}</td>
                            <td className="py-2 pr-2 sm:pr-3 text-[#cbd5e1] max-w-[100px] sm:max-w-none truncate">
                              <span
                                className="inline-block w-2 h-2 sm:w-2.5 sm:h-2.5 mr-1.5 sm:mr-2 align-middle border border-white/30"
                                style={{ backgroundColor: entry.paintColor }}
                              />
                              {entry.carName}
                            </td>
                            <td className="py-2 pr-2 sm:pr-3 text-right font-bold text-[#22c55e]">
                              {formatEt(entry.etMs)}
                            </td>
                            <td className="py-2 pr-0 sm:pr-3 text-right text-[#f4f1e6]">
                              {entry.trapMph.toFixed(1)}
                            </td>
                            <td className="hidden sm:table-cell py-2 text-right text-[#94a3b8]">
                              {(entry.reactionMs / 1000).toFixed(3)}s
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

      {/* Mobile Fixed Bottom Thumb Navigation Bar (<= 15% combined sticky height, 48px+ targets) */}
      <nav
        aria-label="Garage sections"
        className="lg:hidden shrink-0 bg-[#141020] border-t-2 border-[#302847] grid grid-cols-6 pb-[env(safe-area-inset-bottom)]"
      >
        {tabs.map((tab) => {
          const active = activeTab === tab.id && !mobileDynoOpen;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleSelectTab(tab.id)}
              className={`min-h-[52px] flex flex-col items-center justify-center gap-0.5 px-1 transition-colors cursor-pointer ${
                active
                  ? 'bg-[#261c3d] text-[#ff4d2e] border-t-2 border-[#ff4d2e] -mt-[2px]'
                  : 'text-[#94a3b8] hover:text-[#f4f1e6]'
              }`}
            >
              {tab.icon}
              <span className="text-[10px] font-bold leading-none whitespace-nowrap">
                {tab.shortLabel}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
