/**
 * TelemetryService.ts
 * Enterprise System Telemetry & Health Diagnostics Subsystem
 */

import { Logger } from '../utils/logger';
import { eventBus } from '../core/events/EventBus';
import { HabitEngine } from '../core/engine/HabitEngine';

export interface SystemHealthReport {
  timestamp: string;
  uptimeSeconds: number;
  memoryUsageMB?: number;
  eventBusTotalEvents: number;
  cacheHitRatioPercent: number;
  activeLogsCount: number;
  status: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
}

export class TelemetryService {
  private static startTime = Date.now();
  private static executionTimers: Map<string, number> = new Map();

  public static startTimer(metricName: string): void {
    TelemetryService.executionTimers.set(metricName, performance.now());
  }

  public static endTimer(metricName: string): number {
    const start = TelemetryService.executionTimers.get(metricName);
    if (!start) return 0;
    const duration = performance.now() - start;
    TelemetryService.executionTimers.delete(metricName);
    Logger.debug('TelemetryService', `Execution metric '${metricName}': ${duration.toFixed(2)}ms`);
    return duration;
  }

  public static getSystemHealthReport(): SystemHealthReport {
    const uptimeSeconds = Math.round((Date.now() - TelemetryService.startTime) / 1000);
    const cacheStats = HabitEngine.getCacheStats();
    const eventCount = eventBus.getEventCount();
    const logs = Logger.getLogs();

    let memoryUsageMB: number | undefined;
    if (typeof window !== 'undefined' && (performance as any).memory) {
      memoryUsageMB = Math.round((performance as any).memory.usedJSHeapSize / (1024 * 1024));
    }

    const errorLogs = logs.filter((l) => l.level === 'ERROR');
    let status: SystemHealthReport['status'] = 'HEALTHY';
    if (errorLogs.length > 5) {
      status = 'DEGRADED';
    }
    if (errorLogs.length > 20) {
      status = 'CRITICAL';
    }

    const report: SystemHealthReport = {
      timestamp: new Date().toISOString(),
      uptimeSeconds,
      memoryUsageMB,
      eventBusTotalEvents: eventCount,
      cacheHitRatioPercent: cacheStats.hitRatio,
      activeLogsCount: logs.length,
      status,
    };

    eventBus.publish('TELEMETRY_RECORDED', report);
    return report;
  }
}
