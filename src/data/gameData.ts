import {
  CarConfig,
  CarSpec,
  ComputedPerformance,
  DrivetrainTuning,
  OutputBracketId,
  OutputBracketSpec,
  PlayerSave,
  RaceEligibilityResult,
  RimStyle,
  StripDistanceId,
  StripDistanceSpec,
  StripeStyle,
  TierId,
  TierSpec,
  TimeOfDay,
  TimeOfDayMode,
  UpgradeCategoryMeta,
  UpgradeKey,
} from '../types/game';

export const QUARTER_MILE_FT = 1320;
export const HALF_MILE_FT = 2640;
export const ONE_MILE_FT = 5280;

export const STRIP_DISTANCES: StripDistanceSpec[] = [
  {
    id: 'quarter',
    label: '1/4 Mile',
    shortLabel: '1/4 MI',
    feet: QUARTER_MILE_FT,
    description: 'Classic 1,320-ft acceleration sprint. Short gears and hard launches win here.',
    tuningHint: 'Shorten Final Drive (higher number) for explosive 60-ft launch acceleration.',
    purseMultiplier: 1.0,
  },
  {
    id: 'half',
    label: '1/2 Mile',
    shortLabel: '1/2 MI',
    feet: HALF_MILE_FT,
    description: '2,640-ft runway speed trap shootout. Demands balanced gearing and mid-run pull.',
    tuningHint: 'Stretch Final Drive slightly lower so top gear carries through 2,640 ft without redlining.',
    purseMultiplier: 1.35,
  },
  {
    id: 'mile',
    label: '1 Mile',
    shortLabel: '1 MILE',
    feet: ONE_MILE_FT,
    description: '5,280-ft standing mile top-speed gauntlet. Aero drag and tall top gears decide the winner.',
    tuningHint: 'Use tall Final Drive & elongated top gears to avoid hitting the rev limiter early.',
    purseMultiplier: 1.85,
  },
];

export function getStripDistanceSpec(id: StripDistanceId): StripDistanceSpec {
  return STRIP_DISTANCES.find((d) => d.id === id) ?? STRIP_DISTANCES[0];
}

export const TIME_OF_DAY_OPTIONS: {
  id: TimeOfDayMode;
  label: string;
  shortLabel: string;
}[] = [
  { id: 'auto', label: 'Tier Default', shortLabel: 'Auto' },
  { id: 'afternoon', label: 'Sunny Afternoon', shortLabel: 'Afternoon' },
  { id: 'sunset', label: 'Golden Sunset', shortLabel: 'Sunset' },
  { id: 'night', label: 'Night Floodlights', shortLabel: 'Night' },
];

export function resolveTimeOfDay(tierId: TierId, mode: TimeOfDayMode): TimeOfDay {
  if (mode !== 'auto') return mode;
  if (tierId === 1) return 'afternoon';
  if (tierId === 2) return 'sunset';
  if (tierId === 3) return 'afternoon';
  if (tierId === 4) return 'sunset';
  return 'night';
}

export const TIERS: TierSpec[] = [
  {
    id: 1,
    name: 'Tier 1 · Street Class',
    className: 'STREET',
    venueName: 'Backroad Dusk Strip',
    theme: 'backroad',
    accentColor: '#ff6b35',
    description: 'Sun-baked desert two-lane strip. Master clutch launches and crisp shifts.',
  },
  {
    id: 2,
    name: 'Tier 2 · Street Mod',
    className: 'STREET MOD',
    venueName: 'Harbor Docks Strip',
    theme: 'harbor',
    accentColor: '#f5b82e',
    description: 'Twilight container yard tarmac with heavy V8 muscle and sticky slicks.',
  },
  {
    id: 3,
    name: 'Tier 3 · Pro Street',
    className: 'PRO STREET',
    venueName: 'Metro Stadium Raceway',
    theme: 'metro',
    accentColor: '#22c55e',
    description: 'Floodlit stadium grandstands and twin-turbo 9-second rockets.',
  },
  {
    id: 4,
    name: 'Tier 4 · Funny Car',
    className: 'FUNNY CAR',
    venueName: 'Midnight Speedway',
    theme: 'speedway',
    accentColor: '#38bdf8',
    description: 'Supercharged alcohol & nitro flip-bodies pulling 230+ MPH traps.',
  },
  {
    id: 5,
    name: 'Tier 5 · Top Fuel',
    className: 'TOP FUEL',
    venueName: 'Thunder Nationals Finals',
    theme: 'nationals',
    accentColor: '#ff3b30',
    description: '330+ MPH nitro dragsters, vertical zoomie flames, and 3-second glory.',
  },
];

export const PAINT_COLORS: { name: string; hex: string; cost: number }[] = [
  { name: 'Rally Red', hex: '#d93829', cost: 0 },
  { name: 'Signal Yellow', hex: '#e8b624', cost: 150 },
  { name: 'Cobalt Track', hex: '#2563eb', cost: 150 },
  { name: 'Pearl White', hex: '#e5e7eb', cost: 200 },
  { name: 'Midnight Jet', hex: '#262936', cost: 200 },
  { name: 'Emerald GT', hex: '#16a34a', cost: 250 },
  { name: 'Tangerine 70', hex: '#ea580c', cost: 300 },
  { name: 'Plum Nitro', hex: '#7e22ce', cost: 350 },
];

export const STRIPE_OPTIONS: { id: StripeStyle; name: string; cost: number }[] = [
  { id: 'none', name: 'Clean Coat', cost: 0 },
  { id: 'twin', name: 'Twin Rally Stripe', cost: 250 },
  { id: 'flash', name: 'Side Lightning', cost: 400 },
  { id: 'checkered', name: 'Checkered Tail', cost: 550 },
  { id: 'flames', name: 'Hot Rod Flames', cost: 800 },
];

export const RIM_OPTIONS: { id: RimStyle; name: string; cost: number }[] = [
  { id: 'steel', name: 'Factory Steelies', cost: 0 },
  { id: 'gold', name: 'Gold Mesh Turbo', cost: 300 },
  { id: 'chrome', name: 'Deep Dish Chrome', cost: 500 },
  { id: 'prostar', name: 'Weld Pro-Stars', cost: 750 },
];

export const UPGRADE_CATEGORIES: UpgradeCategoryMeta[] = [
  {
    key: 'engine',
    name: 'Engine & Cam',
    shortDesc: 'Raises peak horsepower & redline ceiling',
    baseCost: 350,
    tierNames: ['Stock', 'Ported Head', 'Forged Pistons', 'Race Camshaft', 'Stroker Block', 'Billet Nitro Hemi'],
  },
  {
    key: 'induction',
    name: 'Turbo / Blower',
    shortDesc: 'Adds hood scoop & massive shift boost surge',
    baseCost: 420,
    tierNames: ['Stock Intake', 'Cold Air Box', 'Street Turbo', 'Twin Scroll', '6-71 Blower', '14-71 Nitro Blower'],
  },
  {
    key: 'transmission',
    name: 'Clutch & Gearbox',
    shortDesc: 'Faster shifts, wider sweet spot & stronger clutch kick',
    baseCost: 320,
    tierNames: ['Stock 4/5-Spd', 'Short Shifter', 'Stage 2 Clutch', 'Dog-Ring Box', 'Air Shifter', 'Multi-Disc Lockup'],
  },
  {
    key: 'tires',
    name: 'Drag Slicks',
    shortDesc: 'Fatter rear slicks, better launch grip & wheelie bar',
    baseCost: 280,
    tierNames: ['Street Radials', 'Semi-Slicks', 'Drag Radials', 'Wrinkle Slicks', 'Pro Slicks + Bars', 'Top Fuel 36" Slicks'],
  },
  {
    key: 'chassis',
    name: 'Chassis & Aero',
    shortDesc: 'Cuts weight & adds splitter + rear drag wing',
    baseCost: 300,
    tierNames: ['Stock Steel', 'Stripped Interior', 'Tubular Frame', 'Drag Wing Kit', 'Carbon Panels', 'Chromoly Rail'],
  },
  {
    key: 'nitrous',
    name: 'Exhaust & NOS',
    shortDesc: 'Adds zoomie pipes + press N for mid-run Nitrous boost',
    baseCost: 450,
    tierNames: ['Stock Muffler', '50-Shot Wet', '100-Shot Purge', '175-Shot Dual', '250-Shot Zoomies', 'Direct Port Nitro'],
  },
];

