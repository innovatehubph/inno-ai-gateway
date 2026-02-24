/**
 * Subscription & Pricing Configuration
 * 
 * Business Model: Multi-provider AI API aggregator with subscription pricing
 * - Aggregate: OpenRouter, Replicate, HuggingFace, OpenAI, Google, Anthropic
 * - Pricing: Subscription-based with usage allowances + overages
 * - Profit: Subscription revenue - provider costs - infrastructure costs
 * 
 * @module subscription-config
 */

const fs = require('fs');
const path = require('path');

const CONFIG_DIR = path.join(__dirname, '..', '..', 'config');
const SUBSCRIPTION_CONFIG_FILE = path.join(CONFIG_DIR, 'subscriptions.json');

// Provider-to-model mappings and costs
const PROVIDER_MODELS = {
  // OpenRouter (aggregates many providers)
  'openrouter': {
    models: {
      'anthropic/claude-3-opus': { 
        name: 'Claude 3 Opus', 
        cost: { input: 0.015, output: 0.075 },
        category: 'chat'
      },
      'anthropic/claude-3-sonnet': { 
        name: 'Claude 3.5 Sonnet', 
        cost: { input: 0.003, output: 0.015 },
        category: 'chat'
      },
      'anthropic/claude-3-haiku': { 
        name: 'Claude 3 Haiku', 
        cost: { input: 0.00025, output: 0.00125 },
        category: 'chat'
      },
      'openai/gpt-4o': { 
        name: 'GPT-4o', 
        cost: { input: 0.005, output: 0.015 },
        category: 'chat'
      },
      'openai/gpt-4-turbo': { 
        name: 'GPT-4 Turbo', 
        cost: { input: 0.01, output: 0.03 },
        category: 'chat'
      },
      'google/gemini-1.5-pro': {
        name: 'Gemini 1.5 Pro',
        cost: { input: 0.0035, output: 0.0105 },
        category: 'chat'
      },
      'google/gemini-1.5-flash': {
        name: 'Gemini 1.5 Flash',
        cost: { input: 0.00035, output: 0.00105 },
        category: 'chat'
      }
    }
  },
  
  // Direct provider - Anthropic (if you have direct API access)
  'anthropic': {
    models: {
      'claude-3-opus-20240229': {
        name: 'Claude 3 Opus (Direct)',
        cost: { input: 0.015, output: 0.075 },
        category: 'chat'
      },
      'claude-3-sonnet-20240229': {
        name: 'Claude 3 Sonnet (Direct)',
        cost: { input: 0.003, output: 0.015 },
        category: 'chat'
      }
    }
  },
  
  // Direct provider - OpenAI
  'openai': {
    models: {
      'gpt-4o': {
        name: 'GPT-4o (Direct)',
        cost: { input: 0.005, output: 0.015 },
        category: 'chat'
      },
      'gpt-4o-mini': {
        name: 'GPT-4o Mini',
        cost: { input: 0.00015, output: 0.0006 },
        category: 'chat'
      },
      'gpt-4-turbo': {
        name: 'GPT-4 Turbo (Direct)',
        cost: { input: 0.01, output: 0.03 },
        category: 'chat'
      },
      'dall-e-3': {
        name: 'DALL-E 3',
        cost: { perImage: 0.04 }, // Standard quality 1024x1024
        category: 'image'
      },
      'whisper-1': {
        name: 'Whisper',
        cost: { perMinute: 0.006 },
        category: 'audio'
      },
      'tts-1': {
        name: 'TTS',
        cost: { per1KChars: 0.015 },
        category: 'audio'
      }
    }
  },
  
  // Direct provider - Google
  'google': {
    models: {
      'gemini-1.5-pro': {
        name: 'Gemini 1.5 Pro (Direct)',
        cost: { input: 0.0035, output: 0.0105 },
        category: 'chat'
      },
      'gemini-1.5-flash': {
        name: 'Gemini 1.5 Flash (Direct)',
        cost: { input: 0.00035, output: 0.00105 },
        category: 'chat'
      }
    }
  },
  
  // HuggingFace (free models but we charge for infrastructure)
  'huggingface': {
    models: {
      'meta-llama/Llama-2-70b-chat-hf': {
        name: 'Llama 2 70B',
        cost: { input: 0.001, output: 0.001 }, // Infrastructure cost
        category: 'chat'
      },
      'mistralai/Mistral-7B-Instruct-v0.2': {
        name: 'Mistral 7B',
        cost: { input: 0.0005, output: 0.0005 },
        category: 'chat'
      },
      'microsoft/DialoGPT-large': {
        name: 'DialoGPT',
        cost: { input: 0.0002, output: 0.0002 },
        category: 'chat'
      }
    },
    infrastructureCost: {
      perRequest: 0.001, // $0.001 per API call (bandwidth/compute)
      perToken: 0.00001 // $0.00001 per token (processing)
    }
  },
  
  // Replicate (image, video, 3D generation)
  'replicate': {
    models: {
      'black-forest-labs/flux-schnell': {
        name: 'FLUX Schnell',
        cost: { perImage: 0.003 },
        category: 'image'
      },
      'black-forest-labs/flux-dev': {
        name: 'FLUX Dev',
        cost: { perImage: 0.03 },
        category: 'image'
      },
      'stability-ai/stable-diffusion-3': {
        name: 'Stable Diffusion 3',
        cost: { perImage: 0.035 },
        category: 'image'
      },
      'luma/ray-2-720p': {
        name: 'Luma Ray (Video)',
        cost: { perSecond: 0.30 },
        category: 'video'
      },
      'openai/sora': {
        name: 'Sora (Video)',
        cost: { perSecond: 0.50 },
        category: 'video'
      }
    }
  },
  
  // MoonshotAI (Kimi)
  'moonshotai': {
    models: {
      'kimi-k1': {
        name: 'Kimi K1',
        cost: { input: 0.003, output: 0.009 },
        category: 'chat'
      }
    }
  }
};

