import {
  createInitialPlayerSave,
  getEffectiveTuning,
  sanitizeCarConfig,
} from '../data/gameData';
import { CarConfig, LocalRecord, PlayerSave, StripDistanceId, TierId } from '../types/game';

const SAVE_KEY = 'redline88_save_v1';
const LOCAL_BOARD_KEY = 'redline88_local_records_v1';
const MAX_RECORDS_PER_BUCKET = 12;
const MAX_EXTRA_REPLAYS = 12;

function sanitizeIdList(raw: unknown, maxLen: number): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (typeof item !== 'string') continue;
    const cleaned = item.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32);
    if (cleaned.length > 0 && !seen.has(cleaned)) {
      seen.add(cleaned);
      out.push(cleaned);
      if (out.length >= maxLen) break;
    }
  }
  return out;
}

export function loadLocalSave(): PlayerSave {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return createInitialPlayerSave();
    const parsed = JSON.parse(raw) as Partial<PlayerSave>;
    const initial = createInitialPlayerSave();
    const ownedCarsRaw = sanitizeIdList(parsed.ownedCars, 30);
    const ownedCars = ownedCarsRaw.length > 0 ? ownedCarsRaw : initial.ownedCars;

    const rawConfigs =
      parsed.carConfigs && typeof parsed.carConfigs === 'object' ? parsed.carConfigs : {};
    const carConfigs: Record<string, CarConfig> = {};

    for (const [carId, cfg] of Object.entries(rawConfigs)) {
      if (Object.keys(carConfigs).length >= 30) break;
      carConfigs[carId] = sanitizeCarConfig(carId, cfg);
    }
    for (const carId of ownedCars) {
      if (!carConfigs[carId]) {
        carConfigs[carId] = sanitizeCarConfig(carId, null);
      }
    }

    return {
      callsign:
        typeof parsed.callsign === 'string' && parsed.callsign.trim().length >= 2
          ? parsed.callsign.trim().slice(0, 18)
          : initial.callsign,
      cash:
        typeof parsed.cash === 'number' && Number.isFinite(parsed.cash)
          ? Math.max(0, Math.min(99999999, Math.floor(parsed.cash)))
          : initial.cash,
      activeCarId:
        typeof parsed.activeCarId === 'string' && ownedCars.includes(parsed.activeCarId)
          ? parsed.activeCarId
          : ownedCars[0],
      highestUnlockedTier: Math.max(
        1,
        Math.min(5, Math.floor(Number(parsed.highestUnlockedTier ?? 1)) || 1)
      ) as TierId,
      ownedCars,
      defeatedRivals: sanitizeIdList(parsed.defeatedRivals, 160),
      carConfigs,
      totalWins: Math.max(0, Math.min(1000000, Math.floor(Number(parsed.totalWins ?? 0)) || 0)),
      totalRaces: Math.max(0, Math.min(1000000, Math.floor(Number(parsed.totalRaces ?? 0)) || 0)),
      updatedAtMs:
        typeof parsed.updatedAtMs === 'number' && Number.isFinite(parsed.updatedAtMs)
          ? Math.max(0, parsed.updatedAtMs)
          : 0,
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

export function clearLocalSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
    localStorage.removeItem(LOCAL_BOARD_KEY);
  } catch {
    // Ignore storage errors
  }
}

