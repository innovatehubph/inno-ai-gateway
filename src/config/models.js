// Model branding mappings
const MODEL_BRANDING = {
  'claude-opus-4-5': 'inno-ai-boyong-4.5',
  'claude-sonnet-4': 'inno-ai-boyong-4.0',
  'claude-haiku-4-5': 'inno-ai-boyong-mini',
  'gpt-4o': 'inno-ai-boyong-4.5',
  'gpt-4': 'inno-ai-boyong-4.5',
  'gpt-3.5-turbo': 'inno-ai-boyong-mini',
  'inno-ai-boyong-4.5': 'inno-ai-boyong-4.5',
  'inno-ai-boyong-4.0': 'inno-ai-boyong-4.0',
  'inno-ai-boyong-mini': 'inno-ai-boyong-mini'
};

// HuggingFace model mappings
const HF_MODELS = {
  image: 'black-forest-labs/FLUX.1-schnell',
  image_alt: 'runwayml/stable-diffusion-v1-5',
  tts: 'facebook/mms-tts-eng',
  stt: 'openai/whisper-large-v3',
  embeddings: 'sentence-transformers/all-MiniLM-L6-v2',
  text_to_3d: 'openai/shap-e',
  image_to_3d: 'stabilityai/TripoSR',
  text_to_3d_alt: 'openai/point-e',
  image_to_3d_alt: 'sudo-ai/zero123plus-v1.2'
};

// Image tier models
const IMAGE_TIERS = {
  'image-1': {
    name: 'Fast',
    model: 'prunaai/p-image',
    description: 'Sub-second generation, budget-friendly',
    speed: '< 1 sec',
    cost: '~$0.001',
    quality: '⭐⭐⭐',
    category: 'fast'
  },
  'image-2': {
    name: 'Turbo',
    model: 'prunaai/z-image-turbo',
    description: 'Fast with better quality, 6B params',
    speed: '~1 sec',
    cost: '~$0.003',
    quality: '⭐⭐⭐⭐',
    category: 'fast'
  },
  'ultrafast': {
    name: 'Ultra Fast',
    model: 'google/imagen-4-fast',
    description: 'Google Imagen 4 optimized for speed',
    speed: '~2 sec',
    cost: '~$0.02',
    quality: '⭐⭐⭐⭐',
    category: 'fast'
  },
  'image-3': {
    name: 'Standard',
    model: 'black-forest-labs/flux-schnell',
    description: 'Great balance of speed and quality',
    speed: '~3 sec',
    cost: '~$0.003',
    quality: '⭐⭐⭐⭐',
    category: 'standard'
  },
  'standard': {
    name: 'Gemini Standard',
    model: 'google/gemini-2.5-flash-image',
    description: 'Google Gemini 2.5 Flash image generation',
    speed: '~5 sec',
    cost: '~$0.02',
    quality: '⭐⭐⭐⭐',
    category: 'standard'
  },
  'standard-edit': {
    name: 'Standard Edit',
    model: 'google/nano-banana',
    description: 'Google Gemini 2.5 with image editing',
    speed: '~8 sec',
    cost: '~$0.04',
    quality: '⭐⭐⭐⭐⭐',
    category: 'edit'
  },
  'image-4': {
    name: 'Quality',
    model: 'black-forest-labs/flux-dev',
    description: 'High quality, detailed outputs',
    speed: '~10 sec',
    cost: '~$0.03',
    quality: '⭐⭐⭐⭐⭐',
    category: 'quality'
  },
  'image-5': {
    name: 'Premium',
    model: 'black-forest-labs/flux-pro',
    description: 'Professional quality, best prompt following',
    speed: '~8 sec',
    cost: '~$0.05',
    quality: '⭐⭐⭐⭐⭐',
    category: 'premium'
  },
  'premium-edit': {
    name: 'Premium Edit',
    model: 'google/nano-banana-pro',
    description: 'Best editing model with text rendering',
    speed: '~15 sec',
    cost: '~$0.08',
    quality: '⭐⭐⭐⭐⭐+',
    category: 'edit'
  },
  'image-6': {
    name: 'Ultra',
    model: 'google/nano-banana-pro',
    description: 'State-of-the-art, text rendering, editing',
    speed: '~15 sec',
    cost: '~$0.08',
    quality: '⭐⭐⭐⭐⭐+',
    category: 'ultra'
  },
  'ultrav1': {
    name: 'Ultra V1 (OpenAI)',
    model: 'openai/gpt-image-1.5',
    description: 'OpenAI GPT Image 1.5 - best instruction following',
    speed: '~12 sec',
    cost: '~$0.08',
    quality: '⭐⭐⭐⭐⭐+',
    category: 'ultra'
  },
  'ultrav2': {
    name: 'Ultra V2 (Google)',
    model: 'google/imagen-4',
    description: 'Google Imagen 4 flagship - highest fidelity',
    speed: '~10 sec',
    cost: '~$0.08',
    quality: '⭐⭐⭐⭐⭐+',
    category: 'ultra'
  }
};

