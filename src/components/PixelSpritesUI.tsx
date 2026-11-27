import React from 'react';
import { RivalSpec, UpgradeKey } from '../types/game';

/**
 * Crisp 16x16 / 12x12 pixel-grid SVG renderer with shapeRendering="crispEdges"
 * so every sprite looks authentically 8-bit / 16-bit at any screen resolution.
 */
function renderPixelMatrix(
  rows: string[],
  palette: Record<string, string>,
  className?: string,
  ariaLabel?: string
) {
  const h = rows.length;
  const w = rows[0]?.length ?? 16;
  const rects: React.ReactNode[] = [];
  for (let y = 0; y < h; y++) {
    const row = rows[y];
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      const color = palette[ch];
      if (!color) {
        x++;
        continue;
      }
      // Run-length merge horizontal adjacent same-color pixels for ultra-light DOM
      let run = 1;
      while (x + run < row.length && row[x + run] === ch) {
        run++;
      }
      rects.push(<rect key={`${x}-${y}`} x={x} y={y} width={run} height={1} fill={color} />);
      x += run;
    }
  }

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      shapeRendering="crispEdges"
      className={`pixel-sprite shrink-0 ${className ?? 'w-5 h-5'}`}
      role={ariaLabel ? 'img' : undefined}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
    >
      {rects}
    </svg>
  );
}

export type PixelIconName =
  | 'flag'
  | 'wrench'
  | 'gears'
  | 'paint'
  | 'car'
  | 'trophy'
  | 'coin'
  | 'crt'
  | 'soundOn'
  | 'soundOff'
  | 'play'
  | 'pause'
  | 'restart'
  | 'film'
  | 'lock'
  | 'bolt'
  | 'login'
  | 'logout'
  | 'rotate'
  | 'check'
  | 'chevronRight';

const ICON_MATRICES: Record<
  PixelIconName,
  { rows: string[]; palette: Record<string, string> }
