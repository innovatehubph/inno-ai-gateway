---
title: Authentication
description: Learn about API keys, JWT tokens, and access control in InnoAI
---

# Authentication

InnoAI supports multiple authentication methods to suit different use cases. This guide covers API keys, JWT tokens, request signing, and access level management.

## Authentication Methods

### API Keys (Recommended for Server-to-Server)

API keys are the simplest way to authenticate. Use them for:
- Backend services
- Server-side applications
- Scripts and automation

#### Creating an API Key

1. Log in to the [Dashboard](https://dashboard.innoai.ph)
2. Go to **Settings > API Keys**
3. Click **"Create New Key"**
4. Enter a descriptive name
5. Select appropriate permissions
6. Copy the key immediately (shown only once)

#### Using API Keys

```bash
curl https://ai-gateway.innoserver.cloud/v1/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"inno-ai-boyong-4.5","messages":[{"role":"user","content":"Hello"}]}'
```

```javascript
import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'https://ai-gateway.innoserver.cloud/v1',
  apiKey: 'your-api-key', // Your InnoAI API key
});
```

### JWT Tokens (For User Sessions)

JWT tokens are used for:
- Authenticated user sessions
- Multi-tenant applications
- Temporary access grants

#### Obtaining a JWT Token

```bash
curl -X POST https://api.innoai.ph/v1/auth/token \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "your-api-key",
    "customer_id": "customer-123"
  }'
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Using JWT Tokens

```bash
curl https://ai-gateway.innoserver.cloud/v1/chat/completions \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{"model":"inno-ai-boyong-4.5","messages":[{"role":"user","content":"Hello"}]}'
```

### Request Signing (For Webhooks)

Verify webhook authenticity using request signatures:

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// Usage
const signature = req.headers['x-innoai-signature'];
const payload = JSON.stringify(req.body);

if (!verifyWebhookSignature(payload, signature, webhookSecret)) {
  return res.status(401).json({ error: 'Invalid signature' });
}
```

## Access Levels & Permissions

InnoAI uses a tiered access control system:

### Permission Levels

| Level | Description | Capabilities |
|-------|-------------|--------------|
| **Read** | View-only access | GET requests, list resources |
| **Write** | Create and modify | POST, PUT, PATCH requests |
| **Delete** | Remove resources | DELETE requests |
| **Admin** | Full access | All operations, manage keys |

### API Key Scopes

When creating an API key, you can specify scopes:

```json
{
  "name": "Production Backend",
  "scopes": [
    "inference:read",
    "inference:write",
    "billing:read",
    "customers:read"
  ],
  "allowed_ips": ["192.168.1.0/24", "10.0.0.0/8"],
  "rate_limit": 1000
}
```

#### Available Scopes

| Scope | Description |
|-------|-------------|
| `inference:read` | Access inference endpoints |
| `inference:write` | Create inference requests |
| `customers:read` | View customer data |
| `customers:write` | Modify customer data |
| `customers:delete` | Delete customers |
| `billing:read` | View billing information |
| `billing:write` | Update billing settings |
| `webhooks:read` | View webhook configurations |
| `webhooks:write` | Manage webhooks |
| `admin:full` | Full administrative access |

## Security Best Practices

### 1. Use Environment Variables

Never hardcode API keys in your code:

```javascript
// ❌ Bad
const apiKey = 'sk-abc123...';

// ✅ Good
const apiKey = process.env.INNOAI_API_KEY;
```

### 2. Rotate Keys Regularly

```bash
# Create a new key
innoai keys create --name "Production V2"

# Update your application
# Verify new key works

# Revoke old key
innoai keys revoke sk-oldkey...
```

### 3. Use IP Whitelisting

Restrict API key usage to specific IP addresses:

```json
{
  "allowed_ips": [
    "203.0.113.0/24",      // Your office
    "10.0.0.0/8"           // Internal network
  ]
}
```

### 4. Implement Token Refresh

```javascript
async function refreshToken(refreshToken) {
  const response = await fetch('https://api.innoai.ph/v1/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken })
  });
  
  const data = await response.json();
  return data.access_token;
}
```

### 5. Handle Expired Tokens

```javascript
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const newToken = await refreshToken(refreshToken);
      error.config.headers['Authorization'] = `Bearer ${newToken}`;
      return client.request(error.config);
    }
    return Promise.reject(error);
  }
);
```

## Multi-Tenant Authentication

For applications serving multiple customers:

```javascript
// Create a customer-scoped token
const token = await fetch('https://api.innoai.ph/v1/auth/token', {
  method: 'POST',
  headers: { 
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    customer_id: 'customer-123',
    scopes: ['inference:read', 'inference:write'],
    expires_in: 3600 // 1 hour
  })
});

// Use customer token
const customerClient = new OpenAI({
  baseURL: 'https://ai-gateway.innoserver.cloud/v1',
  apiKey: token.access_token,
});
```

## Error Handling

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

### Insufficient Permissions

```json
{
  "error": {
    "code": "insufficient_permissions",
    "message": "Your API key does not have permission to perform this action.",
    "type": "authorization_error",
    "required_scope": "customers:write"
  }
}
```

### Rate Limit Exceeded

```json
{
  "error": {
    "code": "rate_limit_exceeded",
    "message": "Rate limit exceeded. Please try again later.",
    "type": "rate_limit_error",
    "retry_after": 60
  }
}
```

## Testing Authentication

### Validate Your API Key

```bash
curl https://api.innoai.ph/v1/auth/validate \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**Response:**
```json
{
  "valid": true,
  "key_id": "key_abc123",
  "scopes": ["inference:read", "inference:write"],
  "rate_limit": 1000,
  "tier": "startup"
}
```

## SDK Authentication Examples

### Python

```python
from innoai import InnoAI

# API Key auth
client = InnoAI(api_key="your-api-key")

# Or with environment variable
import os
client = InnoAI(api_key=os.environ["INNOAI_API_KEY"])
```

### PHP

```php
<?php
use InnoAI\Client;

$client = new Client([
    'api_key' => $_ENV['INNOAI_API_KEY'],
    'base_url' => 'https://ai-gateway.innoserver.cloud/v1'
]);
```

### Ruby

```ruby
require 'innoai'

client = InnoAI::Client.new(
  api_key: ENV['INNOAI_API_KEY'],
  base_url: 'https://ai-gateway.innoserver.cloud/v1'
)
```

## Next Steps

- [View access control matrix](/getting-started/access-control) — Understand tier permissions
- [Set up webhooks](/guide/webhooks) — Configure event notifications
- [Review security best practices](/guide/best-practices) — Secure your integration

---

Need help with authentication? Contact support@innoai.ph or join our [Discord community](https://discord.gg/innoai).
