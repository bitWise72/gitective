
export type InvestigationStatus = 'idle' | 'collecting' | 'analyzing' | 'complete' | 'error';
export type EvidenceType = 'image' | 'text' | 'link' | 'document';
export type HypothesisStatus = 'pending' | 'testing' | 'confirmed' | 'refuted';
export type MergeStatus = 'pending' | 'merged' | 'conflict';

export interface Event {
  id: string;
  title: string;
  description: string | null;
  status: InvestigationStatus;
  current_phase: number;
  total_phases: number;
  created_at: string;
  updated_at: string;
}

export interface Branch {
  id: string;
  event_id: string;
  name: string;
  description: string | null;
  confidence_score: number;
  color: string;
  position_z: number;
  is_main: boolean;
  created_at: string;
  updated_at: string;
}

export interface Evidence {
  id: string;
  event_id: string;
  branch_id: string;
  parent_evidence_id: string | null;
  title: string;
  content: string | null;
  evidence_type: EvidenceType;
  source_url: string | null;
  source_credibility: number;
  image_url: string | null;
  gemini_analysis: GeminiAnalysis | null;
  bounding_boxes: BoundingBox[] | null;
  supports_narrative: boolean | null;
  position_x: number;
  position_y: number;
  created_at: string;
}

export interface GeminiAnalysis {
  description: string;
  objects_detected: DetectedObject[];
  credibility_assessment: CredibilityAssessment;
  narrative_relevance: NarrativeRelevance;
  cross_validation_flags: string[];
}

export interface DetectedObject {
  label: string;
  confidence: number;
  bounding_box: [number, number, number, number];
  description: string;
}

export interface BoundingBox {
  label: string;
  box: [number, number, number, number];
  color: string;
  type: 'detection' | 'user' | 'analysis';
}

export interface CredibilityAssessment {
  score: number;
  factors: string[];
  warnings: string[];
}

export interface NarrativeRelevance {
  supports: string[];
  contradicts: string[];
  neutral: string[];
}

export interface Hypothesis {
  id: string;
  branch_id: string;
  claim: string;
  testable_prediction: string | null;
  status: HypothesisStatus;
  supporting_evidence_ids: string[] | null;
  refuting_evidence_ids: string[] | null;
  confidence_impact: number;
  reasoning: string | null;
  created_at: string;
  updated_at: string;
}

export interface Merge {
  id: string;
  event_id: string;
  source_branch_id: string;
  target_branch_id: string;
  status: MergeStatus;
  conflicts: MergeConflict[] | null;
  resolution: string | null;
  created_at: string;
  resolved_at: string | null;
}

export interface MergeConflict {
  evidence_id: string;
  type: 'contradiction' | 'incompatible' | 'overlap';
  description: string;
  source_claim: string;
  target_claim: string;
}

export interface InvestigationLog {
  id: string;
  event_id: string;
  phase: number;
  action: string;
  details: Record<string, unknown> | null;
  created_at: string;
}


export interface Node3D {
  id: string;
  position: [number, number, number];
  color: string;
  scale: number;
  data: Evidence;
}

export interface Line3D {
  id: string;
  points: [number, number, number][];
  color: string;
  branchId: string;
}

export interface CameraState {
  position: [number, number, number];
  target: [number, number, number];
  zoom: number;
}

export const BRANCH_COLORS = [
  '#8b5cf6',
  '#06b6d4',
  '#22c55e',
  '#eab308',
  '#ef4444',
  '#f97316',
  '#ec4899',
  '#6366f1',
];

export function getCredibilityColor(score: number): string {
  if (score >= 70) return '#22c55e';
  if (score >= 40) return '#eab308';
  return '#ef4444';
}

export function getCredibilityLevel(score: number): 'high' | 'medium' | 'low' {
  if (score >= 70) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}
