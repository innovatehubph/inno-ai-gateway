---
title: Overview
description: Introduction to InnoAI platform
---

# Overview

Welcome to **InnoAI** — the first AI model platform built **BY Filipinos, FOR Filipinos**.

## What is InnoAI?

InnoAI is a comprehensive AI Gateway that provides access to 31+ world-class AI models including GPT-4, Claude, Gemini, FLUX, and more — all priced in Philippine Pesos with local support.

## Why InnoAI?

| Problem | InnoAI Solution |
|---------|----------------|
| Expensive USD pricing | Pay in PHP, no forex fees |
| High latency from international servers | Servers in the Philippines |
| No Tagalog support | Models trained on Filipino context |
| Complicated foreign payment | GCash, Maya, local banks |
| International support hours | Filipino support team |

## What You Can Build

### Chatbots & Virtual Assistants
Build intelligent conversational agents that understand Tagalog and Taglish:

```javascript
const response = await client.chat.completions.create({
  model: 'inno-ai-boyong-4.5',
  messages: [
    { role: 'user', content: 'Kumusta! Ano ang balita?' }
  ]
});
```

### Image Generation
Create stunning visuals for marketing, social media, and design:

```javascript
const image = await client.images.generate({
  model: 'inno-flux-1-schnell',
  prompt: 'A jeepney driving through Manila at sunset'
});
```

### Content Creation
Generate articles, social media posts, and marketing copy:

```javascript
const content = await client.chat.completions.create({
  model: 'inno-claude-3.5-sonnet',
  messages: [{
    role: 'user',
    content: 'Write a Facebook post for a local coffee shop'
  }]
});
```

### RAG Systems
Build knowledge bases with embeddings:

```javascript
const embedding = await client.embeddings.create({
  model: 'inno-minilm-l6-v2',
  input: 'Philippine business regulations'
});
```

## Platform Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Your Application                   │
└──────────────────┬──────────────────────────────────┘
                   │
                   │ HTTPS/JSON
                   │
┌──────────────────▼──────────────────────────────────┐
│              InnoAI Gateway                          │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐  │
│  │   Chat API   │  │  Image API   │  │ Audio API │  │
│  └──────────────┘  └──────────────┘  └───────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐  │
│  │  Video API   │  │   3D API     │  │Embed API  │  │
│  └──────────────┘  └──────────────┘  └───────────┘  │
└─────────────────────────────────────────────────────┘
                   │
        ┌──────────┼──────────┐
        │          │          │
   ┌────▼────┐ ┌───▼────┐ ┌───▼────┐
   │ OpenAI  │ │Anthropic│ │ Google │
   └─────────┘ └─────────┘ └─────────┘
```

## Getting Started

### 1. Create an Account

Visit [dashboard.innoai.ph](https://dashboard.innoai.ph) and sign up.

### 2. Get Your API Key

Navigate to Settings → API Keys and create a new key.

### 3. Make Your First Request

```bash
curl https://ai-gateway.innoserver.cloud/v1/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "inno-ai-boyong-4.5",
    "messages": [{"role": "user", "content": "Kumusta!"}]
  }'
```

### 4. Explore the Docs

- [Quickstart Guide](/getting-started/quickstart) — Get started in 5 minutes
- [API Reference](/api/) — Complete API documentation
- [AI Models](/guide/models) — All available models
- [Best Practices](/guide/best-practices) — Integration tips

## Filipino Branding

We use Filipino terms that resonate with our culture:

| Category | Filipino Name | Meaning |
|----------|--------------|---------|
| Chat | **SulatAI** | Writing |
| Images | **SiningAI** | Art |
| Video | **PelikulaAI** | Film |
| Audio | **TinigAI** | Voice |

## Pricing

Choose a plan that fits your needs:

| Tier | Price | Best For |
|------|-------|----------|
| **Bayan Starter** | ₱0/mo | Students, hobbyists |
| **Developer** | ₱499/mo | Individual developers |
| **Startup** | ₱1,499/mo | Small teams |
| **Enterprise** | ₱4,999/mo | Large companies |
| **Bayanihan** | Custom | NGOs, education |

[View complete pricing →](/getting-started/pricing)

## Support & Community

- 📧 Email: support@innoai.ph
- 💬 Discord: [discord.gg/innoai](https://discord.gg/innoai)
- 🐦 Twitter: [@InnoAIph](https://twitter.com/InnoAIph)
- 📱 Facebook: /InnoAIph

## Next Steps

1. [Create your account](https://dashboard.innoai.ph)
2. [Follow the quickstart](/getting-started/quickstart)
3. [Explore AI models](/guide/models)
4. [Read the API reference](/api/)

---

**InnoAI: AI Models for Every Filipino** 🇵🇭✨
