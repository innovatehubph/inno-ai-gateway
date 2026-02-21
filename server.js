const express = require('express');
const { exec } = require('child_process');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const axios = require('axios');

// Load environment variables
require('dotenv').config();

// Load OpenAPI spec
let swaggerDocument = null;
try {
  swaggerDocument = YAML.load(path.join(__dirname, 'docs', 'openapi.yaml'));
} catch (e) {
  console.log('OpenAPI spec not found, Swagger UI will be unavailable');
}

const app = express();
const PORT = process.env.PORT || 8095;
const ADMIN_KEY = process.env.ADMIN_KEY || 'inno-admin-2026';
const HF_API_KEY = process.env.HF_API_KEY || '';
const HF_API_TOKEN = process.env.HF_API_TOKEN || HF_API_KEY; // HF_API_TOKEN for chat models
const REPLICATE_API_KEY = process.env.REPLICATE_API_KEY || '';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const MOONSHOT_API_KEY = process.env.MOONSHOT_API_KEY || '';
const MOONSHOT_API_URL = 'https://api.moonshot.cn/v1/chat/completions';

// Antigravity/OpenCode configuration
const ANTIGRAVITY_ENABLED = process.env.ANTIGRAVITY_ENABLED === 'true' || true;
const ANTIGRAVITY_AUTH_PROFILE = process.env.ANTIGRAVITY_AUTH_PROFILE || 'google-antigravity:admin@tmapp.live';
const ANTIGRAVITY_ENDPOINTS = [
  'https://daily-cloudcode-pa.sandbox.googleapis.com',
  'https://cloudcode-pa.googleapis.com'
];
const ANTIGRAVITY_VERSION = process.env.ANTIGRAVITY_VERSION || '1.15.8';

// Replicate client for 3D models
let replicate = null;
if (REPLICATE_API_KEY) {
  const Replicate = require('replicate');
  replicate = new Replicate({ auth: REPLICATE_API_KEY });
}

// Custom branding
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

// HuggingFace model mappings - using faster/serverless models
const HF_MODELS = {
  // Image - using FLUX Schnell (fast) or SD 1.5 as fallback
  image: 'black-forest-labs/FLUX.1-schnell',
  image_alt: 'runwayml/stable-diffusion-v1-5',
  // Audio
  tts: 'facebook/mms-tts-eng',
  stt: 'openai/whisper-large-v3',
  // Embeddings
  embeddings: 'sentence-transformers/all-MiniLM-L6-v2',
  // 3D Models
  text_to_3d: 'openai/shap-e',
  image_to_3d: 'stabilityai/TripoSR',
  text_to_3d_alt: 'openai/point-e',
  image_to_3d_alt: 'sudo-ai/zero123plus-v1.2'
};

// Tiered Image Models (Replicate) - organized by speed and quality
const IMAGE_TIERS = {
  // === FAST TIER (Budget) ===
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
  
  // === STANDARD TIER ===
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
  
  // === QUALITY TIER ===
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
  
  // === ULTRA TIER (Best Quality) ===
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

// Model aliases for convenience
const IMAGE_ALIASES = {
  // Speed aliases
  'fast': 'image-1',
  'turbo': 'image-2',
  'quick': 'ultrafast',
  
  // Standard aliases
  'default': 'image-3',
  'gemini': 'standard',
  'flash': 'standard',
  
  // Quality aliases
  'quality': 'image-4',
  'premium': 'image-5',
  'pro': 'image-5',
  
  // Ultra aliases
  'ultra': 'image-6',
  'best': 'ultrav2',
  'openai': 'ultrav1',
  'gpt': 'ultrav1',
  'imagen': 'ultrav2',
  'imagen4': 'ultrav2',
  
  // Edit aliases
  'edit': 'standard-edit',
  'edit-pro': 'premium-edit',
  'banana': 'standard-edit',
  'banana-pro': 'premium-edit',
  
  // Budget alias
  'cheap': 'image-1',
  'budget': 'image-1'
};

// ==================== 3D MODEL TIERS ====================
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

// ==================== VIDEO MODEL TIERS ====================
const VIDEO_TIERS = {
  // === TEXT TO VIDEO ===
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
  
  // === IMAGE TO VIDEO ===
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
  
  // === VIDEO EDITING ===
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
  // Text to Video
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
  
  // Image to Video
  'i2v': 'video-i2v',
  'img2vid': 'video-i2v',
  'image-to-video': 'video-i2v',
  'i2v-kling': 'video-i2v-kling',
  'kling': 'video-i2v-kling',
  
  // Video Editing
  'edit': 'video-edit',
  'modify': 'video-edit',
  'style': 'video-edit',
  'reframe': 'video-reframe',
  'resize': 'video-reframe',
  'aspect': 'video-reframe',
  
  // Audio
  'audio': 'video-audio',
  'sound': 'video-audio',
  'mmaudio': 'video-audio'
};

// Data storage
const DATA_DIR = path.join(__dirname, 'data');
const ANALYTICS_FILE = path.join(DATA_DIR, 'analytics.json');
const LOGS_FILE = path.join(DATA_DIR, 'logs.json');
const API_KEYS_FILE = path.join(DATA_DIR, 'api-keys.json');

// OAuth/Accounts configuration
const ACCOUNTS_FILE = '/root/.config/opencode/antigravity-accounts.json';
const OAUTH_STATE_TTL = 5 * 60 * 1000; // 5 minutes
const oauthStates = new Map(); // Temporary storage for PKCE states

// Google OAuth Configuration
const GOOGLE_OAUTH = {
  clientId: process.env.GOOGLE_CLIENT_ID || '',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  redirectUri: 'http://localhost:51121/oauth-callback',
  authEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  scopes: [
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/cloud-platform',
    'https://www.googleapis.com/auth/cclog',
    'https://www.googleapis.com/auth/experimentsandconfigs',
    'openid'
  ]
};

// Initialize data files
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function initDataFile(file, defaultData) {
  if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify(defaultData, null, 2));
}

initDataFile(ANALYTICS_FILE, { 
  totalRequests: 0, totalTokens: 0, totalPromptTokens: 0, totalCompletionTokens: 0,
  requestsByModel: {}, requestsByHour: {}, requestsByDay: {}, startTime: Date.now()
});
initDataFile(LOGS_FILE, []);
initDataFile(API_KEYS_FILE, {
  keys: {
    'masipag-ai-gateway-2026': {
      id: 'key_default',
      name: 'Default API Key',
      created: new Date().toISOString(),
      lastUsed: null,
      requests: 0,
      tokens: 0,
      rateLimit: 100, // requests per minute
      monthlyLimit: 1000000, // tokens per month
      enabled: true
    }
  }
});

// Data helpers
function loadJSON(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } 
  catch { return null; }
}

function saveJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// ==================== OAUTH & ACCOUNTS HELPERS ====================

// PKCE Helper functions
function generateCodeVerifier() {
  const verifier = crypto.randomBytes(32).toString('base64url');
  return verifier;
}

