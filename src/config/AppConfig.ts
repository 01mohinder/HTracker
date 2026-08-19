/**
 * AppConfig.ts
 * Enterprise Centralized Configuration Management (Singleton Pattern)
 */

export interface FeatureFlags {
  enableAICoach: boolean;
  enableRoutineStacking: boolean;
  enableTelemetryDiagnostics: boolean;
  enableSoundFX: boolean;
  enableGoogleDriveSync: boolean;
}

export class AppConfig {
  private static instance: AppConfig;

  public readonly appName = 'HT Grind';
  public readonly version = '3.5.0-Enterprise';
  public readonly environment = ((import.meta as any).env?.MODE as string) || 'production';
  public readonly isDev = (import.meta as any).env?.DEV ?? false;

  public readonly storageKeys = {
    activeState: 'HT_GRIND_STATE_V3',
    guestState: 'HT_GRIND_STATE_V3_GUEST',
    userStatePrefix: 'HT_GRIND_STATE_V3_USER_',
    gdriveBackups: 'HT_GDRIVE_BACKUPS',
    routinesState: 'HT_ROUTINES_STATE_V1',
    telemetryLogs: 'HT_TELEMETRY_LOGS_V1',
  };

  public readonly defaults = {
    levelXpBase: 60,
    levelXpExponent: 1.35,
    levelXpFlat: 40,
    defaultGoalDays: 5,
    streakFreezeLimit: 3,
  };

  public readonly featureFlags: FeatureFlags = {
    enableAICoach: true,
    enableRoutineStacking: true,
    enableTelemetryDiagnostics: true,
    enableSoundFX: true,
    enableGoogleDriveSync: true,
  };

  private constructor() {}

  public static getInstance(): AppConfig {
    if (!AppConfig.instance) {
      AppConfig.instance = new AppConfig();
    }
    return AppConfig.instance;
  }
}

export const appConfig = AppConfig.getInstance();
