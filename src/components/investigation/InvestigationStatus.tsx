import { motion } from 'framer-motion';
import { Loader2, CheckCircle, AlertCircle, Pause, Play, Zap } from 'lucide-react';
import { Event, InvestigationLog } from '@/types/timeline';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';

interface InvestigationStatusProps {
  event: Event | null;
  logs: InvestigationLog[];
  onPause?: () => void;
  onResume?: () => void;
}

type StatusKey = 'idle' | 'collecting' | 'analyzing' | 'complete' | 'error';

interface StatusConfigItem {
  icon: typeof Pause | typeof Loader2 | typeof Zap | typeof CheckCircle | typeof AlertCircle;
  color: string;
  bgColor: string;
  label: string;
  animate?: boolean;
}

const STATUS_CONFIG: Record<StatusKey, StatusConfigItem> = {
  idle: {
    icon: Pause,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
    label: 'Idle',
  },
  collecting: {
    icon: Loader2,
    color: 'text-forge-cyan',
    bgColor: 'bg-forge-cyan/10',
    label: 'Collecting Evidence',
    animate: true,
  },
  analyzing: {
    icon: Zap,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    label: 'Analyzing',
    animate: true,
  },
  complete: {
    icon: CheckCircle,
    color: 'text-credibility-high',
    bgColor: 'bg-credibility-high/10',
    label: 'Complete',
  },
  error: {
    icon: AlertCircle,
    color: 'text-credibility-low',
    bgColor: 'bg-credibility-low/10',
    label: 'Error',
  },
};

const PHASE_NAMES = [
  'Initialization',
  'Evidence Collection',
  'Narrative Identification',
  'Hypothesis Generation',
  'Cross-Validation',
  'Final Analysis',
];

export default function InvestigationStatus({
  event,
  logs,
  onPause,
  onResume,
}: InvestigationStatusProps) {
  if (!event) {
    return (
      <Card className="bg-card/50 border-border">
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">No active investigation</p>
        </CardContent>
      </Card>
    );
  }
  
  const config = STATUS_CONFIG[event.status as StatusKey] || STATUS_CONFIG.idle;
  const StatusIcon = config.icon;
  const progress = (event.current_phase / event.total_phases) * 100;
  const isActive = event.status === 'collecting' || event.status === 'analyzing';
  
  return (
    <Card className="bg-card/50 border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <motion.div
              animate={config.animate ? { rotate: 360 } : {}}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            >
              <StatusIcon className={`w-4 h-4 ${config.color}`} />
            </motion.div>
            Investigation Status
          </span>
          {isActive && (
            <Button variant="ghost" size="sm" onClick={onPause} className="h-7 px-2">
              <Pause className="w-3 h-3 mr-1" />
              Pause
            </Button>
          )}
          {event.status === 'idle' && onResume && (
            <Button variant="ghost" size="sm" onClick={onResume} className="h-7 px-2">
              <Play className="w-3 h-3 mr-1" />
              Resume
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status badge */}
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${config.bgColor}`}>
          <div className={`w-2 h-2 rounded-full ${config.color.replace('text-', 'bg-')} ${isActive ? 'status-pulse' : ''}`} />
          <span className={`text-sm font-medium ${config.color}`}>{config.label}</span>
        </div>
        
        {/* Phase progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Phase {event.current_phase}/{event.total_phases}
            </span>
            <span className="text-foreground font-medium">
              {PHASE_NAMES[event.current_phase] || 'Unknown'}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
        
        {/* Recent activity log */}
        {logs.length > 0 && (
          <div className="space-y-2">
            <span className="text-xs text-muted-foreground uppercase tracking-wide">Recent Activity</span>
            <ScrollArea className="h-[120px]">
              <div className="space-y-1">
                {logs.slice(-5).reverse().map((log, index) => (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-start gap-2 text-xs"
                  >
                    <span className="text-muted-foreground shrink-0">
                      {new Date(log.created_at).toLocaleTimeString()}
                    </span>
                    <span className="text-foreground">{log.action}</span>
                  </motion.div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
