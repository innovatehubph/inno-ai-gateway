const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const { DATA_DIR } = require('../config/paths');
const { 
  HF_API_KEY,
  HF_API_TOKEN,
  OPENROUTER_API_KEY,
  MOONSHOT_API_KEY,
  REPLICATE_API_KEY,
  replicate
} = require('../config/providers');
const { 
  IMAGE_TIERS, 
  IMAGE_ALIASES, 
  MODEL_3D_TIERS, 
  MODEL_3D_ALIASES,
  VIDEO_TIERS,
  VIDEO_ALIASES,
  MODEL_BRANDING,
  HF_MODELS
} = require('../config/models');
const {
  callHuggingFace,
  callHuggingFaceChat,
  callOpenRouterChat,
  callMoonshotChat,
  callAntigravityChat,
  fetchOpenRouterModels
} = require('../services/ai-providers');
const { runOpenClaw } = require('../services/openclaw');
const { loadApiKeys, logRequest, checkRateLimit } = require('../utils/data-helpers');

// API key authentication middleware
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

// ==================== CHAT ENDPOINTS ====================

router.post('/chat/completions', authenticate, async (req, res) => {
  const { messages, model, stream = false, temperature, max_tokens } = req.body;
  const startTime = Date.now();
  const requestId = uuidv4();

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array required' });
  }

  const requestedModel = model || 'inno-ai-boyong-4.5';

  // --- Hugging Face Models (hf- prefix) ---
  if (requestedModel.startsWith('hf-')) {
    const hfModelId = requestedModel.substring(3);

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
      return res.status(500).json({ error: 'HuggingFace API error', message: e.message });
    }
  }

  // --- OpenRouter Models (or- prefix) ---
  if (requestedModel.startsWith('or-')) {
    const orModelId = requestedModel.substring(3);

    try {
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
      return res.status(500).json({ error: 'OpenRouter API error', message: e.message });
    }
  }

  // --- MoonshotAI/Kimi Models (kimi- prefix) ---
  if (requestedModel.startsWith('kimi-')) {
    const kimiModelId = requestedModel;

    try {
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
      return res.status(500).json({ error: 'MoonshotAI API error', message: e.message });
    }
  }

  // --- Antigravity/OpenCode Models (antigravity- prefix) ---
  if (requestedModel.startsWith('antigravity-')) {
    const antigravityModelId = requestedModel.substring(12);
    
    try {
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
      return res.status(500).json({ error: 'Antigravity API error', message: e.message });
    }
  }

  // --- OpenAI/GPT Models ---
  const openaiModels = ['gpt-4o', 'gpt-4', 'gpt-3.5-turbo', 'gpt-4o-mini'];
  if (openaiModels.includes(requestedModel) || requestedModel.startsWith('gpt-')) {
    try {
      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: requestedModel,
          messages: messages,
          temperature: temperature || 0.7,
          max_tokens: max_tokens || 4096,
          stream: stream
        })
      });

      if (!openaiResponse.ok) {
        const error = await openaiResponse.text();
        throw new Error(`OpenAI API error: ${error}`);
      }

      if (stream) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        
        const reader = openaiResponse.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(Buffer.from(value));
        }
        res.end();
      } else {
        const data = await openaiResponse.json();
        
        logRequest({
          id: requestId, model: requestedModel, source: 'api', apiKey: req.apiKey,
          promptPreview: messages[messages.length - 1]?.content?.substring(0, 100) || '',
          responsePreview: data.choices?.[0]?.message?.content?.substring(0, 100) || '',
          promptTokens: data.usage?.prompt_tokens || 0,
          completionTokens: data.usage?.completion_tokens || 0,
          totalTokens: data.usage?.total_tokens || 0,
          latency: Date.now() - startTime,
          status: 'success'
        });

        res.json({
          id: `chatcmpl-${requestId}`,
          object: 'chat.completion',
          created: Math.floor(Date.now() / 1000),
          model: requestedModel,
          choices: data.choices,
          usage: data.usage
        });
      }
    } catch (e) {
      if (stream) {
        res.write(`data: ${JSON.stringify({ error: e.message })}\\n\\n`);
        res.end();
      } else {
        res.status(500).json({ error: 'OpenAI API error', message: e.message });
      }
    }
    return;
  }

  // --- Claude Models via OpenRouter ---
  const claudeModels = ['claude-opus-4-5', 'claude-sonnet-4-5', 'claude-haiku-4-5', 'claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'];
  if (claudeModels.includes(requestedModel) || requestedModel.includes('claude')) {
    try {
      const openrouterResponse = await callOpenRouterChat(
        requestedModel,
        messages,
        temperature || 0.7,
        max_tokens || 4096
      );

      const responseText = openrouterResponse.choices?.[0]?.message?.content || '';
      const usage = openrouterResponse.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

      logRequest({
        id: requestId, model: requestedModel, source: 'api', apiKey: req.apiKey,
        promptPreview: messages[messages.length - 1]?.content?.substring(0, 100) || '',
        responsePreview: responseText.substring(0, 100),
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
        latency: Date.now() - startTime,
        status: 'success'
      });

      res.json({
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
      res.status(500).json({ error: 'Claude API error', message: e.message });
    }
    return;
  }

  // --- InnoAI Branded Models (map to OpenRouter) ---
  const innoAiModelMap = {
    'inno-ai-boyong-4.5': 'anthropic/claude-3-opus',
    'inno-ai-boyong-4.0': 'anthropic/claude-3-sonnet',
    'inno-ai-boyong-mini': 'anthropic/claude-3-haiku'
  };
  
  if (innoAiModelMap[requestedModel]) {
    try {
      const openrouterResponse = await callOpenRouterChat(
        innoAiModelMap[requestedModel],
        messages,
        temperature || 0.7,
        max_tokens || 4096
      );

      const responseText = openrouterResponse.choices?.[0]?.message?.content || '';
      const usage = openrouterResponse.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

      logRequest({
        id: requestId, model: requestedModel, source: 'api', apiKey: req.apiKey,
        promptPreview: messages[messages.length - 1]?.content?.substring(0, 100) || '',
        responsePreview: responseText.substring(0, 100),
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
        latency: Date.now() - startTime,
        status: 'success'
      });

      res.json({
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
      res.status(500).json({ error: 'API error', message: e.message });
    }
    return;
  }

  // --- Default: OpenClaw/Claude (fallback) ---
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
        res.write(`data: ${JSON.stringify(chunk)}\\n\\n`);
      }

      res.write('data: [DONE]\\n\\n');
      res.end();

      logRequest({
        id: requestId, model: brandedModel, source: 'api', apiKey: req.apiKey,
        promptPreview: prompt.substring(0, 100), responsePreview: responseText.substring(0, 100),
        promptTokens: usage.prompt_tokens, completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens, latency: Date.now() - startTime, status: 'success',
        fullPrompt: prompt, fullResponse: responseText
      });
    } catch (e) {
      res.write(`data: ${JSON.stringify({ error: e.message })}\\n\\n`);
      res.end();
    }
    return;
  }

  // Non-streaming response
  try {
    const escapedPrompt = prompt.replace(/'/g, "'\\''");
    const cmd = `agent --session-id api-${requestId.substring(0,8)} --message '${escapedPrompt}' --json`;

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

    res.json({
      id: `chatcmpl-${requestId}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: brandedModel,
      choices: [{ index: 0, message: { role: 'assistant', content: responseText.trim() }, finish_reason: 'stop' }],
      usage
    });
  } catch (e) {
    res.status(500).json({ error: 'Gateway error', message: e.message });
  }
});

// ==================== IMAGE ENDPOINTS ====================

router.post('/images/generations', authenticate, async (req, res) => {
  const { prompt, n = 1, size = '1024x1024', response_format = 'url', model = 'image-3' } = req.body;
  const startTime = Date.now();
  const requestId = uuidv4();
  
  if (!prompt) {
    return res.status(400).json({ error: 'prompt is required' });
  }

  let tierKey = model.toLowerCase();
  if (IMAGE_ALIASES[tierKey]) tierKey = IMAGE_ALIASES[tierKey];
  
  const tier = IMAGE_TIERS[tierKey];
  const useReplicate = tier && replicate;

  if (useReplicate) {
    try {
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
      let imageUrls = Array.isArray(output) ? output : [output];
      
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
      // Fall through to HuggingFace fallback
    }
  }

  // Fallback to HuggingFace
  const models = [HF_MODELS.image, HF_MODELS.image_alt];
  let lastError = null;
  
  for (const hfModel of models) {
    try {
      const hfResponse = await callHuggingFace(hfModel, prompt);
      const imageBuffer = await hfResponse.arrayBuffer();
      
      if (imageBuffer.byteLength < 1000) {
        const text = new TextDecoder().decode(imageBuffer);
        if (text.includes('error') || text.includes('loading')) {
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
      lastError = e.message;
      continue;
    }
  }
  
  res.status(500).json({ error: 'Image generation failed', message: lastError });
});

router.get('/images/models', (req, res) => {
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

// ==================== AUDIO ENDPOINTS ====================

router.post('/audio/speech', authenticate, async (req, res) => {
  const { input, model = 'inno-ai-voice-1', voice = 'alloy', response_format = 'mp3' } = req.body;
  const startTime = Date.now();
  const requestId = uuidv4();
  
  if (!input) {
    return res.status(400).json({ error: 'input text is required' });
  }

  // Voice mapping to OpenAI-compatible voice names
  const voiceMap = {
    'alloy': 'alloy',
    'echo': 'echo', 
    'fable': 'fable',
    'onyx': 'onyx',
    'nova': 'nova',
    'shimmer': 'shimmer'
  };
  
  const selectedVoice = voiceMap[voice] || 'alloy';

  try {
    // Use OpenAI's TTS API if available, otherwise return a helpful error
    if (process.env.OPENAI_API_KEY) {
      const openaiResponse = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'tts-1',
          input: input,
          voice: selectedVoice,
          response_format: response_format || 'mp3'
        })
      });

      if (!openaiResponse.ok) {
        const error = await openaiResponse.text();
        throw new Error(`OpenAI TTS error: ${error}`);
      }

      const audioBuffer = await openaiResponse.arrayBuffer();
      
      logRequest({
        id: requestId, model: 'inno-ai-voice-1', source: 'api', apiKey: req.apiKey,
        promptPreview: input.substring(0, 100), type: 'text_to_speech',
        latency: Date.now() - startTime, status: 'success'
      });
      
      res.set('Content-Type', `audio/${response_format || 'mpeg'}`);
      res.send(Buffer.from(audioBuffer));
    } else {
      // Fallback: Return a helpful message about TTS configuration
      res.status(503).json({ 
        error: 'Text-to-speech not configured', 
        message: 'TTS service is not configured. Please contact support or use the chat completions API instead.',
        supported_models: ['inno-ai-voice-1', 'inno-ai-whisper-1'],
        note: 'Voice parameter accepted: ' + selectedVoice
      });
    }
  } catch (e) {
    console.error('[TTS] Error:', e.message);
    res.status(500).json({ 
      error: 'Text to speech failed', 
      message: e.message,
      hint: 'TTS service may be temporarily unavailable. Please try again later.'
    });
  }
});

router.post('/audio/transcriptions', authenticate, async (req, res) => {
  const startTime = Date.now();
  const requestId = uuidv4();
  
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
    res.status(500).json({ error: 'Transcription failed', message: e.message });
  }
});

// ==================== EMBEDDINGS ENDPOINTS ====================

router.post('/embeddings', authenticate, async (req, res) => {
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
    res.status(500).json({ error: 'Embedding generation failed', message: e.message });
  }
});

// ==================== 3D GENERATION ENDPOINTS ====================

router.post('/3d/generations', authenticate, async (req, res) => {
  const { prompt, model = '3d-2', format = 'glb' } = req.body;
  const startTime = Date.now();
  const requestId = uuidv4();
  
  if (!prompt) {
    return res.status(400).json({ error: 'prompt is required' });
  }

  if (!replicate) {
    return res.status(503).json({ 
      error: '3D generation not configured',
      message: 'REPLICATE_API_KEY is required for 3D generation. Get one at replicate.com',
      setup: 'Add REPLICATE_API_KEY to .env file'
    });
  }

  let tierKey = model.toLowerCase();
  if (MODEL_3D_ALIASES[tierKey]) tierKey = MODEL_3D_ALIASES[tierKey];
  
  const tier = MODEL_3D_TIERS[tierKey] || MODEL_3D_TIERS['3d-2'];

  try {
    let input = { prompt };
    
    if (tier.model.includes('hunyuan')) {
      input.generate_type = "Normal";
      input.enable_pbr = true;
      input.face_count = 100000;
    }
    
    const output = await replicate.run(tier.model, { input });
    
    const latency = Date.now() - startTime;
    
    let modelUrl = output;
    if (Array.isArray(output)) modelUrl = output[0];
    if (typeof output === 'object' && output.mesh) modelUrl = output.mesh;
    if (typeof output === 'object' && output.glb) modelUrl = output.glb;
    
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
    res.status(500).json({ error: '3D generation failed', message: e.message });
  }
});

router.post('/3d/image-to-3d', authenticate, async (req, res) => {
  const { image, format = 'glb', steps = 25 } = req.body;
  const startTime = Date.now();
  const requestId = uuidv4();
  
  if (!image) {
    return res.status(400).json({ error: 'image (base64 or URL) is required' });
  }

  if (!replicate) {
    return res.status(503).json({ 
      error: '3D conversion not configured',
      message: 'REPLICATE_API_KEY is required for image-to-3D. Get one at replicate.com',
      setup: 'Add REPLICATE_API_KEY to .env file'
    });
  }

  try {
    let imageInput = image;
    if (!image.startsWith('http') && !image.startsWith('data:')) {
      imageInput = `data:image/png;base64,${image}`;
    }
    
    const output = await replicate.run(
      "tencent/hunyuan-3d-3.1:a2838628b41a2e0ee2eb19b3ea98a40d75f8d7639bf5a1ddd37ea299bb334854",
      {
        input: {
          image: imageInput,
          generate_type: "Normal",
          enable_pbr: true,
          face_count: 100000
        }
      }
    );
    
    const latency = Date.now() - startTime;
    
    let modelUrl = output;
    if (Array.isArray(output)) modelUrl = output[0];
    if (typeof output === 'object' && output.mesh) modelUrl = output.mesh;
    if (typeof output === 'object' && output.glb) modelUrl = output.glb;
    
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
    res.status(500).json({ error: 'Image to 3D conversion failed', message: e.message });
  }
});

router.get('/3d/models', (req, res) => {
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

// ==================== VIDEO GENERATION ENDPOINTS ====================

router.post('/video/generations', authenticate, async (req, res) => {
  const { prompt, image, model = 'video-2', duration = 5 } = req.body;
  const startTime = Date.now();
  const requestId = uuidv4();
  
  if (!prompt && !image) {
    return res.status(400).json({ error: 'prompt or image is required' });
  }

  if (!replicate) {
    return res.status(503).json({ 
      error: 'Video generation not configured',
      message: 'REPLICATE_API_KEY is required for video generation',
      setup: 'Add REPLICATE_API_KEY to .env file'
    });
  }

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
    let input = {};
    if (prompt) input.prompt = prompt;
    if (image) input.image = image;
    if (duration) input.duration = duration;
    
    const output = await replicate.run(tier.model, { input });
    
    const latency = Date.now() - startTime;
    
    let videoUrl = output;
    if (Array.isArray(output)) videoUrl = output[0];
    if (typeof output === 'object' && output.video) videoUrl = output.video;
    
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
    res.status(500).json({ error: 'Video generation failed', message: e.message });
  }
});

router.post('/video/edit', authenticate, async (req, res) => {
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
    let input = { video };
    if (prompt) input.prompt = prompt;
    if (aspect_ratio) input.aspect_ratio = aspect_ratio;
    
    const output = await replicate.run(tier.model, { input });
    
    const latency = Date.now() - startTime;
    
    let videoUrl = output;
    if (typeof output === 'object' && output.video) videoUrl = output.video;
    
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
    res.status(500).json({ error: 'Video editing failed', message: e.message });
  }
});

router.post('/video/add-audio', authenticate, async (req, res) => {
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
    const output = await replicate.run('zsxkib/mmaudio', {
      input: { video, prompt: prompt || '' }
    });
    
    const latency = Date.now() - startTime;
    
    let videoUrl = output;
    if (typeof output === 'object' && output.video) videoUrl = output.video;
    
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
    res.status(500).json({ error: 'Audio generation failed', message: e.message });
  }
});

router.get('/video/models', (req, res) => {
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

router.get('/usage', authenticate, (req, res) => {
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

router.get('/models', authenticate, async (req, res) => {
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

  const models = [
    { id: 'inno-ai-boyong-4.5', object: 'model', owned_by: 'innovatehub', capabilities: ['chat', 'function_calling'], description: 'Most capable chat model' },
    { id: 'inno-ai-boyong-4.0', object: 'model', owned_by: 'innovatehub', capabilities: ['chat'], description: 'Balanced chat model' },
    { id: 'inno-ai-boyong-mini', object: 'model', owned_by: 'innovatehub', capabilities: ['chat'], description: 'Fast chat model' },
    ...imageModels,
    { id: 'image-free', object: 'model', owned_by: 'innovatehub', capabilities: ['image_generation'], description: 'Free tier via HuggingFace (FLUX.1-schnell)', cost: 'FREE' },
    { id: 'inno-ai-voice-1', object: 'model', owned_by: 'innovatehub', capabilities: ['text_to_speech'], description: 'Neural text-to-speech' },
    { id: 'inno-ai-whisper-1', object: 'model', owned_by: 'innovatehub', capabilities: ['speech_to_text'], description: 'Whisper for transcription' },
    { id: 'inno-ai-embed-1', object: 'model', owned_by: 'innovatehub', capabilities: ['embeddings'], description: 'Text embeddings for RAG/search' },
    { id: 'inno-ai-3d-gen', object: 'model', owned_by: 'innovatehub', capabilities: ['text_to_3d'], description: 'Generate 3D models from text (Hunyuan-3D 3.1)' },
    { id: 'inno-ai-3d-convert', object: 'model', owned_by: 'innovatehub', capabilities: ['image_to_3d'], description: 'Convert images to 3D (Hunyuan-3D 3.1)' }
  ];

  if (HF_API_TOKEN) {
    models.push(
      { id: 'hf-mistralai/Mistral-7B-Instruct-v0.2', object: 'model', owned_by: 'huggingface/mistralai', capabilities: ['chat'], description: 'Mistral 7B Instruct - Fast and capable (prefix: hf-)' },
      { id: 'hf-meta-llama/Llama-2-7b-chat-hf', object: 'model', owned_by: 'huggingface/meta', capabilities: ['chat'], description: 'Llama 2 7B Chat - Meta open source model (prefix: hf-)' },
      { id: 'hf-google/gemma-7b-it', object: 'model', owned_by: 'huggingface/google', capabilities: ['chat'], description: 'Gemma 7B - Google open model (prefix: hf-)' },
      { id: 'hf-any-model-id', object: 'model', owned_by: 'huggingface', capabilities: ['chat'], description: 'Use any Hugging Face model by prefixing with hf-' }
    );
  }

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
      models.push(
        { id: 'or-anthropic/claude-3-opus', object: 'model', owned_by: 'openrouter/anthropic', capabilities: ['chat'], description: 'Claude 3 Opus via OpenRouter (prefix: or-)' },
        { id: 'or-openai/gpt-4o', object: 'model', owned_by: 'openrouter/openai', capabilities: ['chat'], description: 'GPT-4o via OpenRouter (prefix: or-)' },
        { id: 'or-any-model-id', object: 'model', owned_by: 'openrouter', capabilities: ['chat'], description: 'Use any OpenRouter model by prefixing with or-' }
      );
    }
  }

  if (MOONSHOT_API_KEY) {
    models.push(
      { id: 'kimi-k2.5', object: 'model', owned_by: 'moonshotai', capabilities: ['chat', 'vision'], description: 'Kimi K2.5 - Most capable model with 256K context' },
      { id: 'kimi-k2', object: 'model', owned_by: 'moonshotai', capabilities: ['chat', 'vision'], description: 'Kimi K2 - Balanced performance and cost' },
      { id: 'kimi-k1.5', object: 'model', owned_by: 'moonshotai', capabilities: ['chat'], description: 'Kimi K1.5 - Fast and cost-effective' }
    );
  }

  const { loadAntigravityCredentials } = require('../config/providers');
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
    models.push(
      { id: 'antigravity-setup-required', object: 'model', owned_by: 'google-antigravity', capabilities: ['chat'], description: '⚠️ Google Antigravity models available - authenticate with openclaw first' }
    );
  }

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

module.exports = router;
