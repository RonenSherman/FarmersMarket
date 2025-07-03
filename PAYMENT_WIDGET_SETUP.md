# Payment Widget Integration

This document explains the new payment widget integration that allows customers to securely authorize payments during checkout without storing credit card information.

## Overview

The payment system now supports embedded payment widgets from Square and Stripe that:
- Authorize payments (hold funds) when orders are placed
- Capture payments only when orders are confirmed by admin
- Void/release payments when orders are cancelled
- Never store credit card information in our system

## How It Works

### For Customers (Checkout Flow)

1. **Order Items**: Customer adds items to cart and proceeds to checkout
2. **Enter Information**: Customer fills out delivery and contact information
3. **Authorize Payment**: Customer enters payment information in the secure widget
   - For Square: Uses Square Web Payments SDK
   - For Stripe: Uses Stripe Elements
4. **Payment Authorization**: Payment is authorized (funds held) but not charged
5. **Place Order**: Order is created with `payment_status: 'authorized'`

### For Admin (Order Management)

1. **Confirm Order**: Admin confirms the order is ready for delivery
   - API call to `/api/payments/capture` charges the customer
   - Order status changes to `confirmed` and payment status to `paid`

2. **Cancel Order**: Admin cancels the order
   - API call to `/api/payments/void` releases the authorization
   - Order status changes to `cancelled` and payment status to `cancelled`

## Implementation Details

### Components

- **PaymentWidget**: Main wrapper component that detects vendor's payment provider
- **SquarePaymentWidget**: Handles Square payment authorization using Square SDK
- **StripePaymentWidget**: Handles Stripe payment authorization using Stripe Elements

### API Endpoints

- **POST /api/oauth/config**: Returns payment configuration for vendor's connected account
- **POST /api/payments/authorize**: Creates payment authorization (hold)
- **POST /api/payments/capture**: Captures authorized payment (charge)
- **POST /api/payments/void**: Voids/releases payment authorization

### Database Changes

- Added `payment_authorization_data` field to `orders` table
- Added `authorized` and `cancelled` to payment status enum
- Created `payment_transactions` table to track all payment operations

### Security Features

- Payment tokens/cards are handled entirely by payment processor SDKs
- No credit card information is stored in our database
- Access tokens are encrypted in the database
- Admin authentication required for capture/void operations

## Environment Variables

Ensure these are configured in your environment:

```env
# Square Configuration
NEXT_PUBLIC_SQUARE_CLIENT_ID=your_square_application_id
SQUARE_CLIENT_SECRET=your_square_client_secret

# Stripe Configuration  
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key

# Admin API Key for payment operations
ADMIN_API_KEY=your_secure_admin_key
```

## Customer Experience

1. **Seamless Integration**: Payment widgets load directly in the checkout page
2. **Clear Status**: Customers see authorization status and understand no immediate charge
3. **Security**: All payment data handled by trusted payment processors
4. **Feedback**: Real-time validation and error handling

## Admin Operations

### Confirming Orders (Capturing Payments)

```javascript
const response = await fetch('/api/payments/capture', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    orderId: 'order-uuid',
    adminKey: process.env.ADMIN_API_KEY
  })
});
```

### Cancelling Orders (Voiding Payments)

```javascript
const response = await fetch('/api/payments/void', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    orderId: 'order-uuid',
    adminKey: process.env.ADMIN_API_KEY
  })
});
```

## Error Handling

- Payment authorization failures are shown to customer with specific error messages
- Failed captures/voids are logged and can be retried
- Webhook integration (future) can handle edge cases and payment status updates

## Future Enhancements

- Webhook integration for real-time payment status updates
- Partial refunds for order modifications
- Automatic authorization expiry handling
- Enhanced admin dashboard for payment management
- Support for additional payment processors

## Testing

Use the respective sandbox environments:
- Square: Square Sandbox with test payment methods
- Stripe: Stripe Test Mode with test card numbers

## Support

For payment-related issues:
1. Check payment processor dashboards (Square/Stripe)
2. Review payment transaction logs in the database
3. Verify environment configuration
4. Contact payment processor support if needed 