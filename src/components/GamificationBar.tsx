import React from 'react';
import { motion } from 'motion/react';
import { Flame, Award, Sparkles, BookOpen, FileText, Heart } from 'lucide-react';
import { GamificationStats } from '../types';
import { calculateLevelFromXp } from '../lib/firestore-utils';

interface GamificationBarProps {
  stats: GamificationStats;
  onOpenBadges: () => void;
  onOpenWeeklyReports: () => void;
  onOpenMoodStats?: () => void;
}

export const GamificationBar: React.FC<GamificationBarProps> = ({
  stats,
  onOpenBadges,
  onOpenWeeklyReports,
  onOpenMoodStats,
}) => {
  const { xp, streak, badges } = stats;
  const { level, title: levelTitle, currentLevelMin, nextLevelMin } = calculateLevelFromXp(xp);

  // Calculate progress percentage inside current level
  const levelSpan = Math.max(1, nextLevelMin - currentLevelMin);
  const xpIntoLevel = Math.max(0, xp - currentLevelMin);
  const progressPercent = Math.min(100, Math.round((xpIntoLevel / levelSpan) * 100));

  return (
    <div
      id="gamification-bar"
      className="w-full bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 p-3 sm:p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 sm:gap-4"
    >
      {/* Left: Level & Title */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white font-black text-sm flex items-center justify-center shadow-sm shrink-0">
          L{level}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-black text-slate-800 tracking-tight">
              {levelTitle}
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
              {xp} XP
            </span>
          </div>
          {/* XP Progress Bar */}
          <div className="w-36 sm:w-48 bg-slate-100 h-2 rounded-full overflow-hidden mt-1.5 border border-slate-200/60 relative">
            <motion.div
              className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
          <span className="text-[10px] text-slate-400 font-medium mt-0.5 block">
            {nextLevelMin - xp > 0 ? `${nextLevelMin - xp} XP to next level` : 'Max rank reached!'}
          </span>
        </div>
      </div>

      {/* Right Stats & Quick Action Badges */}
      <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 shrink-0 flex-wrap">
        {/* Streak Counter Pill */}
        <div
          id="streak-display-pill"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50 border border-orange-200 text-orange-800 text-xs font-bold"
          title="Daily journaling streak"
        >
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <Flame className="w-4 h-4 text-orange-500 fill-orange-500" />
          </motion.div>
          <span>{streak} Day Streak</span>
        </div>

        {/* Badges Trophy Button */}
        <button
          id="open-trophy-btn"
          type="button"
          onClick={onOpenBadges}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100/80 border border-amber-200 text-amber-900 text-xs font-bold transition cursor-pointer"
        >
          <Award className="w-4 h-4 text-amber-600" />
          <span>{badges.length} Badges</span>
        </button>

        {/* Mood Stats Button */}
        {onOpenMoodStats && (
          <button
            id="open-mood-stats-btn"
            type="button"
            onClick={onOpenMoodStats}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-pink-50 hover:bg-pink-100/80 border border-pink-200 text-pink-900 text-xs font-bold transition cursor-pointer"
          >
            <Heart className="w-4 h-4 text-pink-500 fill-pink-500" />
            <span>Mood Stats</span>
          </button>
        )}

        {/* Weekly Report Button */}
        <button
          id="open-weekly-reports-btn"
          type="button"
          onClick={onOpenWeeklyReports}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100/80 border border-purple-200 text-purple-900 text-xs font-bold transition cursor-pointer"
        >
          <FileText className="w-4 h-4 text-purple-600" />
          <span>Weekly Report</span>
        </button>
      </div>
    </div>
  );
};
