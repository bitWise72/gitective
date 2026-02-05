import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// URL validation to prevent SSRF
function isValidExternalUrl(url: string): boolean {
  try {
    const parsed = new URL(url);

    // Only allow http/https
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return false;
    }

    const hostname = parsed.hostname.toLowerCase();

    // Block private IP ranges and localhost
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('172.16.') ||
      hostname.startsWith('172.17.') ||
      hostname.startsWith('172.18.') ||
      hostname.startsWith('172.19.') ||
      hostname.startsWith('172.20.') ||
      hostname.startsWith('172.21.') ||
      hostname.startsWith('172.22.') ||
      hostname.startsWith('172.23.') ||
      hostname.startsWith('172.24.') ||
      hostname.startsWith('172.25.') ||
      hostname.startsWith('172.26.') ||
      hostname.startsWith('172.27.') ||
      hostname.startsWith('172.28.') ||
      hostname.startsWith('172.29.') ||
      hostname.startsWith('172.30.') ||
      hostname.startsWith('172.31.') ||
      hostname.startsWith('169.254.') || // AWS metadata
      hostname === 'metadata.google.internal' || // GCP metadata
      hostname.endsWith('.internal') ||
      hostname.endsWith('.local')
    ) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

// Input validation schema
const GeminiRequestSchema = z.object({
  imageUrl: z.string().url().max(2000).optional(),
  imageBase64: z.string().max(10 * 1024 * 1024).optional(), // 10MB max
  prompt: z.string().max(1000).optional(),
  analysisType: z.enum(['detection', 'description', 'credibility', 'region']),
  claim: z.string().max(500).optional(),
}).refine(data => data.imageUrl || data.imageBase64, {
  message: "Either imageUrl or imageBase64 is required"
});

interface DetectedObject {
  label: string;
  confidence: number;
  bounding_box: [number, number, number, number];
  description: string;
}

interface GeminiAnalysis {
  description: string;
  objects_detected: DetectedObject[];
  credibility_assessment: {
    score: number;
    factors: string[];
    warnings: string[];
  };
  narrative_relevance: {
    supports: string[];
    contradicts: string[];
    neutral: string[];
  };
  cross_validation_flags: string[];
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

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('Vision service not configured');
    }

    // Validate input
    const rawBody = await req.json();
    const parseResult = GeminiRequestSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid request parameters', details: parseResult.error.errors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const { imageUrl, imageBase64, prompt, analysisType, claim } = parseResult.data;

    console.log(`Gemini Vision: Analyzing image with type=${analysisType}`);

    // Build the system prompt based on analysis type
    let systemPrompt = '';

    if (analysisType === 'detection') {
      systemPrompt = `You are an expert image analyst. Analyze this image and detect all notable objects, people, text, and elements.
      
For each detected element, provide:
1. A descriptive label
2. Confidence score (0-1)
3. Bounding box in format [y_min, x_min, y_max, x_max] where values are normalized (0-1)
4. A brief description of the element

Return your response as JSON with this structure:
{
  "objects_detected": [
    {
      "label": "string",
      "confidence": number,
      "bounding_box": [y_min, x_min, y_max, x_max],
      "description": "string"
    }
  ]
}`;
    } else if (analysisType === 'credibility') {
      systemPrompt = `You are an expert at analyzing image authenticity and credibility. Examine this image for:
1. Signs of manipulation or editing
2. Metadata inconsistencies
3. Lighting and shadow analysis
4. Context plausibility
5. Source reliability indicators

${claim ? `This image is being used to support the following claim: "${claim}"` : ''}

Return your response as JSON with this structure:
{
  "credibility_assessment": {
    "score": number (0-100),
    "factors": ["list of factors that increase credibility"],
    "warnings": ["list of concerns or red flags"]
  },
  "cross_validation_flags": ["items that should be independently verified"]
}`;
    } else {
      systemPrompt = `You are an expert visual evidence analyst. Provide a comprehensive analysis of this image including:
1. Detailed description of what's shown
2. Key objects and their significance
3. Any text visible in the image
4. Context and setting
5. Potential narrative implications

${claim ? `Consider this claim when analyzing: "${claim}"` : ''}

Return your response as JSON with this structure:
{
  "description": "detailed description",
  "objects_detected": [{"label": "string", "confidence": number, "bounding_box": [y_min, x_min, y_max, x_max], "description": "string"}],
  "credibility_assessment": {"score": number, "factors": [], "warnings": []},
  "narrative_relevance": {"supports": [], "contradicts": [], "neutral": []},
  "cross_validation_flags": []
}`;
    }

    // Prepare image content
    let imageContent: any;
    if (imageBase64) {
      imageContent = {
        inline_data: {
          mime_type: 'image/jpeg',
          data: imageBase64,
        },
      };
    } else if (imageUrl) {
      // SSRF protection: validate URL before fetching
      if (!isValidExternalUrl(imageUrl)) {
        return new Response(
          JSON.stringify({ error: 'Invalid or disallowed URL' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Fetch the image and convert to base64
      const imageResponse = await fetch(imageUrl);
      const imageBuffer = await imageResponse.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));
      imageContent = {
        inline_data: {
          mime_type: imageResponse.headers.get('content-type') || 'image/jpeg',
          data: base64,
        },
      };
    }

    // Call Gemini API
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: systemPrompt },
                imageContent,
                ...(prompt ? [{ text: prompt }] : []),
              ],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            topP: 0.8,
            maxOutputTokens: 4096,
          },
        }),
      }
    );

    if (!geminiResponse.ok) {
      console.error('Gemini API error:', geminiResponse.status);
      throw new Error('Vision service error');
    }

    const geminiData = await geminiResponse.json();
    const textResponse = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textResponse) {
      throw new Error('No response from Gemini');
    }

    // Parse the JSON response
    let analysis: GeminiAnalysis;
    try {
      // Extract JSON from the response (it might be wrapped in markdown code blocks)
      const jsonMatch = textResponse.match(/```json\n?([\s\S]*?)\n?```/) ||
        textResponse.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : textResponse;
      analysis = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', textResponse);
      // Return a basic analysis if parsing fails
      analysis = {
        description: textResponse,
        objects_detected: [],
        credibility_assessment: { score: 50, factors: [], warnings: ['Analysis parsing failed'] },
        narrative_relevance: { supports: [], contradicts: [], neutral: [] },
        cross_validation_flags: [],
      };
    }

    console.log('Gemini Vision: Analysis complete');

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Gemini Vision error:', error);
    return new Response(
      JSON.stringify({ error: 'An error occurred processing your request' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
