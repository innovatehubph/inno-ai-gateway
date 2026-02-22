---
title: Best Practices
description: Integration best practices for InnoAI
---

# Best Practices

Follow these best practices to build robust, efficient, and cost-effective applications with InnoAI.

## API Integration

### 1. Use Environment Variables

Never hardcode API keys in your code:

```javascript
// ❌ Bad
const apiKey = 'sk-abc123...';

// ✅ Good
const apiKey = process.env.INNOAI_API_KEY;
```

### 2. Implement Retry Logic

Handle transient failures gracefully:

```javascript
async function makeRequestWithRetry(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      // Don't retry client errors
      if (error.status >= 400 && error.status < 500) {
        throw error;
      }
      
      // Rate limit - wait and retry
      if (error.status === 429) {
        const delay = error.retry_after || Math.pow(2, i) * 1000;
        await sleep(delay);
        continue;
      }
      
      // Server error - retry with backoff
      if (i < maxRetries - 1) {
        await sleep(Math.pow(2, i) * 1000);
      }
    }
  }
  throw new Error('Max retries exceeded');
}
```

### 3. Use Connection Pooling

Reuse connections for better performance:

```javascript
import https from 'https';

const agent = new https.Agent({
  keepAlive: true,
  maxSockets: 50
});

const client = new OpenAI({
  baseURL: 'https://ai-gateway.innoserver.cloud/v1',
  apiKey: process.env.INNOAI_API_KEY,
  httpAgent: agent
});
```

### 4. Implement Circuit Breaker

Prevent cascading failures:

```javascript
import CircuitBreaker from 'opossum';

const breaker = new CircuitBreaker(makeApiCall, {
  timeout: 30000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000
});

breaker.on('open', () => {
  console.log('Circuit breaker opened');
});

// Use it
try {
  const result = await breaker.fire(payload);
} catch (error) {
  if (breaker.opened) {
    // Use fallback
  }
}
```

## Cost Optimization

### 1. Use the Right Model

Choose models based on your needs:

```javascript
// ❌ Overkill for simple tasks
const response = await client.chat.completions.create({
  model: 'inno-claude-3-opus',
  messages: [{ role: 'user', content: 'Hello' }]
});

// ✅ Use appropriate model
const response = await client.chat.completions.create({
  model: 'inno-gpt-4o-mini',  // Much cheaper
  messages: [{ role: 'user', content: 'Hello' }]
});
```

### 2. Cache Responses

Cache responses to avoid redundant API calls:

```javascript
import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 3600 });

async function getCompletion(prompt) {
  const cacheKey = `chat:${hash(prompt)}`;
  
  const cached = cache.get(cacheKey);
  if (cached) return cached;
  
  const response = await client.chat.completions.create({
    model: 'inno-ai-boyong-4.5',
    messages: [{ role: 'user', content: prompt }]
  });
  
  cache.set(cacheKey, response);
  return response;
}
```

### 3. Batch Requests

Combine multiple operations:

```javascript
// ❌ Multiple requests
for (const text of texts) {
  await client.embeddings.create({ model: 'inno-minilm-l6-v2', input: text });
}

// ✅ Single batch request
const response = await client.embeddings.create({
  model: 'inno-minilm-l6-v2',
  input: texts  // Array of texts
});
```

### 4. Use Streaming

Reduce perceived latency:

```javascript
const stream = await client.chat.completions.create({
  model: 'inno-ai-boyong-4.5',
  messages: [...],
  stream: true
});

for await (const chunk of stream) {
  const content = chunk.choices[0]?.delta?.content || '';
  // Stream to user immediately
}
```

### 5. Set Max Tokens

Prevent runaway costs:

```javascript
const response = await client.chat.completions.create({
  model: 'inno-ai-boyong-4.5',
  messages: [...],
  max_tokens: 500  // Limit response length
});
```

## Security

### 1. Store Keys Securely

Use a secrets manager:

```bash
# AWS Secrets Manager
aws secretsmanager get-secret-value --secret-id innoai/api-key

# HashiCorp Vault
vault kv get secret/innoai/api-key
```

### 2. Rotate Keys Regularly

```bash
# Create new key
innoai keys create --name "Production V2"

# Update application
# Verify new key works

# Revoke old key
innoai keys revoke sk-oldkey
```

### 3. Use IP Whitelisting

```bash
curl -X PUT https://api.innoai.ph/v1/api-keys/key_abc123 \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "allowed_ips": ["203.0.113.0/24", "10.0.0.0/8"]
  }'
```

### 4. Monitor for Abuse

```javascript
// Log all API calls
app.use((req, res, next) => {
  console.log({
    timestamp: new Date(),
    user: req.user.id,
    endpoint: req.path,
    tokens: res.locals.tokenUsage
  });
  next();
});
```

