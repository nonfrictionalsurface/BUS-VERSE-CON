import { api } from './client';

export const requestOtp = (phone: string) => api.post('/driver/auth/otp/request', { phone });
export const verifyOtp = (phone: string, otp: string, deviceFingerprint: string) => 
  api.post('/driver/auth/otp/verify', { phone, otp, deviceFingerprint });
export const fetchDriverMe = () => api.get('/driver/me');
export const fetchDriverConfig = () => api.get('/driver/config');