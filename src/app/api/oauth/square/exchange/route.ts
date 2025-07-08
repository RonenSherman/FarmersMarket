import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { customerNotificationService } from '@/lib/customerNotifications';

export async function POST(request: NextRequest) {
  console.log('🔧 Square OAuth exchange started');
  try {
    const { code, vendorId } = await request.json();
    console.log('📋 Exchange parameters:', { 
      hasCode: !!code, 
      vendorId, 
      codeLength: code?.length 
    });

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

    // Get merchant locations - this is critical for the payment widget
    const locationsResponse = await fetch(
      process.env.NODE_ENV === 'production'
        ? 'https://connect.squareup.com/v2/locations'
        : 'https://connect.squareupsandbox.com/v2/locations',
      {
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Square-Version': '2023-10-18',
        },
      }
    );

    let locationId = null;
    if (locationsResponse.ok) {
      const locationsResult = await locationsResponse.json();
      // Get the first active location
      const activeLocation = locationsResult.locations?.find((loc: any) => loc.status === 'ACTIVE');
      locationId = activeLocation?.id || locationsResult.locations?.[0]?.id;
      
      console.log('📍 Square locations found:', {
        totalLocations: locationsResult.locations?.length || 0,
        activeLocation: activeLocation?.id,
        selectedLocationId: locationId
      });
    } else {
      console.error('❌ Failed to get Square locations:', {
        status: locationsResponse.status,
        statusText: locationsResponse.statusText
      });
    }

    // Ensure we have a location ID - this is critical for the payment widget
    if (!locationId) {
      console.error('❌ No location ID found - Square payment widget will not work');
      return NextResponse.json(
        { error: 'Failed to get Square location ID. Please ensure your Square account has at least one location configured.' },
        { status: 400 }
      );
    }

    console.log('✅ Square location ID obtained:', locationId);

    // Encrypt tokens (in production, use proper encryption)
    const accessTokenHash = Buffer.from(access_token).toString('base64');
    const refreshTokenHash = refresh_token ? Buffer.from(refresh_token).toString('base64') : null;

    // Store connection in database
    console.log('💾 Storing payment connection in database for vendor:', vendorId);
    const { data: connection, error: connectionError } = await supabase
      .from('payment_connections')
      .upsert([
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
            location_id: locationId,
          },
          updated_at: new Date().toISOString(),
        },
      ], {
        onConflict: 'vendor_id,provider'
      })
      .select()
      .single();

    console.log('💾 Payment connection result:', {
      success: !connectionError,
      connectionId: connection?.id,
      error: connectionError?.message
    });

    if (connectionError) {
      console.error('Database error storing payment connection:', {
        error: connectionError,
        code: connectionError.code,
        message: connectionError.message,
        details: connectionError.details,
        hint: connectionError.hint
      });
      return NextResponse.json(
        { error: `Failed to store connection: ${connectionError.message}` },
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
      console.error('Database error updating vendor:', {
        error: vendorError,
        code: vendorError.code,
        message: vendorError.message,
        details: vendorError.details,
        hint: vendorError.hint
      });
      return NextResponse.json(
        { error: `Failed to update vendor: ${vendorError.message}` },
        { status: 500 }
      );
    }

    // Get the updated vendor information for the welcome email
    const { data: updatedVendor, error: vendorFetchError } = await supabase
      .from('vendors')
      .select('business_name, contact_email, payment_provider, payment_connected')
      .eq('id', vendorId)
      .single();

    if (!vendorFetchError && updatedVendor) {
      // Send welcome email to the vendor
      try {
        console.log('📧 Sending vendor welcome email...');
        await customerNotificationService.sendVendorWelcomeEmail({
          business_name: updatedVendor.business_name,
          contact_email: updatedVendor.contact_email,
          payment_provider: updatedVendor.payment_provider,
          payment_connected: updatedVendor.payment_connected
        });
        console.log('✅ Vendor welcome email sent successfully');
      } catch (emailError) {
        console.error('❌ Failed to send vendor welcome email:', emailError);
        // Don't fail the entire request if email fails
      }
    }

    console.log('✅ Square OAuth exchange completed successfully', {
      connectionId: connection.id,
      vendorId: connection.vendor_id,
      provider: connection.provider,
      accountId: connection.provider_account_id,
      status: connection.connection_status
    });

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