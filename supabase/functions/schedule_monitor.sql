-- Enable the pg_cron extension (run as superuser in Supabase Dashboard SQL Editor)
create extension if not exists pg_cron;

-- Enable the pg_net extension for HTTP calls
create extension if not exists pg_net with schema extensions;

-- Schedule the monitor to run every 6 hours
-- Replace YOUR_PROJECT_REF with your actual Supabase project reference (e.g., fqvzsfaqtcxibkdxzjal)
-- Replace YOUR_SERVICE_ROLE_KEY with your actual service role key
select cron.schedule(
  'continuous-investigation-monitor',
  '0 */12 * * *', -- Run every 12 hours
  $$
  select
    net.http_post(
        url:='https://YOUR_PROJECT_REF.supabase.co/functions/v1/monitor-scheduler',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);

-- To view scheduled jobs:
-- select * from cron.job;

-- To unschedule a job:
-- select cron.unschedule('continuous-investigation-monitor');
