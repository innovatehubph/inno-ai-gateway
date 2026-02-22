---
title: API Authentication
description: Complete guide to authentication methods in the InnoAI API
---

# API Authentication

The InnoAI API supports multiple authentication methods to accommodate different integration patterns and security requirements.

## Base URLs

| Environment | URL |
|-------------|-----|
| **Production** | `https://ai-gateway.innoserver.cloud/v1` |
| **Sandbox** | `https://sandbox.innoai.ph/v1` |

## Authentication Methods

### 1. API Key Authentication (Recommended)

API keys are the primary authentication method for server-to-server integrations. They're simple to use and support granular permissions.

#### Header Format

```
Authorization: Bearer YOUR_API_KEY
```

#### Example Request

```bash
curl https://ai-gateway.innoserver.cloud/v1/chat/completions \
  -H "Authorization: Bearer sk-abc123def456" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "inno-ai-boyong-4.5",
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

#### Creating API Keys

```bash
# Via API
curl -X POST https://api.innoai.ph/v1/api-keys \
  -H "Authorization: Bearer YOUR_MASTER_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Production Backend",
    "scopes": ["inference:read", "inference:write"],
    "expires_at": "2026-12-31T23:59:59Z"
  }'
```

**Response:**
```json
{
  "id": "key_abc123",
  "key": "sk-live-abc123def456...",
  "name": "Production Backend",
  "scopes": ["inference:read", "inference:write"],
  "created_at": "2026-02-21T10:00:00Z",
  "expires_at": "2026-12-31T23:59:59Z"
}
```

::: warning Store Securely
The API key is only shown once at creation. Store it securely in environment variables or a secrets manager.
:::

### 2. JWT Token Authentication

JWT tokens are used for user sessions and temporary access grants. They're ideal for:
- Client-side applications
- Multi-tenant scenarios
- Short-lived access

#### Obtaining a JWT Token

**Request:**
```bash
curl -X POST https://api.innoai.ph/v1/auth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "api_key",
    "api_key": "your-api-key",
    "customer_id": "optional-customer-id"
  }'
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "scope": "inference:read inference:write"
}
```

#### Using JWT Tokens

```bash
curl https://ai-gateway.innoserver.cloud/v1/chat/completions \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{"model":"inno-ai-boyong-4.5","messages":[{"role":"user","content":"Hello"}]}'
```

#### Refreshing Tokens

```bash
curl -X POST https://api.innoai.ph/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

### 3. Request Signing (Webhooks)

For webhook verification, InnoAI signs requests using HMAC-SHA256.

#### Verifying Signatures

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// Express middleware example
app.post('/webhooks/innoai', (req, res) => {
  const signature = req.headers['x-innoai-signature'];
  const secret = process.env.INNOAI_WEBHOOK_SECRET;
  
  const payload = JSON.stringify(req.body);
  
  if (!verifyWebhookSignature(payload, signature, secret)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  // Process webhook
  res.status(200).json({ received: true });
});
```

#### Python Example

```python
import hmac
import hashlib

def verify_webhook_signature(payload: str, signature: str, secret: str) -> bool:
    expected = hmac.new(
        secret.encode('utf-8'),
        payload.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(signature, expected)
```

## API Key Scopes

Scopes control what an API key can do:

| Scope | Description |
|-------|-------------|
| `inference:read` | View inference requests and results |
| `inference:write` | Create inference requests |
| `customers:read` | View customer data |
| `customers:write` | Create and update customers |
| `customers:delete` | Delete customers |
| `billing:read` | View billing information |
| `billing:write` | Update billing settings |
| `webhooks:read` | View webhook configurations |
| `webhooks:write` | Create and update webhooks |
| `api-keys:read` | View API keys |
| `api-keys:write` | Create and manage API keys |
| `admin:full` | Full administrative access |

### Creating Scoped Keys

```bash
curl -X POST https://api.innoai.ph/v1/api-keys \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Frontend Inference Only",
    "scopes": ["inference:read", "inference:write"],
    "rate_limit": 100,
    "allowed_ips": ["203.0.113.0/24"]
  }'
```

## Security Best Practices

### 1. Use Environment Variables

```javascript
// ❌ Never hardcode keys
const apiKey = 'sk-abc123...';

// ✅ Use environment variables
const apiKey = process.env.INNOAI_API_KEY;
```

### 2. Implement Key Rotation

```bash
# 1. Create new key
NEW_KEY=$(innoai keys create --name "Production V2" --scopes inference)

# 2. Update application config
export INNOAI_API_KEY=$NEW_KEY

# 3. Restart services
pm2 restart all

# 4. Revoke old key after 24h
innoai keys revoke sk-oldkey...
```

### 3. Use IP Whitelisting

```json
{
  "name": "Production",
  "scopes": ["inference:read", "inference:write"],
  "allowed_ips": [
    "203.0.113.10",           // Single IP
    "10.0.0.0/8",             // CIDR range
    "192.168.1.0/24"          // Private network
  ]
}
```

### 4. Set Expiration Dates

```bash
curl -X POST https://api.innoai.ph/v1/api-keys \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "name": "Temporary Access",
    "scopes": ["inference:write"],
    "expires_at": "2026-03-21T00:00:00Z"
  }'
