/*
  # Add photos table for measurements

  1. New Tables
    - `medicao_photos`
      - `id` (uuid, primary key)
      - `medicao_item_id` (uuid, references medicao_items)
      - `photo_url` (text)
      - `created_at` (timestamp)

  2. Changes
    - Add foreign key constraint to medicao_items
    - Add indexes for performance
*/

-- Create photos table
CREATE TABLE IF NOT EXISTS medicao_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medicao_item_id uuid REFERENCES medicao_items(id) ON DELETE CASCADE,
  photo_url text NOT NULL,
  thumbnail_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add indexes
CREATE INDEX idx_medicao_photos_medicao_item_id ON medicao_photos(medicao_item_id);

-- Create function to update timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add trigger for updated_at
CREATE TRIGGER update_medicao_photos_updated_at
    BEFORE UPDATE ON medicao_photos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add example photo
DO $$ 
DECLARE
  _medicao_item_id uuid;
BEGIN
  -- Get the latest photo measurement item
  SELECT id INTO _medicao_item_id
  FROM medicao_items
  WHERE tipo_medicao_id = '300ad69c-268b-4a5f-befc-fbaee3a110cc'
  ORDER BY created_at DESC
  LIMIT 1;

  IF FOUND THEN
    -- Add photo record
    INSERT INTO medicao_photos (
      medicao_item_id,
      photo_url,
      thumbnail_url
    ) VALUES (
      _medicao_item_id,
      'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=1200',  -- Example URL
      'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=300'    -- Thumbnail URL
    );

    -- Update the measurement item to indicate it has a photo
    UPDATE medicao_items
    SET valor = 1  -- Use 1 to indicate photo exists
    WHERE id = _medicao_item_id;
  END IF;
END $$;