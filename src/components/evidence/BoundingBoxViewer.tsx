import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { ZoomIn, ZoomOut, Move } from 'lucide-react';
import { BoundingBox, DetectedObject } from '@/types/timeline';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface BoundingBoxViewerProps {
  imageUrl: string;
  boundingBoxes: BoundingBox[];
  detectedObjects: DetectedObject[];
}

export default function BoundingBoxViewer({
  imageUrl,
  boundingBoxes,
  detectedObjects,
}: BoundingBoxViewerProps) {
  const [zoom, setZoom] = useState(1);
  const [selectedBox, setSelectedBox] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Combine bounding boxes from both sources
  const allBoxes: BoundingBox[] = [
    ...boundingBoxes,
    ...detectedObjects.map((obj, i) => ({
      label: obj.label,
      box: obj.bounding_box,
      color: '#22c55e', // Green for Gemini detections
      type: 'detection' as const,
    })),
  ];
  
  const handleZoomIn = () => setZoom(z => Math.min(z + 0.25, 3));
  const handleZoomOut = () => setZoom(z => Math.max(z - 0.25, 0.5));
  const handleReset = () => setZoom(1);
  
  // Convert normalized coordinates [y_min, x_min, y_max, x_max] to CSS
  const boxToStyle = (box: [number, number, number, number]) => ({
    top: `${box[0] * 100}%`,
    left: `${box[1] * 100}%`,
    width: `${(box[3] - box[1]) * 100}%`,
    height: `${(box[2] - box[0]) * 100}%`,
  });
  
  return (
    <div className="space-y-2">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Visual Evidence</span>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleZoomOut}>
            <ZoomOut className="w-3 h-3" />
          </Button>
          <span className="text-xs text-muted-foreground w-12 text-center">{Math.round(zoom * 100)}%</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleZoomIn}>
            <ZoomIn className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleReset}>
            <Move className="w-3 h-3" />
          </Button>
        </div>
      </div>
      
      {/* Image container */}
      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-lg bg-secondary/50 aspect-video"
      >
        <motion.div
          className="relative w-full h-full"
          style={{ scale: zoom }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          {/* Image */}
          <img
            src={imageUrl}
            alt="Evidence"
            className="w-full h-full object-contain"
            draggable={false}
          />
          
          {/* Bounding boxes overlay */}
          {allBoxes.map((box, index) => (
            <Tooltip key={index}>
              <TooltipTrigger asChild>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className={`absolute border-2 cursor-pointer transition-all ${
                    selectedBox === index ? 'ring-2 ring-white/50' : ''
                  }`}
                  style={{
                    ...boxToStyle(box.box),
                    borderColor: box.color,
                    backgroundColor: `${box.color}15`,
                  }}
                  onClick={() => setSelectedBox(selectedBox === index ? null : index)}
                >
                  {/* Label */}
                  <div
                    className="absolute -top-5 left-0 px-1.5 py-0.5 text-xs font-medium rounded-t"
                    style={{
                      backgroundColor: box.color,
                      color: '#fff',
                    }}
                  >
                    {box.label}
                  </div>
                  
                  {/* Corner markers */}
                  <div className="absolute -top-1 -left-1 w-2 h-2 border-t-2 border-l-2" style={{ borderColor: box.color }} />
                  <div className="absolute -top-1 -right-1 w-2 h-2 border-t-2 border-r-2" style={{ borderColor: box.color }} />
                  <div className="absolute -bottom-1 -left-1 w-2 h-2 border-b-2 border-l-2" style={{ borderColor: box.color }} />
                  <div className="absolute -bottom-1 -right-1 w-2 h-2 border-b-2 border-r-2" style={{ borderColor: box.color }} />
                </motion.div>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="font-medium">{box.label}</p>
                <p className="text-xs text-muted-foreground capitalize">{box.type}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </motion.div>
      </div>
      
      {/* Legend */}
      {allBoxes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {allBoxes.map((box, i) => (
            <button
              key={i}
              onClick={() => setSelectedBox(selectedBox === i ? null : i)}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-all ${
                selectedBox === i ? 'ring-1 ring-white/30' : ''
              }`}
              style={{
                backgroundColor: `${box.color}20`,
                color: box.color,
              }}
            >
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: box.color }} />
              {box.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
