const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { execSync } = require('child_process');

// Config paths
const BASE_DIR = path.resolve(__dirname, '..', '..');
const CONFIG_DIR = path.join(BASE_DIR, 'config');
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

// Admin authentication middleware
function adminAuth(req, res, next) {
  const ADMIN_KEY = process.env.ADMIN_KEY || 'inno-admin-2026';
  const authHeader = req.headers.authorization;
  const adminKey = req.headers['x-admin-key'] || (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null);
  
  if (adminKey === ADMIN_KEY) return next();
  res.status(401).json({ error: 'Unauthorized', message: 'Invalid admin key' });
}

// PKCE state storage
const oauthStates = new Map();
const OAUTH_STATE_TTL = 5 * 60 * 1000;

// ==================== ANALYTICS ENDPOINTS ====================

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

// ==================== LOGS ENDPOINTS ====================

router.get('/logs', adminAuth, (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  const logs = loadLogs();
  res.json(logs.slice(-limit).reverse());
});

router.get('/logs/:id', adminAuth, (req, res) => {
  const logs = loadLogs();
  const log = logs.find(l => l.id === req.params.id);
  if (!log) return res.status(404).json({ error: 'Log not found' });
  res.json(log);
});

// ==================== SYSTEM ENDPOINTS ====================

router.post('/reset', adminAuth, (req, res) => {
  saveAnalytics({ totalRequests: 0, totalTokens: 0, totalPromptTokens: 0, totalCompletionTokens: 0, requestsByModel: {}, requestsByHour: {}, requestsByDay: {}, startTime: Date.now() });
  saveLogs([]);
  res.json({ success: true, message: 'Analytics reset' });
});

