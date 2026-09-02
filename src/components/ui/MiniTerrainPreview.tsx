import { mulberry32 } from "../../three/terrainMath";

/**
 * Lightweight stylized SVG "diorama" preview used on cards where a full
 * Three.js scene would be overkill (region cards, selectors, thumbnails).
 */
export function MiniTerrainPreview({
  seed,
  gradient,
  className,
  showMarker = false,
}: {
  seed: number;
  gradient: [string, string];
  className?: string;
  showMarker?: boolean;
}) {
  const rand = mulberry32(Math.floor(seed * 1000));
  const ridgePoints = (base: number, amp: number) => {
    const pts: [number, number][] = [[0, 100]];
    for (let i = 0; i <= 8; i++) {
      const x = (i / 8) * 100;
      const y = base - Math.sin(i * 1.3 + seed) * amp - rand() * amp * 0.6;
      pts.push([x, y]);
    }
    pts.push([100, 100]);
    return pts.map((p) => p.join(",")).join(" ");
  };

  const trees = Array.from({ length: 6 }, () => ({
    x: 8 + rand() * 84,
    y: 55 + rand() * 35,
    s: 4 + rand() * 3,
  }));

  return (
    <div className={className}>
      <svg viewBox="0 0 100 70" className="h-full w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id={`sky-${seed}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#cfe6f2" />
            <stop offset="100%" stopColor="#e9f2e2" />
          </linearGradient>
          <linearGradient id={`ridge-back-${seed}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={gradient[0]} stopOpacity={0.55} />
            <stop offset="100%" stopColor={gradient[1]} stopOpacity={0.55} />
          </linearGradient>
          <linearGradient id={`ridge-front-${seed}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={gradient[0]} />
            <stop offset="100%" stopColor={gradient[1]} />
          </linearGradient>
        </defs>
        <rect width="100" height="70" fill={`url(#sky-${seed})`} />
        <polygon points={ridgePoints(38, 12)} fill={`url(#ridge-back-${seed})`} transform="translate(0,-4) scale(1,0.75)" />
        <polygon points={ridgePoints(46, 16)} fill={`url(#ridge-front-${seed})`} />
        {trees.map((t, i) => (
          <g key={i} transform={`translate(${t.x} ${t.y})`}>
            <polygon points={`0,-${t.s * 1.6} ${t.s},0 -${t.s},0`} fill="#2e5339" opacity={0.85} />
            <rect x={-0.6} y={0} width={1.2} height={2} fill="#5c4433" />
          </g>
        ))}
        {showMarker && (
          <g transform="translate(50 40)">
            <circle r="3.2" fill="#d65c4d" stroke="white" strokeWidth="1" />
          </g>
        )}
      </svg>
    </div>
  );
}
