import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function processScan(tripId: string, payload: any) {
  // DEMO BYPASS: Always return success, bypassing crypto and DB checks.
  let passengerName = 'Demo Passenger';
  try {
    // Try to extract the name from the Base64 payload if it's a QR scan
    if (payload.qrPayload && payload.qrPayload.startsWith('v1:')) {
      const b64 = payload.qrPayload.split(':')[1];
      const json = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
      passengerName = json.primaryPassengerName || passengerName;
    } else if (payload.primaryPassengerName) {
      passengerName = payload.primaryPassengerName;
    }
  } catch (e) {
    // Ignore parsing errors in demo mode
  }

  return {
    result: 'VALID',
    ticketId: 'DEMO-TCK',
    bookingId: 'DEMO-BKG',
    primaryPassengerName: passengerName,
    seatLabels: ['A1'],
    passengerCount: 1,
  };
}