// 25 DISTINCT CARS (5 PER TIER — Original + 4 New Distinct Models per Tier)
export const CARS: CarSpec[] = [
  // ===================== TIER 1 · STREET CLASS =====================
  {
    id: 'civic_86',
    name: "Civic GT '86",
    subtitle: 'Balanced Featherweight 4-Cyl Hatch',
    specialty: 'All-Rounder',
    tier: 1,
    chassis: 'hatch',
    bodyVariant: 'standard',
    price: 0,
    baseHp: 155,
    baseWeightLbs: 2180,
    baseGrip: 0.92,
    redlineRpm: 7600,
    idleRpm: 1100,
    launchRpmMin: 3600,
    launchRpmMax: 4700,
    shiftRpmMin: 6600,
    shiftRpmMax: 7350,
    gearRatios: [3.25, 2.08, 1.44, 1.05, 0.82],
    finalDrive: 4.1,
    dragCoeff: 0.34,
    defaultPaint: '#d93829',
    hasParachute: false,
    traits: ['Balanced 5-Speed', 'Forgiving Launch Window', 'Featherweight Hatch', 'Great 1/4 Mile Starter'],
  },
  {
    id: 'crx_88',
    name: "CR-Pocket '88",
    subtitle: 'Ultra-Light High-Rev Kammback Coupe',
    specialty: 'High-RPM Screamer',
    tier: 1,
    chassis: 'hatch',
    bodyVariant: 'compact',
    price: 900,
    baseHp: 148,
    baseWeightLbs: 1890,
    baseGrip: 0.96,
    redlineRpm: 8300,
    idleRpm: 1200,
    launchRpmMin: 4200,
    launchRpmMax: 5300,
    shiftRpmMin: 7350,
    shiftRpmMax: 8050,
    gearRatios: [3.42, 2.22, 1.56, 1.15, 0.88],
    finalDrive: 4.25,
    dragCoeff: 0.31,
    defaultPaint: '#e8b624',
    hasParachute: false,
    traits: ['1,890 lbs Featherweight', '8,300 RPM Redline', 'Snappy Close Ratios', 'Blistering 60-ft Launch'],
  },
  {
    id: 'gti_85',
    name: "Euro GT-16V '85",
    subtitle: 'Wide-Grip Homologation Box Hatch',
    specialty: 'Traction Hook',
    tier: 1,
    chassis: 'hatch',
    bodyVariant: 'boxy',
    price: 1350,
    baseHp: 174,
    baseWeightLbs: 2290,
    baseGrip: 1.05,
    redlineRpm: 7400,
    idleRpm: 1050,
    launchRpmMin: 3400,
    launchRpmMax: 4650,
    shiftRpmMin: 6400,
    shiftRpmMax: 7150,
    gearRatios: [3.18, 2.02, 1.39, 1.02, 0.79],
    finalDrive: 3.95,
    dragCoeff: 0.36,
    defaultPaint: '#e5e7eb',
    hasParachute: false,
    traits: ['Best-in-Class 1.05G Grip', 'Zero-Spin Launch Hook', 'Boxy Rally Stance', 'Strong Mid-Range Pull'],
  },
  {
    id: 'prelude_89',
    name: "Aero Coupe '89",
    subtitle: 'Low-Drag Pop-Up Headlight Cruiser',
    specialty: 'Top-Speed Mile',
    tier: 1,
    chassis: 'jdm',
    bodyVariant: 'wedge',
    price: 1850,
    baseHp: 186,
    baseWeightLbs: 2420,
    baseGrip: 0.94,
    redlineRpm: 7800,
    idleRpm: 1050,
    launchRpmMin: 3700,
    launchRpmMax: 4800,
    shiftRpmMin: 6850,
    shiftRpmMax: 7550,
    gearRatios: [3.08, 1.96, 1.34, 0.98, 0.72],
    finalDrive: 3.7,
    dragCoeff: 0.27,
    defaultPaint: '#2563eb',
    hasParachute: false,
    traits: ['Slippery 0.27 Aero Drag', 'Tall Overdrive 5th Gear', 'Built for 1/2 & 1 Mile', 'Clean High-Speed Pull'],
  },
  {
    id: 'fox_87',
    name: "Fox 5.0 Notch '87",
    subtitle: 'Raw Street Small-Block V8 Sleeper',
    specialty: 'V8 Brute Torque',
    tier: 1,
    chassis: 'muscle',
    bodyVariant: 'notch',
    price: 2400,
    baseHp: 218,
    baseWeightLbs: 2820,
    baseGrip: 0.91,
    redlineRpm: 6300,
    idleRpm: 900,
    launchRpmMin: 2600,
    launchRpmMax: 3600,
    shiftRpmMin: 5400,
    shiftRpmMax: 6050,
    gearRatios: [3.35, 1.99, 1.33, 1.0, 0.74],
    finalDrive: 3.55,
    dragCoeff: 0.35,
    defaultPaint: '#16a34a',
    hasParachute: false,
    traits: ['218 HP Tier-1 Powerhouse', 'Low-RPM V8 Torque Curve', 'Notchback Drag Body', 'Dominates Long Strips'],
  },

  // ===================== TIER 2 · STREET MOD =====================
  {
    id: 'iroc_84',
    name: "IROC Fury '84",
    subtitle: 'Small-Block V8 Muscle Coupe',
    specialty: 'Balanced Muscle',
    tier: 2,
    chassis: 'muscle',
    bodyVariant: 'standard',
    price: 3600,
    baseHp: 340,
    baseWeightLbs: 3150,
    baseGrip: 1.04,
    redlineRpm: 6800,
    idleRpm: 950,
    launchRpmMin: 2900,
    launchRpmMax: 3900,
    shiftRpmMin: 5850,
    shiftRpmMax: 6550,
    gearRatios: [3.05, 1.98, 1.38, 1.02, 0.78],
    finalDrive: 3.9,
    dragCoeff: 0.36,
    defaultPaint: '#e8b624',
    hasParachute: false,
    traits: ['Low-End V8 Torque', 'Classic Fastback Coupe', 'Balanced 5-Speed Box', 'Reliable Traction'],
  },
  {
    id: 'gnx_87',
    name: "Blackout GNX '87",
    subtitle: 'Intercooled Turbo V6 Night Sleeper',
    specialty: 'Launch Monster',
    tier: 2,
    chassis: 'muscle',
    bodyVariant: 'notch',
    price: 4600,
    baseHp: 372,
    baseWeightLbs: 3020,
    baseGrip: 1.15,
    redlineRpm: 6600,
    idleRpm: 950,
    launchRpmMin: 3000,
    launchRpmMax: 4100,
    shiftRpmMin: 5650,
    shiftRpmMax: 6350,
    gearRatios: [2.84, 1.72, 1.16, 0.82],
    finalDrive: 3.65,
    dragCoeff: 0.37,
    defaultPaint: '#262936',
    hasParachute: false,
    traits: ['1.15G Launch Hook', 'Hard-Hitting 4-Speed', 'Boosted Mid-Range Surge', '1/4 Mile Killer'],
  },
  {
    id: 'chevelle_70',
    name: "Big-Block 454 '70",
    subtitle: 'Heavy Iron 7.4L Muscle Bruiser',
    specialty: 'Raw Horsepower',
    tier: 2,
    chassis: 'muscle',
    bodyVariant: 'fastback',
    price: 5600,
    baseHp: 425,
    baseWeightLbs: 3420,
    baseGrip: 1.02,
    redlineRpm: 6400,
    idleRpm: 900,
    launchRpmMin: 2700,
    launchRpmMax: 3650,
    shiftRpmMin: 5450,
    shiftRpmMax: 6150,
    gearRatios: [2.9, 1.82, 1.24, 0.88],
    finalDrive: 3.73,
    dragCoeff: 0.38,
    defaultPaint: '#ea580c',
    hasParachute: false,
    traits: ['425 HP Big-Block V8', 'Massive Top-End Pull', 'Long 4-Speed Gears', 'Demands Slicks'],
  },
  {
    id: 'rx7_88',
    name: "Apex Rotary FC '88",
    subtitle: 'Featherweight Twin-Scroll Rotary',
    specialty: 'Lightweight Revver',
    tier: 2,
    chassis: 'jdm',
    bodyVariant: 'wedge',
    price: 6800,
    baseHp: 352,
    baseWeightLbs: 2590,
    baseGrip: 1.12,
    redlineRpm: 8600,
    idleRpm: 1250,
    launchRpmMin: 4400,
    launchRpmMax: 5600,
    shiftRpmMin: 7600,
    shiftRpmMax: 8350,
    gearRatios: [3.28, 2.12, 1.48, 1.08, 0.82],
    finalDrive: 4.1,
    dragCoeff: 0.29,
    defaultPaint: '#d93829',
    hasParachute: false,
    traits: ['2,590 lbs Agility', '8,600 RPM Rotary Scream', 'Razor-Sharp Aero', 'Quick Rev Climb'],
  },
  {
    id: 'corvette_89',
    name: "Stingray ZR '89",
    subtitle: 'Composite-Body 6-Speed Mile Eater',
    specialty: '1-Mile Specialist',
    tier: 2,
    chassis: 'jdm',
    bodyVariant: 'aero',
    price: 8200,
    baseHp: 405,
    baseWeightLbs: 2940,
    baseGrip: 1.1,
    redlineRpm: 7200,
    idleRpm: 1000,
    launchRpmMin: 3300,
    launchRpmMax: 4300,
    shiftRpmMin: 6250,
    shiftRpmMax: 6950,
    gearRatios: [2.98, 1.98, 1.42, 1.06, 0.82, 0.64],
    finalDrive: 3.45,
    dragCoeff: 0.26,
    defaultPaint: '#2563eb',
    hasParachute: false,
    traits: ['6-Speed Overdrive Box', '0.26 Low-Drag Body', 'High-Speed Stability', 'Dominates 1/2 & 1 Mile'],
  },

  // ===================== TIER 3 · PRO STREET =====================
  {
    id: 'gtr_89',
    name: "Apex GTR '89",
    subtitle: 'Twin-Turbo AWD Street Legend',
    specialty: 'AWD All-Rounder',
    tier: 3,
    chassis: 'jdm',
    bodyVariant: 'standard',
    price: 11500,
    baseHp: 640,
    baseWeightLbs: 2920,
    baseGrip: 1.28,
    redlineRpm: 8600,
    idleRpm: 1150,
    launchRpmMin: 4600,
    launchRpmMax: 5800,
    shiftRpmMin: 7550,
    shiftRpmMax: 8350,
    gearRatios: [3.12, 2.05, 1.45, 1.08, 0.84, 0.68],
    finalDrive: 4.11,
    dragCoeff: 0.31,
    defaultPaint: '#2563eb',
    hasParachute: false,
    traits: ['Twin-Turbo AWD Hook', '8,600 RPM Redline', 'Close-Ratio 6-Speed', 'Balanced Everywhere'],
  },
  {
    id: 'supra_93',
    name: "Mk4 Boost GT '93",
    subtitle: 'Big-Single Turbo Runway Monster',
    specialty: 'Mile Trap King',
    tier: 3,
    chassis: 'jdm',
    bodyVariant: 'aero',
    price: 14000,
    baseHp: 725,
    baseWeightLbs: 3060,
    baseGrip: 1.2,
    redlineRpm: 8400,
    idleRpm: 1100,
    launchRpmMin: 4400,
    launchRpmMax: 5500,
    shiftRpmMin: 7350,
    shiftRpmMax: 8150,
    gearRatios: [2.95, 1.94, 1.38, 1.02, 0.78, 0.62],
    finalDrive: 3.55,
    dragCoeff: 0.25,
    defaultPaint: '#ea580c',
    hasParachute: false,
    traits: ['0.25 Wind-Tunnel Aero', '725 HP Single-Turbo', 'Tall 6th Gear Pull', 'Unmatched 1-Mile Speed'],
  },
  {
    id: 'nsx_91',
    name: "Mid-Apex R '91",
    subtitle: 'Aluminum Mid-Engine 9,000 RPM Exotic',
    specialty: 'Ultra-Light Exotic',
    tier: 3,
    chassis: 'jdm',
    bodyVariant: 'wedge',
    price: 16500,
    baseHp: 620,
    baseWeightLbs: 2510,
    baseGrip: 1.34,
    redlineRpm: 9000,
    idleRpm: 1200,
    launchRpmMin: 4900,
    launchRpmMax: 6150,
    shiftRpmMin: 8000,
    shiftRpmMax: 8750,
    gearRatios: [3.18, 2.12, 1.5, 1.12, 0.86, 0.69],
    finalDrive: 4.05,
    dragCoeff: 0.27,
    defaultPaint: '#d93829',
    hasParachute: false,
    traits: ['2,510 lbs Aluminum Body', '9,000 RPM Redline', '1.34G Mid-Engine Grip', 'Razor Shift Response'],
  },
  {
    id: 'viper_92',
    name: "Venom V10 Pro '92",
    subtitle: '8.0L V10 Widebody Street Outlaw',
    specialty: 'Brute Torque',
    tier: 3,
    chassis: 'muscle',
    bodyVariant: 'fastback',
    price: 19500,
    baseHp: 790,
    baseWeightLbs: 3140,
    baseGrip: 1.24,
    redlineRpm: 7200,
    idleRpm: 1000,
    launchRpmMin: 3400,
    launchRpmMax: 4450,
    shiftRpmMin: 6200,
    shiftRpmMax: 6950,
    gearRatios: [2.78, 1.84, 1.32, 0.98, 0.76, 0.61],
    finalDrive: 3.42,
    dragCoeff: 0.29,
    defaultPaint: '#7e22ce',
    hasParachute: false,
    traits: ['790 HP 8.0L V10', 'Huge Top-Gear Torque', 'Long Runway Gearing', 'Violent Mid-Track Pull'],
  },
  {
    id: 'nova_68',
    name: "Pro-Mod Nova '68",
    subtitle: 'Tubbed Twin-Turbo Drag Strip Specialist',
    specialty: '1/4 Mile Specialist',
    tier: 3,
    chassis: 'muscle',
    bodyVariant: 'notch',
    price: 23000,
    baseHp: 870,
    baseWeightLbs: 2740,
    baseGrip: 1.42,
    redlineRpm: 8000,
    idleRpm: 1250,
    launchRpmMin: 4300,
    launchRpmMax: 5450,
    shiftRpmMin: 7000,
    shiftRpmMax: 7750,
    gearRatios: [2.72, 1.78, 1.24, 0.9],
    finalDrive: 3.85,
    dragCoeff: 0.34,
    defaultPaint: '#e5e7eb',
    hasParachute: true,
    traits: ['870 HP Tubbed Pro-Mod', '1.42G Drag Radial Hook', '4-Speed Slammer', 'Finish Parachute'],
  },

  // ===================== TIER 4 · FUNNY CAR =====================
  {
    id: 'charger_fc',
    name: 'Nitro Charger FC',
    subtitle: 'Blown Alcohol / Nitro Funny Car',
    specialty: 'Classic Nitro FC',
    tier: 4,
    chassis: 'funny',
    bodyVariant: 'standard',
    price: 32000,
    baseHp: 1950,
    baseWeightLbs: 2420,
    baseGrip: 1.65,
    redlineRpm: 8400,
    idleRpm: 1500,
    launchRpmMin: 4800,
    launchRpmMax: 5900,
    shiftRpmMin: 7350,
    shiftRpmMax: 8150,
    gearRatios: [2.45, 1.62, 1.18, 0.88],
    finalDrive: 3.45,
    dragCoeff: 0.35,
    defaultPaint: '#ea580c',
    hasParachute: true,
    traits: ['Blown Nitro V8', 'Wheelie-Bar Chassis', 'Side Zoomie Headers', 'Finish Parachute'],
  },
  {
    id: 'firebird_fc',
    name: 'Firehawk Aero FC',
    subtitle: 'Wind-Tunnel Slippery Flip-Body',
    specialty: 'Long-Strip Aero',
    tier: 4,
    chassis: 'funny',
    bodyVariant: 'aero',
    price: 39000,
    baseHp: 2060,
    baseWeightLbs: 2380,
    baseGrip: 1.68,
    redlineRpm: 8500,
    idleRpm: 1550,
    launchRpmMin: 4900,
    launchRpmMax: 6000,
    shiftRpmMin: 7450,
    shiftRpmMax: 8250,
    gearRatios: [2.36, 1.56, 1.12, 0.82],
    finalDrive: 3.18,
    dragCoeff: 0.27,
    defaultPaint: '#2563eb',
    hasParachute: true,
    traits: ['0.27 Low-Drag Flip-Body', 'Tall Runway Final Drive', '275+ MPH Stability', '1/2 & 1 Mile Weapon'],
  },
  {
    id: 'mustang_fc',
    name: 'Cobra Jet FC',
    subtitle: 'Short-Wheelbase High-Hook Wheelstander',
    specialty: '1/4 Mile Launch',
    tier: 4,
    chassis: 'funny',
    bodyVariant: 'fastback',
    price: 46000,
    baseHp: 2190,
    baseWeightLbs: 2310,
    baseGrip: 1.84,
    redlineRpm: 8600,
    idleRpm: 1600,
    launchRpmMin: 5000,
    launchRpmMax: 6150,
    shiftRpmMin: 7550,
    shiftRpmMax: 8350,
    gearRatios: [2.52, 1.68, 1.22, 0.91],
    finalDrive: 3.55,
    dragCoeff: 0.34,
    defaultPaint: '#16a34a',
    hasParachute: true,
    traits: ['1.84G Wrinkle-Wall Hook', '2,310 lbs Feather Carbon', 'Violent 60-ft Launch', '1/4 Mile Dominator'],
  },
  {
    id: 'camaro_promod',
    name: 'Outlaw Pro-Mod Z',
    subtitle: '5-Speed Twin-Turbo Carbon Pro-Mod',
    specialty: '5-Speed Tuner',
    tier: 4,
    chassis: 'funny',
    bodyVariant: 'notch',
    price: 54000,
    baseHp: 2350,
    baseWeightLbs: 2440,
    baseGrip: 1.76,
    redlineRpm: 8800,
    idleRpm: 1550,
    launchRpmMin: 5100,
    launchRpmMax: 6250,
    shiftRpmMin: 7750,
    shiftRpmMax: 8550,
    gearRatios: [2.62, 1.85, 1.38, 1.04, 0.78],
    finalDrive: 3.25,
    dragCoeff: 0.29,
    defaultPaint: '#262936',
    hasParachute: true,
    traits: ['5-Speed Lenco Gearbox', '2,350 HP Twin-Turbo', 'Hyper-Tunable Ratios', 'All-Distance Threat'],
  },
  {
    id: 'corvette_fc',
    name: 'Stingray Nitro FC',
    subtitle: 'Supercharged Nitromethane Wedge',
    specialty: 'Peak Tier-4 Power',
    tier: 4,
    chassis: 'funny',
    bodyVariant: 'wedge',
    price: 64000,
    baseHp: 2540,
    baseWeightLbs: 2290,
    baseGrip: 1.88,
    redlineRpm: 8900,
    idleRpm: 1650,
    launchRpmMin: 5200,
    launchRpmMax: 6350,
    shiftRpmMin: 7850,
    shiftRpmMax: 8650,
    gearRatios: [2.38, 1.58, 1.14, 0.84],
    finalDrive: 3.22,
    dragCoeff: 0.28,
    defaultPaint: '#d93829',
    hasParachute: true,
    traits: ['2,540 HP Nitro Hemi', '8,900 RPM Redline', 'Low-Slung Wedge Nose', 'Record-Breaking Trap'],
  },

  // ===================== TIER 5 · TOP FUEL =====================
  {
    id: 'railstorm_tf',
    name: 'Railstorm TF-1',
    subtitle: '11,000-HP Top-Fuel Nitro Dragster',
    specialty: 'Classic Railster',
    tier: 5,
    chassis: 'topfuel',
    bodyVariant: 'standard',
    price: 78000,
    baseHp: 5600,
    baseWeightLbs: 2280,
    baseGrip: 2.45,
    redlineRpm: 9200,
    idleRpm: 2000,
    launchRpmMin: 5600,
    launchRpmMax: 6800,
    shiftRpmMin: 8100,
    shiftRpmMax: 8950,
    gearRatios: [2.05, 1.38, 0.96],
    finalDrive: 3.2,
    dragCoeff: 0.28,
    defaultPaint: '#d93829',
    hasParachute: true,
    traits: ['36" Top-Fuel Slicks', 'Vertical Header Flames', '3-Speed Direct Lockup', 'Twin Parachutes'],
  },
  {
    id: 'slingshot_tf',
    name: 'Nostalgia Slingshot',
    subtitle: 'Featherweight Front-Engine Cackle Rail',
    specialty: 'Ultra-Light Launch',
    tier: 5,
    chassis: 'topfuel',
    bodyVariant: 'slingshot',
    price: 94000,
    baseHp: 5450,
    baseWeightLbs: 2040,
    baseGrip: 2.58,
    redlineRpm: 9400,
    idleRpm: 2050,
    launchRpmMin: 5750,
    launchRpmMax: 6950,
    shiftRpmMin: 8300,
    shiftRpmMax: 9150,
    gearRatios: [2.14, 1.44, 0.99],
    finalDrive: 3.3,
    dragCoeff: 0.3,
    defaultPaint: '#e8b624',
    hasParachute: true,
    traits: ['2,040 lbs Feather Rail', '2.58G Instant Hook', 'Front-Mount Hemi', '3.6s 1/4 Mile Specialist'],
  },
  {
    id: 'canopy_tf',
    name: 'Mach-4 Canopy TF',
    subtitle: 'Fighter-Canopy 4-Speed Streamliner',
    specialty: '400-MPH Mile Jet',
    tier: 5,
    chassis: 'topfuel',
    bodyVariant: 'canopy',
    price: 112000,
    baseHp: 6050,
    baseWeightLbs: 2250,
    baseGrip: 2.52,
    redlineRpm: 9300,
    idleRpm: 2000,
    launchRpmMin: 5650,
    launchRpmMax: 6850,
    shiftRpmMin: 8200,
    shiftRpmMax: 9050,
    gearRatios: [2.12, 1.52, 1.12, 0.82],
    finalDrive: 2.85,
    dragCoeff: 0.21,
    defaultPaint: '#2563eb',
    hasParachute: true,
    traits: ['0.21 Enclosed Canopy Aero', '4-Speed Overdrive Rail', '400+ MPH Mile Potential', 'Zero Top-End Fade'],
  },
  {
    id: 'twinhemi_tf',
    name: 'Twin-Hemi Goliath',
    subtitle: 'Dual-Blower Extreme Torque Dragster',
    specialty: 'Maximum Thrust',
    tier: 5,
    chassis: 'topfuel',
    bodyVariant: 'twin',
    price: 132000,
    baseHp: 6650,
    baseWeightLbs: 2420,
    baseGrip: 2.65,
    redlineRpm: 9100,
    idleRpm: 1950,
    launchRpmMin: 5500,
    launchRpmMax: 6700,
    shiftRpmMin: 8000,
    shiftRpmMax: 8850,
    gearRatios: [1.96, 1.32, 0.9],
    finalDrive: 3.05,
    dragCoeff: 0.27,
    defaultPaint: '#7e22ce',
    hasParachute: true,
    traits: ['Dual-Blower Twin Hemi', '6,650 Base Horsepower', '2.65G Steamroller Grip', 'Earth-Shaking Torque'],
  },
  {
    id: 'apex_tfx',
    name: 'Swamp Lightning TF-X',
    subtitle: 'World-Record Carbon Canopy Top-Fueler',
    specialty: 'Ultimate Apex',
    tier: 5,
    chassis: 'topfuel',
    bodyVariant: 'canopy',
    price: 155000,
    baseHp: 7050,
    baseWeightLbs: 2180,
    baseGrip: 2.78,
    redlineRpm: 9600,
    idleRpm: 2100,
    launchRpmMin: 5900,
    launchRpmMax: 7100,
    shiftRpmMin: 8500,
    shiftRpmMax: 9350,
    gearRatios: [2.06, 1.48, 1.08, 0.79],
    finalDrive: 2.92,
    dragCoeff: 0.22,
    defaultPaint: '#e5e7eb',
    hasParachute: true,
    traits: ['7,050 HP Flagship Rail', '9,600 RPM Billet Hemi', '4-Speed Carbon Streamliner', 'Ruler of Every Strip'],
  },
];

