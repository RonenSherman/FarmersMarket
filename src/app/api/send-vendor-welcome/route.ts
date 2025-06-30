import { NextRequest, NextResponse } from 'next/server';
import { customerNotificationService } from '@/lib/customerNotifications';

export async function POST(request: NextRequest) {
  try {
    console.log('📧 Vendor welcome email API called');
    const { vendorId } = await request.json();
    console.log('📧 Vendor ID:', vendorId);

    // Check environment variables
    console.log('📧 Environment check:');
    console.log('📧 SENDGRID_API_KEY exists:', !!process.env.SENDGRID_API_KEY);
    console.log('📧 SENDGRID_FROM_EMAIL:', process.env.SENDGRID_FROM_EMAIL);
    console.log('📧 NEXT_PUBLIC_SUPABASE_URL exists:', !!process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('📧 SUPABASE_SERVICE_ROLE_KEY exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);

    if (!vendorId) {
      console.log('❌ No vendor ID provided');
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

    console.log('📧 Fetching vendor from database...');
    const { data: vendor, error } = await supabase
      .from('vendors')
      .select('name, contact_email, payment_method')
      .eq('id', vendorId)
      .single();

    if (error || !vendor) {
      console.error('❌ Failed to fetch vendor:', error);
      return NextResponse.json(
        { error: 'Vendor not found' },
        { status: 404 }
      );
    }

    console.log('📧 Vendor found:', vendor.name, vendor.contact_email);

    // Send welcome email
    console.log('📧 Sending welcome email...');
    const emailSent = await customerNotificationService.sendVendorWelcomeEmail({
      business_name: vendor.name,
      contact_email: vendor.contact_email,
      payment_provider: vendor.payment_method,
      payment_connected: vendor.payment_method !== null
    });

    console.log('📧 Email sent result:', emailSent);
    
    if (emailSent) {
      console.log('✅ Welcome email API - SUCCESS');
    } else {
      console.log('❌ Welcome email API - FAILED');
    }
    
    return NextResponse.json({
      success: emailSent,
      message: emailSent ? 'Welcome email sent successfully' : 'Failed to send welcome email'
    });

  } catch (error) {
    console.error('❌ Error sending vendor welcome email:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 