function generateCodeChallenge(verifier) {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

function generateState(verifier, projectId = null) {
  // State format: base64url(JSON.stringify({verifier, projectId}))
  const stateObj = {
    verifier: verifier,
    projectId: projectId || 'antigravity-project'
  };
  return Buffer.from(JSON.stringify(stateObj)).toString('base64url');
}

// Load accounts from file
function loadAccounts() {
  try {
    if (!fs.existsSync(ACCOUNTS_FILE)) {
      // Create initial file structure
      const initialData = { version: 1, accounts: {} };
      saveJSON(ACCOUNTS_FILE, initialData);
      return initialData;
    }
    return loadJSON(ACCOUNTS_FILE) || { version: 1, accounts: {} };
  } catch (e) {
    console.error('[ACCOUNTS] Error loading accounts:', e.message);
    return { version: 1, accounts: {} };
  }
}

// Save accounts to file
function saveAccounts(data) {
  try {
    saveJSON(ACCOUNTS_FILE, data);
  } catch (e) {
    console.error('[ACCOUNTS] Error saving accounts:', e.message);
    throw e;
  }
}

// Get account by ID
function getAccountById(accountId) {
  const data = loadAccounts();
  return data.accounts[accountId] || null;
}

// Clean expired OAuth states periodically
setInterval(() => {
  const now = Date.now();
  for (const [state, data] of oauthStates.entries()) {
    if (data.expiresAt < now) {
      oauthStates.delete(state);
    }
  }
}, 60000); // Clean every minute

function loadAnalytics() { return loadJSON(ANALYTICS_FILE) || { totalRequests: 0, totalTokens: 0, totalPromptTokens: 0, totalCompletionTokens: 0, requestsByModel: {}, requestsByHour: {}, requestsByDay: {}, startTime: Date.now() }; }
function saveAnalytics(data) { saveJSON(ANALYTICS_FILE, data); }
function loadLogs() { return loadJSON(LOGS_FILE) || []; }
function saveLogs(logs) { saveJSON(LOGS_FILE, logs.slice(-1000)); }
function loadApiKeys() { return loadJSON(API_KEYS_FILE) || { keys: {} }; }
function saveApiKeys(data) { saveJSON(API_KEYS_FILE, data); }

// Rate limiting
const rateLimitStore = new Map();

function checkRateLimit(apiKey, limit = 100) {
  const now = Date.now();
  const windowMs = 60000; // 1 minute
  const key = `rate_${apiKey}`;
  
  let record = rateLimitStore.get(key) || { count: 0, resetTime: now + windowMs };
  
  if (now > record.resetTime) {
    record = { count: 0, resetTime: now + windowMs };
  }
  
  record.count++;
  rateLimitStore.set(key, record);
  
  return {
    allowed: record.count <= limit,
    remaining: Math.max(0, limit - record.count),
    resetTime: record.resetTime
  };
}

// Log request with full details
function logRequest(data) {
  const logs = loadLogs();
  logs.push({ ...data, timestamp: new Date().toISOString() });
  saveLogs(logs);
  
  const analytics = loadAnalytics();
  analytics.totalRequests++;
  analytics.totalTokens += data.totalTokens || 0;
  analytics.totalPromptTokens += data.promptTokens || 0;
  analytics.totalCompletionTokens += data.completionTokens || 0;
  
  const model = data.model || 'unknown';
  analytics.requestsByModel[model] = (analytics.requestsByModel[model] || 0) + 1;
  
  const hour = new Date().toISOString().slice(0, 13);
  analytics.requestsByHour[hour] = (analytics.requestsByHour[hour] || 0) + 1;
  
  const day = new Date().toISOString().slice(0, 10);
  analytics.requestsByDay[day] = (analytics.requestsByDay[day] || 0) + 1;
  
  saveAnalytics(analytics);
  
  // Update API key stats
  if (data.apiKey) {
    const apiKeys = loadApiKeys();
    if (apiKeys.keys[data.apiKey]) {
      apiKeys.keys[data.apiKey].requests++;
      apiKeys.keys[data.apiKey].tokens += data.totalTokens || 0;
      apiKeys.keys[data.apiKey].lastUsed = new Date().toISOString();
      saveApiKeys(apiKeys);
    }
  }
}

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Swagger UI - API Documentation
if (swaggerDocument) {
  app.use('/swagger', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info { margin: 30px 0 }
      .swagger-ui .info .title { color: #6366f1 }
    `,
    customSiteTitle: 'InnovateHub AI Gateway - API Docs',
    customfavIcon: '/favicon.ico'
  }));
  
  // OpenAPI JSON endpoint
  app.get('/openapi.json', (req, res) => {
    res.json(swaggerDocument);
  });
  
  // OpenAPI YAML endpoint
  app.get('/openapi.yaml', (req, res) => {
    res.setHeader('Content-Type', 'text/yaml');
    res.sendFile(path.join(__dirname, 'docs', 'openapi.yaml'));
  });
}

// VitePress Documentation (built static site)
const docsDistPath = path.join(__dirname, 'docs', '.vitepress', 'dist');
if (fs.existsSync(docsDistPath)) {
  app.use('/docs', express.static(docsDistPath));
  // SPA fallback for VitePress
  app.get('/docs/*', (req, res) => {
    res.sendFile(path.join(docsDistPath, 'index.html'));
  });
}

// OpenClaw CLI runner
function runOpenClaw(args, timeout = 180000) {
  return new Promise((resolve, reject) => {
    exec(`openclaw ${args}`, { timeout, maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err && !stdout) reject(new Error(stderr || err.message));
      else resolve(stdout || stderr);
    });
  });
}

// HuggingFace API caller - using new router endpoint
async function callHuggingFace(model, inputs, options = {}) {
  if (!HF_API_KEY) {
    throw new Error('HuggingFace API key not configured. Set HF_API_KEY environment variable.');
  }

  // Use the new HuggingFace router endpoint
  const response = await fetch(`https://router.huggingface.co/hf-inference/models/${model}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${HF_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ inputs, ...options })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`HuggingFace API error: ${error}`);
  }

  return response;
}

// HuggingFace Chat API - OpenAI-compatible endpoint
async function callHuggingFaceChat(modelId, messages, temperature = 0.7, max_tokens = 4096) {
  if (!HF_API_TOKEN) {
    throw new Error('HuggingFace API token not configured. Set HF_API_TOKEN environment variable.');
  }

  const response = await axios.post(
    'https://router.huggingface.co/v1/chat/completions',
    {
      model: modelId,
      messages: messages,
      temperature: temperature,
      max_tokens: max_tokens
    },
    {
      headers: {
        'Authorization': `Bearer ${HF_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      timeout: 120000
    }
  );

  return response.data;
}

// OpenRouter Chat API - OpenAI-compatible endpoint
async function callOpenRouterChat(modelId, messages, temperature = 0.7, max_tokens = 4096) {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OpenRouter API key not configured. Set OPENROUTER_API_KEY environment variable.');
  }

  const response = await axios.post(
    'https://openrouter.ai/api/v1/chat/completions',
    {
      model: modelId,
      messages: messages,
      temperature: temperature,
      max_tokens: max_tokens
    },
    {
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://ai-gateway.innoserver.cloud',
        'X-Title': 'InnovateHub AI Gateway'
      },
      timeout: 120000
    }
  );

  return response.data;
}

// Fetch OpenRouter models
async function fetchOpenRouterModels() {
  if (!OPENROUTER_API_KEY) return [];

  try {
    const response = await axios.get('https://openrouter.ai/api/v1/models', {
      headers: { 'Authorization': `Bearer ${OPENROUTER_API_KEY}` },
      timeout: 10000
    });
    return response.data.data || [];
  } catch (e) {
    console.error('Failed to fetch OpenRouter models:', e.message);
    return [];
  }
}

// MoonshotAI (Kimi) Chat API
async function callMoonshotChat(modelId, messages, temperature = 0.7, max_tokens = 4096) {
  if (!MOONSHOT_API_KEY) {
    throw new Error('Moonshot API key not configured. Set MOONSHOT_API_KEY environment variable.');
  }

  const response = await axios.post(
    MOONSHOT_API_URL,
    {
      model: modelId,
      messages: messages,
      temperature: temperature,
      max_tokens: max_tokens
    },
    {
      headers: {
        'Authorization': `Bearer ${MOONSHOT_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 120000
    }
  );

  return response.data;
}

// Antigravity/OpenCode API - Uses OAuth credentials from OpenCode config

// Auto-refresh token if needed
async function refreshAntigravityToken(account, authPath) {
  try {
    if (!account.refreshToken) {
      console.log('[ANTIGRAVITY] No refresh token available');
      return null;
    }
    
    console.log(`[ANTIGRAVITY] Auto-refreshing token for ${account.email}...`);
    
    const refreshResponse = await axios.post(
      GOOGLE_OAUTH.tokenEndpoint,
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: account.refreshToken,
        client_id: GOOGLE_OAUTH.clientId,
        client_secret: GOOGLE_OAUTH.clientSecret
      }).toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );
    
    const { access_token, expires_in } = refreshResponse.data;
    const expiresAt = Date.now() + (expires_in * 1000);
    
    // Update account
    account.accessToken = access_token;
    account.expiresAt = expiresAt;
    account.status = 'connected';
    account.lastRefreshed = new Date().toISOString();
    
    // Save back to file
    const data = JSON.parse(fs.readFileSync(authPath, 'utf8'));
    if (data.accounts) {
      // Find and update the account
      for (const [accId, acc] of Object.entries(data.accounts)) {
        if (acc.email === account.email) {
          data.accounts[accId] = account;
          break;
        }
      }
    } else if (Array.isArray(data)) {
      // Array format
      const idx = data.findIndex(a => a.email === account.email);
      if (idx >= 0) data[idx] = account;
    }
    
    fs.writeFileSync(authPath, JSON.stringify(data, null, 2));
    console.log(`[ANTIGRAVITY] Token auto-refreshed successfully, expires at ${new Date(expiresAt).toISOString()}`);
    
    return {
      accessToken: access_token,
      refreshToken: account.refreshToken,
      projectId: account.projectId,
      email: account.email,
      expires: expiresAt
    };
  } catch (e) {
    console.error('[ANTIGRAVITY] Auto-refresh failed:', e.message);
    if (e.response) {
      console.error('[ANTIGRAVITY] Response:', e.response.data);
    }
    return null;
  }
}

async function loadAntigravityCredentials() {
  try {
    const authPath = '/root/.config/opencode/antigravity-accounts.json';
    if (!fs.existsSync(authPath)) {
      console.log('[ANTIGRAVITY] OpenCode config not found at:', authPath);
      return null;
    }

    const data = JSON.parse(fs.readFileSync(authPath, 'utf8'));
    
    // Handle both array format (from auth-server) and object format
    let account = null;
    
    if (Array.isArray(data) && data.length > 0) {
      // Array format from auth-server - get first enabled account
      account = data.find(a => a.enabled !== false) || data[0];
    } else if (data.accounts && typeof data.accounts === 'object') {
      // Object format with accounts property
      const accountId = Object.keys(data.accounts)[0];
      if (accountId) {
        account = data.accounts[accountId];
      }
    }

    if (!account) {
      console.log('[ANTIGRAVITY] No accounts configured in OpenCode config');
      return null;
    }

    // Check if token is expired or expiring within 5 minutes
    const fiveMinutes = 5 * 60 * 1000;
    const isExpiringSoon = account.expiresAt && (account.expiresAt - Date.now()) < fiveMinutes;
    const isExpired = account.expiresAt && account.expiresAt < Date.now();
    
    if (isExpired) {
      console.log('[ANTIGRAVITY] Token expired, auto-refreshing...');
      return await refreshAntigravityToken(account, authPath);
    }
    
    if (isExpiringSoon) {
      console.log('[ANTIGRAVITY] Token expiring soon, auto-refreshing in background...');
      // Refresh in background but return current token for immediate use
      refreshAntigravityToken(account, authPath).catch(e => 
        console.error('[ANTIGRAVITY] Background refresh failed:', e.message)
      );
    }

    return {
      accessToken: account.accessToken,
      refreshToken: account.refreshToken,
      projectId: account.projectId,
      email: account.email,
      expires: account.expiresAt
    };
  } catch (e) {
    console.error('[ANTIGRAVITY] Error loading credentials:', e.message);
    return null;
  }
}

async function callAntigravityChat(modelId, messages, temperature = 0.7, max_tokens = 4096) {
  const creds = await loadAntigravityCredentials();
  if (!creds) {
    throw new Error('Antigravity credentials not found. Please authenticate with openclaw or check AUTH_PROFILES_PATH.');
  }
  
  // Convert messages to Antigravity format
  const contents = [];
  let systemInstruction = null;
  
  for (const msg of messages) {
    if (msg.role === 'system') {
      systemInstruction = msg.content;
    } else {
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      });
    }
  }
  
  // Build request
  const requestBody = {
    project: creds.projectId,
    model: modelId,
    request: {
      contents: contents,
      generationConfig: {
        temperature: temperature,
        maxOutputTokens: max_tokens
      }
    },
    requestType: 'agent',
    userAgent: 'antigravity',
    requestId: `agent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  };
  
  if (systemInstruction) {
    requestBody.request.systemInstruction = {
      role: 'user',
      parts: [{ text: systemInstruction }]
    };
  }
  
  // Try both endpoints
  let lastError = null;
  for (const endpoint of ANTIGRAVITY_ENDPOINTS) {
    try {
      const response = await axios.post(
        `${endpoint}/v1internal:streamGenerateContent?alt=sse`,
        requestBody,
        {
          headers: {
            'Authorization': `Bearer ${creds.accessToken}`,
            'Content-Type': 'application/json',
            'User-Agent': `antigravity/${ANTIGRAVITY_VERSION} darwin/arm64`,
            'X-Goog-Api-Client': 'google-cloud-sdk vscode_cloudshelleditor/0.1',
            'Accept': 'text/event-stream'
          },
          timeout: 120000,
          responseType: 'text'
        }
      );
      
      // Parse SSE response
      const lines = response.data.split('\n');
      let fullText = '';
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (data && data !== '[DONE]') {
            try {
              const parsed = JSON.parse(data);
              const responseData = parsed.response || parsed;
              const candidates = responseData.candidates || [];
              if (candidates.length > 0) {
                const parts = candidates[0].content?.parts || [];
                for (const part of parts) {
                  if (part.text) {
                    fullText += part.text;
                  }
                }
              }
            } catch (e) {
              // Ignore parse errors for individual lines
            }
          }
        }
      }
      
      return {
        choices: [{
          message: {
            role: 'assistant',
            content: fullText
          },
          finish_reason: 'stop'
        }],
        usage: {
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0
        }
      };
      
    } catch (e) {
      lastError = e;
      console.log(`[ANTIGRAVITY] Endpoint ${endpoint} failed:`, e.message);
      continue;
    }
  }
  
  throw new Error(`All Antigravity endpoints failed. Last error: ${lastError?.message}`);
}

// API key authentication
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  const apiKey = req.headers['x-api-key'] || (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null);
  
  if (!apiKey) {
    return res.status(401).json({ error: 'Unauthorized', message: 'API key required' });
  }
  
  const apiKeys = loadApiKeys();
  const keyData = apiKeys.keys[apiKey];
  
  if (!keyData || !keyData.enabled) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Invalid or disabled API key' });
  }
  
  // Check rate limit
  const rateCheck = checkRateLimit(apiKey, keyData.rateLimit || 100);
  res.set('X-RateLimit-Limit', keyData.rateLimit || 100);
  res.set('X-RateLimit-Remaining', rateCheck.remaining);
  res.set('X-RateLimit-Reset', Math.ceil(rateCheck.resetTime / 1000));
  
  if (!rateCheck.allowed) {
    return res.status(429).json({ error: 'Too Many Requests', message: 'Rate limit exceeded' });
  }
  
  req.apiKey = apiKey;
  req.apiKeyData = keyData;
  next();
}

// Admin authentication
function adminAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const adminKey = req.headers['x-admin-key'] || (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null);
  
  if (adminKey === ADMIN_KEY) return next();
  res.status(401).json({ error: 'Unauthorized', message: 'Invalid admin key' });
}

// ==================== PUBLIC ENDPOINTS ====================

// Health check
app.get('/health', (req, res) => {
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

function formatUptime(ms) {
  const s = Math.floor(ms / 1000), m = Math.floor(s / 60), h = Math.floor(m / 60), d = Math.floor(h / 24);
  if (d > 0) return `${d}d ${h % 24}h`;
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

// OpenAPI Documentation
app.get('/docs', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'docs.html'));
});

app.get('/openapi.json', (req, res) => {
  res.json({
    openapi: '3.0.0',
    info: {
      title: 'InnovateHub AI Gateway',
      version: '3.0.0',
      description: 'OpenAI-compatible multimodal AI API powered by InnovateHub Philippines'
    },
    servers: [{ url: 'https://ai-gateway.innoserver.cloud' }],
    paths: {
      '/v1/chat/completions': {
        post: {
          summary: 'Create chat completion',
          security: [{ ApiKeyAuth: [] }],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['messages'],
                  properties: {
                    model: { type: 'string', default: 'inno-ai-boyong-4.5' },
                    messages: { type: 'array', items: { type: 'object', properties: { role: { type: 'string' }, content: { type: 'string' } } } },
                    stream: { type: 'boolean', default: false },
                    max_tokens: { type: 'integer' },
                    temperature: { type: 'number' }
                  }
                }
              }
            }
          },
          responses: { '200': { description: 'Chat completion response' } }
        }
      },
      '/v1/images/generations': {
        post: {
          summary: 'Generate images',
          security: [{ ApiKeyAuth: [] }],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['prompt'],
                  properties: {
                    prompt: { type: 'string' },
                    n: { type: 'integer', default: 1 },
                    size: { type: 'string', default: '1024x1024' }
                  }
                }
              }
            }
          },
          responses: { '200': { description: 'Image generation response' } }
        }
      },
      '/v1/audio/speech': {
        post: {
          summary: 'Text to speech',
          security: [{ ApiKeyAuth: [] }],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['input'],
                  properties: {
                    input: { type: 'string' },
                    voice: { type: 'string', default: 'alloy' }
                  }
                }
              }
            }
          },
          responses: { '200': { description: 'Audio file' } }
        }
      },
      '/v1/embeddings': {
        post: {
          summary: 'Create embeddings',
          security: [{ ApiKeyAuth: [] }],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['input'],
                  properties: {
                    input: { type: 'string' },
                    model: { type: 'string', default: 'inno-ai-embed-1' }
                  }
                }
              }
            }
          },
          responses: { '200': { description: 'Embeddings response' } }
        }
      },
      '/v1/usage': {
        get: {
          summary: 'Get API key usage',
          security: [{ ApiKeyAuth: [] }],
          responses: { '200': { description: 'Usage statistics' } }
        }
      },
      '/v1/models': {
        get: {
          summary: 'List available models',
          security: [{ ApiKeyAuth: [] }],
          responses: { '200': { description: 'List of models' } }
        }
      },
      '/v1/3d/generations': {
        post: {
          summary: 'Generate 3D model from text',
          security: [{ ApiKeyAuth: [] }],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['prompt'],
                  properties: {
                    prompt: { type: 'string', description: 'Text description of 3D object' },
                    format: { type: 'string', default: 'glb', description: 'Output format (glb, ply)' }
                  }
                }
              }
            }
          },
          responses: { '200': { description: '3D model file URL' } }
        }
      },
      '/v1/3d/image-to-3d': {
        post: {
          summary: 'Convert 2D image to 3D model',
          security: [{ ApiKeyAuth: [] }],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['image'],
                  properties: {
                    image: { type: 'string', description: 'Base64 encoded image or URL' },
                    format: { type: 'string', default: 'glb', description: 'Output format' }
                  }
                }
              }
            }
          },
          responses: { '200': { description: '3D model file URL' } }
        }
      }
    },
    components: {
      securitySchemes: {
        ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'Authorization', description: 'Bearer <API_KEY>' }
      }
    }
  });
});

// ==================== CHAT ENDPOINTS ====================

// Chat completions (with streaming support)
app.post('/v1/chat/completions', authenticate, async (req, res) => {
  const { messages, model, stream = false, temperature, max_tokens } = req.body;
  const startTime = Date.now();
  const requestId = uuidv4();

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array required' });
  }

  const requestedModel = model || 'inno-ai-boyong-4.5';

  // --- Hugging Face Models (hf- prefix) ---
  if (requestedModel.startsWith('hf-')) {
    const hfModelId = requestedModel.substring(3); // Remove 'hf-' prefix

    try {
      console.log(`[HF] Request: ${hfModelId}, messages: ${messages.length}`);
      const hfResponse = await callHuggingFaceChat(
        hfModelId,
        messages,
        temperature || 0.7,
        max_tokens || 4096
      );

      const latency = Date.now() - startTime;
      const responseText = hfResponse.choices?.[0]?.message?.content || '';
      const usage = hfResponse.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

      logRequest({
        id: requestId, model: requestedModel, source: 'api', apiKey: req.apiKey,
        promptPreview: messages[messages.length - 1]?.content?.substring(0, 100) || '',
        responsePreview: responseText.substring(0, 100),
        promptTokens: usage.prompt_tokens, completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens, latency, status: 'success'
      });

      console.log(`[HF] Response: ${responseText.substring(0, 100)}... (${latency}ms)`);

      return res.json({
        id: `chatcmpl-${requestId}`,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: requestedModel,
        choices: [{
          index: 0,
          message: { role: 'assistant', content: responseText.trim() },
          finish_reason: 'stop'
        }],
        usage
      });

    } catch (e) {
      console.error('[HF] Error:', e.message);
      logRequest({
        id: requestId, model: requestedModel, source: 'api', apiKey: req.apiKey,
        promptPreview: messages[messages.length - 1]?.content?.substring(0, 100) || '',
        error: e.message, latency: Date.now() - startTime, status: 'error'
      });
      return res.status(500).json({ error: 'HuggingFace API error', message: e.message });
    }
  }

  // --- OpenRouter Models (or- prefix) ---
  if (requestedModel.startsWith('or-')) {
    const orModelId = requestedModel.substring(3); // Remove 'or-' prefix

    try {
      console.log(`[OR] Request: ${orModelId}, messages: ${messages.length}`);
      const orResponse = await callOpenRouterChat(
        orModelId,
        messages,
        temperature || 0.7,
        max_tokens || 4096
      );

      const latency = Date.now() - startTime;
      const responseText = orResponse.choices?.[0]?.message?.content || '';
      const usage = orResponse.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

      logRequest({
        id: requestId, model: requestedModel, source: 'api', apiKey: req.apiKey,
        promptPreview: messages[messages.length - 1]?.content?.substring(0, 100) || '',
        responsePreview: responseText.substring(0, 100),
        promptTokens: usage.prompt_tokens, completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens, latency, status: 'success'
      });

      console.log(`[OR] Response: ${responseText.substring(0, 100)}... (${latency}ms)`);

      return res.json({
        id: `chatcmpl-${requestId}`,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: requestedModel,
        choices: [{
          index: 0,
          message: { role: 'assistant', content: responseText.trim() },
          finish_reason: 'stop'
        }],
        usage
      });

    } catch (e) {
      console.error('[OR] Error:', e.message);
      logRequest({
        id: requestId, model: requestedModel, source: 'api', apiKey: req.apiKey,
        promptPreview: messages[messages.length - 1]?.content?.substring(0, 100) || '',
        error: e.message, latency: Date.now() - startTime, status: 'error'
      });
      return res.status(500).json({ error: 'OpenRouter API error', message: e.message });
    }
  }

  // --- MoonshotAI/Kimi Models (kimi- prefix) ---
  if (requestedModel.startsWith('kimi-')) {
    const kimiModelId = requestedModel; // Keep full ID like 'kimi-k2.5'

    try {
      console.log(`[KIMI] Request: ${kimiModelId}, messages: ${messages.length}`);
      const kimiResponse = await callMoonshotChat(
        kimiModelId,
        messages,
        temperature || 0.7,
        max_tokens || 4096
      );

      const latency = Date.now() - startTime;
      const responseText = kimiResponse.choices?.[0]?.message?.content || '';
      const usage = kimiResponse.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

      logRequest({
        id: requestId, model: requestedModel, source: 'api', apiKey: req.apiKey,
        promptPreview: messages[messages.length - 1]?.content?.substring(0, 100) || '',
        responsePreview: responseText.substring(0, 100),
        promptTokens: usage.prompt_tokens, completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens, latency, status: 'success'
      });

      console.log(`[KIMI] Response: ${responseText.substring(0, 100)}... (${latency}ms)`);

      return res.json({
        id: `chatcmpl-${requestId}`,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: requestedModel,
        choices: [{
          index: 0,
          message: { role: 'assistant', content: responseText.trim() },
          finish_reason: 'stop'
        }],
        usage
      });

    } catch (e) {
      console.error('[KIMI] Error:', e.message);
      logRequest({
        id: requestId, model: requestedModel, source: 'api', apiKey: req.apiKey,
        promptPreview: messages[messages.length - 1]?.content?.substring(0, 100) || '',
        error: e.message, latency: Date.now() - startTime, status: 'error'
      });
      return res.status(500).json({ error: 'MoonshotAI API error', message: e.message });
    }
  }

  // --- Antigravity/OpenCode Models (antigravity- prefix) ---
  if (requestedModel.startsWith('antigravity-')) {
    const antigravityModelId = requestedModel.substring(12); // Remove 'antigravity-' prefix
    
    try {
      console.log(`[ANTIGRAVITY] Request: ${antigravityModelId}, messages: ${messages.length}`);
      const antigravityResponse = await callAntigravityChat(
        antigravityModelId,
        messages,
        temperature || 0.7,
        max_tokens || 4096
      );
      
      const latency = Date.now() - startTime;
      const responseText = antigravityResponse.choices?.[0]?.message?.content || '';
      const usage = antigravityResponse.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
      
      logRequest({
        id: requestId, model: requestedModel, source: 'api', apiKey: req.apiKey,
        promptPreview: messages[messages.length - 1]?.content?.substring(0, 100) || '',
        responsePreview: responseText.substring(0, 100),
        promptTokens: usage.prompt_tokens, completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens, latency, status: 'success'
      });
      
      console.log(`[ANTIGRAVITY] Response: ${responseText.substring(0, 100)}... (${latency}ms)`);
      
      return res.json({
        id: `chatcmpl-${requestId}`,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: requestedModel,
        choices: [{
          index: 0,
          message: { role: 'assistant', content: responseText.trim() },
          finish_reason: 'stop'
        }],
        usage
      });
      
    } catch (e) {
      console.error('[ANTIGRAVITY] Error:', e.message);
      logRequest({
        id: requestId, model: requestedModel, source: 'api', apiKey: req.apiKey,
        promptPreview: messages[messages.length - 1]?.content?.substring(0, 100) || '',
        error: e.message, latency: Date.now() - startTime, status: 'error'
      });
      return res.status(500).json({ error: 'Antigravity API error', message: e.message });
    }
  }

  // --- Default: OpenClaw/Claude ---
  const lastUserMessage = messages.filter(m => m.role === 'user').pop();
  const prompt = lastUserMessage?.content || '';
  const brandedModel = MODEL_BRANDING[requestedModel] || 'inno-ai-boyong-4.5';

  // Handle streaming
  if (stream) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      const escapedPrompt = prompt.replace(/'/g, "'\\''");
      const cmd = `agent --session-id api-${requestId.substring(0,8)} --message '${escapedPrompt}' --json`;
      const output = await runOpenClaw(cmd, 180000);

      let responseText = '';
      let usage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

      try {
        const jsonResponse = JSON.parse(output);
        responseText = jsonResponse.result?.payloads?.[0]?.text || output;
        if (jsonResponse.result?.meta?.agentMeta?.usage) {
          const u = jsonResponse.result.meta.agentMeta.usage;
          usage = { prompt_tokens: u.input || 0, completion_tokens: u.output || 0, total_tokens: u.total || 0 };
        }
      } catch { responseText = output; }

      // Simulate streaming by sending chunks
      const words = responseText.split(' ');
      for (let i = 0; i < words.length; i++) {
        const chunk = {
          id: `chatcmpl-${requestId}`,
          object: 'chat.completion.chunk',
          created: Math.floor(Date.now() / 1000),
          model: brandedModel,
          choices: [{
            index: 0,
            delta: { content: words[i] + (i < words.length - 1 ? ' ' : '') },
            finish_reason: i === words.length - 1 ? 'stop' : null
          }]
        };
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      }

      res.write('data: [DONE]\n\n');
      res.end();

      logRequest({
        id: requestId, model: brandedModel, source: 'api', apiKey: req.apiKey,
        promptPreview: prompt.substring(0, 100), responsePreview: responseText.substring(0, 100),
        promptTokens: usage.prompt_tokens, completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens, latency: Date.now() - startTime, status: 'success',
        fullPrompt: prompt, fullResponse: responseText
      });

    } catch (e) {
      res.write(`data: ${JSON.stringify({ error: e.message })}\n\n`);
      res.end();
    }
    return;
  }

  // Non-streaming response
  try {
    const escapedPrompt = prompt.replace(/'/g, "'\\''");
    const cmd = `agent --session-id api-${requestId.substring(0,8)} --message '${escapedPrompt}' --json`;

    console.log(`[API] Request: ${prompt.substring(0, 100)}...`);
    const output = await runOpenClaw(cmd, 180000);

    let responseText = '';
    let usage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

    try {
      const jsonResponse = JSON.parse(output);
      responseText = jsonResponse.result?.payloads?.[0]?.text || jsonResponse.reply || output;
      if (jsonResponse.result?.meta?.agentMeta?.usage) {
        const u = jsonResponse.result.meta.agentMeta.usage;
        usage = { prompt_tokens: u.input || 0, completion_tokens: u.output || 0, total_tokens: u.total || 0 };
      }
    } catch { responseText = output; }

    const latency = Date.now() - startTime;

    logRequest({
      id: requestId, model: brandedModel, source: 'api', apiKey: req.apiKey,
      promptPreview: prompt.substring(0, 100), responsePreview: responseText.substring(0, 100),
      promptTokens: usage.prompt_tokens, completionTokens: usage.completion_tokens,
      totalTokens: usage.total_tokens, latency, status: 'success',
      fullPrompt: prompt, fullResponse: responseText
    });

    console.log(`[API] Response: ${responseText.substring(0, 100)}... (${latency}ms)`);

    res.json({
      id: `chatcmpl-${requestId}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: brandedModel,
      choices: [{ index: 0, message: { role: 'assistant', content: responseText.trim() }, finish_reason: 'stop' }],
      usage
    });

  } catch (e) {
    logRequest({
      id: requestId, model: brandedModel, source: 'api', apiKey: req.apiKey,
      promptPreview: prompt.substring(0, 100), error: e.message,
      latency: Date.now() - startTime, status: 'error'
    });
    res.status(500).json({ error: 'Gateway error', message: e.message });
  }
});

