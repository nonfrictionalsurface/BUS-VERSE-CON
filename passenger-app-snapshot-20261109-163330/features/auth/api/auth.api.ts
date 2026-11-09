import { api, EP } from '../../../lib/api';
import type { LoginResult, PassengerMeDTO } from '../../../types';

export type OtpIntent = 'LOGIN' | 'SIGNUP';

export interface OtpRequestPayload {
  phone?: string;
  email?: string;
  intent: OtpIntent;
}

export interface OtpVerifyPayload {
  phone?: string;
  email?: string;
  otp: string;
}

export interface OtpRequestResponse {
  expiresInSeconds: number;
}

export async function requestOtp(payload: OtpRequestPayload): Promise<OtpRequestResponse> {
  return api.post<OtpRequestResponse>(EP.otpRequest, payload);
}

export async function verifyOtp(payload: OtpVerifyPayload): Promise<LoginResult> {
  return api.post<LoginResult>(EP.otpVerify, payload);
}

export async function getMe(): Promise<PassengerMeDTO> {
  return api.get<PassengerMeDTO>(EP.me);
}