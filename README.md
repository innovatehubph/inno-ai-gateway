# InnovateHub AI Gateway

🤖 OpenAI-compatible API Gateway powered by InnovateHub's proprietary AI models.

![Dashboard](https://img.shields.io/badge/Admin-Dashboard-blue)
![Version](https://img.shields.io/badge/Version-2.0.0-green)
![License](https://img.shields.io/badge/License-Proprietary-red)

## Features

- ✅ **OpenAI-compatible API** (`/v1/chat/completions`, `/v1/models`)
- ✅ **Admin Dashboard** - Beautiful web UI for monitoring and management
- ✅ **Analytics** - Track requests, tokens, and model usage
- ✅ **Playground** - Test the AI directly from the browser
- ✅ **Request Logs** - View all API requests with details
- ✅ **System Monitoring** - CPU, memory, disk usage
- ✅ **Multiple Models** - inno-ai-boyong-4.5, 4.0, mini

## Screenshots

### Dashboard
- Real-time request statistics
- Token usage tracking
- Hourly request charts
- Model distribution pie chart
- System health monitoring

### Playground
- Interactive chat interface
- Model selection
- Token counter
- Dark theme UI

## Available Models

| Model | Description |
|-------|-------------|
| `inno-ai-boyong-4.5` | Most capable model for complex tasks |
| `inno-ai-boyong-4.0` | Balanced performance and speed |
| `inno-ai-boyong-mini` | Fast and efficient for simple tasks |

## API Endpoints

### Public Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/health` | GET | No | Health check with uptime |
| `/v1/models` | GET | API Key | List available models |
| `/v1/chat/completions` | POST | API Key | Chat completion |

### Admin Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/admin` | GET | - | Admin dashboard UI |
| `/admin/analytics` | GET | Admin Key | Get analytics data |
| `/admin/logs` | GET | Admin Key | Get request logs |
| `/admin/system` | GET | Admin Key | Get system info |
| `/admin/playground` | POST | Admin Key | Test AI (no logging) |
| `/admin/reset` | POST | Admin Key | Reset all analytics |

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
| `API_KEY` | - | API key for chat endpoints |
| `ADMIN_KEY` | - | Admin key for dashboard |

## Installation

```bash
npm install
npm start
```

## Admin Dashboard

Access the admin dashboard at `/admin`:

1. Open `https://your-domain/admin`
2. Enter your admin key
3. Explore the dashboard!

### Features:
- 📊 **Dashboard** - Overview stats, charts, system info
- 🧪 **Playground** - Test AI with live chat
- 📋 **Logs** - View all API requests
- ⚙️ **Settings** - API info and data management

## Integration

Works with any OpenAI-compatible client:
- CrewAI
- LangChain
- n8n
- AutoGen
- Cursor IDE
- Custom applications

## Tech Stack

- **Backend**: Node.js, Express
- **Frontend**: Tailwind CSS, Chart.js
- **Storage**: JSON file-based (lightweight)

## License

Proprietary - InnovateHub Philippines © 2026
