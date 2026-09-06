import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, MessageCircle, X, Heart, Smile, Minus } from 'lucide-react';
import confetti from 'canvas-confetti';
import { MoodType } from '../types';
import { fetchEddyReaction } from '../lib/gemini-client';

interface EddyCompanionProps {
  currentMood: MoodType | null;
  level: number;
  streak: number;
  lastCelebrationTrigger?: string | null; // e.g. 'entry_saved' | 'report_generated' | 'level_up'
  onCelebrationHandled?: () => void;
}

export const EddyCompanion: React.FC<EddyCompanionProps> = ({
  currentMood,
  level,
  streak,
  lastCelebrationTrigger,
  onCelebrationHandled,
}) => {
  const [speechBubble, setSpeechBubble] = useState<string | null>(
    "Hi, I'm Eddy! Select your mood and let's capture today's thoughts."
  );
  const [isThinking, setIsThinking] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [pokeCount, setPokeCount] = useState(0);

  // Trigger celebration effects
  useEffect(() => {
    if (!lastCelebrationTrigger) return;

    if (lastCelebrationTrigger === 'entry_saved') {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.85, x: 0.9 },
      });
      setSpeechBubble("Woohoo! +10 XP earned! That entry was meaningful. Proud of you!");
    } else if (lastCelebrationTrigger === 'report_generated') {
      confetti({
        particleCount: 80,
        spread: 80,
        origin: { y: 0.85, x: 0.9 },
      });
      setSpeechBubble("Your Weekly AI Reflection is ready! You've grown so much this week!");
    } else if (lastCelebrationTrigger === 'level_up') {
      confetti({
        particleCount: 100,
        spread: 100,
        origin: { y: 0.8, x: 0.85 },
      });
      setSpeechBubble(`LEVEL UP! You are now Level ${level}! Keep shining!`);
    } else if (lastCelebrationTrigger === 'dig_deeper') {
      setSpeechBubble("Deep thought unlocked! +5 XP! Honest self-discovery is the ultimate power-up.");
    }

    onCelebrationHandled?.();
  }, [lastCelebrationTrigger, level, onCelebrationHandled]);

  // React to mood changes
  useEffect(() => {
    if (!currentMood) return;

    let moodReaction = "Let's put feelings into words.";
    switch (currentMood) {
      case 'Happy':
        moodReaction = "Your happiness is contagious today! Let's cherish what made you smile!";
        break;
      case 'Excited':
        moodReaction = "I can feel your spark! Capture this fire before it flickers!";
        break;
      case 'Grateful':
        moodReaction = "Gratitude makes what we have enough. What a lovely state of mind.";
        break;
      case 'Neutral':
        moodReaction = "A calm, grounded baseline is pure bliss. Ready for reflection.";
        break;
      case 'Tired':
        moodReaction = "You're safe here. Let's do gentle, low-pressure writing. Rest is golden.";
        break;
      case 'Anxious':
        moodReaction = "Inhale slowly with me... 1... 2... 3... Write it out to let it go.";
        break;
      case 'Sad':
        moodReaction = "I'm right beside you. Your feelings are valid and you are not alone.";
        break;
    }
    setSpeechBubble(moodReaction);
  }, [currentMood]);

  // Interactive poke / high five
  const handlePoke = async () => {
    setPokeCount((prev) => prev + 1);
    setIsThinking(true);

    try {
      const reaction = await fetchEddyReaction(
        currentMood || 'Neutral',
        level,
        streak,
        pokeCount % 2 === 0 ? 'poke' : 'high_five'
      );
      setSpeechBubble(reaction.message);
    } catch {
      const fallbacks = [
        "High five! You're showing up for yourself and that is incredible.",
        "Remember: consistency over perfection, every single day!",
        "Did you drink some water today? Eddy cares about your hydration!",
        "Every page you fill adds wisdom to your inner compass.",
      ];
      setSpeechBubble(fallbacks[Math.floor(Math.random() * fallbacks.length)]);
    } finally {
      setIsThinking(false);
    }
  };

  // Color theme for Eddy based on mood
  const getEddyTheme = () => {
    switch (currentMood) {
      case 'Happy':
        return {
          primary: 'from-amber-400 to-yellow-300',
          ring: 'ring-amber-300',
          blush: 'bg-rose-300',
          accessory: '✨',
        };
      case 'Excited':
        return {
          primary: 'from-orange-500 to-amber-400',
          ring: 'ring-orange-300',
          blush: 'bg-rose-400',
          accessory: '⚡',
        };
      case 'Grateful':
        return {
          primary: 'from-rose-400 to-pink-300',
          ring: 'ring-rose-300',
          blush: 'bg-rose-400',
          accessory: '🌸',
        };
      case 'Anxious':
        return {
          primary: 'from-cyan-400 to-teal-300',
          ring: 'ring-cyan-300',
          blush: 'bg-teal-200',
          accessory: '🫧',
        };
      case 'Sad':
        return {
          primary: 'from-indigo-400 to-blue-300',
          ring: 'ring-indigo-300',
          blush: 'bg-indigo-200',
          accessory: '🧣',
        };
      case 'Tired':
        return {
          primary: 'from-purple-400 to-indigo-300',
          ring: 'ring-purple-300',
          blush: 'bg-purple-300',
          accessory: '🌙',
        };
      default:
        return {
          primary: 'from-emerald-400 to-teal-300',
          ring: 'ring-emerald-300',
          blush: 'bg-emerald-200',
          accessory: '🌱',
        };
    }
  };

  const theme = getEddyTheme();

  return (
    <div
      id="eddy-companion-container"
      className="fixed bottom-36 sm:bottom-40 right-4 sm:right-6 z-40 flex flex-col items-end pointer-events-none select-none"
    >
      {/* Speech Bubble */}
      <AnimatePresence>
        {speechBubble && !isMinimized && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            className="pointer-events-auto relative max-w-xs sm:max-w-sm mb-3 bg-white/95 backdrop-blur-md p-3.5 rounded-2xl shadow-xl border border-slate-200 text-slate-800 text-xs sm:text-sm font-medium leading-relaxed"
          >
            <button
              id="close-eddy-speech"
              type="button"
              onClick={() => setSpeechBubble(null)}
              className="absolute top-2 right-2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-100 transition"
              title="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            <div className="flex items-start gap-2 pr-4">
              <span className="text-sm shrink-0 mt-0.5">💬</span>
              <div>
                <span className="font-bold text-slate-900 block text-xs mb-0.5">
                  Eddy <span className="font-normal text-slate-400">· Companion</span>
                </span>
                <p className="text-slate-700">{speechBubble}</p>
              </div>
            </div>

            {/* Speech bubble tail pointer */}
            <div className="absolute -bottom-2 right-8 w-4 h-4 bg-white rotate-45 border-r border-b border-slate-200" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Eddy Character Avatar Container */}
      <div className="pointer-events-auto flex items-center gap-2">
        {isMinimized ? (
          <motion.button
            id="eddy-restore-btn"
            type="button"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsMinimized(false)}
            className="px-3 py-1.5 rounded-full bg-white/95 shadow-md border border-slate-200 text-xs font-bold text-slate-700 flex items-center gap-1.5 hover:bg-slate-50 transition cursor-pointer"
            title="Expand Companion Eddy"
          >
            <span className="text-sm">{theme.accessory}</span>
            <span>Eddy (LV{level})</span>
            <Sparkles className="w-3 h-3 text-amber-500" />
          </motion.button>
        ) : (
          <>
            {/* Quick Poke Action Pill */}
            <motion.button
              id="eddy-poke-btn"
              type="button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.92 }}
              onClick={handlePoke}
              disabled={isThinking}
              className="px-2.5 py-1.5 rounded-full bg-white/90 shadow-md border border-slate-200/80 text-[11px] font-bold text-slate-700 flex items-center gap-1.5 hover:bg-slate-50 transition cursor-pointer"
            >
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>{isThinking ? 'Thinking...' : 'High Five!'}</span>
            </motion.button>

            {/* Minimize toggle */}
            <button
              id="eddy-minimize-btn"
              type="button"
              onClick={() => setIsMinimized(true)}
              className="p-1.5 rounded-full bg-white/90 shadow-md border border-slate-200/80 text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition cursor-pointer"
              title="Minimize Eddy"
            >
              <Minus className="w-3 h-3" />
            </button>

            {/* Animated Eddy Body */}
            <motion.div
              id="eddy-avatar"
              animate={{
                y: [0, -6, 0],
                rotate: [0, 1.5, -1.5, 0],
              }}
              transition={{
                duration: 3.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              whileHover={{ scale: 1.1, rotate: [0, -5, 5, 0] }}
              whileTap={{ scale: 0.95 }}
              onClick={handlePoke}
              className={`relative w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-gradient-to-br ${theme.primary} p-1 shadow-xl ring-4 ring-white cursor-pointer flex items-center justify-center`}
            >
              {/* Accessory badge */}
              <div className="absolute -top-1 -right-1 text-sm bg-white rounded-full p-0.5 shadow-sm">
                {theme.accessory}
              </div>

              {/* Eddy Face */}
              <div className="w-[39px] h-full rounded-full bg-white/30 backdrop-blur-xs flex flex-col items-center justify-center relative overflow-hidden">
                {/* Cute Ears / Horns */}
                <div className="absolute top-1 left-2 w-2.5 h-3.5 bg-white/60 rounded-full rotate-[-20deg]" />
                <div className="absolute top-1 right-2 w-2.5 h-3.5 bg-white/60 rounded-full rotate-[20deg]" />

                {/* Eyes */}
                <div className="flex items-center justify-center gap-3.5 mt-1 z-10">
                  {/* Left Eye */}
                  <motion.div
                    className="w-2.5 h-3 bg-slate-900 rounded-full relative flex items-center justify-center"
                    animate={{
                      scaleY: [1, 1, 0.1, 1],
                    }}
                    transition={{
                      duration: 4,
                      repeat: Infinity,
                      repeatDelay: 2,
                    }}
                  >
                    <div className="w-1 h-1 bg-white rounded-full absolute top-0.5 left-0.5" />
                  </motion.div>

                  {/* Right Eye */}
                  <motion.div
                    className="w-2.5 h-3 bg-slate-900 rounded-full relative flex items-center justify-center"
                    animate={{
                      scaleY: [1, 1, 0.1, 1],
                    }}
                    transition={{
                      duration: 4,
                      repeat: Infinity,
                      repeatDelay: 2,
                    }}
                  >
                    <div className="w-1 h-1 bg-white rounded-full absolute top-0.5 left-0.5" />
                  </motion.div>
                </div>

                {/* Blushing Cheeks */}
                <div className="flex items-center justify-between w-9 mt-0.5 z-0">
                  <div className={`w-2 h-1 rounded-full ${theme.blush}`} />
                  <div className={`w-2 h-1 rounded-full ${theme.blush}`} />
                </div>

                {/* Smile Mouth */}
                <div className="w-3.5 h-2 border-b-2 border-slate-900 rounded-b-full mt-[-2px] z-10" />
              </div>

              {/* Level Badge Pip */}
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.2 bg-slate-900 text-amber-300 text-[9px] font-black rounded-full shadow-xs">
                LV{level}
              </div>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
};
