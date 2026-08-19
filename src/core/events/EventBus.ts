/**
 * EventBus.ts
 * Enterprise Pub/Sub Event Observer Pattern implementation
 */

import { Logger } from '../../utils/logger';

export type EventType =
  | 'HABIT_COMPLETED'
  | 'HABIT_CREATED'
  | 'HABIT_UPDATED'
  | 'HABIT_DELETED'
  | 'HABIT_ARCHIVED'
  | 'LEVEL_UP'
  | 'XP_GAINED'
  | 'ROUTINE_COMPLETED'
  | 'BACKUP_RESTORED'
  | 'STATE_CHANGED'
  | 'TELEMETRY_RECORDED';

export type EventCallback<T = unknown> = (data: T) => void;

export class EventBus {
  private static instance: EventBus;
  private listeners: Map<EventType, Set<EventCallback<any>>> = new Map();
  private eventCount = 0;

  private constructor() {}

  public static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  public subscribe<T = unknown>(event: EventType, callback: EventCallback<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  public publish<T = unknown>(event: EventType, payload?: T): void {
    this.eventCount++;
    Logger.debug('EventBus', `Publishing event: ${event}`, payload);
    const subscribers = this.listeners.get(event);
    if (subscribers) {
      subscribers.forEach((callback) => {
        try {
          callback(payload);
        } catch (err) {
          Logger.error('EventBus', `Error executing callback for event ${event}`, err);
        }
      });
    }
  }

  public getEventCount(): number {
    return this.eventCount;
  }

  public clearAllListeners(): void {
    this.listeners.clear();
  }
}

export const eventBus = EventBus.getInstance();
