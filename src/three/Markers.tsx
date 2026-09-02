import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import type { POI, Region } from "../types";
import { terrainHeightAt, WORLD_SIZE } from "./terrainGeometry";

const POI_RADIUS = WORLD_SIZE / 2 - 3.5;

export function poiWorldPosition(poi: POI, region: Region): [number, number, number] {
  const x = poi.position[0] * POI_RADIUS;
  const z = poi.position[1] * POI_RADIUS;
  const y = terrainHeightAt(x, z, region);
  return [x, y, z];
}

export function POIMarker({
  poi,
  region,
  highlighted,
  onSelect,
}: {
  poi: POI;
  region: Region;
  highlighted: boolean;
  onSelect: (poi: POI) => void;
}) {
  const [x, y, z] = poiWorldPosition(poi, region);
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (ringRef.current && highlighted) {
      const s = 1 + Math.sin(clock.elapsedTime * 3) * 0.12;
      ringRef.current.scale.set(s, s, s);
    }
  });

  const emoji = poi.type === "hospital" ? "🏥" : "🛖";

  return (
    <group position={[x, y, z]}>
      {highlighted && (
        <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[0.55, 0.7, 32]} />
          <meshBasicMaterial color="#e6b463" transparent opacity={0.85} />
        </mesh>
      )}
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.55, 6]} />
        <meshStandardMaterial color="#5c574b" />
      </mesh>
      <Html center distanceFactor={12} position={[0, 0.75, 0]} occlude={false}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelect(poi);
          }}
          className="flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border-2 border-white bg-white text-[18px] shadow-[0_4px_10px_rgba(0,0,0,0.25)] transition-transform hover:scale-110 active:scale-95"
          style={{ boxShadow: highlighted ? "0 0 0 4px rgba(230,180,99,0.55), 0 4px 10px rgba(0,0,0,0.25)" : undefined }}
        >
          {emoji}
        </button>
      </Html>
    </group>
  );
}

export function PlayerMarker({ x, z, region }: { x: number; z: number; region: Region }) {
  const y = terrainHeightAt(x, z, region);
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (ringRef.current) {
      const s = 1 + Math.sin(clock.elapsedTime * 2) * 0.15;
      ringRef.current.scale.set(s, s, s);
      const mat = ringRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.5 + Math.sin(clock.elapsedTime * 2) * 0.2;
    }
  });

  return (
    <group position={[x, y, z]}>
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <ringGeometry args={[0.32, 0.42, 32]} />
        <meshBasicMaterial color="#4f8fc4" transparent opacity={0.6} />
      </mesh>
      <mesh position={[0, 0.22, 0]} castShadow>
        <sphereGeometry args={[0.16, 16, 16]} />
        <meshStandardMaterial color="#4f8fc4" emissive="#2a5c8a" emissiveIntensity={0.4} />
      </mesh>
      <Html center distanceFactor={12} position={[0, 0.62, 0]} occlude={false}>
        <div className="pointer-events-none rounded-full bg-stone-900/85 px-2 py-0.5 text-[10px] font-bold text-cream-50 whitespace-nowrap">
          You are here
        </div>
      </Html>
    </group>
  );
}

export function MissionBeacon({ x, z, region, label }: { x: number; z: number; region: Region; label: string }) {
  const y = terrainHeightAt(x, z, region);
  const groupRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.position.y = y + 0.55 + Math.sin(clock.elapsedTime * 2.2) * 0.12;
    }
    if (ringRef.current) {
      const s = 1 + ((clock.elapsedTime * 1.4) % 1) * 0.9;
      ringRef.current.scale.set(s, s, s);
      const mat = ringRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, 0.8 - ((clock.elapsedTime * 1.4) % 1));
    }
  });

  return (
    <group position={[x, y, z]}>
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <ringGeometry args={[0.4, 0.52, 32]} />
        <meshBasicMaterial color="#d99a3d" transparent opacity={0.8} />
      </mesh>
      <group ref={groupRef} position={[0, 0.55, 0]}>
        <mesh>
          <coneGeometry args={[0.16, 0.32, 4]} />
          <meshStandardMaterial color="#d99a3d" emissive="#a3701f" emissiveIntensity={0.5} />
        </mesh>
      </group>
      <Html center distanceFactor={11} position={[0, 1.15, 0]} occlude={false}>
        <div className="pointer-events-none rounded-full bg-amber-500 px-2.5 py-1 text-[10.5px] font-extrabold uppercase tracking-wide text-white shadow-lg whitespace-nowrap">
          {label}
        </div>
      </Html>
    </group>
  );
}

export function SelectionMarker({ x, z, region }: { x: number; z: number; region: Region }) {
  const y = terrainHeightAt(x, z, region);
  const ringRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (ringRef.current) {
      const t = (clock.elapsedTime * 1.6) % 1;
      ringRef.current.scale.set(1 + t * 1.4, 1 + t * 1.4, 1 + t * 1.4);
      const mat = ringRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.9 - t * 0.9;
    }
  });
  return (
    <group position={[x, y + 0.02, z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.16, 0.24, 24]} />
        <meshBasicMaterial color="#1b1a17" transparent opacity={0.55} />
      </mesh>
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.2, 0.27, 24]} />
        <meshBasicMaterial color="#e6b463" transparent opacity={0.9} />
      </mesh>
    </group>
  );
}
