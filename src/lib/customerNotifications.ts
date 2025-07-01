/**
 * Customer notification service for email and SMS alerts
 */

import type { Order, Vendor } from '@/types';
import sgMail from '@sendgrid/mail';
import { supabase } from './supabase';

// Simple in-memory token storage (shared with API route)
const tokenStore = new Map<string, { token: string; created: number; orderId: string }>();

// Export the token store so it can be accessed by the API route
export { tokenStore };

export type NotificationMethod = 'email';
export type OrderStatusType = Order['order_status'];

interface CustomerNotificationData {
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  vendorName: string;
  total: number;
  items: string;
  status: OrderStatusType;
  notificationMethod: NotificationMethod;
  cancellationToken?: string;
}

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

interface OrderStatusUpdateData {
  orderId: string;
  orderNumber: string;
  status: 'pending' | 'confirmed' | 'ready' | 'completed' | 'cancelled';
  items: Array<{
    product_name: string;
    quantity: number;
    unit_price: number;
    pricing_unit: string;
  }>;
  total: number;
  vendorName: string;
  vendorEmail: string;
  customerEmail?: string;
  customerPhone?: string;
  cancellationToken?: string;
}

interface VendorWelcomeData {
  vendorName: string;
  vendorEmail: string;
  paymentMethod?: string;
}

class CustomerNotificationService {
  private static instance: CustomerNotificationService;
  private apiKey: string = process.env.SENDGRID_API_KEY || '';
  private fromEmail: string = process.env.SENDGRID_FROM_EMAIL || 'orders@duvallfarmersmarket.org';
  private baseUrl: string = 'https://farmers-market-3ct4.vercel.app';

  static getInstance(): CustomerNotificationService {
    if (!CustomerNotificationService.instance) {
      CustomerNotificationService.instance = new CustomerNotificationService();
    }
    return CustomerNotificationService.instance;
  }

  // Get the correct base URL for the application
  private getBaseUrl(): string {
    // Always use the production URL for email links to ensure they work
    const productionUrl = 'https://farmers-market-3ct4.vercel.app';
    console.log('🔗 Using base URL for email links:', productionUrl);
    return productionUrl;
  }

