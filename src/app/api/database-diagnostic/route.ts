import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request: NextRequest) {
  try {
    const diagnostics = {
      database_connection: false,
      vendors_table_info: null as any,
      vendor_sample_data: null as any,
      schema_issues: [] as string[],
      data_issues: [] as any[],
      payment_issues: [] as string[],
      timestamp: new Date().toISOString()
    };

    // Test database connection
    const { data: connectionTest, error: connectionError } = await supabase
      .from('vendors')
      .select('count')
      .limit(1);
    
    if (connectionError) {
      return NextResponse.json({
        error: 'Database connection failed',
        details: connectionError.message,
        diagnostics
      }, { status: 500 });
    }
    
    diagnostics.database_connection = true;

    // Get vendors table column information
    let columnInfo = null;
    let columnError = null;
    
    try {
      const result = await supabase.rpc('get_table_columns', { table_name: 'vendors' });
      columnInfo = result.data;
      columnError = result.error;
    } catch {
      // Fallback: Try to get column info by selecting all columns
      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .limit(1);
      
      if (data && data.length > 0) {
        columnInfo = Object.keys(data[0]).map(col => ({ column_name: col }));
        columnError = null;
      } else {
        columnInfo = null;
        columnError = error;
      }
    }

    if (columnError) {
      diagnostics.schema_issues.push(`Cannot get column info: ${columnError.message}`);
    } else {
      diagnostics.vendors_table_info = columnInfo;
    }

    // Get all vendors with all available fields
    const { data: vendors, error: vendorsError } = await supabase
      .from('vendors')
      .select('*')
      .order('created_at', { ascending: false });

    if (vendorsError) {
      diagnostics.schema_issues.push(`Cannot fetch vendors: ${vendorsError.message}`);
    } else {
      diagnostics.vendor_sample_data = {
        total_count: vendors.length,
        vendors: vendors.map(vendor => ({
          id: vendor.id,
          name: vendor.name,
          contact_email: vendor.contact_email,
          // Check for approval fields
          is_approved: vendor.is_approved,
          approved: vendor.approved,
          is_active: vendor.is_active,
          active: vendor.active,
          // Check for payment fields  
          payment_connected: vendor.payment_connected,
          payment_provider: vendor.payment_provider,
          payment_account_id: vendor.payment_account_id,
          payment_connection_id: vendor.payment_connection_id,
          payment_connected_at: vendor.payment_connected_at,
          payment_last_verified: vendor.payment_last_verified,
          // Other fields
          product_type: vendor.product_type,
          payment_method: vendor.payment_method,
          api_consent: vendor.api_consent,
          available_dates: vendor.available_dates,
          created_at: vendor.created_at,
          updated_at: vendor.updated_at
        }))
      };

      // Analyze schema issues
      const expectedFields = [
        'id', 'name', 'contact_email', 'contact_phone', 'product_type',
        'api_consent', 'payment_method', 'available_dates', 'created_at', 'updated_at'
      ];
      
      const paymentFields = [
        'payment_connected', 'payment_provider', 'payment_account_id', 
        'payment_connection_id', 'payment_connected_at', 'payment_last_verified'
      ];

      const approvalFields = ['is_approved', 'approved', 'is_active', 'active'];

      if (vendors.length > 0) {
        const sampleVendor = vendors[0];
        const actualFields = Object.keys(sampleVendor);
        
        // Check for missing expected fields
        expectedFields.forEach(field => {
          if (!actualFields.includes(field)) {
            diagnostics.schema_issues.push(`Missing expected field: ${field}`);
          }
        });

        // Check for missing payment fields
        paymentFields.forEach(field => {
          if (!actualFields.includes(field)) {
            diagnostics.schema_issues.push(`Missing payment field: ${field}`);
          }
        });

        // Check approval field consistency
        const hasIsApproved = actualFields.includes('is_approved');
        const hasApproved = actualFields.includes('approved');
        const hasIsActive = actualFields.includes('is_active');
        const hasActive = actualFields.includes('active');

        if (!hasIsApproved && !hasApproved) {
          diagnostics.schema_issues.push('No approval field found (neither is_approved nor approved)');
        }
        if (!hasIsActive && !hasActive) {
          diagnostics.schema_issues.push('No active field found (neither is_active nor active)');
        }

        // Analyze data issues
        vendors.forEach((vendor, index) => {
          const vendorIssues = [];
          
          // Check approval status
          if (vendor.is_approved === false || vendor.approved === false) {
            vendorIssues.push('Not approved');
          }
          
          // Check active status
          if (vendor.is_active === false || vendor.active === false) {
            vendorIssues.push('Not active');
          }
          
          // Check payment consistency
          if (vendor.payment_connected === true) {
            if (!vendor.payment_provider) {
              vendorIssues.push('Payment connected but no provider');
            }
            if (!vendor.payment_account_id) {
              vendorIssues.push('Payment connected but no account ID');
            }
          }
          
          if (vendorIssues.length > 0) {
            diagnostics.data_issues.push({
              vendor_id: vendor.id,
              vendor_name: vendor.name,
              issues: vendorIssues
            });
          }
        });
      }

      // Check payment_connections table
      const { data: paymentConnections, error: paymentConnectionsError } = await supabase
        .from('payment_connections')
        .select('*');

      if (paymentConnectionsError) {
        diagnostics.payment_issues.push(`Cannot fetch payment_connections: ${paymentConnectionsError.message}`);
      } else {
        diagnostics.payment_issues.push(`Found ${paymentConnections.length} payment connection records`);
        
        // Check for inconsistencies
        if (vendors.length > 0) {
          const vendorsWithPayment = vendors.filter(v => v.payment_connected === true);
          const vendorConnectionMap = new Map(paymentConnections.map(pc => [pc.vendor_id, pc]));
          
          vendorsWithPayment.forEach(vendor => {
            if (!vendorConnectionMap.has(vendor.id)) {
              diagnostics.payment_issues.push(
                `Vendor ${vendor.name} (${vendor.id}) has payment_connected=true but no payment_connections record`
              );
            }
          });
        }
      }
    }

    return NextResponse.json({
      status: 'success',
      diagnostics,
      summary: {
        total_vendors: vendors?.length || 0,
        schema_issues: diagnostics.schema_issues.length,
        data_issues: diagnostics.data_issues.length,
        payment_issues: diagnostics.payment_issues.length
      }
    });

  } catch (error) {
    console.error('Database diagnostic error:', error);
    return NextResponse.json({
      error: 'Diagnostic failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 