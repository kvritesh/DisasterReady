import { useMemo } from "react";
import * as THREE from "three";
import type { Region } from "../types";
import { generatePropPlacements, generateTrail } from "./terrainProps";

const TREE_COLORS = ["#3b6b47", "#4f8759", "#2e5339"];
const ROOF_COLORS = ["#b6483a", "#c98a45", "#8a6a4f"];

export function Tree({ x, y, z, scale, rotation, variant }: { x: number; y: number; z: number; scale: number; rotation: number; variant: number }) {
  const color = TREE_COLORS[variant % TREE_COLORS.length];
  return (
    <group position={[x, y, z]} rotation={[0, rotation, 0]} scale={scale}>
      <mesh position={[0, 0.22, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.06, 0.09, 0.44, 5]} />
        <meshStandardMaterial color="#5c4433" roughness={0.9} flatShading />
      </mesh>
      <mesh position={[0, 0.62, 0]} castShadow receiveShadow>
        <coneGeometry args={[0.42, 0.68, 6]} />
        <meshStandardMaterial color={color} roughness={0.85} flatShading />
      </mesh>
      <mesh position={[0, 0.98, 0]} castShadow receiveShadow>
        <coneGeometry args={[0.3, 0.5, 6]} />
        <meshStandardMaterial color={color} roughness={0.85} flatShading />
      </mesh>
    </group>
  );
}

export function Building({ x, y, z, scale, rotation, variant }: { x: number; y: number; z: number; scale: number; rotation: number; variant: number }) {
  const roof = ROOF_COLORS[variant % ROOF_COLORS.length];
  return (
    <group position={[x, y, z]} rotation={[0, rotation, 0]} scale={scale}>
      <mesh position={[0, 0.22, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.62, 0.44, 0.5]} />
        <meshStandardMaterial color="#f0e4c8" roughness={0.85} flatShading />
      </mesh>
      <mesh position={[0, 0.53, 0]} rotation={[0, Math.PI / 4, 0]} castShadow receiveShadow>
        <coneGeometry args={[0.52, 0.34, 4]} />
        <meshStandardMaterial color={roof} roughness={0.7} flatShading />
      </mesh>
    </group>
  );
}

export function Rock({ x, y, z, scale, rotation }: { x: number; y: number; z: number; scale: number; rotation: number }) {
  return (
    <mesh position={[x, y + 0.08 * scale, z]} rotation={[rotation * 0.4, rotation, rotation * 0.2]} scale={scale} castShadow receiveShadow>
      <dodecahedronGeometry args={[0.22, 0]} />
      <meshStandardMaterial color="#8f8877" roughness={0.95} flatShading />
    </mesh>
  );
}

export function WorldProps({ region }: { region: Region }) {
  const props = useMemo(() => generatePropPlacements(region), [region]);

  return (
    <group>
      {props.trees.map((t, i) => (
        <Tree key={`tree-${i}`} x={t.x} y={t.y} z={t.z} scale={t.scale} rotation={t.rotation} variant={t.variant} />
      ))}
      {props.buildings.map((b, i) => (
        <Building key={`bldg-${i}`} x={b.x} y={b.y} z={b.z} scale={b.scale} rotation={b.rotation} variant={b.variant} />
      ))}
      {props.rocks.map((r, i) => (
        <Rock key={`rock-${i}`} x={r.x} y={r.y} z={r.z} scale={r.scale} rotation={r.rotation} />
      ))}
    </group>
  );
}

export function Trail({
  region,
  from,
  to,
  seed,
  color = "#c9b78c",
  width = 0.14,
}: {
  region: Region;
  from: [number, number];
  to: [number, number];
  seed: number;
  color?: string;
  width?: number;
}) {
  const geometry = useMemo(() => {
    const points = generateTrail(region, from, to, seed);
    const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(p.x, p.y, p.z)));
    return new THREE.TubeGeometry(curve, 40, width, 5, false);
  }, [region, from, to, seed, width]);

  return (
    <mesh geometry={geometry} receiveShadow>
      <meshStandardMaterial color={color} roughness={0.95} />
    </mesh>
  );
}
