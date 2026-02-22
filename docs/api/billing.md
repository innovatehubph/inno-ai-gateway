---
title: Billing API
description: DirectPay integration and billing management endpoints
---

# Billing API

The Billing API provides integration with DirectPay for Philippine payment processing, allowing you to manage invoices, payments, and subscriptions.

## Base URL

```
https://api.innoai.ph/v1
```

## Authentication

```
Authorization: Bearer YOUR_API_KEY
```

## Payment Methods

InnoAI supports the following Philippine payment methods through DirectPay:

| Method | Code | Processing Time | Fee |
|--------|------|-----------------|-----|
| GCash | `gcash` | Instant | ₱15 |
| Maya | `maya` | Instant | ₱15 |
| Bank Transfer | `bank_transfer` | 1-2 business days | ₱25 |
| Credit/Debit Card | `card` | Instant | 3.5% |
| 7-Eleven | `7eleven` | Instant | ₱50 |
| Cebuana Lhuillier | `cebuana` | Instant | ₱50 |
| Palawan Express | `palawan` | Instant | ₱50 |

## Endpoints

### Get Billing Summary

Retrieve current billing status and upcoming charges.

```
GET /billing/summary
```

#### Example Request

```bash
curl https://api.innoai.ph/v1/billing/summary \
  -H "Authorization: Bearer YOUR_API_KEY"
```

#### Example Response

```json
{
  "current_period": {
    "start": "2026-02-01",
    "end": "2026-02-28",
    "plan": "startup",
    "plan_cost": 1499.00
  },
  "usage": {
    "credits_included": 1500.00,
    "credits_used": 1234.50,
    "credits_remaining": 265.50,
    "overage": 0.00
  },
  "next_invoice": {
    "date": "2026-03-01",
    "estimated_total": 1499.00,
    "currency": "PHP"
  },
  "payment_method": {
    "type": "gcash",
    "last_four": "1234",
    "status": "active"
  }
}
```

### Get Invoices

List all invoices with pagination.

```
GET /billing/invoices
```

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | integer | 20 | Results per page |
| `offset` | integer | 0 | Pagination offset |
| `status` | string | — | Filter: `paid`, `unpaid`, `overdue` |

#### Example Request

```bash
curl "https://api.innoai.ph/v1/billing/invoices?limit=10&status=paid" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

#### Example Response

```json
{
  "data": [
    {
      "id": "inv_abc123",
      "number": "INV-2026-0001",
      "status": "paid",
      "amount": 1499.00,
      "currency": "PHP",
      "period_start": "2026-01-01",
      "period_end": "2026-01-31",
      "due_date": "2026-02-07",
      "paid_at": "2026-02-01T10:30:00Z",
      "items": [
        {
          "description": "Startup Plan",
          "amount": 1499.00
        }
      ]
    }
  ],
  "pagination": {
    "total": 12,
    "limit": 10,
    "offset": 0,
    "has_more": true
  }
}
```

### Get Invoice Details

Retrieve detailed information about a specific invoice.

```
GET /billing/invoices/{invoice_id}
```

#### Example Request

```bash
curl https://api.innoai.ph/v1/billing/invoices/inv_abc123 \
  -H "Authorization: Bearer YOUR_API_KEY"
```

#### Example Response

```json
{
  "id": "inv_abc123",
  "number": "INV-2026-0002",
  "status": "unpaid",
  "amount": 2248.50,
  "currency": "PHP",
  "period_start": "2026-02-01",
  "period_end": "2026-02-28",
  "due_date": "2026-03-07",
  "items": [
    {
      "description": "Startup Plan",
      "amount": 1499.00
    },
    {
      "description": "Additional Credits (₱749.50)",
      "amount": 749.50
    }
  ],
  "usage_breakdown": {
    "requests": 45230,
    "tokens": 8900000,
    "by_model": {
      "inno-ai-boyong-4.5": 680.00,
      "inno-flux-1-dev": 69.50
    }
  }
}
```

### Create Payment Intent

Initiate a payment through DirectPay.

```
POST /billing/payment-intents
```

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `amount` | number | Yes | Amount to pay in PHP |
| `payment_method` | string | Yes | Payment method code |
| `invoice_id` | string | No | Associate with invoice |
| `metadata` | object | No | Custom data |

#### Example Request

```bash
curl -X POST https://api.innoai.ph/v1/billing/payment-intents \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1499.00,
    "payment_method": "gcash",
    "invoice_id": "inv_abc123",
    "metadata": {
      "order_id": "order_123"
    }
  }'
