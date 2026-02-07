import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
const InvestigationRequestSchema = z.object({
  eventId: z.string().uuid(),
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

    // Use anon key with user's auth for RLS verification
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Use service role for data operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
    const parseResult = InvestigationRequestSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid request parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const { eventId } = parseResult.data;

    console.log(`Marathon Investigator: Starting investigation for event ${eventId}`);

    // Fetch event using user client to verify ownership via RLS
    const { data: event, error: eventError } = await supabaseUser
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      return new Response(
        JSON.stringify({ error: 'Event not found or access denied' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user owns this event
    if (event.user_id !== userId) {
      return new Response(
        JSON.stringify({ error: 'Access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch existing branches and evidence for deduplication
    const { data: branches } = await supabase
      .from('branches')
      .select('*')
      .eq('event_id', eventId);

    const { data: existingEvidenceData } = await supabase
      .from('evidence')
      .select('source_url')
      .eq('event_id', eventId);

    const existingEvidenceUrls = new Set(existingEvidenceData?.map(e => e.source_url) || []);
    const existingBranchNames = new Set(branches?.map(b => b.name.toLowerCase()) || []);

    const mainBranch = branches?.find(b => b.is_main) || branches?.[0];
    if (!mainBranch) {
      throw new Error('No branch found for event');
    }

    // Helper to log investigation progress
    async function logProgress(phase: number, action: string, details?: any) {
      await supabase.from('investigation_logs').insert({
        event_id: eventId,
        phase,
        action,
        details,
      });
    }

    // Helper to call Gemini
    async function callGemini(prompt: string): Promise<string> {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 4096 },
          }),
        }
      );
      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }

    // Helper to search with Tavily
    async function searchTavily(query: string): Promise<any[]> {
      const response = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: TAVILY_API_KEY,
          query: `${event.title} ${query}`,
          search_depth: 'advanced',
          max_results: 5,
          include_answer: true,
        }),
      });
      const data = await response.json();
      return data.results || [];
    }

    // PHASE 1: Initial Analysis
    await supabase.from('events').update({ current_phase: 1, status: 'analyzing' }).eq('id', eventId);
    await logProgress(1, 'Starting initial analysis of event');

    const analysisPrompt = `Analyze this contested event and identify:
1. The main claims being made
2. Key parties involved
3. Potential competing narratives
4. What evidence would be needed to verify/refute claims

Event: ${event.title}
Description: ${event.description}

Respond with JSON:
{
  "main_claims": ["claim1", "claim2"],
  "parties": ["party1", "party2"],
  "narratives": [{"name": "narrative name", "description": "brief description"}],
  "evidence_needed": ["type of evidence 1", "type of evidence 2"],
  "search_queries": ["search query 1", "search query 2", "search query 3"]
}`;

    const analysisResponse = await callGemini(analysisPrompt);
    let analysis;
    try {
      const jsonMatch = analysisResponse.match(/```json\n?([\s\S]*?)\n?```/) ||
        analysisResponse.match(/\{[\s\S]*\}/);
      analysis = JSON.parse(jsonMatch?.[1] || jsonMatch?.[0] || '{}');
    } catch {
      analysis = { search_queries: [event.title], narratives: [] };
    }

    await logProgress(1, 'Initial analysis complete', analysis);

    // PHASE 2: Evidence Collection
    await supabase.from('events').update({ current_phase: 2, status: 'collecting' }).eq('id', eventId);
    await logProgress(2, 'Starting evidence collection');

    const searchQueries = analysis.search_queries || [event.title];
    const allEvidence: any[] = [];

    for (const query of searchQueries.slice(0, 3)) {
      await logProgress(2, `Searching: ${query}`);
      const results = await searchTavily(query);

      for (const result of results.slice(0, 3)) {
        // Skip if already exists
        if (existingEvidenceUrls.has(result.url)) {
          console.log(`Skipping existing evidence: ${result.url}`);
          continue;
        }
        // Analyze credibility with Gemini
        const credPrompt = `Rate the credibility of this source (0-100) and summarize key claims.
Source: ${result.url}
Title: ${result.title}
Content: ${result.content?.substring(0, 1500)}

JSON response: {"score": number, "summary": "string", "key_claims": ["claim1"]}`;

        const credResponse = await callGemini(credPrompt);
        let credibility = { score: 50, summary: result.content?.substring(0, 300), key_claims: [] };
        try {
          const jsonMatch = credResponse.match(/```json\n?([\s\S]*?)\n?```/) ||
            credResponse.match(/\{[\s\S]*\}/);
          credibility = JSON.parse(jsonMatch?.[1] || jsonMatch?.[0] || '{}');
        } catch { }

        // Insert evidence
        const { data: evidence } = await supabase.from('evidence').insert({
          event_id: eventId,
          branch_id: mainBranch.id,
          title: result.title,
          content: credibility.summary || result.content?.substring(0, 500),
          evidence_type: 'link',
          source_url: result.url,
          source_credibility: credibility.score || 50,
          position_x: allEvidence.length * 2,
          position_y: 0,
        }).select().single();

        if (evidence) {
          existingEvidenceUrls.add(result.url);
          allEvidence.push({ ...evidence, key_claims: credibility.key_claims });
          await logProgress(2, `Added evidence: ${result.title.substring(0, 50)}...`);
        }
      }
    }

    // PHASE 3: Narrative Identification
    await supabase.from('events').update({ current_phase: 3 }).eq('id', eventId);
    await logProgress(3, 'Identifying competing narratives');

    // Create additional branches for competing narratives
    const narratives = analysis.narratives || [];
    const BRANCH_COLORS = ['#8b5cf6', '#06b6d4', '#22c55e', '#eab308', '#ef4444'];

    for (let i = 0; i < Math.min(narratives.length, 2); i++) {
      const narrative = narratives[i];

      // Skip if branch already exists (fuzzy match could be better but exact name check for now)
      if (existingBranchNames.has(narrative.name.toLowerCase())) {
        continue;
      }

      const { data: newBranch } = await supabase.from('branches').insert({
        event_id: eventId,
        name: narrative.name,
        description: narrative.description,
        color: BRANCH_COLORS[(i + 1) % BRANCH_COLORS.length],
        position_z: (i + 1) * 4,
        is_main: false,
      }).select().single();

      if (newBranch) {
        await logProgress(3, `Created narrative branch: ${narrative.name}`);
      }
    }

    // PHASE 4: Hypothesis Generation
    await supabase.from('events').update({ current_phase: 4 }).eq('id', eventId);
    await logProgress(4, 'Generating hypotheses');

    if (allEvidence.length === 0) {
      await logProgress(4, 'No evidence collected, skipping hypothesis generation');
      console.log('No evidence to generate hypotheses from');
    } else {
      const hypothesesPrompt = `Based on the evidence collected about "${event.title}", generate 3-5 testable hypotheses that can be verified or refuted with additional research.

Event Context:
Title: ${event.title}
Description: ${event.description}

Evidence collected (${allEvidence.length} sources):
${allEvidence.map((e, i) => `${i + 1}. [Credibility: ${e.source_credibility}/100] ${e.title}
   Summary: ${e.content?.substring(0, 200)}
   Source: ${e.source_url}`).join('\n\n')}

For each hypothesis, provide:
1. A clear, specific claim that can be tested
2. A testable prediction (what we would observe if the claim is true)
3. What additional evidence would confirm or refute it

Respond with JSON only:
{
  "hypotheses": [
    {
      "claim": "Clear statement of what is being claimed",
      "testable_prediction": "Specific prediction that can be verified",
      "evidence_needed": "What evidence would confirm or refute this"
    }
  ]
}`;

      try {
        const hypothesesResponse = await callGemini(hypothesesPrompt);
        console.log('Hypothesis generation response:', hypothesesResponse.substring(0, 500));

        let hypothesesList: Array<{ claim: string; testable_prediction: string; evidence_needed: string }> = [];
        try {
          const jsonMatch = hypothesesResponse.match(/```json\n?([\s\S]*?)\n?```/) ||
            hypothesesResponse.match(/\{[\s\S]*\}/);
          const parsed = JSON.parse(jsonMatch?.[1] || jsonMatch?.[0] || '{}');
          hypothesesList = parsed.hypotheses || [];
          console.log(`Parsed ${hypothesesList.length} hypotheses from Gemini response`);
        } catch (parseError) {
          console.error('Failed to parse hypotheses JSON:', parseError);
          await logProgress(4, 'Failed to parse hypothesis JSON from Gemini');
        }

        if (hypothesesList.length === 0) {
          console.log('No hypotheses generated, creating fallback hypothesis');
          hypothesesList = [{
            claim: `The evidence collected about "${event.title}" suggests multiple competing narratives.`,
            testable_prediction: `Additional research will reveal ${analysis.narratives?.length || 'multiple'} distinct interpretations of the event.`,
            evidence_needed: `Cross-referencing evidence from different sources and analyzing their credibility scores.`
          }];
        }

        let createdCount = 0;
        for (const h of hypothesesList) {
          try {
            const { data: hypothesis, error: hypError } = await supabase.from('hypotheses').insert({
              branch_id: mainBranch.id,
              claim: h.claim,
              testable_prediction: h.testable_prediction,
              status: 'pending',
              reasoning: h.evidence_needed,
            }).select();

            if (hypError) {
              console.error('Error inserting hypothesis:', hypError);
              await logProgress(4, `Failed to insert hypothesis: ${hypError.message}`);
            } else {
              createdCount++;
              console.log(`Created hypothesis: ${h.claim.substring(0, 50)}...`);
              await logProgress(4, `Generated hypothesis: ${h.claim.substring(0, 80)}...`);
            }
          } catch (insertError) {
            console.error('Exception inserting hypothesis:', insertError);
            await logProgress(4, `Exception creating hypothesis: ${insertError.message}`);
          }
        }

        console.log(`Successfully created ${createdCount} out of ${hypothesesList.length} hypotheses`);
        await logProgress(4, `Created ${createdCount} hypotheses for investigation`);
      } catch (geminiError) {
        console.error('Error calling Gemini for hypotheses:', geminiError);
        await logProgress(4, `Gemini API error during hypothesis generation: ${geminiError.message}`);
      }
    }

    // PHASE 5: Final Analysis
    await supabase.from('events').update({ current_phase: 5, status: 'complete' }).eq('id', eventId);
    await logProgress(5, 'Investigation complete');

    // Calculate final confidence scores for branches
    const { data: finalBranches } = await supabase
      .from('branches')
      .select('id')
      .eq('event_id', eventId);

    for (const branch of finalBranches || []) {
      const { data: branchEvidence } = await supabase
        .from('evidence')
        .select('source_credibility')
        .eq('branch_id', branch.id);

      if (branchEvidence && branchEvidence.length > 0) {
        const avgCredibility = branchEvidence.reduce((sum, e) => sum + (e.source_credibility || 50), 0) / branchEvidence.length;
        await supabase.from('branches').update({ confidence_score: avgCredibility }).eq('id', branch.id);
      }
    }

    console.log('Marathon Investigator: Investigation complete');

    return new Response(JSON.stringify({
      success: true,
      eventId,
      evidenceCount: allEvidence.length,
      hypothesesCount: hypothesesList.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Marathon Investigator error:', error);

    return new Response(
      JSON.stringify({ error: 'An error occurred processing your request' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
