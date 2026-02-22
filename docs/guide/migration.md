---
title: Migration Guide
description: Migrating from other AI platforms to InnoAI
---

# Migration Guide

This guide helps you migrate from other AI platforms to InnoAI with minimal code changes.

## From OpenAI

### API Compatibility

InnoAI is fully compatible with the OpenAI API. Simply change the base URL:

#### Before (OpenAI)

```javascript
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});
```

#### After (InnoAI)

```javascript
import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'https://ai-gateway.innoserver.cloud/v1',
  apiKey: process.env.INNOAI_API_KEY
});
```

### Model Mapping

| OpenAI Model | InnoAI Model | Notes |
|--------------|--------------|-------|
| `gpt-4o` | `inno-gpt-4o` | Same capabilities |
| `gpt-4o-mini` | `inno-gpt-4o-mini` | Same capabilities |
| `gpt-4-turbo` | `inno-gpt-4o` | Recommended alternative |
| `gpt-3.5-turbo` | `inno-ai-boyong-4.5` | Better Tagalog support |
| `dall-e-3` | `inno-dall-e-3` | Same capabilities |
| `whisper-1` | `inno-whisper-large-v3` | Same capabilities |
| `tts-1` | `inno-elevenlabs-multilingual` | Higher quality |
| `text-embedding-3-small` | `inno-minilm-l6-v2` | Similar performance |
| `text-embedding-3-large` | `inno-e5-large-v2` | Similar performance |

### Code Examples

#### Chat Completions

```javascript
// Works exactly the same
const response = await client.chat.completions.create({
  model: 'inno-gpt-4o',  // Just change model name
  messages: [
    { role: 'user', content: 'Hello!' }
  ]
});
```

#### Image Generation

```javascript
// Same API, different model names
const response = await client.images.generate({
  model: 'inno-dall-e-3',  // or 'inno-flux-1-schnell' for lower cost
  prompt: 'A sunset in Manila',
  n: 1,
  size: '1024x1024'
});
```

#### Embeddings

```javascript
const response = await client.embeddings.create({
  model: 'inno-minilm-l6-v2',
  input: 'Your text here'
});
```

### Pricing Comparison

| Service | Cost | Savings with InnoAI |
|---------|------|-------------------|
| OpenAI GPT-4o | $5/M tokens | 20-30% |
| OpenAI DALL-E 3 | $0.04/image | 10-20% |
| OpenAI Whisper | $0.006/min | 30-40% |

Plus no forex fees when paying in PHP!

## From Anthropic (Claude)

### Model Mapping

| Anthropic Model | InnoAI Model |
|-----------------|--------------|
| `claude-3-opus-20240229` | `inno-claude-3-opus` |
| `claude-3-sonnet-20240229` | `inno-claude-3.5-sonnet` |
| `claude-3-haiku-20240307` | `inno-ai-boyong-4.5` |

### API Differences

Anthropic uses a different API format. Use the InnoAI OpenAI-compatible endpoint:

#### Before (Anthropic)

```javascript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const message = await client.messages.create({
  model: 'claude-3-sonnet-20240229',
  max_tokens: 1024,
  messages: [{ role: 'user', content: 'Hello!' }]
});
```

#### After (InnoAI)

```javascript
import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'https://ai-gateway.innoserver.cloud/v1',
  apiKey: process.env.INNOAI_API_KEY
});

const response = await client.chat.completions.create({
  model: 'inno-claude-3.5-sonnet',
  messages: [{ role: 'user', content: 'Hello!' }]
});
```

## From Google (Gemini)

### Model Mapping

| Google Model | InnoAI Model |
|--------------|--------------|
| `gemini-1.5-pro` | `inno-gemini-1.5-pro` |
| `gemini-1.5-flash` | `inno-gemini-1.5-flash` |
| `gemini-pro` | `inno-gemini-1.5-flash` |

### API Differences

#### Before (Google)

```javascript
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

const result = await model.generateContent('Hello!');
```

#### After (InnoAI)

```javascript
import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'https://ai-gateway.innoserver.cloud/v1',
  apiKey: process.env.INNOAI_API_KEY
});

const response = await client.chat.completions.create({
  model: 'inno-gemini-1.5-pro',
  messages: [{ role: 'user', content: 'Hello!' }]
});
```

## From Azure OpenAI

### Migration Steps

1. **Update endpoint configuration:**

```javascript
// Before (Azure)
const client = new OpenAI({
  baseURL: 'https://your-resource.openai.azure.com/openai/deployments/your-deployment',
  apiKey: process.env.AZURE_API_KEY,
  defaultQuery: { 'api-version': '2024-02-15-preview' }
});

// After (InnoAI)
const client = new OpenAI({
  baseURL: 'https://ai-gateway.innoserver.cloud/v1',
  apiKey: process.env.INNOAI_API_KEY
});
```

2. **Update model names:**

```javascript
// Azure deployment names
const response = await client.chat.completions.create({
  model: 'gpt-4-deployment',  // Your Azure deployment name
  messages: [...]
});

// InnoAI
const response = await client.chat.completions.create({
  model: 'inno-gpt-4o',  // Standard model name
  messages: [...]
});
```

## From AWS Bedrock

### Model Mapping

