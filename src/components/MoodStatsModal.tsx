import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Heart, Sparkles, TrendingUp } from 'lucide-react';
import { JournalInteraction } from '../types';
import { MoodStats } from './MoodStats';

interface MoodStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: JournalInteraction[];
}

export const MoodStatsModal: React.FC<MoodStatsModalProps> = ({
  isOpen,
  onClose,
  entries,
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-xl rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-pink-50 via-purple-50 to-indigo-50">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-pink-100 text-pink-600 flex items-center justify-center shadow-2xs">
                <Heart className="w-5 h-5 fill-pink-500 text-pink-500" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Mood & Emotional Spectrum
                </h3>
                <p className="text-xs text-slate-500">
                  Visual breakdown of your emotional check-ins across reflections
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-white/80 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto">
            <MoodStats entries={entries} />
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
