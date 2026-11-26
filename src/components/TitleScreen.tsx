import React, { useEffect, useRef } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { getCarById, getCarConfig } from '../data/gameData';
import {
  drawChristmasTree,
  drawEnvironment,
  drawPixelCar,
  LOGICAL_H,
  LOGICAL_W,
  PLAYER_LANE_Y,
  PX_PER_FT,
  RIVAL_LANE_Y,
  START_LINE_X,
  TREE_BASE_Y,
  TREE_X_OFFSET,
} from '../engine/pixelSprites';
import { PlayerSave } from '../types/game';

interface TitleScreenProps {
  save: PlayerSave;
  muted: boolean;
  onToggleMute: () => void;
  onStart: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  save,
  muted,
  onToggleMute,
  onStart,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Enter / Space starts immediately
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        onStart();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onStart]);

  // Live animated 16-bit drag strip attract mode
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = LOGICAL_W;
    canvas.height = LOGICAL_H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    const playerCar = getCarById(save.activeCarId);
    const playerCfg = getCarConfig(save, save.activeCarId);

    let rafId = 0;
    const startMs = performance.now();

    const draw = (now: number) => {
      const t = (now - startMs) / 1000;
      const cycle = t % 9;
      const treeStep =
        cycle < 2.2 ? 1 : cycle < 3.2 ? 2 : cycle < 4.2 ? 3 : cycle < 5.2 ? 4 : 5;
      const launchT = Math.max(0, cycle - 5.2);
      const demoDist = launchT > 0 ? Math.min(260, launchT * launchT * 42) : 0;
      const camFt = demoDist - 8;

      drawEnvironment(ctx, 'backroad', camFt, t, launchT > 0 ? 110 + launchT * 45 : 0, PX_PER_FT);

      // Rival Top-Fuel Dragster in upper lane
      const rivalX = Math.round(START_LINE_X + (demoDist * 1.12 - camFt) * PX_PER_FT);
      drawPixelCar(ctx, {
        x: rivalX,
        y: RIVAL_LANE_Y,
        scale: 0.9,
        chassis: 'topfuel',
        visuals: { paintColor: '#e8b624', stripe: 'flames', rims: 'prostar' },
        upgrades: { engine: 5, induction: 5, transmission: 5, tires: 5, chassis: 5, nitrous: 5 },
        wheelAngle: demoDist * 0.45,
        pitchDeg: launchT > 0 && launchT < 1.2 ? -6.5 : 0,
        squatPx: Math.sin(t * 28) > 0.6 ? 1 : 0,
        exhaustFlame: launchT > 0 ? 0.95 : Math.sin(t * 14) > 0.5 ? 0.35 : 0,
        nitrousFlame: 0,
        dimmed: true,
      });

      // Christmas Tree
      const treeX = Math.round(START_LINE_X + TREE_X_OFFSET - camFt * PX_PER_FT);
      if (treeX > -40 && treeX < LOGICAL_W + 40) {
        drawChristmasTree(ctx, treeX, TREE_BASE_Y, treeStep);
      }

      // Player's active car in bottom foreground lane
      const playerX = Math.round(START_LINE_X + (demoDist - camFt) * PX_PER_FT);
      drawPixelCar(ctx, {
        x: playerX,
        y: PLAYER_LANE_Y,
        scale: 1.08,
        chassis: playerCar.chassis,
        visuals: playerCfg.visuals,
        upgrades: playerCfg.upgrades,
        wheelAngle: demoDist * 0.45,
        pitchDeg: launchT > 0 && launchT < 1.0 ? -5.5 : 0,
        squatPx: Math.sin(t * 34) > 0.65 ? 1 : 0,
        exhaustFlame: launchT > 0 ? 0.85 : Math.sin(t * 10) > 0.7 ? 0.25 : 0,
        nitrousFlame: launchT > 0.8 ? 0.7 : 0,
      });

      rafId = requestAnimationFrame(draw);
    };

    rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  }, [save]);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#0d0b14]">
      {/* Live 8-bit Pixel-Art Attract Canvas */}
      <canvas
        ref={canvasRef}
        className="pixel-canvas w-full h-full object-cover block"
      />

      {/* Measured contrast scrim over upper sky negative space for crisp legibility */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#0d0b14]/75 via-[#0d0b14]/20 to-[#0d0b14]/85" />

      {/* Top-right mute affordance */}
      <div className="absolute top-5 right-6 z-20 flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleMute}
          aria-label={muted ? 'Unmute audio' : 'Mute audio'}
          className="arcade-btn h-10 w-10 flex items-center justify-center bg-[#151221]/90 border-2 border-[#3a3154] text-[#f4f1e6] hover:border-[#f5b82e] focus-visible:outline-2 focus-visible:outline-[#f5b82e]"
        >
          {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>
      </div>

      {/* Centered Title Lockup over Upper Calm Sky Negative Space */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-between py-10 px-6 pointer-events-none">
        <div className="flex flex-col items-center text-center mt-2">
          {/* Bespoke Inline SVG Pixel-Chrome Arcade Lockup */}
          <svg
            viewBox="0 0 540 124"
            className="w-[340px] sm:w-[490px] md:w-[540px] h-auto drop-shadow-[0_6px_0_rgba(9,7,15,0.95)]"
            role="img"
            aria-label="REDLINE '88"
          >
            <defs>
              <linearGradient id="redlineChrome" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fff3b0" />
                <stop offset="42%" stopColor="#ff9f1c" />
                <stop offset="52%" stopColor="#ff4d2e" />
                <stop offset="100%" stopColor="#b91c1c" />
              </linearGradient>
            </defs>
            {/* Checkered speed accent bars */}
            <rect x="28" y="18" width="96" height="6" fill="#ff4d2e" />
            <rect x="132" y="18" width="20" height="6" fill="#f5b82e" />
            <rect x="388" y="18" width="20" height="6" fill="#f5b82e" />
            <rect x="416" y="18" width="96" height="6" fill="#ff4d2e" />

            {/* Hard pixel drop block */}
            <text
              x="274"
              y="84"
              textAnchor="middle"
              fill="#09070f"
              style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: '42px',
                letterSpacing: '2px',
              }}
            >
              REDLINE &apos;88
            </text>
            <text
              x="270"
              y="80"
              textAnchor="middle"
              fill="url(#redlineChrome)"
              stroke="#09070f"
              strokeWidth="4"
              paintOrder="stroke"
              style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: '42px',
                letterSpacing: '2px',
              }}
            >
              REDLINE &apos;88
            </text>

            {/* Clean subtitle strip */}
            <text
              x="270"
              y="112"
              textAnchor="middle"
              fill="#f4f1e6"
              style={{
                fontFamily: "'Chakra Petch', sans-serif",
                fontSize: '14px',
                fontWeight: 700,
                letterSpacing: '5px',
              }}
            >
              8-BIT QUARTER-MILE DRAG RACING
            </text>
          </svg>
        </div>

        {/* Bottom Primary CTA & Single Flat Control Hint Line */}
        <div className="flex flex-col items-center gap-4 mb-2 pointer-events-auto">
          <button
            type="button"
            onClick={onStart}
            className="arcade-btn px-10 py-4 bg-[#ff4d2e] hover:bg-[#ff6247] text-white font-pixel text-sm sm:text-base tracking-wider border-2 border-[#fff3b0] shadow-[0_5px_0_#7f1d1d] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f5b82e] whitespace-nowrap cursor-pointer"
          >
            ENTER GARAGE
          </button>

          <p className="font-mono-num text-xs sm:text-sm text-[#e2dff0]/90 tracking-wide text-center">
            W / Up Gas · Shift Clutch · Space Shift Up · N Nitrous · Esc Pause
          </p>
        </div>
      </div>
    </div>
  );
};
