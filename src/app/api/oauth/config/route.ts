import { NextRequest, NextResponse } from 'next/server';
import { PaymentOAuthService } from '@/lib/paymentOAuth';
import { supabase } from '@/lib/supabase';

// Updated: Square OAuth config endpoint - ready for testing with correct vendor ID
// Current test vendor: Ronen Sherman (b6a3eb4e-3bbb-4e35-a9b8-79f8ec4550c2)
// Payment connections reset to clean state for fresh Square OAuth testing
// Fixed data inconsistency issue and improved error handling - trigger redeploy Jan 2025

export async function GET() {
  try {
    const validation = PaymentOAuthService.validateConfig();
    
    const config = {
      square: {
        client_id_configured: !!(process.env.NEXT_PUBLIC_SQUARE_CLIENT_ID || process.env.SQUARE_CLIENT_ID),
        client_secret_configured: !!process.env.SQUARE_CLIENT_SECRET,
        app_url_configured: !!process.env.NEXT_PUBLIC_APP_URL,
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/square/callback`,
        environment: process.env.NODE_ENV,
        oauth_url_sample: process.env.NODE_ENV === 'production' 
          ? 'https://connect.squareup.com/oauth2/authorize'
          : 'https://connect.squareupsandbox.com/oauth2/authorize'
      },
      stripe: {
        client_id_configured: !!(process.env.NEXT_PUBLIC_STRIPE_CLIENT_ID || process.env.STRIPE_CLIENT_ID),
        client_secret_configured: !!process.env.STRIPE_SECRET_KEY,
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/stripe/callback`
      },
      validation
    };

    return NextResponse.json(config);
  } catch (error) {
    console.error('Configuration validation error:', error);
    return NextResponse.json(
      { error: 'Failed to validate configuration' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { vendorId, provider } = await request.json();

    console.log('🔍 [OAuth Config] Request received:', { vendorId, provider });

    if (!vendorId || !provider) {
      console.log('❌ [OAuth Config] Missing required parameters');
      return NextResponse.json(
        { error: 'Vendor ID and provider are required' },
        { status: 400 }
      );
    }

    // First, check if vendor exists
    const { data: vendor, error: vendorError } = await supabase
      .from('vendors')
      .select('id, name, payment_connected, payment_provider, payment_account_id')
      .eq('id', vendorId)
      .single();

    console.log('🔍 [OAuth Config] Vendor check:', { vendor, vendorError });

    if (vendorError || !vendor) {
      console.log('❌ [OAuth Config] Vendor not found');
      return NextResponse.json(
        { error: 'Vendor not found' },
        { status: 404 }
      );
    }

    // Get payment connection for vendor
    console.log('🔍 [OAuth Config] Querying payment_connections for:', { vendorId, provider });
    let { data: connection, error } = await supabase
      .from('payment_connections')
      .select('*')
      .eq('vendor_id', vendorId)
      .eq('provider', provider)
      .eq('connection_status', 'active')
      .single();

    console.log('🔍 [OAuth Config] Query result:', { connection, error });

    // If no active connection found, check for any connections first
    if (error || !connection) {
      console.log('❌ [OAuth Config] No active payment connection found');
      
      // Check if there are any connections for this vendor/provider (regardless of status)
      const { data: anyConnections, error: anyError } = await supabase
        .from('payment_connections')
        .select('connection_status, created_at')
        .eq('vendor_id', vendorId)
        .eq('provider', provider)
        .order('created_at', { ascending: false });

      console.log('🔍 [OAuth Config] Any connections found:', { 
        count: anyConnections?.length || 0, 
        connections: anyConnections 
      });

      // If vendor says connected but we have no connections at all, it's a real inconsistency
      if (vendor.payment_connected && vendor.payment_provider === provider && (!anyConnections || anyConnections.length === 0)) {
        console.log('🔧 [OAuth Config] True data inconsistency - vendor says connected but no connection records exist');
        console.log('🔧 [OAuth Config] Vendor:', vendor.name, 'ID:', vendorId);
        
        // Reset vendor payment status to match reality
        await supabase
          .from('vendors')
          .update({
            payment_connected: false,
            payment_provider: null,
            payment_connection_id: null,
            payment_account_id: null,
            payment_connected_at: null,
            payment_last_verified: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', vendorId);

        console.log('🔧 [OAuth Config] Reset vendor payment status to false');
        
        return NextResponse.json(
          { error: 'Payment connection was reset due to data inconsistency. Please reconnect your payment provider.' },
          { status: 404 }
        );
      } else if (anyConnections && anyConnections.length > 0) {
        // There are connections but none are active - connection might be expired/revoked
        console.log('🔍 [OAuth Config] Found connections but none are active:', anyConnections.map(c => c.connection_status));
        
        return NextResponse.json(
          { error: 'Payment connection exists but is not active. Please reconnect your payment provider.' },
          { status: 404 }
        );
      } else {
        // No connections and vendor doesn't claim to be connected
        console.log('❌ [OAuth Config] Vendor payment_connected:', vendor.payment_connected, 'provider:', vendor.payment_provider);
        return NextResponse.json(
          { error: 'No payment connection found for this vendor' },
          { status: 404 }
        );
      }
    }

    if (provider === 'square') {
      const locationId = connection.metadata?.location_id;
      
      if (!locationId) {
        console.error('❌ [OAuth Config] No location_id found in connection metadata');
        console.error('📋 [OAuth Config] Connection metadata:', connection.metadata);
        console.error('📋 [OAuth Config] Using provider_account_id as fallback:', connection.provider_account_id);
      }
      
      const config = {
        applicationId: process.env.NEXT_PUBLIC_SQUARE_CLIENT_ID || process.env.SQUARE_CLIENT_ID,
        locationId: locationId || connection.provider_account_id, // fallback to merchant_id if no location_id
        environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox'
      };
      
      console.log('✅ [OAuth Config] Returning Square config:', {
        applicationId: config.applicationId?.substring(0, 15) + '...',
        locationId: config.locationId,
        environment: config.environment,
        hasLocationId: !!locationId,
        usingFallback: !locationId
      });
      
      return NextResponse.json(config);
    } else if (provider === 'stripe') {
      if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
        return NextResponse.json(
          { error: 'Stripe is not configured on this server' },
          { status: 501 }
        );
      }
      return NextResponse.json({
        publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
        accountId: connection.provider_account_id
      });
    } else {
      return NextResponse.json(
        { error: 'Unsupported payment provider' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Error getting payment config:', error);
    return NextResponse.json(
      { error: 'Failed to get payment configuration' },
      { status: 500 }
    );
  }
} 