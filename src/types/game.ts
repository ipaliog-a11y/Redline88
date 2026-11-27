export type TierId = 1 | 2 | 3 | 4 | 5;

export type StripDistanceId = 'quarter' | 'half' | 'mile';

export interface StripDistanceSpec {
  id: StripDistanceId;
  label: string;
  shortLabel: string;
  feet: number;
  description: string;
  tuningHint: string;
  purseMultiplier: number;
}

export type EnvironmentTheme =
  | 'backroad'
  | 'harbor'
  | 'metro'
  | 'speedway'
  | 'nationals';

export type TimeOfDay = 'afternoon' | 'sunset' | 'night';
export type TimeOfDayMode = 'auto' | TimeOfDay;

export type ChassisStyle =
  | 'hatch'
  | 'muscle'
  | 'jdm'
  | 'funny'
  | 'topfuel';

export type BodyVariant =
  | 'standard'
  | 'compact'
  | 'boxy'
  | 'wedge'
  | 'notch'
  | 'fastback'
  | 'aero'
  | 'slingshot'
  | 'canopy'
  | 'twin';

export type UpgradeKey =
  | 'engine'
  | 'induction'
  | 'transmission'
  | 'tires'
  | 'chassis'
  | 'nitrous';

export type StripeStyle = 'none' | 'twin' | 'flash' | 'checkered' | 'flames';
export type RimStyle = 'steel' | 'gold' | 'chrome' | 'prostar';

export interface CarUpgrades {
  engine: number;       // 0..5
  induction: number;    // 0..5
  transmission: number; // 0..5
  tires: number;        // 0..5
  chassis: number;      // 0..5
  nitrous: number;      // 0..5
}

export interface CarVisuals {
  paintColor: string;
  stripe: StripeStyle;
  rims: RimStyle;
}

export interface DrivetrainTuning {
  finalDrive: number;      // 2.20..5.40
  gearRatios: number[];    // length matches car.gearRatios.length
  launchRpmOffset: number; // -600..+600 RPM
  shiftRpmOffset: number;  // -600..+350 RPM
  topGearRevProtection?: boolean; // Electronic soft-cut rev limiter in top gear to prevent engine over-rev damage
}

export type OutputBracketId = 1 | 2 | 3 | 4 | 5;

export interface OutputBracketSpec {
  id: OutputBracketId;
  code: string;
  name: string;
  etRangeLabel: string;
  hpRangeLabel: string;
  minEtSec: number;
  maxEtSec: number;
  color: string;
}

export interface RaceEligibilityResult {
  eligible: boolean;
  reason?: 'OVER_BRACKET' | 'UNDER_BRACKET';
  message?: string;
  carBracket: OutputBracketSpec;
  eventBracket: OutputBracketSpec;
  isStepUp?: boolean;
}

export interface CarConfig {
  upgrades: CarUpgrades;
  visuals: CarVisuals;
  tuning?: DrivetrainTuning;
  engineHealth?: number; // 0..100 (100 = fresh)
}

export interface CarSpec {
  id: string;
  name: string;
  subtitle: string;
  specialty: string;
  tier: TierId;
  chassis: ChassisStyle;
  bodyVariant: BodyVariant;
  price: number;
  baseHp: number;
  baseWeightLbs: number;
  baseGrip: number;         // 0.7..2.8
  redlineRpm: number;
  idleRpm: number;
  launchRpmMin: number;
  launchRpmMax: number;
  shiftRpmMin: number;
  shiftRpmMax: number;
  gearRatios: number[];
  finalDrive: number;
  dragCoeff: number;
  defaultPaint: string;
  hasParachute: boolean;
  traits: string[];
}

export interface ComputedPerformance {
  hp: number;
  rawHp: number;
  engineHealth: number;
  wearPenaltyPct: number;
  weightLbs: number;
  grip: number;
  redlineRpm: number;
  shiftSpeedSec: number;
  shiftBoostMult: number;
  shiftWindowBonus: number;
  nitrousShots: number;
  nitrousPowerMult: number;
  pi: number;
  bracket: OutputBracketSpec;
  estimatedEtSec: number;
  estimatedHalfEtSec: number;
  estimatedMileEtSec: number;
  topSpeedMph: number;
}

export interface RivalSpec {
  id: string;
  name: string;
  title: string;
  tier: TierId;
  distance: StripDistanceId;
  stageIndex: number; // 1..4 on quarter, 1..2 on half/mile
  isBoss: boolean;
  carId: string;
  carName: string;
  chassis: ChassisStyle;
  bodyVariant?: BodyVariant;
  paintColor: string;
  stripe: StripeStyle;
  rims: RimStyle;
  upgrades: CarUpgrades;
  targetEtSec: number;
  targetTrapMph: number;
  reactionSec: number;
  winPurse: number;
  lossPurse: number;
  challengeNote?: string;
}

export interface TierSpec {
  id: TierId;
  name: string;
  className: string;
  venueName: string;
  theme: EnvironmentTheme;
  accentColor: string;
  description: string;
}

export interface UpgradeCategoryMeta {
  key: UpgradeKey;
  name: string;
  shortDesc: string;
  baseCost: number;
  tierNames: string[];
}

export interface PlayerSave {
  callsign: string;
  cash: number;
  activeCarId: string;
  highestUnlockedTier: TierId;
  ownedCars: string[];
  defeatedRivals: string[];
  carConfigs: Record<string, CarConfig>;
  totalWins: number;
  totalRaces: number;
  updatedAtMs?: number;
}