// Branded model mappings (what customers see)
const BRANDED_MODELS = {
  'inno-ai-boyong-4.5': { provider: 'openrouter', model: 'anthropic/claude-3-opus' },
  'inno-ai-boyong-4.0': { provider: 'openrouter', model: 'anthropic/claude-3-sonnet' },
  'inno-ai-boyong-mini': { provider: 'openrouter', model: 'anthropic/claude-3-haiku' },
  'inno-ai-gpt-4o': { provider: 'openrouter', model: 'openai/gpt-4o' },
  'inno-ai-gpt-4': { provider: 'openrouter', model: 'openai/gpt-4-turbo' },
  'inno-ai-gemini-pro': { provider: 'openrouter', model: 'google/gemini-1.5-pro' },
  'inno-ai-gemini-flash': { provider: 'openrouter', model: 'google/gemini-1.5-flash' },
  'inno-ai-llama-70b': { provider: 'huggingface', model: 'meta-llama/Llama-2-70b-chat-hf' },
  'inno-ai-mistral': { provider: 'huggingface', model: 'mistralai/Mistral-7B-Instruct-v0.2' },
  'inno-ai-vision-xl': { provider: 'replicate', model: 'black-forest-labs/flux-dev' },
  'inno-ai-image-fast': { provider: 'replicate', model: 'black-forest-labs/flux-schnell' },
  'inno-ai-video-hd': { provider: 'replicate', model: 'luma/ray-2-720p' },
  'inno-ai-whisper': { provider: 'openai', model: 'whisper-1' },
  'inno-ai-tts': { provider: 'openai', model: 'tts-1' },
  'inno-ai-dalle': { provider: 'openai', model: 'dall-e-3' }
};

