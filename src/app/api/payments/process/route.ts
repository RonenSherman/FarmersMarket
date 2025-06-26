import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { orderId, vendorId } = await request.json();

    if (!orderId || !vendorId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .eq('vendor_id', vendorId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Get vendor payment connection
    const { data: connection, error: connectionError } = await supabase
      .from('payment_connections')
      .select('*')
      .eq('vendor_id', vendorId)
      .eq('connection_status', 'active')
      .single();

    if (connectionError || !connection) {
      return NextResponse.json(
        { error: 'No active payment connection found for vendor' },
        { status: 400 }
      );
    }

    // Decrypt access token (in production, use proper decryption)
    const accessToken = Buffer.from(connection.access_token_hash, 'base64').toString();

    let paymentResult;
    
    if (connection.provider === 'square') {
      paymentResult = await processSquarePayment(order, accessToken, connection.provider_account_id);
    } else if (connection.provider === 'stripe') {
      paymentResult = await processStripePayment(order, accessToken, connection.provider_account_id);
    } else {
      return NextResponse.json(
        { error: 'Unsupported payment provider' },
        { status: 400 }
      );
    }

    // Store payment transaction record
    const { data: transaction, error: transactionError } = await supabase
      .from('payment_transactions')
      .insert([
        {
          order_id: orderId,
          vendor_id: vendorId,
          provider: connection.provider,
          provider_transaction_id: paymentResult.transactionId,
          amount: order.total,
          currency: 'USD',
          status: paymentResult.status,
          payment_method_type: paymentResult.paymentMethodType || 'card',
          provider_fee: paymentResult.providerFee || null,
          net_amount: paymentResult.netAmount || null,
          processed_at: paymentResult.status === 'succeeded' ? new Date().toISOString() : null,
          metadata: paymentResult.metadata || {},
        },
      ])
      .select()
      .single();

    if (transactionError) {
      console.error('Failed to store transaction:', transactionError);
      // Continue even if transaction storage fails
    }

    // Update order status
    if (paymentResult.status === 'succeeded') {
      await supabase
        .from('orders')
        .update({
          payment_status: 'paid',
          order_status: 'confirmed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);
    }

    return NextResponse.json({
      success: paymentResult.status === 'succeeded',
      transactionId: paymentResult.transactionId,
      status: paymentResult.status,
      amount: order.total,
      provider: connection.provider,
    });

  } catch (error) {
    console.error('Payment processing error:', error);
    return NextResponse.json(
      { error: 'Payment processing failed' },
      { status: 500 }
    );
  }
}

async function processSquarePayment(order: any, accessToken: string, merchantId: string) {
  const baseUrl = process.env.NODE_ENV === 'production'
    ? 'https://connect.squareup.com'
    : 'https://connect.squareupsandbox.com';

  // Create payment request
  const paymentRequest = {
    source_id: 'EXTERNAL', // For admin-confirmed orders
    amount_money: {
      amount: Math.round(order.total * 100), // Convert to cents
      currency: 'USD',
    },
    idempotency_key: `${order.id}-${Date.now()}`,
    note: `Order ${order.order_number} - ${order.customer_name}`,
    reference_id: order.order_number,
  };

  const response = await fetch(`${baseUrl}/v2/payments`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Square-Version': '2023-10-18',
    },
    body: JSON.stringify(paymentRequest),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(`Square payment failed: ${JSON.stringify(result)}`);
  }

  return {
    transactionId: result.payment.id,
    status: result.payment.status === 'COMPLETED' ? 'succeeded' : 'failed',
    paymentMethodType: result.payment.source_type,
    providerFee: result.payment.processing_fee?.[0]?.amount_money?.amount / 100,
    netAmount: (result.payment.amount_money.amount - (result.payment.processing_fee?.[0]?.amount_money?.amount || 0)) / 100,
    metadata: {
      square_payment_id: result.payment.id,
      receipt_number: result.payment.receipt_number,
    },
  };
}

async function processStripePayment(order: any, accessToken: string, accountId: string) {
  // Create payment intent
  const paymentIntentData = new URLSearchParams({
    amount: Math.round(order.total * 100).toString(), // Convert to cents
    currency: 'usd',
    payment_method_types: 'card',
    description: `Order ${order.order_number} - ${order.customer_name}`,
    metadata: JSON.stringify({
      order_id: order.id,
      order_number: order.order_number,
      customer_name: order.customer_name,
    }),
    confirm: 'true',
    payment_method: 'pm_card_visa', // Default for admin-confirmed orders
  });

  const response = await fetch('https://api.stripe.com/v1/payment_intents', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Stripe-Version': '2023-10-16',
      'Stripe-Account': accountId,
    },
    body: paymentIntentData,
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(`Stripe payment failed: ${JSON.stringify(result)}`);
  }

  return {
    transactionId: result.id,
    status: result.status,
    paymentMethodType: result.payment_method?.type || 'card',
    providerFee: result.charges?.data?.[0]?.balance_transaction?.fee / 100,
    netAmount: result.charges?.data?.[0]?.balance_transaction?.net / 100,
    metadata: {
      stripe_payment_intent_id: result.id,
      stripe_charge_id: result.charges?.data?.[0]?.id,
    },
  };
} 