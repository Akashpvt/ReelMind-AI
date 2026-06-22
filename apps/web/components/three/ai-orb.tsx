"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { Group, Points, Mesh } from "three";
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color } from "three";

function OrbCore() {
  const groupRef = useRef<Group>(null);
  const meshRef = useRef<Mesh>(null);
  const ringRef = useRef<Mesh>(null);

  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.7) * 0.12;
      groupRef.current.rotation.y += delta * 0.06;
    }
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.28;
      meshRef.current.rotation.x += delta * 0.12;
    }
    if (ringRef.current) {
      ringRef.current.rotation.z -= delta * 0.36;
      ringRef.current.rotation.x += delta * 0.16;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[1.45, 12]} />
        <meshStandardMaterial
          color="#8B5CF6"
          emissive="#5B21B6"
          emissiveIntensity={1.6}
          roughness={0.18}
          metalness={0.7}
          transparent
          opacity={0.72}
          wireframe
        />
      </mesh>
      <mesh ref={ringRef} rotation={[1.1, 0.3, 0.2]}>
        <torusGeometry args={[2.05, 0.018, 16, 160]} />
        <meshBasicMaterial color="#38BDF8" transparent opacity={0.76} />
      </mesh>
      <mesh rotation={[0.2, 1.1, 0.7]}>
        <torusGeometry args={[1.72, 0.012, 16, 160]} />
        <meshBasicMaterial color="#A855F7" transparent opacity={0.68} />
      </mesh>
    </group>
  );
}

function ParticleRing() {
  const pointsRef = useRef<Points>(null);
  const geometry = useMemo(() => {
    const positions: number[] = [];
    for (let i = 0; i < 220; i += 1) {
      const angle = (i / 220) * Math.PI * 2;
      const ripple = Math.sin(i * 2.17) * 0.045;
      const radius = 2.28 + ripple;
      positions.push(Math.cos(angle) * radius, Math.sin(i * 0.71) * 0.12, Math.sin(angle) * radius);
    }

    const bufferGeometry = new BufferGeometry();
    bufferGeometry.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
    return bufferGeometry;
  }, []);

  useFrame((state, delta) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y += delta * 0.16;
      pointsRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.35) * 0.08;
    }
  });

  return (
    <points ref={pointsRef} geometry={geometry} rotation={[0.42, 0.15, 0]}>
      <pointsMaterial
        color={new Color("#A5F3FC")}
        size={0.026}
        transparent
        opacity={0.7}
        blending={AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

function ParticleField() {
  const pointsRef = useRef<Points>(null);
  const geometry = useMemo(() => {
    const positions: number[] = [];
    for (let i = 0; i < 480; i += 1) {
      const radius = 2.2 + ((i * 37) % 100) / 35;
      const theta = i * 1.618;
      const phi = Math.acos(2 * ((i % 97) / 97) - 1);
      positions.push(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.sin(phi) * Math.sin(theta),
        radius * Math.cos(phi),
      );
    }

    const bufferGeometry = new BufferGeometry();
    bufferGeometry.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
    return bufferGeometry;
  }, []);

  useFrame((_, delta) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y += delta * 0.045;
      pointsRef.current.rotation.x -= delta * 0.018;
    }
  });

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
        color={new Color("#67E8F9")}
        size={0.018}
        transparent
        opacity={0.72}
        blending={AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

export function AiOrb() {
  return (
    <Canvas camera={{ position: [0, 0, 6], fov: 48 }} dpr={[1, 1.7]}>
      <ambientLight intensity={0.65} />
      <pointLight position={[3, 3, 4]} intensity={16} color="#A855F7" />
      <pointLight position={[-4, -2, 3]} intensity={10} color="#38BDF8" />
      <OrbCore />
      <ParticleRing />
      <ParticleField />
    </Canvas>
  );
}
