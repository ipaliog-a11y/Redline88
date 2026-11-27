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

type Pt = readonly [number, number];

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

/** Exact integer Bresenham crisp 1px pixel line (zero anti-aliasing). */
function drawPixelLine(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color: string
): void {
  let ix0 = Math.round(x0);
  let iy0 = Math.round(y0);
  const ix1 = Math.round(x1);
  const iy1 = Math.round(y1);
  const dx = Math.abs(ix1 - ix0);
  const dy = Math.abs(iy1 - iy0);
  const sx = ix0 < ix1 ? 1 : -1;
  const sy = iy0 < iy1 ? 1 : -1;
  let err = dx - dy;
  ctx.fillStyle = color;
  while (true) {
    ctx.fillRect(ix0, iy0, 1, 1);
    if (ix0 === ix1 && iy0 === iy1) break;
    const e2 = err * 2;
    if (e2 > -dy) {
      err -= dy;
      ix0 += sx;
    }
    if (e2 < dx) {
      err += dx;
      iy0 += sy;
    }
  }
}

interface PolyScanRow {
  y: number;
  x0: number;
  x1: number;
}

/**
 * Exact integer scanline rasterizer for arbitrary polygons (zero anti-aliasing).
 * Produces clean stepped hi-bit slopes for windshields, fastbacks, noses, and fenders.
 */
function computePolySpans(pts: readonly Pt[]): PolyScanRow[] {
  if (pts.length < 3) return [];
  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < pts.length; i++) {
    const py = pts[i][1];
    if (py < minY) minY = py;
    if (py > maxY) maxY = py;
  }
  const yStart = Math.floor(minY);
  const yEnd = Math.ceil(maxY);
  const rows: PolyScanRow[] = [];

  for (let y = yStart; y <= yEnd; y++) {
    const sy = y + 0.5;
    const xs: number[] = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      if ((a[1] <= sy && b[1] > sy) || (b[1] <= sy && a[1] > sy)) {
        const t = (sy - a[1]) / (b[1] - a[1]);
        xs.push(a[0] + t * (b[0] - a[0]));
      }
    }
    if (xs.length < 2) continue;
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const x0 = Math.round(xs[k]);
      const x1 = Math.round(xs[k + 1]);
      if (x1 >= x0) {
        rows.push({ y, x0, x1 });
      }
    }
  }
  return rows;
}

/** Fill a crisp integer-rasterized polygon. */
function fillPixelPoly(ctx: CanvasRenderingContext2D, pts: readonly Pt[], color: string): void {
  const spans = computePolySpans(pts);
  ctx.fillStyle = color;
  for (let i = 0; i < spans.length; i++) {
    const r = spans[i];
    ctx.fillRect(r.x0, r.y, r.x1 - r.x0 + 1, 1);
  }
}

/** Stroke a polygon's perimeter with crisp 1px Bresenham pixel lines. */
function strokePixelPoly(ctx: CanvasRenderingContext2D, pts: readonly Pt[], color: string): void {
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    drawPixelLine(ctx, a[0], a[1], b[0], b[1], color);
  }
}

/** Draw a sculpted crisp pixel polygon with fill + darker-hue 1px pixel outline. */
function drawSculptedPoly(
  ctx: CanvasRenderingContext2D,
  pts: readonly Pt[],
  fill: string,
  outline: string
): void {
  fillPixelPoly(ctx, pts, fill);
  strokePixelPoly(ctx, pts, outline);
}

/**
 * Draw a sculpted painted automotive body shell with authentic 3-tone hi-bit cel shading:
 * - Flat base paint across the sculpted silhouette
 * - Crisp top contour glossy highlight band following the sloped hood/roof/haunch
 * - Mid-body waist reflection crease
 * - Lower rocker/tumblehome shadow band
 * - Optional livery stripes clipped strictly inside the sculpted silhouette
 * - Clean 1px darker-hue outline (never pure black)
 */
function drawPaintedBodyShell(
  ctx: CanvasRenderingContext2D,
  pts: readonly Pt[],
  paint: string,
  paintHi: string,
  paintShad: string,
  paintOut: string,
  opts: {
    beltY: number;
    lowerShadY: number;
    stripe?: CarVisuals['stripe'];
    stripeStartX?: number;
    stripeEndX?: number;
    mirrorY?: number;
    skipOutline?: boolean;
  }
): void {
  const spans = computePolySpans(pts);
  if (spans.length === 0) return;

  // Build column top-edge map so glossy specular highlight hugs curved hoods & rooflines!
  let minX = Infinity;
  let maxX = -Infinity;
  for (let i = 0; i < spans.length; i++) {
    if (spans[i].x0 < minX) minX = spans[i].x0;
    if (spans[i].x1 > maxX) maxX = spans[i].x1;
  }
  const width = maxX - minX + 1;
  const colTopY = new Int16Array(width);
  colTopY.fill(32000);
  for (let i = 0; i < spans.length; i++) {
    const r = spans[i];
    for (let x = r.x0; x <= r.x1; x++) {
      const idx = x - minX;
      if (r.y < colTopY[idx]) colTopY[idx] = r.y;
    }
  }

  // 1. Base paint fill
  ctx.fillStyle = paint;
  for (let i = 0; i < spans.length; i++) {
    const r = spans[i];
    ctx.fillRect(r.x0, r.y, r.x1 - r.x0 + 1, 1);
  }

  // 2. Lower tumblehome shadow band (below lowerShadY)
  ctx.fillStyle = paintShad;
  for (let i = 0; i < spans.length; i++) {
    const r = spans[i];
    if (r.y >= opts.lowerShadY) {
      ctx.fillRect(r.x0, r.y, r.x1 - r.x0 + 1, 1);
    }
  }

  // 3. Glossy upper-contour cel highlight band (1–2px beneath sloped top edge)
  ctx.fillStyle = paintHi;
  for (let i = 0; i < spans.length; i++) {
    const r = spans[i];
    for (let x = r.x0; x <= r.x1; x++) {
      const top = colTopY[x - minX];
      if (r.y === top + 1 || (r.y === top + 2 && r.y <= opts.beltY + 1)) {
        ctx.fillRect(x, r.y, 1, 1);
      }
    }
  }

  // 4. Crisp shoulder/waistline specular crease (gives real metallic curved door feel!)
  const creaseY = Math.round(opts.beltY + 3);
  for (let i = 0; i < spans.length; i++) {
    const r = spans[i];
    if (r.y === creaseY) {
      const sx = r.x0 + 4;
      const ex = r.x1 - 4;
      if (ex > sx) {
        ctx.fillStyle = paintHi;
        ctx.fillRect(sx, creaseY, ex - sx, 1);
        ctx.fillStyle = paintShad;
        ctx.fillRect(sx + 1, creaseY + 1, ex - sx - 1, 1);
      }
    }
  }

  // 5. Clipped livery stripes cleanly inside body spans
  const stripe = opts.stripe ?? 'none';
  if (stripe !== 'none') {
    const sx0 = opts.stripeStartX ?? minX + 4;
    const sx1 = opts.stripeEndX ?? maxX - 4;
    const yMid = Math.round((opts.beltY + opts.lowerShadY) * 0.5) + 1;

    for (let i = 0; i < spans.length; i++) {
      const r = spans[i];
      const cx0 = Math.max(r.x0 + 1, sx0);
      const cx1 = Math.min(r.x1 - 1, sx1);
      if (cx1 < cx0) continue;

      if (stripe === 'twin') {
        if (r.y === yMid - 1 || r.y === yMid + 1) {
          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(cx0, r.y, cx1 - cx0 + 1, 1);
        }
      } else if (stripe === 'flash') {
        if (r.y >= yMid - 2 && r.y <= yMid + 1) {
          const shift = (yMid - r.y) * 3;
          const fx0 = Math.max(r.x0 + 2, sx0 + 4 + shift);
          const fx1 = Math.min(r.x1 - 2, sx1 - 3 + shift);
          if (fx1 > fx0) {
            ctx.fillStyle = r.y === yMid - 2 ? '#fef08a' : '#facc15';
            ctx.fillRect(fx0, r.y, fx1 - fx0 + 1, 1);
          }
        }
      } else if (stripe === 'checkered') {
        const tailMaxX = Math.min(r.x1 - 1, minX + 20);
        if (r.y >= opts.beltY + 1 && r.y <= opts.lowerShadY + 1 && tailMaxX > r.x0 + 2) {
          for (let x = r.x0 + 2; x <= tailMaxX; x += 2) {
            const cell = ((x - minX) >> 1) + ((r.y - opts.beltY) >> 1);
            ctx.fillStyle = cell % 2 === 0 ? '#f8fafc' : '#1e293b';
            ctx.fillRect(x, r.y, Math.min(2, tailMaxX - x + 1), 1);
          }
        }
      } else if (stripe === 'flames') {
        if (r.y >= opts.beltY + 1 && r.y <= opts.lowerShadY + 1) {
          const flameStart = Math.max(r.x0 + 2, maxX - 30);
          const wave = Math.round(Math.sin((r.y - opts.beltY) * 1.45) * 4);
          const fx0 = Math.max(r.x0 + 2, flameStart + wave);
          const fx1 = r.x1 - 2;
          if (fx1 > fx0) {
            ctx.fillStyle = '#ff6b1a';
            ctx.fillRect(fx0, r.y, fx1 - fx0 + 1, 1);
            const innerX0 = Math.min(fx1, fx0 + 6);
            if (fx1 > innerX0) {
              ctx.fillStyle = '#fde047';
              ctx.fillRect(innerX0, r.y, fx1 - innerX0 + 1, 1);
            }
          }
        }
      }
    }
  }

  // 6. Crisp darker-hue outline around the entire sculpted silhouette
  if (!opts.skipOutline) {
    strokePixelPoly(ctx, pts, paintOut);
  }
}

