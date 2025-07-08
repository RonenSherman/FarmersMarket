import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { vendorId, action } = await request.json();

    console.log('🔧 [Repair Vendor Payment] Starting repair for vendor:', vendorId, 'action:', action);

    if (!vendorId) {
      return NextResponse.json({ error: 'Vendor ID is required' }, { status: 400 });
    }

    // Get vendor information
    const { data: vendor, error: vendorError } = await supabase
      .from('vendors')
      .select('*')
      .eq('id', vendorId)
      .single();

    if (vendorError || !vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }

    // Get payment connections for this vendor
    const { data: connections, error: connectionsError } = await supabase
      .from('payment_connections')
      .select('*')
      .eq('vendor_id', vendorId);

    console.log('🔧 [Repair Vendor Payment] Current state:', {
      vendorPaymentConnected: vendor.payment_connected,
      vendorPaymentProvider: vendor.payment_provider,
      connectionsCount: connections?.length || 0,
      connections
    });

    if (action === 'analyze') {
      // Just analyze the mismatch
      const analysis = {
        vendorInfo: {
          id: vendor.id,
          name: vendor.name,
          payment_connected: vendor.payment_connected,
          payment_provider: vendor.payment_provider,
          payment_connection_id: vendor.payment_connection_id,
          payment_account_id: vendor.payment_account_id
        },
        connections: connections || [],
        mismatch: {
          vendorSaysConnected: vendor.payment_connected,
          actualConnections: connections?.length || 0,
          hasActiveConnection: connections?.some(c => c.connection_status === 'active') || false,
          needsRepair: vendor.payment_connected && (connections?.length || 0) === 0
        }
      };

      return NextResponse.json(analysis);
    }

    if (action === 'fix-vendor-record') {
      // Fix vendor record to match reality (no connections exist)
      console.log('🔧 [Repair Vendor Payment] Fixing vendor record to match reality');
      
      const { error: updateError } = await supabase
        .from('vendors')
        .update({
          payment_connected: false,
          payment_provider: null,
          payment_connection_id: null,
          payment_account_id: null,
          payment_connected_at: null,
          payment_last_verified: null
        })
        .eq('id', vendorId);

      if (updateError) {
        throw updateError;
      }

      return NextResponse.json({
        success: true,
        action: 'vendor-record-fixed',
        message: 'Vendor record updated to reflect no payment connections'
      });
    }

    if (action === 'create-connection') {
      // Create a payment connection based on vendor record data
      const { connectionData } = await request.json();
      
      if (!connectionData) {
        return NextResponse.json({ 
          error: 'Connection data is required for creating connection' 
        }, { status: 400 });
      }

      console.log('🔧 [Repair Vendor Payment] Creating payment connection');

      const newConnection = {
        vendor_id: vendorId,
        provider: connectionData.provider || 'square',
        provider_account_id: connectionData.provider_account_id,
        connection_status: 'active',
        access_token_encrypted: connectionData.access_token_encrypted || '',
        refresh_token_encrypted: connectionData.refresh_token_encrypted || '',
        token_expires_at: connectionData.token_expires_at,
        metadata: connectionData.metadata || {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: connection, error: insertError } = await supabase
        .from('payment_connections')
        .insert(newConnection)
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      // Update vendor record with connection ID
      const { error: updateError } = await supabase
        .from('vendors')
        .update({
          payment_connection_id: connection.id,
          payment_connected_at: new Date().toISOString(),
          payment_last_verified: new Date().toISOString()
        })
        .eq('id', vendorId);

      if (updateError) {
        console.error('Failed to update vendor with connection ID:', updateError);
      }

      return NextResponse.json({
        success: true,
        action: 'connection-created',
        connection,
        message: 'Payment connection created successfully'
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('❌ [Repair Vendor Payment] Error:', error);
    return NextResponse.json(
      { error: 'Repair failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    console.log('🔧 [Repair Vendor Payment] Finding all vendor payment mismatches');

    // Find all vendors with payment_connected: true but no active connections
    const { data: vendors, error: vendorsError } = await supabase
      .from('vendors')
      .select('id, name, email, payment_connected, payment_provider, payment_connection_id, payment_account_id')
      .eq('payment_connected', true);

    if (vendorsError) {
      throw vendorsError;
    }

    const mismatches = [];

    for (const vendor of vendors || []) {
      const { data: connections } = await supabase
        .from('payment_connections')
        .select('*')
        .eq('vendor_id', vendor.id)
        .eq('connection_status', 'active');

      if (!connections || connections.length === 0) {
        mismatches.push({
          vendorId: vendor.id,
          vendorName: vendor.name,
          vendorEmail: vendor.email,
          paymentProvider: vendor.payment_provider,
          paymentConnectionId: vendor.payment_connection_id,
          paymentAccountId: vendor.payment_account_id,
          issue: 'Vendor shows connected but no active payment connections found'
        });
      }
    }

    return NextResponse.json({
      totalVendorsChecked: vendors?.length || 0,
      mismatchesFound: mismatches.length,
      mismatches
    });

  } catch (error) {
    console.error('❌ [Repair Vendor Payment] Error:', error);
    return NextResponse.json(
      { error: 'Failed to find mismatches', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 