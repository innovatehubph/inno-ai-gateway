# InnoAI Gateway - Quick Start

## 🚀 Get Your API Key

1. Visit https://ai-gateway.innoserver.cloud/portal.html
2. Sign up or login
3. Generate your API key

## 💬 Chat Completion

```bash
curl -X POST https://ai-gateway.innoserver.cloud/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "model": "inno-ai-boyong-4.5",
    "messages": [
      {"role": "user", "content": "Hello, how are you?"}
    ]
  }'
```

## 🖼️ Image Generation

```bash
curl -X POST https://ai-gateway.innoserver.cloud/v1/images/generations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "model": "inno-ai-vision-xl",
    "prompt": "A beautiful sunset over Manila Bay",
    "size": "1024x1024"
  }'
```

## 📚 Available Models

### Chat Models
| Model | Description | Price |
|-------|-------------|-------|
| `inno-ai-boyong-4.5` | Balanced, cost-effective | ₱0.15/1K tokens |
| `inno-ai-boyong-4.0` | Fast responses | ₱0.10/1K tokens |
| `inno-ai-boyong-mini` | Budget-friendly | ₱0.05/1K tokens |

### Image Models
| Model | Description | Price |
|-------|-------------|-------|
| `inno-ai-vision-xl` | High-quality images | ₱2.90/image |
| `inno-flux-1-schnell` | Fast generation | ₱0.06/image |

## 🔗 API Endpoints

- **Chat**: `POST /v1/chat/completions`
- **Images**: `POST /v1/images/generations`
- **Models**: `GET /v1/models`
- **Embeddings**: `POST /v1/embeddings`

## 📖 Full Documentation

Visit https://ai-gateway.innoserver.cloud/docs.html
