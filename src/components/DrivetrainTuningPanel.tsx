import React, { useMemo } from 'react';
import { RotateCcw } from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';
import {
  computeCarPerformance,
  computeGearMaxMph,
  createTrackPresetTuning,
  getCarById,
  getEffectiveTuning,
} from '../data/gameData';
import { CarConfig, DrivetrainTuning } from '../types/game';

interface DrivetrainTuningPanelProps {
  carId: string;
  config: CarConfig;
  onUpdateTuning: (carId: string, nextTuning: DrivetrainTuning) => void;
}

const GEAR_COLORS = ['#ef4444', '#f97316', '#facc15', '#22c55e', '#38bdf8', '#a855f7'];

export const DrivetrainTuningPanel: React.FC<DrivetrainTuningPanelProps> = ({
  carId,
  config,
  onUpdateTuning,
}) => {
  const car = getCarById(carId);
  const tuning = useMemo(() => getEffectiveTuning(carId, config), [carId, config]);
  const perf = useMemo(() => computeCarPerformance(carId, config), [carId, config]);

  // Compute gear curve data for SVG chart & table
  const gearMetrics = useMemo(() => {
    return tuning.gearRatios.map((ratio, idx) => {
      const maxMph = computeGearMaxMph(car, perf.redlineRpm, ratio, tuning.finalDrive);
      const prevRatio = idx > 0 ? tuning.gearRatios[idx - 1] : null;
      const dropRpm = prevRatio
        ? Math.max(car.idleRpm + 600, Math.round(perf.redlineRpm * (ratio / prevRatio)))
        : car.idleRpm;
      const prevMaxMph = idx > 0
        ? computeGearMaxMph(car, perf.redlineRpm, tuning.gearRatios[idx - 1], tuning.finalDrive)
        : 0;
      return {
        gear: idx + 1,
        ratio,
        stockRatio: car.gearRatios[idx],
        maxMph,
        startMph: idx === 0 ? 0 : Math.min(maxMph - 5, Math.round(prevMaxMph * 0.98)),
        dropRpm,
      };
    });
  }, [car, perf.redlineRpm, tuning]);

  const topGearMaxMph = gearMetrics[gearMetrics.length - 1]?.maxMph ?? 140;
  const chartMaxMph = Math.max(150, Math.ceil((Math.max(topGearMaxMph, perf.topSpeedMph) + 25) / 25) * 25);

  // Launch & shift RPM windows with tuning offsets applied
  const launchMin = Math.max(
    car.idleRpm + 500,
    Math.min(perf.redlineRpm - 1400, car.launchRpmMin + tuning.launchRpmOffset - perf.shiftWindowBonus * 0.5)
  );
  const launchMax = Math.max(
    launchMin + 650,
    Math.min(perf.redlineRpm - 350, car.launchRpmMax + tuning.launchRpmOffset + perf.shiftWindowBonus * 0.5)
  );
  const shiftMin = Math.max(
    car.idleRpm + 1800,
    Math.min(perf.redlineRpm - 700, car.shiftRpmMin + tuning.shiftRpmOffset - perf.shiftWindowBonus)
  );
  const shiftMax = Math.min(
    perf.redlineRpm + 120,
    Math.max(shiftMin + 500, car.shiftRpmMax + tuning.shiftRpmOffset + perf.shiftWindowBonus * 0.4)
  );

  const launchStartPct = (launchMin / (perf.redlineRpm * 1.04)) * 100;
  const launchWidthPct = ((launchMax - launchMin) / (perf.redlineRpm * 1.04)) * 100;
  const shiftStartPct = (shiftMin / (perf.redlineRpm * 1.04)) * 100;
  const shiftWidthPct = ((shiftMax - shiftMin) / (perf.redlineRpm * 1.04)) * 100;

  const isTopGearShortForMile = topGearMaxMph < perf.topSpeedMph + 8;

  const applyPreset = (preset: 'stock' | 'quarter' | 'half' | 'mile') => {
    soundEngine.playUiClick();
    onUpdateTuning(carId, createTrackPresetTuning(carId, preset));
  };

  const handleFinalDrive = (val: number) => {
    onUpdateTuning(carId, {
      ...tuning,
      finalDrive: Number(val.toFixed(2)),
    });
  };

  const handleGearRatio = (index: number, val: number) => {
    const nextRatios = [...tuning.gearRatios];
    nextRatios[index] = Number(val.toFixed(2));
    onUpdateTuning(carId, {
      ...tuning,
      gearRatios: nextRatios,
    });
  };

  const handleLaunchOffset = (val: number) => {
    onUpdateTuning(carId, {
      ...tuning,
      launchRpmOffset: Math.round(val),
    });
  };

  const handleShiftOffset = (val: number) => {
    onUpdateTuning(carId, {
      ...tuning,
      shiftRpmOffset: Math.round(val),
    });
  };

  // SVG chart coordinates
  const svgW = 520;
  const svgH = 160;
  const padL = 44;
  const padR = 16;
  const padT = 14;
  const padB = 26;
  const plotW = svgW - padL - padR;
  const plotH = svgH - padT - padB;
  const xForMph = (mph: number) => padL + Math.max(0, Math.min(1, mph / chartMaxMph)) * plotW;
  const yForRpm = (rpm: number) => padT + (1 - Math.max(0, Math.min(1, rpm / (perf.redlineRpm * 1.05)))) * plotH;

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Track Strategy Presets Bar */}
      <div className="arcade-panel p-3 sm:p-4 space-y-2.5 sm:space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-[#f4f1e6]">Drivetrain Tuning</h3>
            <p className="hidden sm:block text-xs text-[#94a3b8]">
              Optimize final drive, individual gear ratios, and shift targets for 1/4 mile, 1/2 mile, or 1 mile strips.
            </p>
          </div>
          <div className="grid grid-cols-4 sm:flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => applyPreset('quarter')}
              className="arcade-btn px-2 sm:px-3 py-2 sm:py-1.5 bg-[#1e1933] hover:bg-[#2a2347] border border-[#ff4d2e] text-[11px] sm:text-xs font-bold text-[#f4f1e6] whitespace-nowrap cursor-pointer"
            >
              1/4 Mi
            </button>
            <button
              type="button"
              onClick={() => applyPreset('half')}
              className="arcade-btn px-2 sm:px-3 py-2 sm:py-1.5 bg-[#1e1933] hover:bg-[#2a2347] border border-[#f5b82e] text-[11px] sm:text-xs font-bold text-[#fef08a] whitespace-nowrap cursor-pointer"
            >
              1/2 Mi
            </button>
            <button
              type="button"
              onClick={() => applyPreset('mile')}
              className="arcade-btn px-2 sm:px-3 py-2 sm:py-1.5 bg-[#1e1933] hover:bg-[#2a2347] border border-[#38bdf8] text-[11px] sm:text-xs font-bold text-[#bae6fd] whitespace-nowrap cursor-pointer"
            >
              1 Mile
            </button>
            <button
              type="button"
              onClick={() => applyPreset('stock')}
              className="arcade-btn px-2 sm:px-2.5 py-2 sm:py-1.5 bg-[#151221] hover:bg-[#221c36] border border-[#3a3154] text-[11px] sm:text-xs font-semibold text-[#cbd5e1] flex items-center justify-center gap-1 whitespace-nowrap cursor-pointer"
            >
              <RotateCcw className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>Stock</span>
            </button>
          </div>
        </div>

        {/* Live Projected Performance across all 3 strip distances (1 compact row on mobile & desktop) */}
        <div className="grid grid-cols-4 gap-1.5 sm:gap-2.5 font-mono-num text-xs">
          <div className="bg-[#0e0b18] border border-[#2c2544] p-2 sm:p-2.5">
            <div className="text-[9px] sm:text-[10px] text-[#94a3b8]">1/4 MI</div>
            <div className="text-xs sm:text-base font-bold text-[#f5b82e] mt-0.5">
              {perf.estimatedEtSec.toFixed(2)}s
            </div>
          </div>
          <div className="bg-[#0e0b18] border border-[#2c2544] p-2 sm:p-2.5">
            <div className="text-[9px] sm:text-[10px] text-[#94a3b8]">1/2 MI</div>
            <div className="text-xs sm:text-base font-bold text-[#22c55e] mt-0.5">
              {perf.estimatedHalfEtSec.toFixed(2)}s
            </div>
          </div>
          <div className="bg-[#0e0b18] border border-[#2c2544] p-2 sm:p-2.5">
            <div className="text-[9px] sm:text-[10px] text-[#94a3b8]">1 MILE</div>
            <div className="text-xs sm:text-base font-bold text-[#38bdf8] mt-0.5">
              {perf.estimatedMileEtSec.toFixed(2)}s
            </div>
          </div>
          <div className="bg-[#0e0b18] border border-[#2c2544] p-2 sm:p-2.5">
            <div className="text-[9px] sm:text-[10px] text-[#94a3b8]">TOP SPD</div>
            <div className="text-xs sm:text-base font-bold text-[#f4f1e6] mt-0.5">
              {topGearMaxMph} <span className="hidden sm:inline">MPH</span>
            </div>
          </div>
        </div>

        {/* Interactive Gear Speed-vs-RPM Chart */}
        <div className="bg-[#0a0812] border-2 border-[#2c2544] p-2.5 sm:p-3">
          <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] sm:text-[11px] font-mono-num text-[#94a3b8] mb-1.5">
            <span>RPM vs MPH ENVELOPE</span>
            <span className={isTopGearShortForMile ? 'text-[#f97316] font-bold' : 'text-[#22c55e]'}>
              {isTopGearShortForMile
                ? 'Short Top · 1/4 Mi'
                : 'Tall Top · 1/2 & 1 Mi'}
            </span>
          </div>
          <svg
            viewBox={`0 0 ${svgW} ${svgH}`}
            className="w-full h-auto block"
            role="img"
            aria-label="Gear ratio speed vs RPM chart"
          >
            {/* Horizontal grid lines */}
            {[0.25, 0.5, 0.75, 1.0].map((frac) => {
              const rpmVal = Math.round(perf.redlineRpm * frac);
              const y = yForRpm(rpmVal);
              return (
                <g key={frac}>
                  <line
                    x1={padL}
                    y1={y}
                    x2={svgW - padR}
                    y2={y}
                    stroke={frac === 1 ? '#ef4444' : '#241e38'}
                    strokeDasharray={frac === 1 ? '4 3' : undefined}
                    strokeWidth={frac === 1 ? 1.2 : 1}
                  />
                  <text
                    x={padL - 6}
                    y={y + 3}
                    textAnchor="end"
                    fill={frac === 1 ? '#ef4444' : '#64748b'}
                    fontSize="9"
                    fontFamily="monospace"
                  >
                    {(rpmVal / 1000).toFixed(1)}k
                  </text>
                </g>
              );
            })}

            {/* Shift sweet spot horizontal band */}
            <rect
              x={padL}
              y={yForRpm(shiftMax)}
              width={plotW}
              height={Math.max(4, yForRpm(shiftMin) - yForRpm(shiftMax))}
              fill="rgba(250, 204, 21, 0.14)"
            />

            {/* Vertical MPH grid */}
            {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
              const mph = Math.round(chartMaxMph * frac);
              const x = xForMph(mph);
              return (
                <g key={frac}>
                  <line x1={x} y1={padT} x2={x} y2={svgH - padB} stroke="#1d1830" strokeWidth={1} />
                  <text
                    x={x}
                    y={svgH - 8}
                    textAnchor="middle"
                    fill="#94a3b8"
                    fontSize="9"
                    fontFamily="monospace"
                  >
                    {mph}
                  </text>
                </g>
              );
            })}

            {/* Gear ramp polylines */}
            {gearMetrics.map((gm, idx) => {
              const color = GEAR_COLORS[idx % GEAR_COLORS.length];
              const x1 = xForMph(gm.startMph);
              const y1 = yForRpm(gm.dropRpm);
              const x2 = xForMph(gm.maxMph);
              const y2 = yForRpm(perf.redlineRpm);
              return (
                <g key={gm.gear}>
                  {idx > 0 && (
                    <line
                      x1={x1}
                      y1={y2}
                      x2={x1}
                      y2={y1}
                      stroke={color}
                      strokeOpacity={0.35}
                      strokeDasharray="2 2"
                      strokeWidth={1}
                    />
                  )}
                  <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={2.4} />
                  <circle cx={x2} cy={y2} r={2.8} fill={color} />
                  <text
                    x={Math.min(svgW - padR - 8, x2)}
                    y={y2 - 5}
                    textAnchor="middle"
                    fill={color}
                    fontSize="9"
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    G{gm.gear}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Split Tuning Controls: Gear Ratios Left · Shift & Launch Points Right */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 sm:gap-4">
        {/* Left: Final Drive + Individual Gear Ratios */}
        <div className="xl:col-span-7 arcade-panel p-3 sm:p-4 space-y-3 sm:space-y-4">
          <div className="space-y-2 pb-3 border-b border-[#2a2342]">
            <div className="flex items-center justify-between text-xs font-mono-num">
              <span className="font-bold text-[#f4f1e6]">FINAL DRIVE RATIO</span>
              <span className="text-sm font-bold text-[#f5b82e]">{tuning.finalDrive.toFixed(2)} : 1</span>
            </div>
            <input
              type="range"
              min={2.2}
              max={5.4}
              step={0.05}
              value={tuning.finalDrive}
              onChange={(e) => handleFinalDrive(parseFloat(e.target.value))}
              className="w-full h-6 accent-[#ff4d2e] cursor-pointer"
            />
            <div className="flex justify-between text-[10px] sm:text-[11px] font-mono-num text-[#94a3b8]">
              <span>2.20 · Tall</span>
              <span>Stock {car.finalDrive.toFixed(2)}</span>
              <span>5.40 · Short</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-bold text-[#f4f1e6]">INDIVIDUAL GEAR RATIOS</div>
            {gearMetrics.map((gm, idx) => {
              const minR = Math.max(0.45, Number((gm.stockRatio * 0.65).toFixed(2)));
              const maxR = Math.min(4.6, Number((gm.stockRatio * 1.4).toFixed(2)));
              const color = GEAR_COLORS[idx % GEAR_COLORS.length];
              return (
                <div key={gm.gear} className="space-y-0.5">
                  <div className="flex items-center justify-between text-xs font-mono-num">
                    <span className="font-bold" style={{ color }}>
                      GEAR {gm.gear}
                    </span>
                    <span className="text-[#cbd5e1]">
                      <span className="font-bold text-[#f4f1e6]">{gm.ratio.toFixed(2)}</span>
                      <span className="text-[#64748b] mx-1.5">·</span>
                      <span>{gm.maxMph} MPH</span>
                    </span>
                  </div>
                  <input
                    type="range"
                    min={minR}
                    max={maxR}
                    step={0.02}
                    value={gm.ratio}
                    onChange={(e) => handleGearRatio(idx, parseFloat(e.target.value))}
                    className="w-full h-6 accent-[#f5b82e] cursor-pointer"
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Launch Two-Step & Shift Point Optimization */}
        <div className="xl:col-span-5 arcade-panel p-3 sm:p-4 flex flex-col justify-between gap-3 sm:gap-4">
          <div className="space-y-3 sm:space-y-4">
            <div>
              <h4 className="font-bold text-sm text-[#f4f1e6]">Shift &amp; Launch RPM Targets</h4>
              <p className="text-xs text-[#94a3b8] mt-0.5">
                Tune tachometer sweet spots for grip and powerband.
              </p>
            </div>

            {/* Live Tachometer Sweet-Spot Preview */}
            <div className="bg-[#0a0812] border border-[#2c2544] p-3 space-y-2">
              <div className="flex justify-between font-mono-num text-[11px] text-[#94a3b8]">
                <span>TACHOMETER ZONES</span>
                <span>REDLINE {perf.redlineRpm.toLocaleString()}</span>
              </div>
              <div className="relative h-6 bg-[#131020] border border-[#352d4d] overflow-hidden">
                {/* Green Launch Zone */}
                <div
                  className="absolute top-0 bottom-0 bg-[#22c55e]/35 border-x-2 border-[#22c55e]"
                  style={{ left: `${launchStartPct}%`, width: `${launchWidthPct}%` }}
                />
                {/* Yellow Shift Zone */}
                <div
                  className="absolute top-0 bottom-0 bg-[#facc15]/35 border-x-2 border-[#facc15]"
                  style={{ left: `${shiftStartPct}%`, width: `${shiftWidthPct}%` }}
                />
                {/* Redline */}
                <div className="absolute top-0 bottom-0 right-0 w-[6%] bg-[#ef4444]/35 border-l border-[#ef4444]" />
              </div>
              <div className="flex justify-between font-mono-num text-[11px]">
                <span className="text-[#22c55e]">
                  Launch: {Math.round(launchMin)}–{Math.round(launchMax)}
                </span>
                <span className="text-[#facc15]">
                  Shift: {Math.round(shiftMin)}–{Math.round(shiftMax)}
                </span>
              </div>
            </div>

            {/* Launch Two-Step Slider */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs font-mono-num">
                <span className="font-bold text-[#22c55e]">LAUNCH TWO-STEP</span>
                <span className="text-[#f4f1e6] font-bold">
                  {tuning.launchRpmOffset >= 0 ? `+${tuning.launchRpmOffset}` : tuning.launchRpmOffset} RPM
                </span>
              </div>
              <input
                type="range"
                min={-600}
                max={600}
                step={50}
                value={tuning.launchRpmOffset}
                onChange={(e) => handleLaunchOffset(parseInt(e.target.value, 10))}
                className="w-full accent-[#22c55e] cursor-pointer"
              />
              <p className="text-[11px] text-[#94a3b8]">
                Lower RPM prevents wheelspin on street tires; higher RPM rockets harder on drag slicks.
              </p>
            </div>

            {/* Shift Point Slider */}
            <div className="space-y-1.5 pt-2 border-t border-[#2a2342]">
              <div className="flex items-center justify-between text-xs font-mono-num">
                <span className="font-bold text-[#facc15]">SHIFT POINT WINDOW</span>
                <span className="text-[#f4f1e6] font-bold">
                  {tuning.shiftRpmOffset >= 0 ? `+${tuning.shiftRpmOffset}` : tuning.shiftRpmOffset} RPM
                </span>
              </div>
              <input
                type="range"
                min={-600}
                max={350}
                step={50}
                value={tuning.shiftRpmOffset}
                onChange={(e) => handleShiftOffset(parseInt(e.target.value, 10))}
                className="w-full accent-[#facc15] cursor-pointer"
              />
              <p className="text-[11px] text-[#94a3b8]">
                Earlier short-shifts keep heavy V8s in peak torque; late shifts maximize high-revving power.
              </p>
            </div>
          </div>

          <div className="text-xs font-mono-num text-[#cbd5e1] bg-[#0e0b18] border border-[#2c2544] p-3 leading-relaxed">
            Tuning saves automatically for <span className="text-[#f5b82e] font-bold">{car.name}</span> and applies immediately on your next pass.
          </div>
        </div>
      </div>
    </div>
  );
};
