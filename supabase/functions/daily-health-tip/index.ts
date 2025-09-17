import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Database {
  public: {
    Tables: {
      health_tips: {
        Row: { id: number; tip: string; created_at: string }
      }
      daily_tips: {
        Row: { id: number; tip_id: number; date: string; created_at: string }
        Insert: { tip_id: number; date: string }
      }
    }
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient<Database>(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD format

    // Check if we already have a tip for today
    const { data: existingTip } = await supabaseClient
      .from('daily_tips')
      .select('id')
      .eq('date', today)
      .single()

    if (existingTip) {
      console.log('Tip already exists for today:', today)
      return new Response(
        JSON.stringify({ message: 'Tip already exists for today', date: today }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    // Get a random health tip
    const { data: healthTips, error: tipsError } = await supabaseClient
      .from('health_tips')
      .select('id')

    if (tipsError) {
      throw new Error(`Failed to fetch health tips: ${tipsError.message}`)
    }

    if (!healthTips || healthTips.length === 0) {
      throw new Error('No health tips found in database')
    }

    // Select a random tip
    const randomIndex = Math.floor(Math.random() * healthTips.length)
    const selectedTip = healthTips[randomIndex]

    // Insert the daily tip
    const { data: insertedTip, error: insertError } = await supabaseClient
      .from('daily_tips')
      .insert({ tip_id: selectedTip.id, date: today })
      .select()

    if (insertError) {
      throw new Error(`Failed to insert daily tip: ${insertError.message}`)
    }

    console.log('Successfully created daily tip for:', today)

    return new Response(
      JSON.stringify({ 
        message: 'Daily tip created successfully',
        date: today,
        tip_id: selectedTip.id,
        data: insertedTip
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error in daily-health-tip function:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})