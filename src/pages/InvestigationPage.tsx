import { useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Play, Upload, GitBranch, Plus, Eye, EyeOff, GitCompare } from 'lucide-react';
import { useInvestigation } from '@/hooks/useInvestigation';
import { Evidence, Hypothesis, Branch } from '@/types/timeline';
import Timeline3D from '@/components/timeline/Timeline3D';
import TimeSlider from '@/components/timeline/TimeSlider';
import EvidencePanel from '@/components/evidence/EvidencePanel';
import BranchTabs from '@/components/branches/BranchTabs';
import HypothesisPanel from '@/components/hypotheses/HypothesisPanel';
import InvestigationStatus from '@/components/investigation/InvestigationStatus';
import DiffView from '@/components/investigation/DiffView';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function InvestigationPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const {
    event,
    branches,
    evidence,
    hypotheses,
    logs,
    isLoading,
    isInvestigating,
    createBranch,
    addEvidence,
    startInvestigation,
    mergeBranches,
  } = useInvestigation(id || null);

  const [selectedEvidence, setSelectedEvidence] = useState<Evidence | null>(null);
  const [hoveredEvidence, setHoveredEvidence] = useState<Evidence | null>(null);
  const [activeBranchId, setActiveBranchId] = useState<string | null>(null);
  const [showTimeline, setShowTimeline] = useState(true);

  const [newBranchOpen, setNewBranchOpen] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchDesc, setNewBranchDesc] = useState('');

  const [addEvidenceOpen, setAddEvidenceOpen] = useState(false);
  const [evidenceTitle, setEvidenceTitle] = useState('');
  const [evidenceContent, setEvidenceContent] = useState('');
  const [evidenceType, setEvidenceType] = useState<'text' | 'image' | 'link'>('text');
  const [evidenceUrl, setEvidenceUrl] = useState('');

  const [timelineDate, setTimelineDate] = useState<Date>(new Date('2099-12-31'));
  const [showDiffView, setShowDiffView] = useState(false);
  const [compareBranchId, setCompareBranchId] = useState<string | null>(null);

  if (branches.length > 0 && !activeBranchId) {
    setActiveBranchId(branches[0].id);
  }

  const handleSelectEvidence = useCallback((evidence: Evidence) => {
    setSelectedEvidence(evidence);
  }, []);

  const handleHoverEvidence = useCallback((evidence: Evidence | null) => {
    setHoveredEvidence(evidence);
  }, []);

  const handleCreateBranch = async () => {
    if (!newBranchName.trim()) return;
    await createBranch.mutateAsync({ name: newBranchName, description: newBranchDesc });
    setNewBranchOpen(false);
    setNewBranchName('');
    setNewBranchDesc('');
  };

  const handleAddEvidence = async () => {
    if (!evidenceTitle.trim() || !activeBranchId) return;
    await addEvidence.mutateAsync({
      branch_id: activeBranchId,
      title: evidenceTitle,
      content: evidenceContent,
      evidence_type: evidenceType,
      source_url: evidenceUrl || undefined,
    });
    setAddEvidenceOpen(false);
    setEvidenceTitle('');
    setEvidenceContent('');
    setEvidenceUrl('');
  };

  const handleSelectHypothesis = (hypothesis: Hypothesis) => {
    const relatedEvidence = evidence.find(e =>
      hypothesis.supporting_evidence_ids?.includes(e.id) ||
      hypothesis.refuting_evidence_ids?.includes(e.id)
    );
    if (relatedEvidence) {
      setSelectedEvidence(relatedEvidence);
    }
  };

  const branchEvidence = activeBranchId
    ? evidence.filter(e => e.branch_id === activeBranchId)
    : evidence;

  const branchHypotheses = activeBranchId
    ? hypotheses.filter(h => h.branch_id === activeBranchId)
    : hypotheses;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="flex items-center gap-4 mb-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-64" />
        </div>
        <Skeleton className="h-[calc(100vh-8rem)] w-full" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Investigation not found</h1>
          <p className="text-muted-foreground mb-4">This investigation doesn't exist or was deleted.</p>
          <Button onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold text-foreground">{event.title}</h1>
              <p className="text-sm text-muted-foreground line-clamp-1">
                {event.description || 'No description'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTimeline(!showTimeline)}
            >
              {showTimeline ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
              {showTimeline ? 'Hide' : 'Show'} 3D
            </Button>

            <Dialog open={addEvidenceOpen} onOpenChange={setAddEvidenceOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Upload className="w-4 h-4 mr-1" />
                  Add Evidence
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Evidence</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Title</label>
                    <Input
                      value={evidenceTitle}
                      onChange={(e) => setEvidenceTitle(e.target.value)}
                      placeholder="Brief title for this evidence"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Type</label>
                    <Select value={evidenceType} onValueChange={(v: any) => setEvidenceType(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Text</SelectItem>
                        <SelectItem value="image">Image</SelectItem>
                        <SelectItem value="link">Link</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Dynamic fields based on type */}
                  {evidenceType === 'text' && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Content</label>
                      <Textarea
                        value={evidenceContent}
                        onChange={(e) => setEvidenceContent(e.target.value)}
                        placeholder="Evidence details..."
                        rows={4}
                      />
                    </div>
                  )}

                  {evidenceType === 'image' && (
                    <>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Image URL</label>
                        <Input
                          value={evidenceUrl}
                          onChange={(e) => setEvidenceUrl(e.target.value)}
                          placeholder="https://example.com/image.jpg"
                        />
                      </div>
                      {evidenceUrl && (
                        <div className="rounded-lg border border-border overflow-hidden">
                          <img
                            src={evidenceUrl}
                            alt="Preview"
                            className="max-h-40 w-full object-cover"
                            onError={(e) => (e.currentTarget.style.display = 'none')}
                          />
                        </div>
                      )}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Caption (optional)</label>
                        <Textarea
                          value={evidenceContent}
                          onChange={(e) => setEvidenceContent(e.target.value)}
                          placeholder="Describe what this image shows..."
                          rows={2}
                        />
                      </div>
                    </>
                  )}

                  {evidenceType === 'link' && (
                    <>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Link URL</label>
                        <Input
                          value={evidenceUrl}
                          onChange={(e) => setEvidenceUrl(e.target.value)}
                          placeholder="https://example.com/article"
                        />
                        {evidenceUrl && (
                          <p className="text-xs text-muted-foreground">
                            AI will automatically fetch and analyze this page
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Summary (optional)</label>
                        <Textarea
                          value={evidenceContent}
                          onChange={(e) => setEvidenceContent(e.target.value)}
                          placeholder="Key points from this source..."
                          rows={2}
                        />
                      </div>
                    </>
                  )}

                  <Button onClick={handleAddEvidence} className="w-full" disabled={!evidenceTitle.trim()}>
                    Add to {branches.find(b => b.id === activeBranchId)?.name || 'branch'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Button
              onClick={startInvestigation}
              disabled={isInvestigating || event.status === 'collecting' || event.status === 'analyzing'}
            >
              <Play className="w-4 h-4 mr-1" />
              {isInvestigating ? 'Running...' : 'Run Investigation'}
            </Button>
          </div>
        </div>

        {/* Branch tabs */}
        <BranchTabs
          branches={branches}
          activeBranchId={activeBranchId}
          onSelectBranch={setActiveBranchId}
          onCreateBranch={() => setNewBranchOpen(true)}
          onMergeBranches={() => setShowDiffView(true)}
        />
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          {/* Left panel: 3D Timeline or Evidence List */}
          <ResizablePanel defaultSize={65} minSize={40}>
            {showTimeline ? (
              <div className="h-full relative">
                <Timeline3D
                  evidence={branchEvidence.filter(e => new Date(e.created_at) <= timelineDate)}
                  branches={branches}
                  selectedEvidenceId={selectedEvidence?.id || null}
                  onSelectEvidence={handleSelectEvidence}
                  onHoverEvidence={handleHoverEvidence}
                />
                <TimeSlider
                  evidence={branchEvidence}
                  currentTime={timelineDate}
                  onTimeChange={setTimelineDate}
                />
              </div>
            ) : (
              <ScrollArea className="h-full p-4">
                <div className="space-y-4">
                  <InvestigationStatus event={event} logs={logs} />

                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-foreground">
                      Evidence ({branchEvidence.length})
                    </h3>
                    {branchEvidence.map((e, i) => (
                      <motion.button
                        key={e.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                        onClick={() => setSelectedEvidence(e)}
                        className={`w-full text-left p-3 rounded-lg border transition-all ${selectedEvidence?.id === e.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                          }`}
                      >
                        <div className="font-medium text-foreground truncate">{e.title}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {e.evidence_type} • {e.source_credibility}% credible
                        </div>
                      </motion.button>
                    ))}
                    {branchEvidence.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No evidence in this branch yet. Add evidence or run the investigation.
                      </p>
                    )}
                  </div>

                  <HypothesisPanel
                    hypotheses={branchHypotheses}
                    onSelectHypothesis={handleSelectHypothesis}
                  />
                </div>
              </ScrollArea>
            )}
          </ResizablePanel>

          {/* Right panel: Evidence details or status */}
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={35} minSize={25}>
            {selectedEvidence ? (
              <EvidencePanel
                evidence={selectedEvidence}
                onClose={() => setSelectedEvidence(null)}
              />
            ) : (
              <ScrollArea className="h-full p-4">
                <div className="space-y-4">
                  <InvestigationStatus event={event} logs={logs} />
                  <HypothesisPanel
                    hypotheses={branchHypotheses}
                    onSelectHypothesis={handleSelectHypothesis}
                  />
                </div>
              </ScrollArea>
            )}
          </ResizablePanel>
        </ResizablePanelGroup>
      </main>

      {/* New Branch Dialog */}
      <Dialog open={newBranchOpen} onOpenChange={setNewBranchOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-primary" />
              Create New Narrative Branch
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Branch Name</label>
              <Input
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value)}
                placeholder="e.g., Alternative Theory"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={newBranchDesc}
                onChange={(e) => setNewBranchDesc(e.target.value)}
                placeholder="Describe this narrative interpretation..."
                rows={3}
              />
            </div>
            <Button onClick={handleCreateBranch} className="w-full" disabled={!newBranchName.trim()}>
              <Plus className="w-4 h-4 mr-2" />
              Create Branch
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AnimatePresence>
        {showDiffView && branches.length >= 2 && (
          <DiffView
            branchA={branches.find(b => b.id === activeBranchId) || branches[0]}
            branchB={branches.find(b => b.id !== activeBranchId) || branches[1]}
            evidenceA={evidence.filter(e => e.branch_id === (activeBranchId || branches[0]?.id))}
            evidenceB={evidence.filter(e => e.branch_id !== activeBranchId && branches.some(b => b.id !== activeBranchId && e.branch_id === b.id))}
            onClose={() => setShowDiffView(false)}
            onMerge={(sourceBranchId, targetBranchId) => {
              mergeBranches.mutate({ sourceBranchId, targetBranchId });
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
