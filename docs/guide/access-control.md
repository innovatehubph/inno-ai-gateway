# Access Control Documentation

## Overview

The InnoAI Access Control System manages user permissions, rate limits, and feature availability across four distinct tiers. Each tier is designed to serve different use cases, from individual developers experimenting with AI to enterprise-scale production deployments.

---

## Access Tiers

| Tier | Price | Daily Requests | Monthly Tokens | Concurrent Requests | Available Models |
|------|-------|----------------|----------------|---------------------|------------------|
| **Free** | ₱0 | 100 | 10,000 | 1 | gemini-pro, sd-xl |
| **Starter** | ₱499 | 1,000 | 100,000 | 3 | All chat models + basic image models |
| **Professional** | ₱1,499 | 10,000 | 1,000,000 | 10 | All models including advanced |
| **Enterprise** | ₱4,999 | 100,000 | 10,000,000 | 50 | All models + priority access |

### Tier Details

#### Free Tier
Perfect for developers getting started with AI integration.

- **Price**: ₱0 (no credit card required)
- **Daily Requests**: 100 requests/day
- **Monthly Tokens**: 10,000 tokens/month
- **Concurrent Requests**: 1 concurrent request
- **Models**: gemini-pro, sd-xl
- **Support**: Community support via Discord and forums
- **Latency**: Standard latency (no priority)

#### Starter Tier
Ideal for small projects and individual developers.

- **Price**: ₱499/month
- **Daily Requests**: 1,000 requests/day
- **Monthly Tokens**: 100,000 tokens/month
- **Concurrent Requests**: 3 concurrent requests
- **Models**: All chat models (GPT-4, Claude, Gemini) + basic image generation (SD-XL, DALL-E 2)
- **Support**: Email support (48-hour response)
- **Features**: Full API access, basic analytics

#### Professional Tier
For growing businesses and production applications.

- **Price**: ₱1,499/month
- **Daily Requests**: 10,000 requests/day
- **Monthly Tokens**: 1,000,000 tokens/month
- **Concurrent Requests**: 10 concurrent requests
- **Models**: All models including GPT-4 Turbo, Claude 3 Opus, SD-3, video generation
- **Support**: Priority email support (24-hour response)
- **Features**: 
  - Priority processing (2x faster)
  - Advanced analytics dashboard
  - Custom model aliases
  - Webhook support
  - Usage alerts

#### Enterprise Tier
For organizations with high-volume requirements and compliance needs.

- **Price**: ₱4,999/month
- **Daily Requests**: 100,000 requests/day
- **Monthly Tokens**: 10,000,000 tokens/month
- **Concurrent Requests**: 50 concurrent requests
- **Models**: All models with priority access to new releases
- **Support**: Dedicated account manager + phone support
- **Features**:
  - SLA guarantee (99.9% uptime)
  - Single Sign-On (SSO) integration
  - Comprehensive audit logs
  - Custom rate limits
  - Private model deployment options
  - Advanced security features

---

## Features by Tier

| Feature | Free | Starter | Professional | Enterprise |
|---------|------|---------|--------------|------------|
| **Support** | Community | Email (48h) | Priority Email (24h) | Dedicated Manager |
| **Latency** | Standard | Standard | Priority (2x faster) | Priority + SLA |
| **API Access** | ❌ | ✅ | ✅ | ✅ |
| **Analytics** | Basic | Basic | Advanced | Custom Reports |
| **Custom Aliases** | ❌ | ❌ | ✅ | ✅ |
| **Webhooks** | ❌ | ❌ | ✅ | ✅ |
| **SSO** | ❌ | ❌ | ❌ | ✅ |
| **Audit Logs** | ❌ | ❌ | ❌ | ✅ |
| **Usage Alerts** | ❌ | ❌ | ✅ | ✅ |
| **Custom Rate Limits** | ❌ | ❌ | ❌ | ✅ |

---

## Permission Matrix

