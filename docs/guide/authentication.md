# Authentication Guide

## Overview

InnoAI supports multiple authentication methods tailored to different use cases. Choose the appropriate method based on your integration requirements and security needs.

---

## Authentication Methods

### 1. JWT Bearer Token (Customer Portal)

**Use for:**
- Customer management operations
- Billing and subscription management
- Usage analytics and reporting
- Webhook configuration
- API key management

**Header Format:**
```
Authorization: Bearer <jwt_token>
```

#### Obtaining a JWT Token

**Method 1: Login Endpoint**

```bash
curl -X POST "https://api.innoai.com/api/customer/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "your_secure_password"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "Bearer",
    "expires_in": 3600,
    "expires_at": "2026-02-21T15:45:30Z"
  }
}
```

**Method 2: Refresh Token**

```bash
curl -X POST "https://api.innoai.com/api/customer/auth/refresh" \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

#### Token Lifecycle

| Property | Value | Description |
|----------|-------|-------------|
| Access Token TTL | 1 hour | Short-lived for security |
| Refresh Token TTL | 30 days | Long-lived, single use |
| Auto-refresh | Yes | Tokens refresh automatically in SDK |

#### Example Usage

```bash
# Get customer profile
curl -X GET "https://api.innoai.com/api/v1/customers/me" \
  -H "Authorization: Bearer $JWT_TOKEN"

# Update billing information
curl -X PUT "https://api.innoai.com/api/v1/customers/me/billing" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "payment_method": "card",
    "card_token": "tok_visa_4242"
  }'

# View usage
curl -X GET "https://api.innoai.com/api/v1/usage" \
  -H "Authorization: Bearer $JWT_TOKEN"
```

---

### 2. API Key (AI Inference)

**Use for:**
- Model inference requests
- Chat completions
- Image generation
- Audio processing
- Production applications

**Header Format:**
```
X-API-Key: <api_key>
```

#### Obtaining an API Key

**Method 1: Customer Portal**

1. Login to [https://portal.innoai.com](https://portal.innoai.com)
2. Navigate to **API Keys** section
3. Click **Create New Key**
4. Name your key (e.g., "Production App")
5. Copy the key (shown only once)

**Method 2: API Endpoint**

```bash
curl -X POST "https://api.innoai.com/api/v1/customers/api-keys" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Production API Key",
    "description": "For main application",
    "scopes": ["inference:read", "inference:write"]
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "key_1234567890",
    "name": "Production API Key",
    "key": "inno_live_abc123xyz789",  
    "prefix": "inno_live",
    "scopes": ["inference:read", "inference:write"],
    "created_at": "2026-02-21T10:00:00Z",
    "last_used_at": null,
    "expires_at": null
  }
}
```

#### API Key Format

```
inno_live_<random_string>    # Live/production key
inno_test_<random_string>    # Test/sandbox key
```

#### Example Usage

```bash
# Chat completion
curl -X POST "https://api.innoai.com/v1/chat/completions" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4",
    "messages": [
      {"role": "user", "content": "Hello!"}
    ]
  }'

# Image generation
curl -X POST "https://api.innoai.com/v1/images/generations" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "sd-xl",
    "prompt": "A beautiful sunset over Manila Bay",
    "n": 1,
    "size": "1024x1024"
  }'
```

#### Managing API Keys

```bash
# List all keys
curl -X GET "https://api.innoai.com/api/v1/customers/api-keys" \
  -H "Authorization: Bearer $JWT_TOKEN"

# Revoke a key
curl -X DELETE "https://api.innoai.com/api/v1/customers/api-keys/key_1234567890" \
  -H "Authorization: Bearer $JWT_TOKEN"

# Rotate a key
curl -X POST "https://api.innoai.com/api/v1/customers/api-keys/key_1234567890/rotate" \
  -H "Authorization: Bearer $JWT_TOKEN"
```

---

### 3. Admin Key (Admin Operations)

**Use for:**
- Admin panel operations
- System configuration
- Billing setup and management
- Customer provisioning
- Platform-wide settings

**Header Format:**
```
x-admin-key: <admin_key>
```

⚠️ **Warning:** Admin keys grant full system access. Use with extreme caution.

#### Setting the Admin Key

Set via environment variable when deploying the gateway:

```bash
# Docker
export ADMIN_KEY="admin_very_secure_random_string_32_chars"

# docker-compose.yml
environment:
  - ADMIN_KEY=admin_very_secure_random_string_32_chars

