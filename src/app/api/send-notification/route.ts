import { NextRequest, NextResponse } from 'next/server';
import { customerNotificationService } from '@/lib/customerNotifications';
import type { Order, Vendor } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { order, notificationMethod, type = 'confirmation', includeCancellation = false } = body;

    console.log('📧 API ROUTE - Sending notification');
    console.log('📧 Type:', type);
    console.log('📧 Order ID:', order.id);
    console.log('📧 Customer email:', order.customer_email);
    console.log('📧 Include cancellation:', includeCancellation);
    console.log('📧 SendGrid API Key exists:', !!process.env.SENDGRID_API_KEY);
    console.log('📧 From email:', process.env.SENDGRID_FROM_EMAIL);
    
    // Log the base URL being used for cancellation links
    const baseUrl = 'https://farmers-market-3ct4.vercel.app';
    console.log('📧 Base URL for cancellation links:', baseUrl);

    // Use the existing customerNotificationService instance
    let success = false;
    
    if (type === 'confirmation') {
      success = await customerNotificationService.sendOrderNotification(
        order,
        notificationMethod,
        includeCancellation
      );
    } else if (type === 'status_update') {
      success = await customerNotificationService.sendOrderStatusUpdate(
        order,
        notificationMethod
      );
    }

    return NextResponse.json({ 
      success, 
      message: success ? 'Notification sent successfully' : 'Failed to send notification' 
    });

  } catch (error) {
    console.error('API Route - Error sending notification:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to send notification' },
      { status: 500 }
    );
  }
} 