'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useWsEvent } from '@/lib/ws/useWsEvent';
import { formatINR, formatISTTime } from '@/lib/utils/formatters';
import { fetchBookingDetail } from '@/features/booking/api/booking.api';
import { BookingResponse } from '@/features/booking/types';
import { BookingExpiryTimer } from '@/features/booking/components/BookingExpiryTimer';
import { initiatePayment, devMockConfirmPayment } from '@/features/payments/api/payments.api';
import { PaymentMethod } from '@/features/payments/types';
import { TransitLoader } from '@/components/brand/TransitLoader';
import { ThemeToggle } from '@/lib/theme/ThemeToggle';
import { BusVerseLogo } from '@/components/brand/BusVerseLogo';
import { CONFIG } from '@/lib/config';
import {
  CreditCard,
  QrCode,
  Building2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  ShieldAlert,
  Zap,
} from 'lucide-react';

export default function PaymentCheckoutPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const resolvedParams = use(params);
  const { bookingId } = resolvedParams;
  const router = useRouter();

  const [booking, setBooking] = useState<BookingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('UPI');
  const [paymentInitiating, setPaymentInitiating] = useState(false);
  const [activePaymentId, setActivePaymentId] = useState<string | null>(null);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load authoritative booking status and expiresAt
  const loadBooking = async () => {
    try {
      const data = await fetchBookingDetail(bookingId);
      setBooking(data);
      if (data.status === 'CONFIRMED') {
        setPaymentConfirmed(true);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Unable to retrieve reservation details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBooking();
  }, [bookingId]);

  // Real-time WebSocket: Listen for instant confirmation signals
  useWsEvent(`booking:${bookingId}`, 'payment:succeeded', () => {
    setPaymentConfirmed(true);
  });

  useWsEvent(`booking:${bookingId}`, 'booking:confirmed', () => {
    setPaymentConfirmed(true);
  });

  useWsEvent(`booking:${bookingId}`, 'booking:expired', () => {
    setErrorMsg('The 15-minute booking window elapsed. This reservation has expired.');
  });

  // Handle payment checkout initiation
  const handleInitiatePayment = async () => {
    setPaymentInitiating(true);
    setErrorMsg(null);
    try {
      const res = await initiatePayment({
        bookingId,
        method: selectedMethod,
      });

      setActivePaymentId(res.paymentId);

      // In development: prompt instant webhook bypass
      // In production: open Razorpay checkout modal or window.location.href = res.checkoutUrl
      if (res.checkoutUrl && !CONFIG.IS_DEV) {
        window.location.href = res.checkoutUrl;
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to initialize payment gateway.');
    } finally {
      setPaymentInitiating(false);
    }
  };

  // Dev shortcut: Simulate Razorpay payment.captured webhook
  const handleSimulateWebhook = async () => {
    if (!activePaymentId) return;
    setPaymentInitiating(true);
    try {
      await devMockConfirmPayment(activePaymentId);
      setPaymentConfirmed(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to execute simulated capture.');
    } finally {
      setPaymentInitiating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <TransitLoader caption="CONFIGURING GATEWAY" />
      </div>
    );
  }

  if (paymentConfirmed) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center p-6">
        <div className="w-full max-w-md p-8 rounded-3xl bg-surface-card border border-border-hairline shadow-floating text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-signal-subtle text-signal-emerald flex items-center justify-center mb-4">
            <CheckCircle2 className="w-10 h-10 animate-bounce" />
          </div>
          <h1 className="text-2xl font-extrabold text-ink-bright">Payment Confirmed!</h1>
          <p className="text-xs text-ink-secondary mt-1">
            Reference: <span className="font-mono font-bold text-ink-bright">{booking?.bookingReference}</span>
          </p>
          <p className="text-xs text-signal-emerald font-semibold mt-2">
            Your Ed25519 cryptographic boarding pass has been issued.
          </p>

          <button
            onClick={() => router.push(`/bookings/${bookingId}`)}
            className="mt-6 w-full py-3 text-xs font-bold rounded-xl bg-brand-primary text-white hover:bg-brand-hover shadow-glow flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>View Boarding Ticket</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas pb-20">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-surface-card/90 backdrop-blur-md border-b border-border-hairline shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BusVerseLogo size={32} variant="mark" />
            <span className="text-base font-extrabold text-ink-bright">Secure Checkout</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 pt-6">
        {/* Authoritative 15-Min Expiry Banner */}
        {booking?.expiresAt && (
          <div className="mb-6 flex justify-center">
            <BookingExpiryTimer
              expiresAt={booking.expiresAt}
              onExpire={() => {
                setErrorMsg('Your 15-minute reservation expired.');
              }}
            />
          </div>
        )}

        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-danger-subtle border border-danger-crimson text-danger-crimson text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Fare Summary Card */}
        <div className="p-6 rounded-2xl bg-surface-card border border-border-hairline shadow-ambient mb-6">
          <div className="flex items-center justify-between pb-4 border-b border-border-hairline">
            <div>
              <span className="text-[11px] font-mono uppercase text-ink-muted block">Booking Reference</span>
              <span className="text-sm font-mono font-extrabold text-ink-bright">
                {booking?.bookingReference || 'PENDING'}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[11px] font-mono uppercase text-ink-muted block">Amount Due</span>
              <span className="text-2xl font-extrabold text-ink-bright">
                {formatINR(booking?.totalFarePaise || 0)}
              </span>
            </div>
          </div>

          <div className="pt-4 space-y-2 text-xs">
            <div className="flex justify-between text-ink-secondary">
              <span>Seats Allocated:</span>
              <span className="font-semibold text-ink-bright">
                {booking?.passengers?.map((p) => p.seatLabel).join(', ') || 'Assigned'}
              </span>
            </div>
            <div className="flex justify-between text-ink-secondary">
              <span>Pickup Point:</span>
              <span className="font-semibold text-ink-bright">{booking?.boardingStand?.name || 'Main Stand'}</span>
            </div>
            <div className="flex justify-between text-ink-secondary">
              <span>Drop Point:</span>
              <span className="font-semibold text-ink-bright">{booking?.droppingStand?.name || 'Terminal'}</span>
            </div>
          </div>
        </div>

        {/* Payment Methods Card */}
        <div className="p-6 rounded-2xl bg-surface-card border border-border-hairline shadow-ambient mb-6">
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-ink-bright mb-4">
            Select Payment Method
          </h2>

          <div className="space-y-3">
            {/* UPI Option */}
            <label
              className={`flex items-center justify-between p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                selectedMethod === 'UPI'
                  ? 'border-brand-primary bg-brand-subtle'
                  : 'border-border-subtle bg-canvas hover:bg-surface-hover'
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="UPI"
                  checked={selectedMethod === 'UPI'}
                  onChange={() => setSelectedMethod('UPI')}
                  className="hidden"
                />
                <QrCode className="w-5 h-5 text-brand-primary" />
                <div>
                  <div className="text-xs font-bold text-ink-bright">UPI Instant Pay</div>
                  <div className="text-[10px] text-ink-secondary">GPay, Paytm, PhonePe, BHIM</div>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-signal-subtle text-signal-emerald">
                Fastest
              </span>
            </label>

            {/* Card Option */}
            <label
              className={`flex items-center justify-between p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                selectedMethod === 'CARD'
                  ? 'border-brand-primary bg-brand-subtle'
                  : 'border-border-subtle bg-canvas hover:bg-surface-hover'
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="CARD"
                  checked={selectedMethod === 'CARD'}
                  onChange={() => setSelectedMethod('CARD')}
                  className="hidden"
                />
                <CreditCard className="w-5 h-5 text-brand-primary" />
                <div>
                  <div className="text-xs font-bold text-ink-bright">Credit / Debit Card</div>
                  <div className="text-[10px] text-ink-secondary">Visa, Mastercard, RuPay</div>
                </div>
              </div>
            </label>

            {/* Netbanking Option */}
            <label
              className={`flex items-center justify-between p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                selectedMethod === 'NETBANKING'
                  ? 'border-brand-primary bg-brand-subtle'
                  : 'border-border-subtle bg-canvas hover:bg-surface-hover'
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="NETBANKING"
                  checked={selectedMethod === 'NETBANKING'}
                  onChange={() => setSelectedMethod('NETBANKING')}
                  className="hidden"
                />
                <Building2 className="w-5 h-5 text-brand-primary" />
                <div>
                  <div className="text-xs font-bold text-ink-bright">Net Banking</div>
                  <div className="text-[10px] text-ink-secondary">All major Indian banks</div>
                </div>
              </div>
            </label>
          </div>

          {/* Action Trigger */}
          <div className="mt-6 space-y-3">
            {!activePaymentId ? (
              <button
                type="button"
                onClick={handleInitiatePayment}
                disabled={paymentInitiating}
                className="w-full py-3.5 text-xs font-bold rounded-xl bg-brand-primary text-white hover:bg-brand-hover shadow-glow disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                {paymentInitiating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Pay {formatINR(booking?.totalFarePaise || 0)}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            ) : CONFIG.IS_DEV ? (
              /* Development Fast-Track Button */
              <button
                type="button"
                onClick={handleSimulateWebhook}
                disabled={paymentInitiating}
                className="w-full py-3.5 text-xs font-mono font-bold rounded-xl bg-signal-emerald text-white hover:opacity-90 shadow-glow flex items-center justify-center gap-2 cursor-pointer"
              >
                {paymentInitiating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    <span>[DEV] Simulate Razorpay Capture Webhook</span>
                  </>
                )}
              </button>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}