// ==================== MULTIMODAL ENDPOINTS ====================

// Image Generation
app.post('/v1/images/generations', authenticate, async (req, res) => {
  const { prompt, n = 1, size = '1024x1024', response_format = 'url', model = 'image-3' } = req.body;
  const startTime = Date.now();
  const requestId = uuidv4();
  
  if (!prompt) {
    return res.status(400).json({ error: 'prompt is required' });
  }

  // Resolve model tier
  let tierKey = model.toLowerCase();
  if (IMAGE_ALIASES[tierKey]) tierKey = IMAGE_ALIASES[tierKey];
  
  const tier = IMAGE_TIERS[tierKey];
  const useReplicate = tier && replicate;
  
  console.log(`[IMG] Generating image: ${prompt.substring(0, 50)}... (model: ${tierKey})`);

  // If Replicate is configured and tier selected, use tiered models
  if (useReplicate) {
    try {
      console.log(`[IMG] Using Replicate: ${tier.model} (${tier.name})`);
      
      // Parse size
      const [width, height] = size.split('x').map(Number);
      
      const output = await replicate.run(tier.model, {
        input: {
          prompt: prompt,
          width: width || 1024,
          height: height || 1024,
          num_outputs: n
        }
      });
      
      const latency = Date.now() - startTime;
      console.log(`[IMG] Success with ${tier.model} in ${latency}ms`);
      
      // Output can be array of URLs or single URL
      let imageUrls = Array.isArray(output) ? output : [output];
      
      // Download and save images locally
      const results = [];
      for (let i = 0; i < imageUrls.length; i++) {
        const imageUrl = imageUrls[i];
        const imageResponse = await fetch(imageUrl);
        const imageBuffer = await imageResponse.arrayBuffer();
        
        if (response_format === 'b64_json') {
          results.push({ b64_json: Buffer.from(imageBuffer).toString('base64') });
        } else {
          const imagePath = path.join(DATA_DIR, `image_${requestId}_${i}.png`);
          fs.writeFileSync(imagePath, Buffer.from(imageBuffer));
          results.push({ 
            url: `/data/image_${requestId}_${i}.png`,
            external_url: imageUrl
          });
        }
      }
      
      logRequest({
        id: requestId, model: `inno-ai-${tierKey}`, source: 'api', apiKey: req.apiKey,
        promptPreview: prompt.substring(0, 100), type: 'image_generation',
        tier: tier.name, latency, status: 'success'
      });
      
      return res.json({
        created: Math.floor(Date.now() / 1000),
        model: tierKey,
        tier: tier.name,
        data: results
      });
      
    } catch (e) {
      console.log(`[IMG] Replicate ${tier.model} failed: ${e.message}`);
      // Fall through to HuggingFace fallback
    }
  }

  // Fallback to HuggingFace (free)
  const models = [HF_MODELS.image, HF_MODELS.image_alt];
  let lastError = null;
  
  for (const hfModel of models) {
    try {
      console.log(`[IMG] Fallback to HuggingFace: ${hfModel}`);
      const hfResponse = await callHuggingFace(hfModel, prompt);
      const imageBuffer = await hfResponse.arrayBuffer();
      
      // Check if we got a valid image (not an error JSON)
      if (imageBuffer.byteLength < 1000) {
        const text = new TextDecoder().decode(imageBuffer);
        if (text.includes('error') || text.includes('loading')) {
          console.log(`[IMG] Model ${hfModel} not ready: ${text.substring(0, 100)}`);
          lastError = text;
          continue;
        }
      }
      
      const latency = Date.now() - startTime;
      
      logRequest({
        id: requestId, model: 'inno-ai-image-free', source: 'api', apiKey: req.apiKey,
        promptPreview: prompt.substring(0, 100), type: 'image_generation',
        latency, status: 'success'
      });
      
      console.log(`[IMG] Success with HuggingFace ${hfModel} in ${latency}ms`);
      
      if (response_format === 'b64_json') {
        const base64Image = Buffer.from(imageBuffer).toString('base64');
        return res.json({
          created: Math.floor(Date.now() / 1000),
          model: 'image-free',
          data: [{ b64_json: base64Image }]
        });
      } else {
        const imagePath = path.join(DATA_DIR, `image_${requestId}.png`);
        fs.writeFileSync(imagePath, Buffer.from(imageBuffer));
        
        return res.json({
          created: Math.floor(Date.now() / 1000),
          model: 'image-free',
          data: [{ url: `/data/image_${requestId}.png` }]
        });
      }
      
    } catch (e) {
      console.log(`[IMG] Model ${hfModel} failed: ${e.message}`);
      lastError = e.message;
      continue;
    }
  }
  
  // All models failed
  logRequest({
    id: requestId, model: 'inno-ai-image', source: 'api', apiKey: req.apiKey,
    promptPreview: prompt?.substring(0, 100), error: lastError,
    latency: Date.now() - startTime, status: 'error', type: 'image_generation'
  });
  res.status(500).json({ error: 'Image generation failed', message: lastError });
});

