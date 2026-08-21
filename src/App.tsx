/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import confetti from 'canvas-confetti';
import {
  Habit,
  UserStats,
  ThemeMode,
  Category,
  HabitNote,
  UserAccount,
} from './types';
import {
  CATEGORIES,
  ALL_ACHIEVEMENTS,
  formatDate,
  calcStreak,
  calcHabitGrindScore,
  xpForLevel,
  recalculateStatsFromCompletions,
  getInitialSampleHabits,
  generateId,
  addDays,
} from './utils/storage';
import { soundFx } from './utils/audio';

import { syncUserRecordToMongoDB } from './lib/userService';
import {
  subscribeToUserCloudState,
  writeUserCloudState,
  fetchUserCloudStateDirect,
  getCanonicalUserDocId,
} from './lib/syncService';

import { Header } from './components/Header';
import { InnerHeader } from './components/InnerHeader';
import { TodayGrind } from './components/TodayGrind';
import { HabitCard } from './components/HabitCard';
import { EditHabitModal } from './components/EditHabitModal';
import { InsightModal } from './components/InsightModal';
import { CommandPalette } from './components/CommandPalette';
import { TemplatesModal } from './components/TemplatesModal';
import { AICoachModal } from './components/AICoachModal';
import { StatsDashboard } from './components/StatsDashboard';
import { ArchiveTab } from './components/ArchiveTab';
import { AuthModal } from './components/AuthModal';
import { AuthGate } from './components/AuthGate';
import { BadgesModal } from './components/BadgesModal';
import { DeleteHabitModal } from './components/DeleteHabitModal';
import { RoutineFlowModal } from './components/RoutineFlowModal';
import { FirebaseStorageRepository } from './repository/FirebaseStorageRepository';
import { Routine, RoutineEngine } from './core/engine/RoutineEngine';
import { eventBus } from './core/events/EventBus';
import { Logger } from './utils/logger';
import { auth, db, onAuthStateChanged, doc, setDoc, onSnapshot } from './lib/firebase';

import {
  LayoutDashboard,
  BarChart3,
  Archive,
  Search,
  Filter,
  Calendar,
  Sparkles,
  Undo2,
  CheckCircle,
} from 'lucide-react';

