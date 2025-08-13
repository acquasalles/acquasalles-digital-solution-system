import React, { useState, useEffect } from 'react';
import { getSupabase } from '../lib/supabase';
import { Loader2, X } from 'lucide-react';

interface PontoDeColeta {
  id: string;
  nome: string;
  descricao?: string;
  localizacao?: any;
  tipos_medicao?: string[];
}

interface TipoMedicao {
  id: string;
  nome: string;
}

interface PontoDeColetaFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  areaId: string;
  clienteId: string; // ID do cliente para políticas RLS
  pontoData?: PontoDeColeta | null;
}

export function PontoDeColetaFormModal({
  isOpen,
  onClose,
  onSave,
  areaId,
  clienteId,
  pontoData,
}: PontoDeColetaFormModalProps) {
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [localizacao, setLocalizacao] = useState('');
  const [selectedTiposMedicao, setSelectedTiposMedicao] = useState<string[]>([]);
  const [availableTiposMedicao, setAvailableTiposMedicao] = useState<TipoMedicao[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      fetchTiposMedicao();
      if (pontoData) {
        // Modo de edição
        setNome(pontoData.nome);
        setDescricao(pontoData.descricao || '');
        setLocalizacao(pontoData.localizacao ? JSON.stringify(pontoData.localizacao, null, 2) : '');
        setSelectedTiposMedicao(pontoData.tipos_medicao || []);
      } else {
        // Modo de criação
        setNome('');
        setDescricao('');
        setLocalizacao('');
        setSelectedTiposMedicao([]);
      }
    }
  }, [isOpen, pontoData]);

  const fetchTiposMedicao = async () => {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('tipos_medicao')
        .select('id, nome')
        .order('nome', { ascending: true });

      if (error) throw error;
      setAvailableTiposMedicao(data || []);
    } catch (err: any) {
      console.error('Erro ao buscar tipos de medição:', err);
      setError('Erro ao carregar tipos de medição.');
    }
  };

  const handleTipoMedicaoToggle = (tipoId: string) => {
    setSelectedTiposMedicao(prev => {
      if (prev.includes(tipoId)) {
        return prev.filter(id => id !== tipoId);
      } else {
        return [...prev, tipoId];
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!nome.trim()) {
      setError('Nome do Ponto de Coleta é obrigatório.');
      setLoading(false);
      return;
    }

    try {
      const supabase = getSupabase();
      let dataToSave: any = {
        nome: nome.trim(),
        descricao: descricao.trim() || null,
        tipos_medicao: selectedTiposMedicao,
        area_de_trabalho_id: areaId,
        cliente_id: parseInt(clienteId),
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

      if (pontoData) {
        // Atualizar ponto existente
        const { error } = await supabase
          .from('ponto_de_coleta')
          .update(dataToSave)
          .eq('id', pontoData.id);

        if (error) throw error;
      } else {
        // Criar novo ponto
        const { error } = await supabase
          .from('ponto_de_coleta')
          .insert([dataToSave]);

        if (error) throw error;
      }

      onSave();
      onClose();
    } catch (err: any) {
      console.error('Erro ao salvar ponto de coleta:', err);
      setError(err.message || 'Erro ao salvar ponto de coleta.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="relative p-6">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 z-10"
            disabled={loading}
          >
            <X className="h-6 w-6" />
          </button>
          
          <h2 className="text-2xl font-bold mb-6 text-gray-800 pr-8">
            {pontoData ? 'Editar Ponto de Coleta' : 'Novo Ponto de Coleta'}
          </h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="nomePonto" className="block text-sm font-medium text-gray-700 mb-2">
                Nome do Ponto <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="nomePonto"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="Digite o nome do ponto de coleta"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="descricaoPonto" className="block text-sm font-medium text-gray-700 mb-2">
                Descrição
              </label>
              <textarea
                id="descricaoPonto"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                rows={1}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="Descrição detalhada do ponto de coleta"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="localizacaoPonto" className="block text-sm font-medium text-gray-700 mb-2">
                Localização (JSON)
              </label>
              <textarea
                id="localizacaoPonto"
                value={localizacao}
                onChange={(e) => setLocalizacao(e.target.value)}
                rows={1}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                placeholder='Exemplo: {"latitude": -23.5505, "longitude": -46.6333}'
                disabled={loading}
              />
              <p className="mt-1 text-sm text-gray-500">
                Formato JSON opcional para dados de localização
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Tipos de Medição
              </label>
              <p className="mt-1 text-sm text-gray-500">
                Selecione os tipos de medição que serão coletados neste ponto
              </p>
              <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-md p-3 bg-gray-50">
                {availableTiposMedicao.length > 0 ? (
                  <div className="space-y-2">
                    {availableTiposMedicao.map((tipo) => (
                      <div key={tipo.id} className="flex items-center">
                        <input
                          type="checkbox"
                          id={`tipo-${tipo.id}`}
                          checked={selectedTiposMedicao.includes(tipo.id)}
                          onChange={() => handleTipoMedicaoToggle(tipo.id)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          disabled={loading}
                        />
                        <label
                          htmlFor={`tipo-${tipo.id}`}
                          className="ml-2 text-sm text-gray-700 cursor-pointer"
                        >
                          {tipo.nome}
                        </label>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Carregando tipos de medição...</p>
                )}
              </div>
              
            </div>

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
                  pontoData ? 'Atualizar Ponto' : 'Criar Ponto'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}