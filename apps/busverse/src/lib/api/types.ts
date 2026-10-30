/**
 * BusVerse API Response Envelopes
 * Strict conformity to 07-API-AND-REALTIME-CONTRACTS.md v1.4
 */

export interface ApiResponse<T> {
  data: T;
  meta?: {
    requestId?: string;
    durationMs?: number;
    nextCursor?: string | null;
    note?: string;
  };
}

export interface ApiErrorDetail {
  code: string;
  message: string;
  details?: Record<string, unknown> | Array<unknown>;
  requestId?: string;
}

export interface ApiErrorResponse {
  error: ApiErrorDetail;
}

export class ApiError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly details?: Record<string, unknown> | Array<unknown>;
  public readonly requestId?: string;

  constructor(status: number, errorDetail: ApiErrorDetail) {
    super(errorDetail.message);
    this.name = 'ApiError';
    this.status = status;
    this.code = errorDetail.code;
    this.details = errorDetail.details;
    this.requestId = errorDetail.requestId;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

// User & Session types
export interface UserSession {
  id: string;
  phone?: string;
  email?: string;
  name?: string;
  emailVerified?: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  user: UserSession;
}
