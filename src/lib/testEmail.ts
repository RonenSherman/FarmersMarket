/**
 * Test email functionality - for debugging email issues
 */

interface TestEmailData {
  to: string;
  subject: string;
  message: string;
}

export async function sendTestEmail(data: TestEmailData): Promise<boolean> {
  // For quick testing - you can temporarily add your SendGrid API key here
  const SENDGRID_API_KEY = ''; // Add your key here for testing
  
  if (!SENDGRID_API_KEY) {
    console.log('🧪 TEST EMAIL SIMULATION');
    console.log('📧 To:', data.to);
    console.log('📧 Subject:', data.subject);
    console.log('📧 Message:', data.message);
    console.log('📧 Add your SendGrid API key to src/lib/testEmail.ts to test real emails');
    return true;
  }

  try {
    console.log('📧 SENDING TEST EMAIL via SendGrid to:', data.to);
    
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: data.to }],
          subject: data.subject
        }],
        from: {
          email: 'orders@duvallfarmersmarket.org', // Change this to your verified sender
          name: 'Duvall Farmers Market'
        },
        content: [{
          type: 'text/plain',
          value: data.message
        }]
      })
    });

    if (response.ok) {
      console.log('✅ Test email sent successfully!');
      return true;
    } else {
      const error = await response.text();
      console.error('❌ SendGrid error:', error);
      return false;
    }
  } catch (error) {
    console.error('❌ Email sending failed:', error);
    return false;
  }
}

// Quick test function you can call from browser console
(window as any).testEmail = async (email: string) => {
  return await sendTestEmail({
    to: email,
    subject: 'Test Email from Duvall Farmers Market',
    message: 'This is a test email to verify SendGrid integration is working!'
  });
}; 