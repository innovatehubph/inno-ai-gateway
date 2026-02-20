# Video Generation

Create videos from text, images, or edit existing videos with AI.

## Video Types

1. **Text-to-Video (T2V)** - Generate videos from text descriptions
2. **Image-to-Video (I2V)** - Animate images into videos
3. **Video Editing** - Modify style, aspect ratio, add audio

## Available Models

### Text-to-Video

| Tier | Model | Speed | Cost | Quality |
|------|-------|-------|------|---------|
| `video-1` | animate-diff | ~30s | ~$0.05 | ⭐⭐⭐ |
| `video-2` | minimax/video-01 | ~1m | ~$0.15 | ⭐⭐⭐⭐ |
| `video-3` | luma/ray | ~1m | ~$0.25 | ⭐⭐⭐⭐⭐ |
| `video-premium` | wan-2.5-t2v | ~2m | ~$0.35 | ⭐⭐⭐⭐⭐ |
| `video-premium2` | wan-2.6-t2v | ~2m | ~$0.40 | ⭐⭐⭐⭐⭐+ |

### Image-to-Video

| Tier | Model | Speed | Cost | Quality |
|------|-------|-------|------|---------|
| `video-i2v` | wan-2.2-i2v-fast | ~30s | ~$0.10 | ⭐⭐⭐⭐ |
| `video-i2v-kling` | kling-v2.1 | ~1m | ~$0.25 | ⭐⭐⭐⭐⭐ |

### Video Editing

| Tier | Model | Purpose | Cost |
|------|-------|---------|------|
| `video-edit` | luma/modify-video | Style transfer & editing | ~$0.15 |
| `video-reframe` | luma/reframe-video | Change aspect ratio | ~$0.05 |
| `video-audio` | zsxkib/mmaudio | Add AI-generated audio | ~$0.08 |

## Aliases

| Alias | Maps To |
|-------|---------|
| `fast`, `animatediff` | video-1 |
| `standard`, `hailuo`, `minimax`, `default` | video-2 |
| `quality`, `luma`, `ray`, `dream-machine` | video-3 |
| `premium`, `wan25` | video-premium |
| `best`, `wan26` | video-premium2 |
| `i2v`, `img2vid`, `image-to-video` | video-i2v |
| `kling` | video-i2v-kling |
| `edit`, `modify`, `style` | video-edit |
| `reframe`, `resize`, `aspect` | video-reframe |
| `audio`, `sound`, `mmaudio` | video-audio |

## Text-to-Video

### Basic Usage

```bash
curl https://ai-gateway.innoserver.cloud/v1/video/generations \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A cat playing piano, cute cartoon style",
    "model": "video-2",
    "duration": 5
  }'
```

### Response

```json
{
  "created": 1771597857,
  "model": "video-2",
  "tier": "Standard T2V",
  "data": [
    {
      "url": "/data/video_abc123.mp4",
      "external_url": "https://replicate.delivery/...",
      "duration": 5
    }
  ]
}
```

## Image-to-Video

Animate a static image:

```bash
curl https://ai-gateway.innoserver.cloud/v1/video/generations \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "image": "https://example.com/my-image.jpg",
    "model": "video-i2v"
  }'
```

## Video Editing

### Style Transfer

```bash
curl https://ai-gateway.innoserver.cloud/v1/video/edit \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "video": "https://example.com/my-video.mp4",
    "prompt": "Make it look like a Pixar animation",
    "model": "video-edit"
  }'
```

### Change Aspect Ratio

```bash
curl https://ai-gateway.innoserver.cloud/v1/video/edit \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "video": "https://example.com/horizontal-video.mp4",
    "model": "video-reframe",
    "aspect_ratio": "9:16"
  }'
```

## Add AI Audio

Generate contextual audio for silent videos:

```bash
curl https://ai-gateway.innoserver.cloud/v1/video/add-audio \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "video": "https://example.com/silent-video.mp4",
    "prompt": "Upbeat background music with nature sounds"
  }'
```

## Code Examples

### JavaScript

```javascript
const response = await fetch('https://ai-gateway.innoserver.cloud/v1/video/generations', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    prompt: 'A timelapse of a flower blooming',
    model: 'video-3',
    duration: 5
  })
});

const data = await response.json();
console.log('Video URL:', data.data[0].url);
```

### Python

```python
import requests

response = requests.post(
    'https://ai-gateway.innoserver.cloud/v1/video/generations',
    headers={'Authorization': 'Bearer YOUR_API_KEY'},
    json={
        'prompt': 'Waves crashing on a beach, slow motion',
        'model': 'video-premium',
        'duration': 5
    }
)

video_url = response.json()['data'][0]['url']
print(f"Video: {video_url}")
```

## Tips for Better Videos

1. **Be descriptive** - Include motion, style, mood
2. **Specify camera** - "slow pan", "zoom in", "tracking shot"
3. **Add style** - "cinematic", "animation", "documentary"
4. **Keep it simple** - One main subject/action works best
5. **Use quality models** - `video-3` or higher for important content

## List Available Models

```bash
curl https://ai-gateway.innoserver.cloud/v1/video/models
```
