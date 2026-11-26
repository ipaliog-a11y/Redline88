import React from 'react';

interface AnalogPixelTachProps {
  rpm: number;
  redlineRpm: number;
  launchMinRpm: number;
  launchMaxRpm: number;
  shiftMinRpm: number;
  shiftMaxRpm: number;
  gear: number;
  maxGears: number;
  mph: number;
  isStaging: boolean;
  boostActive?: boolean;
  wheelspin?: number;
  compact?: boolean;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function describeArc(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number
) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${start.x.toFixed(1)} ${start.y.toFixed(1)} A ${r} ${r} 0 ${largeArc} 0 ${end.x.toFixed(1)} ${end.y.toFixed(1)}`;
}

/**
 * Clean Modern Hi-Bit Pixel Tachometer + Crisp Solid Shift Light + Pixel Gear & Speed Readouts.
 * Zero bloom or blur shadows — solid dark panels with thick single-color borders and 2px hard drop shadow.
 */
export const AnalogPixelTach: React.FC<AnalogPixelTachProps> = ({
  rpm,
  redlineRpm,
  launchMinRpm,
  launchMaxRpm,
  shiftMinRpm,
  shiftMaxRpm,
  gear,
  maxGears,
  mph,
  isStaging,
  boostActive = false,
  wheelspin = 0,
  compact = false,
}) => {
  const maxDialRpm = Math.max(1000, Math.ceil((redlineRpm * 1.08) / 1000) * 1000);
  const MIN_ANG = -108;
  const MAX_ANG = 108;
  const ANG_SPAN = MAX_ANG - MIN_ANG;
  const rpmToAngle = (val: number) =>
    MIN_ANG + Math.max(0, Math.min(1, val / maxDialRpm)) * ANG_SPAN;

  const needleAngle = rpmToAngle(rpm);
  const inLaunchZone = isStaging && rpm >= launchMinRpm && rpm <= launchMaxRpm;
  const inShiftZone = !isStaging && gear < maxGears && rpm >= shiftMinRpm && rpm <= shiftMaxRpm;
  const approachingShift =
    !isStaging && gear < maxGears && rpm >= shiftMinRpm - 900 && rpm < shiftMinRpm;
  const isOverRev = rpm >= redlineRpm;

  const shiftLightState: 'OFF' | 'APPROACH' | 'SHIFT' | 'REDLINE' | 'LAUNCH' = isOverRev
    ? 'REDLINE'
    : inLaunchZone
    ? 'LAUNCH'
    : inShiftZone
    ? 'SHIFT'
    : approachingShift
    ? 'APPROACH'
    : 'OFF';

  const cx = 110;
  const cy = 92;
  const dialR = 72;

  const kSteps = Math.max(6, Math.round(maxDialRpm / 1000));
  const ticks = Array.from({ length: kSteps + 1 }, (_, i) => i * 1000);

  const launchStartA = rpmToAngle(launchMinRpm);
  const launchEndA = rpmToAngle(launchMaxRpm);
  const shiftStartA = rpmToAngle(shiftMinRpm);
  const shiftEndA = rpmToAngle(shiftMaxRpm);
  const redStartA = rpmToAngle(redlineRpm);

  const tip = polarToCartesian(cx, cy, dialR - 8, needleAngle);
  const tail = polarToCartesian(cx, cy, 14, needleAngle + 180);

  return (
    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
      {/* Sleek Rounded Tachometer Face + Circular Shift Light */}
      <div
        className={`relative shrink-0 bg-[#0e1422] border border-[#4a6294]/55 rounded-2xl shadow-[inset_0_2px_6px_rgba(4,7,15,0.5)] flex items-center justify-center ${
          compact ? 'w-[146px] h-[78px]' : 'w-[158px] sm:w-[214px] h-[84px] sm:h-[104px]'
        }`}
      >
        <svg
          viewBox="0 0 220 112"
          className="w-full h-full block"
          role="img"
          aria-label={`Tachometer ${rpm} RPM`}
        >
          {/* Outer bezel arc */}
          <path
            d={describeArc(cx, cy, dialR + 8, MIN_ANG - 4, MAX_ANG + 4)}
            fill="none"
            stroke="#3c4d73"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path
            d={describeArc(cx, cy, dialR, MIN_ANG, MAX_ANG)}
            fill="none"
            stroke="#192033"
            strokeWidth="12"
            strokeLinecap="round"
          />

          {/* Launch Sweet-Spot Emerald Arc */}
          {isStaging && (
            <path
              d={describeArc(cx, cy, dialR, launchStartA, launchEndA)}
              fill="none"
              stroke="#22c55e"
              strokeWidth="12"
            />
          )}

          {/* Shift Sweet-Spot Gold Arc */}
          {!isStaging && gear < maxGears && (
            <path
              d={describeArc(cx, cy, dialR, shiftStartA, shiftEndA)}
              fill="none"
              stroke="#f5b82e"
              strokeWidth="12"
            />
          )}

          {/* Redline Danger Zone Arc */}
          <path
            d={describeArc(cx, cy, dialR, redStartA, MAX_ANG)}
            fill="none"
            stroke="#ff4d3d"
            strokeWidth="12"
          />

          {/* Radial Tick Marks & Pixel Numeric Labels */}
          {ticks.map((val, idx) => {
            const ang = rpmToAngle(val);
            const pOuter = polarToCartesian(cx, cy, dialR + 5, ang);
            const pInner = polarToCartesian(cx, cy, dialR - 8, ang);
            const pLabel = polarToCartesian(cx, cy, dialR - 20, ang);
            const isMajor = kSteps <= 10 || idx % 2 === 0 || idx === kSteps;
            return (
              <g key={val}>
                <line
                  x1={pInner.x}
                  y1={pInner.y}
                  x2={pOuter.x}
                  y2={pOuter.y}
                  stroke={val >= redlineRpm ? '#ff4d3d' : '#cbd5e1'}
                  strokeWidth={isMajor ? 2.5 : 1.5}
                  strokeLinecap="round"
                />
                {isMajor && (
                  <text
                    x={pLabel.x}
                    y={pLabel.y + 3}
                    textAnchor="middle"
                    fill={val >= redlineRpm ? '#fca5a5' : '#94a3b8'}
                    fontSize="8"
                    fontFamily="'Press Start 2P', monospace"
                  >
                    {idx}
                  </text>
                )}
              </g>
            );
          })}

          {/* Center RPM x1000 Pixel Label */}
          <text
            x={cx}
            y={cy - 22}
            textAnchor="middle"
            fill="#64748b"
            fontSize="6.5"
            fontFamily="'Press Start 2P', monospace"
          >
            RPM x1K
          </text>

          {/* Tapered Motorsport Needle */}
          <line
            x1={tail.x}
            y1={tail.y}
            x2={tip.x}
            y2={tip.y}
            stroke="#070a12"
            strokeWidth="5.5"
            strokeLinecap="round"
          />
          <line
            x1={tail.x}
            y1={tail.y}
            x2={tip.x}
            y2={tip.y}
            stroke={inShiftZone ? '#f5b82e' : inLaunchZone ? '#22c55e' : '#ff4d3d'}
            strokeWidth="3.2"
            strokeLinecap="round"
          />

          {/* Circular Center Hub Cap */}
          <circle cx={cx} cy={cy} r="6.5" fill="#3c4d73" stroke="#070a12" strokeWidth="2" />
          <circle cx={cx} cy={cy} r="3" fill="#f5b82e" />

          {/* Pixel Font RPM Readout */}
          <text
            x={cx}
            y={cy + 16}
            textAnchor="middle"
            fill="#f8fafc"
            fontSize="9"
            fontFamily="'Press Start 2P', monospace"
          >
            {rpm.toLocaleString()}
          </text>
        </svg>

        {/* Circular Shift Light Lamp */}
        <div
          className="absolute top-1.5 right-1.5 flex flex-col items-center"
          title="Shift Light"
        >
          <div
            className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full border-2 flex items-center justify-center transition-colors ${
              shiftLightState === 'SHIFT'
                ? 'bg-[#f5b82e] border-[#fef08a]'
                : shiftLightState === 'LAUNCH'
                ? 'bg-[#22c55e] border-[#bbf7d0]'
                : shiftLightState === 'REDLINE'
                ? 'bg-[#ff4d3d] border-[#fecaca]'
                : shiftLightState === 'APPROACH'
                ? 'bg-[#b45309] border-[#f59e0b]'
                : 'bg-[#192033] border-[#3c4d73]'
            }`}
          >
            <div
              className={`w-2 h-2 rounded-full ${
                shiftLightState === 'OFF' ? 'bg-[#334155]' : 'bg-[#ffffff]'
              }`}
            />
          </div>
          <span className="font-pixel text-[6px] text-[#94a3b8] mt-0.5 leading-none">
            {shiftLightState === 'LAUNCH' ? 'GO' : 'SHIFT'}
          </span>
        </div>
      </div>

      {/* Sculpted Gear Indicator + Speed Readout + Status Bar */}
      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
        <div className="flex items-stretch gap-1.5 sm:gap-2">
          {/* Gear Pod */}
          <div className="bg-[#0e1422] border border-[#4a6294]/50 rounded-xl shadow-[inset_0_2px_5px_rgba(4,7,15,0.45)] px-2.5 sm:px-3.5 py-1.5 text-center min-w-[54px] sm:min-w-[68px]">
            <div className="font-pixel text-[7px] sm:text-[8px] text-[#94a3b8] leading-none">
              GEAR
            </div>
            <div
              className={`font-pixel text-lg sm:text-2xl leading-none mt-1.5 ${
                inShiftZone
                  ? 'text-[#f5b82e]'
                  : isOverRev
                  ? 'text-[#ff4d3d]'
                  : 'text-[#22c55e]'
              }`}
            >
              {gear === 0 ? 'N' : gear}
            </div>
          </div>

          {/* Speed Pod */}
          <div className="bg-[#0e1422] border border-[#4a6294]/50 rounded-xl shadow-[inset_0_2px_5px_rgba(4,7,15,0.45)] px-3 sm:px-3.5 py-1.5 text-right flex-1 min-w-[78px]">
            <div className="font-pixel text-[7px] sm:text-[8px] text-[#94a3b8] leading-none">
              SPEED MPH
            </div>
            <div className="font-pixel text-base sm:text-xl text-[#f8fafc] leading-none mt-1.5">
              {mph}
            </div>
          </div>
        </div>

        {/* Sleek State Readout Bar */}
        <div className="bg-[#0e1422] border border-[#4a6294]/45 rounded-xl px-3 py-1.5 flex items-center justify-between gap-2 font-mono-num text-[10px] sm:text-xs">
          <span className="text-[#94a3b8] truncate">
            REDLINE {(redlineRpm / 1000).toFixed(1)}K
          </span>
          <span
            className={`font-bold whitespace-nowrap ${
              shiftLightState === 'SHIFT'
                ? 'text-[#f5b82e]'
                : shiftLightState === 'LAUNCH'
                ? 'text-[#22c55e]'
                : shiftLightState === 'REDLINE'
                ? 'text-[#ff4d3d]'
                : boostActive
                ? 'text-[#38bdf8]'
                : wheelspin > 0.2
                ? 'text-[#f97316]'
                : 'text-[#cbd5e1]'
            }`}
          >
            {shiftLightState === 'LAUNCH'
              ? 'LAUNCH WINDOW'
              : shiftLightState === 'SHIFT'
              ? 'SHIFT NOW!'
              : shiftLightState === 'REDLINE'
              ? 'OVER-REV!'
              : boostActive
              ? 'BOOST SURGE'
              : wheelspin > 0.2
              ? 'WHEELSPIN'
              : isStaging
              ? 'REV TO GREEN'
              : 'FULL THROTTLE'}
          </span>
        </div>
      </div>
    </div>
  );
};
