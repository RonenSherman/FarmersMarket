import { NextResponse } from 'next/server';

export async function GET() {
  // This is safe for debugging - we're only showing if the variables exist, not their values
  return NextResponse.json({
    hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    hasAdminPassword: !!process.env.NEXT_PUBLIC_ADMIN_PASSWORD,
    supabaseUrlLength: process.env.NEXT_PUBLIC_SUPABASE_URL?.length || 0,
    supabaseKeyLength: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0,
    // Only show first 10 characters for verification
    supabaseUrlStart: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 10) || 'missing',
    environment: process.env.NODE_ENV
  });
} 