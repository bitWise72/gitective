import { useMemo } from 'react';
import { Slider } from '@/components/ui/slider';
import { Clock, Calendar } from 'lucide-react';
import { Evidence } from '@/types/timeline';

interface TimeSliderProps {
    evidence: Evidence[];
    currentTime: Date;
    onTimeChange: (date: Date) => void;
}

export default function TimeSlider({ evidence, currentTime, onTimeChange }: TimeSliderProps) {
    const { minDate, maxDate } = useMemo(() => {
        if (evidence.length === 0) {
            const now = new Date();
            return { minDate: now, maxDate: now };
        }

        const dates = evidence.map(e => new Date(e.created_at).getTime());
        return {
            minDate: new Date(Math.min(...dates)),
            maxDate: new Date(Math.max(...dates)),
        };
    }, [evidence]);

    const range = maxDate.getTime() - minDate.getTime();
    const currentValue = range > 0
        ? ((currentTime.getTime() - minDate.getTime()) / range) * 100
        : 100;

    const handleSliderChange = (value: number[]) => {
        const newTime = new Date(minDate.getTime() + (value[0] / 100) * range);
        onTimeChange(newTime);
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const visibleCount = evidence.filter(e => new Date(e.created_at) <= currentTime).length;

    if (evidence.length === 0) {
        return null;
    }

    return (
        <div className="absolute bottom-4 left-4 right-4 z-10">
            <div className="bg-card/90 backdrop-blur-md border border-border rounded-lg p-4 shadow-xl">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <Clock className="w-4 h-4 text-forge-purple" />
                        <span>Time Travel</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{visibleCount} / {evidence.length} evidence visible</span>
                    </div>
                </div>

                <Slider
                    value={[currentValue]}
                    onValueChange={handleSliderChange}
                    min={0}
                    max={100}
                    step={1}
                    className="mb-2"
                />

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{formatDate(minDate)}</span>
                    </div>
                    <div className="px-2 py-0.5 bg-forge-purple/20 text-forge-purple rounded text-xs font-medium">
                        {formatDate(currentTime)}
                    </div>
                    <div className="flex items-center gap-1">
                        <span>{formatDate(maxDate)}</span>
                        <Calendar className="w-3 h-3" />
                    </div>
                </div>
            </div>
        </div>
    );
}
