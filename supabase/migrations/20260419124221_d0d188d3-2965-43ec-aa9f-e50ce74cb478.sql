-- ============================================================
-- 1) Fix enquiries: remove public-read of anonymous enquiries
-- ============================================================
DROP POLICY IF EXISTS "Users can view own enquiries" ON public.enquiries;
DROP POLICY IF EXISTS "Public can view own enquiries" ON public.enquiries;
DROP POLICY IF EXISTS "Anyone can view enquiries" ON public.enquiries;

-- Only the authenticated submitter can read their own enquiries
CREATE POLICY "Authenticated users can view their own enquiries"
ON public.enquiries
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins can read all enquiries
CREATE POLICY "Admins can view all enquiries"
ON public.enquiries
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- 2) Lock down Realtime channel subscriptions
-- ============================================================
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read realtime messages" ON realtime.messages;
DROP POLICY IF EXISTS "Admins can subscribe to all realtime topics" ON realtime.messages;
DROP POLICY IF EXISTS "Users can subscribe to their own realtime topics" ON realtime.messages;

-- Admins can subscribe to any realtime topic
CREATE POLICY "Admins can subscribe to all realtime topics"
ON realtime.messages
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Authenticated users can subscribe only to topics that contain their own user id
-- (Convention: namespaced channels like "user:<uid>", "orders:<uid>", "chat:<uid>")
CREATE POLICY "Users can subscribe to topics containing their own id"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  topic LIKE '%' || auth.uid()::text || '%'
);
