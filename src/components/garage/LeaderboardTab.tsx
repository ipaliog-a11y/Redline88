import React, { useMemo, useState } from 'react';
import { User } from 'firebase/auth';
import { soundEngine } from '../../audio/soundEngine';
import { formatEt, getStripDistanceSpec, STRIP_DISTANCES } from '../../data/gameData';
import { GlobalLeaderboardEntry, LocalRecord, StripDistanceId } from '../../types/game';
import { PixelIcon } from '../PixelSpritesUI';

interface LeaderboardTabProps {
  user: User | null;
  localRecords: LocalRecord[];
  globalRecords: GlobalLeaderboardEntry[];
  globalLoading: boolean;
  globalError: string | null;
  onSignIn: () => void;
  onRefreshGlobal: () => void;
  onWatchReplay: (record: LocalRecord) => void;
}

export const LeaderboardTab: React.FC<LeaderboardTabProps> = ({
  user,
  localRecords,
  globalRecords,
  globalLoading,
  globalError,
  onSignIn,
  onRefreshGlobal,
  onWatchReplay,
}) => {
  const [boardScope, setBoardScope] = useState<'GLOBAL' | 'LOCAL'>('GLOBAL');
  const [boardTierFilter, setBoardTierFilter] = useState<number>(0); // 0 = All
  const [boardDistanceFilter, setBoardDistanceFilter] = useState<StripDistanceId>('quarter');

  const boardDistSpec = getStripDistanceSpec(boardDistanceFilter);

  const filteredGlobal = useMemo(() => {
    const byDist = globalRecords.filter((e) => (e.distance ?? 'quarter') === boardDistanceFilter);
    const list = boardTierFilter === 0 ? byDist : byDist.filter((e) => e.tier === boardTierFilter);
    return list.slice(0, 50);
  }, [globalRecords, boardTierFilter, boardDistanceFilter]);

  const filteredLocal = useMemo(() => {
    const byDist = localRecords.filter((e) => (e.distance ?? 'quarter') === boardDistanceFilter);
    const list = boardTierFilter === 0 ? byDist : byDist.filter((e) => e.tier === boardTierFilter);
    return list.slice(0, 50);
  }, [localRecords, boardTierFilter, boardDistanceFilter]);

  return (
    <div className="arcade-panel p-3.5 sm:p-4 space-y-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 arcade-inset rounded-full p-1">
            <button
              type="button"
              onClick={() => setBoardScope('GLOBAL')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold uppercase whitespace-nowrap cursor-pointer transition-colors ${
                boardScope === 'GLOBAL'
                  ? 'bg-[#ef3b2d] text-white'
                  : 'text-[#94a3b8] hover:text-white'
              }`}
            >
              Global Top 50
            </button>
            <button
              type="button"
              onClick={() => setBoardScope('LOCAL')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold uppercase whitespace-nowrap cursor-pointer transition-colors ${
                boardScope === 'LOCAL'
                  ? 'bg-[#ef3b2d] text-white'
                  : 'text-[#94a3b8] hover:text-white'
              }`}
            >
              Local Records
            </button>
          </div>

          {/* Strip Distance Filter */}
          <div className="flex items-center gap-1 arcade-inset rounded-full p-1 font-mono-num">
            {STRIP_DISTANCES.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setBoardDistanceFilter(d.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap cursor-pointer transition-colors ${
                  boardDistanceFilter === d.id
                    ? 'bg-[#38bdf8] text-[#090d1a]'
                    : 'text-[#94a3b8] hover:text-white'
                }`}
              >
                {d.shortLabel}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {[0, 1, 2, 3, 4, 5].map((tf) => (
            <button
              key={tf}
              type="button"
              onClick={() => setBoardTierFilter(tf)}
              className={`arcade-btn rounded-full px-3 py-1 text-xs font-mono-num font-bold border whitespace-nowrap cursor-pointer ${
                boardTierFilter === tf
                  ? 'bg-[#26355c] text-[#facc15] border-[#facc15]'
                  : 'bg-[#141d34] text-[#94a3b8] border-[#3c5080]/65 hover:text-white'
              }`}
            >
              {tf === 0 ? 'ALL' : `T${tf}`}
            </button>
          ))}
          {boardScope === 'GLOBAL' && (
            <button
              type="button"
              onClick={onRefreshGlobal}
              aria-label="Refresh global leaderboard"
              className="arcade-btn rounded-full h-8 w-8 flex items-center justify-center bg-[#141d34] border border-[#3c5080]/65 text-[#cbd5e1] hover:border-[#facc15] cursor-pointer"
            >
              <PixelIcon
                name="restart"
                className={`w-4 h-4 ${globalLoading ? 'animate-spin' : ''}`}
              />
            </button>
          )}
        </div>
      </div>

      {boardScope === 'GLOBAL' && !user && (
        <div className="flex flex-wrap items-center justify-between gap-3 arcade-inset px-4 py-2.5 text-xs text-[#cbd5e1]">
          <span>
            Sign in with Google to post your 1/4, 1/2, and 1 Mile ETs to the Global Leaderboard and
            sync your garage.
          </span>
          <button
            type="button"
            onClick={onSignIn}
            className="arcade-btn rounded-full px-4 py-1.5 bg-[#facc15] text-[#090d1a] border border-[#fef08a] font-bold uppercase whitespace-nowrap cursor-pointer"
          >
            Sign In
          </button>
        </div>
      )}

      {boardScope === 'GLOBAL' && user && !user.emailVerified && (
        <div className="bg-[#2c2414] border border-[#f5b82e]/70 rounded-xl px-4 py-2.5 text-xs text-[#fef08a]">
          Your account email is not verified yet. Verify your email to enable cloud garage sync and
          Global Leaderboard submissions.
        </div>
      )}

      {boardScope === 'GLOBAL' && globalError && (
        <div className="bg-[#2c1518] border border-[#ef3b2d]/80 rounded-xl px-4 py-2.5 text-xs text-[#fecaca]">
          {globalError}
        </div>
      )}

      {boardScope === 'LOCAL' && filteredLocal[0]?.replay && (
        <div className="arcade-panel-gold p-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center gap-2 font-pixel text-[9px] text-[#f5b82e]">
              <PixelIcon name="film" className="w-4 h-4 shrink-0" />
              <span>
                BEST {boardDistSpec.shortLabel.toUpperCase()} REPLAY
                {boardTierFilter > 0 ? ` · T${boardTierFilter}` : ''}
              </span>
            </div>
            <div className="text-xs sm:text-sm font-bold text-[#f8fafc] truncate">
              {filteredLocal[0].carName} ·{' '}
              <span className="font-mono-num text-[#22c55e]">
                {formatEt(filteredLocal[0].etMs)}
              </span>{' '}
              <span className="font-mono-num text-[#cbd5e1]">
                @ {filteredLocal[0].trapMph.toFixed(1)} MPH
              </span>
            </div>
            <div className="text-[11px] text-[#94a3b8] font-mono-num">
              {filteredLocal[0].perfectShifts} Perfect Shifts ·{' '}
              {filteredLocal[0].replay.events.length} Shift &amp; Launch Markers Recorded
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onWatchReplay(filteredLocal[0]);
            }}
            className="arcade-btn rounded-full px-4 py-2 bg-[#f5b82e] hover:bg-[#fde047] text-[#0e1320] border border-[#fef08a] text-xs font-bold uppercase flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <PixelIcon name="play" className="w-3.5 h-3.5" />
            <span>Watch Replay</span>
          </button>
        </div>
      )}

      <div className="overflow-x-auto arcade-inset p-2.5">
        <table className="w-full text-left border-collapse font-mono-num text-xs">
          <thead>
            <tr className="border-b border-[#26355c] text-[#facc15]">
              <th className="py-2 pr-2 sm:pr-3">#</th>
              <th className="py-2 pr-2 sm:pr-3">DRIVER</th>
              <th className="py-2 pr-2 sm:pr-3">CLS</th>
              <th className="py-2 pr-2 sm:pr-3">CAR</th>
              <th className="py-2 pr-2 sm:pr-3 text-right">{boardDistSpec.shortLabel} ET</th>
              <th className="py-2 pr-2 sm:pr-3 text-right">TRAP</th>
              <th className="hidden sm:table-cell py-2 pr-2 sm:pr-3 text-right">RT</th>
              {boardScope === 'LOCAL' && <th className="py-2 text-right">REPLAY</th>}
            </tr>
          </thead>
          <tbody>
            {boardScope === 'GLOBAL' ? (
              globalLoading && filteredGlobal.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#94a3b8]">
                    Loading global records...
                  </td>
                </tr>
              ) : filteredGlobal.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#94a3b8]">
                    No global {boardDistSpec.label.toLowerCase()} runs recorded in this class yet.
                    Set the first track record!
                  </td>
                </tr>
              ) : (
                filteredGlobal.map((entry, idx) => {
                  const isMe = user && entry.uid === user.uid;
                  return (
                    <tr
                      key={entry.id}
                      className={`border-b border-[#19233d] ${
                        isMe ? 'bg-[#1f2e52]' : 'hover:bg-[#131b31]'
                      }`}
                    >
                      <td className="py-2 pr-2 sm:pr-3 font-bold text-[#facc15]">{idx + 1}</td>
                      <td className="py-2 pr-2 sm:pr-3 font-semibold text-[#f7f3e3] max-w-[90px] sm:max-w-none truncate">
                        {entry.driverName}
                      </td>
                      <td className="py-2 pr-2 sm:pr-3 text-[#94a3b8]">T{entry.tier}</td>
                      <td className="py-2 pr-2 sm:pr-3 text-[#cbd5e1] max-w-[100px] sm:max-w-none truncate">
                        <span
                          className="inline-block w-2.5 h-2.5 rounded-full mr-1.5 align-middle border border-white/25"
                          style={{ backgroundColor: entry.paintColor }}
                        />
                        {entry.carName}
                      </td>
                      <td className="py-2 pr-2 sm:pr-3 text-right font-bold text-[#22c55e]">
                        {formatEt(entry.etMs)}
                      </td>
                      <td className="py-2 pr-0 sm:pr-3 text-right text-[#f7f3e3]">
                        {entry.trapMph.toFixed(1)}
                      </td>
                      <td className="hidden sm:table-cell py-2 text-right text-[#94a3b8]">
                        {(entry.reactionMs / 1000).toFixed(3)}s
                      </td>
                    </tr>
                  );
                })
              )
            ) : filteredLocal.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-[#94a3b8]">
                  Complete a clean {boardDistSpec.label.toLowerCase()} run to log your local track
                  records and shift-timing replays.
                </td>
              </tr>
            ) : (
              filteredLocal.map((entry, idx) => (
                <tr key={entry.id} className="border-b border-[#19233d] hover:bg-[#131b31]">
                  <td className="py-2 pr-2 sm:pr-3 font-bold text-[#facc15]">{idx + 1}</td>
                  <td className="py-2 pr-2 sm:pr-3 font-semibold text-[#f7f3e3] max-w-[82px] sm:max-w-none truncate">
                    {entry.driverName}
                  </td>
                  <td className="py-2 pr-2 sm:pr-3 text-[#94a3b8]">T{entry.tier}</td>
                  <td className="py-2 pr-2 sm:pr-3 text-[#cbd5e1] max-w-[92px] sm:max-w-none truncate">
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-full mr-1.5 align-middle border border-white/25"
                      style={{ backgroundColor: entry.paintColor }}
                    />
                    {entry.carName}
                  </td>
                  <td className="py-2 pr-2 sm:pr-3 text-right font-bold text-[#22c55e]">
                    {formatEt(entry.etMs)}
                  </td>
                  <td className="py-2 pr-2 sm:pr-3 text-right text-[#f7f3e3]">
                    {entry.trapMph.toFixed(1)}
                  </td>
                  <td className="hidden sm:table-cell py-2 pr-2 sm:pr-3 text-right text-[#94a3b8]">
                    {(entry.reactionMs / 1000).toFixed(3)}s
                  </td>
                  <td className="py-1.5 text-right">
                    {entry.replay ? (
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playUiClick();
                          onWatchReplay(entry);
                        }}
                        className={`arcade-btn rounded-full px-2.5 py-1 text-[11px] font-bold inline-flex items-center gap-1 whitespace-nowrap cursor-pointer border ${
                          idx === 0
                            ? 'bg-[#facc15] hover:bg-[#fde047] text-[#090d1a] border-[#fef9c3]'
                            : 'bg-[#1a2542] hover:bg-[#26355c] text-[#f7f3e3] border-[#526ba3]/70'
                        }`}
                      >
                        <PixelIcon name="play" className="w-3 h-3" />
                        <span>Watch</span>
                      </button>
                    ) : (
                      <span className="text-[10px] text-[#64748b]">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
