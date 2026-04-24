/**
 * WatermarkedImage — wraps an <img> with a tiled, semi-transparent
 * "Creative Caricature Club India" watermark that protects the photo without
 * obscuring it. The watermark is rendered as an SVG overlay with pointer-events
 * disabled so it can never be right-click-saved separately. Hidden when the
 * `hideWatermark` prop is true (admins can pass this from contexts where they
 * need a clean download).
 */
import { CSSProperties } from "react";

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
  /** Brand text shown in the diagonal repeat. */
  brandText?: string;
};

const DEFAULT_BRAND = "Creative Caricature Club India";

const WatermarkedImage = ({
  src,
  alt = "",
  className = "",
  imgClassName = "",
  style,
  hideWatermark = false,
  onClick,
  loading = "lazy",
  draggable = false,
  brandText = DEFAULT_BRAND,
}: Props) => {
  // SVG watermark tile encoded as a data URL — repeats diagonally over the image.
  // White text with low opacity stays subtle on dark backgrounds; black drop-shadow
  // keeps it readable on bright photos.
  const tile = `<svg xmlns='http://www.w3.org/2000/svg' width='320' height='180' viewBox='0 0 320 180'>
    <g transform='rotate(-22 160 90)' fill='white' fill-opacity='0.22' style='font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Inter, sans-serif; font-weight:700;'>
      <text x='10' y='90' font-size='14' style='paint-order:stroke;stroke:rgba(0,0,0,0.18);stroke-width:0.6;'>${brandText}</text>
    </g>
  </svg>`;
  const tileUrl = `url("data:image/svg+xml;utf8,${encodeURIComponent(tile)}")`;

  return (
    <div
      className={`relative overflow-hidden ${onClick ? "cursor-pointer" : ""} ${className}`}
      style={style}
      onClick={onClick}
      onContextMenu={(e) => e.preventDefault()}
    >
      <img
        src={src}
        alt={alt}
        loading={loading}
        draggable={draggable}
        className={`w-full h-full object-cover select-none pointer-events-none ${imgClassName}`}
        onContextMenu={(e) => e.preventDefault()}
      />
      {!hideWatermark && (
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none mix-blend-overlay"
          style={{
            backgroundImage: tileUrl,
            backgroundRepeat: "repeat",
            backgroundSize: "260px 150px",
          }}
        />
      )}
    </div>
  );
};

export default WatermarkedImage;
