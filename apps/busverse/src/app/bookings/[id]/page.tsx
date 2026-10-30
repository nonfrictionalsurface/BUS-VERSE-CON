'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useWsEvent } from '@/lib/ws/useWsEvent';
import { fetchBookingDetail } from '@/features/booking/api/booking.api';
import { fetchBookingTicket, fetchRefundPreview } from '@/features/tickets/api/tickets.api';
import { BookingResponse } from '@/features/booking/types';
import { TicketData, RefundPreviewData } from '@/features/tickets/types';
import { TicketStub } from '@/features/tickets/components/TicketStub';
import { CancelModal } from '@/features/tickets/components/CancelModal';
import { TransitLoader } from '@/components/brand/TransitLoader';
import { ThemeToggle } from '@/lib/theme/ThemeToggle';
import { BusVerseLogo } from '@/components/brand/BusVerseLogo';
import { ArrowLeft, Radio, Trash2, AlertCircle, RefreshCw } from 'lucide-react';

export default function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const bookingId = resolvedParams.id;
  const router = useRouter();

  const [booking, setBooking] = useState<BookingResponse | null>(null);
  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [refundPreview, setRefundPreview] = useState<RefundPreviewData | null>(null);

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  const loadTicketAndBooking = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const bookingData = await fetchBookingDetail(bookingId);
      setBooking(bookingData);

      const ticketData = await fetchBookingTicket(bookingId);
      setTicket(ticketData);

      // Pre-fetch cancellation refund preview if booking is confirmed
      if (bookingData.status === 'CONFIRMED') {
        const preview = await fetchRefundPreview(bookingId).catch(() => null);
        setRefundPreview(preview);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Unable to retrieve ticket pass.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTicketAndBooking();
  }, [bookingId]);

  // Real-time: update ticket status if driver scans QR
  useWsEvent(`booking:${bookingId}`, 'boarding:verified', () => {
    setTicket((prev) => (prev ? { ...prev, status: 'BOARDED' } : null));
  });

  useWsEvent(`booking:${bookingId}`, 'booking:cancelled', () => {
    setBooking((prev) => (prev ? { ...prev, status: 'CANCELLED' } : null));
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <TransitLoader caption="VERIFYING CRYPTOGRAPHIC PASS" />
      </div>
    );
  }

  const isCancellable = booking?.status === 'CONFIRMED' && ticket?.status === 'ACTIVE';

  return (
    <div className="min-h-screen bg-canvas pb-20">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-surface-card/90 backdrop-blur-md border-b border-border-hairline shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link
            href="/bookings"
            className="inline-flex items-center gap-2 text-xs font-bold text-ink-secondary hover:text-brand-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>My Bookings</span>
          </Link>
          <div className="flex items-center gap-3">
            <BusVerseLogo size={32} variant="mark" />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 pt-6">
        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-danger-subtle border border-danger-crimson text-danger-crimson text-xs font-semibold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={loadTicketAndBooking} className="flex items-center gap-1 underline text-xs">
              <RefreshCw className="w-3 h-3" /> Retry
            </button>
          </div>
        )}

        {/* Boarding Pass Stub */}
        {booking && ticket && (
          <div className="mb-8">
            <TicketStub booking={booking} ticket={ticket} />
          </div>
        )}

        {/* Action Tray */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Live Tracking CTA */}
          <Link
            href={`/trips/${booking?.scheduleId || 'trip-demo'}/live`}
            className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-brand-primary text-white hover:bg-brand-hover shadow-glow flex items-center justify-center gap-2 text-xs font-bold transition-all"
          >
            <Radio className="w-4 h-4 animate-pulse text-telemetry-cyan" />
            <span>Track Bus Live on Map</span>
          </Link>

          {/* Cancellation Trigger */}
          {isCancellable && (
            <button
              type="button"
              onClick={() => setIsCancelModalOpen(true)}
              className="w-full sm:w-auto py-3 px-4 rounded-xl border border-border-strong bg-surface-card hover:bg-danger-subtle hover:border-danger-crimson text-ink-secondary hover:text-danger-crimson flex items-center justify-center gap-2 text-xs font-bold transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Cancel Booking</span>
            </button>
          )}
        </div>

        {/* Refund Cancellation Dialog */}
        <CancelModal
          isOpen={isCancelModalOpen}
          onClose={() => setIsCancelModalOpen(false)}
          bookingId={bookingId}
          preview={refundPreview}
          onCancelled={() => {
            loadTicketAndBooking();
          }}
        />
      </main>
    </div>
  );
}