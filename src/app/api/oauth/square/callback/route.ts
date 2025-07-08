import { NextRequest, NextResponse } from 'next/server';
import { PaymentOAuthService } from '@/lib/paymentOAuth';

// This route needs to be dynamic to handle OAuth callback parameters
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const state = searchParams.get('state');
  
  try {
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    // Handle OAuth error
    if (error) {
      console.error('Square OAuth error:', error);
      const errorPage = state?.includes('admin') ? '/admin' : '/vendor-signup';
      return NextResponse.redirect(
        new URL(`${errorPage}?error=${encodeURIComponent(error)}`, request.url)
      );
    }

    // Validate required parameters
    if (!code || !state) {
      const errorPage = state?.includes('admin') ? '/admin' : '/vendor-signup';
      return NextResponse.redirect(
        new URL(`${errorPage}?error=invalid_request`, request.url)
      );
    }

    // Parse and validate state
    const stateData = PaymentOAuthService.parseState(state);
    if (!stateData) {
      const errorPage = state?.includes('admin') ? '/admin' : '/vendor-signup';
      return NextResponse.redirect(
        new URL(`${errorPage}?error=invalid_state`, request.url)
      );
    }

    // Check if this is an admin-initiated connection
    if (stateData.source === 'admin' && stateData.vendorId) {
      try {
        console.log('🔧 Admin Square OAuth: Starting exchange process');
        console.log('📋 Parameters:', {
          hasCode: !!code,
          codeLength: code?.length,
          vendorId: stateData.vendorId,
          source: stateData.source
        });
        
        // Directly exchange the code for admin connections
        const result = await PaymentOAuthService.exchangeSquareCode(code, stateData.vendorId);
        
        console.log('✅ Admin Square OAuth: Exchange successful');
        console.log('📋 Result:', {
          connectionId: result.id,
          vendorId: result.vendor_id,
          provider: result.provider,
          status: result.connection_status
        });
        
        // Return success page that closes the popup
        return new NextResponse(`
          <!DOCTYPE html>
          <html>
            <head><title>Square Connected</title></head>
            <body>
              <div style="text-align: center; padding: 40px; font-family: Arial, sans-serif;">
                <h2>✅ Square Connected Successfully!</h2>
                <p>You can close this window and return to the admin panel.</p>
                <script>
                  setTimeout(() => {
                    window.close();
                  }, 2000);
                </script>
              </div>
            </body>
          </html>
        `, {
          headers: { 'Content-Type': 'text/html' }
        });
      } catch (exchangeError) {
        console.error('❌ Admin Square OAuth: Exchange failed');
        console.error('📋 Error details:', {
          error: exchangeError,
          message: exchangeError instanceof Error ? exchangeError.message : 'Unknown error',
          stack: exchangeError instanceof Error ? exchangeError.stack : undefined,
          vendorId: stateData.vendorId,
          hasCode: !!code,
          codeLength: code?.length
        });
        
        // Log the full error for debugging
        console.error('Full exchangeError object:', JSON.stringify(exchangeError, null, 2));
        
        return new NextResponse(`
          <!DOCTYPE html>
          <html>
            <head><title>Square Connection Failed</title></head>
            <body>
              <div style="text-align: center; padding: 40px; font-family: Arial, sans-serif; color: red;">
                <h2>❌ Square Connection Failed</h2>
                <p>Error: ${exchangeError instanceof Error ? exchangeError.message : 'Unknown error'}</p>
                <p>Please close this window and try again.</p>
                <script>
                  setTimeout(() => {
                    window.close();
                  }, 3000);
                </script>
              </div>
            </body>
          </html>
        `, {
          headers: { 'Content-Type': 'text/html' }
        });
      }
    }

    // For vendor self-signup, redirect back to vendor signup page with OAuth parameters
    const redirectUrl = new URL('/vendor-signup', request.url);
    redirectUrl.searchParams.set('code', code);
    redirectUrl.searchParams.set('state', state);

    return NextResponse.redirect(redirectUrl);

  } catch (error) {
    console.error('Square OAuth callback error:', error);
    const errorPage = state?.includes('admin') ? '/admin' : '/vendor-signup';
    return NextResponse.redirect(
      new URL(`${errorPage}?error=callback_failed`, request.url)
    );
  }
} 