export function getCarById(carId: string): CarSpec {
  return CARS.find((c) => c.id === carId) ?? CARS[0];
}

export function getCarsByTier(tier: TierId): CarSpec[] {
  return CARS.filter((c) => c.tier === tier);
}

export function getTierById(tierId: TierId): TierSpec {
  return TIERS.find((t) => t.id === tierId) ?? TIERS[0];
}

export const OUTPUT_BRACKETS: OutputBracketSpec[] = [
  {
    id: 1,
    code: 'B1',
    name: 'STREET',
    etRangeLabel: '12.5s–16.5s',
    hpRangeLabel: '140–340 HP',
    minEtSec: 12.5,
    maxEtSec: 20.0,
    color: '#ff6b35',
  },
  {
    id: 2,
    code: 'B2',
    name: 'STREET MOD',
    etRangeLabel: '10.0s–12.5s',
    hpRangeLabel: '320–660 HP',
    minEtSec: 10.0,
    maxEtSec: 12.5,
    color: '#f5b82e',
  },
  {
    id: 3,
    code: 'B3',
    name: 'PRO STREET',
    etRangeLabel: '7.6s–10.0s',
    hpRangeLabel: '600–1,400 HP',
    minEtSec: 7.6,
    maxEtSec: 10.0,
    color: '#22c55e',
  },
  {
    id: 4,
    code: 'B4',
    name: 'FUNNY CAR',
    etRangeLabel: '5.3s–7.6s',
    hpRangeLabel: '1,800–4,100 HP',
    minEtSec: 5.3,
    maxEtSec: 7.6,
    color: '#38bdf8',
  },
  {
    id: 5,
    code: 'B5',
    name: 'TOP FUEL',
    etRangeLabel: '3.4s–5.3s',
    hpRangeLabel: '5,200+ HP',
    minEtSec: 3.0,
    maxEtSec: 5.3,
    color: '#ff3b30',
  },
];

