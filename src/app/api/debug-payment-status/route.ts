import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const vendorId = searchParams.get('vendorId') || 'b6a3eb4e-3bbb-4e35-a9b8-79f8ec4550c2';
  
  try {
    console.log('🔍 [Debug Payment Status] Checking for vendor:', vendorId);
    
    // 1. Check if vendor exists
    const { data: vendor, error: vendorError } = await supabase
      .from('vendors')
      .select('*')
      .eq('id', vendorId)
      .single();
    
    // 2. Check all payment connections for this vendor
    const { data: allConnections, error: allConnectionsError } = await supabase
      .from('payment_connections')
      .select('*')
      .eq('vendor_id', vendorId);
    
    // 3. Check active Square connections
    const { data: activeSquareConnections, error: activeSquareError } = await supabase
      .from('payment_connections')
      .select('*')
      .eq('vendor_id', vendorId)
      .eq('provider', 'square')
      .eq('connection_status', 'active');
    
    // 4. Check if the exact query from oauth/config works
    const { data: configConnection, error: configError } = await supabase
      .from('payment_connections')
      .select('*')
      .eq('vendor_id', vendorId)
      .eq('provider', 'square')
      .eq('connection_status', 'active')
      .single();
    
    const debugInfo = {
      timestamp: new Date().toISOString(),
      vendorId,
      vendor: {
        found: !vendorError,
        error: vendorError,
        data: vendor ? {
          id: vendor.id,
          name: vendor.name,
          email: vendor.email,
          payment_connected: vendor.payment_connected,
          payment_provider: vendor.payment_provider,
          payment_account_id: vendor.payment_account_id,
          payment_connection_id: vendor.payment_connection_id
        } : null
      },
      paymentConnections: {
        total: allConnections?.length || 0,
        allConnectionsError,
        connections: allConnections || []
      },
      activeSquareConnections: {
        total: activeSquareConnections?.length || 0,
        activeSquareError,
        connections: activeSquareConnections || []
      },
      configQuery: {
        found: !configError,
        error: configError,
        connection: configConnection
      },
      diagnosis: {
        vendorExists: !vendorError,
        hasAnyConnections: (allConnections?.length || 0) > 0,
        hasActiveSquareConnection: (activeSquareConnections?.length || 0) > 0,
        configQueryWorks: !configError,
        shouldCreateConnection: !vendorError && (allConnections?.length || 0) === 0
      }
    };
    
    return NextResponse.json(debugInfo);
    
  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json({ 
      error: 'Debug failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 