```

#### Example Response

```json
{
  "id": "pi_xyz789",
  "amount": 1499.00,
  "currency": "PHP",
  "status": "requires_action",
  "payment_method": "gcash",
  "next_action": {
    "type": "redirect",
    "url": "https://pay.directpay.ph/checkout/pi_xyz789"
  },
  "expires_at": "2026-02-21T15:00:00Z"
}
```

### Get Payment Intent Status

Check the status of a payment intent.

```
GET /billing/payment-intents/{payment_intent_id}
```

#### Example Request

```bash
curl https://api.innoai.ph/v1/billing/payment-intents/pi_xyz789 \
  -H "Authorization: Bearer YOUR_API_KEY"
```

#### Example Response

```json
{
  "id": "pi_xyz789",
  "amount": 1499.00,
  "currency": "PHP",
  "status": "succeeded",
  "payment_method": "gcash",
  "paid_at": "2026-02-21T14:35:00Z",
  "receipt_url": "https://directpay.ph/receipts/pi_xyz789"
}
```

### List Payment Methods

Get saved payment methods.

```
GET /billing/payment-methods
```

#### Example Request

```bash
curl https://api.innoai.ph/v1/billing/payment-methods \
  -H "Authorization: Bearer YOUR_API_KEY"
```

#### Example Response

```json
{
  "data": [
    {
      "id": "pm_abc123",
      "type": "gcash",
      "last_four": "1234",
      "expiry_month": null,
      "expiry_year": null,
      "is_default": true,
      "created_at": "2026-01-15T08:00:00Z"
    },
    {
      "id": "pm_def456",
      "type": "card",
      "last_four": "4242",
      "expiry_month": 12,
      "expiry_year": 2027,
      "is_default": false,
      "created_at": "2026-02-01T10:00:00Z"
    }
  ]
}
```

### Add Payment Method

Add a new payment method.

```
POST /billing/payment-methods
```

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | Yes | Payment method type |
| `directpay_token` | string | Yes | Token from DirectPay |
| `is_default` | boolean | No | Set as default |

#### Example Request

```bash
curl -X POST https://api.innoai.ph/v1/billing/payment-methods \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "gcash",
    "directpay_token": "tok_gcash_xyz789",
    "is_default": true
  }'
```

#### DirectPay Token Creation

First, create a token with DirectPay:

```javascript
// Using DirectPay.js
const directpay = DirectPay('pk_test_your_publishable_key');

const { token, error } = await directpay.createToken({
  type: 'gcash',
  phone: '+639171234567'
});

if (error) {
  console.error(error);
} else {
  // Send token to your server
  await fetch('/api/add-payment-method', {
    method: 'POST',
    body: JSON.stringify({
      type: 'gcash',
      directpay_token: token.id
    })
  });
}
```

### Delete Payment Method

Remove a saved payment method.

```
DELETE /billing/payment-methods/{payment_method_id}
```

#### Example Request

```bash
curl -X DELETE https://api.innoai.ph/v1/billing/payment-methods/pm_def456 \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### Get Usage Charges

Retrieve detailed usage-based charges.

```
GET /billing/usage-charges
```

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `start_date` | string | 30 days ago | Start date |
| `end_date` | string | Today | End date |

#### Example Request

```bash
curl "https://api.innoai.ph/v1/billing/usage-charges?start_date=2026-02-01&end_date=2026-02-21" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

#### Example Response

```json
{
  "period": {
    "start": "2026-02-01",
    "end": "2026-02-21"
  },
  "total": 1234.50,
  "breakdown": [
    {
      "date": "2026-02-21",
      "amount": 75.25,
      "details": [
        {
          "service": "chat",
          "model": "inno-ai-boyong-4.5",
          "quantity": 1800,
          "unit": "requests",
          "rate": 0.0375,
          "amount": 67.50
        },
        {
          "service": "image",
          "model": "inno-flux-1-dev",
          "quantity": 50,
          "unit": "images",
          "rate": 0.18,
          "amount": 9.00
        }
      ]
    }
  ]
}
```

### Purchase Credits

Buy additional inference credits.

```
POST /billing/credits/purchase
```

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `amount` | number | Yes | Credit amount in PHP |
| `payment_method_id` | string | Yes | Saved payment method |

#### Example Request

```bash
curl -X POST https://api.innoai.ph/v1/billing/credits/purchase \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1000.00,
    "payment_method_id": "pm_abc123"
  }'
```

#### Example Response

```json
{
  "id": "credit_purchase_xyz789",
  "amount": 1000.00,
  "credits_added": 1050.00,
  "bonus": 50.00,
  "status": "completed",
  "payment_intent": "pi_abc123",
  "created_at": "2026-02-21T14:30:00Z"
}
```

### Get Credit Balance

Check current credit balance.

```
GET /billing/credits/balance
```

#### Example Request

```bash
curl https://api.innoai.ph/v1/billing/credits/balance \
  -H "Authorization: Bearer YOUR_API_KEY"
