---
title: Inference API
description: Complete guide to AI model inference endpoints
---

# Inference API

The Inference API provides access to all AI models available on InnoAI, including chat, image generation, video, audio, and embeddings.

## Base URL

```
https://ai-gateway.innoserver.cloud/v1
```

## Authentication

All inference requests require an API key:

```
Authorization: Bearer YOUR_API_KEY
```

## Chat Completions

Generate text responses using language models.

```
POST /chat/completions
```

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `model` | string | Yes | Model identifier (e.g., `inno-ai-boyong-4.5`) |
| `messages` | array | Yes | Array of message objects |
| `temperature` | number | No | Sampling temperature (0-2, default: 1) |
| `max_tokens` | integer | No | Maximum tokens to generate |
| `stream` | boolean | No | Enable streaming (default: false) |
| `top_p` | number | No | Nucleus sampling (0-1) |
| `frequency_penalty` | number | No | Frequency penalty (-2 to 2) |
| `presence_penalty` | number | No | Presence penalty (-2 to 2) |

### Message Format

```json
{
  "role": "user",        // "system", "user", or "assistant"
  "content": "Hello!"    // Message content
}
```

### Example Request

```bash
curl https://ai-gateway.innoserver.cloud/v1/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "inno-ai-boyong-4.5",
    "messages": [
      {"role": "system", "content": "You are a helpful assistant that understands Filipino culture."},
      {"role": "user", "content": "Kumusta! Ano ang magandang lugar sa Pilipinas para magbakasyon?"}
    ],
    "temperature": 0.7,
    "max_tokens": 500
  }'
```

### Example Response

```json
{
  "id": "chatcmpl-abc123",
  "object": "chat.completion",
  "created": 1700000000,
  "model": "inno-ai-boyong-4.5",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Kumusta! Magandang tanong yan. Ang Pilipinas ay puno ng magagandang lugar..."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 45,
    "completion_tokens": 150,
    "total_tokens": 195
  }
}
```

### Streaming Response

Enable streaming for real-time responses:

```bash
curl https://ai-gateway.innoserver.cloud/v1/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "inno-ai-boyong-4.5",
    "messages": [{"role": "user", "content": "Hello"}],
    "stream": true
  }'
```

**Streaming format:**
```
data: {"id":"chatcmpl-abc123","object":"chat.completion.chunk","choices":[{"delta":{"content":"Hello"}}]}

data: {"id":"chatcmpl-abc123","object":"chat.completion.chunk","choices":[{"delta":{"content":"!"}}]}

data: [DONE]
```

### Code Examples

::: code-group

```javascript [JavaScript]
import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'https://ai-gateway.innoserver.cloud/v1',
  apiKey: process.env.INNOAI_API_KEY,
});

const response = await client.chat.completions.create({
  model: 'inno-ai-boyong-4.5',
  messages: [
    { role: 'user', content: 'Hello from the Philippines!' }
  ],
  stream: true,
});

for await (const chunk of response) {
  process.stdout.write(chunk.choices[0]?.delta?.content || '');
}
```

```python [Python]
from openai import OpenAI

client = OpenAI(
    base_url="https://ai-gateway.innoserver.cloud/v1",
    api_key=os.environ["INNOAI_API_KEY"]
)

response = client.chat.completions.create(
    model="inno-ai-boyong-4.5",
    messages=[{"role": "user", "content": "Hello from the Philippines!"}],
    stream=True
)

for chunk in response:
    if chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="")
```

```php [PHP]
$response = $client->chat()->create([
    'model' => 'inno-ai-boyong-4.5',
    'messages' => [
        ['role' => 'user', 'content' => 'Hello from the Philippines!']
    ],
    'stream' => true
]);

foreach ($response as $chunk) {
    echo $chunk->choices[0]->delta->content ?? '';
}
```

:::

## Image Generation

Generate images using various AI models.

```
POST /images/generations
```

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `model` | string | Yes | Model identifier |
| `prompt` | string | Yes | Image description |
| `n` | integer | No | Number of images (1-10) |
| `size` | string | No | Image size: `256x256`, `512x512`, `1024x1024` |
| `quality` | string | No | `standard` or `hd` |
| `style` | string | No | Image style (model-specific) |

### Example Request

```bash
curl https://ai-gateway.innoserver.cloud/v1/images/generations \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "inno-flux-1-schnell",
    "prompt": "A beautiful sunset over Manila Bay with sailboats",
    "n": 2,
    "size": "1024x1024"
  }'
```

### Example Response

