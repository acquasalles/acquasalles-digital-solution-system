/*
  # Fix vazão calculation based on hidrometro readings
  
  1. Changes
    - Generate realistic hidrometro readings that increment daily
    - Calculate vazão as the difference between consecutive hidrometro readings
    - Keep other measurements unchanged (pH, Cloro, Turbidez)
    
  2. Data Generation
    - Hidrometro: Starting at 34000, incrementing by 300-800 per day
    - Vazão: Calculated as difference between consecutive hidrometro readings
*/

DO $$ 
DECLARE
  _current_date timestamp with time zone;
  _prev_date timestamp with time zone;
  _start_date timestamp with time zone;
  _end_date timestamp with time zone;
  _area_id uuid;
  _ponto_a1_id uuid;
  _ponto_a2_id uuid;
  _medicao_id uuid;
  _prev_medicao_id uuid;
  _hidrometro_value numeric;
  _prev_hidrometro_value numeric;
  _vazao_value numeric;
  _hidrometro_tipo_id uuid;
BEGIN
  -- Get hidrometro type ID
  SELECT id INTO _hidrometro_tipo_id
  FROM tipos_medicao
  WHERE nome = 'Hidrômetro'
  LIMIT 1;

  -- Get existing area and points with explicit checks
  SELECT 
    a.id, p1.id, p2.id
  INTO 
    _area_id, _ponto_a1_id, _ponto_a2_id
  FROM area_de_trabalho a
  LEFT JOIN ponto_de_coleta p1 ON p1.area_de_trabalho_id = a.id AND p1.nome = 'Ponto A1'
  LEFT JOIN ponto_de_coleta p2 ON p2.area_de_trabalho_id = a.id AND p2.nome = 'Ponto A2'
  WHERE a.cliente_id = 16716417000195
  AND a.nome_area = 'Área Industrial Principal'
  LIMIT 1;

  -- Verify we have all required IDs
  IF _area_id IS NULL OR _ponto_a1_id IS NULL OR _ponto_a2_id IS NULL OR _hidrometro_tipo_id IS NULL THEN
    RAISE EXCEPTION 'Required IDs not found. Area: %, Ponto A1: %, Ponto A2: %, Hidrometro: %', 
      _area_id, _ponto_a1_id, _ponto_a2_id, _hidrometro_tipo_id;
  END IF;

  -- Set date range
  _start_date := '2025-03-19 00:00:00+00'::timestamp with time zone;
  _end_date := NOW();
  _current_date := _start_date;
  _prev_date := _current_date - interval '1 day';
  _hidrometro_value := 34000; -- Starting value
  _prev_hidrometro_value := _hidrometro_value;

  -- Delete existing measurements in the date range
  DELETE FROM medicao_items
  WHERE medicao_id IN (
    SELECT id FROM medicao
    WHERE cliente_id = 16716417000195
    AND data_hora_medicao BETWEEN _start_date AND _end_date
  );

  DELETE FROM medicao
  WHERE cliente_id = 16716417000195
  AND data_hora_medicao BETWEEN _start_date AND _end_date;

  -- Generate data for each day
  WHILE _current_date <= _end_date LOOP
    -- Ponto A1 measurements (Chemical analysis)
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

    -- Add chemical measurements
    INSERT INTO medicao_items (
      medicao_id,
      parametro,
      valor,
      tipo_medicao_id,
      tipo_medicao_nome
    ) VALUES
      (
        _medicao_id,
        'pH Solução',
        6.0 + (random() * 2.0),
        'f212ae16-5486-4012-8c4c-02247c9354d3',
        'pH'
      ),
      (
        _medicao_id,
        'Nível de Cloro',
        random() * 2.0,
        '4f7ffce2-d1ba-4458-8843-848524441d8c',
        'Cloro'
      ),
      (
        _medicao_id,
        'Turbidez da Água',
        random() * 5.0,
        'b187229a-f990-4274-85ae-40fbcdafad15',
        'Turbidez'
      );

    -- Ponto A2 measurements (Flow measurements)
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

    -- Store previous hidrometro value
    _prev_hidrometro_value := _hidrometro_value;
    
    -- Increment hidrometro by random value between 300 and 800
    _hidrometro_value := _hidrometro_value + (300 + (random() * 500));
    
    -- Calculate vazão as the difference between current and previous hidrometro readings
    _vazao_value := _hidrometro_value - _prev_hidrometro_value;

    -- Add flow measurements
    INSERT INTO medicao_items (
      medicao_id,
      parametro,
      valor,
      tipo_medicao_id,
      tipo_medicao_nome
    ) VALUES
      (
        _medicao_id,
        'Leitura do Hidrômetro',
        _hidrometro_value,
        _hidrometro_tipo_id,
        'Hidrômetro'
      ),
      (
        _medicao_id,
        'Vazão do Sistema',
        _vazao_value,
        'f7fc4145-92c9-4218-9db0-663426f1feda',
        'Vazão'
      );

    -- Move to next day
    _prev_date := _current_date;
    _current_date := _current_date + interval '1 day';
  END LOOP;
END $$;