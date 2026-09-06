import React from 'react';
import { motion } from 'motion/react';
import { Award, CheckCircle2, Lock, Sparkles, X, Star } from 'lucide-react';
import { Badge, GamificationStats } from '../types';
import { calculateLevelFromXp } from '../lib/firestore-utils';

export const ALL_BADGES: Badge[] = [
  {
    id: 'first_entry',
    name: 'First Step',
    description: 'Wrote your very first journal entry with Gemini.',
    icon: '🌱',
    category: 'starter',
  },
  {
    id: 'deep_diver',
    name: 'Deep Diver',
    description: 'Pushed past the surface by answering thoughtful follow-up questions.',
    icon: '🤿',
    category: 'depth',
  },
  {
    id: 'streak_3',
    name: 'Streak Pioneer',
    description: 'Logged your thoughts and emotions for 3 consecutive days.',
    icon: '🔥',
    category: 'streak',
  },
  {
    id: 'streak_7',
    name: 'Week of Clarity',
    description: 'Completed a 7-day streak of mindful reflection.',
    icon: '⚡',
    category: 'streak',
  },
  {
    id: 'weekly_chronicler',
    name: 'Mindful Chronicler',
    description: 'Generated your first weekly narrative AI reflection report.',
    icon: '📜',
    category: 'mastery',
  },
  {
    id: 'level_3',
    name: 'Thought Weaver',
    description: 'Ascended to Level 3 by accumulating 100+ XP.',
    icon: '🔮',
    category: 'mastery',
  },
  {
    id: 'emotional_harmony',
    name: 'Emotional Spectrum',
    description: 'Explored and logged 4 or more distinct moods.',
    icon: '🌈',
    category: 'mastery',
  },
];

interface BadgesModalProps {
  isOpen: boolean;
  onClose: () => void;
  unlockedBadgeIds?: string[];
  totalXp?: number;
  level?: number;
  stats?: GamificationStats;
}

export const BadgesModal: React.FC<BadgesModalProps> = ({
  isOpen,
  onClose,
  unlockedBadgeIds,
  totalXp,
  level,
  stats,
}) => {
  if (!isOpen) return null;

  const actualUnlockedBadgeIds = stats ? stats.badges : (unlockedBadgeIds || []);
  const actualXp = stats ? stats.xp : (totalXp || 0);
  const actualLevel = stats ? calculateLevelFromXp(stats.xp).level : (level || 1);
  const unlockedCount = actualUnlockedBadgeIds.length;

  return (
    <div
      id="badges-modal-backdrop"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center">
              <Award className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight">Trophy Case & Badges</h3>
              <p className="text-xs text-amber-100">
                {unlockedCount} of {ALL_BADGES.length} badges unlocked · Level {actualLevel}
              </p>
            </div>
          </div>

          <button
            id="close-badges-modal"
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Badges Grid */}
        <div className="p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-h-[70vh] overflow-y-auto bg-slate-50/50">
          {ALL_BADGES.map((badge) => {
            const isUnlocked = actualUnlockedBadgeIds.includes(badge.id);

            return (
              <div
                key={badge.id}
                id={`badge-card-${badge.id}`}
                className={`p-3.5 rounded-2xl border transition-all flex items-start gap-3 relative ${
                  isUnlocked
                    ? 'bg-white border-amber-300 shadow-sm'
                    : 'bg-slate-100/60 border-slate-200 opacity-60'
                }`}
              >
                {/* Badge Icon */}
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 ${
                    isUnlocked
                      ? 'bg-amber-50 ring-2 ring-amber-300/60 shadow-xs'
                      : 'bg-slate-200 grayscale'
                  }`}
                >
                  {badge.icon}
                </div>

                {/* Badge Info */}
                <div className="space-y-0.5 flex-1 pr-5">
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-xs sm:text-sm font-bold text-slate-800">
                      {badge.name}
                    </h4>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    {badge.description}
                  </p>
                </div>

                {/* Status indicator */}
                <div className="absolute top-3.5 right-3.5">
                  {isUnlocked ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Total Experience: <strong className="text-slate-800">{actualXp} XP</strong>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </motion.div>
    </div>
  );
};