### Endpoint Access by Tier

| Endpoint | Free | Starter | Professional | Enterprise |
|----------|------|---------|--------------|------------|
| `POST /v1/chat/completions` | ✅ (limited) | ✅ | ✅ | ✅ |
| `POST /v1/images/generations` | ✅ SD-XL only | ✅ | ✅ | ✅ |
| `POST /v1/audio/transcriptions` | ❌ | ✅ | ✅ | ✅ |
| `POST /v1/audio/speech` | ❌ | ❌ | ✅ | ✅ |
| `POST /v1/video/generations` | ❌ | ❌ | ✅ | ✅ |
| `POST /v1/3d/generations` | ❌ | ❌ | ❌ | ✅ |
| `GET /v1/models` | ✅ | ✅ | ✅ | ✅ |
| `GET /v1/usage` | ❌ | ✅ | ✅ | ✅ |
| `GET /v1/billing` | ❌ | ✅ | ✅ | ✅ |
| `POST /v1/aliases` | ❌ | ❌ | ✅ | ✅ |

### Rate Limits per Endpoint

#### Chat Completions (`POST /v1/chat/completions`)

| Tier | Requests/Min | Requests/Day | Tokens/Request | Context Window |
|------|--------------|--------------|----------------|----------------|
| Free | 10 | 100 | 4,096 | 8K |
| Starter | 60 | 1,000 | 8,192 | 32K |
| Professional | 120 | 10,000 | 32,768 | 128K |
| Enterprise | 600 | 100,000 | 128,000 | 200K |

#### Image Generation (`POST /v1/images/generations`)

| Tier | Requests/Min | Requests/Day | Max Resolution | Models |
|------|--------------|--------------|----------------|--------|
| Free | 2 | 20 | 1024x1024 | SD-XL |
| Starter | 10 | 100 | 1024x1024 | SD-XL, DALL-E 2 |
| Professional | 30 | 500 | 2048x2048 | All image models |
| Enterprise | 100 | 5,000 | 4096x4096 | All + priority |

#### Audio Transcription (`POST /v1/audio/transcriptions`)

| Tier | Requests/Min | Requests/Day | Max Duration | Languages |
|------|--------------|--------------|--------------|-----------|
| Free | ❌ | ❌ | N/A | N/A |
| Starter | 5 | 50 | 10 min | 10 languages |
| Professional | 20 | 200 | 2 hours | 50+ languages |
| Enterprise | 100 | 1,000 | Unlimited | All languages |

#### Audio Speech (`POST /v1/audio/speech`)

| Tier | Requests/Min | Requests/Day | Max Characters | Voices |
|------|--------------|--------------|----------------|--------|
| Free | ❌ | ❌ | N/A | N/A |
| Starter | ❌ | ❌ | N/A | N/A |
| Professional | 15 | 150 | 4,096 | 10 voices |
| Enterprise | 75 | 750 | 16,384 | All voices |

#### Video Generation (`POST /v1/video/generations`)

| Tier | Requests/Min | Requests/Day | Max Duration | Quality |
|------|--------------|--------------|--------------|---------|
| Free | ❌ | ❌ | N/A | N/A |
| Starter | ❌ | ❌ | N/A | N/A |
| Professional | 2 | 20 | 10 seconds | 720p |
| Enterprise | 10 | 100 | 60 seconds | 4K |

### Model Availability by Tier

#### Free Tier Models

| Model | Type | Context | Description |
|-------|------|---------|-------------|
| `gemini-pro` | Chat | 8K | Google's Gemini Pro model |
| `sd-xl` | Image | N/A | Stable Diffusion XL for image generation |

#### Starter Tier Models

All Free tier models plus:

| Model | Type | Context | Description |
|-------|------|---------|-------------|
| `gpt-3.5-turbo` | Chat | 16K | OpenAI's GPT-3.5 Turbo |
| `claude-instant` | Chat | 100K | Anthropic's Claude Instant |
| `dall-e-2` | Image | N/A | OpenAI's DALL-E 2 |
| `whisper-1` | Audio | N/A | Speech-to-text transcription |

