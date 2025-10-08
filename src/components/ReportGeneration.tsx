import React from 'react';
import { Loader2 } from 'lucide-react';
import { useIntl } from 'react-intl';
import type { Client } from '../types/client';

interface ReportGenerationProps {
  clients: Client[];
  isLoadingClients: boolean;
  selectedClient: string;
  startDate: string;
  endDate: string;
  setSelectedClient: (clientId: string) => void;
  setStartDate: (date: string) => void;
  setEndDate: (date: string) => void;
  handleGenerateReport: () => Promise<void>;
  isAnyLoading: boolean;
  isLoading: { report: boolean };
}

export function ReportGeneration({
  clients,
  isLoadingClients,
  selectedClient,
  startDate,
  endDate,
  setSelectedClient,
  setStartDate,
  setEndDate,
  handleGenerateReport,
  isAnyLoading,
  isLoading
}: ReportGenerationProps) {
  const intl = useIntl();

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-2xl font-bold mb-6">
        {intl.formatMessage({ id: 'admin.report.title' })}
      </h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {intl.formatMessage({ id: 'admin.report.client' })}
          </label>
          <select
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
            className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">
              {intl.formatMessage({ id: 'admin.report.selectClient' })}
            </option>
            {!isLoadingClients && clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.razao_social} - {client.cidade}
              </option>
            ))}
            {isLoadingClients && (
              <option disabled>Loading clients...</option>
            )}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {intl.formatMessage({ id: 'admin.report.startDate' })}
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {intl.formatMessage({ id: 'admin.report.endDate' })}
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <button
          onClick={handleGenerateReport}
          disabled={isAnyLoading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-blue-300 transition-colors duration-200"
        >
          {isLoading.report ? (
            <span className="flex items-center justify-center">
              <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5" />
              {intl.formatMessage({ id: 'admin.report.loading' })}
            </span>
          ) : (
            intl.formatMessage({ id: 'admin.report.generate' })
          )}
        </button>
      </div>
    </div>
  );
}