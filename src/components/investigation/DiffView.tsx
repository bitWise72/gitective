import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { GitCompare, ArrowLeft, ArrowRight, Check, X, AlertTriangle } from 'lucide-react';
import { Branch, Evidence } from '@/types/timeline';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface DiffViewProps {
    branchA: Branch;
    branchB: Branch;
    evidenceA: Evidence[];
    evidenceB: Evidence[];
    onClose: () => void;
}

export default function DiffView({ branchA, branchB, evidenceA, evidenceB, onClose }: DiffViewProps) {
    const conflicts = useMemo(() => {
        const conflictList: { evidenceA: Evidence; evidenceB: Evidence; reason: string }[] = [];

        evidenceA.forEach(eA => {
            evidenceB.forEach(eB => {
                if (eA.source_credibility >= 70 && eB.source_credibility >= 70) {
                    if (eA.title.toLowerCase().includes(eB.title.toLowerCase().split(' ')[0]) ||
                        eB.title.toLowerCase().includes(eA.title.toLowerCase().split(' ')[0])) {
                        conflictList.push({
                            evidenceA: eA,
                            evidenceB: eB,
                            reason: 'Both high-credibility sources with potentially conflicting claims'
                        });
                    }
                }
            });
        });
        return conflictList;
    }, [evidenceA, evidenceB]);

    const getCredibilityClass = (score: number) => {
        if (score >= 70) return 'bg-credibility-high/20 text-credibility-high border-credibility-high';
        if (score >= 40) return 'bg-credibility-medium/20 text-credibility-medium border-credibility-medium';
        return 'bg-credibility-low/20 text-credibility-low border-credibility-low';
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm"
        >
            <div className="container mx-auto h-full flex flex-col py-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <GitCompare className="w-6 h-6 text-forge-purple" />
                        <h1 className="text-2xl font-bold">Branch Comparison</h1>
                    </div>
                    <Button variant="ghost" onClick={onClose}>
                        <X className="w-4 h-4 mr-2" />
                        Close
                    </Button>
                </div>

                {conflicts.length > 0 && (
                    <div className="mb-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                        <div className="flex items-center gap-2 text-amber-500 font-medium mb-2">
                            <AlertTriangle className="w-5 h-5" />
                            <span>{conflicts.length} Potential Conflict{conflicts.length > 1 ? 's' : ''} Detected</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            These branches contain high-credibility evidence with potentially opposing claims.
                            Review carefully before merging.
                        </p>
                    </div>
                )}

                <div className="flex-1 grid grid-cols-2 gap-6 min-h-0">
                    <div className="flex flex-col min-h-0">
                        <div className="flex items-center gap-3 mb-4 p-3 bg-card rounded-lg border border-border">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: branchA.color }} />
                            <div>
                                <h2 className="font-semibold">{branchA.name}</h2>
                                <p className="text-sm text-muted-foreground">{evidenceA.length} pieces of evidence</p>
                            </div>
                        </div>

                        <ScrollArea className="flex-1 bg-card/50 rounded-lg border border-border">
                            <div className="p-4 space-y-3">
                                {evidenceA.length === 0 ? (
                                    <p className="text-center text-muted-foreground py-8">No evidence in this branch</p>
                                ) : (
                                    evidenceA.map(e => (
                                        <div key={e.id} className="p-3 bg-background rounded-lg border border-border">
                                            <div className="flex items-start justify-between mb-2">
                                                <h3 className="font-medium text-sm">{e.title}</h3>
                                                <span className={`text-xs px-2 py-0.5 rounded border ${getCredibilityClass(e.source_credibility)}`}>
                                                    {e.source_credibility}%
                                                </span>
                                            </div>
                                            {e.content && (
                                                <p className="text-xs text-muted-foreground line-clamp-2">{e.content}</p>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </ScrollArea>
                    </div>

                    <div className="flex flex-col min-h-0">
                        <div className="flex items-center gap-3 mb-4 p-3 bg-card rounded-lg border border-border">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: branchB.color }} />
                            <div>
                                <h2 className="font-semibold">{branchB.name}</h2>
                                <p className="text-sm text-muted-foreground">{evidenceB.length} pieces of evidence</p>
                            </div>
                        </div>

                        <ScrollArea className="flex-1 bg-card/50 rounded-lg border border-border">
                            <div className="p-4 space-y-3">
                                {evidenceB.length === 0 ? (
                                    <p className="text-center text-muted-foreground py-8">No evidence in this branch</p>
                                ) : (
                                    evidenceB.map(e => (
                                        <div key={e.id} className="p-3 bg-background rounded-lg border border-border">
                                            <div className="flex items-start justify-between mb-2">
                                                <h3 className="font-medium text-sm">{e.title}</h3>
                                                <span className={`text-xs px-2 py-0.5 rounded border ${getCredibilityClass(e.source_credibility)}`}>
                                                    {e.source_credibility}%
                                                </span>
                                            </div>
                                            {e.content && (
                                                <p className="text-xs text-muted-foreground line-clamp-2">{e.content}</p>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </ScrollArea>
                    </div>
                </div>

                <Separator className="my-4" />

                <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                        Comparing {evidenceA.length + evidenceB.length} total evidence items
                    </div>
                    <div className="flex items-center gap-3">
                        <Button variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        {conflicts.length === 0 && (
                            <Button className="bg-forge-purple hover:bg-forge-purple/90">
                                <Check className="w-4 h-4 mr-2" />
                                Branches Compatible
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
