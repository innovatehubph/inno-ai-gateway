# API Overview

The InnovateHub AI Gateway provides a unified, OpenAI-compatible API for accessing multiple AI capabilities.

## Base URL

```
https://ai-gateway.innoserver.cloud
```

## Authentication

All API requests require authentication via Bearer token:

```bash
Authorization: Bearer YOUR_API_KEY
```

## OpenAPI Specification

Interactive API documentation is available at:
- **Swagger UI**: [/docs](/docs)
- **OpenAPI JSON**: [/openapi.json](/openapi.json)

## Endpoints

### Chat
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/v1/chat/completions` | Create chat completion |

### Images
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/v1/images/generations` | Generate images |
| GET | `/v1/images/models` | List image models |

### Video
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/v1/video/generations` | Generate video |
| POST | `/v1/video/edit` | Edit video |
| POST | `/v1/video/add-audio` | Add audio to video |
| GET | `/v1/video/models` | List video models |

### 3D
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/v1/3d/generations` | Generate 3D model |
| POST | `/v1/3d/image-to-3d` | Convert image to 3D |
| GET | `/v1/3d/models` | List 3D models |

### Audio
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/v1/audio/speech` | Text to speech |
| POST | `/v1/audio/transcriptions` | Speech to text |

### Embeddings
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/v1/embeddings` | Create embeddings |

### Models
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/models` | List all models |

## Response Format

All responses follow a consistent JSON format:

### Success Response

```json
{
  "created": 1771597857,
  "model": "model-id",
  "data": [...]
}
```

### Error Response

```json
{
  "error": "Error type",
  "message": "Detailed error message"
}
```

## Rate Limiting

Rate limits are enforced per API key:

- **Default**: 100 requests per minute
- **Response Headers**:
  - `X-RateLimit-Limit`: Maximum requests allowed
  - `X-RateLimit-Remaining`: Requests remaining
  - `X-RateLimit-Reset`: Unix timestamp when limit resets

## SDKs

The API is compatible with OpenAI SDKs:

### JavaScript/TypeScript

```bash
npm install openai
```

```javascript
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: 'YOUR_API_KEY',
  baseURL: 'https://ai-gateway.innoserver.cloud/v1'
});
```

### Python

```bash
pip install openai
```

```python
from openai import OpenAI

client = OpenAI(
    api_key="YOUR_API_KEY",
    base_url="https://ai-gateway.innoserver.cloud/v1"
)
```

## Streaming

Chat completions support Server-Sent Events (SSE) streaming:

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

## Content Types

- **Request**: `application/json`
- **Response**: `application/json`
- **Streaming**: `text/event-stream`
- **Audio**: `audio/mpeg`, `audio/wav`, etc.

## CORS

The API supports CORS for browser-based applications:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```
