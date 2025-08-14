import React, { useState, useEffect } from 'react';
import { useCallback } from 'react';
import { getSupabase } from '../lib/supabase';
import { useAuth } from './AuthProvider';
import { Loader2, MapPin, Plus, Pencil, Trash2, ChevronDown, ChevronRight, AlertTriangle, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Navigation } from './Navigation';
import { useClients } from '../lib/ClientsContext';
import { AreaFormModal } from './AreaFormModal';

interface AreaDeTrabalho {
  id: string;
  nome_area: string;
  cliente_id: string;
  ponto_de_coleta_count: number;
  descricao?: string;
  localizacao?: any;
  observacao?: string;
}

interface PontoDeColeta {
  id: string;
  nome: string;
  descricao?: string;
  tipos_medicao_names?: string[];
}

export function AreasDeTrabalhoPage() {
  const [areas, setAreas] = useState<AreaDeTrabalho[]>([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [expandedAreaId, setExpandedAreaId] = useState<string | null>(null);
  const [expandedAreaPoints, setExpandedAreaPoints] = useState<PontoDeColeta[]>([]);
  const [loadingPoints, setLoadingPoints] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, isAdmin } = useAuth();
  const { clients, fetchClients } = useClients();
  const navigate = useNavigate();

  // Estados para o modal de área
  const [showAreaModal, setShowAreaModal] = useState(false);
  const [editingArea, setEditingArea] = useState<AreaDeTrabalho | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (!isAdmin) {
      console.log('User is not admin, redirecting to /admin');
      navigate('/admin');
      return;
    }

    fetchClients();
  }, [user, isAdmin, navigate]);

  useEffect(() => {
    if (selectedClient) {
      fetchData();
    } else {
      setAreas([]);
    }
  }, [selectedClient]);

  const fetchData = useCallback(async () => {
    if (!selectedClient) return;
    
    setLoading(true);
    try {
      const supabase = getSupabase();
      
      const { data, error } = await supabase
        .from('area_de_trabalho')
        .select(`
          id,
          nome_area,
          cliente_id,
          descricao,
          localizacao,
          observacao,
          ponto_de_coleta(count)
        `)
        .eq('cliente_id', selectedClient)
        .order('nome_area', { ascending: true });

      if (error) throw error;

      // Mapear os dados para incluir a contagem de pontos de coleta
      const areasWithCount = (data || []).map(area => ({
        id: area.id,
        nome_area: area.nome_area,
        cliente_id: area.cliente_id,
        descricao: area.descricao,
        localizacao: area.localizacao,
        observacao: area.observacao,
        ponto_de_coleta_count: area.ponto_de_coleta?.[0]?.count || 0
      }));

      setAreas(areasWithCount);
    } catch (error) {
      console.error('Erro ao buscar áreas de trabalho:', error);
      setError('Erro ao carregar áreas de trabalho');
    } finally {
      setLoading(false);
    }
  }, [selectedClient]);

  const fetchPontosDeColeta = async (areaId: string) => {
    setLoadingPoints(true);
    try {
      const supabase = getSupabase();
      
      // Primeiro buscar os pontos de coleta com seus tipos_medicao (IDs)
      const { data: pontosData, error: pontosError } = await supabase
        .from('ponto_de_coleta')
        .select(`
          id,
          nome,
          descricao,
          tipos_medicao
        `)
        .eq('area_de_trabalho_id', areaId)
        .order('nome', { ascending: true });

      if (pontosError) throw pontosError;

      // Buscar todos os tipos de medição para mapear IDs para nomes
      const { data: tiposData, error: tiposError } = await supabase
        .from('tipos_medicao')
        .select('id, nome');

      if (tiposError) throw tiposError;

      // Criar mapa de ID -> nome
      const tiposMap = new Map(
        (tiposData || []).map(tipo => [tipo.id, tipo.nome])
      );

      // Mapear os pontos com os nomes dos tipos de medição
      const pontosComNomes = (pontosData || []).map(ponto => ({
        id: ponto.id,
        nome: ponto.nome,
        descricao: ponto.descricao,
        tipos_medicao_names: (ponto.tipos_medicao || []).map((tipoId: string) => 
          tiposMap.get(tipoId) || tipoId
        )
      }));

      setExpandedAreaPoints(pontosComNomes);
    } catch (error) {
      console.error('Erro ao buscar pontos de coleta:', error);
      setError('Erro ao carregar pontos de coleta');
    } finally {
      setLoadingPoints(false);
    }
  };

  const handleOpenCreateAreaModal = () => {
    console.log('Opening create modal');
    setEditingArea(null);
    setShowAreaModal(true);
  };

  const handleOpenEditAreaModal = (area: AreaDeTrabalho) => {
    console.log('Opening edit modal for:', area);
    setEditingArea(area);
    setShowAreaModal(true);
  };

  const handleSaveArea = useCallback(() => {
    console.log('Saving area');
    fetchData();
  }, [fetchData]);

  const handleRowClick = async (areaId: string) => {
    if (expandedAreaId === areaId) {
      // Recolher se já estiver expandida
      setExpandedAreaId(null);
      setExpandedAreaPoints([]);
    } else {
      // Expandir nova área
      setExpandedAreaId(areaId);
      await fetchPontosDeColeta(areaId);
    }
  };

  const handleDelete = async (id: string, nomeArea: string) => {
    const confirmMessage = `⚠️ ATENÇÃO: Esta ação não pode ser desfeita!\n\nTem certeza que deseja excluir a área "${nomeArea}"?\n\nIsto também excluirá todos os pontos de coleta relacionados.`;
    if (!confirm(confirmMessage)) return;

    setLoading(true);
    setError(null); // Limpar erros anteriores
    
    try {
      console.log('Iniciando deleção da área:', { id, nomeArea });
      const supabase = getSupabase();
      
      // Primeiro, verificar se a área existe
      const { data: areaExists, error: checkError } = await supabase
        .from('area_de_trabalho')
        .select('id, nome_area')
        .eq('id', id)
        .maybeSingle();
      
      console.log('Verificação de existência:', { areaExists, checkError });
      
      if (checkError || !areaExists) {
        throw new Error(`Área não encontrada: ${checkError?.message || 'Item não existe'}`);
      }
      
      // Executar a deleção
      const { error } = await supabase
        .from('area_de_trabalho')
        .delete()
        .eq('id', id);

      console.log('Resultado da deleção:', { error });
      
      if (error) throw error;

      // Verificar se realmente foi deletado
      const { data: stillExists, error: verifyError } = await supabase
        .from('area_de_trabalho')
        .select('id')
        .eq('id', id)
        .maybeSingle();
        
      console.log('Verificação pós-deleção:', { stillExists, verifyError });
      
      if (stillExists && !verifyError) {
        throw new Error('A área não foi deletada. Possível problema de permissões.');
      }

      // Mostrar mensagem de sucesso
      alert(`✅ Área "${nomeArea}" excluída com sucesso!`);
      
      // Recarregar dados
      try {
        await fetchData();
      } catch (fetchError) {
        console.error('Erro ao recarregar dados:', fetchError);
        // Não falhar se o reload der erro, pois a deleção já aconteceu
      }
      
      // Se a área expandida foi excluída, fechar expansão
      if (expandedAreaId === id) {
        setExpandedAreaId(null);
        setExpandedAreaPoints([]);
      }
    } catch (error) {
      console.error('Erro ao excluir área:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      setError(`Erro ao excluir área de trabalho: ${errorMessage}`);
      
      // Mostrar alerta com erro específico
      alert(`❌ Erro ao excluir área "${nomeArea}":\n${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading && areas.length === 0) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Navigation />
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="text-lg font-medium text-gray-700">Carregando...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navigation />

      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <MapPin className="h-6 w-6 mr-2 text-blue-600" />
                Áreas de Trabalho
              </h1>
              <p className="text-gray-600 mt-1">
                Gerencie as áreas de trabalho dos clientes
              </p>
            </div>
            <button
              onClick={handleOpenCreateAreaModal}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nova Área
            </button>
          </div>

          {/* Client Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Selecione um Cliente
            </label>
            <select
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Selecione um cliente...</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.razao_social} - {client.cidade}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Areas Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nome da Área
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    # Pontos de Coleta
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {areas.map((area) => (
                  <React.Fragment key={area.id}>
                    <tr 
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleRowClick(area.id)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {expandedAreaId === area.id ? (
                            <ChevronDown className="h-4 w-4 text-gray-400 mr-2" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-gray-400 mr-2" />
                          )}
                          <MapPin className="h-5 w-5 text-gray-400 mr-3" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {area.nome_area}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {area.ponto_de_coleta_count} {area.ponto_de_coleta_count === 1 ? 'ponto' : 'pontos'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation(); // Evita expandir a linha
                              handleOpenEditAreaModal(area);
                            }}
                            className="text-blue-600 hover:text-blue-900 p-1"
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation(); // Evita expandir a linha
                              if (loading) return; // Evita cliques duplos
                              handleDelete(area.id, area.nome_area);
                            }}
                            className={`p-1 transition-colors duration-200 ${
                              loading 
                                ? 'text-gray-400 cursor-not-allowed' 
                                : 'text-red-600 hover:text-red-900 hover:bg-red-50 rounded'
                            }`}
                            title="Excluir"
                            disabled={loading}
                          >
                            {loading ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-gray-600"></div>
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                    
                    {/* Linha expandida com pontos de coleta */}
                    {expandedAreaId === area.id && (
                      <tr className="bg-gray-50">
                        <td colSpan={3} className="px-6 py-4">
                          <div className="border-l-4 border-blue-400 pl-4">
                            <h4 className="text-sm font-medium text-gray-900 mb-3">
                              Pontos de Coleta - {area.nome_area}
                            </h4>
                            
                            {loadingPoints ? (
                              <div className="flex items-center justify-center py-4">
                                <Loader2 className="h-5 w-5 animate-spin text-blue-600 mr-2" />
                                <span className="text-sm text-gray-600">Carregando pontos de coleta...</span>
                              </div>
                            ) : expandedAreaPoints.length > 0 ? (
                              <div className="space-y-2">
                                {expandedAreaPoints.map((ponto) => (
                                  <div key={ponto.id} className="bg-white p-3 rounded-lg border border-gray-200">
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <h5 className="text-sm font-medium text-gray-900">{ponto.nome}</h5>
                                        {ponto.descricao && (
                                          <p className="text-xs text-gray-500 mt-1">{ponto.descricao}</p>
                                        )}
                                        {ponto.tipos_medicao_names && ponto.tipos_medicao_names.length > 0 && (
                                          <div className="flex flex-wrap gap-1 mt-2">
                                            {ponto.tipos_medicao_names.map((tipo, index) => (
                                              <span
                                                key={index}
                                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
                                              >
                                                {tipo}
                                              </span>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                      <div className="text-xs text-gray-400">
                                        ID: {ponto.id.slice(-8)}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-4">
                                <MapPin className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                                <p className="text-sm text-gray-500">
                                  Nenhum ponto de coleta cadastrado para esta área
                                </p>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
                {areas.length === 0 && !loading && selectedClient && (
                  <tr>
                    <td colSpan={3} className="px-6 py-4 text-center text-gray-500">
                      Nenhuma área de trabalho cadastrada para este cliente
                    </td>
                  </tr>
                )}
                {!selectedClient && (
                  <tr>
                    <td colSpan={3} className="px-6 py-4 text-center text-gray-500">
                      Selecione um cliente para visualizar as áreas de trabalho
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-6 bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Estatísticas</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-900">{areas.length}</div>
              <div className="text-sm text-blue-700">Áreas do Cliente</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-900">
                {clients.length}
              </div>
              <div className="text-sm text-green-700">Total de Clientes</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-purple-900">
                {selectedClient ? clients.find(c => c.id === selectedClient)?.razao_social || 'Cliente' : 'Nenhum'}
              </div>
              <div className="text-sm text-purple-700">Cliente Selecionado</div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Criação/Edição de Área */}
      <AreaFormModal
        isOpen={showAreaModal}
        onClose={() => setShowAreaModal(false)}
        onSave={handleSaveArea}
        areaData={editingArea}
        selectedClientId={selectedClient}
        clients={clients}
      />
    </div>
  );
}