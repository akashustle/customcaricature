ALTER TABLE public.lil_flea_gallery
  ADD COLUMN IF NOT EXISTS placement text NOT NULL DEFAULT 'all';

-- Restrict allowed values via trigger (avoiding non-immutable check pitfalls)
CREATE OR REPLACE FUNCTION public.lil_flea_gallery_validate_placement()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.placement NOT IN ('all','slide1','slide2','scroll') THEN
    RAISE EXCEPTION 'Invalid placement: %, must be one of all|slide1|slide2|scroll', NEW.placement;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lil_flea_gallery_validate_placement ON public.lil_flea_gallery;
CREATE TRIGGER trg_lil_flea_gallery_validate_placement
BEFORE INSERT OR UPDATE ON public.lil_flea_gallery
FOR EACH ROW EXECUTE FUNCTION public.lil_flea_gallery_validate_placement();