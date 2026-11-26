import {
  BodyVariant,
  CarUpgrades,
  CarVisuals,
  ChassisStyle,
  EnvironmentTheme,
  TimeOfDay,
} from '../types/game';
import { drawHiBitCarProfile, getHiBitCarMetrics, px } from './hibitArt';

/**
 * Unified Logical Pixel Resolution (640 × 360) -> exact 3× integer scale into 1920 × 1080!
 * Guarantees chunky, clean, uniform pixel size on cars, track, and props with zero blur or mixed-res pixels.
 */
const LOGICAL_W = 640;
const LOGICAL_H = 360;
const PIXELS_PER_FT = 6.2;

export interface HiBitStripCarConfig {
  chassis: ChassisStyle;
  bodyVariant?: BodyVariant;
  visuals: CarVisuals;
  upgrades: CarUpgrades;
}

export interface HiBitStripState {
  cameraFt: number;
  playerDistFt: number;
  playerMph: number;
  playerWheelAngle: number;
  playerPitchDeg: number;
  playerSquatPx: number;
  playerExhaustFlame: number;
  playerNitrousFlame: number;
  playerChuteOpen: number;
  rivalDistFt: number;
  rivalWheelAngle: number;
  rivalPitchDeg: number;
  rivalExhaustFlame: number;
  rivalChuteOpen: number;
  treeStep: number; // 0=prestage, 1=stage, 2=amb1, 3=amb2, 4=amb3, 5=green, -1=foul
  shakeAmp: number; // launch-only shake!
  simTime: number;
  elapsedSec: number;
}

interface HiBitParticle {
  active: boolean;
  worldFt: number;
  y: number;
  vFt: number;
  vy: number;
  size: number;
  color: string;
  shade: string;
  kind: 'smoke' | 'spark';
  life: number;
  maxLife: number;
}

interface LightingPalette {
  skyStops: [number, string][];
  hillFar: string;
  hillFarTop: string;
  hillMid: string;
  hillMidTop: string;
  standBody: string;
  standRoof: string;
  wallTop: string;
  wallFace: string;
  asphalt: string;
  asphaltHi: string;
  rubberStreak: string;
  laneDash: string;
  cloudMain: string;
  cloudShadow: string;
}

const LIGHTING_PALETTES: Record<TimeOfDay, LightingPalette> = {
  afternoon: {
    skyStops: [
      [0, '#2088e5'],
      [0.52, '#5cc3ff'],
      [0.85, '#b6e9ff'],
      [1, '#e8f9ff'],
    ],
    hillFar: '#6b9bc7',
    hillFarTop: '#8db9de',
    hillMid: '#4f7ea8',
    hillMidTop: '#719ec4',
    standBody: '#3d5278',
    standRoof: '#e8eef7',
    wallTop: '#d7e2f2',
    wallFace: '#8fa3bf',
    asphalt: '#353e52',
    asphaltHi: '#424d66',
    rubberStreak: '#262d3d',
    laneDash: '#f8fafc',
    cloudMain: '#ffffff',
    cloudShadow: '#c7e3fa',
  },
  sunset: {
    skyStops: [
      [0, '#361b66'],
      [0.34, '#7d2f7a'],
      [0.64, '#d9534f'],
      [0.86, '#f68a38'],
      [1, '#ffd066'],
    ],
    hillFar: '#592d6e',
    hillFarTop: '#96477e',
    hillMid: '#432157',
    hillMidTop: '#c45e52',
    standBody: '#2d2247',
    standRoof: '#f2a154',
    wallTop: '#f5b878',
    wallFace: '#7a4869',
    asphalt: '#2c2740',
    asphaltHi: '#3a3352',
    rubberStreak: '#1e1a2e',
    laneDash: '#ffe49e',
    cloudMain: '#ffba73',
    cloudShadow: '#a6466d',
  },
  night: {
    skyStops: [
      [0, '#0a0f24'],
      [0.48, '#131d40'],
      [0.82, '#1f2f5c'],
      [1, '#2b3e70'],
    ],
    hillFar: '#162140',
    hillFarTop: '#263866',
    hillMid: '#121a33',
    hillMidTop: '#22325c',
    standBody: '#1a233d',
    standRoof: '#384c78',
    wallTop: '#566d99',
    wallFace: '#273554',
    asphalt: '#21283b',
    asphaltHi: '#2c354d',
    rubberStreak: '#161b29',
    laneDash: '#94a8cc',
    cloudMain: '#2b3e6e',
    cloudShadow: '#1a2647',
  },
};

const SPONSOR_BANNERS: { bg: string; border: string; fg: string; text: string }[] = [
  { bg: '#ef3b2d', border: '#7a1919', fg: '#ffffff', text: 'REDLINE' },
  { bg: '#f5b82e', border: '#754e0b', fg: '#172038', text: 'NITRO 88' },
  { bg: '#2563eb', border: '#132d73', fg: '#ffffff', text: 'APEX SLICKS' },
  { bg: '#16a34a', border: '#0c4f26', fg: '#ffffff', text: 'DYNO LAB' },
  { bg: '#0ea5e9', border: '#0b4b6e', fg: '#0f172a', text: 'TURBO CO' },
  { bg: '#e11d48', border: '#6e0d24', fg: '#fef08a', text: 'DRAG PRO' },
];

