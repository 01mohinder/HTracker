/**
 * logger.ts
 * Enterprise Thread & Browser-Safe Structured Logger Subsystem
 */

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  module: string;
  message: string;
  details?: unknown;
}

export class Logger {
  private static logBuffer: LogEntry[] = [];
  private static readonly maxBufferSize = 200;

  private static log(level: LogLevel, moduleName: string, message: string, details?: unknown): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      module: moduleName,
      message,
      details,
    };

    Logger.logBuffer.unshift(entry);
    if (Logger.logBuffer.length > Logger.maxBufferSize) {
      Logger.logBuffer.pop();
    }

    const formatted = `[${entry.timestamp}] [${level}] [${moduleName}]: ${message}`;
    switch (level) {
      case 'DEBUG':
        console.debug(formatted, details ?? '');
        break;
      case 'INFO':
        console.info(formatted, details ?? '');
        break;
      case 'WARN':
        console.warn(formatted, details ?? '');
        break;
      case 'ERROR':
        console.error(formatted, details ?? '');
        break;
    }
  }

  public static debug(moduleName: string, message: string, details?: unknown): void {
    Logger.log('DEBUG', moduleName, message, details);
  }

  public static info(moduleName: string, message: string, details?: unknown): void {
    Logger.log('INFO', moduleName, message, details);
  }

  public static warn(moduleName: string, message: string, details?: unknown): void {
    Logger.log('WARN', moduleName, message, details);
  }

  public static error(moduleName: string, message: string, details?: unknown): void {
    Logger.log('ERROR', moduleName, message, details);
  }

  public static getLogs(): LogEntry[] {
    return [...Logger.logBuffer];
  }

  public static clearLogs(): void {
    Logger.logBuffer = [];
  }
}
