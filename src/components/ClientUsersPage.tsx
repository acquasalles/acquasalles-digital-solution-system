import React, { useState, useEffect } from 'react';
import { getSupabase } from '../lib/supabase';
import { useAuth } from './AuthProvider';
import { 
  Loader2, 
  UserPlus, 
  Trash2, 
  Shield, 
  ShieldCheck, 
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

interface UserWithRole {
  user_id: string;
  user_email: string;
  user_role: string;
  is_admin: boolean;
  client_count: number;
  clients: Array<{
    id: string;
    name: string;
    city: string;
  }>;
}

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
}

export function ClientUsersPage() {
  const [usersWithRoles, setUsersWithRoles] = useState<UserWithRole[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedClient, setSelectedClient] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'roles' | 'assignments'>('roles');
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const intl = useIntl();

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

    fetchData();
  }, [user, isAdmin, navigate]);

  const fetchData = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const supabase = getSupabase();
      
      // Buscar usuários com roles usando a nova função RPC
      const { data: usersData, error: usersError } = await supabase
        .rpc('get_users_with_roles');
      
      if (usersError) throw usersError;
      
      // Buscar todos os clientes
      const { data: clientsData, error: clientsError } = await supabase
        .from('clientes')
        .select('id, razao_social, cidade')
        .order('razao_social');
      
      if (clientsError) throw clientsError;

      console.log('Users with roles loaded:', usersData?.length || 0);
      console.log('Clients loaded:', clientsData?.length || 0);

      setUsersWithRoles(usersData || []);
      setClients(clientsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      setMessage({
        type: 'error',
        text: 'Erro ao carregar dados. Verifique suas permissões.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRoleUpdate = async (userId: string, newRole: 'admin' | 'user') => {
    if (userId === user?.id) {
      setMessage({
        type: 'error',
        text: 'Você não pode alterar sua própria role.'
      });
      return;
    }

    setUpdatingRole(userId);
    setMessage(null);
    
    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .rpc('update_user_role', {
          target_user_id: userId,
          new_role: newRole,
          make_admin: newRole === 'admin'
        });

      if (error) throw error;

      setMessage({
        type: 'success',
        text: `Role atualizada com sucesso para ${newRole === 'admin' ? 'Administrador' : 'Usuário'}.`
      });

      await fetchData();
    } catch (error: any) {
      console.error('Error updating role:', error);
      setMessage({
        type: 'error',
        text: error.message || 'Erro ao atualizar role do usuário.'
      });
    } finally {
      setUpdatingRole(null);
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

    setLoading(true);
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
      const errorMessage = error.message === 'duplicate key value violates unique constraint "client_users_user_id_client_id_key"'
        ? 'Este usuário já está atribuído a este cliente.'
        : 'Erro ao atribuir cliente ao usuário.';
      
      setMessage({
        type: 'error',
        text: errorMessage
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveClientAssignment = async (userId: string, clientId: string) => {
    if (!confirm('Tem certeza que deseja remover esta atribuição?')) return;

    setLoading(true);
    setMessage(null);
    
    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('client_users')
        .delete()
        .eq('user_id', userId)
        .eq('client_id', parseInt(clientId));

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
    } finally {
      setLoading(false);
    }
  };

  const getRoleIcon = (role: string, isAdmin: boolean) => {
    if (isAdmin) {
      return <ShieldCheck className="h-4 w-4 text-red-500" />;
    }
    return <User className="h-4 w-4 text-blue-500" />;
  };

  const getRoleBadge = (role: string, isAdmin: boolean) => {
    if (isAdmin) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <ShieldCheck className="h-3 w-3 mr-1" />
          Administrador
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
        <User className="h-3 w-3 mr-1" />
        Usuário
      </span>
    );
  };

  if (loading && usersWithRoles.length === 0) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Navigation />
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="text-lg font-medium text-gray-700">
              Carregando usuários e permissões...
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
                Gerencie roles e atribuições de clientes para usuários
              </p>
            </div>
            <div className="text-sm text-gray-500">
              {usersWithRoles.length} usuários cadastrados
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

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab('roles')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'roles'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Settings className="h-4 w-4 inline mr-2" />
                Gerenciar Roles
              </button>
              <button
                onClick={() => setActiveTab('assignments')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'assignments'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Building className="h-4 w-4 inline mr-2" />
                Atribuir Clientes
              </button>
            </nav>
          </div>
        </div>

        {/* Roles Tab */}
        {activeTab === 'roles' && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <Shield className="h-5 w-5 mr-2 text-blue-600" />
                Roles e Permissões de Usuários
              </h2>
              <p className="text-gray-600 text-sm mt-1">
                Gerencie quem tem acesso administrativo e quais clientes cada usuário pode visualizar
              </p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Usuário
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role Atual
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Clientes Atribuídos
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {usersWithRoles.map((userWithRole) => (
                    <tr key={userWithRole.user_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            {getRoleIcon(userWithRole.user_role, userWithRole.is_admin)}
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">
                              {userWithRole.user_email}
                            </div>
                            <div className="text-xs text-gray-500">
                              ID: {userWithRole.user_id.slice(-8)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getRoleBadge(userWithRole.user_role, userWithRole.is_admin)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          <span className="font-medium">{userWithRole.client_count}</span> cliente(s)
                        </div>
                        {userWithRole.clients.length > 0 && (
                          <div className="mt-1">
                            <div className="flex flex-wrap gap-1">
                              {userWithRole.clients.slice(0, 3).map((client) => (
                                <span
                                  key={client.id}
                                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
                                >
                                  {client.name}
                                </span>
                              ))}
                              {userWithRole.clients.length > 3 && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-600">
                                  +{userWithRole.clients.length - 3} mais
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center space-x-2">
                          {userWithRole.user_id !== user?.id ? (
                            <>
                              {!userWithRole.is_admin && (
                                <button
                                  onClick={() => handleRoleUpdate(userWithRole.user_id, 'admin')}
                                  disabled={updatingRole === userWithRole.user_id || loading}
                                  className="inline-flex items-center px-3 py-1 border border-red-300 rounded text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
                                  title="Promover para Administrador"
                                >
                                  {updatingRole === userWithRole.user_id ? (
                                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                  ) : (
                                    <ShieldCheck className="h-3 w-3 mr-1" />
                                  )}
                                  Promover
                                </button>
                              )}
                              {userWithRole.is_admin && (
                                <button
                                  onClick={() => handleRoleUpdate(userWithRole.user_id, 'user')}
                                  disabled={updatingRole === userWithRole.user_id || loading}
                                  className="inline-flex items-center px-3 py-1 border border-blue-300 rounded text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                                  title="Rebaixar para Usuário"
                                >
                                  {updatingRole === userWithRole.user_id ? (
                                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                  ) : (
                                    <User className="h-3 w-3 mr-1" />
                                  )}
                                  Rebaixar
                                </button>
                              )}
                            </>
                          ) : (
                            <span className="text-xs text-gray-500 px-3 py-1 bg-gray-100 rounded">
                              Você mesmo
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Client Assignments Tab */}
        {activeTab === 'assignments' && (
          <div className="space-y-6">
            {/* Assignment Form */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <UserPlus className="h-5 w-5 mr-2 text-green-600" />
                Atribuir Cliente a Usuário
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Usuário
                  </label>
                  <select
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Selecione um usuário</option>
                    {usersWithRoles.filter(u => !u.is_admin).map((user) => (
                      <option key={user.user_id} value={user.user_id}>
                        {user.user_email} (Usuário)
                      </option>
                    ))}
                  </select>
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
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-blue-300 flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5" />
                    Processando...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-5 w-5 mr-2" />
                    Atribuir Cliente ao Usuário
                  </>
                )}
              </button>
            </div>

            {/* Client Assignments List */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Users className="h-5 w-5 mr-2 text-purple-600" />
                  Atribuições de Clientes Detalhadas
                </h2>
              </div>
              
              <div className="divide-y divide-gray-200">
                {usersWithRoles.filter(u => u.client_count > 0).map((user) => (
                  <div key={user.user_id} className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <Mail className="h-5 w-5 text-gray-400 mr-3" />
                        <div>
                          <h3 className="text-sm font-medium text-gray-900">{user.user_email}</h3>
                          <p className="text-xs text-gray-500">
                            {user.client_count} cliente(s) atribuído(s)
                          </p>
                        </div>
                      </div>
                      {getRoleBadge(user.user_role, user.is_admin)}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {user.clients.map((client) => (
                        <div 
                          key={`${user.user_id}-${client.id}`}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                        >
                          <div className="flex items-center">
                            <Building className="h-4 w-4 text-blue-500 mr-2" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">{client.name}</p>
                              <p className="text-xs text-gray-500">{client.city}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemoveClientAssignment(user.user_id, client.id)}
                            className="text-red-600 hover:text-red-900 p-1"
                            title="Remover Atribuição"
                            disabled={loading}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                
                {usersWithRoles.filter(u => u.client_count > 0).length === 0 && (
                  <div className="p-6 text-center text-gray-500">
                    <Users className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p>Nenhuma atribuição de cliente encontrada</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}