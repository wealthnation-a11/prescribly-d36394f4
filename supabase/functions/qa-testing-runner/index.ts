import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestResult {
  testId: string;
  testName: string;
  success: boolean;
  actualResults: any;
  expectedResults: any;
  confidenceMatch: boolean;
  errors: string[];
  executionTime: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Authentication check for admin access
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();
    
    if (!profile || profile.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Admin access required for QA testing' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { testIds, runAll } = await req.json();

    // Get test cases
    let query = supabase.from('test_patients').select('*').eq('is_active', true);
    
    if (!runAll && testIds && testIds.length > 0) {
      query = query.in('id', testIds);
    }
    
    const { data: testCases, error: fetchError } = await query;
    
    if (fetchError) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch test cases' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!testCases || testCases.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No test cases found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Run tests
    const testResults: TestResult[] = [];
    
    for (const testCase of testCases) {
      const result = await runDiagnosisTest(supabase, testCase);
      testResults.push(result);
      
      // Update test case with results
      await supabase
        .from('test_patients')
        .update({
          last_tested_at: new Date().toISOString(),
          test_results: result
        })
        .eq('id', testCase.id);
    }

    // Calculate summary statistics
    const summary = {
      total_tests: testResults.length,
      passed: testResults.filter(r => r.success).length,
      failed: testResults.filter(r => !r.success).length,
      confidence_matches: testResults.filter(r => r.confidenceMatch).length,
      avg_execution_time: testResults.reduce((sum, r) => sum + r.executionTime, 0) / testResults.length,
      success_rate: (testResults.filter(r => r.success).length / testResults.length) * 100,
      confidence_match_rate: (testResults.filter(r => r.confidenceMatch).length / testResults.length) * 100
    };

    // Log QA test run
    await supabase.rpc('log_monitoring_event', {
      event_type_param: 'user_activity',
      entity_id_param: user.id,
      event_data_param: {
        action: 'qa_test_run',
        summary: summary,
        test_count: testResults.length
      },
      success_param: true,
      error_message_param: null,
      latency_ms_param: null
    });

    return new Response(
      JSON.stringify({
        summary,
        test_results: testResults,
        executed_at: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in qa-testing-runner:', error);
    return new Response(
      JSON.stringify({ 
        error: 'QA testing failed',
        message: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function runDiagnosisTest(supabase: any, testCase: any): Promise<TestResult> {
  const startTime = Date.now();
  const result: TestResult = {
    testId: testCase.id,
    testName: testCase.test_name,
    success: false,
    actualResults: {},
    expectedResults: {
      conditions: testCase.expected_conditions,
      confidenceRange: testCase.expected_confidence_range
    },
    confidenceMatch: false,
    errors: [],
    executionTime: 0
  };

  try {
    // Call the diagnosis function with test symptoms
    const { data: diagnosisData, error: diagnosisError } = await supabase.functions.invoke('diagnose-with-validation', {
      body: {
        symptoms: testCase.test_symptoms,
        confidenceThreshold: 0.70,
        age: testCase.test_metadata?.age || 30,
        gender: testCase.test_metadata?.gender || 'unknown'
      }
    });

    if (diagnosisError) {
      result.errors.push(`Diagnosis API error: ${diagnosisError.message}`);
      return result;
    }

    if (!diagnosisData?.success) {
      result.errors.push('Diagnosis API returned unsuccessful result');
      return result;
    }

    result.actualResults = {
      conditions: diagnosisData.diagnosis.conditions || [],
      confidence: diagnosisData.validation.confidence,
      recommendedAction: diagnosisData.validation.recommendedAction
    };

    // Check if expected conditions are found
    const foundConditions = result.actualResults.conditions.map((c: any) => c.name.toLowerCase());
    const expectedConditions = testCase.expected_conditions.map((c: string) => c.toLowerCase());
    
    const conditionMatches = expectedConditions.filter(expected => 
      foundConditions.some(found => found.includes(expected) || expected.includes(found))
    );

    const conditionMatchRate = conditionMatches.length / expectedConditions.length;
    
    // Check confidence range
    const highestConfidence = result.actualResults.confidence.highest;
    const confidenceRange = parseRange(testCase.expected_confidence_range);
    result.confidenceMatch = highestConfidence >= confidenceRange.min && highestConfidence <= confidenceRange.max;

    // Test passes if at least 60% of expected conditions are found and confidence is in range
    result.success = conditionMatchRate >= 0.6 && result.confidenceMatch;

    if (conditionMatchRate < 0.6) {
      result.errors.push(`Expected conditions not found. Found: ${conditionMatches.length}/${expectedConditions.length}`);
    }

    if (!result.confidenceMatch) {
      result.errors.push(`Confidence ${highestConfidence} not in expected range ${testCase.expected_confidence_range}`);
    }

  } catch (error) {
    result.errors.push(`Test execution error: ${error.message}`);
  }

  result.executionTime = Date.now() - startTime;
  return result;
}

function parseRange(rangeString: string): { min: number, max: number } {
  // Parse PostgreSQL numrange format like '[0.7,0.9)'
  const match = rangeString.match(/[\[\(]([0-9.]+),([0-9.]+)[\]\)]/);
  if (match) {
    return {
      min: parseFloat(match[1]),
      max: parseFloat(match[2])
    };
  }
  return { min: 0, max: 1 };
}