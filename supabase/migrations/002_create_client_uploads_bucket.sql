INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('client-uploads', 'client-uploads', false, 52428800, '{image/png,image/jpeg,image/gif}')
ON CONFLICT (id) DO NOTHING;

-- Service role can do anything with objects in the bucket
CREATE POLICY anon_manage_client_uploads ON storage.objects
  FOR ALL
  TO anon
  USING (bucket_id = 'client-uploads')
  WITH CHECK (bucket_id = 'client-uploads');