  // Generate cancellation token for secure order management
  private generateCancellationToken(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  // Store cancellation token directly in memory
  private storeCancellationToken(orderId: string, token: string): void {
    try {
      const baseUrl = this.getBaseUrl();
      console.log('🔐 Storing cancellation token for order:', orderId);
      console.log('🔗 Cancellation URL will be:', `${baseUrl}/cancel-order/${orderId}?token=${token}`);
      
      const tokenData = {
        token,
        created: Date.now(),
        orderId
      };
      
      const key = `${orderId}:${token}`;
      tokenStore.set(key, tokenData);
      console.log('✅ Cancellation token stored successfully in memory');
    } catch (error) {
      console.error('Error storing cancellation token:', error);
    }
  }

  // Verify cancellation token
  async verifyCancellationToken(orderId: string, token: string): Promise<boolean> {
    try {
      const key = `${orderId}:${token}`;
      const storedData = tokenStore.get(key);
      
      if (!storedData) {
        console.log('🔐 Token not found for order:', orderId);
        return false;
      }
      
      // Check if token has expired (24 hours)
      const isExpired = Date.now() - storedData.created > 24 * 60 * 60 * 1000;
      if (isExpired) {
        tokenStore.delete(key); // Clean up expired token
        console.log('🔐 Token expired for order:', orderId);
        return false;
      }
      
      console.log('✅ Token verified for order:', orderId);
      return true;
    } catch (error) {
      console.error('Error verifying cancellation token:', error);
      return false;
    }
  }

  // Create email templates for different order statuses
  private createEmailTemplate(data: CustomerNotificationData): EmailTemplate {
    const { orderNumber, customerName, vendorName, total, items, status } = data;
    
    const statusEmojis = {
      'pending': '⏳',
      'confirmed': '✅',
      'ready': '📦',
      'completed': '🎉',
      'cancelled': '❌'
    };

    const statusMessages = {
      'pending': 'We have received your order and it\'s being processed.',
      'confirmed': 'Your order has been confirmed and is being prepared.',
      'ready': 'Your order is ready for pickup!',
      'completed': 'Your order has been completed. Thank you!',
      'cancelled': 'Your order has been cancelled.'
    };

    // Show cancellation link only for orders that can be cancelled
    const canBeCancelled = data.status === 'pending' || data.status === 'confirmed';
    const baseUrl = this.getBaseUrl();
    const cancellationLink = data.cancellationToken && canBeCancelled ? 
      `\n\n🚫 Need to cancel? <a href="${baseUrl}/cancel-order/${data.orderId}?token=${data.cancellationToken}" style="color: #dc2626; text-decoration: underline;">Click here to cancel your order</a>` : '';

    const subject = `${statusEmojis[status]} Order ${orderNumber} - ${status.charAt(0).toUpperCase() + status.slice(1)}`;
    
    const html = `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">${statusEmojis[status]} Duvall Farmers Market Online Service</h1>
          <p style="margin: 10px 0 0; font-size: 16px; opacity: 0.9;">Order Update</p>
        </div>
        
        <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
          <h2 style="color: #059669; margin: 0 0 20px;">Hi ${customerName}!</h2>
          
          <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 15px; color: #374151;">Order #${orderNumber}</h3>
            <p style="margin: 5px 0; color: #6b7280;"><strong>Status:</strong> <span style="color: #059669; font-weight: bold;">${status.toUpperCase()}</span></p>
            <p style="margin: 5px 0; color: #6b7280;"><strong>Vendor:</strong> ${vendorName}</p>
            <p style="margin: 5px 0; color: #6b7280;"><strong>Total:</strong> $${total.toFixed(2)}</p>
          </div>
          
          <div style="background: ${status === 'ready' ? '#fef3c7' : '#f3f4f6'}; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; font-weight: bold; color: ${status === 'ready' ? '#d97706' : '#374151'};">
              ${statusMessages[status]}
            </p>
            ${status === 'ready' ? '<p style="margin: 10px 0 0; color: #92400e;">Please pick up your order at the Duvall Farmers Market.</p>' : ''}
          </div>
          
          <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
            <h4 style="margin: 0 0 10px; color: #374151;">Order Items:</h4>
            <div style="color: #6b7280; white-space: pre-line;">${items}</div>
          </div>
          
          ${cancellationLink ? `<div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 20px; text-align: center; background: #fef2f2; border-radius: 8px; padding: 20px;">
            <h4 style="margin: 0 0 10px; color: #dc2626;">Need to Cancel?</h4>
            <p style="margin: 0 0 15px; color: #7f1d1d; font-size: 14px;">You can cancel this order anytime before it's marked as ready for pickup.</p>
            <a href="${baseUrl}/cancel-order/${data.orderId}?token=${data.cancellationToken}" 
               style="background: #dc2626; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              🚫 Cancel Order
            </a>
          </div>` : ''}
        </div>
        
        <div style="background: #f9fafb; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none;">
          <p style="margin: 0; color: #6b7280; font-size: 14px;">
            📍 Duvall Farmers Market<br>
            🕒 Saturdays 9:00 AM - 2:00 PM<br>
            📧 Questions? Reply to this email<br>
            <small>Powered by Duvall Farmers Market Online Service</small>
          </p>
        </div>
      </div>
    `;

    const text = `
      Duvall Farmers Market - Order Update
      
      Hi ${customerName}!
      
      Order #${orderNumber}
      Status: ${status.toUpperCase()}
      Vendor: ${vendorName}
      Total: $${total.toFixed(2)}
      
      ${statusMessages[status]}
      
      Order Items:
      ${items}
      
      ${data.cancellationToken && canBeCancelled ? `Need to cancel? Visit: ${baseUrl}/cancel-order/${data.orderId}?token=${data.cancellationToken}` : ''}
      
      Duvall Farmers Market
      Saturdays 9:00 AM - 2:00 PM
      Powered by Duvall Farmers Market Online Service
    `;

    return { subject, html, text };
  }

  // Send email notification
  private async sendEmail(data: CustomerNotificationData): Promise<boolean> {
    const template = this.createEmailTemplate(data);
    
    if (!this.apiKey) {
      console.log('📧 EMAIL SIMULATION - SendGrid API key not configured');
      console.log('📧 Would send to:', data.customerEmail);
      console.log('📧 Subject:', template.subject);
      console.log('📧 HTML content preview:', template.html.substring(0, 200) + '...');
      console.log('📧 To enable real emails, set SENDGRID_API_KEY environment variable');
      return true; // Return true for demo purposes
    }

        try {
      console.log('📧 SENDING REAL EMAIL via SendGrid');
      console.log('📧 To:', data.customerEmail);
      console.log('📧 From:', this.fromEmail);
      console.log('📧 Subject:', template.subject);
      
      const emailPayload = {
        personalizations: [{
          to: [{ email: data.customerEmail, name: data.customerName }],
          subject: template.subject
        }],
        from: {
          email: this.fromEmail,
          name: 'Duvall Farmers Market'
        },
        content: [
          { type: 'text/plain', value: template.text },
          { type: 'text/html', value: template.html }
        ]
      };
      
      console.log('📧 Email payload prepared');
      
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailPayload)
      });

