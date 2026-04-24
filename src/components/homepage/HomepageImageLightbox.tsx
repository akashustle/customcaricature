import { useEffect, useCallback } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import WatermarkedImage from "@/components/WatermarkedImage";

interface Props {
  images: string[];
  index: number | null;
  onClose: () => void;
  onChange: (i: number) => void;
}

const HomepageImageLightbox = ({ images, index, onClose, onChange }: Props) => {
  const next = useCallback(() => {
    if (index === null || images.length === 0) return;
    onChange((index + 1) % images.length);
  }, [index, images.length, onChange]);

  const prev = useCallback(() => {
    if (index === null || images.length === 0) return;
    onChange((index - 1 + images.length) % images.length);
  }, [index, images.length, onChange]);

  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, next, prev, onClose]);

  if (index === null || !images[index]) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-foreground/90 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-background/20 flex items-center justify-center text-background/90 hover:bg-background/30 transition-colors"
        aria-label="Close"
      >
        <X className="w-6 h-6" />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); prev(); }}
        className="absolute left-3 sm:left-6 z-10 w-11 h-11 rounded-full bg-background/20 flex items-center justify-center text-background/90 hover:bg-background/30 transition-colors"
        aria-label="Previous"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); next(); }}
        className="absolute right-3 sm:right-6 z-10 w-11 h-11 rounded-full bg-background/20 flex items-center justify-center text-background/90 hover:bg-background/30 transition-colors"
        aria-label="Next"
      >
        <ChevronRight className="w-6 h-6" />
      </button>
      <div
        key={index}
        className="max-w-[92vw] max-h-[85vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <WatermarkedImage
          src={images[index]}
          alt={`Image ${index + 1}`}
          className="rounded-2xl shadow-2xl max-h-[85vh]"
          imgClassName="!object-contain"
        />
      </div>
      <p className="absolute bottom-5 left-1/2 -translate-x-1/2 text-sm text-background/70 font-semibold bg-foreground/30 px-3 py-1 rounded-full">
        {index + 1} / {images.length}
      </p>
    </div>
  );
};

export default HomepageImageLightbox;
