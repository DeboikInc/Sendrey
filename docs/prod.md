Redis:
Upstash — best free option. 10,000 commands/day free tier, no credit card. Made specifically for serverless/cloud use. Just get the Redis URL and drop it in your env.

Kafka:
Upstash Kafka — same people, free tier is 10,000 messages/day, 100MB storage. REST-based so no heavy client setup.

1. Make sure your webhook URL is set in Paystack dashboard
Dashboard → Settings → API Keys & Webhooks → paste your production URL:
https://yourdomain.com/payments/webhook
2. Make your webhook route skip auth middleware
Your webhook can't have JWT auth on it since Paystack won't send a token. Check your routes file — the webhook route must be public:
js// ✅ Correct — no auth middleware
router.post('/webhook', paymentController.handleWebhook);

// ❌ Wrong — will reject Paystack's request
router.post('/webhook', authenticate, paymentController.handleWebhook);
3. Make sure raw body is preserved for signature verification
Paystack's signature verification requires the raw request body. In your app.js/server.js, the webhook route must use express.raw not express.json:
js// Before your global json parser
app.use('/payments/webhook', express.raw({ type: 'application/json' }));

// Then your global parser for everything else
app.use(express.json());
And update handleWebhook to parse it:
jsasync handleWebhook(req, res) {
  const hash = req.headers['x-paystack-signature'];
  const secret = process.env.PAYSTACK_SECRET_KEY;
  const crypto = require('crypto');
  
  const body = req.body instanceof Buffer ? req.body : Buffer.from(JSON.stringify(req.body));
  
  const computedHash = crypto
    .createHmac('sha512', secret)
    .update(body)
    .digest('hex');

  if (hash !== computedHash) {
    console.error('⚠️ Webhook signature verification failed');
    return res.status(400).send('Invalid signature');
  }

  const event = typeof req.body === 'string' 
    ? JSON.parse(req.body) 
    : req.body instanceof Buffer 
      ? JSON.parse(req.body.toString()) 
      : req.body;

  // ... rest of handler unchanged
4. Respond to Paystack within 5 seconds
Your webhook already does res.json({ received: true }) at the end — that's correct. But if verifyPayment takes too long, Paystack may retry. Move the response earlier and process async:
jsasync handleWebhook(req, res) {
  // ... signature verification ...

  res.json({ received: true }); // ← respond immediately

  // Process async — don't await before responding
  try {
    const event = req.body;
    if (event.event === 'charge.success') {
      const { reference, metadata } = event.data;
      if (metadata.type === 'wallet_funding') {
        await paymentService.verifyWalletFunding(reference);
      } else if (metadata.orderId) {
        await paymentService.verifyPayment(reference);
      }
    }
  } catch (err) {
    console.error('Webhook processing error:', err);
  }
}
That's all you need for prod. The handleTaskCompleted fallback remains a safety net for edge cases, but the webhook should handle 99% of card payments reliably.