import React from 'react';
import { MoodType, MoodMeta } from '../types';
import { motion } from 'motion/react';
import { Check } from 'lucide-react';

export const MOODS: MoodMeta[] = [
  {
    type: 'Happy',
    emoji: '☀️',
    label: 'Happy',
    color: 'text-amber-500',
    bgLight: 'bg-amber-50 hover:bg-amber-100/80 border-amber-200 data-[selected=true]:bg-amber-100 data-[selected=true]:border-amber-400',
    borderColor: 'border-amber-400',
    description: 'Radiant, joyful, energized',
  },
  {
    type: 'Excited',
    emoji: '⚡',
    label: 'Excited',
    color: 'text-orange-500',
    bgLight: 'bg-orange-50 hover:bg-orange-100/80 border-orange-200 data-[selected=true]:bg-orange-100 data-[selected=true]:border-orange-400',
    borderColor: 'border-orange-400',
    description: 'Fired up, inspired, thrilled',
  },
  {
    type: 'Grateful',
    emoji: '🌸',
    label: 'Grateful',
    color: 'text-rose-500',
    bgLight: 'bg-rose-50 hover:bg-rose-100/80 border-rose-200 data-[selected=true]:bg-rose-100 data-[selected=true]:border-rose-400',
    borderColor: 'border-rose-400',
    description: 'Thankful, peaceful, loving',
  },
  {
    type: 'Neutral',
    emoji: '🍃',
    label: 'Neutral',
    color: 'text-emerald-600',
    bgLight: 'bg-emerald-50 hover:bg-emerald-100/80 border-emerald-200 data-[selected=true]:bg-emerald-100 data-[selected=true]:border-emerald-400',
    borderColor: 'border-emerald-400',
    description: 'Balanced, observant, steady',
  },
  {
    type: 'Tired',
    emoji: '🌙',
    label: 'Tired',
    color: 'text-purple-500',
    bgLight: 'bg-purple-50 hover:bg-purple-100/80 border-purple-200 data-[selected=true]:bg-purple-100 data-[selected=true]:border-purple-400',
    borderColor: 'border-purple-400',
    description: 'Low energy, winding down, soft',
  },
  {
    type: 'Anxious',
    emoji: '🌪️',
    label: 'Anxious',
    color: 'text-cyan-600',
    bgLight: 'bg-cyan-50 hover:bg-cyan-100/80 border-cyan-200 data-[selected=true]:bg-cyan-100 data-[selected=true]:border-cyan-400',
    borderColor: 'border-cyan-400',
    description: 'Restless, seeking calm grounding',
  },
  {
    type: 'Sad',
    emoji: '🌧️',
    label: 'Sad',
    color: 'text-indigo-500',
    bgLight: 'bg-indigo-50 hover:bg-indigo-100/80 border-indigo-200 data-[selected=true]:bg-indigo-100 data-[selected=true]:border-indigo-400',
    borderColor: 'border-indigo-400',
    description: 'Tender, healing, reflective',
  },
];

interface MoodSelectorProps {
  selectedMood: MoodType | null;
  onSelectMood: (mood: MoodType) => void;
  requiredNotice?: boolean;
}

export const MoodSelector: React.FC<MoodSelectorProps> = ({
  selectedMood,
  onSelectMood,
  requiredNotice = false,
}) => {
  return (
    <div id="mood-selector-container" className="w-full">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Step 1: Check In Your Mood
          </span>
          {requiredNotice && !selectedMood && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 animate-pulse">
              Required to write
            </span>
          )}
        </div>
        {selectedMood && (
          <span className="text-xs font-medium text-slate-500">
            Selected: <strong className="text-slate-800">{selectedMood}</strong>
          </span>
        )}
      </div>

      {/* Mood Buttons Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
        {MOODS.map((m) => {
          const isSelected = selectedMood === m.type;

          return (
            <motion.button
              key={m.type}
              id={`mood-btn-${m.type.toLowerCase()}`}
              type="button"
              data-selected={isSelected}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onSelectMood(m.type)}
              className={`relative flex flex-col items-center justify-center p-2.5 rounded-2xl border transition-all shadow-xs cursor-pointer ${m.bgLight} ${
                isSelected
                  ? `ring-2 ring-offset-1 ring-slate-400 ${m.borderColor} shadow-md`
                  : 'border-slate-200/80'
              }`}
            >
              {isSelected && (
                <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-slate-900 text-white flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
              )}

              <motion.span
                className="text-2xl mb-1 select-none"
                animate={
                  isSelected
                    ? {
                        y: [0, -4, 0],
                        scale: [1, 1.15, 1],
                        rotate: m.type === 'Excited' ? [0, 8, -8, 0] : [0, 0, 0],
                      }
                    : {}
                }
                transition={{ duration: 0.6, repeat: isSelected ? Infinity : 0, repeatDelay: 2 }}
              >
                {m.emoji}
              </motion.span>

              <span className={`text-xs font-bold leading-tight ${isSelected ? 'text-slate-900' : 'text-slate-600'}`}>
                {m.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};
