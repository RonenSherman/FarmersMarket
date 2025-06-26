# OAuth Payment Integration Setup

This document outlines the setup process for integrating Square and Stripe OAuth payment processing into the Duvall Farmers Market application.

## Overview

The application now supports vendor payment connections through OAuth flows with Square and Stripe. Vendors can securely connect their payment accounts during signup, and the admin can process payments directly through their connected accounts.

## Database Setup

1. Apply the payment OAuth schema:
```sql
-- Run the following SQL in your Supabase SQL editor
-- File: database/payment-oauth-schema.sql
```

## Environment Variables

Add the following environment variables to your `.env.local` file:

```env
# Square OAuth Configuration
SQUARE_CLIENT_ID=your_square_client_id
SQUARE_CLIENT_SECRET=your_square_client_secret
SQUARE_WEBHOOK_SIGNATURE_KEY=your_square_webhook_signature_key

# Stripe OAuth Configuration  
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_CLIENT_ID=your_stripe_client_id
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
APP_SECRET_KEY=your_app_secret_key_for_encryption
```

## Square Setup

1. **Create Square Application:**
   - Go to [Square Developer Dashboard](https://developer.squareup.com/apps)
   - Create a new application
   - Note your Application ID (Client ID) and Application Secret (Client Secret)

2. **Configure OAuth Settings:**
   - In your Square app settings, add redirect URIs:
     - `http://localhost:3000/api/oauth/square/callback` (development)
     - `https://yourdomain.com/api/oauth/square/callback` (production)
   - Set required OAuth permissions:
     - `MERCHANT_PROFILE_READ`
     - `PAYMENTS_WRITE`
     - `ORDERS_WRITE`

3. **Webhook Configuration:**
   - Add webhook endpoint: `/api/webhooks/square`
   - Subscribe to relevant events (payment.created, payment.updated, etc.)

## Stripe Setup

1. **Create Stripe Application:**
   - Go to [Stripe Connect Dashboard](https://dashboard.stripe.com/connect/applications)
   - Create a new Connect application
   - Note your Client ID and API keys

2. **Configure OAuth Settings:**
   - Add redirect URIs in your Stripe Connect settings:
     - `http://localhost:3000/api/oauth/stripe/callback` (development)
     - `https://yourdomain.com/api/oauth/stripe/callback` (production)
   - Set required OAuth scopes:
     - `read_write` (for full payment processing)

3. **Webhook Configuration:**
   - Add webhook endpoint: `/api/webhooks/stripe`
   - Subscribe to Connect events and payment events

## Security Considerations

1. **Token Encryption:**
   - Currently using basic Base64 encoding for demo purposes
   - In production, implement proper encryption using `APP_SECRET_KEY`
   - Consider using services like AWS KMS or similar for key management

2. **State Validation:**
   - OAuth state parameters include timestamp and vendor ID validation
   - Implement additional CSRF protection as needed

3. **Webhook Verification:**
   - All webhook endpoints should verify signatures
   - Implement idempotency checks for webhook processing

## API Endpoints

### OAuth Flow Endpoints
- `GET /api/oauth/square/callback` - Square OAuth callback
- `POST /api/oauth/square/exchange` - Exchange Square authorization code
- `GET /api/oauth/stripe/callback` - Stripe OAuth callback  
- `POST /api/oauth/stripe/exchange` - Exchange Stripe authorization code

### Payment Processing
- `POST /api/payments/process` - Process payment for confirmed orders

### Webhook Handlers (to be implemented)
- `POST /api/webhooks/square` - Handle Square webhooks
- `POST /api/webhooks/stripe` - Handle Stripe webhooks

## Testing

1. **Development Mode:**
   - Square: Uses sandbox environment automatically
   - Stripe: Uses test mode with test API keys

2. **Test OAuth Flow:**
   - Navigate to `/vendor-signup`
   - Complete vendor information
   - Test Square/Stripe OAuth connections
   - Verify database records are created correctly

3. **Test Payment Processing:**
   - Create test orders through the shop
   - Use admin interface to confirm orders
   - Verify payments are processed through connected accounts

## Deployment Notes

1. **Environment Variables:**
   - Ensure all production API keys are properly set
   - Update `NEXT_PUBLIC_APP_URL` to your production domain

2. **Webhook URLs:**
   - Update webhook URLs in Square/Stripe dashboards to production endpoints
   - Verify webhook signature validation is working

3. **SSL/HTTPS:**
   - OAuth callbacks require HTTPS in production
   - Ensure proper SSL certificate configuration

## Troubleshooting

### Common Issues

1. **OAuth Redirect Mismatch:**
   - Verify redirect URIs match exactly in provider settings
   - Check for trailing slashes and protocol mismatches

2. **Token Exchange Failures:**
   - Verify client secrets are correct
   - Check API version compatibility
   - Review webhook signature validation

3. **Database Connection Issues:**
   - Ensure payment-oauth-schema.sql has been applied
   - Verify Supabase RLS policies allow proper access
   - Check foreign key constraints

### Debug Mode

Enable debug logging by setting:
```env
NODE_ENV=development
DEBUG=oauth:*
```

## Next Steps

1. Implement webhook handlers for real-time payment updates
2. Add payment refund functionality
3. Implement proper token encryption/decryption
4. Add payment analytics and reporting
5. Set up monitoring and alerting for payment failures 