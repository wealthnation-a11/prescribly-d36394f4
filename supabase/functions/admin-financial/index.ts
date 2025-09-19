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

    // Verify admin access
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const url = new URL(req.url);
    const endpoint = url.pathname.split('/').pop();

    if (endpoint === 'overview') {
      // Financial overview
      const period = url.searchParams.get('period') || 'month';
      const year = parseInt(url.searchParams.get('year') || new Date().getFullYear().toString());
      
      let startDate: Date;
      let endDate: Date;

      if (period === 'month') {
        const month = parseInt(url.searchParams.get('month') || (new Date().getMonth() + 1).toString()) - 1;
        startDate = new Date(year, month, 1);
        endDate = new Date(year, month + 1, 0);
      } else if (period === 'year') {
        startDate = new Date(year, 0, 1);
        endDate = new Date(year, 11, 31);
      } else {
        // Default to current month
        startDate = new Date(year, new Date().getMonth(), 1);
        endDate = new Date(year, new Date().getMonth() + 1, 0);
      }

      // Get call logs for earnings data
      const { data: callLogs } = await supabase
        .from('call_logs')
        .select('patient_payment, doctor_earnings, admin_fee, call_date, doctor_id, patient_id')
        .gte('call_date', startDate.toISOString())
        .lte('call_date', endDate.toISOString());

      // Get payments data
      const { data: payments } = await supabase
        .from('payments')
        .select('amount, status, created_at, user_id')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      // Get consultation payments
      const { data: consultationPayments } = await supabase
        .from('consultation_payments')
        .select('amount, status, created_at, user_id')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      // Calculate totals
      const totalRevenue = (callLogs?.reduce((sum, log) => sum + (log.patient_payment || 0), 0) || 0) +
                          (payments?.filter(p => p.status === 'successful').reduce((sum, p) => sum + (p.amount || 0), 0) || 0) +
                          (consultationPayments?.filter(p => p.status === 'successful').reduce((sum, p) => sum + (p.amount || 0), 0) || 0);

      const totalDoctorEarnings = callLogs?.reduce((sum, log) => sum + (log.doctor_earnings || 0), 0) || 0;
      const totalAdminFees = callLogs?.reduce((sum, log) => sum + (log.admin_fee || 0), 0) || 0;

      // Monthly breakdown
      const monthlyData = {};
      callLogs?.forEach(log => {
        const month = new Date(log.call_date).getMonth();
        const key = new Date(year, month).toISOString().substring(0, 7);
        
        if (!monthlyData[key]) {
          monthlyData[key] = { revenue: 0, doctor_earnings: 0, admin_fees: 0, transactions: 0 };
        }
        
        monthlyData[key].revenue += log.patient_payment || 0;
        monthlyData[key].doctor_earnings += log.doctor_earnings || 0;
        monthlyData[key].admin_fees += log.admin_fee || 0;
        monthlyData[key].transactions += 1;
      });

      // Top earning doctors
      const doctorEarnings = {};
      callLogs?.forEach(log => {
        if (!doctorEarnings[log.doctor_id]) {
          doctorEarnings[log.doctor_id] = 0;
        }
        doctorEarnings[log.doctor_id] += log.doctor_earnings || 0;
      });

      const topDoctors = Object.entries(doctorEarnings)
        .sort(([,a], [,b]) => (b as number) - (a as number))
        .slice(0, 10)
        .map(([doctorId, earnings]) => ({ doctor_id: doctorId, earnings }));

      return new Response(JSON.stringify({
        period,
        year,
        total_revenue: totalRevenue,
        total_doctor_earnings: totalDoctorEarnings,
        total_admin_fees: totalAdminFees,
        net_profit: totalAdminFees,
        total_transactions: (callLogs?.length || 0) + (payments?.length || 0) + (consultationPayments?.length || 0),
        monthly_breakdown: monthlyData,
        top_doctors: topDoctors,
        payment_methods: {
          call_payments: callLogs?.length || 0,
          subscription_payments: payments?.filter(p => p.status === 'successful').length || 0,
          consultation_payments: consultationPayments?.filter(p => p.status === 'successful').length || 0
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } else if (endpoint === 'transactions') {
      // Detailed transactions
      const page = parseInt(url.searchParams.get('page') || '1');
      const limit = parseInt(url.searchParams.get('limit') || '100');
      const type = url.searchParams.get('type'); // 'all', 'calls', 'subscriptions', 'consultations'
      
      const offset = (page - 1) * limit;

      let allTransactions = [];

      // Get call transactions
      if (!type || type === 'all' || type === 'calls') {
        const { data: callTransactions } = await supabase
          .from('call_logs')
          .select(`
            id, patient_payment as amount, call_date as date, status,
            patient_id, doctor_id, doctor_earnings, admin_fee
          `)
          .order('call_date', { ascending: false });

        const callTx = callTransactions?.map(tx => ({
          ...tx,
          type: 'call_payment',
          user_id: tx.patient_id,
          transaction_date: tx.date
        })) || [];

        allTransactions = [...allTransactions, ...callTx];
      }

      // Get subscription payments
      if (!type || type === 'all' || type === 'subscriptions') {
        const { data: subscriptionTx } = await supabase
          .from('payments')
          .select('id, amount, created_at as date, status, user_id, reference')
          .order('created_at', { ascending: false });

        const subTx = subscriptionTx?.map(tx => ({
          ...tx,
          type: 'subscription_payment',
          transaction_date: tx.date
        })) || [];

        allTransactions = [...allTransactions, ...subTx];
      }

      // Get consultation payments
      if (!type || type === 'all' || type === 'consultations') {
        const { data: consultationTx } = await supabase
          .from('consultation_payments')
          .select('id, amount, created_at as date, status, user_id, reference, appointment_id')
          .order('created_at', { ascending: false });

        const conTx = consultationTx?.map(tx => ({
          ...tx,
          type: 'consultation_payment',
          transaction_date: tx.date
        })) || [];

        allTransactions = [...allTransactions, ...conTx];
      }

      // Sort by date and paginate
      allTransactions.sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime());
      
      const paginatedTransactions = allTransactions.slice(offset, offset + limit);
      const totalPages = Math.ceil(allTransactions.length / limit);

      return new Response(JSON.stringify({
        transactions: paginatedTransactions,
        total: allTransactions.length,
        page,
        totalPages,
        hasMore: page < totalPages
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } else {
      return new Response(JSON.stringify({ error: 'Endpoint not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('Error in admin-financial:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});