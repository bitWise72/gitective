import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, ImageIcon, FileText, Link2, ChevronDown, ChevronUp, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { Evidence, getCredibilityLevel, getCredibilityColor } from '@/types/timeline';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import BoundingBoxViewer from './BoundingBoxViewer';

interface EvidencePanelProps {
  evidence: Evidence | null;
  onClose: () => void;
}

export default function EvidencePanel({ evidence, onClose }: EvidencePanelProps) {
  const [analysisOpen, setAnalysisOpen] = useState(true);
  const [objectsOpen, setObjectsOpen] = useState(false);
  
  if (!evidence) return null;
  
  const credibilityLevel = getCredibilityLevel(evidence.source_credibility);
  const analysis = evidence.gemini_analysis;
  
  const getEvidenceIcon = () => {
    switch (evidence.evidence_type) {
      case 'image': return <ImageIcon className="w-4 h-4" />;
      case 'link': return <Link2 className="w-4 h-4" />;
      case 'document': return <FileText className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        className="h-full bg-card border-l border-border flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            {getEvidenceIcon()}
            <h3 className="font-semibold text-foreground truncate max-w-[200px]">{evidence.title}</h3>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {/* Credibility Score */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Credibility Score</span>
                <Badge
                  className={`${
                    credibilityLevel === 'high' ? 'bg-credibility-high/20 text-credibility-high border-credibility-high/30' :
                    credibilityLevel === 'medium' ? 'bg-credibility-medium/20 text-credibility-medium border-credibility-medium/30' :
                    'bg-credibility-low/20 text-credibility-low border-credibility-low/30'
                  }`}
                >
                  {evidence.source_credibility}%
                </Badge>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${evidence.source_credibility}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className={`h-full rounded-full ${
                    credibilityLevel === 'high' ? 'confidence-high' :
                    credibilityLevel === 'medium' ? 'confidence-medium' :
                    'confidence-low'
                  }`}
                />
              </div>
            </div>
            
            {/* Evidence Image with Bounding Boxes */}
            {evidence.image_url && (
              <BoundingBoxViewer
                imageUrl={evidence.image_url}
                boundingBoxes={evidence.bounding_boxes || []}
                detectedObjects={analysis?.objects_detected || []}
              />
            )}
            
            {/* Content */}
            {evidence.content && (
              <div className="space-y-1">
                <span className="text-sm text-muted-foreground">Content</span>
                <p className="text-sm text-foreground bg-secondary/50 rounded-lg p-3">
                  {evidence.content}
                </p>
              </div>
            )}
            
            {/* Source */}
            {evidence.source_url && (
              <div className="space-y-1">
                <span className="text-sm text-muted-foreground">Source</span>
                <a
                  href={evidence.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <ExternalLink className="w-3 h-3" />
                  {new URL(evidence.source_url).hostname}
                </a>
              </div>
            )}
            
            {/* Narrative Support */}
            {evidence.supports_narrative !== null && (
              <div className="flex items-center gap-2">
                {evidence.supports_narrative ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-credibility-high" />
                    <span className="text-sm text-credibility-high">Supports narrative</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-credibility-low" />
                    <span className="text-sm text-credibility-low">Contradicts narrative</span>
                  </>
                )}
              </div>
            )}
            
            {/* Gemini Analysis */}
            {analysis && (
              <Collapsible open={analysisOpen} onOpenChange={setAnalysisOpen}>
                <CollapsibleTrigger className="flex items-center justify-between w-full py-2">
                  <span className="text-sm font-medium text-foreground">AI Analysis</span>
                  {analysisOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">{analysis.description}</p>
                  
                  {/* Cross-validation flags */}
                  {analysis.cross_validation_flags.length > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-credibility-medium">
                        <AlertTriangle className="w-3 h-3" />
                        <span className="text-xs font-medium">Validation Flags</span>
                      </div>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        {analysis.cross_validation_flags.map((flag, i) => (
                          <li key={i} className="flex items-start gap-1">
                            <span className="text-credibility-medium">•</span>
                            {flag}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {/* Credibility factors */}
                  {analysis.credibility_assessment.factors.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-xs font-medium text-foreground">Credibility Factors</span>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        {analysis.credibility_assessment.factors.map((factor, i) => (
                          <li key={i}>• {factor}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>
            )}
            
            {/* Detected Objects */}
            {analysis?.objects_detected && analysis.objects_detected.length > 0 && (
              <Collapsible open={objectsOpen} onOpenChange={setObjectsOpen}>
                <CollapsibleTrigger className="flex items-center justify-between w-full py-2">
                  <span className="text-sm font-medium text-foreground">
                    Detected Objects ({analysis.objects_detected.length})
                  </span>
                  {objectsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="space-y-2">
                    {analysis.objects_detected.map((obj, i) => (
                      <div key={i} className="bg-secondary/50 rounded-lg p-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-foreground">{obj.label}</span>
                          <Badge variant="outline" className="text-xs">
                            {Math.round(obj.confidence * 100)}%
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{obj.description}</p>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
            
            {/* Metadata */}
            <div className="pt-4 border-t border-border text-xs text-muted-foreground space-y-1">
              <div>Type: {evidence.evidence_type}</div>
              <div>Added: {new Date(evidence.created_at).toLocaleString()}</div>
              {evidence.parent_evidence_id && (
                <div>Parent: {evidence.parent_evidence_id.slice(0, 8)}...</div>
              )}
            </div>
          </div>
        </ScrollArea>
      </motion.div>
    </AnimatePresence>
  );
}
