import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
const SearchRequestSchema = z.object({
  query: z.string().min(1).max(500),
  eventTitle: z.string().min(1).max(200),
  branchName: z.string().max(200).optional(),
  maxResults: z.number().int().min(1).max(20).optional().default(5),
});

interface EvidenceResult {
  title: string;
  content: string;
  source_url: string;
  source_credibility: number;
  supports_narrative: boolean | null;
  raw_content?: string;
}

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
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const TAVILY_API_KEY = Deno.env.get('TAVILY_API_KEY');
    if (!TAVILY_API_KEY) {
      throw new Error('Search service not configured');
    }

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('Analysis service not configured');
    }

    // Validate input
    const rawBody = await req.json();
    const parseResult = SearchRequestSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid request parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const { query, eventTitle, branchName, maxResults } = parseResult.data;

    console.log(`Evidence Collector: Searching for "${query}" related to "${eventTitle}"`);

    // Use Tavily AI-powered search
    const tavilyResponse = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: TAVILY_API_KEY,
        query: `${eventTitle} ${query}`,
        search_depth: 'advanced',
        include_domains: [],
        exclude_domains: [],
        max_results: maxResults,
        include_raw_content: true,
        include_answer: true,
      }),
    });

    if (!tavilyResponse.ok) {
      console.error('Tavily API error:', tavilyResponse.status);
      throw new Error('Search service error');
    }

    const tavilyData = await tavilyResponse.json();
    const results = tavilyData.results || [];

    console.log(`Found ${results.length} search results`);

    // Analyze each result with Gemini for credibility and narrative relevance
    const analyzedResults: EvidenceResult[] = await Promise.all(
      results.map(async (result: any) => {
        // Use Gemini to assess credibility and narrative support
        const analysisPrompt = `Analyze this search result for an investigation into "${eventTitle}".
${branchName ? `Consider how it relates to this narrative: "${branchName}"` : ''}

Source: ${result.url}
Title: ${result.title}
Content: ${result.content?.substring(0, 2000)}

Provide a JSON response with:
{
  "credibility_score": number (0-100 based on source reliability, citation quality, author expertise),
  "supports_narrative": boolean | null (true if supports, false if contradicts, null if neutral/unclear),
  "summary": "brief summary of the key claims or evidence"
}`;

        try {
          const geminiResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${GEMINI_API_KEY}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: analysisPrompt }] }],
                generationConfig: { temperature: 0.2, maxOutputTokens: 1024 },
              }),
            }
          );

          if (!geminiResponse.ok) {
            throw new Error('Gemini analysis failed');
          }

          const geminiData = await geminiResponse.json();
          const textResponse = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';

          // Parse the JSON from Gemini's response
          const jsonMatch = textResponse.match(/```json\n?([\s\S]*?)\n?```/) ||
            textResponse.match(/\{[\s\S]*\}/);
          const analysisJson = jsonMatch ? JSON.parse(jsonMatch[1] || jsonMatch[0]) : {
            credibility_score: 50,
            supports_narrative: null,
            summary: result.content?.substring(0, 200),
          };

          return {
            title: result.title,
            content: analysisJson.summary || result.content?.substring(0, 500),
            source_url: result.url,
            source_credibility: analysisJson.credibility_score,
            supports_narrative: analysisJson.supports_narrative,
            raw_content: result.raw_content?.substring(0, 5000),
          };
        } catch (analysisError) {
          console.error('Analysis error for result:', analysisError);
          // Return with default credibility if analysis fails
          return {
            title: result.title,
            content: result.content?.substring(0, 500),
            source_url: result.url,
            source_credibility: 50,
            supports_narrative: null,
          };
        }
      })
    );

    console.log('Evidence Collector: Analysis complete');

    return new Response(JSON.stringify({
      results: analyzedResults,
      answer: tavilyData.answer, // Tavily's AI-generated answer
      query: query,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Evidence Collector error:', error);
    return new Response(
      JSON.stringify({ error: 'An error occurred processing your request' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
