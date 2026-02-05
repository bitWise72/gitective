-- Create enum types for status tracking
CREATE TYPE investigation_status AS ENUM ('idle', 'collecting', 'analyzing', 'complete', 'error');
CREATE TYPE evidence_type AS ENUM ('image', 'text', 'link', 'document');
CREATE TYPE hypothesis_status AS ENUM ('pending', 'testing', 'confirmed', 'refuted');
CREATE TYPE merge_status AS ENUM ('pending', 'merged', 'conflict');

-- Events table (repositories) - contested events with status tracking
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status investigation_status NOT NULL DEFAULT 'idle',
  current_phase INTEGER DEFAULT 0,
  total_phases INTEGER DEFAULT 5,
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

-- Enable Row Level Security on all tables
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hypotheses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investigation_logs ENABLE ROW LEVEL SECURITY;

-- Create public access policies (no auth required for hackathon demo)
CREATE POLICY "Allow public read access on events" ON public.events FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on events" ON public.events FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on events" ON public.events FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access on events" ON public.events FOR DELETE USING (true);

CREATE POLICY "Allow public read access on branches" ON public.branches FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on branches" ON public.branches FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on branches" ON public.branches FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access on branches" ON public.branches FOR DELETE USING (true);

CREATE POLICY "Allow public read access on evidence" ON public.evidence FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on evidence" ON public.evidence FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on evidence" ON public.evidence FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access on evidence" ON public.evidence FOR DELETE USING (true);

CREATE POLICY "Allow public read access on hypotheses" ON public.hypotheses FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on hypotheses" ON public.hypotheses FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on hypotheses" ON public.hypotheses FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access on hypotheses" ON public.hypotheses FOR DELETE USING (true);

CREATE POLICY "Allow public read access on merges" ON public.merges FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on merges" ON public.merges FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on merges" ON public.merges FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access on merges" ON public.merges FOR DELETE USING (true);

CREATE POLICY "Allow public read access on investigation_logs" ON public.investigation_logs FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on investigation_logs" ON public.investigation_logs FOR INSERT WITH CHECK (true);

-- Create storage bucket for evidence images
INSERT INTO storage.buckets (id, name, public) VALUES ('evidence', 'evidence', true);

-- Storage policies for evidence bucket
CREATE POLICY "Allow public read access on evidence bucket" ON storage.objects FOR SELECT USING (bucket_id = 'evidence');
CREATE POLICY "Allow public upload to evidence bucket" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'evidence');
CREATE POLICY "Allow public update on evidence bucket" ON storage.objects FOR UPDATE USING (bucket_id = 'evidence');
CREATE POLICY "Allow public delete on evidence bucket" ON storage.objects FOR DELETE USING (bucket_id = 'evidence');

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_branches_updated_at BEFORE UPDATE ON public.branches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_hypotheses_updated_at BEFORE UPDATE ON public.hypotheses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_branches_event_id ON public.branches(event_id);
CREATE INDEX idx_evidence_event_id ON public.evidence(event_id);
CREATE INDEX idx_evidence_branch_id ON public.evidence(branch_id);
CREATE INDEX idx_evidence_parent_id ON public.evidence(parent_evidence_id);
CREATE INDEX idx_hypotheses_branch_id ON public.hypotheses(branch_id);
CREATE INDEX idx_merges_event_id ON public.merges(event_id);
CREATE INDEX idx_investigation_logs_event_id ON public.investigation_logs(event_id);