import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Event, Branch, Evidence, Hypothesis, InvestigationLog, BRANCH_COLORS, GeminiAnalysis, BoundingBox } from '@/types/timeline';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

function parseEvidence(data: any): Evidence {
  return {
    ...data,
    gemini_analysis: data.gemini_analysis as GeminiAnalysis | null,
    bounding_boxes: data.bounding_boxes as BoundingBox[] | null,
  };
}

export function useInvestigation(eventId: string | null) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isInvestigating, setIsInvestigating] = useState(false);

  const { data: event, isLoading: eventLoading } = useQuery({
    queryKey: ['event', eventId],
    queryFn: async () => {
      if (!eventId) return null;
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();
      if (error) throw error;
      return data as Event;
    },
    enabled: !!eventId,
  });

  const { data: branches = [], isLoading: branchesLoading } = useQuery({
    queryKey: ['branches', eventId],
    queryFn: async () => {
      if (!eventId) return [];
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as Branch[];
    },
    enabled: !!eventId,
  });

  const { data: evidence = [], isLoading: evidenceLoading } = useQuery({
    queryKey: ['evidence', eventId],
    queryFn: async () => {
      if (!eventId) return [];
      const { data, error } = await supabase
        .from('evidence')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data.map(parseEvidence);
    },
    enabled: !!eventId,
  });

  const { data: hypotheses = [], isLoading: hypothesesLoading } = useQuery({
    queryKey: ['hypotheses', eventId, branches.map(b => b.id)],
    queryFn: async () => {
      if (!eventId || branches.length === 0) return [];
      const branchIds = branches.map(b => b.id);
      const { data, error } = await supabase
        .from('hypotheses')
        .select('*')
        .in('branch_id', branchIds)
        .order('created_at', { ascending: true });
      if (error && error.code !== 'PGRST116') throw error;
      return (data || []) as Hypothesis[];
    },
    enabled: !!eventId && branches.length > 0,
  });

  const { data: logs = [] } = useQuery({
    queryKey: ['investigation_logs', eventId],
    queryFn: async () => {
      if (!eventId) return [];
      const { data, error } = await supabase
        .from('investigation_logs')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as InvestigationLog[];
    },
    enabled: !!eventId,
  });

  const createEvent = useMutation({
    mutationFn: async ({ title, description }: { title: string; description: string }) => {
      if (!user) throw new Error('Must be logged in to create an investigation');

      const { data, error } = await supabase
        .from('events')
        .insert({ title, description, user_id: user.id })
        .select()
        .single();
      if (error) throw error;

      const { error: branchError } = await supabase
        .from('branches')
        .insert({
          event_id: data.id,
          name: 'Main Narrative',
          description: 'The primary narrative branch',
          color: BRANCH_COLORS[0],
          is_main: true,
          position_z: 0,
        });
      if (branchError) throw branchError;

      return data as Event;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast({
        title: 'Investigation Created',
        description: `Started investigating: ${data.title}`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const createBranch = useMutation({
    mutationFn: async ({ name, description }: { name: string; description: string }) => {
      if (!eventId) throw new Error('No event selected');
      const colorIndex = branches.length % BRANCH_COLORS.length;
      const { data, error } = await supabase
        .from('branches')
        .insert({
          event_id: eventId,
          name,
          description,
          color: BRANCH_COLORS[colorIndex],
          position_z: branches.length * 4,
        })
        .select()
        .single();
      if (error) throw error;
      return data as Branch;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches', eventId] });
      toast({
        title: 'Branch Created',
        description: 'New narrative branch added',
      });
    },
  });

  const addEvidence = useMutation({
    mutationFn: async (evidenceData: Partial<Evidence> & { branch_id: string; title: string }) => {
      if (!eventId) throw new Error('No event selected');
      const { data, error } = await supabase
        .from('evidence')
        .insert({
          event_id: eventId,
          branch_id: evidenceData.branch_id,
          title: evidenceData.title,
          content: evidenceData.content,
          evidence_type: evidenceData.evidence_type || 'text',
          source_url: evidenceData.source_url,
          source_credibility: evidenceData.source_credibility || 50,
          image_url: evidenceData.image_url,
          parent_evidence_id: evidenceData.parent_evidence_id,
          position_x: evidenceData.position_x || 0,
          position_y: evidenceData.position_y || 0,
        })
        .select()
        .single();
      if (error) throw error;
      return parseEvidence(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evidence', eventId] });
    },
  });

  const startInvestigation = useCallback(async () => {
    if (!eventId) return;

    setIsInvestigating(true);

    try {
      // Update event status
      await supabase
        .from('events')
        .update({ status: 'collecting' })
        .eq('id', eventId);

      // Call marathon-investigator edge function
      const { data, error } = await supabase.functions.invoke('marathon-investigator', {
        body: { eventId },
      });

      if (error) throw error;

      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      queryClient.invalidateQueries({ queryKey: ['branches', eventId] });
      queryClient.invalidateQueries({ queryKey: ['evidence', eventId] });
      queryClient.invalidateQueries({ queryKey: ['investigation_logs', eventId] });

      toast({
        title: 'Investigation Started',
        description: 'The AI is now collecting and analyzing evidence',
      });
    } catch (error: any) {
      console.error('Investigation error:', error);
      toast({
        title: 'Investigation Error',
        description: error.message,
        variant: 'destructive',
      });

      await supabase
        .from('events')
        .update({ status: 'error' })
        .eq('id', eventId);
    } finally {
      setIsInvestigating(false);
    }
  }, [eventId, queryClient, toast]);

  useEffect(() => {
    if (!eventId) return;

    const channel = supabase
      .channel(`investigation-${eventId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'evidence', filter: `event_id=eq.${eventId}` },
        () => queryClient.invalidateQueries({ queryKey: ['evidence', eventId] })
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'branches', filter: `event_id=eq.${eventId}` },
        () => queryClient.invalidateQueries({ queryKey: ['branches', eventId] })
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'events', filter: `id=eq.${eventId}` },
        () => queryClient.invalidateQueries({ queryKey: ['event', eventId] })
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'investigation_logs', filter: `event_id=eq.${eventId}` },
        () => queryClient.invalidateQueries({ queryKey: ['investigation_logs', eventId] })
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, queryClient]);

  const mergeBranches = useMutation({
    mutationFn: async ({ sourceBranchId, targetBranchId, deleteSource = false }: { sourceBranchId: string; targetBranchId: string; deleteSource?: boolean }) => {
      if (!eventId) throw new Error('No event selected');

      // Get all evidence from the source branch
      const { data: sourceEvidence, error: fetchError } = await supabase
        .from('evidence')
        .select('*')
        .eq('branch_id', sourceBranchId);

      if (fetchError) throw fetchError;

      // Copy evidence to target branch
      if (sourceEvidence && sourceEvidence.length > 0) {
        const evidenceToCopy = sourceEvidence.map(e => ({
          event_id: e.event_id,
          branch_id: targetBranchId,
          title: e.title,
          content: e.content,
          evidence_type: e.evidence_type,
          source_url: e.source_url,
          source_credibility: e.source_credibility,
          image_url: e.image_url,
          parent_evidence_id: e.parent_evidence_id,
          position_x: e.position_x,
          position_y: e.position_y,
        }));

        const { error: insertError } = await supabase
          .from('evidence')
          .insert(evidenceToCopy);

        if (insertError) throw insertError;
      }

      // Optionally delete the source branch
      if (deleteSource) {
        // First delete evidence from source branch
        await supabase.from('evidence').delete().eq('branch_id', sourceBranchId);
        // Then delete the branch itself
        await supabase.from('branches').delete().eq('id', sourceBranchId);
      }

      return { merged: sourceEvidence?.length || 0 };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['branches', eventId] });
      queryClient.invalidateQueries({ queryKey: ['evidence', eventId] });
      toast({
        title: 'Branches Merged',
        description: `Successfully merged ${data.merged} evidence items`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Merge Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteEvent = useMutation({
    mutationFn: async (eventId: string) => {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast({
        title: 'Investigation Deleted',
        description: 'The investigation and all its data have been removed',
      });
    },
    onError: (error) => {
      toast({
        title: 'Delete Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteBranch = useMutation({
    mutationFn: async ({ branchId, eventId }: { branchId: string; eventId: string }) => {
      const { error: evidenceError } = await supabase
        .from('evidence')
        .delete()
        .eq('branch_id', branchId);
      if (evidenceError) throw evidenceError;

      const { error: branchError } = await supabase
        .from('branches')
        .delete()
        .eq('id', branchId);
      if (branchError) throw branchError;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['branches', variables.eventId] });
      queryClient.invalidateQueries({ queryKey: ['evidence', variables.eventId] });
      toast({
        title: 'Branch Deleted',
        description: 'The branch and its evidence have been removed',
      });
    },
    onError: (error) => {
      toast({
        title: 'Delete Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const runMonitorScheduler = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('monitor-scheduler', {
        body: {},
      });

      if (error) throw error;

      toast({
        title: 'Monitor Scheduler Triggered',
        description: `Processing ${data?.processed || 0} active investigations`,
      });

      queryClient.invalidateQueries({ queryKey: ['events'] });

      return data;
    } catch (error: any) {
      console.error('Monitor Scheduler error:', error);
      toast({
        title: 'Scheduler Error',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }
  }, [queryClient, toast]);

  return {
    event,
    branches,
    evidence,
    hypotheses,
    logs,
    isLoading: eventLoading || branchesLoading || evidenceLoading || hypothesesLoading,
    isInvestigating,
    createEvent,
    createBranch,
    addEvidence,
    startInvestigation,
    mergeBranches,
    runMonitorScheduler,
    deleteEvent,
    deleteBranch,
  };
}

export function useEvents() {
  return useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Event[];
    },
  });
}
