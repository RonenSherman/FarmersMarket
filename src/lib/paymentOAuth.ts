import { PaymentOAuthConfig, PaymentConnection } from '@/types';
import { supabase } from './supabase';

// OAuth configuration for Square and Stripe
export const PAYMENT_OAUTH_CONFIG = {
  square: {
    client_id: process.env.NEXT_PUBLIC_SQUARE_CLIENT_ID || process.env.SQUARE_CLIENT_ID!,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/square/callback`,
    scopes: ['MERCHANT_PROFILE_READ', 'PAYMENTS_WRITE', 'ORDERS_WRITE'],
    authorize_url: process.env.NODE_ENV === 'production' 
      ? 'https://connect.squareup.com/oauth2/authorize'
      : 'https://connect.squareupsandbox.com/oauth2/authorize'
  },
  stripe: {
    client_id: process.env.NEXT_PUBLIC_STRIPE_CLIENT_ID || process.env.STRIPE_CLIENT_ID!,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/stripe/callback`,
    scopes: ['read_write'],
    authorize_url: 'https://connect.stripe.com/oauth/authorize'
  }
};

export class PaymentOAuthService {
  
  /**
   * Generate OAuth authorization URL for a payment provider
   */
  static generateAuthUrl(provider: 'square' | 'stripe', vendorId: string, source: 'vendor' | 'admin' = 'vendor'): string {
    const config = PAYMENT_OAUTH_CONFIG[provider];
    
    // Validate configuration
    if (!config.client_id) {
      throw new Error(`${provider} client ID not configured`);
    }
    if (!config.redirect_uri || config.redirect_uri.includes('undefined')) {
      throw new Error(`${provider} redirect URI not configured properly`);
    }
    
    const state = this.generateState(vendorId, provider, source);
    
    const params = new URLSearchParams({
      client_id: config.client_id,
      scope: config.scopes.join(' '),
      redirect_uri: config.redirect_uri,
      response_type: 'code',
      state: state
    });

    if (provider === 'stripe') {
      // Stripe-specific parameters
      params.append('stripe_landing', 'register');
    }

    const authUrl = `${config.authorize_url}?${params.toString()}`;
    
    // Log for debugging (remove in production)
    console.log(`Generated ${provider} OAuth URL:`, authUrl);
    
    return authUrl;
  }

  /**
   * Generate secure state parameter for OAuth flow
   */
  private static generateState(vendorId: string, provider: string, source: 'vendor' | 'admin' = 'vendor'): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    return btoa(`${vendorId}:${provider}:${source}:${timestamp}:${random}`);
  }

  /**
   * Parse and validate state parameter
   */
  static parseState(state: string): { vendorId: string; provider: string; source: string; timestamp: number } | null {
    try {
      const decoded = atob(state);
      const [vendorId, provider, source, timestamp] = decoded.split(':');
      
      // Validate timestamp (state should be used within 10 minutes)
      const now = Date.now();
      const stateAge = now - parseInt(timestamp);
      if (stateAge > 10 * 60 * 1000) { // 10 minutes
        throw new Error('State expired');
      }

      return { vendorId, provider, source: source || 'vendor', timestamp: parseInt(timestamp) };
    } catch (error) {
      console.error('Invalid state parameter:', error);
      return null;
    }
  }

  /**
   * Exchange authorization code for access token (Square)
   */
  static async exchangeSquareCode(code: string, vendorId: string): Promise<PaymentConnection> {
    console.log('🔧 PaymentOAuthService.exchangeSquareCode: Starting');
    console.log('📋 Parameters:', {
      hasCode: !!code,
      codeLength: code?.length,
      vendorId: vendorId
    });
    
    // Build full URL for server-side requests
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const exchangeUrl = `${baseUrl}/api/oauth/square/exchange`;
    
    console.log('🔗 Making request to:', exchangeUrl);
    
    try {
      const response = await fetch(exchangeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, vendorId })
      });

      console.log('📋 Response status:', response.status);
      console.log('📋 Response ok:', response.ok);

      if (!response.ok) {
        console.log('❌ Exchange request failed');
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.log('📋 Error data:', JSON.stringify(errorData, null, 2));
        throw new Error(`Failed to exchange Square authorization code: ${errorData.error}`);
      }

      const result = await response.json();
      console.log('✅ Exchange successful');
      console.log('📋 Result:', {
        connectionId: result.id,
        vendorId: result.vendor_id,
        provider: result.provider,
        status: result.connection_status
      });
      
      return result;
    } catch (error) {
      console.error('❌ PaymentOAuthService.exchangeSquareCode: Failed');
      console.error('📋 Error:', error);
      throw error;
    }
  }

  /**
   * Exchange authorization code for access token (Stripe)
   */
  static async exchangeStripeCode(code: string, vendorId: string): Promise<PaymentConnection> {
    // Build full URL for server-side requests
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const exchangeUrl = `${baseUrl}/api/oauth/stripe/exchange`;
    
    const response = await fetch(exchangeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, vendorId })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`Failed to exchange Stripe authorization code: ${errorData.error}`);
    }

    return response.json();
  }

  /**
   * Get payment connection status for a vendor
   */
  static async getConnectionStatus(vendorId: string): Promise<PaymentConnection | null> {
    const { data, error } = await supabase
      .from('payment_connections')
      .select('*')
      .eq('vendor_id', vendorId)
      .eq('connection_status', 'active')
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data;
  }

  /**
   * Disconnect payment provider
   */
  static async disconnectProvider(vendorId: string, provider: 'square' | 'stripe'): Promise<void> {
    // First revoke the connection with the provider
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    await fetch(`${baseUrl}/api/oauth/revoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vendorId, provider })
    });

    // Update connection status in database
    const { error } = await supabase
      .from('payment_connections')
      .update({ 
        connection_status: 'revoked',
        updated_at: new Date().toISOString()
      })
      .eq('vendor_id', vendorId)
      .eq('provider', provider);

    if (error) throw error;

    // Update vendor record
    const { error: vendorError } = await supabase
      .from('vendors')
      .update({
        payment_connected: false,
        payment_provider: null,
        payment_connection_id: null,
        payment_account_id: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', vendorId);

    if (vendorError) throw vendorError;
  }

  /**
   * Verify connection is still active
   */
  static async verifyConnection(vendorId: string): Promise<boolean> {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const response = await fetch(`${baseUrl}/api/oauth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendorId })
      });

      return response.ok;
    } catch (error) {
      console.error('Connection verification failed:', error);
      return false;
    }
  }

  /**
   * Process payment for an order
   */
  static async processOrderPayment(orderId: string, vendorId: string): Promise<any> {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/payments/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, vendorId })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`Payment processing failed: ${errorData.error}`);
    }

    return response.json();
  }

  /**
   * Validate OAuth configuration
   */
  static validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check Square configuration
    if (!process.env.NEXT_PUBLIC_SQUARE_CLIENT_ID && !process.env.SQUARE_CLIENT_ID) {
      errors.push('Square Client ID not configured');
    }
    if (!process.env.SQUARE_CLIENT_SECRET) {
      errors.push('Square Client Secret not configured');
    }
    if (!process.env.NEXT_PUBLIC_APP_URL) {
      errors.push('App URL not configured');
    }
    
    // Check if URLs contain undefined
    const squareRedirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/square/callback`;
    if (squareRedirectUri.includes('undefined')) {
      errors.push('Square redirect URI contains undefined values');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
} 