-- Add user_id column to events table for ownership tracking
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Drop all existing public RLS policies
DROP POLICY IF EXISTS "Allow public delete access on events" ON public.events;
DROP POLICY IF EXISTS "Allow public insert access on events" ON public.events;
DROP POLICY IF EXISTS "Allow public read access on events" ON public.events;
DROP POLICY IF EXISTS "Allow public update access on events" ON public.events;

DROP POLICY IF EXISTS "Allow public delete access on branches" ON public.branches;
DROP POLICY IF EXISTS "Allow public insert access on branches" ON public.branches;
DROP POLICY IF EXISTS "Allow public read access on branches" ON public.branches;
DROP POLICY IF EXISTS "Allow public update access on branches" ON public.branches;

DROP POLICY IF EXISTS "Allow public delete access on evidence" ON public.evidence;
DROP POLICY IF EXISTS "Allow public insert access on evidence" ON public.evidence;
DROP POLICY IF EXISTS "Allow public read access on evidence" ON public.evidence;
DROP POLICY IF EXISTS "Allow public update access on evidence" ON public.evidence;

DROP POLICY IF EXISTS "Allow public delete access on hypotheses" ON public.hypotheses;
DROP POLICY IF EXISTS "Allow public insert access on hypotheses" ON public.hypotheses;
DROP POLICY IF EXISTS "Allow public read access on hypotheses" ON public.hypotheses;
DROP POLICY IF EXISTS "Allow public update access on hypotheses" ON public.hypotheses;

DROP POLICY IF EXISTS "Allow public delete access on merges" ON public.merges;
DROP POLICY IF EXISTS "Allow public insert access on merges" ON public.merges;
DROP POLICY IF EXISTS "Allow public read access on merges" ON public.merges;
DROP POLICY IF EXISTS "Allow public update access on merges" ON public.merges;

DROP POLICY IF EXISTS "Allow public insert access on investigation_logs" ON public.investigation_logs;
DROP POLICY IF EXISTS "Allow public read access on investigation_logs" ON public.investigation_logs;

-- Create user-scoped RLS policies for events (owner-based access)
CREATE POLICY "Users can view own events" ON public.events
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create events" ON public.events
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own events" ON public.events
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own events" ON public.events
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Create RLS policies for branches (via event ownership)
CREATE POLICY "Users can view branches of own events" ON public.branches
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.events WHERE events.id = branches.event_id AND events.user_id = auth.uid()));

CREATE POLICY "Users can create branches for own events" ON public.branches
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.events WHERE events.id = branches.event_id AND events.user_id = auth.uid()));

CREATE POLICY "Users can update branches of own events" ON public.branches
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.events WHERE events.id = branches.event_id AND events.user_id = auth.uid()));

CREATE POLICY "Users can delete branches of own events" ON public.branches
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.events WHERE events.id = branches.event_id AND events.user_id = auth.uid()));

-- Create RLS policies for evidence (via event ownership)
CREATE POLICY "Users can view evidence of own events" ON public.evidence
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.events WHERE events.id = evidence.event_id AND events.user_id = auth.uid()));

CREATE POLICY "Users can create evidence for own events" ON public.evidence
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.events WHERE events.id = evidence.event_id AND events.user_id = auth.uid()));

CREATE POLICY "Users can update evidence of own events" ON public.evidence
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.events WHERE events.id = evidence.event_id AND events.user_id = auth.uid()));

CREATE POLICY "Users can delete evidence of own events" ON public.evidence
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.events WHERE events.id = evidence.event_id AND events.user_id = auth.uid()));

-- Create RLS policies for hypotheses (via branch -> event ownership)
CREATE POLICY "Users can view hypotheses of own events" ON public.hypotheses
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.branches 
    JOIN public.events ON events.id = branches.event_id 
    WHERE branches.id = hypotheses.branch_id AND events.user_id = auth.uid()
  ));

CREATE POLICY "Users can create hypotheses for own events" ON public.hypotheses
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.branches 
    JOIN public.events ON events.id = branches.event_id 
    WHERE branches.id = hypotheses.branch_id AND events.user_id = auth.uid()
  ));

CREATE POLICY "Users can update hypotheses of own events" ON public.hypotheses
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.branches 
    JOIN public.events ON events.id = branches.event_id 
    WHERE branches.id = hypotheses.branch_id AND events.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete hypotheses of own events" ON public.hypotheses
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.branches 
    JOIN public.events ON events.id = branches.event_id 
    WHERE branches.id = hypotheses.branch_id AND events.user_id = auth.uid()
  ));

-- Create RLS policies for merges (via event ownership)
CREATE POLICY "Users can view merges of own events" ON public.merges
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.events WHERE events.id = merges.event_id AND events.user_id = auth.uid()));

CREATE POLICY "Users can create merges for own events" ON public.merges
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.events WHERE events.id = merges.event_id AND events.user_id = auth.uid()));

CREATE POLICY "Users can update merges of own events" ON public.merges
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.events WHERE events.id = merges.event_id AND events.user_id = auth.uid()));

CREATE POLICY "Users can delete merges of own events" ON public.merges
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.events WHERE events.id = merges.event_id AND events.user_id = auth.uid()));

-- Create RLS policies for investigation_logs (via event ownership, read-only for users)
CREATE POLICY "Users can view logs of own events" ON public.investigation_logs
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.events WHERE events.id = investigation_logs.event_id AND events.user_id = auth.uid()));

-- Service role can insert logs (edge functions use service role key)
CREATE POLICY "Service can insert logs" ON public.investigation_logs
  FOR INSERT TO service_role
  WITH CHECK (true);

-- Make storage bucket private and add user-scoped policies
UPDATE storage.buckets SET public = false WHERE id = 'evidence';

-- Drop existing public storage policies
DROP POLICY IF EXISTS "Allow public read access on evidence bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow public insert access on evidence bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow public update access on evidence bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow public delete access on evidence bucket" ON storage.objects;

-- Create user-scoped storage policies
-- Users can upload files to their own folder (user_id/filename)
CREATE POLICY "Users can upload to own folder" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'evidence' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view own files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'evidence' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update own files" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'evidence' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own files" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'evidence' AND (storage.foldername(name))[1] = auth.uid()::text);