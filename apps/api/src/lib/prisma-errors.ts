import { Prisma } from '@prisma/client';
import { errors } from './errors.js';

/**
 * Map Prisma errors to DomainErrors. Callers should wrap database writes
 * in try/catch and re-throw via this function.
 *
 * Used per locked decision D7 (row-scope + error mapping at repository boundary).
 */
export function rethrowPrismaError(err: unknown): never {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002': {
        const target = (err.meta?.target as string[] | string | undefined);
        const fields = Array.isArray(target) ? target.join(',') : String(target ?? '');
        if (fields.includes('phone')) throw errors.phoneAlreadyRegistered();
        if (fields.includes('email')) throw errors.emailAlreadyRegistered();
        if (fields.includes('gstin')) throw errors.gstinAlreadyRegistered();
        if (fields.includes('registration')) throw errors.busRegistrationExists();
        if (fields.includes('license')) throw errors.licenseAlreadyRegistered();
        if (fields.includes('booking_reference')) throw errors.bookingReferenceCollision();
        if (fields.includes('invoice_number')) throw errors.invoiceNumberCollision();
        throw errors.invalidRequest(`Unique constraint violation (${fields})`);
      }
      case 'P2025':
        throw errors.notFound();
      case 'P2003':
        throw errors.invalidRequest('Foreign key constraint violation');
      case 'P2000':
        throw errors.invalidRequest('Value too long for column');
      default:
        throw errors.internal(`Database error (${err.code})`);
    }
  }
  if (err instanceof Prisma.PrismaClientValidationError) {
    throw errors.invalidRequest('Invalid database operation');
  }
  throw err;
}