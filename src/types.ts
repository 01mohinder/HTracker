export type Category =
  | 'Health'
  | 'Work'
  | 'Mind'
  | 'Fitness'
  | 'Finance'
  | 'Social'
  | 'Learning'
  | 'Creativity'
  | 'Routine'
  | 'Custom';

export type ThemeMode = 'dark' | 'light' | 'midnight' | 'cyberpunk' | 'emerald';

export interface Habit {
  id: string;
  name: string;
  icon: string;
  color: string;
  goal: number; // target days per week
  category: Category;
  completions: Record<string, number>; // date 'YYYY-MM-DD' => count
  createdAt?: string;
  archived?: boolean;
}

export interface Achievement {
  id: string;
  label: string;
  icon: string;
  desc: string;
  unlockedAt?: string;
}

export interface Quest {
  id: string;
  icon: string;
  label: string;
  xp: number;
  completed: boolean;
}

export interface UserStats {
  xp: number;
  level: number;
  grindScore: number;
  totalCompletions: number;
  streakFreezes: number;
  achievements: string[];
}

export interface HabitNote {
  habitId: string;
  note: string;
  updatedAt: string;
}

export interface UserAccount {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  provider: 'google' | 'email' | 'local' | 'guest';
  createdAt: string;
  returningVisitors?: number;
  dateOfFirstJoin?: string;
}

export interface GoogleDriveBackup {
  id: string;
  fileName: string;
  updatedAt: string;
  sizeBytes: number;
  habitCount: number;
  dataJson: string;
}

export interface RoutineStep {
  id: string;
  habitId?: string;
  title: string;
  durationMinutes: number;
  icon: string;
  completed: boolean;
}

export interface Routine {
  id: string;
  title: string;
  timeOfDay: 'Morning' | 'Afternoon' | 'Evening' | 'Anytime';
  icon: string;
  color: string;
  steps: RoutineStep[];
  targetVelocityMinutes: number;
  lastCompletedAt?: string;
}