# Kubernetes
kubectl create secret generic admin-key \
  --from-literal=ADMIN_KEY=admin_very_secure_random_string_32_chars
```

#### Admin Operations

```bash
# Create new customer
curl -X POST "https://api.innoai.com/admin/v1/customers" \
  -H "x-admin-key: $ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newcustomer@example.com",
    "tier": "professional",
    "name": "New Customer Inc"
  }'

# Update customer tier
curl -X PUT "https://api.innoai.com/admin/v1/customers/cust_123/tier" \
  -H "x-admin-key: $ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "tier": "enterprise",
    "reason": "Contract upgrade"
  }'

# Get system health
curl -X GET "https://api.innoai.com/admin/v1/health" \
  -H "x-admin-key: $ADMIN_KEY"
```

---

## Authentication Comparison

| Feature | JWT Token | API Key | Admin Key |
|---------|-----------|---------|-----------|
| **Purpose** | Customer portal | AI inference | Admin operations |
| **Header** | `Authorization: Bearer` | `X-API-Key` | `x-admin-key` |
| **Lifetime** | 1 hour (refreshable) | Indefinite / configurable | Permanent |
| **Scopes** | Full customer access | Inference only | Full system access |
| **Rotation** | Automatic | Manual via portal/API | Manual (env var) |
| **Revocation** | Logout | Immediate | Restart required |
| **Best for** | Web apps, dashboards | Backend services | DevOps, support |

---

## Security Best Practices

### 1. Store Credentials Securely

**❌ Never:**
```bash
# Hardcode in scripts
API_KEY="inno_live_abc123"

# Store in version control
# config.json
{
  "api_key": "inno_live_abc123"
}

# Log to console
console.log("API Key:", process.env.API_KEY)
```

**✅ Always:**
```bash
# Use environment variables
export INNOAI_API_KEY="inno_live_abc123"

# Use secret management
# AWS Secrets Manager
aws secretsmanager get-secret-value --secret-id innoai/api-key

# HashiCorp Vault
vault kv get secret/innoai/api-key
```

### 2. Use JWT for Browser-Based Apps

```javascript
// ❌ Don't use API keys in client-side code
const apiKey = "inno_live_abc123";  // Exposed to users!

// ✅ Use JWT with your backend
async function getChatCompletion(message) {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getSessionToken()}`  // From your auth
    },
    body: JSON.stringify({ message })
  });
  return response.json();
}

// Backend (Node.js example)
app.post('/api/chat', async (req, res) => {
  const userToken = req.headers.authorization;
  
  // Validate user with your auth system
  const user = await validateUser(userToken);
  
  // Make request to InnoAI with API key (server-side only)
  const response = await fetch('https://api.innoai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'X-API-Key': process.env.INNOAI_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(req.body)
  });
  
  res.json(await response.json());
});
```

### 3. Rotate Keys Regularly

```bash
#!/bin/bash
# Key rotation script

# 1. Create new key
echo "Creating new API key..."
NEW_KEY=$(curl -s -X POST "https://api.innoai.com/api/v1/customers/api-keys" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Production API Key - Rotated"}' | jq -r '.data.key')

# 2. Update environment variable (in your deployment system)
echo "Updating deployment..."
kubectl set env deployment/myapp INNOAI_API_KEY="$NEW_KEY"

# 3. Wait for rollout
echo "Waiting for rollout..."
kubectl rollout status deployment/myapp

# 4. Revoke old key
echo "Revoking old key..."
curl -X DELETE "https://api.innoai.com/api/v1/customers/api-keys/$OLD_KEY_ID" \
  -H "Authorization: Bearer $JWT_TOKEN"

echo "Rotation complete!"
```

**Rotation Schedule:**
- **Test keys**: Every 90 days
- **Production keys**: Every 180 days
- **Immediately**: If key is compromised or exposed

### 4. Never Commit Keys to Git

**.gitignore:**
```
# Secrets
.env
.env.local
.env.production
config/secrets.yml
*.key
*.pem
```

**Pre-commit hook (.git/hooks/pre-commit):**
```bash
#!/bin/bash
# Check for potential API keys
if git diff --cached --name-only | xargs grep -l "inno_live_\|inno_test_" 2>/dev/null; then
    echo "ERROR: Potential API keys found in staged files!"
    echo "Remove keys before committing."
    exit 1
fi
```

### 5. Use Principle of Least Privilege

