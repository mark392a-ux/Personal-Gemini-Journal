import React, { useState, useEffect, useCallback } from 'react';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './lib/firebase';
import {
  saveUserInteraction,
  deleteUserInteraction,
  subscribeToUserInteractions,
  subscribeToGamificationStats,
  subscribeToWeeklyReports,
  awardGamificationXP,
  calculateLevelFromXp,
  INITIAL_GAMIFICATION_STATS,
} from './lib/firestore-utils';
import { JournalInteraction, GamificationStats, WeeklyReport, MoodType } from './types';
import { Navbar } from './components/Navbar';
import { LandingView } from './components/LandingView';
import { HistorySidebar } from './components/HistorySidebar';
import { JournalEditor } from './components/JournalEditor';
import { SecurityModal } from './components/SecurityModal';
import { GamificationBar } from './components/GamificationBar';
import { EddyCompanion } from './components/EddyCompanion';
import { WeeklyReportModal } from './components/WeeklyReportModal';
import { BadgesModal } from './components/BadgesModal';
import { MoodStatsModal } from './components/MoodStatsModal';
import { AlertCircle, Plus } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [interactions, setInteractions] = useState<JournalInteraction[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [activeEntry, setActiveEntry] = useState<JournalInteraction | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [firestoreError, setFirestoreError] = useState<string | null>(null);

  // Gamification & Playful Companion States
  const [gamificationStats, setGamificationStats] = useState<GamificationStats>(INITIAL_GAMIFICATION_STATS);
  const [weeklyReports, setWeeklyReports] = useState<WeeklyReport[]>([]);
  const [selectedMood, setSelectedMood] = useState<MoodType | null>(null);
  const [lastCelebrationTrigger, setLastCelebrationTrigger] = useState<string | null>(null);

  // Modals
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [isBadgesModalOpen, setIsBadgesModalOpen] = useState(false);
  const [isWeeklyReportOpen, setIsWeeklyReportOpen] = useState(false);
  const [isMoodStatsOpen, setIsMoodStatsOpen] = useState(false);

  // 1. Listen for Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => {
        setUser(currentUser);
        setAuthLoading(false);
      },
      (error) => {
        console.error('Firebase Auth state error:', error);
        setAuthLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // 2. Subscribe to user's private Firestore interactions when user is authenticated
  useEffect(() => {
    if (!user) {
      setInteractions([]);
      setActiveEntry(null);
      return;
    }

    setHistoryLoading(true);
    setFirestoreError(null);

    const unsubscribe = subscribeToUserInteractions(
      user.uid,
      (items) => {
        setInteractions(items);
        setHistoryLoading(false);

        // If no active entry is selected, default to the most recent one or prepare a new draft
        setActiveEntry((current) => {
          if (current) {
            // Keep current synced with latest update from server
            const updatedMatch = items.find((i) => i.id === current.id);
            return updatedMatch || current;
          }
          if (items.length > 0) {
            return items[0];
          }
          return createNewDraft(user.uid);
        });
      },
      (err) => {
        setFirestoreError(
          `Firestore permission or connection error: ${err.message}. Ensure your user session is active.`
        );
        setHistoryLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // 3. Subscribe to Gamification Stats and Weekly Reports
  useEffect(() => {
    if (!user) {
      setGamificationStats(INITIAL_GAMIFICATION_STATS);
      setWeeklyReports([]);
      return;
    }

    const unsubStats = subscribeToGamificationStats(user.uid, (stats) => {
      setGamificationStats(stats);
    });

    const unsubReports = subscribeToWeeklyReports(user.uid, (reports) => {
      setWeeklyReports(reports);
    });

    return () => {
      unsubStats();
      unsubReports();
    };
  }, [user]);

  // Helper to create a new local draft
  const createNewDraft = (uid: string): JournalInteraction => {
    const newId = `entry-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    return {
      id: newId,
      userId: uid,
      title: 'Untitled Reflection',
      category: 'reflection',
      mood: selectedMood || undefined,
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  };

  // Handler for creating a fresh entry
  const handleNewEntry = useCallback(() => {
    if (!user) return;
    const freshEntry = createNewDraft(user.uid);
    setActiveEntry(freshEntry);
  }, [user, selectedMood]);

  // Award XP Handler (triggered on actions like entry saved, dig deeper, or report generated)
  const handleAwardXp = async (action: 'entry' | 'dig_deeper' | 'report') => {
    if (!user) return;
    try {
      const res = await awardGamificationXP(user.uid, gamificationStats, action);
      if (res.leveledUp) {
        setLastCelebrationTrigger('level_up');
      } else if (res.newlyUnlockedBadges && res.newlyUnlockedBadges.length > 0) {
        setLastCelebrationTrigger('badge_unlocked');
      } else if (action === 'entry') {
        setLastCelebrationTrigger('entry_saved');
      } else if (action === 'report') {
        setLastCelebrationTrigger('report_generated');
      } else if (action === 'dig_deeper') {
        setLastCelebrationTrigger('dig_deeper');
      }
    } catch (err) {
      console.warn('Could not update gamification XP:', err);
    }
  };

  // Handler for saving an entry to Firestore (Guaranteed Transaction Verification)
  const handleSaveEntry = async (
    updatedEntry: JournalInteraction,
    extra?: { isFirstCompletion?: boolean }
  ) => {
    if (!user) {
      setSaveError('You must be signed in to save entries.');
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      await saveUserInteraction(user.uid, updatedEntry);
      setActiveEntry(updatedEntry);

      if (extra?.isFirstCompletion) {
        await handleAwardXp('entry');
      }
    } catch (err: any) {
      console.error('[App] Failed to save entry to Firestore:', err);
      setSaveError(err?.message || 'Failed to save reflection to Firestore. Please retry.');
      throw err; // bubble up so editor knows save was rejected
    } finally {
      setIsSaving(false);
    }
  };

  // Handler for deleting an entry
  const handleDeleteEntry = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;

    const confirmDelete = window.confirm(
      'Are you sure you want to delete this journal reflection? This action cannot be undone.'
    );
    if (!confirmDelete) return;

    try {
      await deleteUserInteraction(user.uid, id);
      if (activeEntry?.id === id) {
        const remaining = interactions.filter((item) => item.id !== id);
        if (remaining.length > 0) {
          setActiveEntry(remaining[0]);
        } else {
          setActiveEntry(createNewDraft(user.uid));
        }
      }
    } catch (err: any) {
      console.error('Delete entry error:', err);
      alert(`Failed to delete entry: ${err?.message || 'Unknown error'}`);
    }
  };

  // Sign out handler
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setActiveEntry(null);
      setInteractions([]);
      setSelectedMood(null);
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  if (authLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-100">
        <div className="flex flex-col items-center gap-3 text-slate-600">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-indigo-200 border-t-indigo-600" />
          <span className="text-xs font-semibold tracking-wide">Starting your mindful journal...</span>
        </div>
      </div>
    );
  }

  const currentLevelInfo = calculateLevelFromXp(gamificationStats.xp);
  const recentSnippets = interactions.slice(0, 5).map((i) => i.title || (i.messages[0]?.content || ''));

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 text-slate-900 overflow-x-hidden font-sans">
      {/* Persistent Navigation Bar */}
      <Navbar
        user={user}
        onSignOut={handleSignOut}
        onOpenSecurityModal={() => setIsSecurityModalOpen(true)}
      />

      {/* Main Content Area */}
      {!user ? (
        // Unauthenticated Landing & Google Sign-In View
        <LandingView onOpenSecurityModal={() => setIsSecurityModalOpen(true)} />
      ) : (
        // Authenticated Dashboard Layout
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Global Firestore Error Alert */}
          {firestoreError && (
            <div
              id="firestore-error-banner"
              className="bg-red-50 border-b border-red-200 px-4 py-2.5 text-xs text-red-700 flex items-center justify-between shrink-0"
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                <span>{firestoreError}</span>
              </div>
              <button
                type="button"
                onClick={() => setFirestoreError(null)}
                className="text-xs text-red-700 hover:text-red-900 font-semibold underline"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Gamification Bar at the top of the dashboard */}
          <div className="px-4 py-2 sm:px-6 bg-slate-100/90 border-b border-slate-200/80 shrink-0">
            <GamificationBar
              stats={gamificationStats}
              onOpenBadges={() => setIsBadgesModalOpen(true)}
              onOpenWeeklyReports={() => setIsWeeklyReportOpen(true)}
              onOpenMoodStats={() => setIsMoodStatsOpen(true)}
            />
          </div>

          <div className="flex-1 flex flex-col lg:flex-row h-[calc(100vh-140px)] overflow-hidden">
            {/* Left: User History Sidebar */}
            <HistorySidebar
              entries={interactions}
              activeEntryId={activeEntry?.id || null}
              onSelectEntry={(selected) => {
                setActiveEntry(selected);
                if (selected.mood) {
                  setSelectedMood(selected.mood);
                }
              }}
              onNewEntry={handleNewEntry}
              onDeleteEntry={handleDeleteEntry}
              isLoading={historyLoading}
            />

            {/* Right: Active Journal & Reflection Workspace */}
            <main className="flex-1 flex flex-col h-full overflow-hidden bg-white">
              {activeEntry ? (
                <JournalEditor
                  key={activeEntry.id}
                  userId={user.uid}
                  entry={activeEntry}
                  onSaveEntry={handleSaveEntry}
                  isSaving={isSaving}
                  saveError={saveError}
                  onClearSaveError={() => setSaveError(null)}
                  onEarnXp={handleAwardXp}
                  currentMood={selectedMood}
                  onSelectMood={(m) => setSelectedMood(m)}
                  recentSnippets={recentSnippets}
                />
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
                  <p className="text-sm font-semibold text-slate-700 mb-3">
                    No active reflection selected.
                  </p>
                  <button
                    type="button"
                    onClick={handleNewEntry}
                    className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 shadow-sm"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Create New Reflection</span>
                  </button>
                </div>
              )}
            </main>
          </div>

          {/* Playable Character: Eddy Companion */}
          <EddyCompanion
            currentMood={selectedMood}
            level={currentLevelInfo.level}
            streak={gamificationStats.streak}
            lastCelebrationTrigger={lastCelebrationTrigger}
            onCelebrationHandled={() => setLastCelebrationTrigger(null)}
          />
        </div>
      )}

      {/* Modals */}
      <SecurityModal
        isOpen={isSecurityModalOpen}
        onClose={() => setIsSecurityModalOpen(false)}
      />

      <BadgesModal
        isOpen={isBadgesModalOpen}
        onClose={() => setIsBadgesModalOpen(false)}
        stats={gamificationStats}
      />

      {user && (
        <WeeklyReportModal
          isOpen={isWeeklyReportOpen}
          onClose={() => setIsWeeklyReportOpen(false)}
          userId={user.uid}
          userName={user.displayName || 'Mindful Writer'}
          entries={interactions}
          pastReports={weeklyReports}
          streak={gamificationStats.streak}
          onReportCreated={() => handleAwardXp('report')}
        />
      )}

      <MoodStatsModal
        isOpen={isMoodStatsOpen}
        onClose={() => setIsMoodStatsOpen(false)}
        entries={interactions}
      />
    </div>
  );
}