> = {
  flag: {
    rows: [
      '..KK........',
      '..KWWKKWWKK.',
      '..KWWKKWWKK.',
      '..KKKWWKKWW.',
      '..KKKWWKKWW.',
      '..KWWKKWWKK.',
      '..KWWKKWWKK.',
      '..KR........',
      '..KR........',
      '..KR........',
      '.KKRK.......',
      '.KKKK.......',
    ],
    palette: { K: '#090d1a', W: '#f7f3e3', R: '#facc15' },
  },
  wrench: {
    rows: [
      '.......KKK..',
      '......KSSSK.',
      '.....KSSK.K.',
      '.....KSSK...',
      '....KSSSKK..',
      '...KSSSK....',
      '..KSSSK.....',
      '.KSSSK......',
      'KSSSK.......',
      'KSKSK.......',
      'KSSK........',
      '.KK.........',
    ],
    palette: { K: '#090d1a', S: '#cbd5e1' },
  },
  gears: {
    rows: [
      '....KK......',
      '..KKGGKK....',
      '.KGGGGGGK...',
      '.KGGKKGGK...',
      'KGGK..KGGK..',
      'KGGK..KGGK..',
      '.KGGKKGGK...',
      '.KGGGGGGKKK.',
      '..KKGGKCCCK.',
      '....KKKCKCK.',
      '......KCCCK.',
      '.......KKK..',
    ],
    palette: { K: '#090d1a', G: '#facc15', C: '#38bdf8' },
  },
  paint: {
    rows: [
      '....KKKK....',
      '...KSSSSK...',
      '..KRRRRRRK..',
      '..KRRRRRRK..',
      '..KSSRRSSK..',
      '..KSSRRSSK..',
      '..KSSRRSSK..',
      '..KSSRRSSK..',
      '..KSSSSSSK..',
      '..KSSSSSSK..',
      '...KKKKKK...',
      '.....RR.....',
    ],
    palette: { K: '#090d1a', S: '#cbd5e1', R: '#ef3b2d' },
  },
  car: {
    rows: [
      '............',
      '............',
      '....KKKK....',
      '...KCCCCK...',
      '..KRRRRRRK..',
      '.KRRRRRRRRK.',
      'KRRRRRRRRYYK',
      'KRRRRRRRRRRK',
      '.KWWKKKKWWK.',
      '.KWSK..KWSK.',
      '..KK....KK..',
      '............',
    ],
    palette: { K: '#090d1a', R: '#ef3b2d', C: '#38bdf8', Y: '#facc15', W: '#334155', S: '#e2e8f0' },
  },
  trophy: {
    rows: [
      '..KKKKKKKK..',
      '.KGGGGGGGGK.',
      'KGGGYGGYGGGK',
      'KGKGGGGGGKGK',
      '.KKGGGGGGKK.',
      '..KGGGGGGK..',
      '...KGGGGK...',
      '....KGGK....',
      '....KGGK....',
      '..KKGGGGKK..',
      '.KBBBBBBBBK.',
      '.KKKKKKKKKK.',
    ],
    palette: { K: '#090d1a', G: '#facc15', Y: '#fef9c3', B: '#b45309' },
  },
  coin: {
    rows: [
      '...KKKKKK...',
      '..KGGGGGGK..',
      '.KGGYYYYGGK.',
      'KGGYGGGGYGGK',
      'KGGYGGGGGGGK',
      'KGGYYYYYYGGK',
      'KGGGGGGGYGGK',
      'KGGYGGGGYGGK',
      '.KGGYYYYGGK.',
      '..KGGGGGGK..',
      '...KKKKKK...',
      '............',
    ],
    palette: { K: '#090d1a', G: '#22c55e', Y: '#fef08a' },
  },
  crt: {
    rows: [
      '.KKKKKKKKKK.',
      'KSSSSSSSSSSK',
      'KSCCCCCCCCSK',
      'KSCBBBBBBCSK',
      'KSCCCCCCCCSK',
      'KSCBBBBBBCSK',
      'KSCCCCCCCCSK',
      'KSSSSSSRRSSK',
      'KSSSSSSSSSSK',
      '.KKKKKKKKKK.',
      '...KSSSSK...',
      '..KKKKKKKK..',
    ],
    palette: { K: '#090d1a', S: '#64748b', C: '#38bdf8', B: '#0ea5e9', R: '#22c55e' },
  },
  soundOn: {
    rows: [
      '............',
      '.....KK..C..',
      '....KSSK..C.',
      '..KKSSSK.C.C',
      '.KSSSSSK.C.C',
      '.KSSSSSK.C.C',
      '.KSSSSSK.C.C',
      '..KKSSSK.C.C',
      '....KSSK..C.',
      '.....KK..C..',
      '............',
      '............',
    ],
    palette: { K: '#090d1a', S: '#f7f3e3', C: '#facc15' },
  },
  soundOff: {
    rows: [
      '............',
      '.....KK.....',
      '....KSSK.R.R',
      '..KKSSSK..R.',
      '.KSSSSSK.R.R',
      '.KSSSSSK....',
      '.KSSSSSK....',
      '..KKSSSK....',
      '....KSSK....',
      '.....KK.....',
      '............',
      '............',
    ],
    palette: { K: '#090d1a', S: '#94a3b8', R: '#ef3b2d' },
  },
  play: {
    rows: [
      '..KK........',
      '..KWWK......',
      '..KWWWK.....',
      '..KWWWWK....',
      '..KWWWWWK...',
      '..KWWWWWWK..',
      '..KWWWWWK...',
      '..KWWWWK....',
      '..KWWWK.....',
      '..KWWK......',
      '..KK........',
      '............',
    ],
    palette: { K: '#090d1a', W: 'currentColor' },
  },
  pause: {
    rows: [
      '............',
      '..KKK..KKK..',
      '..KWWK.KWWK.',
      '..KWWK.KWWK.',
      '..KWWK.KWWK.',
      '..KWWK.KWWK.',
      '..KWWK.KWWK.',
      '..KWWK.KWWK.',
      '..KWWK.KWWK.',
      '..KWWK.KWWK.',
      '..KKK..KKK..',
      '............',
    ],
    palette: { K: '#090d1a', W: 'currentColor' },
  },
  restart: {
    rows: [
      '....KKKK....',
      '..KKWWWWKK..',
      '.KWWKKKKWWK.',
      'KWWK....KWWK',
      'KWWK........',
      'KWWK...KKKK.',
      'KWWK....KWWK',
      '.KWWKKKKWWK.',
      '..KKWWWWKK..',
      '....KKKK....',
      '............',
      '............',
    ],
    palette: { K: '#090d1a', W: 'currentColor' },
  },
  film: {
    rows: [
      '.KKKKKKKKKK.',
      'KWWKWWWWKWWK',
      'KKKKWWWWKKKK',
      'KWWKWWWWKWWK',
      'KKKKWWWWKKKK',
      'KWWKGGGGKWWK',
      'KKKKGGGGKKKK',
      'KWWKWWWWKWWK',
      'KKKKWWWWKKKK',
      'KWWKWWWWKWWK',
      '.KKKKKKKKKK.',
      '............',
    ],
    palette: { K: '#090d1a', W: '#e2e8f0', G: '#facc15' },
  },
  lock: {
    rows: [
      '....KKKK....',
      '...KSSSSK...',
      '..KSK..KSK..',
      '..KSK..KSK..',
      '.KKKKKKKKKK.',
      '.KGGGGGGGGK.',
      '.KGGGKKGGGK.',
      '.KGGGKKGGGK.',
      '.KGGGKKGGGK.',
      '.KGGGGGGGGK.',
      '.KKKKKKKKKK.',
      '............',
    ],
    palette: { K: '#090d1a', S: '#cbd5e1', G: '#facc15' },
  },
  bolt: {
    rows: [
      '......KKK...',
      '.....KYYK...',
      '....KYYK....',
      '...KYYK.....',
      '..KYYYYYYK..',
      '..KYYYYYYK..',
      '.....KYYK...',
      '....KYYK....',
      '...KYYK.....',
      '..KYYK......',
      '..KKK.......',
      '............',
    ],
    palette: { K: '#090d1a', Y: '#facc15' },
  },
  login: {
    rows: [
      '.....KKKKKK.',
      '.....KSSSSK.',
      '..KK.KS..SK.',
      '..KGGKS..SK.',
      'KKGGGKS..SK.',
      'KGGGGKS..SK.',
      'KKGGGKS..SK.',
      '..KGGKS..SK.',
      '..KK.KS..SK.',
      '.....KSSSSK.',
      '.....KKKKKK.',
      '............',
    ],
    palette: { K: '#090d1a', S: '#cbd5e1', G: '#facc15' },
  },
  logout: {
    rows: [
      '.KKKKKK.....',
      '.KSSSSK.....',
      '.KS..SK.KK..',
      '.KS..SKGGK..',
      '.KS..SKGGGKK',
      '.KS..SKGGGGK',
      '.KS..SKGGGKK',
      '.KS..SKGGK..',
      '.KS..SK.KK..',
      '.KSSSSK.....',
      '.KKKKKK.....',
      '............',
    ],
    palette: { K: '#090d1a', S: '#cbd5e1', G: '#ef3b2d' },
  },
  rotate: {
    rows: [
      '....KKKK....',
      '..KKCCCCKK..',
      '.KCCKKKKCCK.',
      'KCCK...KCCCK',
      'KCCK....KKKK',
      'KCCK........',
      'KCCK....KCCK',
      '.KCCKKKKCCK.',
      '..KKCCCCKK..',
      '....KKKK....',
      '............',
      '............',
    ],
    palette: { K: '#090d1a', C: '#38bdf8' },
  },
  check: {
    rows: [
      '............',
      '.........KK.',
      '........KGGK',
      '.......KGGK.',
      '.KK...KGGK..',
      'KGGK.KGGK...',
      '.KGGKGGK....',
      '..KGGGK.....',
      '...KGGK.....',
      '....KK......',
      '............',
      '............',
    ],
    palette: { K: '#090d1a', G: '#22c55e' },
  },
  chevronRight: {
    rows: [
      '............',
      '...KK.......',
      '...KWWK.....',
      '....KWWK....',
      '.....KWWK...',
      '......KWWK..',
      '.....KWWK...',
      '....KWWK....',
      '...KWWK.....',
      '...KK.......',
      '............',
      '............',
    ],
    palette: { K: '#090d1a', W: 'currentColor' },
  },
};

