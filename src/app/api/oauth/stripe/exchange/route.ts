import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const { code, vendorId } = await request.json();

    // Create service role client to bypass RLS
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Missing Supabase configuration:', {
        hasUrl: !!supabaseUrl,
        hasServiceKey: !!serviceRoleKey
      });
      return NextResponse.json(
        { error: 'Database configuration error' },
        { status: 500 }
      );
    }
    
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    if (!code || !vendorId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Validate environment variables
    if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_PUBLISHABLE_KEY) {
      console.error('Stripe credentials not configured');
      return NextResponse.json(
        { error: 'Stripe credentials not configured' },
        { status: 500 }
      );
    }

    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://connect.stripe.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_secret: process.env.STRIPE_SECRET_KEY!,
        code: code,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('Stripe token exchange failed:', errorData);
      return NextResponse.json(
        { error: 'Token exchange failed' },
        { status: 400 }
      );
    }

    const tokenData = await tokenResponse.json();
    const { access_token, refresh_token, stripe_user_id, scope } = tokenData;

    // Get account information
    const accountResponse = await fetch(`https://api.stripe.com/v1/accounts/${stripe_user_id}`, {
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Stripe-Version': '2023-10-16',
      },
    });

    let accountData = null;
    if (accountResponse.ok) {
      accountData = await accountResponse.json();
    }

    // Encrypt tokens (in production, use proper encryption)
    const accessTokenHash = Buffer.from(access_token).toString('base64');
    const refreshTokenHash = refresh_token ? Buffer.from(refresh_token).toString('base64') : null;

    // Store connection in database
    const { data: connection, error: connectionError } = await supabase
      .from('payment_connections')
      .upsert([
        {
          vendor_id: vendorId,
          provider: 'stripe',
          provider_account_id: stripe_user_id,
          access_token_hash: accessTokenHash,
          refresh_token_hash: refreshTokenHash,
          token_expires_at: null, // Stripe tokens don't expire
          scopes: scope ? scope.split(' ') : ['read_write'],
          connection_status: 'active',
          metadata: {
            account_type: accountData?.type || '',
            business_name: accountData?.business_profile?.name || '',
            country: accountData?.country || '',
            currency: accountData?.default_currency || 'USD',
            charges_enabled: accountData?.charges_enabled || false,
            payouts_enabled: accountData?.payouts_enabled || false,
          },
          updated_at: new Date().toISOString(),
        },
      ], {
        onConflict: 'vendor_id,provider'
      })
      .select()
      .single();

    if (connectionError) {
      console.error('Database error:', connectionError);
      return NextResponse.json(
        { error: 'Failed to store connection' },
        { status: 500 }
      );
    }

    // Update vendor record
    const { error: vendorError } = await supabase
      .from('vendors')
      .update({
        payment_provider: 'stripe',
        payment_connected: true,
        payment_connection_id: connection.id,
        payment_account_id: stripe_user_id,
        payment_connected_at: new Date().toISOString(),
        payment_last_verified: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', vendorId);

    if (vendorError) {
      console.error('Vendor update error:', vendorError);
      return NextResponse.json(
        { error: 'Failed to update vendor' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      id: connection.id,
      vendor_id: connection.vendor_id,
      provider: connection.provider,
      provider_account_id: connection.provider_account_id,
      connection_status: connection.connection_status,
      created_at: connection.created_at,
    });

  } catch (error) {
    console.error('Stripe OAuth exchange error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 