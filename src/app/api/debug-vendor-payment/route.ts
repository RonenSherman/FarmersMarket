import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { vendorId } = await request.json();

    console.log('🔍 [Debug Vendor Payment] Starting debug for vendor:', vendorId);

    // Get vendor information
    const { data: vendor, error: vendorError } = await supabase
      .from('vendors')
      .select('id, name, email, payment_connected, payment_provider')
      .eq('id', vendorId)
      .single();

    console.log('🔍 [Debug Vendor Payment] Vendor query result:', { vendor, vendorError });

    // Get all payment connections for this vendor
    const { data: connections, error: connectionsError } = await supabase
      .from('payment_connections')
      .select('*')
      .eq('vendor_id', vendorId);

    console.log('🔍 [Debug Vendor Payment] Payment connections query result:', { connections, connectionsError });

    // Get active payment connections only
    const { data: activeConnections, error: activeError } = await supabase
      .from('payment_connections')
      .select('*')
      .eq('vendor_id', vendorId)
      .eq('connection_status', 'active');

    console.log('🔍 [Debug Vendor Payment] Active payment connections:', { activeConnections, activeError });

    // Get Square connections specifically
    const { data: squareConnections, error: squareError } = await supabase
      .from('payment_connections')
      .select('*')
      .eq('vendor_id', vendorId)
      .eq('provider', 'square');

    console.log('🔍 [Debug Vendor Payment] Square connections:', { squareConnections, squareError });

    // Check if vendor exists
    if (vendorError || !vendor) {
      return NextResponse.json({
        error: 'Vendor not found',
        vendorId,
        details: vendorError
      }, { status: 404 });
    }

    // Summary of findings
    const summary = {
      vendorInfo: {
        id: vendor.id,
        name: vendor.name,
        email: vendor.email,
        payment_connected: vendor.payment_connected,
        payment_provider: vendor.payment_provider
      },
      paymentConnections: {
        total: connections?.length || 0,
        active: activeConnections?.length || 0,
        square: squareConnections?.length || 0,
        allConnections: connections || [],
        activeConnections: activeConnections || [],
        squareConnections: squareConnections || []
      },
      diagnosis: {
        vendorSaysConnected: vendor.payment_connected,
        actualActiveConnections: activeConnections?.length || 0,
        hasSquareConnection: (squareConnections?.length || 0) > 0,
        hasActiveSquareConnection: activeConnections?.some(c => c.provider === 'square') || false,
        mismatchDetected: vendor.payment_connected && (activeConnections?.length || 0) === 0
      }
    };

    console.log('✅ [Debug Vendor Payment] Summary:', summary);

    return NextResponse.json(summary);

  } catch (error) {
    console.error('❌ [Debug Vendor Payment] Error:', error);
    return NextResponse.json(
      { error: 'Debug failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 