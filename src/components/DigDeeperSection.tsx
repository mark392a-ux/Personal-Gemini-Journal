import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, HelpCircle, Send, CheckCircle2, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { DigDeeperQA } from '../types';
import { fetchDigDeeperQuestions } from '../lib/gemini-client';

interface DigDeeperSectionProps {
  entryContent: string;
  entryTitle: string;
  mood: string;
  existingQuestions?: DigDeeperQA[];
  onSaveQuestions: (updatedQuestions: DigDeeperQA[]) => Promise<void>;
  onEarnXp?: () => void;
}

export const DigDeeperSection: React.FC<DigDeeperSectionProps> = ({
  entryContent,
  entryTitle,
  mood,
  existingQuestions = [],
  onSaveQuestions,
  onEarnXp,
}) => {
  const [questions, setQuestions] = useState<DigDeeperQA[]>(existingQuestions);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(existingQuestions.length > 0);
  const [activeAnswers, setActiveAnswers] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialize active answers from existing questions
  React.useEffect(() => {
    if (existingQuestions.length > 0) {
      const answersMap: Record<string, string> = {};
      existingQuestions.forEach((q) => {
        if (q.answer) answersMap[q.id] = q.answer;
      });
      setActiveAnswers(answersMap);
      setQuestions(existingQuestions);
      setIsOpen(true);
    }
  }, [existingQuestions]);

  const handleGenerateQuestions = async () => {
    if (!entryContent || entryContent.trim().length < 10) {
      setError('Write a bit more in your journal first so Gemini has context to formulate deep questions.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetchDigDeeperQuestions(entryContent, mood, entryTitle);
      const formattedQuestions: DigDeeperQA[] = res.questions.map((q, idx) => ({
        id: `q-${Date.now()}-${idx}`,
        question: q,
      }));

      setQuestions(formattedQuestions);
      setIsOpen(true);
      await onSaveQuestions(formattedQuestions);
    } catch (err: any) {
      setError(err?.message || 'Could not formulate questions right now.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAnswer = async (questionId: string) => {
    const text = activeAnswers[questionId]?.trim();
    if (!text) return;

    setSavingId(questionId);

    const updated = questions.map((q) => {
      if (q.id === questionId) {
        return {
          ...q,
          answer: text,
          answeredAt: new Date().toISOString(),
        };
      }
      return q;
    });

    setQuestions(updated);

    try {
      await onSaveQuestions(updated);
      onEarnXp?.();
    } catch (err: any) {
      setError('Could not save answer: ' + err.message);
    } finally {
      setSavingId(null);
    }
  };

  const answeredCount = questions.filter((q) => Boolean(q.answer)).length;

  return (
    <div id="dig-deeper-wrapper" className="mt-6">
      {/* If no questions generated yet, show the glowing "Dig Deeper" button */}
      {questions.length === 0 ? (
        <div className="flex flex-col sm:flex-row items-center justify-between p-4.5 rounded-2xl bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-pink-500/10 border border-purple-200/80 shadow-xs gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-purple-600 animate-pulse" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-800">
                Ready to go beyond the surface?
              </h4>
              <p className="text-xs text-slate-500">
                Gemini asks 2–3 personalized, probing questions to reveal hidden breakthroughs (+5 XP per answer).
              </p>
            </div>
          </div>

          <motion.button
            id="dig-deeper-btn"
            type="button"
            whileHover={{ scale: 1.04, boxShadow: '0 0 20px rgba(168, 85, 247, 0.4)' }}
            whileTap={{ scale: 0.96 }}
            onClick={handleGenerateQuestions}
            disabled={isLoading}
            className="shrink-0 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs sm:text-sm font-bold shadow-md flex items-center gap-2 cursor-pointer transition disabled:opacity-70"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Illuminating Questions...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-purple-200" />
                <span>Dig Deeper ✨</span>
              </>
            )}
          </motion.button>
        </div>
      ) : (
        <div className="rounded-2xl border border-purple-200/80 bg-purple-50/40 p-4.5 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-purple-100 text-purple-700">
                <HelpCircle className="w-4 h-4" />
              </span>
              <h4 className="text-sm font-bold text-slate-800">
                Deep Reflections ({answeredCount}/{questions.length} answered)
              </h4>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="text-xs font-semibold text-purple-700 hover:text-purple-900 flex items-center gap-1 p-1"
              >
                {isOpen ? (
                  <>
                    <span>Hide</span> <ChevronUp className="w-3.5 h-3.5" />
                  </>
                ) : (
                  <>
                    <span>Show</span> <ChevronDown className="w-3.5 h-3.5" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleGenerateQuestions}
                disabled={isLoading}
                className="text-xs font-medium text-slate-500 hover:text-slate-800 p-1 cursor-pointer"
                title="Regenerate deep questions"
              >
                Regenerate
              </button>
            </div>
          </div>

          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3.5 pt-1"
              >
                {questions.map((q, idx) => {
                  const isAnswered = Boolean(q.answer);
                  const isCurrentlySaving = savingId === q.id;

                  return (
                    <div
                      key={q.id}
                      className="p-3.5 rounded-xl bg-white border border-purple-100/90 shadow-xs space-y-2.5"
                    >
                      <div className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <p className="text-xs sm:text-sm font-semibold text-slate-800 leading-snug">
                          {q.question}
                        </p>
                      </div>

                      {/* Answer Input or Display */}
                      <div className="pl-7 space-y-2">
                        <textarea
                          id={`dig-answer-input-${idx}`}
                          rows={2}
                          placeholder="Your honest reflection here..."
                          value={activeAnswers[q.id] || ''}
                          onChange={(e) =>
                            setActiveAnswers({ ...activeAnswers, [q.id]: e.target.value })
                          }
                          className="w-full text-xs sm:text-sm p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent bg-slate-50/50 resize-y"
                        />

                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-purple-600 font-medium">
                            {isAnswered ? (
                              <span className="inline-flex items-center gap-1 text-emerald-600">
                                <CheckCircle2 className="w-3 h-3" /> Saved (+5 XP earned)
                              </span>
                            ) : (
                              'Earn +5 XP upon answering'
                            )}
                          </span>

                          <button
                            id={`save-dig-btn-${idx}`}
                            type="button"
                            onClick={() => handleSaveAnswer(q.id)}
                            disabled={isCurrentlySaving || !activeAnswers[q.id]?.trim()}
                            className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                          >
                            {isCurrentlySaving ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Send className="w-3 h-3" />
                            )}
                            <span>{isAnswered ? 'Update Answer' : 'Save Answer'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {error && (
        <p className="mt-2 text-xs text-rose-600 font-medium">{error}</p>
      )}
    </div>
  );
};