```json
{
  "created": 1700000000,
  "data": [
    {
      "url": "https://storage.innoai.ph/generated/img_abc123.png",
      "revised_prompt": "A beautiful sunset over Manila Bay with sailboats..."
    },
    {
      "url": "https://storage.innoai.ph/generated/img_def456.png",
      "revised_prompt": "A beautiful sunset over Manila Bay with sailboats..."
    }
  ]
}
```

### JavaScript Example

```javascript
const response = await client.images.generate({
  model: 'inno-flux-1-schnell',
  prompt: 'A modern Filipino kitchen with traditional decorations',
  n: 1,
  size: '1024x1024'
});

console.log(response.data[0].url);
```

## Embeddings

Generate vector embeddings for text.

```
POST /embeddings
```

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `model` | string | Yes | Embedding model |
| `input` | string/array | Yes | Text to embed |
| `dimensions` | integer | No | Output dimensions |

### Example Request

```bash
curl https://ai-gateway.innoserver.cloud/v1/embeddings \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "inno-minilm-l6-v2",
    "input": "The Philippines is an archipelago in Southeast Asia."
  }'
```

### Example Response

```json
{
  "object": "list",
  "data": [
    {
      "object": "embedding",
      "embedding": [0.023, -0.045, 0.078, ...],
      "index": 0
    }
  ],
  "model": "inno-minilm-l6-v2",
  "usage": {
    "prompt_tokens": 12,
    "total_tokens": 12
  }
}
```

### Python Example

```python
response = client.embeddings.create(
    model="inno-minilm-l6-v2",
    input=["First document", "Second document", "Third document"]
)

for item in response.data:
    print(f"Embedding: {item.embedding[:5]}...")  # First 5 dimensions
```

## Audio

### Text-to-Speech

Convert text to speech.

```
POST /audio/speech
```

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `model` | string | Yes | TTS model |
| `input` | string | Yes | Text to speak |
| `voice` | string | Yes | Voice identifier |
| `response_format` | string | No | `mp3`, `opus`, `aac`, `flac` |
| `speed` | number | No | Speech speed (0.25-4.0) |

#### Example Request

```bash
curl https://ai-gateway.innoserver.cloud/v1/audio/speech \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "inno-elevenlabs-multilingual",
    "input": "Kumusta! Welcome to InnoAI.",
    "voice": "alloy",
    "response_format": "mp3"
  }' \
  --output speech.mp3
```

#### JavaScript Example

```javascript
const mp3 = await client.audio.speech.create({
  model: 'inno-elevenlabs-multilingual',
  voice: 'alloy',
  input: 'Kumusta! Welcome to InnoAI.',
});

const buffer = Buffer.from(await mp3.arrayBuffer());
await fs.promises.writeFile('speech.mp3', buffer);
```

### Speech-to-Text

Transcribe audio to text.

```
POST /audio/transcriptions
```

#### Request Body (multipart/form-data)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | file | Yes | Audio file |
| `model` | string | Yes | Transcription model |
| `language` | string | No | Language code (e.g., `fil`, `en`) |
| `prompt` | string | No | Context prompt |
| `response_format` | string | No | `json`, `text`, `srt`, `verbose_json` |
| `temperature` | number | No | Sampling temperature |

#### Example Request

```bash
curl https://ai-gateway.innoserver.cloud/v1/audio/transcriptions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -F file="@recording.mp3" \
  -F model="inno-whisper-large-v3" \
  -F language="fil"
```

#### Example Response

```json
{
  "text": "Kumusta! Paano ka makakatulong sa akin ngayon?"
}
```

## Video Generation

Generate videos from text or images.

```
POST /videos/generations
```

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `model` | string | Yes | Video model |
| `prompt` | string | Yes | Video description |
| `image_url` | string | No | Source image for image-to-video |
| `duration` | integer | No | Duration in seconds |
| `width` | integer | No | Video width |
| `height` | integer | No | Video height |

### Example Request

```bash
curl https://ai-gateway.innoserver.cloud/v1/videos/generations \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "inno-luma-dream-machine",
    "prompt": "A drone flying over rice terraces in Banaue",
    "duration": 5,
    "width": 1280,
    "height": 720
  }'
```

### Example Response

```json
{
  "id": "video_abc123",
  "status": "processing",
  "estimated_time": 120
}
```

### Check Video Status

```bash
curl https://ai-gateway.innoserver.cloud/v1/videos/generations/video_abc123 \
  -H "Authorization: Bearer YOUR_API_KEY"
```