export function getOutputBracketById(id: OutputBracketId): OutputBracketSpec {
  return OUTPUT_BRACKETS.find((b) => b.id === id) ?? OUTPUT_BRACKETS[0];
}

export function getOutputBracketForEt(estimatedEtSec: number): OutputBracketSpec {
  if (estimatedEtSec < 5.3) return OUTPUT_BRACKETS[4];
  if (estimatedEtSec < 7.6) return OUTPUT_BRACKETS[3];
  if (estimatedEtSec < 10.0) return OUTPUT_BRACKETS[2];
  if (estimatedEtSec < 12.5) return OUTPUT_BRACKETS[1];
  return OUTPUT_BRACKETS[0];
}

export function createDefaultTuning(carId: string): DrivetrainTuning {
  const spec = getCarById(carId);
  return {
    finalDrive: spec.finalDrive,
    gearRatios: [...spec.gearRatios],
    launchRpmOffset: 0,
    shiftRpmOffset: 0,
    topGearRevProtection: false,
  };
}

export function getEffectiveTuning(carId: string, config?: CarConfig): DrivetrainTuning {
  const spec = getCarById(carId);
  const t = config?.tuning;
  if (!t || !Array.isArray(t.gearRatios) || t.gearRatios.length !== spec.gearRatios.length) {
    return createDefaultTuning(carId);
  }
  return {
    finalDrive: Number(Math.max(2.1, Math.min(5.5, t.finalDrive)).toFixed(2)),
    gearRatios: t.gearRatios.map((r, i) => {
      const def = spec.gearRatios[i];
      const minR = Math.max(0.45, Number((def * 0.65).toFixed(2)));
      const maxR = Math.min(4.6, Number((def * 1.4).toFixed(2)));
      return Number(Math.max(minR, Math.min(maxR, r)).toFixed(2));
    }),
    launchRpmOffset: Math.max(-600, Math.min(600, Math.round(t.launchRpmOffset || 0))),
    shiftRpmOffset: Math.max(-600, Math.min(350, Math.round(t.shiftRpmOffset || 0))),
    topGearRevProtection: Boolean(t.topGearRevProtection),
  };
}

