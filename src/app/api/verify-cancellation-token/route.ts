import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory token storage (in production, use a database)
const tokenStore = new Map<string, { token: string; created: number; orderId: string }>();

export async function POST(request: NextRequest) {
  try {
    const { action, orderId, token } = await request.json();

    if (action === 'store') {
      // Store a new cancellation token
      const tokenData = {
        token,
        created: Date.now(),
        orderId
      };
      
      tokenStore.set(`${orderId}:${token}`, tokenData);
      console.log('🔐 Stored cancellation token for order:', orderId);
      
      return NextResponse.json({ success: true });
      
    } else if (action === 'verify') {
      // Verify an existing token
      const key = `${orderId}:${token}`;
      const storedData = tokenStore.get(key);
      
      if (!storedData) {
        return NextResponse.json({ valid: false, reason: 'Token not found' });
      }
      
      // Check if token has expired (24 hours)
      const isExpired = Date.now() - storedData.created > 24 * 60 * 60 * 1000;
      if (isExpired) {
        tokenStore.delete(key); // Clean up expired token
        return NextResponse.json({ valid: false, reason: 'Token expired' });
      }
      
      console.log('✅ Token verified for order:', orderId);
      return NextResponse.json({ valid: true });
      
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('Token verification error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 