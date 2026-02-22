---
title: Webhooks
description: Handling webhook events from InnoAI
---

# Webhooks

Webhooks allow InnoAI to notify your application about events in real-time. Instead of polling for changes, you can register a webhook URL to receive HTTP POST requests when events occur.

## Setting Up Webhooks

### 1. Create a Webhook Endpoint

First, create an endpoint in your application:

```javascript
// Express.js example
app.post('/webhooks/innoai', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-innoai-signature'];
  const payload = req.body;
  
  // Verify signature (see below)
  if (!verifySignature(payload, signature, webhookSecret)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  const event = JSON.parse(payload);
  
  // Handle the event
  handleWebhookEvent(event);
  
  // Acknowledge receipt
  res.status(200).json({ received: true });
});
```

### 2. Register Your Webhook

Register your webhook URL with InnoAI:

```bash
curl -X POST https://api.innoai.ph/v1/webhooks \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-app.com/webhooks/innoai",
    "events": ["invoice.paid", "customer.created"],
    "description": "Production webhook"
  }'
```

**Response:**
```json
{
  "id": "wh_abc123",
  "url": "https://your-app.com/webhooks/innoai",
  "events": ["invoice.paid", "customer.created"],
  "status": "active",
  "secret": "whsec_xxx...",
  "created_at": "2026-02-21T10:00:00Z"
}
```

::: warning Store Secret Securely
The webhook secret is used to verify webhook signatures. Store it securely.
:::

## Verifying Signatures

InnoAI signs webhook payloads to ensure they came from us. Always verify the signature:

### JavaScript

```javascript
const crypto = require('crypto');

function verifySignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

### Python

```python
import hmac
import hashlib

