import { useRef, useState } from 'react';
import { useFrame, ThreeElements } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { motion } from 'framer-motion-3d';
import * as THREE from 'three';
import { Node3D, Evidence, getCredibilityLevel } from '@/types/timeline';

interface EvidenceNodeProps {
  node: Node3D;
  isSelected: boolean;
  isHovered: boolean;
  onClick: () => void;
  onHover: (evidence: Evidence | null) => void;
}

export default function EvidenceNode({
  node,
  isSelected,
  isHovered,
  onClick,
  onHover,
}: EvidenceNodeProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const [hoverLocal, setHoverLocal] = useState(false);
  
  const credibilityLevel = getCredibilityLevel(node.data.source_credibility);
  
  // Animate rotation and pulse
  useFrame((state) => {
    if (meshRef.current) {
      // Gentle rotation
      meshRef.current.rotation.y += 0.005;
      
      // Pulse effect when selected or hovered
      if (isSelected || isHovered || hoverLocal) {
        const pulse = Math.sin(state.clock.elapsedTime * 3) * 0.1;
        meshRef.current.scale.setScalar(node.scale * (1.2 + pulse));
      } else {
        meshRef.current.scale.setScalar(node.scale);
      }
    }
    
    // Glow effect
    if (glowRef.current) {
      const glowIntensity = isSelected || isHovered || hoverLocal ? 0.6 : 0.3;
      const pulse = Math.sin(state.clock.elapsedTime * 2) * 0.1;
      glowRef.current.scale.setScalar(node.scale * (1.5 + pulse));
      (glowRef.current.material as THREE.MeshBasicMaterial).opacity = glowIntensity + pulse * 0.2;
    }
  });
  
  const handlePointerOver = () => {
    setHoverLocal(true);
    onHover(node.data);
    document.body.style.cursor = 'pointer';
  };
  
  const handlePointerOut = () => {
    setHoverLocal(false);
    onHover(null);
    document.body.style.cursor = 'auto';
  };
  
  return (
    <group position={node.position}>
      {/* Outer glow */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial
          color={node.color}
          transparent
          opacity={0.3}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      
      {/* Main sphere */}
      <mesh
        ref={meshRef}
        onClick={onClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial
          color={node.color}
          emissive={node.color}
          emissiveIntensity={isSelected || isHovered ? 0.5 : 0.2}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>
      
      {/* Selection ring */}
      {isSelected && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[node.scale * 1.3, node.scale * 1.5, 32]} />
          <meshBasicMaterial
            color={node.color}
            transparent
            opacity={0.8}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
      
      {/* Evidence type indicator */}
      {node.data.evidence_type === 'image' && (
        <mesh position={[0, node.scale * 1.5, 0]}>
          <boxGeometry args={[0.2, 0.2, 0.2]} />
          <meshStandardMaterial color="#06b6d4" emissive="#06b6d4" emissiveIntensity={0.5} />
        </mesh>
      )}
      
      {/* Hover tooltip */}
      {(hoverLocal || isHovered) && (
        <Html
          position={[0, node.scale * 2, 0]}
          center
          distanceFactor={10}
          style={{ pointerEvents: 'none' }}
        >
          <div className="bg-card/95 backdrop-blur-sm border border-border rounded-lg px-3 py-2 min-w-[200px] max-w-[300px] shadow-xl">
            <h4 className="font-semibold text-foreground text-sm truncate">{node.data.title}</h4>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs px-1.5 py-0.5 rounded ${
                credibilityLevel === 'high' ? 'bg-credibility-high/20 text-credibility-high' :
                credibilityLevel === 'medium' ? 'bg-credibility-medium/20 text-credibility-medium' :
                'bg-credibility-low/20 text-credibility-low'
              }`}>
                {node.data.source_credibility}% credible
              </span>
              <span className="text-xs text-muted-foreground capitalize">{node.data.evidence_type}</span>
            </div>
            {node.data.content && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{node.data.content}</p>
            )}
          </div>
        </Html>
      )}
    </group>
  );
}