// List available image tiers
app.get('/v1/images/models', (req, res) => {
  const models = Object.entries(IMAGE_TIERS).map(([key, tier]) => ({
    id: key,
    name: tier.name,
    description: tier.description,
    speed: tier.speed,
    cost: tier.cost,
    quality: tier.quality,
    replicate_model: tier.model
  }));
  
  res.json({
    object: 'list',
    data: models,
    aliases: IMAGE_ALIASES,
    default: 'image-3',
    replicate_configured: !!replicate
  });
});

// Text to Speech
app.post('/v1/audio/speech', authenticate, async (req, res) => {
  const { input, model = 'inno-ai-voice-1', voice = 'alloy', response_format = 'mp3' } = req.body;
  const startTime = Date.now();
  const requestId = uuidv4();
  
  if (!input) {
    return res.status(400).json({ error: 'input text is required' });
  }

  try {
    const hfResponse = await callHuggingFace(HF_MODELS.tts, input);
    const audioBuffer = await hfResponse.arrayBuffer();
    
    logRequest({
      id: requestId, model: 'inno-ai-voice-1', source: 'api', apiKey: req.apiKey,
      promptPreview: input.substring(0, 100), type: 'text_to_speech',
      latency: Date.now() - startTime, status: 'success'
    });
    
    res.set('Content-Type', 'audio/mpeg');
    res.send(Buffer.from(audioBuffer));
    
  } catch (e) {
    logRequest({
      id: requestId, model: 'inno-ai-voice-1', source: 'api', apiKey: req.apiKey,
      promptPreview: input?.substring(0, 100), error: e.message,
      latency: Date.now() - startTime, status: 'error', type: 'text_to_speech'
    });
    res.status(500).json({ error: 'Text to speech failed', message: e.message });
  }
});

// Speech to Text
app.post('/v1/audio/transcriptions', authenticate, async (req, res) => {
  const startTime = Date.now();
  const requestId = uuidv4();
  
  // Handle multipart form data or base64 audio
  const audioData = req.body.file || req.body.audio;
  
  if (!audioData) {
    return res.status(400).json({ error: 'audio file is required' });
  }

  try {
    const audioBuffer = Buffer.isBuffer(audioData) ? audioData : Buffer.from(audioData, 'base64');
    
    const hfResponse = await fetch(`https://router.huggingface.co/hf-inference/models/${HF_MODELS.stt}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${HF_API_KEY}` },
      body: audioBuffer
    });
    
    const result = await hfResponse.json();
    
    logRequest({
      id: requestId, model: 'inno-ai-whisper-1', source: 'api', apiKey: req.apiKey,
      type: 'speech_to_text', latency: Date.now() - startTime, status: 'success'
    });
    
    res.json({ text: result.text || '' });
    
  } catch (e) {
    logRequest({
      id: requestId, model: 'inno-ai-whisper-1', source: 'api', apiKey: req.apiKey,
      error: e.message, latency: Date.now() - startTime, status: 'error', type: 'speech_to_text'
    });
    res.status(500).json({ error: 'Transcription failed', message: e.message });
  }
});

// Embeddings
app.post('/v1/embeddings', authenticate, async (req, res) => {
  const { input, model = 'inno-ai-embed-1' } = req.body;
  const startTime = Date.now();
  const requestId = uuidv4();
  
  if (!input) {
    return res.status(400).json({ error: 'input is required' });
  }

  try {
    const hfResponse = await callHuggingFace(HF_MODELS.embeddings, input, {
      options: { wait_for_model: true }
    });
    
    const embeddings = await hfResponse.json();
    
    logRequest({
      id: requestId, model: 'inno-ai-embed-1', source: 'api', apiKey: req.apiKey,
      promptPreview: (Array.isArray(input) ? input[0] : input).substring(0, 100),
      type: 'embeddings', latency: Date.now() - startTime, status: 'success'
    });
    
    // Format like OpenAI response
    const data = Array.isArray(embeddings) 
      ? embeddings.map((emb, i) => ({ object: 'embedding', embedding: emb, index: i }))
      : [{ object: 'embedding', embedding: embeddings, index: 0 }];
    
    res.json({
      object: 'list',
      data,
      model: 'inno-ai-embed-1',
      usage: { prompt_tokens: input.length, total_tokens: input.length }
    });
    
  } catch (e) {
    logRequest({
      id: requestId, model: 'inno-ai-embed-1', source: 'api', apiKey: req.apiKey,
      error: e.message, latency: Date.now() - startTime, status: 'error', type: 'embeddings'
    });
    res.status(500).json({ error: 'Embedding generation failed', message: e.message });
  }
});

// ==================== 3D GENERATION ENDPOINTS ====================