export function mergeSaves(local: PlayerSave, cloud: PlayerSave): PlayerSave {
  // If local save is an untouched starter save on a fresh browser, adopt cloud directly
  const localIsFresh =
    local.totalRaces === 0 &&
    local.ownedCars.length <= 1 &&
    local.defeatedRivals.length === 0 &&
    (local.updatedAtMs ?? 0) === 0;
  if (localIsFresh) {
    return {
      ...cloud,
      updatedAtMs: cloud.updatedAtMs ?? Date.now(),
    };
  }

  const localTs = local.updatedAtMs ?? 0;
  const cloudTs = cloud.updatedAtMs ?? 0;
  const cloudIsNewer =
    cloudTs !== localTs ? cloudTs > localTs : cloud.totalRaces >= local.totalRaces;

  const mergedOwned = Array.from(new Set([...local.ownedCars, ...cloud.ownedCars])).slice(0, 30);
  const mergedRivals = Array.from(
    new Set([...local.defeatedRivals, ...cloud.defeatedRivals])
  ).slice(0, 160);
  const mergedConfigs: Record<string, CarConfig> = {};

  const allCarIds = Array.from(
    new Set([...Object.keys(local.carConfigs), ...Object.keys(cloud.carConfigs), ...mergedOwned])
  ).slice(0, 30);

  for (const carId of allCarIds) {
    const localCfg = local.carConfigs[carId]
      ? sanitizeCarConfig(carId, local.carConfigs[carId])
      : null;
    const cloudCfg = cloud.carConfigs[carId]
      ? sanitizeCarConfig(carId, cloud.carConfigs[carId])
      : null;

    if (!localCfg && cloudCfg) {
      mergedConfigs[carId] = cloudCfg;
    } else if (localCfg && !cloudCfg) {
      mergedConfigs[carId] = localCfg;
    } else if (localCfg && cloudCfg) {
      mergedConfigs[carId] = {
        upgrades: {
          engine: Math.max(localCfg.upgrades.engine, cloudCfg.upgrades.engine),
          induction: Math.max(localCfg.upgrades.induction, cloudCfg.upgrades.induction),
          transmission: Math.max(localCfg.upgrades.transmission, cloudCfg.upgrades.transmission),
          tires: Math.max(localCfg.upgrades.tires, cloudCfg.upgrades.tires),
          chassis: Math.max(localCfg.upgrades.chassis, cloudCfg.upgrades.chassis),
          nitrous: Math.max(localCfg.upgrades.nitrous, cloudCfg.upgrades.nitrous),
        },
        visuals: cloudIsNewer ? cloudCfg.visuals : localCfg.visuals,
        tuning: cloudIsNewer
          ? getEffectiveTuning(carId, cloudCfg)
          : getEffectiveTuning(carId, localCfg),
        engineHealth: cloudIsNewer
          ? (cloudCfg.engineHealth ?? 100)
          : (localCfg.engineHealth ?? 100),
      };
    } else {
      mergedConfigs[carId] = sanitizeCarConfig(carId, null);
    }
  }

  const preferredActive = cloudIsNewer ? cloud.activeCarId : local.activeCarId;
  const activeCarId = mergedOwned.includes(preferredActive) ? preferredActive : mergedOwned[0];

  return {
    callsign: cloudIsNewer ? cloud.callsign : local.callsign,
    // Use the newer save's cash balance to prevent refunding offline purchases via Math.max
    cash: cloudIsNewer ? cloud.cash : local.cash,
    activeCarId,
    highestUnlockedTier: Math.max(local.highestUnlockedTier, cloud.highestUnlockedTier) as TierId,
    ownedCars: mergedOwned,
    defeatedRivals: mergedRivals,
    carConfigs: mergedConfigs,
    totalWins: Math.max(local.totalWins, cloud.totalWins),
    totalRaces: Math.max(local.totalRaces, cloud.totalRaces),
    updatedAtMs: Math.max(localTs, cloudTs, Date.now()),
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

  // Cap records per (tier, distance) bucket so short-strip Tier 5 runs never evict 1-Mile or Street runs
  const buckets = new Map<string, LocalRecord[]>();
  for (const r of [...existing, entry]) {
    const key = `${r.tier}_${r.distance ?? 'quarter'}`;
    const list = buckets.get(key) ?? [];
    list.push(r);
    buckets.set(key, list);
  }

  const retained: LocalRecord[] = [];
  const bestReplayIds = new Set<string>();
  for (const list of buckets.values()) {
    list.sort((a, b) => a.etMs - b.etMs);
    const trimmed = list.slice(0, MAX_RECORDS_PER_BUCKET);
    const bestWithReplay = trimmed.find((r) => Boolean(r.replay));
    if (bestWithReplay) {
      bestReplayIds.add(bestWithReplay.id);
    }
    retained.push(...trimmed);
  }

  retained.sort((a, b) => a.etMs - b.etMs);

  // Preserve full replay payloads on every (tier, distance) #1 best run + up to 12 additional replays
  const keptReplays = new Set<string>(bestReplayIds);
  let extraCount = 0;
  for (const r of retained) {
    if (r.replay && !keptReplays.has(r.id) && extraCount < MAX_EXTRA_REPLAYS) {
      keptReplays.add(r.id);
      extraCount++;
    }
  }

  const next: LocalRecord[] = retained.map((r) =>
    r.replay && !keptReplays.has(r.id) ? { ...r, replay: undefined } : r
  );

  try {
    localStorage.setItem(LOCAL_BOARD_KEY, JSON.stringify(next));
  } catch {
    // Storage quota fallback 1: keep replays strictly on #1 best record ID per (tier, distance) bucket
    const compact = next.map((r) =>
      r.replay && !bestReplayIds.has(r.id) ? { ...r, replay: undefined } : r
    );
    try {
      localStorage.setItem(LOCAL_BOARD_KEY, JSON.stringify(compact));
      return { records: compact, isNewBestInTier };
    } catch {
      // Storage quota fallback 2: strip all replays so time slips still persist
      const minimal = compact.map((r) => (r.replay ? { ...r, replay: undefined } : r));
      try {
        localStorage.setItem(LOCAL_BOARD_KEY, JSON.stringify(minimal));
        return { records: minimal, isNewBestInTier };
      } catch {
        // Ignore storage quota errors
      }
    }
  }

  return { records: next, isNewBestInTier };
}
