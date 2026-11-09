import React, { useMemo } from 'react';
import { Linking } from 'react-native';
import { WebView } from 'react-native-webview';

export type CheckoutMessage =
  | { type: 'success'; paymentId: string; orderId: string; signature: string }
  | { type: 'failed'; code?: string; description?: string }
  | { type: 'dismiss' };

type Props = {
  keyId: string;
  orderId: string;
  amountPaise: number;
  description: string;
  contact?: string;
  email?: string | null;
  onMessage: (m: CheckoutMessage) => void;
};

/** JSON that is safe to embed inside a <script> tag. */
const embed = (v: unknown): string => JSON.stringify(v).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');

/**
 * Razorpay Standard Checkout in a WebView. The result is only a hint for the UI:
 * the booking becomes CONFIRMED when the server receives the gateway webhook.
 */
export const RazorpayCheckout: React.FC<Props> = ({ keyId, orderId, amountPaise, description, contact, email, onMessage }) => {
  const html = useMemo(() => {
    const options = {
      key: keyId,
      order_id: orderId,
      amount: amountPaise,
      currency: 'INR',
      name: 'BusVerse',
      description,
      prefill: { contact: contact ?? '', email: email ?? '' },
      theme: { color: '#0055ED' },
    };
    return `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;background:#0B1830">
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
<script>
  var post = function (m) { window.ReactNativeWebView.postMessage(JSON.stringify(m)); };
  var options = ${embed(options)};
  options.handler = function (r) {
    post({ type: 'success', paymentId: r.razorpay_payment_id, orderId: r.razorpay_order_id, signature: r.razorpay_signature });
  };
  options.modal = { ondismiss: function () { post({ type: 'dismiss' }); } };
  window.onload = function () {
    try {
      var rzp = new Razorpay(options);
      rzp.on('payment.failed', function (r) {
        post({ type: 'failed', code: r.error && r.error.code, description: r.error && r.error.description });
      });
      rzp.open();
    } catch (e) { post({ type: 'failed', description: String(e) }); }
  };
</script></body></html>`;
  }, [keyId, orderId, amountPaise, description, contact, email]);

  return (
    <WebView
      originWhitelist={['*']}
      source={{ html, baseUrl: 'https://checkout.razorpay.com' }}
      javaScriptEnabled
      domStorageEnabled
      setSupportMultipleWindows={false}
      onShouldStartLoadWithRequest={(req: { url: string }) => {
        if (/^(https?:|about:|data:)/i.test(req.url)) return true;
        // UPI / intent links open the user's payment app.
        void Linking.openURL(req.url).catch(() => undefined);
        return false;
      }}
      onMessage={(e: { nativeEvent: { data: string } }) => {
        try {
          onMessage(JSON.parse(e.nativeEvent.data) as CheckoutMessage);
        } catch {
          /* ignore unrelated messages */
        }
      }}
    />
  );
};
