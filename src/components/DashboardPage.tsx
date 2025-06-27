import React, { useState, useEffect } from 'react';
import { getSupabase } from '../lib/supabase';
import { useAuth } from './AuthProvider';
import { Navigation } from './Navigation';
import { useIntl } from 'react-intl';
import { Loader2, AlertCircle } from 'lucide-react';
import { useClients } from '../lib/ClientsContext';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Line } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface MeasurementData {
  date: string;
  value: number;
  point: string;
  area: string;
}

export function DashboardPage() {
  const { clients, isLoading: isLoadingClients, error: clientsError, fetchClients } = useClients();
  const [selectedClient, setSelectedClient] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [measurementData, setMeasurementData] = useState<MeasurementData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const intl = useIntl();

  useEffect(() => {
    if (user) {
      fetchClients();
    }
  }, [user, fetchClients]);

  const fetchMeasurements = async () => {
    if (!selectedClient || !startDate || !endDate) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const supabase = getSupabase();
      
      const { data, error } = await supabase
        .from('medicao')
        .select(`
          data_hora_medicao,
          area_de_trabalho:area_de_trabalho_id (nome_area),
          ponto_de_coleta:ponto_de_coleta_id (nome),
          medicao_items (
            parametro,
            valor,
            tipo_medicao_nome
          )
        `)
        .eq('cliente_id', selectedClient)
        .gte('data_hora_medicao', startDate)
        .lte('data_hora_medicao', endDate + 'T23:59:59')
        .order('data_hora_medicao', { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) {
        setError('No data found for the selected period');
        setMeasurementData([]);
        return;
      }

      // Transform the data for the chart
      const measurements: MeasurementData[] = data.flatMap(measurement => 
        measurement.medicao_items
          .filter(item => item.tipo_medicao_nome !== 'Foto') // Exclude photo measurements
          .map(item => ({
            date: new Date(measurement.data_hora_medicao).toLocaleDateString(),
            value: parseFloat(item.valor),
            point: measurement.ponto_de_coleta.nome,
            area: measurement.area_de_trabalho.nome_area,
            type: item.tipo_medicao_nome || item.parametro
          }))
      );

      setMeasurementData(measurements);
    } catch (error) {
      setError('Error fetching measurement data');
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Prepare chart data
  const prepareChartData = (type: string) => {
    const filteredData = measurementData.filter(m => m.type === type);
    const uniquePoints = Array.from(new Set(filteredData.map(m => m.point)));
    
    return {
      labels: Array.from(new Set(filteredData.map(m => m.date))),
      datasets: uniquePoints.map((point, index) => ({
        label: `${point}`,
        data: filteredData
          .filter(m => m.point === point)
          .map(m => m.value),
        borderColor: `hsl(${index * 137.5}, 70%, 50%)`,
        backgroundColor: `hsla(${index * 137.5}, 70%, 50%, 0.5)`,
        tension: 0.3
      }))
    };
  };

  // Chart options
  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
      }
    },
    scales: {
      y: {
        beginAtZero: true
      }
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false
    }
  };

  // Get unique measurement types
  const measurementTypes = Array.from(new Set(measurementData.map(m => m.type)));

  return (
    <div className="min-h-screen bg-gray-100">
      <Navigation />
      
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {(error || clientsError) && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
            <p className="text-red-700">{error || clientsError}</p>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-bold mb-6">Measurement Dashboard</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Client
              </label>
              <select
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
                className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoadingClients}
              >
                <option value="">Select a client</option>
                {!isLoadingClients && clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {`${client.razao_social} - ${client.cidade}`}
                  </option>
                ))}
                {isLoadingClients && (
                  <option disabled>Loading clients...</option>
                )}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              />
            </div>
          </div>

          <button
            onClick={fetchMeasurements}
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-blue-300"
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5" />
                Loading...
              </span>
            ) : (
              'Update Dashboard'
            )}
          </button>
        </div>

        {measurementData.length > 0 && (
          <div className="space-y-6">
            {measurementTypes.map((type) => (
              <div key={type} className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-xl font-semibold mb-4">{type} Measurements</h3>
                <div className="h-[400px]">
                  <Line
                    data={prepareChartData(type)}
                    options={chartOptions}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}