/**
 * Pure 2D Hi-Bit Pixel Art Drag Strip Renderer:
 * Layer 1: Native-resolution smooth gradient sky (zero dithering, zero banding).
 * Layer 2: Unified logical 640×360 pixel buffer composited nearest-neighbor (zero blur, crisp pixels).
 */
export class HiBitStripRenderer {
  private container: HTMLElement;
  private displayCanvas: HTMLCanvasElement;
  private displayCtx: CanvasRenderingContext2D;
  private pixelCanvas: HTMLCanvasElement;
  private pctx: CanvasRenderingContext2D;
  private resizeObserver: ResizeObserver;

  private theme: EnvironmentTheme;
  private timeOfDay: TimeOfDay;
  private distanceFt: number;
  private playerCfg: HiBitStripCarConfig;
  private rivalCfg: HiBitStripCarConfig | null;
  private particles: HiBitParticle[] = [];

  private dispW = 1280;
  private dispH = 720;

  constructor(
    container: HTMLElement,
    theme: EnvironmentTheme,
    timeOfDay: TimeOfDay,
    distanceFt: number,
    playerCfg: HiBitStripCarConfig,
    rivalCfg: HiBitStripCarConfig | null
  ) {
    this.container = container;
    this.theme = theme;
    this.timeOfDay = timeOfDay;
    this.distanceFt = distanceFt;
    this.playerCfg = playerCfg;
    this.rivalCfg = rivalCfg;

    this.displayCanvas = document.createElement('canvas');
    this.displayCanvas.className = 'w-full h-full block pixel-canvas';
    this.container.innerHTML = '';
    this.container.appendChild(this.displayCanvas);

    this.displayCtx = this.displayCanvas.getContext('2d')!;
    this.pixelCanvas = document.createElement('canvas');
    this.pixelCanvas.width = LOGICAL_W;
    this.pixelCanvas.height = LOGICAL_H;
    this.pctx = this.pixelCanvas.getContext('2d')!;
    this.pctx.imageSmoothingEnabled = false;

    for (let i = 0; i < 90; i++) {
      this.particles.push({
        active: false,
        worldFt: 0,
        y: 0,
        vFt: 0,
        vy: 0,
        size: 3,
        color: '#e2e8f0',
        shade: '#94a3b8',
        kind: 'smoke',
        life: 0,
        maxLife: 0.6,
      });
    }

    this.handleResize();
    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(this.container);
  }

  private handleResize(): void {
    const rect = this.container.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.dispW = Math.max(320, Math.round((rect.width || 960) * dpr));
    this.dispH = Math.max(180, Math.round((rect.height || 540) * dpr));
    this.displayCanvas.width = this.dispW;
    this.displayCanvas.height = this.dispH;
    this.displayCtx.imageSmoothingEnabled = false;
  }

  public clearParticles(): void {
    for (const p of this.particles) p.active = false;
  }

  public spawnSmoke(worldFt: number, laneYOffset: number, count: number, speedFt: number): void {
    let spawned = 0;
    for (const p of this.particles) {
      if (p.active) continue;
      p.active = true;
      p.kind = 'smoke';
      p.worldFt = worldFt - Math.random() * 2.5;
      p.y = laneYOffset - 2 - Math.random() * 6;
      p.vFt = -(speedFt * (0.4 + Math.random() * 0.7));
      p.vy = -(8 + Math.random() * 16);
      p.size = 4 + Math.floor(Math.random() * 5);
      p.color = this.timeOfDay === 'sunset' ? '#ffe8d6' : '#f1f5f9';
      p.shade = this.timeOfDay === 'sunset' ? '#d4a5a5' : '#94a3b8';
      p.life = 0;
      p.maxLife = 0.45 + Math.random() * 0.35;
      spawned++;
      if (spawned >= count) break;
    }
  }

  public spawnWheelieSparks(worldFt: number, laneYOffset: number, count: number): void {
    let spawned = 0;
    for (const p of this.particles) {
      if (p.active) continue;
      p.active = true;
      p.kind = 'spark';
      p.worldFt = worldFt;
      p.y = laneYOffset - 2;
      p.vFt = -(14 + Math.random() * 24);
      p.vy = -(16 + Math.random() * 28);
      p.size = 1 + (Math.random() > 0.6 ? 1 : 0);
      p.color = Math.random() > 0.4 ? '#fef08a' : '#ffffff';
      p.shade = '#f97316';
      p.life = 0;
      p.maxLife = 0.22 + Math.random() * 0.16;
      spawned++;
      if (spawned >= count) break;
    }
  }

  public updateAndRender(state: HiBitStripState, dt: number): void {
    const pal = LIGHTING_PALETTES[this.timeOfDay];

    // Step pixel particles
    for (const p of this.particles) {
      if (!p.active) continue;
      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        continue;
      }
      p.worldFt += p.vFt * dt;
      p.y += p.vy * dt;
      if (p.kind === 'spark') {
        p.vy += 110 * dt; // gravity on sparks
      } else {
        p.vFt *= Math.pow(0.86, dt * 60);
        p.vy *= Math.pow(0.92, dt * 60);
      }
    }

