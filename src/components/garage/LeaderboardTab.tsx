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
  const [boardTierFilter, setBoardTierFilter] = useState<number>(0);
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
    <div className="ng-plate overflow-hidden">
      <div className="ng-checkered-bar h-2 w-full" />
      <div className="p-3 sm:p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            {/* Global vs Local Arcade Toggle */}
            <div className="flex items-center gap-1 ng-vfd p-1">
              <button
                type="button"
                onClick={() => setBoardScope('GLOBAL')}
                className={`px-3 py-1 font-pixel text-[8px] sm:text-[9px] whitespace-nowrap cursor-pointer ${
                  boardScope === 'GLOBAL'
                    ? 'bg-[#e83b24] text-white'
                    : 'text-[#b8c0cc] hover:text-white'
                }`}
              >
                GLOBAL TOP 50
              </button>
              <button
                type="button"
                onClick={() => setBoardScope('LOCAL')}
                className={`px-3 py-1 font-pixel text-[8px] sm:text-[9px] whitespace-nowrap cursor-pointer ${
                  boardScope === 'LOCAL'
                    ? 'bg-[#e83b24] text-white'
                    : 'text-[#b8c0cc] hover:text-white'
                }`}
              >
                LOCAL RECORDS
              </button>
            </div>

            {/* Strip Distance Filter */}
            <div className="flex items-center gap-1 ng-vfd p-1 font-mono-num">
              {STRIP_DISTANCES.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setBoardDistanceFilter(d.id)}
                  className={`px-2.5 py-1 text-xs font-bold whitespace-nowrap cursor-pointer ${
                    boardDistanceFilter === d.id
                      ? 'bg-[#19d4e6] text-[#141218]'
                      : 'text-[#b8c0cc] hover:text-white'
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
                className={`ng-keycap px-2.5 py-1 text-xs font-mono-num font-bold border-2 whitespace-nowrap cursor-pointer ${
                  boardTierFilter === tf
                    ? 'bg-[#f7b519] text-[#141218] border-[#141218]'
                    : 'bg-[#18161e] text-[#b8c0cc] border-[#3a3e4d] hover:text-white'
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
                className="ng-keycap h-8 w-8 flex items-center justify-center bg-[#2c2935] border-2 border-[#525866] text-[#f4ecd8] hover:border-[#f7b519] cursor-pointer"
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
          <div className="flex flex-wrap items-center justify-between gap-3 ng-vfd px-3.5 py-2.5 text-xs text-[#f4ecd8] border-l-4 border-l-[#f7b519]">
            <span>
              Sign in with Google to post your 1/4, 1/2, and 1 Mile ETs to the Global High-Score
              Table and sync your garage.
            </span>
            <button
              type="button"
              onClick={onSignIn}
              className="ng-keycap px-3.5 py-1.5 bg-[#f7b519] text-[#141218] border-2 border-[#141218] font-pixel text-[8px] whitespace-nowrap cursor-pointer"
            >
              SIGN IN
            </button>
          </div>
        )}

        {boardScope === 'GLOBAL' && user && !user.emailVerified && (
          <div className="bg-[#382710] border-2 border-[#f7b519] px-3.5 py-2 text-xs text-[#ffd557]">
            Your account email is not verified yet. Verify your email to enable cloud garage sync
            and Global Leaderboard submissions.
          </div>
        )}

        {boardScope === 'GLOBAL' && globalError && (
          <div className="bg-[#3b1514] border-2 border-[#e83b24] px-3.5 py-2 text-xs text-[#fecaca]">
            {globalError}
          </div>
        )}

        {boardScope === 'LOCAL' && filteredLocal[0]?.replay && (
          <div className="ng-plate-gold p-3 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0 space-y-0.5">
              <div className="flex items-center gap-2 font-pixel text-[9px] text-[#f7b519]">
                <PixelIcon name="film" className="w-4 h-4 shrink-0" />
                <span>
                  BEST {boardDistSpec.shortLabel.toUpperCase()} REPLAY
                  {boardTierFilter > 0 ? ` · T${boardTierFilter}` : ''}
                </span>
              </div>
              <div className="text-xs sm:text-sm font-bold text-[#f4ecd8] truncate">
                {filteredLocal[0].carName} ·{' '}
                <span className="font-mono-num text-[#2ee66b]">
                  {formatEt(filteredLocal[0].etMs)}
                </span>{' '}
                <span className="font-mono-num text-[#19d4e6]">
                  @ {filteredLocal[0].trapMph.toFixed(1)} MPH
                </span>
              </div>
              <div className="text-[11px] text-[#b8c0cc] font-mono-num">
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
              className="ng-chevron-cta cursor-pointer"
            >
              <span className="ng-chevron-inner font-pixel text-[9px] whitespace-nowrap">
                <PixelIcon name="play" className="w-3.5 h-3.5" /> WATCH REPLAY
              </span>
            </button>
          </div>
        )}

        {/* Arcade High-Score Table */}
        <div className="overflow-x-auto ng-vfd p-2.5">
          <table className="w-full text-left border-collapse font-mono-num text-xs">
            <thead>
              <tr className="border-b-2 border-[#525866] text-[#f7b519]">
                <th className="py-2 pr-2 sm:pr-3">RNK</th>
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
                    <td colSpan={7} className="py-8 text-center text-[#b8c0cc]">
                      LOADING GLOBAL HIGH SCORES...
                    </td>
                  </tr>
                ) : filteredGlobal.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-[#b8c0cc]">
                      No global {boardDistSpec.label.toLowerCase()} runs recorded in this class yet.
                    </td>
                  </tr>
                ) : (
                  filteredGlobal.map((entry, idx) => {
                    const isMe = user && entry.uid === user.uid;
                    const rankColor =
                      idx === 0
                        ? 'text-[#f7b519]'
                        : idx === 1
                        ? 'text-[#e8eef7]'
                        : idx === 2
                        ? 'text-[#fb923c]'
                        : 'text-[#94a3b8]';
                    return (
                      <tr
                        key={entry.id}
                        className={`border-b border-[#24222c] ${
                          isMe ? 'bg-[#2c2536]' : 'hover:bg-[#191720]'
                        }`}
                      >
                        <td className={`py-2 pr-2 sm:pr-3 font-pixel text-[9px] ${rankColor}`}>
                          {idx + 1}
                        </td>
                        <td className="py-2 pr-2 sm:pr-3 font-bold text-[#f4ecd8] max-w-[90px] sm:max-w-none truncate">
                          {entry.driverName}
                        </td>
                        <td className="py-2 pr-2 sm:pr-3 text-[#19d4e6]">T{entry.tier}</td>
                        <td className="py-2 pr-2 sm:pr-3 text-[#b8c0cc] max-w-[100px] sm:max-w-none truncate">
                          <span
                            className="inline-block w-2.5 h-2.5 mr-1.5 align-middle border border-[#141218]"
                            style={{ backgroundColor: entry.paintColor }}
                          />
                          {entry.carName}
                        </td>
                        <td className="py-2 pr-2 sm:pr-3 text-right font-bold text-[#2ee66b]">
                          {formatEt(entry.etMs)}
                        </td>
                        <td className="py-2 pr-0 sm:pr-3 text-right text-[#f4ecd8]">
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
                  <td colSpan={8} className="py-8 text-center text-[#b8c0cc]">
                    Complete a clean {boardDistSpec.label.toLowerCase()} run to log your local
                    track records and shift-timing replays.
                  </td>
                </tr>
              ) : (
                filteredLocal.map((entry, idx) => (
                  <tr key={entry.id} className="border-b border-[#24222c] hover:bg-[#191720]">
                    <td className="py-2 pr-2 sm:pr-3 font-pixel text-[9px] text-[#f7b519]">
                      {idx + 1}
                    </td>
                    <td className="py-2 pr-2 sm:pr-3 font-bold text-[#f4ecd8] max-w-[82px] sm:max-w-none truncate">
                      {entry.driverName}
                    </td>
                    <td className="py-2 pr-2 sm:pr-3 text-[#19d4e6]">T{entry.tier}</td>
                    <td className="py-2 pr-2 sm:pr-3 text-[#b8c0cc] max-w-[92px] sm:max-w-none truncate">
                      <span
                        className="inline-block w-2.5 h-2.5 mr-1.5 align-middle border border-[#141218]"
                        style={{ backgroundColor: entry.paintColor }}
                      />
                      {entry.carName}
                    </td>
                    <td className="py-2 pr-2 sm:pr-3 text-right font-bold text-[#2ee66b]">
                      {formatEt(entry.etMs)}
                    </td>
                    <td className="py-2 pr-2 sm:pr-3 text-right text-[#f4ecd8]">
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
                          className={`ng-keycap px-2.5 py-1 text-[10px] font-mono-num font-bold inline-flex items-center gap-1 whitespace-nowrap cursor-pointer border-2 ${
                            idx === 0
                              ? 'bg-[#f7b519] hover:bg-[#ffd557] text-[#141218] border-[#141218]'
                              : 'bg-[#2c2935] hover:bg-[#3a3647] text-[#f4ecd8] border-[#525866]'
                          }`}
                        >
                          <PixelIcon name="play" className="w-3 h-3" />
                          <span>WATCH</span>
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
    </div>
  );
};
