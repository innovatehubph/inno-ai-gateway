---
title: Customers API
description: Manage customers and their access with the InnoAI Customers API
---

# Customers API

The Customers API allows you to manage customer accounts, track their usage, and control their access to your AI services.

## Base URL

```
https://api.innoai.ph/v1
```

## Authentication

All requests require authentication via API key:

```
Authorization: Bearer YOUR_API_KEY
```

## Endpoints

### List Customers

Retrieve a paginated list of customers.

```
GET /customers
```

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | integer | 20 | Number of results per page (max 100) |
| `offset` | integer | 0 | Number of results to skip |
| `status` | string | — | Filter by status: `active`, `inactive`, `suspended` |
| `tier` | string | — | Filter by tier: `free`, `developer`, `startup`, `enterprise` |
| `search` | string | — | Search by name or email |

#### Example Request

```bash
curl https://api.innoai.ph/v1/customers?limit=10&status=active \
  -H "Authorization: Bearer YOUR_API_KEY"
```

#### Example Response

```json
{
  "data": [
    {
      "id": "cust_abc123",
      "name": "Acme Corporation",
      "email": "admin@acme.com",
      "status": "active",
      "tier": "enterprise",
      "created_at": "2026-01-15T08:00:00Z",
      "last_active": "2026-02-21T14:30:00Z",
      "metadata": {
        "industry": "Technology",
        "region": "NCR"
      }
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 10,
    "offset": 0,
    "has_more": true
  }
}
```

### Create Customer

Create a new customer account.

```
POST /customers
```

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Customer or company name |
| `email` | string | Yes | Primary contact email |
| `tier` | string | No | Subscription tier (default: `free`) |
| `metadata` | object | No | Custom key-value pairs |

#### Example Request

```bash
curl -X POST https://api.innoai.ph/v1/customers \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Tech Startup PH",
    "email": "founder@techstartup.ph",
    "tier": "startup",
    "metadata": {
      "industry": "SaaS",
      "employees": 25,
      "region": "Cebu"
    }
  }'
```

#### Example Response

```json
{
  "id": "cust_xyz789",
  "name": "Tech Startup PH",
  "email": "founder@techstartup.ph",
  "status": "active",
  "tier": "startup",
  "api_key": "sk-cust-abc123...",
  "created_at": "2026-02-21T10:00:00Z",
  "metadata": {
    "industry": "SaaS",
    "employees": 25,
    "region": "Cebu"
  }
}
```

### Get Customer

Retrieve details for a specific customer.

```
GET /customers/{customer_id}
```

#### Example Request

```bash
curl https://api.innoai.ph/v1/customers/cust_xyz789 \
  -H "Authorization: Bearer YOUR_API_KEY"
```

#### Example Response

```json
{
  "id": "cust_xyz789",
  "name": "Tech Startup PH",
  "email": "founder@techstartup.ph",
  "status": "active",
  "tier": "startup",
  "created_at": "2026-02-21T10:00:00Z",
  "last_active": "2026-02-21T16:45:00Z",
  "usage": {
    "requests_this_month": 45230,
    "tokens_this_month": 8900000,
    "credits_remaining": 1200.50
  },
  "limits": {
    "daily_requests": 100000,
    "rate_limit": 1000,
    "max_tokens_per_request": 16384
  },
  "metadata": {
    "industry": "SaaS",
    "employees": 25,
    "region": "Cebu"
  }
}
```

### Update Customer

Update customer information.

```
PATCH /customers/{customer_id}
```

#### Request Body

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Customer or company name |
| `email` | string | Primary contact email |
| `tier` | string | Subscription tier |
| `status` | string | Account status |
| `metadata` | object | Custom key-value pairs |

#### Example Request

```bash
curl -X PATCH https://api.innoai.ph/v1/customers/cust_xyz789 \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "tier": "enterprise",
    "metadata": {
      "employees": 50
    }
  }'
```

#### Example Response

