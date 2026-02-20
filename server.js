const express = require('express');
const { exec } = require('child_process');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8095;
const API_KEY = process.env.API_KEY || 'masipag-ai-gateway-2026';
const ADMIN_KEY = process.env.ADMIN_KEY || 'inno-admin-2026';

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

// Analytics storage
const DATA_DIR = path.join(__dirname, 'data');
const ANALYTICS_FILE = path.join(DATA_DIR, 'analytics.json');
const LOGS_FILE = path.join(DATA_DIR, 'logs.json');

// Initialize data files
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(ANALYTICS_FILE)) fs.writeFileSync(ANALYTICS_FILE, JSON.stringify({ 
  totalRequests: 0, 
  totalTokens: 0, 
  totalPromptTokens: 0,
  totalCompletionTokens: 0,
  requestsByModel: {},
  requestsByHour: {},
  requestsByDay: {},
  startTime: Date.now()
}));
if (!fs.existsSync(LOGS_FILE)) fs.writeFileSync(LOGS_FILE, JSON.stringify([]));

function loadAnalytics() {
  try {
    return JSON.parse(fs.readFileSync(ANALYTICS_FILE, 'utf8'));
  } catch {
    return { totalRequests: 0, totalTokens: 0, totalPromptTokens: 0, totalCompletionTokens: 0, requestsByModel: {}, requestsByHour: {}, requestsByDay: {}, startTime: Date.now() };
  }
}

function saveAnalytics(data) {
  fs.writeFileSync(ANALYTICS_FILE, JSON.stringify(data, null, 2));
}

