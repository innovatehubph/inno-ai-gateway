const axios = require('axios');
const { 
  HF_API_KEY, 
  HF_API_TOKEN, 
  OPENROUTER_API_KEY,
  MOONSHOT_API_KEY,
  MOONSHOT_API_URL,
  ANTIGRAVITY_ENDPOINTS,
  ANTIGRAVITY_VERSION,
  loadAntigravityCredentials
} = require('../config/providers');

async function callHuggingFace(model, inputs, options = {}) {
  if (!HF_API_KEY) {
    throw new Error('HuggingFace API key not configured. Set HF_API_KEY environment variable.');
  }

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

async function callAntigravityChat(modelId, messages, temperature = 0.7, max_tokens = 4096) {
  const creds = await loadAntigravityCredentials();
  if (!creds) {
    throw new Error('Antigravity credentials not found. Please authenticate with openclaw or check AUTH_PROFILES_PATH.');
  }
  
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
      
      const lines = response.data.split('\\n');
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
      continue;
    }
  }
  
  throw new Error(`All Antigravity endpoints failed. Last error: ${lastError?.message}`);
}

module.exports = {
  callHuggingFace,
  callHuggingFaceChat,
  callOpenRouterChat,
  fetchOpenRouterModels,
  callMoonshotChat,
  callAntigravityChat
};
