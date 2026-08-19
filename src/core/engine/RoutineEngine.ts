/**
 * RoutineEngine.ts
 * Core Calculation & Execution Engine for Novel Feature 1: Routine Stacking & Flow Matrix
 */

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

export class RoutineEngine {
  public static calculateCompletionRate(routine: Routine): number {
    if (!routine.steps.length) return 0;
    const completed = routine.steps.filter((s) => s.completed).length;
    return Math.round((completed / routine.steps.length) * 100);
  }

  public static getEstimatedDuration(routine: Routine): number {
    return routine.steps.reduce((acc, s) => acc + s.durationMinutes, 0);
  }

  public static getDefaultRoutines(): Routine[] {
    return [
      {
        id: 'rt_morning_prime',
        title: 'Morning Power Activation',
        timeOfDay: 'Morning',
        icon: '🌅',
        color: '#818cf8',
        targetVelocityMinutes: 30,
        steps: [
          { id: 's1', title: 'Hydration & Stretch', durationMinutes: 5, icon: '💧', completed: false },
          { id: 's2', title: 'Mindful Breathing', durationMinutes: 10, icon: '🧘', completed: false },
          { id: 's3', title: 'Daily Goal Review', durationMinutes: 15, icon: '🎯', completed: false },
        ],
      },
      {
        id: 'rt_deep_focus',
        title: 'Deep Focus Sprint',
        timeOfDay: 'Afternoon',
        icon: '⚡',
        color: '#fbbf24',
        targetVelocityMinutes: 45,
        steps: [
          { id: 's4', title: 'Clear Distractions & Notifications', durationMinutes: 5, icon: '🛡️', completed: false },
          { id: 's5', title: 'High Priority Code/Task Sprint', durationMinutes: 35, icon: '💻', completed: false },
          { id: 's6', title: 'Progress Log & Reflection', durationMinutes: 5, icon: '📝', completed: false },
        ],
      },
      {
        id: 'rt_evening_winddown',
        title: 'Night Recovery & Audit',
        timeOfDay: 'Evening',
        icon: '🌙',
        color: '#a78bfa',
        targetVelocityMinutes: 20,
        steps: [
          { id: 's7', title: 'Review Today Grind Score', durationMinutes: 5, icon: '📊', completed: false },
          { id: 's8', title: 'Book / Knowledge Reading', durationMinutes: 15, icon: '📖', completed: false },
        ],
      },
    ];
  }
}
