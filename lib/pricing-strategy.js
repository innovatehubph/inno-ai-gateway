/**
 * InnovateHub AI Gateway - Philippine Market Pricing Strategy
 * 
 * Based on comprehensive research of:
 * - Replicate.com pricing model
 * - Fal.ai pricing model  
 * - OpenAI/Anthropic API pricing
 * - Philippine market conditions
 * - Competitive markup analysis
 * 
 * @author InnovateHub Inc.
 * @version 1.0.0
 * @date 2026-02-21
 */

const PRICING_STRATEGY = {
  // Market Analysis Summary
  marketAnalysis: {
    competitors: {
      replicate: {
        model: 'Pay-per-use with hardware-based pricing',
        claude37sonnet: { input: '$3.00/million', output: '$0.015/thousand' },
        flux11pro: '$0.04/image',
        fluxdev: '$0.025/image',
        hardware: {
          'Nvidia A100': '$5.04/hr',
          'Nvidia H100': '$5.49/hr',
          'Nvidia L40S': '$3.51/hr',
          'Nvidia T4': '$0.81/hr'
        },
        markupStrategy: '3x-5x on compute costs'
      },
      falai: {
        model: 'Serverless + Dedicated GPU',
        hardware: {
          'H100': '$1.89/hr ($0.0005/s)',
          'H200': '$2.10/hr ($0.0006/s)',
          'A100-40GB': '$0.99/hr ($0.0003/s)'
        },
        videoModels: {
          'wan2.5': '$0.05/second',
          'kling2.5': '$0.07/second',
          'veo3': '$0.40/second'
        },
        imageModels: {
          'seedreamV4': '$0.03/image',
          'fluxKontextPro': '$0.04/image',
          'nanobanana': '$0.0398/image'
        },
        markupStrategy: '2x-4x on compute costs'
      },
      anthropic: {
        model: 'Token-based pricing',
        claudeOpus4: { input: '$5/million', output: '$25/million' },
        claudeSonnet4: { input: '$3/million', output: '$15/million' },
        claudeHaiku4: { input: '$1/million', output: '$5/million' }
      }
    },
    
    // Philippine Market Specifics
    philippineMarket: {
      currency: 'PHP',
      usdToPhpRate: 58.50, // Current rate
      purchasingPowerParity: 0.35, // PHP has lower purchasing power
      marketMaturity: 'emerging',
      averageTechBudget: '₱50,000-500,000/month for SMEs',
      enterpriseBudget: '₱500,000-5,000,000/month',
      
      // Competitive landscape in Philippines
      localCompetitors: [
        'AISensei.ph - ₱5-15 per 1K tokens',
        'ChatGPT PH resellers - ₱500-2000/month',
        'Local AI agencies - ₱50,000-200,000/project'
      ],
      
      priceSensitivity: 'high',
      preferredPayment: ['GCash', 'PayMaya', 'DirectPay', 'Bank Transfer'],
      
      // Markup recommendations based on market
      recommendedMarkups: {
        'cost-plus-low': 1.4,    // 40% margin for volume customers
        'cost-plus-standard': 1.8, // 80% margin for regular customers
        'cost-plus-premium': 2.5,  // 150% margin for premium/enterprise
        'market-competitive': 1.6  // Balanced for Philippine market
      }
    }
  },

  // Our Pricing Strategy
  ourStrategy: {
    baseCostSources: {
      antigravity: {
        description: 'Google OAuth-based free access',
        actualCost: 0,
        infrastructureCost: 0.001, // $0.001 per request (server costs)
        markup: 'N/A - Free tier'
      },
      openrouter: {
        description: 'Third-party API aggregator',
        actualCost: 'varies by model',
        typicalInput: '$3/million tokens',
        typicalOutput: '$15/million tokens',
        markupTarget: 1.6 // 60% margin
      },
      huggingface: {
        description: 'Open source models',
        actualCost: 0, // Free
        infrastructureCost: 0.002, // Higher compute costs
        markup: 'N/A - Free tier'
      },
      moonshot: {
        description: 'MoonshotAI API',
        actualCost: '$3/million tokens',
        markupTarget: 1.5 // 50% margin
      }
    },

    // Final Philippine Pricing (in PHP)
    philippinePricing: {
      chatModels: {
        'inno-ai-boyong-4.5': {
          name: 'Boyong Opus 4.5 (Most Capable)',
          description: 'Via OpenClaw/Anthropic',
          usdInputCost: 5.00,
          usdOutputCost: 25.00,
          phpInputPrice: 465, // ₱465 per million tokens (with 1.6x markup)
          phpOutputPrice: 2325, // ₱2,325 per million tokens
          markupMultiplier: 1.6,
          competitiveAnalysis: 'Cheaper than direct Anthropic access'
        },
        'inno-ai-boyong-4.0': {
          name: 'Boyong Sonnet 4.0 (Balanced)',
          description: 'Via OpenClaw/Anthropic',
          usdInputCost: 3.00,
          usdOutputCost: 15.00,
          phpInputPrice: 280,
          phpOutputPrice: 1400,
          markupMultiplier: 1.6
        },
        'inno-ai-boyong-mini': {
          name: 'Boyong Mini (Fast)',
          description: 'Via OpenClaw/Anthropic',
          usdInputCost: 1.00,
          usdOutputCost: 5.00,
          phpInputPrice: 93,
          phpOutputPrice: 465,
          markupMultiplier: 1.6
        },
        'gemini-pro': {
          name: 'Google Gemini Pro',
          description: 'Via Antigravity (FREE)',
          phpInputPrice: 0,
          phpOutputPrice: 0,
          markupMultiplier: 'N/A',
          note: 'FREE through OAuth integration'
        }
      },

      imageModels: {
        'flux-1.1-pro': {
          name: 'FLUX 1.1 Pro',
          description: 'High-quality image generation',
          usdCost: 0.04,
          phpPrice: 3.75, // ₱3.75 per image
          markupMultiplier: 1.6,
          competitiveAnalysis: 'Matches Replicate pricing'
        },
        'flux-dev': {
          name: 'FLUX Dev',
          description: 'Standard image generation',
          usdCost: 0.025,
          phpPrice: 2.34,
          markupMultiplier: 1.6
        },
        'sd-xl': {
          name: 'Stable Diffusion XL',
          description: 'Via HuggingFace (Free)',
          phpPrice: 0.50, // Nominal fee for compute
          markupMultiplier: 'N/A',
          note: 'Low cost for server maintenance'
        }
      },

      videoModels: {
        'wan-2.1-480p': {
          name: 'Wan 2.1 480p',
          description: 'Video generation',
          usdCostPerSecond: 0.05,
          phpPricePerSecond: 4.68,
          markupMultiplier: 1.6
        },
        'wan-2.1-720p': {
          name: 'Wan 2.1 720p',
          description: 'HD video generation',
          usdCostPerSecond: 0.07,
          phpPricePerSecond: 6.56,
          markupMultiplier: 1.6
        }
      }
    },

    // Subscription Tiers for Philippine Market
    subscriptionTiers: {
      free: {
        name: 'Free',
        pricePHP: 0,
        priceUSD: 0,
        limits: {
          requestsPerDay: 100,
          tokensPerMonth: 10000,
          concurrentRequests: 1,
          models: ['gemini-pro', 'sd-xl']
        },
        features: [
          'Basic AI models',
          'Community support',
          'Standard latency'
        ],
        targetMarket: 'Students, hobbyists, testing'
      },

      starter: {
        name: 'Starter',
        pricePHP: 499,
        priceUSD: 8.53,
        limits: {
          requestsPerDay: 1000,
          tokensPerMonth: 100000,
          concurrentRequests: 3,
          models: ['all-chat', 'basic-image']
        },
        features: [
          'All chat models',
          'Basic image generation',
          'Email support',
          'API access'
        ],
        targetMarket: 'Freelancers, small projects'
      },

      professional: {
        name: 'Professional',
        pricePHP: 1499,
        priceUSD: 25.62,
        limits: {
          requestsPerDay: 10000,
          tokensPerMonth: 1000000,
          concurrentRequests: 10,
          models: ['all']
        },
        features: [
          'All models including premium',
          'Priority processing',
          'Image & video generation',
          'Priority email support',
          'Custom model aliases',
          'Usage analytics'
        ],
        targetMarket: 'SMEs, agencies, developers'
      },

      enterprise: {
        name: 'Enterprise',
        pricePHP: 4999,
        priceUSD: 85.45,
        limits: {
          requestsPerDay: 100000,
          tokensPerMonth: 10000000,
          concurrentRequests: 50,
          models: ['all']
        },
        features: [
          'Unlimited everything',
          'Dedicated support',
          'Custom model deployment',
          'SLA guarantee',
          'On-premise option',
          'SSO integration',
          'Audit logs'
        ],
        targetMarket: 'Large enterprises, government'
      }
    },

    // Usage-Based Pricing (Pay-as-you-go)
    payAsYouGo: {
      enabled: true,
      description: 'For customers who prefer usage-based billing',
      topUpOptions: [
        { amountPHP: 500, bonus: 0, label: '₱500 Starter' },
        { amountPHP: 1000, bonus: 100, label: '₱1,000 + ₱100 Bonus' },
        { amountPHP: 2500, bonus: 500, label: '₱2,500 + ₱500 Bonus' },
        { amountPHP: 5000, bonus: 1500, label: '₱5,000 + ₱1,500 Bonus' },
        { amountPHP: 10000, bonus: 4000, label: '₱10,000 + ₱4,000 Bonus' }
      ],
      
      // Discount tiers based on monthly spend
      volumeDiscounts: {
        '₱10k+': 5,
        '₱50k+': 10,
        '₱100k+': 15,
        '₱500k+': 20,
        '₱1M+': 25
      }
    }
  },

  // Competitive Positioning
  competitiveAdvantages: {
    vsReplicate: [
      'Lower prices for Philippine market (PHP pricing)',
      'Local payment methods (GCash, PayMaya)',
      'Free tier with Gemini models',
      'No credit card required to start'
    ],
    vsFalAi: [
      'Simpler pricing (no hardware tiers)',
      'Integrated chat + image + video',
      'Local support timezone',
      'DirectPay integration'
    ],
    vsDirectAnthropic: [
      'Significantly lower prices (1.6x vs 2.5x+ markup)',
      'More payment options',
      'Local currency billing',
      'No USD conversion fees'
    ]
  },

  // Implementation Notes
  implementation: {
    billingCurrency: 'PHP',
    minimumCharge: 100, // ₱100 minimum
    paymentMethods: [
      'DirectPay (primary)',
      'GCash (coming soon)',
      'PayMaya (coming soon)',
      'Bank Transfer (enterprise)'
    ],
    billingCycle: 'Monthly for subscriptions, immediate for pay-as-you-go',
    invoiceGeneration: 'Automatic on 1st of month',
    gracePeriod: '3 days for subscription renewal',
    
    // Cost optimization strategies
    costOptimization: {
      caching: 'Enable prompt caching (50% discount)',
      batchProcessing: 'Offer 50% discount for batch jobs',
      freeTierLimit: '100 requests/day to prevent abuse',
      rateLimiting: 'Prevent runaway costs'
    }
  }
};

// Export for use in pricing engine
module.exports = PRICING_STRATEGY;
