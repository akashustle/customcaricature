
-- Drop the problematic recursive policy
DROP POLICY IF EXISTS "Authenticated users can view artists" ON public.artists;

-- Create a security definer function to check if user has an event with this artist
CREATE OR REPLACE FUNCTION public.user_has_event_with_artist(_user_id uuid, _artist_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM event_artist_assignments eaa
    JOIN event_bookings eb ON eb.id = eaa.event_id
    WHERE eaa.artist_id = _artist_id
      AND eb.user_id = _user_id
  )
$$;

-- Recreate the policy using the security definer function
CREATE POLICY "Authenticated users can view artists"
ON public.artists
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin') 
  OR has_role(auth.uid(), 'moderator') 
  OR auth_user_id = auth.uid() 
  OR public.user_has_event_with_artist(auth.uid(), id)
);
