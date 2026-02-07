-- ============================================================
-- TIMELINEFORGE COMPLETE DATABASE SCHEMA
-- Run this on a brand new Supabase project to set up everything
-- ============================================================

-- Create enum types for status tracking
CREATE TYPE investigation_status AS ENUM ('idle', 'collecting', 'analyzing', 'complete', 'error');
CREATE TYPE evidence_type AS ENUM ('image', 'text', 'link', 'document');
CREATE TYPE hypothesis_status AS ENUM ('pending', 'testing', 'confirmed', 'refuted');
CREATE TYPE merge_status AS ENUM ('pending', 'merged', 'conflict');

-- ============================================================
-- TABLES
-- ============================================================

-- Events table (repositories) - contested events with status tracking
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status investigation_status NOT NULL DEFAULT 'idle',
  current_phase INTEGER DEFAULT 0,
  total_phases INTEGER DEFAULT 5,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Branches table (narratives) - competing interpretations with confidence scores
CREATE TABLE public.branches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  confidence_score DECIMAL(5,2) DEFAULT 50.00,
  color TEXT NOT NULL DEFAULT '#6366f1',
  position_z DECIMAL(10,2) DEFAULT 0,
  is_main BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Evidence table (commits) - with parent_evidence_id for Git-like chains
CREATE TABLE public.evidence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  parent_evidence_id UUID REFERENCES public.evidence(id),
  title TEXT NOT NULL,
  content TEXT,
  evidence_type evidence_type NOT NULL DEFAULT 'text',
  source_url TEXT,
  source_credibility DECIMAL(5,2) DEFAULT 50.00,
  image_url TEXT,
  gemini_analysis JSONB,
  bounding_boxes JSONB,
  supports_narrative BOOLEAN,
  position_x DECIMAL(10,2) DEFAULT 0,
  position_y DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Hypotheses table - A/B testing claims with test status
CREATE TABLE public.hypotheses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  claim TEXT NOT NULL,
  testable_prediction TEXT,
  status hypothesis_status NOT NULL DEFAULT 'pending',
  supporting_evidence_ids UUID[],
  refuting_evidence_ids UUID[],
  confidence_impact DECIMAL(5,2) DEFAULT 0,
  reasoning TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Merges table - tracking merge attempts and conflicts
CREATE TABLE public.merges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  source_branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  target_branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  status merge_status NOT NULL DEFAULT 'pending',
  conflicts JSONB,
  resolution TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Investigation logs for marathon agent mode
CREATE TABLE public.investigation_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  phase INTEGER NOT NULL,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hypotheses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investigation_logs ENABLE ROW LEVEL SECURITY;

-- Events policies (owner-based access)
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

-- Branches policies (via event ownership)
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

-- Evidence policies (via event ownership)
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

-- Hypotheses policies (via branch -> event ownership)
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

-- Merges policies (via event ownership)
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

-- Investigation logs policies
CREATE POLICY "Users can view logs of own events" ON public.investigation_logs
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.events WHERE events.id = investigation_logs.event_id AND events.user_id = auth.uid()));

CREATE POLICY "Service can insert logs" ON public.investigation_logs
  FOR INSERT TO service_role
  WITH CHECK (true);

-- ============================================================
-- STORAGE BUCKET
-- ============================================================

INSERT INTO storage.buckets (id, name, public) VALUES ('evidence', 'evidence', false);

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

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_branches_updated_at BEFORE UPDATE ON public.branches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_hypotheses_updated_at BEFORE UPDATE ON public.hypotheses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_branches_event_id ON public.branches(event_id);
CREATE INDEX idx_evidence_event_id ON public.evidence(event_id);
CREATE INDEX idx_evidence_branch_id ON public.evidence(branch_id);
CREATE INDEX idx_evidence_parent_id ON public.evidence(parent_evidence_id);
CREATE INDEX idx_hypotheses_branch_id ON public.hypotheses(branch_id);
CREATE INDEX idx_merges_event_id ON public.merges(event_id);
CREATE INDEX idx_investigation_logs_event_id ON public.investigation_logs(event_id);
CREATE INDEX idx_events_user_id ON public.events(user_id);
