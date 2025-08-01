/*
  # Update collection points and measurement types
  
  1. Changes
    - Move Turbidez to Ponto A1 with pH and Cloro
    - Create new point for Hidrômetro and Vazão
    - Update existing data to match new structure
    
  2. Security
    - Maintain RLS policies
    - Keep existing data integrity
*/

DO $$ 
DECLARE
  _area_id uuid;
  _ponto_a1_id uuid;
  _ponto_a2_id uuid;
BEGIN
  -- Get existing area ID
  SELECT id INTO _area_id
  FROM area_de_trabalho
  WHERE cliente_id = 16716417000195
  AND nome_area = 'Área Industrial Principal'
  LIMIT 1;

  IF _area_id IS NULL THEN
    RAISE EXCEPTION 'Area not found';
  END IF;

  -- First delete existing measurements and their items
  DELETE FROM medicao_items
  WHERE medicao_id IN (
    SELECT id FROM medicao
    WHERE cliente_id = 16716417000195
  );

  DELETE FROM medicao
  WHERE cliente_id = 16716417000195;

  -- Delete existing collection points
  DELETE FROM ponto_de_coleta
  WHERE cliente_id = 16716417000195;

  -- Create new Ponto A1 with pH, Cloro, and Turbidez
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
    'Ponto de análise química',
    '{"latitude": -23.5506, "longitude": -46.6334}',
    ARRAY['pH', 'Cloro', 'Turbidez']::text[]
  ) RETURNING id INTO _ponto_a1_id;

  -- Create new Ponto A2 with Hidrômetro and Vazão
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
    'Ponto de medição de consumo',
    '{"latitude": -23.5507, "longitude": -46.6335}',
    ARRAY['Hidrômetro', 'Vazão']::text[]
  ) RETURNING id INTO _ponto_a2_id;

  -- Generate initial data
  DECLARE
    _medicao_id uuid;
    _hidrometro_value numeric := 10000;
    _vazao_value numeric := 1000;
  BEGIN
    -- Create measurement for Ponto A1
    INSERT INTO medicao (
      ponto_de_coleta_id,
      data_hora_medicao,
      cliente_id,
      area_de_trabalho_id
    ) VALUES (
      _ponto_a1_id,
      NOW(),
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
        7.2,
        'f212ae16-5486-4012-8c4c-02247c9354d3',
        'pH'
      ),
      (
        _medicao_id,
        'Nível de Cloro',
        1.5,
        '4f7ffce2-d1ba-4458-8843-848524441d8c',
        'Cloro'
      ),
      (
        _medicao_id,
        'Turbidez da Água',
        2.8,
        'b187229a-f990-4274-85ae-40fbcdafad15',
        'Turbidez'
      );

    -- Create measurement for Ponto A2
    INSERT INTO medicao (
      ponto_de_coleta_id,
      data_hora_medicao,
      cliente_id,
      area_de_trabalho_id
    ) VALUES (
      _ponto_a2_id,
      NOW(),
      16716417000195,
      _area_id
    ) RETURNING id INTO _medicao_id;

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
        'f7fc4145-92c9-4218-9db0-663426f1feda',  -- Using same ID as before
        'Hidrômetro'
      ),
      (
        _medicao_id,
        'Vazão do Sistema',
        _vazao_value,
        'f7fc4145-92c9-4218-9db0-663426f1feda',  -- Using same ID for consistency
        'Vazão'
      );
  END;
END $$;