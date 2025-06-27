/*
  # Update measurement dates to match query range

  1. Updates:
    - Set specific dates within the query range (2025-02-23 to 2025-03-23)
    - Maintain all other data as is
*/

DO $$ 
DECLARE
  _area_id uuid;
  _medicao_id uuid;
  _ponto_a1_id uuid;
  _ponto_a2_id uuid;
  _target_date timestamp with time zone;
BEGIN
  -- Set target date to March 1st, 2025
  _target_date := '2025-03-01 10:00:00+00'::timestamp with time zone;

  -- Add work area
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

  -- Add Ponto A1
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

  -- Add Ponto A2
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

  -- Add measurement for Ponto A1
  INSERT INTO medicao (
    ponto_de_coleta_id,
    data_hora_medicao,
    cliente_id,
    area_de_trabalho_id
  ) VALUES (
    _ponto_a1_id,
    _target_date,
    16716417000195,
    _area_id
  ) RETURNING id INTO _medicao_id;

  -- Add measurement items for Ponto A1
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
      'f212ae16-5486-4012-8c4c-02247c9354d3',  -- pH
      'pH'
    ),
    (
      _medicao_id,
      'Nível de Cloro',
      1.5,
      '4f7ffce2-d1ba-4458-8843-848524441d8c',  -- Cloro
      'Cloro'
    );

  -- Add measurement for Ponto A2
  INSERT INTO medicao (
    ponto_de_coleta_id,
    data_hora_medicao,
    cliente_id,
    area_de_trabalho_id
  ) VALUES (
    _ponto_a2_id,
    _target_date + interval '30 minutes',
    16716417000195,
    _area_id
  ) RETURNING id INTO _medicao_id;

  -- Add measurement items for Ponto A2
  INSERT INTO medicao_items (
    medicao_id,
    parametro,
    valor,
    tipo_medicao_id,
    tipo_medicao_nome
  ) VALUES
    (
      _medicao_id,
      'Turbidez da Água',
      2.8,
      'b187229a-f990-4274-85ae-40fbcdafad15',  -- Turbidez
      'Turbidez'
    ),
    (
      _medicao_id,
      'Vazão do Sistema',
      150.5,
      'f7fc4145-92c9-4218-9db0-663426f1feda',  -- Vazão
      'Vazão'
    );
END $$;