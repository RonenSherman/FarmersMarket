import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { code, vendorId } = await request.json();

    if (!code || !vendorId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Validate environment variables
    if (!process.env.SQUARE_CLIENT_ID || !process.env.SQUARE_CLIENT_SECRET) {
      console.error('Square credentials not configured');
      return NextResponse.json(
        { error: 'Square credentials not configured' },
        { status: 500 }
      );
    }

    // Exchange authorization code for access token
    const tokenUrl = process.env.NODE_ENV === 'production'
      ? 'https://connect.squareup.com/oauth2/token'
      : 'https://connect.squareupsandbox.com/oauth2/token';

    console.log(`Exchanging Square code with ${tokenUrl}`);
    console.log('Request payload:', {
      client_id: process.env.SQUARE_CLIENT_ID?.substring(0, 10) + '...',
      client_secret: process.env.SQUARE_CLIENT_SECRET?.substring(0, 10) + '...',
      code: code?.substring(0, 10) + '...',
      grant_type: 'authorization_code',
    });

    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Square-Version': '2023-10-18',
      },
      body: JSON.stringify({
        client_id: process.env.SQUARE_CLIENT_ID,
        client_secret: process.env.SQUARE_CLIENT_SECRET,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/square/callback`,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json().catch(() => ({ error: 'Unknown error' }));
      console.error('Square token exchange failed:', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        fullError: JSON.stringify(errorData, null, 2)
      });
      
      // Extract specific error details
      const errorMessage = errorData.errors?.[0]?.detail || errorData.error || tokenResponse.statusText;
      const errorCode = errorData.errors?.[0]?.code || 'UNKNOWN';
      
      console.error('Square error details:', {
        code: errorCode,
        message: errorMessage,
        allErrors: errorData.errors
      });
      
      return NextResponse.json(
        { error: `Token exchange failed: ${errorMessage} (${errorCode})` },
        { status: 400 }
      );
    }

    const tokenData = await tokenResponse.json();
    const { access_token, refresh_token, expires_at, merchant_id } = tokenData;

    // Get merchant profile for additional info
    const merchantResponse = await fetch(
      process.env.NODE_ENV === 'production'
        ? 'https://connect.squareup.com/v2/merchants'
        : 'https://connect.squareupsandbox.com/v2/merchants',
      {
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Square-Version': '2023-10-18',
        },
      }
    );

    let merchantData = null;
    if (merchantResponse.ok) {
      const merchantResult = await merchantResponse.json();
      merchantData = merchantResult.merchant?.[0] || null;
    }

    // Encrypt tokens (in production, use proper encryption)
    const accessTokenHash = Buffer.from(access_token).toString('base64');
    const refreshTokenHash = refresh_token ? Buffer.from(refresh_token).toString('base64') : null;

    // Store connection in database
    const { data: connection, error: connectionError } = await supabase
      .from('payment_connections')
      .insert([
        {
          vendor_id: vendorId,
          provider: 'square',
          provider_account_id: merchant_id,
          access_token_hash: accessTokenHash,
          refresh_token_hash: refreshTokenHash,
          token_expires_at: expires_at ? new Date(expires_at).toISOString() : null,
          scopes: ['MERCHANT_PROFILE_READ', 'PAYMENTS_WRITE', 'ORDERS_WRITE'],
          connection_status: 'active',
          metadata: {
            merchant_name: merchantData?.business_name || '',
            country: merchantData?.country || '',
            currency: merchantData?.currency || 'USD',
          },
        },
      ])
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
        payment_provider: 'square',
        payment_connected: true,
        payment_connection_id: connection.id,
        payment_account_id: merchant_id,
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
    console.error('Square OAuth exchange error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 