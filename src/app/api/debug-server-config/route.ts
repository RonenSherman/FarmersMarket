import { NextResponse } from 'next/server';

export async function GET() {
  const clientSecret = process.env.SQUARE_CLIENT_SECRET;
  const publicClientId = process.env.NEXT_PUBLIC_SQUARE_CLIENT_ID;
  const serverClientId = process.env.SQUARE_CLIENT_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  
  return NextResponse.json({
    hasClientSecret: !!clientSecret,
    hasPublicClientId: !!publicClientId,
    hasServerClientId: !!serverClientId,
    hasAppUrl: !!appUrl,
    clientSecretPreview: clientSecret ? clientSecret.substring(0, 10) + '...' : 'Missing',
    publicClientIdPreview: publicClientId ? publicClientId.substring(0, 10) + '...' : 'Missing',
    serverClientIdPreview: serverClientId ? serverClientId.substring(0, 10) + '...' : 'Missing',
    appUrl: appUrl,
    environment: process.env.NODE_ENV,
    tokenUrl: process.env.NODE_ENV === 'production'
      ? 'https://connect.squareup.com/oauth2/token'
      : 'https://connect.squareupsandbox.com/oauth2/token',
    message: 'All credentials should be present for OAuth to work'
  });
} 