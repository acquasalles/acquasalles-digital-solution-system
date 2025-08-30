import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthProvider';
import { useClients } from '../lib/ClientsContext';
import { Navigation } from './Navigation';
import { ReportGeneration } from './ReportGeneration';
import { WaterQualityComplianceAnalysis } from './WaterQualityComplianceAnalysis';
import { supabase } from '../lib/supabase';
import { BarChart3, Users, Building2, MapPin } from 'lucide-react';

interface DashboardStats {
  totalClients: number;
  totalUsers: number;
  totalWorkAreas: number;
  totalCollectionPoints: number;
}

export function AdminPage() {
  const { user, isAdmin } = useAuth();
  const { clients } = useClients();
  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    totalUsers: 0,
    totalWorkAreas: 0,
    totalCollectionPoints: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [clientsResult, usersResult, areasResult, pointsResult] = await Promise.all([
          supabase.from('clientes').select('id', { count: 'exact' }),
          supabase.from('users').select('id', { count: 'exact' }),
          supabase.from('area_de_trabalho').select('id', { count: 'exact' }),
          supabase.from('ponto_de_coleta').select('id', { count: 'exact' })
        ]);

        setStats({
          totalClients: clientsResult.count || 0,
          totalUsers: usersResult.count || 0,
          totalWorkAreas: areasResult.count || 0,
          totalCollectionPoints: pointsResult.count || 0
        });
      } catch (error) {
        console.error('Error loading dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              {isAdmin ? 'Painel Administrativo' : 'Dashboard'}
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Bem-vindo, {user?.email}
            </p>
          </div>

          {/* Dashboard Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Building2 className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Total de Clientes
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {loading ? '...' : stats.totalClients}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Users className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Total de Usuários
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {loading ? '...' : stats.totalUsers}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <BarChart3 className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Áreas de Trabalho
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {loading ? '...' : stats.totalWorkAreas}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <MapPin className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Pontos de Coleta
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {loading ? '...' : stats.totalCollectionPoints}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content - Report Generation and Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">
                  Geração de Relatórios
                </h2>
                <ReportGeneration />
              </div>
            </div>

            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">
                  Análise de Conformidade
                </h2>
                <WaterQualityComplianceAnalysis />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}