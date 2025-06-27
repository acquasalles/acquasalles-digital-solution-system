/*
  # Generate measurement data from March 19th to today
  
  1. Changes
    - Add daily measurements for each collection point
    - Generate realistic random values for each measurement type:
      - pH: 6.0 to 8.0
      - Cloro: 0.0 to 2.0
      - Turbidez: 0.0 to 5.0
      - Horímetro: Sequential from 10000 to 50000
      - Vazão: Accumulated based on horímetro
    
  2. Data Range
    - Start: March 19th, 2025
    - End: Current date
*/

DO $$ 
DECLARE
  _current_date timestamp with time zone;
  _start_date timestamp with time zone;
  _end_date timestamp with time zone;
  _area_id uuid;
  _ponto_id uuid;
  _medicao_id uuid;
  _horimetro_value numeric;
  _vazao_accumulated numeric;
BEGIN
  -- Set date range
  _start_date := '2025-03-19 00:00:00+00'::timestamp with time zone;
  _end_date := NOW();
  _current_date := _start_date;
  _horimetro_value := 10000;
  _vazao_accumulated := 0;

  -- Get existing area and point IDs
  SELECT id INTO _area_id
  FROM area_de_trabalho
  WHERE cliente_id = 16716417000195
  LIMIT 1;

  -- Generate data for each day
  WHILE _current_date <= _end_date LOOP
    -- For each collection point
    FOR _ponto_id IN 
      SELECT id 
      FROM ponto_de_coleta 
      WHERE area_de_trabalho_id = _area_id
    LOOP
      -- Create measurement
      INSERT INTO medicao (
        ponto_de_coleta_id,
        data_hora_medicao,
        cliente_id,
        area_de_trabalho_id
      ) VALUES (
        _ponto_id,
        _current_date + interval '9 hours',  -- Set to 9 AM
        16716417000195,
        _area_id
      ) RETURNING id INTO _medicao_id;

      -- Add measurement items based on point type
      IF EXISTS (
        SELECT 1 
        FROM ponto_de_coleta 
        WHERE id = _ponto_id 
        AND 'pH' = ANY(tipos_medicao)
      ) THEN
        -- Add pH measurement (6.0 to 8.0)
        INSERT INTO medicao_items (
          medicao_id,
          parametro,
          valor,
          tipo_medicao_id,
          tipo_medicao_nome
        ) VALUES (
          _medicao_id,
          'pH Solução',
          6.0 + (random() * 2.0),  -- Random between 6.0 and 8.0
          'f212ae16-5486-4012-8c4c-02247c9354d3',
          'pH'
        );
      END IF;

      IF EXISTS (
        SELECT 1 
        FROM ponto_de_coleta 
        WHERE id = _ponto_id 
        AND 'Cloro' = ANY(tipos_medicao)
      ) THEN
        -- Add Cloro measurement (0.0 to 2.0)
        INSERT INTO medicao_items (
          medicao_id,
          parametro,
          valor,
          tipo_medicao_id,
          tipo_medicao_nome
        ) VALUES (
          _medicao_id,
          'Nível de Cloro',
          random() * 2.0,  -- Random between 0.0 and 2.0
          '4f7ffce2-d1ba-4458-8843-848524441d8c',
          'Cloro'
        );
      END IF;

      IF EXISTS (
        SELECT 1 
        FROM ponto_de_coleta 
        WHERE id = _ponto_id 
        AND 'Turbidez' = ANY(tipos_medicao)
      ) THEN
        -- Add Turbidez measurement (0.0 to 5.0)
        INSERT INTO medicao_items (
          medicao_id,
          parametro,
          valor,
          tipo_medicao_id,
          tipo_medicao_nome
        ) VALUES (
          _medicao_id,
          'Turbidez da Água',
          random() * 5.0,  -- Random between 0.0 and 5.0
          'b187229a-f990-4274-85ae-40fbcdafad15',
          'Turbidez'
        );
      END IF;

      IF EXISTS (
        SELECT 1 
        FROM ponto_de_coleta 
        WHERE id = _ponto_id 
        AND 'Vazão' = ANY(tipos_medicao)
      ) THEN
        -- Increment horímetro by random value between 100 and 200
        _horimetro_value := _horimetro_value + (100 + (random() * 100));
        -- Calculate vazão as accumulated value
        _vazao_accumulated := _vazao_accumulated + (_horimetro_value * 0.1);  -- 10% of horímetro

        -- Add Vazão measurement
        INSERT INTO medicao_items (
          medicao_id,
          parametro,
          valor,
          tipo_medicao_id,
          tipo_medicao_nome
        ) VALUES (
          _medicao_id,
          'Vazão do Sistema',
          _vazao_accumulated,
          'f7fc4145-92c9-4218-9db0-663426f1feda',
          'Vazão'
        );
      END IF;

    END LOOP;

    -- Move to next day
    _current_date := _current_date + interval '1 day';
  END LOOP;
END $$;