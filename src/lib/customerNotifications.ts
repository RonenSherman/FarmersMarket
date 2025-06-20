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
  private fromEmail: string = process.env.SENDGRID_FROM_EMAIL || 'orders@duvallfarmersmarket.org';
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

  // Store cancellation token (server-side)
  private async storeCancellationToken(orderId: string, token: string): Promise<void> {
    try {
      const response = await fetch('/api/verify-cancellation-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'store',
          orderId,
          token
        })
      });
      
      if (!response.ok) {
        console.error('Failed to store cancellation token');
      }
    } catch (error) {
      console.error('Error storing cancellation token:', error);
    }
  }

  // Verify cancellation token (server-side)
  public async verifyCancellationToken(orderId: string, token: string): Promise<boolean> {
    try {
      const response = await fetch('/api/verify-cancellation-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify',
          orderId,
          token
        })
      });
      
      if (!response.ok) {
        return false;
      }
      
      const result = await response.json();
      return result.valid;
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
      await this.storeCancellationToken(order.id, cancellationToken);
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