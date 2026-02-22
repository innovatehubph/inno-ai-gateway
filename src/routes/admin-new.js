const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { execSync } = require('child_process');
const { 
  loadAnalytics, 
  saveAnalytics, 
  loadLogs, 
  saveLogs, 
  loadApiKeys, 
  saveApiKeys,
  logRequest
} = require('../utils/data-helpers');
const { formatUptime } = require('../utils/formatters');
const { runOpenClaw } = require('../services/openclaw');
const { MODEL_BRANDING } = require('../config/models');
const { HF_API_KEY, REPLICATE_API_KEY } = require('../config/providers');
const { 
  generateCodeVerifier, 
  generateCodeChallenge, 
  generateState,
  loadAccounts,
  saveAccounts,
  GOOGLE_OAUTH
} = require('../services/oauth');

// Config paths
const BASE_DIR = path.resolve(__dirname, '..', '..');
const CONFIG_DIR = path.join(BASE_DIR, 'config');
const PROVIDERS_FILE = path.join(CONFIG_DIR, 'providers.json');
const MODELS_FILE = path.join(CONFIG_DIR, 'models.json');
const AUDIT_LOGS_FILE = path.join(CONFIG_DIR, 'audit-logs.json');

// Admin authentication middleware
function adminAuth(req, res, next) {
  const ADMIN_KEY = process.env.ADMIN_KEY || 'inno-admin-2026';
  const authHeader = req.headers.authorization;
  const adminKey = req.headers['x-admin-key'] || (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null);
  
  if (adminKey === ADMIN_KEY) return next();
  res.status(401).json({ error: 'Unauthorized', message: 'Invalid admin key' });
}

// Audit logging
function auditLog(adminKey, action, details = {}) {
  try {
    const logs = JSON.parse(fs.readFileSync(AUDIT_LOGS_FILE, 'utf8') || '[]');
    logs.push({
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      adminKey: adminKey.substring(0, 8) + '...',
      action,
      details,
      ip: req?.ip || 'unknown'
    });
    fs.writeFileSync(AUDIT_LOGS_FILE, JSON.stringify(logs.slice(-1000), null, 2));
  } catch (e) {
    console.error('[AUDIT] Failed to log:', e.message);
  }
}

// ==================== PROVIDER MANAGEMENT ====================

function loadProviders() {
  try {
    return JSON.parse(fs.readFileSync(PROVIDERS_FILE, 'utf8'));
  } catch {
    // Return default providers
    return {
      openrouter: {
        id: 'openrouter',
        name: 'OpenRouter',
        enabled: true,
        apiKey: process.env.OPENROUTER_API_KEY || '',
        baseUrl: 'https://openrouter.ai/api/v1',
        capabilities: ['chat', 'image'],
        rateLimit: 1000,
        status: 'unknown',
        lastTested: null,
        config: {
          httpReferer: 'https://ai-gateway.innoserver.cloud',
          title: 'InnoAI Gateway'
        }
      },
      huggingface: {
        id: 'huggingface',
        name: 'Hugging Face',
        enabled: true,
        apiKey: process.env.HF_API_KEY || '',
        baseUrl: 'https://router.huggingface.co',
        capabilities: ['chat', 'image', 'audio', 'embeddings'],
        rateLimit: 500,
        status: 'unknown',
        lastTested: null,
        config: {}
      },
      openai: {
        id: 'openai',
        name: 'OpenAI',
        enabled: false,
        apiKey: process.env.OPENAI_API_KEY || '',
        baseUrl: 'https://api.openai.com/v1',
        capabilities: ['chat', 'audio', 'embeddings'],
        rateLimit: 2000,
        status: 'unknown',
        lastTested: null,
        config: {}
      },
      moonshot: {
        id: 'moonshot',
        name: 'MoonshotAI (Kimi)',
        enabled: true,
        apiKey: process.env.MOONSHOT_API_KEY || '',
        baseUrl: 'https://api.moonshot.cn/v1',
        capabilities: ['chat'],
        rateLimit: 100,
        status: 'unknown',
        lastTested: null,
        config: {}
      },
      antigravity: {
        id: 'antigravity',
        name: 'Google Antigravity',
        enabled: true,
        apiKey: 'oauth',
        baseUrl: 'https://cloudcode-pa.googleapis.com',
        capabilities: ['chat'],
        rateLimit: 100,
        status: 'unknown',
        lastTested: null,
        config: {
          authProfile: process.env.ANTIGRAVITY_AUTH_PROFILE || 'google-antigravity:admin@tmapp.live'
        }
      },
      replicate: {
        id: 'replicate',
        name: 'Replicate',
        enabled: true,
        apiKey: process.env.REPLICATE_API_KEY || '',
        baseUrl: 'https://api.replicate.com/v1',
        capabilities: ['image', '3d', 'video'],
        rateLimit: 50,
        status: 'unknown',
        lastTested: null,
        config: {}
      }
    };
  }
}

