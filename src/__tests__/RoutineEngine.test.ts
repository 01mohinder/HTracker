/**
 * RoutineEngine.test.ts
 * Vitest Unit Test Suite for Routine Stacking Engine
 */

import { describe, it, expect } from 'vitest';
import { RoutineEngine, Routine } from '../core/engine/RoutineEngine';

describe('RoutineEngine Unit Tests', () => {
  it('should calculate completion rate correctly', () => {
    const routine: Routine = {
      id: 'r1',
      title: 'Morning Routine',
      timeOfDay: 'Morning',
      icon: '🌅',
      color: '#818cf8',
      targetVelocityMinutes: 20,
      steps: [
        { id: 's1', title: 'Step 1', durationMinutes: 5, icon: '💧', completed: true },
        { id: 's2', title: 'Step 2', durationMinutes: 10, icon: '🧘', completed: false },
      ],
    };

    const rate = RoutineEngine.calculateCompletionRate(routine);
    expect(rate).toBe(50);
  });
});
