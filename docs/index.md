---
layout: home
---

<CustomHero />

<style>
/* Hide default VitePress hero */
.VPHero {
  display: none;
}

/* Adjust layout for custom hero */
.vp-doc {
  padding-top: 0;
}

/* Ensure proper spacing */
.VPContent.is-home {
  padding-bottom: 0;
}
</style>

## 🇵🇭 Built by Filipinos, for Filipinos

InnoAI is the first AI model platform built **BY Filipinos, FOR Filipinos**. We understand that "Kumusta" is more than a greeting — it's genuine care for how someone is doing.

### Why Choose InnoAI?

| Feature | InnoAI | International APIs |
|---------|--------|-------------------|
| **Currency** | Philippine Peso (₱) | US Dollar ($) |
| **Support** | Local Filipino team | International timezone |
| **Latency** | Servers in Philippines | Global locations |
| **Context** | Understands Tagalog/Taglish | English only |
| **Pricing** | Market-adjusted for PH | Premium international rates |

## 🚀 Quick Start

Get started in under 5 minutes:

### Option 1: Using OpenAI SDK

::: code-group

```bash [npm]
npm install openai
```

```bash [yarn]
yarn add openai
```

```bash [pnpm]
pnpm add openai
```

:::

```javascript
import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'https://ai-gateway.innoserver.cloud/v1',
  apiKey: 'your-api-key',
});

const response = await client.chat.completions.create({
  model: 'inno-ai-boyong-4.5',
  messages: [{ role: 'user', content: 'Kumusta! Paano mag-start sa AI?' }],
  stream: true,
});

for await (const chunk of response) {
  process.stdout.write(chunk.choices[0]?.delta?.content || '');
}
```

### Option 2: Using cURL

```bash
curl https://ai-gateway.innoserver.cloud/v1/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "inno-ai-boyong-4.5",
    "messages": [{"role": "user", "content": "Hello from the Philippines!"}]
  }'
```

### Option 3: Using Python

```python
from openai import OpenAI

client = OpenAI(
    base_url="https://ai-gateway.innoserver.cloud/v1",
    api_key="your-api-key"
)

response = client.chat.completions.create(
    model="inno-ai-boyong-4.5",
    messages=[{"role": "user", "content": "Kumusta!"}],
    stream=True
)

for chunk in response:
    if chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="")
```

## 📊 31+ Models Available

| Category | Count | Filipino Name | Starting Price |
|----------|-------|---------------|----------------|
| **Chat** | 3 | SulatAI | ₱0.15/1K tokens |
| **Images** | 12 | SiningAI | ₱0.06/image |
| **Video** | 10 | PelikulaAI | ₱2.90/video |
| **3D** | 3 | — | ₱2.90/model |
| **Audio** | 2 | TinigAI | ₱0.08/minute |
| **Embeddings** | 1 | — | ₱0.008/1K tokens |

## 💰 Pricing Plans

Choose a plan that fits your needs:

| Tier | Price | Best For |
|------|-------|----------|
| **Bayan Starter** | ₱0/mo | Students, hobbyists |
| **Developer** | ₱499/mo | Individual developers |
| **Startup** | ₱1,499/mo | Small teams |
| **Enterprise** | ₱4,999/mo | Large companies |
| **Bayanihan** | Custom | NGOs, education |

[View complete pricing →](/getting-started/pricing)

## 🔐 Authentication

InnoAI supports multiple authentication methods:

- **API Keys** - For server-to-server integration
- **JWT Tokens** - For authenticated user sessions
- **Request Signing** - For webhook verification

[Learn about authentication →](/getting-started/authentication)

## 📚 Documentation Sections

<div class="grid-container">

### Getting Started
- [Overview](/getting-started/overview) — Platform introduction
- [Quickstart](/getting-started/quickstart) — 5-minute setup
- [Authentication](/getting-started/authentication) — API keys & JWT
- [Pricing](/getting-started/pricing) — Complete pricing breakdown

### API Reference
- [Inference](/api/inference) — AI model endpoints
- [Customers](/api/customers) — Customer management
- [Billing](/api/billing) — DirectPay integration
- [Errors](/api/errors) — Error codes & handling

### Guides
- [AI Models](/guide/models) — All available models
- [Best Practices](/guide/best-practices) — Integration tips
- [Webhooks](/guide/webhooks) — Event handling
- [Migration](/guide/migration) — From other platforms

</div>

## 🛠️ SDKs & Tools

Official SDKs available for:

- **JavaScript/TypeScript** — `npm install innoai`
- **Python** — `pip install innoai`
- **PHP** — `composer require innoai/innoai-php`

All SDKs are OpenAI-compatible — just change the base URL!

## 🤝 Community & Support

- **Discord:** [discord.gg/innoai](https://discord.gg/innoai)
- **Twitter/X:** [@InnoAIph](https://twitter.com/InnoAIph)
- **Email:** support@innoai.ph
- **GitHub:** [github.com/innovatehubph/inno-ai-gateway](https://github.com/innovatehubph/inno-ai-gateway)

## 📝 Code Examples

### Generate an Image

```javascript
const response = await fetch('https://ai-gateway.innoserver.cloud/v1/images/generations', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'inno-flux-1-schnell',
    prompt: 'A beautiful sunset over Manila Bay',
    n: 1,
    size: '1024x1024'
  })
});

const data = await response.json();
console.log(data.data[0].url);
```

### Text-to-Speech

```python
from openai import OpenAI

client = OpenAI(
    base_url="https://ai-gateway.innoserver.cloud/v1",
    api_key="your-api-key"
)

response = client.audio.speech.create(
    model="inno-elevenlabs-multilingual",
    voice="alloy",
    input="Kumusta! Welcome to InnoAI."
)

response.stream_to_file("output.mp3")
```

### Create Embeddings

```javascript
const response = await client.embeddings.create({
  model: 'inno-minilm-l6-v2',
  input: 'The Philippines is an archipelago in Southeast Asia.',
});

console.log(response.data[0].embedding);
// [0.023, -0.045, 0.078, ...]
```

## 🌟 Testimonials

> "Switching to InnoAI saved us 40% on AI costs and the local support is incredible."
> — **Juan dela Cruz**, CTO at Startup PH

> "Finally, an AI platform that understands Tagalog! Our chatbot responses are so much more natural now."
> — **Maria Santos**, Product Manager

## 🚀 Ready to Start?

Get your API key and start building:

[Get Started →](/getting-started/quickstart)
[View API Docs →](/api/)

---

**InnoAI: AI Models for Every Filipino** 🇵🇭✨

*Built with ❤️ by InnovateHub Philippines*
