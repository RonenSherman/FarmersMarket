import { NextResponse } from 'next/server';

export async function GET() {
  const clientSecret = process.env.SQUARE_CLIENT_SECRET;
  const clientId = process.env.NEXT_PUBLIC_SQUARE_CLIENT_ID;
  
  return NextResponse.json({
    hasClientSecret: !!clientSecret,
    hasClientId: !!clientId,
    clientSecretPreview: clientSecret ? clientSecret.substring(0, 10) + '...' : 'Missing',
    clientIdPreview: clientId ? clientId.substring(0, 10) + '...' : 'Missing',
    message: 'Both should be present for OAuth to work'
  });
} 