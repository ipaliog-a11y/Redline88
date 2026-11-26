import {
  BodyVariant,
  CarUpgrades,
  CarVisuals,
  ChassisStyle,
  RimStyle,
  TimeOfDay,
} from '../types/game';

/**
 * Color helpers for Modern Hi-Bit 16-Bit Cel Shading.
 * Outlines are NEVER pure #000000 black — they are computed as a darker, slightly
 * cool-shifted shade of each material's base color (Golf Story / Diving Club style).
 */
function parseHex(hex: string): [number, number, number] {
  const clean = (hex || '#d93829').replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean.padEnd(6, '0').slice(0, 6);
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex(r: number, g: number, b: number): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return `#${((1 << 24) | (c(r) << 16) | (c(g) << 8) | c(b)).toString(16).slice(1)}`;
}

export function shadeColor(hex: string, factor: number, tint?: [number, number, number]): string {
  const [r, g, b] = parseHex(hex);
  const tr = tint ? tint[0] : 0;
  const tg = tint ? tint[1] : 0;
  const tb = tint ? tint[2] : 0;
  return toHex(r * factor + tr, g * factor + tg, b * factor + tb);
}

/** Rich colored dark outline (darker hue-shifted tint, never flat #000000). */
export function outlineColor(hex: string): string {
  const [r, g, b] = parseHex(hex);
  return toHex(Math.max(18, r * 0.34), Math.max(18, g * 0.3), Math.max(30, b * 0.42 + 8));
}

export function highlightColor(hex: string, tod: TimeOfDay = 'afternoon'): string {
  const [r, g, b] = parseHex(hex);
  if (tod === 'sunset') {
    return toHex(r + (255 - r) * 0.56 + 16, g + (225 - g) * 0.44 + 8, b + (190 - b) * 0.28);
  }
  if (tod === 'night') {
    return toHex(r + (220 - r) * 0.42, g + (242 - g) * 0.48, b + (255 - b) * 0.56);
  }
  return toHex(r + (255 - r) * 0.5, g + (255 - g) * 0.5, b + (245 - b) * 0.42);
}

export function shadowBandColor(hex: string, tod: TimeOfDay = 'afternoon'): string {
  const [r, g, b] = parseHex(hex);
  if (tod === 'sunset') {
    return toHex(r * 0.68 + 10, g * 0.56, b * 0.72 + 12);
  }
  if (tod === 'night') {
    return toHex(r * 0.58, g * 0.62, b * 0.78 + 10);
  }
  return toHex(r * 0.72, g * 0.68, b * 0.78 + 6);
}

/** Integer-snapped pixel rect primitive. */
export function px(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string
): void {
  const ix = Math.round(x);
  const iy = Math.round(y);
  const iw = Math.round(w);
  const ih = Math.round(h);
  if (iw <= 0 || ih <= 0) return;
  ctx.fillStyle = color;
  ctx.fillRect(ix, iy, iw, ih);
}

/** Crisp pixel-art outlined box (1px colored outline + flat fill). */
function pxBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
  outline: string
): void {
  px(ctx, x, y, w, h, outline);
  if (w > 2 && h > 2) {
    px(ctx, x + 1, y + 1, w - 2, h - 2, fill);
  }
}

/** Exact integer scanline pixel circle (zero anti-aliasing, perfectly round at pixel scale). */
export function drawPixelDisc(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  fill: string,
  outline?: string
): void {
  const icx = Math.round(cx);
  const icy = Math.round(cy);
  const ir = Math.max(1, Math.round(r));
  const r2 = (ir + 0.35) * (ir + 0.35);
  const innerR2 = (ir - 0.85) * (ir - 0.85);

  for (let dy = -ir; dy <= ir; dy++) {
    const span = Math.floor(Math.sqrt(Math.max(0, r2 - dy * dy)));
    if (outline) {
      ctx.fillStyle = outline;
      ctx.fillRect(icx - span, icy + dy, span * 2 + 1, 1);
    }
    const innerSpan = Math.floor(Math.sqrt(Math.max(0, innerR2 - dy * dy)));
    if (innerSpan >= 0) {
      ctx.fillStyle = fill;
      ctx.fillRect(icx - innerSpan, icy + dy, innerSpan * 2 + 1, 1);
    }
  }
}

/**
 * Mechanically accurate hi-bit pixel wheel with rotating spokes, beadlocks,
 * white drag slick lettering dashes, and cel-shaded tire sidewall.
 */
function drawHiBitWheel(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  angle: number,
  rimStyle: RimStyle,
  isRearSlick: boolean
): void {
  const icx = Math.round(cx);
  const icy = Math.round(cy);
  const r = Math.max(5, Math.round(radius));
  const tireOutline = '#191f2e';
  const tireDark = '#242b3d';
  const tireMid = '#323c54';
  const rimR = Math.max(3, Math.round(r * (isRearSlick ? 0.54 : 0.62)));

  // Outer rubber tire disc with dark-slate outline
  drawPixelDisc(ctx, icx, icy, r, tireDark, tireOutline);

  // Subtle 2-tone cel highlight crescent on top-left rubber shoulder
  for (let dy = -r + 1; dy <= -Math.floor(r * 0.25); dy++) {
    const span = Math.floor(Math.sqrt(Math.max(0, (r - 1.2) * (r - 1.2) - dy * dy)));
    if (span > 2) {
      px(ctx, icx - span + 1, icy + dy, Math.max(2, Math.floor(span * 0.9)), 1, tireMid);
    }
  }

  // Iconic white sidewall slick lettering dashes (rotates cleanly with wheel!)
  if (isRearSlick && r >= 10) {
    const textR = (r + rimR) * 0.52;
    for (let k = 0; k < 2; k++) {
      const baseA = angle + k * Math.PI;
      for (let d = -2; d <= 2; d++) {
        const a = baseA + d * 0.14;
        px(ctx, icx + Math.cos(a) * textR, icy + Math.sin(a) * textR, 1, 1, '#e8eef7');
      }
    }
  }

  // Rim palette by RimStyle
  const rimOuter =
    rimStyle === 'gold'
      ? '#b37a14'
      : rimStyle === 'prostar'
      ? '#7c8ea8'
      : rimStyle === 'chrome'
      ? '#8ca2bf'
      : '#55637a';
  const rimFill =
    rimStyle === 'gold'
      ? '#f5c242'
      : rimStyle === 'prostar'
      ? '#e2edf8'
      : rimStyle === 'chrome'
      ? '#f2f7ff'
      : '#94a3b8';
  const rimSpec = rimStyle === 'gold' ? '#fff4b8' : '#ffffff';

  // Rim dish + brake rotor interior
  drawPixelDisc(ctx, icx, icy, rimR, '#1f283b', rimOuter);
  // Bright lip ring
  const lipR = rimR - 0.4;
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const col = i >= 10 && i <= 14 ? rimSpec : rimFill;
    px(ctx, icx + Math.cos(a) * lipR, icy + Math.sin(a) * lipR, 1, 1, col);
  }

  // Rotating crisp pixel spokes (5 spokes for prostar/gold/chrome, 4 heavy slots for steel)
  const spokeCount = rimStyle === 'steel' ? 4 : 5;
  for (let s = 0; s < spokeCount; s++) {
    const a = angle + (s / spokeCount) * Math.PI * 2;
    for (let step = 1; step <= rimR - 1; step++) {
      const sx = icx + Math.cos(a) * step;
      const sy = icy + Math.sin(a) * step;
      px(ctx, sx, sy, 1, 1, step === rimR - 1 ? rimSpec : rimFill);
    }
  }

  // Beadlock rivets on pro drag slicks
  if (isRearSlick && rimR >= 5) {
    for (let b = 0; b < 6; b++) {
      const a = angle + (b / 6) * Math.PI * 2;
      px(ctx, icx + Math.cos(a) * (rimR + 0.8), icy + Math.sin(a) * (rimR + 0.8), 1, 1, '#dbeafe');
    }
  }

  // Center lug hub cap
  px(ctx, icx - 1, icy - 1, 3, 3, tireOutline);
  px(ctx, icx, icy, 1, 1, rimStyle === 'gold' ? '#fff4b8' : '#ff5544');
}

