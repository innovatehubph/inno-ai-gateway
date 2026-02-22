const express = require('express');
const router = express.Router();
const { loadAnalytics } = require('../utils/data-helpers');
const { formatUptime } = require('../utils/formatters');
const { 
  HF_API_TOKEN, 
  OPENROUTER_API_KEY, 
  MOONSHOT_API_KEY, 
  REPLICATE_API_KEY,
  ANTIGRAVITY_ENABLED,
  loadAntigravityCredentials
} = require('../config/providers');

router.get('/', (req, res) => {
  const analytics = loadAnalytics();
  const uptime = Date.now() - analytics.startTime;
  
  res.json({ 
    status: 'ok', 
    service: 'InnovateHub AI Gateway', 
    version: '3.1.0',
    models: {
      chat: ['inno-ai-boyong-4.5', 'inno-ai-boyong-4.0', 'inno-ai-boyong-mini'],
      image: ['inno-ai-vision-xl'],
      audio: ['inno-ai-voice-1', 'inno-ai-whisper-1'],
      embeddings: ['inno-ai-embed-1'],
      '3d': ['inno-ai-3d-gen', 'inno-ai-3d-convert']
    },
    capabilities: ['chat', 'streaming', 'images', 'audio', 'embeddings', '3d_generation', 'image_to_3d'],
    powered_by: 'InnovateHub Philippines',
    uptime_ms: uptime,
    uptime_human: formatUptime(uptime),
    timestamp: new Date().toISOString(),
    providers: {
      huggingface: {
        configured: !!HF_API_TOKEN,
        description: 'Hugging Face Inference API - use hf-{model_id} prefix'
      },
      openrouter: {
        configured: !!OPENROUTER_API_KEY,
        description: 'OpenRouter API - use or-{model_id} prefix'
      },
      moonshotai: {
        configured: !!MOONSHOT_API_KEY,
        description: 'MoonshotAI (Kimi) - use kimi-{model_id} prefix'
      },
      antigravity: {
        configured: ANTIGRAVITY_ENABLED && !!loadAntigravityCredentials(),
        description: 'Google Antigravity/OpenCode - use antigravity-{model_id} prefix (OAuth via OpenClaw)'
      },
      replicate: {
        configured: !!REPLICATE_API_KEY,
        description: 'Replicate - Image and 3D generation'
      }
    }
  });
});

module.exports = router;
