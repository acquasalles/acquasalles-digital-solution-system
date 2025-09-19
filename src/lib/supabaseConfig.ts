// Configuração centralizada do Supabase
export const supabaseConfig = {
  url: import.meta.env.VITE_SUPABASE_URL,
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
};

// Função para validar se as variáveis de ambiente estão configuradas
export function validateSupabaseConfig(): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!supabaseConfig.url) {
    errors.push('VITE_SUPABASE_URL não está definida');
  }
  
  if (!supabaseConfig.anonKey) {
    errors.push('VITE_SUPABASE_ANON_KEY não está definida');
  }
  
  if (supabaseConfig.url && !supabaseConfig.url.includes('supabase.co')) {
    errors.push('VITE_SUPABASE_URL parece inválida');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// Função para limpar cache e reconectar
export function clearSupabaseCache() {
  // Limpar localStorage
  localStorage.clear();
  
  // Limpar sessionStorage
  sessionStorage.clear();
  
  console.log('Cache do Supabase limpo. Recarregue a página para conectar ao novo projeto.');
}