export const PixelIcon: React.FC<{
  name: PixelIconName;
  className?: string;
}> = ({ name, className = 'w-4 h-4' }) => {
  const def = ICON_MATRICES[name];
  return renderPixelMatrix(def.rows, def.palette, className);
};

/**
 * Custom 16x16 16-Bit Pixel-Art Sprites for all 6 Parts Shop Upgrade Categories
 */
const PART_MATRICES: Record<
  UpgradeKey,
  { rows: string[]; palette: Record<string, string>; label: string }
> = {
  engine: {
    label: 'V8 Engine Block',
    rows: [
      '................',
      '..KKKK....KKKK..',
      '.KRRRRK..KRRRRK.',
      '.KRWWK....KWWRK.',
      '..KSSKKKKKKSSK..',
      '..KSSGGGGGGSSK..',
      '.KSSGGSSSSGGSSK.',
      '.KSSGGSSSSGGSSK.',
      '.KDDGGDDDDGGDDK.',
      '..KDDDDDDDDDDK..',
      '..KDDYYDDYYDDK..',
      '...KDDDDDDDDK...',
      '...KSSSSSSSSK...',
      '....KKKKKKKK....',
      '................',
      '................',
    ],
    palette: {
      K: '#090d1a',
      R: '#ef3b2d',
      W: '#fecaca',
      S: '#cbd5e1',
      G: '#facc15',
      D: '#475569',
      Y: '#f97316',
    },
  },
  induction: {
    label: 'Supercharger & Turbo',
    rows: [
      '................',
      '....KKKKKKKK....',
      '...KRRRRRRRRK...',
      '..KRWWKRRKWWK...',
      '..KRRRRRRRRRK...',
      '...KKKKKKKKKK...',
      '..KSSSSSSSSSSK..',
      '.KSSWWSSSSWWSSK.',
      '.KSSDDDDDDDDSSK.',
      '.KSSWWSSSSWWSSK.',
      '..KSSSSSSSSSSK..',
      '...KDDCCCCDDK...',
      '...KDDCCCCDDK...',
      '....KKKKKKKK....',
      '................',
      '................',
    ],
    palette: {
      K: '#090d1a',
      R: '#ef3b2d',
      W: '#ffffff',
      S: '#cbd5e1',
      D: '#475569',
      C: '#38bdf8',
    },
  },
  transmission: {
    label: 'Drag Gearbox',
    rows: [
      '................',
      '......KKKK......',
      '.....KRRRRK.....',
      '.....KRWWRK.....',
      '......KSSK......',
      '......KSSK......',
      '....KKKSSKKK....',
      '..KKGGGGGGGGKK..',
      '.KGGSSKGGKSSGGK.',
      '.KGGSSKGGKSSGGK.',
      '.KGGDDDDDDDDGGK.',
      '..KKGGDDDDGGKK..',
      '....KDDDDDDK....',
      '.....KKKKKK.....',
      '................',
      '................',
    ],
    palette: {
      K: '#090d1a',
      R: '#ef3b2d',
      W: '#fef08a',
      S: '#e2e8f0',
      G: '#facc15',
      D: '#64748b',
    },
  },
  tires: {
    label: 'Wrinkle-Wall Drag Slicks',
    rows: [
      '................',
      '....KKKKKKKK....',
      '..KKDDDDDDDDKK..',
      '.KDDTTDDDDTTDDK.',
      '.KDTDDDDDDDDTDK.',
      'KDDTKKGGGGKKTDDK',
      'KDDKGGWWWWGGKDDK',
      'KDDKGWKKKKWGKDDK',
      'KDDKGWKKKKWGKDDK',
      'KDDKGGWWWWGGKDDK',
      'KDDTKKGGGGKKTDDK',
      '.KDTDDDDDDDDTDK.',
      '.KDDTTDDDDTTDDK.',
      '..KKDDDDDDDDKK..',
      '....KKKKKKKK....',
      '................',
    ],
    palette: {
      K: '#090d1a',
      D: '#1e293b',
      T: '#475569',
      G: '#facc15',
      W: '#f8fafc',
    },
  },
  chassis: {
    label: 'Tube Chassis & Aero',
    rows: [
      '................',
      '.............KK.',
      '............KRRK',
      '...........KRRK.',
      '....KKKKKKKKRRK.',
      '...KCCCCCCCCK...',
      '..KCCWWWWWWCCK..',
      '.KCCKKKKKKKKCCK.',
      'KCCCCCCCCCCCCCCK',
      'KCCDDCCCCCCDDCCK',
      '.KKDDKKKKKKDDKK.',
      '....KDDDDDDK....',
      '.....KKKKKK.....',
      '................',
      '................',
      '................',
    ],
    palette: {
      K: '#090d1a',
      R: '#ef3b2d',
      C: '#38bdf8',
      W: '#e0f2fe',
      D: '#334155',
    },
  },
  nitrous: {
    label: 'Nitrous Oxide Bottle',
    rows: [
      '................',
      '......KKKK......',
      '.....KRRRRK.....',
      '......KSSK......',
      '....KKSSSSKK....',
      '...KCCCCCCCCK...',
      '...KCCWWWWCCK...',
      '...KCCBBBBCCK...',
      '...KCCWWWWCCK...',
      '...KCCYYYYCCK...',
      '...KCCBBBBCCK...',
      '...KCCBBBBCCK...',
      '...KCCCCCCCCK...',
      '....KKKKKKKK....',
      '................',
      '................',
    ],
    palette: {
      K: '#090d1a',
      R: '#ef3b2d',
      S: '#cbd5e1',
      C: '#38bdf8',
      B: '#0284c7',
      W: '#ffffff',
      Y: '#facc15',
    },
  },
};

