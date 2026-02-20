const express = require('express');
const { exec } = require('child_process');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Load environment variables
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8095;
const ADMIN_KEY = process.env.ADMIN_KEY || 'inno-admin-2026';
const HF_API_KEY = process.env.HF_API_KEY || '';
const REPLICATE_API_KEY = process.env.REPLICATE_API_KEY || '';

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

// Data storage
const DATA_DIR = path.join(__dirname, 'data');
const ANALYTICS_FILE = path.join(DATA_DIR, 'analytics.json');
const LOGS_FILE = path.join(DATA_DIR, 'logs.json');
const API_KEYS_FILE = path.join(DATA_DIR, 'api-keys.json');

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
    timestamp: new Date().toISOString() 
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

  const lastUserMessage = messages.filter(m => m.role === 'user').pop();
  const prompt = lastUserMessage?.content || '';
  const requestedModel = model || 'inno-ai-boyong-4.5';
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
  const { prompt, n = 1, size = '1024x1024', response_format = 'url' } = req.body;
  const startTime = Date.now();
  const requestId = uuidv4();
  
  if (!prompt) {
    return res.status(400).json({ error: 'prompt is required' });
  }

  console.log(`[IMG] Generating image: ${prompt.substring(0, 50)}...`);

  // Try primary model, then fallback
  const models = [HF_MODELS.image, HF_MODELS.image_alt];
  let lastError = null;
  
  for (const model of models) {
    try {
      console.log(`[IMG] Trying model: ${model}`);
      const hfResponse = await callHuggingFace(model, prompt);
      const imageBuffer = await hfResponse.arrayBuffer();
      
      // Check if we got a valid image (not an error JSON)
      if (imageBuffer.byteLength < 1000) {
        const text = new TextDecoder().decode(imageBuffer);
        if (text.includes('error') || text.includes('loading')) {
          console.log(`[IMG] Model ${model} not ready: ${text.substring(0, 100)}`);
          lastError = text;
          continue;
        }
      }
      
      const latency = Date.now() - startTime;
      
      logRequest({
        id: requestId, model: 'inno-ai-vision-xl', source: 'api', apiKey: req.apiKey,
        promptPreview: prompt.substring(0, 100), type: 'image_generation',
        latency, status: 'success'
      });
      
      console.log(`[IMG] Success with ${model} in ${latency}ms`);
      
      if (response_format === 'b64_json') {
        const base64Image = Buffer.from(imageBuffer).toString('base64');
        return res.json({
          created: Math.floor(Date.now() / 1000),
          data: [{ b64_json: base64Image }]
        });
      } else {
        const imagePath = path.join(DATA_DIR, `image_${requestId}.png`);
        fs.writeFileSync(imagePath, Buffer.from(imageBuffer));
        
        return res.json({
          created: Math.floor(Date.now() / 1000),
          data: [{ url: `/data/image_${requestId}.png` }]
        });
      }
      
    } catch (e) {
      console.log(`[IMG] Model ${model} failed: ${e.message}`);
      lastError = e.message;
      continue;
    }
  }
  
  // All models failed
  logRequest({
    id: requestId, model: 'inno-ai-vision-xl', source: 'api', apiKey: req.apiKey,
    promptPreview: prompt?.substring(0, 100), error: lastError,
    latency: Date.now() - startTime, status: 'error', type: 'image_generation'
  });
  res.status(500).json({ error: 'Image generation failed', message: lastError });
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

// Text to 3D (using Tencent Hunyuan-3D 3.1)
app.post('/v1/3d/generations', authenticate, async (req, res) => {
  const { prompt, format = 'glb', steps = 25 } = req.body;
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

  try {
    console.log(`[3D] Generating from text: ${prompt.substring(0, 50)}...`);
    
    // Use Tencent Hunyuan-3D 3.1 (latest, best quality)
    const output = await replicate.run(
      "tencent/hunyuan-3d-3.1:a2838628b41a2e0ee2eb19b3ea98a40d75f8d7639bf5a1ddd37ea299bb334854",
      {
        input: {
          prompt: prompt,
          generate_type: "Normal",  // Normal = with textures, Geometry = white model
          enable_pbr: true,
          face_count: 100000
        }
      }
    );
    
    const latency = Date.now() - startTime;
    console.log(`[3D] Generated in ${latency}ms`);
    
    // Output is a URL to the 3D file
    let modelUrl = output;
    if (Array.isArray(output)) modelUrl = output[0];
    if (typeof output === 'object' && output.mesh) modelUrl = output.mesh;
    
    // Download and save locally
    const modelResponse = await fetch(modelUrl);
    const modelData = await modelResponse.arrayBuffer();
    const ext = modelUrl.includes('.obj') ? 'obj' : modelUrl.includes('.ply') ? 'ply' : 'glb';
    const modelPath = path.join(DATA_DIR, `model_${requestId}.${ext}`);
    fs.writeFileSync(modelPath, Buffer.from(modelData));
    
    logRequest({
      id: requestId, model: 'inno-ai-3d-gen', source: 'api', apiKey: req.apiKey,
      promptPreview: prompt.substring(0, 100), type: '3d_generation',
      latency, status: 'success'
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
      id: requestId, model: 'inno-ai-3d-gen', source: 'api', apiKey: req.apiKey,
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
app.get('/v1/models', authenticate, (req, res) => {
  res.json({
    object: 'list',
    data: [
      // Chat models
      { id: 'inno-ai-boyong-4.5', object: 'model', owned_by: 'innovatehub', capabilities: ['chat', 'function_calling'], description: 'Most capable chat model' },
      { id: 'inno-ai-boyong-4.0', object: 'model', owned_by: 'innovatehub', capabilities: ['chat'], description: 'Balanced chat model' },
      { id: 'inno-ai-boyong-mini', object: 'model', owned_by: 'innovatehub', capabilities: ['chat'], description: 'Fast chat model' },
      // Image models
      { id: 'inno-ai-vision-xl', object: 'model', owned_by: 'innovatehub', capabilities: ['image_generation'], description: 'Stable Diffusion XL for image generation' },
      // Audio models
      { id: 'inno-ai-voice-1', object: 'model', owned_by: 'innovatehub', capabilities: ['text_to_speech'], description: 'Neural text-to-speech' },
      { id: 'inno-ai-whisper-1', object: 'model', owned_by: 'innovatehub', capabilities: ['speech_to_text'], description: 'Whisper for transcription' },
      // Embedding models
      { id: 'inno-ai-embed-1', object: 'model', owned_by: 'innovatehub', capabilities: ['embeddings'], description: 'Text embeddings for RAG/search' },
      // 3D models
      { id: 'inno-ai-3d-gen', object: 'model', owned_by: 'innovatehub', capabilities: ['text_to_3d'], description: 'Generate 3D models from text (Shap-E)' },
      { id: 'inno-ai-3d-convert', object: 'model', owned_by: 'innovatehub', capabilities: ['image_to_3d'], description: 'Convert 2D images to 3D models (TripoSR)' }
    ]
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

// Serve data files (for generated images)
app.use('/data', express.static(DATA_DIR));

// Serve admin UI
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🤖 InnovateHub AI Gateway v3.0.0 running on port ${PORT}`);
  console.log(`   Admin UI: http://localhost:${PORT}/admin`);
  console.log(`   API Docs: http://localhost:${PORT}/docs`);
  console.log(`   HuggingFace: ${HF_API_KEY ? 'Configured ✓' : 'Not configured'}`);
});
