import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  getDocs,
  getDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import { JournalInteraction, GamificationStats, WeeklyReport } from '../types';

/**
 * Strict Undefined-Stripping (Zero-Crash Payload Hygiene)
 * Recursively strips any keys whose value is undefined, preventing Firestore SDK serialization rejections.
 */
export function stripUndefined<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => stripUndefined(item)) as unknown as T;
  }
  if (typeof obj === 'object') {
    const cleanObj: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleanObj[key] = stripUndefined(value);
      }
    }
    return cleanObj as T;
  }
  return obj;
}

/**
 * Persists an interaction / journal session under the isolated path:
 * /users/{userId}/interactions/{interactionId}
 */
export async function saveUserInteraction(
  userId: string,
  interaction: JournalInteraction
): Promise<void> {
  if (!userId) {
    throw new Error('User ID is required to persist interaction in isolated storage.');
  }
  if (!interaction.id) {
    throw new Error('Interaction ID is missing.');
  }

  const cleanPayload = stripUndefined({
    ...interaction,
    userId,
    updatedAt: new Date().toISOString(),
  });

  const docRef = doc(db, 'users', userId, 'interactions', interaction.id);
  await setDoc(docRef, cleanPayload, { merge: true });
}

/**
 * Deletes an interaction from user's isolated store
 */
export async function deleteUserInteraction(
  userId: string,
  interactionId: string
): Promise<void> {
  if (!userId || !interactionId) {
    throw new Error('User ID and Interaction ID are required for deletion.');
  }
  const docRef = doc(db, 'users', userId, 'interactions', interactionId);
  await deleteDoc(docRef);
}

/**
 * Sets up a real-time subscription for the current authenticated user's interactions
 */
export function subscribeToUserInteractions(
  userId: string,
  onUpdate: (interactions: JournalInteraction[]) => void,
  onError: (error: Error) => void
): () => void {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }

  const interactionsRef = collection(db, 'users', userId, 'interactions');
  const q = query(interactionsRef, orderBy('updatedAt', 'desc'));

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const results: JournalInteraction[] = [];
      snapshot.forEach((docSnap) => {
        results.push(docSnap.data() as JournalInteraction);
      });
      onUpdate(results);
    },
    (err) => {
      console.error('[Firestore Error] Failed to stream user interactions:', err);
      onError(err);
    }
  );

  return unsubscribe;
}

/**
 * Fetches all interactions once for the user
 */
export async function fetchUserInteractions(userId: string): Promise<JournalInteraction[]> {
  if (!userId) return [];
  const interactionsRef = collection(db, 'users', userId, 'interactions');
  const q = query(interactionsRef, orderBy('updatedAt', 'desc'));
  const snapshot = await getDocs(q);
  const items: JournalInteraction[] = [];
  snapshot.forEach((docSnap) => {
    items.push(docSnap.data() as JournalInteraction);
  });
  return items;
}

export const INITIAL_GAMIFICATION_STATS: GamificationStats = {
  xp: 0,
  level: 1,
  streak: 0,
  lastActiveDate: '',
  badges: [],
  entriesCount: 0,
  digDeeperCount: 0,
  reportsCount: 0,
};

export const LEVEL_THRESHOLDS = [
  { level: 1, title: 'Novice Scribe', minXp: 0, maxXp: 40 },
  { level: 2, title: 'Mindful Explorer', minXp: 41, maxXp: 100 },
  { level: 3, title: 'Thought Weaver', minXp: 101, maxXp: 200 },
  { level: 4, title: 'Insight Seeker', minXp: 201, maxXp: 350 },
  { level: 5, title: 'Zen Master', minXp: 351, maxXp: 600 },
];

export function calculateLevelFromXp(xp: number): { level: number; title: string; currentLevelMin: number; nextLevelMin: number } {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i].minXp) {
      const current = LEVEL_THRESHOLDS[i];
      const next = LEVEL_THRESHOLDS[i + 1] || { minXp: current.maxXp + 250 };
      return {
        level: current.level,
        title: current.title,
        currentLevelMin: current.minXp,
        nextLevelMin: next.minXp,
      };
    }
  }
  return { level: 1, title: 'Novice Scribe', currentLevelMin: 0, nextLevelMin: 41 };
}

/**
 * Persists gamification stats under /users/{userId}/gamification/stats
 */
export async function saveGamificationStats(
  userId: string,
  stats: GamificationStats
): Promise<void> {
  if (!userId) return;
  const cleanPayload = stripUndefined(stats);
  const docRef = doc(db, 'users', userId, 'gamification', 'stats');
  await setDoc(docRef, cleanPayload, { merge: true });
}

/**
 * Fetches user gamification stats
 */
export async function fetchGamificationStats(userId: string): Promise<GamificationStats> {
  if (!userId) return INITIAL_GAMIFICATION_STATS;
  try {
    const docRef = doc(db, 'users', userId, 'gamification', 'stats');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { ...INITIAL_GAMIFICATION_STATS, ...snap.data() } as GamificationStats;
    }
  } catch (err) {
    console.error('Error fetching gamification stats:', err);
  }
  return INITIAL_GAMIFICATION_STATS;
}

