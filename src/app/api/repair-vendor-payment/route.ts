import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Force deployment refresh
export async function POST(request: NextRequest) {
  try {
    const { vendorId, action } = await request.json();

    if (!vendorId) {
      return NextResponse.json({ error: 'vendorId required' }, { status: 400 });
    }

    // Create service role client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }
    
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get current vendor status
    const { data: vendor, error: vendorError } = await supabase
      .from('vendors')
      .select('*')
      .eq('id', vendorId)
      .single();

    if (vendorError) {
      return NextResponse.json({ 
        error: 'Vendor not found', 
        details: vendorError 
      }, { status: 404 });
    }

    // Get actual payment connections
    const { data: connections } = await supabase
      .from('payment_connections')
      .select('*')
      .eq('vendor_id', vendorId);

    const activeConnections = connections?.filter(c => c.connection_status === 'active') || [];

    if (action === 'reset' || action === 'fix') {
      // Reset vendor payment status to match reality
      const { error: updateError } = await supabase
        .from('vendors')
        .update({
          payment_connected: false,
          payment_provider: null,
          payment_connection_id: null,
          payment_account_id: null,
          payment_connected_at: null,
          payment_last_verified: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', vendorId);

      if (updateError) {
        return NextResponse.json({ 
          error: 'Failed to update vendor', 
          details: updateError 
        }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        action: 'reset',
        vendorId,
        vendorName: vendor.name,
        before: {
          payment_connected: vendor.payment_connected,
          payment_provider: vendor.payment_provider,
          actual_connections: connections?.length || 0
        },
        after: {
          payment_connected: false,
          payment_provider: null,
          actual_connections: connections?.length || 0
        },
        message: 'Vendor payment status reset to match actual connections'
      });
    }

    // Default: just return status
    return NextResponse.json({
      vendorId,
      vendorName: vendor.name,
      current_status: {
        vendor_says_connected: vendor.payment_connected,
        vendor_provider: vendor.payment_provider,
        actual_connections: connections?.length || 0,
        active_connections: activeConnections.length,
        has_mismatch: vendor.payment_connected && activeConnections.length === 0
      },
      connections: activeConnections,
      suggestion: vendor.payment_connected && activeConnections.length === 0 
        ? 'Use action=reset to fix data mismatch' 
        : 'Data appears consistent'
    });

  } catch (error) {
    console.error('Repair vendor payment error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 