| AWS Bedrock | InnoAI Model |
|-------------|--------------|
| `anthropic.claude-3-sonnet` | `inno-claude-3.5-sonnet` |
| `amazon.titan-text-express` | `inno-ai-boyong-4.5` |
| `meta.llama3-70b` | `inno-ai-boyong-4.5` |

### Code Migration

#### Before (AWS SDK)

```javascript
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

const client = new BedrockRuntimeClient({ region: 'us-east-1' });

const command = new InvokeModelCommand({
  modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
  body: JSON.stringify({
    messages: [{ role: 'user', content: 'Hello!' }],
    max_tokens: 1000
  })
});

const response = await client.send(command);
```

#### After (InnoAI)

```javascript
import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'https://ai-gateway.innoserver.cloud/v1',
  apiKey: process.env.INNOAI_API_KEY
});

const response = await client.chat.completions.create({
  model: 'inno-claude-3.5-sonnet',
  messages: [{ role: 'user', content: 'Hello!' }],
  max_tokens: 1000
});
```

## From Self-Hosted Models

### Benefits of Migrating

| Feature | Self-Hosted | InnoAI |
|---------|-------------|--------|
| **Infrastructure** | You manage | We manage |
| **Scaling** | Manual | Automatic |
| **Updates** | Your responsibility | Automatic |
| **Cost** | Hardware + electricity | Pay per use |
| **Maintenance** | Time-consuming | Zero |
| **Philippine latency** | Depends on location | Optimized |

### Migration Strategy

1. **Gradual transition:**
   - Start with non-critical workloads
   - A/B test responses
   - Monitor cost and performance

2. **Hybrid approach:**
   ```javascript
   const client = new OpenAI({
     baseURL: shouldUseInnoAI() 
       ? 'https://ai-gateway.innoserver.cloud/v1'
       : 'http://localhost:8080/v1',
     apiKey: process.env.INNOAI_API_KEY
   });
   ```

## Feature Parity Checklist

### OpenAI Features

| Feature | Supported | Notes |
|---------|-----------|-------|
| Chat completions | ✅ | Full support |
| Streaming | ✅ | Full support |
| Function calling | ✅ | Full support |
| JSON mode | ✅ | Full support |
| Vision | ✅ | Full support |
| Image generation | ✅ | Multiple models |
| Embeddings | ✅ | Multiple models |
| Audio (TTS) | ✅ | ElevenLabs |
| Audio (STT) | ✅ | Whisper |
| Fine-tuning | ⚠️ | Limited models |
| Assistants API | ❌ | Coming soon |
| Batch API | ✅ | Startup+ tiers |

## Testing Your Migration

### 1. Create Test Suite

```javascript
describe('InnoAI Migration', () => {
  const client = new OpenAI({
    baseURL: 'https://ai-gateway.innoserver.cloud/v1',
    apiKey: process.env.INNOAI_API_KEY
  });
  
  test('chat completion works', async () => {
    const response = await client.chat.completions.create({
      model: 'inno-ai-boyong-4.5',
      messages: [{ role: 'user', content: 'Hello' }]
    });
    
    expect(response.choices[0].message.content).toBeTruthy();
  });
  
  test('streaming works', async () => {
    const stream = await client.chat.completions.create({
      model: 'inno-ai-boyong-4.5',
      messages: [{ role: 'user', content: 'Hello' }],
      stream: true
    });
    
    let content = '';
    for await (const chunk of stream) {
      content += chunk.choices[0]?.delta?.content || '';
    }
    
    expect(content).toBeTruthy();
  });
});
```

### 2. Compare Responses

```javascript
async function compareResponses(prompt) {
  const [openaiResponse, innoaiResponse] = await Promise.all([
    // OpenAI
    openaiClient.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }]
    }),
    // InnoAI
    innoaiClient.chat.completions.create({
      model: 'inno-gpt-4o',
      messages: [{ role: 'user', content: prompt }]
    })
  ]);
  
  console.log('OpenAI:', openaiResponse.choices[0].message.content);
  console.log('InnoAI:', innoaiResponse.choices[0].message.content);
}
```

### 3. Performance Testing

```javascript
async function benchmarkLatency() {
  const iterations = 100;
  const latencies = [];
  
  for (let i = 0; i < iterations; i++) {
    const start = Date.now();
    await client.chat.completions.create({
      model: 'inno-ai-boyong-4.5',
      messages: [{ role: 'user', content: 'Hello' }]
    });
    latencies.push(Date.now() - start);
  }
  
  const avg = latencies.reduce((a, b) => a + b) / latencies.length;
  console.log(`Average latency: ${avg}ms`);
}
```

## Post-Migration Checklist

- [ ] Update environment variables
- [ ] Change model names in code
- [ ] Update base URL
- [ ] Test all API endpoints
- [ ] Verify response formats
- [ ] Check error handling
- [ ] Update monitoring/alerting
- [ ] Review cost reports
- [ ] Update documentation
- [ ] Train team on new platform

## Getting Help

- 📧 Migration support: migration@innoai.ph
- 💬 Community: [Discord](https://discord.gg/innoai)
- 📅 Migration consultation: [Book a call](https://innoai.ph/migration-help)

---

**Need help migrating?** Contact us at migration@innoai.ph
