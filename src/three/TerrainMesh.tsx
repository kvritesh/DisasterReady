import { useMemo } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import type { Region, VisualizationMode } from "../types";
import { buildTerrainGeometry } from "./terrainGeometry";

export function TerrainMesh({
  region,
  mode,
  onSelect,
}: {
  region: Region;
  mode: VisualizationMode;
  onSelect: (point: { x: number; z: number }) => void;
}) {
  const { geometry } = useMemo(() => buildTerrainGeometry(region, mode), [region, mode]);

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSelect({ x: e.point.x, z: e.point.z });
  };

  return (
    <mesh geometry={geometry} onClick={handleClick} receiveShadow castShadow>
      <meshStandardMaterial vertexColors roughness={0.92} metalness={0} flatShading />
    </mesh>
  );
}

export function TerrainBase({ region }: { region: Region }) {
  return (
    <group position={[0, -1.05, 0]}>
      <mesh receiveShadow castShadow>
        <cylinderGeometry args={[13.6, 12.6, 1.9, 10]} />
        <meshStandardMaterial color="#6b4226" roughness={0.95} flatShading />
      </mesh>
      <mesh position={[0, 0.97, 0]}>
        <cylinderGeometry args={[13.62, 13.62, 0.06, 10]} />
        <meshStandardMaterial color={region.thumbnailGradient[0]} roughness={1} flatShading />
      </mesh>
    </group>
  );
}
