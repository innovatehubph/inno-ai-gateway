import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'InnovateHub AI Gateway',
  description: 'Multimodal AI Gateway API Documentation',
  ignoreDeadLinks: true,
  
  head: [
    ['link', { rel: 'icon', href: '/favicon.ico' }],
    ['meta', { name: 'theme-color', content: '#6366f1' }],
  ],

  themeConfig: {
    logo: '/logo.svg',
    
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'API Reference', link: '/api/overview' },
      { text: 'Models', link: '/models/overview' },
      { text: 'Playground', link: 'https://ai-gateway.innoserver.cloud/admin' }
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Introduction',
          items: [
            { text: 'Getting Started', link: '/guide/getting-started' },
            { text: 'Authentication', link: '/guide/authentication' },
            { text: 'Rate Limits', link: '/guide/rate-limits' },
            { text: 'Error Handling', link: '/guide/errors' }
          ]
        },
        {
          text: 'Tutorials',
          items: [
            { text: 'Chat Completions', link: '/guide/chat' },
            { text: 'Image Generation', link: '/guide/images' },
            { text: 'Video Generation', link: '/guide/video' },
            { text: '3D Generation', link: '/guide/3d' },
            { text: 'Audio', link: '/guide/audio' }
          ]
        }
      ],
      '/api/': [
        {
          text: 'API Reference',
          items: [
            { text: 'Overview', link: '/api/overview' },
            { text: 'Chat', link: '/api/chat' },
            { text: 'Images', link: '/api/images' },
            { text: 'Video', link: '/api/video' },
            { text: '3D Models', link: '/api/3d' },
            { text: 'Audio', link: '/api/audio' },
            { text: 'Embeddings', link: '/api/embeddings' }
          ]
        }
      ],
      '/models/': [
        {
          text: 'Models',
          items: [
            { text: 'Overview', link: '/models/overview' },
            { text: 'Chat Models', link: '/models/chat' },
            { text: 'Image Models', link: '/models/images' },
            { text: 'Video Models', link: '/models/video' },
            { text: '3D Models', link: '/models/3d' },
            { text: 'Audio Models', link: '/models/audio' }
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/innovatehubph/inno-ai-gateway' }
    ],

    footer: {
      message: 'Powered by InnovateHub Philippines',
      copyright: 'Copyright © 2026 InnovateHub'
    },

    search: {
      provider: 'local'
    }
  }
})
