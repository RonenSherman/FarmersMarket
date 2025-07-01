import { NextRequest, NextResponse } from 'next/server';
import { customerNotificationService } from '@/lib/customerNotifications';

export async function POST(request: NextRequest) {
  try {
    const { action, orderId, token } = await request.json();

    if (action === 'verify') {
      // Verify an existing token using the customer notification service
      const isValid = await customerNotificationService.verifyCancellationToken(orderId, token);
      
      if (!isValid) {
        return NextResponse.json({ valid: false, reason: 'Token not found or expired' });
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