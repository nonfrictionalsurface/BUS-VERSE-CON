import Razorpay from 'razorpay';
import crypto from 'node:crypto';

const key_id = process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder';
const key_secret = process.env.RAZORPAY_KEY_SECRET || 'secret_placeholder';

const client = new Razorpay({
  key_id,
  key_secret,
});

/**
 * The parts of the SDK we use, typed loosely on purpose: the SDK's overloaded typings reject valid
 * calls (and then infer `void`), which broke the build.
 */
interface RazorpayApi {
  orders: { create(p: Record<string, unknown>): Promise<{ id: string; amount: number | string; currency: string }> };
  payments: { refund(paymentId: string, p: Record<string, unknown>): Promise<{ id: string; amount?: number | string }> };
}
const api = client as unknown as RazorpayApi;

export interface CreateOrderParams {
  amountPaise: number | bigint;
  receipt: string;
  notes?: Record<string, string>;
}

export interface RazorpayOrderResult {
  orderId: string;
  amountPaise: number;
  currency: string;
  /** Hosted checkout is not used. The app opens checkout itself with keyId + orderId. */
  checkoutUrl: string | null;
  keyId: string;
  /** True when no real gateway was called (development). */
  mock: boolean;
}

export interface CreateRefundParams {
  /** The gateway payment id (pay_...) stored on the payment row. */
  paymentId: string;
  amountPaise: number | bigint;
  notes?: Record<string, string> | undefined;
}

export interface RazorpayRefundResult {
  refundId: string;
  amountPaise: number;
  /** True when no real gateway was called (development or a mock payment). */
  mock: boolean;
}

/** Pretend to be the gateway: explicit MOCK_PAYMENT=true, or no real keys outside production. */
function isMockMode(): boolean {
  // An explicit MOCK_PAYMENT=true always wins (demos, staging). Placeholder keys only count outside production.
  if (process.env.MOCK_PAYMENT?.toLowerCase() === 'true') return true;
  return (
    process.env.NODE_ENV !== 'production' &&
    (!process.env.RAZORPAY_KEY_SECRET ||
      process.env.RAZORPAY_KEY_SECRET.includes('placeholder') ||
      Boolean(process.env.RAZORPAY_KEY_ID?.includes('placeholder')))
  );
}

const mockId = (prefix: string): string => `${prefix}_mock_${crypto.randomBytes(8).toString('hex')}`;

export const razorpayAdapter = {
  async createOrder(params: CreateOrderParams): Promise<RazorpayOrderResult> {
    const amount = Number(params.amountPaise);

    // If explicit mock keys or offline dev mode, return mock order directly
    if (isMockMode()) {
      return { orderId: mockId('order'), amountPaise: amount, currency: 'INR', checkoutUrl: null, keyId: key_id, mock: true };
    }

    try {
      const order = await api.orders.create({
        amount,
        currency: 'INR',
        receipt: params.receipt,
        ...(params.notes ? { notes: params.notes } : {}),
      });

      return {
        orderId: order.id,
        amountPaise: Number(order.amount),
        currency: order.currency,
        checkoutUrl: null,
        keyId: key_id,
        mock: false,
      };
    } catch (err) {
      // In non-production, fall back to a mock order if Razorpay rejects the credentials (401)
      if (process.env.NODE_ENV !== 'production') {
        return { orderId: mockId('order'), amountPaise: amount, currency: 'INR', checkoutUrl: null, keyId: key_id, mock: true };
      }
      throw err;
    }
  },

  /** Refund a captured payment. Mock payments (development) are "refunded" without calling the gateway. */
  async createRefund(params: CreateRefundParams): Promise<RazorpayRefundResult> {
    const amount = Number(params.amountPaise);
    if (isMockMode() || /mock/i.test(params.paymentId)) {
      return { refundId: mockId('rfnd'), amountPaise: amount, mock: true };
    }
    const refund = await api.payments.refund(params.paymentId, {
      amount,
      ...(params.notes ? { notes: params.notes } : {}),
    });
    return { refundId: refund.id, amountPaise: Number(refund.amount ?? amount), mock: false };
  },

  /**
   * Verify a webhook against the RAW request body. The secret defaults to RAZORPAY_WEBHOOK_SECRET
   * (the webhook handler does not pass one). A bad length is a failed check, never an exception.
   */
  verifyWebhookSignature(
    body: string | Buffer,
    signature: string,
    secret: string = process.env.RAZORPAY_WEBHOOK_SECRET ?? '',
  ): boolean {
    if (!secret || !signature) return false;
    const expected = Buffer.from(crypto.createHmac('sha256', secret).update(body).digest('hex'));
    const given = Buffer.from(signature);
    return expected.length === given.length && crypto.timingSafeEqual(expected, given);
  },
};
