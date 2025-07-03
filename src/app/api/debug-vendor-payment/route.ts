import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  console.log('🔧 Debug vendor payment endpoint called');
  try {
    const { searchParams } = new URL(request.url);
    const vendorId = searchParams.get('vendorId');

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

    // Get vendor record
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

    // Get payment connections for this vendor
    const { data: connections, error: connectionsError } = await supabase
      .from('payment_connections')
      .select('*')
      .eq('vendor_id', vendorId);

    if (connectionsError) {
      console.error('Error fetching connections:', connectionsError);
    }

    return NextResponse.json({
      vendorId,
      vendorName: vendor.name,
      vendor: {
        payment_connected: vendor.payment_connected,
        payment_provider: vendor.payment_provider,
        payment_connection_id: vendor.payment_connection_id,
        payment_account_id: vendor.payment_account_id,
        payment_connected_at: vendor.payment_connected_at,
        payment_last_verified: vendor.payment_last_verified
      },
      connections: connections || [],
      connectionCount: connections?.length || 0,
      summary: {
        vendorSaysConnected: vendor.payment_connected,
        actualConnections: connections?.length || 0,
        hasActiveConnection: connections?.some(c => c.connection_status === 'active') || false,
        mismatch: vendor.payment_connected && (connections?.length || 0) === 0
      }
    });

  } catch (error) {
    console.error('Debug vendor payment error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 