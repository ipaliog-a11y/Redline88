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
    <div className="relative w-full h-[100dvh] overflow-hidden bg-[#111623]">
      {/* Live Hi-Bit 16-Bit Pixel Art Golden-Hour Drag Strip */}
      <div ref={mountRef} className="w-full h-full" />

      {/* Top-Right Sleek Audio Toggle */}
      <div className="absolute top-4 right-4 sm:top-5 sm:right-6 z-20 flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleMute}
          aria-label={muted ? 'Unmute audio' : 'Mute audio'}
          className="pixel-btn h-11 w-11 rounded-full flex items-center justify-center bg-[#192136]/90 hover:bg-[#24304d] border border-[#5670a6]/60 backdrop-blur-sm cursor-pointer"
        >
          <PixelIcon name={muted ? 'soundOff' : 'soundOn'} className="w-5 h-5" />
        </button>
      </div>

      {/* Centered Clean Modern Marquee & Start CTA */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-between py-7 sm:py-10 px-4 sm:px-6 pointer-events-none">
        <div className="flex flex-col items-center text-center mt-2 w-full">
          <div className="pixel-panel-accent rounded-3xl px-6 sm:px-10 py-4 sm:py-5 inline-flex flex-col items-center backdrop-blur-sm">
            <h1 className="font-pixel text-xl sm:text-4xl md:text-[42px] text-[#f5b82e] pixel-text-shadow-lg tracking-wider leading-none">
              REDLINE &apos;88
            </h1>
            <div className="mt-2.5 font-mono-num text-[11px] sm:text-xs font-bold tracking-[0.26em] text-[#e2e8f0] uppercase">
              HI-BIT DRAG RACING
            </div>
          </div>
        </div>

        {/* Bottom Primary Start CTA & Controls */}
        <div className="flex flex-col items-center gap-3 mb-2 pointer-events-auto">
          <button
            type="button"
            onClick={onStart}
            className="pixel-btn rounded-full px-9 sm:px-12 py-4 bg-gradient-to-b from-[#ff5e4d] to-[#e6392a] hover:from-[#ff7061] hover:to-[#f04435] text-[#ffffff] font-pixel text-xs sm:text-sm tracking-wider border-2 border-[#f5b82e] pixel-text-shadow focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f5b82e] whitespace-nowrap cursor-pointer"
          >
            PRESS START · ENTER GARAGE
          </button>

          <div className="pixel-panel rounded-full px-5 py-2 font-mono-num text-[11px] sm:text-xs text-[#cbd5e1] tracking-wide text-center backdrop-blur-sm">
            <span className="sm:hidden">Touch Pedals or Keyboard · Manual Clutch &amp; Shift</span>
            <span className="hidden sm:inline">
              W Gas · Shift Clutch · Space Shift Up · N Nitrous · Esc Pause
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