/** Draw a tight, factory-proportioned curved wheel-arch cutout + subtle fender lip flare hugging a wheel. */
function drawWheelArchCutout(
  ctx: CanvasRenderingContext2D,
  ax: number,
  ay: number,
  wheelR: number,
  paintHi: string,
  paintOut: string
): void {
  const icx = Math.round(ax);
  const icy = Math.round(ay);
  const archR = wheelR + 1;

  // Tight recessed dark wheel-well cavity (upper arch only — keeps rocker & fender metal intact!)
  for (let dy = -archR; dy <= 1; dy++) {
    const span = Math.floor(Math.sqrt(Math.max(0, (archR + 0.35) * (archR + 0.35) - dy * dy)));
    px(ctx, icx - span, icy + dy, span * 2 + 1, 1, '#111623');
  }

  // Crisp 1px sculpted fender lip outline + upper specular rim strictly hugging the arch
  for (let deg = 200; deg <= 340; deg += 9) {
    const rad = (deg * Math.PI) / 180;
    const fx = Math.round(icx + Math.cos(rad) * (archR + 0.8));
    const fy = Math.round(icy + Math.sin(rad) * (archR + 0.8));
    px(ctx, fx, fy, 1, 1, paintOut);
    if (deg >= 220 && deg <= 320) {
      const hx = Math.round(icx + Math.cos(rad) * (archR + 1.8));
      const hy = Math.round(icy + Math.sin(rad) * (archR + 1.8));
      px(ctx, hx, hy, 1, 1, paintHi);
    }
  }
}

