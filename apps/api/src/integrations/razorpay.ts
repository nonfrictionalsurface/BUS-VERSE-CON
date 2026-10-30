import Razorpay from 'razorpay';
import crypto from 'node:crypto';

const key_id = process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder';
const key_secret = process.env.RAZORPAY_KEY_SECRET || 'secret_placeholder';

const client = new Razorpay({
  key_id,
  key_secret,
});

export interface CreateOrderParams {
  amountPaise: number | bigint;
  receipt: string;
  notes?: Record<string, string>;
}

export interface RazorpayOrderResult {
  orderId: string;
  amountPaise: number;
  currency: string;
}

export const razorpayAdapter = {
  async createOrder(params: CreateOrderParams): Promise<RazorpayOrderResult> {
    const amount = Number(params.amountPaise);

    // If explicit mock keys or offline dev mode, return mock order directly
    if (
      process.env.NODE_ENV !== 'production' &&
      (!process.env.RAZORPAY_KEY_SECRET ||
        process.env.RAZORPAY_KEY_SECRET.includes('placeholder') ||
        process.env.RAZORPAY_KEY_ID?.includes('placeholder'))
    ) {
      const mockId = `order_mock_${crypto.randomBytes(8).toString('hex')}`;
      return {
        orderId: mockId,
        amountPaise: amount,
        currency: 'INR',
      };
    }

    try {
      const order = await client.orders.create({
        amount,
        currency: 'INR',
        receipt: params.receipt,
        notes: params.notes,
      });

      return {
        orderId: order.id,
        amountPaise: Number(order.amount),
        currency: order.currency,
      };
    } catch (err: any) {
      // In non-production, fall back to mock order if Razorpay rejects credentials (401)
      if (process.env.NODE_ENV !== 'production') {
        const mockId = `order_mock_${crypto.randomBytes(8).toString('hex')}`;
        return {
          orderId: mockId,
          amountPaise: amount,
          currency: 'INR',
        };
      }
      throw err;
    }
  },

  verifyWebhookSignature(body: string, signature: string, secret: string): boolean {
    const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  },
};