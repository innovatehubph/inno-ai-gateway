---
title: Quickstart Guide
description: Get started with InnoAI in 5 minutes
---

# Quickstart Guide

Get up and running with InnoAI in just 5 minutes. This guide covers everything from account creation to your first API call.

## Prerequisites

Before you begin, make sure you have:

- A valid email address
- A credit/debit card or GCash for billing (optional for free tier)
- Basic knowledge of REST APIs or one of our supported SDKs

## Step 1: Create an Account

1. Visit [https://dashboard.innoai.ph](https://dashboard.innoai.ph)
2. Click **"Sign Up"**
3. Enter your email and create a password
4. Verify your email address
5. Complete your profile with your name and company

## Step 2: Get Your API Key

1. Log in to the [Dashboard](https://dashboard.innoai.ph)
2. Navigate to **Settings > API Keys**
3. Click **"Create New Key"**
4. Give your key a descriptive name (e.g., "Development", "Production")
5. Copy the API key (you won't see it again!)

::: warning Store Securely
Your API key is like a password. Never share it or commit it to version control. Use environment variables in production.
:::

## Step 3: Make Your First API Call

### Using cURL

```bash
export INNOAI_API_KEY="your-api-key-here"

curl https://ai-gateway.innoserver.cloud/v1/chat/completions \
  -H "Authorization: Bearer $INNOAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "inno-ai-boyong-4.5",
    "messages": [{"role": "user", "content": "Kumusta! Ano ang InnoAI?"}]
  }'
```

### Using JavaScript/Node.js

```javascript
import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'https://ai-gateway.innoserver.cloud/v1',
  apiKey: process.env.INNOAI_API_KEY,
});

async function main() {
  const response = await client.chat.completions.create({
    model: 'inno-ai-boyong-4.5',
    messages: [
      { role: 'user', content: 'Kumusta! Ano ang InnoAI?' }
    ],
  });

  console.log(response.choices[0].message.content);
}

main();
```

### Using Python

```python
import os
from openai import OpenAI

client = OpenAI(
    base_url="https://ai-gateway.innoserver.cloud/v1",
    api_key=os.environ.get("INNOAI_API_KEY")
)

response = client.chat.completions.create(
    model="inno-ai-boyong-4.5",
    messages=[
        {"role": "user", "content": "Kumusta! Ano ang InnoAI?"}
    ]
)

print(response.choices[0].message.content)
```

### Using PHP

```php
<?php
require_once 'vendor/autoload.php';

$client = \OpenAI::factory()
    ->withBaseUri('https://ai-gateway.innoserver.cloud/v1')
    ->withApiKey($_ENV['INNOAI_API_KEY'])
    ->make();

$response = $client->chat()->create([
    'model' => 'inno-ai-boyong-4.5',
    'messages' => [
        ['role' => 'user', 'content' => 'Kumusta! Ano ang InnoAI?'],
    ],
]);

echo $response->choices[0]->message->content;
```

## Step 4: Try Streaming

For real-time responses, use streaming:

```javascript
const stream = await client.chat.completions.create({
  model: 'inno-ai-boyong-4.5',
  messages: [{ role: 'user', content: 'Tell me a story about the Philippines' }],
  stream: true,
});

for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content || '');
}
```

## Step 5: Generate an Image

```bash
curl https://ai-gateway.innoserver.cloud/v1/images/generations \
  -H "Authorization: Bearer $INNOAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "inno-flux-1-schnell",
    "prompt": "A beautiful sunset over Manila Bay with palm trees",
    "n": 1,
    "size": "1024x1024"
  }'
```

## What's Next?

- [Explore all AI models](/guide/models) — See what you can build
- [Learn about authentication](/getting-started/authentication) — Secure your integration
- [View pricing details](/getting-started/pricing) — Understand costs
- [Read best practices](/guide/best-practices) — Build production-ready apps
- [Set up webhooks](/guide/webhooks) — Get real-time events

## Quick Commands Reference

| Action | cURL Example |
|--------|--------------|
| **Chat** | `curl -H "Authorization: Bearer $KEY" -d '{"model":"inno-ai-boyong-4.5","messages":[{"role":"user","content":"Hi"}]}' https://ai-gateway.innoserver.cloud/v1/chat/completions` |
| **Image** | `curl -H "Authorization: Bearer $KEY" -d '{"model":"inno-flux-1-schnell","prompt":"A cat","n":1}' https://ai-gateway.innoserver.cloud/v1/images/generations` |
| **Embeddings** | `curl -H "Authorization: Bearer $KEY" -d '{"model":"inno-minilm-l6-v2","input":"Hello"}' https://ai-gateway.innoserver.cloud/v1/embeddings` |

## Need Help?

- 📧 Email: support@innoai.ph
- 💬 Discord: [discord.gg/innoai](https://discord.gg/innoai)
- 📖 API Reference: [/api/](/api/)

---

**Congratulations!** You've made your first API call to InnoAI. Welcome to the community! 🇵🇭
