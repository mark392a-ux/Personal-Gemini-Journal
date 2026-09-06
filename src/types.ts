export type MoodType =
  | 'Happy'
  | 'Sad'
  | 'Anxious'
  | 'Grateful'
  | 'Neutral'
  | 'Excited'
  | 'Tired';

export interface MoodMeta {
  type: MoodType;
  emoji: string;
  label: string;
  color: string;
  bgLight: string;
  borderColor: string;
  description: string;
}

export interface DigDeeperQA {
  id: string;
  question: string;
  answer?: string;
  answeredAt?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
  modelUsed?: string;
}

export type ReflectionMode = 'reflection' | 'brainstorm' | 'summary';

export interface JournalInteraction {
  id: string;
  userId: string;
  title: string;
  category: ReflectionMode;
  mood: MoodType;
  messages: ChatMessage[];
  summary?: string;
  digDeeperQuestions?: DigDeeperQA[];
  promptUsed?: string;
  xpEarned?: number;
  createdAt: string;
  updatedAt: string;
}

export interface WeeklyReport {
  id: string;
  userId: string;
  title: string;
  reportContent: string;
  dominantMood?: string;
  entryCount: number;
  streakAtTime: number;
  modelUsed?: string;
  createdAt: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt?: string;
  category: 'starter' | 'streak' | 'depth' | 'mastery';
}

export interface GamificationStats {
  xp: number;
  level: number;
  streak: number;
  lastActiveDate: string; // YYYY-MM-DD
  badges: string[]; // Badge IDs
  entriesCount: number;
  digDeeperCount: number;
  reportsCount: number;
}

export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}