## Error Handling

### 1. Handle Specific Errors

```javascript
try {
  const response = await client.chat.completions.create({...});
} catch (error) {
  switch(error.code) {
    case 'rate_limit_exceeded':
      // Retry with backoff
      break;
    case 'insufficient_credits':
      // Prompt user to add credits
      break;
    case 'invalid_api_key':
      // Alert admin
      break;
    default:
      console.error('Unexpected error:', error);
  }
}
```

### 2. Provide User Feedback

```javascript
async function generateWithFeedback(prompt) {
  try {
    const response = await client.chat.completions.create({...});
    return response.choices[0].message.content;
  } catch (error) {
    if (error.code === 'rate_limit_exceeded') {
      return "I'm a bit busy right now. Please try again in a moment.";
    }
    if (error.code === 'content_filter_triggered') {
      return "I can't help with that request.";
    }
    return "Something went wrong. Please try again.";
  }
}
```

## Performance

### 1. Use Async/Await

```javascript
// ❌ Synchronous
const results = [];
for (const prompt of prompts) {
  const result = await client.chat.completions.create({...});
  results.push(result);
}

// ✅ Parallel
const promises = prompts.map(prompt => 
  client.chat.completions.create({...})
);
const results = await Promise.all(promises);
```

### 2. Implement Request Batching

```javascript
import pLimit from 'p-limit';

const limit = pLimit(10); // Max 10 concurrent

const results = await Promise.all(
  prompts.map(prompt => 
    limit(() => client.chat.completions.create({...}))
  )
);
```

### 3. Use CDN for Images

```javascript
const response = await client.images.generate({...});
const imageUrl = response.data[0].url;

// Cache in your CDN
await cdn.cache(imageUrl);
```

## Prompt Engineering

### 1. Be Specific

```javascript
// ❌ Vague
const prompt = 'Write about AI';

// ✅ Specific
const prompt = `Write a 200-word blog post about how Filipino SMEs 
can use AI to improve customer service. Include 3 specific examples.`;
```

### 2. Use System Messages

```javascript
const response = await client.chat.completions.create({
  model: 'inno-ai-boyong-4.5',
  messages: [
    {
      role: 'system',
      content: 'You are a helpful assistant specializing in Philippine business and technology.'
    },
    { role: 'user', content: prompt }
  ]
});
```

### 3. Provide Examples (Few-Shot)

```javascript
const response = await client.chat.completions.create({
  model: 'inno-ai-boyong-4.5',
  messages: [
    {
      role: 'user',
      content: 'Classify: "Ang ganda ng produkto!"'
    },
    {
      role: 'assistant',
      content: 'Sentiment: Positive'
    },
    {
      role: 'user',
      content: 'Classify: "Hindi ko nagustuhan ang serbisyo."'
    },
    {
      role: 'assistant',
      content: 'Sentiment: Negative'
    },
    {
      role: 'user',
      content: 'Classify: "OK lang, pwede na."'
    }
  ]
});
```

## Testing

### 1. Use Sandbox Environment

```javascript
const client = new OpenAI({
  baseURL: process.env.NODE_ENV === 'production' 
    ? 'https://ai-gateway.innoserver.cloud/v1'
    : 'https://sandbox.innoai.ph/v1',
  apiKey: process.env.INNOAI_API_KEY
});
```

### 2. Mock API Calls in Tests

```javascript
// jest.mock
jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{ message: { content: 'Mock response' } }]
        })
      }
    }
  }))
}));
```

### 3. Test Error Scenarios

```javascript
test('handles rate limit', async () => {
  client.chat.completions.create = jest.fn()
    .mockRejectedValue({ code: 'rate_limit_exceeded', retry_after: 60 });
  
  const result = await myFunction();
  expect(result).toBe('Rate limited, please retry');
});
```

## Monitoring

### 1. Track Usage

```javascript
const metrics = {
  requests: 0,
  tokens: 0,
  cost: 0
};

app.use((req, res, next) => {
  res.on('finish', () => {
    metrics.requests++;
    metrics.tokens += res.locals.tokensUsed || 0;
    metrics.cost += res.locals.cost || 0;
  });
  next();
});
```

### 2. Set Up Alerts

```javascript
if (metrics.cost > DAILY_BUDGET * 0.8) {
  await sendAlert('Approaching daily budget limit');
}
```

### 3. Log Request IDs

```javascript
console.log('API Request:', {
  requestId: response.headers['x-request-id'],
  model: response.model,
  tokens: response.usage.total_tokens
});
```

---

**More questions?** Check out our [community forum](https://discord.gg/innoai)