    // Wheelie-bar caster sparks when front lifts sharply on launch!
    const playerMetrics = getHiBitCarMetrics(this.playerCfg.chassis, this.playerCfg.upgrades);
    if (
      playerMetrics.hasWheelieBar &&
      state.playerPitchDeg <= -4.5 &&
      state.playerMph > 8 &&
      Math.random() < dt * 32
    ) {
      this.spawnWheelieSparks(state.playerDistFt - 11.5, 0, 2);
    }

    // --- LAYER 1: SMOOTH GRADIENT SKY ON NATIVE DISPLAY CANVAS (zero dithering, zero banding) ---
    const dctx = this.displayCtx;
    const skyGrad = dctx.createLinearGradient(0, 0, 0, this.dispH * 0.66);
    for (const [stop, color] of pal.skyStops) {
      skyGrad.addColorStop(stop, color);
    }
    dctx.fillStyle = skyGrad;
    dctx.fillRect(0, 0, this.dispW, this.dispH);

    // --- LAYER 2: UNIFIED LOGICAL 640×360 PIXEL ART LAYER ---
    const ctx = this.pctx;
    ctx.clearRect(0, 0, LOGICAL_W, LOGICAL_H);
    ctx.imageSmoothingEnabled = false;

    const horizonY = 178;
    const wallTopY = 204;
    const roadTopY = 226;
    const rivalLaneY = 266;
    const playerLaneY = 314;
    const roadBotY = LOGICAL_H;

    // Responsive logical camera anchor so player car is always generously framed on mobile & desktop!
    const aspect = this.dispW / Math.max(1, this.dispH);
    const carScreenAnchorX = aspect < 1.15 ? 255 : 210;
    const worldToX = (ft: number) => Math.round(carScreenAnchorX + (ft - state.cameraFt) * PIXELS_PER_FT);

    // 1. Sky Celestial Elements (Pixel Clouds or Night Stars/Moon)
    this.drawSkyDecor(ctx, state.cameraFt, pal);

    // 2. Far Parallax Background (Desert Hills/Mesas OR Distant City Skyline)
    this.drawFarParallax(ctx, state.cameraFt, horizonY, pal);

    // 3. Mid Parallax: Light Towers, Grandstands with Pixel Crowds, Venue Landmarks
    this.drawMidParallax(ctx, state.cameraFt, wallTopY, pal, state.simTime);

    // 4. Trackside Retaining Wall, Indie Sponsor Banners & Distance Markers
    this.drawWallAndBanners(ctx, state.cameraFt, wallTopY, roadTopY, pal, worldToX);

    // 5. Asphalt Drag Strip, Rubber Launch Streaks, Lane Dividers & Start/Finish Beams
    this.drawAsphaltStrip(
      ctx,
      state.cameraFt,
      roadTopY,
      roadBotY,
      rivalLaneY,
      playerLaneY,
      pal,
      worldToX
    );

    // 6. Wet Burnout Box Pixel Reflections (right behind start line!)
    this.drawBurnoutBoxReflections(
      ctx,
      state,
      rivalLaneY,
      playerLaneY,
      worldToX
    );

    // 7. NHRA Christmas Tree Start Tower & Live Trackside Timing Board (ET / Trap MPH)
    this.drawChristmasTree(ctx, worldToX(18), roadTopY + 8, state.treeStep);
    this.drawTimingBoard(
      ctx,
      worldToX(this.distanceFt + 22),
      wallTopY - 2,
      state.elapsedSec,
      state.playerMph
    );
    // Also place a visible start-area scoreboard so players see live ET/MPH right off the line!
    this.drawTimingBoard(
      ctx,
      worldToX(44),
      wallTopY - 2,
      state.elapsedSec,
      state.playerMph
    );

    // 8. Far Lane: Rival Car
    if (this.rivalCfg) {
      const rx = worldToX(state.rivalDistFt);
      if (rx > -160 && rx < LOGICAL_W + 180) {
        drawHiBitCarProfile({
          ctx,
          x: rx,
          groundY: rivalLaneY,
          chassis: this.rivalCfg.chassis,
          bodyVariant: this.rivalCfg.bodyVariant,
          visuals: this.rivalCfg.visuals,
          upgrades: this.rivalCfg.upgrades,
          wheelAngle: state.rivalWheelAngle,
          pitchDeg: state.rivalPitchDeg,
          squatPx: state.rivalDistFt > 0.5 ? 1 : 0,
          exhaustFlame: state.rivalExhaustFlame,
          chuteOpen: state.rivalChuteOpen,
          timeOfDay: this.timeOfDay,
          simTime: state.simTime,
        });
      }
    }

    // 9. Pixel Smoke & Wheelie-Bar Sparks (behind/around player tire)
    this.drawParticles(ctx, playerLaneY, worldToX);

    // 10. Near Lane: Player Car
    const pxPos = worldToX(state.playerDistFt);
    drawHiBitCarProfile({
      ctx,
      x: pxPos,
      groundY: playerLaneY,
      chassis: this.playerCfg.chassis,
      bodyVariant: this.playerCfg.bodyVariant,
      visuals: this.playerCfg.visuals,
      upgrades: this.playerCfg.upgrades,
      wheelAngle: state.playerWheelAngle,
      pitchDeg: state.playerPitchDeg,
      squatPx: state.playerSquatPx,
      exhaustFlame: state.playerExhaustFlame,
      nitrousFlame: state.playerNitrousFlame,
      chuteOpen: state.playerChuteOpen,
      timeOfDay: this.timeOfDay,
      simTime: state.simTime,
    });

