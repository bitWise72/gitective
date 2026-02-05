import { ExternalLink, ImageIcon, FileText, Link2 } from 'lucide-react';
import { Evidence, getCredibilityColor } from '@/types/timeline';
import { Badge } from '@/components/ui/badge';

interface EvidenceCardProps {
    evidence: Evidence;
    isSelected?: boolean;
    onClick?: () => void;
}

export default function EvidenceCard({ evidence, isSelected, onClick }: EvidenceCardProps) {
    const getTypeIcon = () => {
        switch (evidence.evidence_type) {
            case 'image': return <ImageIcon className="w-4 h-4 text-blue-400" />;
            case 'link': return <Link2 className="w-4 h-4 text-green-400" />;
            default: return <FileText className="w-4 h-4 text-gray-400" />;
        }
    };

    const getCredibilityClass = (score: number) => {
        if (score >= 70) return 'bg-credibility-high/20 text-credibility-high border-credibility-high/30';
        if (score >= 40) return 'bg-credibility-medium/20 text-credibility-medium border-credibility-medium/30';
        return 'bg-credibility-low/20 text-credibility-low border-credibility-low/30';
    };

    return (
        <button
            onClick={onClick}
            className={`w-full text-left p-3 rounded-lg border transition-all hover:shadow-md ${isSelected
                    ? 'border-primary bg-primary/5 shadow-lg'
                    : 'border-border hover:border-primary/50 bg-card'
                }`}
        >
            <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                    {getTypeIcon()}
                    <span className="font-medium text-foreground truncate">{evidence.title}</span>
                </div>
                <Badge className={`shrink-0 text-xs ${getCredibilityClass(evidence.source_credibility)}`}>
                    {evidence.source_credibility}%
                </Badge>
            </div>

            {/* Type-specific preview */}
            {evidence.evidence_type === 'image' && evidence.image_url && (
                <div className="mt-2 rounded overflow-hidden">
                    <img
                        src={evidence.image_url}
                        alt={evidence.title}
                        className="w-full h-20 object-cover opacity-80"
                    />
                </div>
            )}

            {evidence.evidence_type === 'link' && evidence.source_url && (
                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground bg-secondary/50 rounded px-2 py-1">
                    <ExternalLink className="w-3 h-3" />
                    <span className="truncate">{new URL(evidence.source_url).hostname}</span>
                </div>
            )}

            {evidence.content && evidence.evidence_type === 'text' && (
                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                    {evidence.content}
                </p>
            )}

            <div className="text-xs text-muted-foreground mt-2">
                {new Date(evidence.created_at).toLocaleDateString()}
            </div>
        </button>
    );
}