// Text to 3D (with tiered models)
app.post('/v1/3d/generations', authenticate, async (req, res) => {
  const { prompt, model = '3d-2', format = 'glb' } = req.body;
  const startTime = Date.now();
  const requestId = uuidv4();
  
  if (!prompt) {
    return res.status(400).json({ error: 'prompt is required' });
  }

  // Check if Replicate is configured
  if (!replicate) {
    return res.status(503).json({ 
      error: '3D generation not configured',
      message: 'REPLICATE_API_KEY is required for 3D generation. Get one at replicate.com',
      setup: 'Add REPLICATE_API_KEY to .env file'
    });
  }

  // Resolve model tier
  let tierKey = model.toLowerCase();
  if (MODEL_3D_ALIASES[tierKey]) tierKey = MODEL_3D_ALIASES[tierKey];
  
  const tier = MODEL_3D_TIERS[tierKey] || MODEL_3D_TIERS['3d-2'];

  try {
    console.log(`[3D] Generating with ${tier.model.split(':')[0]}: ${prompt.substring(0, 50)}...`);
    
    // Build input based on model
    let input = { prompt };
    
    // Hunyuan-specific params
    if (tier.model.includes('hunyuan')) {
      input.generate_type = "Normal";
      input.enable_pbr = true;
      input.face_count = 100000;
    }
    
    const output = await replicate.run(tier.model, { input });
    
    const latency = Date.now() - startTime;
    console.log(`[3D] Generated in ${latency}ms`);
    
    // Output is a URL to the 3D file
    let modelUrl = output;
    if (Array.isArray(output)) modelUrl = output[0];
    if (typeof output === 'object' && output.mesh) modelUrl = output.mesh;
    if (typeof output === 'object' && output.glb) modelUrl = output.glb;
    
    // Download and save locally
    const modelResponse = await fetch(modelUrl);
    const modelData = await modelResponse.arrayBuffer();
    const ext = modelUrl.includes('.obj') ? 'obj' : modelUrl.includes('.ply') ? 'ply' : 'glb';
    const modelPath = path.join(DATA_DIR, `model_${requestId}.${ext}`);
    fs.writeFileSync(modelPath, Buffer.from(modelData));
    
    logRequest({
      id: requestId, model: `inno-ai-${tierKey}`, source: 'api', apiKey: req.apiKey,
      promptPreview: prompt.substring(0, 100), type: '3d_generation',
      tier: tier.name, latency, status: 'success'
    });
    
    res.json({
      created: Math.floor(Date.now() / 1000),
      model: tierKey,
      tier: tier.name,
      data: [{ 
        url: `/data/model_${requestId}.${ext}`, 
        format: ext,
        external_url: modelUrl 
      }]
    });
    
  } catch (e) {
    console.error(`[3D] Error: ${e.message}`);
    logRequest({
      id: requestId, model: `inno-ai-${tierKey}`, source: 'api', apiKey: req.apiKey,
      promptPreview: prompt?.substring(0, 100), error: e.message,
      latency: Date.now() - startTime, status: 'error', type: '3d_generation'
    });
    res.status(500).json({ error: '3D generation failed', message: e.message });
  }
});

// Image to 3D (using Tencent Hunyuan-3D 3.1)
app.post('/v1/3d/image-to-3d', authenticate, async (req, res) => {
  const { image, format = 'glb', steps = 25 } = req.body;
  const startTime = Date.now();
  const requestId = uuidv4();
  
  if (!image) {
    return res.status(400).json({ error: 'image (base64 or URL) is required' });
  }

  // Check if Replicate is configured
  if (!replicate) {
    return res.status(503).json({ 
      error: '3D conversion not configured',
      message: 'REPLICATE_API_KEY is required for image-to-3D. Get one at replicate.com',
      setup: 'Add REPLICATE_API_KEY to .env file'
    });
  }

  try {
    console.log(`[3D] Converting image to 3D...`);
    
    // Handle base64 - convert to data URL if needed
    let imageInput = image;
    if (!image.startsWith('http') && !image.startsWith('data:')) {
      imageInput = `data:image/png;base64,${image}`;
    }
    
    // Use Tencent Hunyuan-3D 3.1 (supports image-to-3D)
    const output = await replicate.run(
      "tencent/hunyuan-3d-3.1:a2838628b41a2e0ee2eb19b3ea98a40d75f8d7639bf5a1ddd37ea299bb334854",
      {
        input: {
          image: imageInput,
          generate_type: "Normal",  // Normal = with textures
          enable_pbr: true,
          face_count: 100000
        }
      }
    );
    
    const latency = Date.now() - startTime;
    console.log(`[3D] Converted in ${latency}ms`);
    
    // Output could be URL or object with mesh property
    let modelUrl = output;
    if (Array.isArray(output)) modelUrl = output[0];
    if (typeof output === 'object' && output.mesh) modelUrl = output.mesh;
    if (typeof output === 'object' && output.glb) modelUrl = output.glb;
    
    // Download and save locally
    const modelResponse = await fetch(modelUrl);
    const modelData = await modelResponse.arrayBuffer();
    const ext = modelUrl.includes('.obj') ? 'obj' : modelUrl.includes('.ply') ? 'ply' : 'glb';
    const modelPath = path.join(DATA_DIR, `model_${requestId}.${ext}`);
    fs.writeFileSync(modelPath, Buffer.from(modelData));
    
    logRequest({
      id: requestId, model: 'inno-ai-3d-convert', source: 'api', apiKey: req.apiKey,
      type: 'image_to_3d', latency, status: 'success'
    });
    
    res.json({
      created: Math.floor(Date.now() / 1000),
      data: [{ 
        url: `/data/model_${requestId}.${ext}`, 
        format: ext,
        external_url: modelUrl
      }]
    });
    
  } catch (e) {
    console.error(`[3D] Error: ${e.message}`);
    logRequest({
      id: requestId, model: 'inno-ai-3d-convert', source: 'api', apiKey: req.apiKey,
      error: e.message, latency: Date.now() - startTime, status: 'error', type: 'image_to_3d'
    });
    res.status(500).json({ error: 'Image to 3D conversion failed', message: e.message });
  }
});

// List available 3D models
app.get('/v1/3d/models', (req, res) => {
  const models = Object.entries(MODEL_3D_TIERS).map(([key, tier]) => ({
    id: key,
    name: tier.name,
    description: tier.description,
    speed: tier.speed,
    cost: tier.cost,
    quality: tier.quality,
    replicate_model: tier.model.split(':')[0]
  }));
  
  res.json({
    object: 'list',
    data: models,
    aliases: MODEL_3D_ALIASES,
    default: '3d-2',
    replicate_configured: !!replicate
  });
});

// ==================== VIDEO GENERATION ====================

// Text/Image to Video
app.post('/v1/video/generations', authenticate, async (req, res) => {
  const { prompt, image, model = 'video-2', duration = 5 } = req.body;
  const startTime = Date.now();
  const requestId = uuidv4();
  
  if (!prompt && !image) {
    return res.status(400).json({ error: 'prompt or image is required' });
  }

  // Check if Replicate is configured
  if (!replicate) {
    return res.status(503).json({ 
      error: 'Video generation not configured',
      message: 'REPLICATE_API_KEY is required for video generation',
      setup: 'Add REPLICATE_API_KEY to .env file'
    });
  }

  // Resolve model tier
  let tierKey = model.toLowerCase();
  if (VIDEO_ALIASES[tierKey]) tierKey = VIDEO_ALIASES[tierKey];
  
  const tier = VIDEO_TIERS[tierKey];
  if (!tier) {
    return res.status(400).json({ 
      error: 'Invalid video model',
      available: Object.keys(VIDEO_TIERS),
      aliases: VIDEO_ALIASES
    });
  }

  try {
    console.log(`[VIDEO] Generating with ${tier.model}: ${(prompt || 'image-to-video').substring(0, 50)}...`);
    
    // Build input based on model
    let input = {};
    if (prompt) input.prompt = prompt;
    if (image) input.image = image;
    if (duration) input.duration = duration;
    
    const output = await replicate.run(tier.model, { input });
    
    const latency = Date.now() - startTime;
    console.log(`[VIDEO] Generated in ${latency}ms`);
    
    // Output is URL to video
    let videoUrl = output;
    if (Array.isArray(output)) videoUrl = output[0];
    if (typeof output === 'object' && output.video) videoUrl = output.video;
    
    // Download and save locally
    const videoResponse = await fetch(videoUrl);
    const videoData = await videoResponse.arrayBuffer();
    const videoPath = path.join(DATA_DIR, `video_${requestId}.mp4`);
    fs.writeFileSync(videoPath, Buffer.from(videoData));
    
    logRequest({
      id: requestId, model: `inno-ai-${tierKey}`, source: 'api', apiKey: req.apiKey,
      promptPreview: (prompt || 'image-to-video').substring(0, 100), type: 'video_generation',
      tier: tier.name, latency, status: 'success'
    });
    
    res.json({
      created: Math.floor(Date.now() / 1000),
      model: tierKey,
      tier: tier.name,
      data: [{ 
        url: `/data/video_${requestId}.mp4`,
        external_url: videoUrl,
        duration: duration
      }]
    });
    
  } catch (e) {
    console.error(`[VIDEO] Error: ${e.message}`);
    logRequest({
      id: requestId, model: `inno-ai-${tierKey}`, source: 'api', apiKey: req.apiKey,
      promptPreview: prompt?.substring(0, 100), error: e.message,
      latency: Date.now() - startTime, status: 'error', type: 'video_generation'
    });
    res.status(500).json({ error: 'Video generation failed', message: e.message });
  }
});

// Video Editing
app.post('/v1/video/edit', authenticate, async (req, res) => {
  const { video, prompt, model = 'video-edit', aspect_ratio } = req.body;
  const startTime = Date.now();
  const requestId = uuidv4();
  
  if (!video) {
    return res.status(400).json({ error: 'video URL is required' });
  }

  if (!replicate) {
    return res.status(503).json({ 
      error: 'Video editing not configured',
      message: 'REPLICATE_API_KEY is required'
    });
  }

  // Resolve model tier
  let tierKey = model.toLowerCase();
  if (VIDEO_ALIASES[tierKey]) tierKey = VIDEO_ALIASES[tierKey];
  
  const tier = VIDEO_TIERS[tierKey];
  if (!tier || tier.type !== 'video-edit') {
    return res.status(400).json({ 
      error: 'Invalid video edit model',
      available: Object.entries(VIDEO_TIERS)
        .filter(([_, t]) => t.type === 'video-edit')
        .map(([k, _]) => k)
    });
  }

  try {
    console.log(`[VIDEO-EDIT] Editing with ${tier.model}...`);
    
    let input = { video };
    if (prompt) input.prompt = prompt;
    if (aspect_ratio) input.aspect_ratio = aspect_ratio;
    
    const output = await replicate.run(tier.model, { input });
    
    const latency = Date.now() - startTime;
    console.log(`[VIDEO-EDIT] Completed in ${latency}ms`);
    
    let videoUrl = output;
    if (typeof output === 'object' && output.video) videoUrl = output.video;
    
    // Download and save
    const videoResponse = await fetch(videoUrl);
    const videoData = await videoResponse.arrayBuffer();
    const videoPath = path.join(DATA_DIR, `video_edit_${requestId}.mp4`);
    fs.writeFileSync(videoPath, Buffer.from(videoData));
    
    logRequest({
      id: requestId, model: `inno-ai-${tierKey}`, source: 'api', apiKey: req.apiKey,
      type: 'video_edit', tier: tier.name, latency, status: 'success'
    });
    
    res.json({
      created: Math.floor(Date.now() / 1000),
      model: tierKey,
      tier: tier.name,
      data: [{ 
        url: `/data/video_edit_${requestId}.mp4`,
        external_url: videoUrl
      }]
    });
    
  } catch (e) {
    console.error(`[VIDEO-EDIT] Error: ${e.message}`);
    logRequest({
      id: requestId, model: `inno-ai-${tierKey}`, source: 'api', apiKey: req.apiKey,
      error: e.message, latency: Date.now() - startTime, status: 'error', type: 'video_edit'
    });
    res.status(500).json({ error: 'Video editing failed', message: e.message });
  }
});

