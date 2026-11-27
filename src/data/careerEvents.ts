import {
  BodyVariant,
  CarUpgrades,
  ChassisStyle,
  RimStyle,
  RivalSpec,
  StripDistanceId,
  StripeStyle,
  TierId,
} from '../types/game';

interface TierLadderBlueprint {
  tier: TierId;
  quarterEts: [number, number, number, number, number, number, number, number];
  quarterTraps: [number, number, number, number, number, number, number, number];
  halfEts: [number, number, number, number, number, number, number, number];
  halfTraps: [number, number, number, number, number, number, number, number];
  mileEts: [number, number, number, number, number, number, number, number];
  mileTraps: [number, number, number, number, number, number, number, number];
  quarterPurses: [number, number, number, number, number, number, number, number];
  reactionRange: [number, number]; // [stage1, stage8]
  cars: {
    carId: string;
    carName: string;
    chassis: ChassisStyle;
    bodyVariant: BodyVariant;
  }[];
  quarterRivals: [string, string][]; // [name, title] x 8
  halfRivals: [string, string][];    // [name, title] x 8
  mileRivals: [string, string][];    // [name, title] x 8
}

const PAINTS = [
  '#e5e7eb',
  '#2563eb',
  '#e8b624',
  '#d93829',
  '#16a34a',
  '#ea580c',
  '#7e22ce',
  '#262936',
];

const STRIPES: StripeStyle[] = [
  'none',
  'twin',
  'flash',
  'twin',
  'checkered',
  'flash',
  'flames',
  'flames',
];

const RIMS: RimStyle[] = [
  'steel',
  'gold',
  'gold',
  'chrome',
  'chrome',
  'prostar',
  'prostar',
  'prostar',
];

const STAGE_UPGRADES: CarUpgrades[] = [
  { engine: 0, induction: 0, transmission: 0, tires: 0, chassis: 0, nitrous: 0 },
  { engine: 1, induction: 0, transmission: 1, tires: 1, chassis: 0, nitrous: 0 },
  { engine: 1, induction: 1, transmission: 1, tires: 1, chassis: 1, nitrous: 0 },
  { engine: 2, induction: 2, transmission: 2, tires: 2, chassis: 1, nitrous: 1 },
  { engine: 3, induction: 2, transmission: 2, tires: 2, chassis: 2, nitrous: 1 },
  { engine: 3, induction: 3, transmission: 3, tires: 3, chassis: 2, nitrous: 2 },
  { engine: 4, induction: 4, transmission: 4, tires: 4, chassis: 3, nitrous: 3 },
  { engine: 5, induction: 5, transmission: 5, tires: 5, chassis: 4, nitrous: 4 },
];

