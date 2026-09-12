/**
 * Decorative topographic/contour-line texture used behind Ultra-mode surfaces
 * (currently: the Ultra sidebar). Pure inline SVG — no raster image, no new
 * dependency — tiled via <pattern> so it costs one small DOM node regardless
 * of the surface size. Intentionally low-opacity/low-contrast and marked
 * aria-hidden + pointer-events-none: it must never compete with nav text for
 * attention or intercept clicks.
 */
export function TopographicPattern({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      preserveAspectRatio="none"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
    >
      <defs>
        <pattern id="dr-topo" width="160" height="160" patternUnits="userSpaceOnUse">
          <path
            d="M -20 40 Q 20 10, 60 40 T 140 40 T 220 40"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
          />
          <path
            d="M -20 80 Q 20 55, 60 80 T 140 80 T 220 80"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
          />
          <path
            d="M -20 120 Q 20 95, 60 120 T 140 120 T 220 120"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
          />
          <path
            d="M -20 0 Q 20 -25, 60 0 T 140 0 T 220 0"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#dr-topo)" />
    </svg>
  );
}
