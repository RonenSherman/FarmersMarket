import { NextRequest, NextResponse } from 'next/server';
import { customerNotificationService } from '@/lib/customerNotifications';

export async function POST(request: NextRequest) {
  try {
    const { vendorId } = await request.json();

    if (!vendorId) {
      return NextResponse.json(
        { error: 'Vendor ID is required' },
        { status: 400 }
      );
    }

    // Get vendor information from database
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: vendor, error } = await supabase
      .from('vendors')
      .select('business_name, contact_email, payment_provider, payment_connected')
      .eq('id', vendorId)
      .single();

    if (error || !vendor) {
      console.error('Failed to fetch vendor:', error);
      return NextResponse.json(
        { error: 'Vendor not found' },
        { status: 404 }
      );
    }

    // Send welcome email
    const emailSent = await customerNotificationService.sendVendorWelcomeEmail({
      business_name: vendor.business_name,
      contact_email: vendor.contact_email,
      payment_provider: vendor.payment_provider,
      payment_connected: vendor.payment_connected
    });

    return NextResponse.json({
      success: emailSent,
      message: emailSent ? 'Welcome email sent successfully' : 'Failed to send welcome email'
    });

  } catch (error) {
    console.error('Error sending vendor welcome email:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 