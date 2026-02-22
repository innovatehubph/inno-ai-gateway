module.exports = {
  apps: [{
    name: 'openclaw-ai-gateway',
    script: './src/server.js',
    cwd: '/srv/apps/openclaw-ai-gateway',
    
    // Cluster mode for better performance
    instances: 2,
    exec_mode: 'cluster',
    
    // Zero-downtime deployment settings
    wait_ready: true,
    listen_timeout: 10000,
    kill_timeout: 5000,
    
    // Auto-restart on failure
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    
    // Memory management
    max_memory_restart: '500M',
    
    // Environment variables from .env file (loaded by dotenv in app)
    env: {
      NODE_ENV: 'production',
      PORT: 3456
    },
    
    // Error handling
    shutdown_with_message: true,
    
    // Logging
    log_file: '/var/log/pm2/openclaw-ai-gateway/combined.log',
    out_file: '/var/log/pm2/openclaw-ai-gateway/out.log',
    error_file: '/var/log/pm2/openclaw-ai-gateway/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    combine_logs: true,
    
    // Merge logs in cluster mode
    merge_logs: true,
    
    // Time to wait before restarting
    restart_delay: 4000,
    
    // Monitoring
    monitoring: true,
    
    // Source map support for error tracking
    source_map_support: true,
    
    // PM2 internal metrics
    pmx: true,
    
    // Autorestart on crash
    autorestart: true,
    
    // Don't restart if crashing too fast
    exp_backoff_restart_delay: 100,
    
    // Health check configuration
    // The app listens on 'ready' signal after starting
    listen_timeout: 8000,
    
    // PM2 will send 'shutdown' message to app
    kill_timeout: 5000
  }],
  
  deploy: {
    production: {
      user: 'root',
      host: 'localhost',
      ref: 'origin/main',
      repo: 'git@github.com:yourorg/openclaw-ai-gateway.git',
      path: '/srv/apps/openclaw-ai-gateway',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production'
    }
  }
};