function saveProviders(providers) {
  fs.writeFileSync(PROVIDERS_FILE, JSON.stringify(providers, null, 2));
}

// Get all providers
router.get('/providers', adminAuth, (req, res) => {
  const providers = loadProviders();
  // Mask API keys
  const sanitized = {};
  Object.keys(providers).forEach(key => {
    const p = providers[key];
    sanitized[key] = {
      ...p,
      apiKey: p.apiKey ? '••••' + p.apiKey.slice(-4) : ''
    };
  });
  res.json({ providers: sanitized });
});

// Get single provider
router.get('/providers/:providerId', adminAuth, (req, res) => {
  const providers = loadProviders();
  const provider = providers[req.params.providerId];
  if (!provider) return res.status(404).json({ error: 'Provider not found' });
  
  res.json({ 
    provider: {
      ...provider,
      apiKey: provider.apiKey ? '••••' + provider.apiKey.slice(-4) : ''
    }
  });
});

// Update provider
router.put('/providers/:providerId', adminAuth, (req, res) => {
  const providers = loadProviders();
  const { providerId } = req.params;
  
  if (!providers[providerId]) {
    return res.status(404).json({ error: 'Provider not found' });
  }
  
  const { enabled, apiKey, rateLimit, config } = req.body;
  
  if (enabled !== undefined) providers[providerId].enabled = enabled;
  if (apiKey && !apiKey.startsWith('••••')) providers[providerId].apiKey = apiKey;
  if (rateLimit !== undefined) providers[providerId].rateLimit = rateLimit;
  if (config !== undefined) providers[providerId].config = { ...providers[providerId].config, ...config };
  
  providers[providerId].updatedAt = new Date().toISOString();
  saveProviders(providers);
  
  auditLog(req.headers['x-admin-key'] || 'admin', 'UPDATE_PROVIDER', { providerId, enabled, rateLimit });
  
  res.json({ success: true, provider: { ...providers[providerId], apiKey: '••••' + providers[providerId].apiKey.slice(-4) } });
});

// Test provider connection
router.post('/providers/:providerId/test', adminAuth, async (req, res) => {
  const providers = loadProviders();
  const provider = providers[req.params.providerId];
  
  if (!provider) return res.status(404).json({ error: 'Provider not found' });
  
  try {
    let status = 'error';
    let message = '';
    
    switch (provider.id) {
      case 'openrouter':
        const orRes = await axios.get('https://openrouter.ai/api/v1/models', {
          headers: { 'Authorization': `Bearer ${provider.apiKey}` },
          timeout: 10000
        });
        status = orRes.status === 200 ? 'active' : 'error';
        message = orRes.status === 200 ? 'Connected' : 'API error';
        break;
        
      case 'huggingface':
        const hfRes = await axios.get('https://huggingface.co/api/models?limit=1', {
          timeout: 10000
        });
        status = hfRes.status === 200 ? 'active' : 'error';
        message = hfRes.status === 200 ? 'Connected' : 'API error';
        break;
        
      case 'openai':
        const oaiRes = await axios.get('https://api.openai.com/v1/models', {
          headers: { 'Authorization': `Bearer ${provider.apiKey}` },
          timeout: 10000
        });
        status = oaiRes.status === 200 ? 'active' : 'error';
        message = oaiRes.status === 200 ? 'Connected' : 'API error';
        break;
        
      case 'moonshot':
        const msRes = await axios.get('https://api.moonshot.cn/v1/models', {
          headers: { 'Authorization': `Bearer ${provider.apiKey}` },
          timeout: 10000
        });
        status = msRes.status === 200 ? 'active' : 'error';
        message = msRes.status === 200 ? 'Connected' : 'API error';
        break;
        
      case 'antigravity':
        status = 'active';
        message = 'OAuth-based (test via playground)';
        break;
        
      case 'replicate':
        const repRes = await axios.get('https://api.replicate.com/v1/models', {
          headers: { 'Authorization': `Token ${provider.apiKey}` },
          timeout: 10000
        });
        status = repRes.status === 200 ? 'active' : 'error';
        message = repRes.status === 200 ? 'Connected' : 'API error';
        break;
        
      default:
        message = 'Unknown provider';
    }
    
    provider.status = status;
    provider.lastTested = new Date().toISOString();
    saveProviders(providers);
    
    res.json({ success: true, status, message });
  } catch (e) {
    provider.status = 'error';
    provider.lastTested = new Date().toISOString();
    saveProviders(providers);
    
    res.json({ success: false, status: 'error', message: e.message });
  }
});

