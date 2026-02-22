const crypto = require('crypto');
const fs = require('fs');
const { saveJSON } = require('../utils/data-helpers');

const ACCOUNTS_FILE = '/root/.config/opencode/antigravity-accounts.json';

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

function generateCodeVerifier() {
  return crypto.randomBytes(32).toString('base64url');
}

function generateCodeChallenge(verifier) {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

function generateState(verifier, projectId = null) {
  const stateObj = {
    verifier: verifier,
    projectId: projectId || 'antigravity-project'
  };
  return Buffer.from(JSON.stringify(stateObj)).toString('base64url');
}

function loadAccounts() {
  try {
    if (!fs.existsSync(ACCOUNTS_FILE)) {
      const initialData = { version: 1, accounts: {} };
      saveJSON(ACCOUNTS_FILE, initialData);
      return initialData;
    }
    return JSON.parse(fs.readFileSync(ACCOUNTS_FILE, 'utf8')) || { version: 1, accounts: {} };
  } catch (e) {
    return { version: 1, accounts: {} };
  }
}

function saveAccounts(data) {
  try {
    saveJSON(ACCOUNTS_FILE, data);
  } catch (e) {
    throw e;
  }
}

module.exports = {
  GOOGLE_OAUTH,
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
  loadAccounts,
  saveAccounts,
  ACCOUNTS_FILE
};