```

### 5. Monitor Key Usage

```bash
# Get usage for a specific key
curl https://api.innoai.ph/v1/api-keys/key_abc123/usage \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**Response:**
```json
{
  "key_id": "key_abc123",
  "requests_today": 1523,
  "tokens_consumed": 450000,
  "last_used": "2026-02-21T14:30:00Z",
  "top_endpoints": [
    { "endpoint": "/v1/chat/completions", "count": 1200 },
    { "endpoint": "/v1/images/generations", "count": 323 }
  ]
}
```

## Error Responses

### Invalid API Key

```json
{
  "error": {
    "code": "invalid_api_key",
    "message": "The provided API key is invalid or has been revoked.",
    "type": "authentication_error"
  }
}
```

**HTTP Status:** 401 Unauthorized

### Expired Token

```json
{
  "error": {
    "code": "token_expired",
    "message": "The provided token has expired. Please refresh or obtain a new token.",
    "type": "authentication_error"
  }
}
```

**HTTP Status:** 401 Unauthorized

### Insufficient Permissions

```json
{
  "error": {
    "code": "insufficient_permissions",
    "message": "Your API key does not have the required scope 'customers:write' to perform this action.",
    "type": "authorization_error",
    "required_scope": "customers:write"
  }
}
```

**HTTP Status:** 403 Forbidden

### IP Not Allowed

```json
{
  "error": {
    "code": "ip_not_allowed",
    "message": "Request from IP 203.0.113.50 is not in the allowed list for this API key.",
    "type": "authorization_error"
  }
}
```

**HTTP Status:** 403 Forbidden

## Testing Authentication

### Validate API Key

```bash
curl https://api.innoai.ph/v1/auth/validate \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**Response:**
```json
{
  "valid": true,
  "key_id": "key_abc123",
  "name": "Production",
  "scopes": ["inference:read", "inference:write"],
  "tier": "startup",
  "rate_limit": 1000,
  "expires_at": null
}
```

### Test Endpoint

```bash
# Simple test that doesn't consume credits
curl https://ai-gateway.innoserver.cloud/v1/models \
  -H "Authorization: Bearer YOUR_API_KEY"
```

## SDK Authentication

### JavaScript/TypeScript

```javascript
import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'https://ai-gateway.innoserver.cloud/v1',
  apiKey: process.env.INNOAI_API_KEY,
});
```

### Python

```python
from openai import OpenAI

client = OpenAI(
    base_url="https://ai-gateway.innoserver.cloud/v1",
    api_key=os.environ.get("INNOAI_API_KEY")
)
```

### PHP

```php
<?php
$client = \OpenAI::factory()
    ->withBaseUri('https://ai-gateway.innoserver.cloud/v1')
    ->withApiKey($_ENV['INNOAI_API_KEY'])
    ->make();
```

### cURL

```bash
export INNOAI_API_KEY="your-api-key"

curl https://ai-gateway.innoserver.cloud/v1/chat/completions \
  -H "Authorization: Bearer $INNOAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"inno-ai-boyong-4.5","messages":[{"role":"user","content":"Hello"}]}'
```

## Multi-Tenant Authentication

For applications serving multiple customers:

```javascript
// 1. Get customer-scoped token
const tokenResponse = await fetch('https://api.innoai.ph/v1/auth/token', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_MASTER_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    customer_id: 'customer-123',
    scopes: ['inference:read', 'inference:write'],
    expires_in: 3600
  })
});

const { access_token } = await tokenResponse.json();

// 2. Use customer token
const customerClient = new OpenAI({
  baseURL: 'https://ai-gateway.innoserver.cloud/v1',
  apiKey: access_token,
});
```

## Next Steps

- [View customers API](/api/customers) — Manage customer access
- [Learn about rate limits](/api/rate-limits) — Understand API quotas
- [Set up webhooks](/guide/webhooks) — Receive event notifications

---

**Authentication issues?** Contact security@innoai.ph
