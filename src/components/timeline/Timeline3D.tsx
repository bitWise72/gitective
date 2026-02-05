import { Suspense, useRef, useState, useCallback } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Grid, Stars, Text, Html } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { motion } from 'framer-motion-3d';
import * as THREE from 'three';
import { Evidence, Branch, getCredibilityColor, Node3D, Line3D } from '@/types/timeline';
import EvidenceNode from './EvidenceNode';
import BranchLine from './BranchLine';


interface Timeline3DProps {
  evidence: Evidence[];
  branches: Branch[];
  selectedEvidenceId: string | null;
  onSelectEvidence: (evidence: Evidence) => void;
  onHoverEvidence: (evidence: Evidence | null) => void;
}

// Convert evidence to 3D nodes
function evidenceToNodes(evidence: Evidence[], branches: Branch[]): Node3D[] {
  const branchMap = new Map(branches.map(b => [b.id, b]));

  return evidence.map((e, index) => {
    const branch = branchMap.get(e.branch_id);
    const branchIndex = branches.findIndex(b => b.id === e.branch_id);

    // Calculate position based on creation time and branch
    const timeOffset = index * 2; // Spread along X axis
    const branchOffset = branchIndex * 4; // Spread branches along Z axis

    return {
      id: e.id,
      position: [
        e.position_x || timeOffset,
        e.position_y || 0,
        branch?.position_z || branchOffset
      ] as [number, number, number],
      color: getCredibilityColor(e.source_credibility),
      scale: 0.5 + (e.source_credibility / 100) * 0.5,
      data: e,
    };
  });
}

// Convert branches to 3D lines
function branchesToLines(evidence: Evidence[], branches: Branch[]): Line3D[] {
  return branches.map(branch => {
    const branchEvidence = evidence
      .filter(e => e.branch_id === branch.id)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    if (branchEvidence.length === 0) {
      return {
        id: branch.id,
        points: [[0, 0, branch.position_z || 0]] as [number, number, number][],
        color: branch.color,
        branchId: branch.id,
      };
    }

    const points: [number, number, number][] = branchEvidence.map((e, index) => [
      e.position_x || index * 2,
      e.position_y || 0,
      branch.position_z || 0
    ]);

    return {
      id: branch.id,
      points,
      color: branch.color,
      branchId: branch.id,
    };
  });
}

// Scene setup component
function SceneSetup() {
  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={1} color="#8b5cf6" />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#06b6d4" />
      <Stars radius={100} depth={50} count={2000} factor={4} saturation={0} fade speed={1} />
    </>
  );
}

// Animated camera controller
function CameraController({ targetPosition }: { targetPosition?: [number, number, number] }) {
  const { camera } = useThree();
  const targetRef = useRef(new THREE.Vector3(0, 0, 0));

  useFrame(() => {
    if (targetPosition) {
      targetRef.current.lerp(new THREE.Vector3(...targetPosition), 0.05);
      camera.lookAt(targetRef.current);
    }
  });

  return null;
}

// Loading fallback
function LoadingFallback() {
  return (
    <Html center>
      <div className="text-forge-purple text-lg font-mono animate-pulse">
        Loading Timeline...
      </div>
    </Html>
  );
}

// Empty state
function EmptyState() {
  return (
    <Text
      position={[0, 0, 0]}
      fontSize={0.5}
      color="#8b5cf6"
      anchorX="center"
      anchorY="middle"
    >
      Start an investigation to see the timeline
    </Text>
  );
}

export default function Timeline3D({
  evidence,
  branches,
  selectedEvidenceId,
  onSelectEvidence,
  onHoverEvidence,
}: Timeline3DProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const nodes = evidenceToNodes(evidence, branches);
  const lines = branchesToLines(evidence, branches);

  const handleHover = useCallback((evidence: Evidence | null) => {
    setHoveredId(evidence?.id || null);
    onHoverEvidence(evidence);
  }, [onHoverEvidence]);

  const selectedNode = nodes.find(n => n.id === selectedEvidenceId);

  return (
    <div className="w-full h-full canvas-container rounded-lg overflow-hidden">
      <Canvas shadows>
        <Suspense fallback={<LoadingFallback />}>
          <PerspectiveCamera makeDefault position={[15, 10, 15]} fov={60} />
          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minDistance={5}
            maxDistance={50}
            autoRotate={evidence.length === 0}
            autoRotateSpeed={0.5}
          />

          <SceneSetup />
          <CameraController targetPosition={selectedNode?.position} />

          {/* Grid floor */}
          <Grid
            position={[0, -2, 0]}
            args={[50, 50]}
            cellSize={1}
            cellThickness={0.5}
            cellColor="#1e1b4b"
            sectionSize={5}
            sectionThickness={1}
            sectionColor="#4c1d95"
            fadeDistance={50}
            fadeStrength={1}
            followCamera={false}
            infiniteGrid={true}
          />

          {/* Branch lines */}
          {lines.map(line => (
            <BranchLine key={line.id} line={line} />
          ))}

          {/* Evidence nodes */}
          {nodes.length > 0 ? (
            nodes.map(node => (
              <EvidenceNode
                key={node.id}
                node={node}
                isSelected={node.id === selectedEvidenceId}
                isHovered={node.id === hoveredId}
                onClick={() => onSelectEvidence(node.data)}
                onHover={handleHover}
              />
            ))
          ) : (
            <EmptyState />
          )}

          {/* Branch labels */}
          {branches.map((branch, index) => (
            <Text
              key={branch.id}
              position={[-5, 0, branch.position_z || index * 4]}
              fontSize={0.4}
              color={branch.color}
              anchorX="right"
              anchorY="middle"
            >
              {branch.name}
            </Text>
          ))}

          <EffectComposer>
            <Bloom
              luminanceThreshold={0.2}
              luminanceSmoothing={0.9}
              intensity={1.5}
              radius={0.8}
            />
            <Vignette offset={0.3} darkness={0.5} />
          </EffectComposer>
        </Suspense>
      </Canvas>
    </div>
  );
}
