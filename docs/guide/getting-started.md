# Getting Started

Welcome to the InnovateHub AI Gateway! This guide will help you get started with our multimodal AI API.

## Base URL

```
https://ai-gateway.innoserver.cloud
```

## Authentication

All API requests require authentication using a Bearer token:

```bash
Authorization: Bearer YOUR_API_KEY
```

## Quick Examples

### Chat Completion

```bash
curl https://ai-gateway.innoserver.cloud/v1/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "inno-ai-boyong-4.5",
    "messages": [
      {"role": "user", "content": "What is the capital of the Philippines?"}
    ]
  }'
```

### Generate Image

```bash
curl https://ai-gateway.innoserver.cloud/v1/images/generations \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A beautiful sunset over Manila Bay",
    "model": "image-3"
  }'
```

### Generate Video

```bash
curl https://ai-gateway.innoserver.cloud/v1/video/generations \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A cat playing with yarn, cute animation",
    "model": "video-2"
  }'
```

### Generate 3D Model

```bash
curl https://ai-gateway.innoserver.cloud/v1/3d/generations \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A coffee mug",
    "model": "3d-2"
  }'
```

## Using with OpenAI SDK

The gateway is fully compatible with the OpenAI SDK:

```javascript
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: 'YOUR_API_KEY',
  baseURL: 'https://ai-gateway.innoserver.cloud/v1'
});

// Chat
const chat = await client.chat.completions.create({
  model: 'inno-ai-boyong-4.5',
  messages: [{ role: 'user', content: 'Hello!' }]
});

// Image
const image = await client.images.generate({
  prompt: 'A cute robot',
  model: 'image-3'
});
```

## Python Example

```python
from openai import OpenAI

client = OpenAI(
    api_key="YOUR_API_KEY",
    base_url="https://ai-gateway.innoserver.cloud/v1"
)

# Chat
response = client.chat.completions.create(
    model="inno-ai-boyong-4.5",
    messages=[{"role": "user", "content": "Hello!"}]
)
print(response.choices[0].message.content)

# Image
image = client.images.generate(
    prompt="A beautiful landscape",
    model="image-3"
)
print(image.data[0].url)
```

## Rate Limits

- Default: 100 requests per minute
- Check response headers for current limits:
  - `X-RateLimit-Limit`
  - `X-RateLimit-Remaining`
  - `X-RateLimit-Reset`

## Next Steps

- [Authentication](/guide/authentication) - Learn about API keys
- [Image Generation](/guide/images) - Explore 12 image models
- [Video Generation](/guide/video) - Create videos from text
- [3D Generation](/guide/3d) - Generate 3D models
- [API Reference](/api/overview) - Complete API documentation
