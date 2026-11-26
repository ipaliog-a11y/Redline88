import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { User } from 'firebase/auth';
import { soundEngine } from './audio/soundEngine';
import { ErrorBoundary } from './components/ErrorBoundary';
import { GarageHub } from './components/GarageHub';
import { RaceView } from './components/RaceView';
import { TitleScreen } from './components/TitleScreen';
import {
  createDefaultCarConfig,
  getCarById,
  getCarConfig,
  getUpgradeCost,
  resolveTimeOfDay,
  RIVALS,
} from './data/gameData';
import {
  fetchGlobalLeaderboard,
  loadCloudSave,
  sanitizeCallsign,
  signInWithGoogle,
  signOutUser,
  submitGlobalRecord,
  subscribeAuth,
  syncCloudSave,
} from './services/firebase';
import {
  addLocalRecord,
  loadLocalRecords,
  loadLocalSave,
  mergeSaves,
  saveLocalSave,
} from './services/storage';
import {
  AppScreen,
  DrivetrainTuning,
  GlobalLeaderboardEntry,
  LocalRecord,
  PlayerSave,
  RaceResult,
  RimStyle,
  RivalSpec,
  StripDistanceId,
  StripeStyle,
  TierId,
  TimeOfDayMode,
  UpgradeKey,
} from './types/game';

