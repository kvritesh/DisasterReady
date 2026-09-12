import { useEffect, useMemo, useRef } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import type { Region, VisualizationMode } from "../types";
import { buildTerrainGeometry } from "./terrainGeometry";

export function TerrainMesh({
  region,
  mode,
  onSelect,
  contourLines = false,
}: {
  region: Region;
  mode: VisualizationMode;
  onSelect: (point: { x: number; z: number }) => void;
  /**
   * Ultra-only decorative overlay: sparse, thin, terrain-following contour
   * lines rendered directly in the material's fragment shader from this
   * vertex's own object-space (== world-space, this mesh has no transform)
   * height. Pure shader math over the existing mesh — no extra geometry, no
   * new dependency — and it never reads or affects elevationM/slopeDeg/any
   * other real value, only how this same surface is painted.
   */
  contourLines?: boolean;
}) {
  const { geometry } = useMemo(() => buildTerrainGeometry(region, mode), [region, mode]);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);

  useEffect(() => {
    const material = materialRef.current;
    if (!material) return;

    if (contourLines) {
      material.customProgramCacheKey = () => "dr-contour-on";
      material.onBeforeCompile = (shader) => {
        shader.vertexShader = shader.vertexShader
          .replace("#include <common>", "#include <common>\nvarying float vDrTerrainY;")
          .replace("#include <begin_vertex>", "#include <begin_vertex>\nvDrTerrainY = position.y;");
        shader.fragmentShader = shader.fragmentShader
          .replace("#include <common>", "#include <common>\nvarying float vDrTerrainY;")
          .replace(
            "#include <dithering_fragment>",
            `
            {
              float spacing = 0.85;
              float lineHalfWidth = 0.012;
              float m = mod(vDrTerrainY, spacing);
              float d = min(m, spacing - m);
              float line = 1.0 - smoothstep(0.0, lineHalfWidth, d);
              gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.06, 0.14, 0.09), line * 0.4);
            }
            #include <dithering_fragment>
            `
          );
      };
    } else {
      material.customProgramCacheKey = () => "dr-contour-off";
      material.onBeforeCompile = () => {};
    }
    material.needsUpdate = true;
  }, [contourLines, geometry]);

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSelect({ x: e.point.x, z: e.point.z });
  };

  return (
    <mesh geometry={geometry} onClick={handleClick} receiveShadow castShadow>
      <meshStandardMaterial ref={materialRef} vertexColors roughness={0.92} metalness={0} flatShading />
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
