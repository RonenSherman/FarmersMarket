import { NextResponse } from 'next/server';
import { PaymentOAuthService } from '@/lib/paymentOAuth';

export async function POST(request: Request) {
  try {
    const { provider, vendorId, source } = await request.json();

    if (!provider || !vendorId) {
      return NextResponse.json(
        { error: 'Provider and vendorId are required' },
        { status: 400 }
      );
    }

    if (provider !== 'square' && provider !== 'stripe') {
      return NextResponse.json(
        { error: 'Invalid provider. Must be square or stripe' },
        { status: 400 }
      );
    }

    // Generate OAuth URL on server side where env vars are available
    const authUrl = PaymentOAuthService.generateAuthUrl(
      provider, 
      vendorId, 
      source || 'admin'
    );

    return NextResponse.json({ authUrl });

  } catch (error) {
    console.error('Error generating OAuth URL:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate OAuth URL' },
      { status: 500 }
    );
  }
} 