/*
  # Add dummy data for client 16716417000195

  1. New Data
    - Add work area for client
    - Add collection points with measurement types
    - Add measurements and measurement items
    - All IDs are auto-generated
    - Uses variables for proper data relationships
*/

DO $$ 
DECLARE
  _area_id uuid;
  _medicao_id uuid;
  _ponto_id uuid;
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

  -- Add collection points with correct schema
  WITH new_points AS (
    INSERT INTO ponto_de_coleta (
      cliente_id,
      area_de_trabalho_id,
      nome,
      descricao,
      localizacao,
      tipos_medicao
    ) VALUES
      (
        16716417000195,
        _area_id,
        'Ponto A1',
        'Entrada da área de produção',
        '{"latitude": -23.5506, "longitude": -46.6334}',
        ARRAY['Temperatura', 'Umidade', 'pH']::text[]
      ),
      (
        16716417000195,
        _area_id,
        'Ponto A2',
        'Saída da área de produção',
        '{"latitude": -23.5507, "longitude": -46.6335}',
        ARRAY['Pressão', 'Ruído', 'Vibração']::text[]
      )
    RETURNING id, nome
  )
  -- Add measurements for each point
  INSERT INTO medicao (
    ponto_de_coleta_id,
    data_hora_medicao,
    cliente_id,
    area_de_trabalho_id
  )
  SELECT 
    np.id,
    CASE 
      WHEN np.nome = 'Ponto A1' THEN NOW() - INTERVAL '1 hour'
      ELSE NOW() - INTERVAL '30 minutes'
    END,
    16716417000195,
    _area_id
  FROM new_points np;

  -- Get the measurement ID and point ID for Ponto A1
  SELECT m.id, m.ponto_de_coleta_id 
  INTO _medicao_id, _ponto_id
  FROM medicao m
  JOIN ponto_de_coleta p ON p.id = m.ponto_de_coleta_id
  WHERE p.nome = 'Ponto A1'
  LIMIT 1;

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

  -- Get the measurement ID and point ID for Ponto A2
  SELECT m.id, m.ponto_de_coleta_id 
  INTO _medicao_id, _ponto_id
  FROM medicao m
  JOIN ponto_de_coleta p ON p.id = m.ponto_de_coleta_id
  WHERE p.nome = 'Ponto A2'
  LIMIT 1;

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