    // 11. Night Floodlight Atmospheric Cones (clean translucent bands over top of scene, zero bloom!)
    if (this.timeOfDay === 'night') {
      this.drawNightLightCones(ctx, state.cameraFt, wallTopY);
    }

    // --- COMPOSITE LOGICAL PIXEL BUFFER CRISP NEAREST-NEIGHBOR ONTO DISPLAY CANVAS ---
    // Cover-crop preserving exact 1:1 square pixels (exact 3× integer scale at 1920×1080!)
    const scale = Math.max(this.dispW / LOGICAL_W, this.dispH / LOGICAL_H);
    const drawW = Math.round(LOGICAL_W * scale);
    const drawH = Math.round(LOGICAL_H * scale);
    // Slight screen shake ON LAUNCH ONLY (snapped cleanly to pixel grid steps!)
    const shakePx =
      state.shakeAmp > 0.05
        ? Math.round((Math.random() - 0.5) * 2 * Math.min(2.5, state.shakeAmp) * scale)
        : 0;
    const shakePy =
      state.shakeAmp > 0.05
        ? Math.round((Math.random() - 0.5) * 2 * Math.min(2.0, state.shakeAmp) * scale)
        : 0;

    // Horizontally bias crop slightly left on narrow mobile screens so player car & tree both stay centered
    const cropX = Math.round((this.dispW - drawW) * (aspect < 1.15 ? 0.36 : 0.5));
    const cropY = Math.round(this.dispH - drawH); // Anchor bottom asphalt cleanly to viewport bottom

