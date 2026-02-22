---
title: Rate Limits
description: Understanding rate limits and quotas in the InnoAI API
---

# Rate Limits

Rate limits control how many requests you can make to the InnoAI API within a specific time window.

## Rate Limit Tiers

| Tier | Requests/Min | Daily Limit | Concurrent | Burst |
|------|--------------|-------------|------------|-------|
| **Bayan Starter** | 10 | 1,000 | 2 | 10 |
| **Developer** | 100 | 10,000 | 10 | 100 |
| **Startup** | 1,000 | 100,000 | 50 | 1,000 |
| **Enterprise** | 10,000 | Unlimited | 200 | 10,000 |
| **Bayanihan** | Custom | Unlimited | Custom | Custom |

## Rate Limit Headers

All responses include rate limit headers:

```
X-RateLimit-Limit: 1000          # Maximum requests per minute
X-RateLimit-Remaining: 950       # Remaining requests in window
X-RateLimit-Reset: 1700000000    # Unix timestamp when limit resets
X-RateLimit-Retry-After: 60      # Seconds until you can retry (on 429)
```

### Reading Headers

```javascript
const response = await fetch('https://ai-gateway.innoserver.cloud/v1/chat/completions', {...});

const limit = response.headers.get('X-RateLimit-Limit');
const remaining = response.headers.get('X-RateLimit-Remaining');
const reset = response.headers.get('X-RateLimit-Reset');

console.log(`Used: ${limit - remaining}/${limit}`);
```

## Handling Rate Limits

### Exponential Backoff

```javascript
async function makeRequestWithBackoff(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const response = await fetch(url, options);
    
    if (response.status === 429) {
      const retryAfter = response.headers.get('X-RateLimit-Retry-After') || Math.pow(2, i);
      console.log(`Rate limited. Retrying after ${retryAfter}s...`);
      await sleep(retryAfter * 1000);
      continue;
    }
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    return response;
  }
  
  throw new Error('Max retries exceeded');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

### Using a Rate Limiter

```javascript
import Bottleneck from 'bottleneck';

const limiter = new Bottleneck({
  minTime: 60,        // Minimum time between requests (ms)
  maxConcurrent: 50,  // Max concurrent requests
});

const makeApiCall = limiter.wrap(async (payload) => {
  const response = await fetch('https://ai-gateway.innoserver.cloud/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer YOUR_API_KEY',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  return response.json();
});
```

## Monitoring Usage

### Get Current Usage

```bash
curl https://api.innoai.ph/v1/usage/current \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**Response:**
```json
{
  "period": "2026-02-01 to 2026-02-21",
  "requests": {
    "total": 45230,
    "by_endpoint": {
      "/v1/chat/completions": 38000,
      "/v1/images/generations": 5000
    }
  },
  "cost": {
    "total": 1523.50,
    "currency": "PHP"
  },
  "rate_limits": {
    "tier": "startup",
    "requests_per_minute": 1000,
    "daily_quota": 100000
  }
}
```

### Set Up Alerts

```bash
curl -X POST https://api.innoai.ph/v1/alerts \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "usage_threshold",
    "threshold": 80,
    "metric": "daily_requests",
    "email": "admin@company.com"
  }'
```

## Optimizing for Rate Limits

### 1. Batch Requests

```javascript
// ❌ Bad: One request per embedding
for (const text of texts) {
  const res = await client.embeddings.create({...});
}

// ✅ Good: Batch all texts
const response = await client.embeddings.create({
  model: 'inno-minilm-l6-v2',
  input: texts  // Array of texts
});
```

### 2. Use Caching

```javascript
import NodeCache from 'node-cache';
const cache = new NodeCache({ stdTTL: 3600 });

async function getEmbedding(text) {
  const cacheKey = `emb:${hash(text)}`;
  
  let embedding = cache.get(cacheKey);
  if (embedding) return embedding;
  
  const response = await client.embeddings.create({...});
  embedding = response.data[0].embedding;
  cache.set(cacheKey, embedding);
  
  return embedding;
}
```

### 3. Use Streaming

```javascript
const stream = await client.chat.completions.create({
  model: 'inno-ai-boyong-4.5',
  messages: [...],
  stream: true  // Enable streaming
});
```

## Error Responses

### Rate Limit Exceeded

```json
{
  "error": {
    "code": "rate_limit_exceeded",
    "message": "Rate limit of 1000 requests per minute exceeded.",
    "type": "rate_limit_error",
    "retry_after": 45,
    "request_id": "req_abc123"
  }
}
```

### Daily Quota Exceeded

```json
{
  "error": {
    "code": "quota_exceeded",
    "message": "Daily quota exceeded. Resets at 2026-02-22T00:00:00Z.",
    "type": "rate_limit_error",
    "resets_at": "2026-02-22T00:00:00Z",
    "request_id": "req_abc123"
  }
}
```

## Best Practices

1. **Monitor headers** — Track `X-RateLimit-Remaining`
2. **Implement backoff** — Exponential backoff on 429 errors
3. **Cache responses** — Avoid redundant API calls
4. **Batch requests** — Combine operations when possible
5. **Use streaming** — Better UX for chat
6. **Set up alerts** — Get notified before hitting limits

---

**Need higher limits?** Contact sales@innoai.ph
