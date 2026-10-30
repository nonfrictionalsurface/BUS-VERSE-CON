import { z } from 'zod';

const phoneSchema = z
  .string()
  .min(10)
  .max(20)
  .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone format');

const emailSchema = z.string().email().max(255);
const otpSchema = z.string().regex(/^\d{6}$/, 'OTP must be 6 digits');

const operatorPasswordSchema = z.string().min(12).max(128);
const adminPasswordSchema = z.string().min(16).max(128);

export const passengerOtpRequestSchema = z
  .object({
    phone: phoneSchema.optional(),
    email: emailSchema.optional(),
    intent: z.enum(['LOGIN', 'SIGNUP']),
  })
  .refine(
    (v) => (v.phone && !v.email) || (!v.phone && v.email),
    'Provide exactly one of phone or email',
  );

export const passengerOtpVerifySchema = z
  .object({
    phone: phoneSchema.optional(),
    email: emailSchema.optional(),
    otp: otpSchema,
  })
  .refine(
    (v) => (v.phone && !v.email) || (!v.phone && v.email),
    'Provide exactly one of phone or email',
  );

export const driverOtpRequestSchema = z.object({ phone: phoneSchema });

export const driverOtpVerifySchema = z.object({
  phone: phoneSchema,
  otp: otpSchema,
  deviceFingerprint: z.string().min(8).max(256),
});

export const operatorOtpRequestSchema = z.object({ phone: phoneSchema });

export const operatorOtpVerifySchema = z.object({
  phone: phoneSchema,
  otp: otpSchema,
});

export const operatorLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});

export const adminLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});

export const passwordResetRequestSchema = z
  .object({
    email: emailSchema.optional(),
    phone: phoneSchema.optional(),
  })
  .refine(
    (v) => (v.email && !v.phone) || (!v.email && v.phone),
    'Provide exactly one of email or phone',
  );

const resetVerifyBase = z
  .object({
    token: z.string().min(20).max(200).optional(),
    phone: phoneSchema.optional(),
    otp: otpSchema.optional(),
  })
  .refine((v) => {
    const hasToken = !!v.token;
    const hasOtp = !!(v.phone && v.otp);
    return hasToken !== hasOtp;
  }, 'Provide either token (email path) or phone+otp (fallback path), not both');

export const operatorPasswordResetVerifySchema = resetVerifyBase.and(
  z.object({ newPassword: operatorPasswordSchema }),
);

export const adminPasswordResetVerifySchema = resetVerifyBase.and(
  z.object({ newPassword: adminPasswordSchema }),
);

export const refreshSchema = z.object({});
export const logoutSchema = z.object({});

export const surfaceParamSchema = z.object({
  surface: z.enum(['passenger', 'driver', 'operator', 'admin']),
});
const gstinSchema = z
  .string()
  .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, 'Invalid GSTIN format');

const panSchema = z
  .string()
  .regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, 'Invalid PAN format');

export const operatorSignupSchema = z
  .object({
    companyName: z.string().min(2).max(200),
    gstin: gstinSchema,
    pan: panSchema,
    email: emailSchema,
    phone: phoneSchema,
    password: operatorPasswordSchema,
  })
  .strict();