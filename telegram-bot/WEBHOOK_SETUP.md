# 🌉 TELEGRAM WEBHOOK SETUP

## Set Webhook URL

To connect Telegram to our webhook server, run:

```bash
curl -X POST "https://api.telegram.org/bot8396066132:AAHik8KFcTLkHGVkc91tV20-UYy2IOiJoAg/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://ai-gateway.innoserver.cloud:3002/webhook"}'
```

## Check Webhook Status

```bash
curl "https://api.telegram.org/bot8396066132:AAHik8KFcTLkHGVkc91tV20-UYy2IOiJoAg/getWebhookInfo"
```

## Delete Webhook (if needed)

```bash
curl "https://api.telegram.org/bot8396066132:AAHik8KFcTLkHGVkc91tV20-UYy2IOiJoAg/deleteWebhook"
```

## Note on Port 3002

The webhook server runs on port 3002. Make sure:
1. Port 3002 is accessible from internet
2. Your domain points to this server
3. Firewall allows port 3002

Or use a reverse proxy through nginx/traefik.

## Current Setup

Webhook Server: http://localhost:3002
Health Check: http://localhost:3002/health
Pending Check: http://localhost:3002/pending

---

Ready to activate the webhook!