const TIER_BLUEPRINTS: TierLadderBlueprint[] = [
  // ===================== TIER 1 · STREET CLASS (24 EVENTS) =====================
  {
    tier: 1,
    quarterEts: [15.55, 14.95, 14.35, 13.80, 13.28, 12.80, 12.35, 11.95],
    quarterTraps: [88, 92, 97, 102, 107, 112, 117, 122],
    halfEts: [24.75, 23.85, 23.00, 22.15, 21.35, 20.60, 19.95, 19.35],
    halfTraps: [104, 109, 114, 119, 124, 129, 134, 139],
    mileEts: [40.90, 39.40, 38.00, 36.70, 35.45, 34.30, 33.25, 32.30],
    mileTraps: [112, 118, 124, 130, 136, 142, 147, 152],
    quarterPurses: [180, 230, 290, 360, 440, 540, 660, 950],
    reactionRange: [0.36, 0.16],
    cars: [
      { carId: 'civic_86', carName: "Stock Hatch '85", chassis: 'hatch', bodyVariant: 'standard' },
      { carId: 'crx_88', carName: "CR-Pocket '88", chassis: 'hatch', bodyVariant: 'compact' },
      { carId: 'gti_85', carName: "Euro GT-16V '85", chassis: 'hatch', bodyVariant: 'boxy' },
      { carId: 'prelude_89', carName: "Aero Coupe '89", chassis: 'jdm', bodyVariant: 'wedge' },
      { carId: 'fox_87', carName: "Fox 5.0 Notch '87", chassis: 'muscle', bodyVariant: 'notch' },
    ],
    quarterRivals: [
      ['Danny "Clutch" Ruiz', 'Diner Parking Lot Local'],
      ['Mina Park', 'Redline Courier'],
      ['Toby "Rev" Jenkins', 'Drive-In Bracket Regular'],
      ['Ray "Two-Step" Kowalski', 'Canyon Strip Veteran'],
      ['Keiko Sato', 'Midnight Hatch Tuner'],
      ['Lamar Brooks', 'Street Tire Hustler'],
      ['Gina "Apex" Morales', 'Backroad Qualifier #1'],
      ['Vince "Asphalt" Vega', 'Tier 1 Boss · Backroad King'],
    ],
    halfRivals: [
      ['Tessa "Runway" Morales', '1/2 Mile Airstrip Rookie'],
      ['Owen "Slipstream" Bell', 'County Road Sprinter'],
      ['Priya Nair', 'Desert Straightaway Ace'],
      ['Derrick Shaw', 'Overdrive Street Runner'],
      ['Nora Lindqvist', '5th-Gear Momentum Driver'],
      ['Beto Ramirez', 'Airstrip Weekend King'],
      ['Samira Vance', 'Half-Mile Bracket Finalist'],
      ['Gabe "Tall-Gear" Foster', 'Tier 1 Boss · 1/2 Mile Street King'],
    ],
    mileRivals: [
      ['Owen "Salt Flats" Miller', 'Standing Mile Street Rookie'],
      ['Hannah Cole', 'Highway Pull Contender'],
      ['Jules Beaumont', 'Aero Wedge Specialist'],
      ['Trevor "Long-Leg" Diaz', 'Desert Mile Challenger'],
      ['Sora Takahashi', 'High-Speed Hatch Builder'],
      ['Manny Delgado', 'Top-Gear Endurance Vet'],
      ['Claire "Draft" Bennett', 'Standing Mile Finalist'],
      ['Carla "Top-End" Reyes', 'Tier 1 Boss · Standing Mile Champ'],
    ],
  },

  // ===================== TIER 2 · STREET MOD (24 EVENTS) =====================
  {
    tier: 2,
    quarterEts: [12.40, 11.85, 11.35, 10.90, 10.50, 10.18, 9.90, 9.65],
    quarterTraps: [110, 116, 122, 128, 134, 140, 146, 152],
    halfEts: [20.05, 19.20, 18.45, 17.80, 17.20, 16.65, 16.20, 15.75],
    halfTraps: [128, 135, 142, 149, 156, 163, 170, 177],
    mileEts: [33.10, 31.85, 30.70, 29.65, 28.70, 27.85, 27.10, 26.40],
    mileTraps: [140, 148, 156, 164, 172, 180, 188, 196],
    quarterPurses: [400, 500, 625, 775, 950, 1175, 1450, 2100],
    reactionRange: [0.26, 0.12],
    cars: [
      { carId: 'iroc_84', carName: "Harbor Z-28", chassis: 'muscle', bodyVariant: 'standard' },
      { carId: 'gnx_87', carName: "Blackout GNX '87", chassis: 'muscle', bodyVariant: 'notch' },
      { carId: 'chevelle_70', carName: "Blown 454 Fury", chassis: 'muscle', bodyVariant: 'fastback' },
      { carId: 'rx7_88', carName: "Novak Turbo FC", chassis: 'jdm', bodyVariant: 'wedge' },
      { carId: 'corvette_89', carName: "Stingray ZR-6", chassis: 'jdm', bodyVariant: 'aero' },
    ],
    quarterRivals: [
      ['Tanya "Torque" Brooks', 'Dockside V8 Tuner'],
      ['Ricky "Burnout" Vance', 'Pier 14 Bracket Driver'],
      ['Hector Morales', 'Blower Shop Wrench'],
      ['Simone Carter', 'Turbo V6 Launch Specialist'],
      ['Lydia "Gears" Novak', 'Rotary 9k Slammer'],
      ['Darnell Price', 'Big-Block Tire Scorcher'],
      ['Mitch "Slicks" Dawson', 'Harbor Finals Contender'],
      ['Big Lou Callahan', 'Tier 2 Boss · Harbor Heavyweight'],
    ],
    halfRivals: [
      ['Caleb "Overdrive" Stone', '1/2 Mile Dockside Sprinter'],
      ['Veronica Cruz', 'Pier Runway Muscle Ace'],
      ['Koji Watanabe', 'Rotary Boost Chaser'],
      ['Grant "Iron" Miller', 'Big-Block Half-Mile Vet'],
      ['Tasha Reynolds', '6-Speed Corvette Tuner'],
      ['Devon Pike', 'Harbor Top-End Contender'],
      ['Alina Petrova', 'Half-Mile Mod Finalist'],
      ['Nadia "Apex" Vance', 'Tier 2 Boss · 1/2 Mile Mod Ace'],
    ],
    mileRivals: [
      ['Miles "Long-Leg" Carter', 'Standing Mile Grand Tourer'],
      ['Bree Gallagher', 'Aero Fastback Specialist'],
      ['Sandro Rossi', '6th-Gear Speed Chaser'],
      ['Kendra "Boost" Hall', 'Turbo Dockyard Runner'],
      ['Wes Thornton', 'Iron-Block Mile Bruiser'],
      ['Yuki Tanaka', 'Rotary Mile Screamer'],
      ['Marco Silva', 'Standing Mile Mod Finalist'],
      ['Duke "Iron" Holloway', 'Tier 2 Boss · Standing Mile Legend'],
    ],
  },

  // ===================== TIER 3 · PRO STREET (24 EVENTS) =====================
  {
    tier: 3,
    quarterEts: [9.85, 9.45, 9.05, 8.68, 8.34, 8.04, 7.76, 7.50],
    quarterTraps: [142, 149, 156, 164, 172, 180, 188, 196],
    halfEts: [15.55, 14.95, 14.38, 13.85, 13.36, 12.90, 12.48, 12.10],
    halfTraps: [168, 177, 186, 195, 204, 213, 222, 232],
    mileEts: [25.50, 24.55, 23.65, 22.80, 22.05, 21.35, 20.70, 20.10],
    mileTraps: [188, 198, 208, 218, 228, 238, 248, 258],
    quarterPurses: [900, 1125, 1400, 1725, 2125, 2600, 3200, 4600],
    reactionRange: [0.19, 0.095],
    cars: [
      { carId: 'gtr_89', carName: "Midnight R32", chassis: 'jdm', bodyVariant: 'standard' },
      { carId: 'supra_93', carName: "Mk4 Boost GT '93", chassis: 'jdm', bodyVariant: 'aero' },
      { carId: 'nsx_91', carName: "Mid-Apex 1200", chassis: 'jdm', bodyVariant: 'wedge' },
      { carId: 'viper_92', carName: "Venom V10 Pro", chassis: 'muscle', bodyVariant: 'fastback' },
      { carId: 'nova_68', carName: "Outlaw Nova '68", chassis: 'muscle', bodyVariant: 'notch' },
    ],
    quarterRivals: [
      ['Kenji Takahashi', 'Wangan Boost Specialist'],
      ['Tessa "Spool" Monroe', 'Stadium AWD Launcher'],
      ['Sasha Vance', 'Metro Track Record Holder'],
      ['Raul Mendoza', 'Twin-Turbo V10 Brawler'],
      ['Hana Kobayashi', '9,000-RPM Mid-Engine Ace'],
      ['Marcus "Launch" Reid', 'Pro Street Semi-Finalist'],
      ['Braxton Cole', 'Tubbed Pro-Mod Enforcer'],
      ['Elena "Redline" Cruz', 'Tier 3 Boss · Metro Champion'],
    ],
    halfRivals: [
      ['Daichi Sato', '1/2 Mile Wangan Sprinter'],
      ['Lola "Twin-Scroll" Park', 'Stadium Runway Qualifier'],
      ['Roman Volkov', '200-MPH Street Outlaw'],
      ['Jade Mercer', 'Aero Supra Tuner'],
      ['Cyrus "NOS" Grant', 'Nitrous Mid-Track Assassin'],
      ['Naomi Fujimoto', 'High-Boost Runway Vet'],
      ['Darius King', 'Half-Mile Pro-Street Finalist'],
      ['Viktor "V10" Drago', 'Tier 3 Boss · 1/2 Mile Boss'],
    ],
    mileRivals: [
      ['Renji "300K" Kuroda', 'Standing Mile Wangan Ghost'],
      ['Eva Lind', '210-MPH Tunnel Runner'],
      ['Malik "Aero" Jones', 'Carbon Splitter Specialist'],
      ['Sven Holm', 'Tall-6th Mile Challenger'],
      ['Keiichiro Mori', 'Single-Turbo Mile Monster'],
      ['Brianna Stone', 'V10 Top-End Specialist'],
      ['Tariq Al-Mansoor', 'Standing Mile Pro Finalist'],
      ['Helena "Velocity" Cross', 'Tier 3 Boss · Mile Sovereign'],
    ],
  },

  // ===================== TIER 4 · FUNNY CAR (24 EVENTS) =====================
  {
    tier: 4,
    quarterEts: [7.45, 7.12, 6.80, 6.50, 6.22, 5.96, 5.72, 5.50],
    quarterTraps: [192, 202, 212, 222, 232, 244, 256, 268],
    halfEts: [11.60, 11.15, 10.72, 10.32, 9.94, 9.58, 9.25, 8.95],
    halfTraps: [224, 235, 246, 258, 270, 282, 294, 306],
    mileEts: [19.10, 18.42, 17.78, 17.18, 16.62, 16.10, 15.60, 15.15],
    mileTraps: [242, 252, 262, 272, 282, 292, 302, 314],
    quarterPurses: [2100, 2600, 3200, 3950, 4850, 5950, 7300, 10500],
    reactionRange: [0.14, 0.072],
    cars: [
      { carId: 'charger_fc', carName: 'Nitro Charger FC', chassis: 'funny', bodyVariant: 'standard' },
      { carId: 'firebird_fc', carName: 'Firehawk Aero FC', chassis: 'funny', bodyVariant: 'aero' },
      { carId: 'mustang_fc', carName: 'Cobra Jet FC', chassis: 'funny', bodyVariant: 'fastback' },
      { carId: 'camaro_promod', carName: 'Outlaw Pro-Mod Z', chassis: 'funny', bodyVariant: 'notch' },
      { carId: 'corvette_fc', carName: 'Stingray Nitro FC', chassis: 'funny', bodyVariant: 'wedge' },
    ],
    quarterRivals: [
      ['Bo "Zoomies" Dalton', 'Alcohol Funny Car Ace'],
      ['Trixie "Flame" Vance', 'Midnight Flip-Body Rookie'],
      ['Roxy Sterling', 'Midnight Nitro Queen'],
      ['Hank "Blower" Kowalski', '14-71 Supercharger Vet'],
      ['Kieran Walsh', '5-Speed Lenco Outlaw'],
      ['Dale "Chute" Mercer', '250-MPH Club Enforcer'],
      ['Vance "Burner" Thorne', 'Speedway Finals Qualifier'],
      ['Axel "Thunder" Krane', 'Tier 4 Boss · Speedway Legend'],
    ],
    halfRivals: [
      ['Colt "Afterburner" Hayes', '1/2 Mile Funny Car Ace'],
      ['Margo "Slick" Bell', 'Alcohol Runway Specialist'],
      ['chaz "Nitro" Ortiz', '260-MPH Speed Trap Driver'],
      ['Freya Lindstrom', 'Carbon Flip-Body Pilot'],
      ['Derrick "Wedge" Holt', 'Aero Funny Car Tuner'],
      ['Sienna Cross', '300-MPH Runway Hunter'],
      ['Bodie Mercer', 'Half-Mile Outlaw Finalist'],
      ['Zara "Mach" Sterling', 'Tier 4 Boss · 1/2 Mile Queen'],
    ],
    mileRivals: [
      ['Maverick "Mach" Cole', 'Standing Mile Aero FC'],
      ['Lina "Streamline" Park', 'Low-Drag Flip-Body Ace'],
      ['Garrett "Salt" Stone', 'Bonneville Nitro Pilot'],
      ['Nadia "Overdrive" Cruz', '5-Speed Mile Specialist'],
      ['cody "Chute" Brooks', '300-MPH Mile Contender'],
      ['Astrid "Jet" Novak', 'Carbon Wedge Speedster'],
      ['Rico "Flame" Delgado', 'Standing Mile FC Finalist'],
      ['Dante "Salt King" Moretti', 'Tier 4 Boss · FC Mile Emperor'],
    ],
  },

  // ===================== TIER 5 · TOP FUEL (24 EVENTS) =====================
  {
    tier: 5,
    quarterEts: [5.45, 5.12, 4.82, 4.54, 4.28, 4.04, 3.82, 3.62],
    quarterTraps: [262, 276, 290, 304, 318, 332, 345, 358],
    halfEts: [8.15, 7.78, 7.44, 7.12, 6.82, 6.54, 6.28, 6.05],
    halfTraps: [308, 320, 332, 344, 356, 368, 380, 392],
    mileEts: [13.90, 13.35, 12.84, 12.36, 11.90, 11.46, 11.04, 10.65],
    mileTraps: [322, 334, 346, 358, 370, 382, 394, 408],
    quarterPurses: [4800, 5900, 7250, 8900, 10900, 13400, 16500, 24000],
    reactionRange: [0.088, 0.048],
    cars: [
      { carId: 'railstorm_tf', carName: 'Railstorm TF-1', chassis: 'topfuel', bodyVariant: 'standard' },
      { carId: 'slingshot_tf', carName: 'Nostalgia Slingshot', chassis: 'topfuel', bodyVariant: 'slingshot' },
      { carId: 'canopy_tf', carName: 'Mach-4 Canopy TF', chassis: 'topfuel', bodyVariant: 'canopy' },
      { carId: 'twinhemi_tf', carName: 'Twin-Hemi Goliath', chassis: 'topfuel', bodyVariant: 'twin' },
      { carId: 'apex_tfx', carName: 'Swamp Lightning TF-X', chassis: 'topfuel', bodyVariant: 'canopy' },
    ],
    quarterRivals: [
      ['Jett "Nitromethane" Shaw', 'Nationals Qualifier #8'],
      ['Betsy "Cackle" Boone', 'Front-Engine Rail Ace'],
      ['Kira Volkov', '300-MPH Barrier Breaker'],
      ['Trey "Lockup" Vance', 'Direct-Drive Clutch Master'],
      ['Sloane "Header" Reed', 'Dual-Blower Rail Pilot'],
      ['Rex "Header Flame" Tanner', 'Nationals Semi-Finalist'],
      ['Viper "3-Sec" Callahan', 'World Finals Contender'],
      ['Don "The Rail" Garlitson', 'World Champion · Top-Fuel Final Boss'],
    ],
    halfRivals: [
      ['Soren "Jetstream" Lind', '1/2 Mile Nitro Qualifier'],
      ['carmen "Mach" Reyes', 'Canopy Dragster Ace'],
      ['Bram "Thunder" Kovacs', '340-MPH Runway Pilot'],
      ['Tessa "Canopy" Sterling', 'Streamliner Speed Hunter'],
      ['Hector "Twin" Vega', 'Dual-Hemi Half-Mile Beast'],
      ['Yuki "Sonic" Sato', '370-MPH Runway Recordist'],
      ['Maximus "Nitro" Cruz', '1/2 Mile World Finalist'],
      ['Baron "Sonic" Vance', 'Tier 5 Boss · 1/2 Mile World Record'],
    ],
    mileRivals: [
      ['Captain "Bonneville" Vance', 'Standing Mile Streamliner'],
      ['Anya "Mach-4" Volkov', 'Enclosed Canopy Pilot'],
      ['Deke "Salt" Holloway', '350-MPH Land-Speed Rail'],
      ['Zoe "Afterburner" Park', 'Nitro Mile Specialist'],
      ['Gideon "Goliath" Crane', 'Twin-Hemi Mile Monster'],
      ['Lukas "Velocity" Holm', '390-MPH Runway Legend'],
      ['Serena "Apex" Cross', 'Standing Mile World Finalist'],
      ['Omega "400 MPH" Sterling', 'Tier 5 Boss · Ultimate Mile Legend'],
    ],
  },
];

