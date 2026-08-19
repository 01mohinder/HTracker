/**
 * RoutineService.ts
 * Enterprise Routine Stacking Service for Novel Feature 1
 */

import { Routine, RoutineStep, RoutineEngine } from '../core/engine/RoutineEngine';
import { eventBus } from '../core/events/EventBus';

export class RoutineService {
  public static toggleStepCompletion(routine: Routine, stepId: string): Routine {
    const updatedSteps = routine.steps.map((step) => {
      if (step.id === stepId) {
        return { ...step, completed: !step.completed };
      }
      return step;
    });

    const isAllCompleted = updatedSteps.every((s) => s.completed);
    const updatedRoutine: Routine = {
      ...routine,
      steps: updatedSteps,
      lastCompletedAt: isAllCompleted ? new Date().toISOString() : routine.lastCompletedAt,
    };

    if (isAllCompleted) {
      eventBus.publish('ROUTINE_COMPLETED', updatedRoutine);
    }

    return updatedRoutine;
  }

  public static resetRoutine(routine: Routine): Routine {
    return {
      ...routine,
      steps: routine.steps.map((s) => ({ ...s, completed: false })),
    };
  }

  public static addRoutineStep(routine: Routine, step: Omit<RoutineStep, 'id' | 'completed'>): Routine {
    const newStep: RoutineStep = {
      ...step,
      id: 'step_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5),
      completed: false,
    };
    return {
      ...routine,
      steps: [...routine.steps, newStep],
    };
  }
}
