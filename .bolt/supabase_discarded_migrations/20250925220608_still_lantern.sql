/*
  # Add test outorga data to existing collection points
  
  1. Changes
    - Add outorga data to Ponto A2 (which has Volume/Vazão measurements)
    - Set realistic volume limits for testing
    
  2. Test Data
    - volumeMax: 50000 m³ (50,000 cubic meters)
    - horimetroMax: 60000 m³ (60,000 cubic meters)
*/

-- Update Ponto A2 with outorga data
UPDATE ponto_de_coleta 
SET outorga = '{
  "volumeMax": {
    "unit": "m³",
    "value": 50000
  },
  "horimetroMax": {
    "unit": "m³", 
    "value": 60000
  }
}'::jsonb
WHERE nome = 'Ponto A2' 
AND cliente_id = 16716417000195;

-- Verify the update
DO $$
DECLARE
  _outorga_data jsonb;
BEGIN
  SELECT outorga INTO _outorga_data
  FROM ponto_de_coleta
  WHERE nome = 'Ponto A2' 
  AND cliente_id = 16716417000195;
  
  RAISE NOTICE 'Outorga data updated for Ponto A2: %', _outorga_data;
END $$;