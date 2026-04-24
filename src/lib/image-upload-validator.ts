/**
 * Image upload validator for avatars and profile photos.
 *
 * Runs entirely on the client BEFORE the file ever leaves the browser, so
 * we never wait on a server round-trip — that's what causes Postgres
 * "statement timeout" errors during slow uploads. By rejecting bad files
 * here we keep DB writes tiny and instant.
 *
 * Checks:
 *  - File size (max 4 MB by default; configurable)
 *  - MIME type (must be JPG, PNG, or WEBP)
 *  - Minimum image quality (decoded width/height must be >= 200 px)
 *
 * Usage:
 *   const ok = await validateImageUpload(file);
 *   if (!ok.valid) { toast({ title: ok.title, description: ok.message }); return; }
 */

export type UploadValidation =
  | { valid: true }
  | { valid: false; title: string; message: string };

const ALLOWED_MIME = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const ALLOWED_EXTS = ["jpg", "jpeg", "png", "webp"];
const DEFAULT_MAX_SIZE = 4 * 1024 * 1024; // 4 MB
const MIN_DIMENSION = 200; // px on each side

export interface ValidateOptions {
  maxSizeBytes?: number;
  minDimension?: number;
}

const decodeDimensions = (file: File) =>
  new Promise<{ width: number; height: number } | null>((resolve) => {
    if (typeof window === "undefined" || !window.URL?.createObjectURL) {
      resolve(null);
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });

export async function validateImageUpload(
  file: File,
  opts: ValidateOptions = {}
): Promise<UploadValidation> {
  const maxSize = opts.maxSizeBytes ?? DEFAULT_MAX_SIZE;
  const minDim = opts.minDimension ?? MIN_DIMENSION;

  // 1. Size guard — keeps the request small enough that the DB sync
  //    trigger never times out.
  if (file.size === 0) {
    return { valid: false, title: "Empty file", message: "That file looks empty. Please pick another photo." };
  }
  if (file.size > maxSize) {
    const mb = (maxSize / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      title: "Photo too large",
      message: `Please pick a photo under ${mb} MB. Tip: use your phone camera's standard quality, not Pro/RAW.`,
    };
  }

  // 2. MIME / extension guard.
  const mime = (file.type || "").toLowerCase();
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  const mimeOk = ALLOWED_MIME.includes(mime);
  const extOk = ALLOWED_EXTS.includes(ext);
  if (!mimeOk && !extOk) {
    return {
      valid: false,
      title: "Unsupported file type",
      message: "Only JPG, PNG, or WEBP images are allowed for profile photos.",
    };
  }

  // 3. Minimum quality — make sure we get a real face photo, not a tiny icon.
  const dims = await decodeDimensions(file);
  if (!dims) {
    return {
      valid: false,
      title: "Cannot read photo",
      message: "We couldn't open this image. Please try another file.",
    };
  }
  if (dims.width < minDim || dims.height < minDim) {
    return {
      valid: false,
      title: "Photo quality too low",
      message: `Please pick a clearer photo (at least ${minDim} × ${minDim} pixels). This one is ${dims.width} × ${dims.height}.`,
    };
  }

  return { valid: true };
}