router.get('/system', adminAuth, async (req, res) => {
  try {
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

// ==================== PLAYGROUND ENDPOINTS ====================

router.post('/playground', adminAuth, async (req, res) => {
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

// ==================== API KEY MANAGEMENT ENDPOINTS ====================

router.get('/api-keys', adminAuth, (req, res) => {
  const data = loadApiKeys();
  const keys = Object.entries(data.keys).map(([key, info]) => ({
    ...info,
    key: key.substring(0, 8) + '...' + key.substring(key.length - 4),
    fullKey: key
  }));
  res.json({ keys });
});

router.post('/api-keys', adminAuth, (req, res) => {
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

router.patch('/api-keys/:keyId', adminAuth, (req, res) => {
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

router.delete('/api-keys/:keyId', adminAuth, (req, res) => {
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

// ==================== OAUTH ENDPOINTS ====================

router.post('/oauth/url', adminAuth, async (req, res) => {
  try {
    const { provider, accountName } = req.body;
    
    if (!provider || !accountName) {
      return res.status(400).json({ error: 'provider and accountName are required' });
    }
    
    if (provider !== 'antigravity') {
      return res.status(400).json({ error: 'Only antigravity provider is currently supported' });
    }
    
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);
    const state = generateState(codeVerifier);
    
    oauthStates.set(state, {
      verifier: codeVerifier,
      provider,
      accountName,
      createdAt: Date.now(),
      expiresAt: Date.now() + OAUTH_STATE_TTL
    });
    
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
    
    res.json({
      url: authUrl,
      state: state,
      expiresIn: 300
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to generate OAuth URL', message: e.message });
  }
});

router.post('/oauth/exchange', adminAuth, async (req, res) => {
  try {
    let { code, state, callbackUrl, accountName } = req.body;
    
    if (callbackUrl) {
      try {
        const url = new URL(callbackUrl);
        code = url.searchParams.get('code') || code;
        state = url.searchParams.get('state') || state;
      } catch (e) {
        return res.status(400).json({ error: 'Invalid callback URL format' });
      }
    }
    
    if (!code || !state) {
      return res.status(400).json({ error: 'code and state are required (or provide callbackUrl)' });
    }
    
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
    
    let email = 'unknown';
    let projectId = null;
    
    try {
      const payload = JSON.parse(Buffer.from(id_token.split('.')[1], 'base64').toString());
      email = payload.email || 'unknown';
    } catch (e) {
      console.log('[OAUTH] Could not decode ID token');
    }
    
    try {
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
      projectId = email.split('@')[0].replace(/[^a-z0-9]/g, '') + '-project';
    }
    
    const expiresAt = Date.now() + (expires_in * 1000);
    
    const accountsData = loadAccounts();
    
    let existingAccountId = null;
    for (const [accId, acc] of Object.entries(accountsData.accounts)) {
      if (acc.email === email && acc.provider === stateData.provider) {
        existingAccountId = accId;
        break;
      }
    }
    
    const accountId = existingAccountId || ('acc_' + crypto.randomBytes(8).toString('hex'));
    
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
    
    accountsData.accounts[accountId] = newAccount;
    saveAccounts(accountsData);
    
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
    res.status(500).json({ 
      error: 'Failed to exchange code for tokens', 
      message: e.response?.data?.error_description || e.message 
    });
  }
});

// ==================== ACCOUNTS ENDPOINTS ====================

router.get('/accounts', adminAuth, (req, res) => {
  try {
    const accountsData = loadAccounts();
    const accounts = Object.values(accountsData.accounts).map(acc => {
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
    res.status(500).json({ error: 'Failed to load accounts', message: e.message });
  }
});

router.delete('/accounts/:id', adminAuth, (req, res) => {
  try {
    const { id } = req.params;
    const accountsData = loadAccounts();
    
    if (!accountsData.accounts[id]) {
      return res.status(404).json({ error: 'Account not found' });
    }
    
    const accountName = accountsData.accounts[id].name;
    delete accountsData.accounts[id];
    saveAccounts(accountsData);
    
    res.json({ success: true, message: 'Account deleted' });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete account', message: e.message });
  }
});

router.post('/accounts/:id/refresh', adminAuth, async (req, res) => {
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
    
    account.accessToken = access_token;
    account.expiresAt = Date.now() + (expires_in * 1000);
    account.status = 'connected';
    
    saveAccounts(accountsData);
    
    res.json({
      success: true,
      expiresAt: account.expiresAt
    });
  } catch (e) {
    res.status(500).json({ 
      error: 'Failed to refresh token', 
      message: e.response?.data?.error_description || e.message 
    });
  }
});

// ==================== PROVIDER MANAGEMENT ====================

const PROVIDERS_FILE = path.join(CONFIG_DIR, 'providers.json');
const MODELS_FILE = path.join(CONFIG_DIR, 'models.json');
const AUDIT_LOGS_FILE = path.join(CONFIG_DIR, 'audit-logs.json');

function loadProviders() {
  try {
    return JSON.parse(fs.readFileSync(PROVIDERS_FILE, 'utf8'));
  } catch {
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
        lastTested: null
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
        lastTested: null
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
        lastTested: null
      },
      moonshot: {
        id: 'moonshot',
        name: 'MoonshotAI',
        enabled: true,
        apiKey: process.env.MOONSHOT_API_KEY || '',
        baseUrl: 'https://api.moonshot.cn/v1',
        capabilities: ['chat'],
        rateLimit: 100,
        status: 'unknown',
        lastTested: null
      }
    };
  }
}

function saveProviders(providers) {
  fs.writeFileSync(PROVIDERS_FILE, JSON.stringify(providers, null, 2));
}

router.get('/providers', adminAuth, (req, res) => {
  const providers = loadProviders();
  const sanitized = {};
  Object.keys(providers).forEach(key => {
    const p = providers[key];
    sanitized[key] = { ...p, apiKey: p.apiKey ? '••••' + p.apiKey.slice(-4) : '' };
  });
  res.json({ providers: sanitized });
});

router.put('/providers/:providerId', adminAuth, (req, res) => {
  const providers = loadProviders();
  const { providerId } = req.params;
  if (!providers[providerId]) return res.status(404).json({ error: 'Provider not found' });
  
  const { enabled, apiKey, rateLimit } = req.body;
  if (enabled !== undefined) providers[providerId].enabled = enabled;
  if (apiKey && !apiKey.startsWith('••••')) providers[providerId].apiKey = apiKey;
  if (rateLimit !== undefined) providers[providerId].rateLimit = rateLimit;
  providers[providerId].updatedAt = new Date().toISOString();
  saveProviders(providers);
  
  res.json({ success: true, provider: { ...providers[providerId], apiKey: '••••' + providers[providerId].apiKey.slice(-4) } });
});

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
        const hfRes = await axios.get('https://huggingface.co/api/models?limit=1', { timeout: 10000 });
        status = hfRes.status === 200 ? 'active' : 'error';
        message = hfRes.status === 200 ? 'Connected' : 'API error';
        break;
      default:
        message = 'Test not implemented';
    }
    
    provider.status = status;
    provider.lastTested = new Date().toISOString();
    saveProviders(providers);
    res.json({ success: status === 'active', status, message });
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
    return {
      models: [
        {
          id: 'inno-ai-boyong-4.5',
          name: 'InnoAI Boyong 4.5',
          provider: 'openrouter',
          providerModelId: 'anthropic/claude-3-opus',
          aliases: ['boyong-4.5'],
          pricing: { input: 0.000015, output: 0.000075 },
          capabilities: ['chat', 'function_calling'],
          maxTokens: 4096,
          contextWindow: 200000,
          enabled: true
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

router.get('/models', adminAuth, (req, res) => {
  const data = loadModels();
  res.json({ models: data.models, lastUpdated: data.lastUpdated });
});

router.post('/models', adminAuth, (req, res) => {
  const data = loadModels();
  const { id, name, provider, pricing, capabilities, maxTokens } = req.body;
  
  if (!id || !name || !provider) {
    return res.status(400).json({ error: 'id, name, and provider are required' });
  }
  
  if (data.models.find(m => m.id === id)) {
    return res.status(400).json({ error: 'Model ID already exists' });
  }
  
  const newModel = {
    id, name, provider, providerModelId: id,
    aliases: [],
    pricing: pricing || { input: 0, output: 0 },
    capabilities: capabilities || ['chat'],
    maxTokens: maxTokens || 4096,
    contextWindow: 8192,
    enabled: true,
    createdAt: new Date().toISOString()
  };
  
  data.models.push(newModel);
  saveModels(data);
  res.json({ success: true, model: newModel });
});

router.put('/models/:modelId', adminAuth, (req, res) => {
  const data = loadModels();
  const model = data.models.find(m => m.id === req.params.modelId);
  if (!model) return res.status(404).json({ error: 'Model not found' });
  
  Object.assign(model, req.body, { updatedAt: new Date().toISOString() });
  saveModels(data);
  res.json({ success: true, model });
});

router.delete('/models/:modelId', adminAuth, (req, res) => {
  const data = loadModels();
  const index = data.models.findIndex(m => m.id === req.params.modelId);
  if (index === -1) return res.status(404).json({ error: 'Model not found' });
  
  data.models.splice(index, 1);
  saveModels(data);
  res.json({ success: true, message: 'Model deleted' });
});

// ==================== AUDIT LOGS ====================

router.get('/audit-logs', adminAuth, (req, res) => {
  try {
    const logs = JSON.parse(fs.readFileSync(AUDIT_LOGS_FILE, 'utf8') || '[]');
    res.json({ logs: logs.slice(-100).reverse() });
  } catch {
    res.json({ logs: [] });
  }
});

module.exports = router;
