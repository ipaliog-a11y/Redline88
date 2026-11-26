import {
  BodyVariant,
  CarUpgrades,
  CarVisuals,
  ChassisStyle,
  EnvironmentTheme,
} from '../types/game';

export const LOGICAL_W = 640;
export const LOGICAL_H = 360;
export const START_LINE_X = 128;
export const PX_PER_FT = 4.2;
export const RIVAL_LANE_Y = 248;
export const PLAYER_LANE_Y = 308;
export const TREE_X_OFFSET = 58;
export const TREE_BASE_Y = 266;

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return [217, 56, 41];
  const n = parseInt(clean, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function shadeHex(hex: string, factor: number): string {
  const [r, g, b] = hexToRgb(hex);
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return `rgb(${clamp(r * factor)}, ${clamp(g * factor)}, ${clamp(b * factor)})`;
}

function liftHex(hex: string, add: number): string {
  const [r, g, b] = hexToRgb(hex);
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return `rgb(${clamp(r + add)}, ${clamp(g + add)}, ${clamp(b + add)})`;
}

function px(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string
) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function fillPoly(
  ctx: CanvasRenderingContext2D,
  pts: [number, number][],
  fill: string,
  stroke?: string,
  strokeWidth = 1.25
) {
  if (pts.length < 3) return;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) {
    ctx.lineTo(pts[i][0], pts[i][1]);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = strokeWidth;
    ctx.lineJoin = 'round';
    ctx.stroke();
  }
}

function drawLine(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  width = 1
) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function fillCircle(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  fill: string,
  stroke?: string,
  strokeWidth = 1
) {
  ctx.beginPath();
  ctx.arc(cx, cy, Math.max(0.5, r), 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = strokeWidth;
    ctx.stroke();
  }
}

export interface PixelCarDrawOptions {
  x: number;
  y: number; // ground baseline Y
  scale?: number;
  chassis: ChassisStyle;
  bodyVariant?: BodyVariant;
  visuals: CarVisuals;
  upgrades: CarUpgrades;
  wheelAngle: number;
  pitchDeg: number; // negative = nose up wheelie
  squatPx: number;
  exhaustFlame: number; // 0..1
  nitrousFlame: number; // 0..1
  chuteOpen?: number; // 0..1
  dimmed?: boolean;
}

/**
 * True circular high-detail arcade wheel & wrinkle-wall drag slick renderer.
 * Supports 4 custom rims, brake rotor & caliper, rotating sidewall lettering,
 * beadlock bolts, and wrinkle-wall compression lines.
 */
function drawWheel(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  rims: CarVisuals['rims'],
  angle: number,
  isSlick: boolean,
  isSkinnyRail = false
) {
  ctx.save();
  ctx.translate(cx, cy);

  // 1. Tire Outer Circumference (100% round with crisp dark outline)
  fillCircle(ctx, 0, 0, radius, '#15151e', '#07060c', 1.25);

  // 2. Subtle rubber sidewall radial depth ring
  fillCircle(ctx, 0, 0, radius - 1.3, '#222230');
  fillCircle(ctx, 0, 0, radius - 2.6, '#171721');

  // Top rubber specular arc highlight
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(0, 0, radius - 1.2, -Math.PI * 0.82, -Math.PI * 0.18);
  ctx.stroke();

  const rimR = isSkinnyRail
    ? radius * 0.72
    : isSlick
    ? radius * 0.52
    : radius * 0.62;

  // 3. Drag Slick Wrinkle-Wall Ribbing + Rotating White/Yellow Lettering
  if (isSlick && radius >= 10) {
    const midR = (radius + rimR) * 0.52;
    // Wrinkle-wall flex ripples
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 10; i++) {
      const a = angle + (i * Math.PI * 2) / 10;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * (rimR + 1.2), Math.sin(a) * (rimR + 1.2));
      ctx.lineTo(Math.cos(a + 0.18) * (radius - 1.8), Math.sin(a + 0.18) * (radius - 1.8));
      ctx.stroke();
    }

    // Crisp rotating drag slick sidewall lettering arcs (2 opposing logos)
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = radius >= 14 ? 1.8 : 1.3;
    ctx.setLineDash([2.2, 1.5]);
    ctx.beginPath();
    ctx.arc(0, 0, midR, angle - 0.52, angle + 0.52);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, midR, angle + Math.PI - 0.52, angle + Math.PI + 0.52);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // 4. Recessed Brake Rotor + Red Caliper (for street/performance rims)
  fillCircle(ctx, 0, 0, rimR + 0.6, '#0c0c12');
  if (!isSkinnyRail && rims !== 'steel' && rimR >= 5) {
    fillCircle(ctx, 0, 0, rimR * 0.78, '#475569');
    fillCircle(ctx, 0, 0, rimR * 0.64, '#64748b');
    // Red performance brake caliper on left/rear side
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = Math.max(1.8, rimR * 0.28);
    ctx.beginPath();
    ctx.arc(0, 0, rimR * 0.72, Math.PI * 0.72, Math.PI * 1.28);
    ctx.stroke();
  }

  // 5. Outer Metallic Rim Lip / Dish
  const lipColor =
    rims === 'gold'
      ? '#f1f5f9'
      : rims === 'chrome'
      ? '#f8fafc'
      : rims === 'prostar'
      ? '#e2e8f0'
      : '#64748b';
  const faceColor =
    rims === 'gold'
      ? '#eab308'
      : rims === 'chrome'
      ? '#cbd5e1'
      : rims === 'prostar'
      ? '#f1f5f9'
      : '#475569';
  const darkColor =
    rims === 'gold'
      ? '#854d0e'
      : rims === 'chrome'
      ? '#475569'
      : rims === 'prostar'
      ? '#334155'
      : '#1e293b';

  ctx.strokeStyle = lipColor;
  ctx.lineWidth = Math.max(1.4, rimR * 0.22);
  ctx.beginPath();
  ctx.arc(0, 0, rimR - 0.6, 0, Math.PI * 2);
  ctx.stroke();

  // 6. Rotating Wheel Spokes / Holes
  ctx.save();
  ctx.rotate(angle);

  if (isSkinnyRail) {
    // Ultra-lightweight Top Fuel spoked front rail wheel
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 0.9;
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI * 2) / 8;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * (rimR - 1), Math.sin(a) * (rimR - 1));
      ctx.stroke();
    }
    fillCircle(ctx, 0, 0, Math.max(1.6, rimR * 0.34), '#cbd5e1', '#1e293b', 0.8);
  } else if (rims === 'prostar') {
    // Authentic Weld Pro-Star polished billet dish with 5 circular drag holes + beadlock bolts
    fillCircle(ctx, 0, 0, rimR - 1.2, faceColor, darkColor, 0.8);
    const holeDist = rimR * 0.54;
    const holeR = Math.max(1.1, rimR * 0.2);
    for (let i = 0; i < 5; i++) {
      const a = (i * Math.PI * 2) / 5;
      fillCircle(ctx, Math.cos(a) * holeDist, Math.sin(a) * holeDist, holeR, '#0f172a');
    }
    // Beadlock perimeter bolts on drag slicks
    if (isSlick) {
      for (let i = 0; i < 12; i++) {
        const a = (i * Math.PI * 2) / 12;
        fillCircle(ctx, Math.cos(a) * (rimR - 0.4), Math.sin(a) * (rimR - 0.4), 0.75, '#f59e0b');
      }
    }
  } else if (rims === 'gold') {
    // BBS Gold Mesh multi-spoke
    ctx.strokeStyle = faceColor;
    ctx.lineWidth = 1.1;
    for (let i = 0; i < 10; i++) {
      const a = (i * Math.PI * 2) / 10;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 1.5, Math.sin(a) * 1.5);
      ctx.lineTo(Math.cos(a + 0.28) * (rimR - 1.4), Math.sin(a + 0.28) * (rimR - 1.4));
      ctx.moveTo(Math.cos(a) * 1.5, Math.sin(a) * 1.5);
      ctx.lineTo(Math.cos(a - 0.28) * (rimR - 1.4), Math.sin(a - 0.28) * (rimR - 1.4));
      ctx.stroke();
    }
  } else if (rims === 'chrome') {
    // Deep-dish 5-star chrome muscle spokes
    for (let i = 0; i < 5; i++) {
      const a = (i * Math.PI * 2) / 5;
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = Math.max(1.8, rimR * 0.26);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * (rimR - 1.4), Math.sin(a) * (rimR - 1.4));
      ctx.stroke();
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * (rimR - 1.4), Math.sin(a) * (rimR - 1.4));
      ctx.stroke();
    }
  } else {
    // Stamped factory steelie with vent slots & chrome center cap
    fillCircle(ctx, 0, 0, rimR - 1.2, '#475569', '#1e293b', 0.8);
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI * 2) / 6;
      fillCircle(ctx, Math.cos(a) * (rimR * 0.58), Math.sin(a) * (rimR * 0.58), Math.max(0.9, rimR * 0.14), '#0f172a');
    }
  }

  // Center Hub & Lug Nut Ring
  fillCircle(ctx, 0, 0, Math.max(1.8, rimR * 0.28), lipColor, '#0f172a', 0.8);
  fillCircle(ctx, 0, 0, Math.max(0.8, rimR * 0.12), '#1e293b');
  ctx.restore();

  // Subtle rim specular glint (stationary relative to light)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.38)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, 0, rimR - 0.8, -Math.PI * 0.72, -Math.PI * 0.32);
  ctx.stroke();

  ctx.restore();
}

function drawDetailedBlower(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  big: boolean,
  isTopFuel = false
) {
  const w = big ? 18 : 13;
  const h = big ? 11 : 7;
  // Blower intake manifold & case ribs
  fillPoly(
    ctx,
    [
      [x, y],
      [x + w, y],
      [x + w - 1, y - h],
      [x + 1, y - h],
    ],
    '#cbd5e1',
    '#09070f',
    1
  );
  // Finned cooling ribs on blower housing
  for (let ry = 2; ry < h - 1; ry += 2.5) {
    drawLine(ctx, x + 2, y - ry, x + w - 2, y - ry, '#475569', 1);
  }
  // Drive pulley & toothed cog belt on front of blower
  fillCircle(ctx, x + w - 2, y - h + 3, big ? 2.4 : 1.8, '#1e293b', '#f8fafc', 0.8);
  fillCircle(ctx, x + w - 1, y + 1, big ? 2.2 : 1.6, '#334155', '#94a3b8', 0.8);
  drawLine(ctx, x + w - 3.5, y - h + 3, x + w - 2.5, y + 1, '#0f172a', 1.2);
  drawLine(ctx, x + w - 0.5, y - h + 3, x + w + 0.5, y + 1, '#0f172a', 1.2);

  // Polished Bug-Catcher / Carbon Injector Hat Scoop
  const scoopY = y - h;
  const scoopColor = isTopFuel ? '#1e293b' : '#e2e8f0';
  fillPoly(
    ctx,
    [
      [x - 1, scoopY],
      [x + w + 6, scoopY],
      [x + w + 7, scoopY - (big ? 6 : 4.5)],
      [x + 2, scoopY - (big ? 5 : 3.5)],
    ],
    scoopColor,
    '#09070f',
    1
  );
  // Metallic highlight edge along scoop
  drawLine(ctx, x + 3, scoopY - (big ? 4 : 3), x + w + 5, scoopY - (big ? 5 : 3.5), '#ffffff', 1);
  // Twin Red Butterfly Intake Valves
  px(ctx, x + w + 4, scoopY - (big ? 5 : 3.5), 2.5, big ? 4 : 3, '#ef4444');
  px(ctx, x + w + 5, scoopY - (big ? 4 : 3), 1, big ? 2 : 1.5, '#fca5a5');
}

