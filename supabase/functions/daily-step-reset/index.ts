import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Starting daily step reset and badge check...')

    // Get yesterday's date
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]

    // Update completion status for yesterday's logs
    const { data: updatedLogs, error: updateError } = await supabase
      .from('step_logs')
      .update({ completed: true })
      .eq('date', yesterdayStr)
      .gte('steps', 5000)
      .select('user_id')

    if (updateError) {
      console.error('Error updating step logs:', updateError)
      throw updateError
    }

    console.log(`Updated ${updatedLogs?.length || 0} step logs for completion`)

    // Check for 7-day streaks and award badges
    const { data: users, error: usersError } = await supabase
      .from('step_logs')
      .select('user_id')
      .eq('completed', true)
      .gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .lte('date', yesterdayStr)

    if (usersError) {
      console.error('Error getting users:', usersError)
      throw usersError
    }

    // Count consecutive days for each user
    const userStreaks: { [key: string]: number } = {}
    
    if (users) {
      for (const user of users) {
        const { data: userLogs, error: userLogsError } = await supabase
          .from('step_logs')
          .select('date, completed')
          .eq('user_id', user.user_id)
          .eq('completed', true)
          .gte('date', new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
          .order('date', { ascending: false })

        if (userLogsError) {
          console.error('Error getting user logs:', userLogsError)
          continue
        }

        if (userLogs && userLogs.length >= 7) {
          // Check if the last 7 days are consecutive
          let consecutiveDays = 0
          const today = new Date()
          
          for (let i = 0; i < 7; i++) {
            const checkDate = new Date(today)
            checkDate.setDate(checkDate.getDate() - (i + 1))
            const checkDateStr = checkDate.toISOString().split('T')[0]
            
            const dayLog = userLogs.find(log => log.date === checkDateStr)
            if (dayLog && dayLog.completed) {
              consecutiveDays++
            } else {
              break
            }
          }
          
          userStreaks[user.user_id] = consecutiveDays
        }
      }
    }

    // Award badges for 7-day streaks
    let badgesAwarded = 0
    
    for (const [userId, streak] of Object.entries(userStreaks)) {
      if (streak >= 7) {
        // Check if user already has this badge
        const { data: existingBadge, error: badgeCheckError } = await supabase
          .from('user_badges')
          .select('id')
          .eq('user_id', userId)
          .eq('badge_name', 'Step Master')
          .single()

        if (badgeCheckError && badgeCheckError.code !== 'PGRST116') {
          console.error('Error checking existing badge:', badgeCheckError)
          continue
        }

        if (!existingBadge) {
          const { error: badgeError } = await supabase
            .from('user_badges')
            .insert({
              user_id: userId,
              badge_name: 'Step Master',
              badge_description: 'Completed 7 days of step goals in a row!'
            })

          if (badgeError) {
            console.error('Error awarding badge:', badgeError)
          } else {
            badgesAwarded++
            console.log(`Awarded Step Master badge to user ${userId}`)
          }
        }
      }
    }

    console.log(`Daily step reset completed. Badges awarded: ${badgesAwarded}`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Daily step reset completed. Updated ${updatedLogs?.length || 0} logs, awarded ${badgesAwarded} badges.`
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('Error in daily step reset:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})