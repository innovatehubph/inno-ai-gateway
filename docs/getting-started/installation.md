# Installation

## Prerequisites

- Node.js 18+ and npm
- Git
- PM2 (for production)

## Clone the Repository

```bash
git clone https://github.com/innovatehubph/inno-ai-gateway.git
cd inno-ai-gateway
```

## Install Dependencies

```bash
npm install
```

## Configure Environment

```bash
cp .env.example .env
# Edit .env with your API keys:
# - OPENROUTER_API_KEY
# - HF_API_TOKEN
# - MOONSHOT_API_KEY
# - DIRECTPAY credentials (for billing)
```

## Start the Server

### Development
```bash
npm run dev
```

### Production (PM2)
```bash
pm2 start ecosystem.config.js
```

## Verify Installation

```bash
curl http://localhost:3456/health
# Should return: {"status":"ok"}
```

## Access Points

- **API**: http://localhost:3456/v1/
- **Admin Panel**: http://localhost:3456/admin.html
- **Customer Portal**: http://localhost:3456/portal.html
- **API Docs**: http://localhost:3456/docs.html