export const PixelPartSprite: React.FC<{
  partKey: UpgradeKey;
  className?: string;
}> = ({ partKey, className = 'w-11 h-11' }) => {
  const def = PART_MATRICES[partKey];
  return renderPixelMatrix(def.rows, def.palette, className, def.label);
};

/**
 * Deterministic 24×24 SNK / Neo-Geo Hi-Res Pixel Rival Portrait generated from each rival's ID, tier, and paint color.
 * Tiers 1–2: Multi-tone shaded street racers with caps, bandanas, aviator shades, and collared racing jackets.
 * Tiers 3–5: Full-face aerodynamic racing helmets, reflective chrome/gold/cyan visors, fire suits, and boss crown emblem.
 */
function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

const SKIN_RAMPS: [string, string, string][] = [
  ['#ffe0c4', '#f2b88f', '#c98863'],
  ['#f7cba2', '#e09f70', '#b37146'],
  ['#e3a97a', '#c48152', '#915732'],
  ['#b57b4e', '#8f5932', '#63391d'],
  ['#fce0b8', '#e6b87c', '#ba894d'],
];

const HAIR_RAMPS: [string, string][] = [
  ['#383345', '#1b1824'],
  ['#80512d', '#4f2f16'],
  ['#f09c2b', '#b56312'],
  ['#cfd6e0', '#7e8899'],
  ['#d93829', '#8a1c14'],
  ['#f7c948', '#bf8a15'],
];

