import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
const TestRequestSchema = z.object({
  hypothesisId: z.string().uuid(),
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Authentication check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Use anon key with user's auth for RLS
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Use service role for updates (bypasses RLS but we validate ownership first)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const userId = claimsData.claims.sub;

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    const TAVILY_API_KEY = Deno.env.get('TAVILY_API_KEY');

    if (!GEMINI_API_KEY || !TAVILY_API_KEY) {
      throw new Error('Services not configured');
    }

    // Validate input
    const rawBody = await req.json();
    const parseResult = TestRequestSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid request parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const { hypothesisId } = parseResult.data;

    console.log(`Hypothesis Tester: Testing hypothesis ${hypothesisId}`);

    // Fetch the hypothesis (uses RLS to ensure user owns it)
    const { data: hypothesis, error: hypError } = await supabaseUser
      .from('hypotheses')
      .select('*, branches(*, events(*))')
      .eq('id', hypothesisId)
      .single();

    if (hypError || !hypothesis) {
      return new Response(
        JSON.stringify({ error: 'Hypothesis not found or access denied' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user owns this hypothesis's event
    const eventUserId = hypothesis.branches?.events?.user_id;
    if (eventUserId !== userId) {
      return new Response(
        JSON.stringify({ error: 'Access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update status to testing
    await supabaseAdmin.from('hypotheses').update({ status: 'testing' }).eq('id', hypothesisId);

    const eventTitle = hypothesis.branches?.events?.title || 'Unknown event';

    // Search for evidence to test the prediction
    const searchResponse = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: TAVILY_API_KEY,
        query: `${eventTitle} ${hypothesis.testable_prediction}`,
        search_depth: 'advanced',
        max_results: 5,
        include_answer: true,
      }),
    });

    const searchData = await searchResponse.json();
    const searchResults = searchData.results || [];

    // Use Gemini to evaluate if the evidence supports or refutes the hypothesis
    const evaluationPrompt = `Evaluate this hypothesis against the following evidence.

HYPOTHESIS:
Claim: ${hypothesis.claim}
Testable Prediction: ${hypothesis.testable_prediction}

EVIDENCE FOUND:
${searchResults.map((r: any, i: number) => `
${i + 1}. ${r.title}
   Source: ${r.url}
   Content: ${r.content?.substring(0, 500)}
`).join('\n')}

Based on this evidence, determine:
1. Is the hypothesis CONFIRMED, REFUTED, or INCONCLUSIVE?
2. What is the confidence impact (-30 to +30)?
3. Which evidence supports or refutes it?

Respond with JSON:
{
  "verdict": "confirmed" | "refuted" | "inconclusive",
  "confidence_impact": number,
  "reasoning": "detailed explanation",
  "supporting_evidence": ["title of supporting sources"],
  "refuting_evidence": ["title of refuting sources"]
}`;

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: evaluationPrompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 2048 },
        }),
      }
    );

    const geminiData = await geminiResponse.json();
    const textResponse = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Parse the evaluation
    let evaluation = {
      verdict: 'inconclusive' as 'confirmed' | 'refuted' | 'inconclusive',
      confidence_impact: 0,
      reasoning: 'Unable to evaluate',
      supporting_evidence: [] as string[],
      refuting_evidence: [] as string[],
    };

    try {
      const jsonMatch = textResponse.match(/```json\n?([\s\S]*?)\n?```/) ||
        textResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        evaluation = JSON.parse(jsonMatch[1] || jsonMatch[0]);
      }
    } catch (parseError) {
      console.error('Failed to parse evaluation:', parseError);
    }

    // Map verdict to status
    const statusMap: Record<string, string> = {
      confirmed: 'confirmed',
      refuted: 'refuted',
      inconclusive: 'pending',
    };

    // Update the hypothesis with results
    await supabaseAdmin.from('hypotheses').update({
      status: statusMap[evaluation.verdict] || 'pending',
      confidence_impact: evaluation.confidence_impact,
      reasoning: evaluation.reasoning,
    }).eq('id', hypothesisId);

    // Update branch confidence score
    if (hypothesis.branch_id && evaluation.confidence_impact !== 0) {
      const { data: branch } = await supabaseUser
        .from('branches')
        .select('confidence_score')
        .eq('id', hypothesis.branch_id)
        .single();

      if (branch) {
        const newScore = Math.max(0, Math.min(100, branch.confidence_score + evaluation.confidence_impact));
        await supabaseAdmin.from('branches').update({ confidence_score: newScore }).eq('id', hypothesis.branch_id);
      }
    }

    console.log(`Hypothesis Tester: Verdict = ${evaluation.verdict}, Impact = ${evaluation.confidence_impact}`);

    return new Response(JSON.stringify({
      hypothesisId,
      verdict: evaluation.verdict,
      confidence_impact: evaluation.confidence_impact,
      reasoning: evaluation.reasoning,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Hypothesis Tester error:', error);
    return new Response(
      JSON.stringify({ error: 'An error occurred processing your request' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