      if (response.ok) {
        console.log('✅ Email sent successfully via SendGrid!');
        return true;
      } else {
        const errorText = await response.text();
        console.error('❌ SendGrid API error:', response.status, errorText);
        return false;
      }
    } catch (error) {
      console.error('❌ Failed to send email:', error);
      return false;
    }
  }

  // Main method to send notifications (email only)
  async sendOrderNotification(
    order: Order & { vendors: Vendor },
    notificationMethod: NotificationMethod,
    includeCancellation = false
  ): Promise<boolean> {
    const cancellationToken = includeCancellation ? this.generateCancellationToken() : undefined;
    
    if (cancellationToken) {
      this.storeCancellationToken(order.id, cancellationToken);
    }

    const items = order.items.map(item => 
      `• ${item.product.name} x${item.quantity} - $${(item.product.price * item.quantity).toFixed(2)}`
    ).join('\n');

    const data: CustomerNotificationData = {
      orderId: order.id,
      orderNumber: order.order_number,
      customerName: order.customer_name,
      customerEmail: order.customer_email,
      customerPhone: order.customer_phone,
      vendorName: order.vendors.name,
      total: order.total,
      items,
      status: order.order_status,
      notificationMethod,
      cancellationToken
    };

    // Only send email notifications
    return await this.sendEmail(data);
  }

  // Send order confirmation (with cancellation option)
  async sendOrderConfirmation(
    order: Order & { vendors: Vendor },
    notificationMethod: NotificationMethod
  ): Promise<boolean> {
    return this.sendOrderNotification(order, notificationMethod, true);
  }

  // Send order status update
  async sendOrderStatusUpdate(
    order: Order & { vendors: Vendor },
    notificationMethod: NotificationMethod
  ): Promise<boolean> {
    // Include cancellation token for orders that can still be cancelled
    const canBeCancelled = order.order_status === 'pending' || order.order_status === 'confirmed';
    return this.sendOrderNotification(order, notificationMethod, canBeCancelled);
  }

  // Send vendor welcome email
  async sendVendorWelcomeEmail(vendor: {
    business_name: string;
    contact_email: string;
    payment_provider?: string;
    payment_connected?: boolean;
  }): Promise<boolean> {
    console.log('📧 CustomerNotificationService: Sending vendor welcome email');
    console.log('📧 Vendor:', vendor.business_name);
    console.log('📧 Email:', vendor.contact_email);
    console.log('📧 Payment provider:', vendor.payment_provider);
    console.log('📧 API Key configured:', !!this.apiKey);
    console.log('📧 From email:', this.fromEmail);
    
    const template = this.createVendorWelcomeTemplate(vendor);
    
    if (!this.apiKey) {
      console.log('📧 VENDOR EMAIL SIMULATION - SendGrid API key not configured');
      console.log('📧 Would send to:', vendor.contact_email);
      console.log('📧 Subject:', template.subject);
      console.log('📧 HTML content preview:', template.html.substring(0, 200) + '...');
      console.log('📧 To enable real emails, set SENDGRID_API_KEY environment variable');
      return true; // Return true for demo purposes
    }

    try {
      console.log('📧 SENDING REAL VENDOR WELCOME EMAIL via SendGrid');
      console.log('📧 To:', vendor.contact_email);
      console.log('📧 From:', this.fromEmail);
      console.log('📧 Subject:', template.subject);
      
      const emailPayload = {
        personalizations: [{
          to: [{ email: vendor.contact_email, name: vendor.business_name }],
          subject: template.subject
        }],
        from: {
          email: this.fromEmail,
          name: 'Duvall Farmers Market Online Service'
        },
        content: [
          { type: 'text/plain', value: template.text },
          { type: 'text/html', value: template.html }
        ]
      };
      
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailPayload)
      });

      if (response.ok) {
        console.log('✅ Vendor welcome email sent successfully via SendGrid!');
        return true;
      } else {
        const errorText = await response.text();
        console.error('❌ SendGrid API error for vendor email:', response.status, errorText);
        return false;
      }
    } catch (error) {
      console.error('❌ Failed to send vendor welcome email:', error);
      return false;
    }
  }

  // Create vendor welcome email template
  private createVendorWelcomeTemplate(vendor: {
    business_name: string;
    contact_email: string;
    payment_provider?: string;
    payment_connected?: boolean;
  }): EmailTemplate {
    const paymentStatus = vendor.payment_connected && vendor.payment_provider 
      ? `✅ ${vendor.payment_provider.charAt(0).toUpperCase() + vendor.payment_provider.slice(1)} payment connected`
      : '⚠️ Payment setup needed';

    const subject = `🎉 Welcome to Duvall Farmers Market Online Service - ${vendor.business_name}!`;
    
    const html = `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">🎉 Welcome to Duvall Farmers Market Online Service!</h1>
          <p style="margin: 10px 0 0; font-size: 16px; opacity: 0.9;">Vendor Registration Complete</p>
        </div>
        
        <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
          <h2 style="color: #059669; margin: 0 0 20px;">Welcome, ${vendor.business_name}!</h2>
          
          <p style="margin: 0 0 20px; font-size: 16px;">
            Congratulations! Your vendor registration has been successfully completed. We're excited to have you join the Duvall Farmers Market Online Service community.
          </p>
          
          <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 15px; color: #374151;">Registration Details</h3>
            <p style="margin: 5px 0; color: #6b7280;"><strong>Business Name:</strong> ${vendor.business_name}</p>
            <p style="margin: 5px 0; color: #6b7280;"><strong>Contact Email:</strong> ${vendor.contact_email}</p>
            <p style="margin: 5px 0; color: #6b7280;"><strong>Payment Status:</strong> ${paymentStatus}</p>
          </div>
          
          <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 15px; color: #d97706;">📋 Next Steps</h3>
            <ul style="margin: 0; padding-left: 20px; color: #92400e;">
              <li style="margin: 5px 0;">Check your email for market updates and announcements</li>
              <li style="margin: 5px 0;">Prepare your products and inventory for market days</li>
              <li style="margin: 5px 0;">Review market guidelines and vendor requirements</li>
              ${!vendor.payment_connected ? '<li style="margin: 5px 0;"><strong>Complete your payment setup to start accepting orders</strong></li>' : ''}
            </ul>
          </div>
          
          <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 15px; color: #0369a1;">📅 Market Information</h3>
            <p style="margin: 5px 0; color: #0c4a6e;"><strong>Location:</strong> Duvall Farmers Market</p>
            <p style="margin: 5px 0; color: #0c4a6e;"><strong>Schedule:</strong> Saturdays 9:00 AM - 2:00 PM</p>
            <p style="margin: 5px 0; color: #0c4a6e;"><strong>Setup Time:</strong> 8:00 AM - 9:00 AM</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://farmers-market-3ct4.vercel.app'}/shop" 
               style="background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              🛒 View Market Shop
            </a>
          </div>
        </div>
        
        <div style="background: #f9fafb; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none;">
          <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px;">
            <strong>Questions or need help?</strong><br>
            Reply to this email or contact our market coordinator
          </p>
          <p style="margin: 0; color: #6b7280; font-size: 14px;">
            📧 info@duvallfarmersmarket.org<br>
            🌐 duvallfarmersmarket.org
          </p>
        </div>
      </div>
    `;

    const text = `
      Welcome to Duvall Farmers Market Online Service!
      
      Congratulations, ${vendor.business_name}!
      
      Your vendor registration has been successfully completed. We're excited to have you join the Duvall Farmers Market Online Service community.
      
      Registration Details:
      - Business Name: ${vendor.business_name}
      - Contact Email: ${vendor.contact_email}
      - Payment Status: ${paymentStatus}
      
      Next Steps:
      • Check your email for market updates and announcements
      • Prepare your products and inventory for market days
      • Review market guidelines and vendor requirements
      ${!vendor.payment_connected ? '• Complete your payment setup to start accepting orders' : ''}
      
      Market Information:
      📅 Schedule: Saturdays 9:00 AM - 2:00 PM
      🕒 Setup Time: 8:00 AM - 9:00 AM
      📍 Location: Duvall Farmers Market
      
      Questions or need help?
      📧 info@duvallfarmersmarket.org
      🌐 duvallfarmersmarket.org
      
      Welcome to the community!
      Duvall Farmers Market Online Service Team
    `;

    return { subject, html, text };
  }
}

export const customerNotificationService = CustomerNotificationService.getInstance(); 