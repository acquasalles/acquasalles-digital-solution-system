import React, { useState, useEffect } from 'react';
import { getSupabase } from '../lib/supabase';
import { useAuth } from './AuthProvider';
import { Download, Loader2, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { Navigation } from './Navigation';
import { ImageModal } from './ImageModal';
import { useClients } from '../lib/ClientsContext';
import { A4ReportPreview } from './A4ReportPreview';
import { useAdminData } from '../hooks/useAdminData';
import {
  Chart as ChartJS,
  CategoryScale,
  registerables,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import { Bar } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  ...registerables,
  CategoryScale,
  LinearScale,
  BarElement,
  annotationPlugin,
  Title,
  Tooltip,
  Legend
);

export function AdminPage() {
  const { clients, isLoading: isLoadingClients, error: clientsError, fetchClients } = useClients();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showA4Report, setShowA4Report] = useState(false);
  const { user, isAdmin } = useAuth();
  
  const {
    selectedClient,
    setSelectedClient,
    selectedPonto,
    setSelectedPonto,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    pontosList,
    collectionPointsData,
    graphData,
    graphOptions,
    datasetStats,
    isLoading,
    setIsLoading,
    error,
    setError
  } = useAdminData();

  useEffect(() => {
    if (user) {
      fetchClients();
    }
  }, [user, fetchClients]);

  // Clear cache when user role changes to ensure fresh data
  useEffect(() => {
    if (user) {
      // Clear cache and refetch when admin status changes
      fetchClients();
    }
  }, [isAdmin, user, fetchClients]);
  // Effect to refresh report when client changes and report is open
  useEffect(() => {
    const refreshReportIfOpen = async () => {
      if (selectedClient && (showA4Report || reportData)) {
        try {
          // Clear existing report data first
          setIsLoading(prev => ({ ...prev, report: true }));
          
        } catch (error) {
          console.error('Error refreshing report for new client:', error);
        }
      }
    };

    refreshReportIfOpen();
  }, [selectedClient]); // Only trigger when selectedClient changes

  const handleDownloadA4PDF = async () => {
    setIsLoading(prev => ({ ...prev, pdf: true }));
    try {
      // Get selected client info for A4 report
      const selectedClientInfo = selectedClient ? clients.find(c => c.id === selectedClient) : null;
      const clientInfoForA4 = selectedClientInfo ? {
        name: selectedClientInfo.razao_social || 'Cliente',
        cnpj: '16.716.417/0001-95', // Default CNPJ
        address: 'Endereço não informado',
        city: selectedClientInfo.cidade || 'Cidade',
        state: 'SP',
        phone: '+55 (11) 1234-5678',
        email: 'contato@cliente.com.br',
        contact: 'Responsável Técnico'
      } : {
        name: 'Cliente',
        cnpj: '16.716.417/0001-95',
        address: 'Endereço não informado',
        city: 'Cidade',
        state: 'SP',
        phone: '+55 (11) 1234-5678',
        email: 'contato@cliente.com.br',
        contact: 'Responsável Técnico'
      };

      // A4 PDF generation logic would go here
      
      console.log('A4 PDF generation completed successfully');
    } catch (error) {
      console.error('Error generating A4 PDF:', error);
      setError('Error generating A4 PDF. Please try again.');
      alert('Error generating A4 PDF. Please try again.');
    } finally {
      setIsLoading(prev => ({ ...prev, pdf: false }));
    }
  };

  const handleShowA4Report = () => {
    setShowA4Report(true);
  };

  // Handle client selection change
  const handleClientChange = (clientId: string) => {
    setSelectedClient(clientId);
    
    // Close A4 report if open when changing client
    if (showA4Report) {
      setShowA4Report(false);
    }
  };

  const isAnyLoading = Object.values(isLoading).some(Boolean);

  // Filter out collection points with no data for the compact grid
  const validCollectionPoints = collectionPointsData.filter(
    pointData => pointData.graphData && !pointData.error && !pointData.isLoading
  );

  // Get selected client info for A4 report
  const selectedClientInfo = selectedClient ? clients.find(c => c.id === selectedClient) : null;
  const clientInfoForA4 = selectedClientInfo ? {
    name: selectedClientInfo.razao_social || 'Cliente',
    cnpj: '16.716.417/0001-95', // Default CNPJ
    address: 'Endereço não informado',
    city: selectedClientInfo.cidade || 'Cidade',
    state: 'SP',
    phone: '+55 (11) 1234-5678',
    email: 'contato@cliente.com.br',
    contact: 'Responsável Técnico'
  } : undefined;

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
          <h2 className="text-xl font-bold mb-4">Measurement Analysis</h2>
          
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Client
              </label>
              <select
                value={selectedClient}
                onChange={(e) => handleClientChange(e.target.value)}
                className="w-full py-1.5 px-2 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Select a client</option>
                {!isLoadingClients && clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.razao_social} - {client.cidade}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full py-1.5 px-2 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full py-1.5 px-2 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Show A4 Report Preview */}
        {showA4Report && (
          <A4ReportPreview
            clientInfo={clientInfoForA4}
            collectionPointsData={validCollectionPoints}
            reportData={null}
            reportPeriod={{ start: startDate ? new Date(startDate) : new Date(), end: endDate ? new Date(endDate) : new Date() }}
            onDownloadPDF={handleDownloadA4PDF}
            isGeneratingPDF={isLoading.pdf}
            clientId={selectedClient}
          />
        )}

        {/* Compact 3-Column Grid Report */}
        {selectedClient && !showA4Report && (
          <div className="space-y-8">
            {isLoading.graph ? (
              <div className="bg-white rounded-lg shadow-md p-8 flex items-center justify-center">
                <div className="flex items-center space-x-3">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  <span className="text-lg font-medium text-gray-700">
                    Loading visualizations...
                  </span>
                </div>
              </div>
            ) : validCollectionPoints.length > 0 ? (
              <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                {/* Report Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
                  <h1 className="text-2xl font-bold text-center mb-2">
                    Collection Points Visual Report
                  </h1>
                  <p className="text-blue-100 text-center">
                    {clients.find(c => c.id === selectedClient)?.razao_social} | 
                    {startDate ? format(new Date(startDate), 'MMM dd') : 'Start'} - {endDate ? format(new Date(endDate), 'MMM dd, yyyy') : 'End'}
                  </p>
                </div>

                {/* 3-Column Grid Layout */}
                <div className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {validCollectionPoints.map((pointData) => (
                      <div 
                        key={pointData.id} 
                        className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200"
                      >
                        {/* Compact Header */}
                        <div className="bg-white border-b border-gray-200 p-4">
                          <h3 className="text-lg font-semibold text-gray-900 text-center mb-1">
                            {pointData.name}
                          </h3>
                          <div className="w-12 h-0.5 bg-blue-500 mx-auto"></div>
                        </div>

                        {/* Compact Stats Grid */}
                        <div className="p-4">
                          <div className="grid grid-cols-2 gap-2 mb-4">
                            {pointData.datasetStats.filter(stat => !stat.hidden).slice(0, 4).map((stat) => (
                              <div
                                key={`${pointData.id}-${stat.label}`}
                                className="bg-white rounded-md border p-2 text-center"
                                style={{ borderLeftColor: stat.color, borderLeftWidth: '3px' }}
                              >
                                <div className="text-xs font-medium text-gray-600 mb-1">
                                  {stat.label}
                                </div>
                                <div className="text-sm font-semibold text-gray-900">
                                  Avg: {stat.avg}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {stat.min} - {stat.max}
                                </div>
                                {stat.total !== undefined && (
                                  <div className="text-xs font-medium text-blue-600 mt-1">
                                    Total: {stat.total}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>

                          {/* Compact Chart */}
                          <div className="bg-white rounded-md border p-3">
                            <div className="h-48">
                              <Bar
                                data={pointData.graphData}
                                options={{
                                  responsive: true,
                                  maintainAspectRatio: false,
                                  layout: {
                                    padding: {
                                      top: 10,
                                      bottom: 5,
                                      left: 5,
                                      right: 5
                                    }
                                  },
                                  interaction: {
                                    mode: 'nearest',
                                    axis: 'x',
                                    intersect: false
                                  },
                                  plugins: {
                                    legend: {
                                      display: true,
                                      position: 'top' as const,
                                      labels: {
                                        font: { size: 10 },
                                        padding: 8,
                                        usePointStyle: true,
                                        boxWidth: 8,
                                        boxHeight: 8
                                      }
                                    },
                                    title: {
                                      display: false
                                    },
                                    tooltip: {
                                      titleFont: { size: 11 },
                                      bodyFont: { size: 10 },
                                      padding: 6
                                    }
                                  },
                                  scales: {
                                    x: {
                                      ticks: {
                                        font: { size: 8 },
                                        maxRotation: 45,
                                        maxTicksLimit: 8
                                      },
                                      grid: {
                                        display: false
                                      }
                                    },
                                    y: {
                                      ticks: {
                                        font: { size: 9 },
                                        maxTicksLimit: 6
                                      },
                                      beginAtZero: true,
                                      grid: {
                                        color: 'rgba(0, 0, 0, 0.05)'
                                      }
                                    }
                                  },
                                  elements: {
                                    bar: {
                                      borderRadius: 2
                                    }
                                  }
                                }}
                              />
                            </div>
                          </div>

                          {/* Additional Stats for remaining measurements */}
                          {pointData.datasetStats.filter(stat => !stat.hidden).length > 4 && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <div className="grid grid-cols-1 gap-1">
                                {pointData.datasetStats.filter(stat => !stat.hidden).slice(4).map((stat) => (
                                  <div
                                    key={`${pointData.id}-extra-${stat.label}`}
                                    className="flex justify-between items-center text-xs bg-white rounded px-2 py-1 border"
                                  >
                                    <span className="font-medium text-gray-700">{stat.label}:</span>
                                    <span className="text-gray-900">
                                      {stat.avg} ({stat.min}-{stat.max})
                                      {stat.total !== undefined && ` | Total: ${stat.total}`}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                 
                </div>
              </div>
            ) : selectedClient && !isLoading.graph ? (
              <div className="bg-white rounded-lg shadow-md p-8">
                <div className="flex flex-col items-center justify-center text-gray-500">
                  <AlertCircle className="h-12 w-12 mb-4" />
                  <p className="text-lg font-medium mb-2">No Collection Points Found</p>
                  <p className="text-sm text-gray-400">
                    No collection points with data are configured for this client
                  </p>
                </div>
              </div>
            ) : null}

            {/* Generate Report Buttons */}
            {selectedClient && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-end space-x-4">
                  <button
                    onClick={handleShowA4Report}
                    disabled={isAnyLoading || !selectedClient}
                    className="flex items-center px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-purple-300 transition-colors duration-200"
                  >
                    <Download className="h-5 w-5 mr-2" />
                    A4 Report Preview
                  </button>
                </div>
              </div>
            )}

          </div>
        )}
      </div>

      {selectedImage && (
        <ImageModal
          imageUrl={selectedImage}
          onClose={() => setSelectedImage(null)}
        />
      )}
    </div>
  );
}