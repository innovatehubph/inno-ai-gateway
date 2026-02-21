# 🚀 InnovateHub AI Gateway v3.2

> Universal AI Gateway with OAuth-based authentication for cost-effective AI model access

[![Status](https://img.shields.io/badge/status-production-green.svg)]()
[![Version](https://img.shields.io/badge/version-3.2.0-blue.svg)]()
[![Models](https://img.shields.io/badge/models-200+-purple.svg)]()
[![License](https://img.shields.io/badge/license-Proprietary-blue.svg)]()

## ✨ Features

### 🤖 AI Providers
- **🔥 Google Antigravity** - FREE access to Gemini & Claude models via OAuth
- **🌐 OpenRouter** - 100+ premium models (GPT-4, Claude, etc.)
- **🤗 Hugging Face** - FREE open-source models (Mistral, Llama, Qwen)
- **🌙 MoonshotAI** - Kimi models with 256K context
- **🚀 InnovateHub** - Proprietary models (OpenClaw/Claude integration)

### 🎨 Admin Dashboard
- **📊 Real-time Analytics** - Request logs, token usage, latency metrics
- **🔑 API Key Management** - Multi-account OAuth integration
- **🧪 AI Playground** - Test models with live chat interface
- **📱 Mobile Responsive** - Works on all devices

### 🔐 Authentication
- **OAuth 2.0 + PKCE** - Secure authentication flow
- **Multiple Accounts** - Support personal + work accounts per provider
- **Auto-refresh** - Tokens refresh automatically before expiry
- **Admin Access** - Secure dashboard with role-based access

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PM2 (for process management)
- Nginx (optional, for reverse proxy)

### Installation

```bash
# Clone repository
git clone https://github.com/innovatehubph/inno-ai-gateway.git
cd inno-ai-gateway

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your credentials

# Start the server
npm start
# Or with PM2
pm2 start server.js --name ai-gateway
```

### Environment Variables

```env
# Server Configuration
PORT=8095
ADMIN_KEY=your-secure-admin-key

# API Keys
HF_API_KEY=your-huggingface-key
HF_API_TOKEN=your-huggingface-token
REPLICATE_API_KEY=your-replicate-key
OPENROUTER_API_KEY=your-openrouter-key
MOONSHOT_API_KEY=your-moonshot-key

# Google OAuth (for Antigravity)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# OpenClaw (optional)
OPENCLAW_AUTH_PROFILE=anthropic:claude-cli
```

## 📚 API Documentation

### OpenAI-Compatible Endpoints

#### Chat Completions
```http
POST /v1/chat/completions
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json

{
  "model": "inno-ai-boyong-4.5",
  "messages": [
    {"role": "user", "content": "Hello!"}
  ],
  "stream": false
}
```

**Supported Models:**
- `inno-ai-boyong-4.5` - Most capable (via OpenClaw/Claude)
- `inno-ai-boyong-4.0` - Balanced performance
- `inno-ai-boyong-mini` - Fast responses
- `hf-mistralai/Mistral-7B-Instruct-v0.2` - FREE Hugging Face
- `or-anthropic/claude-3-opus` - Via OpenRouter
- `kimi-k2.5` - MoonshotAI with 256K context
- `antigravity-gemini-2.5-pro` - FREE via Google OAuth

#### Image Generation
```http
POST /v1/images/generations
Authorization: Bearer YOUR_API_KEY

{
  "prompt": "A serene mountain landscape at sunset",
  "model": "image-3",
  "n": 1,
  "size": "1024x1024"
}
```

#### List Models
```http
GET /v1/models
Authorization: Bearer YOUR_API_KEY
```

### Admin Endpoints

#### Generate OAuth URL
```http
POST /admin/oauth/url
X-Admin-Key: YOUR_ADMIN_KEY

{
  "provider": "antigravity",
  "accountName": "Personal Gmail"
}
```

#### Exchange OAuth Code
```http
POST /admin/oauth/exchange
X-Admin-Key: YOUR_ADMIN_KEY

{
  "code": "4/0A...",
  "state": "xyz123",
  "callbackUrl": "http://localhost:51121/callback?code=...",
  "accountName": "Personal Gmail"
}
```

#### List Connected Accounts
```http
GET /admin/accounts
X-Admin-Key: YOUR_ADMIN_KEY
```

## 🔐 OAuth Setup (Antigravity)

### Step 1: Generate OAuth URL
1. Go to Admin Dashboard → Settings → API Keys
2. Click "Add Account"
3. Select "Google Antigravity"
4. Enter account name (e.g., "Personal")
5. Click "Generate OAuth URL"

### Step 2: Authenticate
1. Copy the OAuth URL
2. Open in browser
3. Sign in with Google
4. Authorize the application

### Step 3: Complete Connection
1. Copy the callback URL from browser
2. Paste back into the modal
3. Click "Connect Account"
4. ✅ Account connected!

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         CLIENT                              │
│              (Browser / CLI / Application)                  │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    AI GATEWAY (Port 8095)                   │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐│
│  │  Chat API       │  │  Image Gen      │  │  Admin API   ││
│  │  /v1/chat/*     │  │  /v1/images/*   │  │  /admin/*    ││
│  └─────────────────┘  └─────────────────┘  └──────────────┘│
└──────────────────────┬──────────────────────────────────────┘
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
   ┌────────────┐ ┌──────────┐ ┌──────────┐
   │ Antigravity│ │OpenRouter│ │  Hugging │
   │  (OAuth)   │ │ (API Key)│ │  Face    │
   └────────────┘ └──────────┘ └──────────┘
```

## 📊 Monitoring

### Health Check
```bash
curl https://ai-gateway.innoserver.cloud/health
```

### Provider Status
```bash
curl https://ai-gateway.innoserver.cloud/health | jq '.providers'
```

### View Logs
```bash
# Real-time logs
pm2 logs ai-gateway

# View recent requests
curl -H "X-Admin-Key: YOUR_KEY" \
  https://ai-gateway.innoserver.cloud/admin/logs?limit=50
```

## 🛠️ Development

### Run in Development Mode
```bash
npm run dev
```

### Run Tests
```bash
npm test
```

### Code Style
```bash
npm run lint
npm run format
```

## 🔒 Security

- ✅ **PKCE OAuth Flow** - Industry-standard OAuth 2.0 with PKCE
- ✅ **State Validation** - 5-minute TTL prevents CSRF attacks
- ✅ **Admin Authentication** - All admin endpoints require secure key
- ✅ **Token Encryption** - Secure storage in `~/.config/opencode/`
- ✅ **Rate Limiting** - Built-in protection against abuse
- ✅ **CORS Protection** - Configurable cross-origin policies

## 📝 Changelog

### v3.2.0 (2026-02-21)
- ✨ Added OAuth account management system
- ✨ Support for multiple accounts per provider
- ✨ Auto-refresh expired tokens
- ✨ New admin dashboard UI for API keys
- 🔧 Security hardening with PKCE
- 📱 Enhanced mobile responsiveness

### v3.1.0 (2026-02-20)
- ✨ Added Hugging Face integration
- ✨ Added OpenRouter integration
- ✨ Added MoonshotAI (Kimi) integration
- ✨ Added 200+ free models
- 🎨 Redesigned admin dashboard

### v3.0.0 (2026-02-19)
- ✨ Initial multimodal support (chat, images, video, 3D, audio)
- ✨ Tiered image generation models
- ✨ Admin dashboard with analytics
- ✨ OpenAI-compatible API

## 🤝 Contributing

This is a proprietary project. For feature requests or bug reports, please contact:

📧 Email: support@innovatehub.ph
🌐 Website: https://innovatehub.ph

## 📄 License

Proprietary - All rights reserved by InnovateHub Philippines

---

<p align="center">
  <strong>Powered by InnovateHub Philippines 🇵🇭</strong><br>
  Making AI accessible and affordable for everyone
</p>