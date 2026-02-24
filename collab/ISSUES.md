# 🐛 KNOWN ISSUES

## 🔴 CRITICAL

### 1. DirectPay Billing ~~Broken~~ ✅ FIXED
**Location:** `/src/services/directpay.js`
**~~Errors:~~**
```
~~[DIRECTPAY] Encryption error: Invalid initialization vector~~
~~[DIRECTPAY] Encryption error: Invalid key length~~
~~[DIRECTPAY] Checkout error: Failed to encrypt payment data~~
```

**~~Impact:~~ Customers cannot complete payments**
**Resolution:**
- ✅ Changed AES-256-CBC to AES-128-CBC
- ✅ Added key/IV length validation
- ✅ Enhanced error messages
- ✅ Tested encryption/decryption
- ✅ Server reloaded with fixes

**Status:** ✅ **FIXED** - Billing now working!
**Fixed:** Feb 22, 2026 at 08:20 UTC
**Duration:** ~2 minutes

---

## 🟡 HIGH

### 2. Missing Pricing Management
**Current:** No way to set custom prices
**Need:** Markup system, model pricing, currency support

### 3. No Usage Limits
**Current:** API keys have no quotas
**Need:** Per-key limits, rate limiting, tier system

### 4. No Webhook Support
**Current:** No async notifications
**Need:** Webhook endpoints for customers

---

## 🟢 MEDIUM

### 5. Incomplete API Compatibility
**Current:** Basic OpenAI compatibility
**Need:** Full spec compliance, all endpoints

### 6. No Streaming Support
**Current:** Only synchronous responses
**Need:** SSE streaming like OpenAI

---

## 📝 Issue Count
- 🔴 Critical: 1
- 🟡 High: 3
- 🟢 Medium: 2
- ⚪ Low: 0

**Total:** 6 issues to address

---

**Last Updated:** Feb 22, 2026
