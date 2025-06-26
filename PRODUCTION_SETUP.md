# Production Setup Guide - OAuth Payment Integration

This guide covers the complete setup process for deploying the Square and Stripe OAuth payment integration to production.

## 🗄️ Database Setup

### 1. Apply Production Migration

Run the complete migration script in your Supabase production database:

```sql
-- File: database/production-migration.sql
-- Copy and paste the entire contents into Supabase SQL Editor
```

This migration will:
- ✅ Create all payment-related tables
- ✅ Set up proper indexes and constraints
- ✅ Configure Row Level Security (RLS)
- ✅ Add utility functions
- ✅ Update existing vendor data to be compatible

### 2. Verify Database Schema

After running the migration, verify these tables exist:
- `payment_connections`
- `payment_transactions` 
- `webhook_events`
- Updated `vendors` table with payment columns

## 🔐 Environment Variables

### Production Environment Variables

Set these in your production environment (Vercel, Netlify, etc.):

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_production_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_production_supabase_service_role_key

# Square Production Configuration
SQUARE_CLIENT_ID=your_production_square_client_id
SQUARE_CLIENT_SECRET=your_production_square_client_secret
SQUARE_WEBHOOK_SIGNATURE_KEY=your_production_square_webhook_key
NEXT_PUBLIC_SQUARE_CLIENT_ID=your_production_square_client_id

# Stripe Production Configuration (if using Stripe)
STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_publishable_key
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
STRIPE_CLIENT_ID=your_stripe_connect_client_id
STRIPE_WEBHOOK_SECRET=whsec_your_stripe_webhook_secret
NEXT_PUBLIC_STRIPE_CLIENT_ID=your_stripe_connect_client_id

# Application Configuration
NEXT_PUBLIC_APP_URL=https://your-production-domain.com
APP_SECRET_KEY=your_strong_random_secret_key_for_encryption

# SendGrid (for notifications)
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_FROM_EMAIL=your_verified_sender_email
```

## 🏪 Square Production Setup

### 1. Create Production Square Application

1. Go to [Square Developer Dashboard](https://developer.squareup.com/apps)
2. Create a new application for production
3. Switch to **Production** environment (not Sandbox)

### 2. Configure OAuth Settings

In your Square production app:

**Redirect URIs:**
```
https://your-production-domain.com/api/oauth/square/callback
```

**OAuth Scopes:**
- `MERCHANT_PROFILE_READ`
- `PAYMENTS_WRITE` 
- `ORDERS_WRITE`

### 3. Webhook Configuration

**Webhook URL:**
```
https://your-production-domain.com/api/webhooks/square
```

**Subscribe to Events:**
- `payment.created`
- `payment.updated`
- `order.created`
- `order.updated`

### 4. Get Production Credentials

From your Square production app dashboard:
- **Application ID** → `SQUARE_CLIENT_ID`
- **Application Secret** → `SQUARE_CLIENT_SECRET`
- **Webhook Signature Key** → `SQUARE_WEBHOOK_SIGNATURE_KEY`

## 💳 Stripe Production Setup (Optional)

### 1. Create Stripe Connect Application

1. Go to [Stripe Connect Dashboard](https://dashboard.stripe.com/connect/applications)
2. Create production Connect application
3. Switch to **Live** mode

### 2. Configure OAuth Settings

**Redirect URIs:**
```
https://your-production-domain.com/api/oauth/stripe/callback
```

**OAuth Scopes:**
- `read_write`

### 3. Webhook Configuration

**Webhook URL:**
```
https://your-production-domain.com/api/webhooks/stripe
```

**Subscribe to Events:**
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `account.updated`

## 🚀 Deployment Steps

### 1. Deploy to Production

Deploy your application to your hosting platform (Vercel, Netlify, etc.)

### 2. Verify Configuration

Visit your production site and check:
```
https://your-production-domain.com/api/oauth/config
```

This endpoint will show your OAuth configuration status.

### 3. Test OAuth Flow

1. Go to `/vendor-signup`
2. Complete vendor form
3. Test Square OAuth connection
4. Verify redirect works properly

### 4. Verify Database Records

Check your Supabase production database:
- Vendor records are created
- Payment connections are stored
- All foreign keys work properly

## 🔧 Production Optimizations

### 1. Remove Test Routes

Delete these development-only files:
- `src/app/api/oauth/square/test/route.ts`

### 2. Update Security Headers

Add security headers to your production deployment:

```javascript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/api/oauth/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ]
  },
}
```

### 3. Enable Proper Token Encryption

Update the encryption functions in your API routes to use proper encryption instead of Base64:

```javascript
// Use a proper encryption library like node:crypto
const crypto = require('crypto');

function encryptToken(token) {
  const algorithm = 'aes-256-gcm';
  const key = crypto.scryptSync(process.env.APP_SECRET_KEY, 'salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipher(algorithm, key);
  // ... proper encryption implementation
}
```

## 📊 Monitoring & Logging

### 1. Set Up Error Monitoring

Configure error tracking for OAuth failures:
- Sentry, LogRocket, or similar
- Monitor `/api/oauth/*` routes
- Track payment processing errors

### 2. Database Monitoring

Monitor these metrics:
- Payment connection success rates
- Token expiration events
- Failed OAuth attempts

### 3. Webhook Monitoring

Set up monitoring for:
- Webhook delivery failures
- Processing errors
- Retry attempts

## 🔒 Security Checklist

- ✅ All environment variables are secure
- ✅ OAuth redirect URIs use HTTPS
- ✅ Webhook endpoints verify signatures
- ✅ RLS policies are properly configured
- ✅ Tokens are properly encrypted
- ✅ No test routes in production
- ✅ Error messages don't expose sensitive data

## 🧪 Testing in Production

### 1. Test Square OAuth Flow

1. Create a test vendor account
2. Complete OAuth flow with real Square account
3. Verify database records
4. Test payment processing

### 2. Test Webhook Delivery

1. Create test transactions in Square
2. Verify webhooks are received
3. Check webhook processing logs

### 3. Monitor Performance

- OAuth flow completion times
- Database query performance
- API response times

## 🚨 Troubleshooting

### Common Issues

**OAuth Redirect Fails:**
- Verify redirect URIs match exactly
- Check HTTPS is enabled
- Confirm domain is accessible

**Token Exchange Fails:**
- Verify client secrets are correct
- Check API version compatibility
- Review error logs

**Database Errors:**
- Ensure migration was applied completely
- Check RLS policies
- Verify foreign key constraints

### Debug Tools

**Configuration Check:**
```
GET /api/oauth/config
```

**Database Health:**
```sql
SELECT * FROM get_vendor_payment_status('vendor-uuid');
```

**Webhook Logs:**
Check `webhook_events` table for processing status.

## 📞 Support

For production issues:
1. Check error logs first
2. Verify environment variables
3. Test OAuth configuration endpoint
4. Review database migration status
5. Contact Square/Stripe support if provider-specific issues

---

This production setup ensures a secure, scalable OAuth payment integration ready for live transactions. 