import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting exchange rate update...');
    
    // Create Supabase client with service role key
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          persistSession: false,
        },
      }
    );

    // Fetch latest NGN to USD exchange rate from API
    console.log('Fetching exchange rate from API...');
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/NGN');
    
    if (!response.ok) {
      throw new Error(`Failed to fetch exchange rate: ${response.statusText}`);
    }
    
    const data = await response.json();
    const usdRate = data.rates?.USD;
    
    if (!usdRate) {
      throw new Error('USD rate not found in API response');
    }

    console.log(`Fetched NGN to USD rate: ${usdRate}`);

    // Update exchange rate in Supabase
    const { error } = await supabaseClient
      .from('exchange_rates')
      .upsert({
        currency: 'NGN_TO_USD',
        rate: usdRate,
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error updating exchange rate:', error);
      throw error;
    }

    console.log('Exchange rate updated successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        rate: usdRate,
        updated_at: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in update-exchange-rates function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});