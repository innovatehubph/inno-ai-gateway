# Models Overview

InnovateHub AI Gateway provides access to **31 AI models** across 6 categories.

## Summary

| Category | Count | Price Range |
|----------|-------|-------------|
| Chat | 3 | Included |
| Images | 12 | $0.001 - $0.08 |
| Video | 10 | $0.05 - $0.40 |
| 3D | 3 | $0.05 - $0.20 |
| Audio | 2 | Included |
| Embeddings | 1 | Included |

## 💬 Chat Models

| Model ID | Description | Capabilities |
|----------|-------------|--------------|
| `inno-ai-boyong-4.5` | Most capable | Chat, Function calling |
| `inno-ai-boyong-4.0` | Balanced | Chat |
| `inno-ai-boyong-mini` | Fast | Chat |

## 🖼️ Image Models (12)

### Budget Tier ($0.001 - $0.003)
| Model | Provider | Speed | Cost |
|-------|----------|-------|------|
| `image-1` | prunaai/p-image | <1s | $0.001 |
| `image-2` | prunaai/z-image-turbo | ~1s | $0.003 |
| `image-3` | flux-schnell | ~3s | $0.003 |

### Standard Tier ($0.02 - $0.04)
| Model | Provider | Speed | Cost |
|-------|----------|-------|------|
| `ultrafast` | google/imagen-4-fast | ~2s | $0.02 |
| `standard` | gemini-2.5-flash-image | ~5s | $0.02 |
| `image-4` | flux-dev | ~10s | $0.03 |
| `standard-edit` | google/nano-banana | ~8s | $0.04 |

### Premium Tier ($0.05 - $0.08)
| Model | Provider | Speed | Cost |
|-------|----------|-------|------|
| `image-5` | flux-pro | ~8s | $0.05 |
| `image-6` | nano-banana-pro | ~15s | $0.08 |
| `ultrav1` | openai/gpt-image-1.5 | ~12s | $0.08 |
| `ultrav2` | google/imagen-4 | ~10s | $0.08 |
| `premium-edit` | nano-banana-pro | ~15s | $0.08 |

## 🎬 Video Models (10)

### Text-to-Video
| Model | Provider | Speed | Cost |
|-------|----------|-------|------|
| `video-1` | animate-diff | ~30s | $0.05 |
| `video-2` | minimax/video-01 | ~1m | $0.15 |
| `video-3` | luma/ray | ~1m | $0.25 |
| `video-premium` | wan-video/wan-2.5-t2v | ~2m | $0.35 |
| `video-premium2` | wan-video/wan-2.6-t2v | ~2m | $0.40 |

### Image-to-Video
| Model | Provider | Speed | Cost |
|-------|----------|-------|------|
| `video-i2v` | wan-2.2-i2v-fast | ~30s | $0.10 |
| `video-i2v-kling` | kling-v2.1 | ~1m | $0.25 |

### Video Editing
| Model | Provider | Purpose | Cost |
|-------|----------|---------|------|
| `video-edit` | luma/modify-video | Style transfer | $0.15 |
| `video-reframe` | luma/reframe-video | Aspect ratio | $0.05 |
| `video-audio` | zsxkib/mmaudio | Add audio | $0.08 |

## 🧊 3D Models (3)

| Model | Provider | Speed | Cost | Output |
|-------|----------|-------|------|--------|
| `3d-1` | dreamgaussian | ~30s | $0.05 | GLB |
| `3d-2` | hunyuan-3d-3.1 | ~2m | $0.15 | GLB/OBJ |
| `3d-premium` | hyper3d/rodin | ~3m | $0.20 | GLB/FBX |

## 🔊 Audio Models (2)

| Model | Backend | Purpose |
|-------|---------|---------|
| `inno-ai-voice-1` | facebook/mms-tts-eng | Text-to-speech |
| `inno-ai-whisper-1` | openai/whisper-large-v3 | Speech-to-text |

## 📐 Embedding Models (1)

| Model | Backend | Dimensions |
|-------|---------|------------|
| `inno-ai-embed-1` | all-MiniLM-L6-v2 | 384 |

## Choosing Models

### For Speed
- **Images**: `image-1`, `image-2`, `ultrafast`
- **Video**: `video-1`, `video-i2v`
- **3D**: `3d-1`

### For Quality
- **Images**: `ultrav2`, `image-6`, `premium-edit`
- **Video**: `video-premium2`, `video-3`
- **3D**: `3d-premium`

### For Budget
- **Images**: `image-1` ($0.001), `image-2` ($0.003)
- **Video**: `video-1` ($0.05)
- **3D**: `3d-1` ($0.05)

## API Endpoints

```bash
# List all models
GET /v1/models

# List image models with pricing
GET /v1/images/models

# List video models with pricing
GET /v1/video/models

# List 3D models with pricing
GET /v1/3d/models
```
