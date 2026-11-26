import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  orderBy,
  query,
  QuerySnapshot,
  DocumentData,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { sanitizeCarConfig } from '../data/gameData';
import {
  CarConfig,
  GlobalLeaderboardEntry,
  PlayerSave,
  StripDistanceId,
  TierId,
} from '../types/game';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Cache UIDs known to already have a playerSaves/{uid} document to avoid redundant getDoc reads
const knownCloudSaveUids = new Set<string>();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function getUserFriendlyFirestoreMessage(error: unknown, operationType: OperationType): string {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code ?? '')
      : '';
  if (code === 'permission-denied') {
    return 'Access denied by leaderboard security rules. Please verify your account and try again.';
  }
  if (code === 'unavailable' || code === 'deadline-exceeded') {
    return 'Cloud service is temporarily unreachable. Local progress is safely saved.';
  }
  if (operationType === OperationType.LIST) {
    return 'Unable to load the global leaderboard right now. Please try refreshing.';
  }
  return 'Cloud sync encountered an error. Local progress is safely saved.';
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const rawMessage = error instanceof Error ? error.message : String(error);
  console.error('Firestore Error:', {
    operationType,
    path,
    authenticated: Boolean(auth.currentUser),
    emailVerified: Boolean(auth.currentUser?.emailVerified),
    message: rawMessage,
  });
  throw new Error(getUserFriendlyFirestoreMessage(error, operationType));
}

// Sanitization helpers synchronized strictly with firebase-blueprint.json & firestore.rules
export function sanitizeCallsign(input: string): string {
  const cleaned = input.replace(/[^a-zA-Z0-9 _-]/g, '').trim().slice(0, 18);
  return cleaned.length >= 2 ? cleaned : 'RACER_88';
}

function sanitizeShortId(id: string): string {
  const cleaned = id.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32);
  return cleaned.length >= 1 ? cleaned : 'civic_86';
}

function sanitizeHexColor(hex: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : '#d93829';
}

function sanitizeDistance(d: unknown): StripDistanceId {
  if (d === 'half' || d === 'mile') return d;
  return 'quarter';
}

function clampPhysicsForDistance(
  dist: StripDistanceId,
  etMs: number,
  trapMph: number
): { etMs: number; trapMph: number } {
  const bounds =
    dist === 'mile'
      ? { minEt: 8500, maxEt: 90000, minMph: 75, maxMph: 480 }
      : dist === 'half'
      ? { minEt: 5200, maxEt: 60000, minMph: 60, maxMph: 420 }
      : { minEt: 3200, maxEt: 35000, minMph: 50, maxMph: 365 };

  return {
    etMs: Math.max(bounds.minEt, Math.min(bounds.maxEt, Math.round(etMs))),
    trapMph: Math.max(bounds.minMph, Math.min(bounds.maxMph, Number(trapMph.toFixed(1)))),
  };
}

export async function signInWithGoogle(): Promise<User> {
  const res = await signInWithPopup(auth, googleProvider);
  return res.user;
}

export async function signOutUser(): Promise<void> {
  knownCloudSaveUids.clear();
  await signOut(auth);
}