// Add Audio to Video
app.post('/v1/video/add-audio', authenticate, async (req, res) => {
  const { video, prompt } = req.body;
  const startTime = Date.now();
  const requestId = uuidv4();
  
  if (!video) {
    return res.status(400).json({ error: 'video URL is required' });
  }

  if (!replicate) {
    return res.status(503).json({ error: 'Audio generation not configured' });
  }

  try {
    console.log(`[VIDEO-AUDIO] Adding audio to video...`);
    
    const output = await replicate.run('zsxkib/mmaudio', {
      input: { video, prompt: prompt || '' }
    });
    
    const latency = Date.now() - startTime;
    console.log(`[VIDEO-AUDIO] Completed in ${latency}ms`);
    
    let videoUrl = output;
    if (typeof output === 'object' && output.video) videoUrl = output.video;
    
    // Download and save
    const videoResponse = await fetch(videoUrl);
    const videoData = await videoResponse.arrayBuffer();
    const videoPath = path.join(DATA_DIR, `video_audio_${requestId}.mp4`);
    fs.writeFileSync(videoPath, Buffer.from(videoData));
    
    logRequest({
      id: requestId, model: 'inno-ai-video-audio', source: 'api', apiKey: req.apiKey,
      type: 'video_audio', latency, status: 'success'
    });
    
    res.json({
      created: Math.floor(Date.now() / 1000),
      model: 'video-audio',
      data: [{ 
        url: `/data/video_audio_${requestId}.mp4`,
        external_url: videoUrl
      }]
    });
    
  } catch (e) {
    console.error(`[VIDEO-AUDIO] Error: ${e.message}`);
    res.status(500).json({ error: 'Audio generation failed', message: e.message });
  }
});

// List available video models
app.get('/v1/video/models', (req, res) => {
  const models = Object.entries(VIDEO_TIERS).map(([key, tier]) => ({
    id: key,
    name: tier.name,
    description: tier.description,
    type: tier.type,
    speed: tier.speed,
    cost: tier.cost,
    quality: tier.quality,
    replicate_model: tier.model
  }));
  
  res.json({
    object: 'list',
    data: models,
    aliases: VIDEO_ALIASES,
    default: 'video-2',
    replicate_configured: !!replicate
  });
});

// ==================== USAGE & MODELS ====================

// Get usage for API key
app.get('/v1/usage', authenticate, (req, res) => {
  const apiKeys = loadApiKeys();
  const keyData = apiKeys.keys[req.apiKey];
  
  if (!keyData) {
    return res.status(404).json({ error: 'API key not found' });
  }
  
  res.json({
    api_key_id: keyData.id,
    api_key_name: keyData.name,
    created: keyData.created,
    last_used: keyData.lastUsed,
    usage: {
      requests: keyData.requests,
      tokens: keyData.tokens,
      rate_limit: keyData.rateLimit,
      monthly_limit: keyData.monthlyLimit
    }
  });
});

// List models
app.get('/v1/models', authenticate, async (req, res) => {
  // Build image tier models dynamically
  const imageModels = Object.entries(IMAGE_TIERS).map(([key, tier]) => ({
    id: key,
    object: 'model',
    owned_by: 'innovatehub',
    capabilities: ['image_generation'],
    description: `${tier.name}: ${tier.description}`,
    speed: tier.speed,
    cost: tier.cost,
    quality: tier.quality
  }));

  // Base models array
  const models = [
    // Chat models
    { id: 'inno-ai-boyong-4.5', object: 'model', owned_by: 'innovatehub', capabilities: ['chat', 'function_calling'], description: 'Most capable chat model' },
    { id: 'inno-ai-boyong-4.0', object: 'model', owned_by: 'innovatehub', capabilities: ['chat'], description: 'Balanced chat model' },
    { id: 'inno-ai-boyong-mini', object: 'model', owned_by: 'innovatehub', capabilities: ['chat'], description: 'Fast chat model' },
    // Image models (tiered)
    ...imageModels,
    { id: 'image-free', object: 'model', owned_by: 'innovatehub', capabilities: ['image_generation'], description: 'Free tier via HuggingFace (FLUX.1-schnell)', cost: 'FREE' },
    // Audio models
    { id: 'inno-ai-voice-1', object: 'model', owned_by: 'innovatehub', capabilities: ['text_to_speech'], description: 'Neural text-to-speech' },
    { id: 'inno-ai-whisper-1', object: 'model', owned_by: 'innovatehub', capabilities: ['speech_to_text'], description: 'Whisper for transcription' },
    // Embedding models
    { id: 'inno-ai-embed-1', object: 'model', owned_by: 'innovatehub', capabilities: ['embeddings'], description: 'Text embeddings for RAG/search' },
    // 3D models
    { id: 'inno-ai-3d-gen', object: 'model', owned_by: 'innovatehub', capabilities: ['text_to_3d'], description: 'Generate 3D models from text (Hunyuan-3D 3.1)' },
    { id: 'inno-ai-3d-convert', object: 'model', owned_by: 'innovatehub', capabilities: ['image_to_3d'], description: 'Convert images to 3D (Hunyuan-3D 3.1)' }
  ];

  // Add Hugging Face models (examples)
  if (HF_API_TOKEN) {
    models.push(
      { id: 'hf-mistralai/Mistral-7B-Instruct-v0.2', object: 'model', owned_by: 'huggingface/mistralai', capabilities: ['chat'], description: 'Mistral 7B Instruct - Fast and capable (prefix: hf-)' },
      { id: 'hf-meta-llama/Llama-2-7b-chat-hf', object: 'model', owned_by: 'huggingface/meta', capabilities: ['chat'], description: 'Llama 2 7B Chat - Meta open source model (prefix: hf-)' },
      { id: 'hf-google/gemma-7b-it', object: 'model', owned_by: 'huggingface/google', capabilities: ['chat'], description: 'Gemma 7B - Google open model (prefix: hf-)' },
      { id: 'hf-any-model-id', object: 'model', owned_by: 'huggingface', capabilities: ['chat'], description: 'Use any Hugging Face model by prefixing with hf-' }
    );
  }

  // Fetch and add OpenRouter models
  if (OPENROUTER_API_KEY) {
    try {
      const orModels = await fetchOpenRouterModels();
      orModels.forEach(orModel => {
        if (orModel.id && (orModel.id.includes('chat') || orModel.id.includes('instruct') || orModel.id.includes('claude') || orModel.id.includes('gpt'))) {
          models.push({
            id: `or-${orModel.id}`,
            object: 'model',
            owned_by: `openrouter/${orModel.id.split('/')[0] || 'unknown'}`,
            capabilities: ['chat'],
            description: `${orModel.name || orModel.id} (prefix: or-)`
          });
        }
      });
    } catch (e) {
      console.error('Failed to fetch OpenRouter models for /v1/models:', e.message);
      // Add some popular OpenRouter examples
      models.push(
        { id: 'or-anthropic/claude-3-opus', object: 'model', owned_by: 'openrouter/anthropic', capabilities: ['chat'], description: 'Claude 3 Opus via OpenRouter (prefix: or-)' },
        { id: 'or-openai/gpt-4o', object: 'model', owned_by: 'openrouter/openai', capabilities: ['chat'], description: 'GPT-4o via OpenRouter (prefix: or-)' },
        { id: 'or-any-model-id', object: 'model', owned_by: 'openrouter', capabilities: ['chat'], description: 'Use any OpenRouter model by prefixing with or-' }
      );
    }
  }

  // Add MoonshotAI/Kimi models
  if (MOONSHOT_API_KEY) {
    models.push(
      { id: 'kimi-k2.5', object: 'model', owned_by: 'moonshotai', capabilities: ['chat', 'vision'], description: 'Kimi K2.5 - Most capable model with 256K context' },
      { id: 'kimi-k2', object: 'model', owned_by: 'moonshotai', capabilities: ['chat', 'vision'], description: 'Kimi K2 - Balanced performance and cost' },
      { id: 'kimi-k1.5', object: 'model', owned_by: 'moonshotai', capabilities: ['chat'], description: 'Kimi K1.5 - Fast and cost-effective' }
    );
  }

  // Add Google Antigravity/OpenCode models (via OpenClaw OAuth)
  const antigravityCreds = loadAntigravityCredentials();
  if (antigravityCreds) {
    models.push(
      { id: 'antigravity-gemini-2.5-pro', object: 'model', owned_by: 'google-antigravity', capabilities: ['chat', 'vision'], description: '🔥 Google Gemini 2.5 Pro via Antigravity (FREE via OpenClaw OAuth)' },
      { id: 'antigravity-gemini-2.0-flash', object: 'model', owned_by: 'google-antigravity', capabilities: ['chat', 'vision'], description: '🔥 Google Gemini 2.0 Flash via Antigravity (FREE via OpenClaw OAuth)' },
      { id: 'antigravity-gemini-1.5-pro', object: 'model', owned_by: 'google-antigravity', capabilities: ['chat', 'vision'], description: 'Google Gemini 1.5 Pro via Antigravity (FREE via OpenClaw OAuth)' },
      { id: 'antigravity-claude-opus-4-5-thinking', object: 'model', owned_by: 'google-antigravity', capabilities: ['chat'], description: 'Claude Opus 4.5 Thinking via Antigravity (FREE via OpenClaw OAuth)' },
      { id: 'antigravity-claude-sonnet-4-5', object: 'model', owned_by: 'google-antigravity', capabilities: ['chat'], description: 'Claude Sonnet 4.5 via Antigravity (FREE via OpenClaw OAuth)' }
    );
  } else {
    // Add placeholder if not configured
    models.push(
      { id: 'antigravity-setup-required', object: 'model', owned_by: 'google-antigravity', capabilities: ['chat'], description: '⚠️ Google Antigravity models available - authenticate with openclaw first' }
    );
  }

  // Add free/cost-effective open source model recommendations
  models.push(
    { id: 'hf-Qwen/Qwen2.5-72B-Instruct', object: 'model', owned_by: 'huggingface/Qwen', capabilities: ['chat'], description: '💰 FREE - Qwen2.5 72B - Very capable open source model' },
    { id: 'hf-upstage/SOLAR-10.7B-Instruct-v1.0', object: 'model', owned_by: 'huggingface/upstage', capabilities: ['chat'], description: '💰 FREE - SOLAR 10.7B - Efficient and fast' },
    { id: 'hf-NousResearch/Nous-Hermes-2-Mistral-7B-DPO', object: 'model', owned_by: 'huggingface/NousResearch', capabilities: ['chat'], description: '💰 FREE - Nous Hermes 2 - Fine-tuned for helpfulness' },
    { id: 'hf-HuggingFaceH4/zephyr-7b-beta', object: 'model', owned_by: 'huggingface/HuggingFaceH4', capabilities: ['chat'], description: '💰 FREE - Zephyr 7B - Optimized for helpful assistant behavior' },
    { id: 'hf-tiiuae/falcon-7b-instruct', object: 'model', owned_by: 'huggingface/tiiuae', capabilities: ['chat'], description: '💰 FREE - Falcon 7B - Fast inference, good quality' }
  );

  res.json({
    object: 'list',
    data: models
  });
});

// ==================== ADMIN ENDPOINTS ====================

// Admin: Get analytics
app.get('/admin/analytics', adminAuth, (req, res) => {
  const analytics = loadAnalytics();
  const uptime = Date.now() - analytics.startTime;
  
  const last24Hours = {};
  for (let i = 23; i >= 0; i--) {
    const hour = new Date(Date.now() - i * 3600000).toISOString().slice(0, 13);
    last24Hours[hour] = analytics.requestsByHour[hour] || 0;
  }
  
  const last7Days = {};
  for (let i = 6; i >= 0; i--) {
    const day = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    last7Days[day] = analytics.requestsByDay[day] || 0;
  }
  
  res.json({ ...analytics, uptime_ms: uptime, uptime_human: formatUptime(uptime), last24Hours, last7Days });
});

