import { api, EP } from '../../../lib/api';
import type {
  BookingDetailDTO,
  BookingSummaryDTO,
  CancelBookingResultDTO,
  CreateBookingResultDTO,
  RefundPreviewDTO,
  TicketDTO,
} from '../../../types';

export interface CreateBookingInput {
  /** Any one of the held locks. The server checks every seatId below is held by this user. */
  lockId: string;
  boardingStandId: string;
  droppingStandId: string;
  passengers: Array<{ seatId: string; name: string; age?: number; gender?: 'MALE' | 'FEMALE' | 'OTHER' }>;
}

export const createBooking = (input: CreateBookingInput) => api.post<CreateBookingResultDTO>(EP.bookingCreate, input);
export const listBookings = (limit = 50) => api.get<BookingSummaryDTO[]>(`${EP.bookings}?limit=${limit}`);
export const getBooking = (id: string) => api.get<BookingDetailDTO>(EP.booking(id));
export const getTicket = (id: string) => api.get<TicketDTO>(EP.bookingTicket(id));
export const getRefundPreview = (id: string) => api.get<RefundPreviewDTO>(EP.refundPreview(id));
// The API client always sends a JSON content type, and Fastify rejects an empty JSON body.
export const cancelBooking = (id: string) => api.post<CancelBookingResultDTO>(EP.cancelBooking(id), {});
