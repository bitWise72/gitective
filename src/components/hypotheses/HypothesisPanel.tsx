import { motion } from 'framer-motion';
import { Beaker, Clock, CheckCircle, XCircle, AlertCircle, ChevronRight } from 'lucide-react';
import { Hypothesis } from '@/types/timeline';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface HypothesisPanelProps {
  hypotheses: Hypothesis[];
  onSelectHypothesis: (hypothesis: Hypothesis) => void;
}

const STATUS_CONFIG = {
  pending: {
    icon: Clock,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/50',
    label: 'Pending',
  },
  testing: {
    icon: AlertCircle,
    color: 'text-credibility-medium',
    bgColor: 'bg-credibility-medium/10',
    label: 'Testing',
  },
  confirmed: {
    icon: CheckCircle,
    color: 'text-credibility-high',
    bgColor: 'bg-credibility-high/10',
    label: 'Confirmed',
  },
  refuted: {
    icon: XCircle,
    color: 'text-credibility-low',
    bgColor: 'bg-credibility-low/10',
    label: 'Refuted',
  },
};

export default function HypothesisPanel({
  hypotheses,
  onSelectHypothesis,
}: HypothesisPanelProps) {
  if (hypotheses.length === 0) {
    return (
      <Card className="bg-card/50 border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Beaker className="w-4 h-4 text-primary" />
            Hypotheses
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No hypotheses generated yet. Start an investigation to generate testable predictions.
          </p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="bg-card/50 border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Beaker className="w-4 h-4 text-primary" />
            Hypotheses
          </span>
          <Badge variant="outline" className="text-xs">
            {hypotheses.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="max-h-[300px]">
          <div className="px-4 pb-4 space-y-2">
            {hypotheses.map((hypothesis, index) => {
              const config = STATUS_CONFIG[hypothesis.status];
              const StatusIcon = config.icon;
              
              return (
                <motion.button
                  key={hypothesis.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => onSelectHypothesis(hypothesis)}
                  className={`w-full text-left p-3 rounded-lg border border-border hover:border-primary/50 transition-all ${config.bgColor}`}
                >
                  <div className="flex items-start gap-2">
                    <StatusIcon className={`w-4 h-4 mt-0.5 ${config.color}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground line-clamp-2">
                        {hypothesis.claim}
                      </p>
                      {hypothesis.testable_prediction && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                          Test: {hypothesis.testable_prediction}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className={`text-xs ${config.color}`}>
                          {config.label}
                        </Badge>
                        {hypothesis.confidence_impact !== 0 && (
                          <span className={`text-xs ${
                            hypothesis.confidence_impact > 0 ? 'text-credibility-high' : 'text-credibility-low'
                          }`}>
                            {hypothesis.confidence_impact > 0 ? '+' : ''}{hypothesis.confidence_impact.toFixed(1)}%
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </motion.button>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
