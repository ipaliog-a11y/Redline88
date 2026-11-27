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

/** Draw a curved wheel-arch cutout + raised fender lip flare hugging a wheel. */
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
  const archR = wheelR + 2;

  // Recessed dark wheel-well cavity (upper half-arch)
  for (let dy = -archR; dy <= 2; dy++) {
    const span = Math.floor(Math.sqrt(Math.max(0, (archR + 0.35) * (archR + 0.35) - dy * dy)));
    px(ctx, icx - span, icy + dy, span * 2 + 1, 1, '#111623');
  }

  // Sculpted fender flare rim highlight hugging the top of the arch
  for (let deg = 205; deg <= 335; deg += 8) {
    const rad = (deg * Math.PI) / 180;
    const fx = Math.round(icx + Math.cos(rad) * (archR + 1));
    const fy = Math.round(icy + Math.sin(rad) * (archR + 1));
    px(ctx, fx, fy, 1, 1, paintOut);
    const hx = Math.round(icx + Math.cos(rad) * (archR + 2));
    const hy = Math.round(icy + Math.sin(rad) * (archR + 2));
    px(ctx, hx, hy, 1, 1, paintHi);
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
  // Subtle red brake caliper peek inside larger rims
  if (rimR >= 5) {
    px(ctx, icx + Math.round(rimR * 0.35), icy - 2, 2, 3, '#dc2626');
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

  // Subtle launch pitch / squat pivot around the rear tire contact patch!
  if (Math.abs(pitchDeg) > 0.05 || Math.abs(squatPx) > 0.05) {
    ctx.translate(m.rearAxleX, 0);
    ctx.rotate((-pitchDeg * Math.PI) / 180);
    ctx.translate(-m.rearAxleX, Math.round(squatPx));
  }

  // ==================== 1. WHEELIE BAR (behind body & rear tire) ====================
  if (m.hasWheelieBar) {
    const barEnd = m.wheelieCasterX;
    const rearX = m.rearAxleX - 4;
    // Upper + lower tubular chromoly triangulated struts
    drawPixelLine(ctx, rearX, -15, barEnd, -4, '#94a3b8');
    drawPixelLine(ctx, rearX, -14, barEnd, -3, '#1e293b');
    drawPixelLine(ctx, rearX, -8, barEnd, -4, '#cbd5e1');
    drawPixelLine(ctx, rearX, -7, barEnd, -3, '#334155');
    // Vertical cross-brace
    px(ctx, Math.round((rearX + barEnd) * 0.5), -11, 2, 7, '#64748b');
    // Tiny hard-rubber caster wheel
    drawPixelDisc(ctx, barEnd, -3, 2, '#f59e0b', '#271e09');
    px(ctx, barEnd, -3, 1, 1, '#fef9c3');
  }

  // ==================== 2. SCULPTED REAL-LIFE CHASSIS BODIES ====================
  if (chassis === 'hatch') {
    const isCRX = bodyVariant === 'compact';
    const isGTI = bodyVariant === 'boxy';

    // Real-life Civic Si '86 / CRX '88 / Golf GTI Mk2 sculpted side profiles
    const bodyPts: Pt[] = isCRX
      ? [
          // CR-Pocket '88: Iconic sloping kammback glass coupe, super sleek tapered nose
          [-42, -9],
          [-43, -15],
          [-41, -21], // high chopped kammback tail
          [-26, -29], // long sloping fastback rear hatch glass
          [-9, -32], // curved roof peak
          [6, -31], // windshield header
          [20, -21], // sloped A-pillar base / cowl
          [38, -18], // gently sloping low hood
          [45, -14], // tapered front bumper nose
          [45, -9],
          [42, -7], // lower chin valance
          [-38, -7],
        ]
      : isGTI
      ? [
          // Euro GT-16V '85 (Golf GTI Mk2): Sporty rally hatch with raked windshield & distinct rear C-pillar
          [-41, -9],
          [-42, -16],
          [-38, -28], // crisp angled Euro hatchback tailgate
          [-28, -32], // roof rear
          [3, -32], // roof front
          [16, -21], // raked windshield cowl
          [36, -19], // sporty sloped hood
          [44, -16], // front grille header
          [44, -9],
          [41, -7],
          [-37, -7],
        ]
      : [
          // Civic GT '86 ('86 Honda Civic Si): Sleek long-roof wonder-hatch with raked windshield & sloped hood
          [-42, -9],
          [-43, -16],
          [-37, -28], // angled Civic Si hatchback glass
          [-27, -32], // roof rear
          [5, -32], // roof crown
          [19, -21], // raked 42-deg windshield
          [39, -18], // low sloping Honda hood
          [45, -14], // rounded aero nose bumper
          [45, -9],
          [42, -7],
          [-38, -7],
        ];

    drawPaintedBodyShell(ctx, bodyPts, paint, paintHi, paintShad, paintOut, {
      beltY: -20,
      lowerShadY: -11,
      stripe: visuals.stripe,
      stripeStartX: -39,
      stripeEndX: 40,
    });

    // Sculpted side glass greenhouse (sloped A-pillar + B-pillar + C-pillar)
    const winPts: Pt[] = isCRX
      ? [
          [-35, -21],
          [-25, -28],
          [-8, -30],
          [5, -29],
          [17, -21],
        ]
      : isGTI
      ? [
          [-34, -21],
          [-36, -26],
          [-27, -30],
          [2, -30],
          [13, -21],
        ]
      : [
          [-35, -21],
          [-33, -27],
          [-25, -30],
          [4, -30],
          [16, -21],
        ];
    drawSculptedWindow(ctx, winPts, paintOut, timeOfDay, isCRX ? [-11] : [-15, -2]);

    // Front & rear wraparound sporty dark bumpers + GTI red accent strip
    drawSculptedPoly(ctx, [[37, -11], [46, -11], [46, -8], [39, -7]], trimDark, trimOut);
    drawSculptedPoly(ctx, [[-43, -11], [-36, -11], [-36, -7], [-41, -7]], trimDark, trimOut);
    if (isGTI) {
      px(ctx, -42, -10, 6, 1, '#ff4d3d');
      px(ctx, 38, -10, 7, 1, '#ff4d3d');
      px(ctx, -18, -14, 34, 1, '#1e293b'); // classic side rub strip
    } else {
      // Side rub molding & rocker skirt
      px(ctx, -16, -12, 32, 2, trimDark);
      px(ctx, -16, -12, 32, 1, '#3b4a69');
    }

    // Door seam, flush handle, and A-pillar side mirror!
    px(ctx, -4, -19, 1, 10, paintOut);
    px(ctx, -10, -18, 4, 1, trimOut);
    px(ctx, -10, -17, 4, 1, paintHi);
    pxBox(ctx, isCRX ? 11 : 9, -23, 4, 3, paint, paintOut); // wing mirror

    // Subtle roof-edge hatch spoiler
    drawSculptedPoly(
      ctx,
      [
        [isCRX ? -43 : -41, isCRX ? -22 : -30],
        [isCRX ? -35 : -30, isCRX ? -22 : -32],
        [isCRX ? -35 : -30, isCRX ? -20 : -30],
        [isCRX ? -42 : -40, isCRX ? -20 : -28],
      ],
      trimDark,
      trimOut
    );

    // Recessed angled headlight + amber corner blinker + taillight cluster
    pxBox(ctx, 39, -17, 6, 4, '#fef08a', chromeOut);
    px(ctx, 41, -16, 3, 2, '#ffffff');
    px(ctx, 37, -15, 2, 2, '#fb923c'); // amber side marker
    pxBox(ctx, -43, -18, 5, 5, '#ff3b30', '#5e1414');
    px(ctx, -42, -17, 2, 2, '#fda4af');
    px(ctx, -42, -14, 2, 1, '#fb923c');

    // Bolt-on upgrades (intercooler, hood scoop, rear drag wing, exhaust)
    if (upgrades.induction >= 2) {
      pxBox(ctx, 41, -10, 5, 4, chromeMid, chromeOut);
      px(ctx, 42, -9, 3, 1, chromeHi);
    }
    if (upgrades.induction >= 3) {
      drawSculptedPoly(ctx, [[22, -21], [31, -22], [33, -19], [22, -19]], paintShad, paintOut);
      px(ctx, 31, -21, 2, 2, trimOut);
    }
    if (upgrades.chassis >= 2) {
      // Sleek aluminum street-drag wing on rear hatch
      px(ctx, -38, -32, 2, 4, trimOut);
      drawSculptedPoly(ctx, [[-47, -36], [-35, -34], [-35, -32], [-46, -33]], trimDark, trimOut);
      px(ctx, -45, -35, 9, 1, paintHi);
    }
    if (upgrades.chassis >= 3) {
      // Front carbon splitter
      px(ctx, 39, -7, 10, 2, trimOut);
      px(ctx, 42, -7, 6, 1, '#64748b');
    }
    // Exhaust tip
    pxBox(ctx, -45, -9, 5, 3, chromeMid, chromeOut);
    px(ctx, -44, -8, 3, 1, chromeHi);
  } else if (chassis === 'muscle') {
    const isFastback = bodyVariant === 'fastback';
    const isNotch = bodyVariant === 'notch';
    const isAero = bodyVariant === 'aero';

    // Real-life sculpted muscle silhouettes:
    // - standard: '84 IROC-Z Camaro (long low wedge nose, sweeping glass hatch)
    // - fastback: '70 Chevelle SS / '92 Viper (long sculpted hood, Coke-bottle rear haunch, sweeping fastback)
    // - notch: '87 Fox 5.0 / '87 Buick GNX / '68 Pro-Mod Nova (classic sculpted coupe roof & trunk deck)
    const bodyPts: Pt[] = isFastback
      ? [
          // Flowing muscular fastback ('70 Chevelle / Viper V10)
          [-53, -9],
          [-54, -17],
          [-51, -22], // upturned muscular tail lip
          [-38, -23], // raised Coke-bottle rear fender haunch
          [-26, -30], // sweeping fastback C-pillar
          [-13, -33], // curved coupe roof crown
          [4, -32], // windshield header
          [18, -22], // deeply raked windshield cowl
          [45, -19], // long muscular sloping hood
          [55, -15], // sculpted pointed front nose
          [55, -9],
          [51, -7], // recessed chin spoiler
          [-49, -7],
        ]
      : isNotch
      ? [
          // Sleek notchback drag coupe ('87 Fox 5.0 / '87 GNX / '68 Nova)
          [-52, -9],
          [-53, -17],
          [-51, -21], // crisp trunk deck edge
          [-31, -22], // rear trunk deck
          [-23, -32], // clean angled coupe C-pillar
          [-12, -33], // roof crown
          [6, -32], // windshield header
          [18, -22], // raked windshield cowl
          [44, -19], // sloped hood
          [54, -16], // front fascia
          [54, -9],
          [50, -7],
          [-48, -7],
        ]
      : isAero
      ? [
          // Aero Daytona/Superbird sloped nose cone muscle
          [-53, -9],
          [-54, -18],
          [-50, -22],
          [-35, -23],
          [-24, -31],
          [-10, -32],
          [6, -31],
          [20, -21],
          [48, -17],
          [58, -12], // aerodynamic pointed nose cone
          [55, -8],
          [-49, -7],
        ]
      : [
          // Classic '84 IROC-Z Camaro: Low pointed wedge nose + long sweeping rear hatch
          [-52, -9],
          [-54, -17],
          [-50, -21], // rear deck spoiler lip
          [-34, -24], // sweeping Camaro rear hatch glass
          [-16, -31], // sleek low roof
          [3, -31],
          [19, -21], // deeply raked windshield
          [46, -18], // long low Camaro hood
          [56, -13], // iconic recessed IROC pointed nose
          [54, -8],
          [49, -7],
          [-48, -7],
        ];

    drawPaintedBodyShell(ctx, bodyPts, paint, paintHi, paintShad, paintOut, {
      beltY: -21,
      lowerShadY: -11,
      stripe: visuals.stripe,
      stripeStartX: -50,
      stripeEndX: 49,
    });

    // Sculpted side glass greenhouse
    const winPts: Pt[] = isFastback
      ? [
          [-33, -23],
          [-24, -29],
          [-12, -31],
          [3, -30],
          [15, -22],
        ]
      : isNotch
      ? [
          [-28, -22],
          [-22, -30],
          [-11, -31],
          [4, -30],
          [15, -22],
        ]
      : [
          [-40, -22],
          [-32, -25],
          [-16, -29],
          [2, -29],
          [16, -21],
        ];
    drawSculptedWindow(ctx, winPts, paintOut, timeOfDay, isNotch ? [-7] : [-12, -1]);

    // Sculpted front chin air dam, rear diffuser valance & side rocker trim
    drawSculptedPoly(ctx, [[46, -9], [55, -9], [52, -6], [45, -7]], trimDark, trimOut);
    px(ctx, -20, -10, 42, 2, trimDark);
    px(ctx, -20, -10, 42, 1, '#3b4a69');

    // Muscular rear fender haunch highlight line + door seam & aero mirror
    drawPixelLine(ctx, -45, -20, -25, -21, paintHi);
    px(ctx, -5, -20, 1, 10, paintOut);
    px(ctx, -11, -19, 4, 1, trimOut);
    pxBox(ctx, 8, -24, 4, 3, paint, paintOut); // wing mirror

    // Subtle integrated rear decklip spoiler
    drawSculptedPoly(ctx, [[-55, -23], [-48, -22], [-48, -20], [-54, -20]], paintShad, paintOut);

    // Recessed quad/bar headlights + glowing amber marker + sculpted taillights
    pxBox(ctx, 49, -16, 6, 4, '#fef08a', chromeOut);
    px(ctx, 51, -15, 3, 2, '#ffffff');
    px(ctx, 45, -13, 3, 2, '#fb923c');
    pxBox(ctx, -54, -19, 6, 5, '#ff3b30', '#5e1414');
    px(ctx, -53, -18, 2, 2, '#fda4af');
    px(ctx, -53, -15, 2, 1, '#fb923c');

    // Bolt-on Induction: Cowl hood bulge (lvl 1-2) -> Towering Chrome 6-71 Blower (lvl 3+)
    if (upgrades.induction >= 3) {
      // Sculpted chrome supercharger rising cleanly from the long V8 hood
      drawSculptedPoly(ctx, [[22, -21], [23, -29], [36, -29], [37, -20]], chromeMid, chromeOut);
      px(ctx, 24, -27, 11, 2, chromeHi);
      px(ctx, 25, -24, 9, 1, chromeOut);
      px(ctx, 25, -22, 9, 1, chromeOut);
      // Red anodized butterfly injector scoop
      drawSculptedPoly(ctx, [[21, -33], [37, -34], [39, -30], [22, -29]], '#ff4d3d', '#6b1616');
      px(ctx, 24, -32, 11, 1, '#ffada6');
      px(ctx, 36, -32, 3, 2, '#1e293b'); // butterfly mouth
    } else if (upgrades.induction >= 1) {
      // Sleek cowl-induction power dome
      drawSculptedPoly(ctx, [[21, -23], [34, -21], [37, -19], [20, -20]], paintHi, paintOut);
      px(ctx, 20, -22, 2, 2, trimOut);
    }

    // Pro-Street aluminum drag spoiler on trunk deck
    if (upgrades.chassis >= 2) {
      drawSculptedPoly(ctx, [[-61, -24], [-47, -22], [-48, -20], [-60, -21]], chromeMid, chromeOut);
      px(ctx, -58, -23, 10, 1, chromeHi);
      drawPixelLine(ctx, -56, -21, -52, -16, chromeOut);
    }

    // Twin chrome exhaust tip / side dump
    pxBox(ctx, -56, -9, 6, 3, chromeMid, chromeOut);
    px(ctx, -55, -8, 4, 1, chromeHi);
  } else if (chassis === 'jdm') {
    const isWedge = bodyVariant === 'wedge';
    const isAero = bodyVariant === 'aero';

    // Real-life Japanese Sports Icons:
    // - wedge: '91 NSX / '88 RX-7 FC / '89 Prelude (ultra-low wedge nose, fighter canopy, side intake)
    // - aero: '93 Supra MK4 / '89 Corvette ZR (curvaceous bubble coupe, rounded bullet nose, iconic hoop wing)
    // - standard: '89 Skyline R32 GT-R (sleek sculpted GT coupe, twin-round tail, front intercooler mouth)
    const bodyPts: Pt[] = isWedge
      ? [
          // Ultra-low wedge exotic ('91 NSX / '88 RX-7 FC)
          [-51, -9],
          [-52, -17],
          [-49, -21], // crisp sculpted rear deck
          [-34, -22], // long mid-engine / hatch deck
          [-20, -29], // deeply raked rear canopy glass
          [-6, -30], // low sleek teardrop roof
          [8, -29],
          [23, -19], // super-raked fighter-jet windshield
          [46, -15], // razor-low wedge hood
          [55, -11], // pointed aerodynamic nose
          [54, -8],
          [49, -7],
          [-47, -7],
        ]
      : isAero
      ? [
          // Curvaceous aero GT ('93 Supra MK4 / '89 Corvette ZR)
          [-51, -9],
          [-52, -17],
          [-48, -21], // rounded Supra rear haunch
          [-35, -23],
          [-23, -30], // sweeping fastback rear glass
          [-9, -31], // smooth bubble roof crown
          [6, -30],
          [21, -20], // deeply raked windshield
          [45, -17], // sculpted curved long hood
          [55, -13], // rounded wind-tunnel nose
          [54, -8],
          [49, -7],
          [-47, -7],
        ]
      : [
          // Iconic '89 Skyline R32 GT-R coupe
          [-50, -9],
          [-51, -17],
          [-48, -21], // crisp R32 trunk edge
          [-33, -22],
          [-24, -31], // clean angled C-pillar
          [-10, -32], // curved roof
          [7, -31],
          [20, -21], // raked windshield
          [44, -18], // sleek sloping hood
          [54, -14], // sculpted GT-R front bumper nose
          [54, -8],
          [49, -7],
          [-46, -7],
        ];

    drawPaintedBodyShell(ctx, bodyPts, paint, paintHi, paintShad, paintOut, {
      beltY: -20,
      lowerShadY: -10,
      stripe: visuals.stripe,
      stripeStartX: -48,
      stripeEndX: 48,
    });

    // Sculpted side glass canopy
    const winPts: Pt[] = isWedge
      ? [
          [-28, -21],
          [-19, -27],
          [-5, -28],
          [7, -27],
          [20, -19],
        ]
      : isAero
      ? [
          [-34, -22],
          [-22, -28],
          [-8, -29],
          [5, -28],
          [18, -20],
        ]
      : [
          [-30, -22],
          [-23, -29],
          [-9, -30],
          [6, -29],
          [17, -21],
        ];
    drawSculptedWindow(ctx, winPts, paintOut, timeOfDay, isWedge ? [-2] : [-8]);

    // Front bumper intercooler mouth + aero side skirt + sculpted side vent (on wedge)
    drawSculptedPoly(ctx, [[45, -11], [54, -11], [53, -7], [46, -7]], trimDark, trimOut);
    if (upgrades.induction >= 1) {
      // Gleaming front-mount intercooler core tucked inside front bumper air dam!
      px(ctx, 47, -10, 6, 3, chromeMid);
      px(ctx, 48, -10, 4, 1, chromeHi);
      px(ctx, 48, -8, 4, 1, chromeOut);
    }
    px(ctx, -20, -9, 42, 2, trimDark);
    if (isWedge) {
      // Mid-engine / RX-7 sculpted side air scoop behind door
      drawSculptedPoly(ctx, [[-17, -17], [-9, -18], [-10, -13], [-18, -13]], trimDark, paintOut);
      px(ctx, -16, -16, 5, 1, '#475569');
    }

    // Door seam, flush handle, and sleek aero teardrop mirror
    px(ctx, -3, -19, 1, 9, paintOut);
    px(ctx, -9, -18, 4, 1, trimOut);
    pxBox(ctx, 10, -23, 4, 3, paint, paintOut);

    // Sculpted headlights (sleek flush aero lens or pop-up seam on wedge) + iconic taillights
    if (isWedge) {
      // Pop-up headlight seam + lower bumper fog/running light
      drawPixelLine(ctx, 41, -16, 48, -15, paintOut);
      pxBox(ctx, 48, -13, 6, 3, '#e0f2fe', chromeOut);
      px(ctx, 50, -12, 3, 1, '#ffffff');
    } else {
      drawSculptedPoly(ctx, [[46, -16], [54, -14], [54, -12], [46, -13]], '#e0f2fe', chromeOut);
      px(ctx, 48, -14, 4, 1, '#ffffff');
    }
    pxBox(ctx, -52, -18, 6, 4, '#ff3b30', '#5e1414');
    px(ctx, -51, -17, 2, 2, '#fda4af');
    px(ctx, -48, -17, 1, 2, '#ff8073'); // twin-lamp hint

    // Iconic curved Supra hoop wing (aero) / GT-R factory wing (standard) / Carbon GT wing (upgraded)
    if (upgrades.chassis >= 2) {
      // High-downforce carbon GT wing on twin aluminum uprights
      px(ctx, -46, -32, 2, 11, trimOut);
      px(ctx, -45, -31, 1, 9, chromeMid);
      drawSculptedPoly(ctx, [[-56, -35], [-42, -33], [-42, -31], [-55, -32]], trimDark, trimOut);
      px(ctx, -54, -34, 10, 1, '#94a3b8');
    } else if (isAero) {
      // Iconic curved Mk4 Supra / Corvette hoop wing
      drawSculptedPoly(ctx, [[-51, -26], [-43, -27], [-41, -21], [-44, -21], [-45, -24], [-50, -24]], paint, paintOut);
      px(ctx, -50, -25, 6, 1, paintHi);
    } else {
      // Sleek factory R32 / NSX rear spoiler
      drawSculptedPoly(ctx, [[-52, -24], [-42, -23], [-42, -21], [-51, -22]], paint, paintOut);
      px(ctx, -50, -23, 7, 1, paintHi);
    }

    if (upgrades.chassis >= 3) {
      // Carbon front splitter lip
      px(ctx, 47, -7, 10, 2, trimOut);
      px(ctx, 50, -7, 6, 1, '#64748b');
    }
    // Titanium cannon exhaust tip
    pxBox(ctx, -55, -9, 6, 3, chromeMid, chromeOut);
    px(ctx, -54, -8, 2, 1, '#60a5fa'); // titanium heat-blued tip!
  } else if (chassis === 'funny') {
    const isWedge = bodyVariant === 'wedge';
    const isNotch = bodyVariant === 'notch';
    const isAero = bodyVariant === 'aero';

    // Real NHRA Nitro Funny Car / Carbon Pro-Mod Flip-Body:
    // Massive long tapering bullet nose, curved wheel blisters, swept laid-back canopy,
    // integrated spill-plate rear drag wing, and sculpted fender line.
    const bodyPts: Pt[] = isNotch
      ? [
          // Outlaw Pro-Mod Z: Sleek extended-nose carbon door-slammer with rear trunk deck
          [-58, -11],
          [-57, -23], // tall integrated spill-plate rear spoiler
          [-45, -23],
          [-34, -24],
          [-23, -32], // fastback-Pro-Mod roofline
          [-7, -33],
          [8, -30], // deeply laid-back windshield
          [24, -21],
          [55, -16], // extended carbon aerodynamic nose
          [66, -10], // low ground-scraping splitter tip
          [65, -6],
          [54, -6],
          [-54, -7],
        ]
      : [
          // Authentic NHRA Nitro Funny Car sweeping teardrop flip-body
          [-58, -11],
          [-59, -27], // iconic high integrated rear spill-plate wing
          [-48, -26],
          [-32, -28], // smooth sweeping aerodynamic tail deck
          [-16, -33], // low laid-back teardrop roof
          [0, -32],
          [16, -22], // ultra-raked windshield
          [48, isWedge ? -15 : -17], // razor-long sloped carbon nose
          [66, isAero ? -9 : -10], // bullet-pointed chin nose
          [65, -6],
          [52, -6],
          [-53, -7],
        ];

    drawPaintedBodyShell(ctx, bodyPts, paint, paintHi, paintShad, paintOut, {
      beltY: -22,
      lowerShadY: -11,
      stripe: visuals.stripe,
      stripeStartX: -54,
      stripeEndX: 56,
    });

    // Ultra-raked Funny Car lexan cockpit side window + carbon spill-plate trim
    const winPts: Pt[] = isNotch
      ? [
          [-26, -24],
          [-19, -30],
          [-6, -31],
          [6, -28],
          [18, -22],
        ]
      : [
          [-28, -24],
          [-15, -31],
          [-1, -30],
          [13, -22],
        ];
    drawSculptedWindow(ctx, winPts, paintOut, timeOfDay, [-6]);

    // Rear spill-plate carbon side panel & aluminum flap
    drawSculptedPoly(ctx, [[-59, -27], [-48, -26], [-50, -21], [-58, -21]], trimDark, trimOut);
    px(ctx, -58, -26, 9, 1, chromeMid);

    // Sculpted carbon chin ground-effects skirt
    px(ctx, -20, -8, 46, 2, trimOut);
    px(ctx, 54, -7, 13, 2, trimOut);
    px(ctx, 56, -7, 10, 1, '#64748b');

    // Painted decoy headlight decal on carbon nose (classic NHRA Funny Car detail!)
    drawSculptedPoly(ctx, [[54, -14], [63, -11], [62, -9], [54, -11]], '#e2e8f0', chromeOut);
    px(ctx, 56, -12, 4, 1, '#ffffff');

    // Towering Chrome 14-71 Nitro Blower & Triple-Butterfly Hat rising out of the sloped nose!
    drawSculptedPoly(ctx, [[22, -20], [23, -31], [37, -31], [38, -19]], chromeMid, chromeOut);
    px(ctx, 24, -29, 12, 2, chromeHi);
    px(ctx, 25, -26, 10, 1, chromeOut);
    px(ctx, 25, -23, 10, 1, chromeOut);
    // Anodized injector scoop hat
    drawSculptedPoly(ctx, [[21, -35], [38, -36], [40, -32], [22, -31]], '#ff4d3d', '#6b1616');
    px(ctx, 24, -34, 12, 1, '#ffb3ab');
    px(ctx, 37, -34, 3, 2, '#1e293b');

    // Iconic 4-pipe swept chrome nitro zoomie headers poking cleanly out of the side fender cutout!
    pxBox(ctx, 9, -18, 17, 7, '#141926', trimOut);
    for (let z = 0; z < 4; z++) {
      const zx = 11 + z * 4;
      drawPixelLine(ctx, zx + 2, -13, zx - 2, -18, chromeOut);
      drawPixelLine(ctx, zx + 1, -13, zx - 3, -18, chromeMid);
      px(ctx, zx - 3, -18, 2, 1, chromeHi);
    }
  } else {
    // ==================== TOP FUEL DRAGSTER (Real 300" Tapered Needle Rail!) ====================
    const isSlingshot = bodyVariant === 'slingshot';
    const isCanopy = bodyVariant === 'canopy';
    const isTwin = bodyVariant === 'twin';

    // Tall Twin-Strut Rear Downforce Wing with Sculpted Curved Carbon Endplates
    drawPixelLine(ctx, -56, -24, -62, -41, chromeOut);
    drawPixelLine(ctx, -55, -24, -61, -41, chromeMid);
    drawPixelLine(ctx, -47, -24, -52, -40, chromeOut);
    drawPixelLine(ctx, -46, -24, -51, -40, chromeMid);
    // Sculpted wing endplate & dual airfoil blades
    drawSculptedPoly(
      ctx,
      [
        [-68, -44],
        [-47, -41],
        [-48, -34],
        [-65, -35],
      ],
      paint,
      paintOut
    );
    px(ctx, -66, -42, 17, 2, paintHi);
    px(ctx, -64, -37, 14, 2, trimDark);

    // Continuous Smoothly-Tapered Razor Needle Fuselage (from rear cowl all the way to x=84 tip!)
    const bodyPts: Pt[] = [
      [-64, -10],
      [-64, -22], // rear engine cowling
      [-34, -22], // sidepod shoulder
      [-10, -21], // cockpit cowling
      [20, -16], // smooth tapered upper fuselage
      [54, -11], // razor needle taper
      [84, -7], // sharp aerodynamic needle tip
      [82, -5],
      [52, -6],
      [-58, -7],
    ];
    drawPaintedBodyShell(ctx, bodyPts, paint, paintHi, paintShad, paintOut, {
      beltY: -18,
      lowerShadY: -9,
      stripe: visuals.stripe,
      stripeStartX: -60,
      stripeEndX: 74,
    });

    // Exposed Billet Nitro Hemi Engine(s) + 14-71 Supercharger(s) + Swept Vertical Headers
    const drawHemiEngine = (ex: number) => {
      // Billet aluminum Hemi block & valve cover
      drawSculptedPoly(ctx, [[ex - 9, -21], [ex - 8, -28], [ex + 8, -28], [ex + 9, -21]], '#94a3b8', chromeOut);
      px(ctx, ex - 7, -27, 14, 2, chromeHi);
      // Chrome blower & injector hat
      drawSculptedPoly(ctx, [[ex - 7, -28], [ex - 6, -35], [ex + 7, -35], [ex + 8, -28]], chromeMid, chromeOut);
      px(ctx, ex - 5, -34, 10, 2, chromeHi);
      drawSculptedPoly(ctx, [[ex - 6, -38], [ex + 8, -39], [ex + 10, -35], [ex - 5, -35]], '#ff4d3d', '#6b1616');
      px(ctx, ex - 4, -37, 11, 1, '#ffb3ab');
      px(ctx, ex + 8, -37, 2, 2, '#1e293b');
      // 4 angled vertical chrome nitro header pipes!
      for (let h = 0; h < 4; h++) {
        const hx = ex - 6 + h * 4;
        drawPixelLine(ctx, hx + 1, -22, hx - 3, -29, chromeOut);
        drawPixelLine(ctx, hx, -22, hx - 4, -29, chromeMid);
        px(ctx, hx - 4, -29, 2, 1, chromeHi);
      }
    };

    if (isSlingshot) {
      // Front-engine cacklefest slingshot: Hemi sits AHEAD of the cockpit!
      drawHemiEngine(10);
      // Rear-mounted roll cage & driver helmet right behind rear slicks
      drawPixelLine(ctx, -36, -21, -28, -32, chromeOut);
      drawPixelLine(ctx, -28, -32, -16, -32, chromeMid);
      drawPixelLine(ctx, -16, -32, -10, -21, chromeOut);
      drawPixelDisc(ctx, -23, -25, 4, '#f8fafc', '#1e293b');
      px(ctx, -22, -26, 4, 2, '#38bdf8');
    } else if (isTwin) {
      // Dual-Blower Twin-Hemi Goliath!
      drawHemiEngine(-36);
      drawHemiEngine(-14);
      // Forward cockpit behind sleek windscreen
      drawPixelLine(ctx, -2, -20, 6, -30, chromeMid);
      drawPixelLine(ctx, 6, -30, 17, -29, chromeMid);
      drawPixelLine(ctx, 17, -29, 24, -17, chromeOut);
      drawPixelDisc(ctx, 11, -24, 4, '#f8fafc', '#1e293b');
      px(ctx, 12, -25, 4, 2, '#facc15');
    } else {
      // Modern rear-engine Top Fuel dragster (standard open cage OR fighter-jet canopy)
      drawHemiEngine(-32);
      if (isCanopy) {
        // Sleek sculpted fighter-jet enclosed lexan canopy!
        drawSculptedWindow(
          ctx,
          [
            [-18, -21],
            [-11, -30],
            [6, -29],
            [26, -16],
          ],
          paintOut,
          timeOfDay,
          [2]
        );
        // Subtle helmet silhouette inside canopy
        drawPixelDisc(ctx, -4, -24, 3, '#e2e8f0', '#1e3a5f');
      } else {
        // Chromoly roll cage + helmeted driver + angled lexan windscreen
        drawPixelLine(ctx, -18, -21, -10, -31, chromeMid);
        drawPixelLine(ctx, -10, -31, 4, -30, chromeMid);
        drawPixelLine(ctx, 4, -30, 14, -18, chromeOut);
        drawPixelDisc(ctx, -3, -25, 4, '#f8fafc', '#1e293b');
        px(ctx, -2, -26, 4, 2, '#38bdf8');
        // Swept windscreen fairing
        drawSculptedPoly(ctx, [[4, -25], [17, -18], [13, -17], [3, -21]], '#7cc9f7', chromeOut);
      }
    }

    // Front Canard Aero Wing mounted cleanly above tiny front wire runners!
    drawSculptedPoly(ctx, [[56, -14], [70, -12], [69, -10], [56, -11]], paint, paintOut);
    px(ctx, 57, -13, 11, 1, paintHi);
    px(ctx, 62, -11, 2, 5, chromeOut); // front axle strut
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
      const baseY = chassis === 'topfuel' ? -29 : -18;
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
    const tireW = isRear ? 13 : 5;
    const tireH = isRear ? 26 : 13;
    const trackHalf = isRear ? 23 : 20;

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
  const bodyTopY = isFunny ? -22 : isHatch ? -23 : isJdm ? -21 : -23;
  const roofTopY = isFunny ? -33 : isHatch ? -37 : isJdm ? -33 : -35;
  const tireW = view === 'REAR' && (upgrades.tires >= 2 || isFunny) ? 10 : 7;
  const tireH = isFunny ? 16 : 13;

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
 * Neo-Geo Paddock 1994 Hi-Res Pit Garage Dyno Bay:
 * Open twin rolled-up garage doors revealing sunlit checkered paddock walls, corrugated steel back wall,
 * overhead I-beam gantry, wall AC unit, nitro fuel drum, rolling red tool chest, floor tie-down straps,
 * spinning steel dyno rollers, and crisp wet-floor pixel reflection!
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

  const floorY = Math.round(h * 0.72);
  const doorW = Math.round(w * 0.14);

  // Brushed gunmetal corrugated workshop back wall
  const wallGrad = ctx.createLinearGradient(0, 0, 0, floorY);
  wallGrad.addColorStop(0, '#3a404f');
  wallGrad.addColorStop(0.55, '#4b5263');
  wallGrad.addColorStop(1, '#313542');
  ctx.fillStyle = wallGrad;
  ctx.fillRect(0, 0, w, floorY);

  // Subtle vertical corrugated wall ribs
  for (let rx = doorW + 8; rx < w - doorW - 8; rx += 16) {
    px(ctx, rx, 14, 1, floorY - 26, '#5c6478');
    px(ctx, rx + 1, 14, 1, floorY - 26, '#282c38');
  }

  // Overhead Steel I-Beam Gantry & Conduit Pipe
  px(ctx, 0, 0, w, 14, '#252833');
  px(ctx, 0, 12, w, 2, '#141218');
  px(ctx, 0, 3, w, 2, '#6c758a');
  px(ctx, doorW, 18, w - doorW * 2, 3, '#6c758a');
  px(ctx, doorW, 21, w - doorW * 2, 1, '#141218');

  // Left & Right Open Rolled-Up Garage Doors showing warm checkered paddock daylight!
  for (const side of [0, 1]) {
    const dx = side === 0 ? 0 : w - doorW;
    // Warm sunlit checkered paddock backdrop outside
    px(ctx, dx, 14, doorW, floorY - 14, '#f4ecd8');
    const sq = 10;
    for (let cy = 14; cy < floorY; cy += sq) {
      for (let cx = dx; cx < dx + doorW; cx += sq) {
        const isAlt = (Math.floor((cx - dx) / sq) + Math.floor((cy - 14) / sq)) % 2 === 0;
        if (isAlt) px(ctx, cx, cy, Math.min(sq, dx + doorW - cx), Math.min(sq, floorY - cy), '#e5d9bc');
      }
    }
    // Rolled-up corrugated steel door shutter at top of doorway
    px(ctx, dx, 14, doorW, 14, '#474e5e');
    for (let sy = 16; sy < 27; sy += 3) {
      px(ctx, dx, sy, doorW, 1, '#6f788c');
      px(ctx, dx, sy + 1, doorW, 1, '#262933');
    }
    px(ctx, dx, 27, doorW, 2, '#141218');
    // Steel doorway jamb frame
    const jambX = side === 0 ? doorW - 4 : dx;
    px(ctx, jambX, 14, 4, floorY - 14, '#2c303d');
    px(ctx, side === 0 ? jambX : jambX + 3, 14, 1, floorY - 14, '#141218');
    px(ctx, side === 0 ? jambX + 2 : jambX + 1, 14, 1, floorY - 14, '#7d8699');
  }

  // Lower workshop wainscot & Neo-Geo vermilion/marigold racing stripe
  px(ctx, doorW, floorY - 22, w - doorW * 2, 4, '#e83b24');
  px(ctx, doorW, floorY - 18, w - doorW * 2, 3, '#f7b519');
  px(ctx, doorW, floorY - 15, w - doorW * 2, 15, '#242630');
  px(ctx, doorW, floorY - 23, w - doorW * 2, 1, '#141218');

  // Wall-mounted AC unit (upper right of back wall)
  const acX = Math.round(w * 0.62);
  pxBox(ctx, acX, 26, 44, 15, '#cfd6e0', '#141218');
  px(ctx, acX + 2, 28, 40, 2, '#ffffff');
  px(ctx, acX + 4, 35, 36, 3, '#3b414f');
  px(ctx, acX + 36, 31, 3, 2, '#2ee66b');

  // Red 55-Gallon Nitro Fuel Drum (back-left inside bay)
  const drumX = doorW + 14;
  pxBox(ctx, drumX, floorY - 30, 20, 30, '#d9331e', '#141218');
  px(ctx, drumX + 2, floorY - 28, 4, 26, '#ff6852');
  px(ctx, drumX + 1, floorY - 21, 18, 2, '#8c1d10');
  px(ctx, drumX + 1, floorY - 11, 18, 2, '#8c1d10');
  px(ctx, drumX + 6, floorY - 18, 8, 5, '#f7b519');

  // Red Mechanic Rolling Tool Chest (back-right inside bay)
  const chestX = w - doorW - 60;
  pxBox(ctx, chestX, floorY - 32, 46, 32, '#c92a2a', '#141218');
  px(ctx, chestX + 2, floorY - 30, 42, 3, '#ff6b57');
  for (let d = 0; d < 4; d++) {
    const dy = floorY - 25 + d * 6;
    px(ctx, chestX + 4, dy, 38, 4, '#9e1c1c');
    px(ctx, chestX + 14, dy + 1, 18, 2, '#e2e8f0');
  }

  // Warm Asphalt-Concrete Dyno Floor + Hazard Curb Line
  px(ctx, 0, floorY, w, h - floorY, '#595d69');
  px(ctx, 0, floorY, w, 2, '#141218');
  px(ctx, 0, floorY + 2, w, 2, '#858b9c');
  // Recessed dark steel dyno pit bed
  const pitLeft = Math.round(w * 0.16);
  const pitW = Math.round(w * 0.68);
  pxBox(ctx, pitLeft, floorY + 6, pitW, h - floorY - 14, '#24232c', '#141218');
  px(ctx, pitLeft + 2, floorY + 8, pitW - 4, 2, '#3d3c4a');

  // Bottom brushed-steel floor edge trim
  px(ctx, 0, h - 6, w, 2, '#141218');
  px(ctx, 0, h - 4, w, 4, '#26232e');

  const carCenterX = Math.round(w * 0.5);
  const carGroundY = floorY + 15;
  const m = getHiBitCarMetrics(chassis, upgrades);
  const scale =
    w >= 460
      ? chassis === 'topfuel'
        ? 1.75
        : chassis === 'funny'
        ? 2.0
        : 2.2
      : chassis === 'topfuel'
      ? 1.55
      : chassis === 'funny'
      ? 1.75
      : 1.95;

  // Spinning steel dyno rollers recessed under rear tire!
  const rearScreenX = Math.round(carCenterX + m.rearAxleX * scale);
  pxBox(ctx, rearScreenX - 20, carGroundY - 3, 40, 8, '#6e7687', '#141218');
  const rollShift = Math.floor(timeSec * 26) % 6;
  for (let rx = -16 + rollShift; rx < 17; rx += 6) {
    px(ctx, rearScreenX + rx, carGroundY - 2, 2, 6, '#e8eef7');
  }

  // Red Dyno Tie-Down Straps anchored from floor hooks to chassis
  drawPixelLine(ctx, pitLeft + 10, carGroundY + 2, rearScreenX - 16, carGroundY - 6, '#e83b24');
  drawPixelLine(
    ctx,
    pitLeft + pitW - 10,
    carGroundY + 2,
    Math.round(carCenterX + m.frontAxleX * scale) + 14,
    carGroundY - 6,
    '#e83b24'
  );
  pxBox(ctx, pitLeft + 7, carGroundY, 6, 4, '#b8c0cc', '#141218');
  pxBox(ctx, pitLeft + pitW - 13, carGroundY, 6, 4, '#b8c0cc', '#141218');

  // Crisp Wet-Floor Inverted Pixel Reflection beneath car!
  ctx.save();
  ctx.beginPath();
  ctx.rect(pitLeft + 2, carGroundY, pitW - 4, h - carGroundY - 8);
  ctx.clip();
  ctx.globalAlpha = 0.25;
  ctx.translate(carCenterX, carGroundY + 2);
  ctx.scale(scale, -scale * 0.52);
  drawHiBitCarProfile({
    ctx,
    x: 0,
    groundY: 0,
    chassis,
    bodyVariant,
    visuals,
    upgrades,
    wheelAngle: timeSec * 8.0,
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
    wheelAngle: timeSec * 8.0,
    exhaustFlame: Math.sin(timeSec * 5.2) > 0.88 ? 0.35 : 0,
    timeOfDay: 'afternoon',
    simTime: timeSec,
  });
  ctx.restore();
}

/**
 * 4-Angle Neo-Geo Arcade Showroom Turntable (340×180 logical pixels):
 * Rotates cleanly across SIDE R -> FRONT -> SIDE L -> REAR on a brushed-chrome & marigold stage!
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

  // Warm Charcoal Neo-Geo Arcade Stage Backdrop
  const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
  bgGrad.addColorStop(0, '#141218');
  bgGrad.addColorStop(0.62, '#24202b');
  bgGrad.addColorStop(1, '#121016');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  // Subtle horizontal checkered racing banner across back showroom wall
  const bannerY = 26;
  px(ctx, 0, bannerY - 2, w, 2, '#e83b24');
  px(ctx, 0, bannerY + 16, w, 2, '#f7b519');
  const sq = 8;
  for (let cy = bannerY; cy < bannerY + 16; cy += sq) {
    for (let cx = 0; cx < w; cx += sq) {
      const alt = (Math.floor(cx / sq) + Math.floor((cy - bannerY) / sq)) % 2 === 0;
      px(ctx, cx, cy, sq, sq, alt ? '#2e2938' : '#1b1822');
    }
  }

  // Crisp arcade spotlight cones (warm gold + cyan accent, zero blur)
  ctx.fillStyle = 'rgba(247, 181, 25, 0.09)';
  ctx.beginPath();
  ctx.moveTo(w * 0.22, 0);
  ctx.lineTo(w * 0.4, 0);
  ctx.lineTo(w * 0.56, h * 0.78);
  ctx.lineTo(w * 0.12, h * 0.78);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = 'rgba(25, 212, 230, 0.06)';
  ctx.beginPath();
  ctx.moveTo(w * 0.6, 0);
  ctx.lineTo(w * 0.78, 0);
  ctx.lineTo(w * 0.88, h * 0.78);
  ctx.lineTo(w * 0.44, h * 0.78);
  ctx.closePath();
  ctx.fill();

  // Showroom horizon floor
  const padY = Math.round(h * 0.74);
  px(ctx, 0, padY - 10, w, 2, '#525866');
  px(ctx, 0, padY - 8, w, h - padY + 8, '#1a1820');

  // Illuminated Brushed-Chrome & Marigold Pixel Turntable Drum
  const cx = Math.round(w * 0.5);
  const padRx = Math.round(w * 0.42);
  const padRy = 18;

  ctx.fillStyle = '#09080c';
  ctx.beginPath();
  ctx.ellipse(cx, padY + 7, padRx + 3, padRy + 2, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#525866';
  ctx.beginPath();
  ctx.ellipse(cx, padY + 4, padRx, padRy, 0, 0, Math.PI * 2);
  ctx.fill();

  // Racing marigold outer turntable ring
  ctx.fillStyle = '#f7b519';
  ctx.beginPath();
  ctx.ellipse(cx, padY, padRx, padRy, 0, 0, Math.PI * 2);
  ctx.fill();

  // Inner dark asphalt turntable top surface
  ctx.fillStyle = '#1f1c26';
  ctx.beginPath();
  ctx.ellipse(cx, padY, padRx - 4, padRy - 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Rotating turntable degree tick marks around rim!
  for (let i = 0; i < 12; i++) {
    const a = angleRad + (i / 12) * Math.PI * 2;
    const tx = cx + Math.cos(a) * (padRx - 8);
    const ty = padY + Math.sin(a) * (padRy - 5);
    px(ctx, tx - 1, ty, 3, 1, i % 3 === 0 ? '#19d4e6' : '#8f98a8');
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
