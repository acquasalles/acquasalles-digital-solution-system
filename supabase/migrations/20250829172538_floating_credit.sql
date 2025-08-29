```sql
-- Remove todas as versões existentes da função public.update_user_role para evitar ambiguidade
DROP FUNCTION IF EXISTS public.update_user_role(uuid, text);
DROP FUNCTION IF EXISTS public.update_user_role(uuid, text, boolean);

-- Recria a função public.update_user_role com a assinatura esperada pelo frontend
-- e com a lógica robusta para atualizar o status is_admin e invalidar sessões.
CREATE OR REPLACE FUNCTION public.update_user_role(
    target_user_id uuid,
    new_role text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Permite que a função seja executada com os privilégios do definidor (geralmente admin)
AS $$
DECLARE
    current_user_id uuid;
    is_admin_role boolean;
BEGIN
    -- Verifica se o usuário que está chamando a função é um administrador
    SELECT auth.uid() INTO current_user_id;
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = current_user_id AND raw_app_meta_data->>'is_admin' = 'true') THEN
        RAISE EXCEPTION 'Permissão negada: Apenas administradores podem alterar roles de usuários.';
    END IF;

    -- Valida o valor de new_role
    IF new_role NOT IN ('admin', 'user') THEN
        RAISE EXCEPTION 'Valor de role inválido. Deve ser "admin" ou "user".';
    END IF;

    -- Converte a string new_role para booleano para o campo is_admin
    is_admin_role := (new_role = 'admin');

    -- Atualiza o raw_app_meta_data do usuário
    UPDATE auth.users
    SET
        raw_app_meta_data = jsonb_set(
            COALESCE(raw_app_meta_data, '{}'::jsonb), -- Inicializa como objeto vazio se for nulo
            '{is_admin}',
            to_jsonb(is_admin_role),
            true -- Cria a chave se não existir
        )
    WHERE id = target_user_id;

    -- Invalida todas as sessões do usuário alvo para que a nova role seja aplicada imediatamente
    -- Isso é crucial para que as RLS policies e verificações de role funcionem corretamente
    DELETE FROM auth.sessions WHERE user_id = target_user_id;

EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Erro ao atualizar role do usuário: %', SQLERRM;
END;
$$;

-- Concede permissão de execução para usuários autenticados
-- Isso é necessário para que a função possa ser chamada do frontend
GRANT EXECUTE ON FUNCTION public.update_user_role(uuid, text) TO authenticated;

-- Opcional: Revoga permissões de anon se não for desejado que usuários não autenticados chamem
REVOKE EXECUTE ON FUNCTION public.update_user_role(uuid, text) FROM anon;
```