function buildChallengeNote(
  distance: StripDistanceId,
  stageIndex: number,
  tier: TierId,
  isBoss: boolean
): string | undefined {
  if (distance === 'quarter') {
    if (stageIndex === 1 && tier > 1) {
      return `Tier ${tier} Entry Heat: A maxed Tier ${tier - 1} build can challenge early heats before upgrading to a Tier ${tier} chassis.`;
    }
    if (isBoss) {
      return `Tier ${tier} Championship Boss — defeat to unlock ${
        tier < 5 ? `Tier ${tier + 1} class & showroom cars.` : 'World Champion prestige.'
      }`;
    }
    return undefined;
  }
  if (distance === 'half') {
    if (stageIndex === 1) {
      return 'Runway Speed Trap: Use the Gearbox Auto-Tuner (1/2 MI) for clean top-end pull.';
    }
    if (isBoss) {
      return `Tier ${tier} 1/2-Mile Boss — enable Top-Gear Rev Protection to run full throttle safely.`;
    }
    return stageIndex >= 5
      ? 'High-speed 2,640-ft duel — save a Nitrous shot for upper gears.'
      : undefined;
  }
  // 'mile'
  if (stageIndex === 1) {
    return '5,280-ft Standing Mile! Run Auto-Tune (1 MILE) so top gear does not redline early.';
  }
  if (isBoss) {
    return `Tier ${tier} Standing Mile Boss — tall overdrive gears & Top-Gear Rev Protection recommended.`;
  }
  return stageIndex >= 5
    ? 'Full-mile top-speed gauntlet — aero drag & tall overdrive decide the winner.'
    : undefined;
}