// Admin: Get logs with full details
app.get('/admin/logs', adminAuth, (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  const logs = loadLogs();
  res.json(logs.slice(-limit).reverse());
});

// Admin: Get single log with full details
app.get('/admin/logs/:id', adminAuth, (req, res) => {
  const logs = loadLogs();
  const log = logs.find(l => l.id === req.params.id);
  if (!log) return res.status(404).json({ error: 'Log not found' });
  res.json(log);
});

// Admin: Reset analytics
app.post('/admin/reset', adminAuth, (req, res) => {
  saveAnalytics({ totalRequests: 0, totalTokens: 0, totalPromptTokens: 0, totalCompletionTokens: 0, requestsByModel: {}, requestsByHour: {}, requestsByDay: {}, startTime: Date.now() });
  saveLogs([]);
  res.json({ success: true, message: 'Analytics reset' });
});

// Admin: System info
app.get('/admin/system', adminAuth, async (req, res) => {
  try {
    const { execSync } = require('child_process');
    const cpuUsage = execSync("top -bn1 | grep 'Cpu(s)' | awk '{print $2}' | cut -d'%' -f1").toString().trim();
    const memInfo = execSync("free -m | awk 'NR==2{printf \"%s/%s\", $3, $2}'").toString().trim();
    const diskInfo = execSync("df -h / | awk 'NR==2{printf \"%s/%s\", $3, $2}'").toString().trim();
    
    res.json({ 
      cpu: `${cpuUsage}%`, 
      memory: memInfo + ' MB', 
      disk: diskInfo, 
      nodeVersion: process.version, 
      platform: process.platform, 
      pid: process.pid, 
      hfConfigured: !!HF_API_KEY,
      replicateConfigured: !!REPLICATE_API_KEY,
      capabilities: {
        chat: true,
        images: !!HF_API_KEY,
        audio: !!HF_API_KEY,
        embeddings: !!HF_API_KEY,
        '3d': !!REPLICATE_API_KEY
      }
    });
  } catch (e) {
    res.json({ error: e.message });
  }
});

// Admin: Playground
app.post('/admin/playground', adminAuth, async (req, res) => {
  const { messages, model } = req.body;
  const startTime = Date.now();
  
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array required' });
  }

  try {
    const requestId = uuidv4();
    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
    const prompt = lastUserMessage?.content || '';
    const escapedPrompt = prompt.replace(/'/g, "'\\''");
    
    const cmd = `agent --session-id playground-${requestId.substring(0,8)} --message '${escapedPrompt}' --json`;
    const output = await runOpenClaw(cmd, 180000);
    
    let responseText = '';
    let usage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
    
    try {
      const jsonResponse = JSON.parse(output);
      responseText = jsonResponse.result?.payloads?.[0]?.text || output;
      if (jsonResponse.result?.meta?.agentMeta?.usage) {
        const u = jsonResponse.result.meta.agentMeta.usage;
        usage = { prompt_tokens: u.input || 0, completion_tokens: u.output || 0, total_tokens: u.total || 0 };
      }
    } catch { responseText = output; }
    
    const brandedModel = MODEL_BRANDING[model] || 'inno-ai-boyong-4.5';
    const latency = Date.now() - startTime;
    
    logRequest({
      id: requestId, model: brandedModel, source: 'playground',
      promptPreview: prompt.substring(0, 100), responsePreview: responseText.substring(0, 100),
      promptTokens: usage.prompt_tokens, completionTokens: usage.completion_tokens,
      totalTokens: usage.total_tokens, latency, status: 'success',
      fullPrompt: prompt, fullResponse: responseText
    });
    
    res.json({ model: brandedModel, response: responseText.trim(), usage });
    
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ==================== API KEY MANAGEMENT ====================

// List API keys
app.get('/admin/api-keys', adminAuth, (req, res) => {
  const data = loadApiKeys();
  const keys = Object.entries(data.keys).map(([key, info]) => ({
    ...info,
    key: key.substring(0, 8) + '...' + key.substring(key.length - 4),
    fullKey: key
  }));
  res.json({ keys });
});

// Create API key
app.post('/admin/api-keys', adminAuth, (req, res) => {
  const { name, rateLimit = 100, monthlyLimit = 1000000 } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'name is required' });
  }
  
  const newKey = 'inno_' + crypto.randomBytes(24).toString('hex');
  const data = loadApiKeys();
  
  data.keys[newKey] = {
    id: 'key_' + crypto.randomBytes(8).toString('hex'),
    name,
    created: new Date().toISOString(),
    lastUsed: null,
    requests: 0,
    tokens: 0,
    rateLimit,
    monthlyLimit,
    enabled: true
  };
  
  saveApiKeys(data);
  
  res.json({ 
    success: true, 
    key: newKey,
    message: 'API key created. Save this key - it won\'t be shown again!'
  });
});

// Update API key
app.patch('/admin/api-keys/:keyId', adminAuth, (req, res) => {
  const { keyId } = req.params;
  const { name, rateLimit, monthlyLimit, enabled } = req.body;
  
  const data = loadApiKeys();
  const keyEntry = Object.entries(data.keys).find(([k, v]) => v.id === keyId);
  
  if (!keyEntry) {
    return res.status(404).json({ error: 'API key not found' });
  }
  
  const [key, info] = keyEntry;
  if (name !== undefined) info.name = name;
  if (rateLimit !== undefined) info.rateLimit = rateLimit;
  if (monthlyLimit !== undefined) info.monthlyLimit = monthlyLimit;
  if (enabled !== undefined) info.enabled = enabled;
  
  data.keys[key] = info;
  saveApiKeys(data);
  
  res.json({ success: true, message: 'API key updated' });
});

// Delete API key
app.delete('/admin/api-keys/:keyId', adminAuth, (req, res) => {
  const { keyId } = req.params;
  
  const data = loadApiKeys();
  const keyEntry = Object.entries(data.keys).find(([k, v]) => v.id === keyId);
  
  if (!keyEntry) {
    return res.status(404).json({ error: 'API key not found' });
  }
  
  delete data.keys[keyEntry[0]];
  saveApiKeys(data);
  
  res.json({ success: true, message: 'API key deleted' });
});

// ==================== OAUTH & ACCOUNTS ENDPOINTS ====================

// Generate OAuth URL with PKCE
app.post('/admin/oauth/url', adminAuth, async (req, res) => {
  try {
    const { provider, accountName } = req.body;
    
    if (!provider || !accountName) {
      return res.status(400).json({ error: 'provider and accountName are required' });
    }
    
    // Currently only supporting antigravity (Google OAuth)
    if (provider !== 'antigravity') {
      return res.status(400).json({ error: 'Only antigravity provider is currently supported' });
    }
    
    // Generate PKCE parameters
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);
    const state = generateState(codeVerifier);
    
    // Store state with verifier (5 min TTL)
    oauthStates.set(state, {
      verifier: codeVerifier,
      provider,
      accountName,
      createdAt: Date.now(),
      expiresAt: Date.now() + OAUTH_STATE_TTL
    });
    
    // Build OAuth URL
    const params = new URLSearchParams({
      client_id: GOOGLE_OAUTH.clientId,
      redirect_uri: GOOGLE_OAUTH.redirectUri,
      response_type: 'code',
      scope: GOOGLE_OAUTH.scopes.join(' '),
      state: state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      access_type: 'offline',
      prompt: 'consent'
    });
    
    const authUrl = `${GOOGLE_OAUTH.authEndpoint}?${params.toString()}`;
    
    console.log(`[OAUTH] Generated URL for ${accountName} (${provider})`);
    
    res.json({
      url: authUrl,
      state: state,
      expiresIn: 300
    });
    
  } catch (e) {
    console.error('[OAUTH] Error generating URL:', e.message);
    res.status(500).json({ error: 'Failed to generate OAuth URL', message: e.message });
  }
});

// Exchange OAuth code for tokens
app.post('/admin/oauth/exchange', adminAuth, async (req, res) => {
  try {
    let { code, state, callbackUrl, accountName } = req.body;
    
    // If callbackUrl is provided, parse it to extract code and state
    if (callbackUrl) {
      try {
        const url = new URL(callbackUrl);
        // Always prefer values from callback URL if available
        code = url.searchParams.get('code') || code;
        state = url.searchParams.get('state') || state;
        console.log('[OAUTH] Parsed callback URL:', { code: code?.substring(0, 20) + '...', state: state?.substring(0, 30) + '...' });
      } catch (e) {
        return res.status(400).json({ error: 'Invalid callback URL format' });
      }
    }
    
    if (!code || !state) {
      return res.status(400).json({ error: 'code and state are required (or provide callbackUrl)' });
    }
    
    // Decode state to get verifier
    let stateData;
    try {
      const decodedState = JSON.parse(Buffer.from(state, 'base64url').toString());
      stateData = decodedState;
    } catch (e) {
      return res.status(400).json({ error: 'Invalid state format' });
    }
    
    if (!stateData.verifier) {
      return res.status(400).json({ error: 'Invalid state - no verifier found' });
    }
    
    // Exchange code for tokens
    const tokenResponse = await axios.post(
      GOOGLE_OAUTH.tokenEndpoint,
      new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: GOOGLE_OAUTH.redirectUri,
        client_id: GOOGLE_OAUTH.clientId,
        client_secret: GOOGLE_OAUTH.clientSecret,
        code_verifier: stateData.verifier
      }).toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );
    
    const { access_token, refresh_token, expires_in, id_token } = tokenResponse.data;
    
    // Decode ID token to get user info
    let email = 'unknown';
    let projectId = null;
    
    try {
      // Decode JWT payload (base64)
      const payload = JSON.parse(Buffer.from(id_token.split('.')[1], 'base64').toString());
      email = payload.email || 'unknown';
      console.log(`[OAUTH] Authenticated as ${email}`);
    } catch (e) {
      console.log('[OAUTH] Could not decode ID token');
    }
    
    // Try to extract project ID from access token or make API call
    // For now, use a default or extract from token if available
    try {
      // Attempt to get project info from Google Cloud API
      const projectResponse = await axios.get(
        'https://cloudresourcemanager.googleapis.com/v1/projects',
        {
          headers: { 'Authorization': `Bearer ${access_token}` }
        }
      );
      
      if (projectResponse.data.projects && projectResponse.data.projects.length > 0) {
        projectId = projectResponse.data.projects[0].projectId;
      }
    } catch (e) {
      console.log('[OAUTH] Could not fetch project info:', e.message);
      // Use a default project ID pattern based on email
      projectId = email.split('@')[0].replace(/[^a-z0-9]/g, '') + '-project';
    }
    
    // Calculate expiration time
    const expiresAt = Date.now() + (expires_in * 1000);
    
    // Load existing accounts
    const accountsData = loadAccounts();
    
    // Check if account with same email already exists
    let existingAccountId = null;
    for (const [accId, acc] of Object.entries(accountsData.accounts)) {
      if (acc.email === email && acc.provider === stateData.provider) {
        existingAccountId = accId;
        break;
      }
    }
    
    // Generate account ID (reuse existing if found, otherwise create new)
    const accountId = existingAccountId || ('acc_' + crypto.randomBytes(8).toString('hex'));
    
    // Create or update account
    const newAccount = {
      id: accountId,
      provider: stateData.provider,
      name: accountName || stateData.accountName,
      email: email,
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresAt: expiresAt,
      projectId: projectId,
      connectedAt: new Date().toISOString(),
      status: 'connected'
    };
    
    // Save to accounts file
    accountsData.accounts[accountId] = newAccount;
    saveAccounts(accountsData);
    
    if (existingAccountId) {
      console.log(`[OAUTH] Updated existing account: ${accountName} (${email})`);
    }
    
    console.log(`[OAUTH] Account connected: ${accountName} (${email})`);
    
    res.json({
      success: true,
      account: {
        id: accountId,
        provider: newAccount.provider,
        name: newAccount.name,
        email: newAccount.email,
        projectId: newAccount.projectId,
        expiresAt: newAccount.expiresAt,
        status: 'connected'
      }
    });
    
  } catch (e) {
    console.error('[OAUTH] Error exchanging code:', e.message);
    if (e.response) {
      console.error('[OAUTH] Response:', e.response.data);
    }
    res.status(500).json({ 
      error: 'Failed to exchange code for tokens', 
      message: e.response?.data?.error_description || e.message 
    });
  }
});