/**
 * Subscribes to real-time gamification stats updates
 */
export function subscribeToGamificationStats(
  userId: string,
  onUpdate: (stats: GamificationStats) => void
): () => void {
  if (!userId) {
    onUpdate(INITIAL_GAMIFICATION_STATS);
    return () => {};
  }
  const docRef = doc(db, 'users', userId, 'gamification', 'stats');
  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        onUpdate({ ...INITIAL_GAMIFICATION_STATS, ...snap.data() } as GamificationStats);
      } else {
        onUpdate(INITIAL_GAMIFICATION_STATS);
      }
    },
    (err) => {
      console.warn('Gamification stream error:', err);
    }
  );
}

/**
 * Awards XP, updates streak, checks badge unlocks, and returns new stats and any new badges unlocked
 */
export async function awardGamificationXP(
  userId: string,
  currentStats: GamificationStats,
  action: 'entry' | 'dig_deeper' | 'report',
  extraContext?: { moodsLoggedCount?: number }
): Promise<{ newStats: GamificationStats; newlyUnlockedBadges: string[]; leveledUp: boolean }> {
  let xpGain = 0;
  let newEntries = currentStats.entriesCount;
  let newDigDeeper = currentStats.digDeeperCount;
  let newReports = currentStats.reportsCount;

  if (action === 'entry') {
    xpGain = 10;
    newEntries += 1;
  } else if (action === 'dig_deeper') {
    xpGain = 5;
    newDigDeeper += 1;
  } else if (action === 'report') {
    xpGain = 20;
    newReports += 1;
  }

  const todayStr = new Date().toISOString().split('T')[0];
  let newStreak = currentStats.streak || 0;

  if (!currentStats.lastActiveDate) {
    newStreak = 1;
  } else if (currentStats.lastActiveDate === todayStr) {
    // Already logged today, maintain streak
    newStreak = Math.max(1, newStreak);
  } else {
    const lastDate = new Date(currentStats.lastActiveDate);
    const today = new Date(todayStr);
    const diffDays = Math.round((today.getTime() - lastDate.getTime()) / (1000 * 3600 * 24));
    if (diffDays === 1) {
      newStreak += 1;
    } else if (diffDays > 1) {
      newStreak = 1;
    }
  }

  const newTotalXp = (currentStats.xp || 0) + xpGain;
  const { level: newLevel } = calculateLevelFromXp(newTotalXp);
  const leveledUp = newLevel > (currentStats.level || 1);

  // Badge check
  const existingBadges = new Set(currentStats.badges || []);
  const newlyUnlocked: string[] = [];

  const checkBadge = (badgeId: string, condition: boolean) => {
    if (condition && !existingBadges.has(badgeId)) {
      existingBadges.add(badgeId);
      newlyUnlocked.push(badgeId);
    }
  };

  checkBadge('first_entry', newEntries >= 1);
  checkBadge('deep_diver', newDigDeeper >= 1);
  checkBadge('streak_3', newStreak >= 3);
  checkBadge('streak_7', newStreak >= 7);
  checkBadge('weekly_chronicler', newReports >= 1);
  checkBadge('level_3', newLevel >= 3);
  if ((extraContext?.moodsLoggedCount || 0) >= 4) {
    checkBadge('emotional_harmony', true);
  }

  const newStats: GamificationStats = {
    xp: newTotalXp,
    level: newLevel,
    streak: newStreak,
    lastActiveDate: todayStr,
    badges: Array.from(existingBadges),
    entriesCount: newEntries,
    digDeeperCount: newDigDeeper,
    reportsCount: newReports,
  };

  await saveGamificationStats(userId, newStats);

  return {
    newStats,
    newlyUnlockedBadges: newlyUnlocked,
    leveledUp,
  };
}

/**
 * Weekly Reports persistence in /users/{userId}/weekly_reports/{reportId}
 */
export async function saveWeeklyReport(
  userId: string,
  report: WeeklyReport
): Promise<void> {
  if (!userId || !report.id) return;
  const cleanPayload = stripUndefined({
    ...report,
    userId,
    createdAt: report.createdAt || new Date().toISOString(),
  });
  const docRef = doc(db, 'users', userId, 'weekly_reports', report.id);
  await setDoc(docRef, cleanPayload, { merge: true });
}

export function subscribeToWeeklyReports(
  userId: string,
  onUpdate: (reports: WeeklyReport[]) => void
): () => void {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }
  const collRef = collection(db, 'users', userId, 'weekly_reports');
  const q = query(collRef, orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => {
      const items: WeeklyReport[] = [];
      snap.forEach((d) => items.push(d.data() as WeeklyReport));
      onUpdate(items);
    },
    (err) => {
      console.warn('Weekly reports stream error:', err);
    }
  );
}
