/**
 * WatermarkedImage — wraps an <img> with a tiled, semi-transparent watermark
 * (logo + "Creative Caricature Club™" brand text) loaded from admin settings.
 *
 * Admin can control via `admin_site_settings.watermark`:
 *  - enabled: master on/off switch
 *  - brandText: brand label rendered in the diagonal repeat
 *  - color: text color (hex)
 *  - opacity: 0-1 transparency
 *  - logoUrl: optional small logo glyph rendered before the text
 *  - lockControls: when true, blocks right-click, drag, long-press save
 *
 * Only `hideWatermark` overrides at the call site (admin contexts that need
 * a clean download). Public visitors cannot remove the overlay — it is rendered
 * with `pointer-events:none` ABOVE a pointer-events-none <img>, so it cannot
 * be inspected away without DOM manipulation.
 */
import { CSSProperties, useEffect } from "react";
import { useSiteSetting } from "@/hooks/useSiteSetting";

type WatermarkSettings = {
  enabled?: boolean;
  brandText?: string;
  color?: string;
  opacity?: number;
  logoUrl?: string;
  lockControls?: boolean;
};

type Props = {
  src: string;
  alt?: string;
  className?: string;
  imgClassName?: string;
  style?: CSSProperties;
  hideWatermark?: boolean;
  onClick?: () => void;
  loading?: "lazy" | "eager";
  draggable?: boolean;
  /** Override brand text for this single instance. */
  brandText?: string;
};

const DEFAULTS: Required<WatermarkSettings> = {
  enabled: true,
  brandText: "Creative Caricature Club™",
  color: "#ffffff",
  opacity: 0.22,
  logoUrl: "/logo.png",
  lockControls: true,
};

const hexToRgb = (hex: string) => {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const num = parseInt(full || "ffffff", 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
};

const WatermarkedImage = ({
  src,
  alt = "",
  className = "",
  imgClassName = "",
  style,
  hideWatermark = false,
  onClick,
  loading = "lazy",
  draggable,
  brandText,
}: Props) => {
  const settings = useSiteSetting<WatermarkSettings>("watermark", DEFAULTS);
  const merged = { ...DEFAULTS, ...settings };
  const text = brandText || merged.brandText;
  const { r, g, b } = hexToRgb(merged.color);

  // Block right-click globally on watermarked images at mount (one listener)
  useEffect(() => {
    if (!merged.lockControls) return;
    const block = (e: Event) => {
      const t = e.target as HTMLElement;
      if (t?.closest?.("[data-watermarked]")) e.preventDefault();
    };
    document.addEventListener("contextmenu", block);
    document.addEventListener("dragstart", block);
    return () => {
      document.removeEventListener("contextmenu", block);
      document.removeEventListener("dragstart", block);
    };
  }, [merged.lockControls]);

  const showWatermark = merged.enabled && !hideWatermark;
  const lock = merged.lockControls && !hideWatermark;
  const dragAttr = draggable ?? !lock;

  // SVG tile — logo glyph (if provided) + brand text, repeated diagonally.
  // The logo is embedded via <image> referencing the public URL so it tiles.
  const logoTag = merged.logoUrl
    ? `<image href='${merged.logoUrl}' x='0' y='70' width='22' height='22' opacity='0.85'/>`
    : "";
  const tile = `<svg xmlns='http://www.w3.org/2000/svg' width='340' height='180' viewBox='0 0 340 180'>
    <g transform='rotate(-22 170 90)' fill='rgb(${r},${g},${b})' fill-opacity='${merged.opacity}' style='font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Inter, sans-serif; font-weight:700;'>
      ${logoTag}
      <text x='${merged.logoUrl ? 30 : 10}' y='88' font-size='14' style='paint-order:stroke;stroke:rgba(0,0,0,0.18);stroke-width:0.6;'>${text}</text>
    </g>
  </svg>`;
  const tileUrl = `url("data:image/svg+xml;utf8,${encodeURIComponent(tile)}")`;

  return (
    <div
      data-watermarked="true"
      className={`relative overflow-hidden ${onClick ? "cursor-pointer" : ""} ${className}`}
      style={style}
      onClick={onClick}
      onContextMenu={(e) => lock && e.preventDefault()}
    >
      <img
        src={src}
        alt={alt}
        loading={loading}
        draggable={dragAttr}
        className={`w-full h-full object-cover ${lock ? "select-none pointer-events-none" : ""} ${imgClassName}`}
        onContextMenu={(e) => lock && e.preventDefault()}
      />
      {showWatermark && (
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none mix-blend-overlay"
          style={{
            backgroundImage: tileUrl,
            backgroundRepeat: "repeat",
            backgroundSize: "280px 150px",
          }}
        />
      )}
    </div>
  );
};

export default WatermarkedImage;
