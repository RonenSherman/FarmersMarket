import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // Test basic connection
    const { data: connectionTest, error: connectionError } = await supabase
      .from('vendors')
      .select('count')
      .limit(1);

    if (connectionError) {
      return NextResponse.json({ 
        success: false, 
        error: 'Database connection failed',
        details: connectionError.message,
        code: connectionError.code
      }, { status: 500 });
    }

    // Test each table individually
    const tests: any = {};
    
    try {
      const { data: vendorsData, error: vendorsError } = await supabase
        .from('vendors')
        .select('*')
        .limit(1);
      tests.vendors = vendorsError ? { error: vendorsError.message } : { success: true, count: vendorsData?.length || 0 };
    } catch (e: any) {
      tests.vendors = { error: e?.message || 'Unknown error' };
    }

    try {
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .limit(1);
      tests.products = productsError ? { error: productsError.message } : { success: true, count: productsData?.length || 0 };
    } catch (e: any) {
      tests.products = { error: e?.message || 'Unknown error' };
    }

    try {
      const { data: marketDatesData, error: marketDatesError } = await supabase
        .from('market_dates')
        .select('*')
        .limit(1);
      tests.market_dates = marketDatesError ? { error: marketDatesError.message } : { success: true, count: marketDatesData?.length || 0 };
    } catch (e: any) {
      tests.market_dates = { error: e?.message || 'Unknown error' };
    }

    try {
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .limit(1);
      tests.orders = ordersError ? { error: ordersError.message } : { success: true, count: ordersData?.length || 0 };
    } catch (e: any) {
      tests.orders = { error: e?.message || 'Unknown error' };
    }

    return NextResponse.json({ 
      success: true,
      database_tests: tests,
      environment: {
        supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING',
        supabase_key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'MISSING'
      }
    });

  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: 'Unexpected error',
      details: error?.message || 'Unknown error' 
    }, { status: 500 });
  }
} 