```json
{
  "id": "cust_xyz789",
  "name": "Tech Startup PH",
  "email": "founder@techstartup.ph",
  "status": "active",
  "tier": "enterprise",
  "updated_at": "2026-02-21T11:00:00Z",
  "metadata": {
    "industry": "SaaS",
    "employees": 50,
    "region": "Cebu"
  }
}
```

### Delete Customer

Delete a customer account.

```
DELETE /customers/{customer_id}
```

::: warning Permanent Action
Deleting a customer is irreversible. All associated data, including API keys and usage history, will be permanently removed.
:::

#### Example Request

```bash
curl -X DELETE https://api.innoai.ph/v1/customers/cust_xyz789 \
  -H "Authorization: Bearer YOUR_API_KEY"
```

#### Example Response

```json
{
  "id": "cust_xyz789",
  "deleted": true,
  "deleted_at": "2026-02-21T12:00:00Z"
}
```

### Get Customer Usage

Retrieve detailed usage statistics for a customer.

```
GET /customers/{customer_id}/usage
```

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `start_date` | string | 30 days ago | Start date (ISO 8601) |
| `end_date` | string | Today | End date (ISO 8601) |
| `group_by` | string | day | Group by: `hour`, `day`, `week`, `month` |

#### Example Request

```bash
curl "https://api.innoai.ph/v1/customers/cust_xyz789/usage?start_date=2026-02-01&end_date=2026-02-21&group_by=day" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

#### Example Response

```json
{
  "customer_id": "cust_xyz789",
  "period": {
    "start": "2026-02-01T00:00:00Z",
    "end": "2026-02-21T23:59:59Z"
  },
  "summary": {
    "total_requests": 45230,
    "total_tokens": 8900000,
    "total_cost": 1523.50,
    "average_latency_ms": 245
  },
  "breakdown": [
    {
      "date": "2026-02-21",
      "requests": 2100,
      "tokens": 425000,
      "cost": 75.25,
      "by_model": {
        "inno-ai-boyong-4.5": {
          "requests": 1800,
          "tokens": 380000,
          "cost": 68.00
        },
        "inno-flux-1-dev": {
          "requests": 300,
          "cost": 7.25
        }
      }
    }
  ]
}
```

### Get Customer API Keys

List all API keys for a customer.

```
GET /customers/{customer_id}/api-keys
```

#### Example Request

```bash
curl https://api.innoai.ph/v1/customers/cust_xyz789/api-keys \
  -H "Authorization: Bearer YOUR_API_KEY"
```

#### Example Response

```json
{
  "data": [
    {
      "id": "key_abc123",
      "name": "Production",
      "scopes": ["inference:read", "inference:write"],
      "status": "active",
      "last_used": "2026-02-21T16:45:00Z",
      "created_at": "2026-02-21T10:00:00Z"
    }
  ]
}
```

### Create Customer API Key

Create a new API key for a customer.

```
POST /customers/{customer_id}/api-keys
```

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Descriptive name |
| `scopes` | array | Yes | List of permission scopes |
| `expires_at` | string | No | Expiration date (ISO 8601) |

#### Example Request

```bash
curl -X POST https://api.innoai.ph/v1/customers/cust_xyz789/api-keys \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mobile App",
    "scopes": ["inference:read", "inference:write"],
    "expires_at": "2026-12-31T23:59:59Z"
  }'
```

#### Example Response

```json
{
  "id": "key_def456",
  "key": "sk-cust-def456...",
  "name": "Mobile App",
  "scopes": ["inference:read", "inference:write"],
  "status": "active",
  "created_at": "2026-02-21T11:30:00Z",
  "expires_at": "2026-12-31T23:59:59Z"
}
```

### Revoke Customer API Key

Revoke an API key.

```
DELETE /customers/{customer_id}/api-keys/{key_id}
```

#### Example Request

```bash
curl -X DELETE https://api.innoai.ph/v1/customers/cust_xyz789/api-keys/key_def456 \
  -H "Authorization: Bearer YOUR_API_KEY"
