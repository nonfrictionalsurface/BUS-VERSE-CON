import { errors } from '../../lib/errors.js';

export const identityErrors = {
  userNotFound: () => errors.notFound('User not found'),
  operatorNotFound: () => errors.invalidCredentials(),
  driverNotFound: () => errors.invalidCredentials(),
  adminNotFound: () => errors.invalidCredentials(),
  driverKycNotVerified: () => errors.forbidden('Driver KYC not verified'),
  driverNotInvited: () => errors.forbidden('Driver not invited by any operator'),
  noPasswordSet: () => errors.invalidCredentials(),
  deviceFingerprintMissing: () => errors.invalidRequest('Device fingerprint required'),
};