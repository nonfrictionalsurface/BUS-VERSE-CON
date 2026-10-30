'use client';

import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { TicketData } from '../types';
import { BookingResponse } from '@/features/booking/types';
import { formatISTTime, formatISTDate } from '@/lib/utils/formatters';
import { ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface TicketStubProps {
  booking: BookingResponse;
  ticket: TicketData;
}

/**
 * Dual-Mode Cryptographic Boarding Pass
 * Specified in Design_guide.html Section 7
 * Isolates raw Ed25519 QR wire payload on an optical high-contrast island
 */
export function TicketStub({ booking, ticket }: TicketStubProps) {
  const isBoarded = ticket.status === 'BOARDED';
  const isCancelled = booking.status === 'CANCELLED' || ticket.status === 'CANCELLED';

  const originName = booking.schedule?.route?.originCity?.name || booking.boardingStand?.name || 'Origin';
  const destName = booking.schedule?.route?.destinationCity?.name || booking.droppingStand?.name || 'Destination';

  return (
    <div className="w-full max-w-md mx-auto rounded-3xl bg-surface-card border-2 border-border-strong shadow-floating overflow-hidden relative">
      {/* Upper Ticket Section */}
      <div className="p-6 sm:p-8 pb-10 border-b-2 border-dashed border-border-strong relative">
        {/* Scalloped Side Cutouts */}
        <div className="absolute -bottom-4 -left-4 w-8 h-8 rounded-full bg-canvas border-r-2 border-border-strong" />
        <div className="absolute -bottom-4 -right-4 w-8 h-8 rounded-full bg-canvas border-l-2 border-border-strong" />

        {/* Status Ribbon */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] font-mono font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-brand-subtle text-brand-primary border border-brand-border">
            Verified Pass
          </span>

          {isBoarded ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-signal-emerald px-2 py-0.5 rounded-full bg-signal-subtle border border-signal-emerald">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Boarded
            </span>
          ) : isCancelled ? (
            <span className="text-[11px] font-bold text-danger-crimson px-2 py-0.5 rounded-full bg-danger-subtle border border-danger-crimson">
              Cancelled
            </span>
          ) : (
            <span className="text-[11px] font-mono font-bold text-signal-emerald flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-signal-emerald animate-pulse" />
              Confirmed
            </span>
          )}
        </div>

        {/* Route City Pair */}
        <div className="flex items-center justify-between gap-2 my-2">
          <div className="text-xl sm:text-2xl font-black text-ink-bright tracking-tight">
            {originName.toUpperCase()}
          </div>
          <ArrowRight className="w-5 h-5 text-telemetry-cyan flex-shrink-0" />
          <div className="text-xl sm:text-2xl font-black text-ink-bright tracking-tight text-right">
            {destName.toUpperCase()}
          </div>
        </div>

        <div className="text-xs text-ink-muted">
          {booking.boardingStand?.name} → {booking.droppingStand?.name}
        </div>

        {/* Departure Details Grid */}
        <div className="grid grid-cols-3 gap-2 mt-6 pt-4 border-t border-border-hairline text-xs">
          <div>
            <span className="text-[10px] font-mono uppercase text-ink-muted block">Departure</span>
            <span className="font-extrabold text-ink-bright">
              {booking.schedule?.departureTime ? formatISTTime(booking.schedule.departureTime) : '--:--'}
            </span>
            <span className="text-[10px] text-ink-secondary block">
              {booking.schedule?.departureTime ? formatISTDate(booking.schedule.departureTime) : ''}
            </span>
          </div>

          <div className="text-center">
            <span className="text-[10px] font-mono uppercase text-ink-muted block">Seat Alloc</span>
            <span className="font-extrabold text-brand-primary text-sm">
              {booking.passengers?.map((p) => p.seatLabel).join(', ') || 'Assigned'}
            </span>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-mono uppercase text-ink-muted block">Coach Class</span>
            <span className="font-extrabold text-ink-bright">
              {booking.schedule?.busType || 'AC Executive'}
            </span>
          </div>
        </div>
      </div>

      {/* Lower Stub with Optical White QR Island */}
      <div className="p-6 bg-surface-hover flex items-center justify-between gap-4">
        <div>
          <div className="text-sm font-bold text-ink-bright">
            {booking.passengers?.[0]?.name || 'Passenger'}
          </div>
          <div className="text-xs font-mono text-ink-muted mt-0.5">
            PNR: <span className="text-ink-bright font-bold">{booking.bookingReference}</span>
          </div>
          <div className="inline-flex items-center gap-1 text-[10px] text-signal-emerald font-semibold mt-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Ed25519 Signed</span>
          </div>
        </div>

        {/* Optical Scan Island: Pure white box preserves camera readability in dark mode */}
        <div className="w-[104px] h-[104px] bg-white p-2 rounded-2xl border border-border-subtle shadow-ambient flex items-center justify-center flex-shrink-0">
          {ticket.qrPayload ? (
            <QRCodeSVG
              value={ticket.qrPayload}
              size={88}
              level="M"
              bgColor="#FFFFFF"
              fgColor="#000000"
            />
          ) : (
            <div className="text-[10px] font-mono text-ink-muted text-center">QR NOT ISSUED</div>
          )}
        </div>
      </div>
    </div>
  );
}