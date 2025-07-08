import { NextRequest, NextResponse } from 'next/server';
import { PaymentOAuthService } from '@/lib/paymentOAuth';
import { supabase } from '@/lib/supabase';

// Updated: Square OAuth config endpoint - ready for testing with correct vendor ID
// Current test vendor: Ronen Sherman (b6a3eb4e-3bbb-4e35-a9b8-79f8ec4550c2)
// Payment connections reset to clean state for fresh Square OAuth testing

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

    // Get payment connection for vendor
    console.log('🔍 [OAuth Config] Querying payment_connections for:', { vendorId, provider });
    const { data: connection, error } = await supabase
      .from('payment_connections')
      .select('*')
      .eq('vendor_id', vendorId)
      .eq('provider', provider)
      .eq('connection_status', 'active')
      .single();

    console.log('🔍 [OAuth Config] Query result:', { connection, error });

    if (error || !connection) {
      console.log('❌ [OAuth Config] No active payment connection found');
      return NextResponse.json(
        { error: 'No active payment connection found for this vendor' },
        { status: 404 }
      );
    }

    if (provider === 'square') {
      const config = {
        applicationId: process.env.NEXT_PUBLIC_SQUARE_CLIENT_ID || process.env.SQUARE_CLIENT_ID,
        locationId: connection.metadata?.location_id || connection.provider_account_id,
        environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox'
      };
      console.log('✅ [OAuth Config] Returning Square config:', config);
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