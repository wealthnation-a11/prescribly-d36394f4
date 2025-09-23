import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const {
      to_email,
      subject,
      message,
      notification_type
    } = await req.json();

    console.log('Sending email notification:', { to_email, subject, notification_type });

    // For Gmail integration, we'll create a structured email body that can be easily copied
    // In a production environment, you would integrate with Gmail API or SMTP
    
    const emailBody = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${subject}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
        .content { background: #f8f9fa; padding: 20px; }
        .footer { background: #6b7280; color: white; padding: 15px; text-align: center; border-radius: 0 0 5px 5px; }
        .button { background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Prescribly - Healthcare Platform</h1>
        </div>
        <div class="content">
            <h2>${subject}</h2>
            <p>${message}</p>
            
            ${notification_type === 'appointment_request' ? `
                <p><strong>What to do next:</strong></p>
                <ul>
                    <li>Log in to your Prescribly doctor dashboard</li>
                    <li>Review the appointment details</li>
                    <li>Approve or reschedule as needed</li>
                </ul>
                <a href="https://392fc4b1-ef74-4478-87d5-4180c904cddf.lovableproject.com/doctor-dashboard" class="button">
                    Go to Dashboard
                </a>
            ` : ''}
            
            ${notification_type === 'appointment_approved' ? `
                <p><strong>Your appointment has been confirmed!</strong></p>
                <ul>
                    <li>You can now chat with your doctor</li>
                    <li>Access your appointment details in your dashboard</li>
                    <li>Prepare any questions for your consultation</li>
                </ul>
                <a href="https://392fc4b1-ef74-4478-87d5-4180c904cddf.lovableproject.com/user-dashboard" class="button">
                    Go to Dashboard
                </a>
            ` : ''}
        </div>
        <div class="footer">
            <p>Prescribly - Your Digital Healthcare Companion</p>
            <p>This is an automated message. Please do not reply to this email.</p>
        </div>
    </div>
</body>
</html>
    `;

    // Log the email for now (in production, you would send via Gmail API or SMTP)
    console.log('Email would be sent to:', to_email);
    console.log('Email HTML:', emailBody);

    // Create a mailto link for manual sending
    const mailtoLink = `mailto:${to_email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email notification prepared',
        mailto_link: mailtoLink,
        email_html: emailBody,
        note: 'In production, integrate with Gmail API or SMTP service'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-email-notification:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});