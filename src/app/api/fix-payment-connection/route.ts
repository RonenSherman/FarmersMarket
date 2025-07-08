import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { vendorId } = await request.json();
    
    if (!vendorId) {
      return NextResponse.json({ error: 'vendorId is required' }, { status: 400 });
    }

    console.log('🔧 [Fix Payment Connection] Starting fix for vendor:', vendorId);

    // 1. Check if vendor exists
    const { data: vendor, error: vendorError } = await supabase
      .from('vendors')
      .select('*')
      .eq('id', vendorId)
      .single();

    if (vendorError || !vendor) {
      console.log('❌ [Fix Payment Connection] Vendor not found:', vendorError);
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }

    console.log('✅ [Fix Payment Connection] Vendor found:', vendor.name);

    // 2. Check existing payment connections
    const { data: existingConnections, error: connectionsError } = await supabase
      .from('payment_connections')
      .select('*')
      .eq('vendor_id', vendorId);

    console.log('🔍 [Fix Payment Connection] Existing connections:', existingConnections?.length || 0);

    // 3. Create Square payment connection if none exists
    if (!existingConnections || existingConnections.length === 0) {
      console.log('🔧 [Fix Payment Connection] Creating Square payment connection...');
      
      const newConnection = {
        vendor_id: vendorId,
        provider: 'square',
        provider_account_id: vendor.payment_account_id || `test_account_${vendorId.substring(0, 8)}`,
        access_token_hash: 'test_token_hash_' + Date.now(),
        connection_status: 'active',
        metadata: {
          location_id: vendor.payment_account_id || `test_location_${vendorId.substring(0, 8)}`,
          merchant_id: `test_merchant_${vendorId.substring(0, 8)}`,
          application_id: process.env.NEXT_PUBLIC_SQUARE_CLIENT_ID || 'test_app_id'
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: createdConnection, error: createError } = await supabase
        .from('payment_connections')
        .insert(newConnection)
        .select()
        .single();

      if (createError) {
        console.log('❌ [Fix Payment Connection] Failed to create connection:', createError);
        return NextResponse.json({ 
          error: 'Failed to create payment connection', 
          details: createError 
        }, { status: 500 });
      }

      console.log('✅ [Fix Payment Connection] Created connection:', createdConnection.id);

      // 4. Update vendor status to ensure consistency
      const { error: vendorUpdateError } = await supabase
        .from('vendors')
        .update({
          payment_connected: true,
          payment_provider: 'square',
          payment_account_id: createdConnection.provider_account_id,
          payment_connection_id: createdConnection.id,
          payment_connected_at: new Date().toISOString()
        })
        .eq('id', vendorId);

      if (vendorUpdateError) {
        console.log('⚠️ [Fix Payment Connection] Failed to update vendor:', vendorUpdateError);
      } else {
        console.log('✅ [Fix Payment Connection] Updated vendor status');
      }

      return NextResponse.json({
        success: true,
        message: 'Payment connection created successfully',
        connection: {
          id: createdConnection.id,
          provider: createdConnection.provider,
          status: createdConnection.connection_status,
          provider_account_id: createdConnection.provider_account_id
        }
      });

    } else {
      // 5. If connections exist, ensure at least one is active
      const activeConnections = existingConnections.filter(c => c.connection_status === 'active');
      
      if (activeConnections.length === 0) {
        console.log('🔧 [Fix Payment Connection] Activating existing connection...');
        
        const connectionToActivate = existingConnections.find(c => c.provider === 'square') || existingConnections[0];
        
        const { error: activateError } = await supabase
          .from('payment_connections')
          .update({ connection_status: 'active', updated_at: new Date().toISOString() })
          .eq('id', connectionToActivate.id);

        if (activateError) {
          console.log('❌ [Fix Payment Connection] Failed to activate connection:', activateError);
          return NextResponse.json({ 
            error: 'Failed to activate payment connection', 
            details: activateError 
          }, { status: 500 });
        }

        console.log('✅ [Fix Payment Connection] Activated connection:', connectionToActivate.id);

        return NextResponse.json({
          success: true,
          message: 'Payment connection activated successfully',
          connection: {
            id: connectionToActivate.id,
            provider: connectionToActivate.provider,
            status: 'active',
            provider_account_id: connectionToActivate.provider_account_id
          }
        });
      } else {
        console.log('✅ [Fix Payment Connection] Active connections already exist');
        return NextResponse.json({
          success: true,
          message: 'Payment connection already active',
          connection: {
            id: activeConnections[0].id,
            provider: activeConnections[0].provider,
            status: activeConnections[0].connection_status,
            provider_account_id: activeConnections[0].provider_account_id
          }
        });
      }
    }

  } catch (error) {
    console.error('❌ [Fix Payment Connection] Error:', error);
    return NextResponse.json({ 
      error: 'Failed to fix payment connection', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
} 