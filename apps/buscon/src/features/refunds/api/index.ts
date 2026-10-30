import { api } from '@/lib/api/client';

export interface RefundRequest {
  id: string;
  bookingId: string;
  bookingReference: string;
  amountPaise: number;
  reason: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'INITIATED';
  requestedAt: string;
}

export const refundsApi = {
  // Backend: GET /admin/refunds (read-only)
  list: async (): Promise<RefundRequest[]> => {
    const res = await api.get<RefundRequest[]>('/admin/refunds');
    return res.data;
  }
  // No process endpoint exists in the backend.
  // The admin-initiated refund flow uses POST /admin/payments/:id/refund
  // which requires a payment ID (not refund ID) and is triggered from the Payments tab (Phase 2).
};