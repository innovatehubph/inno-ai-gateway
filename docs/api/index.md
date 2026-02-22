---
title: API Overview
description: Introduction to the InnoAI API
---

# API Overview

The InnoAI API provides programmatic access to AI models for chat, images, video, audio, and embeddings. It's designed to be simple, fast, and compatible with the OpenAI API format.

## Base URLs

| Environment | URL | Use Case |
|-------------|-----|----------|
| **Production** | `https://ai-gateway.innoserver.cloud/v1` | Live applications |
| **Sandbox** | `https://sandbox.innoai.ph/v1` | Testing and development |

## Authentication

All API requests require authentication using an API key:

```
Authorization: Bearer YOUR_API_KEY
```

[Learn more about authentication →](/api/authentication)

## Quick Start

Make your first API call:

```bash
curl https://ai-gateway.innoserver.cloud/v1/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "inno-ai-boyong-4.5",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

## API Sections

### [Authentication](/api/authentication)
API keys, JWT tokens, request signing, and security best practices.

### [Customers](/api/customers)
Customer management, usage tracking, API key management, and access control.

### [Inference](/api/inference)
Chat completions, image generation, video generation, audio (TTS/STT), embeddings, and 3D generation.

### [Billing](/api/billing)
DirectPay integration, invoices, payments, credit purchases, and subscriptions.

### [Errors](/api/errors)
Error codes reference, handling strategies, and best practices.

### [Rate Limits](/api/rate-limits)
Tier-based limits, monitoring usage, and optimization strategies.

### [REST Endpoints](/api/rest-endpoints)
CRUD operations and Parse SDK integration.

### [AI Proxy](/api/ai-proxy)
Code generation and deployment pipeline.

### [Schemas](/api/schemas)
Data models and class definitions.

## OpenAI Compatibility

InnoAI is compatible with the OpenAI API format. Simply change the base URL:

```javascript
// OpenAI
const client = new OpenAI({ apiKey: 'sk-...' });

// InnoAI
const client = new OpenAI({
  baseURL: 'https://ai-gateway.innoserver.cloud/v1',
  apiKey: 'your-innoai-key'
});
```

## Response Format

All responses are JSON:

```json
{
  "id": "chatcmpl-abc123",
  "object": "chat.completion",
  "created": 1700000000,
  "model": "inno-ai-boyong-4.5",
  "choices": [...],
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 20,
    "total_tokens": 30
  }
}
```

## SDKs

Official SDKs available:

- **JavaScript/TypeScript** — Compatible with `openai` package
- **Python** — Compatible with `openai` package
- **PHP** — Compatible with `openai-php` package

## Support

- 📧 Email: support@innoai.ph
- 💬 Discord: [discord.gg/innoai](https://discord.gg/innoai)
- 📖 Docs: [docs.innoai.ph](/)
