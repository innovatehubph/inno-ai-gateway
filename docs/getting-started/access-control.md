---
title: Access Control
description: Understand tier permissions and access control in InnoAI
---

# Access Control

InnoAI uses a comprehensive access control system to manage what each user tier can do. This guide explains the permission matrix for each tier.

## Access Control Matrix

### Summary by Tier

| Capability | Bayan Starter | Developer | Startup | Enterprise | Bayanihan |
|------------|---------------|-----------|---------|------------|-----------|
| **Max Requests/Day** | 1,000 | 10,000 | 100,000 | Unlimited | Unlimited |
| **Rate Limit** | 10/min | 100/min | 1,000/min | 10,000/min | Custom |
| **Concurrent Requests** | 2 | 10 | 50 | 200 | Custom |
| **Max Tokens/Request** | 4,096 | 8,192 | 16,384 | 128,000 | 200,000 |
| **Max Image Size** | 1024x1024 | 1024x1024 | 1536x1536 | 2048x2048 | 4096x4096 |
| **Video Duration** | 5 sec | 10 sec | 30 sec | 60 sec | 120 sec |
| **Custom Models** | ❌ | ❌ | ❌ | ✓ | ✓ |
| **Priority Queue** | ❌ | ❌ | ✓ | ✓ | ✓ |
| **Private Endpoints** | ❌ | ❌ | ❌ | ✓ | ✓ |
| **Team Members** | 1 | 1 | 5 | 20 | Unlimited |
| **API Keys** | 1 | 3 | 10 | 50 | Unlimited |
| **Webhook Endpoints** | 1 | 3 | 10 | 50 | Unlimited |

## Detailed Permission Matrix

### Inference Permissions

| Action | Bayan Starter | Developer | Startup | Enterprise | Bayanihan |
|--------|---------------|-----------|---------|------------|-----------|
| **Chat Completions** | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Streaming** | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Image Generation** | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Video Generation** | ✓ | ✓ | ✓ | ✓ | ✓ |
| **3D Generation** | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Text-to-Speech** | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Speech-to-Text** | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Embeddings** | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Batch Processing** | ❌ | ❌ | ✓ | ✓ | ✓ |
| **Custom Fine-tuning** | ❌ | ❌ | ❌ | ✓ | ✓ |

### API Permissions

