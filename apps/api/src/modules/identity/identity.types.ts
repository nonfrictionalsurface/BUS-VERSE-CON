export type OtpIntent = 'LOGIN' | 'SIGNUP';
export type AuthSurface = 'passenger' | 'operator' | 'driver' | 'admin';

export type Role =
  | 'GUEST'
  | 'REGISTERED_PASSENGER'
  | 'OPERATOR_OWNER'
  | 'OPERATOR_MANAGER'
  | 'DRIVER'
  | 'SUPER_ADMIN';

export interface UserDTO {
  id: string;
  phone: string;
  email: string | null;
  emailVerified: boolean;
  name: string | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

/**
 * Flat shape per contract 07 §3.3 — accessToken/refreshToken/expiresAt sit at
 * the top level of `data`, not nested under `tokens`.
 */
export interface LoginResult extends AuthTokens {
  user: UserDTO;
}

export interface RefreshResult extends AuthTokens {}

export interface OtpRequestResult {
  expiresInSeconds: number;
}

export const ACCESS_TTL_SECONDS: Record<Role, number> = {
  GUEST: 900,
  REGISTERED_PASSENGER: 900,
  OPERATOR_OWNER: 900,
  OPERATOR_MANAGER: 900,
  DRIVER: 1800,
  SUPER_ADMIN: 300,
};

export const REFRESH_TTL_SECONDS: Record<Role, number> = {
  GUEST: 604800,
  REGISTERED_PASSENGER: 604800,
  OPERATOR_OWNER: 604800,
  OPERATOR_MANAGER: 604800,
  DRIVER: 2592000,
  SUPER_ADMIN: 86400,
};

export const OTP_TTL_SECONDS = 600;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_REQUEST_WINDOW_SECONDS = 600;
export const OTP_REQUEST_MAX = 3;
export const RESET_TOKEN_TTL_SECONDS = 1800;
export interface OperatorSignupResult {
  operatorId: string;
  userId: string;
  status: 'APPLIED';
  message: string;
}