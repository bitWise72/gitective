import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Line3D } from '@/types/timeline';
import { Line } from '@react-three/drei';

interface BranchLineProps {
  line: Line3D;
}

export default function BranchLine({ line }: BranchLineProps) {
  const progressRef = useRef(0);
  
  // Create points for the line
  const points = useMemo(() => {
    if (line.points.length < 2) {
      // Create a short horizontal line if only one point
      const point = line.points[0] || [0, 0, 0];
      return [
        [point[0] - 1, point[1], point[2]] as [number, number, number],
        [point[0] + 1, point[1], point[2]] as [number, number, number],
      ];
    }
    return line.points;
  }, [line.points]);
  
  return (
    <group>
      {/* Main line using drei's Line component */}
      <Line
        points={points}
        color={line.color}
        lineWidth={2}
        opacity={0.8}
        transparent
      />
      
      {/* Glow effect line */}
      <Line
        points={points}
        color={line.color}
        lineWidth={4}
        opacity={0.2}
        transparent
      />
      
      {/* Connection points */}
      {line.points.map((point, index) => (
        <mesh key={index} position={point}>
          <sphereGeometry args={[0.1, 8, 8]} />
          <meshBasicMaterial color={line.color} transparent opacity={0.5} />
        </mesh>
      ))}
    </group>
  );
}
