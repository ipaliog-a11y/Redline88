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
  RIVALS,
  TOTAL_CAREER_EVENTS,
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

const RIBBON_NAV: {
  id: GarageTab;
  label: string;
  shortLabel: string;
  icon: PixelIconName;
  activeBg: string;
  activeText: string;
  idleBg: string;
  idleText: string;
}[] = [
  {
    id: 'RACES',
    label: 'RACE STRIP',
    shortLabel: 'RACE',
    icon: 'flag',
    activeBg: 'bg-[#f7b519]',
    activeText: 'text-[#141218]',
    idleBg: 'bg-[#2a2533] hover:bg-[#3a3245]',
    idleText: 'text-[#f7b519]',
  },
  {
    id: 'SHOP',
    label: 'PARTS SHOP',
    shortLabel: 'PARTS',
    icon: 'wrench',
    activeBg: 'bg-[#e83b24]',
    activeText: 'text-[#ffffff]',
    idleBg: 'bg-[#2a2533] hover:bg-[#3a3245]',
    idleText: 'text-[#f4ecd8]',
  },
  {
    id: 'TUNING',
    label: 'DRIVETRAIN',
    shortLabel: 'TUNE',
    icon: 'gears',
    activeBg: 'bg-[#e83b24]',
    activeText: 'text-[#ffffff]',
    idleBg: 'bg-[#2a2533] hover:bg-[#3a3245]',
    idleText: 'text-[#f4ecd8]',
  },
  {
    id: 'CUSTOMIZE',
    label: 'PAINT & MODS',
    shortLabel: 'PAINT',
    icon: 'paint',
    activeBg: 'bg-[#f7b519]',
    activeText: 'text-[#141218]',
    idleBg: 'bg-[#2a2533] hover:bg-[#3a3245]',
    idleText: 'text-[#f7b519]',
  },
  {
    id: 'DEALER',
    label: 'SHOWROOM',
    shortLabel: 'CARS',
    icon: 'car',
    activeBg: 'bg-[#19d4e6]',
    activeText: 'text-[#141218]',
    idleBg: 'bg-[#2a2533] hover:bg-[#3a3245]',
    idleText: 'text-[#19d4e6]',
  },
  {
    id: 'LEADERBOARD',
    label: 'RANKS',
    shortLabel: 'RANKS',
    icon: 'trophy',
    activeBg: 'bg-[#f4ecd8]',
    activeText: 'text-[#141218]',
    idleBg: 'bg-[#2a2533] hover:bg-[#3a3245]',
    idleText: 'text-[#f4ecd8]',
  },
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
  const [editingCallsign, setEditingCallsign] = useState(false);

  // Parts Shop live preview state
  const [hoveredUpgrade, setHoveredUpgrade] = useState<UpgradeKey | null>(null);

  // Paint & Mods preview-before-buying state
  const [visualDraft, setVisualDraft] = useState<VisualDraft>({});

  // Mobile collapsible Pit Bay drawer
  const [mobileDynoOpen, setMobileDynoOpen] = useState<boolean>(false);

  // Track viewport breakpoint so hidden canvases never waste RAF cycles
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
            stripe: 'none' as const,
            rims: 'steel' as const,
          }
        : config.visuals;

    return {
      upgrades: nextUpgrades,
      visuals: nextVisuals,
      tuning: config.tuning,
      engineHealth: config.engineHealth,
    };
  }, [activeTab, activeUpgradePreview, hoveredUpgrade, config, visualDraft]);

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

    return { patch, items, totalCost, hasChanges: items.length > 0 };
  }, [visualDraft, config.visuals]);

  const handleSaveCallsign = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = sanitizeCallsign(callsignDraft);
    setCallsignDraft(cleaned);
    onUpdateCallsign(cleaned);
    setEditingCallsign(false);
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

  const mountHeroPitBay = (isDesktop || mobileDynoOpen) && !replayRecord;
  const mountMobilePaintBay =
    !isDesktop && !mobileDynoOpen && activeTab === 'CUSTOMIZE' && !replayRecord;
  const mountShowroomTurntable = activeTab === 'DEALER' && !mobileDynoOpen && !replayRecord;

  const shownHp = activeUpgradePreview ? activeUpgradePreview.nextPerf.hp : perf.hp;
  const shownEt = activeUpgradePreview
    ? activeUpgradePreview.nextPerf.estimatedEtSec
    : perf.estimatedEtSec;
  const shownWeight = activeUpgradePreview
    ? activeUpgradePreview.nextPerf.weightLbs
    : perf.weightLbs;
  const shownGrip = activeUpgradePreview ? activeUpgradePreview.nextPerf.grip : perf.grip;
  const shownTopSpd = activeUpgradePreview
    ? activeUpgradePreview.nextPerf.topSpeedMph
    : perf.topSpeedMph;
  const shownNos = activeUpgradePreview
    ? activeUpgradePreview.nextPerf.nitrousShots
    : perf.nitrousShots;

  return (
    <div className="h-[100dvh] w-full bg-[#141218] text-[#f4ecd8] flex flex-col overflow-hidden">
      {/* TOP NEO-GEO ARCADE CABINET HEADER */}
      <header className="shrink-0 bg-[#1c1a22] border-b-2 border-[#525866] px-3 sm:px-5 py-2 flex items-center justify-between gap-2 sm:gap-4 shadow-[0_3px_0_#07060a] z-20">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          {/* Skewed Arcade Marquee Title */}
          <div className="flex items-center gap-2 shrink-0 -skew-x-10">
            <span className="font-pixel text-xs sm:text-base text-[#e83b24] pixel-text-shadow tracking-wider whitespace-nowrap">
              REDLINE <span className="text-[#f7b519]">&apos;88</span>
            </span>
          </div>

          {/* Driver Tag & Inline Callsign Editor */}
          <div className="hidden md:flex items-center gap-2 text-xs font-mono-num whitespace-nowrap">
            {editingCallsign ? (
              <form onSubmit={handleSaveCallsign} className="flex items-center gap-1.5">
                <input
                  id="callsign-input"
                  type="text"
                  maxLength={18}
                  autoFocus
                  value={callsignDraft}
                  onChange={(e) => setCallsignDraft(e.target.value)}
                  className="ng-vfd px-2 py-0.5 text-xs text-[#f7b519] w-32 focus:outline-none focus:border-[#f7b519]"
                />
                <button
                  type="submit"
                  className="ng-keycap px-2 py-0.5 bg-[#2ee66b] text-[#141218] border border-[#141218] text-[10px] font-bold uppercase cursor-pointer"
                >
                  OK
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCallsignDraft(save.callsign);
                    setEditingCallsign(false);
                  }}
                  className="ng-keycap px-2 py-0.5 bg-[#323642] text-[#f4ecd8] border border-[#141218] text-[10px] font-bold cursor-pointer"
                >
                  X
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => {
                  soundEngine.playUiClick();
                  setEditingCallsign(true);
                }}
                title="Click to edit driver callsign"
                className="ng-vfd px-2.5 py-0.5 text-[#f7b519] hover:border-[#f7b519] font-bold cursor-pointer"
              >
                {save.callsign}
              </button>
            )}
            <span className="ng-vfd px-2 py-0.5 text-[#19d4e6] font-bold">
              T{save.highestUnlockedTier}/5
            </span>
            <span className="ng-vfd px-2 py-0.5 text-[#2ee66b] font-bold">
              {save.defeatedRivals.filter((id) => RIVALS.some((r) => r.id === id)).length}/{TOTAL_CAREER_EVENTS} EV
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* VFD Cash Register Bankroll */}
          <div className="ng-vfd px-2.5 sm:px-3.5 py-1 font-mono-num text-xs sm:text-sm font-bold text-[#2ee66b] flex items-center gap-1.5 whitespace-nowrap">
            <PixelIcon name="coin" className="w-4 h-4" />
            <span>{formatCash(save.cash)}</span>
          </div>

          {user && !user.emailVerified && (
            <span
              title="Verify your email to enable cloud sync and global leaderboards"
              className="hidden sm:inline-flex items-center px-2 py-1 bg-[#382710] border-2 border-[#f7b519] text-[10px] font-mono-num font-bold text-[#f7b519] whitespace-nowrap"
            >
              UNVERIFIED
            </span>
          )}

          {user ? (
            <button
              type="button"
              onClick={onSignOut}
              aria-label="Sign out"
              className="ng-keycap h-8 sm:h-9 px-2.5 sm:px-3 bg-[#2c2935] hover:bg-[#3a3647] border-2 border-[#525866] text-xs font-bold text-[#f4ecd8] flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <PixelIcon name="logout" className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">SIGN OUT</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onSignIn}
              className="ng-keycap h-8 sm:h-9 px-2.5 sm:px-3.5 bg-[#f7b519] hover:bg-[#ffd557] border-2 border-[#141218] text-xs font-bold text-[#141218] flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <PixelIcon name="login" className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">SIGN IN</span>
            </button>
          )}

          <button
            type="button"
            onClick={onToggleMute}
            aria-label={muted ? 'Unmute audio' : 'Mute audio'}
            className="ng-keycap h-8 w-8 sm:h-9 sm:w-9 flex items-center justify-center bg-[#2c2935] hover:bg-[#3a3647] border-2 border-[#525866] hover:border-[#f7b519] cursor-pointer"
          >
            <PixelIcon name={muted ? 'soundOff' : 'soundOn'} className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Mobile Compact Active Car Bar */}
      <div className="lg:hidden shrink-0 bg-[#1a1820] border-b-2 border-[#323642] px-3 py-1.5 flex items-center justify-between gap-2">
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
              className="w-3.5 h-3.5 shrink-0 border-2 border-[#141218]"
              style={{ backgroundColor: config.visuals.paintColor }}
            />
            <div className="text-xs font-bold text-[#f4ecd8] truncate">
              {car.name}
              <span className="font-mono-num text-[11px] font-normal text-[#b8c0cc] ml-1.5">
                T{car.tier} · {perf.hp.toLocaleString()} HP ·{' '}
                <span style={{ color: healthStatus.color }} className="font-bold">
                  {engineHealth}% ENG
                </span>
              </span>
            </div>
          </div>
          <span className="shrink-0 ng-vfd px-2 py-0.5 font-mono-num text-[10px] font-bold text-[#f7b519] uppercase">
            {mobileDynoOpen ? '▲ CLOSE BAY' : '▼ PIT BAY'}
          </span>
        </button>
      </div>

      {/* FULL-WIDTH TOP NEO-GEO PIT BAY HERO STAGE (Desktop always visible; Mobile toggleable) */}
      <div
        className={`${
          mobileDynoOpen ? 'block shrink-0' : 'hidden'
        } lg:block shrink-0 bg-[#0d0c11] border-b-2 border-[#525866] relative`}
      >
        <div className="max-w-[1440px] mx-auto relative">
          {/* Wide Hi-Res Pixel Art Pit Bay Stage */}
          <div className="relative w-full h-[178px] sm:h-[205px] lg:h-[218px] overflow-hidden">
            {mountHeroPitBay ? (
              <HiBitShowcaseCanvas
                mode="pitbay"
                wide={isDesktop}
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

            {/* Floating Left Steel VFD Telemetry Monitor */}
            <div className="pointer-events-none absolute top-2.5 left-2.5 sm:left-4 ng-vfd border-2 border-[#b8c0cc] px-2.5 sm:px-3 py-1.5 sm:py-2 min-w-[142px] sm:min-w-[180px] shadow-[3px_3px_0_#07060a]">
              <div className="flex items-center justify-between gap-2 border-b border-[#323642] pb-1 mb-1">
                <span className="font-pixel text-[8px] sm:text-[9px] text-[#f4ecd8] truncate">
                  {car.name.toUpperCase()}
                </span>
                {(visualCheckout.hasChanges || activeUpgradePreview) && (
                  <span className="bg-[#f7b519] text-[#141218] font-pixel text-[7px] px-1 py-0.5">
                    PREVIEW
                  </span>
                )}
              </div>
              <div className="font-mono-num text-xs sm:text-sm font-bold text-[#19d4e6] flex items-baseline justify-between gap-2">
                <span>{shownHp.toLocaleString()} HP</span>
                {previewHpDiff > 0 ? (
                  <span className="text-[11px] text-[#2ee66b]">+{previewHpDiff}</span>
                ) : (
                  !activeUpgradePreview &&
                  perf.wearPenaltyPct > 0 && (
                    <span className="text-[11px] font-bold" style={{ color: healthStatus.color }}>
                      -{perf.wearPenaltyPct}%
                    </span>
                  )
                )}
              </div>
              <div className="font-mono-num text-xs sm:text-sm font-bold text-[#f7b519] flex items-baseline justify-between gap-2">
                <span>{shownEt.toFixed(2)}s 1/4</span>
                {previewEtDiff < 0 && (
                  <span className="text-[11px] text-[#2ee66b]">{previewEtDiff.toFixed(2)}s</span>
                )}
              </div>
            </div>

            {/* Floating Right Steel VFD Telemetry Monitor */}
            <div className="pointer-events-none absolute top-2.5 right-2.5 sm:right-4 ng-vfd border-2 border-[#b8c0cc] px-2.5 sm:px-3 py-1.5 sm:py-2 min-w-[136px] sm:min-w-[180px] shadow-[3px_3px_0_#07060a] text-right">
              <div className="font-pixel text-[7px] sm:text-[8px] border-b border-[#323642] pb-1 mb-1 flex items-center justify-between gap-2">
                <span style={{ color: (activeUpgradePreview ? activeUpgradePreview.nextPerf.bracket : perf.bracket).color }}>
                  {(activeUpgradePreview ? activeUpgradePreview.nextPerf.bracket : perf.bracket).code}{' '}
                  {(activeUpgradePreview ? activeUpgradePreview.nextPerf.bracket : perf.bracket).name}
                </span>
                <span className="text-[#b8c0cc]">{shownTopSpd} MPH</span>
              </div>
              <div className="font-mono-num text-[11px] sm:text-xs font-bold text-[#f4ecd8] flex items-baseline justify-between gap-2">
                <span className="text-[#94a3b8]">WT</span>
                <span>
                  {shownWeight.toLocaleString()} LB
                  {previewWeightDiff < 0 && (
                    <span className="text-[#2ee66b] ml-1">{previewWeightDiff}</span>
                  )}
                </span>
              </div>
              <div className="font-mono-num text-[11px] sm:text-xs font-bold text-[#2ee66b] flex items-baseline justify-between gap-2">
                <span className="text-[#94a3b8]">GRIP</span>
                <span>
                  {shownGrip.toFixed(2)}G
                  {previewGripDiff > 0 && (
                    <span className="text-[#86efac] ml-1">+{previewGripDiff.toFixed(2)}</span>
                  )}
                  {shownNos > 0 && <span className="text-[#19d4e6] ml-1.5">{shownNos}NOS</span>}
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Pit-Bay Service Strip: Engine Health Bar & Repair Keycap + License-Plate Car Switcher */}
          <div className="bg-[#1b1822] border-t-2 border-[#323642] px-3 py-1.5 flex flex-wrap items-center justify-between gap-2.5">
            {/* Engine Health & Repair Module */}
            <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
              <div className="flex items-center gap-2 ng-vfd px-2.5 py-1">
                <PixelIcon name="wrench" className="w-3.5 h-3.5 shrink-0" />
                <span className="font-pixel text-[8px] text-[#b8c0cc]">ENG</span>
                <div className="w-20 sm:w-24 h-2.5 bg-[#141218] border border-[#525866] overflow-hidden">
                  <div
                    className="h-full transition-[width] duration-150"
                    style={{
                      width: `${engineHealth}%`,
                      backgroundColor: healthStatus.color,
                    }}
                  />
                </div>
                <span
                  className="font-mono-num text-[11px] font-bold"
                  style={{ color: healthStatus.color }}
                >
                  {engineHealth}% {healthStatus.label.toUpperCase()}
                </span>
              </div>

              {engineHealth < 100 && (
                <button
                  type="button"
                  disabled={!canAffordRepair}
                  onClick={() => {
                    soundEngine.playShopBuy();
                    onRepairEngine(car.id);
                  }}
                  className={`ng-keycap px-2.5 py-1 font-mono-num text-[11px] font-bold border-2 whitespace-nowrap cursor-pointer ${
                    canAffordRepair
                      ? 'bg-[#2ee66b] hover:bg-[#4ff588] text-[#141218] border-[#141218]'
                      : 'bg-[#18161e] text-[#64748b] border-[#323642] cursor-not-allowed'
                  }`}
                >
                  REPAIR ENGINE · {formatCash(repairCost)}
                </button>
              )}
            </div>

            {/* License-Plate Car Switcher */}
            {save.ownedCars.length > 1 && (
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                <span className="font-pixel text-[8px] text-[#f7b519] shrink-0 mr-1">GARAGE:</span>
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
                      className={`px-2.5 py-0.5 text-[11px] font-mono-num font-bold whitespace-nowrap cursor-pointer transition-transform active:translate-y-0.5 ${
                        active
                          ? 'ng-plate-tag border-[#e83b24] text-[#141218]'
                          : 'bg-[#26232e] text-[#b8c0cc] border-2 border-[#525866] hover:border-[#f7b519] hover:text-[#f4ecd8]'
                      }`}
                    >
                      T{spec.tier} · {spec.name}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Mobile Callsign Edit inside open Pit Bay drawer */}
            {mobileDynoOpen && (
              <form onSubmit={handleSaveCallsign} className="lg:hidden flex items-center gap-1.5">
                <input
                  type="text"
                  maxLength={18}
                  value={callsignDraft}
                  onChange={(e) => setCallsignDraft(e.target.value)}
                  aria-label="Driver callsign"
                  className="ng-vfd px-2 py-1 text-xs font-mono-num text-[#f7b519] w-28"
                />
                <button
                  type="submit"
                  className="ng-keycap px-2.5 py-1 bg-[#f7b519] text-[#141218] border-2 border-[#141218] text-[10px] font-bold cursor-pointer"
                >
                  SAVE ID
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* LOWER NEO-GEO PADDOCK COMMAND DECK: SKEWED RIVETED RIBBONS LEFT · STATION VIEWPORT RIGHT */}
      <div className="flex-1 min-h-0 max-w-[1440px] w-full mx-auto flex flex-col lg:grid lg:grid-cols-12 lg:grid-rows-[minmax(0,1fr)] gap-3 lg:gap-4 p-2.5 sm:p-3 lg:p-4 overflow-hidden">
        {/* LEFT COLUMN (Desktop): SKEWED RIVETED STEEL SPEED-RIBBON NAVIGATION */}
        <aside className="hidden lg:flex lg:col-span-3 flex-col justify-between gap-3 min-h-0 h-full overflow-y-auto overscroll-y-contain pr-1 pb-2">
          <nav aria-label="Paddock stations" className="flex flex-col gap-2.5 px-1.5 pt-0.5">
            {RIBBON_NAV.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectTab(item.id)}
                  className={`ng-ribbon w-full cursor-pointer text-left ${
                    active ? 'ring-2 ring-[#f7b519]' : ''
                  }`}
                >
                  <span
                    className={`ng-ribbon-inner w-full justify-start ${
                      active
                        ? `${item.activeBg} ${item.activeText}`
                        : `${item.idleBg} ${item.idleText}`
                    }`}
                  >
                    <span className="ng-unskew w-full justify-between">
                      <span className="inline-flex items-center gap-2">
                        <PixelIcon name={item.icon} className="w-4 h-4 shrink-0" />
                        <span className="font-pixel text-[10px] tracking-wide whitespace-nowrap">
                          {item.label}
                        </span>
                      </span>
                      {active && <span className="font-pixel text-[9px]">▶</span>}
                    </span>
                  </span>
                </button>
              );
            })}
          </nav>

          {/* Compact Arcade Cabinet Controls Plaque */}
          <div className="ng-plate shrink-0 p-3 space-y-1.5">
            <div className="flex items-center justify-between border-b border-[#323642] pb-1">
              <span className="font-pixel text-[8px] text-[#f7b519]">CABINET CONTROLS</span>
              <span className="font-mono-num text-[10px] text-[#19d4e6]">MANUAL</span>
            </div>
            <div className="text-[11px] font-mono-num text-[#b8c0cc] leading-relaxed">
              <span className="text-[#f7b519] font-bold">SHIFT/S</span> Brake &amp; Clutch ·{' '}
              <span className="text-[#2ee66b] font-bold">W</span> Gas ·{' '}
              <span className="text-[#e83b24] font-bold">SPACE</span> Shift+ ·{' '}
              <span className="text-[#19d4e6] font-bold">N</span> NOS
            </div>
          </div>
        </aside>

        {/* RIGHT COLUMN: ACTIVE STATION WORKSPACE */}
        <section
          className={`${
            mobileDynoOpen ? 'hidden' : 'flex flex-1'
          } lg:flex lg:col-span-9 flex-col min-h-0 h-full`}
        >
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain pr-0.5 lg:pr-1 pb-2 space-y-3">
            {/* Mechanic's Warning Note when Engine Health < 50% */}
            {engineHealth < 50 && (
              <section
                aria-label="Mechanic's Note"
                className="bg-[#331618] border-2 border-[#e83b24] p-3 space-y-1.5 shadow-[3px_3px_0_#07060a]"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 font-pixel text-[9px] text-[#ffd557]">
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
                    className={`ng-keycap px-2.5 py-1 font-mono-num text-[10px] font-bold border-2 whitespace-nowrap shrink-0 cursor-pointer ${
                      canAffordRepair
                        ? 'bg-[#2ee66b] text-[#141218] border-[#141218]'
                        : 'bg-[#18161e] text-[#64748b] border-[#323642] cursor-not-allowed'
                    }`}
                  >
                    REPAIR · {formatCash(repairCost)}
                  </button>
                </div>
                <p className="text-xs font-mono-num text-[#f4ecd8] leading-snug">
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
                onSelectCar={onSelectCar}
                onOpenTuning={() => handleSelectTab('TUNING')}
                onOpenShop={() => handleSelectTab('SHOP')}
                onOpenShowroom={() => handleSelectTab('DEALER')}
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

      {/* Mobile Fixed Bottom Neo-Geo Arcade Selector Bar */}
      <nav
        aria-label="Garage sections"
        className="lg:hidden shrink-0 bg-[#1c1a22] border-t-2 border-[#525866] grid grid-cols-6 gap-1 px-1.5 py-1 pb-[max(0.25rem,env(safe-area-inset-bottom))]"
      >
        {RIBBON_NAV.map((tab) => {
          const active = activeTab === tab.id && !mobileDynoOpen;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleSelectTab(tab.id)}
              className={`min-h-[46px] flex flex-col items-center justify-center gap-0.5 px-1 border-2 transition-colors cursor-pointer ${
                active
                  ? 'bg-[#e83b24] text-white border-[#f7b519] shadow-[inset_1px_1px_0_rgba(255,255,255,0.3)]'
                  : 'bg-[#26232e] text-[#b8c0cc] border-[#323642] hover:text-[#f4ecd8]'
              }`}
            >
              <PixelIcon name={tab.icon} className="w-4 h-4" />
              <span className="font-pixel text-[7px] leading-none whitespace-nowrap">
                {tab.shortLabel}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Neo-Geo Replay Theater Modal */}
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
