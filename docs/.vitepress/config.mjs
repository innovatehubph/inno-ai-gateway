import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'InnoAI Documentation',
  description: 'AI Models for Every Filipino - Philippine AI Model Marketplace',
  
  lang: 'en-US',
  lastUpdated: true,
  
  // Base URL for docs served at /docs
  base: '/docs/',
  
  // Clean URLs without .html extension
  cleanUrls: true,
  
  // Head configuration
  head: [
    ['link', { rel: 'icon', href: '/favicon.ico' }],
    ['meta', { name: 'theme-color', content: '#6366f1' }],
    ['meta', { name: 'og:type', content: 'website' }],
    ['meta', { name: 'og:locale', content: 'en' }],
    ['meta', { name: 'og:title', content: 'InnoAI Documentation | AI Models for Every Filipino' }],
    ['meta', { name: 'og:description', content: 'Comprehensive documentation for InnoAI platform - AI models for every Filipino' }],
  ],

  // Theme configuration
  themeConfig: {
    // Logo
    logo: '/logo.png',
    
    // Navigation
    nav: [
      { text: 'Home', link: '/' },
      { 
        text: 'Getting Started',
        items: [
          { text: 'Overview', link: '/getting-started/overview' },
          { text: 'Quickstart (5 min)', link: '/getting-started/quickstart' },
          { text: 'Installation', link: '/getting-started/installation' },
          { text: 'Configuration', link: '/getting-started/configuration' },
          { text: 'Authentication', link: '/getting-started/authentication' },
          { text: 'Pricing', link: '/getting-started/pricing' },
          { text: 'Access Control', link: '/getting-started/access-control' },
          { text: 'Architecture', link: '/getting-started/architecture' },
        ]
      },
      { 
        text: 'API Reference',
        items: [
          { text: 'Overview', link: '/api/' },
          { text: 'Authentication', link: '/api/authentication' },
          { text: 'Customers', link: '/api/customers' },
          { text: 'Inference', link: '/api/inference' },
          { text: 'Billing', link: '/api/billing' },
          { text: 'Errors', link: '/api/errors' },
          { text: 'Rate Limits', link: '/api/rate-limits' },
          { text: 'REST Endpoints', link: '/api/rest-endpoints' },
          { text: 'AI Proxy', link: '/api/ai-proxy' },
          { text: 'Schemas', link: '/api/schemas' },
        ]
      },
      { 
        text: 'Guide',
        items: [
          { text: 'AI Models', link: '/guide/models' },
          { text: 'Best Practices', link: '/guide/best-practices' },
          { text: 'Webhooks', link: '/guide/webhooks' },
          { text: 'Migration Guide', link: '/guide/migration' },
        ]
      },
      { text: 'Quick Start', link: '/QUICK-START' },
      { text: 'Branding', link: '/BRANDING' },
    ],

    // Sidebar
    sidebar: {
      '/': [
        {
          text: 'Introduction',
          items: [
            { text: 'Home', link: '/' },
            { text: 'Quick Start', link: '/QUICK-START' },
            { text: 'Branding', link: '/BRANDING' },
          ]
        }
      ],
      '/getting-started/': [
        {
          text: 'Getting Started',
          items: [
            { text: 'Overview', link: '/getting-started/overview' },
            { text: 'Quickstart (5 min)', link: '/getting-started/quickstart' },
            { text: 'Installation', link: '/getting-started/installation' },
            { text: 'Configuration', link: '/getting-started/configuration' },
            { text: 'Authentication', link: '/getting-started/authentication' },
            { text: 'Pricing', link: '/getting-started/pricing' },
            { text: 'Access Control', link: '/getting-started/access-control' },
            { text: 'Architecture', link: '/getting-started/architecture' },
          ]
        }
      ],
      '/api/': [
        {
          text: 'API Reference',
          items: [
            { text: 'Overview', link: '/api/' },
            { text: 'Authentication', link: '/api/authentication' },
            { text: 'Customers', link: '/api/customers' },
            { text: 'Inference', link: '/api/inference' },
            { text: 'Billing', link: '/api/billing' },
            { text: 'Errors', link: '/api/errors' },
            { text: 'Rate Limits', link: '/api/rate-limits' },
            { text: 'REST Endpoints', link: '/api/rest-endpoints' },
            { text: 'AI Proxy', link: '/api/ai-proxy' },
            { text: 'Schemas', link: '/api/schemas' },
          ]
        }
      ],
      '/guide/': [
        {
          text: 'Guides',
          items: [
            { text: 'AI Models', link: '/guide/models' },
            { text: 'Best Practices', link: '/guide/best-practices' },
            { text: 'Webhooks', link: '/guide/webhooks' },
            { text: 'Migration Guide', link: '/guide/migration' },
          ]
        }
      ],
    },

    // Search configuration
    search: {
      provider: 'local',
      options: {
        detailedView: true,
        miniSearch: {
          searchOptions: {
            prefix: true,
            fuzzy: 0.2,
          }
        }
      }
    },

    // Social links
    socialLinks: [
      { icon: 'github', link: 'https://github.com/innovatehubph/inno-ai-gateway' },
      { icon: 'twitter', link: 'https://twitter.com/InnoAIph' },
    ],

    // Footer
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2026 InnoHub Philippines'
    },

    // Edit link
    editLink: {
      pattern: 'https://github.com/innovatehubph/inno-ai-gateway/edit/main/docs/:path',
      text: 'Edit this page on GitHub'
    },

    // Last updated text
    lastUpdated: {
      text: 'Updated at',
      formatOptions: {
        dateStyle: 'full',
        timeStyle: 'medium'
      }
    },

    // Outline
    outline: {
      label: 'On this page',
      level: [2, 3]
    },

    // Doc footer
    docFooter: {
      prev: 'Previous page',
      next: 'Next page'
    },

    // Return to top
    returnToTopLabel: 'Return to top',

    // Sidebar menu label
    sidebarMenuLabel: 'Menu',

    // Dark mode switch label
    darkModeSwitchLabel: 'Appearance',

    // Language menu label
    langMenuLabel: 'Change language'
  },

  // Markdown configuration
  markdown: {
    lineNumbers: true,
    config: (md) => {
      // You can add custom markdown plugins here
    }
  },

  // Vite configuration
  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: `
            :root {
              --vp-c-brand-1: #6366f1;
              --vp-c-brand-2: #818cf8;
              --vp-c-brand-3: #a5b4fc;
              --vp-c-brand-soft: #e0e7ff;
              --vp-c-brand: #6366f1;
              --vp-c-brand-light: #818cf8;
              --vp-c-brand-lighter: #a5b4fc;
              --vp-c-brand-dark: #4f46e5;
              --vp-c-brand-darker: #4338ca;
            }
          `
        }
      }
    }
  },

  // Build configuration
  build: {
    outDir: '.vitepress/dist',
    assetsDir: 'assets',
  },

  // Sitemap
  sitemap: {
    hostname: 'https://docs.innoai.ph'
  }
})