/** Draw realistic glass window polygon with crisp sky sheen, reflection slash & darker outline. */
function drawSculptedWindow(
  ctx: CanvasRenderingContext2D,
  pts: readonly Pt[],
  outline: string,
  timeOfDay: TimeOfDay,
  pillarXs?: number[]
): void {
  const glassBase =
    timeOfDay === 'sunset' ? '#2c4a75' : timeOfDay === 'night' ? '#1c3457' : '#265382';
  const glassMid =
    timeOfDay === 'sunset' ? '#5e88ba' : timeOfDay === 'night' ? '#3b6ea6' : '#5298d4';
  const glassHi =
    timeOfDay === 'sunset' ? '#ffd3a8' : timeOfDay === 'night' ? '#9be0ff' : '#d8f3ff';

  const spans = computePolySpans(pts);
  if (spans.length === 0) return;

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  for (let i = 0; i < spans.length; i++) {
    if (spans[i].x0 < minX) minX = spans[i].x0;
    if (spans[i].x1 > maxX) maxX = spans[i].x1;
    if (spans[i].y < minY) minY = spans[i].y;
  }

  for (let i = 0; i < spans.length; i++) {
    const r = spans[i];
    ctx.fillStyle = glassBase;
    ctx.fillRect(r.x0, r.y, r.x1 - r.x0 + 1, 1);

    // Upper sky band inside window
    if (r.y <= minY + 2) {
      ctx.fillStyle = glassMid;
      ctx.fillRect(r.x0, r.y, r.x1 - r.x0 + 1, 1);
    }

    // Crisp diagonal pixel gloss reflection slash (authentic 16-bit glass!)
    const dy = r.y - minY;
    const slashX1 = Math.round(minX + (maxX - minX) * 0.42 - dy * 0.85);
    const slashX2 = Math.round(minX + (maxX - minX) * 0.68 - dy * 0.85);
    for (let sx = slashX1; sx <= slashX1 + 2; sx++) {
      if (sx >= r.x0 && sx <= r.x1) {
        ctx.fillStyle = sx === slashX1 + 1 ? glassHi : glassMid;
        ctx.fillRect(sx, r.y, 1, 1);
      }
    }
    if (slashX2 >= r.x0 && slashX2 <= r.x1) {
      ctx.fillStyle = glassHi;
      ctx.fillRect(slashX2, r.y, 1, 1);
    }

    // B-pillar / quarter-window divider struts
    if (pillarXs) {
      for (let p = 0; p < pillarXs.length; p++) {
        const pxPos = Math.round(pillarXs[p]);
        if (pxPos >= r.x0 && pxPos <= r.x1) {
          ctx.fillStyle = outline;
          ctx.fillRect(pxPos, r.y, 2, 1);
        }
      }
    }
  }

  strokePixelPoly(ctx, pts, outline);
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
 * Mechanically accurate hi-bit pixel wheel with rotating spokes, brake disc caliper,
 * beadlocks, white drag slick lettering dashes, and cel-shaded tire sidewall.
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
  const rimR = Math.max(3, Math.round(r * (isRearSlick ? 0.54 : 0.64)));

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
  if (isRearSlick && r >= 8) {
    const textR = (r + rimR) * 0.52;
    for (let k = 0; k < 2; k++) {
      const baseA = angle + k * Math.PI;
      for (let d = -2; d <= 2; d++) {
        const a = baseA + d * 0.16;
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
  // Subtle red brake caliper peek inside larger rims
  if (rimR >= 4) {
    px(ctx, icx + Math.round(rimR * 0.35), icy - 1, 2, 2, '#dc2626');
  }

  // Bright lip ring
  const lipR = rimR - 0.4;
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const col = i >= 10 && i <= 14 ? rimSpec : rimFill;
    px(ctx, icx + Math.cos(a) * lipR, icy + Math.sin(a) * lipR, 1, 1, col);
  }

  // Rotating crisp pixel spokes
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
  if (isRearSlick && rimR >= 4) {
    for (let b = 0; b < 6; b++) {
      const a = angle + (b / 6) * Math.PI * 2;
      px(ctx, icx + Math.cos(a) * (rimR + 0.7), icy + Math.sin(a) * (rimR + 0.7), 1, 1, '#dbeafe');
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

  // Real-life automotive wheel-to-body ratios (~13.5%–16% of body length on street/muscle/JDM,
  // massive 36" rear slicks + skinny front runners on NHRA Funny Car & Top Fuel Dragsters!)
  if (chassis === 'hatch') {
    const hasWB = upgrades.chassis >= 4 && upgrades.tires >= 4;
    return {
      rearAxleX: -27,
      frontAxleX: 29,
      rearWheelR: 7 + slickExtra,
      frontWheelR: 7,
      minX: -43,
      maxX: 46,
      exhaustX: -44,
      exhaustY: -5,
      hasWheelieBar: hasWB,
      wheelieCasterX: -62,
      chuteX: -45,
      chuteY: -14,
      shadowHalfW: 45,
      shadowCenterX: 1,
    };
  }
  if (chassis === 'muscle') {
    const hasWB = upgrades.chassis >= 3 || upgrades.tires >= 4;
    return {
      rearAxleX: -33,
      frontAxleX: 35,
      rearWheelR: 8 + slickExtra,
      frontWheelR: 7,
      minX: -54,
      maxX: 56,
      exhaustX: -55,
      exhaustY: -5,
      hasWheelieBar: hasWB,
      wheelieCasterX: -74,
      chuteX: -56,
      chuteY: -16,
      shadowHalfW: 55,
      shadowCenterX: 1,
    };
  }
  if (chassis === 'jdm') {
    const hasWB = upgrades.chassis >= 4;
    return {
      rearAxleX: -32,
      frontAxleX: 34,
      rearWheelR: 7 + slickExtra,
      frontWheelR: 7,
      minX: -52,
      maxX: 55,
      exhaustX: -54,
      exhaustY: -5,
      hasWheelieBar: hasWB,
      wheelieCasterX: -72,
      chuteX: -54,
      chuteY: -15,
      shadowHalfW: 53,
      shadowCenterX: 1,
    };
  }
  if (chassis === 'funny') {
    return {
      rearAxleX: -38,
      frontAxleX: 44,
      rearWheelR: 10,
      frontWheelR: 6,
      minX: -58,
      maxX: 66,
      exhaustX: 12,
      exhaustY: -15,
      hasWheelieBar: true,
      wheelieCasterX: -82,
      chuteX: -61,
      chuteY: -20,
      shadowHalfW: 62,
      shadowCenterX: 3,
    };
  }
  // Top Fuel Dragster — unmistakable ultra-long 300" needle rail with 36" slicks & skinny front wire runners!
  return {
    rearAxleX: -48,
    frontAxleX: 62,
    rearWheelR: 11,
    frontWheelR: 5,
    minX: -66,
    maxX: 84,
    exhaustX: -44,
    exhaustY: -22,
    hasWheelieBar: true,
    wheelieCasterX: -94,
    chuteX: -69,
    chuteY: -21,
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
 * Draw a crisp 2–3 tone cel-shaded hi-bit 16-bit car in true sculpted side profile.
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

  const trimDark = '#242e45';
  const trimOut = '#151c2c';
  const chromeHi = '#ffffff';
  const chromeMid = '#c8d6eb';
  const chromeOut = '#4a5c78';
  const isSlick = upgrades.tires >= 2 || chassis === 'funny' || chassis === 'topfuel';

  ctx.save();
  ctx.translate(ix, igy);
  if (flipX) {
    ctx.scale(-1, 1);
  }

  // Realistic launch pitch / weight transfer around the rear tire contact patch!
  // In Canvas 2D (+X right, +Y down), negative pitchDeg rotates counter-clockwise -> lifts the nose UP!
  if (Math.abs(pitchDeg) > 0.05 || Math.abs(squatPx) > 0.05) {
    const clampedSquat = Math.round(Math.max(0, Math.min(1.2, squatPx)));
    ctx.translate(m.rearAxleX, 0);
    ctx.rotate((pitchDeg * Math.PI) / 180);
    ctx.translate(-m.rearAxleX, clampedSquat);
  }

  // ==================== 1. WHEELIE BAR (behind body & rear tire) ====================
  if (m.hasWheelieBar) {
    const barEnd = m.wheelieCasterX;
    const rearX = m.rearAxleX - 4;
    // Upper + lower tubular chromoly triangulated struts
    drawPixelLine(ctx, rearX, -13, barEnd, -3, '#94a3b8');
    drawPixelLine(ctx, rearX, -12, barEnd, -2, '#1e293b');
    drawPixelLine(ctx, rearX, -7, barEnd, -3, '#cbd5e1');
    drawPixelLine(ctx, rearX, -6, barEnd, -2, '#334155');
    // Vertical cross-brace
    px(ctx, Math.round((rearX + barEnd) * 0.5), -9, 2, 6, '#64748b');
    // Tiny hard-rubber caster wheel
    drawPixelDisc(ctx, barEnd, -2, 2, '#f59e0b', '#271e09');
    px(ctx, barEnd, -2, 1, 1, '#fef9c3');
  }

  // ==================== 2. SCULPTED REAL-LIFE CHASSIS BODIES ====================
  if (chassis === 'hatch') {
    const isCRX = bodyVariant === 'compact';
    const isGTI = bodyVariant === 'boxy';

    // Real-life Civic Si '86 / CRX '88 / Golf GTI Mk2 sculpted side profiles (planted low stance over 14-15" wheels!)
    const bodyPts: Pt[] = isCRX
      ? [
          // CR-Pocket '88: Iconic sloping kammback glass coupe, super sleek tapered nose
          [-42, -7],
          [-43, -13],
          [-41, -19], // high chopped kammback tail
          [-26, -27], // long sloping fastback rear hatch glass
          [-9, -30], // curved roof peak
          [6, -29], // windshield header
          [20, -19], // sloped A-pillar base / cowl
          [38, -16], // gently sloping low hood
          [45, -12], // tapered front bumper nose
          [45, -7],
          [42, -5], // lower chin valance
          [-38, -5],
        ]
      : isGTI
      ? [
          // Euro GT-16V '85 (Golf GTI Mk2): Sporty rally hatch with raked windshield & distinct rear C-pillar
          [-41, -7],
          [-42, -14],
          [-38, -26], // crisp angled Euro hatchback tailgate
          [-28, -30], // roof rear
          [3, -30], // roof front
          [16, -19], // raked windshield cowl
          [36, -17], // sporty sloped hood
          [44, -14], // front grille header
          [44, -7],
          [41, -5],
          [-37, -5],
        ]
      : [
          // Civic GT '86 ('86 Honda Civic Si): Sleek long-roof wonder-hatch with raked windshield & sloped hood
          [-42, -7],
          [-43, -14],
          [-37, -26], // angled Civic Si hatchback glass
          [-27, -30], // roof rear
          [5, -30], // roof crown
          [19, -19], // raked 42-deg windshield
          [39, -16], // low sloping Honda hood
          [45, -12], // rounded aero nose bumper
          [45, -7],
          [42, -5],
          [-38, -5],
        ];

    drawPaintedBodyShell(ctx, bodyPts, paint, paintHi, paintShad, paintOut, {
      beltY: -18,
      lowerShadY: -9,
      stripe: visuals.stripe,
      stripeStartX: -39,
      stripeEndX: 40,
    });

    // Sculpted side glass greenhouse (sloped A-pillar + B-pillar + C-pillar)
    const winPts: Pt[] = isCRX
      ? [
          [-35, -19],
          [-25, -26],
          [-8, -28],
          [5, -27],
          [17, -19],
        ]
      : isGTI
      ? [
          [-34, -19],
          [-36, -24],
          [-27, -28],
          [2, -28],
          [13, -19],
        ]
      : [
          [-35, -19],
          [-33, -25],
          [-25, -28],
          [4, -28],
          [16, -19],
        ];
    drawSculptedWindow(ctx, winPts, paintOut, timeOfDay, isCRX ? [-11] : [-15, -2]);

    // Front & rear wraparound sporty dark bumpers + GTI red accent strip
    drawSculptedPoly(ctx, [[37, -9], [46, -9], [46, -6], [39, -5]], trimDark, trimOut);
    drawSculptedPoly(ctx, [[-43, -9], [-36, -9], [-36, -5], [-41, -5]], trimDark, trimOut);
    if (isGTI) {
      px(ctx, -42, -8, 6, 1, '#ff4d3d');
      px(ctx, 38, -8, 7, 1, '#ff4d3d');
      px(ctx, -18, -12, 34, 1, '#1e293b'); // classic side rub strip
    } else {
      // Side rub molding & rocker skirt
      px(ctx, -16, -10, 32, 2, trimDark);
      px(ctx, -16, -10, 32, 1, '#3b4a69');
    }

    // Door seam, flush handle, and A-pillar side mirror!
    px(ctx, -4, -17, 1, 10, paintOut);
    px(ctx, -10, -16, 4, 1, trimOut);
    px(ctx, -10, -15, 4, 1, paintHi);
    pxBox(ctx, isCRX ? 11 : 9, -21, 4, 3, paint, paintOut); // wing mirror

    // Subtle roof-edge hatch spoiler
    drawSculptedPoly(
      ctx,
      [
        [isCRX ? -43 : -41, isCRX ? -20 : -28],
        [isCRX ? -35 : -30, isCRX ? -20 : -30],
        [isCRX ? -35 : -30, isCRX ? -18 : -28],
        [isCRX ? -42 : -40, isCRX ? -18 : -26],
      ],
      trimDark,
      trimOut
    );

    // Recessed angled headlight + amber corner blinker + taillight cluster
    pxBox(ctx, 39, -15, 6, 4, '#fef08a', chromeOut);
    px(ctx, 41, -14, 3, 2, '#ffffff');
    px(ctx, 37, -13, 2, 2, '#fb923c'); // amber side marker
    pxBox(ctx, -43, -16, 5, 5, '#ff3b30', '#5e1414');
    px(ctx, -42, -15, 2, 2, '#fda4af');
    px(ctx, -42, -12, 2, 1, '#fb923c');

    // Bolt-on upgrades (intercooler, hood scoop, rear drag wing, exhaust)
    if (upgrades.induction >= 2) {
      pxBox(ctx, 41, -8, 5, 4, chromeMid, chromeOut);
      px(ctx, 42, -7, 3, 1, chromeHi);
    }
    if (upgrades.induction >= 3) {
      drawSculptedPoly(ctx, [[22, -19], [31, -20], [33, -17], [22, -17]], paintShad, paintOut);
      px(ctx, 31, -19, 2, 2, trimOut);
    }
    if (upgrades.chassis >= 2) {
      // Sleek aluminum street-drag wing on rear hatch
      px(ctx, -38, -30, 2, 4, trimOut);
      drawSculptedPoly(ctx, [[-47, -34], [-35, -32], [-35, -30], [-46, -31]], trimDark, trimOut);
      px(ctx, -45, -33, 9, 1, paintHi);
    }
    if (upgrades.chassis >= 3) {
      // Front carbon splitter
      px(ctx, 39, -5, 10, 2, trimOut);
      px(ctx, 42, -5, 6, 1, '#64748b');
    }
    // Exhaust tip
    pxBox(ctx, -45, -7, 5, 3, chromeMid, chromeOut);
    px(ctx, -44, -6, 3, 1, chromeHi);
  } else if (chassis === 'muscle') {
    const isFastback = bodyVariant === 'fastback';
    const isNotch = bodyVariant === 'notch';
    const isAero = bodyVariant === 'aero';

    // Real-life sculpted muscle silhouettes (sleek planted proportions over 15" wheels / rear slicks):
    const bodyPts: Pt[] = isFastback
      ? [
          // Flowing muscular fastback ('70 Chevelle / Viper V10)
          [-53, -7],
          [-54, -15],
          [-51, -20], // upturned muscular tail lip
          [-38, -21], // raised Coke-bottle rear fender haunch
          [-26, -28], // sweeping fastback C-pillar
          [-13, -31], // curved coupe roof crown
          [4, -30], // windshield header
          [18, -20], // deeply raked windshield cowl
          [45, -17], // long muscular sloping hood
          [55, -13], // sculpted pointed front nose
          [55, -7],
          [51, -5], // recessed chin spoiler
          [-49, -5],
        ]
      : isNotch
      ? [
          // Sleek notchback drag coupe ('87 Fox 5.0 / '87 GNX / '68 Nova)
          [-52, -7],
          [-53, -15],
          [-51, -19], // crisp trunk deck edge
          [-31, -20], // rear trunk deck
          [-23, -30], // clean angled coupe C-pillar
          [-12, -31], // roof crown
          [6, -30], // windshield header
          [18, -20], // raked windshield cowl
          [44, -17], // sloped hood
          [54, -14], // front fascia
          [54, -7],
          [50, -5],
          [-48, -5],
        ]
      : isAero
      ? [
          // Aero Daytona/Superbird sloped nose cone muscle
          [-53, -7],
          [-54, -16],
          [-50, -20],
          [-35, -21],
          [-24, -29],
          [-10, -30],
          [6, -29],
          [20, -19],
          [48, -15],
          [58, -10], // aerodynamic pointed nose cone
          [55, -6],
          [-49, -5],
        ]
      : [
          // Classic '84 IROC-Z Camaro: Low pointed wedge nose + long sweeping rear hatch
          [-52, -7],
          [-54, -15],
          [-50, -19], // rear deck spoiler lip
          [-34, -22], // sweeping Camaro rear hatch glass
          [-16, -29], // sleek low roof
          [3, -29],
          [19, -19], // deeply raked windshield
          [46, -16], // long low Camaro hood
          [56, -11], // iconic recessed IROC pointed nose
          [54, -6],
          [49, -5],
          [-48, -5],
        ];

    drawPaintedBodyShell(ctx, bodyPts, paint, paintHi, paintShad, paintOut, {
      beltY: -19,
      lowerShadY: -9,
      stripe: visuals.stripe,
      stripeStartX: -50,
      stripeEndX: 49,
    });

    // Sculpted side glass greenhouse
    const winPts: Pt[] = isFastback
      ? [
          [-33, -21],
          [-24, -27],
          [-12, -29],
          [3, -28],
          [15, -20],
        ]
      : isNotch
      ? [
          [-28, -20],
          [-22, -28],
          [-11, -29],
          [4, -28],
          [15, -20],
        ]
      : [
          [-40, -20],
          [-32, -23],
          [-16, -27],
          [2, -27],
          [16, -19],
        ];
    drawSculptedWindow(ctx, winPts, paintOut, timeOfDay, isNotch ? [-7] : [-12, -1]);

    // Sculpted front chin air dam, rear diffuser valance & side rocker trim
    drawSculptedPoly(ctx, [[46, -7], [55, -7], [52, -4], [45, -5]], trimDark, trimOut);
    px(ctx, -20, -8, 42, 2, trimDark);
    px(ctx, -20, -8, 42, 1, '#3b4a69');

    // Muscular rear fender haunch highlight line + door seam & aero mirror
    drawPixelLine(ctx, -45, -18, -25, -19, paintHi);
    px(ctx, -5, -18, 1, 10, paintOut);
    px(ctx, -11, -17, 4, 1, trimOut);
    pxBox(ctx, 8, -22, 4, 3, paint, paintOut); // wing mirror

    // Subtle integrated rear decklip spoiler
    drawSculptedPoly(ctx, [[-55, -21], [-48, -20], [-48, -18], [-54, -18]], paintShad, paintOut);

    // Recessed quad/bar headlights + glowing amber marker + sculpted taillights
    pxBox(ctx, 49, -14, 6, 4, '#fef08a', chromeOut);
    px(ctx, 51, -13, 3, 2, '#ffffff');
    px(ctx, 45, -11, 3, 2, '#fb923c');
    pxBox(ctx, -54, -17, 6, 5, '#ff3b30', '#5e1414');
    px(ctx, -53, -16, 2, 2, '#fda4af');
    px(ctx, -53, -13, 2, 1, '#fb923c');

    // Bolt-on Induction: Cowl hood bulge (lvl 1-2) -> Towering Chrome 6-71 Blower (lvl 3+)
    if (upgrades.induction >= 3) {
      // Sculpted chrome supercharger rising cleanly from the long V8 hood
      drawSculptedPoly(ctx, [[22, -19], [23, -27], [36, -27], [37, -18]], chromeMid, chromeOut);
      px(ctx, 24, -25, 11, 2, chromeHi);
      px(ctx, 25, -22, 9, 1, chromeOut);
      px(ctx, 25, -20, 9, 1, chromeOut);
      // Red anodized butterfly injector scoop
      drawSculptedPoly(ctx, [[21, -31], [37, -32], [39, -28], [22, -27]], '#ff4d3d', '#6b1616');
      px(ctx, 24, -30, 11, 1, '#ffada6');
      px(ctx, 36, -30, 3, 2, '#1e293b'); // butterfly mouth
    } else if (upgrades.induction >= 1) {
      // Sleek cowl-induction power dome
      drawSculptedPoly(ctx, [[21, -21], [34, -19], [37, -17], [20, -18]], paintHi, paintOut);
      px(ctx, 20, -20, 2, 2, trimOut);
    }

    // Pro-Street aluminum drag spoiler on trunk deck
    if (upgrades.chassis >= 2) {
      drawSculptedPoly(ctx, [[-61, -22], [-47, -20], [-48, -18], [-60, -19]], chromeMid, chromeOut);
      px(ctx, -58, -21, 10, 1, chromeHi);
      drawPixelLine(ctx, -56, -19, -52, -14, chromeOut);
    }

    // Twin chrome exhaust tip / side dump
    pxBox(ctx, -56, -7, 6, 3, chromeMid, chromeOut);
    px(ctx, -55, -6, 4, 1, chromeHi);
  } else if (chassis === 'jdm') {
    const isWedge = bodyVariant === 'wedge';
    const isAero = bodyVariant === 'aero';

    // Real-life Japanese Sports Icons (low-slung sleek sports proportions over 16" wheels):
    const bodyPts: Pt[] = isWedge
      ? [
          // Ultra-low wedge exotic ('91 NSX / '88 RX-7 FC)
          [-51, -7],
          [-52, -15],
          [-49, -19], // crisp sculpted rear deck
          [-34, -20], // long mid-engine / hatch deck
          [-20, -27], // deeply raked rear canopy glass
          [-6, -28], // low sleek teardrop roof
          [8, -27],
          [23, -17], // super-raked fighter-jet windshield
          [46, -13], // razor-low wedge hood
          [55, -9], // pointed aerodynamic nose
          [54, -6],
          [49, -5],
          [-47, -5],
        ]
      : isAero
      ? [
          // Curvaceous aero GT ('93 Supra MK4 / '89 Corvette ZR)
          [-51, -7],
          [-52, -15],
          [-48, -19], // rounded Supra rear haunch
          [-35, -21],
          [-23, -28], // sweeping fastback rear glass
          [-9, -29], // smooth bubble roof crown
          [6, -28],
          [21, -18], // deeply raked windshield
          [45, -15], // sculpted curved long hood
          [55, -11], // rounded wind-tunnel nose
          [54, -6],
          [49, -5],
          [-47, -5],
        ]
      : [
          // Iconic '89 Skyline R32 GT-R coupe
          [-50, -7],
          [-51, -15],
          [-48, -19], // crisp R32 trunk edge
          [-33, -20],
          [-24, -29], // clean angled C-pillar
          [-10, -30], // curved roof
          [7, -29],
          [20, -19], // raked windshield
          [44, -16], // sleek sloping hood
          [54, -12], // sculpted GT-R front bumper nose
          [54, -6],
          [49, -5],
          [-46, -5],
        ];

    drawPaintedBodyShell(ctx, bodyPts, paint, paintHi, paintShad, paintOut, {
      beltY: -18,
      lowerShadY: -8,
      stripe: visuals.stripe,
      stripeStartX: -48,
      stripeEndX: 48,
    });

    // Sculpted side glass canopy
    const winPts: Pt[] = isWedge
      ? [
          [-28, -19],
          [-19, -25],
          [-5, -26],
          [7, -25],
          [20, -17],
        ]
      : isAero
      ? [
          [-34, -20],
          [-22, -26],
          [-8, -27],
          [5, -26],
          [18, -18],
        ]
      : [
          [-30, -20],
          [-23, -27],
          [-9, -28],
          [6, -27],
          [17, -19],
        ];
    drawSculptedWindow(ctx, winPts, paintOut, timeOfDay, isWedge ? [-2] : [-8]);

    // Front bumper intercooler mouth + aero side skirt + sculpted side vent (on wedge)
    drawSculptedPoly(ctx, [[45, -9], [54, -9], [53, -5], [46, -5]], trimDark, trimOut);
    if (upgrades.induction >= 1) {
      // Gleaming front-mount intercooler core tucked inside front bumper air dam!
      px(ctx, 47, -8, 6, 3, chromeMid);
      px(ctx, 48, -8, 4, 1, chromeHi);
      px(ctx, 48, -6, 4, 1, chromeOut);
    }
    px(ctx, -20, -7, 42, 2, trimDark);
    if (isWedge) {
      // Mid-engine / RX-7 sculpted side air scoop behind door
      drawSculptedPoly(ctx, [[-17, -15], [-9, -16], [-10, -11], [-18, -11]], trimDark, paintOut);
      px(ctx, -16, -14, 5, 1, '#475569');
    }

    // Door seam, flush handle, and sleek aero teardrop mirror
    px(ctx, -3, -17, 1, 9, paintOut);
    px(ctx, -9, -16, 4, 1, trimOut);
    pxBox(ctx, 10, -21, 4, 3, paint, paintOut);

    // Sculpted headlights (sleek flush aero lens or pop-up seam on wedge) + iconic taillights
    if (isWedge) {
      // Pop-up headlight seam + lower bumper fog/running light
      drawPixelLine(ctx, 41, -14, 48, -13, paintOut);
      pxBox(ctx, 48, -11, 6, 3, '#e0f2fe', chromeOut);
      px(ctx, 50, -10, 3, 1, '#ffffff');
    } else {
      drawSculptedPoly(ctx, [[46, -14], [54, -12], [54, -10], [46, -11]], '#e0f2fe', chromeOut);
      px(ctx, 48, -12, 4, 1, '#ffffff');
    }
    pxBox(ctx, -52, -16, 6, 4, '#ff3b30', '#5e1414');
    px(ctx, -51, -15, 2, 2, '#fda4af');
    px(ctx, -48, -15, 1, 2, '#ff8073'); // twin-lamp hint

    // Iconic curved Supra hoop wing (aero) / GT-R factory wing (standard) / Carbon GT wing (upgraded)
    if (upgrades.chassis >= 2) {
      // High-downforce carbon GT wing on twin aluminum uprights
      px(ctx, -46, -30, 2, 11, trimOut);
      px(ctx, -45, -29, 1, 9, chromeMid);
      drawSculptedPoly(ctx, [[-56, -33], [-42, -31], [-42, -29], [-55, -30]], trimDark, trimOut);
      px(ctx, -54, -32, 10, 1, '#94a3b8');
    } else if (isAero) {
      // Iconic curved Mk4 Supra / Corvette hoop wing
      drawSculptedPoly(ctx, [[-51, -24], [-43, -25], [-41, -19], [-44, -19], [-45, -22], [-50, -22]], paint, paintOut);
      px(ctx, -50, -23, 6, 1, paintHi);
    } else {
      // Sleek factory R32 / NSX rear spoiler
      drawSculptedPoly(ctx, [[-52, -22], [-42, -21], [-42, -19], [-51, -20]], paint, paintOut);
      px(ctx, -50, -21, 7, 1, paintHi);
    }

    if (upgrades.chassis >= 3) {
      // Carbon front splitter lip
      px(ctx, 47, -5, 10, 2, trimOut);
      px(ctx, 50, -5, 6, 1, '#64748b');
    }
    // Titanium cannon exhaust tip
    pxBox(ctx, -55, -7, 6, 3, chromeMid, chromeOut);
    px(ctx, -54, -6, 2, 1, '#60a5fa'); // titanium heat-blued tip!
  } else if (chassis === 'funny') {
    const isWedge = bodyVariant === 'wedge';
    const isNotch = bodyVariant === 'notch';
    const isAero = bodyVariant === 'aero';

    // Real NHRA Nitro Funny Car / Carbon Pro-Mod Flip-Body (low ground-scraping stance over 36" slicks & skinny front runners):
    const bodyPts: Pt[] = isNotch
      ? [
          // Outlaw Pro-Mod Z: Sleek extended-nose carbon door-slammer with rear trunk deck
          [-58, -9],
          [-57, -21], // tall integrated spill-plate rear spoiler
          [-45, -21],
          [-34, -22],
          [-23, -30], // fastback-Pro-Mod roofline
          [-7, -31],
          [8, -28], // deeply laid-back windshield
          [24, -19],
          [55, -14], // extended carbon aerodynamic nose
          [66, -8], // low ground-scraping splitter tip
          [65, -4],
          [54, -4],
          [-54, -5],
        ]
      : [
          // Authentic NHRA Nitro Funny Car sweeping teardrop flip-body
          [-58, -9],
          [-59, -25], // iconic high integrated rear spill-plate wing
          [-48, -24],
          [-32, -26], // smooth sweeping aerodynamic tail deck
          [-16, -31], // low laid-back teardrop roof
          [0, -30],
          [16, -20], // ultra-raked windshield
          [48, isWedge ? -13 : -15], // razor-long sloped carbon nose
          [66, isAero ? -7 : -8], // bullet-pointed chin nose
          [65, -4],
          [52, -4],
          [-53, -5],
        ];

    drawPaintedBodyShell(ctx, bodyPts, paint, paintHi, paintShad, paintOut, {
      beltY: -20,
      lowerShadY: -9,
      stripe: visuals.stripe,
      stripeStartX: -54,
      stripeEndX: 56,
    });

    // Ultra-raked Funny Car lexan cockpit side window + carbon spill-plate trim
    const winPts: Pt[] = isNotch
      ? [
          [-26, -22],
          [-19, -28],
          [-6, -29],
          [6, -26],
          [18, -20],
        ]
      : [
          [-28, -22],
          [-15, -29],
          [-1, -28],
          [13, -20],
        ];
    drawSculptedWindow(ctx, winPts, paintOut, timeOfDay, [-6]);

    // Rear spill-plate carbon side panel & aluminum flap
    drawSculptedPoly(ctx, [[-59, -25], [-48, -24], [-50, -19], [-58, -19]], trimDark, trimOut);
    px(ctx, -58, -24, 9, 1, chromeMid);

    // Sculpted carbon chin ground-effects skirt
    px(ctx, -20, -6, 46, 2, trimOut);
    px(ctx, 54, -5, 13, 2, trimOut);
    px(ctx, 56, -5, 10, 1, '#64748b');

    // Painted decoy headlight decal on carbon nose (classic NHRA Funny Car detail!)
    drawSculptedPoly(ctx, [[54, -12], [63, -9], [62, -7], [54, -9]], '#e2e8f0', chromeOut);
    px(ctx, 56, -10, 4, 1, '#ffffff');

    // Towering Chrome 14-71 Nitro Blower & Triple-Butterfly Hat rising out of the sloped nose!
    drawSculptedPoly(ctx, [[22, -18], [23, -29], [37, -29], [38, -17]], chromeMid, chromeOut);
    px(ctx, 24, -27, 12, 2, chromeHi);
    px(ctx, 25, -24, 10, 1, chromeOut);
    px(ctx, 25, -21, 10, 1, chromeOut);
    // Anodized injector scoop hat
    drawSculptedPoly(ctx, [[21, -33], [38, -34], [40, -30], [22, -29]], '#ff4d3d', '#6b1616');
    px(ctx, 24, -32, 12, 1, '#ffb3ab');
    px(ctx, 37, -32, 3, 2, '#1e293b');

    // Iconic 4-pipe swept chrome nitro zoomie headers poking cleanly out of the side fender cutout!
    pxBox(ctx, 9, -16, 17, 7, '#141926', trimOut);
    for (let z = 0; z < 4; z++) {
      const zx = 11 + z * 4;
      drawPixelLine(ctx, zx + 2, -11, zx - 2, -16, chromeOut);
      drawPixelLine(ctx, zx + 1, -11, zx - 3, -16, chromeMid);
      px(ctx, zx - 3, -16, 2, 1, chromeHi);
    }
  } else {
    // ==================== TOP FUEL DRAGSTER (Real 300" Tapered Needle Rail!) ====================
    const isSlingshot = bodyVariant === 'slingshot';
    const isCanopy = bodyVariant === 'canopy';
    const isTwin = bodyVariant === 'twin';

    // Tall Twin-Strut Rear Downforce Wing with Sculpted Curved Carbon Endplates
    drawPixelLine(ctx, -56, -21, -62, -38, chromeOut);
    drawPixelLine(ctx, -55, -21, -61, -38, chromeMid);
    drawPixelLine(ctx, -47, -21, -52, -37, chromeOut);
    drawPixelLine(ctx, -46, -21, -51, -37, chromeMid);
    // Sculpted wing endplate & dual airfoil blades
    drawSculptedPoly(
      ctx,
      [
        [-68, -41],
        [-47, -38],
        [-48, -31],
        [-65, -32],
      ],
      paint,
      paintOut
    );
    px(ctx, -66, -39, 17, 2, paintHi);
    px(ctx, -64, -34, 14, 2, trimDark);

    // Continuous Smoothly-Tapered Razor Needle Fuselage (from rear cowl all the way to x=84 tip!)
    const bodyPts: Pt[] = [
      [-64, -8],
      [-64, -19], // rear engine cowling
      [-34, -19], // sidepod shoulder
      [-10, -18], // cockpit cowling
      [20, -14], // smooth tapered upper fuselage
      [54, -9], // razor needle taper
      [84, -6], // sharp aerodynamic needle tip
      [82, -4],
      [52, -4],
      [-58, -5],
    ];
    drawPaintedBodyShell(ctx, bodyPts, paint, paintHi, paintShad, paintOut, {
      beltY: -15,
      lowerShadY: -7,
      stripe: visuals.stripe,
      stripeStartX: -60,
      stripeEndX: 74,
    });

    // Exposed Billet Nitro Hemi Engine(s) + 14-71 Supercharger(s) + Swept Vertical Headers
    const drawHemiEngine = (ex: number) => {
      // Billet aluminum Hemi block & valve cover
      drawSculptedPoly(ctx, [[ex - 9, -18], [ex - 8, -25], [ex + 8, -25], [ex + 9, -18]], '#94a3b8', chromeOut);
      px(ctx, ex - 7, -24, 14, 2, chromeHi);
      // Chrome blower & injector hat
      drawSculptedPoly(ctx, [[ex - 7, -25], [ex - 6, -32], [ex + 7, -32], [ex + 8, -25]], chromeMid, chromeOut);
      px(ctx, ex - 5, -31, 10, 2, chromeHi);
      drawSculptedPoly(ctx, [[ex - 6, -35], [ex + 8, -36], [ex + 10, -32], [ex - 5, -32]], '#ff4d3d', '#6b1616');
      px(ctx, ex - 4, -34, 11, 1, '#ffb3ab');
      px(ctx, ex + 8, -34, 2, 2, '#1e293b');
      // 4 angled vertical chrome nitro header pipes!
      for (let h = 0; h < 4; h++) {
        const hx = ex - 6 + h * 4;
        drawPixelLine(ctx, hx + 1, -19, hx - 3, -26, chromeOut);
        drawPixelLine(ctx, hx, -19, hx - 4, -26, chromeMid);
        px(ctx, hx - 4, -26, 2, 1, chromeHi);
      }
    };

    if (isSlingshot) {
      // Front-engine cacklefest slingshot: Hemi sits AHEAD of the cockpit!
      drawHemiEngine(10);
      // Rear-mounted roll cage & driver helmet right behind rear slicks
      drawPixelLine(ctx, -36, -18, -28, -29, chromeOut);
      drawPixelLine(ctx, -28, -29, -16, -29, chromeMid);
      drawPixelLine(ctx, -16, -29, -10, -18, chromeOut);
      drawPixelDisc(ctx, -23, -22, 4, '#f8fafc', '#1e293b');
      px(ctx, -22, -23, 4, 2, '#38bdf8');
    } else if (isTwin) {
      // Dual-Blower Twin-Hemi Goliath!
      drawHemiEngine(-36);
      drawHemiEngine(-14);
      // Forward cockpit behind sleek windscreen
      drawPixelLine(ctx, -2, -17, 6, -27, chromeMid);
      drawPixelLine(ctx, 6, -27, 17, -26, chromeMid);
      drawPixelLine(ctx, 17, -26, 24, -14, chromeOut);
      drawPixelDisc(ctx, 11, -21, 4, '#f8fafc', '#1e293b');
      px(ctx, 12, -22, 4, 2, '#facc15');
    } else {
      // Modern rear-engine Top Fuel dragster (standard open cage OR fighter-jet canopy)
      drawHemiEngine(-32);
      if (isCanopy) {
        // Sleek sculpted fighter-jet enclosed lexan canopy!
        drawSculptedWindow(
          ctx,
          [
            [-18, -18],
            [-11, -27],
            [6, -26],
            [26, -13],
          ],
          paintOut,
          timeOfDay,
          [2]
        );
        // Subtle helmet silhouette inside canopy
        drawPixelDisc(ctx, -4, -21, 3, '#e2e8f0', '#1e3a5f');
      } else {
        // Chromoly roll cage + helmeted driver + angled lexan windscreen
        drawPixelLine(ctx, -18, -18, -10, -28, chromeMid);
        drawPixelLine(ctx, -10, -28, 4, -27, chromeMid);
        drawPixelLine(ctx, 4, -27, 14, -15, chromeOut);
        drawPixelDisc(ctx, -3, -22, 4, '#f8fafc', '#1e293b');
        px(ctx, -2, -23, 4, 2, '#38bdf8');
        // Swept windscreen fairing
        drawSculptedPoly(ctx, [[4, -22], [17, -15], [13, -14], [3, -18]], '#7cc9f7', chromeOut);
      }
    }

    // Front Canard Aero Wing mounted cleanly above tiny front wire runners!
    drawSculptedPoly(ctx, [[56, -12], [70, -10], [69, -8], [56, -9]], paint, paintOut);
    px(ctx, 57, -11, 11, 1, paintHi);
    px(ctx, 62, -9, 2, 4, chromeOut); // front axle strut
  }

  // ==================== 3. PARACHUTE PACK (Rear Tail) ====================
  const hasChutePack =
    chassis === 'topfuel' || chassis === 'funny' || upgrades.chassis >= 3 || chuteOpen > 0.01;
  if (hasChutePack) {
    const cx = m.chuteX;
    const cy = m.chuteY;
    pxBox(ctx, cx - 3, cy - 3, 7, 7, '#334155', '#151c2c');
    px(ctx, cx - 2, cy - 2, 5, 2, '#facc15');
    px(ctx, cx - 1, cy + 1, 3, 1, '#94a3b8');

    // Deployed crisp hi-bit drag parachute canopy!
    if (chuteOpen > 0.04) {
      const dist = 20 + chuteOpen * 32;
      const rad = 7 + chuteOpen * 11;
      const canopyX = cx - dist;
      const canopyY = cy - 4 - Math.sin(simTime * 11) * 1.5;

      // Crisp pixel shroud lines
      drawPixelLine(ctx, cx - 2, cy, canopyX + 2, canopyY - rad + 2, '#cbd5e1');
      drawPixelLine(ctx, cx - 2, cy, canopyX + 2, canopyY + rad - 2, '#cbd5e1');

      // Sculpted segmented hi-bit parachute canopy (red & white racing stripes)
      for (let dy = -Math.round(rad); dy <= Math.round(rad); dy++) {
        const t = dy / rad;
        const arc = Math.round(Math.sqrt(Math.max(0, 1 - t * t)) * (rad * 0.72));
        const stripeCol = Math.abs(Math.floor(dy / 4)) % 2 === 0 ? '#ff4d3d' : '#f8fafc';
        px(ctx, canopyX - arc, canopyY + dy, Math.max(3, arc + 2), 1, stripeCol);
        px(ctx, canopyX - arc - 1, canopyY + dy, 1, 1, '#5c1414');
      }
    }
  }

  // ==================== 4. SCULPTED WHEEL ARCH CUTOUTS + EXACT 2 WHEELS ====================
  if (chassis !== 'topfuel') {
    drawWheelArchCutout(ctx, m.rearAxleX, -m.rearWheelR, m.rearWheelR, paintHi, paintOut);
    drawWheelArchCutout(ctx, m.frontAxleX, -m.frontWheelR, m.frontWheelR, paintHi, paintOut);
  }
  drawHiBitWheel(ctx, m.rearAxleX, -m.rearWheelR, m.rearWheelR, wheelAngle, visuals.rims, isSlick);
  drawHiBitWheel(ctx, m.frontAxleX, -m.frontWheelR, m.frontWheelR, wheelAngle, visuals.rims, false);

  // ==================== 5. NIGHT HEADLIGHT BEAM (Street / Pro cars) ====================
  if (timeOfDay === 'night' && !isReflection && chassis !== 'topfuel') {
    ctx.save();
    ctx.fillStyle = 'rgba(255, 244, 175, 0.16)';
    ctx.beginPath();
    ctx.moveTo(m.maxX - 1, -16);
    ctx.lineTo(m.maxX + 68, -26);
    ctx.lineTo(m.maxX + 68, -1);
    ctx.lineTo(m.maxX - 1, -10);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // ==================== 6. CRISP PIXEL EXHAUST / ZOOMIE / NITROUS FLAMES ====================
  const flameIntensity = Math.max(exhaustFlame, nitrousFlame);
  if (flameIntensity > 0.05 && !isReflection) {
    const isNos = nitrousFlame > exhaustFlame * 0.85 && nitrousFlame > 0.1;
    const outerCol = isNos ? '#38bdf8' : '#ff5a1f';
    const midCol = isNos ? '#bae6fd' : '#facc15';
    const coreCol = '#ffffff';
    const flicker = 0.85 + Math.sin(simTime * 55) * 0.15;

    if (chassis === 'topfuel' || chassis === 'funny') {
      // Dramatic angled upward-rearward nitro header flames!
      const len = Math.round((10 + flameIntensity * 16) * flicker);
      const count = chassis === 'topfuel' ? 4 : 3;
      const baseX = chassis === 'topfuel' ? (bodyVariant === 'slingshot' ? 5 : -37) : 10;
      const baseY = chassis === 'topfuel' ? -26 : -16;
      for (let f = 0; f < count; f++) {
        const fx = baseX + f * 4;
        for (let step = 0; step < len; step++) {
          const pxX = fx - step * 0.7;
          const pxY = baseY - step * 0.85;
          const w = step < len * 0.35 ? 3 : step < len * 0.7 ? 2 : 1;
          px(ctx, pxX, pxY, w, w, step < len * 0.35 ? coreCol : step < len * 0.72 ? midCol : outerCol);
        }
      }
    } else {
      // Crisp horizontal rear tailpipe shift flame
      const len = Math.round((8 + flameIntensity * 18) * flicker);
      const ex = m.exhaustX;
      const ey = m.exhaustY;
      px(ctx, ex - len, ey - 1, len, 3, outerCol);
      px(ctx, ex - Math.round(len * 0.7), ey - 1, Math.round(len * 0.7), 2, midCol);
      px(ctx, ex - Math.round(len * 0.38), ey, Math.round(len * 0.38), 1, coreCol);
    }
  }

  ctx.restore();
}

/**
 * Draw crisp sculpted Front or Rear elevation of the car for the 4-angle Showroom Turntable!
 * Uses real-life tapered cabins, curved shoulder haunches, wide slick stance, and contoured noses/tails.
 */
export function drawHiBitCarEndView(
  ctx: CanvasRenderingContext2D,
  cx: number,
  groundY: number,
  view: 'FRONT' | 'REAR',
  chassis: ChassisStyle,
  visuals: CarVisuals,
  upgrades: CarUpgrades,
  timeOfDay: TimeOfDay = 'afternoon'
): void {
  const icx = Math.round(cx);
  const igy = Math.round(groundY);
  const paint = visuals.paintColor || '#d93829';
  const paintOut = outlineColor(paint);
  const paintHi = highlightColor(paint, timeOfDay);
  const paintShad = shadowBandColor(paint, timeOfDay);
  const chromeHi = '#ffffff';
  const chromeMid = '#c8d6eb';
  const chromeOut = '#4a5c78';
  const trimDark = '#1c2436';
  const trimOut = '#111623';

  // Soft oval shadow underneath
  ctx.save();
  ctx.fillStyle = 'rgba(10, 14, 26, 0.38)';
  ctx.beginPath();
  ctx.ellipse(icx, igy + 1, chassis === 'topfuel' ? 30 : 35, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  if (chassis === 'topfuel') {
    const isRear = view === 'REAR';
    const tireW = isRear ? 11 : 4;
    const tireH = isRear ? 21 : 10;
    const trackHalf = isRear ? 22 : 19;

    // Tall rear downforce wing on sculpted twin struts
    pxBox(ctx, icx - 13, igy - 46, 3, 24, chromeMid, chromeOut);
    pxBox(ctx, icx + 10, igy - 46, 3, 24, chromeMid, chromeOut);
    drawSculptedPoly(
      ctx,
      [
        [icx - 27, igy - 52],
        [icx + 27, igy - 52],
        [icx + 25, igy - 44],
        [icx - 25, igy - 44],
      ],
      paint,
      paintOut
    );
    px(ctx, icx - 24, igy - 50, 48, 2, paintHi);

    // Front axle + canard wing (front view) or wheelie bar + chute (rear view)
    if (!isRear) {
      px(ctx, icx - trackHalf, igy - 7, trackHalf * 2, 2, chromeMid);
      drawSculptedPoly(
        ctx,
        [
          [icx - 22, igy - 14],
          [icx + 22, igy - 14],
          [icx + 20, igy - 10],
          [icx - 20, igy - 10],
        ],
        paint,
        paintOut
      );
      px(ctx, icx - 19, igy - 13, 38, 1, paintHi);
    }

    // Left & right tires (huge fat 36" slicks in rear, skinny runners in front)
    pxBox(ctx, icx - trackHalf - Math.floor(tireW / 2), igy - tireH, tireW, tireH, '#232b3d', '#131824');
    pxBox(ctx, icx + trackHalf - Math.floor(tireW / 2), igy - tireH, tireW, tireH, '#232b3d', '#131824');
    px(ctx, icx - trackHalf - Math.floor(tireW / 2) + 2, igy - tireH + 2, 2, tireH - 4, '#36425c');
    px(ctx, icx + trackHalf - Math.floor(tireW / 2) + 2, igy - tireH + 2, 2, tireH - 4, '#36425c');

    // Tapered narrow central fuselage
    drawSculptedPoly(
      ctx,
      [
        [icx - 7, igy - 25],
        [icx + 7, igy - 25],
        [icx + 10, igy - 7],
        [icx - 10, igy - 7],
      ],
      paint,
      paintOut
    );
    px(ctx, icx - 4, igy - 24, 8, 14, paintHi);

    // Towering chrome blower & triple red butterfly hat
    drawSculptedPoly(
      ctx,
      [
        [icx - 7, igy - 35],
        [icx + 7, igy - 35],
        [icx + 8, igy - 25],
        [icx - 8, igy - 25],
      ],
      chromeMid,
      chromeOut
    );
    px(ctx, icx - 5, igy - 33, 10, 2, chromeHi);
    drawSculptedPoly(
      ctx,
      [
        [icx - 6, igy - 40],
        [icx + 6, igy - 40],
        [icx + 7, igy - 35],
        [icx - 7, igy - 35],
      ],
      '#ff4d3d',
      '#6b1616'
    );
    if (!isRear) {
      px(ctx, icx - 4, igy - 38, 2, 2, '#1e293b');
      px(ctx, icx - 1, igy - 38, 2, 2, '#1e293b');
      px(ctx, icx + 2, igy - 38, 2, 2, '#1e293b');
    } else {
      // Twin parachute packs on rear tail
      pxBox(ctx, icx - 7, igy - 22, 6, 7, '#334155', '#151c2c');
      pxBox(ctx, icx + 1, igy - 22, 6, 7, '#334155', '#151c2c');
      px(ctx, icx - 6, igy - 21, 4, 2, '#facc15');
      px(ctx, icx + 2, igy - 21, 4, 2, '#facc15');
    }
    return;
  }

  // Street / Muscle / JDM / Funny Car: Sculpted symmetrical real-life Front & Rear elevation
  const isFunny = chassis === 'funny';
  const isHatch = chassis === 'hatch';
  const isJdm = chassis === 'jdm';
  const halfW = isFunny ? 30 : isHatch ? 24 : 28;
  const roofHalfW = isFunny ? 14 : isHatch ? 17 : isJdm ? 15 : 17;
  const shoulderHalfW = halfW - 2;
  const bodyTopY = isFunny ? -20 : isHatch ? -21 : isJdm ? -19 : -21;
  const roofTopY = isFunny ? -31 : isHatch ? -35 : isJdm ? -31 : -33;
  const tireW = view === 'REAR' && (upgrades.tires >= 2 || isFunny) ? 9 : 6;
  const tireH = isFunny ? 13 : 10;

  // Tires tucked cleanly beneath sculpted wide fender arches
  pxBox(ctx, icx - halfW + 1, igy - tireH, tireW, tireH, '#232b3d', '#131824');
  pxBox(ctx, icx + halfW - 1 - tireW, igy - tireH, tireW, tireH, '#232b3d', '#131824');
  px(ctx, icx - halfW + 3, igy - tireH + 2, 2, tireH - 4, '#36425c');
  px(ctx, icx + halfW - tireW + 1, igy - tireH + 2, 2, tireH - 4, '#36425c');

  // Sculpted lower body hull with rounded bumper corners & flared wheel haunches
  const hullPts: Pt[] = [
    [icx - halfW + 3, igy - 6],
    [icx - halfW, igy - 10],
    [icx - halfW, igy - 17],
    [icx - shoulderHalfW, igy + bodyTopY],
    [icx + shoulderHalfW, igy + bodyTopY],
    [icx + halfW, igy - 17],
    [icx + halfW, igy - 10],
    [icx + halfW - 3, igy - 6],
  ];
  drawSculptedPoly(ctx, hullPts, paint, paintOut);
  // Top hood/trunk glossy highlight + lower shadow valance
  px(ctx, icx - shoulderHalfW + 2, igy + bodyTopY + 1, (shoulderHalfW - 2) * 2, 2, paintHi);
  px(ctx, icx - halfW + 2, igy - 11, (halfW - 2) * 2, 4, paintShad);

  // Tapered trapezoidal real-life cabin greenhouse (much wider at beltline than roof!)
  const cabPts: Pt[] = [
    [icx - shoulderHalfW + 2, igy + bodyTopY],
    [icx - roofHalfW - 1, igy + roofTopY + 2],
    [icx - roofHalfW + 2, igy + roofTopY],
    [icx + roofHalfW - 2, igy + roofTopY],
    [icx + roofHalfW + 1, igy + roofTopY + 2],
    [icx + shoulderHalfW - 2, igy + bodyTopY],
  ];
  drawSculptedPoly(ctx, cabPts, paint, paintOut);
  px(ctx, icx - roofHalfW + 3, igy + roofTopY + 1, (roofHalfW - 3) * 2, 2, paintHi);

  // Side view mirrors sticking cleanly off both A-pillars!
  if (!isFunny) {
    pxBox(ctx, icx - shoulderHalfW - 2, igy + bodyTopY - 3, 5, 3, paint, paintOut);
    pxBox(ctx, icx + shoulderHalfW - 3, igy + bodyTopY - 3, 5, 3, paint, paintOut);
  }

  // Tapered windshield / rear glass inside cabin
  const glassPts: Pt[] = [
    [icx - shoulderHalfW + 5, igy + bodyTopY - 1],
    [icx - roofHalfW + 1, igy + roofTopY + 3],
    [icx + roofHalfW - 1, igy + roofTopY + 3],
    [icx + shoulderHalfW - 5, igy + bodyTopY - 1],
  ];
  drawSculptedWindow(ctx, glassPts, paintOut, timeOfDay);

  // Twin racing stripes centered down the sculpted hood / trunk
  if (visuals.stripe === 'twin') {
    px(ctx, icx - 5, igy + bodyTopY + 1, 4, Math.abs(bodyTopY) - 8, '#f8fafc');
    px(ctx, icx + 1, igy + bodyTopY + 1, 4, Math.abs(bodyTopY) - 8, '#f8fafc');
  }

  // Towering Chrome Blower if Funny Car or upgraded Muscle
  if (isFunny || (chassis === 'muscle' && upgrades.induction >= 3)) {
    drawSculptedPoly(
      ctx,
      [
        [icx - 7, igy + bodyTopY - 9],
        [icx + 7, igy + bodyTopY - 9],
        [icx + 8, igy + bodyTopY],
        [icx - 8, igy + bodyTopY],
      ],
      chromeMid,
      chromeOut
    );
    px(ctx, icx - 5, igy + bodyTopY - 8, 10, 2, chromeHi);
    drawSculptedPoly(
      ctx,
      [
        [icx - 6, igy + bodyTopY - 14],
        [icx + 6, igy + bodyTopY - 14],
        [icx + 7, igy + bodyTopY - 9],
        [icx - 7, igy + bodyTopY - 9],
      ],
      '#ff4d3d',
      '#6b1616'
    );
    if (view === 'FRONT') {
      px(ctx, icx - 4, igy + bodyTopY - 12, 2, 2, '#1e293b');
      px(ctx, icx - 1, igy + bodyTopY - 12, 2, 2, '#1e293b');
      px(ctx, icx + 2, igy + bodyTopY - 12, 2, 2, '#1e293b');
    }
  }

  // Rear Wing / Spoiler silhouette
  if (isFunny || upgrades.chassis >= 2) {
    px(ctx, icx - roofHalfW + 1, igy + roofTopY - 5, 2, 6, trimOut);
    px(ctx, icx + roofHalfW - 3, igy + roofTopY - 5, 2, 6, trimOut);
    drawSculptedPoly(
      ctx,
      [
        [icx - halfW, igy + roofTopY - 7],
        [icx + halfW, igy + roofTopY - 7],
        [icx + halfW - 2, igy + roofTopY - 4],
        [icx - halfW + 2, igy + roofTopY - 4],
      ],
      trimDark,
      trimOut
    );
    px(ctx, icx - halfW + 2, igy + roofTopY - 6, (halfW - 2) * 2, 1, paintHi);
  }

  if (view === 'FRONT') {
    // Sculpted upper grille + recessed lower front air dam + intercooler
    drawSculptedPoly(
      ctx,
      [
        [icx - halfW + 5, igy - 18],
        [icx + halfW - 5, igy - 18],
        [icx + halfW - 7, igy - 13],
        [icx - halfW + 7, igy - 13],
      ],
      trimDark,
      trimOut
    );
    // Lower chin intake mouth
    drawSculptedPoly(
      ctx,
      [
        [icx - 14, igy - 11],
        [icx + 14, igy - 11],
        [icx + 12, igy - 7],
        [icx - 12, igy - 7],
      ],
      '#111623',
      trimOut
    );
    if (upgrades.induction >= 2) {
      px(ctx, icx - 11, igy - 10, 22, 3, chromeMid);
      px(ctx, icx - 10, igy - 10, 20, 1, chromeHi);
    }
    // Sculpted angled headlights with amber corner indicators
    drawSculptedPoly(
      ctx,
      [
        [icx - halfW + 4, igy - 18],
        [icx - halfW + 12, igy - 17],
        [icx - halfW + 11, igy - 13],
        [icx - halfW + 4, igy - 14],
      ],
      '#fef08a',
      chromeOut
    );
    drawSculptedPoly(
      ctx,
      [
        [icx + halfW - 12, igy - 17],
        [icx + halfW - 4, igy - 18],
        [icx + halfW - 4, igy - 14],
        [icx + halfW - 11, igy - 13],
      ],
      '#fef08a',
      chromeOut
    );
    px(ctx, icx - halfW + 6, igy - 16, 4, 2, '#ffffff');
    px(ctx, icx + halfW - 10, igy - 16, 4, 2, '#ffffff');
    px(ctx, icx - halfW + 4, igy - 15, 2, 2, '#fb923c');
    px(ctx, icx + halfW - 6, igy - 15, 2, 2, '#fb923c');
  } else {
    // Sculpted rear taillight panel + recessed license plate + diffuser + dual chrome exhausts
    px(ctx, icx - halfW + 5, igy - 18, (halfW - 5) * 2, 5, trimDark);
    drawSculptedPoly(
      ctx,
      [
        [icx - halfW + 4, igy - 19],
        [icx - halfW + 15, igy - 18],
        [icx - halfW + 14, igy - 14],
        [icx - halfW + 4, igy - 14],
      ],
      '#ff3b30',
      '#6e1414'
    );
    drawSculptedPoly(
      ctx,
      [
        [icx + halfW - 15, igy - 18],
        [icx + halfW - 4, igy - 19],
        [icx + halfW - 4, igy - 14],
        [icx + halfW - 14, igy - 14],
      ],
      '#ff3b30',
      '#6e1414'
    );
    px(ctx, icx - halfW + 6, igy - 17, 5, 2, '#ffb3a7');
    px(ctx, icx + halfW - 11, igy - 17, 5, 2, '#ffb3a7');
    // License plate
    pxBox(ctx, icx - 5, igy - 17, 10, 5, '#facc15', '#523c09');
    // Rear diffuser + twin exhaust tips
    px(ctx, icx - 16, igy - 9, 32, 3, trimDark);
    pxBox(ctx, icx - 15, igy - 9, 5, 3, chromeMid, chromeOut);
    pxBox(ctx, icx + 10, igy - 9, 5, 3, chromeMid, chromeOut);
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
