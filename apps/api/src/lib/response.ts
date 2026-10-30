/**
 * Standard response envelope.
 * Success: { data: T, meta?: { requestId?, durationMs?, ... } }
 * Error:   { error: { code, message, details?, requestId? } }
 */

export interface SuccessEnvelope<T> {
  data: T;
  meta?: {
    requestId?: string;
    durationMs?: number;
    [k: string]: unknown;
  };
}

export interface ErrorEnvelope {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    requestId?: string;
  };
}

export function success<T>(data: T, meta?: SuccessEnvelope<T>['meta']): SuccessEnvelope<T> {
  return meta ? { data, meta } : { data };
}

export function failure(
  code: string,
  message: string,
  details?: Record<string, unknown>,
  requestId?: string,
): ErrorEnvelope {
  return {
    error: {
      code,
      message,
      ...(details ? { details } : {}),
      ...(requestId ? { requestId } : {}),
    },
  };
}