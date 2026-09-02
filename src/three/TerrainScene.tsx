import { useFrame } from "@react-three/fiber";
import { OrbitControls, Stats } from "@react-three/drei";
import type { RefObject } from "react";
import type { POI, Region, VisualizationMode } from "../types";
import { TerrainBase, TerrainMesh } from "./TerrainMesh";
import { SkyDome } from "./SkyDome";
import { Trail, WorldProps } from "./Props";
import { MissionBeacon, PlayerMarker, POIMarker, SelectionMarker, poiWorldPosition } from "./Markers";

function CompassDriver({
  controlsRef,
  compassRef,
}: {
  controlsRef: RefObject<any>;
  compassRef: RefObject<HTMLDivElement | null>;
}) {
  useFrame(() => {
    const controls = controlsRef.current;
    const dial = compassRef.current;
    if (!controls || !dial) return;
    const angle = controls.getAzimuthalAngle?.() ?? 0;
    dial.style.transform = `rotate(${-angle}rad)`;
  });
  return null;
}

export function TerrainScene({
  region,
  mode,
  pois,
  selectedPoint,
  onSelectPoint,
  onSelectPoi,
  missionTarget,
  highlightedPoiId,
  debugTerrain,
  showPerformance,
  controlsRef,
  compassRef,
}: {
  region: Region;
  mode: VisualizationMode;
  pois: POI[];
  selectedPoint: { x: number; z: number } | null;
  onSelectPoint: (point: { x: number; z: number }) => void;
  onSelectPoi: (poi: POI) => void;
  missionTarget: { x: number; z: number; label: string } | null;
  highlightedPoiId: string | null;
  debugTerrain: boolean;
  showPerformance: boolean;
  controlsRef: RefObject<any>;
  compassRef: RefObject<HTMLDivElement | null>;
}) {
  return (
    <>
      <color attach="background" args={["#eef2e4"]} />
      <fogExp2 attach="fog" args={["#eef2e4", 0.028]} />

      <SkyDome />

      <hemisphereLight args={["#d5eaf7", "#c9b896", 0.45]} />
      <ambientLight intensity={0.3} />
      <directionalLight
        position={[10, 14, 6]}
        intensity={1.3}
        color="#fff4de"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-16}
        shadow-camera-right={16}
        shadow-camera-top={16}
        shadow-camera-bottom={-16}
        shadow-camera-far={40}
      />
      <directionalLight position={[-8, 6, -8]} intensity={0.18} color="#8fb0c9" />

      <TerrainBase region={region} />
      <TerrainMesh region={region} mode={mode} onSelect={onSelectPoint} />

      {debugTerrain && (
        <group>
          <gridHelper args={[26, 26, "#d65c4d", "#94897a"]} position={[0, 0.02, 0]} />
          <axesHelper args={[4]} />
        </group>
      )}

      <Trail region={region} from={[-5, -6]} to={[4.2, 6]} seed={region.terrainSeed} color="#c9b78c" width={0.14} />
      <Trail region={region} from={[-6.8, 1.7]} to={[6, -2.5]} seed={region.terrainSeed + 2.1} color="#b3a68d" width={0.1} />

      <WorldProps region={region} />

      {pois.map((poi) => (
        <POIMarker key={poi.id} poi={poi} region={region} highlighted={highlightedPoiId === poi.id} onSelect={onSelectPoi} />
      ))}

      <PlayerMarker x={-2} z={3.4} region={region} />

      {selectedPoint && <SelectionMarker x={selectedPoint.x} z={selectedPoint.z} region={region} />}

      {missionTarget && (
        <MissionBeacon x={missionTarget.x} z={missionTarget.z} region={region} label={missionTarget.label} />
      )}

      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={5}
        maxDistance={21}
        maxPolarAngle={Math.PI / 2.05}
        minPolarAngle={0.35}
        target={[0, 0.6, 0]}
      />
      <CompassDriver controlsRef={controlsRef} compassRef={compassRef} />
      {showPerformance && <Stats className="!absolute !bottom-16 !left-4 !right-auto !top-auto sm:!bottom-4" />}
    </>
  );
}

export { poiWorldPosition };
