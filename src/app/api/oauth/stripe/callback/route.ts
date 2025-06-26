import { NextRequest, NextResponse } from 'next/server';
import { PaymentOAuthService } from '@/lib/paymentOAuth';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle OAuth error
    if (error) {
      console.error('Stripe OAuth error:', error);
      return NextResponse.redirect(
        new URL(`/vendor-signup?error=${encodeURIComponent(error)}`, request.url)
      );
    }

    // Validate required parameters
    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/vendor-signup?error=invalid_request', request.url)
      );
    }

    // Parse and validate state
    const stateData = PaymentOAuthService.parseState(state);
    if (!stateData) {
      return NextResponse.redirect(
        new URL('/vendor-signup?error=invalid_state', request.url)
      );
    }

    // Redirect back to vendor signup page with OAuth parameters
    const redirectUrl = new URL('/vendor-signup', request.url);
    redirectUrl.searchParams.set('code', code);
    redirectUrl.searchParams.set('state', state);

    return NextResponse.redirect(redirectUrl);

  } catch (error) {
    console.error('Stripe OAuth callback error:', error);
    return NextResponse.redirect(
      new URL('/vendor-signup?error=callback_failed', request.url)
    );
  }
} 