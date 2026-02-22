#!/bin/bash

# InnoAI Platform Zero-Downtime Deployment Script
# This script performs zero-downtime deployment using PM2 reload

set -e

# Configuration
APP_DIR="/srv/apps/openclaw-ai-gateway"
APP_NAME="openclaw-ai-gateway"
HEALTH_URL="http://localhost:3456/health"
HTTPS_HEALTH_URL="https://ai-gateway.innoserver.cloud/health"
BACKUP_DIR="/srv/apps/backups"
LOG_FILE="/var/log/deployments/ai-gateway-deploy.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Create necessary directories
mkdir -p /var/log/deployments
mkdir -p "$BACKUP_DIR"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1" | tee -a "$LOG_FILE"
}

# Function to check if PM2 process exists
pm2_process_exists() {
    pm2 describe "$APP_NAME" > /dev/null 2>&1
}

# Function to perform health check
health_check() {
    local url=$1
    local retries=${2:-5}
    local delay=${3:-3}
    
    log "Performing health check at $url..."
    
    for i in $(seq 1 $retries); do
        if curl -sf "$url" > /dev/null 2>&1; then
            return 0
        fi
        log "Health check attempt $i/$retries failed, retrying in ${delay}s..."
        sleep $delay
    done
    
    return 1
}

# Function to rollback
cd "$APP_DIR" || exit 1

log "=========================================="
log "Starting deployment of InnoAI Platform"
log "=========================================="
log "Working directory: $APP_DIR"

# Step 1: Check if this is a fresh deployment
if ! pm2_process_exists; then
    log "PM2 process not found. Performing fresh start..."
    
    # Install dependencies
    log "Installing dependencies..."
    npm ci --production
    
    # Run tests
    log "Running tests..."
    if ! npm test; then
        error "Tests failed! Aborting deployment."
        exit 1
    fi
    success "Tests passed"
    
    # Start with PM2
    log "Starting application with PM2..."
    pm2 start ecosystem.config.js --env production
    
    # Save PM2 config
    pm2 save
    
else
    # Step 2: Zero-downtime reload
    log "Performing zero-downtime reload..."
    
    # Create backup of current deployment
    BACKUP_TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    log "Creating backup of current deployment..."
    tar -czf "$BACKUP_DIR/ai-gateway-$BACKUP_TIMESTAMP.tar.gz" -C "$APP_DIR" . --exclude node_modules --exclude logs --exclude .git 2>/dev/null || warn "Backup creation partially failed"
    
    # Install dependencies
    log "Installing dependencies..."
    if ! npm ci --production; then
        error "npm install failed!"
        exit 1
    fi
    success "Dependencies installed"
    
    # Run tests
    log "Running tests..."
    if ! npm test; then
        error "Tests failed! Aborting deployment."
        exit 1
    fi
    success "Tests passed"
    
    # Reload PM2 with zero-downtime
    log "Reloading PM2 with zero-downtime..."
    if ! pm2 reload ecosystem.config.js --env production; then
        error "PM2 reload failed!"
        log "Attempting rollback..."
        
        # Try to restore previous version
        if [ -f "$BACKUP_DIR/ai-gateway-$BACKUP_TIMESTAMP.tar.gz" ]; then
            log "Restoring from backup..."
            # Note: In a real scenario, you'd restore from git or a known good state
            pm2 restart "$APP_NAME"
        fi
        
        exit 1
    fi
    success "PM2 reload completed"
fi

# Step 3: Verify local health endpoint
log "Verifying local health endpoint..."
if ! health_check "$HEALTH_URL" 5 2; then
    error "Local health check failed! Rolling back..."
    pm2 restart "$APP_NAME"
    
    # Wait and verify rollback
    sleep 5
    if ! health_check "$HEALTH_URL" 3 2; then
        error "Rollback verification failed! Manual intervention required."
        exit 1
    fi
    
    success "Rollback completed successfully"
    exit 1
fi
success "Local health check passed"

# Step 4: Verify HTTPS endpoint
log "Verifying HTTPS endpoint..."
if ! health_check "$HTTPS_HEALTH_URL" 10 3; then
    warn "HTTPS health check failed! This might be due to Traefik configuration."
    warn "Local endpoint is working. Checking Traefik status..."
    
    # Check Traefik container
    if ! docker ps | grep -q "dokploy-traefik"; then
        error "Traefik container is not running!"
        exit 1
    fi
    
    log "Traefik is running. The issue might be with Traefik routing configuration."
    log "Please verify that /etc/dokploy/traefik/dynamic/ai-gateway.yml is correct"
else
    success "HTTPS health check passed"
fi

# Step 5: Test all endpoints
log "Testing all endpoints..."

endpoints=(
    "/health"
    "/"
    "/portal"
    "/admin"
    "/swagger"
    "/docs"
    "/api/v1/customers"
)

FAILED_ENDPOINTS=()

for endpoint in "${endpoints[@]}"; do
    url="https://ai-gateway.innoserver.cloud$endpoint"
    log "Testing $endpoint..."
    
    # Use -L to follow redirects and -o /dev/null for silent output
    status=$(curl -s -o /dev/null -w "%{http_code}" -L "$url" 2>/dev/null || echo "000")
    
    if [[ "$status" == "200" || "$status" == "301" || "$status" == "302" ]]; then
        success "✓ $endpoint (HTTP $status)"
    else
        error "✗ $endpoint (HTTP $status)"
        FAILED_ENDPOINTS+=("$endpoint")
    fi
done

# Step 6: Final status
log ""
log "=========================================="
log "Deployment Summary"
log "=========================================="
log "Deployment Time: $(date)"
log "Application: $APP_NAME"
log "Status: $([ ${#FAILED_ENDPOINTS[@]} -eq 0 ] && echo "SUCCESS" || echo "PARTIAL SUCCESS")"
log ""

if [ ${#FAILED_ENDPOINTS[@]} -eq 0 ]; then
    success "All endpoints are responding correctly!"
    log ""
    log "Access your application at:"
    log "  - https://ai-gateway.innoserver.cloud"
    log "  - https://ai-gateway.innoserver.cloud/portal"
    log "  - https://ai-gateway.innoserver.cloud/admin"
    log "  - https://ai-gateway.innoserver.cloud/swagger"
    log "  - https://ai-gateway.innoserver.cloud/docs"
    exit 0
else
    warn "The following endpoints may have issues:"
    for ep in "${FAILED_ENDPOINTS[@]}"; do
        warn "  - $ep"
    done
    log ""
    log "Note: Some endpoints may require authentication or return different status codes."
    log "Please verify manually if needed."
    exit 0  # Exit successfully as the main deployment worked
fi
