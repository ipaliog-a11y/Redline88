import {
  createDefaultCarConfig,
  createInitialPlayerSave,
  getEffectiveTuning,
} from '../data/gameData';
import { LocalRecord, PlayerSave, StripDistanceId, TierId } from '../types/game';

const SAVE_KEY = 'redline88_save_v1';
const LOCAL_BOARD_KEY = 'redline88_local_records_v1';

export function loadLocalSave(): PlayerSave {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return createInitialPlayerSave();
    const parsed = JSON.parse(raw) as Partial<PlayerSave>;
    const initial = createInitialPlayerSave();
    const ownedCars = Array.isArray(parsed.ownedCars) && parsed.ownedCars.length > 0
      ? parsed.ownedCars
      : initial.ownedCars;
    const carConfigs = parsed.carConfigs && typeof parsed.carConfigs === 'object'
      ? parsed.carConfigs
      : initial.carConfigs;

    for (const carId of ownedCars) {
      if (!carConfigs[carId]) {
        carConfigs[carId] = createDefaultCarConfig(carId);
      } else {
        carConfigs[carId] = {
          ...carConfigs[carId],
          tuning: getEffectiveTuning(carId, carConfigs[carId]),
        };
      }
    }

    return {
      callsign: typeof parsed.callsign === 'string' && parsed.callsign.trim().length >= 2
        ? parsed.callsign.trim().slice(0, 18)
        : initial.callsign,
      cash: typeof parsed.cash === 'number' && Number.isFinite(parsed.cash) ? Math.max(0, parsed.cash) : initial.cash,
      activeCarId: typeof parsed.activeCarId === 'string' && ownedCars.includes(parsed.activeCarId)
        ? parsed.activeCarId
        : ownedCars[0],
      highestUnlockedTier: (Math.max(1, Math.min(5, Number(parsed.highestUnlockedTier ?? 1))) as TierId),
      ownedCars,
      defeatedRivals: Array.isArray(parsed.defeatedRivals) ? parsed.defeatedRivals : [],
      carConfigs,
      totalWins: Number(parsed.totalWins ?? 0),
      totalRaces: Number(parsed.totalRaces ?? 0),
    };
  } catch {
    return createInitialPlayerSave();
  }
}

export function saveLocalSave(save: PlayerSave): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch {
    // Ignore storage quota errors
  }
}

export function mergeSaves(local: PlayerSave, cloud: PlayerSave): PlayerSave {
  const mergedOwned = Array.from(new Set([...local.ownedCars, ...cloud.ownedCars]));
  const mergedRivals = Array.from(new Set([...local.defeatedRivals, ...cloud.defeatedRivals]));
  const mergedConfigs = { ...local.carConfigs };

  for (const [carId, cloudCfg] of Object.entries(cloud.carConfigs)) {
    const localCfg = mergedConfigs[carId];
    if (!localCfg) {
      mergedConfigs[carId] = {
        ...cloudCfg,
        tuning: getEffectiveTuning(carId, cloudCfg),
      };
    } else {
      mergedConfigs[carId] = {
        upgrades: {
          engine: Math.max(localCfg.upgrades.engine, cloudCfg.upgrades.engine),
          induction: Math.max(localCfg.upgrades.induction, cloudCfg.upgrades.induction),
          transmission: Math.max(localCfg.upgrades.transmission, cloudCfg.upgrades.transmission),
          tires: Math.max(localCfg.upgrades.tires, cloudCfg.upgrades.tires),
          chassis: Math.max(localCfg.upgrades.chassis, cloudCfg.upgrades.chassis),
          nitrous: Math.max(localCfg.upgrades.nitrous, cloudCfg.upgrades.nitrous),
        },
        visuals: cloud.totalRaces >= local.totalRaces ? cloudCfg.visuals : localCfg.visuals,
        tuning: cloud.totalRaces >= local.totalRaces
          ? getEffectiveTuning(carId, cloudCfg)
          : getEffectiveTuning(carId, localCfg),
      };
    }
  }

  return {
    callsign: cloud.totalRaces >= local.totalRaces ? cloud.callsign : local.callsign,
    cash: Math.max(local.cash, cloud.cash),
    activeCarId: cloud.totalRaces >= local.totalRaces ? cloud.activeCarId : local.activeCarId,
    highestUnlockedTier: Math.max(local.highestUnlockedTier, cloud.highestUnlockedTier) as TierId,
    ownedCars: mergedOwned,
    defeatedRivals: mergedRivals,
    carConfigs: mergedConfigs,
    totalWins: Math.max(local.totalWins, cloud.totalWins),
    totalRaces: Math.max(local.totalRaces, cloud.totalRaces),
  };
}

export function loadLocalRecords(): LocalRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_BOARD_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return (parsed as LocalRecord[])
      .map((r) => ({ ...r, distance: (r.distance ?? 'quarter') as StripDistanceId }))
      .sort((a, b) => a.etMs - b.etMs);
  } catch {
    return [];
  }
}

export function addLocalRecord(record: Omit<LocalRecord, 'id' | 'timestamp'>): {
  records: LocalRecord[];
  isNewBestInTier: boolean;
} {
  const dist: StripDistanceId = record.distance ?? 'quarter';
  const existing = loadLocalRecords();
  const prevBestInTier = existing
    .filter((r) => r.tier === record.tier && (r.distance ?? 'quarter') === dist)
    .reduce((min, r) => Math.min(min, r.etMs), Infinity);
  const isNewBestInTier = record.etMs < prevBestInTier;

  const entry: LocalRecord = {
    ...record,
    distance: dist,
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: Date.now(),
  };

  const sorted = [...existing, entry]
    .sort((a, b) => a.etMs - b.etMs)
    .slice(0, 90);

  // Preserve full replay payloads on every (tier, distance) #1 best run + up to 18 fastest replays overall
  const bestByBucket = new Set<string>();
  const keptReplays = new Set<string>();
  for (const r of sorted) {
    const key = `${r.tier}_${r.distance ?? 'quarter'}`;
    if (!bestByBucket.has(key) && r.replay) {
      bestByBucket.add(key);
      keptReplays.add(r.id);
    }
  }
  let extraCount = 0;
  for (const r of sorted) {
    if (r.replay && !keptReplays.has(r.id) && extraCount < 12) {
      keptReplays.add(r.id);
      extraCount++;
    }
  }

  const next: LocalRecord[] = sorted.map((r) =>
    r.replay && !keptReplays.has(r.id) ? { ...r, replay: undefined } : r
  );

  try {
    localStorage.setItem(LOCAL_BOARD_KEY, JSON.stringify(next));
  } catch {
    // Storage quota fallback: keep replays strictly on #1 best per (tier, distance) bucket
    const compact = next.map((r) =>
      r.replay && !bestByBucket.has(`${r.tier}_${r.distance ?? 'quarter'}`)
        ? { ...r, replay: undefined }
        : r
    );
    try {
      localStorage.setItem(LOCAL_BOARD_KEY, JSON.stringify(compact));
    } catch {
      // Ignore storage quota errors
    }
  }

  return { records: next, isNewBestInTier };
}
