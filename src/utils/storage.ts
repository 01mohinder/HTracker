import { Habit, Category, Achievement, ThemeMode, HabitNote, UserStats } from '../types';

export const CATEGORIES: Category[] = [
  'Health',
  'Work',
  'Mind',
  'Fitness',
  'Finance',
  'Social',
  'Learning',
  'Creativity',
  'Routine',
  'Custom',
];

export const DEFAULT_EMOJIS = [
  '❤️', '🏋️', '📖', '💼', '🧠', '🏃', '💰', '👥',
  '📚', '🎨', '🔄', '✨', '⭐', '🌱', '🎯', '💪',
  '🧘', '🎵', '☀️', '🌙', '💧', '🚶', '🍎', '✍️',
  '📝', '💤', '🔑', '🎉', '🔥', '⚡', '🏆', '💎'
];

export const ALL_ACHIEVEMENTS: Achievement[] = [
  { id: 'first_habit', label: 'First Grind', icon: '🌱', desc: 'Create your first habit' },
  { id: 'streak_7', label: 'Week Warrior', icon: '🔥', desc: 'Maintain a 7-day habit streak' },
  { id: 'streak_30', label: 'Monthly Monster', icon: '💪', desc: 'Maintain a 30-day streak' },
  { id: 'streak_100', label: 'Centurion', icon: '👑', desc: 'Reach a 100-day streak' },
  { id: 'habits_5', label: 'System Builder', icon: '🧩', desc: 'Track 5 active habits simultaneously' },
  { id: 'total_100', label: 'Century Club', icon: '💯', desc: 'Log 100 total habit completions' },
  { id: 'total_500', label: 'High Achiever', icon: '🎯', desc: 'Log 500 total completions' },
  { id: 'grind_90', label: 'Grind God', icon: '⚡', desc: 'Achieve an overall Grind Score of 90+' },
  { id: 'level_5', label: 'Level 5', icon: '⭐', desc: 'Advance to Level 5' },
  { id: 'level_10', label: 'Level 10 Master', icon: '🌟', desc: 'Advance to Level 10' }
];

export function formatDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function subWeeks(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() - n * 7);
  return r;
}

export function startOfWeek(d: Date, startDay = 1): Date {
  const day = d.getDay();
  const diff = day < startDay ? 7 - startDay + day : day - startDay;
  const r = new Date(d);
  r.setDate(d.getDate() - diff);
  r.setHours(0, 0, 0, 0);
  return r;
}

export function isFuture(d: Date): boolean {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return d > t;
}

export function generateId(): string {
  return Date.now() + '_' + Math.random().toString(36).slice(2, 7);
}

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function calcStreak(completions: Record<string, number>): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let streak = 0;
  let cursor = new Date(today);

  // Check today first. If not logged today, check if yesterday was logged to preserve ongoing streak.
  const todayKey = formatDate(cursor);
  if (!completions[todayKey] || completions[todayKey] === 0) {
    cursor.setDate(cursor.getDate() - 1);
  }

  while (true) {
    const k = formatDate(cursor);
    if (completions[k] && completions[k] > 0) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

export function calcBestStreak(completions: Record<string, number>): number {
  const dates = Object.keys(completions)
    .filter((k) => completions[k] > 0)
    .map((k) => new Date(k))
    .sort((a, b) => a.getTime() - b.getTime());

  if (!dates.length) return 0;
  let best = 0;
  let current = 1;

  for (let i = 1; i < dates.length; i++) {
    const diffDays = Math.round(
      (dates[i].getTime() - dates[i - 1].getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diffDays === 1) {
      current++;
    } else if (diffDays > 1) {
      best = Math.max(best, current);
      current = 1;
    }
  }
  return Math.max(best, current);
}

export function calcMissed(completions: Record<string, number>, days = 30): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let missed = 0;
  for (let i = 0; i < days; i++) {
    const d = addDays(today, -i);
    const k = formatDate(d);
    if (!completions[k] || completions[k] === 0) {
      missed++;
    }
  }
  return missed;
}

export function calcRate(completions: Record<string, number>, days = 30): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let done = 0;
  for (let i = 0; i < days; i++) {
    const d = addDays(today, -i);
    const k = formatDate(d);
    if (completions[k] && completions[k] > 0) {
      done++;
    }
  }
  return days > 0 ? Math.round((done / days) * 100) : 0;
}

export function calcHabitGrindScore(habit: Habit): number {
  const streak = calcStreak(habit.completions);
  const rate = calcRate(habit.completions, 30);
  const total = Object.values(habit.completions).reduce((a: number, b: number) => a + b, 0);
  const goal = habit.goal || 5;
  const daysLogged = Object.keys(habit.completions).length || 1;
  const avgWeekly = (total / daysLogged) * 7;
  const goalRatio = Math.min(avgWeekly / goal, 1);

  const score = streak * 0.35 + rate * 0.35 + goalRatio * 30;
  return clamp(Math.round(score), 0, 100);
}

export function xpForLevel(lvl: number): number {
  return Math.floor(60 * Math.pow(lvl, 1.35) + 40);
}

export function recalculateStatsFromCompletions(
  habits: Habit[],
  archived: Habit[] = [],
  currentStats?: UserStats
): UserStats {
  const allHabits = [...habits, ...archived];
  let totalCompletions = 0;

  allHabits.forEach((h) => {
    totalCompletions += Object.values(h.completions || {}).reduce((a: number, b: number) => a + b, 0);
  });

  const rawXp = totalCompletions * 15;
  let level = 1;
  let tempXp = rawXp;

  while (tempXp >= xpForLevel(level)) {
    tempXp -= xpForLevel(level);
    level++;
  }

  // Calculate Grind Score
  let totalScore = 0;
  habits.forEach((h) => {
    totalScore += calcHabitGrindScore(h);
  });
  const avgScore = habits.length ? Math.round(totalScore / habits.length) : 0;

  // Preserve unlocked achievements or grant based on level/completions
  const achievements = new Set<string>(currentStats?.achievements || []);
  if (totalCompletions > 0) achievements.add('first_habit');
  if (totalCompletions >= 100) achievements.add('total_100');
  if (totalCompletions >= 500) achievements.add('total_500');
  if (level >= 5) achievements.add('level_5');
  if (level >= 10) achievements.add('level_10');
  if (avgScore >= 90) achievements.add('grind_90');

  return {
    level,
    xp: tempXp,
    totalCompletions,
    grindScore: avgScore,
    streakFreezes: Math.max(currentStats?.streakFreezes || 1, Math.floor(level / 2) + 1),
    achievements: Array.from(achievements),
  };
}

export function getXpForHabit(habit: Habit): number {
  const streak = calcStreak(habit.completions);
  const rate = calcRate(habit.completions, 30);
  return 10 + Math.min(streak * 2, 25) + (rate > 75 ? 10 : 0);
}

export function getInitialSampleHabits(): Habit[] {
  return [];
}
