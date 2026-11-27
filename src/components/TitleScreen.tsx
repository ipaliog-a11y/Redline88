import React, { useEffect, useRef } from 'react';
import { getCarById, getCarConfig } from '../data/gameData';
import { HiBitStripRenderer } from '../engine/hibitStripRenderer';
import { PlayerSave } from '../types/game';
import { PixelIcon } from './PixelSpritesUI';

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
  const mountRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<HiBitStripRenderer | null>(null);
  const saveRef = useRef(save);
  saveRef.current = save;

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

  // Live Hi-Bit 16-Bit Pixel Art Golden-Hour Sunset Attract Strip (mounted once)
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const initialSave = saveRef.current;
    const playerCar = getCarById(initialSave.activeCarId);
    const playerCfg = getCarConfig(initialSave, initialSave.activeCarId);

    const renderer = new HiBitStripRenderer(
      container,
      'speedway',
      'sunset',
      1320,
      {
        chassis: playerCar.chassis,
        bodyVariant: playerCar.bodyVariant,
        visuals: playerCfg.visuals,
        upgrades: playerCfg.upgrades,
      },
      {
        chassis: 'topfuel',
        bodyVariant: 'slingshot',
        visuals: { paintColor: '#f5b82e', stripe: 'flames', rims: 'prostar' },
        upgrades: { engine: 5, induction: 5, transmission: 5, tires: 5, chassis: 5, nitrous: 5 },
      }
    );
    rendererRef.current = renderer;

    let alive = true;
    let rafId = 0;
    let lastNow = performance.now();
    const startMs = lastNow;

    const tick = () => {
      if (!alive) return;
      const now = performance.now();
      const dt = Math.min(0.05, Math.max(0.001, (now - lastNow) / 1000));
      lastNow = now;

      const t = (now - startMs) / 1000;
      const cycle = t % 9;
      const treeStep =
        cycle < 2.2 ? 1 : cycle < 3.2 ? 2 : cycle < 4.2 ? 3 : cycle < 5.2 ? 4 : 5;
      const launchT = Math.max(0, cycle - 5.2);
      const demoDist = launchT > 0 ? Math.min(480, launchT * launchT * 46) : 0;
      const rivalDist = launchT > 0 ? Math.min(540, launchT * launchT * 52) : 0;
      const mph = launchT > 0 ? Math.min(260, 40 + launchT * 62) : 0;

      if (launchT > 0 && launchT < 0.75 && Math.random() < dt * 18) {
        renderer.spawnSmoke(demoDist - 5.5, 0, 2, 16);
      }

      renderer.updateAndRender(
        {
          cameraFt: demoDist - 8,
          playerDistFt: demoDist,
          playerMph: mph,
          playerWheelAngle: demoDist * 0.45,
          playerPitchDeg: launchT > 0 && launchT < 1.0 ? -6.2 : 0,
          playerSquatPx: Math.sin(t * 28) > 0.65 ? 1 : 0,
          playerExhaustFlame: launchT > 0 ? 0.9 : Math.sin(t * 10) > 0.72 ? 0.25 : 0,
          playerNitrousFlame: launchT > 0.95 ? 1 : 0,
          playerChuteOpen: 0,
          rivalDistFt: rivalDist,
          rivalWheelAngle: rivalDist * 0.45,
          rivalPitchDeg: launchT > 0 && launchT < 1.1 ? -7.2 : 0,
          rivalExhaustFlame: launchT > 0 ? 1 : 0.35,
          rivalChuteOpen: 0,
          treeStep,
          shakeAmp: launchT > 0 && launchT < 0.22 ? 2.0 : 0,
          simTime: t,
          elapsedSec: launchT,
        },
        dt
      );

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      alive = false;
      cancelAnimationFrame(rafId);
      renderer.dispose();
      rendererRef.current = null;
    };
  }, []);

  // Live-update attract-mode player car when cloud save loads without restarting the animation
  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer) return;
    const playerCar = getCarById(save.activeCarId);
    const playerCfg = getCarConfig(save, save.activeCarId);
    renderer.setPlayerCar({
      chassis: playerCar.chassis,
      bodyVariant: playerCar.bodyVariant,
      visuals: playerCfg.visuals,
      upgrades: playerCfg.upgrades,
    });
  }, [save]);

  return (
    <div className="relative w-full h-[100dvh] overflow-hidden bg-[#141218]">
      {/* Live Hi-Bit 16-Bit Pixel Art Golden-Hour Drag Strip */}
      <div ref={mountRef} className="w-full h-full" />

      {/* Top-Right Arcade Keycap Audio Toggle */}
      <div className="absolute top-4 right-4 sm:top-5 sm:right-6 z-20 flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleMute}
          aria-label={muted ? 'Unmute audio' : 'Mute audio'}
          className="ng-keycap h-11 w-11 flex items-center justify-center bg-[#201e26]/95 hover:bg-[#2d2a36] border-2 border-[#b8c0cc] cursor-pointer"
        >
          <PixelIcon name={muted ? 'soundOff' : 'soundOn'} className="w-5 h-5" />
        </button>
      </div>

      {/* Centered Neo-Geo Arcade Marquee & Hazard-Chevron Start CTA */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-between py-7 sm:py-10 px-4 sm:px-6 pointer-events-none">
        <div className="flex flex-col items-center text-center mt-2 w-full">
          <div className="ng-plate-gold -skew-x-6 overflow-hidden shadow-[6px_6px_0_#07060a]">
            <div className="ng-checkered-bar h-2.5 w-full" />
            <div className="px-7 sm:px-12 py-4 sm:py-5 flex flex-col items-center">
              <h1 className="font-pixel text-xl sm:text-4xl md:text-[44px] text-[#e83b24] pixel-text-shadow-lg tracking-wider leading-none">
                REDLINE <span className="text-[#f7b519]">&apos;88</span>
              </h1>
              <div className="mt-2.5 bg-[#0b0a0f] border border-[#525866] px-3 py-1 font-mono-num text-[10px] sm:text-xs font-bold tracking-[0.26em] text-[#19d4e6] uppercase">
                90s HI-BIT DRAG RACING
              </div>
            </div>
            <div className="ng-checkered-bar h-2.5 w-full" />
          </div>
        </div>

        {/* Bottom Primary Hazard-Chevron Start CTA & Controls */}
        <div className="flex flex-col items-center gap-3 mb-2 pointer-events-auto">
          <button
            type="button"
            onClick={onStart}
            className="ng-chevron-cta focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f7b519] cursor-pointer"
          >
            <span className="ng-chevron-inner px-8 sm:px-11 py-3.5 font-pixel text-xs sm:text-sm tracking-wider pixel-text-shadow whitespace-nowrap">
              PRESS START · ENTER PADDOCK
            </span>
          </button>

          <div className="ng-vfd border-2 border-[#525866] px-4 py-1.5 font-mono-num text-[11px] sm:text-xs text-[#f4ecd8] tracking-wide text-center">
            <span className="sm:hidden">TOUCH PEDALS OR KEYBOARD · MANUAL CLUTCH &amp; SHIFT</span>
            <span className="hidden sm:inline">
              <span className="text-[#2ee66b] font-bold">W</span> GAS ·{' '}
              <span className="text-[#f7b519] font-bold">SHIFT</span> CLUTCH ·{' '}
              <span className="text-[#e83b24] font-bold">SPACE</span> SHIFT+ ·{' '}
              <span className="text-[#19d4e6] font-bold">N</span> NITROUS ·{' '}
              <span className="text-[#b8c0cc] font-bold">ESC</span> PAUSE
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
