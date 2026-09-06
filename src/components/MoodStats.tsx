import React from 'react';
import { motion } from 'motion/react';
import { BarChart2, Heart, PieChart, Sparkles } from 'lucide-react';
import { JournalInteraction, MoodType } from '../types';
import { MOODS } from './MoodSelector';

interface MoodStatsProps {
  entries: JournalInteraction[];
}

export const MoodStats: React.FC<MoodStatsProps> = ({ entries }) => {
  const totalEntries = entries.length;

  // Calculate mood counts
  const moodCounts: Record<MoodType, number> = {
    Happy: 0,
    Sad: 0,
    Anxious: 0,
    Grateful: 0,
    Neutral: 0,
    Excited: 0,
    Tired: 0,
  };

  entries.forEach((e) => {
    if (e.mood && moodCounts[e.mood] !== undefined) {
      moodCounts[e.mood] += 1;
    }
  });

  // Determine dominant mood
  let dominantMood: MoodType | null = null;
  let maxCount = 0;
  (Object.keys(moodCounts) as MoodType[]).forEach((m) => {
    if (moodCounts[m] > maxCount) {
      maxCount = moodCounts[m];
      dominantMood = m;
    }
  });

  const dominantMeta = MOODS.find((m) => m.type === dominantMood);

  return (
    <div
      id="mood-stats-card"
      className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-pink-100 text-pink-700 flex items-center justify-center">
            <Heart className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-slate-800">
              Emotional Spectrum
            </h4>
            <span className="text-[11px] text-slate-500">
              {totalEntries} total entries analyzed
            </span>
          </div>
        </div>

        {dominantMood && maxCount > 0 && dominantMeta && (
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-800 border border-slate-200 flex items-center gap-1.5">
            <span>{dominantMeta.emoji}</span>
            <span>Dominant: {dominantMood}</span>
          </span>
        )}
      </div>

      {totalEntries === 0 ? (
        <div className="py-4 text-center text-xs text-slate-400 italic">
          Log your first journal entry above to reveal your mood distribution!
        </div>
      ) : (
        <div className="space-y-2.5">
          {MOODS.map((m) => {
            const count = moodCounts[m.type] || 0;
            const percentage = totalEntries > 0 ? Math.round((count / totalEntries) * 100) : 0;

            return (
              <div key={m.type} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                    <span className="text-sm">{m.emoji}</span>
                    <span>{m.label}</span>
                  </span>
                  <span className="text-slate-500 font-medium">
                    {count} {count === 1 ? 'entry' : 'entries'} ({percentage}%)
                  </span>
                </div>

                {/* Progress track */}
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${
                      m.type === 'Happy'
                        ? 'bg-amber-400'
                        : m.type === 'Excited'
                        ? 'bg-orange-500'
                        : m.type === 'Grateful'
                        ? 'bg-rose-400'
                        : m.type === 'Neutral'
                        ? 'bg-emerald-500'
                        : m.type === 'Tired'
                        ? 'bg-purple-400'
                        : m.type === 'Anxious'
                        ? 'bg-cyan-500'
                        : 'bg-indigo-400'
                    }`}
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
