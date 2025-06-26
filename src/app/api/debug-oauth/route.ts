import { NextResponse } from 'next/server';

export async function GET() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const clientId = process.env.NEXT_PUBLIC_SQUARE_CLIENT_ID;
  const redirectUri = `${appUrl}/api/oauth/square/callback`;
  
  return NextResponse.json({
    appUrl,
    clientId: clientId ? clientId.substring(0, 10) + '...' : 'Missing',
    redirectUri,
    message: 'This redirect URI must match exactly what you configured in Square Developer Console'
  });
} 