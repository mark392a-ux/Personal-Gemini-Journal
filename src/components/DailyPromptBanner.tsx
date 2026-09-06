import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, RefreshCw, PenTool, Lightbulb, Compass, ArrowRight } from 'lucide-react';
import { MoodType } from '../types';
import { fetchDailyPrompt, DailyPromptResponse } from '../lib/gemini-client';

interface DailyPromptBannerProps {
  currentMood: MoodType | null;
  recentSnippets?: string[];
  onUsePrompt: (promptText: string, category: string) => void;
}

export const DailyPromptBanner: React.FC<DailyPromptBannerProps> = ({
  currentMood,
  recentSnippets,
  onUsePrompt,
}) => {
  const [promptData, setPromptData] = useState<DailyPromptResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGetPrompt = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchDailyPrompt(currentMood || undefined, recentSnippets);
      setPromptData(data);
    } catch (err: any) {
      setError(err?.message || 'Could not fetch a prompt right now.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      id="daily-prompt-card"
      className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-rose-500/10 border border-slate-200/90 p-5 sm:p-6 shadow-sm"
    >
      {/* Background ambient accents */}
      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-40 h-40 bg-amber-300/20 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 -mb-8 w-40 h-40 bg-purple-300/20 rounded-full blur-2xl pointer-events-none" />

      {!promptData ? (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold tracking-wide uppercase">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              Daily AI Quest
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-800 tracking-tight">
              Feeling stuck or looking for inspiration?
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 max-w-xl">
              Gemini crafts a thoughtful, personalized writing prompt attuned to your{' '}
              <span className="font-semibold text-slate-800">{currentMood || 'current'}</span> mood and journey.
            </p>
          </div>

          <motion.button
            id="get-daily-prompt-btn"
            type="button"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleGetPrompt}
            disabled={isLoading}
            className="shrink-0 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-sm shadow-md flex items-center gap-2 transition cursor-pointer disabled:opacity-70"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Crafting Prompt...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Get Today’s Prompt</span>
              </>
            )}
          </motion.button>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 text-xs font-bold">
                  <Compass className="w-3 h-3 text-purple-600" />
                  {promptData.category}
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  Tailored for mood: <strong>{currentMood || 'Neutral'}</strong>
                </span>
              </div>

              <button
                id="regenerate-prompt-btn"
                type="button"
                onClick={handleGetPrompt}
                disabled={isLoading}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-white/80 transition cursor-pointer disabled:opacity-50"
                title="Regenerate another prompt"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Regenerate</span>
              </button>
            </div>

            {/* Prompt Text */}
            <blockquote className="text-base sm:text-lg font-semibold text-slate-800 leading-snug border-l-3 border-amber-400 pl-3.5">
              "{promptData.prompt}"
            </blockquote>

            {/* Inspiration Tip */}
            {promptData.inspirationTip && (
              <p className="text-xs text-slate-600 flex items-center gap-1.5 bg-white/70 backdrop-blur-xs p-2 rounded-xl border border-slate-200/60">
                <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>
                  <strong>Tip:</strong> {promptData.inspirationTip}
                </span>
              </p>
            )}

            {/* Action Bar */}
            <div className="flex items-center justify-end pt-1">
              <motion.button
                id="use-prompt-btn"
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onUsePrompt(promptData.prompt, promptData.category)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs sm:text-sm font-bold flex items-center gap-2 shadow-sm transition cursor-pointer"
              >
                <PenTool className="w-3.5 h-3.5 text-amber-400" />
                <span>Write With This Prompt</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </motion.button>
            </div>
          </motion.div>
        </AnimatePresence>
      )}

      {error && (
        <p className="mt-2 text-xs text-rose-600 font-medium">{error}</p>
      )}
    </div>
  );
};
