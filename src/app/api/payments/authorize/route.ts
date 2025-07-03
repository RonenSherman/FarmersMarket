import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { vendorId } = body;

    if (!vendorId) {
      return NextResponse.json(
        { error: 'Vendor ID is required' },
        { status: 400 }
      );
    }

    // Get vendor's payment connection
    const { data: connection, error: connectionError } = await supabase
      .from('payment_connections')
      .select('*')
      .eq('vendor_id', vendorId)
      .eq('connection_status', 'active')
      .single();

    if (connectionError || !connection) {
      return NextResponse.json(
        { error: 'No active payment connection found for vendor' },
        { status: 404 }
      );
    }

    // Get access token (decrypt if needed)
    const accessTokenHash = connection.access_token_hash;
    
    if (connection.provider === 'square') {
      return await authorizeSquarePayment(body, accessTokenHash, connection);
    } else if (connection.provider === 'stripe') {
      return await authorizeStripePayment(body, accessTokenHash, connection);
    } else {
      return NextResponse.json(
        { error: 'Unsupported payment provider' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Payment authorization error:', error);
    return NextResponse.json(
      { error: 'Payment authorization failed' },
      { status: 500 }
    );
  }
}

async function authorizeSquarePayment(body: any, accessToken: string, connection: any) {
  const { sourceId, amount, currency = 'USD' } = body;

  if (!sourceId || !amount) {
    return NextResponse.json(
      { error: 'Source ID and amount are required for Square payments' },
      { status: 400 }
    );
  }

  try {
    const paymentData = {
      source_id: sourceId,
      amount_money: {
        amount: amount,
        currency: currency
      },
      location_id: connection.metadata?.location_id || connection.provider_account_id,
      autocomplete: false, // This creates an authorization, not a capture
      reference_id: `auth_${Date.now()}`,
      note: 'Farmers Market Order Authorization'
    };

    const squareApiUrl = process.env.NODE_ENV === 'production'
      ? 'https://connect.squareup.com/v2/payments'
      : 'https://connect.squareupsandbox.com/v2/payments';

    const response = await fetch(squareApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Square-Version': '2023-10-18'
      },
      body: JSON.stringify(paymentData)
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Square API error:', result);
      return NextResponse.json(
        { error: result.errors?.[0]?.detail || 'Square payment authorization failed' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      payment: {
        id: result.payment.id,
        status: result.payment.status,
        amount: result.payment.amount_money.amount,
        currency: result.payment.amount_money.currency
      }
    });

  } catch (error) {
    console.error('Square payment error:', error);
    return NextResponse.json(
      { error: 'Square payment authorization failed' },
      { status: 500 }
    );
  }
}

async function authorizeStripePayment(body: any, accessToken: string, connection: any) {
  const { paymentMethodId, amount, currency = 'usd' } = body;

  if (!paymentMethodId || !amount) {
    return NextResponse.json(
      { error: 'Payment method ID and amount are required for Stripe payments' },
      { status: 400 }
    );
  }

  try {
    // Create payment intent with manual capture
    const paymentIntentData = new URLSearchParams({
      amount: amount.toString(),
      currency: currency,
      payment_method: paymentMethodId,
      capture_method: 'manual', // This creates an authorization, not a capture
      confirmation_method: 'manual',
      confirm: 'true',
      description: 'Farmers Market Order Authorization',
      metadata: JSON.stringify({
        vendor_id: connection.vendor_id,
        authorization_type: 'farmers_market_order'
      })
    });

    const response = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Stripe-Version': '2023-10-16',
        'Stripe-Account': connection.provider_account_id
      },
      body: paymentIntentData
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Stripe API error:', result);
      return NextResponse.json(
        { error: result.error?.message || 'Stripe payment authorization failed' },
        { status: 400 }
      );
    }

    // Handle cases where additional authentication is required
    if (result.status === 'requires_action' || result.status === 'requires_source_action') {
      return NextResponse.json({
        success: true,
        requires_action: true,
        client_secret: result.client_secret,
        payment_intent_id: result.id
      });
    }

    return NextResponse.json({
      success: true,
      payment_intent_id: result.id,
      status: result.status,
      amount: result.amount,
      currency: result.currency
    });

  } catch (error) {
    console.error('Stripe payment error:', error);
    return NextResponse.json(
      { error: 'Stripe payment authorization failed' },
      { status: 500 }
    );
  }
} 