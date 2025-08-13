import React, { useState, useEffect } from 'react';
import { getSupabase } from '../lib/supabase';
import { Loader2, X } from 'lucide-react';
import { useAuth } from './AuthProvider';

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
      } else {
        // Modo de criação
        setNomeArea('');
        setClienteId(selectedClientId || '');
        setDescricao('');
        setLocalizacao('');
        setObservacao('');
      }
    }
  }, [isOpen, areaData, selectedClientId]);

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
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
            {areaData ? 'Editar Área de Trabalho' : 'Nova Área de Trabalho'}
          </h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
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

            <div>
              <label htmlFor="descricao" className="block text-sm font-medium text-gray-700 mb-2">
                Descrição
              </label>
              <textarea
                id="descricao"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                rows={3}
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
                rows={4}
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
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="Observações adicionais sobre a área"
                disabled={loading}
              />
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
                  areaData ? 'Atualizar' : 'Criar Área'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}