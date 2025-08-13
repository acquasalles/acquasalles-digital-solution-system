import React, { useState, useEffect } from 'react';
import { getSupabase } from '../lib/supabase';
import { useAuth } from './AuthProvider';
import { Loader2, UserPlus, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Navigation } from './Navigation';
import { useIntl } from 'react-intl';

interface User {
  id: string;
  email: string;
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
}

export function ClientUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientUsers, setClientUsers] = useState<ClientUser[]>([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedClient, setSelectedClient] = useState('');
  const [loading, setLoading] = useState(false);
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
      // Fetch users through RPC
      const { data: usersData, error: usersError } = await supabase
        .rpc('get_users_list');
      
      if (usersError) throw usersError;
      
      // Fetch clients
      const { data: clientsData, error: clientsError } = await supabase
        .from('clientes')
        .select('id, razao_social');
      
      if (clientsError) throw clientsError;

      // Fetch client users with client details
      const { data: clientUsersData, error: clientUsersError } = await supabase
        .from('client_users')
        .select(`
          id,
          user_id,
          client_id,
          clientes!client_users_client_id_fkey(razao_social)
        `);

      if (clientUsersError) throw clientUsersError;

      // Get user emails for the client users
      const userIds = clientUsersData?.map(cu => cu.user_id) || [];
      const userEmailMap = new Map(
        (usersData || []).map(u => [u.id, u.email])
      );

      setUsers(usersData || []);
      setClients(clientsData || []);

      setClientUsers(
        (clientUsersData || []).map((cu: any) => ({
          id: cu.id,
          user_id: cu.user_id,
          client_id: cu.client_id,
          user_email: userEmailMap.get(cu.user_id) || 'Unknown',
          client_name: cu.clientes.razao_social
        }))
      );
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Error fetching data');
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedUser || !selectedClient) {
      alert(intl.formatMessage({ id: 'clientUsers.fillFields' }));
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

  if (loading) {
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
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.email}
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
                  <tr key={cu.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{cu.user_email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{cu.client_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => handleRemove(cu.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
                {clientUsers.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-4 text-center text-gray-500">
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