export interface HiBitCarMetrics {
  rearAxleX: number;
  frontAxleX: number;
  rearWheelR: number;
  frontWheelR: number;
  minX: number;
  maxX: number;
  exhaustX: number;
  exhaustY: number;
  hasWheelieBar: boolean;
  wheelieCasterX: number;
  chuteX: number;
  chuteY: number;
  shadowHalfW: number;
  shadowCenterX: number;
}

export function getHiBitCarMetrics(
  chassis: ChassisStyle,
  upgrades: CarUpgrades
): HiBitCarMetrics {
  const slickExtra = upgrades.tires >= 3 ? 1 : 0;

  if (chassis === 'hatch') {
    const hasWB = upgrades.chassis >= 4 && upgrades.tires >= 4;
    return {
      rearAxleX: -27,
      frontAxleX: 29,
      rearWheelR: 10 + slickExtra,
      frontWheelR: 10,
      minX: -43,
      maxX: 46,
      exhaustX: -44,
      exhaustY: -7,
      hasWheelieBar: hasWB,
      wheelieCasterX: -62,
      chuteX: -45,
      chuteY: -16,
      shadowHalfW: 45,
      shadowCenterX: 1,
    };
  }
  if (chassis === 'muscle') {
    const hasWB = upgrades.chassis >= 3 || upgrades.tires >= 4;
    return {
      rearAxleX: -34,
      frontAxleX: 35,
      rearWheelR: 12 + slickExtra,
      frontWheelR: 10,
      minX: -54,
      maxX: 56,
      exhaustX: -55,
      exhaustY: -7,
      hasWheelieBar: hasWB,
      wheelieCasterX: -74,
      chuteX: -56,
      chuteY: -18,
      shadowHalfW: 55,
      shadowCenterX: 1,
    };
  }
  if (chassis === 'jdm') {
    const hasWB = upgrades.chassis >= 4;
    return {
      rearAxleX: -33,
      frontAxleX: 34,
      rearWheelR: 11 + slickExtra,
      frontWheelR: 10,
      minX: -52,
      maxX: 55,
      exhaustX: -54,
      exhaustY: -7,
      hasWheelieBar: hasWB,
      wheelieCasterX: -72,
      chuteX: -54,
      chuteY: -17,
      shadowHalfW: 53,
      shadowCenterX: 1,
    };
  }
  if (chassis === 'funny') {
    return {
      rearAxleX: -38,
      frontAxleX: 44,
      rearWheelR: 15,
      frontWheelR: 9,
      minX: -58,
      maxX: 66,
      exhaustX: 12,
      exhaustY: -17,
      hasWheelieBar: true,
      wheelieCasterX: -82,
      chuteX: -61,
      chuteY: -22,
      shadowHalfW: 62,
      shadowCenterX: 3,
    };
  }
  // Top Fuel Dragster — unmistakable ultra-long needle rail!
  return {
    rearAxleX: -48,
    frontAxleX: 62,
    rearWheelR: 16,
    frontWheelR: 7,
    minX: -66,
    maxX: 84,
    exhaustX: -44,
    exhaustY: -24,
    hasWheelieBar: true,
    wheelieCasterX: -94,
    chuteX: -69,
    chuteY: -24,
    shadowHalfW: 74,
    shadowCenterX: 6,
  };
}

export interface DrawHiBitCarParams {
  ctx: CanvasRenderingContext2D;
  /** X position of car's center reference on logical grid */
  x: number;
  /** Ground baseline Y coordinate (tires touch this line!) */
  groundY: number;
  chassis: ChassisStyle;
  bodyVariant?: BodyVariant;
  visuals: CarVisuals;
  upgrades: CarUpgrades;
  wheelAngle: number;
  pitchDeg?: number;
  squatPx?: number;
  exhaustFlame?: number;
  nitrousFlame?: number;
  chuteOpen?: number;
  timeOfDay?: TimeOfDay;
  simTime?: number;
  flipX?: boolean;
  drawShadow?: boolean;
  isReflection?: boolean;
}

/**
 * Draw a crisp 2–3 tone cel-shaded hi-bit 16-bit car in true side profile.
 * Anchor is (x, groundY) where tires rest flush on groundY.
 */