```json
{
  "id": "video_abc123",
  "status": "completed",
  "url": "https://storage.innoai.ph/videos/video_abc123.mp4",
  "thumbnail": "https://storage.innoai.ph/videos/video_abc123_thumb.jpg"
}
```

## 3D Generation

Generate 3D models from text or images.

```
POST /3d/generations
```

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `model` | string | Yes | 3D model |
| `prompt` | string | Yes* | Text description (*or image_url) |
| `image_url` | string | Yes* | Source image (*or prompt) |
| `format` | string | No | Output format: `glb`, `obj` |

### Example Request

```bash
curl https://ai-gateway.innoserver.cloud/v1/3d/generations \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "inno-hunyuan3d-v2",
    "prompt": "A cute jeepney toy",
    "format": "glb"
  }'
```

### Example Response

```json
{
  "id": "3d_abc123",
  "status": "processing",
  "estimated_time": 60
}
```

## Batch Processing

Submit multiple requests in a single batch (Startup+ tiers).

```
POST /batch
```

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `requests` | array | Yes | Array of inference requests |
| `webhook_url` | string | No | Callback URL when complete |

### Example Request

```bash
curl https://ai-gateway.innoserver.cloud/v1/batch \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "requests": [
      {
        "endpoint": "/v1/chat/completions",
        "body": {
          "model": "inno-ai-boyong-4.5",
          "messages": [{"role": "user", "content": "Hello 1"}]
        }
      },
      {
        "endpoint": "/v1/chat/completions",
        "body": {
          "model": "inno-ai-boyong-4.5",
          "messages": [{"role": "user", "content": "Hello 2"}]
        }
      }
    ],
    "webhook_url": "https://your-app.com/webhooks/batch"
  }'
```

## Available Models

### Chat Models

| Model | Provider | Context | Best For |
|-------|----------|---------|----------|
| `inno-ai-boyong-4.5` | InnoAI | 128K | Balanced, cost-effective |
| `inno-claude-3.5-sonnet` | Anthropic | 200K | Complex reasoning |
| `inno-gpt-4o` | OpenAI | 128K | General purpose |
| `inno-gpt-4o-mini` | OpenAI | 128K | Fast, low-cost |
| `inno-gemini-1.5-pro` | Google | 1M | Long context |
| `inno-gemini-1.5-flash` | Google | 1M | Fast responses |

### Image Models

| Model | Tier | Price | Quality |
|-------|------|-------|---------|
| `inno-flux-1-schnell` | Budget | ₱0.06 | Fast |
| `inno-sdxl-lightning` | Budget | ₱0.12 | Good |
| `inno-flux-1-dev` | Standard | ₱0.18 | Better |
| `inno-imagen-4` | Premium | ₱3.00 | Excellent |
| `inno-dall-e-3` | Premium | ₱4.50 | Excellent |

### Audio Models

| Model | Type | Price | Quality |
|-------|------|-------|---------|
| `inno-mms-tts` | TTS | ₱0.08/min | Good |
| `inno-whisper-tts` | TTS | ₱0.12/min | Better |
| `inno-elevenlabs-multilingual` | TTS | ₱0.30/min | Excellent |
| `inno-whisper-large-v3` | STT | ₱0.08/min | Excellent |

### Embedding Models

| Model | Dimensions | Price |
|-------|------------|-------|
| `inno-minilm-l6-v2` | 384 | ₱0.008/1K |
| `inno-bge-m3` | 1024 | ₱0.015/1K |
| `inno-e5-large-v2` | 1024 | ₱0.020/1K |

## Error Handling

### Model Not Found

```json
{
  "error": {
    "code": "model_not_found",
    "message": "Model 'inno-invalid-model' not found",
    "type": "invalid_request_error"
  }
}
```

### Rate Limit Exceeded

```json
{
  "error": {
    "code": "rate_limit_exceeded",
    "message": "Rate limit exceeded. Retry after 60 seconds.",
    "type": "rate_limit_error",
    "retry_after": 60
  }
}
```

### Content Filter

```json
{
  "error": {
    "code": "content_filter_triggered",
    "message": "Content violates usage policies",
    "type": "content_policy_error"
  }
}
```

## Response Headers

All responses include helpful headers:

```
X-Request-ID: req_abc123
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 950
X-RateLimit-Reset: 1700000000
X-Credits-Used: 0.15
X-Credits-Remaining: 1234.50
```

---

**Model questions?** Browse the [complete model list](/guide/models) or contact support@innoai.ph
