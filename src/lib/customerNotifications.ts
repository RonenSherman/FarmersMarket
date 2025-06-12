/**
 * Customer notification service for email and SMS alerts
 */

import type { Order, Vendor } from '@/types';

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

class CustomerNotificationService {
  private static instance: CustomerNotificationService;
  private apiKey: string = process.env.SENDGRID_API_KEY || '';
  private twilioSid: string = process.env.TWILIO_ACCOUNT_SID || '';
  private twilioToken: string = process.env.TWILIO_AUTH_TOKEN || '';
  private twilioPhone: string = process.env.TWILIO_PHONE_NUMBER || '';
  private baseUrl: string = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

  static getInstance(): CustomerNotificationService {
    if (!CustomerNotificationService.instance) {
      CustomerNotificationService.instance = new CustomerNotificationService();
    }
    return CustomerNotificationService.instance;
  }

  // Generate cancellation token for secure order management
  private generateCancellationToken(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  // Store cancellation token (in production, use database)
  private storeCancellationToken(orderId: string, token: string): void {
    if (typeof window !== 'undefined') {
      const tokens = JSON.parse(localStorage.getItem('cancellation_tokens') || '{}');
      tokens[orderId] = { token, created: Date.now() };
      localStorage.setItem('cancellation_tokens', JSON.stringify(tokens));
    }
  }

  // Verify cancellation token
  public verifyCancellationToken(orderId: string, token: string): boolean {
    if (typeof window !== 'undefined') {
      const tokens = JSON.parse(localStorage.getItem('cancellation_tokens') || '{}');
      const storedData = tokens[orderId];
      if (storedData && storedData.token === token) {
        // Token expires after 24 hours
        const isExpired = Date.now() - storedData.created > 24 * 60 * 60 * 1000;
        return !isExpired;
      }
    }
    return false;
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

    const cancellationLink = data.cancellationToken ? 
      `\n\n🚫 Need to cancel? <a href="${this.baseUrl}/cancel-order/${data.orderId}?token=${data.cancellationToken}" style="color: #dc2626; text-decoration: underline;">Click here to cancel your order</a>` : '';

    const subject = `${statusEmojis[status]} Order ${orderNumber} - ${status.charAt(0).toUpperCase() + status.slice(1)}`;
    
    const html = `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">${statusEmojis[status]} Duvall Farmers Market</h1>
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
          
          ${cancellationLink ? `<div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 20px; text-align: center;">${cancellationLink}</div>` : ''}
        </div>
        
        <div style="background: #f9fafb; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none;">
          <p style="margin: 0; color: #6b7280; font-size: 14px;">
            📍 Duvall Farmers Market<br>
            🕒 Saturdays 9:00 AM - 2:00 PM<br>
            📧 Questions? Reply to this email
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
      
      ${data.cancellationToken ? `Need to cancel? Visit: ${this.baseUrl}/cancel-order/${data.orderId}?token=${data.cancellationToken}` : ''}
      
      Duvall Farmers Market
      Saturdays 9:00 AM - 2:00 PM
    `;

    return { subject, html, text };
  }

  // Send email notification
  private async sendEmail(data: CustomerNotificationData): Promise<boolean> {
    if (!this.apiKey) {
      console.log('📧 SendGrid API key not configured. Email would be sent to:', data.customerEmail);
      console.log('📧 Email subject:', this.createEmailTemplate(data).subject);
      console.log('📧 Set SENDGRID_API_KEY environment variable to enable real emails');
      return true; // Return true for demo purposes
    }

    try {
      const template = this.createEmailTemplate(data);
      
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{
            to: [{ email: data.customerEmail, name: data.customerName }],
            subject: template.subject
          }],
          from: {
            email: 'orders@duvallfarmersmarket.org',
            name: 'Duvall Farmers Market'
          },
          content: [
            { type: 'text/plain', value: template.text },
            { type: 'text/html', value: template.html }
          ]
        })
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to send email:', error);
      return false;
    }
  }

  // Send SMS notification
  private async sendSMS(data: CustomerNotificationData): Promise<boolean> {
    if (!this.twilioSid || !this.twilioToken) {
      console.log('📱 Twilio credentials not configured. SMS would be sent to:', data.customerPhone);
      console.log('📱 Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN environment variables to enable real SMS');
      return true; // Return true for demo purposes
    }
    
    if (!data.customerPhone) {
      console.log('📱 No phone number provided for SMS notification');
      return false;
    }

    try {
      const statusEmojis = {
        'pending': '⏳',
        'confirmed': '✅',
        'ready': '📦',
        'completed': '🎉',
        'cancelled': '❌'
      };

      const message = `${statusEmojis[data.status]} Duvall Farmers Market

Order #${data.orderNumber} - ${data.status.toUpperCase()}
${data.vendorName} - $${data.total.toFixed(2)}

${data.status === 'ready' ? 'Ready for pickup!' : `Status: ${data.status}`}

${data.cancellationToken ? `Cancel: ${this.baseUrl}/cancel-order/${data.orderId}?token=${data.cancellationToken}` : ''}`;

      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${this.twilioSid}/Messages.json`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${this.twilioSid}:${this.twilioToken}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          From: this.twilioPhone,
          To: data.customerPhone,
          Body: message
        })
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to send SMS:', error);
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
    return this.sendOrderNotification(order, notificationMethod, false);
  }
}

export const customerNotificationService = CustomerNotificationService.getInstance(); 