export function createTrackPresetTuning(
  carId: string,
  preset: 'stock' | 'quarter' | 'half' | 'mile',
  preserveRevProtection = false
): DrivetrainTuning {
  const spec = getCarById(carId);
  if (preset === 'stock') {
    return { ...createDefaultTuning(carId), topGearRevProtection: preserveRevProtection };
  }

  if (preset === 'quarter') {
    return {
      finalDrive: Number(Math.min(5.4, spec.finalDrive * 1.12).toFixed(2)),
      gearRatios: spec.gearRatios.map((r, i) =>
        Number((r * (i === 0 ? 1.06 : 1.03)).toFixed(2))
      ),
      launchRpmOffset: 150,
      shiftRpmOffset: 100,
      topGearRevProtection: preserveRevProtection,
    };
  }

  if (preset === 'half') {
    return {
      finalDrive: Number(Math.max(2.2, spec.finalDrive * 0.91).toFixed(2)),
      gearRatios: spec.gearRatios.map((r, i) => {
        const last = i === spec.gearRatios.length - 1;
        return Number((r * (last ? 0.9 : 0.96)).toFixed(2));
      }),
      launchRpmOffset: 50,
      shiftRpmOffset: 0,
      topGearRevProtection: preserveRevProtection,
    };
  }

  return {
    finalDrive: Number(Math.max(2.15, spec.finalDrive * 0.77).toFixed(2)),
    gearRatios: spec.gearRatios.map((r, i) => {
      const frac = i / Math.max(1, spec.gearRatios.length - 1);
      const mult = 0.94 - frac * 0.16;
      return Number(Math.max(0.5, r * mult).toFixed(2));
    }),
    launchRpmOffset: 0,
    shiftRpmOffset: -100,
    topGearRevProtection: preserveRevProtection,
  };
}

