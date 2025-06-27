/*
  # Set up logo storage

  1. New Storage Bucket
    - Create a public bucket for storing the logo
    - Enable public access for reading the logo
  
  2. Security
    - Enable RLS on the bucket
    - Add policy for authenticated users to upload files
    - Add policy for public read access
*/

-- Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to upload files
CREATE POLICY "Authenticated users can upload logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'logos' AND
  auth.role() = 'authenticated'
);

-- Policy for public read access
CREATE POLICY "Public users can read logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'logos');