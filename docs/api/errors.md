---
title: Error Codes
description: Complete reference for InnoAI API error codes and handling
---

# Error Codes

The InnoAI API uses conventional HTTP response codes and returns detailed error information to help you debug issues.

## HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| `200` | OK | Request succeeded |
| `201` | Created | Resource created successfully |
| `204` | No Content | Request succeeded, no content returned |
| `400` | Bad Request | Invalid request parameters |
| `401` | Unauthorized | Authentication required or failed |
| `403` | Forbidden | Valid authentication but insufficient permissions |
| `404` | Not Found | Resource not found |
| `409` | Conflict | Request conflicts with current state |
| `422` | Unprocessable Entity | Validation error |
| `429` | Too Many Requests | Rate limit exceeded |
| `500` | Internal Server Error | Server error (contact support) |
| `502` | Bad Gateway | Upstream service error |
| `503` | Service Unavailable | Temporary service outage |

## Error Response Format

All errors follow this structure:

```json
{
  "error": {
    "code": "error_code",
    "message": "Human-readable description",
    "type": "error_category",
    "param": "parameter_name",
    "request_id": "req_abc123",
    "documentation_url": "https://docs.innoai.ph/errors/error_code"
  }
}
```

## Error Types

### Authentication Errors

#### `invalid_api_key`

The provided API key is invalid or has been revoked.

**HTTP Status:** 401

```json
{
  "error": {
    "code": "invalid_api_key",
    "message": "The provided API key is invalid or has been revoked.",
    "type": "authentication_error",
    "request_id": "req_abc123"
  }
}
```

**Resolution:**
- Check that your API key is correct
- Verify the key hasn't been revoked in the dashboard
- Ensure you're using the right environment (production vs sandbox)

#### `token_expired`

The JWT token has expired.

**HTTP Status:** 401

```json
{
  "error": {
    "code": "token_expired",
    "message": "The provided token has expired. Please refresh or obtain a new token.",
    "type": "authentication_error",
    "request_id": "req_abc123"
  }
}
```

#### `missing_authorization`

No authorization header was provided.

**HTTP Status:** 401

```json
{
  "error": {
    "code": "missing_authorization",
    "message": "You must provide an Authorization header with a Bearer token.",
    "type": "authentication_error",
    "request_id": "req_abc123"
  }
}
```

### Authorization Errors

#### `insufficient_permissions`

Your API key doesn't have permission to perform this action.

**HTTP Status:** 403

```json
{
  "error": {
    "code": "insufficient_permissions",
    "message": "Your API key does not have permission to perform this action.",
    "type": "authorization_error",
    "required_scope": "customers:write",
    "request_id": "req_abc123"
  }
}
```

#### `ip_not_allowed`

Request from an unauthorized IP address.

**HTTP Status:** 403

```json
{
  "error": {
    "code": "ip_not_allowed",
    "message": "Request from IP 203.0.113.50 is not in the allowed list for this API key.",
    "type": "authorization_error",
    "request_id": "req_abc123"
  }
}
```

#### `account_suspended`

The account has been suspended.

**HTTP Status:** 403

```json
{
  "error": {
    "code": "account_suspended",
    "message": "Your account has been suspended. Please contact support@innoai.ph for assistance.",
    "type": "authorization_error",
    "suspension_reason": "Payment overdue",
    "request_id": "req_abc123"
  }
}
```

### Rate Limit Errors

#### `rate_limit_exceeded`

You've exceeded the rate limit for your tier.

**HTTP Status:** 429

```json
{
  "error": {
    "code": "rate_limit_exceeded",
    "message": "Rate limit exceeded. Please retry after 60 seconds.",
    "type": "rate_limit_error",
    "retry_after": 60,
    "limit": 1000,
    "period": "1m",
    "request_id": "req_abc123"
  }
}
```

#### `quota_exceeded`

You've exceeded your daily or monthly quota.

**HTTP Status:** 429

```json
{
  "error": {
    "code": "quota_exceeded",
    "message": "Daily quota of 100,000 requests exceeded. Resets at 2026-02-22T00:00:00Z.",
    "type": "rate_limit_error",
    "quota_type": "daily",
    "resets_at": "2026-02-22T00:00:00Z",
    "request_id": "req_abc123"
  }
}
```

### Invalid Request Errors

#### `model_not_found`

The specified model doesn't exist.

**HTTP Status:** 404

```json
{
  "error": {
    "code": "model_not_found",
    "message": "Model 'inno-invalid-model' not found",
    "type": "invalid_request_error",
    "param": "model",
    "request_id": "req_abc123"
  }
}
```

#### `context_length_exceeded`

The input exceeds the model's context window.

**HTTP Status:** 400