export function createDefaultCarConfig(carId: string): CarConfig {
  const spec = getCarById(carId);
  return {
    upgrades: {
      engine: 0,
      induction: 0,
      transmission: 0,
      tires: 0,
      chassis: 0,
      nitrous: 0,
    },
    visuals: {
      paintColor: spec.defaultPaint,
      stripe: 'none',
      rims: 'steel',
    },
    tuning: createDefaultTuning(carId),
    engineHealth: 100,
  };
}

export function getEngineHealth(config?: CarConfig): number {
  const raw = config?.engineHealth;
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return 100;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

export function getEngineHealthPenaltyPct(engineHealth: number): number {
  const h = Math.max(0, Math.min(100, engineHealth));
  if (h >= 80) return 0;
  if (h >= 50) return Math.round(((80 - h) / 30) * 12);
  return Math.min(28, Math.round(12 + ((50 - h) / 35) * 16));
}

export function getEngineHealthStatus(engineHealth: number): {
  label: 'OPTIMAL' | 'WORN' | 'CRITICAL';
  color: string;
} {
  if (engineHealth >= 80) return { label: 'OPTIMAL', color: '#22c55e' };
  if (engineHealth >= 50) return { label: 'WORN', color: '#f5b82e' };
  return { label: 'CRITICAL', color: '#ff4d3d' };
}

export function getEngineRepairCost(car: CarSpec, config: CarConfig): number {
  const health = getEngineHealth(config);
  const missing = 100 - health;
  if (missing <= 0) return 0;
  const fullRebuildBase = [180, 480, 1100, 2600, 5800][car.tier - 1];
  const engineBuildScale = 1 + config.upgrades.engine * 0.12;
  const rawCost = fullRebuildBase * engineBuildScale * (missing / 100);
  return Math.max(15, Math.round(rawCost / 5) * 5);
}

export function computeRaceEngineWear(params: {
  tier: TierId;
  distance: StripDistanceId;
  isTimeTrial: boolean;
  foul: boolean;
  overRevCount: number;
  nitrousUsedCount: number;
  topGearRevProtectionUsed?: boolean;
}): number {
  if (params.foul) return 1;
  const baseByDist = params.distance === 'mile' ? 10 : params.distance === 'half' ? 7 : 5;
  const tierStress = params.tier >= 4 ? 1 : 0;
  const stressWear =
    Math.min(8, params.overRevCount * 2) + Math.round(Math.min(4.5, params.nitrousUsedCount * 1.5));
  let rawWear = baseByDist + tierStress + stressWear;
  // Top gear over-rev protection cushions full-throttle finish-line wear
  if (params.topGearRevProtectionUsed) {
    rawWear = Math.max(2, Math.round(rawWear * 0.78));
  }
  if (params.isTimeTrial) {
    return Math.max(2, Math.round(rawWear * 0.5));
  }
  return Math.max(3, Math.min(24, rawWear));
}

export function getUpgradeCost(car: CarSpec, key: UpgradeKey, nextLevel: number): number {
  const meta = UPGRADE_CATEGORIES.find((u) => u.key === key)!;
  const tierScale = [0.35, 0.8, 1.75, 3.85, 8.2][car.tier - 1];
  const levelScale = Math.pow(1.52, nextLevel - 1);
  return Math.round((meta.baseCost * tierScale * levelScale) / 25) * 25;
}

export function getTierSpeedScale(tier: TierId): number {
  return [10.6, 8.6, 8.2, 6.2, 5.2][tier - 1];
}

export function getTierDriveScale(tier: TierId): number {
  return [0.055, 0.055, 0.044, 0.0235, 0.0172][tier - 1];
}

export function computeAeroDragAccel(effectiveDrag: number, velFps: number): number {
  const mph = velFps * 0.681818;
  // Realistic quadratic aero drag + high-speed transonic compressibility above 220 MPH
  const transonicFactor = mph > 220 ? 1 + Math.pow((mph - 220) / 115, 1.8) : 1;
  return 0.00062 * effectiveDrag * velFps * velFps * transonicFactor;
}

export function computeGearMaxMph(
  car: CarSpec,
  redlineRpm: number,
  gearRatio: number,
  finalDrive: number
): number {
  const speedScale = getTierSpeedScale(car.tier);
  const totalRatio = Math.max(0.5, gearRatio * finalDrive);
  const maxFps = Math.max(10, (redlineRpm - car.idleRpm) / (totalRatio * speedScale));
  return Math.round(maxFps * 0.681818);
}

export function computeCarPerformance(carId: string, config: CarConfig): ComputedPerformance {
  const car = getCarById(carId);
  const u = config.upgrades;
  const tuning = getEffectiveTuning(carId, config);
  const engineHealth = getEngineHealth(config);
  const wearPenaltyPct = getEngineHealthPenaltyPct(engineHealth);
  const wearMult = 1 - wearPenaltyPct / 100;

  // Recalibrated upgrade curves:
  // Stock -> Maxed stays strictly within its tier bracket (~1.53x HP, -9% weight, +25% grip),
  // with enough headroom at full upgrade to beat the Tier Boss and win 1-2 early races in Tier N+1
  // before needing a Tier N+1 chassis.
  const engineMult = 1 + u.engine * 0.044;      // Lv5: 1.22x
  const inductionMult = 1 + u.induction * 0.036; // Lv5: 1.18x
  const exhaustBonus = 1 + u.nitrous * 0.012;    // Lv5: 1.06x (combined ~1.53x HP at 5/5/5)
  const rawHp = Math.round(car.baseHp * engineMult * inductionMult * exhaustBonus);
  const hp = Math.max(60, Math.round(rawHp * wearMult));

  const weightLbs = Math.round(car.baseWeightLbs * (1 - u.chassis * 0.018)); // Lv5: -9% weight
  const grip = Number((car.baseGrip * (1 + u.tires * 0.05)).toFixed(2));     // Lv5: +25% grip
  const redlineRpm = car.redlineRpm + u.engine * 120;
  const wearShiftDrag = wearPenaltyPct > 0 ? (wearPenaltyPct / 28) * 0.035 : 0;
  const shiftSpeedSec = Math.max(0.04, 0.16 - u.transmission * 0.022 + wearShiftDrag);
  const shiftBoostMult = 1.08 + u.induction * 0.012 + u.transmission * 0.01;
  const shiftWindowBonus = u.transmission * 90;
  const nitrousShots = u.nitrous > 0 ? Math.min(3, Math.ceil(u.nitrous / 2)) : 0;
  const nitrousPowerMult = 1.08 + u.nitrous * 0.02;

  // Gear-limited theoretical top speed & aerodynamic top speed
  const topGearRatio = tuning.gearRatios[tuning.gearRatios.length - 1];
  const gearTopMph = computeGearMaxMph(car, redlineRpm, topGearRatio, tuning.finalDrive);
  const effectiveDrag = Math.max(0.18, car.dragCoeff * (1 - u.chassis * 0.02));
  const aeroTopMph = Math.min(
    455,
    Math.round(Math.pow(hp / (effectiveDrag * 0.0028), 1 / 2.78) * 1.06)
  );
  const topSpeedMph = Math.min(gearTopMph, aeroTopMph);

  // Gearing ratio factor relative to stock final drive
  const fdRatio = tuning.finalDrive / car.finalDrive;

  // Calibrated 1/4 mile ET aligned with RaceSimulation physics
  const effectivePw = (hp / (weightLbs / 1000)) * (getTierDriveScale(car.tier) / 0.055);
  let estimatedEtSec = 15.85 / Math.pow(effectivePw / 71, 0.44);
  estimatedEtSec *= 1 - (grip - 0.9) * 0.038;
  estimatedEtSec *= 1 - u.transmission * 0.011;
  estimatedEtSec *= 1 - u.nitrous * 0.012;
  const qtrGearFactor =
    fdRatio > 1 ? 1 - Math.min(0.032, (fdRatio - 1) * 0.14) : 1 + Math.min(0.05, (1 - fdRatio) * 0.18);
  estimatedEtSec *= qtrGearFactor;
  estimatedEtSec = Math.max(3.45, Math.min(18.5, Number(estimatedEtSec.toFixed(2))));

  const idealHalfTrap = Math.min(aeroTopMph, 86 + Math.pow(effectivePw, 0.54) * 7.8);
  const halfCapPenalty =
    gearTopMph < idealHalfTrap ? 1 + ((idealHalfTrap - gearTopMph) / idealHalfTrap) * 0.32 : 1;
  const halfAeroFactor = 1 + (effectiveDrag - 0.3) * 0.14;
  const estimatedHalfEtSec = Number(
    Math.max(5.35, estimatedEtSec * 1.58 * halfAeroFactor * halfCapPenalty).toFixed(2)
  );

  const idealMileTrap = Math.min(aeroTopMph, 102 + Math.pow(effectivePw, 0.56) * 9.2);
  const mileCapPenalty =
    gearTopMph < idealMileTrap ? 1 + ((idealMileTrap - gearTopMph) / idealMileTrap) * 0.48 : 1;
  const mileAeroFactor = 1 + (effectiveDrag - 0.3) * 0.24;
  const estimatedMileEtSec = Number(
    Math.max(8.75, estimatedEtSec * 2.55 * mileAeroFactor * mileCapPenalty).toFixed(2)
  );

  const pi = Math.min(
    999,
    Math.round(effectivePw * 0.52 + grip * 46 + u.transmission * 12 + u.nitrous * 10)
  );
  const bracket = getOutputBracketForEt(estimatedEtSec);

  return {
    hp,
    rawHp,
    engineHealth,
    wearPenaltyPct,
    weightLbs,
    grip,
    redlineRpm,
    shiftSpeedSec,
    shiftBoostMult,
    shiftWindowBonus,
    nitrousShots,
    nitrousPowerMult,
    pi,
    bracket,
    estimatedEtSec,
    estimatedHalfEtSec,
    estimatedMileEtSec,
    topSpeedMph,
  };
}

/**
 * Enforces Output Bracket eligibility so mismatched cars (e.g., a 3-second Top Fueler vs
 * a 15-second Street car, or a stock Street Hatch in Funny Car/Top Fuel) cannot race together.
 *
 * Rules:
 * - A higher-tier / higher-bracket car can NEVER enter a lower-tier event (prevents sandbagging).
 * - Any car of Tier N is always eligible for Tier N events (stock through fully upgraded).
 * - A heavily upgraded Tier N car whose output reaches the top of its bracket / entry of Tier N+1
 *   is eligible to step up into Tier N+1 events (allowing 1-2 wins before needing a Tier N+1 car).
 * - A car more than 1 tier below (or stock Tier N trying to enter Tier N+1) is blocked as underpowered.
 */
export function checkRaceEligibility(
  carId: string,
  config: CarConfig,
  targetTierId: TierId
): RaceEligibilityResult {
  const car = getCarById(carId);
  const perf = computeCarPerformance(carId, config);
  const carBracket = perf.bracket;
  const eventBracket = getOutputBracketById(targetTierId);

  // 1. Block overpowered cars from entering lower brackets (e.g., 3s car in 15s class)
  if (car.tier > targetTierId) {
    return {
      eligible: false,
      reason: 'OVER_BRACKET',
      message: `${car.name} (${carBracket.code} ${carBracket.name} · ${perf.estimatedEtSec.toFixed(2)}s) exceeds Tier ${targetTierId} (${eventBracket.code} ${eventBracket.name}) output limits. Switch to a Tier ${targetTierId} car.`,
      carBracket,
      eventBracket,
    };
  }

  // 2. Own tier is always legal (even if maxed out and touching next bracket entry)
  if (car.tier === targetTierId) {
    return {
      eligible: true,
      carBracket,
      eventBracket,
      isStepUp: false,
    };
  }

  // 3. Stepping up 1 tier: allowed ONLY when upgraded enough to reach the next bracket's entry pace
  if (car.tier === targetTierId - 1) {
    // Allow entry if car's output bracket reached targetTierId, OR within 0.65s of the bracket boundary
    const stepUpMaxEt = eventBracket.maxEtSec + 0.65;
    if (carBracket.id >= targetTierId || perf.estimatedEtSec <= stepUpMaxEt) {
      return {
        eligible: true,
        carBracket,
        eventBracket,
        isStepUp: true,
        message: `STEP-UP ENTRY: Your upgraded ${car.name} qualifies for early Tier ${targetTierId} heats — you will need a Tier ${targetTierId} chassis to conquer the full bracket.`,
      };
    }
    return {
      eligible: false,
      reason: 'UNDER_BRACKET',
      message: `${car.name} (${perf.estimatedEtSec.toFixed(2)}s) is too slow for Tier ${targetTierId} (${eventBracket.etRangeLabel}). Upgrade parts to ≤ ${stepUpMaxEt.toFixed(2)}s or buy a Tier ${targetTierId} car.`,
      carBracket,
      eventBracket,
    };
  }

  // 4. More than 1 tier below is strictly outclassed
  return {
    eligible: false,
    reason: 'UNDER_BRACKET',
    message: `${car.name} (${carBracket.code} · ${perf.estimatedEtSec.toFixed(2)}s) is outclassed for Tier ${targetTierId} (${eventBracket.code} · ${eventBracket.etRangeLabel}). Switch to or buy a Tier ${targetTierId} car.`,
    carBracket,
    eventBracket,
  };
}

export interface UpgradeImpactPreview {
  nextLevel: number;
  cost: number;
  currentPerf: ComputedPerformance;
  nextPerf: ComputedPerformance;
  statChanges: { label: string; delta: string; positive: boolean }[];
  characteristics: string[];
}

export function getUpgradeImpactPreview(
  carId: string,
  config: CarConfig,
  key: UpgradeKey
): UpgradeImpactPreview | null {
  const car = getCarById(carId);
  const currentLvl = config.upgrades[key];
  if (currentLvl >= 5) return null;
  const nextLevel = currentLvl + 1;
  const cost = getUpgradeCost(car, key, nextLevel);
  const currentPerf = computeCarPerformance(carId, config);
  const nextConfig: CarConfig = {
    ...config,
    upgrades: {
      ...config.upgrades,
      [key]: nextLevel,
    },
  };
  const nextPerf = computeCarPerformance(carId, nextConfig);

  const statChanges: { label: string; delta: string; positive: boolean }[] = [];
  const hpDiff = nextPerf.hp - currentPerf.hp;
  if (hpDiff > 0) {
    statChanges.push({ label: 'Power', delta: `+${hpDiff.toLocaleString()} HP`, positive: true });
  }
  const weightDiff = nextPerf.weightLbs - currentPerf.weightLbs;
  if (weightDiff < 0) {
    statChanges.push({ label: 'Weight', delta: `${weightDiff} lbs`, positive: true });
  }
  const gripDiff = Number((nextPerf.grip - currentPerf.grip).toFixed(2));
  if (gripDiff > 0) {
    statChanges.push({ label: 'Grip', delta: `+${gripDiff.toFixed(2)} G`, positive: true });
  }
  const redlineDiff = nextPerf.redlineRpm - currentPerf.redlineRpm;
  if (redlineDiff > 0) {
    statChanges.push({ label: 'Redline', delta: `+${redlineDiff} RPM`, positive: true });
  }
  const boostDiffPct = Math.round((nextPerf.shiftBoostMult - currentPerf.shiftBoostMult) * 100);
  if (boostDiffPct > 0) {
    statChanges.push({ label: 'Shift Boost', delta: `+${boostDiffPct}%`, positive: true });
  }
  const shiftMsDiff = Math.round((currentPerf.shiftSpeedSec - nextPerf.shiftSpeedSec) * 1000);
  if (shiftMsDiff > 0) {
    statChanges.push({ label: 'Shift Time', delta: `-${shiftMsDiff}ms`, positive: true });
  }
  const windowDiff = nextPerf.shiftWindowBonus - currentPerf.shiftWindowBonus;
  if (windowDiff > 0) {
    statChanges.push({ label: 'Sweet Spot', delta: `+${windowDiff} RPM`, positive: true });
  }
  const nosDiff = nextPerf.nitrousShots - currentPerf.nitrousShots;
  if (nosDiff > 0) {
    statChanges.push({ label: 'NOS Shots', delta: `+${nosDiff} Shot`, positive: true });
  } else if (key === 'nitrous') {
    const nosPowerPct = Math.round((nextPerf.nitrousPowerMult - currentPerf.nitrousPowerMult) * 100);
    if (nosPowerPct > 0) {
      statChanges.push({ label: 'NOS Power', delta: `+${nosPowerPct}%`, positive: true });
    }
  }
  const etDiff = Number((nextPerf.estimatedEtSec - currentPerf.estimatedEtSec).toFixed(2));
  if (etDiff < 0) {
    statChanges.push({ label: 'Est. 1/4 Mi', delta: `${etDiff.toFixed(2)}s`, positive: true });
  }

  const characteristics: string[] = [];
  if (key === 'engine') {
    characteristics.push('Stronger high-RPM pull & higher rev ceiling');
    if (getEngineHealth(config) < 100) {
      characteristics.push('Fresh rebuild restores Engine Health to 100%');
    }
  } else if (key === 'induction') {
    if (nextLevel === 2 && car.chassis !== 'funny' && car.chassis !== 'topfuel') {
      characteristics.push('Adds Chrome Hood Blower Scoop on car');
    } else if (nextLevel === 4 && car.chassis !== 'funny' && car.chassis !== 'topfuel') {
      characteristics.push('Upgrades to Heavy 6-71 Supercharger');
    } else {
      characteristics.push('Stronger boost surge after Perfect Shifts');
    }
  } else if (key === 'transmission') {
    characteristics.push('Easier Perfect Launch & Shift timing window');
  } else if (key === 'tires') {
    if (nextLevel === 2) {
      characteristics.push('Equips Wide White-Letter Drag Slicks');
    } else if (nextLevel === 3 && car.chassis !== 'funny' && car.chassis !== 'topfuel') {
      characteristics.push('Installs Rear Wheelie Bars & cuts wheelspin');
    } else {
      characteristics.push('Harder 60-ft launch hook with less tire spin');
    }
  } else if (key === 'chassis') {
    if (nextLevel === 2 && car.chassis !== 'funny' && car.chassis !== 'topfuel') {
      characteristics.push('Adds Front Aero Splitter & Rear Drag Wing');
    } else {
      characteristics.push('Faster acceleration off the line & lower high-speed drag');
    }
  } else if (key === 'nitrous') {
    if (nextLevel === 1) {
      characteristics.push('Unlocks mid-run Nitrous Boost [N]');
    } else if (nextLevel === 3 && car.chassis !== 'funny' && car.chassis !== 'topfuel') {
      characteristics.push('Adds Side Exhaust / Zoomie Header Pipes');
    } else {
      characteristics.push('Higher trap speed & stronger blue jet thrust');
    }
  }

  return {
    nextLevel,
    cost,
    currentPerf,
    nextPerf,
    statChanges,
    characteristics,
  };
}

export function getCarCharacteristics(car: CarSpec): string[] {
  return car.traits;
}

// =========================================================================
// 120 CAREER EVENTS (5 Tiers × 3 Strip Lengths × 8 Stages per Ladder)
// =========================================================================
export { CAREER_EVENTS as RIVALS, TOTAL_CAREER_EVENTS } from './careerEvents';

const VALID_STRIPES: ReadonlySet<StripeStyle> = new Set([
  'none',
  'twin',
  'flash',
  'checkered',
  'flames',
]);

const VALID_RIMS: ReadonlySet<RimStyle> = new Set([
  'steel',
  'gold',
  'chrome',
  'prostar',
]);

function clampUpgradeLevel(val: unknown): number {
  const n = Number(val);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(5, Math.floor(n)));
}

