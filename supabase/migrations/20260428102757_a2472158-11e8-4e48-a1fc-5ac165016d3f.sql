-- Blog reactions (likes/dislikes) — supports both authenticated users and anonymous visitors via session_id
CREATE TABLE IF NOT EXISTS public.blog_post_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  user_id UUID,
  session_id TEXT,
  reaction TEXT NOT NULL CHECK (reaction IN ('like','dislike')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT blog_reaction_identity CHECK (user_id IS NOT NULL OR session_id IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_blog_reaction_user
  ON public.blog_post_reactions (post_id, user_id)
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_blog_reaction_session
  ON public.blog_post_reactions (post_id, session_id)
  WHERE session_id IS NOT NULL AND user_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_blog_reaction_post ON public.blog_post_reactions(post_id);

ALTER TABLE public.blog_post_reactions ENABLE ROW LEVEL SECURITY;

-- Anyone (anon or authed) can read aggregated reactions
CREATE POLICY "Anyone can view blog reactions"
  ON public.blog_post_reactions FOR SELECT USING (true);

-- Anyone can insert their own reaction (authenticated => must match auth.uid; anon => session_id only, no user_id)
CREATE POLICY "Anyone can insert blog reaction"
  ON public.blog_post_reactions FOR INSERT
  WITH CHECK (
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR (auth.uid() IS NULL AND user_id IS NULL AND session_id IS NOT NULL)
  );

-- Users can update/delete their own reaction (toggle support)
CREATE POLICY "Owners can update blog reaction"
  ON public.blog_post_reactions FOR UPDATE
  USING (
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR (auth.uid() IS NULL AND user_id IS NULL AND session_id IS NOT NULL)
  );

CREATE POLICY "Owners can delete blog reaction"
  ON public.blog_post_reactions FOR DELETE
  USING (
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR (auth.uid() IS NULL AND user_id IS NULL AND session_id IS NOT NULL)
  );

-- ── Auto-ping Google Indexing API when a blog post is published or republished ──
CREATE OR REPLACE FUNCTION public.notify_google_indexing_on_publish()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url text;
  v_should_notify boolean := false;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.is_published = true THEN
    v_should_notify := true;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Notify when first published, or when content/title/slug of a published post changes
    IF (OLD.is_published = false AND NEW.is_published = true)
       OR (NEW.is_published = true AND (
            OLD.title IS DISTINCT FROM NEW.title
            OR OLD.slug IS DISTINCT FROM NEW.slug
            OR OLD.content IS DISTINCT FROM NEW.content
            OR OLD.cover_image IS DISTINCT FROM NEW.cover_image
          )) THEN
      v_should_notify := true;
    END IF;
  END IF;

  IF NOT v_should_notify THEN
    RETURN NEW;
  END IF;

  v_url := 'https://portal.creativecaricatureclub.com/blog/' || NEW.slug;

  BEGIN
    PERFORM net.http_post(
      url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL') || '/functions/v1/google-indexing',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_ANON_KEY'),
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY'),
        'x-internal-trigger', 'blog-publish'
      ),
      body := jsonb_build_object(
        'action', 'submit',
        'url', v_url,
        'type', 'URL_UPDATED'
      ),
      timeout_milliseconds := 1500
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Google indexing trigger failed (non-fatal): %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_blog_google_indexing ON public.blog_posts;
CREATE TRIGGER trg_blog_google_indexing
AFTER INSERT OR UPDATE ON public.blog_posts
FOR EACH ROW
EXECUTE FUNCTION public.notify_google_indexing_on_publish();