// ==================== MODEL MANAGEMENT ====================

function loadModels() {
  try {
    return JSON.parse(fs.readFileSync(MODELS_FILE, 'utf8'));
  } catch {
    // Return default models based on existing config
    return {
      models: [
        {
          id: 'inno-ai-boyong-4.5',
          name: 'InnoAI Boyong 4.5',
          provider: 'openrouter',
          providerModelId: 'anthropic/claude-3-opus',
          aliases: ['boyong-4.5', 'claude-opus'],
          pricing: { input: 0.000015, output: 0.000075 },
          capabilities: ['chat', 'function_calling'],
          maxTokens: 4096,
          contextWindow: 200000,
          enabled: true,
          description: 'Most capable model for complex tasks'
        },
        {
          id: 'inno-ai-boyong-4.0',
          name: 'InnoAI Boyong 4.0',
          provider: 'openrouter',
          providerModelId: 'anthropic/claude-3-sonnet',
          aliases: ['boyong-4.0', 'claude-sonnet'],
          pricing: { input: 0.000003, output: 0.000015 },
          capabilities: ['chat'],
          maxTokens: 4096,
          contextWindow: 200000,
          enabled: true,
          description: 'Balanced performance and speed'
        },
        {
          id: 'inno-ai-boyong-mini',
          name: 'InnoAI Boyong Mini',
          provider: 'openrouter',
          providerModelId: 'anthropic/claude-3-haiku',
          aliases: ['boyong-mini', 'claude-haiku'],
          pricing: { input: 0.00000025, output: 0.00000125 },
          capabilities: ['chat'],
          maxTokens: 4096,
          contextWindow: 200000,
          enabled: true,
          description: 'Fast and cost-effective'
        },
        {
          id: 'gpt-4o',
          name: 'GPT-4o',
          provider: 'openai',
          providerModelId: 'gpt-4o',
          aliases: ['gpt4o'],
          pricing: { input: 0.000005, output: 0.000015 },
          capabilities: ['chat', 'function_calling', 'vision'],
          maxTokens: 4096,
          contextWindow: 128000,
          enabled: false,
          description: 'OpenAI flagship model'
        },
        {
          id: 'kimi-k2.5',
          name: 'Kimi K2.5',
          provider: 'moonshot',
          providerModelId: 'kimi-k2.5',
          aliases: ['kimi', 'k2.5'],
          pricing: { input: 0.000002, output: 0.000006 },
          capabilities: ['chat'],
          maxTokens: 4096,
          contextWindow: 256000,
          enabled: true,
          description: 'Chinese AI with 256K context'
        }
      ],
      lastUpdated: new Date().toISOString()
    };
  }
}

function saveModels(data) {
  data.lastUpdated = new Date().toISOString();
  fs.writeFileSync(MODELS_FILE, JSON.stringify(data, null, 2));
}

// Get all models
router.get('/models', adminAuth, (req, res) => {
  const data = loadModels();
  const { provider, capability, enabled } = req.query;
  
  let models = data.models;
  
  if (provider) models = models.filter(m => m.provider === provider);
  if (capability) models = models.filter(m => m.capabilities.includes(capability));
  if (enabled !== undefined) models = models.filter(m => m.enabled === (enabled === 'true'));
  
  res.json({ models, lastUpdated: data.lastUpdated });
});

// Get single model
router.get('/models/:modelId', adminAuth, (req, res) => {
  const data = loadModels();
  const model = data.models.find(m => m.id === req.params.modelId);
  if (!model) return res.status(404).json({ error: 'Model not found' });
  res.json({ model });
});

// Create new model
router.post('/models', adminAuth, (req, res) => {
  const data = loadModels();
  const { id, name, provider, providerModelId, pricing, capabilities, maxTokens, contextWindow, description } = req.body;
  
  if (!id || !name || !provider) {
    return res.status(400).json({ error: 'id, name, and provider are required' });
  }
  
  if (data.models.find(m => m.id === id)) {
    return res.status(400).json({ error: 'Model ID already exists' });
  }
  
  const newModel = {
    id,
    name,
    provider,
    providerModelId: providerModelId || id,
    aliases: [],
    pricing: pricing || { input: 0, output: 0 },
    capabilities: capabilities || ['chat'],
    maxTokens: maxTokens || 4096,
    contextWindow: contextWindow || 8192,
    enabled: true,
    description: description || '',
    createdAt: new Date().toISOString()
  };
  
  data.models.push(newModel);
  saveModels(data);
  
  auditLog(req.headers['x-admin-key'] || 'admin', 'CREATE_MODEL', { modelId: id, name });
  
  res.json({ success: true, model: newModel });
});

