# Image Generation

Generate stunning images with 12 tiered models ranging from ultra-fast budget options to premium quality.

## Available Models

| Tier | Model | Speed | Cost | Quality |
|------|-------|-------|------|---------|
| `image-1` | prunaai/p-image | <1s | ~$0.001 | ⭐⭐⭐ |
| `image-2` | prunaai/z-image-turbo | ~1s | ~$0.003 | ⭐⭐⭐⭐ |
| `image-3` | flux-schnell | ~3s | ~$0.003 | ⭐⭐⭐⭐ |
| `image-4` | flux-dev | ~10s | ~$0.03 | ⭐⭐⭐⭐⭐ |
| `image-5` | flux-pro | ~8s | ~$0.05 | ⭐⭐⭐⭐⭐ |
| `image-6` | nano-banana-pro | ~15s | ~$0.08 | ⭐⭐⭐⭐⭐+ |
| `ultrafast` | imagen-4-fast | ~2s | ~$0.02 | ⭐⭐⭐⭐ |
| `ultrav1` | gpt-image-1.5 | ~12s | ~$0.08 | ⭐⭐⭐⭐⭐+ |
| `ultrav2` | imagen-4 | ~10s | ~$0.08 | ⭐⭐⭐⭐⭐+ |
| `standard` | gemini-2.5-flash-image | ~5s | ~$0.02 | ⭐⭐⭐⭐ |
| `standard-edit` | nano-banana | ~8s | ~$0.04 | ⭐⭐⭐⭐⭐ |
| `premium-edit` | nano-banana-pro | ~15s | ~$0.08 | ⭐⭐⭐⭐⭐+ |

## Convenient Aliases

Use friendly names instead of tier IDs:

| Alias | Maps To |
|-------|---------|
| `fast`, `cheap`, `budget` | image-1 |
| `turbo` | image-2 |
| `default`, `standard` | image-3 |
| `quality` | image-4 |
| `premium`, `pro` | image-5 |
| `ultra`, `best` | image-6/ultrav2 |
| `openai`, `gpt` | ultrav1 |
| `imagen`, `imagen4` | ultrav2 |
| `gemini`, `flash` | standard |
| `edit`, `banana` | standard-edit |
| `edit-pro`, `banana-pro` | premium-edit |

## Basic Usage

```bash
curl https://ai-gateway.innoserver.cloud/v1/images/generations \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A cyberpunk city at night, neon lights, rain",
    "model": "image-3"
  }'
```

## Response

```json
{
  "created": 1771597857,
  "model": "image-3",
  "tier": "Standard",
  "data": [
    {
      "url": "/data/image_abc123.png",
      "external_url": "https://replicate.delivery/..."
    }
  ]
}
```

## Advanced Options

### Custom Size

```json
{
  "prompt": "A landscape painting",
  "model": "image-4",
  "size": "1920x1080"
}
```

### Multiple Images

```json
{
  "prompt": "A cute cat",
  "model": "image-2",
  "n": 4
}
```

### Base64 Response

```json
{
  "prompt": "An abstract art piece",
  "model": "image-3",
  "response_format": "b64_json"
}
```

## Choosing the Right Model

### For Speed (< 3 seconds)
- `image-1` - Fastest, good for prototyping
- `image-2` - Fast with better quality
- `ultrafast` - Google Imagen 4 speed-optimized

### For Quality
- `image-4` or `image-5` - FLUX models, excellent detail
- `ultrav2` - Google Imagen 4 flagship

### For Text in Images
- `premium-edit` or `standard-edit` - Nano Banana models excel at text rendering

### For Budget
- `image-1` at $0.001 per image
- `image-2` or `image-3` at $0.003 per image

## Code Examples

### JavaScript/TypeScript

```typescript
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: 'YOUR_API_KEY',
  baseURL: 'https://ai-gateway.innoserver.cloud/v1'
});

// Generate with specific tier
const response = await client.images.generate({
  prompt: 'A futuristic car design',
  model: 'ultrav2', // Google Imagen 4
  size: '1024x1024'
});

console.log(response.data[0].url);
```

### Python

```python
from openai import OpenAI

client = OpenAI(
    api_key="YOUR_API_KEY",
    base_url="https://ai-gateway.innoserver.cloud/v1"
)

# Fast generation
fast_image = client.images.generate(
    prompt="A robot chef cooking",
    model="image-1"  # ~1 second
)

# Premium quality
premium_image = client.images.generate(
    prompt="Photorealistic portrait, 8K detail",
    model="ultrav2"  # Google Imagen 4
)
```

## Tips for Better Results

1. **Be specific** - "A golden retriever puppy playing in autumn leaves" beats "a dog"
2. **Include style** - Add "photorealistic", "anime style", "oil painting", etc.
3. **Specify quality** - Add "8K", "highly detailed", "professional photo"
4. **Use negative prompts** - Some models support "without X" or "no X"

## List Available Models

```bash
curl https://ai-gateway.innoserver.cloud/v1/images/models
```

Returns all models with pricing and capabilities.