function GameApp() {
  const [screen, setScreen] = useState<AppScreen>('TITLE');
  const [save, setSave] = useState<PlayerSave>(() => loadLocalSave());
  const [localRecords, setLocalRecords] = useState<LocalRecord[]>(() => loadLocalRecords());
  const [globalRecords, setGlobalRecords] = useState<GlobalLeaderboardEntry[]>([]);
  const [globalLoading, setGlobalLoading] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [muted, setMuted] = useState<boolean>(() => soundEngine.isMuted());
  const [timeOfDayMode, setTimeOfDayMode] = useState<TimeOfDayMode>(() => {
    try {
      const stored = localStorage.getItem('redline88_tod_v1');
      if (stored === 'afternoon' || stored === 'sunset' || stored === 'night' || stored === 'auto') {
        return stored;
      }
      return 'auto';
    } catch {
      return 'auto';
    }
  });

  // Active race matchup
  const [raceTier, setRaceTier] = useState<TierId>(1);
  const [raceDistance, setRaceDistance] = useState<StripDistanceId>('quarter');
  const [raceRival, setRaceRival] = useState<RivalSpec | null>(null);

  const saveRef = useRef(save);
  saveRef.current = save;

  const userRef = useRef(user);
  userRef.current = user;

  const syncTimerRef = useRef<number | null>(null);
  const didMountSaveRef = useRef(false);

  // Persist save locally and debounce cloud sync whenever save changes (pure React side effect)
  useEffect(() => {
    if (!didMountSaveRef.current) {
      didMountSaveRef.current = true;
      return;
    }
    saveLocalSave(save);
    if (user && user.emailVerified) {
      if (syncTimerRef.current) window.clearTimeout(syncTimerRef.current);
      const uid = user.uid;
      syncTimerRef.current = window.setTimeout(() => {
        syncTimerRef.current = null;
        syncCloudSave(uid, saveRef.current).catch((err) => {
          console.warn('Cloud save sync deferred:', err);
        });
      }, 450);
    }
  }, [save, user]);

  // Flush any pending debounced cloud save on pagehide / unmount
  useEffect(() => {
    const flushPendingSync = () => {
      const currentUser = userRef.current;
      if (syncTimerRef.current && currentUser && currentUser.emailVerified) {
        window.clearTimeout(syncTimerRef.current);
        syncTimerRef.current = null;
        void syncCloudSave(currentUser.uid, saveRef.current);
      }
    };
    window.addEventListener('pagehide', flushPendingSync);
    return () => {
      window.removeEventListener('pagehide', flushPendingSync);
      flushPendingSync();
    };
  }, []);

  const refreshGlobal = useCallback(async () => {
    setGlobalLoading(true);
    setGlobalError(null);
    try {
      const entries = await fetchGlobalLeaderboard();
      setGlobalRecords(entries);
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : 'Unable to load global leaderboard.');
    } finally {
      setGlobalLoading(false);
    }
  }, []);

  // Auth listener + automatic cloud garage merge
  useEffect(() => {
    const unsub = subscribeAuth((authUser) => {
      setUser(authUser);
      if (authUser && authUser.emailVerified) {
        loadCloudSave(authUser.uid)
          .then((cloud) => {
            setSave((current) => {
              if (cloud) {
                return mergeSaves(current, cloud);
              }
              return {
                ...current,
                callsign:
                  current.callsign === 'ROOKIE_88' && authUser.displayName
                    ? sanitizeCallsign(authUser.displayName)
                    : current.callsign,
                updatedAtMs: Date.now(),
              };
            });
          })
          .catch((err) => {
            console.warn('Cloud garage load failed:', err);
          });
      }
    });
    return () => unsub();
  }, []);

  // Fetch global leaderboard on initial mount
  useEffect(() => {
    void refreshGlobal();
  }, [refreshGlobal]);

  const handleToggleMute = useCallback(() => {
    const next = soundEngine.toggleMute();
    setMuted(next);
  }, []);

  const handleChangeTimeOfDayMode = useCallback((mode: TimeOfDayMode) => {
    setTimeOfDayMode(mode);
    try {
      localStorage.setItem('redline88_tod_v1', mode);
    } catch {
      // ignore storage errors
    }
  }, []);

  const handleSignIn = useCallback(() => {
    signInWithGoogle().catch((err) => {
      console.warn('Google sign-in dismissed or failed:', err);
    });
  }, []);

  const handleSignOut = useCallback(() => {
    void signOutUser();
  }, []);

  const updateSave = useCallback((updater: (prev: PlayerSave) => PlayerSave) => {
    setSave((prev) => {
      const next = updater(prev);
      if (next === prev) return prev;
      return { ...next, updatedAtMs: Date.now() };
    });
  }, []);

  const handleUpdateCallsign = useCallback(
    (callsign: string) => {
      const cleaned = sanitizeCallsign(callsign);
      updateSave((prev) => ({ ...prev, callsign: cleaned }));
    },
    [updateSave]
  );

  const handleSelectCar = useCallback(
    (carId: string) => {
      updateSave((prev) => {
        if (!prev.ownedCars.includes(carId)) return prev;
        return { ...prev, activeCarId: carId };
      });
    },
    [updateSave]
  );

  const handleBuyCar = useCallback(
    (carId: string) => {
      const spec = getCarById(carId);
      updateSave((prev) => {
        if (prev.ownedCars.includes(carId)) return prev;
        if (spec.tier > prev.highestUnlockedTier) return prev;
        if (prev.cash < spec.price) return prev;
        return {
          ...prev,
          cash: prev.cash - spec.price,
          ownedCars: [...prev.ownedCars, carId],
          activeCarId: carId,
          carConfigs: {
            ...prev.carConfigs,
            [carId]: prev.carConfigs[carId] ?? createDefaultCarConfig(carId),
          },
        };
      });
    },
    [updateSave]
  );

  const handleBuyUpgrade = useCallback(
    (carId: string, key: UpgradeKey) => {
      const car = getCarById(carId);
      updateSave((prev) => {
        const cfg = getCarConfig(prev, carId);
        const curLvl = cfg.upgrades[key];
        if (curLvl >= 5) return prev;
        const cost = getUpgradeCost(car, key, curLvl + 1);
        if (prev.cash < cost) return prev;
        return {
          ...prev,
          cash: prev.cash - cost,
          carConfigs: {
            ...prev.carConfigs,
            [carId]: {
              ...cfg,
              upgrades: {
                ...cfg.upgrades,
                [key]: curLvl + 1,
              },
            },
          },
        };
      });
    },
    [updateSave]
  );

  const handleBuyVisual = useCallback(
    (
      carId: string,
      patch: { paintColor?: string; stripe?: StripeStyle; rims?: RimStyle },
      cost: number
    ) => {
      updateSave((prev) => {
        if (prev.cash < cost) return prev;
        const cfg = getCarConfig(prev, carId);
        return {
          ...prev,
          cash: prev.cash - cost,
          carConfigs: {
            ...prev.carConfigs,
            [carId]: {
              ...cfg,
              visuals: {
                ...cfg.visuals,
                ...patch,
              },
            },
          },
        };
      });
    },
    [updateSave]
  );

  const handleUpdateTuning = useCallback(
    (carId: string, tuning: DrivetrainTuning) => {
      updateSave((prev) => {
        const cfg = getCarConfig(prev, carId);
        return {
          ...prev,
          carConfigs: {
            ...prev.carConfigs,
            [carId]: {
              ...cfg,
              tuning,
            },
          },
        };
      });
    },
    [updateSave]
  );

  const handleStartRace = useCallback(
    (tierId: TierId, distanceId: StripDistanceId, rival: RivalSpec | null) => {
      soundEngine.playUiClick();
      setRaceTier(tierId);
      setRaceDistance(rival ? rival.distance : distanceId);
      setRaceRival(rival);
      setScreen('RACE');
    },
    []
  );

  const handleRaceFinished = useCallback(
    (rawResult: RaceResult): RaceResult => {
      const currentSave = saveRef.current;
      let isNewBest = false;
      let recordBonusCash = 0;

      // 1. Log Local Leaderboard (including compact shift-timing replay) if valid non-foul finish
      if (!rawResult.foul && rawResult.playerEtMs > 0) {
        const { records, isNewBestInTier } = addLocalRecord({
          driverName: currentSave.callsign,
          tier: rawResult.tier,
          distance: rawResult.distance,
          carId: rawResult.carId,
          carName: rawResult.carName,
          etMs: rawResult.playerEtMs,
          trapMph: rawResult.playerTrapMph,
          reactionMs: rawResult.reactionMs,
          perfectShifts: rawResult.perfectShifts,
          paintColor: rawResult.paintColor,
          replay: rawResult.replay,
        });
        setLocalRecords(records);
        isNewBest = isNewBestInTier;
        // Record cash bonus applies only to competitive rival races (solo tests earn $0)
        if (isNewBest && !rawResult.isTimeTrial) {
          recordBonusCash = Math.round(65 * [1, 1.65, 2.7, 4.6, 7.8][rawResult.tier - 1]);
        }

        // 2. Submit to Global Firestore Leaderboard if signed in
        if (user && user.emailVerified) {
          submitGlobalRecord({
            uid: user.uid,
            driverName: currentSave.callsign,
            tier: rawResult.tier,
            distance: rawResult.distance,
            carId: rawResult.carId,
            carName: rawResult.carName,
            etMs: rawResult.playerEtMs,
            trapMph: rawResult.playerTrapMph,
            reactionMs: rawResult.reactionMs,
            perfectShifts: rawResult.perfectShifts,
            paintColor: rawResult.paintColor,
          })
            .then((res) => {
              if (res.submitted) void refreshGlobal();
            })
            .catch((err) => {
              console.warn('Global leaderboard submit error:', err);
            });
        }
      }

      // 3. Apply Career Progression & Rebalanced Cash Economy
      let adjustedBasePurse = rawResult.basePurse;
      let isRematch = false;
      if (
        !rawResult.isTimeTrial &&
        rawResult.won &&
        rawResult.rival &&
        currentSave.defeatedRivals.includes(rawResult.rival.id)
      ) {
        adjustedBasePurse = Math.round(rawResult.basePurse * 0.65);
        isRematch = true;
      }

      const totalEarned = rawResult.isTimeTrial
        ? 0
        : adjustedBasePurse + rawResult.shiftBonusCash + rawResult.launchBonusCash + recordBonusCash;

      let unlockedNextTier = false;
      let nextTier = currentSave.highestUnlockedTier;
      const nextDefeated = [...currentSave.defeatedRivals];

      if (rawResult.won && rawResult.rival) {
        if (!nextDefeated.includes(rawResult.rival.id)) {
          nextDefeated.push(rawResult.rival.id);
        }
        if (rawResult.rival.isBoss && rawResult.tier >= nextTier && nextTier < 5) {
          nextTier = (nextTier + 1) as TierId;
          unlockedNextTier = true;
        }
      }

      const updatedSave: PlayerSave = {
        ...currentSave,
        cash: currentSave.cash + totalEarned,
        highestUnlockedTier: nextTier,
        defeatedRivals: nextDefeated,
        totalWins: currentSave.totalWins + (rawResult.won && !rawResult.isTimeTrial ? 1 : 0),
        totalRaces: currentSave.totalRaces + 1,
        updatedAtMs: Date.now(),
      };
      setSave(updatedSave);

      return {
        ...rawResult,
        basePurse: adjustedBasePurse,
        recordBonusCash,
        totalCashEarned: totalEarned,
        isNewPersonalBest: isNewBest,
        unlockedNextTier,
        isRematch,
      };
    },
    [refreshGlobal, user]
  );

  // Determine Next Rival in same strip distance ladder
  const nextRival = useMemo(() => {
    if (!raceRival) return null;
    const sameDistanceRivals = RIVALS.filter((r) => r.distance === raceRival.distance);
    const idx = sameDistanceRivals.findIndex((r) => r.id === raceRival.id);
    if (idx < 0 || idx >= sameDistanceRivals.length - 1) return null;
    const candidate = sameDistanceRivals[idx + 1];
    if (candidate.tier <= save.highestUnlockedTier) {
      return candidate;
    }
    return null;
  }, [raceRival, save.highestUnlockedTier]);

  const activeRaceTimeOfDay = useMemo(
    () => resolveTimeOfDay(raceTier, timeOfDayMode),
    [raceTier, timeOfDayMode]
  );

  let activeView: ReactNode;
  if (screen === 'TITLE') {
    activeView = (
      <TitleScreen
        save={save}
        muted={muted}
        onToggleMute={handleToggleMute}
        onStart={() => {
          soundEngine.playUiClick();
          setScreen('GARAGE');
        }}
      />
    );
  } else if (screen === 'RACE') {
    activeView = (
      <RaceView
        save={save}
        tierId={raceTier}
        timeOfDay={activeRaceTimeOfDay}
        distanceId={raceDistance}
        rival={raceRival}
        muted={muted}
        onToggleMute={handleToggleMute}
        onRaceFinished={handleRaceFinished}
        onExitToGarage={() => {
          soundEngine.playUiClick();
          setScreen('GARAGE');
        }}
        nextRival={nextRival}
        onNextRival={(nr) => {
          soundEngine.playUiClick();
          setRaceTier(nr.tier);
          setRaceDistance(nr.distance);
          setRaceRival(nr);
        }}
      />
    );
  } else {
    activeView = (
      <GarageHub
        save={save}
        user={user}
        muted={muted}
        timeOfDayMode={timeOfDayMode}
        localRecords={localRecords}
        globalRecords={globalRecords}
        globalLoading={globalLoading}
        globalError={globalError}
        onToggleMute={handleToggleMute}
        onChangeTimeOfDayMode={handleChangeTimeOfDayMode}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
        onRefreshGlobal={() => void refreshGlobal()}
        onUpdateCallsign={handleUpdateCallsign}
        onSelectCar={handleSelectCar}
        onBuyCar={handleBuyCar}
        onBuyUpgrade={handleBuyUpgrade}
        onUpdateTuning={handleUpdateTuning}
        onBuyVisual={handleBuyVisual}
        onStartRace={handleStartRace}
      />
    );
  }

  return <>{activeView}</>;
}

export default function App() {
  return (
    <ErrorBoundary>
      <GameApp />
    </ErrorBoundary>
  );
}
