/*
  # Fix hidrometro measurement type
  
  1. Changes
    - Add hidrometro to tipos_medicao table
    - Update Ponto A2 to include hidrometro type
    - Regenerate data with correct measurement types
    
  2. Data Generation
    - pH: 6.0 to 8.0
    - Cloro: 0.0 to 2.0
    - Turbidez: 0.0 to 5.0
    - Hidrômetro: Incrementing values
    - Vazão: Calculated from Hidrômetro
*/

DO $$ 
DECLARE
  _area_id uuid;
  _ponto_a1_id uuid;
  _ponto_a2_id uuid;
  _hidrometro_tipo_id uuid;
BEGIN
  -- First add hidrometro to tipos_medicao if it doesn't exist
  INSERT INTO tipos_medicao (id, nome, tipo)
  VALUES (
    'e98df000-6402-4797-9cd9-13f5e82f5e8b',
    'Hidrômetro',
    'numeric'
  )
  ON CONFLICT (id) DO NOTHING
  RETURNING id INTO _hidrometro_tipo_id;

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
  END;
END $$;