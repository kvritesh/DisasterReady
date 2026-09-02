import { useMemo } from "react";
import * as THREE from "three";

export function SkyDome() {
  const geometry = useMemo(() => {
    const geo = new THREE.SphereGeometry(60, 24, 16);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const colors = new Float32Array(pos.count * 3);
    const top = new THREE.Color("#bfe0f0");
    const horizon = new THREE.Color("#f3ecd8");
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i) / 60; // -1..1
      const t = Math.max(0, Math.min(1, (y + 0.15) / 0.9));
      c.copy(horizon).lerp(top, t);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return geo;
  }, []);

  return (
    <mesh geometry={geometry}>
      <meshBasicMaterial vertexColors side={THREE.BackSide} fog={false} />
    </mesh>
  );
}
