import { OrderFormData } from "@/lib/order-types";
import { Button } from "@/components/ui/button";
import { Upload, X, ImageIcon } from "lucide-react";
import { useRef } from "react";

interface Props {
  data: OrderFormData;
  update: (partial: Partial<OrderFormData>) => void;
  onNext: () => void;
}

const StepPhotoUpload = ({ data, update, onNext }: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const newPhotos = [...data.photos, ...Array.from(files)];
    update({ photos: newPhotos });
  };

  const removePhoto = (index: number) => {
    update({ photos: data.photos.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold mb-1">Upload Photos</h2>
        <p className="text-sm text-muted-foreground font-sans">
          Please upload clear HD photos with visible facial features
        </p>
      </div>

      {/* Drop zone */}
      <div
        className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
        onDrop={(e) => { e.preventDefault(); e.stopPropagation(); handleFiles(e.dataTransfer.files); }}
      >
        <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <p className="font-sans font-medium text-foreground">Click or drag & drop to upload</p>
        <p className="text-xs text-muted-foreground font-sans mt-1">JPEG, PNG — Multiple images allowed</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {/* Preview */}
      {data.photos.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {data.photos.map((file, i) => (
            <div key={i} className="relative group rounded-lg overflow-hidden border border-border aspect-square">
              <img
                src={URL.createObjectURL(file)}
                alt={`Upload ${i + 1}`}
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => removePhoto(i)}
                className="absolute top-1 right-1 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {data.photos.length === 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground font-sans">
          <ImageIcon className="w-4 h-4" />
          No photos uploaded yet
        </div>
      )}

      <Button onClick={onNext} disabled={data.photos.length === 0} className="w-full rounded-full font-sans" size="lg">
        Continue
      </Button>
    </div>
  );
};

export default StepPhotoUpload;