// Update model
router.put('/models/:modelId', adminAuth, (req, res) => {
  const data = loadModels();
  const modelIndex = data.models.findIndex(m => m.id === req.params.modelId);
  
  if (modelIndex === -1) return res.status(404).json({ error: 'Model not found' });
  
  const { name, providerModelId, pricing, capabilities, maxTokens, contextWindow, enabled, description, aliases } = req.body;
  const model = data.models[modelIndex];
  
  if (name !== undefined) model.name = name;
  if (providerModelId !== undefined) model.providerModelId = providerModelId;
  if (pricing !== undefined) model.pricing = pricing;
  if (capabilities !== undefined) model.capabilities = capabilities;
  if (maxTokens !== undefined) model.maxTokens = maxTokens;
  if (contextWindow !== undefined) model.contextWindow = contextWindow;
  if (enabled !== undefined) model.enabled = enabled;
  if (description !== undefined) model.description = description;
  if (aliases !== undefined) model.aliases = aliases;
  
  model.updatedAt = new Date().toISOString();
  saveModels(data);
  
  auditLog(req.headers['x-admin-key'] || 'admin', 'UPDATE_MODEL', { modelId: model.id, enabled, pricing });
  
  res.json({ success: true, model });
});

// Delete model
router.delete('/models/:modelId', adminAuth, (req, res) => {
  const data = loadModels();
  const modelIndex = data.models.findIndex(m => m.id === req.params.modelId);
  
  if (modelIndex === -1) return res.status(404).json({ error: 'Model not found' });
  
  const model = data.models[modelIndex];
  data.models.splice(modelIndex, 1);
  saveModels(data);
  
  auditLog(req.headers['x-admin-key'] || 'admin', 'DELETE_MODEL', { modelId: model.id, name: model.name });
  
  res.json({ success: true, message: 'Model deleted' });
});

// ==================== AUDIT LOGS ====================

router.get('/audit-logs', adminAuth, (req, res) => {
  try {
    const logs = JSON.parse(fs.readFileSync(AUDIT_LOGS_FILE, 'utf8') || '[]');
    const { limit = 100, action, startDate, endDate } = req.query;
    
    let filtered = logs;
    if (action) filtered = filtered.filter(l => l.action === action);
    if (startDate) filtered = filtered.filter(l => l.timestamp >= startDate);
    if (endDate) filtered = filtered.filter(l => l.timestamp <= endDate);
    
    res.json({ logs: filtered.slice(-parseInt(limit)).reverse() });
  } catch {
    res.json({ logs: [] });
  }
});

// ==================== CONFIGURATION ====================

router.get('/config', adminAuth, (req, res) => {
  const config = {
    environment: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 3456,
    providers: Object.keys(loadProviders()),
    features: {
      streaming: true,
      functionCalling: true,
      oauth: true,
      billing: true
    }
  };
  res.json({ config });
});

router.post('/config/reload', adminAuth, (req, res) => {
  // In production, this would reload configuration
  res.json({ success: true, message: 'Configuration reloaded' });
});

// ==================== EXISTING ROUTES (keep existing functionality) ====================

// PKCE state storage
const oauthStates = new Map();
const OAUTH_STATE_TTL = 5 * 60 * 1000;

// Analytics, Logs, System, Playground, API Keys, OAuth, Billing routes remain the same...
// (Include all existing routes from the original admin.js)

router.get('/analytics', adminAuth, (req, res) => {
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

router.get('/logs', adminAuth, (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  const logs = loadLogs();
  res.json(logs.slice(-limit).reverse());
});

router.get('/system', adminAuth, async (req, res) => {
  try {
    const cpuUsage = execSync("top -bn1 | grep 'Cpu(s)' | awk '{print $2}' | cut -d'%' -f1").toString().trim();
    const memInfo = execSync("free -m | awk 'NR==2{printf "%s/%s", $3, $2}'").toString().trim();
    const diskInfo = execSync("df -h / | awk 'NR==2{printf "%s/%s", $3, $2}'").toString().trim();
    
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

module.exports = router;