| Endpoint Type | Bayan Starter | Developer | Startup | Enterprise | Bayanihan |
|---------------|---------------|-----------|---------|------------|-----------|
| **/v1/chat/completions** | ✓ | ✓ | ✓ | ✓ | ✓ |
| **/v1/images/generations** | ✓ | ✓ | ✓ | ✓ | ✓ |
| **/v1/embeddings** | ✓ | ✓ | ✓ | ✓ | ✓ |
| **/v1/audio/speech** | ✓ | ✓ | ✓ | ✓ | ✓ |
| **/v1/audio/transcriptions** | ✓ | ✓ | ✓ | ✓ | ✓ |
| **/v1/customers/** | Read | R/W | R/W | Full | Full |
| **/v1/billing/** | Read | R/W | R/W | Full | Full |
| **/v1/webhooks/** | — | R/W | R/W | Full | Full |
| **/v1/admin/** | — | — | — | Full | Full |

Legend:
- ✓ = Full access
- Read = Read-only access
- R/W = Read and write access
- Full = CRUD + admin operations
- — = No access

### Resource Limits

| Resource | Bayan Starter | Developer | Startup | Enterprise | Bayanihan |
|----------|---------------|-----------|---------|------------|-----------|
| **Max Customers** | 10 | 100 | 1,000 | 10,000 | Unlimited |
| **Max Webhooks** | 1 | 3 | 10 | 50 | Unlimited |
| **Max API Keys** | 1 | 3 | 10 | 50 | Unlimited |
| **Data Retention** | 7 days | 30 days | 90 days | 1 year | Custom |
| **Request Logs** | 24 hours | 7 days | 30 days | 90 days | 1 year |
| **Max File Upload** | 5 MB | 25 MB | 100 MB | 500 MB | 2 GB |

## Model Access by Tier

### Chat Models

All tiers have access to:
- inno-ai-boyong-4.5
- inno-claude-3.5-sonnet
- inno-gpt-4o-mini
- inno-gemini-1.5-flash

**Enterprise & Bayanihan only:**
- inno-gpt-4o (latest)
- inno-claude-3-opus
- inno-gemini-1.5-pro
- Custom fine-tuned models

### Image Models

All tiers have access to budget and standard tiers.

**Startup+ only:**
- Premium models (Imagen 4, DALL-E 3)
- Higher resolution (1536x1536+)

**Enterprise+ only:**
- Ultra models (FLUX 1.1 Pro)
- Maximum resolution (2048x2048+)
- Custom LoRA models

### Video Models

All tiers have access to:
- Wan 2.1 T2V 1.3B

**Developer+ only:**
- Luma Dream Machine
- Pika 2.0
- Longer durations (10+ sec)

**Startup+ only:**
- Kling 1.6
- Hailuo AI
- 1080p resolution

**Enterprise+ only:**
- Runway Gen-3
- Custom video models

## Rate Limiting Details

### Request Rate Limits

```javascript
// Rate limit headers in API responses
X-RateLimit-Limit: 1000        // Maximum requests allowed
X-RateLimit-Remaining: 950     // Remaining requests
X-RateLimit-Reset: 1640995200  // Unix timestamp when limit resets
X-RateLimit-Retry-After: 60    // Seconds until you can retry
```

### Rate Limit Tiers

| Tier | Burst Limit | Sustained Rate |
|------|-------------|----------------|
| Bayan Starter | 10 req | 10 req/min |
| Developer | 100 req | 100 req/min |
| Startup | 1,000 req | 1,000 req/min |
| Enterprise | 10,000 req | 10,000 req/min |
| Bayanihan | Custom | Custom |

### Rate Limit Response

When you exceed your rate limit:

```json
{
  "error": {
    "code": "rate_limit_exceeded",
    "message": "Rate limit exceeded. Please retry after 60 seconds.",
    "type": "rate_limit_error",
    "retry_after": 60
  }
}
```

**HTTP Status:** 429 Too Many Requests

## Quota Management

### Daily Quotas

```javascript
// Check your quota usage
const response = await fetch('https://api.innoai.ph/v1/usage/quota', {
  headers: { 'Authorization': 'Bearer YOUR_API_KEY' }
});

const data = await response.json();
console.log(data);
```

**Response:**
```json
{
  "tier": "startup",
  "daily_quota": {
    "limit": 100000,
    "used": 45230,
    "remaining": 54770,
    "reset_at": "2026-02-22T00:00:00Z"
  },
  "rate_limit": {
    "limit": 1000,
    "window": "1m"
  }
}
```

### Increasing Quotas

To increase your quotas:

1. **Upgrade your tier** — Immediate increase
2. **Contact sales** — For Enterprise custom limits
3. **Request temporary increase** — For special events

## IP Whitelisting

Control where your API keys can be used:

```bash
# Add IP whitelist to API key
curl -X PUT https://api.innoai.ph/v1/api-keys/key_abc123 \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "allowed_ips": [
      "203.0.113.0/24",
      "10.0.0.0/8",
      "192.168.1.100"
    ]
  }'
```

## Geographic Restrictions

Restrict API usage to specific countries:

```json
{
  "allowed_countries": ["PH", "SG", "US"],
  "blocked_countries": ["CN", "RU"]
}
```

## Time-Based Access

Restrict API key usage to business hours:

```json
{
  "time_restrictions": {
    "timezone": "Asia/Manila",
    "allowed_hours": {
      "start": "08:00",
      "end": "18:00"
    },
    "allowed_days": ["monday", "tuesday", "wednesday", "thursday", "friday"]
  }
}
```

## Audit Logging

All access is logged:

| Tier | Log Retention | Export |
|------|---------------|--------|
| Bayan Starter | 24 hours | ❌ |
| Developer | 7 days | ❌ |
| Startup | 30 days | ✓ CSV |
| Enterprise | 90 days | ✓ CSV, JSON |
| Bayanihan | 1 year | ✓ All formats |

### Viewing Audit Logs

```bash
# Get audit logs (Startup+)
curl https://api.innoai.ph/v1/audit/logs \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "start_date": "2026-02-01",
    "end_date": "2026-02-21",
    "action": "inference"
  }'
```

## Team Access Control

### Roles (Startup+)

| Role | Permissions |
|------|-------------|
| **Owner** | Full access, billing management |
| **Admin** | Full access except billing |
| **Developer** | Inference, read customers/billing |
| **Viewer** | Read-only access |
| **Billing** | Read-only, billing management |

### Inviting Team Members

```bash
curl -X POST https://api.innoai.ph/v1/team/invite \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "dev@company.com",
    "role": "developer",
    "scopes": ["inference:read", "inference:write"]
  }'
```

## Compliance & Security

### SOC 2 (Enterprise+)

- Annual audits
- Access controls
- Data encryption
- Incident response

### Data Residency

| Tier | Data Location |
|------|---------------|
| All | Philippines (primary) |
| Enterprise+ | Philippines + Singapore backup |
| Bayanihan | Custom location available |

### Data Processing Agreement

Available for Enterprise and Bayanihan tiers.

## Best Practices

### 1. Use Least Privilege

```javascript
// ❌ Bad - Admin key for inference only
const client = new InnoAI({ apiKey: 'sk-admin-xxx' });

// ✅ Good - Scoped key for specific use
const client = new InnoAI({ 
  apiKey: 'sk-inference-xxx',
  scopes: ['inference:read', 'inference:write']
});
```

### 2. Rotate Keys Regularly

```bash
# Rotate keys every 90 days
innoai keys rotate --key sk-oldkey --name "Production V2"
```

### 3. Monitor Usage

```javascript
// Set up usage alerts
await fetch('https://api.innoai.ph/v1/alerts', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer YOUR_API_KEY' },
  body: JSON.stringify({
    type: 'usage_threshold',
    threshold: 80, // Alert at 80% of quota
    email: 'admin@company.com'
  })
});
```

## Upgrading Your Tier

1. Go to [Dashboard > Billing](https://dashboard.innoai.ph/billing)
2. Select new tier
3. Confirm payment
4. Changes take effect immediately

## Troubleshooting Access Issues

### "Insufficient permissions"

Your API key doesn't have the required scope. Check your key settings or create a new key with appropriate scopes.

### "Rate limit exceeded"

Wait for the rate limit window to reset or upgrade your tier for higher limits.

### "Daily quota exceeded"

Wait until tomorrow or upgrade your tier for higher daily limits.

---

**Need help with access control?** Contact support@innoai.ph
