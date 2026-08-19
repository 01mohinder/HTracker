/**
 * EventBus.test.ts
 * Vitest Unit Test Suite for Pub/Sub Event Observer Pattern
 */

import { describe, it, expect } from 'vitest';
import { EventBus } from '../core/events/EventBus';

describe('EventBus Unit Tests', () => {
  it('should notify subscriber when event is published', () => {
    const bus = EventBus.getInstance();
    let receivedData: any = null;

    const unsub = bus.subscribe('HABIT_CREATED', (data) => {
      receivedData = data;
    });

    bus.publish('HABIT_CREATED', { name: 'Morning Walk' });

    expect(receivedData).toEqual({ name: 'Morning Walk' });
    unsub();
  });

  it('should unsubscribe cleanly', () => {
    const bus = EventBus.getInstance();
    let count = 0;

    const unsub = bus.subscribe('LEVEL_UP', () => {
      count++;
    });

    bus.publish('LEVEL_UP', {});
    expect(count).toBe(1);

    unsub();
    bus.publish('LEVEL_UP', {});
    expect(count).toBe(1);
  });
});
