# InnovateHub AI Gateway

🤖 OpenAI-compatible API Gateway powered by InnovateHub's proprietary AI models.

## Features

- ✅ OpenAI-compatible API (`/v1/chat/completions`, `/v1/models`)
- ✅ Multiple model support (inno-ai-boyong-4.5, 4.0, mini)
- ✅ API key authentication
- ✅ Token usage tracking
- ✅ CORS enabled

## Available Models

| Model | Description |
|-------|-------------|
| `inno-ai-boyong-4.5` | Most capable model for complex tasks |
| `inno-ai-boyong-4.0` | Balanced performance and speed |
| `inno-ai-boyong-mini` | Fast and efficient for simple tasks |

## API Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/health` | GET | No | Health check |
| `/v1/models` | GET | Yes | List available models |
| `/v1/chat/completions` | POST | Yes | Chat completion |

## Usage

### Health Check
```bash
curl https://ai-gateway.innoserver.cloud/health
```

### List Models
```bash
curl https://ai-gateway.innoserver.cloud/v1/models \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### Chat Completion
```bash
curl -X POST https://ai-gateway.innoserver.cloud/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "model": "inno-ai-boyong-4.5",
    "messages": [
      {"role": "user", "content": "Hello!"}
    ]
  }'
```

### Response Format
```json
{
  "id": "chatcmpl-xxx",
  "object": "chat.completion",
  "created": 1234567890,
  "model": "inno-ai-boyong-4.5",
  "choices": [{
    "index": 0,
    "message": {
      "role": "assistant",
      "content": "Response here..."
    },
    "finish_reason": "stop"
  }],
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 50,
    "total_tokens": 60
  }
}
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 8095 | Server port |
| `API_KEY` | - | API key for authentication |

## Installation

```bash
npm install
npm start
```

## Integration

Works with any OpenAI-compatible client:
- CrewAI
- LangChain
- n8n
- AutoGen
- Custom applications

## License

Proprietary - InnovateHub Philippines © 2026
