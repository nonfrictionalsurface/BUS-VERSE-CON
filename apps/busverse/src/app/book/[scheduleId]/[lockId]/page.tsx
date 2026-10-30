'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';
import { formatINR, formatISTTime } from '@/lib/utils/formatters';
import { fetchScheduleDetail } from '@/features/seats/api/seats.api';
import { createBooking } from '@/features/booking/api/booking.api';
import { PassengerManifestForm } from '@/features/booking/components/PassengerManifestForm';
import { PassengerInput } from '@/features/booking/types';
import { TransitLoader } from '@/components/brand/TransitLoader';
import { ThemeToggle } from '@/lib/theme/ThemeToggle';
import { BusVerseLogo } from '@/components/brand/BusVerseLogo';
import { ArrowLeft, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';

export default function BookingManifestPage({
  params,
}: {
  params: Promise<{ scheduleId: string; lockId: string }>;
}) {
  const resolvedParams = use(params);
  const { scheduleId, lockId } = resolvedParams;
  const router = useRouter();
  const { user } = useAuth();

  const [schedule, setSchedule] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [boardingStandId, setBoardingStandId] = useState('');
  const [droppingStandId, setDroppingStandId] = useState('');
  const [passengers, setPassengers] = useState<PassengerInput[]>([]);
  const [seatLabels, setSeatLabels] = useState<string[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const sched = await fetchScheduleDetail(scheduleId);
        setSchedule(sched);

        // Pre-select first and last route stand
        const stands = sched.route?.stands || [];
        if (stands.length >= 2) {
          setBoardingStandId(stands[0].stand.id);
          setDroppingStandId(stands[stands.length - 1].stand.id);
        }

        // Recover selected seat list from query params or sessionStorage
        let storedLocks: Array<{ seatId: string; seatLabel: string; lockId: string }> = [];

        if (typeof window !== 'undefined') {
          const urlParams = new URLSearchParams(window.location.search);
          const seatsParam = urlParams.get('seats');
          const labelsParam = urlParams.get('labels');

          if (seatsParam && labelsParam) {
            const ids = seatsParam.split(',');
            const labels = decodeURIComponent(labelsParam).split(',');
            storedLocks = ids.map((id, i) => ({
              seatId: id,
              seatLabel: labels[i] || `Seat ${i + 1}`,
              lockId,
            }));
          } else {
            const saved = sessionStorage.getItem('busverse_checkout_locks');
            if (saved) {
              storedLocks = JSON.parse(saved);
            }
          }
        }

        if (storedLocks.length === 0) {
          storedLocks = [{ seatId: 'primary-seat', seatLabel: 'A1', lockId }];
        }

        setSeatLabels(storedLocks.map((l) => l.seatLabel));
        setPassengers(
          storedLocks.map((l, idx) => ({
            seatId: l.seatId,
            name: idx === 0 ? user?.name || '' : '',
            age: 25,
            gender: 'MALE' as const,
          }))
        );
      } catch (err: any) {
        setErrorMsg(err.message || 'Could not load itinerary.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [scheduleId, lockId]);

  const handlePassengerChange = (index: number, updated: Partial<PassengerInput>) => {
    setPassengers((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...updated };
      return copy;
    });
  };

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!boardingStandId || !droppingStandId) {
      setErrorMsg('Please select distinct boarding and dropping stands.');
      return;
    }

    if (boardingStandId === droppingStandId) {
      setErrorMsg('Boarding and dropping stands must differ.');
      return;
    }

    // Verify all passenger names are filled
    const missingNameIndex = passengers.findIndex((p) => !p.name.trim());
    if (missingNameIndex !== -1) {
      setErrorMsg(`Please enter the legal name for Passenger ${missingNameIndex + 1}.`);
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    try {
      const booking = await createBooking({
        lockId,
        boardingStandId,
        droppingStandId,
        passengers: passengers.map((p) => ({
          seatId: p.seatId,
          name: p.name.trim(),
          age: Number(p.age) || 25,
          gender: p.gender || 'MALE',
        })),
      });

      router.push(`/pay/${booking.bookingId}`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Reservation could not be initialized. Your seat lock may have expired.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <TransitLoader caption="PREPARING MANIFEST" />
      </div>
    );
  }

  const standsList =
    schedule?.route?.stands?.map((s: any) => ({
      id: s.stand.id,
      name: s.stand.name,
      type: s.stand.type,
      sequence: s.sequence,
    })) || [];

  const farePaise =
    typeof schedule?.fare === 'object' ? schedule.fare.amountPaise : schedule?.fare || 0;
  const totalAmountPaise = farePaise * passengers.length;

  return (
    <div className="min-h-screen bg-canvas pb-28">
      <header className="sticky top-0 z-40 bg-surface-card/90 backdrop-blur-md border-b border-border-hairline shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link
            href={`/schedule/${scheduleId}`}
            className="inline-flex items-center gap-2 text-xs font-bold text-ink-secondary hover:text-brand-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Change Seats</span>
          </Link>
          <div className="flex items-center gap-3">
            <BusVerseLogo size={32} variant="mark" />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-6">
        {schedule && (
          <div className="mb-6 p-4 rounded-2xl bg-surface-card border border-border-hairline shadow-ambient flex items-center justify-between">
            <div>
              <div className="text-base font-extrabold text-ink-bright">
                {schedule.route.originCity.name} → {schedule.route.destinationCity.name}
              </div>
              <div className="text-xs text-ink-secondary mt-0.5">
                {schedule.operatorName} • Departs {formatISTTime(schedule.departureTime)}
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-mono uppercase text-ink-muted block">
                Total ({passengers.length} {passengers.length === 1 ? 'Seat' : 'Seats'})
              </span>
              <span className="text-xl font-extrabold text-ink-bright">{formatINR(totalAmountPaise)}</span>
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-danger-subtle border border-danger-crimson text-danger-crimson text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmitBooking}>
          <PassengerManifestForm
            stands={standsList}
            boardingStandId={boardingStandId}
            droppingStandId={droppingStandId}
            onBoardingChange={setBoardingStandId}
            onDroppingChange={setDroppingStandId}
            passengers={passengers}
            seatLabels={seatLabels}
            onPassengerChange={handlePassengerChange}
          />

          <div className="fixed bottom-0 left-0 right-0 z-40 bg-surface-card/95 backdrop-blur-md border-t border-border-strong shadow-modal p-4">
            <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
              <div>
                <div className="text-xs text-ink-muted">Confirmed Hold ({passengers.length} seats)</div>
                <div className="text-lg font-extrabold text-ink-bright">{formatINR(totalAmountPaise)}</div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 text-xs font-bold rounded-xl bg-brand-primary text-white hover:bg-brand-hover shadow-glow disabled:opacity-50 transition-all cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Reserving Booking...</span>
                  </>
                ) : (
                  <>
                    <span>Proceed to Payment</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}