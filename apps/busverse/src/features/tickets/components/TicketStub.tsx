'use client';

import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { formatINR, formatISTTime } from '@/lib/utils/formatters';
import { ArrowRight, ShieldCheck } from 'lucide-react';

interface TicketStubProps {
  booking: any;
  ticket: {
    qrPayload: string;
    status: string;
    issuedAt: string;
  };
}

export const TicketStub: React.FC<TicketStubProps> = ({ booking, ticket }) => {
  return (
    <div className="mx-auto w-full max-w-md overflow-hidden rounded-3xl border border-border-strong bg-surface-card shadow-modal">
      {/* Top Half */}
      <div className="relative border-b-2 border-dashed border-border-strong p-6 sm:p-8">
        {/* Cutout Notches */}
        <div className="absolute -bottom-4 -left-4 h-8 w-8 rounded-full border border-border-strong bg-canvas" />
        <div className="absolute -bottom-4 -right-4 h-8 w-8 rounded-full border border-border-strong bg-canvas" />

        <div className="flex items-center justify-between">
          <span className="font-sans text-2xl font-extrabold tracking-tight text-ink-bright">
            {booking.schedule?.route?.originCity?.name || 'ORIGIN'}
          </span>
          <ArrowRight className="h-6 w-6 text-telemetry-cyan" />
          <span className="font-sans text-2xl font-extrabold tracking-tight text-ink-bright">
            {booking.schedule?.route?.destinationCity?.name || 'DESTINATION'}
          </span>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-2 border-t border-border-hairline pt-4 text-xs">
          <div>
            <div className="font-mono text-[10px] text-ink-muted uppercase">DEPARTURE</div>
            <div className="font-mono font-bold text-ink-bright">
              {formatISTTime(booking.schedule?.departureTime)}
            </div>
          </div>
          <div>
            <div className="font-mono text-[10px] text-ink-muted uppercase">SEATS</div>
            <div className="font-mono font-bold text-brand-primary">
              {booking.passengers?.map((p: any) => p.seatLabel).join(', ')}
            </div>
          </div>
          <div>
            <div className="font-mono text-[10px] text-ink-muted uppercase">STATUS</div>
            <div className="font-bold text-signal-emerald uppercase">{booking.status}</div>
          </div>
        </div>
      </div>

      {/* Bottom Stub */}
      <div className="flex items-center justify-between bg-surface-hover p-6 sm:p-8">
        <div className="space-y-1">
          <div className="font-sans text-sm font-bold text-ink-bright">
            {booking.passengers?.[0]?.name || 'Passenger'}
          </div>
          <div className="font-mono text-xs text-ink-secondary">
            PNR: {booking.bookingReference}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-signal-emerald">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Ed25519 Signed</span>
          </div>
        </div>

        {/* QR Code Container */}
        <div className="rounded-xl border border-border-strong bg-white p-2 shadow-sm">
          <QRCodeSVG value={ticket.qrPayload} size={90} level="M" />
        </div>
      </div>
    </div>
  );
};
