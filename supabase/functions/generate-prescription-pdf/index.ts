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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header required');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Invalid authorization token');
    }

    const { prescription, prescriptions, type } = await req.json();

    // Generate HTML content for PDF
    let htmlContent = '';
    
    if (type === 'single' && prescription) {
      htmlContent = generateSinglePrescriptionHTML(prescription, user);
    } else if (type === 'all' && prescriptions) {
      htmlContent = generateAllPrescriptionsHTML(prescriptions, user);
    } else {
      throw new Error('Invalid request parameters');
    }

    // For this demo, we'll return a simple HTML-to-PDF conversion
    // In a real implementation, you would use a PDF generation library like Puppeteer or jsPDF
    const pdfResponse = await generatePDFFromHTML(htmlContent);

    // Store the PDF in Supabase Storage
    const fileName = type === 'single' 
      ? `prescription-${prescription.id}-${Date.now()}.pdf`
      : `all-prescriptions-${user.id}-${Date.now()}.pdf`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('prescriptions')
      .upload(fileName, pdfResponse, {
        contentType: 'application/pdf',
        upsert: false
      });

    if (uploadError) {
      throw uploadError;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('prescriptions')
      .getPublicUrl(fileName);

    return new Response(
      JSON.stringify({ url: urlData.publicUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('PDF generation error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to generate PDF' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

function generateSinglePrescriptionHTML(prescription: any, user: any): string {
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body { 
                font-family: 'Times New Roman', serif; 
                margin: 40px; 
                line-height: 1.6;
                color: #333;
            }
            .header { 
                text-align: center; 
                border-bottom: 3px solid #2563eb; 
                padding-bottom: 20px; 
                margin-bottom: 30px; 
            }
            .logo { 
                font-size: 28px; 
                font-weight: bold; 
                color: #2563eb; 
                margin-bottom: 5px; 
            }
            .tagline { 
                font-size: 14px; 
                color: #666; 
                font-style: italic; 
            }
            .prescription-header {
                display: flex;
                justify-content: space-between;
                margin-bottom: 30px;
                padding: 15px;
                background-color: #f8fafc;
                border-left: 4px solid #2563eb;
            }
            .patient-info { 
                margin-bottom: 20px; 
            }
            .condition { 
                font-size: 24px; 
                font-weight: bold; 
                color: #1e40af; 
                margin: 20px 0; 
                text-align: center;
                text-transform: uppercase;
                letter-spacing: 1px;
            }
            .rx-symbol { 
                font-size: 36px; 
                font-weight: bold; 
                color: #2563eb; 
                margin: 20px 0; 
            }
            .medication { 
                margin: 15px 0; 
                padding: 15px;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                background-color: #fefefe;
            }
            .med-name { 
                font-size: 18px; 
                font-weight: bold; 
                color: #1e40af;
                margin-bottom: 8px;
            }
            .med-dosage { 
                font-size: 14px; 
                color: #059669; 
                font-weight: 600;
                margin-bottom: 5px;
            }
            .med-usage { 
                font-size: 14px; 
                color: #374151; 
                margin-left: 10px;
            }
            .signature { 
                margin-top: 40px; 
                text-align: right; 
            }
            .disclaimer { 
                margin-top: 30px; 
                padding: 15px; 
                background-color: #fef2f2; 
                border: 1px solid #fca5a5; 
                border-radius: 8px;
                font-size: 12px; 
                color: #dc2626; 
            }
            .footer { 
                text-align: center; 
                margin-top: 40px; 
                padding-top: 20px; 
                border-top: 1px solid #e5e7eb; 
                font-size: 12px; 
                color: #6b7280; 
            }
        </style>
    </head>
    <body>
        <div class="header">
            <div class="logo">PRESCRIBLY</div>
            <div class="tagline">AI-Powered Healthcare Assistant</div>
        </div>

        <div class="prescription-header">
            <div class="patient-info">
                <strong>Patient:</strong> ${user.email}<br>
                <strong>Date:</strong> ${currentDate}
            </div>
            <div>
                <strong>Prescription ID:</strong> ${prescription.id.slice(0, 8).toUpperCase()}
            </div>
        </div>

        <div class="condition">
            DIAGNOSIS: ${prescription.condition_name}
        </div>

        <div class="rx-symbol">℞</div>

        ${prescription.drugs.map((drug: any) => `
            <div class="medication">
                <div class="med-name">${drug.name}</div>
                <div class="med-dosage">Dosage: ${drug.dosage}</div>
                <div class="med-usage">${drug.usage}</div>
            </div>
        `).join('')}

        <div class="signature">
            <p><strong>Prescribly AI Assistant</strong></p>
            <p>Digital Health Platform</p>
            <p>Generated on: ${currentDate}</p>
        </div>

        <div class="disclaimer">
            <strong>⚠️ IMPORTANT DISCLAIMER:</strong><br>
            This prescription is AI-generated and is for informational purposes only. 
            Always consult with a licensed medical professional before taking any medication. 
            This should not replace professional medical advice, diagnosis, or treatment.
        </div>

        <div class="footer">
            <p><strong>Prescribly</strong> - Your AI Healthcare Companion</p>
            <p>For support: support@prescribly.com | www.prescribly.com</p>
        </div>
    </body>
    </html>
  `;
}

function generateAllPrescriptionsHTML(prescriptions: any[], user: any): string {
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body { 
                font-family: 'Times New Roman', serif; 
                margin: 40px; 
                line-height: 1.6;
                color: #333;
            }
            .header { 
                text-align: center; 
                border-bottom: 3px solid #2563eb; 
                padding-bottom: 20px; 
                margin-bottom: 30px; 
            }
            .logo { 
                font-size: 28px; 
                font-weight: bold; 
                color: #2563eb; 
                margin-bottom: 5px; 
            }
            .tagline { 
                font-size: 14px; 
                color: #666; 
                font-style: italic; 
            }
            .patient-header {
                text-align: center;
                margin-bottom: 30px;
                padding: 15px;
                background-color: #f8fafc;
                border-left: 4px solid #2563eb;
            }
            .prescription-entry {
                margin-bottom: 40px;
                padding: 20px;
                border: 2px solid #e5e7eb;
                border-radius: 12px;
                page-break-inside: avoid;
            }
            .condition { 
                font-size: 20px; 
                font-weight: bold; 
                color: #1e40af; 
                margin-bottom: 15px;
                text-align: center;
            }
            .prescription-date {
                text-align: right;
                font-size: 12px;
                color: #6b7280;
                margin-bottom: 15px;
            }
            .medication { 
                margin: 10px 0; 
                padding: 10px;
                background-color: #f9fafb;
                border-radius: 6px;
            }
            .med-name { 
                font-size: 16px; 
                font-weight: bold; 
                color: #1e40af;
            }
            .med-details { 
                font-size: 14px; 
                color: #374151; 
                margin-top: 5px;
            }
            .disclaimer { 
                margin-top: 30px; 
                padding: 15px; 
                background-color: #fef2f2; 
                border: 1px solid #fca5a5; 
                border-radius: 8px;
                font-size: 12px; 
                color: #dc2626; 
            }
            .footer { 
                text-align: center; 
                margin-top: 40px; 
                padding-top: 20px; 
                border-top: 1px solid #e5e7eb; 
                font-size: 12px; 
                color: #6b7280; 
            }
        </style>
    </head>
    <body>
        <div class="header">
            <div class="logo">PRESCRIBLY</div>
            <div class="tagline">AI-Powered Healthcare Assistant</div>
        </div>

        <div class="patient-header">
            <h2>Complete Prescription History</h2>
            <p><strong>Patient:</strong> ${user.email}</p>
            <p><strong>Report Generated:</strong> ${currentDate}</p>
            <p><strong>Total Prescriptions:</strong> ${prescriptions.length}</p>
        </div>

        ${prescriptions.map((prescription, index) => `
            <div class="prescription-entry">
                <div class="prescription-date">
                    Prescription #${index + 1} - ${new Date(prescription.created_at).toLocaleDateString()}
                </div>
                <div class="condition">${prescription.condition_name}</div>
                
                ${prescription.drugs.map((drug: any) => `
                    <div class="medication">
                        <div class="med-name">${drug.name}</div>
                        <div class="med-details">
                            <strong>Dosage:</strong> ${drug.dosage}<br>
                            <strong>Usage:</strong> ${drug.usage}
                        </div>
                    </div>
                `).join('')}
            </div>
        `).join('')}

        <div class="disclaimer">
            <strong>⚠️ IMPORTANT DISCLAIMER:</strong><br>
            These prescriptions are AI-generated and are for informational purposes only. 
            Always consult with a licensed medical professional before taking any medication. 
            This should not replace professional medical advice, diagnosis, or treatment.
        </div>

        <div class="footer">
            <p><strong>Prescribly</strong> - Your AI Healthcare Companion</p>
            <p>For support: support@prescribly.com | www.prescribly.com</p>
        </div>
    </body>
    </html>
  `;
}

async function generatePDFFromHTML(html: string): Promise<Uint8Array> {
  // For this demo, we'll create a simple PDF placeholder
  // In a real implementation, you would use Puppeteer or similar
  const encoder = new TextEncoder();
  const pdfHeader = "%PDF-1.4\n";
  const pdfContent = `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 44 >>\nstream\nBT\n/F1 12 Tf\n100 700 Td\n(Prescription PDF) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000214 00000 n \ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n309\n%%EOF`;
  
  return encoder.encode(pdfHeader + pdfContent);
}