export function sanitizeCarConfig(carId: string, raw: unknown): CarConfig {
  const fallback = createDefaultCarConfig(carId);
  if (!raw || typeof raw !== 'object') return fallback;
  const obj = raw as Partial<CarConfig>;
  const rawUpgrades = (obj.upgrades && typeof obj.upgrades === 'object' ? obj.upgrades : {}) as Record<
    string,
    unknown
  >;
  const rawVisuals = (obj.visuals && typeof obj.visuals === 'object' ? obj.visuals : {}) as Record<
    string,
    unknown
  >;

  const paintRaw = typeof rawVisuals.paintColor === 'string' ? rawVisuals.paintColor : '';
  const paintColor = /^#[0-9a-fA-F]{6}$/.test(paintRaw) ? paintRaw : fallback.visuals.paintColor;
  const stripe = VALID_STRIPES.has(rawVisuals.stripe as StripeStyle)
    ? (rawVisuals.stripe as StripeStyle)
    : fallback.visuals.stripe;
  const rims = VALID_RIMS.has(rawVisuals.rims as RimStyle)
    ? (rawVisuals.rims as RimStyle)
    : fallback.visuals.rims;

  const sanitized: CarConfig = {
    upgrades: {
      engine: clampUpgradeLevel(rawUpgrades.engine),
      induction: clampUpgradeLevel(rawUpgrades.induction),
      transmission: clampUpgradeLevel(rawUpgrades.transmission),
      tires: clampUpgradeLevel(rawUpgrades.tires),
      chassis: clampUpgradeLevel(rawUpgrades.chassis),
      nitrous: clampUpgradeLevel(rawUpgrades.nitrous),
    },
    visuals: {
      paintColor,
      stripe,
      rims,
    },
    engineHealth: getEngineHealth(obj as CarConfig),
  };
  sanitized.tuning = getEffectiveTuning(carId, { ...sanitized, tuning: obj.tuning });
  return sanitized;
}

export function createInitialPlayerSave(): PlayerSave {
  return {
    callsign: 'ROOKIE_88',
    cash: 350,
    activeCarId: 'civic_86',
    highestUnlockedTier: 1,
    ownedCars: ['civic_86'],
    defeatedRivals: [],
    carConfigs: {
      civic_86: createDefaultCarConfig('civic_86'),
    },
    totalWins: 0,
    totalRaces: 0,
    updatedAtMs: 0,
  };
}

export function getCarConfig(save: PlayerSave, carId: string): CarConfig {
  const existing = save.carConfigs?.[carId];
  if (!existing) return createDefaultCarConfig(carId);
  return sanitizeCarConfig(carId, existing);
}

export function formatEt(ms: number): string {
  return (ms / 1000).toFixed(3) + 's';
}

export function formatCash(amount: number): string {
  return '$' + Math.floor(amount).toLocaleString('en-US');
}
