export { AuthModal } from './components/AuthModal';
export { ProfileMenuModal } from './components/ProfileMenuModal';
export { SignInRequired } from './components/SignInRequired';

export { useOtpFlow } from './hooks/useOtpFlow';
export type { OtpStep, UseOtpFlowResult } from './hooks/useOtpFlow';

export { requestOtp, verifyOtp, getMe } from './api/auth.api';
export type {
  OtpIntent,
  OtpRequestPayload,
  OtpVerifyPayload,
  OtpRequestResponse,
} from './api/auth.api';
