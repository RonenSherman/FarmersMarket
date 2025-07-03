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

    let captureResult;
    if (authData.provider === 'square') {
      captureResult = await captureSquarePayment(authData.authorizationId, connection.access_token_hash);
    } else if (authData.provider === 'stripe') {
      captureResult = await captureStripePayment(authData.authorizationId, connection.access_token_hash, connection.provider_account_id);
    } else {
      return NextResponse.json(
        { error: 'Unsupported payment provider' },
        { status: 400 }
      );
    }

    if (!captureResult.success) {
      return NextResponse.json(
        { error: captureResult.error },
        { status: 400 }
      );
    }

    // Update order status
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        payment_status: 'paid',
        order_status: 'confirmed',
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
        provider_transaction_id: captureResult.transactionId,
        transaction_type: 'capture',
        amount: Math.round(order.total * 100),
        currency: 'USD',
        status: 'succeeded',
        payment_method_type: 'card',
        provider_fee: captureResult.fee,
        net_amount: captureResult.netAmount,
        processed_at: new Date().toISOString(),
        metadata: captureResult.metadata || {}
      });

    return NextResponse.json({
      success: true,
      transactionId: captureResult.transactionId,
      amount: order.total,
      message: 'Payment captured successfully'
    });

  } catch (error) {
    console.error('Payment capture error:', error);
    return NextResponse.json(
      { error: 'Payment capture failed' },
      { status: 500 }
    );
  }
}

async function captureSquarePayment(paymentId: string, accessToken: string) {
  try {
    const squareApiUrl = process.env.NODE_ENV === 'production'
      ? `https://connect.squareup.com/v2/payments/${paymentId}/complete`
      : `https://connect.squareupsandbox.com/v2/payments/${paymentId}/complete`;

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
      console.error('Square capture error:', result);
      return {
        success: false,
        error: result.errors?.[0]?.detail || 'Square payment capture failed'
      };
    }

    return {
      success: true,
      transactionId: result.payment.id,
      fee: result.payment.processing_fee?.[0]?.amount_money?.amount || 0,
      netAmount: result.payment.amount_money.amount - (result.payment.processing_fee?.[0]?.amount_money?.amount || 0),
      metadata: {
        square_payment_id: result.payment.id,
        receipt_number: result.payment.receipt_number
      }
    };

  } catch (error) {
    console.error('Square capture error:', error);
    return {
      success: false,
      error: 'Square payment capture failed'
    };
  }
}

async function captureStripePayment(paymentIntentId: string, accessToken: string, accountId: string) {
  try {
    const response = await fetch(`https://api.stripe.com/v1/payment_intents/${paymentIntentId}/capture`, {
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
      console.error('Stripe capture error:', result);
      return {
        success: false,
        error: result.error?.message || 'Stripe payment capture failed'
      };
    }

    const charge = result.charges?.data?.[0];
    return {
      success: true,
      transactionId: result.id,
      fee: charge?.balance_transaction?.fee || 0,
      netAmount: charge?.balance_transaction?.net || 0,
      metadata: {
        stripe_payment_intent_id: result.id,
        stripe_charge_id: charge?.id
      }
    };

  } catch (error) {
    console.error('Stripe capture error:', error);
    return {
      success: false,
      error: 'Stripe payment capture failed'
    };
  }
} 