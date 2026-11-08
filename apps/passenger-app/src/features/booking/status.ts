import type { BadgeVariant } from '../../components/ui';
import type { BookingStatus } from '../../types';

const META: Record<BookingStatus, { label: string; variant: BadgeVariant }> = {
  PENDING: { label: 'Awaiting payment', variant: 'amber' },
  CONFIRMED: { label: 'Confirmed', variant: 'emerald' },
  CHECKED_IN: { label: 'Boarded', variant: 'cyan' },
  COMPLETED: { label: 'Completed', variant: 'slate' },
  CANCELLED: { label: 'Cancelled', variant: 'red' },
  OPERATOR_CANCELLED: { label: 'Cancelled by operator', variant: 'red' },
  REFUNDED: { label: 'Refunded', variant: 'slate' },
  EXPIRED: { label: 'Expired', variant: 'slate' },
  FAILED: { label: 'Failed', variant: 'red' },
};

export const statusMeta = (s: BookingStatus): { label: string; variant: BadgeVariant } => META[s];

export type Bucket = 'upcoming' | 'past' | 'cancelled';

const DEAD: ReadonlySet<BookingStatus> = new Set<BookingStatus>(['CANCELLED', 'OPERATOR_CANCELLED', 'REFUNDED', 'EXPIRED', 'FAILED']);

export function bucketOf(b: { status: BookingStatus; departureTime: string }, now = Date.now()): Bucket {
  if (DEAD.has(b.status)) return 'cancelled';
  if (b.status === 'COMPLETED' || new Date(b.departureTime).getTime() < now) return 'past';
  return 'upcoming';
}

/** A confirmed booking can be cancelled until the bus leaves. */
export const canCancel = (b: { status: BookingStatus; departureTime: string }, now = Date.now()): boolean =>
  b.status === 'CONFIRMED' && new Date(b.departureTime).getTime() > now;
