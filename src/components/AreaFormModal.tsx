import React, { useState, useEffect } from 'react';
import { getSupabase } from '../lib/supabase';
import { Loader2, X, Plus, Pencil, Trash2, MapPin } from 'lucide-react';
import { PontoDeColetaFormModal } from './PontoDeColetaFormModal';

interface AreaDeTrabalho {
  id: string;
  nome_area: string;
  cliente_id: string;
  descricao?: string;
  localizacao?: any;
  observacao?: string;
}

interface Client {
  id: string;
  razao_social: string;
  cidade: string;
}

interface AreaFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  areaData?: AreaDeTrabalho | null;
  selectedClientId?: string;
  clients: Client[];
}

interface PontoDeColeta {
  id: string;
  nome: string;
  descricao?: string;
  tipos_medicao?: string[];
  tipos_medicao_names?: string[];
}

interface TipoMedicao {
  id: string;
  nome: string;
}

export function AreaFormModal({
  isOpen,
  onClose,
  onSave,
  areaData,
  selectedClientId,
  clients,
}: AreaFormModalProps) {
  const [nomeArea, setNomeArea] = useState('');
  const [clienteId, setClienteId] = useState('');
  const [descricao, setDescricao] = useState('');
  const [localizacao, setLocalizacao] = useState('');
  const [observacao, setObservacao] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estados para pontos de coleta
  const [pontosDeColeta, setPontosDeColeta] = useState<PontoDeColeta[]>([]);
  const [loadingPontos, setLoadingPontos] = useState(false);
  const [tiposMedicaoMap, setTiposMedicaoMap] = useState<Map<string, string>>(new Map());
  
  // Estados para modal de ponto de coleta
  const [showPontoModal, setShowPontoModal] = useState(false);
  const [editingPonto, setEditingPonto] = useState<PontoDeColeta | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (areaData) {
        // Modo de edição
        setNomeArea(areaData.nome_area);
        setClienteId(areaData.cliente_id);
        setDescricao(areaData.descricao || '');
        setLocalizacao(areaData.localizacao ? JSON.stringify(areaData.localizacao, null, 2) : '');
        setObservacao(areaData.observacao || '');
        fetchPontosAndTipos(areaData.id);
      } else {
        // Modo de criação
        setNomeArea('');
        setClienteId(selectedClientId || '');
        setDescricao('');
        setLocalizacao('');
        setObservacao('');
        setPontosDeColeta([]);
      }
    }
  }, [isOpen, areaData, selectedClientId]);

  const fetchPontosAndTipos = async (areaId: string) => {
    setLoadingPontos(true);
    try {
      const supabase = getSupabase();

      // Buscar todos os tipos de medição para mapear IDs para nomes
      const { data: tiposData, error: tiposError } = await supabase
        .from('tipos_medicao')
        .select('id, nome');

      if (tiposError) throw tiposError;

      const newTiposMap = new Map<string, string>();
      (tiposData || []).forEach((tipo: TipoMedicao) => newTiposMap.set(tipo.id, tipo.nome));
      setTiposMedicaoMap(newTiposMap);

      // Buscar os pontos de coleta para esta área
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

      const pontosComNomes = (pontosData || []).map(ponto => ({
        ...ponto,
       tipos_medicao: ponto.tipos_medicao || [], // Garantir que o array original seja preservado
        tipos_medicao_names: (ponto.tipos_medicao || []).map((tipoId: string) =>
          newTiposMap.get(tipoId) || tipoId
        )
      }));
      setPontosDeColeta(pontosComNomes);

    } catch (err: any) {
      console.error('Erro ao buscar pontos de coleta ou tipos de medição:', err);
      setError('Erro ao carregar pontos de coleta.');
    } finally {
      setLoadingPontos(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!nomeArea.trim() || !clienteId) {
      setError('Nome da Área e Cliente são obrigatórios.');
      setLoading(false);
      return;
    }

    try {
      const supabase = getSupabase();
      let dataToSave: any = {
        nome_area: nomeArea.trim(),
        cliente_id: parseInt(clienteId),
        descricao: descricao.trim() || null,
        observacao: observacao.trim() || null,
      };

      if (localizacao.trim()) {
        try {
          dataToSave.localizacao = JSON.parse(localizacao);
        } catch (jsonError) {
          setError('Formato de Localização inválido. Deve ser um JSON válido.');
          setLoading(false);
          return;
        }
      } else {
        dataToSave.localizacao = null;
      }

      if (areaData) {
        // Atualizar área existente
        const { error } = await supabase
          .from('area_de_trabalho')
          .update(dataToSave)
          .eq('id', areaData.id);

        if (error) throw error;
      } else {
        // Criar nova área
        const { error } = await supabase
          .from('area_de_trabalho')
          .insert([dataToSave]);

        if (error) throw error;
      }

      onSave();
      onClose();
    } catch (err: any) {
      console.error('Erro ao salvar área:', err);
      setError(err.message || 'Erro ao salvar área de trabalho.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPonto = () => {
    setEditingPonto(null);
    setShowPontoModal(true);
  };

  const handleEditPonto = (ponto: PontoDeColeta) => {
    setEditingPonto(ponto);
    setShowPontoModal(true);
  };

  const handleDeletePonto = async (pontoId: string, pontoNome: string) => {
    if (!confirm(`Tem certeza que deseja excluir o ponto de coleta "${pontoNome}"?`)) return;
    
    setLoadingPontos(true);
    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('ponto_de_coleta')
        .delete()
        .eq('id', pontoId);

      if (error) throw error;
      
      if (areaData?.id) {
        await fetchPontosAndTipos(areaData.id);
      }
    } catch (err: any) {
      console.error('Erro ao excluir ponto de coleta:', err);
      setError(err.message || 'Erro ao excluir ponto de coleta.');
    } finally {
      setLoadingPontos(false);
    }
  };

  const handleSavePonto = async () => {
    setShowPontoModal(false);
    if (areaData?.id) {
      await fetchPontosAndTipos(areaData.id);
    }
  };

  if (!isOpen) return null;

  console.log('Modal rendering with isOpen:', isOpen);

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="relative p-6">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 z-10"
              disabled={loading}
            >
              <X className="h-6 w-6" />
            </button>
            
            <h2 className="text-2xl font-bold mb-6 text-gray-800 pr-8">
              {areaData ? 'Editar Área de Trabalho' : 'Nova Área de Trabalho'}
            </h2>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Seção de Dados da Área */}
              <div className="border-b pb-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Dados da Área</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="nomeArea" className="block text-sm font-medium text-gray-700 mb-2">
                      Nome da Área <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="nomeArea"
                      value={nomeArea}
                      onChange={(e) => setNomeArea(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Digite o nome da área de trabalho"
                      required
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label htmlFor="clienteId" className="block text-sm font-medium text-gray-700 mb-2">
                      Cliente <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="clienteId"
                      value={clienteId}
                      onChange={(e) => setClienteId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      required
                      disabled={loading}
                    >
                      <option value="">Selecione um cliente</option>
                      {clients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.razao_social} - {client.cidade}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="descricao" className="block text-sm font-medium text-gray-700 mb-2">
                    Descrição
                  </label>
                  <textarea
                    id="descricao"
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    rows={1}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Descrição detalhada da área de trabalho"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label htmlFor="localizacao" className="block text-sm font-medium text-gray-700 mb-2">
                    Localização (JSON)
                  </label>
                  <textarea
                    id="localizacao"
                    value={localizacao}
                    onChange={(e) => setLocalizacao(e.target.value)}
                    rows={1}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                    placeholder='Exemplo: {"latitude": -23.5505, "longitude": -46.6333, "endereco": "Rua Exemplo, 123"}'
                    disabled={loading}
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Formato JSON opcional para dados de localização
                  </p>
                </div>

                <div>
                  <label htmlFor="observacao" className="block text-sm font-medium text-gray-700 mb-2">
                    Observação
                  </label>
                  <textarea
                    id="observacao"
                    value={observacao}
                    onChange={(e) => setObservacao(e.target.value)}
                    rows={1}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Observações adicionais sobre a área"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Seção de Pontos de Coleta (visível apenas em modo de edição) */}
              {areaData && (
                <div className="pt-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">Pontos de Coleta</h3>
                    <button
                      type="button"
                      onClick={handleAddPonto}
                      className="bg-green-600 text-white px-3 py-1.5 rounded-md text-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 flex items-center"
                      disabled={loadingPontos}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Adicionar Ponto
                    </button>
                  </div>

                  {loadingPontos ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-blue-600 mr-2" />
                      <span className="text-sm text-gray-600">Carregando pontos de coleta...</span>
                    </div>
                  ) : pontosDeColeta.length > 0 ? (
                    <div className="overflow-x-auto border border-gray-200 rounded-md">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Nome
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Tipos de Medição
                            </th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Ações
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {pontosDeColeta.map((ponto) => (
                            <tr key={ponto.id}>
                              <td className="px-4 py-2 whitespace-nowrap">
                                <div>
                                  <div className="text-sm font-medium text-gray-900">{ponto.nome}</div>
                                  {ponto.descricao && (
                                    <div className="text-xs text-gray-500 mt-1">{ponto.descricao}</div>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-2">
                                <div className="flex flex-wrap gap-1">
                                  {ponto.tipos_medicao_names && ponto.tipos_medicao_names.length > 0 ? (
                                    ponto.tipos_medicao_names.map((tipo, idx) => (
                                      <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                        {tipo}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-gray-500 text-xs">Nenhum tipo configurado</span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-right text-sm font-medium">
                                <div className="flex items-center justify-end space-x-2">
                                  <button
                                    type="button"
                                    onClick={() => handleEditPonto(ponto)}
                                    className="text-blue-600 hover:text-blue-900 p-1"
                                    title="Editar Ponto"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeletePonto(ponto.id, ponto.nome)}
                                    className="text-red-600 hover:text-red-900 p-1"
                                    title="Excluir Ponto"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-gray-500 border border-gray-200 rounded-md bg-gray-50">
                      <MapPin className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm">Nenhum ponto de coleta cadastrado para esta área.</p>
                      <button
                        type="button"
                        onClick={handleAddPonto}
                        className="mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Clique aqui para adicionar o primeiro ponto
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-blue-400"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center">
                      <Loader2 className="animate-spin h-4 w-4 mr-2" />
                      Salvando...
                    </span>
                  ) : (
                    areaData ? 'Atualizar' : 'Criar Área'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Modal de Ponto de Coleta */}
        {areaData && (
          <PontoDeColetaFormModal
            isOpen={showPontoModal}
            onClose={() => setShowPontoModal(false)}
            onSave={handleSavePonto}
            areaId={areaData.id}
            clienteId={areaData.cliente_id}
            pontoData={editingPonto}
          />
        )}
      </div>
      
      {/* Modal de Ponto de Coleta */}
      {areaData && (
        <PontoDeColetaFormModal
          isOpen={showPontoModal}
          onClose={() => setShowPontoModal(false)}
          onSave={handleSavePonto}
          areaId={areaData.id}
          clienteId={clienteId}
          pontoData={editingPonto}
        />
      )}
    </>
  );
}