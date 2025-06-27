/*
  # Add photo data for existing collection points

  1. Changes
    - Add measurements with photos for existing collection points
    - Add corresponding photo records
    - Use realistic timestamps and values
*/

DO $$ 
DECLARE
  _ponto_id uuid;
  _medicao_id uuid;
  _medicao_item_id uuid;
  _target_date timestamp with time zone;
BEGIN
  -- Get an existing collection point
  SELECT id INTO _ponto_id
  FROM ponto_de_coleta
  WHERE nome = 'Ponto A1'
  LIMIT 1;

  IF FOUND THEN
    -- Set target date to March 15th, 2025
    _target_date := '2025-03-15 09:30:00+00'::timestamp with time zone;

    -- Create measurement
    INSERT INTO medicao (
      ponto_de_coleta_id,
      data_hora_medicao,
      cliente_id,
      area_de_trabalho_id
    ) VALUES (
      _ponto_id,
      _target_date,
      16716417000195,
      (SELECT area_de_trabalho_id FROM ponto_de_coleta WHERE id = _ponto_id)
    ) RETURNING id INTO _medicao_id;

    -- Add measurement item for photo
    INSERT INTO medicao_items (
      medicao_id,
      parametro,
      valor,
      tipo_medicao_id,
      tipo_medicao_nome
    ) VALUES (
      _medicao_id,
      'Foto do Local',
      1,  -- Using 1 to indicate photo exists
      '300ad69c-268b-4a5f-befc-fbaee3a110cc',  -- Photo type ID
      'Foto'
    ) RETURNING id INTO _medicao_item_id;

    -- Add photo record
    INSERT INTO medicao_photos (
      medicao_item_id,
      photo_url,
      thumbnail_url
    ) VALUES (
      _medicao_item_id,
      'https://images.unsplash.com/photo-1590959651373-a3db37906963?w=1200',  -- Industrial equipment
      'https://images.unsplash.com/photo-1590959651373-a3db37906963?w=300'
    );

    -- Add another measurement for Ponto A2
    SELECT id INTO _ponto_id
    FROM ponto_de_coleta
    WHERE nome = 'Ponto A2'
    LIMIT 1;

    IF FOUND THEN
      -- Create measurement
      INSERT INTO medicao (
        ponto_de_coleta_id,
        data_hora_medicao,
        cliente_id,
        area_de_trabalho_id
      ) VALUES (
        _ponto_id,
        _target_date + interval '2 hours',
        16716417000195,
        (SELECT area_de_trabalho_id FROM ponto_de_coleta WHERE id = _ponto_id)
      ) RETURNING id INTO _medicao_id;

      -- Add measurement item for photo
      INSERT INTO medicao_items (
        medicao_id,
        parametro,
        valor,
        tipo_medicao_id,
        tipo_medicao_nome
      ) VALUES (
        _medicao_id,
        'Foto do Local',
        1,
        '300ad69c-268b-4a5f-befc-fbaee3a110cc',
        'Foto'
      ) RETURNING id INTO _medicao_item_id;

      -- Add photo record
      INSERT INTO medicao_photos (
        medicao_item_id,
        photo_url,
        thumbnail_url
      ) VALUES (
        _medicao_item_id,
        'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=1200',  -- Industrial pipes
        'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=300'
      );
    END IF;
  END IF;
END $$;