// Subscription plans
const SUBSCRIPTION_PLANS = {
  'free': {
    name: 'Free',
    description: 'Get started with AI',
    monthlyPrice: 0,
    yearlyPrice: 0,
    currency: 'USD',
    features: [
      'Limited to basic models',
      'Community support',
      'Standard API rate limits'
    ],
    allowances: {
      tokensPerMonth: 10000,
      imagesPerMonth: 10,
      audioMinutesPerMonth: 5,
      videoSecondsPerMonth: 0
    },
    overageRates: {
      tokensPer1K: 0.005, // $0.005 per 1K tokens
      images: 0.05, // $0.05 per image
      audioPerMinute: 0.10,
      videoPerSecond: 0.50
    },
    markupPercent: 100, // 100% markup on overages
    models: ['inno-ai-boyong-mini', 'inno-ai-gemini-flash', 'inno-ai-llama-70b'],
    maxRequestsPerMinute: 10
  },
  
  'starter': {
    name: 'Starter',
    description: 'For developers and small projects',
    monthlyPrice: 9,
    yearlyPrice: 90, // 2 months free
    currency: 'USD',
    features: [
      'All chat models',
      'Image generation',
      'Email support',
      'Usage analytics'
    ],
    allowances: {
      tokensPerMonth: 100000, // 100K tokens
      imagesPerMonth: 100,
      audioMinutesPerMonth: 60,
      videoSecondsPerMonth: 30
    },
    overageRates: {
      tokensPer1K: 0.003,
      images: 0.04,
      audioPerMinute: 0.08,
      videoPerSecond: 0.40
    },
    markupPercent: 50,
    models: 'all', // All models available
    maxRequestsPerMinute: 60
  },
  
  'pro': {
    name: 'Pro',
    description: 'For growing teams',
    monthlyPrice: 29,
    yearlyPrice: 290,
    currency: 'USD',
    features: [
      'All models including premium',
      'Priority support',
      'Advanced analytics',
      'Webhooks',
      'Team collaboration (3 seats)'
    ],
    allowances: {
      tokensPerMonth: 500000, // 500K tokens
      imagesPerMonth: 500,
      audioMinutesPerMonth: 300,
      videoSecondsPerMonth: 180
    },
    overageRates: {
      tokensPer1K: 0.0025,
      images: 0.035,
      audioPerMinute: 0.07,
      videoPerSecond: 0.35
    },
    markupPercent: 40,
    models: 'all',
    maxRequestsPerMinute: 300
  },
  
  'business': {
    name: 'Business',
    description: 'For businesses',
    monthlyPrice: 99,
    yearlyPrice: 990,
    currency: 'USD',
    features: [
      'Everything in Pro',
      'Dedicated support',
      'Custom model fine-tuning',
      'SLA guarantee',
      'Team collaboration (10 seats)',
      'SSO/SAML'
    ],
    allowances: {
      tokensPerMonth: 2000000, // 2M tokens
      imagesPerMonth: 2000,
      audioMinutesPerMonth: 1200,
      videoSecondsPerMonth: 600
    },
    overageRates: {
      tokensPer1K: 0.002,
      images: 0.03,
      audioPerMinute: 0.06,
      videoPerSecond: 0.30
    },
    markupPercent: 30,
    models: 'all',
    maxRequestsPerMinute: 1000
  },
  
  'enterprise': {
    name: 'Enterprise',
    description: 'Custom solutions',
    monthlyPrice: null, // Contact sales
    yearlyPrice: null,
    currency: 'USD',
    features: [
      'Unlimited usage',
      'Custom contracts',
      'Dedicated infrastructure',
      'White-label options',
      'Unlimited team seats',
      '24/7 phone support'
    ],
    allowances: {
      tokensPerMonth: Infinity,
      imagesPerMonth: Infinity,
      audioMinutesPerMonth: Infinity,
      videoSecondsPerMonth: Infinity
    },
    overageRates: {}, // No overages, custom billing
    markupPercent: 20,
    models: 'all',
    maxRequestsPerMinute: 5000
  }
};

// Load or create subscription config
function loadSubscriptionConfig() {
  try {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    
    if (fs.existsSync(SUBSCRIPTION_CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(SUBSCRIPTION_CONFIG_FILE, 'utf8'));
    }
    
    const config = {
      version: '1.0.0',
      defaultCurrency: 'USD',
      providerModels: PROVIDER_MODELS,
      brandedModels: BRANDED_MODELS,
      plans: SUBSCRIPTION_PLANS,
      overageBilling: {
        enabled: true,
        billingCycle: 'monthly', // Bill overages monthly
        autoCharge: false // Require manual payment for overages
      }
    };
    
    fs.writeFileSync(SUBSCRIPTION_CONFIG_FILE, JSON.stringify(config, null, 2));
    return config;
  } catch (e) {
    console.error('[SUBSCRIPTION] Error loading config:', e.message);
    return {
      defaultCurrency: 'USD',
      providerModels: PROVIDER_MODELS,
      brandedModels: BRANDED_MODELS,
      plans: SUBSCRIPTION_PLANS
    };
  }
}

module.exports = {
  loadSubscriptionConfig,
  PROVIDER_MODELS,
  BRANDED_MODELS,
  SUBSCRIPTION_PLANS
};