function drawWheelieBar(ctx: CanvasRenderingContext2D, attachX: number, attachY: number, length: number) {
  const tipX = attachX - length;
  const tipY = -5;
  // Upper & lower tubular chromoly bars + diagonal brace
  drawLine(ctx, attachX, attachY - 8, tipX, tipY, '#94a3b8', 1.6);
  drawLine(ctx, attachX, attachY - 2, tipX, tipY, '#cbd5e1', 1.6);
  drawLine(ctx, attachX - length * 0.45, attachY - 6, attachX - length * 0.62, tipY + 0.5, '#64748b', 1.1);
  // Small round caster wheel
  fillCircle(ctx, tipX, tipY, 3.2, '#1e293b', '#09070f', 1);
  fillCircle(ctx, tipX, tipY, 1.5, '#f8fafc');
}

function drawSideDecal(
  ctx: CanvasRenderingContext2D,
  stripe: CarVisuals['stripe'],
  x: number,
  y: number,
  w: number,
  h: number
) {
  if (stripe === 'none') return;
  ctx.save();
  if (stripe === 'twin') {
    px(ctx, x, y + 1, w, 1.6, 'rgba(248, 250, 252, 0.92)');
    px(ctx, x, y + h - 2.5, w, 1.6, 'rgba(248, 250, 252, 0.92)');
  } else if (stripe === 'flash') {
    fillPoly(
      ctx,
      [
        [x + 6, y + h - 1],
        [x + w * 0.58, y + 0.5],
        [x + w * 0.52, y + h * 0.55],
        [x + w - 4, y + 0.5],
        [x + w * 0.44, y + h],
        [x + w * 0.48, y + h * 0.48],
      ],
      '#fde047'
    );
    drawLine(ctx, x + 8, y + h - 1, x + w * 0.54, y + 1.5, '#f97316', 1.2);
  } else if (stripe === 'checkered') {
    const cell = 3.2;
    const cols = 7;
    const rows = 2;
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        px(
          ctx,
          x + c * cell,
          y + r * cell,
          cell,
          cell,
          (c + r) % 2 === 0 ? '#f8fafc' : '#0f172a'
        );
      }
    }
  } else if (stripe === 'flames') {
    // Layered hot-rod racing flames sweeping back from front fender
    const fx = x + w;
    fillPoly(
      ctx,
      [
        [fx, y],
        [fx - 34, y + 0.5],
        [fx - 22, y + 2.5],
        [fx - 40, y + 4.5],
        [fx - 24, y + h],
        [fx, y + h],
      ],
      '#ef4444'
    );
    fillPoly(
      ctx,
      [
        [fx, y + 0.8],
        [fx - 24, y + 1.2],
        [fx - 15, y + 2.8],
        [fx - 28, y + 4.2],
        [fx - 14, y + h - 0.6],
        [fx, y + h - 0.6],
      ],
      '#f97316'
    );
    fillPoly(
      ctx,
      [
        [fx, y + 1.6],
        [fx - 14, y + 2.2],
        [fx - 9, y + 3.4],
        [fx - 15, y + 4.4],
        [fx, y + h - 1.2],
      ],
      '#fde047'
    );
  }
  ctx.restore();
}

