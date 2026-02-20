const express = require('express');
const { exec } = require('child_process');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 8095;
const API_KEY = process.env.API_KEY || 'masipag-ai-gateway-2026';

// Custom branding - show our own model name 😎
const MODEL_BRANDING = {
  'claude-opus-4-5': 'inno-ai-boyong-4.5',
  'claude-sonnet-4': 'inno-ai-boyong-4.0',
  'claude-haiku-4-5': 'inno-ai-boyong-mini',
  'gpt-4o': 'inno-ai-boyong-4.5',
  'gpt-4': 'inno-ai-boyong-4.5',
  'gpt-3.5-turbo': 'inno-ai-boyong-mini'
};

app.use(cors());
app.use(express.json({ limit: '10mb' }));

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

// Simple API key auth
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  const apiKey = req.headers['x-api-key'];
  
  if (apiKey === API_KEY || authHeader === `Bearer ${API_KEY}`) {
    return next();
  }
  res.status(401).json({ error: 'Unauthorized', message: 'Invalid API key' });
}

// Health check (no auth) - InnovateHub branded
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'InnovateHub AI Gateway', 
    version: '1.0.0',
    models: ['inno-ai-boyong-4.5', 'inno-ai-boyong-4.0', 'inno-ai-boyong-mini'],
    powered_by: 'InnovateHub Philippines',
    timestamp: new Date().toISOString() 
  });
});

// Chat completion endpoint (OpenAI-compatible format)
app.post('/v1/chat/completions', authenticate, async (req, res) => {
  const { messages, model, stream = false, thinking } = req.body;
  
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array required' });
  }

  try {
    const requestId = uuidv4();
    
    // Build the prompt from messages
    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
    const prompt = lastUserMessage?.content || '';
    
    // Escape the prompt for shell
    const escapedPrompt = prompt.replace(/'/g, "'\\''" );
    
    // Build openclaw command
    let cmd = `agent --session-id api-${requestId.substring(0,8)} --message '${escapedPrompt}' --json`;
    if (thinking) {
      cmd += ` --thinking ${thinking}`;
    }
    
    console.log(`[API] Request: ${prompt.substring(0, 100)}...`);
    
    const output = await runOpenClaw(cmd, 180000);
    
    // Parse JSON response from openclaw
    let responseText = '';
    let usage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
    
    try {
      const jsonResponse = JSON.parse(output);
      
      // Extract text from result.payloads[0].text
      if (jsonResponse.result?.payloads?.[0]?.text) {
        responseText = jsonResponse.result.payloads[0].text;
      } else if (jsonResponse.reply) {
        responseText = jsonResponse.reply;
      } else {
        responseText = output;
      }
      
      // Extract usage if available
      if (jsonResponse.result?.meta?.agentMeta?.usage) {
        const u = jsonResponse.result.meta.agentMeta.usage;
        usage = {
          prompt_tokens: u.input || 0,
          completion_tokens: u.output || 0,
          total_tokens: u.total || 0
        };
      }
    } catch {
      // If not JSON, use raw output
      responseText = output;
    }
    
    console.log(`[API] Response: ${responseText.substring(0, 100)}...`);
    
    // Return OpenAI-compatible response with custom branding
    const requestedModel = model || 'claude-opus-4-5';
    const brandedModel = MODEL_BRANDING[requestedModel] || 'inno-ai-boyong-4.5';
    
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
    console.error(`[API] Error: ${e.message}`);
    res.status(500).json({ error: 'Gateway error', message: e.message });
  }
});

// List models - with InnovateHub branding
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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🤖 OpenClaw AI Gateway running on port ${PORT}`);
  console.log(`   Using: openclaw agent CLI`);
  console.log(`   API Key: ${API_KEY.substring(0,10)}...`);
});
