import { api } from '@/lib/api/client';
import { CreateBookingRequest, CreateBookingResponse, BookingResponse } from '../types';

export async function createBooking(payload: CreateBookingRequest): Promise<CreateBookingResponse> {
  const response = await api.post<CreateBookingResponse>('/passenger/bookings', payload);
  return response.data;
}

export async function fetchBookingDetail(bookingId: string): Promise<BookingResponse> {
  const response = await api.get<BookingResponse>(`/passenger/bookings/${bookingId}`);
  return response.data;
}

export async function fetchMyBookings(): Promise<any[]> {
  const response = await api.get<any>('/passenger/bookings');
  if (Array.isArray(response.data)) {
    return response.data;
  }
  if (Array.isArray(response.data?.items)) {
    return response.data.items;
  }
  if (Array.isArray(response.data?.bookings)) {
    return response.data.bookings;
  }
  return [];
}