export function drawHiBitCarProfile(p: DrawHiBitCarParams): void {
  const {
    ctx,
    x,
    groundY,
    chassis,
    bodyVariant,
    visuals,
    upgrades,
    wheelAngle,
    pitchDeg = 0,
    squatPx = 0,
    exhaustFlame = 0,
    nitrousFlame = 0,
    chuteOpen = 0,
    timeOfDay = 'afternoon',
    simTime = 0,
    flipX = false,
    drawShadow = true,
    isReflection = false,
  } = p;

  const m = getHiBitCarMetrics(chassis, upgrades);
  const ix = Math.round(x);
  const igy = Math.round(groundY);

  // Small soft oval ground shadow beneath the car (not drawn in reflections)
  if (drawShadow && !isReflection) {
    ctx.save();
    ctx.fillStyle = timeOfDay === 'night' ? 'rgba(6, 10, 22, 0.56)' : 'rgba(14, 20, 36, 0.34)';
    ctx.beginPath();
    ctx.ellipse(
      ix + (flipX ? -m.shadowCenterX : m.shadowCenterX),
      igy + 1,
      m.shadowHalfW,
      3.8,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.restore();
  }

  const paint = visuals.paintColor || '#d93829';
  const paintOut = outlineColor(paint);
  const paintHi = highlightColor(paint, timeOfDay);
  const paintShad = shadowBandColor(paint, timeOfDay);

  const chromeOut = '#384b6e';
  const chromeMid = '#b7c9e2';
  const chromeHi = '#f4f9ff';
  const darkTrim = '#29334a';
  const darkTrimOut = '#192030';
  const glassDark = timeOfDay === 'night' ? '#1e3a5f' : '#2a5582';
  const glassMid = timeOfDay === 'sunset' ? '#6cb2d9' : '#4a8ec2';
  const glassSpec = timeOfDay === 'sunset' ? '#ffebd2' : '#e0f4ff';

  ctx.save();
  ctx.translate(ix, igy);
  if (flipX) ctx.scale(-1, 1);

  // Pivot subtle launch wheelie rotation around rear wheel ground contact patch!
  if (Math.abs(pitchDeg) > 0.15) {
    ctx.translate(m.rearAxleX, 0);
    ctx.rotate((pitchDeg * Math.PI) / 180);
    ctx.translate(-m.rearAxleX, 0);
  }

  const bodyDrop = Math.round(Math.max(0, Math.min(3, squatPx)));

  // --- NIGHT HEADLIGHT BEAM CONE (clean flat translucent wedge, zero bloom blur!) ---
  if (timeOfDay === 'night' && !isReflection && chassis !== 'topfuel') {
    ctx.save();
    ctx.fillStyle = 'rgba(255, 244, 184, 0.14)';
    ctx.beginPath();
    ctx.moveTo(m.maxX, -13 + bodyDrop);
    ctx.lineTo(m.maxX + 95, -26 + bodyDrop);
    ctx.lineTo(m.maxX + 95, 2);
    ctx.lineTo(m.maxX, -9 + bodyDrop);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // --- DEPLOYING TWIN DRAG PARACHUTES (behind tail) ---
  if (chuteOpen > 0.05 && !isReflection) {
    const stretch = Math.round(14 + chuteOpen * 42);
    const canopyW = Math.round(8 + chuteOpen * 16);
    const canopyH = Math.round(8 + chuteOpen * 18);
    const cx = m.chuteX - stretch;
    const cy = m.chuteY - Math.round(chuteOpen * 4) + bodyDrop;
    // Crisp shroud lines
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(m.chuteX, m.chuteY + bodyDrop);
    ctx.lineTo(cx + canopyW, cy - Math.floor(canopyH * 0.45));
    ctx.moveTo(m.chuteX, m.chuteY + bodyDrop);
    ctx.lineTo(cx + canopyW, cy + Math.floor(canopyH * 0.45));
    ctx.stroke();

    // Cel-shaded striped drag chute canopy
    pxBox(ctx, cx, cy - Math.floor(canopyH / 2), canopyW, canopyH, '#ff5938', '#6b1c1c');
    px(ctx, cx + 2, cy - Math.floor(canopyH / 2) + 2, canopyW - 4, Math.max(2, Math.floor(canopyH * 0.3)), '#f8f5ea');
    px(ctx, cx + 2, cy + 1, canopyW - 4, Math.max(2, Math.floor(canopyH * 0.25)), '#facc15');
  }

  // --- WHEELIE BAR (mechanically accurate twin chrome struts + tiny pixel caster wheel!) ---
  if (m.hasWheelieBar) {
    const barEndX = m.wheelieCasterX;
    const casterY = -3;
    const topMountY = chassis === 'topfuel' ? -15 + bodyDrop : -13 + bodyDrop;
    const lowMountY = -6 + bodyDrop;

    // Upper & lower chrome truss tubes (pixel stepped lines)
    const steps = Math.abs(m.minX - barEndX);
    for (let i = 0; i <= steps; i++) {
      const t = i / Math.max(1, steps);
      const bx = Math.round(m.minX - i);
      const uy = Math.round(topMountY + (casterY - topMountY) * t);
      const ly = Math.round(lowMountY + (casterY - lowMountY) * t);
      px(ctx, bx, uy - 1, 1, 3, chromeOut);
      px(ctx, bx, uy, 1, 1, chromeHi);
      px(ctx, bx, ly, 1, 2, chromeOut);
      px(ctx, bx, ly, 1, 1, chromeMid);
    }
    // Cross brace
    const midX = Math.round((m.minX + barEndX) * 0.52);
    px(ctx, midX, -9 + bodyDrop, 2, 6, chromeOut);
    px(ctx, midX, -8 + bodyDrop, 1, 4, chromeHi);

    // Tiny pixel caster wheel at rear tip
    px(ctx, barEndX - 2, casterY - 2, 5, 5, '#1e2638');
    px(ctx, barEndX - 1, casterY - 1, 3, 3, '#f5c242');
    px(ctx, barEndX, casterY, 1, 1, '#fff8d6');
  }

  // --- CHASSIS BODY BY CLASS & VARIANT ---
  if (chassis === 'hatch') {
    const by = bodyDrop;
    // Main lower hull
    pxBox(ctx, -42, -21 + by, 87, 15, paint, paintOut);
    // Sloped nose hood step
    pxBox(ctx, 25, -20 + by, 21, 13, paint, paintOut);
    px(ctx, 25, -19 + by, 19, 11, paint); // seamlessly blend seam
    // Glossy 2-3 tone cel paint bands
    px(ctx, -40, -19 + by, 83, 3, paintHi);
    px(ctx, -40, -10 + by, 83, 3, paintShad);

    // Greenhouse by variant
    if (bodyVariant === 'boxy') {
      pxBox(ctx, -37, -33 + by, 54, 13, paint, paintOut);
      px(ctx, -35, -32 + by, 50, 2, paintHi);
      pxBox(ctx, -33, -30 + by, 45, 9, glassDark, paintOut);
    } else if (bodyVariant === 'notch') {
      pxBox(ctx, -26, -33 + by, 43, 13, paint, paintOut);
      px(ctx, -24, -32 + by, 39, 2, paintHi);
      pxBox(ctx, -22, -30 + by, 34, 9, glassDark, paintOut);
    } else if (bodyVariant === 'wedge') {
      pxBox(ctx, -32, -31 + by, 46, 11, paint, paintOut);
      px(ctx, -30, -30 + by, 42, 2, paintHi);
      pxBox(ctx, -26, -29 + by, 35, 8, glassDark, paintOut);
    } else {
      // Classic 80s hot-hatch silhouette
      pxBox(ctx, -36, -33 + by, 52, 13, paint, paintOut);
      px(ctx, -34, -32 + by, 47, 2, paintHi);
      pxBox(ctx, -31, -30 + by, 42, 9, glassDark, paintOut);
    }

    // Diagonal crisp pixel glass glare + B-pillar
    px(ctx, -18, -29 + by, 5, 7, glassMid);
    px(ctx, -16, -29 + by, 2, 7, glassSpec);
    px(ctx, -2, -29 + by, 6, 7, glassMid);
    px(ctx, 1, -29 + by, 2, 7, glassSpec);
    px(ctx, -6, -31 + by, 3, 10, paintOut);
    px(ctx, -5, -30 + by, 1, 9, paint);

    // Door seam & pixel handle
    px(ctx, -6, -19 + by, 1, 11, paintShad);
    px(ctx, -14, -17 + by, 5, 2, darkTrimOut);
    px(ctx, -13, -17 + by, 3, 1, chromeMid);

    // Bumpers & skirts
    pxBox(ctx, -44, -11 + by, 7, 5, darkTrim, darkTrimOut);
    pxBox(ctx, 41, -11 + by, 6, 5, darkTrim, darkTrimOut);
    px(ctx, -37, -7 + by, 78, 2, darkTrimOut);

    // Headlight & taillight clusters
    pxBox(ctx, 42, -17 + by, 4, 5, timeOfDay === 'night' ? '#fff7b8' : '#fef08a', darkTrimOut);
    pxBox(ctx, -42, -18 + by, 4, 5, '#ff3b30', '#6e1414');
    px(ctx, -41, -17 + by, 2, 2, '#ffb3a7');

    // Chrome exhaust tip
    pxBox(ctx, -46, -9 + by, 4, 3, chromeMid, chromeOut);
    px(ctx, -45, -8 + by, 2, 1, chromeHi);

    // Live Bolt-On Upgrades
    if (upgrades.induction >= 2) {
      // Front-mount intercooler peeking through front air dam
      pxBox(ctx, 40, -10 + by, 5, 4, chromeMid, chromeOut);
      px(ctx, 41, -9 + by, 3, 1, chromeHi);
    }
    if (upgrades.induction >= 4) {
      // Hood turbo scoop / velocity stack
      pxBox(ctx, 20, -25 + by, 12, 5, chromeMid, chromeOut);
      px(ctx, 22, -24 + by, 9, 2, chromeHi);
      px(ctx, 30, -24 + by, 2, 3, '#ff4d3d');
    }
    if (upgrades.chassis >= 2) {
      // Hatch/deck drag spoiler
      pxBox(ctx, -45, -35 + by, 11, 4, paintShad, paintOut);
      px(ctx, -44, -34 + by, 9, 1, paintHi);
    }
    if (upgrades.chassis >= 4) {
      // Parachute pack at tail
      pxBox(ctx, -47, -18 + by, 5, 6, '#3b4a68', '#1c2438');
      px(ctx, -46, -17 + by, 3, 2, '#facc15');
    }

    drawStripes(ctx, visuals.stripe, -40, 42, -18 + by, -13 + by, paintOut);
  } else if (chassis === 'muscle') {
    const by = bodyDrop;
    // Long muscular lower body & proud front nose
    pxBox(ctx, -53, -22 + by, 108, 16, paint, paintOut);
    // Raised rear quarter haunch line
    px(ctx, -51, -23 + by, 32, 3, paint);
    px(ctx, -52, -24 + by, 33, 1, paintOut);
    // 3-tone glossy cel shading
    px(ctx, -51, -20 + by, 104, 3, paintHi);
    px(ctx, -51, -11 + by, 104, 4, paintShad);

    // Greenhouse by variant
    if (bodyVariant === 'fastback') {
      pxBox(ctx, -36, -34 + by, 50, 13, paint, paintOut);
      px(ctx, -32, -33 + by, 44, 2, paintHi);
      pxBox(ctx, -28, -31 + by, 39, 9, glassDark, paintOut);
      // Fastback rear louvers
      for (let lx = -35; lx <= -27; lx += 3) {
        px(ctx, lx, -30 + by, 2, 7, paintOut);
      }
    } else if (bodyVariant === 'boxy') {
      pxBox(ctx, -33, -35 + by, 50, 14, paint, paintOut);
      px(ctx, -31, -34 + by, 46, 2, paintHi);
      pxBox(ctx, -29, -32 + by, 41, 10, glassDark, paintOut);
    } else {
      pxBox(ctx, -30, -34 + by, 47, 13, paint, paintOut);
      px(ctx, -28, -33 + by, 43, 2, paintHi);
      pxBox(ctx, -25, -31 + by, 37, 9, glassDark, paintOut);
    }

    // Crisp diagonal glass highlights + chrome window trim
    px(ctx, -18, -30 + by, 5, 7, glassMid);
    px(ctx, -16, -30 + by, 2, 7, glassSpec);
    px(ctx, 0, -30 + by, 6, 7, glassMid);
    px(ctx, 3, -30 + by, 2, 7, glassSpec);
    px(ctx, -5, -32 + by, 2, 10, chromeMid);

    // Classic bright chrome bumpers!
    pxBox(ctx, -56, -12 + by, 8, 6, chromeMid, chromeOut);
    px(ctx, -55, -11 + by, 6, 2, chromeHi);
    pxBox(ctx, 50, -12 + by, 7, 6, chromeMid, chromeOut);
    px(ctx, 51, -11 + by, 5, 2, chromeHi);

    // Side body trim + door handle
    px(ctx, -48, -14 + by, 98, 1, paintOut);
    px(ctx, -14, -18 + by, 5, 2, chromeOut);
    px(ctx, -13, -18 + by, 3, 1, chromeHi);

    // Headlight & tail lamp
    pxBox(ctx, 51, -19 + by, 4, 5, timeOfDay === 'night' ? '#fff7b8' : '#fef08a', chromeOut);
    pxBox(ctx, -53, -19 + by, 4, 6, '#ff3b30', '#6e1414');
    px(ctx, -52, -18 + by, 2, 2, '#ffb3a7');

    // Chrome exhaust / side-pipe headers
    if (upgrades.engine >= 3) {
      pxBox(ctx, -18, -8 + by, 38, 4, chromeMid, chromeOut);
      px(ctx, -17, -7 + by, 36, 1, chromeHi);
    } else {
      pxBox(ctx, -57, -9 + by, 5, 3, chromeMid, chromeOut);
      px(ctx, -56, -8 + by, 3, 1, chromeHi);
    }

    // Towering Chrome V8 Supercharger Blower on Induction Lv 3+ (cowl hood on Lv 1-2)
    if (upgrades.induction >= 3) {
      pxBox(ctx, 20, -31 + by, 18, 9, chromeMid, chromeOut);
      px(ctx, 22, -30 + by, 14, 2, chromeHi);
      px(ctx, 22, -26 + by, 14, 2, '#64748b'); // belt ribs
      // Iconic red 3-barrel injector scoop!
      pxBox(ctx, 22, -37 + by, 19, 6, '#ff4d3d', '#6e1717');
      px(ctx, 24, -36 + by, 15, 2, '#ff9d94');
      px(ctx, 39, -35 + by, 2, 3, '#1e293b'); // butterflies
    } else if (upgrades.induction >= 1) {
      pxBox(ctx, 20, -25 + by, 18, 4, paintShad, paintOut);
      px(ctx, 22, -24 + by, 14, 1, paintHi);
    }

    // Drag Rear Wing & Parachute Pack
    if (upgrades.chassis >= 2) {
      pxBox(ctx, -58, -28 + by, 14, 5, paintShad, paintOut);
      px(ctx, -57, -27 + by, 12, 1, paintHi);
    }
    if (upgrades.chassis >= 3 || upgrades.tires >= 4) {
      pxBox(ctx, -59, -20 + by, 6, 7, '#3b4a68', '#1c2438');
      px(ctx, -58, -19 + by, 4, 2, '#facc15');
    }

    drawStripes(ctx, visuals.stripe, -51, 51, -19 + by, -14 + by, paintOut);
  } else if (chassis === 'jdm') {
    const by = bodyDrop;
    // Low-slung aero tuner body
    pxBox(ctx, -51, -20 + by, 104, 14, paint, paintOut);
    // Tapered front nose & carbon aero splitter
    pxBox(ctx, 32, -18 + by, 22, 11, paint, paintOut);
    px(ctx, 31, -17 + by, 21, 9, paint);
    pxBox(ctx, 38, -8 + by, 19, 3, darkTrim, darkTrimOut);
    pxBox(ctx, -53, -9 + by, 9, 4, darkTrim, darkTrimOut); // rear diffuser

    // Glossy 3-tone cel bands
    px(ctx, -49, -18 + by, 99, 3, paintHi);
    px(ctx, -49, -10 + by, 99, 3, paintShad);

    // Greenhouse by variant
    if (bodyVariant === 'wedge') {
      pxBox(ctx, -31, -29 + by, 49, 10, paint, paintOut);
      px(ctx, -28, -28 + by, 43, 2, paintHi);
      pxBox(ctx, -24, -27 + by, 37, 7, glassDark, paintOut);
    } else {
      pxBox(ctx, -32, -31 + by, 50, 12, paint, paintOut);
      px(ctx, -29, -30 + by, 44, 2, paintHi);
      pxBox(ctx, -27, -29 + by, 40, 8, glassDark, paintOut);
    }

    // Glass glare
    px(ctx, -16, -28 + by, 5, 6, glassMid);
    px(ctx, -14, -28 + by, 2, 6, glassSpec);
    px(ctx, 2, -28 + by, 6, 6, glassMid);
    px(ctx, 4, -28 + by, 2, 6, glassSpec);
    px(ctx, -4, -30 + by, 2, 9, paintOut);

    // Intercooler mouth & headlights/taillights
    pxBox(ctx, 48, -12 + by, 6, 4, chromeMid, chromeOut);
    px(ctx, 49, -11 + by, 4, 1, chromeHi);
    pxBox(ctx, 49, -16 + by, 5, 3, timeOfDay === 'night' ? '#fff7b8' : '#e0f2fe', darkTrimOut);
    pxBox(ctx, -51, -17 + by, 4, 5, '#ff3b30', '#6e1414');
    px(ctx, -50, -16 + by, 2, 2, '#ffb3a7');

    // Titanium cannon exhaust
    pxBox(ctx, -56, -9 + by, 6, 4, chromeMid, chromeOut);
    px(ctx, -55, -8 + by, 4, 1, '#7dd3fc'); // titanium heat-blue tip

    // Carbon GT Wing (always iconic on JDM drag builds lv1+)
    if (upgrades.chassis >= 1) {
      px(ctx, -46, -29 + by, 3, 9, darkTrimOut);
      pxBox(ctx, -56, -32 + by, 16, 4, darkTrim, darkTrimOut);
      px(ctx, -55, -31 + by, 14, 1, '#94a3b8');
    }
    // Hood vents / big turbo intake on induction lv3+
    if (upgrades.induction >= 3) {
      pxBox(ctx, 24, -22 + by, 14, 4, darkTrim, darkTrimOut);
      px(ctx, 26, -21 + by, 10, 1, chromeHi);
    }
    if (upgrades.chassis >= 4) {
      pxBox(ctx, -56, -18 + by, 5, 6, '#3b4a68', '#1c2438');
      px(ctx, -55, -17 + by, 3, 2, '#38bdf8');
    }

    drawStripes(ctx, visuals.stripe, -49, 49, -17 + by, -12 + by, paintOut);
  } else if (chassis === 'funny') {
    const by = bodyDrop;
    // Sweeping aerodynamic Nitro Funny Car wedge shell
    pxBox(ctx, -57, -23 + by, 114, 17, paint, paintOut);
    // Sleek sloped wedge nose
    pxBox(ctx, 36, -19 + by, 29, 13, paint, paintOut);
    px(ctx, 34, -18 + by, 28, 11, paint);
    pxBox(ctx, 56, -14 + by, 11, 8, paint, paintOut);
    px(ctx, 54, -13 + by, 11, 6, paint);
    // Low carbon front splitter
    px(ctx, 50, -7 + by, 18, 2, darkTrimOut);

    // Glossy cel bands across long sweeping hood
    px(ctx, -55, -21 + by, 92, 3, paintHi);
    px(ctx, 36, -17 + by, 26, 2, paintHi);
    px(ctx, -55, -10 + by, 118, 3, paintShad);

    // Rear-set bubble cockpit canopy
    pxBox(ctx, -37, -33 + by, 38, 11, paint, paintOut);
    px(ctx, -34, -32 + by, 32, 2, paintHi);
    pxBox(ctx, -28, -30 + by, 26, 8, glassDark, paintOut);
    px(ctx, -18, -29 + by, 5, 6, glassMid);
    px(ctx, -16, -29 + by, 2, 6, glassSpec);

    // Giant rear spill-plate drag wing
    pxBox(ctx, -62, -31 + by, 17, 10, paintShad, paintOut);
    px(ctx, -61, -30 + by, 15, 2, paintHi);
    px(ctx, -60, -25 + by, 12, 2, '#facc15'); // sponsor stripe on endplate

    // Towering chrome Nitro V8 supercharger & triple-barrel scoop through hood!
    pxBox(ctx, 8, -32 + by, 19, 10, chromeMid, chromeOut);
    px(ctx, 10, -31 + by, 15, 2, chromeHi);
    px(ctx, 11, -27 + by, 13, 2, '#475569');
    pxBox(ctx, 10, -38 + by, 20, 6, '#ff4d3d', '#6e1717');
    px(ctx, 12, -37 + by, 16, 2, '#ffb3a7');
    px(ctx, 28, -36 + by, 2, 3, '#1e293b');

    // Upswept chrome Zoomie Exhaust Headers along side rocker!
    for (let z = 0; z < 4; z++) {
      const zx = 6 + z * 5;
      pxBox(ctx, zx, -16 + by, 4, 6, chromeMid, chromeOut);
      px(ctx, zx + 1, -15 + by, 1, 4, chromeHi);
    }

    // Dual Parachute Packs bolted to tail
    pxBox(ctx, -63, -22 + by, 7, 9, '#334155', '#182032');
    px(ctx, -62, -21 + by, 5, 3, '#facc15');
    px(ctx, -62, -16 + by, 5, 2, '#ef4444');

    drawStripes(ctx, visuals.stripe, -54, 58, -18 + by, -13 + by, paintOut);
  } else {
    // TOP FUEL DRAGSTER — Ultra-long slender needle rail chassis!
    const by = bodyDrop;

    // Tapered slender nose needle fuselage (from rear axle all the way to +84px!)
    pxBox(ctx, -61, -20 + by, 76, 12, paint, paintOut);
    pxBox(ctx, 12, -17 + by, 44, 9, paint, paintOut);
    px(ctx, 10, -16 + by, 44, 7, paint);
    pxBox(ctx, 52, -14 + by, 33, 6, paint, paintOut);
    px(ctx, 50, -13 + by, 33, 4, paint);

    // Glossy cel bands along entire needle fuselage
    px(ctx, -58, -18 + by, 71, 2, paintHi);
    px(ctx, 13, -15 + by, 41, 2, paintHi);
    px(ctx, 53, -13 + by, 30, 1, paintHi);
    px(ctx, -58, -11 + by, 138, 2, paintShad);

    // Front Downforce Canard Wing mounted right over tiny front runner wheel
    pxBox(ctx, 58, -19 + by, 14, 5, paintShad, paintOut);
    px(ctx, 59, -18 + by, 12, 1, paintHi);
    px(ctx, 64, -14 + by, 2, 4, chromeOut);

    // Driver Roll-Cage / Fighter Canopy Cockpit ahead of rear axle
    pxBox(ctx, -33, -29 + by, 26, 10, glassDark, chromeOut);
    px(ctx, -31, -28 + by, 22, 2, chromeHi); // titanium roll cage halo
    px(ctx, -23, -26 + by, 5, 6, glassMid);
    px(ctx, -21, -26 + by, 2, 6, glassSpec);
    // Helmet silhouette visible inside cockpit!
    px(ctx, -27, -26 + by, 6, 5, '#f8f5ea');
    px(ctx, -23, -25 + by, 3, 2, '#38bdf8');

    // Exposed 11,000 HP Nitromethane Hemi + Supercharger behind driver
    pxBox(ctx, -56, -32 + by, 21, 13, chromeMid, chromeOut);
    px(ctx, -54, -31 + by, 17, 2, chromeHi);
    px(ctx, -54, -26 + by, 17, 2, '#475569');
    // Injector hat scoop
    pxBox(ctx, -54, -37 + by, 18, 5, '#ff4d3d', '#6e1717');
    px(ctx, -52, -36 + by, 14, 2, '#ffb3a7');

    // Upswept Nitro Zoomie Exhaust Pipes
    for (let z = 0; z < 4; z++) {
      const zx = -55 + z * 5;
      pxBox(ctx, zx, -25 + by, 4, 6, chromeMid, chromeOut);
      px(ctx, zx + 1, -24 + by, 1, 4, chromeHi);
    }

    // Towering Dual-Element Top Fuel Rear Wing on tall twin chrome struts!
    px(ctx, -64, -44 + by, 4, 25, chromeOut);
    px(ctx, -63, -43 + by, 2, 23, chromeHi);
    pxBox(ctx, -73, -52 + by, 22, 11, paint, paintOut);
    px(ctx, -71, -50 + by, 18, 2, paintHi);
    px(ctx, -71, -45 + by, 18, 2, '#facc15'); // wing endplate racing band

    // Dual Parachute Packs under wing strut
    pxBox(ctx, -71, -25 + by, 8, 9, '#334155', '#182032');
    px(ctx, -70, -24 + by, 6, 3, '#facc15');
    px(ctx, -70, -19 + by, 6, 2, '#ef4444');

    drawStripes(ctx, visuals.stripe, -55, 76, -16 + by, -12 + by, paintOut);
  }

  // --- WHEEL WELL ARCH CUTOUTS (clean dark shadow tuck behind tires) ---
  if (chassis !== 'topfuel') {
    drawPixelDisc(ctx, m.rearAxleX, -m.rearWheelR + bodyDrop, m.rearWheelR + 2, '#141926');
    drawPixelDisc(ctx, m.frontAxleX, -m.frontWheelR + bodyDrop, m.frontWheelR + 2, '#141926');
  }

  // --- EXACT 2 SIDE-PROFILE WHEELS (mechanically accurate sizes, resting flush on groundY!) ---
  drawHiBitWheel(
    ctx,
    m.rearAxleX,
    -m.rearWheelR,
    m.rearWheelR,
    wheelAngle,
    visuals.rims,
    chassis === 'funny' || chassis === 'topfuel' || upgrades.tires >= 3
  );
  drawHiBitWheel(
    ctx,
    m.frontAxleX,
    -m.frontWheelR,
    m.frontWheelR,
    wheelAngle * (m.rearWheelR / m.frontWheelR),
    visuals.rims,
    false
  );

  // --- CRISP PIXEL EXHAUST FLAMES (on shifts / full-throttle nitro) ---
  if (exhaustFlame > 0.08 && !isReflection) {
    const fLen = Math.round(8 + exhaustFlame * (chassis === 'topfuel' ? 28 : 18) + Math.sin(simTime * 55) * 3);
    const fx = m.exhaustX;
    const fy = m.exhaustY + bodyDrop;
    if (chassis === 'topfuel' || chassis === 'funny') {
      // Iconic angled upward nitro header flames!
      for (let i = 0; i < fLen; i += 2) {
        const t = i / Math.max(1, fLen);
        const w = Math.max(2, Math.round((1 - t * 0.7) * 8));
        const col = t < 0.35 ? '#ffffff' : t < 0.7 ? '#facc15' : '#ff5938';
        px(ctx, fx - Math.round(i * 0.75) - Math.floor(w / 2), fy - i, w, 3, col);
      }
    } else {
      // Horizontal shift backfire flame jet
      px(ctx, fx - fLen, fy - 2, fLen, 5, '#ff5938');
      px(ctx, fx - Math.round(fLen * 0.72), fy - 1, Math.round(fLen * 0.72), 3, '#facc15');
      px(ctx, fx - Math.round(fLen * 0.38), fy, Math.round(fLen * 0.38), 1, '#ffffff');
    }
  }

  // --- CRISP CYAN NITROUS JET FLAME ---
  if (nitrousFlame > 0.08 && !isReflection) {
    const nLen = Math.round(14 + nitrousFlame * 26 + Math.cos(simTime * 60) * 3);
    const nx = m.minX - 2;
    const ny = -9 + bodyDrop;
    px(ctx, nx - nLen, ny - 3, nLen, 6, '#0284c7');
    px(ctx, nx - Math.round(nLen * 0.7), ny - 2, Math.round(nLen * 0.7), 4, '#38bdf8');
    px(ctx, nx - Math.round(nLen * 0.4), ny - 1, Math.round(nLen * 0.4), 2, '#ffffff');
  }

  // --- SUBTLE PIXEL HEAT SHIMMER BEHIND EXHAUST ---
  if (!isReflection && (exhaustFlame > 0.05 || simTime > 0)) {
    const shX = m.minX - 6;
    const shY = m.exhaustY + bodyDrop;
    ctx.fillStyle = 'rgba(255, 248, 220, 0.16)';
    for (let s = 0; s < 3; s++) {
      const wave = Math.round(Math.sin(simTime * 16 + s * 2.1) * 2);
      px(ctx, shX - 6 - s * 7, shY - 3 + s * 2 + wave, 6, 1, 'rgba(255, 248, 220, 0.18)');
    }
  }

  ctx.restore();
}

/** Crisp pixel racing stripe/decal overlay along side body. */
function drawStripes(
  ctx: CanvasRenderingContext2D,
  stripe: CarVisuals['stripe'],
  x0: number,
  x1: number,
  yTop: number,
  yBot: number,
  outCol: string
): void {
  if (stripe === 'none') return;
  const w = Math.max(4, x1 - x0);
  if (stripe === 'twin') {
    px(ctx, x0, yTop, w, 2, '#f8fafc');
    px(ctx, x0, yTop + 3, w, 2, '#f8fafc');
  } else if (stripe === 'flash') {
    px(ctx, x0 + 4, yTop + 1, w - 8, 2, '#facc15');
    px(ctx, x0 + Math.floor(w * 0.35), yTop - 1, Math.floor(w * 0.45), 2, '#f8fafc');
  } else if (stripe === 'checkered') {
    const startX = x0;
    const endX = x0 + Math.min(28, Math.floor(w * 0.36));
    for (let cx = startX; cx < endX; cx += 3) {
      const alt = ((cx - startX) / 3) % 2 === 0;
      px(ctx, cx, yTop, 3, 3, alt ? '#f8fafc' : outCol);
      px(ctx, cx, yTop + 3, 3, 3, alt ? outCol : '#f8fafc');
    }
  } else if (stripe === 'flames') {
    const startX = x1 - Math.min(44, Math.floor(w * 0.55));
    for (let fx = startX; fx < x1; fx += 3) {
      const t = (fx - startX) / Math.max(1, x1 - startX);
      const col = t > 0.65 ? '#fef08a' : t > 0.3 ? '#facc15' : '#ff6b2b';
      const h = Math.max(2, Math.round(2 + t * (yBot - yTop + 2)));
      const jig = ((fx / 3) % 2 === 0) ? 0 : 1;
      px(ctx, fx, yTop + jig, 3, h, col);
    }
  }
}

/**
 * Crisp 2D Front & Rear Mechanical Elevations for the 4-Angle Hi-Bit Showroom Turntable.
 */
function drawHiBitCarEndView(
  ctx: CanvasRenderingContext2D,
  cx: number,
  groundY: number,
  view: 'FRONT' | 'REAR',
  chassis: ChassisStyle,
  visuals: CarVisuals,
  upgrades: CarUpgrades
): void {
  const icx = Math.round(cx);
  const igy = Math.round(groundY);
  const paint = visuals.paintColor || '#d93829';
  const paintOut = outlineColor(paint);
  const paintHi = highlightColor(paint, 'afternoon');
  const paintShad = shadowBandColor(paint, 'afternoon');
  const chromeOut = '#384b6e';
  const chromeMid = '#b7c9e2';
  const chromeHi = '#f4f9ff';

  const isTopFuel = chassis === 'topfuel';
  const isFunny = chassis === 'funny';
  const halfW = isTopFuel ? (view === 'REAR' ? 28 : 16) : isFunny ? 28 : chassis === 'hatch' ? 24 : 27;
  const tireW =
    view === 'REAR' && (isTopFuel || isFunny || upgrades.tires >= 3)
      ? isTopFuel
        ? 13
        : 11
      : isTopFuel && view === 'FRONT'
      ? 4
      : 7;
  const tireH = view === 'REAR' && (isTopFuel || isFunny) ? 20 : 14;

  // Soft oval shadow
  ctx.save();
  ctx.fillStyle = 'rgba(12, 18, 34, 0.38)';
  ctx.beginPath();
  ctx.ellipse(icx, igy + 1, halfW + 4, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Left & right tires planted symmetrically on groundY
  pxBox(ctx, icx - halfW, igy - tireH, tireW, tireH, '#252c3f', '#141926');
  pxBox(ctx, icx + halfW - tireW, igy - tireH, tireW, tireH, '#252c3f', '#141926');
  px(ctx, icx - halfW + 2, igy - tireH + 2, Math.max(1, tireW - 4), 2, '#3a4663');
  px(ctx, icx + halfW - tireW + 2, igy - tireH + 2, Math.max(1, tireW - 4), 2, '#3a4663');

  if (isTopFuel) {
    // Slender Top Fuel needle fuselage + wide towering rear wing!
    const bodyHalf = view === 'REAR' ? 12 : 7;
    pxBox(ctx, icx - bodyHalf, igy - 24, bodyHalf * 2, 16, paint, paintOut);
    px(ctx, icx - bodyHalf + 2, igy - 22, bodyHalf * 2 - 4, 3, paintHi);

    // Tall Rear Wing always visible in both Front & Rear elevations!
    px(ctx, icx - 10, igy - 46, 3, 24, chromeOut);
    px(ctx, icx + 7, igy - 46, 3, 24, chromeOut);
    pxBox(ctx, icx - 32, igy - 52, 64, 9, paint, paintOut);
    px(ctx, icx - 30, igy - 50, 60, 2, paintHi);
    px(ctx, icx - 30, igy - 46, 60, 2, '#facc15');

    if (view === 'FRONT') {
      // Wide front downforce canard wing
      pxBox(ctx, icx - 24, igy - 17, 48, 5, paintShad, paintOut);
      px(ctx, icx - 22, igy - 16, 44, 1, paintHi);
      // Exposed supercharger peeking behind canopy
      pxBox(ctx, icx - 7, igy - 34, 14, 10, chromeMid, chromeOut);
      pxBox(ctx, icx - 6, igy - 38, 12, 4, '#ff4d3d', '#6e1717');
    } else {
      // Dual rear parachute packs + wheelie bar caster!
      pxBox(ctx, icx - 9, igy - 26, 8, 9, '#334155', '#182032');
      pxBox(ctx, icx + 1, igy - 26, 8, 9, '#334155', '#182032');
      px(ctx, icx - 8, igy - 24, 6, 2, '#facc15');
      px(ctx, icx + 2, igy - 24, 6, 2, '#facc15');
      pxBox(ctx, icx - 8, igy - 12, 16, 4, chromeMid, chromeOut);
    }
    return;
  }

  // Standard / Muscle / JDM / Funny Car Front or Rear elevation
  const bodyH = isFunny ? 16 : 18;
  const cabHalf = Math.round(halfW * 0.72);
  const cabH = isFunny ? 10 : 12;

  // Lower body box
  pxBox(ctx, icx - halfW + 2, igy - bodyH - 5, (halfW - 2) * 2, bodyH, paint, paintOut);
  px(ctx, icx - halfW + 4, igy - bodyH - 3, (halfW - 4) * 2, 3, paintHi);
  px(ctx, icx - halfW + 4, igy - 9, (halfW - 4) * 2, 3, paintShad);

  // Twin racing stripes centered on front/rear hood/trunk
  if (visuals.stripe === 'twin') {
    px(ctx, icx - 5, igy - bodyH - 4, 4, bodyH - 2, '#f8fafc');
    px(ctx, icx + 1, igy - bodyH - 4, 4, bodyH - 2, '#f8fafc');
  }

  // Greenhouse / windshield / rear glass
  pxBox(ctx, icx - cabHalf, igy - bodyH - cabH - 4, cabHalf * 2, cabH + 1, paint, paintOut);
  px(ctx, icx - cabHalf + 2, igy - bodyH - cabH - 3, cabHalf * 2 - 4, 2, paintHi);
  pxBox(ctx, icx - cabHalf + 3, igy - bodyH - cabH - 1, (cabHalf - 3) * 2, cabH - 3, '#2a5582', paintOut);
  px(ctx, icx - cabHalf + 6, igy - bodyH - cabH, 5, cabH - 5, '#7cc9f7');
  px(ctx, icx - cabHalf + 8, igy - bodyH - cabH, 2, cabH - 5, '#e0f4ff');

  // Towering Blower if Funny Car or high Induction
  if (isFunny || (chassis === 'muscle' && upgrades.induction >= 3)) {
    pxBox(ctx, icx - 8, igy - bodyH - 15, 16, 10, chromeMid, chromeOut);
    px(ctx, icx - 6, igy - bodyH - 14, 12, 2, chromeHi);
    pxBox(ctx, icx - 7, igy - bodyH - 20, 14, 5, '#ff4d3d', '#6e1717');
    px(ctx, icx - 5, igy - bodyH - 18, 2, 2, '#1e293b');
    px(ctx, icx - 1, igy - bodyH - 18, 2, 2, '#1e293b');
    px(ctx, icx + 3, igy - bodyH - 18, 2, 2, '#1e293b');
  }

  // Rear wing visible if equipped
  if (isFunny || upgrades.chassis >= 2) {
    pxBox(ctx, icx - halfW - 1, igy - bodyH - cabH - 7, (halfW + 1) * 2, 4, paintShad, paintOut);
    px(ctx, icx - halfW + 1, igy - bodyH - cabH - 6, (halfW - 1) * 2, 1, paintHi);
  }

  if (view === 'FRONT') {
    // Grille + Intercooler + Headlights
    pxBox(ctx, icx - halfW + 5, igy - 17, (halfW - 5) * 2, 7, '#1b2234', chromeOut);
    if (upgrades.induction >= 2) {
      pxBox(ctx, icx - 10, igy - 12, 20, 5, chromeMid, chromeOut);
      px(ctx, icx - 8, igy - 11, 16, 1, chromeHi);
    }
    pxBox(ctx, icx - halfW + 5, igy - 17, 7, 5, '#fef08a', chromeOut);
    pxBox(ctx, icx + halfW - 12, igy - 17, 7, 5, '#fef08a', chromeOut);
    px(ctx, icx - halfW + 7, igy - 16, 3, 2, '#ffffff');
    px(ctx, icx + halfW - 10, igy - 16, 3, 2, '#ffffff');
  } else {
    // Taillights + Dual Exhausts + Parachute Pack
    pxBox(ctx, icx - halfW + 5, igy - 18, 10, 5, '#ff3b30', '#6e1414');
    pxBox(ctx, icx + halfW - 15, igy - 18, 10, 5, '#ff3b30', '#6e1414');
    px(ctx, icx - halfW + 7, igy - 17, 4, 2, '#ffb3a7');
    px(ctx, icx + halfW - 13, igy - 17, 4, 2, '#ffb3a7');
    // License plate / rear panel
    pxBox(ctx, icx - 6, igy - 17, 12, 6, '#facc15', '#523c09');
    // Twin chrome exhaust tips
    pxBox(ctx, icx - 15, igy - 9, 5, 4, chromeMid, chromeOut);
    pxBox(ctx, icx + 10, igy - 9, 5, 4, chromeMid, chromeOut);
    if (isFunny || upgrades.chassis >= 3) {
      pxBox(ctx, icx - 5, igy - 19, 10, 7, '#334155', '#182032');
      px(ctx, icx - 4, igy - 18, 8, 2, '#facc15');
    }
  }
}

export type ShowroomAngle = 'SIDE R' | 'FRONT' | 'SIDE L' | 'REAR';

export function getHiBitShowroomAngleLabel(angleRad: number): ShowroomAngle {
  const norm = ((angleRad % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  const idx = Math.round(norm / (Math.PI / 2)) % 4;
  return (['SIDE R', 'FRONT', 'SIDE L', 'REAR'] as const)[idx];
}

/**
 * Hi-Bit 2D Garage Pit Bay (320×160 logical pixels):
 * Clean indie workshop with sunny bay skylight, red mechanic tool chest,
 * stacked spare slicks, spinning dyno rollers, and crisp wet-floor pixel reflection!
 */
export function drawHiBitPitBay(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  chassis: ChassisStyle,
  visuals: CarVisuals,
  upgrades: CarUpgrades,
  timeSec: number,
  bodyVariant?: BodyVariant
): void {
  ctx.imageSmoothingEnabled = false;

  // Smooth warm workshop wall gradient
  const wallGrad = ctx.createLinearGradient(0, 0, 0, h * 0.72);
  wallGrad.addColorStop(0, '#21304f');
  wallGrad.addColorStop(1, '#2b3e63');
  ctx.fillStyle = wallGrad;
  ctx.fillRect(0, 0, w, h);

  // Sunny clerestory workshop windows (bright Golf Story indie cheer!)
  for (let wx = 18; wx < w - 30; wx += 74) {
    pxBox(ctx, wx, 12, 54, 24, '#7cd4ff', '#162138');
    px(ctx, wx + 2, 14, 50, 8, '#c7efff');
    px(ctx, wx + 26, 13, 2, 22, '#162138');
  }

  // Cheerful coral & gold motorsport workshop wall stripe
  const floorY = Math.round(h * 0.72);
  px(ctx, 0, floorY - 22, w, 5, '#ff4d3d');
  px(ctx, 0, floorY - 17, w, 3, '#f5b82e');
  px(ctx, 0, floorY - 14, w, 14, '#1b263d');

  // Red Mechanic Rolling Tool Chest (back-left)
  pxBox(ctx, 14, floorY - 34, 42, 34, '#d93829', '#521515');
  px(ctx, 16, floorY - 32, 38, 3, '#ff7d6b');
  for (let d = 0; d < 4; d++) {
    const dy = floorY - 26 + d * 7;
    px(ctx, 18, dy, 34, 5, '#b5281c');
    px(ctx, 28, dy + 1, 14, 2, '#e2edf8');
  }

  // Stacked Spare Drag Slicks (back-right)
  for (let s = 0; s < 3; s++) {
    const sy = floorY - 10 - s * 9;
    pxBox(ctx, w - 52 + (s % 2), sy, 34, 9, '#252d40', '#131826');
    px(ctx, w - 48 + (s % 2), sy + 2, 12, 2, '#475569');
  }

  // Concrete Dyno Floor + Yellow Safety Line
  px(ctx, 0, floorY, w, h - floorY, '#2b3448');
  px(ctx, 0, floorY, w, 2, '#161c2b');
  px(ctx, 0, floorY + 2, w, 2, '#3d4963');
  px(ctx, 0, h - 10, w, 4, '#f5b82e');

  // Wet/polished dyno floor patch with subtle sheen
  px(ctx, Math.round(w * 0.14), floorY + 5, Math.round(w * 0.72), h - floorY - 18, '#232c40');
  px(ctx, Math.round(w * 0.18), floorY + 7, Math.round(w * 0.64), 2, '#3c4d6e');

  const carCenterX = Math.round(w * 0.5);
  const carGroundY = floorY + 14;
  const m = getHiBitCarMetrics(chassis, upgrades);
  const scale = chassis === 'topfuel' ? 1.55 : chassis === 'funny' ? 1.75 : 1.95;

  // Spinning steel dyno rollers recessed under rear tire!
  const rearScreenX = Math.round(carCenterX + m.rearAxleX * scale);
  pxBox(ctx, rearScreenX - 18, carGroundY - 3, 36, 7, '#64748b', '#1c2438');
  const rollShift = Math.floor(timeSec * 24) % 6;
  for (let rx = -14 + rollShift; rx < 15; rx += 6) {
    px(ctx, rearScreenX + rx, carGroundY - 2, 2, 5, '#e2edf8');
  }

  // Crisp Wet-Floor Inverted Pixel Reflection beneath car!
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, carGroundY, w, h - carGroundY - 10);
  ctx.clip();
  ctx.globalAlpha = 0.24;
  ctx.translate(carCenterX, carGroundY + 2);
  ctx.scale(scale, -scale * 0.55);
  drawHiBitCarProfile({
    ctx,
    x: 0,
    groundY: 0,
    chassis,
    bodyVariant,
    visuals,
    upgrades,
    wheelAngle: timeSec * 7.5,
    timeOfDay: 'afternoon',
    drawShadow: false,
    isReflection: true,
  });
  ctx.restore();

  // Main Crisp Hi-Bit Car on Pit Bay
  ctx.save();
  ctx.translate(carCenterX, carGroundY);
  ctx.scale(scale, scale);
  drawHiBitCarProfile({
    ctx,
    x: 0,
    groundY: 0,
    chassis,
    bodyVariant,
    visuals,
    upgrades,
    wheelAngle: timeSec * 7.5,
    exhaustFlame: Math.sin(timeSec * 5.2) > 0.88 ? 0.3 : 0,
    timeOfDay: 'afternoon',
    simTime: timeSec,
  });
  ctx.restore();
}

/**
 * 4-Angle Illuminated Hi-Bit Showroom Turntable (340×180 logical pixels):
 * Rotates cleanly across SIDE R -> FRONT -> SIDE L -> REAR with wet-floor reflections!
 */
export function drawHiBitShowroomTurntable(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  chassis: ChassisStyle,
  visuals: CarVisuals,
  upgrades: CarUpgrades,
  angleRad: number,
  timeSec: number,
  bodyVariant?: BodyVariant
): void {
  ctx.imageSmoothingEnabled = false;

  // Smooth modern indie showroom backdrop gradient
  const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
  bgGrad.addColorStop(0, '#162038');
  bgGrad.addColorStop(0.65, '#223154');
  bgGrad.addColorStop(1, '#141a2b');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  // Crisp studio ceiling light cones (clean flat translucent trapezoids, zero blur)
  ctx.fillStyle = 'rgba(255, 245, 200, 0.08)';
  ctx.beginPath();
  ctx.moveTo(w * 0.25, 0);
  ctx.lineTo(w * 0.42, 0);
  ctx.lineTo(w * 0.56, h * 0.78);
  ctx.lineTo(w * 0.14, h * 0.78);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(w * 0.58, 0);
  ctx.lineTo(w * 0.75, 0);
  ctx.lineTo(w * 0.86, h * 0.78);
  ctx.lineTo(w * 0.44, h * 0.78);
  ctx.closePath();
  ctx.fill();

  // Showroom horizon trim
  const padY = Math.round(h * 0.74);
  px(ctx, 0, padY - 10, w, 2, '#3b4e78');
  px(ctx, 0, padY - 8, w, h - padY + 8, '#172033');

  // Illuminated Pixel Turntable Drum Pad
  const cx = Math.round(w * 0.5);
  const padRx = Math.round(w * 0.41);
  const padRy = 18;

  // Turntable drum side rim
  ctx.fillStyle = '#0e1320';
  ctx.beginPath();
  ctx.ellipse(cx, padY + 6, padRx + 2, padRy + 2, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#293859';
  ctx.beginPath();
  ctx.ellipse(cx, padY + 4, padRx, padRy, 0, 0, Math.PI * 2);
  ctx.fill();

  // Bright gold outer turntable ring
  ctx.fillStyle = '#f5b82e';
  ctx.beginPath();
  ctx.ellipse(cx, padY, padRx, padRy, 0, 0, Math.PI * 2);
  ctx.fill();

  // Inner polished dark turntable top surface
  ctx.fillStyle = '#1d2740';
  ctx.beginPath();
  ctx.ellipse(cx, padY, padRx - 4, padRy - 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Rotating turntable degree tick marks around rim!
  for (let i = 0; i < 12; i++) {
    const a = angleRad + (i / 12) * Math.PI * 2;
    const tx = cx + Math.cos(a) * (padRx - 8);
    const ty = padY + Math.sin(a) * (padRy - 5);
    px(ctx, tx - 1, ty, 3, 1, i % 3 === 0 ? '#facc15' : '#4f6594');
  }

  const label = getHiBitShowroomAngleLabel(angleRad);
  const carGroundY = padY + 2;
  const sideScale = chassis === 'topfuel' ? 1.62 : chassis === 'funny' ? 1.82 : 2.05;
  const endScale = 2.05;

  if (label === 'SIDE R' || label === 'SIDE L') {
    const flipX = label === 'SIDE L';
    // Wet glossy floor reflection on turntable
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, padY, padRx - 5, padRy - 3, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.globalAlpha = 0.24;
    ctx.translate(cx, carGroundY + 1);
    ctx.scale(sideScale, -sideScale * 0.45);
    drawHiBitCarProfile({
      ctx,
      x: 0,
      groundY: 0,
      chassis,
      bodyVariant,
      visuals,
      upgrades,
      wheelAngle: 0,
      flipX,
      drawShadow: false,
      isReflection: true,
    });
    ctx.restore();

    ctx.save();
    ctx.translate(cx, carGroundY);
    ctx.scale(sideScale, sideScale);
    drawHiBitCarProfile({
      ctx,
      x: 0,
      groundY: 0,
      chassis,
      bodyVariant,
      visuals,
      upgrades,
      wheelAngle: 0,
      flipX,
      simTime: timeSec,
      timeOfDay: 'afternoon',
    });
    ctx.restore();
  } else {
    // Crisp Front or Rear Mechanical Elevation
    ctx.save();
    ctx.translate(cx, carGroundY);
    ctx.scale(endScale, endScale);
    drawHiBitCarEndView(ctx, 0, 0, label, chassis, visuals, upgrades);
    ctx.restore();
  }
}
