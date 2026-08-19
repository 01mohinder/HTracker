/**
 * errors.ts
 * Custom Enterprise Exception Hierarchy for HT Grind
 */

export class HTGrindBaseException extends Error {
  public readonly timestamp: string;
  public readonly code: string;

  constructor(message: string, code = 'ERR_BASE') {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.timestamp = new Date().toISOString();
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends HTGrindBaseException {
  constructor(message: string) {
    super(message, 'ERR_VALIDATION');
  }
}

export class StorageError extends HTGrindBaseException {
  constructor(message: string) {
    super(message, 'ERR_STORAGE');
  }
}

export class EngineExecutionError extends HTGrindBaseException {
  constructor(message: string) {
    super(message, 'ERR_ENGINE_EXECUTION');
  }
}

export class NetworkError extends HTGrindBaseException {
  constructor(message: string) {
    super(message, 'ERR_NETWORK');
  }
}
