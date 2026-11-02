// Central endpoint paths — from 07-API-AND-REALTIME-CONTRACTS + backend router dump.

export const EP = {
  // Auth
  otpRequest: '/passenger/auth/otp/request',
  otpVerify: '/passenger/auth/otp/verify',
  refresh: (surface: 'passenger' | 'operator' | 'driver' | 'admin') => `/${surface}/auth/refresh`,
  logout: '/passenger/auth/logout',
  me: '/passenger/me',

  // Public
  cities: '/public/cities',
  cityStands: (cityId: string) => `/public/cities/${cityId}/stands`,
  search: '/public/search',
  scheduleDetail: (id: string) => `/public/schedules/${id}`,

  // Seat locks + availability
  availability: (scheduleId: string) => `/passenger/schedules/${scheduleId}/availability`,
  seatLockCreate: '/passenger/seat-locks',
  seatLocksActive: '/passenger/seat-locks/active',
  seatLockRelease: (lockId: string) => `/passenger/seat-locks/${lockId}`,

  // Bookings
  bookingCreate: '/passenger/bookings',
  bookings: '/passenger/bookings',
  booking: (id: string) => `/passenger/bookings/${id}`,
  bookingTicket: (id: string) => `/passenger/bookings/${id}/ticket`,
  refundPreview: (id: string) => `/passenger/bookings/${id}/refund-preview`,
  cancelBooking: (id: string) => `/passenger/bookings/${id}/cancel`,

  // Payments
  paymentCreate: '/passenger/payments',
  payment: (id: string) => `/passenger/payments/${id}`,

  // Trip live
  tripLive: (id: string) => `/passenger/trips/${id}/live`,
  tripMap: (id: string) => `/passenger/trips/${id}/map`,
} as const;