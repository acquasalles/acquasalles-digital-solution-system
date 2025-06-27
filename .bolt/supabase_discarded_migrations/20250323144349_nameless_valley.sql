/*
  # Add dummy data for testing

  1. Data Added:
    - Work area for client 16716417000195
    - Two collection points with different measurement types
    - Measurements for each point
    - Measurement items with values
*/

DO $$ 
DECLARE
  _area_id uuid;
  _medicao_id uuid;
  _ponto_id uuid;
  _ponto_a1_id uuid;
  _ponto_a2_id uuid;
BEGIN
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
    ARRAY['Temperatura', 'Umidade', 'pH']::text[]
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
    ARRAY['Pressão', 'Ruído', 'Vibração']::text[]
  ) RETURNING id INTO _ponto_a2_id;

  -- Add measurement for Ponto A1
  INSERT INTO medicao (
    ponto_de_coleta_id,
    data_hora_medicao,
    cliente_id,
    area_de_trabalho_id
  ) VALUES (
    _ponto_a1_id,
    NOW() - INTERVAL '1 hour',
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
      'Temperatura Ambiente',
      25.5,
      '550e8400-e29b-41d4-a716-446655440000',
      'Temperatura'
    ),
    (
      _medicao_id,
      'pH Solução',
      7.2,
      '660e8400-e29b-41d4-a716-446655440000',
      'pH'
    );

  -- Add measurement for Ponto A2
  INSERT INTO medicao (
    ponto_de_coleta_id,
    data_hora_medicao,
    cliente_id,
    area_de_trabalho_id
  ) VALUES (
    _ponto_a2_id,
    NOW() - INTERVAL '30 minutes',
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
      'Pressão Atmosférica',
      1013.25,
      '770e8400-e29b-41d4-a716-446655440000',
      'Pressão'
    ),
    (
      _medicao_id,
      'Nível de Ruído',
      75.8,
      '880e8400-e29b-41d4-a716-446655440000',
      'Ruído'
    );
END $$;