import React, { useState, useEffect } from 'react';
import { getSupabase } from '../lib/supabase';
import { useAuth } from './AuthProvider';
import { Loader2, UserPlus, Trash2, Shield, User as UserIcon, Crown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Navigation } from './Navigation';
import { useIntl } from 'react-intl';

interface User {
  id: string;
  email: string;
  is_admin: boolean;
  role_display: string;
}

interface Client {
  id: string;
  razao_social: string;
}

interface ClientUser {
  id: string;
  user_id: string;
  client_id: string;
  user_email: string;
  client_name: string;
  user_is_admin: boolean;
}

export function ClientUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientUsers, setClientUsers] = useState<ClientUser[]>([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedClient, setSelectedClient] = useState('');
  const [loading, setLoading] = useState(false);
  const [roleLoading, setRoleLoading] = useState<string | null>(null);
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
    try {
      const supabase = getSupabase();
      
      // Fetch users with role information
      const { data: usersData, error: usersError } = await supabase
        .rpc('get_users_with_roles');
      
      if (usersError) throw usersError;
      
      // Fetch clients
      const { data: clientsData, error: clientsError } = await supabase
        .from('clientes')
        .select('id, razao_social')
       .order('razao_social', { ascending: true })
      
      if (clientsError) throw clientsError;

      // Fetch client users with all details
      const { data: clientUsersData, error: clientUsersError } = await supabase
        .from('client_users')
        .select(`
          id,
          user_id,
          client_id,
          clientes!client_users_client_id_fkey(razao_social)
        `);

      if (clientUsersError) throw clientUsersError;

      // Get user details for the client users
      const userEmailMap = new Map(
        (usersData || []).map(u => [u.id, { email: u.email, is_admin: u.is_admin }])
      );

      setUsers((usersData || []).map(u => ({
        id: u.id,
        email: u.email,
        is_admin: u.is_admin,
        role_display: u.is_admin ? 'Administrador' : 'Usuário'
      })));
      
      setClients(clientsData || []);

      setClientUsers(
        (clientUsersData || []).map((cu: any) => {
          const userInfo = userEmailMap.get(cu.user_id);
          return {
            id: cu.id,
            user_id: cu.user_id,
            client_id: cu.client_id,
            user_email: userInfo?.email || 'Unknown',
            user_is_admin: userInfo?.is_admin || false,
            client_name: cu.clientes.razao_social
          };
        })
      );
    } catch (error) {
      console.error('Error fetching data:', error);
      alert(intl.formatMessage({ id: 'clientUsers.error.fetch' }));
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedUser || !selectedClient) {
      alert('Por favor, preencha todos os campos');
      return;
    }

    setLoading(true);
    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('client_users')
        .insert([
          { user_id: selectedUser, client_id: selectedClient }
        ]);

      if (error) throw error;

      setSelectedUser('');
      setSelectedClient('');
      await fetchData();
    } catch (error: any) {
      console.error('Error assigning client:', error);
      alert(
        error.message === 'duplicate key value violates unique constraint "client_users_user_id_client_id_key"'
          ? intl.formatMessage({ id: 'clientUsers.alreadyAssigned' })
          : intl.formatMessage({ id: 'clientUsers.error.assign' })
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (id: string) => {
    if (!confirm(intl.formatMessage({ id: 'clientUsers.confirmRemove' }))) return;

    setLoading(true);
    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('client_users')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await fetchData();
    } catch (error) {
      console.error('Error removing assignment:', error);
      alert(intl.formatMessage({ id: 'clientUsers.error.remove' }));
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: boolean) => {
    const roleText = newRole ? 'administrador' : 'usuário';
    if (!confirm(`Tem certeza que deseja alterar este usuário para ${roleText}?`)) return;

    setRoleLoading(userId);
    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .rpc('update_user_role', { 
          target_user_id: userId, 
          new_role: newRole ? 'admin' : 'user'
        });

      if (error) throw error;

      await fetchData();
      alert(`Role alterada para ${roleText} com sucesso!`);
    } catch (error) {
      console.error('Error updating user role:', error);
      alert('Erro ao alterar role do usuário');
    } finally {
      setRoleLoading(null);
    }
  };

  const getRoleIcon = (isAdmin: boolean) => {
    return isAdmin ? (
      <Crown className="h-4 w-4 text-yellow-600" />
    ) : (
      <UserIcon className="h-4 w-4 text-blue-600" />
    );
  };

  const getRoleBadge = (isAdmin: boolean) => {
    return isAdmin ? (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
        <Crown className="h-3 w-3 mr-1" />
        Admin
      </span>
    ) : (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
        <UserIcon className="h-3 w-3 mr-1" />
        Usuário
      </span>
    );
  };

  if (loading && users.length === 0) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="text-lg font-medium text-gray-700">
            {intl.formatMessage({ id: 'admin.report.loading' })}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navigation />

      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Gestão de Usuários e Roles */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-bold mb-6 flex items-center">
            <Shield className="h-6 w-6 mr-2 text-blue-600" />
            Gestão de Usuários e Roles
          </h2>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email do Usuário
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role Atual
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Alterar Role
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((userItem) => (
                  <tr key={userItem.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getRoleIcon(userItem.is_admin)}
                        <span className="ml-2 text-sm text-gray-900">{userItem.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {getRoleBadge(userItem.is_admin)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {roleLoading === userItem.id ? (
                        <Loader2 className="h-4 w-4 animate-spin text-blue-600 mx-auto" />
                      ) : (
                        <div className="flex items-center justify-center space-x-2">
                          {!userItem.is_admin && (
                            <button
                              onClick={() => handleRoleChange(userItem.id, true)}
                              className="inline-flex items-center px-2 py-1 border border-yellow-300 rounded text-xs font-medium text-yellow-700 bg-yellow-50 hover:bg-yellow-100"
                              title="Promover a Admin"
                            >
                              <Crown className="h-3 w-3 mr-1" />
                              Admin
                            </button>
                          )}
                          {userItem.is_admin && (
                            <button
                              onClick={() => handleRoleChange(userItem.id, false)}
                              className="inline-flex items-center px-2 py-1 border border-blue-300 rounded text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100"
                              title="Rebaixar para Usuário"
                            >
                              <UserIcon className="h-3 w-3 mr-1" />
                              Usuário
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Atribuição de Clientes */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-bold mb-6">
            {intl.formatMessage({ id: 'clientUsers.title' })}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {intl.formatMessage({ id: 'clientUsers.user' })}
              </label>
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">
                  {intl.formatMessage({ id: 'clientUsers.selectUser' })}
                </option>
                {users.map((userItem) => (
                  <option key={userItem.id} value={userItem.id}>
                    {userItem.email} ({userItem.role_display})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {intl.formatMessage({ id: 'clientUsers.client' })}
              </label>
              <select
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
                className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">
                  {intl.formatMessage({ id: 'clientUsers.selectClient' })}
                </option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.razao_social}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={handleAssign}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-blue-300 flex items-center justify-center"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5" />
                {intl.formatMessage({ id: 'admin.report.loading' })}
              </>
            ) : (
              <>
                <UserPlus className="h-5 w-5 mr-2" />
                {intl.formatMessage({ id: 'clientUsers.assign' })}
              </>
            )}
          </button>
        </div>

        {/* Atribuições Atuais */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold mb-6">
            {intl.formatMessage({ id: 'clientUsers.currentAssignments' })}
          </h2>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {intl.formatMessage({ id: 'clientUsers.user' })}
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {intl.formatMessage({ id: 'clientUsers.client' })}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {intl.formatMessage({ id: 'clientUsers.actions' })}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {clientUsers.map((cu) => (
                  <tr key={cu.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getRoleIcon(cu.user_is_admin)}
                        <span className="ml-2 text-sm text-gray-900">{cu.user_email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {getRoleBadge(cu.user_is_admin)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{cu.client_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => handleRemove(cu.id)}
                        className="text-red-600 hover:text-red-900 p-1"
                        title="Remover Atribuição"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
                {clientUsers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                      {intl.formatMessage({ id: 'clientUsers.noAssignments' })}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}