**Scope your API keys:**

```bash
# Create key with limited scopes
curl -X POST "https://api.innoai.com/api/v1/customers/api-keys" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Read-Only Analytics",
    "scopes": ["usage:read"],
    "allowed_ips": ["203.0.113.0/24"]
  }'
```

**Available Scopes:**

| Scope | Description |
|-------|-------------|
| `inference:read` | Read model outputs |
| `inference:write` | Generate content |
| `usage:read` | View usage statistics |
| `billing:read` | View billing info |
| `customer:read` | Read customer profile |
| `customer:write` | Update customer info |

### 6. Monitor Key Usage

```bash
# Check key activity
curl -X GET "https://api.innoai.com/api/v1/customers/api-keys/key_123/activity" \
  -H "Authorization: Bearer $JWT_TOKEN"
```

**Response:**
```json
{
  "key_id": "key_123",
  "last_used_at": "2026-02-21T14:30:00Z",
  "last_used_ip": "203.0.113.45",
  "total_requests": 15420,
  "unique_ips": ["203.0.113.45", "198.51.100.12"],
  "suspicious_activity": false
}
```

### 7. Enable IP Restrictions (Enterprise)

```bash
curl -X PUT "https://api.innoai.com/api/v1/customers/api-keys/key_123" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "allowed_ips": [
      "203.0.113.0/24",
      "198.51.100.10/32"
    ]
  }'
```

---

## Error Handling

### Authentication Errors

| Error Code | HTTP Status | Meaning | Resolution |
|------------|-------------|---------|------------|
| `invalid_token` | 401 | JWT is expired or malformed | Refresh token or re-login |
| `invalid_api_key` | 401 | API key doesn't exist | Check key format and validity |
| `api_key_revoked` | 401 | Key has been revoked | Generate new key |
| `missing_auth` | 401 | No authentication provided | Add required headers |
| `insufficient_scope` | 403 | Key lacks required permissions | Use key with correct scopes |

### Example Error Responses

**Expired JWT:**
```json
{
  "error": "invalid_token",
  "message": "The access token has expired",
  "details": {
    "expired_at": "2026-02-21T14:00:00Z",
    "current_time": "2026-02-21T14:05:00Z"
  }
}
```

**Invalid API Key:**
```json
{
  "error": "invalid_api_key",
  "message": "The provided API key is invalid",
  "details": {
    "key_prefix": "inno_live",
    "suggestion": "Verify the key is copied correctly"
  }
}
```

**Missing Scope:**
```json
{
  "error": "insufficient_scope",
  "message": "API key lacks required scope for this operation",
  "details": {
    "required": ["inference:write"],
    "provided": ["inference:read"]
  }
}
```

---

## SDK Authentication

### Python

```python
from innoai import InnoAIClient

# Using API key
client = InnoAIClient(api_key="inno_live_abc123")

# Using JWT (for customer operations)
client = InnoAIClient(access_token="eyJhbGciOiJIUzI1NiIs...")

# Auto-refresh with JWT
client = InnoAIClient(
    access_token="eyJhbGciOiJIUzI1NiIs...",
    refresh_token="eyJhbGciOiJIUzI1NiIs...",
    auto_refresh=True
)
```

### JavaScript/TypeScript

```typescript
import { InnoAI } from '@innoai/sdk';

// Using API key
const client = new InnoAI({
  apiKey: process.env.INNOAI_API_KEY
});

// Using JWT
const client = new InnoAI({
  accessToken: sessionToken,
  refreshToken: refreshToken
});
```

---

## Migration Guide

### From API Key to JWT

If you're currently using API keys for customer operations, migrate to JWT:

```bash
# 1. Obtain JWT
curl -X POST "https://api.innoai.com/api/customer/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "...", "password": "..."}'

# 2. Update your code
# Before:
curl -H "X-API-Key: $API_KEY" \
  "https://api.innoai.com/api/v1/usage"

# After:
curl -H "Authorization: Bearer $JWT_TOKEN" \
  "https://api.innoai.com/api/v1/usage"
```

---

## Support

Having authentication issues?

1. Check [Error Reference](../api/errors.md) for specific error codes
2. Verify your credentials in the [Customer Portal](https://portal.innoai.com)
3. Contact support with your API key prefix (never share full keys)

**Support Channels:**
- **Starter**: support@innoai.com
- **Professional**: priority@innoai.com  
- **Enterprise**: Dedicated account manager
