---
title: AI Models
description: Complete list of available AI models on InnoAI
---

# AI Models

InnoAI provides access to 31+ AI models across multiple categories including chat, images, video, audio, and embeddings.

## Model Categories

| Category | Filipino Name | Models | Starting Price |
|----------|---------------|--------|----------------|
| **Chat** | SulatAI | 6 | ₱0.15/1K tokens |
| **Images** | SiningAI | 12 | ₱0.06/image |
| **Video** | PelikulaAI | 10 | ₱2.90/video |
| **3D** | — | 3 | ₱2.90/model |
| **Audio** | TinigAI | 4 | ₱0.08/minute |
| **Embeddings** | — | 3 | ₱0.008/1K tokens |

## Chat Models (SulatAI)

### Available Models

| Model | Provider | Context | Input Price | Output Price | Best For |
|-------|----------|---------|-------------|--------------|----------|
| **inno-ai-boyong-4.5** | InnoAI | 128K | ₱0.15/1K | ₱0.60/1K | Balanced, cost-effective |
| **inno-claude-3.5-sonnet** | Anthropic | 200K | ₱0.30/1K | ₱1.50/1K | Complex reasoning |
| **inno-claude-3-opus** | Anthropic | 200K | ₱0.75/1K | ₱3.75/1K | Most capable |
| **inno-gpt-4o** | OpenAI | 128K | ₱0.40/1K | ₱1.50/1K | General purpose |
| **inno-gpt-4o-mini** | OpenAI | 128K | ₱0.075/1K | ₱0.30/1K | Fast, low-cost |
| **inno-gemini-1.5-pro** | Google | 1M | ₱0.10/1K | ₱0.40/1K | Long context |
| **inno-gemini-1.5-flash** | Google | 1M | ₱0.0375/1K | ₱0.15/1K | Fast, affordable |

### Model Comparison

| Feature | Boyong 4.5 | Claude 3.5 | GPT-4o | Gemini Pro |
|---------|-----------|-----------|--------|------------|
| **Reasoning** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Speed** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Cost** | ₱ | ₱₱₱ | ₱₱ | ₱ |
| **Tagalog** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| **Code** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |

### Usage Example

```javascript
const response = await client.chat.completions.create({
  model: 'inno-ai-boyong-4.5',
  messages: [
    { role: 'system', content: 'You are a helpful Filipino assistant.' },
    { role: 'user', content: 'Paano mag-start sa AI?' }
  ],
  temperature: 0.7
});
```

## Image Models (SiningAI)

### Tiered Pricing

| Tier | Price Range | Quality | Use Case |
|------|-------------|---------|----------|
| **Budget** | ₱0.06 - ₱0.30 | Standard | Prototypes, drafts |
| **Standard** | ₱0.18 - ₱0.90 | Good | Social media |
| **Premium** | ₱3.00 - ₱6.00 | High | Professional |
| **Ultra** | ₱4.80 - ₱12.00 | Maximum | Commercial |

### Budget Models

| Model | Price | Speed | Resolution |
|-------|-------|-------|------------|
| **inno-flux-1-schnell** | ₱0.06 | ⚡ 1-2s | 1024x1024 |
| **inno-sdxl-lightning** | ₱0.12 | ⚡ 2-3s | 1024x1024 |

### Standard Models

| Model | Price | Speed | Resolution |
|-------|-------|-------|------------|
| **inno-flux-1-dev** | ₱0.18 | 3-5s | 1024x1024 |
| **inno-sdxl-base** | ₱0.30 | 5-8s | 1024x1024 |
| **inno-pixart-sigma** | ₱0.45 | 8-12s | 1024x1024 |

### Premium Models

| Model | Price | Speed | Resolution |
|-------|-------|-------|------------|
| **inno-imagen-4** | ₱3.00 | 15-20s | 1024x1024 |
| **inno-dall-e-3** | ₱4.50 | 20-30s | 1024x1024 |
| **inno-ideogram-v3** | ₱3.75 | 15-20s | 1024x1024 |

### Ultra Models

| Model | Price | Speed | Resolution |
|-------|-------|-------|------------|
| **inno-flux-1.1-pro** | ₱4.80 | 30-45s | 1024x1024 |
| **inno-recraft-v3** | ₱6.00 | 20-30s | 1024x1024 |
| **inno-gpt-image-1** | ₱12.00 | 45-60s | 1024x1024 |

### Usage Example

```javascript
const response = await client.images.generate({
  model: 'inno-flux-1-schnell',
  prompt: 'A jeepney driving through Manila streets at sunset',
  n: 1,
  size: '1024x1024'
});

console.log(response.data[0].url);
```

## Video Models (PelikulaAI)

### Available Models

| Model | Price | Duration | Resolution | Speed |
|-------|-------|----------|------------|-------|
| **inno-wan-2.1-t2v-1.3b** | ₱2.90 | 5 sec | 480p | 30-60s |
| **inno-luma-dream-machine** | ₱8.70 | 5 sec | 720p | 2-3 min |
| **inno-pika-2.0** | ₱11.60 | 5 sec | 720p | 3-5 min |
| **inno-kling-1.6** | ₱14.50 | 5 sec | 1080p | 5-8 min |
| **inno-hailuo-ai** | ₱14.50 | 5 sec | 1080p | 5-8 min |
| **inno-runway-gen3** | ₱17.40 | 5 sec | 1080p | 8-12 min |

