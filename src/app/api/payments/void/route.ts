import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { orderId, adminKey } = await request.json();

    // Basic admin authentication (you might want to improve this)
    if (adminKey !== process.env.ADMIN_API_KEY) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, vendors!inner(*)')
      .eq('id', orderId)
      .eq('payment_status', 'authorized')
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Order not found or not authorized' },
        { status: 404 }
      );
    }

    // Parse payment authorization data
    let authData;
    try {
      authData = JSON.parse(order.payment_authorization_data || '{}');
    } catch (e) {
      return NextResponse.json(
        { error: 'Invalid payment authorization data' },
        { status: 400 }
      );
    }

    // Get payment connection for vendor
    const { data: connection, error: connectionError } = await supabase
      .from('payment_connections')
      .select('*')
      .eq('vendor_id', order.vendor_id)
      .eq('provider', authData.provider)
      .eq('connection_status', 'active')
      .single();

    if (connectionError || !connection) {
      return NextResponse.json(
        { error: 'No active payment connection found for vendor' },
        { status: 404 }
      );
    }

    let voidResult;
    if (authData.provider === 'square') {
      voidResult = await voidSquarePayment(authData.authorizationId, connection.access_token_hash);
    } else if (authData.provider === 'stripe') {
      voidResult = await voidStripePayment(authData.authorizationId, connection.access_token_hash, connection.provider_account_id);
    } else {
      return NextResponse.json(
        { error: 'Unsupported payment provider' },
        { status: 400 }
      );
    }

    if (!voidResult.success) {
      return NextResponse.json(
        { error: voidResult.error },
        { status: 400 }
      );
    }

    // Update order status
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        payment_status: 'cancelled',
        order_status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('Failed to update order status:', updateError);
      return NextResponse.json(
        { error: 'Failed to update order status' },
        { status: 500 }
      );
    }

    // Create payment transaction record
    await supabase
      .from('payment_transactions')
      .insert({
        order_id: orderId,
        vendor_id: order.vendor_id,
        provider: authData.provider,
        provider_transaction_id: voidResult.transactionId,
        transaction_type: 'void',
        amount: Math.round(order.total * 100),
        currency: 'USD',
        status: 'succeeded',
        payment_method_type: 'card',
        processed_at: new Date().toISOString(),
        voided_at: new Date().toISOString(),
        metadata: voidResult.metadata || {}
      });

    return NextResponse.json({
      success: true,
      transactionId: voidResult.transactionId,
      amount: order.total,
      message: 'Payment authorization voided successfully'
    });

  } catch (error) {
    console.error('Payment void error:', error);
    return NextResponse.json(
      { error: 'Payment void failed' },
      { status: 500 }
    );
  }
}

async function voidSquarePayment(paymentId: string, accessToken: string) {
  try {
    const squareApiUrl = process.env.NODE_ENV === 'production'
      ? `https://connect.squareup.com/v2/payments/${paymentId}/cancel`
      : `https://connect.squareupsandbox.com/v2/payments/${paymentId}/cancel`;

    const response = await fetch(squareApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Square-Version': '2023-10-18'
      },
      body: JSON.stringify({})
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Square void error:', result);
      return {
        success: false,
        error: result.errors?.[0]?.detail || 'Square payment void failed'
      };
    }

    return {
      success: true,
      transactionId: result.payment.id,
      metadata: {
        square_payment_id: result.payment.id,
        void_reason: 'Order cancelled'
      }
    };

  } catch (error) {
    console.error('Square void error:', error);
    return {
      success: false,
      error: 'Square payment void failed'
    };
  }
}

async function voidStripePayment(paymentIntentId: string, accessToken: string, accountId: string) {
  try {
    const response = await fetch(`https://api.stripe.com/v1/payment_intents/${paymentIntentId}/cancel`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Stripe-Version': '2023-10-16',
        'Stripe-Account': accountId
      }
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Stripe void error:', result);
      return {
        success: false,
        error: result.error?.message || 'Stripe payment void failed'
      };
    }

    return {
      success: true,
      transactionId: result.id,
      metadata: {
        stripe_payment_intent_id: result.id,
        cancellation_reason: 'requested_by_customer'
      }
    };

  } catch (error) {
    console.error('Stripe void error:', error);
    return {
      success: false,
      error: 'Stripe payment void failed'
    };
  }
} 