// List connected accounts
app.get('/admin/accounts', adminAuth, (req, res) => {
  try {
    const accountsData = loadAccounts();
    const accounts = Object.values(accountsData.accounts).map(acc => {
      // Determine status based on expiration
      const now = Date.now();
      let status = acc.status;
      if (acc.expiresAt && acc.expiresAt < now) {
        status = 'expired';
      }
      
      return {
        id: acc.id,
        provider: acc.provider,
        name: acc.name,
        email: acc.email,
        projectId: acc.projectId,
        expiresAt: acc.expiresAt,
        status: status,
        connectedAt: acc.connectedAt
      };
    });
    
    res.json({ accounts });
    
  } catch (e) {
    console.error('[ACCOUNTS] Error listing accounts:', e.message);
    res.status(500).json({ error: 'Failed to load accounts', message: e.message });
  }
});

// Delete account
app.delete('/admin/accounts/:id', adminAuth, (req, res) => {
  try {
    const { id } = req.params;
    const accountsData = loadAccounts();
    
    if (!accountsData.accounts[id]) {
      return res.status(404).json({ error: 'Account not found' });
    }
    
    const accountName = accountsData.accounts[id].name;
    delete accountsData.accounts[id];
    saveAccounts(accountsData);
    
    console.log(`[ACCOUNTS] Deleted account: ${accountName} (${id})`);
    res.json({ success: true, message: 'Account deleted' });
    
  } catch (e) {
    console.error('[ACCOUNTS] Error deleting account:', e.message);
    res.status(500).json({ error: 'Failed to delete account', message: e.message });
  }
});

// Refresh token for an account
app.post('/admin/accounts/:id/refresh', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const accountsData = loadAccounts();
    const account = accountsData.accounts[id];
    
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }
    
    if (!account.refreshToken) {
      return res.status(400).json({ error: 'No refresh token available' });
    }
    
    // Call Google token refresh endpoint
    const refreshResponse = await axios.post(
      GOOGLE_OAUTH.tokenEndpoint,
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: account.refreshToken,
        client_id: GOOGLE_OAUTH.clientId,
        client_secret: GOOGLE_OAUTH.clientSecret
      }).toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );
    
    const { access_token, expires_in } = refreshResponse.data;
    
    // Update account
    account.accessToken = access_token;
    account.expiresAt = Date.now() + (expires_in * 1000);
    account.status = 'connected';
    
    saveAccounts(accountsData);
    
    console.log(`[ACCOUNTS] Refreshed token for: ${account.name}`);
    
    res.json({
      success: true,
      expiresAt: account.expiresAt
    });
    
  } catch (e) {
    console.error('[ACCOUNTS] Error refreshing token:', e.message);
    if (e.response) {
      console.error('[ACCOUNTS] Response:', e.response.data);
    }
    res.status(500).json({ 
      error: 'Failed to refresh token', 
      message: e.response?.data?.error_description || e.message 
    });
  }
});

// Serve data files (for generated images)
app.use('/data', express.static(DATA_DIR));

// Serve admin UI
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// ==================== DIRECTPAY BILLING API ====================
const directpay = require('./lib/directpay');

// Get DirectPay configuration
app.get('/admin/billing/config', adminAuth, (req, res) => {
  try {
    res.json({
      success: true,
      config: directpay.getPublicConfig()
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Set environment (sandbox/production)
app.post('/admin/billing/environment', adminAuth, (req, res) => {
  try {
    const { environment } = req.body;
    
    if (!environment || !['sandbox', 'production'].includes(environment)) {
      return res.status(400).json({ error: 'Environment must be "sandbox" or "production"' });
    }
    
    directpay.setEnvironment(environment);
    
    res.json({
      success: true,
      message: `Environment set to ${environment}`,
      config: directpay.getPublicConfig()
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Save production credentials
app.post('/admin/billing/credentials', adminAuth, (req, res) => {
  try {
    const { merchantId, merchantKey, apiBase, dashboard, username, password } = req.body;
    
    if (!merchantId || !merchantKey) {
      return res.status(400).json({ error: 'merchantId and merchantKey are required' });
    }
    
    directpay.setProductionCredentials({
      merchantId,
      merchantKey,
      apiBase: apiBase || 'https://api.directpayph.com/api',
      dashboard: dashboard || 'https://dashboard.directpayph.com',
      username,
      password
    });
    
    res.json({
      success: true,
      message: 'Production credentials saved',
      config: directpay.getPublicConfig()
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Test DirectPay connection
app.post('/admin/billing/test', adminAuth, async (req, res) => {
  try {
    const result = await directpay.testConnection();
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Create payment/checkout
app.post('/admin/billing/payment', adminAuth, async (req, res) => {
  try {
    const { amount, description, metadata } = req.body;
    
    if (!amount || isNaN(amount)) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }
    
    const result = await directpay.createCheckout({
      amount: parseFloat(amount),
      description: description || 'AI Gateway Service',
      metadata: metadata || {},
      successUrl: `${req.protocol}://${req.get('host')}/admin/billing/success`,
      cancelUrl: `${req.protocol}://${req.get('host')}/admin/billing/cancel`,
      webhookUrl: `${req.protocol}://${req.get('host')}/webhooks/directpay`
    });
    
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get transactions
app.get('/admin/billing/transactions', adminAuth, (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    
    const result = directpay.getTransactions(limit, offset);
    res.json({
      success: true,
      ...result
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DirectPay webhook handler
app.post('/webhooks/directpay', express.json(), (req, res) => {
  try {
    // Verify webhook signature if provided
    const signature = req.headers['x-webhook-signature'];
    if (signature && !directpay.verifyWebhookSignature(req.body, signature)) {
      return res.status(401).json({ error: 'Invalid signature' });
    }
    
    const result = directpay.handleWebhook(req.body);
    
    // Always return 200 to acknowledge receipt
    res.status(200).json(result);
  } catch (e) {
    console.error('[DIRECTPAY WEBHOOK] Error:', e.message);
    res.status(200).json({ success: false, error: e.message });
  }
});

// Billing success/cancel pages
app.get('/admin/billing/success', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Payment Successful</title>
      <style>
        body { font-family: Arial, sans-serif; background: #0f0f23; color: #e0e0e0; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
        .container { background: #1a1a2e; border: 1px solid #333; border-radius: 10px; padding: 40px; text-align: center; max-width: 400px; }
        .success { color: #81c784; font-size: 60px; margin-bottom: 20px; }
        h1 { color: #4fc3f7; margin-bottom: 10px; }
        p { color: #888; margin-bottom: 30px; }
        .btn { display: inline-block; background: #4285f4; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="success">✓</div>
        <h1>Payment Successful!</h1>
        <p>Your payment has been processed successfully. You can close this window and return to the admin dashboard.</p>
        <a href="/admin" class="btn">Return to Dashboard</a>
      </div>
    </body>
    </html>
  `);
});

app.get('/admin/billing/cancel', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Payment Cancelled</title>
      <style>
        body { font-family: Arial, sans-serif; background: #0f0f23; color: #e0e0e0; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
        .container { background: #1a1a2e; border: 1px solid #333; border-radius: 10px; padding: 40px; text-align: center; max-width: 400px; }
        .cancel { color: #ffb74d; font-size: 60px; margin-bottom: 20px; }
        h1 { color: #ef5350; margin-bottom: 10px; }
        p { color: #888; margin-bottom: 30px; }
        .btn { display: inline-block; background: #4285f4; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="cancel">✕</div>
        <h1>Payment Cancelled</h1>
        <p>Your payment was cancelled. You can try again anytime from the admin dashboard.</p>
        <a href="/admin" class="btn">Return to Dashboard</a>
      </div>
    </body>
    </html>
  `);
});

// ==================== CUSTOMER AUTHENTICATION & MANAGEMENT ====================
const customerService = require('./lib/customer-service');
const pricingStrategy = require('./lib/pricing-strategy');

// Customer JWT middleware
const authenticateCustomer = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = customerService.verifyToken(token);
    req.customer = decoded;
    next();
  } catch (e) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Customer registration
app.post('/api/v1/customers/register', async (req, res) => {
  try {
    const result = await customerService.registerCustomer(req.body);
    res.status(201).json(result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Customer login
app.post('/api/v1/customers/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await customerService.loginCustomer(email, password);
    res.json(result);
  } catch (e) {
    res.status(401).json({ error: e.message });
  }
});

// Get customer profile
app.get('/api/v1/customers/profile', authenticateCustomer, async (req, res) => {
  try {
    const customer = customerService.getCustomer(req.customer.customerId);
    res.json({ success: true, customer });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Update customer profile
app.put('/api/v1/customers/profile', authenticateCustomer, async (req, res) => {
  try {
    const result = await customerService.updateCustomer(req.customer.customerId, req.body);
    res.json(result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Change password
app.post('/api/v1/customers/change-password', authenticateCustomer, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const result = await customerService.changePassword(req.customer.customerId, currentPassword, newPassword);
    res.json(result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ==================== CUSTOMER API KEYS ====================

// Create API key
app.post('/api/v1/customers/api-keys', authenticateCustomer, async (req, res) => {
  try {
    const { name } = req.body;
    const result = await customerService.createApiKey(req.customer.customerId, name);
    res.status(201).json(result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// List API keys
app.get('/api/v1/customers/api-keys', authenticateCustomer, async (req, res) => {
  try {
    const apiKeys = customerService.getApiKeys(req.customer.customerId);
    res.json({ success: true, apiKeys });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Revoke API key
app.delete('/api/v1/customers/api-keys/:keyId', authenticateCustomer, async (req, res) => {
  try {
    const result = await customerService.revokeApiKey(req.customer.customerId, req.params.keyId);
    res.json(result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ==================== CUSTOMER USAGE & ANALYTICS ====================

// Get usage statistics
app.get('/api/v1/customers/usage', authenticateCustomer, async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    const usage = customerService.getUsage(req.customer.customerId, period);
    res.json({ success: true, usage });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ==================== PRICING & BILLING ====================

// Get pricing information
app.get('/api/v1/pricing', (req, res) => {
  try {
    const { philippinePricing, subscriptionTiers, payAsYouGo } = pricingStrategy.ourStrategy;
    res.json({
      success: true,
      pricing: {
        models: philippinePricing,
        subscriptions: subscriptionTiers,
        payAsYouGo: payAsYouGo,
        currency: 'PHP'
      }
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get customer billing info
app.get('/api/v1/customers/billing', authenticateCustomer, async (req, res) => {
  try {
    const usage = customerService.getUsage(req.customer.customerId, '30d');
    const customer = customerService.getCustomer(req.customer.customerId);
    
    res.json({
      success: true,
      billing: {
        tier: customer.tier,
        currentUsage: usage.totalCost,
        currency: 'PHP',
        nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      }
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ==================== CUSTOMER DASHBOARD (STATIC) ====================

// Serve customer portal
app.get('/portal', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'portal.html'));
});

// Serve customer login page
app.get('/portal/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'portal.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🤖 InnovateHub AI Gateway v3.0.0 running on port ${PORT}`);
  console.log(`   Admin UI: http://localhost:${PORT}/admin`);
  console.log(`   Customer Portal: http://localhost:${PORT}/portal`);
  console.log(`   API Docs: http://localhost:${PORT}/docs`);
  console.log(`   HuggingFace: ${HF_API_KEY ? 'Configured ✓' : 'Not configured'}`);
});
