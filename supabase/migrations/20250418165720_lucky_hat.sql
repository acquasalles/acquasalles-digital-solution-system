/*
  # Fix data generation with proper deletion order
  
  1. Changes
    - Delete measurement items before measurements
    - Add proper existence checks
    - Generate data for date range
    
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
  _ponto_a1_id uuid;
  _ponto_a2_id uuid;
  _medicao_id uuid;
  _horimetro_value numeric;
  _vazao_accumulated numeric;
BEGIN
  -- First check if area exists
  SELECT id INTO _area_id
  FROM area_de_trabalho
  WHERE cliente_id = 16716417000195
  AND nome_area = 'Área Industrial Principal'
  LIMIT 1;

  -- Create area if it doesn't exist
  IF _area_id IS NULL THEN
    INSERT INTO area_de_trabalho (
      cliente_id,
      nome_area,
      descricao,
      localizacao,
      observacao
    ) VALUES (
      16716417000195,
      'Área Industrial Principal',
      'Área principal de produção',
      '{"latitude": -23.5505, "longitude": -46.6333}',
      'Área com alto fluxo de operações'
    ) RETURNING id INTO _area_id;
  END IF;

  -- Check if points exist
  SELECT id INTO _ponto_a1_id
  FROM ponto_de_coleta
  WHERE cliente_id = 16716417000195
  AND nome = 'Ponto A1'
  LIMIT 1;

  -- Create Ponto A1 if it doesn't exist
  IF _ponto_a1_id IS NULL THEN
    INSERT INTO ponto_de_coleta (
      cliente_id,
      area_de_trabalho_id,
      nome,
      descricao,
      localizacao,
      tipos_medicao
    ) VALUES (
      16716417000195,
      _area_id,
      'Ponto A1',
      'Entrada da área de produção',
      '{"latitude": -23.5506, "longitude": -46.6334}',
      ARRAY['pH', 'Cloro']::text[]
    ) RETURNING id INTO _ponto_a1_id;
  END IF;

  -- Check if Ponto A2 exists
  SELECT id INTO _ponto_a2_id
  FROM ponto_de_coleta
  WHERE cliente_id = 16716417000195
  AND nome = 'Ponto A2'
  LIMIT 1;

  -- Create Ponto A2 if it doesn't exist
  IF _ponto_a2_id IS NULL THEN
    INSERT INTO ponto_de_coleta (
      cliente_id,
      area_de_trabalho_id,
      nome,
      descricao,
      localizacao,
      tipos_medicao
    ) VALUES (
      16716417000195,
      _area_id,
      'Ponto A2',
      'Saída da área de produção',
      '{"latitude": -23.5507, "longitude": -46.6335}',
      ARRAY['Turbidez', 'Vazão']::text[]
    ) RETURNING id INTO _ponto_a2_id;
  END IF;

  -- Set date range
  _start_date := '2025-03-19 00:00:00+00'::timestamp with time zone;
  _end_date := NOW();
  _current_date := _start_date;
  _horimetro_value := 10000;
  _vazao_accumulated := 0;

  -- Delete existing measurements in the date range to avoid duplicates
  -- First delete measurement items
  DELETE FROM medicao_items
  WHERE medicao_id IN (
    SELECT id FROM medicao
    WHERE cliente_id = 16716417000195
    AND data_hora_medicao BETWEEN _start_date AND _end_date
  );

  -- Then delete the measurements
  DELETE FROM medicao
  WHERE cliente_id = 16716417000195
  AND data_hora_medicao BETWEEN _start_date AND _end_date;

  -- Generate data for each day
  WHILE _current_date <= _end_date LOOP
    -- Ponto A1 measurements
    INSERT INTO medicao (
      ponto_de_coleta_id,
      data_hora_medicao,
      cliente_id,
      area_de_trabalho_id
    ) VALUES (
      _ponto_a1_id,
      _current_date + interval '9 hours',
      16716417000195,
      _area_id
    ) RETURNING id INTO _medicao_id;

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
      6.0 + (random() * 2.0),
      'f212ae16-5486-4012-8c4c-02247c9354d3',
      'pH'
    );

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
      random() * 2.0,
      '4f7ffce2-d1ba-4458-8843-848524441d8c',
      'Cloro'
    );

    -- Ponto A2 measurements
    INSERT INTO medicao (
      ponto_de_coleta_id,
      data_hora_medicao,
      cliente_id,
      area_de_trabalho_id
    ) VALUES (
      _ponto_a2_id,
      _current_date + interval '9 hours',
      16716417000195,
      _area_id
    ) RETURNING id INTO _medicao_id;

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
      random() * 5.0,
      'b187229a-f990-4274-85ae-40fbcdafad15',
      'Turbidez'
    );

    -- Increment horímetro and calculate vazão
    _horimetro_value := _horimetro_value + (100 + (random() * 100));
    _vazao_accumulated := _vazao_accumulated + (_horimetro_value * 0.1);

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

    -- Move to next day
    _current_date := _current_date + interval '1 day';
  END LOOP;
END $$;