export interface ReplayShiftEvent {
  t: number;
  distFt: number;
  mph: number;
  rpm: number;
  fromGear: number;
  toGear: number;
  rating: ShiftRating;
  color: string;
  usedClutch?: boolean;
  kind: 'launch' | 'shift' | 'nitrous';
}

export interface ReplaySample {
  t: number;
  d: number;
  v: number;
  r: number;
  g: number;
  p: number;
  rd?: number;
  b?: 1;
}

export interface RaceReplayData {
  tier: TierId;
  distance: StripDistanceId;
  distanceFt: number;
  timeOfDay?: TimeOfDay;
  carId: string;
  visuals: CarVisuals;
  upgrades: CarUpgrades;
  redlineRpm: number;
  launchMinRpm: number;
  launchMaxRpm: number;
  shiftMinRpm: number;
  shiftMaxRpm: number;
  totalEtSec: number;
  trapMph: number;
  reactionSec: number;
  sixtyFtSec: number;
  quarterSplitSec?: number;
  halfSplitSec?: number;
  rival?: {
    name: string;
    carName: string;
    chassis: ChassisStyle;
    bodyVariant?: BodyVariant;
    paintColor: string;
    stripe: StripeStyle;
    rims: RimStyle;
    upgrades: CarUpgrades;
  };
  events: ReplayShiftEvent[];
  samples: ReplaySample[];
}

export interface LocalRecord {
  id: string;
  driverName: string;
  tier: TierId;
  distance?: StripDistanceId;
  carId: string;
  carName: string;
  etMs: number;
  trapMph: number;
  reactionMs: number;
  perfectShifts: number;
  paintColor: string;
  timestamp: number;
  replay?: RaceReplayData;
}

export interface GlobalLeaderboardEntry {
  id: string;
  uid: string;
  driverName: string;
  tier: TierId;
  distance: StripDistanceId;
  carId: string;
  carName: string;
  etMs: number;
  trapMph: number;
  reactionMs: number;
  perfectShifts: number;
  paintColor: string;
  isPublic: boolean;
}

export type ShiftRating =
  | 'PERFECT CLUTCH!'
  | 'PERFECT SHIFT!'
  | 'GOOD SHIFT'
  | 'EARLY SHIFT'
  | 'OVER-REV!'
  | 'PERFECT LAUNCH!'
  | 'WHEELSPIN!'
  | 'BOG LAUNCH'
  | 'RED LIGHT FOUL!'
  | 'NITROUS BOOST!';

export type RacePhase =
  | 'BURNOUT'
  | 'STAGING'
  | 'COUNTDOWN'
  | 'RACING'
  | 'FINISH_COAST'
  | 'RESULTS';

export interface RaceTelemetry {
  phase: RacePhase;
  distance: StripDistanceId;
  distanceFt: number;
  treeStep: number; // -2=off(burnout), 0=prestage, 1=stage, 2=amber1, 3=amber2, 4=amber3, 5=green, -1=foul
  elapsedSec: number;
  playerDistFt: number;
  rivalDistFt: number;
  playerMph: number;
  rivalMph: number;
  rpm: number;
  redlineRpm: number;
  launchMinRpm: number;
  launchMaxRpm: number;
  shiftMinRpm: number;
  shiftMaxRpm: number;
  gear: number; // 0 = N (staging/clutch), 1..N
  maxGears: number;
  throttle: boolean;
  clutch: boolean;
  brake: boolean;
  burnoutTimeLeft: number;
  burnoutDuration: number;
  burnoutTemp: number; // 0..100
  burnoutEfficiency: number; // 0..100
  burnoutGripBonusPct: number; // e.g. -6..+18
  burnoutSkipped: boolean;
  boostTimer: number;
  nitrousLeft: number;
  nitrousMax: number;
  nitrousActive: boolean;
  wheelspin: number; // 0..1
  inLaunchZone: boolean;
  inShiftZone: boolean;
  calloutText: string;
  calloutTimer: number;
  calloutColor: string;
  foul: boolean;
  revProtectionActive?: boolean;
}

export interface RaceResult {
  won: boolean;
  foul: boolean;
  isTimeTrial: boolean;
  distance: StripDistanceId;
  rival: RivalSpec | null;
  tier: TierId;
  carId: string;
  carName: string;
  paintColor: string;
  playerEtMs: number;
  rivalEtMs: number;
  playerTrapMph: number;
  rivalTrapMph: number;
  reactionMs: number;
  sixtyFtSec: number;
  quarterSplitSec?: number;
  halfSplitSec?: number;
  perfectLaunch: boolean;
  perfectShifts: number;
  perfectClutchShifts: number;
  basePurse: number;
  shiftBonusCash: number;
  launchBonusCash: number;
  recordBonusCash: number;
  totalCashEarned: number;
  isRematch?: boolean;
  unlockedNextTier: boolean;
  isNewPersonalBest: boolean;
  overRevCount?: number;
  nitrousUsedCount?: number;
  topGearRevProtectionUsed?: boolean;
  engineWearApplied?: number;
  engineHealthAfter?: number;
  burnoutEfficiency?: number;
  burnoutSkipped?: boolean;
  replay?: RaceReplayData;
}

export type AppScreen = 'TITLE' | 'GARAGE' | 'RACE';
export type GarageTab = 'RACES' | 'SHOP' | 'TUNING' | 'CUSTOMIZE' | 'DEALER' | 'LEADERBOARD';
