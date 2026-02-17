-- Make artist-portfolios bucket private (track_order already fixed above)
UPDATE storage.buckets SET public = false WHERE id = 'artist-portfolios';