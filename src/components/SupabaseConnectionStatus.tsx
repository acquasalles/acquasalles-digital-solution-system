import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, RefreshCw, Database, Settings } from 'lucide-react';
import { validateSupabaseConfig, clearSupabaseCache } from '../lib/supabaseConfig';
import { getSupabase } from '../lib/supabase';

export function SupabaseConnectionStatus() {
  const [connectionStatus, setConnectionStatus] = useState<{
    isConnected: boolean;
    projectId: string | null;
    errors: string[];
    isLoading: boolean;
  }>({
    isConnected: false,
    projectId: null,
    errors: [],
    isLoading: true
  });

  const checkConnection = async () => {
    setConnectionStatus(prev => ({ ...prev, isLoading: true }));
    
    try {
      // Validar configuração
      const configValidation = validateSupabaseConfig();
      
      if (!configValidation.isValid) {
        setConnectionStatus({
          isConnected: false,
          projectId: null,
          errors: configValidation.errors,
          isLoading: false
        });
        return;
      }

      // Testar conexão
      const supabase = getSupabase();
      const { data, error } = await supabase.from('clientes').select('count').limit(1);
      
      if (error) {
        setConnectionStatus({
          isConnected: false,
          projectId: null,
          errors: [`Erro de conexão: ${error.message}`],
          isLoading: false
        });
        return;
      }

      // Extrair project ID da URL
      const url = import.meta.env.VITE_SUPABASE_URL;
      const projectId = url ? url.split('//')[1]?.split('.')[0] : null;

      setConnectionStatus({
        isConnected: true,
        projectId,
        errors: [],
        isLoading: false
      });

    } catch (error) {
      setConnectionStatus({
        isConnected: false,
        projectId: null,
        errors: [`Erro inesperado: ${error instanceof Error ? error.message : 'Erro desconhecido'}`],
        isLoading: false
      });
    }
  };

  useEffect(() => {
    checkConnection();
  }, []);

  const handleDisconnect = () => {
    if (confirm('Tem certeza que deseja desconectar do Supabase atual? Isso limpará todos os dados locais.')) {
      clearSupabaseCache();
      alert('Desconectado com sucesso! Atualize as variáveis de ambiente no arquivo .env e recarregue a página.');
    }
  };

  const handleReconnect = () => {
    clearSupabaseCache();
    window.location.reload();
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Database className="h-5 w-5 mr-2" />
          Status da Conexão Supabase
        </h3>
        <button
          onClick={checkConnection}
          disabled={connectionStatus.isLoading}
          className="flex items-center px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 mr-1 ${connectionStatus.isLoading ? 'animate-spin' : ''}`} />
          Verificar
        </button>
      </div>

      {connectionStatus.isLoading ? (
        <div className="flex items-center text-gray-600">
          <RefreshCw className="h-4 w-4 animate-spin mr-2" />
          Verificando conexão...
        </div>
      ) : connectionStatus.isConnected ? (
        <div className="space-y-3">
          <div className="flex items-center text-green-700">
            <CheckCircle className="h-5 w-5 mr-2" />
            Conectado com sucesso
          </div>
          
          {connectionStatus.projectId && (
            <div className="text-sm text-gray-600">
              <strong>Projeto ID:</strong> {connectionStatus.projectId}
            </div>
          )}
          
          <div className="flex space-x-3">
            <button
              onClick={handleDisconnect}
              className="flex items-center px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
            >
              <Settings className="h-4 w-4 mr-2" />
              Desconectar
            </button>
            
            <button
              onClick={handleReconnect}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reconectar
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center text-red-700">
            <AlertTriangle className="h-5 w-5 mr-2" />
            Não conectado
          </div>
          
          {connectionStatus.errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded p-3">
              <div className="text-sm text-red-700">
                <strong>Erros encontrados:</strong>
                <ul className="mt-1 list-disc list-inside">
                  {connectionStatus.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          
          <div className="bg-blue-50 border border-blue-200 rounded p-3">
            <div className="text-sm text-blue-700">
              <strong>Para conectar a um novo projeto:</strong>
              <ol className="mt-1 list-decimal list-inside space-y-1">
                <li>Acesse <a href="https://supabase.com/dashboard" target="_blank" className="underline">supabase.com/dashboard</a></li>
                <li>Selecione ou crie um novo projeto</li>
                <li>Vá em Settings → API</li>
                <li>Copie a URL do projeto e a anon key</li>
                <li>Atualize o arquivo .env com os novos valores</li>
                <li>Clique em "Reconectar" abaixo</li>
              </ol>
            </div>
          </div>
          
          <button
            onClick={handleReconnect}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar Reconectar
          </button>
        </div>
      )}
    </div>
  );
}