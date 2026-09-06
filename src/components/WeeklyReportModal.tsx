import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import {
  FileText,
  Sparkles,
  Calendar,
  X,
  RefreshCw,
  Award,
  ChevronRight,
  TrendingUp,
  Flame,
  CheckCircle2,
} from 'lucide-react';
import { JournalInteraction, WeeklyReport } from '../types';
import { fetchWeeklyReport } from '../lib/gemini-client';
import { saveWeeklyReport } from '../lib/firestore-utils';

interface WeeklyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  entries: JournalInteraction[];
  pastReports: WeeklyReport[];
  streak: number;
  onReportCreated: (report: WeeklyReport) => void;
}

export const WeeklyReportModal: React.FC<WeeklyReportModalProps> = ({
  isOpen,
  onClose,
  userId,
  userName,
  entries,
  pastReports,
  streak,
  onReportCreated,
}) => {
  const [selectedReport, setSelectedReport] = useState<WeeklyReport | null>(
    pastReports[0] || null
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (entries.length === 0) {
      setError('Please write at least one journal entry first before generating a weekly reflection.');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const formattedEntries = entries.slice(0, 10).map((e) => ({
        date: new Date(e.createdAt).toLocaleDateString(undefined, {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        }),
        mood: e.mood || 'Reflective',
        title: e.title || 'Entry',
        snippet: e.messages.map((m) => m.content).join('\n'),
      }));

      const res = await fetchWeeklyReport(formattedEntries, streak, userName);

      const newReport: WeeklyReport = {
        id: `report-${Date.now()}`,
        userId,
        title: `Weekly Reflection: ${new Date().toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })}`,
        reportContent: res.report,
        entryCount: entries.length,
        streakAtTime: streak,
        modelUsed: res.modelUsed,
        createdAt: new Date().toISOString(),
      };

      await saveWeeklyReport(userId, newReport);
      setSelectedReport(newReport);
      onReportCreated(newReport);
    } catch (err: any) {
      setError(err?.message || 'Failed to craft weekly narrative report.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div
      id="weekly-report-modal-backdrop"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-purple-700 via-indigo-700 to-blue-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-black tracking-tight">
                  Weekly AI Reflection Report
                </h3>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-400 text-slate-950">
                  +20 XP
                </span>
              </div>
              <p className="text-xs text-purple-100">
                A narrative psychological synthesis of your emotional journey and weekly breakthroughs.
              </p>
            </div>
          </div>

          <button
            id="close-weekly-modal-btn"
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white p-2 rounded-full hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body (Split Layout: Past Reports List + Main Report Viewer) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Left Column: Generator CTA & Past Archive */}
          <div className="md:col-span-4 space-y-4">
            {/* Generate Action Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-800">
                  AI Synthesizer
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  {entries.length} entries available
                </span>
              </div>
              <p className="text-xs text-slate-600">
                Gemini uncovers underlying patterns across your entries and crafts an uplifting story of your week.
              </p>
              <button
                id="generate-weekly-btn"
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating || entries.length === 0}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Analyzing Week...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>Generate Weekly Report</span>
                  </>
                )}
              </button>
            </div>

            {/* Past Reports List */}
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block px-1">
                Saved Reports ({pastReports.length})
              </span>
              {pastReports.length === 0 ? (
                <p className="text-xs text-slate-400 italic px-1">
                  No weekly reports generated yet. Click above to generate your first!
                </p>
              ) : (
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {pastReports.map((r) => {
                    const isSelected = selectedReport?.id === r.id;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setSelectedReport(r)}
                        className={`w-full text-left p-2.5 rounded-xl border text-xs transition flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? 'bg-purple-100 border-purple-300 text-purple-950 font-bold'
                            : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        <div className="truncate pr-2">
                          <p className="truncate font-semibold">{r.title}</p>
                          <span className="text-[10px] text-slate-400 block">
                            {new Date(r.createdAt).toLocaleDateString()} · {r.entryCount} entries
                          </span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-60" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Active Report Display */}
          <div className="md:col-span-8 flex flex-col">
            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                {error}
              </div>
            )}

            {selectedReport ? (
              <div className="p-5 sm:p-6 rounded-2xl bg-slate-50/70 border border-slate-200/90 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div>
                    <h4 className="text-base sm:text-lg font-black text-slate-900">
                      {selectedReport.title}
                    </h4>
                    <span className="text-xs text-slate-500">
                      Generated {new Date(selectedReport.createdAt).toLocaleDateString()} · Powered by Gemini
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-orange-600 px-2 py-1 bg-orange-100 rounded-lg">
                      <Flame className="w-3.5 h-3.5 fill-orange-500" />
                      {selectedReport.streakAtTime}d streak
                    </span>
                  </div>
                </div>

                {/* Markdown content formatted cleanly */}
                <div className="prose prose-sm max-w-none text-slate-700 leading-relaxed space-y-3 font-normal">
                  <Markdown>{selectedReport.reportContent}</Markdown>
                </div>
              </div>
            ) : (
              <div className="h-full min-h-[260px] flex flex-col items-center justify-center text-center p-8 rounded-2xl border-2 border-dashed border-slate-200">
                <FileText className="w-12 h-12 text-slate-300 mb-3" />
                <h4 className="text-sm font-bold text-slate-700">No report selected</h4>
                <p className="text-xs text-slate-500 max-w-sm mt-1">
                  Generate a new weekly reflection using the button on the left to review your narrative story.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Weekly reports are saved to your private encrypted profile
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
};