const BG_BY_TIER: Record<number, [string, string]> = {
  1: ['#2c3d59', '#3f577a'],
  2: ['#523214', '#7a4b1c'],
  3: ['#194238', '#266354'],
  4: ['#143b5c', '#1e5c8a'],
  5: ['#54161a', '#8c2229'],
};

export const PixelRivalPortrait: React.FC<{
  rival: RivalSpec;
  className?: string;
}> = ({ rival, className = 'w-16 h-16' }) => {
  const seed = hashString(rival.id + rival.name);
  const [skinHi, skinMid, skinShad] = SKIN_RAMPS[seed % SKIN_RAMPS.length];
  const [hairHi, hairDark] = HAIR_RAMPS[(seed >> 3) % HAIR_RAMPS.length];
  const [bgA, bgB] = BG_BY_TIER[rival.tier] ?? BG_BY_TIER[1];
  const suit = rival.paintColor;
  const accent = rival.isBoss ? '#f7b519' : '#19d4e6';
  const hasHelmet = rival.tier >= 3 || rival.isBoss;
  const hasCap = !hasHelmet && (seed % 3 === 0);
  const hasShades = !hasHelmet && ((seed >> 1) & 1) === 0;
  const hasBandana = !hasHelmet && !hasCap && ((seed >> 2) & 1) === 0;

  const palette: Record<string, string> = {
    '.': bgA,
    ':': bgB,
    K: '#141218',
    L: skinHi,
    S: skinMid,
    D: skinShad,
    H: hairHi,
    h: hairDark,
    J: suit,
    A: accent,
    C: '#f7b519',
    c: '#b57b0e',
    W: '#f8fafc',
    V: rival.isBoss ? '#f7b519' : '#19d4e6',
    v: rival.isBoss ? '#996908' : '#0b6d80',
    G: '#201e26',
    M: '#b8c0cc',
  };

  let rows: string[];
  if (hasHelmet) {
    rows = [
      rival.isBoss ? '......KC..KC..KC........' : '....::::::::::::::::....',
      rival.isBoss ? '......KCCCKCCCKC........' : '..::::::::::::::::::::..',
      '......KKKKKKKKKKKK......',
      '....KKJJJJJJJJJJJJKK....',
      '...KJJJWWWWWWWWWWJJJK...',
      '..KJJJWJJJJJJJJJJWJJJK..',
      '..KJJJJKKKKKKKKKKJJJJK..',
      '..KJJJKVVVVVVVVVVKJJJK..',
      '..KJJJKVVWWWWVVvvKJJJK..',
      '..KJJJKVVVVVVvvvvKJJJK..',
      '..KJJJKvvvvvvvvvvKJJJK..',
      '..KJJJKKKKKKKKKKKKJJJK..',
      '...KJJJJJGGGGGGJJJJJK...',
      '...KJJJJJGMGGMGJJJJJK...',
      '....KKJJJJJJJJJJJJKK....',
      '......KKGGGGGGGGKK......',
      '....KKJJJJAAAAJJJJKK....',
      '...KJJJJJAAWWAAJJJJJK...',
      '..KJJJJJJAAAAAAJJJJJJK..',
      '..KJJJJAJJAAAAJJAJJJJK..',
      '.KJJJJJAJJJAAJJJAJJJJJK.',
      '.KJJJJJAJJJAAJJJAJJJJJK.',
      'KJJJJJJAJJJAAJJJAJJJJJJK',
      'KJJJJJJAJJJAAJJJAJJJJJJK',
    ];
  } else {
    rows = [
      '....::::::::::::::::....',
      hasCap ? '......KKKKKKKKKKKK......' : '......KKKKKKKKKKKK......',
      hasCap ? '....KKCCCCCCCCCCCCKK....' : '....KKHHHHHhhHHHHHKK....',
      hasCap ? '...KCCWWWWCCCCCCCCCCK...' : '...KHHHHHHhhhhHHHHHHK...',
      hasCap ? '...KCCCCCCCCCCCCCCCCK...' : hasBandana ? '...KAAAAAAAAAAAAAAAAK...' : '...KHHhhHHHHHHHHhhHHK...',
      hasCap ? '..KKccccccccccccccccKK..' : hasBandana ? '..KAAWWWWAAAAAAAAAAAAK..' : '..KHHhKKKKKKKKKKKKhHHK..',
      '....KHLLLLLLLLLLLLDK....',
      '....KHLSSSSSSSSSSSDK....',
      '....KHLSKKSSSKKSSSDK....',
      hasShades ? '...KSSKKKKKKKKKKKKSSK...' : '....KSSKWKSSSKWKSSDK....',
      hasShades ? '...KSSKGGMKGGKGGMKSSK...' : '....KSSKWKSSSKWKSSDK....',
      hasShades ? '...KSSKKKKKKKKKKKKSSK...' : '....KSSSSSSDDSSSSSDK....',
      '....KSSSSSSDDSSSSSDK....',
      '....KSSSSSKKKKSSSSDK....',
      '.....KSSSDDDDDDSSDK.....',
      '......KKDDDDDDDDKK......',
      '.......KKSSDDSSKK.......',
      '....KKJJJKKSSKKJJJKK....',
      '...KJJJJJAAWWAAJJJJJK...',
      '..KJJJJJAAAWWAAAJJJJJK..',
      '..KJJJJAJJJAAJJJAJJJJK..',
      '.KJJJJJAJJJAAJJJAJJJJJK.',
      'KJJJJJJAJJJAAJJJAJJJJJJK',
      'KJJJJJJAJJJAAJJJAJJJJJJK',
    ];
  }

  const normalized = rows.map((r) => (r.length >= 24 ? r.slice(0, 24) : r.padEnd(24, '.')));

  return (
    <div
      className={`relative border-2 border-[#141218] bg-[#141218] overflow-hidden shrink-0 shadow-[2px_2px_0_#07060a] ${className}`}
    >
      {renderPixelMatrix(normalized, palette, 'w-full h-full block', `${rival.name} portrait`)}
      {rival.isBoss && (
        <div className="pointer-events-none absolute bottom-0 inset-x-0 bg-[#141218]/92 border-t border-[#f7b519] text-center font-pixel text-[6px] text-[#f7b519] py-0.5 leading-none">
          ★ BOSS
        </div>
      )}
    </div>
  );
};
