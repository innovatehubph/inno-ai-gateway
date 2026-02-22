# InnoAI Platform

**AI Models for Every Filipino**

A world-class AI platform built for the Philippine market, featuring Filipino model categories, Philippine Peso pricing, and DirectPay billing integration.

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Or start production server
npm start
```

## Project Structure

```
inno-ai/
├── src/                    # Source code
│   ├── server.js          # Main Express server
│   ├── routes/            # API routes
│   ├── middleware/        # Express middleware
│   ├── services/          # Business logic
│   │   ├── customer-service.js
│   │   ├── pricing-strategy.js
│   │   └── directpay.js
│   └── utils/             # Utility functions
├── public/                # Static assets
│   ├── index.html        # Landing page
│   ├── portal.html       # Customer portal
│   ├── admin.html        # Admin dashboard
│   ├── css/              # Stylesheets
│   ├── js/               # Client-side scripts
│   └── images/           # Images and logos
├── docs/                 # Documentation
├── config/               # Configuration files
│   ├── customers.json
│   ├── customer-api-keys.json
│   └── customer-usage.json
├── tests/                # Test files
└── scripts/              # Deployment scripts
```

## Features

- **Filipino Model Categories**
  - SulatAI (Text Generation)
  - SiningAI (Image Generation)
  - PelikulaAI (Video Generation)
  - TinigAI (Audio Generation)
  - IsipAI (Reasoning)

- **Pricing Tiers (Philippine Peso)**
  - Bayan Starter: Free
  - Developer: ₱499/month
  - Startup: ₱1,499/month
  - Enterprise: ₱4,999/month
  - Bayanihan: Custom pricing for NGOs

- **Authentication**: JWT-based with PBKDF2 password hashing
- **Billing**: DirectPay integration for Philippine payment methods
- **Mobile-First**: Responsive design optimized for mobile devices
- **Animations**: GSAP scroll animations, Three.js 3D effects

## API Endpoints

### Authentication
- `POST /api/customer/auth/register` - Register new customer
- `POST /api/customer/auth/login` - Customer login
- `POST /api/customer/auth/logout` - Customer logout

### API Keys
- `GET /api/customer/api-keys` - List API keys
- `POST /api/customer/api-keys` - Create new API key
- `DELETE /api/customer/api-keys/:id` - Revoke API key

### Billing
- `GET /api/customer/billing/status` - Get billing status
- `POST /api/customer/billing/subscribe` - Subscribe to plan
- `POST /api/customer/billing/topup` - Add credits

### AI Inference
- `POST /api/inference/:category/:model` - Run model inference

## Environment Variables

```env
PORT=3456
JWT_SECRET=your-secret-key
DIRECTPAY_API_KEY=your-directpay-key
DIRECTPAY_MERCHANT_ID=your-merchant-id
```

## Documentation

Visit `/docs` for full documentation.

## License

MIT License - InnoHub Philippines
