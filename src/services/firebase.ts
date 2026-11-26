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
  getDocFromServer,
  getDocs,
  getFirestore,
  limit,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  GlobalLeaderboardEntry,
  PlayerSave,
  StripDistanceId,
  TierId,
} from '../types/game';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
void testConnection();

// Sanitization helpers synchronized strictly with firebase-blueprint.json
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

export async function signInWithGoogle(): Promise<User> {
  const res = await signInWithPopup(auth, googleProvider);
  return res.user;
}

export async function signOutUser(): Promise<void> {
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
    const data = snap.data();
    return {
      callsign: sanitizeCallsign(String(data.callsign ?? 'RACER_88')),
      cash: Number(data.cash ?? 650),
      activeCarId: sanitizeShortId(String(data.activeCarId ?? 'civic_86')),
      highestUnlockedTier: Math.max(1, Math.min(5, Number(data.highestUnlockedTier ?? 1))) as TierId,
      ownedCars: Array.isArray(data.ownedCars) ? data.ownedCars.slice(0, 30) : ['civic_86'],
      defeatedRivals: Array.isArray(data.defeatedRivals) ? data.defeatedRivals.slice(0, 80) : [],
      carConfigs: typeof data.carConfigs === 'object' && data.carConfigs ? data.carConfigs : {},
      totalWins: Number(data.totalWins ?? 0),
      totalRaces: Number(data.totalRaces ?? 0),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function syncCloudSave(uid: string, save: PlayerSave): Promise<void> {
  const path = `playerSaves/${uid}`;
  const ref = doc(db, 'playerSaves', uid);
  const basePayload = {
    ownerId: uid,
    callsign: sanitizeCallsign(save.callsign),
    cash: Math.max(0, Math.min(99999999, Math.floor(save.cash))),
    activeCarId: sanitizeShortId(save.activeCarId),
    highestUnlockedTier: Math.max(1, Math.min(5, Math.floor(save.highestUnlockedTier))),
    ownedCars: save.ownedCars.slice(0, 30).map(sanitizeShortId),
    defeatedRivals: save.defeatedRivals.slice(0, 80).map(sanitizeShortId),
    carConfigs: save.carConfigs,
    totalWins: Math.max(0, Math.min(1000000, Math.floor(save.totalWins))),
    totalRaces: Math.max(0, Math.min(1000000, Math.floor(save.totalRaces))),
    updatedAt: serverTimestamp(),
  };

  try {
    const existing = await getDoc(ref);
    if (existing.exists()) {
      await updateDoc(ref, {
        callsign: basePayload.callsign,
        cash: basePayload.cash,
        activeCarId: basePayload.activeCarId,
        highestUnlockedTier: basePayload.highestUnlockedTier,
        ownedCars: basePayload.ownedCars,
        defeatedRivals: basePayload.defeatedRivals,
        carConfigs: basePayload.carConfigs,
        totalWins: basePayload.totalWins,
        totalRaces: basePayload.totalRaces,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, {
        ...basePayload,
        createdAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function fetchGlobalLeaderboard(): Promise<GlobalLeaderboardEntry[]> {
  const path = 'leaderboardEntries';
  try {
    const q = query(
      collection(db, 'leaderboardEntries'),
      where('isPublic', '==', true),
      limit(300)
    );
    const snap = await getDocs(q);
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

  const clampedEt = Math.max(3200, Math.min(90000, Math.round(params.etMs)));
  const clampedMph = Math.max(50, Math.min(480, Number(params.trapMph.toFixed(1))));
  const clampedReaction = Math.max(0, Math.min(5000, Math.round(params.reactionMs)));
  const clampedShifts = Math.max(0, Math.min(20, Math.floor(params.perfectShifts)));
  const cleanName = sanitizeCallsign(params.driverName);
  const cleanCarId = sanitizeShortId(params.carId);
  const cleanCarName = params.carName.trim().slice(0, 40) || 'Street Racer';
  const cleanPaint = sanitizeHexColor(params.paintColor);

  try {
    const existing = await getDoc(ref);
    if (existing.exists()) {
      const prevEt = Number(existing.data().etMs ?? 999999);
      if (clampedEt >= prevEt) {
        return { submitted: false, improved: false };
      }
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
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