export function subscribeAuth(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

export async function loadCloudSave(uid: string): Promise<PlayerSave | null> {
  const path = `playerSaves/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'playerSaves', uid));
    if (!snap.exists()) return null;
    knownCloudSaveUids.add(uid);
    const data = snap.data();

    const ownedCars = Array.isArray(data.ownedCars)
      ? data.ownedCars
          .filter((id): id is string => typeof id === 'string')
          .slice(0, 30)
          .map(sanitizeShortId)
      : ['civic_86'];
    const safeOwned = ownedCars.length > 0 ? ownedCars : ['civic_86'];

    const rawConfigs =
      typeof data.carConfigs === 'object' && data.carConfigs
        ? (data.carConfigs as Record<string, unknown>)
        : {};
    const carConfigs: Record<string, CarConfig> = {};
    for (const [carId, cfg] of Object.entries(rawConfigs)) {
      if (Object.keys(carConfigs).length >= 30) break;
      carConfigs[carId] = sanitizeCarConfig(carId, cfg);
    }
    for (const carId of safeOwned) {
      if (!carConfigs[carId]) {
        carConfigs[carId] = sanitizeCarConfig(carId, null);
      }
    }

    const activeRaw = sanitizeShortId(String(data.activeCarId ?? safeOwned[0]));
    const updatedAtMs =
      data.updatedAt instanceof Timestamp ? data.updatedAt.toMillis() : 0;

    return {
      callsign: sanitizeCallsign(String(data.callsign ?? 'RACER_88')),
      cash: Math.max(0, Math.min(99999999, Math.floor(Number(data.cash ?? 250) || 0))),
      activeCarId: safeOwned.includes(activeRaw) ? activeRaw : safeOwned[0],
      highestUnlockedTier: Math.max(
        1,
        Math.min(5, Math.floor(Number(data.highestUnlockedTier ?? 1)) || 1)
      ) as TierId,
      ownedCars: safeOwned,
      defeatedRivals: Array.isArray(data.defeatedRivals)
        ? data.defeatedRivals
            .filter((id): id is string => typeof id === 'string')
            .slice(0, 80)
            .map(sanitizeShortId)
        : [],
      carConfigs,
      totalWins: Math.max(0, Math.min(1000000, Math.floor(Number(data.totalWins ?? 0) || 0))),
      totalRaces: Math.max(0, Math.min(1000000, Math.floor(Number(data.totalRaces ?? 0) || 0))),
      updatedAtMs,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function syncCloudSave(uid: string, save: PlayerSave): Promise<void> {
  const path = `playerSaves/${uid}`;
  const ref = doc(db, 'playerSaves', uid);

  const sanitizedConfigs: Record<string, CarConfig> = {};
  for (const [carId, cfg] of Object.entries(save.carConfigs)) {
    if (Object.keys(sanitizedConfigs).length >= 30) break;
    sanitizedConfigs[carId] = sanitizeCarConfig(carId, cfg);
  }

  const updateFields = {
    callsign: sanitizeCallsign(save.callsign),
    cash: Math.max(0, Math.min(99999999, Math.floor(save.cash))),
    activeCarId: sanitizeShortId(save.activeCarId),
    highestUnlockedTier: Math.max(1, Math.min(5, Math.floor(save.highestUnlockedTier))),
    ownedCars: save.ownedCars.slice(0, 30).map(sanitizeShortId),
    defeatedRivals: save.defeatedRivals.slice(0, 80).map(sanitizeShortId),
    carConfigs: sanitizedConfigs,
    totalWins: Math.max(0, Math.min(1000000, Math.floor(save.totalWins))),
    totalRaces: Math.max(0, Math.min(1000000, Math.floor(save.totalRaces))),
    updatedAt: serverTimestamp(),
  };

  try {
    if (knownCloudSaveUids.has(uid)) {
      try {
        await updateDoc(ref, updateFields);
        return;
      } catch (err) {
        const code =
          typeof err === 'object' && err !== null && 'code' in err
            ? String((err as { code?: unknown }).code ?? '')
            : '';
        if (code !== 'not-found') throw err;
        knownCloudSaveUids.delete(uid);
      }
    }

    const existing = await getDoc(ref);
    if (existing.exists()) {
      knownCloudSaveUids.add(uid);
      await updateDoc(ref, updateFields);
    } else {
      await setDoc(ref, {
        ownerId: uid,
        ...updateFields,
        createdAt: serverTimestamp(),
      });
      knownCloudSaveUids.add(uid);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

function mapLeaderboardSnapshot(snap: QuerySnapshot<DocumentData>): GlobalLeaderboardEntry[] {
  const entries: GlobalLeaderboardEntry[] = [];
  snap.forEach((docSnap) => {
    const d = docSnap.data();
    entries.push({
      id: docSnap.id,
      uid: String(d.uid),
      driverName: String(d.driverName),
      tier: Number(d.tier) as TierId,
      distance: sanitizeDistance(d.distance),
      carId: String(d.carId),
      carName: String(d.carName),
      etMs: Number(d.etMs),
      trapMph: Number(d.trapMph),
      reactionMs: Number(d.reactionMs),
      perfectShifts: Number(d.perfectShifts),
      paintColor: String(d.paintColor),
      isPublic: Boolean(d.isPublic),
    });
  });
  entries.sort((a, b) => a.etMs - b.etMs);
  return entries;
}

export async function fetchGlobalLeaderboard(): Promise<GlobalLeaderboardEntry[]> {
  const path = 'leaderboardEntries';
  try {
    const orderedQuery = query(
      collection(db, 'leaderboardEntries'),
      where('isPublic', '==', true),
      orderBy('etMs', 'asc'),
      limit(300)
    );
    try {
      const snap = await getDocs(orderedQuery);
      return mapLeaderboardSnapshot(snap);
    } catch (orderedErr) {
      const code =
        typeof orderedErr === 'object' && orderedErr !== null && 'code' in orderedErr
          ? String((orderedErr as { code?: unknown }).code ?? '')
          : '';
      if (code === 'failed-precondition') {
        // Fallback when composite index (isPublic ASC, etMs ASC) has not yet been deployed
        console.warn(
          'Firestore composite index (isPublic, etMs) not deployed yet; falling back to unordered query.'
        );
        const fallbackQuery = query(
          collection(db, 'leaderboardEntries'),
          where('isPublic', '==', true),
          limit(300)
        );
        const snap = await getDocs(fallbackQuery);
        return mapLeaderboardSnapshot(snap);
      }
      throw orderedErr;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function submitGlobalRecord(params: {
  uid: string;
  driverName: string;
  tier: TierId;
  distance: StripDistanceId;
  carId: string;
  carName: string;
  etMs: number;
  trapMph: number;
  reactionMs: number;
  perfectShifts: number;
  paintColor: string;
}): Promise<{ submitted: boolean; improved: boolean }> {
  const tierInt = Math.max(1, Math.min(5, Math.floor(params.tier)));
  const dist = sanitizeDistance(params.distance);
  // Keep quarter-mile IDs backward compatible with earlier records
  const entryId =
    dist === 'quarter' ? `${params.uid}_t${tierInt}` : `${params.uid}_t${tierInt}_${dist}`;
  const path = `leaderboardEntries/${entryId}`;
  const ref = doc(db, 'leaderboardEntries', entryId);

  const { etMs: clampedEt, trapMph: clampedMph } = clampPhysicsForDistance(
    dist,
    params.etMs,
    params.trapMph
  );
  const clampedReaction = Math.max(0, Math.min(5000, Math.round(params.reactionMs)));
  const clampedShifts = Math.max(0, Math.min(20, Math.floor(params.perfectShifts)));
  const cleanName = sanitizeCallsign(params.driverName);
  const cleanCarId = sanitizeShortId(params.carId);
  const rawCarName = params.carName.trim().slice(0, 40);
  const cleanCarName = rawCarName.length >= 2 ? rawCarName : 'Street Racer';
  const cleanPaint = sanitizeHexColor(params.paintColor);

  let currentOp: OperationType = OperationType.GET;
  try {
    const existing = await getDoc(ref);
    if (existing.exists()) {
      const prevEt = Number(existing.data().etMs ?? 999999);
      if (clampedEt >= prevEt) {
        return { submitted: false, improved: false };
      }
      currentOp = OperationType.UPDATE;
      await updateDoc(ref, {
        driverName: cleanName,
        distance: dist,
        carId: cleanCarId,
        carName: cleanCarName,
        etMs: clampedEt,
        trapMph: clampedMph,
        reactionMs: clampedReaction,
        perfectShifts: clampedShifts,
        paintColor: cleanPaint,
        updatedAt: serverTimestamp(),
      });
      return { submitted: true, improved: true };
    } else {
      currentOp = OperationType.CREATE;
      await setDoc(ref, {
        uid: params.uid,
        driverName: cleanName,
        tier: tierInt,
        distance: dist,
        carId: cleanCarId,
        carName: cleanCarName,
        etMs: clampedEt,
        trapMph: clampedMph,
        reactionMs: clampedReaction,
        perfectShifts: clampedShifts,
        paintColor: cleanPaint,
        isPublic: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return { submitted: true, improved: true };
    }
  } catch (error) {
    handleFirestoreError(error, currentOp, path);
  }
}
