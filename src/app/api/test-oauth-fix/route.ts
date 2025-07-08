import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { vendorId, provider } = await request.json();
    
    console.log('🔍 [Test OAuth Fix] Testing vendor:', vendorId, 'provider:', provider);
    
    // Check if vendor exists
    const { data: vendor, error: vendorError } = await supabase
      .from('vendors')
      .select('id, name, payment_connected, payment_provider, payment_account_id')
      .eq('id', vendorId)
      .single();

    if (vendorError || !vendor) {
      return NextResponse.json({ error: 'Vendor not found', details: vendorError }, { status: 404 });
    }

    console.log('🔍 [Test OAuth Fix] Vendor found:', vendor);
    
    // Check payment connections
    const { data: connection, error } = await supabase
      .from('payment_connections')
      .select('*')
      .eq('vendor_id', vendorId)
      .eq('provider', provider)
      .eq('connection_status', 'active')
      .single();

    console.log('🔍 [Test OAuth Fix] Connection query result:', { connection, error });

    if (error || !connection) {
      console.log('❌ [Test OAuth Fix] No active payment connection found');
      
      // Check specific condition
      const shouldCreateConnection = vendorId === 'b6a3eb4e-3bbb-4e35-a9b8-79f8ec4550c2' && vendor.payment_connected;
      console.log('🔍 [Test OAuth Fix] Should create connection:', shouldCreateConnection);
      console.log('🔍 [Test OAuth Fix] Vendor ID match:', vendorId === 'b6a3eb4e-3bbb-4e35-a9b8-79f8ec4550c2');
      console.log('🔍 [Test OAuth Fix] Payment connected:', vendor.payment_connected);
      
      if (shouldCreateConnection) {
        console.log('🔧 [Test OAuth Fix] Creating connection...');
        
        const testConnection = {
          vendor_id: vendorId,
          provider: 'square',
          provider_account_id: vendor.payment_account_id || 'MLW4XXKKW28DE',
          access_token_hash: 'test_token_hash_' + Date.now(),
          connection_status: 'active',
          metadata: {
            location_id: vendor.payment_account_id || 'MLW4XXKKW28DE',
            merchant_id: 'test_merchant_' + vendorId.substring(0, 8),
            application_id: process.env.NEXT_PUBLIC_SQUARE_CLIENT_ID || 'sq0idp-wGVapF8sNt9PLrdj5znuKA'
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { data: newConnection, error: createError } = await supabase
          .from('payment_connections')
          .insert(testConnection)
          .select()
          .single();

        if (createError) {
          console.log('❌ [Test OAuth Fix] Failed to create connection:', createError);
          return NextResponse.json({ 
            error: 'Failed to create connection', 
            details: createError,
            vendor,
            shouldCreateConnection 
          }, { status: 500 });
        }

        console.log('✅ [Test OAuth Fix] Created connection:', newConnection.id);
        
        return NextResponse.json({
          success: true,
          message: 'Connection created successfully',
          connection: newConnection,
          vendor,
          shouldCreateConnection
        });
      } else {
        return NextResponse.json({
          error: 'No active payment connection found and conditions not met',
          vendor,
          shouldCreateConnection,
          vendorIdMatch: vendorId === 'b6a3eb4e-3bbb-4e35-a9b8-79f8ec4550c2',
          paymentConnected: vendor.payment_connected
        }, { status: 404 });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Connection already exists',
      connection,
      vendor
    });

  } catch (error) {
    console.error('❌ [Test OAuth Fix] Error:', error);
    return NextResponse.json({ 
      error: 'Test failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
} 