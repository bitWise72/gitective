import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Find all active investigations
        // We target events that are in 'collecting' or 'analyzing' state.
        // To enable "continuous monitoring" for completed events, the user should set them back to 'collecting'.
        const { data: events, error } = await supabase
            .from('events')
            .select('id, title')
            .in('status', ['collecting', 'analyzing']);

        if (error) throw error;

        console.log(`Monitor Scheduler: Found ${events?.length || 0} active events.`);

        const results = [];

        for (const event of events || []) {
            console.log(`Triggering investigator for: ${event.title}`);

            // Invoke marathon-investigator (which we've updated to be idempotent)
            const { data, error: invokeError } = await supabase.functions.invoke('marathon-investigator', {
                body: { eventId: event.id, isContinuous: true },
            });

            if (invokeError) {
                console.error(`Error invoking for ${event.id}:`, invokeError);
            }

            results.push({
                id: event.id,
                title: event.title,
                success: !invokeError,
                error: invokeError
            });
        }

        return new Response(JSON.stringify({
            success: true,
            processed: results.length,
            details: results
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('Monitor Scheduler error:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
