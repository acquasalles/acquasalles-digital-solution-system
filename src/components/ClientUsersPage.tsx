import React, { useState, useEffect } from 'react';
import { getSupabase } from '../lib/supabase';
import { useAuth } from './AuthProvider';
import { 
  Loader2, 
  UserPlus, 
  Trash2, 
  Shield, 
  User,
  Building,
  Mail,
  AlertTriangle,
  CheckCircle,
  Settings,
  Users
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Navigation } from './Navigation';
import { useIntl } from 'react-intl';

interface Client {
  id: string;
  razao_social: string;
  cidade: string;
}

interface ClientUser {
  id: string;
  user_id: string;
  client_id: string;
  user_email: string;
  client_name: string;
  client_city: string;
}

export function ClientUsersPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [clientUsers, setClientUsers] = useState<ClientUser[]>([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedClient, setSelectedClient] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const intl = useIntl();

  useEffect(() => {
    console.log('ClientUsersPage useEffect triggered', { user: !!user, isAdmin });
    
    if (!user) {
      console.log('No user, redirecting to login');
      navigate('/login');
      return;
    }

    if (!isAdmin) {
      console.log('User is not admin, redirecting to /admin');
      navigate('/admin');
      return;
    }

    fetchData();
  }, [user, isAdmin, navigate]);

  const fetchData = async () => {
    console.log('Starting fetchData...');
    setLoading(true);
    setMessage(null);
    
    try {
      const supabase = getSupabase();
      
      // Fetch clients
      console.log('Fetching clients...');
      const { data: clientsData, error: clientsError } = await supabase
        .from('clientes')
        .select('id, razao_social, cidade')
        .order('razao_social');
      
      if (clientsError) {
        console.error('Error fetching clients:', clientsError);
        throw clientsError;
      }

      // Fetch client-user assignments
      console.log('Fetching client-user assignments...');
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('client_users')
        .select(`
          id,
          user_id,
          client_id,
          clientes!inner (
            razao_social,
            cidade
          )
        `);

      if (assignmentsError) {
        console.error('Error fetching assignments:', assignmentsError);
        throw assignmentsError;
      }

      console.log('Data fetched successfully:', {
        clients: clientsData?.length || 0,
        assignments: assignmentsData?.length || 0
      });

      setClients(clientsData || []);
      
      // Transform assignments data
      const transformedAssignments = (assignmentsData || []).map(assignment => ({
        id: assignment.id,
        user_id: assignment.user_id,
        client_id: assignment.client_id.toString(),
        user_email: assignment.user_id, // We'll show user ID for now
        client_name: assignment.clientes.razao_social,
        client_city: assignment.clientes.cidade
      }));

      setClientUsers(transformedAssignments);

    } catch (error) {
      console.error('Error in fetchData:', error);
      setMessage({
        type: 'error',
        text: 'Erro ao carregar dados. Verifique suas permissões.'
      });
    } finally {
      console.log('fetchData completed, setting loading to false');
      setLoading(false);
    }
  };

  const handleAssignClient = async () => {
    if (!selectedUser || !selectedClient) {
      setMessage({
        type: 'error',
        text: 'Selecione um usuário e um cliente.'
      });
      return;
    }

    setMessage(null);
    
    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('client_users')
        .insert([
          { user_id: selectedUser, client_id: parseInt(selectedClient) }
        ]);

      if (error) throw error;

      setMessage({
        type: 'success',
        text: 'Cliente atribuído ao usuário com sucesso.'
      });

      setSelectedUser('');
      setSelectedClient('');
      await fetchData();
    } catch (error: any) {
      console.error('Error assigning client:', error);
      const errorMessage = error.message?.includes('duplicate key') 
        ? 'Este usuário já está atribuído a este cliente.'
        : 'Erro ao atribuir cliente ao usuário.';
      
      setMessage({
        type: 'error',
        text: errorMessage
      });
    }
  };

  const handleRemoveClientAssignment = async (assignmentId: string) => {
    if (!confirm('Tem certeza que deseja remover esta atribuição?')) return;

    setMessage(null);
    
    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('client_users')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;

      setMessage({
        type: 'success',
        text: 'Atribuição removida com sucesso.'
      });

      await fetchData();
    } catch (error) {
      console.error('Error removing assignment:', error);
      setMessage({
        type: 'error',
        text: 'Erro ao remover atribuição.'
      });
    }
  };

  console.log('Rendering ClientUsersPage, loading:', loading);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Navigation />
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="text-lg font-medium text-gray-700">
              Carregando dados...
            </span>
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
                <Settings className="h-6 w-6 mr-2 text-blue-600" />
                Gerenciamento de Usuários
              </h1>
              <p className="text-gray-600 mt-1">
                Gerencie atribuições de clientes para usuários
              </p>
            </div>
            <div className="text-sm text-gray-500">
              {clientUsers.length} atribuições ativas
            </div>
          </div>

          {/* Message Alert */}
          {message && (
            <div className={`mb-4 p-4 rounded-lg flex items-center ${
              message.type === 'success' 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-red-50 border border-red-200'
            }`}>
              {message.type === 'success' ? (
                <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-500 mr-3" />
              )}
              <span className={message.type === 'success' ? 'text-green-700' : 'text-red-700'}>
                {message.text}
              </span>
            </div>
          )}
        </div>

        {/* Assignment Form */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <UserPlus className="h-5 w-5 mr-2 text-green-600" />
            Atribuir Cliente a Usuário
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                User ID
              </label>
              <input
                type="text"
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Cole o UUID do usuário"
              />
              <p className="text-xs text-gray-500 mt-1">
                Temporariamente use o UUID do usuário diretamente
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cliente
              </label>
              <select
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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

          <button
            onClick={handleAssignClient}
            disabled={!selectedUser || !selectedClient}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-blue-300 flex items-center justify-center"
          >
            <UserPlus className="h-5 w-5 mr-2" />
            Atribuir Cliente ao Usuário
          </button>
        </div>

        {/* Current Assignments */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <Users className="h-5 w-5 mr-2 text-purple-600" />
              Atribuições Atuais
            </h2>
          </div>
          
          {clientUsers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {clientUsers.map((assignment) => (
                    <tr key={assignment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Mail className="h-5 w-5 text-gray-400 mr-3" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {assignment.user_id.slice(0, 8)}...
                            </div>
                            <div className="text-xs text-gray-500">
                              {assignment.user_id}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Building className="h-5 w-5 text-blue-500 mr-3" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {assignment.client_name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {assignment.client_city}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleRemoveClientAssignment(assignment.id)}
                          className="text-red-600 hover:text-red-900 p-1"
                          title="Remover Atribuição"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6 text-center text-gray-500">
              <Users className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p>Nenhuma atribuição encontrada</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}