export function drawPixelCar(ctx: CanvasRenderingContext2D, opts: PixelCarDrawOptions): void {
  const scale = opts.scale ?? 1;
  const paint = opts.visuals.paintColor;
  const paintSpec = liftHex(paint, 68);
  const paintHi = liftHex(paint, 32);
  const paintMid = paint;
  const paintSh = shadeHex(paint, 0.72);
  const paintDeep = shadeHex(paint, 0.44);
  const outline = '#09070f';

  ctx.save();
  ctx.translate(Math.round(opts.x), Math.round(opts.y));
  if (scale !== 1) {
    ctx.scale(scale, scale);
  }

  // Soft elliptical contact shadow under chassis
  const shadowRx = opts.chassis === 'topfuel' ? 88 : opts.chassis === 'funny' ? 66 : 54;
  ctx.fillStyle = 'rgba(5, 4, 12, 0.62)';
  ctx.beginPath();
  ctx.ellipse(opts.chassis === 'topfuel' ? 8 : 0, -1, shadowRx, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Pivot around rear axle for authentic wheelie pitch & launch squat
  const rearAxleX = opts.chassis === 'topfuel' ? -52 : -29;
  const rearAxleY = opts.chassis === 'topfuel' ? -16 : -10;
  ctx.translate(rearAxleX, rearAxleY);
  if (opts.pitchDeg !== 0) {
    ctx.rotate((opts.pitchDeg * Math.PI) / 180);
  }
  ctx.translate(-rearAxleX, -rearAxleY + opts.squatPx);

  const hasBlower =
    opts.upgrades.induction >= 2 || opts.chassis === 'funny' || opts.chassis === 'topfuel';
  const bigBlower =
    opts.upgrades.induction >= 4 || opts.chassis === 'funny' || opts.chassis === 'topfuel';
  const hasWing =
    opts.upgrades.chassis >= 2 ||
    opts.chassis === 'jdm' ||
    opts.chassis === 'funny' ||
    opts.chassis === 'topfuel';
  const hasWheelieBar =
    opts.upgrades.tires >= 3 || opts.chassis === 'funny' || opts.chassis === 'topfuel';
  const isSlick =
    opts.upgrades.tires >= 2 || opts.chassis === 'funny' || opts.chassis === 'topfuel';
  const hasZoomies =
    opts.upgrades.nitrous >= 3 || opts.chassis === 'funny' || opts.chassis === 'topfuel';

  // Deploying Drag Parachute (behind tail)
  if ((opts.chuteOpen ?? 0) > 0.05) {
    const open = opts.chuteOpen ?? 0;
    const tailX = opts.chassis === 'topfuel' ? -72 : -52;
    const chuteDist = 24 + open * 46;
    const chuteH = 16 + open * 24;
    drawLine(ctx, tailX, -18, tailX - chuteDist, -18 - chuteH * 0.48, '#e2e8f0', 1);
    drawLine(ctx, tailX, -18, tailX - chuteDist, -18, '#cbd5e1', 0.9);
    drawLine(ctx, tailX, -18, tailX - chuteDist, -18 + chuteH * 0.42, '#e2e8f0', 1);

    // Inflated billowing drag chute dome
    ctx.fillStyle = '#f4f1e6';
    ctx.beginPath();
    ctx.ellipse(tailX - chuteDist - 6, -18, 12 + open * 6, chuteH * 0.52, 0, Math.PI * 0.5, Math.PI * 1.5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#09070f';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Red/white drag chute stripes
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.ellipse(tailX - chuteDist - 6, -18, 10 + open * 5, chuteH * 0.2, 0, Math.PI * 0.5, Math.PI * 1.5);
    ctx.closePath();
    ctx.fill();
  }

  // Wheelie bar
  if (hasWheelieBar) {
    const barX = opts.chassis === 'topfuel' ? -66 : opts.chassis === 'funny' ? -50 : -44;
    drawWheelieBar(ctx, barX, -6, opts.chassis === 'topfuel' ? 28 : 20);
  }

  // =========================================================================
  // 1. TIER 1: CIVIC GT '86 (SCULPTED 80s HOT HATCH)
  // =========================================================================
  if (opts.chassis === 'hatch') {
    // Exhaust muffler tip
    fillPoly(ctx, [[-48, -11], [-42, -11], [-42, -7.5], [-49, -7.5]], '#94a3b8', outline, 1);

    // Optional Rear Drag Wing
    if (hasWing) {
      fillPoly(ctx, [[-44, -27], [-41, -34], [-38, -34], [-40, -27]], '#1e293b', outline, 1);
      fillPoly(ctx, [[-49, -36], [-35, -34], [-36, -31.5], [-49, -33.5]], paintSh, outline, 1);
      drawLine(ctx, -48, -35, -36, -33.2, paintSpec, 1);
    }

    // Sculpted Hatchback Unibody Silhouette
    fillPoly(
      ctx,
      [
        [-45, -8],
        [-46, -18],
        [-40, -29],
        [-28, -33],
        [4, -33],
        [18, -23],
        [42, -20],
        [46, -15],
        [45, -8],
      ],
      paintMid,
      outline,
      1.3
    );

    // Metallic Top Specular Reflection & Lower Beltline Shade
    fillPoly(
      ctx,
      [[-39, -28], [-27, -32], [3, -32], [17, -22.5], [41, -19.5], [40, -17], [-43, -17]],
      paintHi
    );
    drawLine(ctx, -42, -19, 42, -18, paintSpec, 1.1);
    fillPoly(ctx, [[-44, -13], [44, -13], [44, -8.5], [-44, -8.5]], paintSh);
    // Classic 80s black bumper & side molding trim
    px(ctx, -46, -12, 8, 4.5, '#1e202c');
    px(ctx, 38, -12, 8, 4.5, '#1e202c');
    px(ctx, -38, -14.5, 76, 1.6, '#14151f');

    // Optional front aero splitter
    if (opts.upgrades.chassis >= 2) {
      px(ctx, 38, -7.5, 11, 2.2, '#0f172a');
      drawLine(ctx, 43, -10, 45, -7.5, '#cbd5e1', 1);
    }

    // Side Decal
    drawSideDecal(ctx, opts.visuals.stripe, -37, -20.5, 73, 5.5);

    // Greenhouse Windows (Rear Hatch, Quarter Glass, Side Door Window, Windshield)
    fillPoly(ctx, [[-37, -22.5], [-29, -30.5], [-16, -30.5], [-16, -22.5]], '#1e293b', outline, 1);
    fillPoly(ctx, [[-13, -22.5], [-13, -30.5], [3, -30.5], [14, -22.5]], '#273549', outline, 1);
    // Crisp diagonal glass glare streaks
    drawLine(ctx, -26, -29.5, -31, -23.5, '#64748b', 1.4);
    drawLine(ctx, -4, -29.5, -10, -23.5, '#93c5fd', 1.8);
    drawLine(ctx, 2, -29.5, -4, -23.5, '#bae6fd', 1);
    // Door seam + side mirror + door handle
    drawLine(ctx, -14.5, -22, -14.5, -9, paintDeep, 1);
    drawLine(ctx, 13, -22, 13, -10, paintDeep, 0.9);
    px(ctx, -12, -19.5, 4, 1.6, '#0f172a');
    fillPoly(ctx, [[8, -22.5], [12, -24.5], [13, -22]], '#1e202c', outline, 0.8);

    // Headlight + Amber Corner + Taillight
    px(ctx, 41, -18.5, 4.5, 4.5, '#fef08a');
    px(ctx, 37, -18.5, 3.5, 4.5, '#f97316');
    px(ctx, -45.5, -19, 4, 5, '#ef4444');
    px(ctx, -45.5, -16, 4, 2, '#fca5a5');

    // Recessed Dark Wheel Wells
    fillCircle(ctx, -27, -9, isSlick ? 12.2 : 10.6, '#09070f');
    fillCircle(ctx, 26, -9, 10.4, '#09070f');

    // Variant-specific Street Hatch details
    if (opts.bodyVariant === 'compact') {
      // Kammback ducktail spoiler & rear tow hook
      fillPoly(ctx, [[-47, -23], [-39, -23], [-41, -20.5], [-46, -20.5]], paintHi, outline, 0.9);
      fillCircle(ctx, -45, -8.5, 2.2, '#ef4444', outline, 0.8);
    } else if (opts.bodyVariant === 'boxy') {
      // Group-B red grille trim stripe & flared rally arches
      px(ctx, 36, -15, 10, 1.8, '#ef4444');
      px(ctx, -40, -13.5, 6, 4.5, '#0f172a'); // rear mudflap
    }

    // Optional Blower Scoop
    if (hasBlower) {
      drawDetailedBlower(ctx, 17, -21, bigBlower);
    }

    // True Round Wheels
    drawWheel(ctx, -27, -9.5, isSlick ? 10.8 : 9.2, opts.visuals.rims, opts.wheelAngle, isSlick);
    drawWheel(ctx, 26, -9, 9.0, opts.visuals.rims, opts.wheelAngle, false);
  }

  // =========================================================================
  // 2. TIER 2: IROC FURY '84 (SCULPTED V8 FASTBACK MUSCLE COUPE)
  // =========================================================================
  else if (opts.chassis === 'muscle') {
    // Exhaust pipe
    fillPoly(ctx, [[-54, -10], [-47, -10], [-47, -7], [-54, -7]], '#cbd5e1', outline, 1);

    // Pedestal Rear Spoiler
    fillPoly(
      ctx,
      [[-53, -25.5], [-42, -25.5], [-43, -22], [-51, -22]],
      paintSh,
      outline,
      1
    );
    if (hasWing) {
      fillPoly(ctx, [[-55, -30], [-40, -29], [-41, -26.5], [-55, -27.5]], paintHi, outline, 1);
    }

    // Long Wedge Muscle Body
    fillPoly(
      ctx,
      [
        [-52, -9],
        [-53, -21],
        [-36, -24],
        [-19, -32.5],
        [8, -32.5],
        [21, -23.5],
        [52, -20.5],
        [56, -15],
        [52, -8.5],
      ],
      paintMid,
      outline,
      1.3
    );

    // Sculpted Fender Highlight & Lower Ground-Effect Skirt
    fillPoly(
      ctx,
      [[-51, -20.5], [-34, -23], [20, -22.5], [52, -19.5], [51, -16.5], [-51, -16.5]],
      paintHi
    );
    drawLine(ctx, -50, -18.5, 53, -17.5, paintSpec, 1.2);
    fillPoly(ctx, [[-51, -13], [52, -13], [51, -8.5], [-51, -8.5]], paintSh);
    // Chrome lower rocker edge
    drawLine(ctx, -16, -9.5, 19, -9.5, '#cbd5e1', 1.4);

    // Side Decal
    drawSideDecal(ctx, opts.visuals.stripe, -48, -20, 94, 5.5);

    // Raked Fastback Rear Window + Louvers + Side Glass
    fillPoly(ctx, [[-34, -23.5], [-18, -30.5], [-8, -30.5], [-8, -23]], '#1e293b', outline, 1);
    // Retro muscle rear window louvers!
    for (let lx = -31; lx < -12; lx += 4.5) {
      drawLine(ctx, lx, -24, lx + 4, -29.5, '#09070f', 1.3);
    }
    fillPoly(ctx, [[-5, -23], [-5, -30.5], [7, -30.5], [18, -23]], '#334155', outline, 1);
    drawLine(ctx, 2, -29.5, -4, -23.5, '#93c5fd', 1.8);
    drawLine(ctx, 8, -29.5, 3, -23.5, '#bae6fd', 1);

    // Door seam, mirror & hood scoop louver
    drawLine(ctx, -7, -22.5, -7, -9.5, paintDeep, 1);
    drawLine(ctx, 18, -22.5, 18, -10.5, paintDeep, 1);
    px(ctx, -4, -19.5, 4.5, 1.6, '#0f172a');
    fillPoly(ctx, [[12, -23], [16, -25], [17, -22.5]], paintSh, outline, 0.8);

    // Recessed Quad Headlight Nose + Taillight
    px(ctx, 50, -19, 5, 4.5, '#0f172a');
    px(ctx, 51, -18.2, 3.5, 3, '#fef08a');
    px(ctx, -52.5, -19.5, 4, 5, '#ef4444');
    px(ctx, -52.5, -16.5, 4, 1.8, '#fca5a5');

    // Side-Exit Exhaust / Zoomies if upgraded
    if (hasZoomies) {
      fillPoly(ctx, [[-14, -11], [16, -11], [16, -7.5], [-14, -7.5]], '#e2e8f0', outline, 1);
      drawLine(ctx, -13, -9.5, 15, -9.5, '#ffffff', 0.9);
    }

    // Recessed Wheel Arches
    fillCircle(ctx, -30, -10, isSlick ? 13.4 : 11.4, '#09070f');
    fillCircle(ctx, 32, -9.5, 10.6, '#09070f');

    // Variant-specific Muscle details
    if (opts.bodyVariant === 'notch') {
      // Tall Cowl-Induction Drag Hood Bulge & upright rear trunk step
      fillPoly(ctx, [[21, -22.5], [44, -21], [44, -24.5], [22, -25.5]], paintHi, outline, 1);
      px(ctx, 20, -25, 3, 2.5, '#0f172a');
    } else if (opts.bodyVariant === 'fastback') {
      // Sculpted side-fender air extractor & twin chrome side pipes
      fillPoly(ctx, [[12, -18.5], [21, -18.5], [19, -15], [10, -15]], '#0f172a', outline, 0.8);
      fillPoly(ctx, [[-15, -10.5], [18, -10.5], [18, -8], [-15, -8]], '#e2e8f0', outline, 0.9);
    }

    if (hasBlower) {
      drawDetailedBlower(ctx, 21, -21.5, bigBlower);
    }

    // True Round Muscle Wheels (Staggered Big-n-Littles when slicks installed!)
    drawWheel(ctx, -30, -10.5, isSlick ? 12.0 : 10.0, opts.visuals.rims, opts.wheelAngle, isSlick);
    drawWheel(ctx, 32, -9.5, 9.2, opts.visuals.rims, opts.wheelAngle, false);
  }

  // =========================================================================
  // 3. TIER 3: APEX GTR '89 (TWIN-TURBO WIDEBODY JDM LEGEND)
  // =========================================================================
  else if (opts.chassis === 'jdm') {
    // Burnt-Blue Titanium Cannon Exhaust
    fillPoly(ctx, [[-54, -10.5], [-46, -10.5], [-46, -7], [-54, -7]], '#94a3b8', outline, 1);
    px(ctx, -54, -10, 2.5, 2.5, '#38bdf8');

    // Signature High GT Drag Wing
    fillPoly(ctx, [[-50, -23], [-48, -34], [-44.5, -34], [-46.5, -23]], '#0f172a', outline, 1);
    fillPoly(
      ctx,
      [[-56, -36], [-39, -34.5], [-40, -31.5], [-56, -33]],
      hasWing ? paintMid : '#1e293b',
      outline,
      1.1
    );
    drawLine(ctx, -55, -35, -40, -33.6, hasWing ? paintSpec : '#64748b', 1);

    // Sculpted Widebody Coupe Silhouette
    fillPoly(
      ctx,
      [
        [-51, -8.5],
        [-52, -21.5],
        [-34, -24],
        [-21, -33],
        [10, -33],
        [23, -23.5],
        [49, -21.5],
        [54, -16],
        [55, -8.5],
      ],
      paintMid,
      outline,
      1.3
    );

    // Widebody Box Fender Shading & Top Specular Reflection
    fillPoly(
      ctx,
      [[-50, -21], [48, -20.5], [52, -16.5], [-50, -16.5]],
      paintHi
    );
    drawLine(ctx, -49, -19, 51, -18, paintSpec, 1.2);
    fillPoly(ctx, [[-50, -13], [53, -13], [54, -8.5], [-50, -8.5]], paintSh);
    // Carbon Side Skirt & Front Splitter
    px(ctx, -18, -9.5, 39, 2.5, '#0f172a');
    px(ctx, 44, -8.5, 13, 2.4, '#0f172a');

    // Exposed Aluminum Front-Mount Intercooler!
    fillPoly(ctx, [[47, -14], [54.5, -14], [54.5, -9.5], [47, -9.5]], '#e2e8f0', outline, 0.9);
    drawLine(ctx, 48, -12.5, 53.5, -12.5, '#64748b', 0.8);
    drawLine(ctx, 48, -11, 53.5, -11, '#64748b', 0.8);

    // Side Decal
    drawSideDecal(ctx, opts.visuals.stripe, -46, -20, 90, 5.5);

    // Sleek Glasshouse
    fillPoly(ctx, [[-31, -23.5], [-20, -31], [-8, -31], [-8, -23]], '#1e293b', outline, 1);
    fillPoly(ctx, [[-5, -23], [-5, -31], [9, -31], [20, -23]], '#273549', outline, 1);
    drawLine(ctx, 3, -30, -3, -23.5, '#93c5fd', 1.8);
    drawLine(ctx, 10, -30, 5, -23.5, '#bae6fd', 1);

    // Door seam, fender vent & aero mirror
    drawLine(ctx, -6.5, -22.5, -6.5, -9.5, paintDeep, 1);
    drawLine(ctx, 19, -22.5, 19, -10, paintDeep, 1);
    px(ctx, 14, -18, 3, 4.5, '#0f172a'); // brake cooling duct
    fillPoly(ctx, [[13, -23.5], [18, -25.5], [19, -22.5]], paintSh, outline, 0.8);

    // Sleek Projector Headlight + Iconic Round Afterburner Taillights
    fillPoly(ctx, [[46, -19.5], [53, -18.5], [53, -15.8], [46, -16.5]], '#e0f2fe', outline, 0.8);
    px(ctx, 49, -18, 2.5, 2, '#ffffff');
    fillCircle(ctx, -50, -18, 2.2, '#ef4444', '#09070f', 0.8);
    fillCircle(ctx, -50, -18, 0.9, '#fef08a');

    // Wheel Arches
    fillCircle(ctx, -30, -10.5, isSlick ? 13.6 : 11.6, '#09070f');
    fillCircle(ctx, 31, -10, 11.0, '#09070f');

    // Variant-specific JDM / Aero Coupe details
    if (opts.bodyVariant === 'wedge') {
      // Low-slung pop-up headlight contour & mid-engine side air intake scoop
      fillPoly(ctx, [[34, -21.5], [46, -20.5], [45, -18.8], [34, -19.5]], paintDeep, outline, 0.8);
      fillPoly(ctx, [[-20, -19.5], [-9, -19.5], [-11, -14.5], [-22, -14.5]], '#0f172a', outline, 0.9);
    } else if (opts.bodyVariant === 'aero') {
      // Sweeping tall GT hoop spoiler & sculpted fender aero louvers
      fillPoly(ctx, [[-56, -34], [-40, -33], [-42, -23], [-46, -23], [-44, -31], [-55, -31.5]], paintHi, outline, 1);
      px(ctx, 18, -19, 8, 2.2, '#0f172a');
    }

    if (hasBlower) {
      drawDetailedBlower(ctx, 22, -22, bigBlower);
    }

    // True Round Wheels
    drawWheel(ctx, -30, -10.5, isSlick ? 12.2 : 10.2, opts.visuals.rims, opts.wheelAngle, isSlick);
    drawWheel(ctx, 31, -9.8, 9.6, opts.visuals.rims, opts.wheelAngle, false);
  }

  // =========================================================================
  // 4. TIER 4: NITRO CHARGER FC (NHRA BLOWN FUNNY CAR FLIP-BODY)
  // =========================================================================
  else if (opts.chassis === 'funny') {
    // Tall Rear Spill-Plate Carbon Drag Wing
    fillPoly(ctx, [[-61, -33], [-45, -31], [-46, -21], [-60, -21]], paintSh, outline, 1.2);
    fillPoly(ctx, [[-61, -33], [-45, -31], [-45, -29], [-61, -31]], paintSpec);
    drawLine(ctx, -58, -30, -58, -22, '#09070f', 1.4);

    // Packed Twin Drag Parachutes on Tail
    fillPoly(ctx, [[-60, -18], [-55, -18], [-55, -12], [-60, -12]], '#f4f1e6', outline, 1);
    px(ctx, -59, -16, 3, 2, '#ef4444');

    // Long Low-Slung Aerodynamic Flip-Body Shell
    fillPoly(
      ctx,
      [
        [-56, -8],
        [-57, -23],
        [-42, -25.5],
        [-31, -34],
        [-6, -34],
        [7, -24],
        [52, -21],
        [67, -14],
        [69, -8],
      ],
      paintMid,
      outline,
      1.4
    );

    // Sweeping Aero Specular & Lower Carbon Valance
    fillPoly(ctx, [[-55, -22.5], [51, -20], [65, -14.5], [-55, -16]], paintHi);
    drawLine(ctx, -54, -20, 62, -16, paintSpec, 1.3);
    fillPoly(ctx, [[-55, -13], [67, -12], [68, -8], [-55, -8]], paintSh);
    px(ctx, 56, -9.5, 15, 2.6, '#0f172a'); // nose splitter

    // Side Decal
    drawSideDecal(ctx, opts.visuals.stripe, -52, -21, 108, 6.5);

    // Rear-Set Bubble Cockpit Canopy + Driver Helmet Inside
    fillPoly(ctx, [[-37, -24.5], [-29, -32], [-8, -32], [3, -24.5]], '#0f172a', outline, 1.1);
    // Driver Helmet & Visor visible inside canopy
    fillCircle(ctx, -18, -27.5, 3.2, '#f8fafc', '#09070f', 0.8);
    px(ctx, -16.5, -28.5, 2.5, 1.8, '#38bdf8');
    // Canopy glass specular streak
    drawLine(ctx, -10, -31, -16, -25, '#7dd3fc', 1.6);

    // 4 Swept Chrome Side Zoomie Exhaust Headers
    for (let i = 0; i < 4; i++) {
      const zx = 10 + i * 5.2;
      fillPoly(
        ctx,
        [[zx, -14.5], [zx + 3.4, -14.5], [zx + 1.4, -19.5], [zx - 1.8, -19.5]],
        '#e2e8f0',
        outline,
        0.9
      );
      drawLine(ctx, zx + 0.5, -15, zx - 0.8, -19, '#ffffff', 0.8);
    }

    // Variant-specific Funny Car / Pro-Mod details
    if (opts.bodyVariant === 'aero') {
      // Extended low-drag needle nose & roof aero fin
      fillPoly(ctx, [[52, -14], [65, -9], [54, -8]], paintHi, outline, 1);
      fillPoly(ctx, [[-29, -34], [-10, -34], [-18, -38.5], [-31, -37]], paintSh, outline, 0.9);
    } else if (opts.bodyVariant === 'notch') {
      // Twin-turbo Pro-Mod bumper inlets & side bullhorn exhaust ports
      fillCircle(ctx, 52, -12, 3.2, '#0f172a', '#cbd5e1', 1);
      fillCircle(ctx, 22, -16, 2.6, '#e2e8f0', outline, 0.9);
    } else if (opts.bodyVariant === 'wedge') {
      // Stingray hood extractor scoop & sharp splitter canards
      fillPoly(ctx, [[45, -13], [59, -10], [56, -8], [44, -10]], '#0f172a', outline, 0.9);
    }

    // Massive 14-71 Chrome Supercharger + Injector Hat bursting through hood
    drawDetailedBlower(ctx, 16, -22.5, true);

    // Wheel Wells
    fillCircle(ctx, -32, -13.5, 16.2, '#09070f');
    fillCircle(ctx, 44, -8.5, 9.6, '#09070f');

    // Huge Round 36" Wrinkle-Wall Rear Slick + Tiny Front Skinny Runner
    drawWheel(ctx, -32, -14, 14.5, opts.visuals.rims, opts.wheelAngle, true);
    drawWheel(ctx, 44, -8.5, 8.2, opts.visuals.rims, opts.wheelAngle, false, true);
  }

  // =========================================================================
  // 5. TIER 5: RAILSTORM TF-1 (11,000-HP TOP-FUEL NITRO DRAGSTER!)
  // =========================================================================
  else {
    // Towering Dual-Strut Carbon Rear Airfoil Wing
    fillPoly(ctx, [[-72, -19], [-76, -54], [-71, -54], [-67, -19]], '#334155', outline, 1.1);
    drawLine(ctx, -73.5, -53, -69.5, -20, '#94a3b8', 1.2);
    // Multi-Element High-Downforce Wing Box & Painted Endplate
    fillPoly(
      ctx,
      [[-84, -60], [-56, -54], [-58, -46], [-85, -49]],
      paintMid,
      outline,
      1.3
    );
    fillPoly(ctx, [[-83, -59], [-57, -53.5], [-57.5, -51], [-83.5, -56]], paintSpec);
    fillPoly(ctx, [[-84, -52], [-58, -48], [-58, -46], [-85, -49]], paintSh);
    // Wing strut cross-brace
    drawLine(ctx, -76, -46, -63, -46, '#cbd5e1', 1.4);

    // Packed Twin Drag Parachutes Mounted Behind Wing Struts
    fillPoly(ctx, [[-74, -24], [-67, -24], [-67, -17], [-74, -17]], '#f4f1e6', outline, 1);
    px(ctx, -73, -22, 4, 2.5, '#ef4444');

    // Exposed Rear 500ci Aluminum Nitro Hemi V8 Engine Block (Behind Cockpit!)
    fillPoly(ctx, [[-53, -24], [-25, -24], [-25, -10], [-53, -10]], '#64748b', outline, 1.2);
    fillPoly(ctx, [[-51, -23], [-27, -23], [-27, -16], [-51, -16]], '#cbd5e1', outline, 0.9);
    // Finned Valve Cover & Fuel Lines
    drawLine(ctx, -50, -21, -28, -21, '#334155', 1.2);
    drawLine(ctx, -50, -18.5, -28, -18.5, '#475569', 1);
    // Massive Top-Mounted 14-71 Supercharger & Tall Carbon Injector Hat!
    drawDetailedBlower(ctx, -47, -24, true, true);

    // 4 Gleaming Swept-Up Vertical Chrome Zoomie Exhaust Pipes!
    for (let i = 0; i < 4; i++) {
      const zx = -49 + i * 5.5;
      fillPoly(
        ctx,
        [[zx, -19], [zx + 3.2, -19], [zx + 0.6, -32], [zx - 2.4, -32]],
        '#e2e8f0',
        outline,
        0.95
      );
      drawLine(ctx, zx + 0.6, -20, zx - 1.2, -31, '#ffffff', 0.9);
    }

    // Long Razor-Sharp Tapered Needle-Nose Rail Fuselage!
    fillPoly(
      ctx,
      [
        [-58, -9],
        [-58, -17],
        [-24, -19],
        [42, -16],
        [88, -12.5],
        [102, -9.5],
        [98, -7],
        [-58, -7],
      ],
      paintMid,
      outline,
      1.35
    );
    // Metallic fuselage highlight & underside shade
    fillPoly(
      ctx,
      [[-24, -18.5], [42, -15.5], [96, -10], [92, -9], [-24, -13]],
      paintHi
    );
    drawLine(ctx, -22, -17, 94, -10.5, paintSpec, 1.2);
    fillPoly(ctx, [[-56, -10.5], [96, -8.5], [97, -7], [-56, -7]], paintSh);

    // Side Decal along stretched rail nose
    drawSideDecal(ctx, opts.visuals.stripe, 2, -15.5, 72, 4.5);

    // Exposed Tubular Chromoly Roll Cage & Driver Cockpit
    fillPoly(
      ctx,
      [[-25, -18], [-22, -29], [-6, -29], [4, -18]],
      '#131622',
      outline,
      1.1
    );
    // Driver Fire-Suit & Full-Face Racing Helmet with Visor
    fillPoly(ctx, [[-21, -18], [-19, -24], [-10, -24], [-8, -18]], '#334155');
    fillCircle(ctx, -14, -24.5, 3.8, '#f8fafc', '#09070f', 0.9);
    px(ctx, -12.2, -25.8, 3.0, 2.0, '#0ea5e9');
    // Roll-cage chromoly halo bars over helmet
    drawLine(ctx, -24, -18, -21, -29.5, '#cbd5e1', 1.6);
    drawLine(ctx, -21, -29.5, -5, -29.5, '#f8fafc', 1.6);
    drawLine(ctx, -5, -29.5, 4, -17.5, '#cbd5e1', 1.6);
    drawLine(ctx, -15, -29.5, -12, -18, '#94a3b8', 1.1);

    // Dual-Element Front Downforce Wing & Struts
    drawLine(ctx, 76, -12, 74, -20, '#94a3b8', 1.5);
    fillPoly(ctx, [[67, -21], [86, -19], [85, -16], [66, -18]], paintSh, outline, 1.1);
    drawLine(ctx, 68, -20, 85, -18.2, paintSpec, 1);

    // Exposed Front Torsion-Bar Suspension Struts
    drawLine(ctx, 72, -10, 74, -7.5, '#cbd5e1', 1.5);

    // Variant-specific Top-Fuel Railster details
    if (opts.bodyVariant === 'canopy') {
      // Fighter-jet enclosed smoked polycarbonate cockpit canopy + aero carbon cowling
      fillPoly(
        ctx,
        [[-26, -18], [-22, -31.5], [-4, -31.5], [14, -17.5]],
        'rgba(14, 165, 233, 0.42)',
        '#e2e8f0',
        1.25
      );
      drawLine(ctx, -18, -29.5, -1, -29.5, '#e0f2fe', 1.4);
      drawLine(ctx, -4, -29.5, 10, -18.5, '#7dd3fc', 1.3);
    } else if (opts.bodyVariant === 'twin') {
      // Tandem Dual-Blower Goliath second supercharger stack!
      drawDetailedBlower(ctx, -24, -22, false, true);
      for (let i = 0; i < 3; i++) {
        const zx = -24 + i * 5;
        fillPoly(ctx, [[zx, -18], [zx + 2.8, -18], [zx + 0.5, -28], [zx - 2, -28]], '#e2e8f0', outline, 0.85);
      }
    } else if (opts.bodyVariant === 'slingshot') {
      // Nostalgia gleaming chrome front moon fuel tank & polished nose cone
      fillPoly(ctx, [[78, -13], [104, -10], [100, -7], [78, -7.5]], '#e2e8f0', outline, 1.1);
      drawLine(ctx, 80, -11, 101, -9.2, '#ffffff', 1.1);
    }

    // TRUE 100% ROUND MASSIVE 36" TOP-FUEL WRINKLE-WALL REAR SLICK + SKINNY WIRE FRONT RAIL WHEEL!
    drawWheel(ctx, -52, -16.5, 16.5, opts.visuals.rims, opts.wheelAngle, true);
    drawWheel(ctx, 74, -7.8, 7.6, opts.visuals.rims, opts.wheelAngle, false, true);
  }

  // =========================================================================
  // EXHAUST HEADER FLAMES & NITROUS BLUE JET BURSTS
  // =========================================================================
  if (opts.exhaustFlame > 0.05) {
    const f = opts.exhaustFlame;
    if (opts.chassis === 'topfuel') {
      // Iconic 8-foot layered roaring vertical Top-Fuel nitro header flames!
      const fh = 16 + f * 34;
      for (let i = 0; i < 4; i++) {
        const fx = -50 + i * 5.5;
        fillPoly(
          ctx,
          [[fx - 2, -32], [fx + 3, -32], [fx - 4 - f * 5, -32 - fh], [fx - 8 - f * 6, -32 - fh * 0.7]],
          'rgba(255, 102, 26, 0.88)'
        );
        fillPoly(
          ctx,
          [[fx - 1, -32], [fx + 2, -32], [fx - 3 - f * 3, -32 - fh * 0.72]],
          '#fde047'
        );
        fillPoly(
          ctx,
          [[fx - 0.5, -32], [fx + 1.5, -32], [fx - 1.5, -32 - fh * 0.38]],
          '#ffffff'
        );
      }
    } else if (opts.chassis === 'funny') {
      const fl = 14 + f * 26;
      for (let i = 0; i < 4; i++) {
        const fx = 9 + i * 5.2;
        fillPoly(ctx, [[fx, -19], [fx + 2.5, -19], [fx - fl * 0.7, -25 - f * 8]], '#ff6b1a');
        fillPoly(ctx, [[fx + 0.5, -19], [fx + 2, -19], [fx - fl * 0.4, -22 - f * 4]], '#fde047');
      }
    } else {
      const fl = 12 + f * 28;
      const exX = opts.chassis === 'hatch' ? -48 : -54;
      fillPoly(ctx, [[exX, -11.5], [exX - fl, -9.2], [exX, -7]], '#ff551a');
      fillPoly(ctx, [[exX, -10.6], [exX - fl * 0.65, -9.2], [exX, -7.8]], '#fde047');
      fillPoly(ctx, [[exX, -9.8], [exX - fl * 0.35, -9.2], [exX, -8.5]], '#ffffff');
    }
  }

  if (opts.nitrousFlame > 0.05) {
    const nl = 18 + opts.nitrousFlame * 36;
    const exX = opts.chassis === 'topfuel' ? -68 : opts.chassis === 'hatch' ? -48 : -54;
    const ey = opts.chassis === 'topfuel' ? -13 : -9.2;
    fillPoly(ctx, [[exX, ey - 3.5], [exX - nl, ey], [exX, ey + 3.5]], 'rgba(37, 99, 235, 0.9)');
    fillPoly(ctx, [[exX, ey - 2.2], [exX - nl * 0.72, ey], [exX, ey + 2.2]], '#38bdf8');
    fillPoly(ctx, [[exX, ey - 1.1], [exX - nl * 0.42, ey], [exX, ey + 1.1]], '#e0f2fe');
  }

  // Slight atmospheric dimming for upper-lane Rival car
  if (opts.dimmed) {
    ctx.fillStyle = 'rgba(10, 8, 22, 0.18)';
    ctx.fillRect(-90, -64, 200, 68);
  }

  ctx.restore();
}

export function drawChristmasTree(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  treeStep: number
): void {
  // Base pedestal & truss mast
  px(ctx, x - 6, y - 4, 12, 4, '#334155');
  px(ctx, x - 3, y - 82, 6, 78, '#334155');
  px(ctx, x - 1.5, y - 82, 2.5, 78, '#64748b');

  // NHRA Tree Main Housing with Metallic Bezel
  px(ctx, x - 11, y - 80, 22, 58, '#09070f');
  px(ctx, x - 10, y - 79, 20, 56, '#1e293b');
  px(ctx, x - 9, y - 78, 18, 54, '#111827');

  // Pre-stage & Stage twin indicator bars
  const preOn = treeStep >= 0;
  const stageOn = treeStep >= 1;
  px(ctx, x - 7, y - 75, 5, 2.5, preOn ? '#fef08a' : '#292e3d');
  px(ctx, x + 2, y - 75, 5, 2.5, preOn ? '#fef08a' : '#292e3d');
  px(ctx, x - 7, y - 70, 5, 2.5, stageOn ? '#fde047' : '#292e3d');
  px(ctx, x + 2, y - 70, 5, 2.5, stageOn ? '#fde047' : '#292e3d');

  // 3 Amber countdown bulb pairs (TRUE round bulbs with glow bloom!)
  const ambers = [treeStep >= 2, treeStep >= 3, treeStep >= 4];
  ambers.forEach((on, idx) => {
    const by = y - 61 + idx * 9;
    if (on) {
      fillCircle(ctx, x - 4.5, by, 6, 'rgba(251, 191, 36, 0.28)');
      fillCircle(ctx, x + 4.5, by, 6, 'rgba(251, 191, 36, 0.28)');
    }
    fillCircle(ctx, x - 4.5, by, 3, on ? '#fbbf24' : '#3a2c14', '#09070f', 0.8);
    fillCircle(ctx, x + 4.5, by, 3, on ? '#fbbf24' : '#3a2c14', '#09070f', 0.8);
    if (on) {
      fillCircle(ctx, x - 5, by - 0.8, 1.1, '#fef9c3');
      fillCircle(ctx, x + 4, by - 0.8, 1.1, '#fef9c3');
    }
  });

  // Green launch bulbs
  const greenOn = treeStep === 5;
  const gy = y - 34;
  if (greenOn) {
    fillCircle(ctx, x - 4.5, gy, 7.5, 'rgba(34, 197, 94, 0.36)');
    fillCircle(ctx, x + 4.5, gy, 7.5, 'rgba(34, 197, 94, 0.36)');
  }
  fillCircle(ctx, x - 4.5, gy, 3.2, greenOn ? '#22c55e' : '#133020', '#09070f', 0.8);
  fillCircle(ctx, x + 4.5, gy, 3.2, greenOn ? '#22c55e' : '#133020', '#09070f', 0.8);
  if (greenOn) {
    fillCircle(ctx, x - 5, gy - 0.8, 1.2, '#bbf7d0');
    fillCircle(ctx, x + 4, gy - 0.8, 1.2, '#bbf7d0');
  }

  // Red foul bulbs
  const redOn = treeStep === -1;
  const ry = y - 26;
  if (redOn) {
    fillCircle(ctx, x - 4.5, ry, 7, 'rgba(239, 68, 68, 0.4)');
    fillCircle(ctx, x + 4.5, ry, 7, 'rgba(239, 68, 68, 0.4)');
  }
  fillCircle(ctx, x - 4.5, ry, 2.7, redOn ? '#ef4444' : '#3a1418', '#09070f', 0.8);
  fillCircle(ctx, x + 4.5, ry, 2.7, redOn ? '#ef4444' : '#3a1418', '#09070f', 0.8);
}

interface PaletteConfig {
  skyBands: string[];
  sunColor: string;
  sunGlow: string;
  cloudColor: string;
  horizonFar: string;
  horizonMid: string;
  wallColor: string;
  wallStripe: string;
  roadTop: string;
  roadMain: string;
  roadGroove: string;
  hasStars: boolean;
  hasFloodlights: boolean;
  hasBleachers: boolean;
}

const THEME_PALETTES: Record<EnvironmentTheme, PaletteConfig> = {
  backroad: {
    skyBands: ['#171130', '#2d1845', '#58244b', '#963442', '#cc5834', '#e8833a', '#f7bc59'],
    sunColor: '#fff4b8',
    sunGlow: '#f97316',
    cloudColor: 'rgba(254, 215, 170, 0.22)',
    horizonFar: '#4c223c',
    horizonMid: '#2d172b',
    wallColor: '#483c52',
    wallStripe: '#f97316',
    roadTop: '#252230',
    roadMain: '#1d1b27',
    roadGroove: '#14121b',
    hasStars: false,
    hasFloodlights: false,
    hasBleachers: false,
  },
  harbor: {
    skyBands: ['#091024', '#101d3b', '#182f57', '#244672', '#3d5e85', '#7d6b7d', '#c47956'],
    sunColor: '#fde68a',
    sunGlow: '#d97706',
    cloudColor: 'rgba(226, 232, 240, 0.14)',
    horizonFar: '#162540',
    horizonMid: '#0e192d',
    wallColor: '#354357',
    wallStripe: '#eab308',
    roadTop: '#212836',
    roadMain: '#191f2c',
    roadGroove: '#111621',
    hasStars: true,
    hasFloodlights: true,
    hasBleachers: false,
  },
  metro: {
    skyBands: ['#080b18', '#0d1429', '#131f3d', '#1a2b52', '#233666', '#2c4278', '#37508a'],
    sunColor: '#e2e8f0',
    sunGlow: '#64748b',
    cloudColor: 'rgba(148, 163, 184, 0.12)',
    horizonFar: '#111a30',
    horizonMid: '#0b1121',
    wallColor: '#3b4359',
    wallStripe: '#22c55e',
    roadTop: '#232533',
    roadMain: '#1b1d29',
    roadGroove: '#13141e',
    hasStars: true,
    hasFloodlights: true,
    hasBleachers: true,
  },
  speedway: {
    skyBands: ['#090615', '#130b29', '#1e1240', '#2c1957', '#3f206e', '#562982', '#70358f'],
    sunColor: '#f8fafc',
    sunGlow: '#38bdf8',
    cloudColor: 'rgba(196, 181, 253, 0.14)',
    horizonFar: '#1b1136',
    horizonMid: '#120b24',
    wallColor: '#3e3759',
    wallStripe: '#38bdf8',
    roadTop: '#222030',
    roadMain: '#1a1826',
    roadGroove: '#110f1a',
    hasStars: true,
    hasFloodlights: true,
    hasBleachers: true,
  },
  nationals: {
    skyBands: ['#140714', '#2b0b20', '#4d1429', '#781f2c', '#a83328', '#d45824', '#f29530'],
    sunColor: '#fef08a',
    sunGlow: '#ef4444',
    cloudColor: 'rgba(254, 240, 138, 0.18)',
    horizonFar: '#3d1221',
    horizonMid: '#240b16',
    wallColor: '#4c333c',
    wallStripe: '#ef4444',
    roadTop: '#251f28',
    roadMain: '#1c1720',
    roadGroove: '#120f15',
    hasStars: false,
    hasFloodlights: true,
    hasBleachers: true,
  },
};

export function drawEnvironment(
  ctx: CanvasRenderingContext2D,
  theme: EnvironmentTheme,
  cameraFt: number,
  timeSec: number,
  speedMph: number,
  pxPerFt: number,
  distanceFt = 1320,
  distanceLabel = '1/4 MI'
): void {
  const pal = THEME_PALETTES[theme];
  const horizonY = 172;

  // 1. Multi-band pixel sky
  const bandH = Math.ceil(horizonY / pal.skyBands.length);
  pal.skyBands.forEach((col, i) => {
    px(ctx, 0, i * bandH, LOGICAL_W, bandH + 1, col);
  });

  // 2. Stars
  if (pal.hasStars) {
    for (let i = 0; i < 48; i++) {
      const sx = (i * 89 + 23) % LOGICAL_W;
      const sy = (i * 37 + 9) % 98;
      const twinkle = Math.sin(timeSec * 3.2 + i) > 0.35 ? '#ffffff' : '#94a3b8';
      px(ctx, sx, sy, i % 5 === 0 ? 2 : 1, i % 5 === 0 ? 2 : 1, twinkle);
    }
  }

  // 3. Round Glowing Sun or Moon
  const sunX = theme === 'backroad' || theme === 'nationals' ? 470 : 118;
  const sunY = theme === 'backroad' || theme === 'nationals' ? 114 : 58;
  const sunR = theme === 'backroad' || theme === 'nationals' ? 28 : 14;
  fillCircle(ctx, sunX, sunY, sunR + 12, pal.sunGlow + '22');
  fillCircle(ctx, sunX, sunY, sunR + 5, pal.sunGlow + '44');
  fillCircle(ctx, sunX, sunY, sunR, pal.sunColor);

  // Drifting pixel cloud strata
  const cloudScroll = (timeSec * 4 + cameraFt * 0.18) % 320;
  for (let rep = -1; rep < 3; rep++) {
    const cx = Math.round(rep * 320 - cloudScroll);
    px(ctx, cx + 26, 48, 72, 6, pal.cloudColor);
    px(ctx, cx + 44, 44, 42, 5, pal.cloudColor);
    px(ctx, cx + 178, 74, 88, 7, pal.cloudColor);
    px(ctx, cx + 196, 69, 48, 5, pal.cloudColor);
  }

  // 4. Far Parallax Horizon Silhouettes
  const farScroll = (cameraFt * 0.72) % 320;
  for (let rep = -1; rep < 3; rep++) {
    const base = Math.round(rep * 320 - farScroll);
    if (theme === 'backroad') {
      // Sculpted desert red-rock mesas
      fillPoly(
        ctx,
        [[base + 12, horizonY], [base + 28, 128], [base + 82, 128], [base + 104, horizonY]],
        pal.horizonFar
      );
      fillPoly(
        ctx,
        [[base + 138, horizonY], [base + 158, 114], [base + 212, 114], [base + 236, 134], [base + 266, horizonY]],
        pal.horizonFar
      );
    } else if (theme === 'harbor') {
      // Lattice port cranes & cargo vessel
      px(ctx, base + 28, 96, 8, 76, pal.horizonFar);
      px(ctx, base + 10, 98, 58, 5, pal.horizonFar);
      drawLine(ctx, base + 32, 96, base + 64, 102, pal.horizonFar, 2);
      px(ctx, base + 62, 102, 2, 26, pal.horizonFar);
      // Warning beacon
      fillCircle(ctx, base + 32, 94, 2, Math.sin(timeSec * 5) > 0 ? '#ef4444' : '#7f1d1d');
      // Cargo tanker
      fillPoly(ctx, [[base + 132, horizonY], [base + 144, 144], [base + 256, 144], [base + 268, horizonY]], pal.horizonFar);
      px(ctx, base + 154, 124, 26, 22, pal.horizonFar);
    } else {
      // Metro / Stadium / Nationals skyline
      const buildings = [
        [10, 52, 34], [48, 74, 26], [78, 42, 38], [124, 66, 30],
        [162, 84, 28], [198, 48, 44], [250, 68, 36],
      ];
      for (const [bx, bh, bw] of buildings) {
        px(ctx, base + bx, horizonY - bh, bw, bh, pal.horizonFar);
        for (let wy = horizonY - bh + 5; wy < horizonY - 8; wy += 8) {
          for (let wx = base + bx + 5; wx < base + bx + bw - 5; wx += 8) {
            if (((wx + wy) % 3) !== 0) {
              px(ctx, wx, wy, 3, 3, theme === 'nationals' ? '#fbbf24' : '#7dd3fc');
            }
          }
        }
      }
    }
  }

  // 5. Mid Parallax: Grandstands, Floodlight Towers, Roadside Details
  const midScroll = (cameraFt * 2.8) % 320;
  for (let rep = -1; rep < 3; rep++) {
    const base = Math.round(rep * 320 - midScroll);
    if (pal.hasBleachers) {
      // Covered stadium grandstands
      px(ctx, base + 14, 132, 226, 40, pal.horizonMid);
      px(ctx, base + 10, 126, 234, 6, '#334155');
      px(ctx, base + 14, 132, 226, 2, pal.wallStripe);
      // Animated cheering pixel crowd
      const crowdColors = ['#f87171', '#facc15', '#38bdf8', '#f4f1e6', '#4ade80'];
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 28; col++) {
          const bounce = Math.sin(timeSec * 9 + col * 1.4 + row) > 0.6 ? -1.5 : 0;
          const color = crowdColors[(col * 3 + row) % crowdColors.length];
          px(ctx, base + 20 + col * 7.8, 138 + row * 7.5 + bounce, 4, 4, color);
        }
      }
    } else if (theme === 'backroad') {
      // Utility poles with sagging powerlines & desert saguaro cacti
      px(ctx, base + 50, 118, 4, 54, '#2a1829');
      px(ctx, base + 40, 126, 24, 3, '#2a1829');
      px(ctx, base + 210, 144, 5, 28, '#2f192d');
      px(ctx, base + 203, 152, 7, 3, '#2f192d');
      px(ctx, base + 215, 149, 7, 3, '#2f192d');
    } else {
      // Stacked corrugated port containers
      px(ctx, base + 22, 144, 58, 28, '#991b1b');
      px(ctx, base + 84, 144, 58, 28, '#1d4ed8');
      px(ctx, base + 146, 144, 58, 28, '#b45309');
      px(ctx, base + 52, 118, 58, 26, '#0f766e');
    }

    if (pal.hasFloodlights) {
      const lx = base + 266;
      px(ctx, lx, 64, 5, 108, '#334155');
      px(ctx, lx + 1, 64, 2, 108, '#64748b');
      px(ctx, lx - 14, 56, 33, 12, '#1e293b');
      px(ctx, lx - 11, 59, 27, 6, '#fef9c3');
      // Soft volumetric halogen beam
      ctx.fillStyle = 'rgba(254, 249, 195, 0.055)';
      ctx.beginPath();
      ctx.moveTo(lx - 11, 65);
      ctx.lineTo(lx + 16, 65);
      ctx.lineTo(lx + 58, 178);
      ctx.lineTo(lx - 52, 178);
      ctx.closePath();
      ctx.fill();
    }
  }

  // 6. Trackside Concrete Jersey Barrier & Sponsor Boards
  px(ctx, 0, 172, LOGICAL_W, 24, pal.wallColor);
  px(ctx, 0, 172, LOGICAL_W, 3, '#cbd5e1');
  px(ctx, 0, 190, LOGICAL_W, 4, pal.wallStripe);

  const wallScroll = (cameraFt * pxPerFt) % 210;
  for (let rep = -1; rep < 5; rep++) {
    const wx = Math.round(rep * 210 - wallScroll);
    px(ctx, wx, 174, 3, 22, '#1e293b');
    px(ctx, wx + 56, 176, 68, 12, '#0f172a');
    px(ctx, wx + 58, 178, 16, 8, pal.wallStripe);
    px(ctx, wx + 78, 180, 40, 3, '#f8fafc');
  }

  // 7. Dual-Lane Drag Strip Asphalt
  px(ctx, 0, 196, LOGICAL_W, 164, pal.roadMain);
  px(ctx, 0, 196, LOGICAL_W, 64, pal.roadTop);
  // Sticky VHT rubber launch grooves
  px(ctx, 0, 236, LOGICAL_W, 14, pal.roadGroove);
  px(ctx, 0, 294, LOGICAL_W, 18, pal.roadGroove);

  // Subtle scrolling asphalt grain texture streaks
  const grainOffset = (cameraFt * pxPerFt) % 64;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
  for (let gx = -64; gx < LOGICAL_W + 64; gx += 64) {
    ctx.fillRect(Math.round(gx - grainOffset), 214, 18, 1);
    ctx.fillRect(Math.round(gx + 28 - grainOffset), 278, 22, 1);
    ctx.fillRect(Math.round(gx + 10 - grainOffset), 322, 16, 1);
  }

  // Center lane divider dashes
  const dashStep = 38;
  const dashOffset = (cameraFt * pxPerFt) % dashStep;
  for (let dx = -dashStep; dx < LOGICAL_W + dashStep; dx += dashStep) {
    px(ctx, dx - dashOffset, 262, 20, 3, '#e2e8f0');
  }

  // Foreground concrete curb
  px(ctx, 0, 334, LOGICAL_W, 26, '#262136');
  px(ctx, 0, 334, LOGICAL_W, 4, pal.wallStripe);

  // 8. World-Anchored Landmarks (Start Line, Distance Markers, Finish Gantry)
  const startScreenX = Math.round(START_LINE_X - cameraFt * pxPerFt);
  if (startScreenX > -50 && startScreenX < LOGICAL_W + 50) {
    for (let cy = 198; cy < 334; cy += 8) {
      px(ctx, startScreenX, cy, 4, 4, '#f8fafc');
      px(ctx, startScreenX + 4, cy + 4, 4, 4, '#f8fafc');
    }
    // Pre-stage & stage laser boxes
    px(ctx, startScreenX - 8, 259, 6, 7, '#fbbf24');
    px(ctx, startScreenX + 3, 259, 6, 7, '#22c55e');
  }

  const allMarkers = [
    { ft: 60, label: '60 FT' },
    { ft: 330, label: '330 FT' },
    { ft: 660, label: '1/8 MI' },
    { ft: 1000, label: '1000 FT' },
    { ft: 1320, label: '1/4 MI' },
    { ft: 2000, label: '2000 FT' },
    { ft: 2640, label: '1/2 MI' },
    { ft: 3960, label: '3/4 MI' },
    { ft: 4620, label: '4620 FT' },
  ];
  const markers = allMarkers.filter((m) => m.ft < distanceFt - 100);
  ctx.font = 'bold 9px monospace';
  for (const m of markers) {
    const mx = Math.round(START_LINE_X + (m.ft - cameraFt) * pxPerFt);
    if (mx > -40 && mx < LOGICAL_W + 40) {
      px(ctx, mx, 158, 3, 38, '#cbd5e1');
      px(ctx, mx - 20, 150, 42, 13, '#0f172a');
      px(ctx, mx - 19, 151, 40, 11, '#f8fafc');
      ctx.fillStyle = '#0f172a';
      ctx.textAlign = 'center';
      ctx.fillText(m.label, mx + 1, 160);
    }
  }

  // Dynamic Finish Line Gantry at distanceFt (1/4 MI, 1/2 MI, or 1 MILE)
  const finishX = Math.round(START_LINE_X + (distanceFt - cameraFt) * pxPerFt);
  if (finishX > -120 && finishX < LOGICAL_W + 120) {
    for (let cy = 196; cy < 334; cy += 8) {
      px(ctx, finishX, cy, 5, 4, '#ffffff');
      px(ctx, finishX + 5, cy, 5, 4, '#09070f');
      px(ctx, finishX, cy + 4, 5, 4, '#09070f');
      px(ctx, finishX + 5, cy + 4, 5, 4, '#ffffff');
    }
    px(ctx, finishX - 4, 96, 8, 100, '#475569');
    px(ctx, finishX - 2, 96, 3, 100, '#94a3b8');
    px(ctx, finishX - 48, 88, 100, 22, '#0f172a');
    px(ctx, finishX - 46, 90, 96, 18, '#ef4444');
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${distanceLabel} FINISH`, finishX + 2, 103);
  }

  // 9. High-Speed Motion Lines (> 140 MPH)
  if (speedMph > 140) {
    const intensity = Math.min(1, (speedMph - 140) / 180);
    ctx.fillStyle = `rgba(255, 255, 255, ${0.12 + intensity * 0.22})`;
    for (let i = 0; i < 10; i++) {
      const sy = 202 + ((i * 15) % 126);
      const sx = LOGICAL_W - ((timeSec * 1200 + i * 113) % (LOGICAL_W + 110));
      const len = 24 + intensity * 58;
      ctx.fillRect(Math.round(sx), sy, Math.round(len), 1.5);
    }
  }
}

export function drawGarageShowcase(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  chassis: ChassisStyle,
  visuals: CarVisuals,
  upgrades: CarUpgrades,
  timeSec: number,
  bodyVariant?: BodyVariant
): void {
  // Crisp illuminated pit workshop dyno bay
  px(ctx, 0, 0, w, h, '#100d1c');
  // Steel wall panels + upper truss beam
  for (let x = 0; x < w; x += 28) {
    px(ctx, x, 0, 1, h - 54, '#1c1730');
  }
  px(ctx, 0, 26, w, 5, '#272040');
  px(ctx, 0, h - 56, w, 2, '#3d345c');

  // Background pit tool chest & tire rack silhouettes
  px(ctx, 18, h - 98, 44, 42, '#7f1d1d');
  px(ctx, 21, h - 94, 38, 6, '#991b1b');
  px(ctx, 21, h - 85, 38, 6, '#991b1b');
  px(ctx, 21, h - 76, 38, 8, '#991b1b');
  px(ctx, 32, h - 92, 16, 1.5, '#e2e8f0');
  px(ctx, 32, h - 83, 16, 1.5, '#e2e8f0');
  px(ctx, 32, h - 73, 16, 1.5, '#e2e8f0');

  // Overhead bay lamps + light cones
  for (const lx of [w * 0.28, w * 0.52, w * 0.76]) {
    px(ctx, lx - 22, 12, 44, 5, '#475569');
    px(ctx, lx - 17, 17, 34, 3, '#fef3c7');
    ctx.fillStyle = 'rgba(254, 243, 199, 0.055)';
    ctx.beginPath();
    ctx.moveTo(lx - 17, 20);
    ctx.lineTo(lx + 17, 20);
    ctx.lineTo(lx + 68, h - 46);
    ctx.lineTo(lx - 68, h - 46);
    ctx.closePath();
    ctx.fill();
  }

  // Dyno floor & recessed roller pit
  px(ctx, 0, h - 54, w, 54, '#1b182c');
  px(ctx, 0, h - 54, w, 2, '#475569');
  // Checkered garage floor border
  for (let fx = 0; fx < w; fx += 14) {
    px(ctx, fx, h - 52, 7, 4, '#2a2440');
  }
  // Dyno roller drums pit
  px(ctx, w * 0.5 - 92, h - 44, 184, 14, '#09070f');
  for (let i = 0; i < 10; i++) {
    px(ctx, w * 0.5 - 86 + i * 18, h - 41, 9, 8, i % 2 === 0 ? '#eab308' : '#1e293b');
  }

  // Subtle engine idle vibration
  const idleVib = Math.sin(timeSec * 34) > 0.65 ? -0.7 : 0;

  drawPixelCar(ctx, {
    x: chassis === 'topfuel' ? w * 0.47 : w * 0.52,
    y: h - 38,
    scale: chassis === 'topfuel' ? 1.85 : chassis === 'funny' ? 2.15 : 2.35,
    chassis,
    bodyVariant,
    visuals,
    upgrades,
    wheelAngle: timeSec * 1.6,
    pitchDeg: 0,
    squatPx: idleVib,
    exhaustFlame: upgrades.nitrous >= 4 && Math.sin(timeSec * 10) > 0.8 ? 0.28 : 0,
    nitrousFlame: 0,
  });
}

function drawFrontOrRearCar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  chassis: ChassisStyle,
  visuals: CarVisuals,
  upgrades: CarUpgrades,
  view: 'front' | 'rear',
  widthFactor: number
): void {
  const paint = visuals.paintColor;
  const paintSpec = liftHex(paint, 66);
  const paintHi = liftHex(paint, 32);
  const paintSh = shadeHex(paint, 0.7);
  const outline = '#09070f';

  const hasBlower = upgrades.induction >= 2 || chassis === 'funny' || chassis === 'topfuel';
  const hasWing =
    upgrades.chassis >= 2 || chassis === 'jdm' || chassis === 'funny' || chassis === 'topfuel';
  const isSlick = upgrades.tires >= 2 || chassis === 'funny' || chassis === 'topfuel';

  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.scale(scale * widthFactor, scale);

  // Soft contact shadow
  ctx.fillStyle = 'rgba(5, 4, 12, 0.62)';
  ctx.beginPath();
  ctx.ellipse(0, -1, chassis === 'topfuel' ? 38 : 34, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  if (chassis === 'topfuel') {
    const tireW = view === 'rear' ? 17 : 5.5;
    const tireH = view === 'rear' ? 28 : 13;
    const trackHalf = view === 'rear' ? 27 : 18;

    // Wide cylindrical 36" rear slicks or skinny front rail wheels
    fillPoly(
      ctx,
      [
        [-trackHalf - tireW * 0.5, -tireH + 2],
        [-trackHalf + tireW * 0.5, -tireH + 2],
        [-trackHalf + tireW * 0.5, -1],
        [-trackHalf - tireW * 0.5, -1],
      ],
      '#15151e',
      outline,
      1.1
    );
    fillPoly(
      ctx,
      [
        [trackHalf - tireW * 0.5, -tireH + 2],
        [trackHalf + tireW * 0.5, -tireH + 2],
        [trackHalf + tireW * 0.5, -1],
        [trackHalf - tireW * 0.5, -1],
      ],
      '#15151e',
      outline,
      1.1
    );
    // Tread highlight bands
    px(ctx, -trackHalf - tireW * 0.25, -tireH + 4, Math.max(2, tireW * 0.35), tireH - 8, '#282838');
    px(ctx, trackHalf - tireW * 0.1, -tireH + 4, Math.max(2, tireW * 0.35), tireH - 8, '#282838');

    // Towering dual-strut rear carbon airfoil wing
    px(ctx, -18, -50, 3.5, 34, '#64748b');
    px(ctx, 14.5, -50, 3.5, 34, '#64748b');
    fillPoly(ctx, [[-34, -56], [34, -56], [32, -46], [-32, -46]], paintSh, outline, 1.2);
    px(ctx, -33, -55, 66, 3, paintSpec);
    px(ctx, -36, -58, 3, 14, paint);
    px(ctx, 33, -58, 3, 14, paint);

    // Tapered central rail fuselage
    fillPoly(ctx, [[-12, -10], [-10, -24], [10, -24], [12, -10]], paint, outline, 1.2);
    px(ctx, -8, -23, 16, 4, paintHi);
    if (visuals.stripe === 'twin') {
      px(ctx, -3.5, -23, 2.2, 12, '#f8fafc');
      px(ctx, 1.3, -23, 2.2, 12, '#f8fafc');
    }

    if (view === 'front') {
      // Front dual-plane downforce wing + cockpit helmet + 14-71 supercharger behind
      fillPoly(ctx, [[-26, -17], [26, -17], [24, -12], [-24, -12]], paintSh, outline, 1);
      drawLine(ctx, -25, -16, 25, -16, paintSpec, 1);
      // Roll cage & helmet
      fillPoly(ctx, [[-7, -23], [-5, -32], [5, -32], [7, -23]], '#1e293b', '#cbd5e1', 1.1);
      fillCircle(ctx, 0, -27.5, 3.2, '#f8fafc');
      px(ctx, -2, -28.2, 4, 1.6, '#0ea5e9');
      // Towering chrome blower + red intake butterflies
      fillPoly(ctx, [[-9, -39], [9, -39], [8, -31], [-8, -31]], '#cbd5e1', outline, 1);
      fillCircle(ctx, -3.5, -35, 2.1, '#ef4444');
      fillCircle(ctx, 3.5, -35, 2.1, '#ef4444');
    } else {
      // Rear axle housing, twin drag chutes & swept zoomie headers
      px(ctx, -20, -16, 40, 5, '#475569');
      fillPoly(ctx, [[-9, -27], [-1.5, -27], [-1.5, -20], [-9, -20]], '#f4f1e6', outline, 1);
      fillPoly(ctx, [[1.5, -27], [9, -27], [9, -20], [1.5, -20]], '#ff4d2e', outline, 1);
      // Left & right zoomie header banks
      px(ctx, -18, -33, 5, 11, '#e2e8f0');
      px(ctx, 13, -33, 5, 11, '#e2e8f0');
    }
    ctx.restore();
    return;
  }

  // Street / Muscle / JDM / Funny Car Front & Rear Sculpted View
  const bodyW = chassis === 'funny' ? 54 : chassis === 'muscle' ? 52 : 48;
  const halfW = bodyW / 2;
  const tireW = view === 'rear' && isSlick ? 13 : 8.5;
  const tireH = view === 'rear' && isSlick ? 17 : 13;

  // Tires
  fillPoly(
    ctx,
    [[-halfW - 1, -tireH], [-halfW + tireW - 1, -tireH], [-halfW + tireW - 1, -1], [-halfW - 1, -1]],
    '#14141d',
    outline,
    1.1
  );
  fillPoly(
    ctx,
    [[halfW - tireW + 1, -tireH], [halfW + 1, -tireH], [halfW + 1, -1], [halfW - tireW + 1, -1]],
    '#14141d',
    outline,
    1.1
  );

  // Rear Drag Wing
  if (hasWing) {
    const wy = chassis === 'funny' ? -35 : -34;
    px(ctx, -halfW + 6, wy + 3, 3, 11, '#1e293b');
    px(ctx, halfW - 9, wy + 3, 3, 11, '#1e293b');
    fillPoly(ctx, [[-halfW - 3, wy], [halfW + 3, wy], [halfW + 2, wy + 4], [-halfW - 2, wy + 4]], paint, outline, 1.1);
    drawLine(ctx, -halfW - 2, wy + 1, halfW + 2, wy + 1, paintSpec, 1);
  }

  // Sculpted Cabin & Angled A-Pillars
  const roofW = chassis === 'funny' ? 28 : 32;
  fillPoly(
    ctx,
    [
      [-halfW + 4, -20],
      [-roofW / 2, -32],
      [roofW / 2, -32],
      [halfW - 4, -20],
    ],
    paint,
    outline,
    1.2
  );
  fillPoly(
    ctx,
    [
      [-halfW + 7, -21],
      [-roofW / 2 + 2, -30],
      [roofW / 2 - 2, -30],
      [halfW - 7, -21],
    ],
    view === 'front' ? '#273549' : '#1e293b',
    outline,
    0.9
  );
  drawLine(ctx, -8, -29, -12, -22, '#93c5fd', 1.5);
  drawLine(ctx, -3, -29, -7, -22, '#bae6fd', 0.9);

  // Main Sculpted Lower Body & Flared Fenders
  fillPoly(
    ctx,
    [
      [-halfW - 2, -9],
      [-halfW - 1, -20],
      [halfW + 1, -20],
      [halfW + 2, -9],
    ],
    paint,
    outline,
    1.25
  );
  px(ctx, -halfW, -19.5, bodyW, 3, paintHi);
  drawLine(ctx, -halfW, -18, halfW, -18, paintSpec, 1);
  px(ctx, -halfW, -12, bodyW, 3, paintSh);

  if (visuals.stripe === 'twin') {
    px(ctx, -5.5, -31, 3.2, 22, '#f8fafc');
    px(ctx, 2.3, -31, 3.2, 22, '#f8fafc');
  } else if (visuals.stripe === 'flames') {
    px(ctx, -12, -19, 24, 3.5, '#f97316');
    px(ctx, -7, -17, 14, 2.5, '#fde047');
  }

  if (view === 'front') {
    // Detailed Headlights + Center Grille / Intercooler
    fillPoly(ctx, [[-halfW + 2, -18], [-halfW + 11, -18], [-halfW + 11, -13.5], [-halfW + 2, -13.5]], '#fef08a', outline, 0.9);
    fillPoly(ctx, [[halfW - 11, -18], [halfW - 2, -18], [halfW - 2, -13.5], [halfW - 11, -13.5]], '#fef08a', outline, 0.9);
    fillPoly(ctx, [[-12, -17.5], [12, -17.5], [12, -10.5], [-12, -10.5]], '#0f172a', outline, 0.9);
    if (chassis === 'jdm') {
      // Exposed aluminum intercooler core
      px(ctx, -10, -15.5, 20, 4.5, '#cbd5e1');
      drawLine(ctx, -9, -13.5, 9, -13.5, '#64748b', 0.8);
    } else {
      drawLine(ctx, -10, -15, 10, -15, '#475569', 1);
      drawLine(ctx, -10, -12.5, 10, -12.5, '#475569', 1);
    }
    if (upgrades.chassis >= 2 || chassis === 'jdm' || chassis === 'funny') {
      px(ctx, -halfW - 3, -9, bodyW + 6, 2.5, '#0f172a');
    }
    if (hasBlower) {
      fillPoly(ctx, [[-8, -29], [8, -29], [7, -20], [-7, -20]], '#cbd5e1', outline, 1);
      fillCircle(ctx, -3.2, -25, 2, '#ef4444');
      fillCircle(ctx, 3.2, -25, 2, '#ef4444');
    }
  } else {
    // Detailed Taillights + Exhaust + Parachute
    if (chassis === 'jdm') {
      // Quad round GTR afterburner taillights
      fillCircle(ctx, -halfW + 5, -16, 2.4, '#ef4444', outline, 0.8);
      fillCircle(ctx, -halfW + 10.5, -16, 2.4, '#ef4444', outline, 0.8);
      fillCircle(ctx, halfW - 10.5, -16, 2.4, '#ef4444', outline, 0.8);
      fillCircle(ctx, halfW - 5, -16, 2.4, '#ef4444', outline, 0.8);
    } else {
      fillPoly(ctx, [[-halfW + 2, -18], [-halfW + 13, -18], [-halfW + 13, -13.5], [-halfW + 2, -13.5]], '#ef4444', outline, 0.9);
      fillPoly(ctx, [[halfW - 13, -18], [halfW - 2, -18], [halfW - 2, -13.5], [halfW - 13, -13.5]], '#ef4444', outline, 0.9);
      px(ctx, -halfW + 4, -16.5, 4, 1.5, '#fca5a5');
      px(ctx, halfW - 8, -16.5, 4, 1.5, '#fca5a5');
    }
    if (chassis === 'funny') {
      fillPoly(ctx, [[-6, -18], [6, -18], [6, -11], [-6, -11]], '#f4f1e6', outline, 1);
      px(ctx, -3, -16, 6, 3, '#ef4444');
    } else {
      px(ctx, -7, -17, 14, 5.5, '#0f172a');
      px(ctx, -5.5, -15.5, 11, 3, '#f5b82e');
    }
    // Dual circular chrome exhaust tips
    fillCircle(ctx, -14, -8.5, 2.2, '#cbd5e1', outline, 0.8);
    fillCircle(ctx, -14, -8.5, 1, '#0f172a');
    fillCircle(ctx, 14, -8.5, 2.2, '#cbd5e1', outline, 0.8);
    fillCircle(ctx, 14, -8.5, 1, '#0f172a');
  }

  ctx.restore();
}

export function getShowroomAngleLabel(angleRad: number): 'SIDE R' | 'FRONT' | 'SIDE L' | 'REAR' {
  const norm = ((angleRad % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  if (norm < Math.PI * 0.25 || norm >= Math.PI * 1.75) return 'SIDE R';
  if (norm < Math.PI * 0.75) return 'FRONT';
  if (norm < Math.PI * 1.25) return 'SIDE L';
  return 'REAR';
}

export function drawShowroomTurntable(
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
  // 1. Deep luxury arcade showroom backdrop
  px(ctx, 0, 0, w, h, '#0d0a17');
  for (let x = 0; x < w; x += 36) {
    px(ctx, x, 0, 1, h - 72, '#18132b');
  }
  px(ctx, 0, 22, w, 5, '#251e3d');
  px(ctx, 0, h - 74, w, 2, '#3d345c');
  px(ctx, 0, h - 72, w, 72, '#141122');

  // 2. Overhead Rigging & Dual Sweeping Spotlights
  const cx = w * 0.5;
  const deckY = h - 42;
  const sweep = Math.sin(timeSec * 0.9) * 22;

  for (const sx of [w * 0.26, w * 0.74]) {
    px(ctx, sx - 16, 10, 32, 6, '#475569');
    px(ctx, sx - 11, 16, 22, 3.5, '#fef3c7');
    ctx.fillStyle = 'rgba(254, 243, 199, 0.065)';
    ctx.beginPath();
    ctx.moveTo(sx - 11, 19);
    ctx.lineTo(sx + 11, 19);
    ctx.lineTo(cx + 122 + sweep * 0.45, deckY + 14);
    ctx.lineTo(cx - 122 + sweep * 0.45, deckY + 14);
    ctx.closePath();
    ctx.fill();
  }

  // 3. Raised Rotating Metallic Showroom Turntable Platform
  const rx = 196;
  const ry = 30;

  // Extruded base skirt
  ctx.fillStyle = '#08060e';
  ctx.beginPath();
  ctx.ellipse(cx, deckY + 13, rx + 3, ry + 3, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#251f3c';
  ctx.beginPath();
  ctx.ellipse(cx, deckY + 9, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();

  // Polished deck surface
  ctx.fillStyle = '#1c1730';
  ctx.beginPath();
  ctx.ellipse(cx, deckY, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();

  // Inner subtle reflection ring
  ctx.strokeStyle = '#362d54';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(cx, deckY, rx - 26, ry - 5, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Outer brass/gold showroom rim
  ctx.strokeStyle = '#f5b82e';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.ellipse(cx, deckY, rx, ry, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Rotating perimeter LED markers & brushed radial lines
  const spokeCount = 16;
  for (let i = 0; i < spokeCount; i++) {
    const a = angleRad + (i * Math.PI * 2) / spokeCount;
    const tx = cx + Math.cos(a) * rx;
    const ty = deckY + Math.sin(a) * ry;
    const ix = cx + Math.cos(a) * (rx - 30);
    const iy = deckY + Math.sin(a) * (ry - 5);

    drawLine(ctx, ix, iy, tx, ty, 'rgba(245, 184, 46, 0.14)', 1);
    const isFrontHalf = Math.sin(a) > 0;
    fillCircle(ctx, tx, ty, isFrontHalf ? 2.4 : 1.6, isFrontHalf ? '#fde047' : '#64748b');
  }

  // 4. Car Rotating on Turntable (Side R -> Front -> Side L -> Rear)
  const cosA = Math.cos(angleRad);
  const sinA = Math.sin(angleRad);
  const absCos = Math.abs(cosA);
  const absSin = Math.abs(sinA);
  const baseScale = chassis === 'topfuel' ? 2.05 : chassis === 'funny' ? 2.35 : 2.6;
  const carY = deckY + 4;

  if (absCos >= 0.42) {
    const facingDir = cosA >= 0 ? 1 : -1;
    const stretchX = 0.72 + ((absCos - 0.42) / 0.58) * 0.28;
    const xShift = chassis === 'topfuel' ? -10 * facingDir : 0;

    ctx.save();
    ctx.translate(Math.round(cx + xShift), Math.round(carY));
    ctx.scale(facingDir * stretchX, 1);
    drawPixelCar(ctx, {
      x: 0,
      y: 0,
      scale: baseScale,
      chassis,
      bodyVariant,
      visuals,
      upgrades,
      wheelAngle: angleRad * 0.5,
      pitchDeg: 0,
      squatPx: 0,
      exhaustFlame: 0,
      nitrousFlame: 0,
    });
    ctx.restore();
  } else {
    const view: 'front' | 'rear' = sinA >= 0 ? 'front' : 'rear';
    const widthFactor = 0.86 + Math.max(0, absSin - 0.75) * 0.56;
    drawFrontOrRearCar(
      ctx,
      cx,
      carY,
      baseScale,
      chassis,
      visuals,
      upgrades,
      view,
      widthFactor
    );
  }
}
