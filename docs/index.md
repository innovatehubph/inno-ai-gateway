---
layout: home

hero:
  name: InnovateHub AI Gateway
  text: Multimodal AI API
  tagline: One API for Chat, Images, Video, 3D, Audio, and Embeddings
  image:
    src: /hero.svg
    alt: AI Gateway
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: API Reference
      link: /api/overview
    - theme: alt
      text: View on GitHub
      link: https://github.com/innovatehubph/inno-ai-gateway

features:
  - icon: 💬
    title: Chat Completions
    details: OpenAI-compatible chat API with streaming support. Works with any OpenAI SDK.
  - icon: 🖼️
    title: Image Generation
    details: 12 tiered models from budget ($0.001) to ultra premium ($0.08). FLUX, Imagen 4, GPT Image.
  - icon: 🎬
    title: Video Generation
    details: Text-to-video, image-to-video, video editing, and AI audio generation.
  - icon: 🧊
    title: 3D Generation
    details: Generate 3D models (GLB/OBJ) from text or images. DreamGaussian, Hunyuan3D, Rodin.
  - icon: 🔊
    title: Audio
    details: Text-to-speech and speech-to-text powered by advanced neural models.
  - icon: 📐
    title: Embeddings
    details: Vector embeddings for RAG, semantic search, and AI applications.
---

## Quick Start

```bash
# Install OpenAI SDK
npm install openai

# Or use curl
curl https://ai-gateway.innoserver.cloud/v1/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "inno-ai-boyong-4.5",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

## 31 Models Available

| Category | Count | Highlights |
|----------|-------|------------|
| **Chat** | 3 | GPT-4/Claude compatible |
| **Images** | 12 | FLUX, Imagen 4, GPT Image |
| **Video** | 10 | Luma, Kling, Wan |
| **3D** | 3 | Hunyuan3D, Rodin |
| **Audio** | 2 | Whisper, MMS-TTS |
| **Embeddings** | 1 | MiniLM |

## Pricing

All models are pay-per-use via Replicate. See [Models](/models/overview) for detailed pricing.

| Tier | Image | Video | 3D |
|------|-------|-------|-----|
| Budget | $0.001 | $0.05 | $0.05 |
| Standard | $0.003 | $0.15 | $0.15 |
| Premium | $0.05 | $0.35 | $0.20 |
| Ultra | $0.08 | $0.40 | - |