const IMAGE_ALIASES = {
  'fast': 'image-1',
  'turbo': 'image-2',
  'quick': 'ultrafast',
  'default': 'image-3',
  'gemini': 'standard',
  'flash': 'standard',
  'quality': 'image-4',
  'premium': 'image-5',
  'pro': 'image-5',
  'ultra': 'image-6',
  'best': 'ultrav2',
  'openai': 'ultrav1',
  'gpt': 'ultrav1',
  'imagen': 'ultrav2',
  'imagen4': 'ultrav2',
  'edit': 'standard-edit',
  'edit-pro': 'premium-edit',
  'banana': 'standard-edit',
  'banana-pro': 'premium-edit',
  'cheap': 'image-1',
  'budget': 'image-1'
};

// 3D Model tiers
const MODEL_3D_TIERS = {
  '3d-1': {
    name: 'Fast 3D',
    model: 'mareksagan/dreamgaussian:d16b4890fd9d1996aa7e018c261237e3c4157d20489773f3022ef10de6c06909',
    description: 'DreamGaussian - Fast Gaussian Splatting',
    speed: '~30 sec',
    cost: '~$0.05',
    quality: '⭐⭐⭐',
    category: 'fast'
  },
  '3d-2': {
    name: 'Standard 3D',
    model: 'tencent/hunyuan-3d-3.1:a2838628b41a2e0ee2eb19b3ea98a40d75f8d7639bf5a1ddd37ea299bb334854',
    description: 'Tencent Hunyuan-3D 3.1 - High quality textures',
    speed: '~2 min',
    cost: '~$0.15',
    quality: '⭐⭐⭐⭐⭐',
    category: 'standard'
  },
  '3d-premium': {
    name: 'Premium 3D',
    model: 'hyper3d/rodin',
    description: 'Rodin Gen-2 - Complex detailed models',
    speed: '~3 min',
    cost: '~$0.20',
    quality: '⭐⭐⭐⭐⭐+',
    category: 'premium'
  }
};

const MODEL_3D_ALIASES = {
  'fast': '3d-1',
  'dreamgaussian': '3d-1',
  'standard': '3d-2',
  'hunyuan': '3d-2',
  'default': '3d-2',
  'premium': '3d-premium',
  'rodin': '3d-premium',
  'best': '3d-premium'
};

