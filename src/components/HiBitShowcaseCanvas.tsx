import React, { useEffect, useRef, useState } from 'react';
import {
  drawHiBitPitBay,
  drawHiBitShowroomTurntable,
  getHiBitShowroomAngleLabel,
  ShowroomAngle,
} from '../engine/hibitArt';
import { BodyVariant, CarUpgrades, CarVisuals, ChassisStyle } from '../types/game';

interface HiBitShowcaseCanvasProps {
  mode: 'pitbay' | 'turntable';
  wide?: boolean;
  chassis: ChassisStyle;
  bodyVariant?: BodyVariant;
  visuals: CarVisuals;
  upgrades: CarUpgrades;
  spinning?: boolean;
  snapQuarterTick?: number;
  className?: string;
}

const ANGLE_BADGE_LABELS: Record<ShowroomAngle, string> = {
  'SIDE R': 'RIGHT PROFILE',
  FRONT: 'FRONT ELEVATION',
  'SIDE L': 'LEFT PROFILE',
  REAR: 'REAR ELEVATION',
};

/**
 * Pure 2D Hi-Bit Pixel Art Showcase Canvas (Zero 3D / Zero WebGL / Zero Anti-Aliasing):
 * - 'pitbay': 320×160 (or 520×160 wide) logical pixels with open paddock doors, dyno rollers & reflections
 * - 'turntable': 340×180 logical pixels with 4-angle pixel rotation (SIDE R / FRONT / SIDE L / REAR)
 */
export const HiBitShowcaseCanvas: React.FC<HiBitShowcaseCanvasProps> = ({
  mode,
  wide = false,
  chassis,
  bodyVariant,
  visuals,
  upgrades,
  spinning = true,
  snapQuarterTick = 0,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const angleRef = useRef(0);
  const targetAngleRef = useRef<number | null>(null);
  const spinningRef = useRef(spinning);
  spinningRef.current = spinning;

  const [angleLabel, setAngleLabel] = useState<ShowroomAngle>('SIDE R');
  const lastLabelRef = useRef<ShowroomAngle>('SIDE R');
  const prevSnapRef = useRef(snapQuarterTick);

  const propsRef = useRef({ chassis, bodyVariant, visuals, upgrades });
  propsRef.current = { chassis, bodyVariant, visuals, upgrades };

  // Trigger clean 90° turntable step when button clicked
  useEffect(() => {
    if (mode !== 'turntable') return;
    if (snapQuarterTick !== prevSnapRef.current) {
      prevSnapRef.current = snapQuarterTick;
      const quarter = Math.PI / 2;
      const curBase = targetAngleRef.current ?? angleRef.current;
      targetAngleRef.current = Math.round(curBase / quarter) * quarter + quarter;
    }
  }, [mode, snapQuarterTick]);

  // Reset angle cleanly when switching chassis/car on turntable
  useEffect(() => {
    if (mode !== 'turntable') return;
    angleRef.current = 0;
    targetAngleRef.current = null;
    lastLabelRef.current = 'SIDE R';
    setAngleLabel('SIDE R');
  }, [mode, chassis, bodyVariant]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const logicalW = mode === 'turntable' ? 340 : wide ? 520 : 320;
    const logicalH = mode === 'turntable' ? 180 : 160;
    canvas.width = logicalW;
    canvas.height = logicalH;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    let alive = true;
    let rafId = 0;
    let lastNow = performance.now();
    const startMs = lastNow;

    const tick = () => {
      if (!alive) return;
      const now = performance.now();
      const dt = Math.min(0.05, Math.max(0.001, (now - lastNow) / 1000));
      lastNow = now;
      const timeSec = (now - startMs) / 1000;
      const cur = propsRef.current;

      if (mode === 'pitbay') {
        drawHiBitPitBay(
          ctx,
          logicalW,
          logicalH,
          cur.chassis,
          cur.visuals,
          cur.upgrades,
          timeSec,
          cur.bodyVariant
        );
      } else {
        if (targetAngleRef.current !== null) {
          const diff = targetAngleRef.current - angleRef.current;
          if (Math.abs(diff) < 0.02) {
            angleRef.current = targetAngleRef.current;
            targetAngleRef.current = null;
          } else {
            angleRef.current += diff * Math.min(1, dt * 10);
          }
        } else if (spinningRef.current) {
          angleRef.current += dt * 0.62;
        }

        drawHiBitShowroomTurntable(
          ctx,
          logicalW,
          logicalH,
          cur.chassis,
          cur.visuals,
          cur.upgrades,
          angleRef.current,
          timeSec,
          cur.bodyVariant
        );

        const nextLabel = getHiBitShowroomAngleLabel(angleRef.current);
        if (nextLabel !== lastLabelRef.current) {
          lastLabelRef.current = nextLabel;
          setAngleLabel(nextLabel);
        }
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      alive = false;
      cancelAnimationFrame(rafId);
    };
  }, [mode, wide]);

  return (
    <div className={`relative w-full h-full select-none ${className}`}>
      <canvas
        ref={canvasRef}
        className="pixel-canvas w-full h-full block"
        aria-label={
          mode === 'pitbay' ? 'Hi-bit garage pit bay preview' : 'Hi-bit 4-angle showroom turntable'
        }
      />
      {mode === 'turntable' && (
        <div className="pointer-events-none absolute bottom-2 right-2 bg-[#0b0a0f]/92 border-2 border-[#525866] px-2.5 py-1 font-pixel text-[8px] text-[#f7b519]">
          {ANGLE_BADGE_LABELS[angleLabel]}
        </div>
      )}
    </div>
  );
};