    dctx.imageSmoothingEnabled = false;
    dctx.drawImage(this.pixelCanvas, cropX + shakePx, cropY + shakePy, drawW, drawH);
  }

  private drawSkyDecor(
    ctx: CanvasRenderingContext2D,
    cameraFt: number,
    pal: LightingPalette
  ): void {
    if (this.timeOfDay === 'night') {
      // Crisp 1px & 2px pixel stars
      for (let i = 0; i < 42; i++) {
        const sx = (i * 73 + 19) % LOGICAL_W;
        const sy = 10 + ((i * 37) % 92);
        px(ctx, sx, sy, i % 5 === 0 ? 2 : 1, i % 5 === 0 ? 2 : 1, i % 3 === 0 ? '#fef08a' : '#dbeafe');
      }
      // Crisp pixel crescent moon
      px(ctx, 540, 26, 16, 16, '#fef9c3');
      px(ctx, 546, 24, 14, 14, '#0c132d');
      return;
    }

    // Cheerful cel-shaded pixel clouds (Afternoon & Golden Sunset)
    const scroll = Math.round(cameraFt * 0.14);
    for (let i = 0; i < 6; i++) {
      const cx = ((((i * 138 - scroll) % (LOGICAL_W + 140)) + (LOGICAL_W + 140)) % (LOGICAL_W + 140)) - 70;
      const cy = 22 + (i % 3) * 22;
      const cw = 44 + (i % 2) * 18;
      // Cloud underside cel shadow
      px(ctx, cx + 4, cy + 10, cw - 6, 5, pal.cloudShadow);
      // Chunky crisp cloud puffs
      px(ctx, cx, cy + 5, cw, 7, pal.cloudMain);
      px(ctx, cx + 8, cy, cw - 18, 7, pal.cloudMain);
      px(ctx, cx + 16, cy - 4, cw - 34, 5, pal.cloudMain);
    }

    // Golden sunset sun disc sitting above the distant hills
    if (this.timeOfDay === 'sunset') {
      const sx = 490;
      const sy = 102;
      px(ctx, sx - 16, sy - 10, 32, 20, '#ffd86b');
      px(ctx, sx - 12, sy - 14, 24, 28, '#ffd86b');
      px(ctx, sx - 10, sy - 10, 20, 12, '#fff7cc');
    }
  }

  private drawFarParallax(
    ctx: CanvasRenderingContext2D,
    cameraFt: number,
    horizonY: number,
    pal: LightingPalette
  ): void {
    const isCity = this.theme === 'metro' || this.theme === 'nationals';
    const scroll = Math.round(cameraFt * 0.45);
    const tileW = 160;
    const startTile = Math.floor(scroll / tileW) - 1;

    for (let t = startTile; t <= startTile + 6; t++) {
      const bx = t * tileW - scroll;
      const hSeed = Math.abs(t * 29 + 7);

      if (isCity) {
        // Distant city skyline silhouettes with crisp glowing windows at sunset/night
        for (let b = 0; b < 5; b++) {
          const x = bx + b * 32;
          const bw = 26 + ((hSeed + b * 5) % 6);
          const bh = 28 + ((hSeed + b * 17) % 52);
          px(ctx, x, horizonY - bh, bw, bh + 30, pal.hillFar);
          px(ctx, x, horizonY - bh, bw, 3, pal.hillFarTop);
          if (this.timeOfDay !== 'afternoon') {
            for (let wy = horizonY - bh + 6; wy < horizonY - 4; wy += 6) {
              for (let wx = x + 4; wx < x + bw - 4; wx += 6) {
                if ((wx + wy + t) % 3 !== 0) {
                  px(ctx, wx, wy, 2, 3, this.timeOfDay === 'night' ? '#fef08a' : '#ffd08a');
                }
              }
            }
          }
        }
      } else {
        // Desert hills & flat-topped mesas (Golf Story / Southwest Drag Strip charm!)
        const mesaH = 26 + (hSeed % 30);
        px(ctx, bx, horizonY - mesaH, 92, mesaH + 30, pal.hillFar);
        px(ctx, bx + 10, horizonY - mesaH - 10, 72, 10, pal.hillFar);
        px(ctx, bx + 10, horizonY - mesaH - 10, 72, 3, pal.hillFarTop);
        // Rolling secondary dune/hill
        const hillH = 18 + ((hSeed + 11) % 22);
        px(ctx, bx + 78, horizonY - hillH, 86, hillH + 30, pal.hillMid);
        px(ctx, bx + 86, horizonY - hillH - 6, 70, 6, pal.hillMid);
        px(ctx, bx + 86, horizonY - hillH - 6, 70, 2, pal.hillMidTop);
      }
    }
  }

  private drawMidParallax(
    ctx: CanvasRenderingContext2D,
    cameraFt: number,
    wallTopY: number,
    pal: LightingPalette,
    simTime: number
  ): void {
    const scroll = Math.round(cameraFt * 1.6);
    const chunkW = 220;
    const startIdx = Math.floor(scroll / chunkW) - 1;
    const crowdColors = ['#ff5938', '#facc15', '#38bdf8', '#f8f5ea', '#4ade80', '#fb923c'];

    for (let c = startIdx; c <= startIdx + 5; c++) {
      const gx = c * chunkW - scroll;

      // Towering Stadium Floodlight Trusses every chunk!
      const towerX = gx + 12;
      px(ctx, towerX, wallTopY - 106, 5, 106, '#334155');
      px(ctx, towerX + 1, wallTopY - 106, 2, 106, '#64748b');
      // Light head bank
      px(ctx, towerX - 11, wallTopY - 116, 28, 12, '#1e293b');
      px(ctx, towerX - 9, wallTopY - 114, 24, 8, this.timeOfDay === 'night' ? '#fffbe6' : '#cbd5e1');
      if (this.timeOfDay === 'night') {
        for (let b = 0; b < 4; b++) {
          px(ctx, towerX - 7 + b * 6, wallTopY - 112, 4, 4, '#ffffff');
        }
      }

      // Covered Grandstands with Cheerful Cel-Shaded Spectators
      const standX = gx + 48;
      const standW = 152;
      const standTopY = wallTopY - 52;
      px(ctx, standX, standTopY, standW, 52, pal.standBody);
      // Awning canopy roof
      px(ctx, standX - 4, standTopY - 8, standW + 8, 8, pal.standRoof);
      px(ctx, standX - 4, standTopY - 2, standW + 8, 2, '#1e293b');

      // 4 Bleacher Rows + Bobbing Indie Pixel Spectators!
      for (let row = 0; row < 4; row++) {
        const ry = standTopY + 10 + row * 10;
        px(ctx, standX + 4, ry + 5, standW - 8, 2, '#1a243b');
        for (let sx = standX + 8; sx < standX + standW - 10; sx += 8) {
          const idx = Math.abs(c * 13 + sx + row * 7);
          const bob = idx % 4 === 0 ? Math.round(Math.sin(simTime * 5 + idx) * 0.6) : 0;
          const shirt = crowdColors[idx % crowdColors.length];
          px(ctx, sx, ry + bob, 4, 4, shirt);
          px(ctx, sx + 1, ry - 2 + bob, 2, 2, '#f5c79e'); // head
        }
      }

      // Night Neon Trackside Signage mounted on roof!
      if (this.timeOfDay === 'night') {
        const signColor = c % 2 === 0 ? '#38bdf8' : '#ff4d6d';
        px(ctx, standX + 36, standTopY - 20, 80, 11, '#0d1326');
        px(ctx, standX + 37, standTopY - 19, 78, 9, signColor);
        px(ctx, standX + 39, standTopY - 17, 74, 5, '#0d1326');
        px(ctx, standX + 44, standTopY - 15, 64, 2, '#ffffff');
      }
    }
  }

  private drawWallAndBanners(
    ctx: CanvasRenderingContext2D,
    cameraFt: number,
    wallTopY: number,
    roadTopY: number,
    pal: LightingPalette,
    worldToX: (ft: number) => number
  ): void {
    const wallH = roadTopY - wallTopY;
    // Continuous concrete barrier wall
    px(ctx, 0, wallTopY, LOGICAL_W, wallH, pal.wallFace);
    px(ctx, 0, wallTopY, LOGICAL_W, 4, pal.wallTop);
    px(ctx, 0, roadTopY - 3, LOGICAL_W, 3, '#1e2638');

    // Vibrant repeating sponsor banners along retaining wall
    const scrollPx = Math.round(cameraFt * PIXELS_PER_FT);
    const bannerStep = 104;
    const firstIdx = Math.floor(scrollPx / bannerStep) - 1;
    for (let i = firstIdx; i <= firstIdx + 9; i++) {
      const bx = i * bannerStep - scrollPx;
      const spec = SPONSOR_BANNERS[Math.abs(i) % SPONSOR_BANNERS.length];
      px(ctx, bx + 4, wallTopY + 5, 86, 13, spec.border);
      px(ctx, bx + 5, wallTopY + 6, 84, 11, spec.bg);
      // Crisp pixel lettering inside banner
      ctx.fillStyle = spec.fg;
      ctx.font = 'bold 7px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(spec.text, bx + 47, wallTopY + 14);
    }

    // Track Distance Boards (60 FT, 330 FT, 660 FT, 1/4 MI, 1/2 MI, 1 MI)
    const markers: { ft: number; label: string }[] = [
      { ft: 60, label: '60 FT' },
      { ft: 330, label: '330 FT' },
      { ft: 660, label: '1/8 MI' },
      { ft: 1320, label: '1/4 MI' },
    ];
    if (this.distanceFt >= 2640) markers.push({ ft: 2640, label: '1/2 MI' });
    if (this.distanceFt >= 5280) markers.push({ ft: 5280, label: '1 MILE' });

    for (const mk of markers) {
      const mx = worldToX(mk.ft);
      if (mx < -40 || mx > LOGICAL_W + 40) continue;
      px(ctx, mx - 1, wallTopY - 16, 2, 16, '#475569');
      px(ctx, mx - 18, wallTopY - 26, 36, 12, '#131826');
      px(ctx, mx - 17, wallTopY - 25, 34, 10, mk.ft === this.distanceFt ? '#f5b82e' : '#f8fafc');
      ctx.fillStyle = '#111623';
      ctx.font = 'bold 7px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(mk.label, mx, wallTopY - 18);
    }
  }

  private drawAsphaltStrip(
    ctx: CanvasRenderingContext2D,
    cameraFt: number,
    roadTopY: number,
    roadBotY: number,
    rivalLaneY: number,
    playerLaneY: number,
    pal: LightingPalette,
    worldToX: (ft: number) => number
  ): void {
    // Main drag strip asphalt surface
    px(ctx, 0, roadTopY, LOGICAL_W, roadBotY - roadTopY, pal.asphalt);
    // Subtle crisp asphalt apron highlight along top curb & foreground edge
    px(ctx, 0, roadTopY, LOGICAL_W, 4, pal.asphaltHi);
    px(ctx, 0, roadBotY - 14, LOGICAL_W, 14, '#1b2133');
    px(ctx, 0, roadBotY - 15, LOGICAL_W, 2, '#f5b82e');

    // Dual dark rubber-streak launch grooves down both lanes!
    const streakStartX = Math.max(0, worldToX(-14));
    const streakEndX = Math.min(LOGICAL_W, worldToX(Math.min(this.distanceFt, 420)));
    if (streakEndX > streakStartX) {
      const sw = streakEndX - streakStartX;
      // Far lane rubber groove
      px(ctx, streakStartX, rivalLaneY - 6, sw, 4, pal.rubberStreak);
      px(ctx, streakStartX, rivalLaneY + 1, sw, 4, pal.rubberStreak);
      // Near lane rubber groove
      px(ctx, streakStartX, playerLaneY - 6, sw, 5, pal.rubberStreak);
      px(ctx, streakStartX, playerLaneY + 2, sw, 5, pal.rubberStreak);
    }

    // Scrolling subtle asphalt grain flecks (minimal & clean, never noisy!)
    const scrollPx = Math.round(cameraFt * PIXELS_PER_FT);
    const grainStep = 48;
    const gStart = Math.floor(scrollPx / grainStep) - 1;
    for (let g = gStart; g <= gStart + 16; g++) {
      const gx = g * grainStep - scrollPx;
      px(ctx, gx + 10, roadTopY + 16 + ((Math.abs(g) * 7) % 14), 5, 1, pal.asphaltHi);
      px(ctx, gx + 28, playerLaneY + 12 + ((Math.abs(g) * 5) % 12), 6, 1, pal.asphaltHi);
    }

    // Crisp dashed lane divider between Rival & Player lanes
    const divY = Math.round((rivalLaneY + playerLaneY) * 0.5) - 2;
    const dashStep = 34;
    const dStart = Math.floor(scrollPx / dashStep) - 1;
    for (let d = dStart; d <= dStart + 22; d++) {
      const dx = d * dashStep - scrollPx;
      px(ctx, dx, divY, 18, 3, pal.laneDash);
    }

    // Start Line Staging Beams (Pre-Stage & Stage crisp white lines)
    const startX = worldToX(6);
    if (startX > -40 && startX < LOGICAL_W + 40) {
      px(ctx, startX - 6, roadTopY + 2, 2, roadBotY - roadTopY - 17, '#94a3b8');
      px(ctx, startX, roadTopY + 2, 4, roadBotY - roadTopY - 17, '#f8fafc');
    }

    // Checkered Finish Line + Overhead Finish Gantry!
    const finishX = worldToX(this.distanceFt);
    if (finishX > -80 && finishX < LOGICAL_W + 80) {
      const sq = 6;
      for (let fy = roadTopY + 2; fy < roadBotY - 16; fy += sq) {
        const row = Math.floor((fy - roadTopY) / sq);
        px(ctx, finishX, fy, sq, sq, row % 2 === 0 ? '#f8fafc' : '#131826');
        px(ctx, finishX + sq, fy, sq, sq, row % 2 === 0 ? '#131826' : '#f8fafc');
      }
      // Crisp pixel overhead finish banner truss
      px(ctx, finishX - 2, roadTopY - 96, 5, 98, '#475569');
      px(ctx, finishX - 18, roadTopY - 98, 42, 16, '#131826');
      px(ctx, finishX - 16, roadTopY - 96, 38, 12, '#ff4d3d');
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('FINISH', finishX + 3, roadTopY - 87);
    }
  }

  /**
   * Wet Burnout Box with crisp inverted pixel reflections of staged cars!
   */
  private drawBurnoutBoxReflections(
    ctx: CanvasRenderingContext2D,
    state: HiBitStripState,
    rivalLaneY: number,
    playerLaneY: number,
    worldToX: (ft: number) => number
  ): void {
    const boxLeft = worldToX(-22);
    const boxRight = worldToX(12);
    if (boxRight < 0 || boxLeft > LOGICAL_W) return;
    const bw = boxRight - boxLeft;

    const puddleFill =
      this.timeOfDay === 'sunset'
        ? 'rgba(138, 72, 118, 0.34)'
        : this.timeOfDay === 'night'
        ? 'rgba(42, 68, 122, 0.36)'
        : 'rgba(92, 162, 224, 0.28)';
    const shimmerColor =
      this.timeOfDay === 'sunset'
        ? 'rgba(255, 206, 128, 0.42)'
        : this.timeOfDay === 'night'
        ? 'rgba(147, 197, 253, 0.36)'
        : 'rgba(232, 249, 255, 0.45)';

    // Draw glistening wet burnout patches in both lanes
    for (const ly of [rivalLaneY, playerLaneY]) {
      px(ctx, boxLeft, ly - 5, bw, 18, puddleFill);
      px(ctx, boxLeft + 4, ly - 3, bw - 8, 1, shimmerColor);
      px(ctx, boxLeft + 10, ly + 8, bw - 20, 1, shimmerColor);
    }

    // Crisp inverted pixel reflection of Rival & Player while over the wet burnout box!
    if (this.rivalCfg && state.rivalDistFt < 18) {
      const rx = worldToX(state.rivalDistFt);
      ctx.save();
      ctx.beginPath();
      ctx.rect(boxLeft, rivalLaneY, bw, 16);
      ctx.clip();
      ctx.globalAlpha = 0.28;
      ctx.translate(rx, rivalLaneY + 1);
      ctx.scale(1, -0.42);
      drawHiBitCarProfile({
        ctx,
        x: 0,
        groundY: 0,
        chassis: this.rivalCfg.chassis,
        bodyVariant: this.rivalCfg.bodyVariant,
        visuals: this.rivalCfg.visuals,
        upgrades: this.rivalCfg.upgrades,
        wheelAngle: state.rivalWheelAngle,
        timeOfDay: this.timeOfDay,
        drawShadow: false,
        isReflection: true,
      });
      ctx.restore();
    }

    if (state.playerDistFt < 18) {
      const pxPos = worldToX(state.playerDistFt);
      ctx.save();
      ctx.beginPath();
      ctx.rect(boxLeft, playerLaneY, bw, 18);
      ctx.clip();
      ctx.globalAlpha = 0.3;
      ctx.translate(pxPos, playerLaneY + 1);
      ctx.scale(1, -0.46);
      drawHiBitCarProfile({
        ctx,
        x: 0,
        groundY: 0,
        chassis: this.playerCfg.chassis,
        bodyVariant: this.playerCfg.bodyVariant,
        visuals: this.playerCfg.visuals,
        upgrades: this.playerCfg.upgrades,
        wheelAngle: state.playerWheelAngle,
        timeOfDay: this.timeOfDay,
        drawShadow: false,
        isReflection: true,
      });
      ctx.restore();
    }
  }

  /**
   * NHRA Christmas-Tree Start Tower with Pre-Stage, Stage, 3 Amber, Green & Foul Red bulbs!
   */
  private drawChristmasTree(
    ctx: CanvasRenderingContext2D,
    x: number,
    baseY: number,
    treeStep: number
  ): void {
    if (x < -30 || x > LOGICAL_W + 30) return;
    const ix = Math.round(x);
    const iy = Math.round(baseY);

    // Base pedestal & vertical steel mast
    px(ctx, ix - 7, iy - 4, 14, 5, '#334155');
    px(ctx, ix - 2, iy - 76, 4, 72, '#475569');
    px(ctx, ix - 1, iy - 76, 1, 72, '#94a3b8');

    // Main bulb housing box
    px(ctx, ix - 9, iy - 78, 18, 56, '#141a29');
    px(ctx, ix - 8, iy - 77, 16, 54, '#25304a');

    // Top Pre-Stage & Stage white/blue twin bulbs
    const preOn = treeStep >= 0;
    const stageOn = treeStep >= 1;
    px(ctx, ix - 5, iy - 74, 3, 3, preOn ? '#fef08a' : '#334155');
    px(ctx, ix + 2, iy - 74, 3, 3, preOn ? '#fef08a' : '#334155');
    px(ctx, ix - 5, iy - 68, 3, 3, stageOn ? '#facc15' : '#334155');
    px(ctx, ix + 2, iy - 68, 3, 3, stageOn ? '#facc15' : '#334155');

    // 3 Amber countdown bulbs
    for (let a = 0; a < 3; a++) {
      const lit = treeStep >= 2 + a && treeStep !== -1;
      const by = iy - 59 + a * 9;
      px(ctx, ix - 6, by, 5, 5, lit ? '#facc15' : '#3b2e16');
      px(ctx, ix + 1, by, 5, 5, lit ? '#facc15' : '#3b2e16');
      if (lit) {
        px(ctx, ix - 5, by + 1, 2, 2, '#ffffff');
        px(ctx, ix + 2, by + 1, 2, 2, '#ffffff');
      }
    }

    // Green GO bulb & Red FOUL bulb
    const greenLit = treeStep >= 5;
    const foulLit = treeStep === -1;
    px(ctx, ix - 6, iy - 32, 5, 5, greenLit ? '#22c55e' : '#143322');
    px(ctx, ix + 1, iy - 32, 5, 5, greenLit ? '#22c55e' : '#143322');
    if (greenLit) {
      px(ctx, ix - 5, iy - 31, 2, 2, '#dcfce7');
      px(ctx, ix + 2, iy - 31, 2, 2, '#dcfce7');
    }

    px(ctx, ix - 6, iy - 25, 5, 4, foulLit ? '#ff3b30' : '#3b1515');
    px(ctx, ix + 1, iy - 25, 5, 4, foulLit ? '#ff3b30' : '#3b1515');
  }

  /**
   * Trackside Timing Board showing live ET & Trap Speed in crisp pixel digits!
   */
  private drawTimingBoard(
    ctx: CanvasRenderingContext2D,
    x: number,
    wallTopY: number,
    elapsedSec: number,
    mph: number
  ): void {
    if (x < -70 || x > LOGICAL_W + 70) return;
    const ix = Math.round(x);
    const topY = wallTopY - 46;

    // Twin steel legs
    px(ctx, ix - 22, topY + 32, 4, 16, '#334155');
    px(ctx, ix + 18, topY + 32, 4, 16, '#334155');

    // Scoreboard housing (dark solid background + thick single-color border)
    px(ctx, ix - 34, topY, 68, 34, '#3c4d73');
    px(ctx, ix - 32, topY + 2, 64, 30, '#0e1320');

    // Live ET & MPH pixel text
    ctx.textAlign = 'center';
    ctx.font = 'bold 7px monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('ET / MPH', ix, topY + 10);

    ctx.font = 'bold 9px monospace';
    ctx.fillStyle = '#facc15';
    ctx.fillText(`${elapsedSec.toFixed(2)}s`, ix, topY + 20);

    ctx.fillStyle = '#22c55e';
    ctx.fillText(`${Math.round(mph)} MPH`, ix, topY + 29);
  }

  private drawParticles(
    ctx: CanvasRenderingContext2D,
    playerLaneY: number,
    worldToX: (ft: number) => number
  ): void {
    for (const p of this.particles) {
      if (!p.active) continue;
      const sx = worldToX(p.worldFt);
      const sy = Math.round(playerLaneY + p.y);
      if (sx < -20 || sx > LOGICAL_W + 20) continue;

      if (p.kind === 'spark') {
        px(ctx, sx, sy, p.size + 1, p.size, p.shade);
        px(ctx, sx, sy, p.size, p.size, p.color);
      } else {
        const lifeT = p.life / p.maxLife;
        const r = Math.max(2, Math.round(p.size * (0.7 + lifeT * 0.85)));
        ctx.save();
        ctx.globalAlpha = Math.max(0.15, (1 - lifeT) * 0.85);
        // Chunky cel-shaded pixel tire smoke puff!
        px(ctx, sx - r, sy - r + 1, r * 2, r * 2 - 2, p.shade);
        px(ctx, sx - r + 1, sy - r, r * 2 - 2, r * 2 - 2, p.color);
        ctx.restore();
      }
    }
  }

  private drawNightLightCones(
    ctx: CanvasRenderingContext2D,
    cameraFt: number,
    wallTopY: number
  ): void {
    const scroll = Math.round(cameraFt * 1.6);
    const chunkW = 220;
    const startIdx = Math.floor(scroll / chunkW) - 1;
    ctx.save();
    ctx.fillStyle = 'rgba(255, 250, 220, 0.06)';
    for (let c = startIdx; c <= startIdx + 5; c++) {
      const tx = c * chunkW - scroll + 14;
      ctx.beginPath();
      ctx.moveTo(tx - 10, wallTopY - 106);
      ctx.lineTo(tx + 16, wallTopY - 106);
      ctx.lineTo(tx + 96, LOGICAL_H);
      ctx.lineTo(tx - 86, LOGICAL_H);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  public dispose(): void {
    this.resizeObserver.disconnect();
    this.displayCanvas.remove();
  }
}