```

#### Example Response

```json
{
  "balance": 265.50,
  "currency": "PHP",
  "lifetime_purchased": 5000.00,
  "lifetime_used": 4734.50,
  "last_updated": "2026-02-21T14:35:00Z"
}
```

## Subscription Management

### Get Subscription

Retrieve current subscription details.

```
GET /billing/subscription
```

#### Example Response

```json
{
  "id": "sub_abc123",
  "status": "active",
  "plan": "startup",
  "amount": 1499.00,
  "currency": "PHP",
  "interval": "month",
  "current_period_start": "2026-02-01",
  "current_period_end": "2026-02-28",
  "cancel_at_period_end": false,
  "credits_per_period": 1500.00,
  "features": [
    "100,000 requests/day",
    "1,000 req/min rate limit",
    "Priority support"
  ]
}
```

### Update Subscription

Change subscription plan.

```
POST /billing/subscription/change
```

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `plan` | string | Yes | New plan: `free`, `developer`, `startup`, `enterprise` |
| `proration_date` | string | No | When to apply change |

#### Example Request

```bash
curl -X POST https://api.innoai.ph/v1/billing/subscription/change \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "plan": "enterprise"
  }'
```

### Cancel Subscription

Cancel at end of period or immediately.

```
POST /billing/subscription/cancel
```

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `at_period_end` | boolean | Yes | Cancel at period end vs immediately |
| `reason` | string | No | Cancellation reason |

#### Example Request

```bash
curl -X POST https://api.innoai.ph/v1/billing/subscription/cancel \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "at_period_end": true,
    "reason": "Switching to enterprise custom plan"
  }'
```

## Webhooks

Subscribe to billing events:

```bash
curl -X POST https://api.innoai.ph/v1/webhooks \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-app.com/webhooks/innoai",
    "events": [
      "invoice.created",
      "invoice.paid",
      "invoice.payment_failed",
      "subscription.updated",
      "payment.succeeded",
      "payment.failed"
    ]
  }'
```

### Billing Events

| Event | Description |
|-------|-------------|
| `invoice.created` | New invoice generated |
| `invoice.paid` | Invoice payment successful |
| `invoice.payment_failed` | Invoice payment failed |
| `subscription.created` | New subscription started |
| `subscription.updated` | Subscription changed |
| `subscription.cancelled` | Subscription cancelled |
| `payment.succeeded` | Payment successful |
| `payment.failed` | Payment failed |
| `credits.purchased` | Credits purchased |
| `credits.low` | Low credit balance warning |

## SDK Examples

### JavaScript

```javascript
import { InnoAI } from '@innoai/sdk';

const client = new InnoAI({ apiKey: 'your-api-key' });

// Get billing summary
const summary = await client.billing.getSummary();
console.log(`Credits remaining: ₱${summary.usage.credits_remaining}`);

// Create payment intent
const payment = await client.billing.createPaymentIntent({
  amount: 1499.00,
  payment_method: 'gcash'
});

// Redirect to payment
window.location.href = payment.next_action.url;
```

### Python

```python
from innoai import InnoAI

client = InnoAI(api_key="your-api-key")

# Get invoices
invoices = client.billing.get_invoices(status="unpaid")
for invoice in invoices.data:
    print(f"Invoice {invoice.number}: ₱{invoice.amount}")

# Purchase credits
purchase = client.billing.purchase_credits(
    amount=1000.00,
    payment_method_id="pm_abc123"
)
print(f"Added ₱{purchase.credits_added} credits")
```

### PHP

```php
<?php
use InnoAI\Client;

$client = new Client(['api_key' => 'your-api-key']);

// Get subscription
$subscription = $client->billing->getSubscription();
echo "Plan: " . $subscription->plan;
echo "Credits per month: " . $subscription->credits_per_period;

// List payment methods
$methods = $client->billing->getPaymentMethods();
foreach ($methods->data as $method) {
    echo $method->type . " ending in " . $method->last_four;
}
```

## Error Responses

### Payment Failed

```json
{
  "error": {
    "code": "payment_failed",
    "message": "Payment was declined by GCash",
    "type": "payment_error",
    "payment_intent": "pi_xyz789",
    "decline_code": "insufficient_funds"
  }
}
```

### Invalid Payment Method

```json
{
  "error": {
    "code": "invalid_payment_method",
    "message": "Payment method pm_invalid not found",
    "type": "invalid_request_error"
  }
}
```

### Payment Method Required

```json
{
  "error": {
    "code": "payment_method_required",
    "message": "A valid payment method is required for this operation",
    "type": "invalid_request_error"
  }
}
```

## Testing

Use the sandbox environment for testing:

```
https://sandbox-api.innoai.ph/v1
```

### Test Card Numbers

| Number | Result |
|--------|--------|
| `4242424242424242` | Success |
| `4000000000000002` | Declined |
| `4000000000000127` | Insufficient funds |

### Test GCash Flow

In sandbox mode, all GCash payments simulate success without actual charging.

---

**Billing questions?** Contact billing@innoai.ph