export default function App() {
  // Main state
  const [habits, setHabits] = React.useState<Habit[]>([]);
  const [archivedHabits, setArchivedHabits] = React.useState<Habit[]>([]);
  const [stats, setStats] = React.useState<UserStats>({
    xp: 0,
    level: 1,
    grindScore: 0,
    totalCompletions: 0,
    streakFreezes: 0,
    achievements: [],
  });

  const [theme, setTheme] = React.useState<ThemeMode>('dark');
  const [soundEnabled, setSoundEnabled] = React.useState(true);
  const [weeksToShow, setWeeksToShow] = React.useState(4);
  const [selectedCategory, setSelectedCategory] = React.useState<Category | 'All'>('All');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [activeTab, setActiveTab] = React.useState<'dashboard' | 'stats' | 'archive'>('dashboard');

  // User Auth state
  const [currentUser, setCurrentUser] = React.useState<UserAccount | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = React.useState(false);

  // Notes state (habitId => note)
  const [habitNotes, setHabitNotes] = React.useState<Record<string, string>>({});

  // Modals state
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  const [editingHabit, setEditingHabit] = React.useState<Habit | null>(null);

  const [isInsightModalOpen, setIsInsightModalOpen] = React.useState(false);
  const [selectedInsightHabit, setSelectedInsightHabit] = React.useState<Habit | null>(null);

  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = React.useState(false);
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = React.useState(false);
  const [isAICoachModalOpen, setIsAICoachModalOpen] = React.useState(false);
  const [isBadgesModalOpen, setIsBadgesModalOpen] = React.useState(false);
  const [deletingHabitTarget, setDeletingHabitTarget] = React.useState<Habit | null>(null);

  // Novel Enterprise Features State
  const [routines, setRoutines] = React.useState<Routine[]>(RoutineEngine.getDefaultRoutines());
  const [isRoutineFlowOpen, setIsRoutineFlowOpen] = React.useState(false);

  // Multi-Device Real-Time Sync Status
  const [syncStatus, setSyncStatus] = React.useState<'live' | 'syncing' | 'offline'>('live');
  const [lastSyncedTime, setLastSyncedTime] = React.useState<Date | null>(null);

  // Undo Toast state
  const [undoToast, setUndoToast] = React.useState<{
    message: string;
    action: () => void;
  } | null>(null);

  const toastTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const dragIndexRef = React.useRef<number | null>(null);

  // Real-Time Firebase Auth & Multi-Device Synchronizer
  React.useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const displayName = fbUser.displayName || fbUser.email?.split('@')[0] || 'User';
        const formattedName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
        const userAccount: UserAccount = {
          id: fbUser.uid,
          email: fbUser.email || '',
          name: formattedName,
          avatar: fbUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(displayName)}`,
          provider: fbUser.providerData[0]?.providerId === 'google.com' ? 'google' : 'email',
          createdAt: new Date().toISOString(),
        };

        setCurrentUser(userAccount);

        // Auto-touch user profile record in Firestore
        setDoc(doc(db, 'users', fbUser.uid), {
          uid: fbUser.uid,
          email: fbUser.email || '',
          name: formattedName,
          avatar: fbUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(displayName)}`,
          provider: fbUser.providerData[0]?.providerId === 'google.com' ? 'google' : 'email',
          lastActive: new Date().toISOString(),
        }, { merge: true }).catch(err => {
          console.warn('Firestore users auto-sync note:', err?.message || err);
        });

        // Hydrate state directly from Cloud Firebase Firestore
        try {
          const cloud = await fetchUserCloudStateDirect(userAccount);
          if (cloud) {
            if (Array.isArray(cloud.habits)) setHabits(cloud.habits);
            if (Array.isArray(cloud.archivedHabits)) setArchivedHabits(cloud.archivedHabits);
            if (cloud.stats) setStats(cloud.stats);
            if (cloud.habitNotes) setHabitNotes(cloud.habitNotes);
            if (Array.isArray(cloud.routines)) setRoutines(cloud.routines);
            setSyncStatus('live');
            setLastSyncedTime(new Date());
          }
        } catch (err) {
          console.warn('Firestore initial hydrate error:', err);
        }
      }
    });

    return () => {
      unsubscribeAuth();
    };
  }, []);

  // Multi-Device Real-Time Cloud Subscription (<100ms sync across phone & laptop)
  React.useEffect(() => {
    if (!currentUser?.email || currentUser.email === 'guest@htgrind.app') {
      return;
    }

    setSyncStatus('syncing');

    // Subscribe to live Firestore stream
    const unsubscribe = subscribeToUserCloudState(
      currentUser,
      (cloudState) => {
        setSyncStatus('live');
        setLastSyncedTime(new Date());

        if (Array.isArray(cloudState.habits)) {
          setHabits(cloudState.habits);
        }
        if (Array.isArray(cloudState.archivedHabits)) {
          setArchivedHabits(cloudState.archivedHabits);
        }
        if (cloudState.stats) {
          setStats(cloudState.stats);
        }
        if (cloudState.habitNotes) {
          setHabitNotes(cloudState.habitNotes);
        }
        if (Array.isArray(cloudState.routines)) {
          setRoutines(cloudState.routines);
        }
      },
      (err) => {
        console.warn('Live subscription notice:', err);
        setSyncStatus('live');
      }
    );

    // Initial direct fetch to guarantee instant fresh data on login/refresh
    fetchUserCloudStateDirect(currentUser).then((cloud) => {
      if (cloud) {
        setSyncStatus('live');
        setLastSyncedTime(new Date());
        if (Array.isArray(cloud.habits)) setHabits(cloud.habits);
        if (Array.isArray(cloud.archivedHabits)) setArchivedHabits(cloud.archivedHabits);
        if (cloud.stats) setStats(cloud.stats);
        if (cloud.habitNotes) setHabitNotes(cloud.habitNotes);
        if (Array.isArray(cloud.routines)) setRoutines(cloud.routines);
      }
    });

    // Re-verify sync when device wakes up or user focuses tab
    const handleDeviceFocus = () => {
      if (document.visibilityState === 'visible') {
        fetchUserCloudStateDirect(currentUser).then((cloud) => {
          if (cloud) {
            setSyncStatus('live');
            setLastSyncedTime(new Date());
            if (Array.isArray(cloud.habits)) setHabits(cloud.habits);
            if (Array.isArray(cloud.archivedHabits)) setArchivedHabits(cloud.archivedHabits);
            if (cloud.stats) setStats(cloud.stats);
            if (cloud.habitNotes) setHabitNotes(cloud.habitNotes);
            if (Array.isArray(cloud.routines)) setRoutines(cloud.routines);
          }
        });
      }
    };

    window.addEventListener('visibilitychange', handleDeviceFocus);
    window.addEventListener('focus', handleDeviceFocus);

    return () => {
      unsubscribe();
      window.removeEventListener('visibilitychange', handleDeviceFocus);
      window.removeEventListener('focus', handleDeviceFocus);
    };
  }, [currentUser?.email]);

  // Sync user revisit count with MongoDB
  React.useEffect(() => {
    if (currentUser?.email && currentUser?.name) {
      syncUserRecordToMongoDB(currentUser.name, currentUser.email)
        .then((synced) => {
          if (synced && typeof synced.returningVisitors === 'number') {
            setCurrentUser((prev) =>
              prev ? { ...prev, returningVisitors: synced.returningVisitors } : prev
            );
          }
        })
        .catch((err) => console.warn('MongoDB revisit sync error:', err));
    }
  }, [currentUser?.email]);

  // Auto-calibrate Level & XP from habit completions on startup if XP is 0 or uncalibrated
  React.useEffect(() => {
    if (habits.length > 0) {
      const calculated = recalculateStatsFromCompletions(habits, archivedHabits, stats);
      if (stats.xp === 0 && calculated.totalCompletions > 0) {
        setStats(calculated);
        saveState(habits, archivedHabits, calculated, habitNotes);
      }
    }
  }, [habits.length]);

  // Login & Logout Handlers
  const handleUserLogin = async (user: UserAccount, options?: { importGuestData?: boolean }) => {
    setCurrentUser(user);
    setIsAuthModalOpen(false);

    let userHabits: Habit[] = [];
    let userArchived: Habit[] = [];
    let userStats: UserStats = {
      level: 1,
      xp: 0,
      totalCompletions: 0,
      grindScore: 0,
      streakFreezes: 1,
      achievements: ['welcome_badge'],
    };
    let userNotes: Record<string, string> = {};

    // Check Cloud Firebase Firestore state
    try {
      const cloud = await fetchUserCloudStateDirect(user);
      if (cloud && (cloud.habits.length > 0 || cloud.archivedHabits.length > 0 || cloud.stats.totalCompletions > 0)) {
        userHabits = cloud.habits;
        userArchived = cloud.archivedHabits;
        userStats = cloud.stats;
        userNotes = cloud.habitNotes;
        if (Array.isArray(cloud.routines)) setRoutines(cloud.routines);
      } else {
        // First time cloud user account
        userHabits = [];
        userArchived = [];
        userStats = {
          level: 1,
          xp: 0,
          totalCompletions: 0,
          grindScore: 0,
          streakFreezes: 1,
          achievements: ['welcome_badge'],
        };
        userNotes = {};
      }
    } catch (fsErr) {
      console.warn('Firestore user_data initial check note:', fsErr);
    }

    setHabits(userHabits);
    setArchivedHabits(userArchived);
    setStats(userStats);
    setHabitNotes(userNotes);

    // Sync state to Cloud Firebase Firestore
    writeUserCloudState(user, {
      habits: userHabits,
      archivedHabits: userArchived,
      stats: userStats,
      habitNotes: userNotes,
      routines,
    });

    soundFx.playLevelUp();
    triggerToast(
      userHabits.length === 0
        ? `✨ Cloud account connected! Ready for your habits.`
        : `👋 Welcome back, ${user.name}! Cloud habits synchronized.`
    );
  };

  const handleRestoreData = (restoredState: {
    habits: Habit[];
    archivedHabits: Habit[];
    stats: UserStats;
    habitNotes: Record<string, string>;
  }) => {
    setHabits(restoredState.habits);
    setArchivedHabits(restoredState.archivedHabits);
    setStats(restoredState.stats);
    setHabitNotes(restoredState.habitNotes);
    saveState(
      restoredState.habits,
      restoredState.archivedHabits,
      restoredState.stats,
      restoredState.habitNotes,
      theme,
      soundEnabled
    );
    soundFx.playLevelUp();
    triggerToast('Data restored successfully!');
  };

  const handleClearAccountData = () => {
    const emptyHabits: Habit[] = [];
    const emptyArchived: Habit[] = [];
    const emptyStats: UserStats = {
      level: 1,
      xp: 0,
      totalCompletions: 0,
      grindScore: 0,
      streakFreezes: 1,
      achievements: [],
    };
    const emptyNotes = {};

    setHabits(emptyHabits);
    setArchivedHabits(emptyArchived);
    setStats(emptyStats);
    setHabitNotes(emptyNotes);
    saveState(emptyHabits, emptyArchived, emptyStats, emptyNotes, theme, soundEnabled);
    triggerToast('Cloud account data cleared. Ready for fresh habits!');
  };

  const handleUserLogout = async () => {
    try {
      await auth.signOut();
    } catch (e) {
      console.warn('Sign out notice:', e);
    }
    setCurrentUser(null);
    setHabits([]);
    setArchivedHabits([]);
    setStats({
      xp: 0,
      level: 1,
      grindScore: 0,
      totalCompletions: 0,
      streakFreezes: 0,
      achievements: [],
    });
    setHabitNotes({});
    soundFx.playClick();
    triggerToast('Signed out of Cloud Firebase account');
  };

  // Sync state changes to Cloud Firebase Firestore & update grind score
  const saveState = React.useCallback(
    (
      newHabits = habits,
      newArchived = archivedHabits,
      newStats = stats,
      newNotes = habitNotes,
      newTheme = theme,
      newSound = soundEnabled
    ) => {
      // Recalculate Grind Score
      let totalScore = 0;
      newHabits.forEach((h) => {
        totalScore += calcHabitGrindScore(h);
      });
      const avgScore = newHabits.length
        ? Math.round(totalScore / newHabits.length)
        : 0;

      const updatedStats = { ...newStats, grindScore: avgScore };

      // Real-time Cloud Firebase Synchronization across all devices (Laptop + Mobile)
      if (currentUser) {
        setSyncStatus('syncing');
        writeUserCloudState(currentUser, {
          habits: newHabits,
          archivedHabits: newArchived,
          stats: updatedStats,
          habitNotes: newNotes,
          routines,
        }).then((success) => {
          if (success) {
            setSyncStatus('live');
            setLastSyncedTime(new Date());
          }
        });
      }

      setStats(updatedStats);
    },
    [habits, archivedHabits, stats, habitNotes, theme, soundEnabled, currentUser, routines]
  );

  // Apply Theme to document root
  React.useEffect(() => {
    document.documentElement.classList.remove(
      'dark',
      'light',
      'midnight',
      'cyberpunk',
      'emerald'
    );
    document.documentElement.classList.add(theme);
    if (theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }, [theme]);

  // Audio Toggle
  const handleSoundToggle = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    soundFx.enabled = next;
    saveState(habits, archivedHabits, stats, habitNotes, theme, next);
  };

  // Toast Trigger
  const triggerToast = (message: string, undoAction?: () => void) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    if (undoAction) {
      setUndoToast({ message, action: undoAction });
      toastTimerRef.current = setTimeout(() => {
        setUndoToast(null);
      }, 5000);
    } else {
      setUndoToast({ message, action: () => {} });
      toastTimerRef.current = setTimeout(() => {
        setUndoToast(null);
      }, 2500);
    }
  };

  // Add / Deduct XP and check Level Up / Down with Streak Freeze rewards
  const modifyXp = (amount: number) => {
    let currentXp = stats.xp + amount;
    let currentLevel = stats.level;
    let streakFreezes = stats.streakFreezes || 0;
    let totalCompletions = stats.totalCompletions || 0;

    if (amount > 0) {
      totalCompletions += 1;
      let leveledUp = false;
      while (currentXp >= xpForLevel(currentLevel)) {
        currentXp -= xpForLevel(currentLevel);
        currentLevel++;
        streakFreezes += 1; // Award +1 Streak Freeze 🧊 on Level Up
        leveledUp = true;
      }

      if (leveledUp) {
        soundFx.playLevelUp();
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
        });
        triggerToast(`🎉 LEVEL UP! You reached Level ${currentLevel} (+1 Streak Freeze 🧊)!`);
      }
    } else if (amount < 0) {
      if (streakFreezes > 0) {
        // STREAK FREEZE SHIELD ACTIVE! Absorbs deduction
        streakFreezes -= 1;
        currentXp = stats.xp; // Keep current XP intact!
        soundFx.playPop();
        triggerToast(`🛡️ STREAK FREEZE CONSUMED! Protected Level & XP from deduction (${streakFreezes} remaining).`);
      } else {
        totalCompletions = Math.max(0, totalCompletions - 1);
        while (currentXp < 0 && currentLevel > 1) {
          currentLevel--;
          currentXp += xpForLevel(currentLevel);
        }
        if (currentXp < 0) currentXp = 0;
        triggerToast(`⚠️ Deducted ${Math.abs(amount)} XP. Earn +1 Freeze 🧊 on Level Up!`);
      }
    }

    const nextStats: UserStats = {
      ...stats,
      xp: currentXp,
      level: currentLevel,
      totalCompletions,
      streakFreezes,
    };

    setStats(nextStats);
    saveState(habits, archivedHabits, nextStats);
  };

  const addXp = (amount: number) => modifyXp(amount);

  // Check achievements
  const checkAchievements = (currentHabits: Habit[]) => {
    const unlocked = [...stats.achievements];
    let newUnlockedCount = 0;

    ALL_ACHIEVEMENTS.forEach((a) => {
      if (!unlocked.includes(a.id)) {
        let cond = false;
        if (a.id === 'first_habit' && currentHabits.length >= 1) cond = true;
        if (a.id === 'streak_7' && currentHabits.some((h) => calcStreak(h.completions) >= 7)) cond = true;
        if (a.id === 'streak_30' && currentHabits.some((h) => calcStreak(h.completions) >= 30)) cond = true;
        if (a.id === 'streak_100' && currentHabits.some((h) => calcStreak(h.completions) >= 100)) cond = true;
        if (a.id === 'habits_5' && currentHabits.length >= 5) cond = true;

        if (cond) {
          unlocked.push(a.id);
          newUnlockedCount++;
          triggerToast(`🏆 Unlocked Badge: ${a.label}!`);
        }
      }
    });

    if (newUnlockedCount > 0) {
      const nextStats = { ...stats, achievements: unlocked };
      setStats(nextStats);
      saveState(currentHabits, archivedHabits, nextStats);
    }
  };

  // Log Habit (1-click completion)
  const handleLogHabit = (habitId: string) => {
    soundFx.playPop();

    const todayKey = formatDate(new Date());
    const updated = habits.map((h) => {
      if (h.id === habitId) {
        const prevCount = h.completions[todayKey] || 0;
        return {
          ...h,
          completions: {
            ...h.completions,
            [todayKey]: prevCount + 1,
          },
        };
      }
      return h;
    });

    setHabits(updated);
    modifyXp(15);
    checkAchievements(updated);
    saveState(updated);

    const loggedHabit = habits.find((h) => h.id === habitId);
    triggerToast(`✅ Logged ${loggedHabit?.name || 'Habit'} (+15 XP)`, () => {
      // Undo function (Deduction system)
      const reverted = habits.map((h) => {
        if (h.id === habitId) {
          const comps = { ...h.completions };
          if (comps[todayKey] > 1) {
            comps[todayKey] -= 1;
          } else {
            delete comps[todayKey];
          }
          return { ...h, completions: comps };
        }
        return h;
      });
      setHabits(reverted);
      modifyXp(-15);
      saveState(reverted);
      setUndoToast(null);
    });
  };

  // Set custom count for any date in heatmap
  const handleSetCustomCount = (habitId: string, dateKey: string, count: number) => {
    soundFx.playClick();
    const targetHabit = habits.find((h) => h.id === habitId);
    const oldCount = targetHabit?.completions[dateKey] || 0;
    const countDelta = count - oldCount;

    const updated = habits.map((h) => {
      if (h.id === habitId) {
        const comps = { ...h.completions };
        if (count === 0) {
          delete comps[dateKey];
        } else {
          comps[dateKey] = count;
        }
        return { ...h, completions: comps };
      }
      return h;
    });

    setHabits(updated);
    if (countDelta !== 0) {
      modifyXp(countDelta * 15);
    }
    saveState(updated);
    triggerToast(`📅 Updated count to ${count}`);
  };

  // Create / Edit Save
  const handleSaveHabit = (habitData: Partial<Habit>) => {
    soundFx.playClick();
    if (editingHabit) {
      // Edit existing
      const updated = habits.map((h) =>
        h.id === editingHabit.id ? ({ ...h, ...habitData } as Habit) : h
      );
      setHabits(updated);
      saveState(updated);
      triggerToast(`✎ Updated ${habitData.name}`);
    } else {
      // Create new
      const newHabit: Habit = {
        id: generateId(),
        name: habitData.name || 'New Habit',
        icon: habitData.icon || '❤️',
        color: habitData.color || '#818cf8',
        goal: habitData.goal || 5,
        category: (habitData.category as Category) || 'Health',
        completions: {},
        createdAt: new Date().toISOString(),
      };
      const updated = [...habits, newHabit];
      setHabits(updated);
      addXp(20);
      checkAchievements(updated);
      saveState(updated);
      triggerToast(`✨ Created "${newHabit.name}" (+20 XP)`);
    }
  };

  // Clone Habit
  const handleCloneHabit = (habitId: string) => {
    soundFx.playClick();
    const target = habits.find((h) => h.id === habitId);
    if (!target) return;
    const clone: Habit = {
      ...JSON.parse(JSON.stringify(target)),
      id: generateId(),
      name: `${target.name} (Copy)`,
    };
    const updated = [...habits, clone];
    setHabits(updated);
    saveState(updated);
    triggerToast(`📋 Cloned "${target.name}"`);
  };

  // Archive Habit
  const handleArchiveHabit = (habitId: string) => {
    soundFx.playClick();
    const target = habits.find((h) => h.id === habitId);
    if (!target) return;
    const updatedHabits = habits.filter((h) => h.id !== habitId);
    const updatedArchived = [...archivedHabits, target];
    setHabits(updatedHabits);
    setArchivedHabits(updatedArchived);
    saveState(updatedHabits, updatedArchived);
    triggerToast(`📦 Archived "${target.name}"`, () => {
      setHabits(habits);
      setArchivedHabits(archivedHabits);
      saveState(habits, archivedHabits);
      setUndoToast(null);
    });
  };

  // Unarchive Habit
  const handleUnarchiveHabit = (habitId: string) => {
    const target = archivedHabits.find((h) => h.id === habitId);
    if (!target) return;
    const updatedArchived = archivedHabits.filter((h) => h.id !== habitId);
    const updatedHabits = [...habits, target];
    setHabits(updatedHabits);
    setArchivedHabits(updatedArchived);
    saveState(updatedHabits, updatedArchived);
    triggerToast(`↩️ Restored "${target.name}"`);
  };

  // Delete Habit
  const handleDeleteHabit = (habitId: string) => {
    soundFx.playClick();
    const target = habits.find((h) => h.id === habitId);
    if (!target) return;
    setDeletingHabitTarget(target);
  };

  const handleConfirmDeleteHabit = (habitId: string) => {
    const target = habits.find((h) => h.id === habitId);
    if (!target) return;
    const updated = habits.filter((h) => h.id !== habitId);
    setHabits(updated);
    saveState(updated);
    triggerToast(`🗑️ Deleted "${target.name}"`);
    setDeletingHabitTarget(null);
  };

  // Permanent Delete Archived
  const handlePermanentDeleteArchived = (habitId: string) => {
    const updated = archivedHabits.filter((h) => h.id !== habitId);
    setArchivedHabits(updated);
    saveState(habits, updated);
    triggerToast('🗑️ Permanently deleted');
  };

  // Save Habit Note (Supports dated notes - 1 Date = 1 Note)
  const handleSaveNote = (habitId: string, noteText: string, dateKey?: string) => {
    soundFx.playClick();
    const updatedNotes = { ...habitNotes };
    const todayStr = formatDate(new Date());
    const targetDate = dateKey || todayStr;
    const datedKey = `${habitId}_${targetDate}`;

    if (noteText.trim()) {
      updatedNotes[datedKey] = noteText;
      if (targetDate === todayStr) {
        updatedNotes[habitId] = noteText;
      }
    } else {
      delete updatedNotes[datedKey];
      if (targetDate === todayStr) {
        delete updatedNotes[habitId];
      }
    }

    setHabitNotes(updatedNotes);
    saveState(habits, archivedHabits, stats, updatedNotes);
    triggerToast(`📝 Note saved for ${targetDate}!`);
  };

  const handleDeleteNote = (habitIdOrKey: string, dateKey?: string, specificKey?: string) => {
    soundFx.playClick();
    const updatedNotes = { ...habitNotes };
    const todayStr = formatDate(new Date());

    // Extract core habit ID if habitIdOrKey is habitId or habitId_dateKey
    let habitId = habitIdOrKey;
    let targetDate = dateKey || todayStr;

    if (!dateKey && habitIdOrKey.includes('_')) {
      const parts = habitIdOrKey.split('_');
      habitId = parts[0];
      targetDate = parts.slice(1).join('_');
    }

    // Delete all possible key representations
    delete updatedNotes[`${habitId}_${targetDate}`];
    delete updatedNotes[habitIdOrKey];
    if (specificKey) {
      delete updatedNotes[specificKey];
    }

    // Always delete legacy habitId key if target date is today or key matches habitId
    if (targetDate === todayStr || habitIdOrKey === habitId || specificKey === habitId) {
      delete updatedNotes[habitId];
    }

    setHabitNotes(updatedNotes);
    saveState(habits, archivedHabits, stats, updatedNotes);
    triggerToast('🗑️ Reflection note deleted');
  };

  // Drag & Drop reordering
  const handleDragStart = (e: React.DragEvent, index: number) => {
    dragIndexRef.current = index;
  };
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
  };
  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndexRef.current === null || dragIndexRef.current === index) return;
    const copy = [...habits];
    const [draggedItem] = copy.splice(dragIndexRef.current, 1);
    copy.splice(index, 0, draggedItem);
    dragIndexRef.current = null;
    setHabits(copy);
    saveState(copy);
    triggerToast('🔄 Habit order updated');
  };

  // Export / Import
  const handleExportData = () => {
    const exportObject = {
      habits,
      archivedHabits,
      stats,
      habitNotes,
      exportedAt: new Date().toISOString(),
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportObject, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `HT_GRIND_Backup_${formatDate(new Date())}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    triggerToast('📦 Data exported successfully!');
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.habits) setHabits(parsed.habits);
        if (parsed.archivedHabits) setArchivedHabits(parsed.archivedHabits);
        if (parsed.stats) setStats(parsed.stats);
        if (parsed.habitNotes) setHabitNotes(parsed.habitNotes);
        saveState(
          parsed.habits || habits,
          parsed.archivedHabits || archivedHabits,
          parsed.stats || stats,
          parsed.habitNotes || habitNotes
        );
        triggerToast('📥 Data imported successfully!');
      } catch (err) {
        alert('Failed to import file: Invalid JSON format');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Keyboard Shortcuts Listener
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setIsEditModalOpen(false);
        setIsInsightModalOpen(false);
        setIsCommandPaletteOpen(false);
        setIsTemplatesModalOpen(false);
        setIsAICoachModalOpen(false);
      }
      if ((e.key === 'n' || e.key === 'N') && !e.ctrlKey && !e.metaKey && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        setEditingHabit(null);
        setIsEditModalOpen(true);
      }
      if ((e.key === 't' || e.key === 'T') && !e.ctrlKey && !e.metaKey && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        setIsTemplatesModalOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filtered Habits list
  const filteredHabits = habits.filter((h) => {
    if (selectedCategory !== 'All' && h.category !== selectedCategory) return false;
    if (searchQuery && !h.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const activeStreaksCount = habits.filter((h) => calcStreak(h.completions) > 0).length;

  const handleManualSync = async () => {
    if (!currentUser || currentUser.email === 'guest@htgrind.app') return;
    setSyncStatus('syncing');
    try {
      const cloud = await fetchUserCloudStateDirect(currentUser);
      if (cloud) {
        if (Array.isArray(cloud.habits)) setHabits(cloud.habits);
        if (Array.isArray(cloud.archivedHabits)) setArchivedHabits(cloud.archivedHabits);
        if (cloud.stats) setStats(cloud.stats);
        if (cloud.habitNotes) setHabitNotes(cloud.habitNotes);
        if (Array.isArray(cloud.routines)) setRoutines(cloud.routines);
        setLastSyncedTime(new Date());
        setSyncStatus('live');
        triggerToast('⚡ Real-time sync updated across your devices!');
      } else {
        setSyncStatus('live');
      }
    } catch {
      setSyncStatus('live');
    }
  };

  if (!currentUser) {
    return <AuthGate onLogin={handleUserLogin} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased pb-20 selection:bg-indigo-500 selection:text-white">
      
      {/* OUTER HEADER WITH HT GRIND.png */}
      <Header
        theme={theme}
        onThemeChange={(t) => {
          setTheme(t);
          saveState(habits, archivedHabits, stats, habitNotes, t);
        }}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        soundEnabled={soundEnabled}
        onSoundToggle={handleSoundToggle}
        onOpenNewModal={() => {
          setEditingHabit(null);
          setIsEditModalOpen(true);
        }}
        onOpenTemplates={() => setIsTemplatesModalOpen(true)}
        onOpenAICoach={() => setIsAICoachModalOpen(true)}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onOpenRoutineFlow={() => setIsRoutineFlowOpen(true)}
        onExport={handleExportData}
        onImport={handleImportData}
        syncStatus={syncStatus}
        onManualSync={handleManualSync}
      />

      {/* MAIN CONTAINER */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        
        {/* INNER HEADER BANNER WITH HT GRIND.png & METRICS */}
        <InnerHeader
          stats={stats}
          activeStreakCount={activeStreaksCount}
          onOpenBadges={() => setIsBadgesModalOpen(true)}
        />

        {/* TODAY'S QUICK GRIND STRIP */}
        <TodayGrind
          habits={habits}
          onLogHabit={handleLogHabit}
          onOpenAICoach={() => setIsAICoachModalOpen(true)}
          onOpenInsight={(id) => {
            const target = habits.find((h) => h.id === id);
            if (target) {
              setSelectedInsightHabit(target);
              setIsInsightModalOpen(true);
            }
          }}
        />

        {/* NAVIGATION TABS */}
        <div className="flex items-center gap-2 p-1.5 mb-6 rounded-2xl bg-slate-900 border border-slate-800 w-fit">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'dashboard'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('stats')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'stats'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Stats Analytics</span>
          </button>

          <button
            onClick={() => setActiveTab('archive')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'archive'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Archive className="w-4 h-4" />
            <span>Archive ({archivedHabits.length})</span>
          </button>
        </div>

        {/* TAB CONTENT: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-4">
            
            {/* CONTROLS & SEARCH BAR */}
            <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex-wrap">
              
              {/* Heatmap Time View Controls */}
              <div className="flex items-center gap-1.5 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60">
                <span className="text-[10px] font-bold text-slate-400 px-2 uppercase">Range:</span>
                {[1, 4, 12, 26, 52].map((w) => (
                  <button
                    key={w}
                    onClick={() => setWeeksToShow(w)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono transition-all ${
                      weeksToShow === w
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {w}W
                  </button>
                ))}
              </div>

              {/* Search Box */}
              <div className="relative flex-1 min-w-[180px] max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter habits..."
                  className="w-full pl-9 pr-4 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 placeholder-slate-500 text-xs focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
                <button
                  onClick={() => setSelectedCategory('All')}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    selectedCategory === 'All'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  All
                </button>
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                      selectedCategory === cat
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

            </div>

            {/* HABIT CARDS LIST */}
            {filteredHabits.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center rounded-3xl bg-slate-900 border border-slate-800 p-8">
                <Sparkles className="w-12 h-12 text-indigo-400 mb-3 animate-pulse" />
                <h3 className="text-base font-bold text-slate-200 mb-1">No habits found</h3>
                <p className="text-xs text-slate-400 max-w-xs mb-4">
                  {searchQuery || selectedCategory !== 'All'
                    ? 'Try adjusting your search query or category filter.'
                    : 'Start your journey by creating your first habit!'}
                </p>
                <button
                  onClick={() => {
                    setEditingHabit(null);
                    setIsEditModalOpen(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md"
                >
                  + Create Habit
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredHabits.map((habit, index) => (
                  <HabitCard
                    key={habit.id}
                    habit={habit}
                    index={index}
                    weeksToShow={weeksToShow}
                    hasNotes={Boolean(habitNotes[habit.id])}
                    onLog={handleLogHabit}
                    onSetCustomCount={handleSetCustomCount}
                    onOpenInsight={(id) => {
                      const target = habits.find((h) => h.id === id);
                      if (target) {
                        setSelectedInsightHabit(target);
                        setIsInsightModalOpen(true);
                      }
                    }}
                    onEdit={(h) => {
                      setEditingHabit(h);
                      setIsEditModalOpen(true);
                    }}
                    onClone={handleCloneHabit}
                    onArchive={handleArchiveHabit}
                    onDelete={handleDeleteHabit}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                  />
                ))}
              </div>
            )}

          </div>
        )}

        {/* TAB CONTENT: STATS */}
        {activeTab === 'stats' && <StatsDashboard habits={habits} />}

        {/* TAB CONTENT: ARCHIVE */}
        {activeTab === 'archive' && (
          <ArchiveTab
            archivedHabits={archivedHabits}
            onUnarchive={handleUnarchiveHabit}
            onPermanentDelete={handlePermanentDeleteArchived}
          />
        )}

      </main>

      {/* MODALS */}
      <EditHabitModal
        isOpen={isEditModalOpen}
        editingHabit={editingHabit}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSaveHabit}
      />

      <InsightModal
        isOpen={isInsightModalOpen}
        habit={selectedInsightHabit}
        noteText={selectedInsightHabit ? habitNotes[selectedInsightHabit.id] || '' : ''}
        allNotes={habitNotes}
        onClose={() => setIsInsightModalOpen(false)}
        onSaveNote={handleSaveNote}
        onDeleteNote={handleDeleteNote}
      />

      <BadgesModal
        isOpen={isBadgesModalOpen}
        onClose={() => setIsBadgesModalOpen(false)}
        stats={stats}
      />

      <DeleteHabitModal
        isOpen={Boolean(deletingHabitTarget)}
        habit={deletingHabitTarget}
        onClose={() => setDeletingHabitTarget(null)}
        onConfirmDelete={handleConfirmDeleteHabit}
        onArchiveInstead={handleArchiveHabit}
      />

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        habits={habits}
        onClose={() => setIsCommandPaletteOpen(false)}
        onLogHabit={handleLogHabit}
        onOpenNewHabit={() => {
          setEditingHabit(null);
          setIsEditModalOpen(true);
        }}
        onOpenTemplates={() => setIsTemplatesModalOpen(true)}
        onOpenAICoach={() => setIsAICoachModalOpen(true)}
        onOpenRoutineFlow={() => setIsRoutineFlowOpen(true)}
      />

      <TemplatesModal
        isOpen={isTemplatesModalOpen}
        onClose={() => setIsTemplatesModalOpen(false)}
        existingHabitNames={habits.map((h) => h.name)}
        onAddTemplate={(tmpl) => {
          setEditingHabit(null);
          handleSaveHabit({
            name: tmpl.name,
            icon: tmpl.icon,
            color: tmpl.color,
            goal: tmpl.goal,
            category: tmpl.category,
          });
        }}
      />

      <AICoachModal
        isOpen={isAICoachModalOpen}
        habits={habits}
        stats={stats}
        onClose={() => setIsAICoachModalOpen(false)}
        onAddHabitFromAI={(name, category, icon, goal) => {
          handleSaveHabit({ name, category, icon, goal, color: '#818cf8' });
          setIsAICoachModalOpen(false);
        }}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        currentUser={currentUser}
        onClose={() => setIsAuthModalOpen(false)}
        onLogin={handleUserLogin}
        onLogout={handleUserLogout}
        habits={habits}
        archivedHabits={archivedHabits}
        stats={stats}
        habitNotes={habitNotes}
        onRestoreData={handleRestoreData}
        onClearAccountData={handleClearAccountData}
      />

      <RoutineFlowModal
        isOpen={isRoutineFlowOpen}
        onClose={() => setIsRoutineFlowOpen(false)}
        routines={routines}
        onUpdateRoutines={(updated) => setRoutines(updated)}
      />


      {/* UNDO TOAST NOTIFICATION */}
      {undoToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-full bg-slate-900 border border-slate-700 text-slate-100 text-xs font-semibold shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom-5">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{undoToast.message}</span>
          {undoToast.action && undoToast.action.toString() !== '() => {}' && (
            <button
              onClick={undoToast.action}
              className="flex items-center gap-1 font-bold text-indigo-400 hover:text-indigo-300 underline underline-offset-2 ml-2"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>Undo</span>
            </button>
          )}
        </div>
      )}

    </div>
  );
}