def verify_signature(payload: str, signature: str, secret: str) -> bool:
    expected = hmac.new(
        secret.encode('utf-8'),
        payload.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(signature, expected)
```

### PHP

```php
<?php
function verifySignature($payload, $signature, $secret) {
    $expected = hash_hmac('sha256', $payload, $secret);
    return hash_equals($signature, $expected);
}
```

## Available Events

### Billing Events

| Event | Description |
|-------|-------------|
| `invoice.created` | New invoice generated |
| `invoice.paid` | Invoice payment successful |
| `invoice.payment_failed` | Invoice payment failed |
| `invoice.overdue` | Invoice past due date |
| `subscription.created` | New subscription started |
| `subscription.updated` | Subscription changed |
| `subscription.cancelled` | Subscription cancelled |
| `payment.succeeded` | Payment successful |
| `payment.failed` | Payment failed |
| `credits.purchased` | Credits purchased |
| `credits.low` | Low credit balance warning |

### Customer Events

| Event | Description |
|-------|-------------|
| `customer.created` | New customer created |
| `customer.updated` | Customer details updated |
| `customer.deleted` | Customer deleted |
| `customer.suspended` | Customer suspended |
| `customer.reactivated` | Customer reactivated |
| `customer.tier.changed` | Customer tier changed |
| `customer.usage.threshold` | Usage threshold exceeded |

### Inference Events

| Event | Description |
|-------|-------------|
| `inference.completed` | Inference request completed |
| `inference.failed` | Inference request failed |
| `batch.completed` | Batch job completed |

### Rate Limit Events

| Event | Description |
|-------|-------------|
| `rate_limit.warning.50` | 50% of quota used |
| `rate_limit.warning.80` | 80% of quota used |
| `rate_limit.warning.95` | 95% of quota used |
| `rate_limit.exceeded` | Quota exceeded |

## Event Payloads

### Invoice Paid

```json
{
  "id": "evt_abc123",
  "object": "event",
  "type": "invoice.paid",
  "created": 1700000000,
  "data": {
    "object": {
      "id": "inv_xyz789",
      "number": "INV-2026-0001",
      "amount": 1499.00,
      "currency": "PHP",
      "status": "paid",
      "paid_at": "2026-02-21T14:30:00Z",
      "customer": {
        "id": "cust_abc123",
        "email": "customer@example.com"
      }
    }
  }
}
```

### Customer Created

```json
{
  "id": "evt_def456",
  "object": "event",
  "type": "customer.created",
  "created": 1700000000,
  "data": {
    "object": {
      "id": "cust_new123",
      "name": "New Customer",
      "email": "new@example.com",
      "tier": "startup",
      "created_at": "2026-02-21T10:00:00Z"
    }
  }
}
```

### Rate Limit Warning

```json
{
  "id": "evt_ghi789",
  "object": "event",
  "type": "rate_limit.warning.80",
  "created": 1700000000,
  "data": {
    "tier": "startup",
    "limit_type": "daily_requests",
    "used": 80000,
    "limit": 100000,
    "percentage": 80,
    "projected_exhaustion": "2026-02-21T20:00:00Z"
  }
}
```

## Handling Events

### Example Handler

```javascript
async function handleWebhookEvent(event) {
  switch(event.type) {
    case 'invoice.paid':
      await handleInvoicePaid(event.data.object);
      break;
      
    case 'invoice.payment_failed':
      await handlePaymentFailed(event.data.object);
      break;
      
    case 'customer.created':
      await sendWelcomeEmail(event.data.object);
      break;
      
    case 'rate_limit.warning.80':
      await notifyAdmin('Approaching rate limit', event.data);
      break;
      
    case 'credits.low':
      await promptCreditPurchase(event.data.object.customer_id);
      break;
      
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }
}

async function handleInvoicePaid(invoice) {
  // Update your database
  await db.invoices.update(invoice.id, { status: 'paid' });
  
  // Send receipt email
  await sendEmail({
    to: invoice.customer.email,
    template: 'payment_receipt',
    data: invoice
  });
}
```

## Best Practices

### 1. Acknowledge Immediately

Respond with 200 OK immediately, then process asynchronously:

```javascript
app.post('/webhooks/innoai', (req, res) => {
  // Acknowledge immediately
  res.status(200).json({ received: true });
  
  // Process asynchronously
  processWebhook(req.body).catch(console.error);
});
```

### 2. Handle Duplicates

Webhooks may be delivered multiple times. Use idempotency:

```javascript
async function processWebhook(event) {
  const key = `webhook:${event.id}`;
  
  // Check if already processed
  if (await redis.get(key)) {
    console.log(`Event ${event.id} already processed`);
    return;
  }
  
  // Process event
  await handleEvent(event);
  
  // Mark as processed (expire after 24 hours)
  await redis.setex(key, 86400, 'processed');
}
```

### 3. Verify Signatures

Always verify webhook signatures:

```javascript
app.post('/webhooks/innoai', (req, res) => {
  const signature = req.headers['x-innoai-signature'];
  
  if (!verifySignature(req.body, signature, process.env.WEBHOOK_SECRET)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  // Process webhook
});
```

### 4. Implement Retries

If your endpoint fails, InnoAI will retry:

| Attempt | Delay |
|---------|-------|
| 1 | Immediate |
| 2 | 5 seconds |
| 3 | 25 seconds |
| 4 | 2 minutes |
| 5 | 10 minutes |

Make sure your endpoint is idempotent!

### 5. Log Events

```javascript
async function processWebhook(event) {
  console.log('Processing webhook:', {
    event_id: event.id,
    type: event.type,
    timestamp: new Date(event.created * 1000)
  });
  
  try {
    await handleEvent(event);
    console.log('Webhook processed successfully');
  } catch (error) {
    console.error('Webhook processing failed:', error);
    throw error; // Trigger retry
  }
}
```

## Testing Webhooks

### Local Testing with ngrok

```bash
# Install ngrok
npm install -g ngrok

# Start your local server
npm run dev

# Expose to internet
ngrok http 3000

# Register webhook with ngrok URL
curl -X POST https://api.innoai.ph/v1/webhooks \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "url": "https://abc123.ngrok.io/webhooks/innoai",
    "events": ["invoice.paid"]
  }'
```

### Test Events

Send test events from the dashboard or API:

```bash
curl -X POST https://api.innoai.ph/v1/webhooks/wh_abc123/test \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "event": "invoice.paid"
  }'
```

## Managing Webhooks

### List Webhooks

```bash
curl https://api.innoai.ph/v1/webhooks \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### Update Webhook

```bash
curl -X PATCH https://api.innoai.ph/v1/webhooks/wh_abc123 \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "events": ["invoice.paid", "invoice.payment_failed", "customer.created"]
  }'
```

### Delete Webhook

```bash
curl -X DELETE https://api.innoai.ph/v1/webhooks/wh_abc123 \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### View Delivery Attempts

```bash
curl https://api.innoai.ph/v1/webhooks/wh_abc123/deliveries \
  -H "Authorization: Bearer YOUR_API_KEY"
```

## Troubleshooting

### Webhook Not Receiving Events

1. Check URL is accessible from internet
2. Verify webhook is active
3. Check SSL certificate is valid
4. Ensure endpoint returns 200 OK

### Signature Verification Failing

1. Verify you're using raw request body
2. Check webhook secret is correct
3. Ensure no middleware modifies the body

### Duplicate Events

Implement idempotency checking as shown above.

---

**Webhook questions?** Contact support@innoai.ph
