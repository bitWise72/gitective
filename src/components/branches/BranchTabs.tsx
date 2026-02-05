import { motion } from 'framer-motion';
import { GitBranch, Plus, MoreHorizontal, Percent } from 'lucide-react';
import { Branch } from '@/types/timeline';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface BranchTabsProps {
  branches: Branch[];
  activeBranchId: string | null;
  onSelectBranch: (branchId: string) => void;
  onCreateBranch: () => void;
  onMergeBranches: () => void;
}

export default function BranchTabs({
  branches,
  activeBranchId,
  onSelectBranch,
  onCreateBranch,
  onMergeBranches,
}: BranchTabsProps) {
  return (
    <div className="flex items-center gap-2 p-2 border-b border-border bg-card/50 backdrop-blur-sm">
      <GitBranch className="w-4 h-4 text-muted-foreground ml-2" />

      <Tabs value={activeBranchId || undefined} className="flex-1">
        <TabsList className="bg-secondary/50 h-auto p-1 gap-1">
          {branches.map(branch => (
            <TabsTrigger
              key={branch.id}
              value={branch.id}
              onClick={() => onSelectBranch(branch.id)}
              className="relative data-[state=active]:bg-background px-3 py-1.5 gap-2"
            >
              {/* Branch color indicator */}
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: branch.color }}
              />

              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="max-w-[120px] truncate">{branch.name}</span>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>{branch.name}</p>
                </TooltipContent>
              </Tooltip>

              {/* Confidence score */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-0.5 text-xs text-muted-foreground">
                    <Percent className="w-3 h-3" />
                    <span>{Math.round(branch.confidence_score)}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Confidence: {branch.confidence_score.toFixed(1)}%</p>
                </TooltipContent>
              </Tooltip>

              {/* Main branch indicator */}
              {branch.is_main && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-primary" />
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onCreateBranch}>
              <Plus className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Create new narrative branch</TooltipContent>
        </Tooltip>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onMergeBranches}>
              Attempt Merge...
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// Confidence bar component for use elsewhere
export function ConfidenceBar({ score, color }: { score: number; color: string }) {
  const level = score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low';

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className={`h-full rounded-full ${level === 'high' ? 'confidence-high' :
              level === 'medium' ? 'confidence-medium' :
                'confidence-low'
            }`}
          style={{ backgroundColor: color }}
        />
      </div>
      <span className="text-xs text-muted-foreground w-8">{Math.round(score)}%</span>
    </div>
  );
}
