const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const YAML = require('yamljs');
const swaggerUi = require('swagger-ui-express');

// Load environment variables
require('dotenv').config();

// Base directory
const BASE_DIR = path.resolve(__dirname, '..');

// Load OpenAPI spec
let swaggerDocument = null;
try {
  swaggerDocument = YAML.load(path.join(BASE_DIR, 'docs', 'openapi.yaml'));
} catch (e) {
  console.log('OpenAPI spec not found, Swagger UI will be unavailable');
}

// Data directory setup
const DATA_DIR = path.join(BASE_DIR, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 8095;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(BASE_DIR, 'public')));
app.use('/data', express.static(DATA_DIR));

// Swagger UI - API Documentation
if (swaggerDocument) {
  app.use('/swagger', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info { margin: 30px 0 }
      .swagger-ui .info .title { color: #6366f1 }
    `,
    customSiteTitle: 'InnovateHub AI Gateway - API Docs',
    customfavIcon: '/favicon.ico'
  }));
}

// VitePress Documentation (built static site)
const docsDistPath = path.join(BASE_DIR, 'docs', '.vitepress', 'dist');
if (fs.existsSync(docsDistPath)) {
  app.use('/docs', express.static(docsDistPath));
  app.get('/docs/*', (req, res) => {
    res.sendFile(path.join(docsDistPath, 'index.html'));
  });
}

// Mount all routes from routes/index.js
const routes = require('./routes');
app.use('/', routes);

// DirectPay webhook handler (needs raw body parsing)
const directpay = require('./services/directpay');
app.post('/webhooks/directpay', express.json(), (req, res) => {
  try {
    const signature = req.headers['x-webhook-signature'];
    if (signature && !directpay.verifyWebhookSignature(req.body, signature)) {
      return res.status(401).json({ error: 'Invalid signature' });
    }
    
    const result = directpay.handleWebhook(req.body);
    res.status(200).json(result);
  } catch (e) {
    console.error('[DIRECTPAY WEBHOOK] Error:', e.message);
    res.status(200).json({ success: false, error: e.message });
  }
});

// Static pages
app.get('/docs', (req, res) => {
  res.sendFile(path.join(BASE_DIR, 'public', 'docs.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(BASE_DIR, 'public', 'admin.html'));
});

app.get('/portal', (req, res) => {
  res.sendFile(path.join(BASE_DIR, 'public', 'portal.html'));
});

app.get('/portal/login', (req, res) => {
  res.sendFile(path.join(BASE_DIR, 'public', 'portal.html'));
});

// OpenAPI JSON endpoint
app.get('/openapi.json', (req, res) => {
  if (swaggerDocument) {
    res.json(swaggerDocument);
  } else {
    // Return basic OpenAPI spec if YAML not loaded
    res.json({
      openapi: '3.0.0',
      info: {
        title: 'InnovateHub AI Gateway',
        version: '3.1.0',
        description: 'OpenAI-compatible multimodal AI API powered by InnovateHub Philippines'
      },
      servers: [{ url: 'https://ai-gateway.innoserver.cloud' }],
      paths: {},
      components: {
        securitySchemes: {
          ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'Authorization', description: 'Bearer <API_KEY>' }
        }
      }
    });
  }
});

// OpenAPI YAML endpoint
app.get('/openapi.yaml', (req, res) => {
  res.setHeader('Content-Type', 'text/yaml');
  res.sendFile(path.join(__dirname, 'docs', 'openapi.yaml'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', path: req.path });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🤖 InnovateHub AI Gateway v3.1.0 running on port ${PORT}`);
  console.log(`   Admin UI: http://localhost:${PORT}/admin`);
  console.log(`   Customer Portal: http://localhost:${PORT}/portal`);
  console.log(`   API Docs: http://localhost:${PORT}/docs`);
  console.log(`   Health Check: http://localhost:${PORT}/health`);
});

module.exports = app;
