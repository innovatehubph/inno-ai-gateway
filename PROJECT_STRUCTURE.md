# InnoAI Project Structure

## Overview
This is the organized codebase for the InnoAI Platform - a world-class AI platform for the Philippine market.

```
inno-ai/
├── README.md                 # Project overview and quick start
├── package.json              # Dependencies and scripts
├── .env.example              # Environment variables template
├── .gitignore                # Git ignore rules
│
├── src/                      # Source code
│   ├── server.js            # Main Express server (entry point)
│   │
│   ├── routes/              # API route handlers (empty - routes in server.js)
│   │
│   ├── middleware/          # Express middleware (empty - middleware in server.js)
│   │
│   ├── services/            # Business logic modules
│   │   ├── customer-service.js    # Customer auth & management
│   │   ├── pricing-strategy.js    # Philippine pricing tiers
│   │   └── directpay.js           # DirectPay billing integration
│   │
│   ├── models/              # Data models (empty - using JSON files)
│   │
│   └── utils/               # Utility functions (empty)
│
├── public/                   # Static web assets
│   ├── index.html           # Landing page with 3D animations
│   ├── portal.html          # Customer portal
│   ├── admin.html           # Admin dashboard
│   ├── docs.html            # Documentation viewer
│   │
│   ├── css/                 # Stylesheets
│   ├── js/                  # Client-side JavaScript
│   └── images/              # Images and logos
│       └── logo.png         # InnovateHub logo
│
├── docs/                     # Documentation
│   ├── BRANDING.md          # Brand guidelines
│   ├── API.md               # API documentation
│   ├── QUICK-START.md       # Quick start guide
│   ├── CHANGELOG.md         # Version history
│   │
│   ├── api/                 # API documentation
│   ├── getting-started/     # Getting started guides
│   ├── dashboard/           # Dashboard documentation
│   └── ai-workshop/         # AI workshop materials
│
├── config/                   # Configuration & data files
│   ├── customers.json       # Customer accounts
│   ├── customer-api-keys.json    # API keys
│   ├── customer-usage.json  # Usage tracking
│   ├── directpay.json       # DirectPay configuration
│   └── transactions.json    # Transaction records
│
├── tests/                    # Test files (empty - to be added)
│
└── scripts/                  # Deployment scripts (empty - to be added)
```

## Key Files

### Entry Point
- `src/server.js` - Main Express application server

### Configuration
- Copy `.env.example` to `.env` and fill in your values
- Edit `config/` JSON files for customer data, API keys, etc.

### Services
- `src/services/customer-service.js` - JWT auth, customer CRUD, API key management
- `src/services/pricing-strategy.js` - Philippine Peso pricing tiers
- `src/services/directpay.js` - DirectPay payment processing

### Frontend
- `public/index.html` - Landing page with Three.js animations
- `public/portal.html` - Customer dashboard
- `public/admin.html` - Admin panel

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. Start development server:
   ```bash
   npm run dev
   ```

4. Access the application:
   - Landing: http://localhost:3456
   - Portal: http://localhost:3456/portal
   - Admin: http://localhost:3456/admin
   - API: http://localhost:3456/api

## Next Steps for Development

1. **Add Tests**: Create test files in `tests/` directory
2. **Organize Routes**: Move API routes from `server.js` to `src/routes/`
3. **Add Middleware**: Extract middleware to `src/middleware/`
4. **Documentation**: Build VitePress docs in `docs/.vitepress/`
5. **Scripts**: Add deployment scripts to `scripts/`
