import React, { useState, useEffect } from 'react';
import { getSupabase } from '../lib/supabase';
import { useAuth } from './AuthProvider';
import { Loader2, MapPin, Plus, Pencil, Trash2, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Navigation } from './Navigation';
import { useClients } from '../lib/ClientsContext';

interface AreaDeTrabalho {
  id: string;
  nome_area: string;
  cliente_id: string;
  cliente_nome?: string;
  localizacao?: any;
  descricao?: string;
  observacao?: string;
  created_at: string;
}

export function AreasDeTrabalhoPage() {
  const [areas, setAreas] = useState<AreaDeTrabalho[]>([]);
  const [filteredAreas, setFilteredAreas] = useState<AreaDeTrabalho[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, isAdmin } = useAuth();
  const { clients, fetchClients } = useClients();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (!isAdmin) {
      navigate('/admin');
      return;
    }

    fetchData();
    fetchClients();
  }, [user, isAdmin, navigate]);

  useEffect(() => {
    const filtered = areas.filter(area =>
      area.nome_area.toLowerCase().includes(searchTerm.toLowerCase()) ||
      area.cliente_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      area.descricao?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredAreas(filtered);
  }, [areas, searchTerm]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const supabase = getSupabase();
      
      const { data, error } = await supabase
        .from('area_de_trabalho')
        .select(`
          id,
          nome_area,
          cliente_id,
          localizacao,
          descricao,
          observacao,
          created_at,
          clientes!area_de_trabalho_cliente_id_fkey(razao_social)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const areasWithClientNames = data?.map(area => ({
        ...area,
        cliente_nome: area.clientes?.razao_social || 'Cliente não encontrado'
      })) || [];

      setAreas(areasWithClientNames);
    } catch (error) {
      console.error('Erro ao buscar áreas de trabalho:', error);
      setError('Erro ao carregar áreas de trabalho');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, nomeArea: string) => {
    if (!confirm(`Tem certeza que deseja excluir a área "${nomeArea}"?`)) return;

    setLoading(true);
    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('area_de_trabalho')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await fetchData();
    } catch (error) {
      console.error('Erro ao excluir área:', error);
      setError('Erro ao excluir área de trabalho');
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
              onClick={() => {/* TODO: Implementar modal de criação */}}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nova Área
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Pesquisar áreas de trabalho..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
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
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Descrição
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data de Criação
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAreas.map((area) => (
                  <tr key={area.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <MapPin className="h-5 w-5 text-gray-400 mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {area.nome_area}
                          </div>
                          {area.observacao && (
                            <div className="text-sm text-gray-500">
                              {area.observacao}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{area.cliente_nome}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {area.descricao || 'Sem descrição'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(area.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => {/* TODO: Implementar modal de edição */}}
                          className="text-blue-600 hover:text-blue-900 p-1"
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(area.id, area.nome_area)}
                          className="text-red-600 hover:text-red-900 p-1"
                          title="Excluir"
                          disabled={loading}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredAreas.length === 0 && !loading && (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                      {searchTerm ? 'Nenhuma área encontrada' : 'Nenhuma área de trabalho cadastrada'}
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
              <div className="text-sm text-blue-700">Total de Áreas</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-900">
                {new Set(areas.map(a => a.cliente_id)).size}
              </div>
              <div className="text-sm text-green-700">Clientes Ativos</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-purple-900">
                {filteredAreas.length}
              </div>
              <div className="text-sm text-purple-700">Áreas Filtradas</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}