```json
{
  "error": {
    "code": "context_length_exceeded",
    "message": "This model's maximum context length is 4096 tokens. Your messages resulted in 5123 tokens.",
    "type": "invalid_request_error",
    "param": "messages",
    "max_tokens": 4096,
    "requested_tokens": 5123,
    "request_id": "req_abc123"
  }
}
```

#### `content_filter_triggered`

Content violates usage policies.

**HTTP Status:** 400

```json
{
  "error": {
    "code": "content_filter_triggered",
    "message": "Content violates usage policies",
    "type": "content_policy_error",
    "param": "messages",
    "request_id": "req_abc123"
  }
}
```

### Resource Errors

#### `customer_not_found`

The specified customer doesn't exist.

**HTTP Status:** 404

```json
{
  "error": {
    "code": "customer_not_found",
    "message": "Customer 'cust_unknown' not found",
    "type": "not_found_error",
    "request_id": "req_abc123"
  }
}
```

### Payment Errors

#### `payment_failed`

Payment was declined.

**HTTP Status:** 402

```json
{
  "error": {
    "code": "payment_failed",
    "message": "Payment was declined by GCash",
    "type": "payment_error",
    "payment_intent": "pi_xyz789",
    "decline_code": "insufficient_funds",
    "request_id": "req_abc123"
  }
}
```

#### `insufficient_credits`

Not enough credits for the request.

**HTTP Status:** 402

```json
{
  "error": {
    "code": "insufficient_credits",
    "message": "Insufficient credits. Required: ₱15.00, Available: ₱8.50",
    "type": "payment_error",
    "required": 15.00,
    "available": 8.50,
    "request_id": "req_abc123"
  }
}
```

### Server Errors

#### `internal_server_error`

An unexpected server error occurred.

**HTTP Status:** 500

```json
{
  "error": {
    "code": "internal_server_error",
    "message": "An unexpected error occurred. Please try again later.",
    "type": "server_error",
    "request_id": "req_abc123"
  }
}
```

## Error Handling Best Practices

### 1. Check Status Codes First

```javascript
const response = await fetch('https://ai-gateway.innoserver.cloud/v1/chat/completions', {
  method: 'POST',
  headers: { 
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'inno-ai-boyong-4.5',
    messages: [{ role: 'user', content: 'Hello' }]
  })
});

if (!response.ok) {
  const error = await response.json();
  console.error(`Error ${response.status}:`, error.error.message);
}
```

### 2. Implement Retry Logic

```javascript
async function makeRequestWithRetry(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      
      if (response.ok) {
        return response;
      }
      
      // Don't retry client errors (4xx)
      if (response.status >= 400 && response.status < 500) {
        throw new Error(`Client error: ${response.status}`);
      }
      
      // Server errors - retry with exponential backoff
      const delay = Math.pow(2, i) * 1000;
      await sleep(delay);
      
    } catch (error) {
      if (i === maxRetries - 1) throw error;
    }
  }
}
```

### 3. Handle Rate Limits

```javascript
async function handleRateLimit(response) {
  if (response.status === 429) {
    const error = await response.json();
    const retryAfter = error.error.retry_after || 60;
    
    console.log(`Rate limited. Waiting ${retryAfter} seconds...`);
    await sleep(retryAfter * 1000);
    
    // Retry the request
    return makeRequest(originalUrl, originalOptions);
  }
}
```

### 4. Log Request IDs

Always log the `request_id` for debugging:

```javascript
} catch (error) {
  console.error('Request failed:', {
    message: error.message,
    request_id: error.request_id,
    code: error.code
  });
  
  // Include request_id when contacting support
  // support@innoai.ph - Request ID: req_abc123
}
```

## SDK Error Handling

### JavaScript

```javascript
try {
  const response = await client.chat.completions.create({
    model: 'inno-ai-boyong-4.5',
    messages: [{ role: 'user', content: 'Hello' }]
  });
} catch (error) {
  if (error.code === 'rate_limit_exceeded') {
    await sleep(error.retry_after * 1000);
    // Retry
  } else if (error.code === 'insufficient_credits') {
    // Prompt user to add credits
  }
}
```

### Python

```python
from innoai import InnoAIError

try:
    response = client.chat.completions.create(
        model="inno-ai-boyong-4.5",
        messages=[{"role": "user", "content": "Hello"}]
    )
except InnoAIError as e:
    if e.code == "rate_limit_exceeded":
        time.sleep(e.retry_after)
        # Retry
```

## Getting Help

If you encounter errors you can't resolve:

1. **Check the docs** — Make sure you're using the API correctly
2. **Check status page** — Visit [status.innoai.ph](https://status.innoai.ph)
3. **Contact support** — Email support@innoai.ph with:
   - Your request ID
   - Error code and message
   - Timestamp of the error
   - Code snippet (without API keys)

---

**Still having issues?** Contact support@innoai.ph