### Usage Example

```bash
curl https://ai-gateway.innoserver.cloud/v1/videos/generations \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "inno-luma-dream-machine",
    "prompt": "A drone flying over rice terraces",
    "duration": 5,
    "width": 1280,
    "height": 720
  }'
```

## 3D Models

### Available Models

| Model | Price | Output | Speed | Best For |
|-------|-------|--------|-------|----------|
| **inno-hunyuan3d-v2-mini** | ₱2.90 | GLB/OBJ | 30-60s | Quick objects |
| **inno-dreamgaussian** | ₱8.70 | GLB/OBJ | 2-3 min | High quality |
| **inno-rodin-gen1** | ₱17.40 | GLB/OBJ | 5-10 min | Professional |

### Usage Example

```javascript
const response = await fetch('https://ai-gateway.innoserver.cloud/v1/3d/generations', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'inno-hunyuan3d-v2-mini',
    prompt: 'A cute jeepney toy',
    format: 'glb'
  })
});
```

## Audio Models (TinigAI)

### Text-to-Speech

| Model | Price | Quality | Languages |
|-------|-------|---------|-----------|
| **inno-mms-tts** | ₱0.08/min | Good | 1,100+ |
| **inno-whisper-tts** | ₱0.12/min | Better | Multi |
| **inno-elevenlabs-multilingual** | ₱0.30/min | Excellent | 29 |

### Speech-to-Text

| Model | Price | Accuracy | Features |
|-------|-------|----------|----------|
| **inno-whisper-large-v3** | ₱0.08/min | 95%+ | Transcription |
| **inno-whisper-api** | ₱0.12/min | 97%+ | Timestamps |

### Usage Examples

#### Text-to-Speech

```javascript
const mp3 = await client.audio.speech.create({
  model: 'inno-elevenlabs-multilingual',
  voice: 'alloy',
  input: 'Kumusta! Welcome to InnoAI.',
  response_format: 'mp3'
});

const buffer = Buffer.from(await mp3.arrayBuffer());
await fs.promises.writeFile('speech.mp3', buffer);
```

#### Speech-to-Text

```bash
curl https://ai-gateway.innoserver.cloud/v1/audio/transcriptions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -F file="@recording.mp3" \
  -F model="inno-whisper-large-v3" \
  -F language="fil"
```

## Embedding Models

### Available Models

| Model | Dimensions | Price | Best For |
|-------|------------|-------|----------|
| **inno-minilm-l6-v2** | 384 | ₱0.008/1K | Basic search |
| **inno-bge-m3** | 1024 | ₱0.015/1K | Multi-language RAG |
| **inno-e5-large-v2** | 1024 | ₱0.020/1K | High quality |

### Usage Example

```javascript
const response = await client.embeddings.create({
  model: 'inno-minilm-l6-v2',
  input: 'The Philippines is an archipelago in Southeast Asia.'
});

console.log(response.data[0].embedding);
// [0.023, -0.045, 0.078, ...]
```

## Model Selection Guide

### Choose the Right Model

| Use Case | Recommended Model | Why |
|----------|------------------|-----|
| **General chat** | inno-ai-boyong-4.5 | Balanced cost/performance |
| **Tagalog content** | inno-ai-boyong-4.5 | Filipino-trained |
| **Complex reasoning** | inno-claude-3.5-sonnet | Best reasoning |
| **Code generation** | inno-gpt-4o | Excellent code |
| **Long documents** | inno-gemini-1.5-pro | 1M context |
| **Quick images** | inno-flux-1-schnell | Fastest, cheapest |
| **Professional images** | inno-imagen-4 | Best quality |
| **Video prototyping** | inno-wan-2.1-t2v | Budget-friendly |
| **High-quality video** | inno-kling-1.6 | Best video quality |
| **RAG systems** | inno-bge-m3 | Multi-language |

### Performance vs Cost

| Priority | Chat | Image | Video |
|----------|------|-------|-------|
| **Lowest cost** | inno-gpt-4o-mini | inno-flux-1-schnell | inno-wan-2.1-t2v |
| **Best value** | inno-ai-boyong-4.5 | inno-flux-1-dev | inno-luma-dream-machine |
| **Highest quality** | inno-claude-3-opus | inno-gpt-image-1 | inno-runway-gen3 |

## Model Capabilities

### Multilingual Support

| Model | Tagalog | English | Chinese | Others |
|-------|---------|---------|---------|--------|
| Boyong 4.5 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 100+ |
| Claude 3.5 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 20+ |
| GPT-4o | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 50+ |
| Gemini Pro | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 40+ |

### Feature Matrix

| Feature | Boyong | Claude | GPT-4o | Gemini |
|---------|--------|--------|--------|--------|
| **Streaming** | ✅ | ✅ | ✅ | ✅ |
| **JSON mode** | ✅ | ✅ | ✅ | ✅ |
| **Function calling** | ✅ | ✅ | ✅ | ✅ |
| **Vision** | ✅ | ✅ | ✅ | ✅ |
| **Fine-tuning** | ❌ | ❌ | ✅ | ❌ |

## Requesting New Models

To request a new model:

1. Check the [model roadmap](https://innoai.ph/roadmap)
2. Vote on [feature requests](https://innoai.ph/feedback)
3. Contact support@innoai.ph

---

**Model questions?** Contact support@innoai.ph