function buildCareerEvents(): RivalSpec[] {
  const events: RivalSpec[] = [];

  for (const bp of TIER_BLUEPRINTS) {
    const distances: StripDistanceId[] = ['quarter', 'half', 'mile'];
    for (const distance of distances) {
      const ets =
        distance === 'quarter' ? bp.quarterEts : distance === 'half' ? bp.halfEts : bp.mileEts;
      const traps =
        distance === 'quarter'
          ? bp.quarterTraps
          : distance === 'half'
          ? bp.halfTraps
          : bp.mileTraps;
      const rivals =
        distance === 'quarter'
          ? bp.quarterRivals
          : distance === 'half'
          ? bp.halfRivals
          : bp.mileRivals;
      const distPurseMult = distance === 'mile' ? 1.55 : distance === 'half' ? 1.25 : 1.0;

      for (let i = 0; i < 8; i++) {
        const stageIndex = i + 1;
        const isBoss = stageIndex === 8;
        const id =
          distance === 'quarter'
            ? isBoss
              ? `t${bp.tier}_boss`
              : `t${bp.tier}_r${stageIndex}`
            : `t${bp.tier}_${distance}_${stageIndex}`;

        const carPick = bp.cars[Math.min(bp.cars.length - 1, Math.floor((i * bp.cars.length) / 8))];
        const [rawName, title] = rivals[i];
        // Capitalize first letter cleanly
        const name = rawName.charAt(0).toUpperCase() + rawName.slice(1);
        const paintIdx = (i + (distance === 'half' ? 2 : distance === 'mile' ? 4 : 0) + bp.tier) % PAINTS.length;
        const winPurse = Math.round((bp.quarterPurses[i] * distPurseMult) / 25) * 25;
        const lossPurse = Math.max(40, Math.round((winPurse * 0.22) / 5) * 5);
        const [rtStart, rtEnd] = bp.reactionRange;
        const reactionSec = Number((rtStart + ((rtEnd - rtStart) * i) / 7).toFixed(3));

        events.push({
          id,
          name,
          title,
          tier: bp.tier,
          distance,
          stageIndex,
          isBoss,
          carId: carPick.carId,
          carName: carPick.carName,
          chassis: carPick.chassis,
          bodyVariant: carPick.bodyVariant,
          paintColor: PAINTS[paintIdx],
          stripe: STRIPES[i],
          rims: RIMS[i],
          upgrades: { ...STAGE_UPGRADES[i] },
          targetEtSec: ets[i],
          targetTrapMph: traps[i],
          reactionSec,
          winPurse,
          lossPurse,
          challengeNote: buildChallengeNote(distance, stageIndex, bp.tier, isBoss),
        });
      }
    }
  }

  return events;
}

export const TOTAL_CAREER_EVENTS = 120;
export const CAREER_EVENTS: RivalSpec[] = buildCareerEvents();
