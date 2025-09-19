import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, RefreshCw, Database, Settings, Info, ExternalLink } from 'lucide-react';
import { getSupabase } from '../lib/supabase';

interface ProjectAlignment {
  envProjectId: string | null;
  envUrl: string;
  envKey: string;
  isConnected: boolean;
  clientName: string | null;
  hasAcquasallesData: boolean;
  hasSanearData: boolean;
  errors: string[];
  recommendations: string[];
}

export function SupabaseProjectAlignment() {
  const [alignment, setAlignment] = useState<ProjectAlignment | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAlignment = async () => {
    setIsLoading(true);
    
    try {
      const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
      const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
      const envProjectId = envUrl ? envUrl.split('//')[1]?.split('.')[0] : null;
      
      const errors: string[] = [];
      const recommendations: string[] = [];
      let isConnected = false;
      let clientName = null;
      let hasAcquasallesData = false;
      let hasSanearData = false;

      if (!envUrl || !envKey) {
        errors.push('Variáveis de ambiente não configuradas no .env');
      } else {
        try {
          const supabase = getSupabase();
          
          // Test connection
          const { data: testData, error: testError } = await supabase
            .from('clientes')
            .select('count')
            .limit(1);
          
          if (testError) {
            errors.push(`Erro de conexão: ${testError.message}`);
          } else {
            isConnected = true;
            
            // Check for Acquasalles data
            const { data: acquasallesData } = await supabase
              .from('clientes')
              .select('razao_social')
              .ilike('razao_social', '%acquasalles%')
              .limit(1);
            
            hasAcquasallesData = !!(acquasallesData && acquasallesData.length > 0);
            
            // Check for Sanear data
            const { data: sanearData } = await supabase
              .from('clientes')
              .select('razao_social')
              .ilike('razao_social', '%sanear%')
              .limit(1);
            
            hasSanearData = !!(sanearData && sanearData.length > 0);
            
            // Determine which project we're connected to
            if (hasAcquasallesData) {
              clientName = 'Acquasalles';
            } else if (hasSanearData) {
              clientName = 'Sanear';
            }
          }
        } catch (err) {
          errors.push(`Erro de teste: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
        }
      }

      // Generate recommendations
      if (isConnected && clientName === 'Sanear' && !hasAcquasallesData) {
        recommendations.push('⚠️ Você está conectado ao projeto Sanear, mas precisa do Acquasalles');
        recommendations.push('🔄 Desconecte do Sanear no Bolt e conecte ao Acquasalles');
        recommendations.push('📝 Ou atualize o .env para usar as credenciais do Sanear');
      } else if (isConnected && clientName === 'Acquasalles') {
        recommendations.push('✅ Configuração correta - conectado ao Acquasalles');
        recommendations.push('🔄 Certifique-se que o Bolt também está conectado ao mesmo projeto');
      } else if (!isConnected) {
        recommendations.push('❌ Sem conexão - verifique as credenciais no .env');
      }

      setAlignment({
        envProjectId,
        envUrl,
        envKey: envKey ? `${envKey.substring(0, 20)}...` : '',
        isConnected,
        clientName,
        hasAcquasallesData,
        hasSanearData,
        errors,
        recommendations
      });
      
    } catch (error) {
      console.error('Diagnostic error:', error);
      setAlignment({
        envProjectId: null,
        envUrl: '',
        envKey: '',
        isConnected: false,
        clientName: null,
        hasAcquasallesData: false,
        hasSanearData: false,
        errors: ['Erro ao executar diagnóstico'],
        recommendations: []
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAlignment();
  }, []);

  const getStatusColor = () => {
    if (!alignment) return 'border-gray-200 bg-gray-50';
    
    if (alignment.isConnected && alignment.hasAcquasallesData) {
      return 'border-green-200 bg-green-50';
    } else if (alignment.isConnected && alignment.hasSanearData) {
      return 'border-yellow-200 bg-yellow-50';
    } else {
      return 'border-red-200 bg-red-50';
    }
  };

  const getStatusIcon = () => {
    if (!alignment) return <RefreshCw className="h-5 w-5 text-gray-500" />;
    
    if (alignment.isConnected && alignment.hasAcquasallesData) {
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    } else if (alignment.isConnected && alignment.hasSanearData) {
      return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
    } else {
      return <AlertTriangle className="h-5 w-5 text-red-600" />;
    }
  };

  return (
    <div className={`rounded-lg shadow-md p-6 mb-6 border-2 ${getStatusColor()}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          {getStatusIcon()}
          <span className="ml-2">Alinhamento de Projeto Supabase</span>
        </h3>
        <button
          onClick={checkAlignment}
          disabled={isLoading}
          className="flex items-center px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
          Verificar
        </button>
      </div>

      {alignment && (
        <div className="space-y-4">
          {/* Status Atual */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded border">
              <h4 className="font-medium text-gray-900 mb-2">Configuração .env</h4>
              <div className="text-sm space-y-1">
                <div><strong>Projeto ID:</strong> {alignment.envProjectId || 'Não detectado'}</div>
                <div><strong>URL:</strong> {alignment.envUrl || 'Não configurada'}</div>
                <div><strong>Status:</strong> {alignment.isConnected ? '✅ Conectado' : '❌ Desconectado'}</div>
              </div>
            </div>

            <div className="bg-white p-4 rounded border">
              <h4 className="font-medium text-gray-900 mb-2">Dados Detectados</h4>
              <div className="text-sm space-y-1">
                <div><strong>Acquasalles:</strong> {alignment.hasAcquasallesData ? '✅ Encontrado' : '❌ Não encontrado'}</div>
                <div><strong>Sanear:</strong> {alignment.hasSanearData ? '✅ Encontrado' : '❌ Não encontrado'}</div>
                <div><strong>Projeto Ativo:</strong> {alignment.clientName || 'Indeterminado'}</div>
              </div>
            </div>
          </div>

          {/* Erros */}
          {alignment.errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded p-4">
              <h4 className="font-medium text-red-900 mb-2 flex items-center">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Problemas Detectados
              </h4>
              <ul className="text-sm text-red-700 space-y-1">
                {alignment.errors.map((error, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-red-500 mr-2">•</span>
                    {error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recomendações */}
          {alignment.recommendations.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded p-4">
              <h4 className="font-medium text-blue-900 mb-2 flex items-center">
                <Info className="h-4 w-4 mr-2" />
                Recomendações
              </h4>
              <ul className="text-sm text-blue-700 space-y-1">
                {alignment.recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-blue-500 mr-2">•</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Instruções para Alinhar com Acquasalles */}
          <div className="bg-green-50 border border-green-200 rounded p-4">
            <h4 className="font-medium text-green-900 mb-3 flex items-center">
              <Settings className="h-4 w-4 mr-2" />
              Como Alinhar com o Projeto Acquasalles
            </h4>
            <div className="text-sm text-green-800 space-y-2">
              <div className="font-medium">Opção 1: Desconectar Sanear no Bolt (Recomendado)</div>
              <ol className="list-decimal list-inside space-y-1 ml-4">
                <li>Clique no botão "Connect to Supabase" no canto superior direito do Bolt</li>
                <li>Procure por uma opção "Disconnect" ou "Change Project"</li>
                <li>Desconecte do projeto Sanear</li>
                <li>Conecte ao projeto Acquasalles usando as mesmas credenciais do seu .env</li>
              </ol>
              
              <div className="font-medium mt-4">Opção 2: Atualizar .env para Sanear</div>
              <ol className="list-decimal list-inside space-y-1 ml-4">
                <li>Obtenha as credenciais do projeto Sanear no Supabase Dashboard</li>
                <li>Atualize VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env</li>
                <li>Recarregue a página</li>
              </ol>
            </div>
          </div>

          {/* Link para Supabase Dashboard */}
          <div className="flex justify-center">
            <a
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-900 transition-colors"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Abrir Supabase Dashboard
            </a>
          </div>
        </div>
      )}
    </div>
  );
}