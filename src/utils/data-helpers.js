const fs = require('fs');
const path = require('path');

const BASE_DIR = path.resolve(__dirname, '..', '..');
const DATA_DIR = path.join(BASE_DIR, 'data');
const CONFIG_DIR = path.join(BASE_DIR, 'config');
const ANALYTICS_FILE = path.join(DATA_DIR, 'analytics.json');
const LOGS_FILE = path.join(DATA_DIR, 'logs.json');
const API_KEYS_FILE = path.join(CONFIG_DIR, 'customer-api-keys.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadJSON(file) {
  try { 
    return JSON.parse(fs.readFileSync(file, 'utf8')); 
  } catch { 
    return null; 
  }
}

function saveJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function loadAnalytics() { 
  return loadJSON(ANALYTICS_FILE) || { 
    totalRequests: 0, 
    totalTokens: 0, 
    totalPromptTokens: 0, 
    totalCompletionTokens: 0, 
    requestsByModel: {}, 
    requestsByHour: {}, 
    requestsByDay: {}, 
    startTime: Date.now() 
  }; 
}

function saveAnalytics(data) { 
  saveJSON(ANALYTICS_FILE, data); 
}

function loadLogs() { 
  return loadJSON(LOGS_FILE) || []; 
}

function saveLogs(logs) { 
  saveJSON(LOGS_FILE, logs.slice(-1000)); 
}

function loadApiKeys() { 
  const data = loadJSON(API_KEYS_FILE);
  if (!data || !data.data) return { keys: {} };
  
  // Convert array format to object format expected by authenticate middleware
  const keys = {};
  data.data.forEach(keyData => {
    if (keyData.key && keyData.status === 'active') {
      keys[keyData.key] = {
        customerId: keyData.customerId,
        name: keyData.name,
        enabled: keyData.status === 'active',
        createdAt: keyData.createdAt,
        lastUsed: keyData.lastUsed,
        usageCount: keyData.usageCount || 0,
        rateLimit: 100 // Default rate limit
      };
    }
  });
  
  return { keys };
}

function saveApiKeys(data) { 
  saveJSON(API_KEYS_FILE, data); 
}

// Rate limiting
const rateLimitStore = new Map();

function checkRateLimit(apiKey, limit = 100) {
  const now = Date.now();
  const windowMs = 60000;
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

module.exports = {
  loadJSON,
  saveJSON,
  loadAnalytics,
  saveAnalytics,
  loadLogs,
  saveLogs,
  loadApiKeys,
  saveApiKeys,
  checkRateLimit,
  logRequest,
  DATA_DIR,
  ANALYTICS_FILE,
  LOGS_FILE,
  API_KEYS_FILE
};