```

#### Example Response

```json
{
  "id": "key_def456",
  "revoked": true,
  "revoked_at": "2026-02-21T12:00:00Z"
}
```

### Suspend Customer

Temporarily suspend a customer account.

```
POST /customers/{customer_id}/suspend
```

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `reason` | string | No | Reason for suspension |
| `until` | string | No | Auto-restore date (ISO 8601) |

#### Example Request

```bash
curl -X POST https://api.innoai.ph/v1/customers/cust_xyz789/suspend \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Payment overdue",
    "until": "2026-03-01T00:00:00Z"
  }'
```

#### Example Response

```json
{
  "id": "cust_xyz789",
  "status": "suspended",
  "suspended_at": "2026-02-21T12:00:00Z",
  "suspended_until": "2026-03-01T00:00:00Z",
  "suspension_reason": "Payment overdue"
}
```

### Reactivate Customer

Reactivate a suspended customer account.

```
POST /customers/{customer_id}/reactivate
```

#### Example Request

```bash
curl -X POST https://api.innoai.ph/v1/customers/cust_xyz789/reactivate \
  -H "Authorization: Bearer YOUR_API_KEY"
```

## SDK Examples

### JavaScript

```javascript
import { InnoAI } from '@innoai/sdk';

const client = new InnoAI({ apiKey: 'your-api-key' });

// Create customer
const customer = await client.customers.create({
  name: 'Tech Startup PH',
  email: 'founder@techstartup.ph',
  tier: 'startup'
});

// Get usage
const usage = await client.customers.getUsage(customer.id, {
  startDate: '2026-02-01',
  endDate: '2026-02-21'
});

console.log(usage.summary);
```

### Python

```python
from innoai import InnoAI

client = InnoAI(api_key="your-api-key")

# Create customer
customer = client.customers.create(
    name="Tech Startup PH",
    email="founder@techstartup.ph",
    tier="startup"
)

# Get usage
usage = client.customers.get_usage(
    customer_id=customer.id,
    start_date="2026-02-01",
    end_date="2026-02-21"
)

print(usage.summary)
```

### PHP

```php
<?php
use InnoAI\Client;

$client = new Client(['api_key' => 'your-api-key']);

// Create customer
$customer = $client->customers->create([
    'name' => 'Tech Startup PH',
    'email' => 'founder@techstartup.ph',
    'tier' => 'startup'
]);

// Get usage
$usage = $client->customers->getUsage($customer->id, [
    'start_date' => '2026-02-01',
    'end_date' => '2026-02-21'
]);

echo $usage->summary->total_requests;
```

## Error Responses

### Customer Not Found

```json
{
  "error": {
    "code": "customer_not_found",
    "message": "Customer cust_unknown not found",
    "type": "not_found_error"
  }
}
```

### Invalid Tier

```json
{
  "error": {
    "code": "invalid_tier",
    "message": "Invalid tier 'ultra'. Valid tiers are: free, developer, startup, enterprise",
    "type": "validation_error"
  }
}
```

### Duplicate Email

```json
{
  "error": {
    "code": "duplicate_email",
    "message": "A customer with email 'founder@techstartup.ph' already exists",
    "type": "conflict_error"
  }
}
```

## Webhooks

Subscribe to customer events:

```bash
curl -X POST https://api.innoai.ph/v1/webhooks \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-app.com/webhooks/innoai",
    "events": [
      "customer.created",
      "customer.updated",
      "customer.suspended",
      "customer.usage.threshold"
    ]
  }'
```

### Customer Events

| Event | Description |
|-------|-------------|
| `customer.created` | New customer created |
| `customer.updated` | Customer details updated |
| `customer.deleted` | Customer deleted |
| `customer.suspended` | Customer suspended |
| `customer.reactivated` | Customer reactivated |
| `customer.tier.changed` | Customer tier changed |
| `customer.usage.threshold` | Usage threshold exceeded |

---

**Need help with customer management?** Contact support@innoai.ph
