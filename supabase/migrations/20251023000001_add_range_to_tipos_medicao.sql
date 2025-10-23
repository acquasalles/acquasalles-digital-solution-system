/*
  # Add range column to tipos_medicao table

  1. Changes
    - Add `range` JSONB column to tipos_medicao table
    - This column will store min and max conformity limits for each measurement type
    - Format: {"min": number, "max": number}

  2. Initial Data
    - pH: min 6.5, max 8.5 (CONAMA 357/2005 and Portaria 2914/2011)
    - Cloro (Chlorine): min 0.2, max 2.0 mg/L (Portaria 2914/2011)
    - Turbidez (Turbidity): min 0.0, max 5.0 NTU (Portaria 2914/2011)

  3. Notes
    - These are Brazilian water quality standards
    - Values can be updated per measurement type as needed
*/

-- Add range column to tipos_medicao table
ALTER TABLE tipos_medicao
ADD COLUMN IF NOT EXISTS range JSONB DEFAULT NULL;

-- Update range values for water quality parameters
UPDATE tipos_medicao
SET range = '{"min": 6.5, "max": 8.5}'::jsonb
WHERE nome = 'pH';

UPDATE tipos_medicao
SET range = '{"min": 0.2, "max": 2.0}'::jsonb
WHERE nome = 'Cloro';

UPDATE tipos_medicao
SET range = '{"min": 0.0, "max": 5.0}'::jsonb
WHERE nome = 'Turbidez';

-- Add comment to column
COMMENT ON COLUMN tipos_medicao.range IS 'Conformity limits for measurement type. Format: {"min": number, "max": number}';
