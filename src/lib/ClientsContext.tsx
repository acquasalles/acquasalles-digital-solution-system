import React, { createContext, useContext, useState, useCallback } from 'react';
import { getSupabase } from './supabase';
import { useAuth } from '../components/AuthProvider';

interface Client {
  id: string;
  razao_social: string;
  cidade: string;
}

interface ClientsContextType {
  clients: Client[];
  isLoading: boolean;
  error: string | null;
  fetchClients: () => Promise<void>;
  clearCache: () => void;
}

const ClientsContext = createContext<ClientsContextType | undefined>(undefined);

export function useClients() {
  const context = useContext(ClientsContext);
  if (!context) {
    throw new Error('useClients must be used within a ClientsProvider');
  }
  return context;
}

export function ClientsProvider({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchClients = useCallback(async () => {
    // If we already have clients, return early
    if (clients.length > 0) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const supabase = getSupabase();
      const allClients: Client[] = [];
      let hasMore = true;
      let lastId = '0';
      
      // Fetch clients based on user role
      if (isAdmin) {
        console.log('Fetching all clients for admin user (only those with work areas)');
        // Admin users can see all clients that have at least one work area
      while (hasMore) {
        const { data: chunk, error: chunkError } = await supabase
          .from('clientes')
          .select('id, razao_social, cidade')
          .order('id', { ascending: true })
          .gt('id', lastId)
          .limit(1000);

        if (chunkError) throw chunkError;

        if (!chunk || chunk.length === 0) {
          hasMore = false;
          continue;
        }

        // For each client, check if they have at least one work area
        const clientIds = chunk.map(c => c.id.toString());
        const { data: workAreas, error: workAreasError } = await supabase
          .from('area_de_trabalho')
          .select('cliente_id')
          .in('cliente_id', clientIds);

        if (workAreasError) throw workAreasError;

        // Create a set of client IDs that have work areas
        const clientsWithWorkAreas = new Set(
          (workAreas || []).map(wa => wa.cliente_id.toString())
        );

        // Process chunk - only include clients with work areas
        chunk.forEach(client => {
          if (clientsWithWorkAreas.has(client.id.toString())) {
            allClients.push({
              id: client.id.toString(),
              razao_social: client.razao_social || 'Unknown',
              cidade: client.cidade || 'X'
            });
          }
        });

        // Update lastId for next iteration
        lastId = chunk[chunk.length - 1].id.toString();

        // Check if we got less than the limit
        if (chunk.length < 1000) {
          hasMore = false;
        }
      }
      console.log(`Filtered to ${allClients.length} clients with work areas`);
      } else {
        console.log('Fetching assigned clients for regular user (only those with work areas)');
        // Regular users can only see assigned clients via client_users
        const { data: { user } } = await supabase.auth.getUser();

        if (!user?.id) {
          throw new Error('User not authenticated');
        }

        const { data: assignedClients, error: assignedError } = await supabase
          .from('client_users')
          .select(`
            clientes:client_id (
              id,
              razao_social,
              cidade
            )
          `)
          .eq('user_id', user.id);

        if (assignedError) throw assignedError;

        // Get client IDs from assigned clients
        const clientIds = (assignedClients || [])
          .filter(a => a.clientes)
          .map(a => a.clientes.id.toString());

        if (clientIds.length > 0) {
          // Check which of these clients have work areas
          const { data: workAreas, error: workAreasError } = await supabase
            .from('area_de_trabalho')
            .select('cliente_id')
            .in('cliente_id', clientIds);

          if (workAreasError) throw workAreasError;

          // Create a set of client IDs that have work areas
          const clientsWithWorkAreas = new Set(
            (workAreas || []).map(wa => wa.cliente_id.toString())
          );

          // Process assigned clients - only include those with work areas
          (assignedClients || []).forEach(assignment => {
            if (assignment.clientes && clientsWithWorkAreas.has(assignment.clientes.id.toString())) {
              allClients.push({
                id: assignment.clientes.id.toString(),
                razao_social: assignment.clientes.razao_social || 'Unknown',
                cidade: assignment.clientes.cidade || 'X'
              });
            }
          });
        }

        console.log(`Filtered to ${allClients.length} assigned clients with work areas`);
      }
      
      // Remove duplicates and sort
      const uniqueClients = Array.from(new Map(
        allClients.map(client => [client.id, client])
      ).values());
      
      console.log('Client cache populated:', {
        totalClients: uniqueClients.length,
        userRole: isAdmin ? 'admin' : 'regular',
        timestamp: new Date().toISOString()
      });

      setClients(
        uniqueClients.sort((a, b) => a.razao_social.localeCompare(b.razao_social))
      );
    } catch (error) {
      console.error('Error fetching clients:', {
        error,
        userRole: isAdmin ? 'admin' : 'regular',
        timestamp: new Date().toISOString()
      });
      setError('Error fetching clients');
    } finally {
      setIsLoading(false);
    }
  }, [clients.length, isAdmin]);

  const clearCache = useCallback(() => {
    setClients([]);
  }, []);

  return (
    <ClientsContext.Provider
      value={{
        clients,
        isLoading,
        error,
        fetchClients,
        clearCache
      }}
    >
      {children}
    </ClientsContext.Provider>
  );
}