function loadLogs() {
  try {
    return JSON.parse(fs.readFileSync(LOGS_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function saveLogs(logs) {
  // Keep only last 1000 logs
  const trimmed = logs.slice(-1000);
  fs.writeFileSync(LOGS_FILE, JSON.stringify(trimmed, null, 2));
}

function logRequest(data) {
  const logs = loadLogs();
  logs.push({
    ...data,
    timestamp: new Date().toISOString()
  });
  saveLogs(logs);
  
  // Update analytics
  const analytics = loadAnalytics();
  analytics.totalRequests++;
  analytics.totalTokens += data.totalTokens || 0;
  analytics.totalPromptTokens += data.promptTokens || 0;
  analytics.totalCompletionTokens += data.completionTokens || 0;
  
  // By model
  const model = data.model || 'unknown';
  analytics.requestsByModel[model] = (analytics.requestsByModel[model] || 0) + 1;
  
  // By hour
  const hour = new Date().toISOString().slice(0, 13);
  analytics.requestsByHour[hour] = (analytics.requestsByHour[hour] || 0) + 1;
  
  // By day
  const day = new Date().toISOString().slice(0, 10);
  analytics.requestsByDay[day] = (analytics.requestsByDay[day] || 0) + 1;
  
  saveAnalytics(analytics);
}

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Run openclaw CLI command
function runOpenClaw(args, timeout = 180000) {
  return new Promise((resolve, reject) => {
    exec(`openclaw ${args}`, { timeout, maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err && !stdout) {
        reject(new Error(stderr || err.message));
      } else {
        resolve(stdout || stderr);
      }
    });
  });
}

// API key auth
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  const apiKey = req.headers['x-api-key'];
  
  if (apiKey === API_KEY || authHeader === `Bearer ${API_KEY}`) {
    return next();
  }
  res.status(401).json({ error: 'Unauthorized', message: 'Invalid API key' });
}

// Admin auth
function adminAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const adminKey = req.headers['x-admin-key'];
  
  if (adminKey === ADMIN_KEY || authHeader === `Bearer ${ADMIN_KEY}`) {
    return next();
  }
  res.status(401).json({ error: 'Unauthorized', message: 'Invalid admin key' });
}

// Health check (no auth)
app.get('/health', (req, res) => {
  const analytics = loadAnalytics();
  const uptime = Date.now() - analytics.startTime;
  
  res.json({ 
    status: 'ok', 
    service: 'InnovateHub AI Gateway', 
    version: '2.0.0',
    models: ['inno-ai-boyong-4.5', 'inno-ai-boyong-4.0', 'inno-ai-boyong-mini'],
    powered_by: 'InnovateHub Philippines',
    uptime_ms: uptime,
    uptime_human: formatUptime(uptime),
    timestamp: new Date().toISOString() 
  });
});

function formatUptime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

// Chat completion endpoint
app.post('/v1/chat/completions', authenticate, async (req, res) => {
  const { messages, model, stream = false, thinking } = req.body;
  const startTime = Date.now();
  
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array required' });
  }

  try {
    const requestId = uuidv4();
    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
    const prompt = lastUserMessage?.content || '';
    const escapedPrompt = prompt.replace(/'/g, "'\\''");
    
    let cmd = `agent --session-id api-${requestId.substring(0,8)} --message '${escapedPrompt}' --json`;
    if (thinking) cmd += ` --thinking ${thinking}`;
    
    console.log(`[API] Request: ${prompt.substring(0, 100)}...`);
    
    const output = await runOpenClaw(cmd, 180000);
    
    let responseText = '';
    let usage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
    
    try {
      const jsonResponse = JSON.parse(output);
      
      if (jsonResponse.result?.payloads?.[0]?.text) {
        responseText = jsonResponse.result.payloads[0].text;
      } else if (jsonResponse.reply) {
        responseText = jsonResponse.reply;
      } else {
        responseText = output;
      }
      
      if (jsonResponse.result?.meta?.agentMeta?.usage) {
        const u = jsonResponse.result.meta.agentMeta.usage;
        usage = {
          prompt_tokens: u.input || 0,
          completion_tokens: u.output || 0,
          total_tokens: u.total || 0
        };
      }
    } catch {
      responseText = output;
    }
    
    const requestedModel = model || 'inno-ai-boyong-4.5';
    const brandedModel = MODEL_BRANDING[requestedModel] || 'inno-ai-boyong-4.5';
    const latency = Date.now() - startTime;
    
    // Log the request
    logRequest({
      id: requestId,
      model: brandedModel,
      promptPreview: prompt.substring(0, 100),
      responsePreview: responseText.substring(0, 100),
      promptTokens: usage.prompt_tokens,
      completionTokens: usage.completion_tokens,
      totalTokens: usage.total_tokens,
      latency,
      status: 'success'
    });
    
    console.log(`[API] Response: ${responseText.substring(0, 100)}... (${latency}ms)`);
    
    res.json({
      id: `chatcmpl-${requestId}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: brandedModel,
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: responseText.trim()
        },
        finish_reason: 'stop'
      }],
      usage
    });
    
  } catch (e) {
    const latency = Date.now() - startTime;
    logRequest({
      id: uuidv4(),
      model: model || 'unknown',
      promptPreview: messages[0]?.content?.substring(0, 100) || '',
      error: e.message,
      latency,
      status: 'error'
    });
    
    console.error(`[API] Error: ${e.message}`);
    res.status(500).json({ error: 'Gateway error', message: e.message });
  }
});

// List models
app.get('/v1/models', authenticate, (req, res) => {
  res.json({
    object: 'list',
    data: [
      { id: 'inno-ai-boyong-4.5', object: 'model', owned_by: 'innovatehub', description: 'Most capable model for complex tasks' },
      { id: 'inno-ai-boyong-4.0', object: 'model', owned_by: 'innovatehub', description: 'Balanced performance and speed' },
      { id: 'inno-ai-boyong-mini', object: 'model', owned_by: 'innovatehub', description: 'Fast and efficient for simple tasks' }
    ]
  });
});

// ==================== ADMIN ENDPOINTS ====================

// Admin: Get analytics
app.get('/admin/analytics', adminAuth, (req, res) => {
  const analytics = loadAnalytics();
  const uptime = Date.now() - analytics.startTime;
  
  // Get last 24 hours of hourly data
  const last24Hours = {};
  for (let i = 23; i >= 0; i--) {
    const hour = new Date(Date.now() - i * 3600000).toISOString().slice(0, 13);
    last24Hours[hour] = analytics.requestsByHour[hour] || 0;
  }
  
  // Get last 7 days
  const last7Days = {};
  for (let i = 6; i >= 0; i--) {
    const day = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    last7Days[day] = analytics.requestsByDay[day] || 0;
  }
  
  res.json({
    ...analytics,
    uptime_ms: uptime,
    uptime_human: formatUptime(uptime),
    last24Hours,
    last7Days
  });
});

// Admin: Get logs
app.get('/admin/logs', adminAuth, (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  const logs = loadLogs();
  res.json(logs.slice(-limit).reverse());
});

// Admin: Reset analytics
app.post('/admin/reset', adminAuth, (req, res) => {
  fs.writeFileSync(ANALYTICS_FILE, JSON.stringify({ 
    totalRequests: 0, 
    totalTokens: 0, 
    totalPromptTokens: 0,
    totalCompletionTokens: 0,
    requestsByModel: {},
    requestsByHour: {},
    requestsByDay: {},
    startTime: Date.now()
  }));
  fs.writeFileSync(LOGS_FILE, JSON.stringify([]));
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
      pid: process.pid
    });
  } catch (e) {
    res.json({ error: e.message });
  }
});

// Admin: Playground (test endpoint - also logs with 'playground' source)
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
      if (jsonResponse.result?.payloads?.[0]?.text) {
        responseText = jsonResponse.result.payloads[0].text;
      } else {
        responseText = output;
      }
      if (jsonResponse.result?.meta?.agentMeta?.usage) {
        const u = jsonResponse.result.meta.agentMeta.usage;
        usage = { prompt_tokens: u.input || 0, completion_tokens: u.output || 0, total_tokens: u.total || 0 };
      }
    } catch {
      responseText = output;
    }
    
    const brandedModel = MODEL_BRANDING[model] || 'inno-ai-boyong-4.5';
    const latency = Date.now() - startTime;
    
    // Log playground requests too
    logRequest({
      id: requestId,
      model: brandedModel,
      source: 'playground',
      promptPreview: prompt.substring(0, 100),
      responsePreview: responseText.substring(0, 100),
      promptTokens: usage.prompt_tokens,
      completionTokens: usage.completion_tokens,
      totalTokens: usage.total_tokens,
      latency,
      status: 'success'
    });
    
    res.json({
      model: brandedModel,
      response: responseText.trim(),
      usage
    });
    
  } catch (e) {
    const latency = Date.now() - startTime;
    logRequest({
      id: uuidv4(),
      model: model || 'unknown',
      source: 'playground',
      promptPreview: messages[0]?.content?.substring(0, 100) || '',
      error: e.message,
      latency,
      status: 'error'
    });
    res.status(500).json({ error: e.message });
  }
});

// Serve admin UI
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🤖 InnovateHub AI Gateway v2.0.0 running on port ${PORT}`);
  console.log(`   Admin UI: http://localhost:${PORT}/admin`);
  console.log(`   API Key: ${API_KEY.substring(0,10)}...`);
  console.log(`   Admin Key: ${ADMIN_KEY.substring(0,10)}...`);
});