#### Professional Tier Models

All Starter tier models plus:

| Model | Type | Context | Description |
|-------|------|---------|-------------|
| `gpt-4` | Chat | 8K | OpenAI's GPT-4 |
| `gpt-4-turbo` | Chat | 128K | GPT-4 Turbo with extended context |
| `claude-3-opus` | Chat | 200K | Anthropic's Claude 3 Opus |
| `claude-3-sonnet` | Chat | 200K | Claude 3 Sonnet |
| `sd-3` | Image | N/A | Stable Diffusion 3 |
| `tts-1` | Audio | N/A | Text-to-speech |
| `tts-1-hd` | Audio | N/A | High-quality TTS |
| `video-gen-v1` | Video | N/A | AI video generation |

#### Enterprise Tier Models

All Professional tier models plus:

| Model | Type | Context | Description |
|-------|------|---------|-------------|
| `gpt-4o` | Chat | 128K | OpenAI's GPT-4o |
| `claude-3-haiku` | Chat | 200K | Claude 3 Haiku (fast) |
| `3d-gen-v1` | 3D | N/A | 3D model generation |
| `custom-*` | Custom | Varies | Private deployed models |

---

## Upgrade Path Between Tiers

### Upgrading Your Subscription

You can upgrade your tier at any time from the [Customer Portal](https://portal.innoai.com).

#### Immediate Upgrade Process

1. **Navigate** to Billing → Subscription
2. **Select** your desired tier
3. **Review** prorated charges
4. **Confirm** upgrade

```bash
# Check current tier via API
curl -X GET "https://api.innoai.com/v1/billing/subscription" \
  -H "Authorization: Bearer $JWT_TOKEN"

# Response
{
  "tier": "starter",
  "price": 499,
  "currency": "PHP",
  "daily_requests_limit": 1000,
  "monthly_tokens_limit": 100000,
  "concurrent_limit": 3,
  "upgrade_available": true,
  "next_billing_date": "2026-03-21"
}
```

#### Prorated Billing

When upgrading mid-cycle:
- Pay difference between tiers
- Immediate access to new limits
- Unused portion of old tier credited

Example:
```
Current: Starter (₱499/month)
Upgrade: Professional (₱1,499/month)
Days remaining: 15

Prorated charge: (₱1,499 - ₱499) × (15/30) = ₱500
```

### Downgrading

Downgrades take effect at the next billing cycle:
- Maintain current tier until period ends
- Export data before downgrade (Enterprise → Professional)
- Features will be disabled if exceeding new tier limits

### Free Trial Period

New Professional and Enterprise customers receive:
- **14-day free trial** (no credit card required)
- **Full feature access** during trial
- **Upgrade anytime** or cancel before billing

```bash
# Start free trial
curl -X POST "https://api.innoai.com/v1/billing/trial" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tier": "professional",
    "duration_days": 14
  }'
```

---

## Checking Current Usage

### Method 1: Customer Portal

Visit [https://portal.innoai.com/usage](https://portal.innoai.com/usage) for:
- Real-time usage dashboard
- Historical usage graphs
- Projected usage vs. limits
- Cost breakdown by endpoint

### Method 2: API Endpoints

#### Get Current Usage

```bash
curl -X GET "https://api.innoai.com/v1/usage/current" \
  -H "X-API-Key: $API_KEY"
```

**Response:**
```json
{
  "tier": "professional",
  "period": {
    "start": "2026-02-01T00:00:00Z",
    "end": "2026-02-28T23:59:59Z"
  },
  "requests": {
    "used": 5420,
    "limit": 10000,
    "remaining": 4580,
    "reset_at": "2026-02-22T00:00:00Z"
  },
  "tokens": {
    "used": 456000,
    "limit": 1000000,
    "remaining": 544000
  },
  "concurrent": {
    "current": 3,
    "limit": 10
  },
  "endpoints": {
    "chat": {
      "requests": 4200,
      "tokens": 380000
    },
    "images": {
      "requests": 1200,
      "tokens": 76000
    }
  }
}
```

#### Get Daily Usage History

```bash
# Get last 7 days
curl -X GET "https://api.innoai.com/v1/usage/daily?days=7" \
  -H "X-API-Key: $API_KEY"
```

**Response:**
```json
{
  "days": [
    {
      "date": "2026-02-20",
      "requests": 320,
      "tokens": 45000,
      "cost": "₱15.20"
    },
    {
      "date": "2026-02-19",
      "requests": 289,
      "tokens": 41000,
      "cost": "₱13.80"
    }
  ]
}
```

### Method 3: Usage Webhooks

Configure webhooks to receive real-time usage updates:

```bash
# Register webhook
curl -X POST "https://api.innoai.com/v1/webhooks" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-app.com/webhooks/innoai",
    "events": ["usage.threshold.80", "usage.threshold.100"],
    "secret": "your_webhook_secret"
  }'
```

**Webhook Payload:**
```json
{
  "event": "usage.threshold.80",
  "timestamp": "2026-02-21T14:32:00Z",
  "data": {
    "tier": "professional",
    "requests": {
      "used": 8000,
      "limit": 10000,
      "percentage": 80
    },
    "tokens": {
      "used": 850000,
      "limit": 1000000,
      "percentage": 85
    }
  }
}
```

---

## Webhook Security

Webhooks include security headers for verification:

### Headers

| Header | Description |
|--------|-------------|
| `X-InnoAI-Signature` | HMAC-SHA256 signature of payload |
| `X-InnoAI-Timestamp` | Unix timestamp of request |
| `X-InnoAI-Event` | Event type (e.g., `usage.threshold.80`) |
| `X-InnoAI-ID` | Unique webhook ID for idempotency |

### Verification

```python
import hmac
import hashlib
import time

def verify_webhook(payload, signature, secret, timestamp):
    # Check timestamp (prevent replay attacks)
    current_time = int(time.time())
    if abs(current_time - int(timestamp)) > 300:  # 5 min tolerance
        return False
    
    # Create expected signature
    expected = hmac.new(
        secret.encode('utf-8'),
        f"{timestamp}.{payload}".encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    
    # Compare signatures (constant time)
    return hmac.compare_digest(f"sha256={expected}", signature)
```

### Best Practices

1. **Always verify signatures** before processing
2. **Use HTTPS endpoints** only
3. **Implement idempotency** using `X-InnoAI-ID`
4. **Return 200 status** quickly to acknowledge receipt
5. **Process asynchronously** to avoid timeouts

---

## Frequently Asked Questions

**Q: What happens when I hit my daily limit?**
A: Requests return HTTP 429 until the reset time (midnight UTC). Upgrade your tier or wait for the next day.

**Q: Do unused requests/tokens roll over?**
A: No, limits reset at the start of each period (daily/weekly/monthly).

**Q: Can I purchase additional requests?**
A: Enterprise customers can customize their limits. Contact sales for custom pricing.

**Q: Is there a grace period when limits are exceeded?**
A: No, limits are enforced strictly. Monitor usage via webhooks to avoid disruptions.

**Q: How do I cancel my subscription?**
A: Navigate to Billing → Subscription → Cancel. Access continues until the end of the billing period.

**Q: Can I change my billing currency?**
A: Currently, all billing is in Philippine Peso (PHP). Multi-currency support coming Q2 2026.

---

## Support

For access control questions:
- **Free**: [Community Forum](https://forum.innoai.com)
- **Starter**: support@innoai.com
- **Professional**: priority@innoai.com
- **Enterprise**: Dedicated account manager

For urgent issues, Enterprise customers can call the 24/7 hotline.
