import React from 'react';
import { Download, Loader2, ImageIcon } from 'lucide-react';
import { useIntl } from 'react-intl';
import type { ReportData } from '../types/report';

interface ReportPreviewProps {
  reportData: ReportData;
  handleDownloadPDF: () => Promise<void>;
  isAnyLoading: boolean;
  isLoading: { pdf: boolean };
  setSelectedImage: (url: string | null) => void;
}

export function ReportPreview({
  reportData,
  handleDownloadPDF,
  isAnyLoading,
  isLoading,
  setSelectedImage
}: ReportPreviewProps) {
  const intl = useIntl();

  if (!reportData || Object.keys(reportData).length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">
          {intl.formatMessage({ id: 'admin.report.preview' })}
        </h2>
        <button
          onClick={handleDownloadPDF}
          disabled={isAnyLoading}
          className="flex items-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-green-300"
        >
          {isLoading.pdf ? (
            <Loader2 className="animate-spin h-5 w-5 mr-2" />
          ) : (
            <Download className="h-5 w-5 mr-2" />
          )}
          {intl.formatMessage({ id: 'admin.report.download' })}
        </button>
      </div>

      <div className="space-y-6">
        <h3 className="text-xl font-semibold mb-4">
          {reportData.cliente}
        </h3>
        {reportData.datas.map((dateEntry) => (
          <div key={dateEntry.data} className="mb-8">
            <h4 className="text-lg font-medium text-gray-900 mb-4">
              {dateEntry.data}
            </h4>
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-3 py-2 text-left text-sm font-semibold text-gray-900">
                      {intl.formatMessage({ id: 'admin.report.area' })}
                    </th>
                    <th scope="col" className="px-3 py-2 text-left text-sm font-semibold text-gray-900">
                      {intl.formatMessage({ id: 'admin.report.point' })}
                    </th>
                    <th scope="col" className="px-3 py-2 text-left text-sm font-semibold text-gray-900">
                      {intl.formatMessage({ id: 'admin.report.measurements' })}
                    </th>
                    <th scope="col" className="px-3 py-2 text-left text-sm font-semibold text-gray-900">
                      {intl.formatMessage({ id: 'admin.report.photo' })}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {dateEntry.area.map((area) =>
                    area.pontos_de_coleta.map((ponto, idx) => (
                      <tr key={`${dateEntry.data}-${area.nome}-${ponto.nome}-${idx}`} 
                          className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="whitespace-nowrap px-3 py-2 text-sm text-gray-900">
                          {area.nome}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-sm text-gray-900">
                          {ponto.nome}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-900">
                          <div className="flex flex-wrap gap-2">
                            {ponto.medicoes.map((medicao, medicaoIdx) => (
                              <div
                                key={`${medicao.tipo}-${medicaoIdx}`}
                                className="inline-flex items-center bg-gray-100 px-2.5 py-0.5 rounded-full text-xs font-medium text-gray-800"
                              >
                                {medicao.tipo}: {medicao.valor}
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-900">
                          <div className="flex gap-2">
                            {ponto.medicoes
                              .filter(medicao => medicao.imageUrl)
                              .map((medicao, photoIdx) => (
                                <button
                                  key={`photo-${photoIdx}`}
                                  onClick={() => setSelectedImage(medicao.imageUrl!)}
                                  className="inline-flex items-center text-blue-600 hover:text-blue-800"
                                >
                                  <ImageIcon className="h-4 w-4" />
                                </button>
                              ))}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}