const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const HF_API_KEY = process.env.HF_API_KEY || '';
const HF_API_TOKEN = process.env.HF_API_TOKEN || HF_API_KEY;
const REPLICATE_API_KEY = process.env.REPLICATE_API_KEY || '';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const MOONSHOT_API_KEY = process.env.MOONSHOT_API_KEY || '';
const MOONSHOT_API_URL = 'https://api.moonshot.cn/v1/chat/completions';

const ANTIGRAVITY_ENABLED = process.env.ANTIGRAVITY_ENABLED === 'true' || true;
const ANTIGRAVITY_AUTH_PROFILE = process.env.ANTIGRAVITY_AUTH_PROFILE || 'google-antigravity:admin@tmapp.live';
const ANTIGRAVITY_ENDPOINTS = [
  'https://daily-cloudcode-pa.sandbox.googleapis.com',
  'https://cloudcode-pa.googleapis.com'
];
const ANTIGRAVITY_VERSION = process.env.ANTIGRAVITY_VERSION || '1.15.8';

let replicate = null;
if (REPLICATE_API_KEY) {
  const Replicate = require('replicate');
  replicate = new Replicate({ auth: REPLICATE_API_KEY });
}

// Load Antigravity credentials
async function loadAntigravityCredentials() {
  const fs = require('fs');
  try {
    const authPath = '/root/.config/opencode/antigravity-accounts.json';
    if (!fs.existsSync(authPath)) {
      return null;
    }

    const data = JSON.parse(fs.readFileSync(authPath, 'utf8'));
    let account = null;
    
    if (Array.isArray(data) && data.length > 0) {
      account = data.find(a => a.enabled !== false) || data[0];
    } else if (data.accounts && typeof data.accounts === 'object') {
      const accountId = Object.keys(data.accounts)[0];
      if (accountId) {
        account = data.accounts[accountId];
      }
    }

    if (!account) {
      return null;
    }

    return {
      accessToken: account.accessToken,
      refreshToken: account.refreshToken,
      projectId: account.projectId,
      email: account.email,
      expires: account.expiresAt
    };
  } catch (e) {
    return null;
  }
}

module.exports = {
  HF_API_KEY,
  HF_API_TOKEN,
  REPLICATE_API_KEY,
  OPENROUTER_API_KEY,
  MOONSHOT_API_KEY,
  MOONSHOT_API_URL,
  ANTIGRAVITY_ENABLED,
  ANTIGRAVITY_AUTH_PROFILE,
  ANTIGRAVITY_ENDPOINTS,
  ANTIGRAVITY_VERSION,
  replicate,
  loadAntigravityCredentials
};
