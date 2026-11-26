import {
  CarConfig,
  CarSpec,
  ComputedPerformance,
  DrivetrainTuning,
  PlayerSave,
  RimStyle,
  RivalSpec,
  StripDistanceId,
  StripDistanceSpec,
  StripeStyle,
  TierId,
  TierSpec,
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
    price: 750,
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
    price: 1050,
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
    price: 1350,
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
    price: 1650,
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
    price: 2200,
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
    price: 2850,
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
    price: 3450,
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
    price: 4100,
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
    price: 4800,
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
    price: 6800,
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
    price: 8200,
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
    price: 9500,
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
    price: 11000,
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
    price: 12800,
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
    price: 16500,
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
    price: 19500,
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
    price: 22500,
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
    price: 25500,
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
    price: 29000,
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
    price: 38000,
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
    price: 45000,
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
    price: 54000,
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
    price: 62000,
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
    price: 72000,
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

export function createDefaultTuning(carId: string): DrivetrainTuning {
  const spec = getCarById(carId);
  return {
    finalDrive: spec.finalDrive,
    gearRatios: [...spec.gearRatios],
    launchRpmOffset: 0,
    shiftRpmOffset: 0,
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
  };
}

export function createTrackPresetTuning(
  carId: string,
  preset: 'stock' | 'quarter' | 'half' | 'mile'
): DrivetrainTuning {
  const spec = getCarById(carId);
  if (preset === 'stock') return createDefaultTuning(carId);

  if (preset === 'quarter') {
    // Aggressive short gearing for explosive 1/4 mile acceleration
    return {
      finalDrive: Number(Math.min(5.4, spec.finalDrive * 1.12).toFixed(2)),
      gearRatios: spec.gearRatios.map((r, i) =>
        Number((r * (i === 0 ? 1.06 : 1.03)).toFixed(2))
      ),
      launchRpmOffset: 150,
      shiftRpmOffset: 100,
    };
  }

  if (preset === 'half') {
    // Balanced runway gearing
    return {
      finalDrive: Number(Math.max(2.2, spec.finalDrive * 0.91).toFixed(2)),
      gearRatios: spec.gearRatios.map((r, i) => {
        const last = i === spec.gearRatios.length - 1;
        return Number((r * (last ? 0.9 : 0.96)).toFixed(2));
      }),
      launchRpmOffset: 50,
      shiftRpmOffset: 0,
    };
  }

  // 'mile': Tall overdrive top gears for extreme standing-mile trap speeds
  return {
    finalDrive: Number(Math.max(2.15, spec.finalDrive * 0.77).toFixed(2)),
    gearRatios: spec.gearRatios.map((r, i) => {
      const frac = i / Math.max(1, spec.gearRatios.length - 1);
      const mult = 0.94 - frac * 0.16; // progressively taller in upper gears
      return Number(Math.max(0.5, r * mult).toFixed(2));
    }),
    launchRpmOffset: 0,
    shiftRpmOffset: -100,
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
  };
}

export function getUpgradeCost(car: CarSpec, key: UpgradeKey, nextLevel: number): number {
  const meta = UPGRADE_CATEGORIES.find((u) => u.key === key)!;
  const tierScale = [1, 1.85, 3.3, 6.2, 11.5][car.tier - 1];
  const levelScale = Math.pow(1.58, nextLevel - 1);
  return Math.round((meta.baseCost * tierScale * levelScale) / 25) * 25;
}

export function getTierSpeedScale(tier: TierId): number {
  return [10.6, 8.6, 8.2, 6.2, 5.2][tier - 1];
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

  const engineMult = 1 + u.engine * 0.14;
  const inductionMult = 1 + u.induction * 0.125;
  const exhaustBonus = 1 + u.nitrous * 0.04;
  const hp = Math.round(car.baseHp * engineMult * inductionMult * exhaustBonus);

  const weightLbs = Math.round(car.baseWeightLbs * (1 - u.chassis * 0.045));
  const grip = Number((car.baseGrip * (1 + u.tires * 0.13)).toFixed(2));
  const redlineRpm = car.redlineRpm + u.engine * 150;
  const shiftSpeedSec = Math.max(0.04, 0.17 - u.transmission * 0.025);
  const shiftBoostMult = 1.15 + u.induction * 0.022 + u.transmission * 0.018;
  const shiftWindowBonus = u.transmission * 90;
  const nitrousShots = u.nitrous > 0 ? Math.min(3, Math.ceil(u.nitrous / 2)) : 0;
  const nitrousPowerMult = 1.14 + u.nitrous * 0.038;

  // Gear-limited theoretical top speed & aerodynamic top speed
  const topGearRatio = tuning.gearRatios[tuning.gearRatios.length - 1];
  const gearTopMph = computeGearMaxMph(car, redlineRpm, topGearRatio, tuning.finalDrive);
  const effectiveDrag = Math.max(0.18, car.dragCoeff * (1 - u.chassis * 0.025));
  const aeroTopMph = Math.round(Math.pow(hp / (effectiveDrag * 0.0022), 1 / 2.75) * 1.12);
  const topSpeedMph = Math.min(gearTopMph, aeroTopMph);

  // Gearing ratio factor relative to stock final drive
  const fdRatio = tuning.finalDrive / car.finalDrive;

  // Estimate realistic 1/4 mile ET from power-to-weight + grip + gearing
  const pw = hp / (weightLbs / 1000);
  let estimatedEtSec = 16.5 / Math.pow(pw / 68, 0.345);
  estimatedEtSec *= 1 - (grip - 0.9) * 0.065;
  estimatedEtSec *= 1 - u.transmission * 0.015;
  estimatedEtSec *= 1 - u.nitrous * 0.016;
  // Shorter gears shave time on 1/4 mile unless way too short (tops out early)
  const qtrGearFactor = fdRatio > 1 ? 1 - Math.min(0.038, (fdRatio - 1) * 0.18) : 1 + Math.min(0.06, (1 - fdRatio) * 0.22);
  estimatedEtSec *= qtrGearFactor;
  estimatedEtSec = Math.max(3.45, Math.min(16.8, Number(estimatedEtSec.toFixed(2))));

  // Estimate 1/2 mile & 1 mile ETs (penalized if gearTopMph caps speed early!)
  const idealHalfTrap = Math.min(aeroTopMph, 86 + Math.pow(pw, 0.56) * 8.2);
  const halfCapPenalty = gearTopMph < idealHalfTrap ? 1 + ((idealHalfTrap - gearTopMph) / idealHalfTrap) * 0.32 : 1;
  const halfAeroFactor = 1 + (effectiveDrag - 0.3) * 0.14;
  const estimatedHalfEtSec = Number(
    Math.max(5.45, estimatedEtSec * 1.56 * halfAeroFactor * halfCapPenalty).toFixed(2)
  );

  const idealMileTrap = Math.min(aeroTopMph, 102 + Math.pow(pw, 0.58) * 9.8);
  const mileCapPenalty = gearTopMph < idealMileTrap ? 1 + ((idealMileTrap - gearTopMph) / idealMileTrap) * 0.48 : 1;
  const mileAeroFactor = 1 + (effectiveDrag - 0.3) * 0.24;
  const estimatedMileEtSec = Number(
    Math.max(8.75, estimatedEtSec * 2.48 * mileAeroFactor * mileCapPenalty).toFixed(2)
  );

  const pi = Math.min(999, Math.round(pw * 0.42 + grip * 48 + u.transmission * 14 + u.nitrous * 12));

  return {
    hp,
    weightLbs,
    grip,
    redlineRpm,
    shiftSpeedSec,
    shiftBoostMult,
    shiftWindowBonus,
    nitrousShots,
    nitrousPowerMult,
    pi,
    estimatedEtSec,
    estimatedHalfEtSec,
    estimatedMileEtSec,
    topSpeedMph,
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
// 40 RIVALS & CHALLENGES:
//   - 20 Classic 1/4 Mile Career Ladder Rivals (4 per tier, Stage 4 = Tier Boss)
//   - 10 Half-Mile Runway Challenges (2 per tier)
//   - 10 Standing Mile Gauntlet Challenges (2 per tier)
// =========================================================================
export const RIVALS: RivalSpec[] = [
  // ==================== 1/4 MILE · TIER 1 ====================
  {
    id: 't1_r1',
    name: 'Danny "Clutch" Ruiz',
    title: 'Diner Parking Lot Local',
    tier: 1,
    distance: 'quarter',
    stageIndex: 1,
    isBoss: false,
    carId: 'civic_86',
    carName: "Stock Hatch '85",
    chassis: 'hatch',
    bodyVariant: 'standard',
    paintColor: '#e5e7eb',
    stripe: 'none',
    rims: 'steel',
    upgrades: { engine: 0, induction: 0, transmission: 0, tires: 0, chassis: 0, nitrous: 0 },
    targetEtSec: 15.15,
    targetTrapMph: 94,
    reactionSec: 0.34,
    winPurse: 450,
    lossPurse: 125,
  },
  {
    id: 't1_r2',
    name: 'Mina Park',
    title: 'Redline Courier',
    tier: 1,
    distance: 'quarter',
    stageIndex: 2,
    isBoss: false,
    carId: 'crx_88',
    carName: "CR-Pocket '88",
    chassis: 'hatch',
    bodyVariant: 'compact',
    paintColor: '#2563eb',
    stripe: 'twin',
    rims: 'gold',
    upgrades: { engine: 1, induction: 1, transmission: 1, tires: 1, chassis: 0, nitrous: 0 },
    targetEtSec: 13.85,
    targetTrapMph: 103,
    reactionSec: 0.26,
    winPurse: 650,
    lossPurse: 160,
  },
  {
    id: 't1_r3',
    name: 'Ray "Two-Step" Kowalski',
    title: 'Canyon Strip Veteran',
    tier: 1,
    distance: 'quarter',
    stageIndex: 3,
    isBoss: false,
    carId: 'gti_85',
    carName: "Euro GT-16V '85",
    chassis: 'hatch',
    bodyVariant: 'boxy',
    paintColor: '#e8b624',
    stripe: 'flash',
    rims: 'chrome',
    upgrades: { engine: 2, induction: 2, transmission: 2, tires: 2, chassis: 1, nitrous: 1 },
    targetEtSec: 12.65,
    targetTrapMph: 112,
    reactionSec: 0.21,
    winPurse: 900,
    lossPurse: 200,
  },
  {
    id: 't1_boss',
    name: 'Vince "Asphalt" Vega',
    title: 'Tier 1 Boss · Backroad King',
    tier: 1,
    distance: 'quarter',
    stageIndex: 4,
    isBoss: true,
    carId: 'fox_87',
    carName: "Vega's 5.0 Notch",
    chassis: 'muscle',
    bodyVariant: 'notch',
    paintColor: '#262936',
    stripe: 'flames',
    rims: 'prostar',
    upgrades: { engine: 1, induction: 1, transmission: 1, tires: 2, chassis: 1, nitrous: 1 },
    targetEtSec: 11.75,
    targetTrapMph: 121,
    reactionSec: 0.17,
    winPurse: 1650,
    lossPurse: 275,
  },

  // ==================== 1/4 MILE · TIER 2 ====================
  {
    id: 't2_r1',
    name: 'Tanya "Torque" Brooks',
    title: 'Dockside V8 Tuner',
    tier: 2,
    distance: 'quarter',
    stageIndex: 1,
    isBoss: false,
    carId: 'iroc_84',
    carName: "Harbor Z-28",
    chassis: 'muscle',
    bodyVariant: 'standard',
    paintColor: '#16a34a',
    stripe: 'twin',
    rims: 'chrome',
    upgrades: { engine: 1, induction: 1, transmission: 1, tires: 1, chassis: 1, nitrous: 0 },
    targetEtSec: 11.45,
    targetTrapMph: 125,
    reactionSec: 0.23,
    winPurse: 1250,
    lossPurse: 300,
  },
  {
    id: 't2_r2',
    name: 'Hector Morales',
    title: 'Blower Shop Wrench',
    tier: 2,
    distance: 'quarter',
    stageIndex: 2,
    isBoss: false,
    carId: 'chevelle_70',
    carName: "Blown 454 Fury",
    chassis: 'muscle',
    bodyVariant: 'fastback',
    paintColor: '#ea580c',
    stripe: 'checkered',
    rims: 'prostar',
    upgrades: { engine: 2, induction: 2, transmission: 2, tires: 2, chassis: 1, nitrous: 1 },
    targetEtSec: 10.65,
    targetTrapMph: 134,
    reactionSec: 0.19,
    winPurse: 1650,
    lossPurse: 375,
  },
  {
    id: 't2_r3',
    name: 'Lydia "Gears" Novak',
    title: 'Rotary 9k Slammer',
    tier: 2,
    distance: 'quarter',
    stageIndex: 3,
    isBoss: false,
    carId: 'rx7_88',
    carName: "Novak Turbo FC",
    chassis: 'jdm',
    bodyVariant: 'wedge',
    paintColor: '#7e22ce',
    stripe: 'flash',
    rims: 'gold',
    upgrades: { engine: 3, induction: 3, transmission: 3, tires: 3, chassis: 2, nitrous: 2 },
    targetEtSec: 9.95,
    targetTrapMph: 143,
    reactionSec: 0.15,
    winPurse: 2200,
    lossPurse: 450,
  },
  {
    id: 't2_boss',
    name: 'Big Lou Callahan',
    title: 'Tier 2 Boss · Harbor Heavyweight',
    tier: 2,
    distance: 'quarter',
    stageIndex: 4,
    isBoss: true,
    carId: 'gtr_89',
    carName: "Callahan Twin-Turbo",
    chassis: 'jdm',
    bodyVariant: 'standard',
    paintColor: '#d93829',
    stripe: 'twin',
    rims: 'prostar',
    upgrades: { engine: 1, induction: 2, transmission: 2, tires: 2, chassis: 1, nitrous: 1 },
    targetEtSec: 9.35,
    targetTrapMph: 151,
    reactionSec: 0.13,
    winPurse: 3800,
    lossPurse: 600,
  },

  // ==================== 1/4 MILE · TIER 3 ====================
  {
    id: 't3_r1',
    name: 'Kenji Takahashi',
    title: 'Wangan Boost Specialist',
    tier: 3,
    distance: 'quarter',
    stageIndex: 1,
    isBoss: false,
    carId: 'gtr_89',
    carName: "Midnight R32",
    chassis: 'jdm',
    bodyVariant: 'standard',
    paintColor: '#262936',
    stripe: 'none',
    rims: 'gold',
    upgrades: { engine: 1, induction: 2, transmission: 2, tires: 2, chassis: 1, nitrous: 1 },
    targetEtSec: 9.1,
    targetTrapMph: 155,
    reactionSec: 0.17,
    winPurse: 2900,
    lossPurse: 650,
  },
  {
    id: 't3_r2',
    name: 'Sasha Vance',
    title: 'Metro Track Record Holder',
    tier: 3,
    distance: 'quarter',
    stageIndex: 2,
    isBoss: false,
    carId: 'nsx_91',
    carName: "Mid-Apex 1200",
    chassis: 'jdm',
    bodyVariant: 'wedge',
    paintColor: '#e5e7eb',
    stripe: 'flash',
    rims: 'chrome',
    upgrades: { engine: 3, induction: 3, transmission: 3, tires: 3, chassis: 2, nitrous: 2 },
    targetEtSec: 8.45,
    targetTrapMph: 168,
    reactionSec: 0.14,
    winPurse: 3800,
    lossPurse: 800,
  },
  {
    id: 't3_r3',
    name: 'Marcus "Launch" Reid',
    title: 'Pro Street Finalist',
    tier: 3,
    distance: 'quarter',
    stageIndex: 3,
    isBoss: false,
    carId: 'nova_68',
    carName: "Reid Outlaw Nova",
    chassis: 'muscle',
    bodyVariant: 'notch',
    paintColor: '#16a34a',
    stripe: 'checkered',
    rims: 'prostar',
    upgrades: { engine: 4, induction: 4, transmission: 4, tires: 4, chassis: 3, nitrous: 3 },
    targetEtSec: 7.88,
    targetTrapMph: 180,
    reactionSec: 0.11,
    winPurse: 5200,
    lossPurse: 1000,
  },
  {
    id: 't3_boss',
    name: 'Elena "Redline" Cruz',
    title: 'Tier 3 Boss · Metro Champion',
    tier: 3,
    distance: 'quarter',
    stageIndex: 4,
    isBoss: true,
    carId: 'charger_fc',
    carName: "Cruz Alcohol FC",
    chassis: 'funny',
    bodyVariant: 'standard',
    paintColor: '#e8b624',
    stripe: 'flames',
    rims: 'prostar',
    upgrades: { engine: 1, induction: 1, transmission: 1, tires: 2, chassis: 1, nitrous: 1 },
    targetEtSec: 7.35,
    targetTrapMph: 194,
    reactionSec: 0.1,
    winPurse: 8500,
    lossPurse: 1350,
  },

  // ==================== 1/4 MILE · TIER 4 ====================
  {
    id: 't4_r1',
    name: 'Bo "Zoomies" Dalton',
    title: 'Alcohol Funny Car Ace',
    tier: 4,
    distance: 'quarter',
    stageIndex: 1,
    isBoss: false,
    carId: 'firebird_fc',
    carName: "Dalton Firehawk",
    chassis: 'funny',
    bodyVariant: 'aero',
    paintColor: '#2563eb',
    stripe: 'twin',
    rims: 'prostar',
    upgrades: { engine: 1, induction: 2, transmission: 2, tires: 2, chassis: 1, nitrous: 1 },
    targetEtSec: 6.75,
    targetTrapMph: 214,
    reactionSec: 0.13,
    winPurse: 6500,
    lossPurse: 1400,
  },
  {
    id: 't4_r2',
    name: 'Roxy Sterling',
    title: 'Midnight Nitro Queen',
    tier: 4,
    distance: 'quarter',
    stageIndex: 2,
    isBoss: false,
    carId: 'mustang_fc',
    carName: "Sterling Cobra FC",
    chassis: 'funny',
    bodyVariant: 'fastback',
    paintColor: '#7e22ce',
    stripe: 'flames',
    rims: 'chrome',
    upgrades: { engine: 3, induction: 3, transmission: 3, tires: 3, chassis: 2, nitrous: 2 },
    targetEtSec: 6.1,
    targetTrapMph: 235,
    reactionSec: 0.1,
    winPurse: 8500,
    lossPurse: 1750,
  },
  {
    id: 't4_r3',
    name: 'Dale "Chute" Mercer',
    title: '250-MPH Club Enforcer',
    tier: 4,
    distance: 'quarter',
    stageIndex: 3,
    isBoss: false,
    carId: 'corvette_fc',
    carName: "Mercer Nitro Wedge",
    chassis: 'funny',
    bodyVariant: 'wedge',
    paintColor: '#d93829',
    stripe: 'checkered',
    rims: 'prostar',
    upgrades: { engine: 4, induction: 4, transmission: 4, tires: 4, chassis: 4, nitrous: 3 },
    targetEtSec: 5.55,
    targetTrapMph: 256,
    reactionSec: 0.085,
    winPurse: 11500,
    lossPurse: 2200,
  },
  {
    id: 't4_boss',
    name: 'Axel "Thunder" Krane',
    title: 'Tier 4 Boss · Speedway Legend',
    tier: 4,
    distance: 'quarter',
    stageIndex: 4,
    isBoss: true,
    carId: 'slingshot_tf',
    carName: "Krane Rail Prototype",
    chassis: 'topfuel',
    bodyVariant: 'slingshot',
    paintColor: '#262936',
    stripe: 'flash',
    rims: 'prostar',
    upgrades: { engine: 0, induction: 1, transmission: 1, tires: 1, chassis: 1, nitrous: 1 },
    targetEtSec: 5.05,
    targetTrapMph: 274,
    reactionSec: 0.075,
    winPurse: 19500,
    lossPurse: 3200,
  },

  // ==================== 1/4 MILE · TIER 5 ====================
  {
    id: 't5_r1',
    name: 'Jett "Nitromethane" Shaw',
    title: 'Nationals Qualifier #4',
    tier: 5,
    distance: 'quarter',
    stageIndex: 1,
    isBoss: false,
    carId: 'railstorm_tf',
    carName: "Shaw Fueler #44",
    chassis: 'topfuel',
    bodyVariant: 'standard',
    paintColor: '#e8b624',
    stripe: 'twin',
    rims: 'prostar',
    upgrades: { engine: 1, induction: 1, transmission: 2, tires: 2, chassis: 1, nitrous: 1 },
    targetEtSec: 4.65,
    targetTrapMph: 292,
    reactionSec: 0.08,
    winPurse: 14000,
    lossPurse: 3000,
  },
  {
    id: 't5_r2',
    name: 'Kira Volkov',
    title: '300-MPH Barrier Breaker',
    tier: 5,
    distance: 'quarter',
    stageIndex: 2,
    isBoss: false,
    carId: 'canopy_tf',
    carName: "Volkov Mach Canopy",
    chassis: 'topfuel',
    bodyVariant: 'canopy',
    paintColor: '#2563eb',
    stripe: 'flash',
    rims: 'prostar',
    upgrades: { engine: 2, induction: 3, transmission: 3, tires: 3, chassis: 3, nitrous: 2 },
    targetEtSec: 4.32,
    targetTrapMph: 308,
    reactionSec: 0.068,
    winPurse: 18000,
    lossPurse: 3800,
  },
  {
    id: 't5_r3',
    name: 'Rex "Header Flame" Tanner',
    title: 'Semi-Finals Heavy Hitter',
    tier: 5,
    distance: 'quarter',
    stageIndex: 3,
    isBoss: false,
    carId: 'twinhemi_tf',
    carName: "Tanner Twin-Hemi",
    chassis: 'topfuel',
    bodyVariant: 'twin',
    paintColor: '#ea580c',
    stripe: 'flames',
    rims: 'prostar',
    upgrades: { engine: 4, induction: 4, transmission: 4, tires: 4, chassis: 4, nitrous: 4 },
    targetEtSec: 4.04,
    targetTrapMph: 322,
    reactionSec: 0.058,
    winPurse: 24000,
    lossPurse: 4800,
  },
  {
    id: 't5_boss',
    name: 'Don "The Rail" Garlitson',
    title: 'World Champion · Top-Fuel Final Boss',
    tier: 5,
    distance: 'quarter',
    stageIndex: 4,
    isBoss: true,
    carId: 'apex_tfx',
    carName: "Swamp Lightning TF-X",
    chassis: 'topfuel',
    bodyVariant: 'canopy',
    paintColor: '#d93829',
    stripe: 'checkered',
    rims: 'prostar',
    upgrades: { engine: 5, induction: 5, transmission: 5, tires: 5, chassis: 5, nitrous: 5 },
    targetEtSec: 3.82,
    targetTrapMph: 334,
    reactionSec: 0.05,
    winPurse: 45000,
    lossPurse: 7500,
  },

  // ==================== 1/2 MILE RUNWAY CHALLENGES (10 NEW) ====================
  {
    id: 't1_half_1',
    name: 'Tessa "Runway" Morales',
    title: '1/2 Mile Airstrip Qualifier',
    tier: 1,
    distance: 'half',
    stageIndex: 1,
    isBoss: false,
    carId: 'prelude_89',
    carName: "Aero Coupe '89",
    chassis: 'jdm',
    bodyVariant: 'wedge',
    paintColor: '#2563eb',
    stripe: 'twin',
    rims: 'gold',
    upgrades: { engine: 1, induction: 1, transmission: 1, tires: 1, chassis: 1, nitrous: 0 },
    targetEtSec: 21.8,
    targetTrapMph: 128,
    reactionSec: 0.24,
    winPurse: 1050,
    lossPurse: 240,
    challengeNote: 'Runway Speed Trap: Lengthen Final Drive so 5th gear does not hit the limiter early.',
  },
  {
    id: 't1_half_2',
    name: 'Gabe "Tall-Gear" Foster',
    title: '1/2 Mile Street King',
    tier: 1,
    distance: 'half',
    stageIndex: 2,
    isBoss: false,
    carId: 'fox_87',
    carName: "Highway 5.0 Notch",
    chassis: 'muscle',
    bodyVariant: 'notch',
    paintColor: '#d93829',
    stripe: 'flash',
    rims: 'chrome',
    upgrades: { engine: 3, induction: 2, transmission: 2, tires: 2, chassis: 2, nitrous: 1 },
    targetEtSec: 19.2,
    targetTrapMph: 146,
    reactionSec: 0.18,
    winPurse: 1950,
    lossPurse: 360,
    challengeNote: 'Save a Nitrous shot for 4th gear to blast through the 2,640-ft trap.',
  },
  {
    id: 't2_half_1',
    name: 'Caleb "Overdrive" Stone',
    title: '1/2 Mile Dockside Sprint',
    tier: 2,
    distance: 'half',
    stageIndex: 1,
    isBoss: false,
    carId: 'corvette_89',
    carName: "Stingray ZR-6",
    chassis: 'jdm',
    bodyVariant: 'aero',
    paintColor: '#2563eb',
    stripe: 'twin',
    rims: 'chrome',
    upgrades: { engine: 2, induction: 2, transmission: 2, tires: 2, chassis: 2, nitrous: 1 },
    targetEtSec: 16.8,
    targetTrapMph: 168,
    reactionSec: 0.18,
    winPurse: 2600,
    lossPurse: 550,
    challengeNote: 'Aero Coupe Challenge: Tune 4th & 5th/6th ratios for smooth top-end pull.',
  },
  {
    id: 't2_half_2',
    name: 'Nadia "Apex" Vance',
    title: '1/2 Mile Street-Mod Ace',
    tier: 2,
    distance: 'half',
    stageIndex: 2,
    isBoss: false,
    carId: 'rx7_88',
    carName: "Wangan Rotary FC",
    chassis: 'jdm',
    bodyVariant: 'wedge',
    paintColor: '#e8b624',
    stripe: 'checkered',
    rims: 'gold',
    upgrades: { engine: 4, induction: 3, transmission: 3, tires: 3, chassis: 3, nitrous: 2 },
    targetEtSec: 15.1,
    targetTrapMph: 186,
    reactionSec: 0.14,
    winPurse: 4400,
    lossPurse: 800,
    challengeNote: 'High-RPM runway screamer — stretch your Final Drive below 3.40.',
  },
  {
    id: 't3_half_1',
    name: 'Daichi Sato',
    title: '1/2 Mile Wangan Sprinter',
    tier: 3,
    distance: 'half',
    stageIndex: 1,
    isBoss: false,
    carId: 'supra_93',
    carName: "Midnight Mk4 1400",
    chassis: 'jdm',
    bodyVariant: 'aero',
    paintColor: '#ea580c',
    stripe: 'none',
    rims: 'gold',
    upgrades: { engine: 3, induction: 3, transmission: 3, tires: 3, chassis: 2, nitrous: 2 },
    targetEtSec: 13.4,
    targetTrapMph: 210,
    reactionSec: 0.14,
    winPurse: 5800,
    lossPurse: 1200,
    challengeNote: '210 MPH Half-Mile Shootout. Low drag and tall 6th gear shine here.',
  },
  {
    id: 't3_half_2',
    name: 'Viktor "V10" Drago',
    title: '1/2 Mile Pro-Street Boss',
    tier: 3,
    distance: 'half',
    stageIndex: 2,
    isBoss: false,
    carId: 'viper_92',
    carName: "Drago Twin-Turbo V10",
    chassis: 'muscle',
    bodyVariant: 'fastback',
    paintColor: '#7e22ce',
    stripe: 'twin',
    rims: 'prostar',
    upgrades: { engine: 5, induction: 4, transmission: 4, tires: 4, chassis: 4, nitrous: 3 },
    targetEtSec: 11.9,
    targetTrapMph: 234,
    reactionSec: 0.1,
    winPurse: 9600,
    lossPurse: 1800,
    challengeNote: 'Break 230 MPH before the 1/2 mile markers!',
  },
  {
    id: 't4_half_1',
    name: 'Colt "Afterburner" Hayes',
    title: '1/2 Mile Funny Car Shootout',
    tier: 4,
    distance: 'half',
    stageIndex: 1,
    isBoss: false,
    carId: 'firebird_fc',
    carName: "Afterburner Aero FC",
    chassis: 'funny',
    bodyVariant: 'aero',
    paintColor: '#2563eb',
    stripe: 'flash',
    rims: 'prostar',
    upgrades: { engine: 3, induction: 3, transmission: 3, tires: 3, chassis: 3, nitrous: 2 },
    targetEtSec: 9.75,
    targetTrapMph: 282,
    reactionSec: 0.1,
    winPurse: 13500,
    lossPurse: 2600,
    challengeNote: 'Tune tall 4th/5th gear ratios — stock quarter-mile gears bounce at 255 MPH!',
  },
  {
    id: 't4_half_2',
    name: 'Zara "Mach" Sterling',
    title: '1/2 Mile Outlaw Queen',
    tier: 4,
    distance: 'half',
    stageIndex: 2,
    isBoss: false,
    carId: 'camaro_promod',
    carName: "Outlaw Carbon 5-Spd",
    chassis: 'funny',
    bodyVariant: 'notch',
    paintColor: '#262936',
    stripe: 'flames',
    rims: 'prostar',
    upgrades: { engine: 5, induction: 5, transmission: 5, tires: 4, chassis: 5, nitrous: 4 },
    targetEtSec: 8.65,
    targetTrapMph: 310,
    reactionSec: 0.08,
    winPurse: 22000,
    lossPurse: 4000,
    challengeNote: '300+ MPH Half-Mile Pro-Mod Clash!',
  },
  {
    id: 't5_half_1',
    name: 'Soren "Jetstream" Lind',
    title: '1/2 Mile Nitro Runway',
    tier: 5,
    distance: 'half',
    stageIndex: 1,
    isBoss: false,
    carId: 'canopy_tf',
    carName: "Jetstream Canopy TF",
    chassis: 'topfuel',
    bodyVariant: 'canopy',
    paintColor: '#2563eb',
    stripe: 'twin',
    rims: 'prostar',
    upgrades: { engine: 3, induction: 3, transmission: 3, tires: 3, chassis: 3, nitrous: 3 },
    targetEtSec: 7.15,
    targetTrapMph: 358,
    reactionSec: 0.068,
    winPurse: 28000,
    lossPurse: 5500,
    challengeNote: '350+ MPH Half-Mile Nitro Blast — use the 1/2 Mile gearing preset.',
  },
  {
    id: 't5_half_2',
    name: 'Baron "Sonic" Vance',
    title: '1/2 Mile World Record Holder',
    tier: 5,
    distance: 'half',
    stageIndex: 2,
    isBoss: false,
    carId: 'apex_tfx',
    carName: "Sonic Boom TF-X",
    chassis: 'topfuel',
    bodyVariant: 'canopy',
    paintColor: '#e5e7eb',
    stripe: 'flash',
    rims: 'prostar',
    upgrades: { engine: 5, induction: 5, transmission: 5, tires: 5, chassis: 5, nitrous: 5 },
    targetEtSec: 6.35,
    targetTrapMph: 386,
    reactionSec: 0.052,
    winPurse: 52000,
    lossPurse: 8500,
    challengeNote: 'Ultimate Half-Mile Speed Trap Boss at 385+ MPH.',
  },

  // ==================== 1 MILE STANDING MILE GAUNTLET (10 NEW) ====================
  {
    id: 't1_mile_1',
    name: 'Owen "Salt Flats" Miller',
    title: 'Standing Mile Street Qualifier',
    tier: 1,
    distance: 'mile',
    stageIndex: 1,
    isBoss: false,
    carId: 'prelude_89',
    carName: "Salt-Flat Aero '89",
    chassis: 'jdm',
    bodyVariant: 'wedge',
    paintColor: '#e5e7eb',
    stripe: 'twin',
    rims: 'chrome',
    upgrades: { engine: 2, induction: 2, transmission: 2, tires: 1, chassis: 2, nitrous: 1 },
    targetEtSec: 33.8,
    targetTrapMph: 148,
    reactionSec: 0.22,
    winPurse: 1650,
    lossPurse: 350,
    challengeNote: '5,280-ft Standing Mile! Switch to 1 Mile gearing in Drivetrain Tuning.',
  },
  {
    id: 't1_mile_2',
    name: 'Carla "Top-End" Reyes',
    title: 'Standing Mile Street Champion',
    tier: 1,
    distance: 'mile',
    stageIndex: 2,
    isBoss: false,
    carId: 'fox_87',
    carName: "Bonneville 5.0",
    chassis: 'muscle',
    bodyVariant: 'notch',
    paintColor: '#16a34a',
    stripe: 'checkered',
    rims: 'prostar',
    upgrades: { engine: 4, induction: 4, transmission: 3, tires: 2, chassis: 4, nitrous: 2 },
    targetEtSec: 29.6,
    targetTrapMph: 166,
    reactionSec: 0.16,
    winPurse: 2900,
    lossPurse: 520,
    challengeNote: 'Endurance speed duel — hold Nitrous until top gear for maximum trap gain.',
  },
  {
    id: 't2_mile_1',
    name: 'Miles "Long-Leg" Carter',
    title: 'Standing Mile Grand Tourer',
    tier: 2,
    distance: 'mile',
    stageIndex: 1,
    isBoss: false,
    carId: 'corvette_89',
    carName: "Bonneville ZR '89",
    chassis: 'jdm',
    bodyVariant: 'aero',
    paintColor: '#d93829',
    stripe: 'twin',
    rims: 'chrome',
    upgrades: { engine: 3, induction: 3, transmission: 3, tires: 2, chassis: 3, nitrous: 2 },
    targetEtSec: 25.8,
    targetTrapMph: 192,
    reactionSec: 0.16,
    winPurse: 4200,
    lossPurse: 850,
    challengeNote: 'Break the 190 MPH barrier across a full standing mile!',
  },
  {
    id: 't2_mile_2',
    name: 'Duke "Iron" Holloway',
    title: 'Standing Mile Mod Legend',
    tier: 2,
    distance: 'mile',
    stageIndex: 2,
    isBoss: false,
    carId: 'chevelle_70',
    carName: "Twin-Scroll 454 Mile",
    chassis: 'muscle',
    bodyVariant: 'fastback',
    paintColor: '#ea580c',
    stripe: 'flames',
    rims: 'prostar',
    upgrades: { engine: 5, induction: 5, transmission: 4, tires: 4, chassis: 5, nitrous: 3 },
    targetEtSec: 23.2,
    targetTrapMph: 212,
    reactionSec: 0.13,
    winPurse: 6800,
    lossPurse: 1200,
    challengeNote: '210+ MPH Street-Mod Mile Champion — tall final drive mandatory.',
  },
  {
    id: 't3_mile_1',
    name: 'Renji "300K" Kuroda',
    title: 'Standing Mile Wangan Ghost',
    tier: 3,
    distance: 'mile',
    stageIndex: 1,
    isBoss: false,
    carId: 'supra_93',
    carName: "Wangan 250-MPH Mk4",
    chassis: 'jdm',
    bodyVariant: 'aero',
    paintColor: '#262936',
    stripe: 'flash',
    rims: 'gold',
    upgrades: { engine: 4, induction: 4, transmission: 4, tires: 3, chassis: 4, nitrous: 3 },
    targetEtSec: 20.6,
    targetTrapMph: 244,
    reactionSec: 0.12,
    winPurse: 9200,
    lossPurse: 1800,
    challengeNote: 'Kuroda runs ultra-tall 6th gear ratios — match his aero & gearing!',
  },
  {
    id: 't3_mile_2',
    name: 'Helena "Velocity" Cross',
    title: 'Standing Mile Pro-Street Sovereign',
    tier: 3,
    distance: 'mile',
    stageIndex: 2,
    isBoss: false,
    carId: 'viper_92',
    carName: "Velocity 2000 V10",
    chassis: 'muscle',
    bodyVariant: 'fastback',
    paintColor: '#d93829',
    stripe: 'twin',
    rims: 'prostar',
    upgrades: { engine: 5, induction: 5, transmission: 5, tires: 5, chassis: 5, nitrous: 5 },
    targetEtSec: 18.6,
    targetTrapMph: 268,
    reactionSec: 0.095,
    winPurse: 15500,
    lossPurse: 2800,
    challengeNote: '268 MPH Standing Mile Pro-Street Record Challenge.',
  },
  {
    id: 't4_mile_1',
    name: 'Maverick "Mach" Cole',
    title: 'Standing Mile Aero Funny Car',
    tier: 4,
    distance: 'mile',
    stageIndex: 1,
    isBoss: false,
    carId: 'firebird_fc',
    carName: "Mach-300 Firehawk",
    chassis: 'funny',
    bodyVariant: 'aero',
    paintColor: '#e8b624',
    stripe: 'flash',
    rims: 'prostar',
    upgrades: { engine: 4, induction: 4, transmission: 4, tires: 4, chassis: 4, nitrous: 3 },
    targetEtSec: 15.2,
    targetTrapMph: 322,
    reactionSec: 0.09,
    winPurse: 21000,
    lossPurse: 4200,
    challengeNote: 'Drop your Final Drive below 2.75 to chase 320+ MPH in the full mile.',
  },
  {
    id: 't4_mile_2',
    name: 'Dante "Salt King" Moretti',
    title: 'Standing Mile Funny Car Emperor',
    tier: 4,
    distance: 'mile',
    stageIndex: 2,
    isBoss: false,
    carId: 'corvette_fc',
    carName: "Moretti 345-MPH Wedge",
    chassis: 'funny',
    bodyVariant: 'wedge',
    paintColor: '#7e22ce',
    stripe: 'checkered',
    rims: 'prostar',
    upgrades: { engine: 5, induction: 5, transmission: 5, tires: 5, chassis: 5, nitrous: 5 },
    targetEtSec: 13.7,
    targetTrapMph: 348,
    reactionSec: 0.075,
    winPurse: 34000,
    lossPurse: 6200,
    challengeNote: '348 MPH Standing Mile Gauntlet — every perfect shift counts!',
  },
  {
    id: 't5_mile_1',
    name: 'Captain "Bonneville" Vance',
    title: 'Standing Mile Top-Fuel Streamliner',
    tier: 5,
    distance: 'mile',
    stageIndex: 1,
    isBoss: false,
    carId: 'canopy_tf',
    carName: "Salt-Streak Canopy TF",
    chassis: 'topfuel',
    bodyVariant: 'canopy',
    paintColor: '#2563eb',
    stripe: 'flash',
    rims: 'prostar',
    upgrades: { engine: 4, induction: 4, transmission: 4, tires: 4, chassis: 4, nitrous: 4 },
    targetEtSec: 11.4,
    targetTrapMph: 396,
    reactionSec: 0.062,
    winPurse: 42000,
    lossPurse: 8000,
    challengeNote: 'Approach 400 MPH in a full mile! Custom tall top-gear ratios required.',
  },
  {
    id: 't5_mile_2',
    name: 'Omega "420 MPH" Sterling',
    title: 'Ultimate Standing Mile World Legend',
    tier: 5,
    distance: 'mile',
    stageIndex: 2,
    isBoss: false,
    carId: 'apex_tfx',
    carName: "Omega Land-Speed TF-X",
    chassis: 'topfuel',
    bodyVariant: 'canopy',
    paintColor: '#262936',
    stripe: 'flames',
    rims: 'prostar',
    upgrades: { engine: 5, induction: 5, transmission: 5, tires: 5, chassis: 5, nitrous: 5 },
    targetEtSec: 10.15,
    targetTrapMph: 424,
    reactionSec: 0.048,
    winPurse: 85000,
    lossPurse: 14000,
    challengeNote: 'The ultimate 420+ MPH Standing Mile final test of drivetrain mastery.',
  },
];

export function createInitialPlayerSave(): PlayerSave {
  return {
    callsign: 'ROOKIE_88',
    cash: 650,
    activeCarId: 'civic_86',
    highestUnlockedTier: 1,
    ownedCars: ['civic_86'],
    defeatedRivals: [],
    carConfigs: {
      civic_86: createDefaultCarConfig('civic_86'),
    },
    totalWins: 0,
    totalRaces: 0,
  };
}

export function getCarConfig(save: PlayerSave, carId: string): CarConfig {
  const existing = save.carConfigs[carId];
  if (!existing) return createDefaultCarConfig(carId);
  return {
    ...existing,
    tuning: getEffectiveTuning(carId, existing),
  };
}

export function formatEt(ms: number): string {
  return (ms / 1000).toFixed(3) + 's';
}

export function formatCash(amount: number): string {
  return '$' + Math.floor(amount).toLocaleString('en-US');
}
