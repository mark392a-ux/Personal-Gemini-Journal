import React, { useState } from 'react';
import { JournalInteraction, ReflectionMode } from '../types';
import { MOODS } from './MoodSelector';
import {
  Plus,
  Search,
  BookOpen,
  Trash2,
  Calendar,
  Sparkles,
  ChevronRight,
  MessageSquare,
} from 'lucide-react';

interface HistorySidebarProps {
  entries: JournalInteraction[];
  activeEntryId: string | null;
  onSelectEntry: (entry: JournalInteraction) => void;
  onNewEntry: () => void;
  onDeleteEntry: (id: string, e: React.MouseEvent) => void;
  isLoading: boolean;
}

export const HistorySidebar: React.FC<HistorySidebarProps> = ({
  entries,
  activeEntryId,
  onSelectEntry,
  onNewEntry,
  onDeleteEntry,
  isLoading,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filteredEntries = entries.filter((entry) => {
    const matchesSearch =
      entry.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.messages.some((m) =>
        m.content.toLowerCase().includes(searchTerm.toLowerCase())
      ) ||
      (entry.summary && entry.summary.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (entry.mood && entry.mood.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory =
      selectedCategory === 'all' || entry.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const getCategoryBadgeClass = (category: ReflectionMode) => {
    switch (category) {
      case 'reflection':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'brainstorm':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'summary':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getMoodEmoji = (mood?: string) => {
    if (!mood) return null;
    const found = MOODS.find((m) => m.type.toLowerCase() === mood.toLowerCase());
    return found ? found.emoji : null;
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <aside className="w-full lg:w-80 flex flex-col border-r border-slate-200 bg-slate-50/70 h-full">
      {/* Top CTA */}
      <div className="p-4 border-b border-slate-200 bg-white">
        <button
          id="new-entry-btn"
          type="button"
          onClick={onNewEntry}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:from-violet-700 hover:to-indigo-700 transition-all cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>New Journal Entry</span>
        </button>
      </div>

      {/* Search & Filter */}
      <div className="p-3 border-b border-slate-200 bg-white/60 space-y-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            id="search-entries-input"
            type="text"
            placeholder="Search reflections or mood..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-slate-400 focus:outline-hidden"
          />
        </div>

        {/* Category Pill Filters */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px]">
          {['all', 'reflection', 'brainstorm', 'summary'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-lg px-2.5 py-1 font-semibold capitalize whitespace-nowrap transition-colors cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Entries List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-48 space-y-2 text-slate-400">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-800" />
            <span className="text-xs">Loading journal entries...</span>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="text-center py-10 px-4">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-2">
              <BookOpen className="h-5 w-5" />
            </div>
            <p className="text-xs font-semibold text-slate-700">No entries found</p>
            <p className="text-[11px] text-slate-500 mt-1">
              {entries.length === 0
                ? 'Create your first reflection to start your journal.'
                : 'No entries match your search query.'}
            </p>
          </div>
        ) : (
          filteredEntries.map((entry) => {
            const isActive = entry.id === activeEntryId;
            const moodEmoji = getMoodEmoji(entry.mood);
            const previewText =
              entry.messages.find((m) => m.role === 'user')?.content ||
              entry.summary ||
              'Empty session...';

            return (
              <div
                key={entry.id}
                id={`entry-item-${entry.id}`}
                onClick={() => onSelectEntry(entry)}
                className={`group relative rounded-2xl border p-3.5 transition-all cursor-pointer ${
                  isActive
                    ? 'border-indigo-500 bg-white shadow-xs ring-1 ring-indigo-500/20'
                    : 'border-slate-200/90 bg-white/75 hover:border-slate-300 hover:bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    {moodEmoji && (
                      <span className="text-base shrink-0" title={`Mood: ${entry.mood}`}>
                        {moodEmoji}
                      </span>
                    )}
                    <h4 className="text-xs font-bold text-slate-900 truncate">
                      {entry.title || 'Untitled Reflection'}
                    </h4>
                  </div>
                  <button
                    id={`delete-entry-${entry.id}-btn`}
                    type="button"
                    onClick={(e) => onDeleteEntry(entry.id, e)}
                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-600 transition-opacity p-0.5 rounded hover:bg-red-50"
                    title="Delete Entry"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed mb-2.5">
                  {previewText}
                </p>

                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`inline-block border px-1.5 py-0.5 rounded-md text-[10px] font-semibold capitalize ${getCategoryBadgeClass(
                        entry.category
                      )}`}
                    >
                      {entry.category}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <MessageSquare className="h-3 w-3" />
                      {entry.messages.length}
                    </span>
                  </div>
                  <span className="flex items-center gap-1 text-slate-400">
                    <Calendar className="h-2.5 w-2.5" />
                    {formatDate(entry.updatedAt || entry.createdAt)}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Bottom Status Bar */}
      <div className="p-3 border-t border-slate-200 bg-slate-100/60 text-[11px] text-slate-500 flex items-center justify-between">
        <span>{entries.length} Private {entries.length === 1 ? 'Entry' : 'Entries'}</span>
        <span className="flex items-center gap-1 text-emerald-700 font-semibold">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Firestore Isolated
        </span>
      </div>
    </aside>
  );
};
