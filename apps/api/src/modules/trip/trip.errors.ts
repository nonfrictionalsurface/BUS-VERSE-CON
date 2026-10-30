import { errors } from '../../lib/errors.js';
import { TRIP_START_WINDOW_MINUTES } from './trip.types.js';

export const tripErrors = {
  notFound: () => errors.notFound('Trip not found'),
  notAssigned: () => errors.tripNotAssigned(),
  alreadyStarted: () => errors.tripAlreadyStarted(),
  notInProgress: () => errors.tripNotInProgress(),
  notActive: () => errors.tripNotActive(),
  outsideWindow: () => errors.tripOutsideWindow(TRIP_START_WINDOW_MINUTES),
  activeTripExists: (existingTripId: string) => errors.activeTripExists(existingTripId),

  driverNotVerified: () => errors.driverNotVerified(),
  driverBlocked: () => errors.driverBlocked(),
  licenseExpired: () => errors.licenseExpired(),
  busNotApproved: () => errors.busNotApproved(),
  busLayoutMissing: () => errors.busLayoutMissing(),
  scheduleCancelled: () => errors.scheduleCancelled(),

  invalidSignature: () => errors.invalidSignature(),
  invalidBooking: (reason?: string) => errors.invalidBooking(reason),
  invalidTrip: (reason?: string) => errors.invalidTrip(reason),
  scanExpired: () => errors.scanExpired(),
  tripCancelled: () => errors.tripNotActive(),

  payloadTooLarge: (bytes: number) =>
    errors.invalidRequest(`QR payload ${bytes}B exceeds ${500}B limit`, { bytes, limit: 500 }),
};