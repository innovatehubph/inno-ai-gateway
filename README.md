# InnovateHub AI Gateway

🤖 **OpenAI-compatible Multimodal AI API** powered by InnovateHub Philippines.

![Version](https://img.shields.io/badge/Version-3.0.0-blue)
![Models](https://img.shields.io/badge/Models-7-green)
![Multimodal](https://img.shields.io/badge/Multimodal-✓-purple)

## Features

### 🎯 Core Capabilities
- ✅ **OpenAI-compatible API** - Drop-in replacement
- ✅ **Streaming Support** - Server-sent events (SSE)
- ✅ **Rate Limiting** - Per-API-key limits with headers
- ✅ **API Key Management** - Create, rotate, disable keys
- ✅ **Usage Tracking** - Per-key request and token counts

### 🎨 Multimodal (via HuggingFace)
- 🖼️ **Image Generation** - Stable Diffusion XL
- 🔊 **Text-to-Speech** - Neural TTS
- 🎤 **Speech-to-Text** - Whisper
- 📊 **Embeddings** - Sentence transformers

### 📊 Admin Dashboard
- 📈 Real-time analytics with charts
- 🧪 AI Playground for testing
- 📋 Request logs with inspector
- 🔑 API key management UI
- 💻 System health monitoring
- 📱 Mobile-responsive design

## Available Models

| Model | Type | Description |
|-------|------|-------------|
| `inno-ai-boyong-4.5` | Chat | Most capable, complex tasks |
| `inno-ai-boyong-4.0` | Chat | Balanced performance |
| `inno-ai-boyong-mini` | Chat | Fast responses |
| `inno-ai-vision-xl` | Image | Stable Diffusion XL |
| `inno-ai-voice-1` | TTS | Text to speech |
| `inno-ai-whisper-1` | STT | Speech to text |
| `inno-ai-embed-1` | Embeddings | Vector embeddings |

## API Endpoints

### Chat
```bash
POST /v1/chat/completions
```

### Images
```bash
POST /v1/images/generations
```

### Audio
```bash
POST /v1/audio/speech        # Text to speech
POST /v1/audio/transcriptions # Speech to text
```

### Embeddings
```bash
POST /v1/embeddings
```

### Utility
```bash
GET /v1/models   # List models
GET /v1/usage    # Check API key usage
GET /health      # Health check
GET /docs        # API documentation
```

## Quick Start

### Chat Completion
```bash
curl -X POST https://ai-gateway.innoserver.cloud/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "model": "inno-ai-boyong-4.5",
    "messages": [{"role": "user", "content": "Hello!"}],
    "stream": false
  }'
```

### Streaming
```bash
curl -X POST https://ai-gateway.innoserver.cloud/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "model": "inno-ai-boyong-4.5",
    "messages": [{"role": "user", "content": "Tell me a story"}],
    "stream": true
  }'
```

### Image Generation
```bash
curl -X POST https://ai-gateway.innoserver.cloud/v1/images/generations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "prompt": "A futuristic city at sunset",
    "size": "1024x1024"
  }'
```

### Text to Speech
```bash
curl -X POST https://ai-gateway.innoserver.cloud/v1/audio/speech \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{"input": "Hello world!"}' \
  --output speech.mp3
```

### Embeddings
```bash
curl -X POST https://ai-gateway.innoserver.cloud/v1/embeddings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{"input": "The quick brown fox"}'
```

## SDK Examples

### Python
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

# Streaming
for chunk in client.chat.completions.create(
    model="inno-ai-boyong-4.5",
    messages=[{"role": "user", "content": "Tell me a story"}],
    stream=True
):
    print(chunk.choices[0].delta.content, end="")
```

### JavaScript
```javascript
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: 'YOUR_API_KEY',
  baseURL: 'https://ai-gateway.innoserver.cloud/v1'
});

const response = await client.chat.completions.create({
  model: 'inno-ai-boyong-4.5',
  messages: [{ role: 'user', content: 'Hello!' }]
});
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default: 8095) |
| `ADMIN_KEY` | Admin dashboard key |
| `HF_API_KEY` | HuggingFace API key for multimodal |

## Rate Limiting

Rate limit headers are included in all responses:
- `X-RateLimit-Limit` - Requests per minute
- `X-RateLimit-Remaining` - Remaining requests
- `X-RateLimit-Reset` - Reset timestamp

## Links

- **Admin Dashboard**: https://ai-gateway.innoserver.cloud/admin
- **API Documentation**: https://ai-gateway.innoserver.cloud/docs
- **Health Check**: https://ai-gateway.innoserver.cloud/health

## License

Proprietary - InnovateHub Philippines © 2026
