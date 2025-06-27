/*
  # Add dummy data for client 16716417000195

  1. New Data
    - Add work area for client
    - Add collection points
    - Add measurements and measurement items
    - Use existing tipos_medicao
*/

-- Add work area
INSERT INTO area_de_trabalho (id, cliente_id, nome_area, descricao, localizacao)
VALUES (
  'a711da3d-ad7d-4d93-9c64-0a3957c5b418',
  16716417000195,
  'Área Industrial Principal',
  'Área principal de produção',
  '{"latitude": -23.5505, "longitude": -46.6333}'
);

-- Add collection points
INSERT INTO ponto_de_coleta (id, cliente_id, area_de_trabalho_id, nome, descricao, localizacao, tipos_medicao)
VALUES
  (
    'b9a3d8f6-d5e7-4f2a-9c1b-8c7d6e5f4e3d',
    16716417000195,
    'a711da3d-ad7d-4d93-9c64-0a3957c5b418',
    'Ponto A1',
    'Entrada da área de produção',
    '{"latitude": -23.5506, "longitude": -46.6334}',
    ARRAY['Temperatura', 'Umidade']
  ),
  (
    'c8b2e7f5-c6d4-4e3b-8b2a-7b6c5d4e3f2c',
    16716417000195,
    'a711da3d-ad7d-4d93-9c64-0a3957c5b418',
    'Ponto A2',
    'Saída da área de produção',
    '{"latitude": -23.5507, "longitude": -46.6335}',
    ARRAY['Pressão', 'Ruído']
  );

-- Add measurements
INSERT INTO medicao (id, ponto_de_coleta_id, data_hora_medicao, cliente_id, area_de_trabalho_id)
VALUES
  (
    'h3g7f1e5-d9c3-b7a1-5f9e-3d7c1b5a9f3e',
    'b9a3d8f6-d5e7-4f2a-9c1b-8c7d6e5f4e3d',
    NOW() - INTERVAL '1 hour',
    16716417000195,
    'a711da3d-ad7d-4d93-9c64-0a3957c5b418'
  ),
  (
    'i2h6g0f4-e8d2-c6b0-4e8d-2c6b0a4e8d2c',
    'c8b2e7f5-c6d4-4e3b-8b2a-7b6c5d4e3f2c',
    NOW() - INTERVAL '30 minutes',
    16716417000195,
    'a711da3d-ad7d-4d93-9c64-0a3957c5b418'
  );

-- Add measurement items using existing tipos_medicao
DO $$
DECLARE
  temp_tipo_id uuid;
  umid_tipo_id uuid;
  press_tipo_id uuid;
  ruido_tipo_id uuid;
BEGIN
  -- Get existing tipos_medicao IDs
  SELECT id INTO temp_tipo_id FROM tipos_medicao WHERE nome = 'Temperatura' LIMIT 1;
  SELECT id INTO umid_tipo_id FROM tipos_medicao WHERE nome = 'Umidade' LIMIT 1;
  SELECT id INTO press_tipo_id FROM tipos_medicao WHERE nome = 'Pressão' LIMIT 1;
  SELECT id INTO ruido_tipo_id FROM tipos_medicao WHERE nome = 'Ruído' LIMIT 1;

  -- Insert measurement items
  INSERT INTO medicao_items (medicao_id, tipo_medicao_id, tipo_medicao_nome, parametro, valor)
  VALUES
    (
      'h3g7f1e5-d9c3-b7a1-5f9e-3d7c1b5a9f3e',
      temp_tipo_id,
      'Temperatura',
      'Temperatura Ambiente',
      25.5
    ),
    (
      'h3g7f1e5-d9c3-b7a1-5f9e-3d7c1b5a9f3e',
      umid_tipo_id,
      'Umidade',
      'Umidade Relativa',
      65.0
    ),
    (
      'i2h6g0f4-e8d2-c6b0-4e8d-2c6b0a4e8d2c',
      press_tipo_id,
      'Pressão',
      'Pressão Atmosférica',
      1013.25
    ),
    (
      'i2h6g0f4-e8d2-c6b0-4e8d-2c6b0a4e8d2c',
      ruido_tipo_id,
      'Ruído',
      'Nível de Ruído',
      75.8
    );
END $$;