// Video model tiers
const VIDEO_TIERS = {
  'video-1': {
    name: 'Fast T2V',
    model: 'lucataco/animate-diff',
    description: 'AnimateDiff - Animated text-to-video',
    speed: '~30 sec',
    cost: '~$0.05',
    quality: '⭐⭐⭐',
    type: 'text-to-video',
    category: 'fast'
  },
  'video-2': {
    name: 'Standard T2V',
    model: 'minimax/video-01',
    description: 'MiniMax/Hailuo - 6s videos from text/image',
    speed: '~1 min',
    cost: '~$0.15',
    quality: '⭐⭐⭐⭐',
    type: 'text-to-video',
    category: 'standard'
  },
  'video-3': {
    name: 'Quality T2V',
    model: 'luma/ray',
    description: 'Luma Dream Machine - High quality T2V',
    speed: '~1 min',
    cost: '~$0.25',
    quality: '⭐⭐⭐⭐⭐',
    type: 'text-to-video',
    category: 'quality'
  },
  'video-premium': {
    name: 'Premium T2V',
    model: 'wan-video/wan-2.5-t2v',
    description: 'Wan 2.5 - High quality T2V',
    speed: '~2 min',
    cost: '~$0.35',
    quality: '⭐⭐⭐⭐⭐',
    type: 'text-to-video',
    category: 'premium'
  },
  'video-premium2': {
    name: 'Premium+ T2V',
    model: 'wan-video/wan-2.6-t2v',
    description: 'Wan 2.6 - Latest Alibaba T2V model',
    speed: '~2 min',
    cost: '~$0.40',
    quality: '⭐⭐⭐⭐⭐+',
    type: 'text-to-video',
    category: 'premium'
  },
  'video-i2v': {
    name: 'Fast I2V',
    model: 'wan-video/wan-2.2-i2v-fast',
    description: 'Wan 2.2 Fast - Image to video',
    speed: '~30 sec',
    cost: '~$0.10',
    quality: '⭐⭐⭐⭐',
    type: 'image-to-video',
    category: 'fast'
  },
  'video-i2v-kling': {
    name: 'Premium I2V',
    model: 'kwaivgi/kling-v2.1',
    description: 'Kling V2.1 - 5s/10s videos from image',
    speed: '~1 min',
    cost: '~$0.25',
    quality: '⭐⭐⭐⭐⭐',
    type: 'image-to-video',
    category: 'premium'
  },
  'video-edit': {
    name: 'Video Edit',
    model: 'luma/modify-video',
    description: 'Luma - Style transfer & prompt editing',
    speed: '~1 min',
    cost: '~$0.15',
    quality: '⭐⭐⭐⭐⭐',
    type: 'video-edit',
    category: 'edit'
  },
  'video-reframe': {
    name: 'Video Reframe',
    model: 'luma/reframe-video',
    description: 'Change aspect ratio (up to 30s, 720p)',
    speed: '~20 sec',
    cost: '~$0.05',
    quality: '⭐⭐⭐⭐',
    type: 'video-edit',
    category: 'edit'
  },
  'video-audio': {
    name: 'Add Audio',
    model: 'zsxkib/mmaudio',
    description: 'MMAudio V2 - Add sound to video',
    speed: '~30 sec',
    cost: '~$0.08',
    quality: '⭐⭐⭐⭐⭐',
    type: 'video-audio',
    category: 'audio'
  }
};

const VIDEO_ALIASES = {
  'fast': 'video-1',
  'animatediff': 'video-1',
  'standard': 'video-2',
  'hailuo': 'video-2',
  'minimax': 'video-2',
  'default': 'video-2',
  'quality': 'video-3',
  'luma': 'video-3',
  'ray': 'video-3',
  'dream-machine': 'video-3',
  'premium': 'video-premium',
  'wan25': 'video-premium',
  'premium2': 'video-premium2',
  'wan26': 'video-premium2',
  'best': 'video-premium2',
  'i2v': 'video-i2v',
  'img2vid': 'video-i2v',
  'image-to-video': 'video-i2v',
  'i2v-kling': 'video-i2v-kling',
  'kling': 'video-i2v-kling',
  'edit': 'video-edit',
  'modify': 'video-edit',
  'style': 'video-edit',
  'reframe': 'video-reframe',
  'resize': 'video-reframe',
  'aspect': 'video-reframe',
  'audio': 'video-audio',
  'sound': 'video-audio',
  'mmaudio': 'video-audio'
};

module.exports = {
  MODEL_BRANDING,
  HF_MODELS,
  IMAGE_TIERS,
  IMAGE_ALIASES,
  MODEL_3D_TIERS,
  MODEL_3D_ALIASES,
  VIDEO_TIERS,
  VIDEO_ALIASES
};
