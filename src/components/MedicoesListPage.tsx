import React, { useState, useEffect } from 'react';
import { getSupabase } from '../lib/supabase';
import { useAuth } from './AuthProvider';
import { Loader2, Activity, Calendar, MapPin, Beaker, Search, Filter, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Navigation } from './Navigation';
import { useClients } from '../lib/ClientsContext';
import { format } from 'date-fns';
import { useIntl } from 'react-intl';

interface Medicao {
  id: string;
  data_hora_medicao: string;
  area_de_trabalho: {
    nome_area: string;
  };
  ponto_de_coleta: {
    nome: string;
  };
  medicao_items: Array<{
    parametro: string;
    valor: number;
    tipo_medicao_nome: string;
  }>;
  cliente: {
    razao_social: string;
  };
}

export function MedicoesListPage() {
  const [medicoes, setMedicoes] = useState<Medicao[]>([]);
  const [filteredMedicoes, setFilteredMedicoes] = useState<Medicao[]>([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedArea, setSelectedArea] = useState('');
  const [selectedPonto, setSelectedPonto] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  
  const { user, isAdmin } = useAuth();
  const { clients, fetchClients } = useClients();
  const navigate = useNavigate();
  const intl = useIntl();

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (!isAdmin) {
      navigate('/admin');
      return;
    }

    fetchClients();
  }, [user, isAdmin, navigate, fetchClients]);

  useEffect(() => {
    if (selectedClient) {
      fetchMedicoes();
    } else {
      setMedicoes([]);
      setFilteredMedicoes([]);
    }
  }, [selectedClient, selectedArea, selectedPonto, startDate, endDate]);

  useEffect(() => {
    // Apply filters
    let filtered = medicoes;

    if (searchTerm) {
      filtered = filtered.filter(medicao =>
        medicao.area_de_trabalho.nome_area.toLowerCase().includes(searchTerm.toLowerCase()) ||
        medicao.ponto_de_coleta.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        medicao.medicao_items.some(item => 
          item.parametro.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.tipo_medicao_nome.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    setFilteredMedicoes(filtered);
    setCurrentPage(1);
  }, [medicoes, searchTerm]);

  const fetchMedicoes = async () => {
    setLoading(true);
    setError(null);

    try {
      const supabase = getSupabase();
      let query = supabase
        .from('medicao')
        .select(`
          id,
          data_hora_medicao,
          area_de_trabalho:area_de_trabalho_id (
            nome_area
          ),
          ponto_de_coleta:ponto_de_coleta_id (
            nome
          ),
          medicao_items (
            parametro,
            valor,
            tipo_medicao_nome
          ),
          clientes:cliente_id (
            razao_social
          )
        `)
        .eq('cliente_id', selectedClient)
        .order('data_hora_medicao', { ascending: false });

      if (startDate) {
        query = query.gte('data_hora_medicao', startDate);
      }

      if (endDate) {
        query = query.lte('data_hora_medicao', endDate + 'T23:59:59');
      }

      const { data, error } = await query.limit(1000);

      if (error) throw error;

      setMedicoes(data || []);
    } catch (err: any) {
      console.error('Erro ao buscar medições:', err);
      setError('Erro ao carregar medições');
    } finally {
      setLoading(false);
    }
  };

  // Pagination
  const totalPages = Math.ceil(filteredMedicoes.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedMedicoes = filteredMedicoes.slice(startIndex, startIndex + itemsPerPage);

  const getMeasurementTypeColor = (tipo: string) => {
    const colors: Record<string, string> = {
      'pH': 'bg-blue-100 text-blue-800',
      'Cloro': 'bg-green-100 text-green-800',
      'Turbidez': 'bg-red-100 text-red-800',
      'Vazão': 'bg-yellow-100 text-yellow-800',
      'Hidrômetro': 'bg-purple-100 text-purple-800',
      'Foto': 'bg-gray-100 text-gray-800'
    };
    return colors[tipo] || 'bg-gray-100 text-gray-800';
  };

  if (loading && medicoes.length === 0) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Navigation />
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="text-lg font-medium text-gray-700">Carregando medições...</span>
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
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <Activity className="h-6 w-6 mr-2 text-blue-600" />
                Lista de Medições
              </h1>
              <p className="text-gray-600 mt-1">
                Visualize e gerencie todas as medições registradas no sistema
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cliente
              </label>
              <select
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Todos os clientes</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.razao_social} - {client.cidade}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data Inicial
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data Final
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Buscar
              </label>
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por área, ponto ou parâmetro..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Results Summary */}
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>
              Mostrando {startIndex + 1} a {Math.min(startIndex + itemsPerPage, filteredMedicoes.length)} de {filteredMedicoes.length} medições
            </span>
            {filteredMedicoes.length !== medicoes.length && (
              <span className="text-blue-600">
                Filtrado de {medicoes.length} medições totais
              </span>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Measurements Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data/Hora
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Área de Trabalho
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ponto de Coleta
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Medições
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedMedicoes.map((medicao) => (
                  <tr key={medicao.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        <div className="font-medium">
                          {format(new Date(medicao.data_hora_medicao), 'dd/MM/yyyy')}
                        </div>
                        <div className="text-gray-500">
                          {format(new Date(medicao.data_hora_medicao), 'HH:mm')}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {medicao.cliente?.razao_social || 'Cliente não informado'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">
                          {medicao.area_de_trabalho?.nome_area || 'Área não informada'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {medicao.ponto_de_coleta?.nome || 'Ponto não informado'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        {medicao.medicao_items.map((item, index) => (
                          <span
                            key={index}
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getMeasurementTypeColor(item.tipo_medicao_nome)}`}
                          >
                            <Beaker className="h-3 w-3 mr-1" />
                            {item.tipo_medicao_nome === 'Vazão' ? 'Volume' : item.tipo_medicao_nome}: {item.valor}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
                {paginatedMedicoes.length === 0 && !loading && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      <Activity className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p className="text-lg font-medium mb-2">Nenhuma medição encontrada</p>
                      <p className="text-sm">
                        {selectedClient 
                          ? 'Tente ajustar os filtros ou selecionar um período diferente'
                          : 'Selecione um cliente para visualizar as medições'
                        }
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-white px-6 py-3 border-t border-gray-200 flex items-center justify-between">
              <div className="flex items-center">
                <p className="text-sm text-gray-700">
                  Página {currentPage} de {totalPages}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Próxima
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Summary Statistics */}
        {filteredMedicoes.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Estatísticas do Período</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <Activity className="h-8 w-8 text-blue-600 mr-3" />
                  <div>
                    <div className="text-2xl font-bold text-blue-900">{filteredMedicoes.length}</div>
                    <div className="text-sm text-blue-700">Total de Medições</div>
                  </div>
                </div>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <MapPin className="h-8 w-8 text-green-600 mr-3" />
                  <div>
                    <div className="text-2xl font-bold text-green-900">
                      {new Set(filteredMedicoes.map(m => m.area_de_trabalho?.nome_area)).size}
                    </div>
                    <div className="text-sm text-green-700">Áreas Monitoradas</div>
                  </div>
                </div>
              </div>
              
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <Beaker className="h-8 w-8 text-purple-600 mr-3" />
                  <div>
                    <div className="text-2xl font-bold text-purple-900">
                      {new Set(filteredMedicoes.map(m => m.ponto_de_coleta?.nome)).size}
                    </div>
                    <div className="text-sm text-purple-700">Pontos de Coleta</div>
                  </div>
                </div>
              </div>
              
              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <Calendar className="h-8 w-8 text-orange-600 mr-3" />
                  <div>
                    <div className="text-2xl font-bold text-orange-900">
                      {new Set(filteredMedicoes.map(m => format(new Date(m.data_hora_medicao), 'yyyy-MM-dd'))).size}
                    </div>
                    <div className="text-sm text-orange-700">Dias com Medições</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}