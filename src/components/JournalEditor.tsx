import React, { useState, useEffect, useRef } from 'react';
import Markdown from 'react-markdown';
import {
  ChatMessage,
  JournalInteraction,
  ReflectionMode,
  MoodType,
  DigDeeperQA,
} from '../types';
import {
  sendReflectionPrompt,
  generateEntrySummary,
} from '../lib/gemini-client';
import {
  Sparkles,
  Send,
  Save,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  FileText,
  Lightbulb,
  Compass,
  Check,
  Clock,
  User,
  Cpu,
} from 'lucide-react';
import { MoodSelector, MOODS } from './MoodSelector';
import { DailyPromptBanner } from './DailyPromptBanner';
import { DigDeeperSection } from './DigDeeperSection';

interface JournalEditorProps {
  userId: string;
  entry: JournalInteraction;
  onSaveEntry: (updatedEntry: JournalInteraction, extra?: { isFirstCompletion?: boolean }) => Promise<void>;
  isSaving: boolean;
  saveError: string | null;
  onClearSaveError: () => void;
  onEarnXp?: (action: 'entry' | 'dig_deeper' | 'report') => void;
  currentMood: MoodType | null;
  onSelectMood: (mood: MoodType) => void;
  recentSnippets?: string[];
}

export const JournalEditor: React.FC<JournalEditorProps> = ({
  userId,
  entry,
  onSaveEntry,
  isSaving,
  saveError,
  onClearSaveError,
  onEarnXp,
  currentMood,
  onSelectMood,
  recentSnippets = [],
}) => {
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [activeMode, setActiveMode] = useState<ReflectionMode>(entry.category || 'reflection');
  const [title, setTitle] = useState(entry.title || 'Untitled Reflection');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [moodRequiredError, setMoodRequiredError] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync state when active entry prop changes
  useEffect(() => {
    setTitle(entry.title || 'Untitled Reflection');
    setActiveMode(entry.category || 'reflection');
    setHasUnsavedChanges(false);
    setLocalError(null);
    if (entry.mood && !currentMood) {
      onSelectMood(entry.mood);
    }
  }, [entry.id]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entry.messages, isGenerating]);

  // Auto-resize textarea
  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCurrentPrompt(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  // Handle submitting a prompt to Gemini and persisting to Firestore
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = currentPrompt.trim();
    if (!trimmed || isGenerating) return;

    // Mood is REQUIRED before writing
    const effectiveMood = currentMood || entry.mood;
    if (!effectiveMood) {
      setMoodRequiredError(true);
      setLocalError('Please select your current mood in Step 1 before saving your reflection.');
      return;
    }

    setMoodRequiredError(false);
    setLocalError(null);
    onClearSaveError();

    const isFirstMsg = entry.messages.length === 0;

    const userMessageId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newUserMessage: ChatMessage = {
      id: userMessageId,
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...entry.messages, newUserMessage];

    const effectiveTitle =
      entry.title === 'Untitled Reflection' || !entry.title
        ? trimmed.slice(0, 38) + (trimmed.length > 38 ? '...' : '')
        : title;

    setTitle(effectiveTitle);

    const pendingEntry: JournalInteraction = {
      ...entry,
      title: effectiveTitle,
      category: activeMode,
      mood: effectiveMood,
      messages: updatedMessages,
      updatedAt: new Date().toISOString(),
    };

    setIsGenerating(true);

    try {
      // 1. Call Gemini via resilient server-side proxy
      const geminiResult = await sendReflectionPrompt(
        trimmed,
        entry.messages,
        activeMode
      );

      const modelMessageId = `msg-${Date.now() + 1}-${Math.random().toString(36).substring(2, 7)}`;
      const newModelMessage: ChatMessage = {
        id: modelMessageId,
        role: 'model',
        content: geminiResult.reply,
        timestamp: geminiResult.timestamp || new Date().toISOString(),
        modelUsed: geminiResult.modelUsed,
      };

      const finalMessages = [...updatedMessages, newModelMessage];

      const finalizedEntry: JournalInteraction = {
        ...pendingEntry,
        messages: finalMessages,
        updatedAt: new Date().toISOString(),
      };

      // 2. Persist to Firestore
      await onSaveEntry(finalizedEntry, { isFirstCompletion: isFirstMsg });

      // 3. Award XP for writing an entry (+10 XP)
      if (isFirstMsg) {
        onEarnXp?.('entry');
      }

      // Only clear user input on settled confirmation
      setCurrentPrompt('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      setHasUnsavedChanges(false);
    } catch (err: any) {
      console.error('[Error submitting reflection]:', err);
      setLocalError(
        err?.message || 'Failed to complete reflection or persist to Firestore. Your input is preserved.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  // Generate an AI Summary for the entire session
  const handleSummarizeSession = async () => {
    if (entry.messages.length === 0 || isSummarizing) return;

    setIsSummarizing(true);
    setLocalError(null);

    const fullTranscript = entry.messages
      .map((m) => `${m.role === 'user' ? 'User Reflection' : 'Gemini Feedback'}:\n${m.content}`)
      .join('\n\n');

    try {
      const summaryResult = await generateEntrySummary(fullTranscript, title);
      const updatedEntry: JournalInteraction = {
        ...entry,
        summary: summaryResult.summary,
        updatedAt: new Date().toISOString(),
      };

      await onSaveEntry(updatedEntry);
      setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      setHasUnsavedChanges(false);
    } catch (err: any) {
      console.error('[Error generating summary]:', err);
      setLocalError(err?.message || 'Failed to generate session summary.');
    } finally {
      setIsSummarizing(false);
    }
  };

  // Manual save of metadata changes (like title or category)
  const handleManualSave = async () => {
    const effectiveMood = currentMood || entry.mood || 'Neutral';
    const updatedEntry: JournalInteraction = {
      ...entry,
      title: title.trim() || 'Untitled Reflection',
      category: activeMode,
      mood: effectiveMood,
      updatedAt: new Date().toISOString(),
    };

    try {
      await onSaveEntry(updatedEntry);
      setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      setHasUnsavedChanges(false);
    } catch (err: any) {
      setLocalError(err?.message || 'Failed to save updates to Firestore.');
    }
  };

  // Handle saving Dig Deeper questions
  const handleSaveDigDeeper = async (questions: DigDeeperQA[]) => {
    const updatedEntry: JournalInteraction = {
      ...entry,
      digDeeperQuestions: questions,
      updatedAt: new Date().toISOString(),
    };
    await onSaveEntry(updatedEntry);
    setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  };

  // Handle accepting a daily prompt
  const handleUsePrompt = (promptText: string, category: string) => {
    setCurrentPrompt(promptText);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const currentMoodMeta = MOODS.find((m) => m.type === (currentMood || entry.mood));

  return (
    <div className="flex-1 flex flex-col h-full bg-white overflow-hidden">
      {/* Top Header Bar */}
      <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-3 sm:px-6 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Title Editor & Mood Badge */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {currentMoodMeta && (
                <span className="text-xl shrink-0" title={`Mood: ${currentMoodMeta.label}`}>
                  {currentMoodMeta.emoji}
                </span>
              )}
              {isEditingTitle ? (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    id="entry-title-input"
                    type="text"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      setHasUnsavedChanges(true);
                    }}
                    onBlur={() => {
                      setIsEditingTitle(false);
                      handleManualSave();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        setIsEditingTitle(false);
                        handleManualSave();
                      }
                    }}
                    autoFocus
                    className="w-full text-base sm:text-lg font-bold text-slate-900 border-b border-slate-400 bg-transparent px-1 py-0.5 focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingTitle(false);
                      handleManualSave();
                    }}
                    className="rounded p-1 text-slate-500 hover:text-slate-800"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div
                  className="flex items-center gap-2 group cursor-pointer"
                  onClick={() => setIsEditingTitle(true)}
                >
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 truncate">
                    {title || 'Untitled Reflection'}
                  </h2>
                  <span className="opacity-0 group-hover:opacity-100 text-[11px] text-slate-400 border border-slate-200 px-1.5 py-0.5 rounded">
                    Edit
                  </span>
                </div>
              )}
            </div>

            <p className="text-[11px] text-slate-500 mt-0.5">
              Created {new Date(entry.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
              {lastSavedTime && ` • Synced to Cloud at ${lastSavedTime}`}
            </p>
          </div>

          {/* Actions & Status */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Summarize button */}
            <button
              id="summarize-entry-btn"
              type="button"
              disabled={entry.messages.length === 0 || isSummarizing}
              onClick={handleSummarizeSession}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors cursor-pointer shadow-2xs"
              title="Generate AI executive synthesis of this reflection"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span>{isSummarizing ? 'Summarizing...' : 'Summarize'}</span>
            </button>

            {/* Manual Save Button */}
            <button
              id="save-firestore-btn"
              type="button"
              disabled={isSaving}
              onClick={handleManualSave}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors cursor-pointer shadow-2xs"
            >
              {isSaving ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-slate-600" />
              ) : hasUnsavedChanges ? (
                <Save className="h-3.5 w-3.5 text-blue-600" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              )}
              <span>{isSaving ? 'Saving...' : hasUnsavedChanges ? 'Save Changes' : 'Saved'}</span>
            </button>
          </div>
        </div>

        {/* Reflection Mode Switcher */}
        <div className="mt-3 flex items-center gap-2 pt-2 border-t border-slate-200/80">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Mode:
          </span>
          <div className="flex items-center gap-1">
            <button
              id="mode-reflection-btn"
              type="button"
              onClick={() => {
                setActiveMode('reflection');
                setHasUnsavedChanges(true);
              }}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                activeMode === 'reflection'
                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Compass className="h-3.5 w-3.5" />
              <span>Deep Reflection</span>
            </button>

            <button
              id="mode-brainstorm-btn"
              type="button"
              onClick={() => {
                setActiveMode('brainstorm');
                setHasUnsavedChanges(true);
              }}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                activeMode === 'brainstorm'
                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Lightbulb className="h-3.5 w-3.5" />
              <span>Creative Brainstorm</span>
            </button>

            <button
              id="mode-summary-btn"
              type="button"
              onClick={() => {
                setActiveMode('summary');
                setHasUnsavedChanges(true);
              }}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                activeMode === 'summary'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Synthesis</span>
            </button>
          </div>
        </div>
      </div>

      {/* Error Banners */}
      {(localError || saveError) && (
        <div className="bg-rose-50 border-b border-rose-200 px-4 py-2.5 flex items-center justify-between text-xs text-rose-800">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{localError || saveError}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setLocalError(null);
              onClearSaveError();
            }}
            className="text-rose-600 hover:text-rose-900 font-bold ml-2 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Conversation & Journal Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {/* Step 1: Mood Tracker Header (Mandatory check-in) */}
        <div className="p-4 rounded-3xl bg-slate-50 border border-slate-200/90 shadow-2xs">
          <MoodSelector
            selectedMood={currentMood || entry.mood || null}
            onSelectMood={(m) => {
              onSelectMood(m);
              setMoodRequiredError(false);
              setLocalError(null);
              handleManualSave();
            }}
            requiredNotice={moodRequiredError}
          />
        </div>

        {/* Step 2: Daily AI Prompt Generator Banner */}
        <DailyPromptBanner
          currentMood={currentMood || entry.mood || null}
          recentSnippets={recentSnippets}
          onUsePrompt={handleUsePrompt}
        />

        {/* Empty state when no reflections written yet */}
        {entry.messages.length === 0 && (
          <div className="text-center py-8 px-4 max-w-md mx-auto space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">
              Ready for your daily reflection?
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Check in your mood above, pick a Daily AI Prompt, or start typing below. Completing your first entry earns <strong>+10 XP</strong> and keeps your flame streak alive!
            </p>
          </div>
        )}

        {/* Summary Card if generated */}
        {entry.summary && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 sm:p-5 shadow-xs">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-amber-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900">
                Gemini Synthesis & Key Takeaways
              </h3>
            </div>
            <div className="text-xs sm:text-sm text-slate-800 leading-relaxed prose prose-sm max-w-none">
              <Markdown>{entry.summary}</Markdown>
            </div>
          </div>
        )}

        {/* Messages Transcript */}
        {entry.messages.map((msg) => {
          const isUser = msg.role === 'user';

          return (
            <div
              key={msg.id}
              className={`flex gap-3 max-w-3xl ${isUser ? 'ml-auto justify-end' : 'mr-auto justify-start'}`}
            >
              {!isUser && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white shadow-xs">
                  <Sparkles className="h-4 w-4 text-amber-300" />
                </div>
              )}

              <div
                className={`rounded-2xl px-4 py-3.5 text-xs sm:text-sm shadow-xs ${
                  isUser
                    ? 'bg-slate-900 text-white rounded-tr-xs'
                    : 'bg-white border border-slate-200 text-slate-800 rounded-tl-xs'
                }`}
              >
                {isUser ? (
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                ) : (
                  <div className="leading-relaxed prose prose-sm max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 text-slate-800">
                    <Markdown>{msg.content}</Markdown>
                  </div>
                )}

                <div
                  className={`mt-2 flex items-center justify-between gap-3 text-[10px] ${
                    isUser ? 'text-slate-400' : 'text-slate-400 border-t border-slate-100 pt-1.5'
                  }`}
                >
                  <span className="flex items-center gap-1">
                    <Clock className="h-2.5 w-2.5" />
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {!isUser && msg.modelUsed && (
                    <span className="flex items-center gap-1 font-mono text-[10px] text-slate-500 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded">
                      <Cpu className="h-2.5 w-2.5 text-emerald-600" />
                      {msg.modelUsed}
                    </span>
                  )}
                </div>
              </div>

              {isUser && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-200 text-slate-700">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          );
        })}

        {/* Gemini Generating Indicator */}
        {isGenerating && (
          <div className="flex gap-3 max-w-3xl mr-auto justify-start">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
              <Sparkles className="h-4 w-4 animate-spin text-amber-300" />
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600 flex items-center gap-2">
              <div className="flex gap-1">
                <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce" />
                <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce [animation-delay:0.2s]" />
                <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce [animation-delay:0.4s]" />
              </div>
              <span className="text-slate-500">Gemini is reflecting and synthesizing...</span>
            </div>
          </div>
        )}

        {/* Step 3: Dig Deeper Glowing Button & Section (Shown once an entry exists) */}
        {entry.messages.length > 0 && (
          <DigDeeperSection
            entryContent={entry.messages.map((m) => m.content).join('\n')}
            entryTitle={entry.title}
            mood={entry.mood || currentMood || 'Reflective'}
            existingQuestions={entry.digDeeperQuestions || []}
            onSaveQuestions={handleSaveDigDeeper}
            onEarnXp={() => onEarnXp?.('dig_deeper')}
          />
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Composer */}
      <div className="border-t border-slate-200 bg-slate-50/90 p-4 shrink-0">
        <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto">
          <div className="relative rounded-2xl border border-slate-300 bg-white shadow-xs focus-within:border-slate-500 focus-within:ring-1 focus-within:ring-slate-500">
            <textarea
              id="reflection-prompt-input"
              ref={textareaRef}
              rows={2}
              value={currentPrompt}
              onChange={handleTextareaInput}
              onKeyDown={handleKeyDown}
              placeholder={`Write your reflection (${activeMode === 'reflection' ? 'deep contemplation' : activeMode === 'brainstorm' ? 'creative exploration' : 'structured synthesis'})...`}
              disabled={isGenerating}
              className="w-full resize-none border-0 bg-transparent px-3.5 py-3 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden"
            />

            <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2 bg-slate-50/60 rounded-b-2xl">
              <span className="text-[11px] text-slate-400">
                Press <kbd className="font-mono bg-slate-200 px-1 py-0.5 rounded text-[10px]">Cmd + Enter</kbd> to reflect
              </span>

              <div className="flex items-center gap-2">
                <button
                  id="send-reflection-btn"
                  type="submit"
                  disabled={!currentPrompt.trim() || isGenerating}
                  className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-slate-800 disabled:opacity-40 transition-all cursor-pointer"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Send Reflection</span>
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
