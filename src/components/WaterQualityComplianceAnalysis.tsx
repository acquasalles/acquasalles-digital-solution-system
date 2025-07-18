import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  TrendingUp, 
  TrendingDown,
  FileText,
  Download,
  Calendar,
  MapPin,
  Beaker,
  Droplets,
  Eye,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { useIntl } from 'react-intl';
import { fetchWaterQualityData, generateComplianceAnalysis, COMPLIANCE_LIMITS } from '../lib/waterQualityCompliance';
import type { WaterQualitySample, ComplianceAnalysis } from '../types/waterQuality';

interface WaterQualityComplianceAnalysisProps {
  clientId: string;
  startDate: string;
  endDate: string;
  onClose?: () => void;
}

export function WaterQualityComplianceAnalysis({
  clientId,
  startDate,
  endDate,
  onClose
}: WaterQualityComplianceAnalysisProps) {
  const [samples, setSamples] = useState<WaterQualitySample[]>([]);
  const [analysis, setAnalysis] = useState<ComplianceAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'samples' | 'nonCompliance'>('overview');
  const intl = useIntl();

  useEffect(() => {
    if (clientId && startDate && endDate) {
      loadComplianceData();
    }
  }, [clientId, startDate, endDate]);

  const loadComplianceData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const waterQualityData = await fetchWaterQualityData(clientId, startDate, endDate);
      setSamples(waterQualityData);
      
      const complianceAnalysis = generateComplianceAnalysis(waterQualityData);
      setAnalysis(complianceAnalysis);
    } catch (err) {
      console.error('Erro ao carregar dados de conformidade:', err);
      setError('Erro ao carregar dados de conformidade da qualidade da água');
    } finally {
      setIsLoading(false);
    }
  };

  const getComplianceIcon = (isCompliant: boolean) => {
    return isCompliant ? (
      <CheckCircle className="h-5 w-5 text-green-500" />
    ) : (
      <XCircle className="h-5 w-5 text-red-500" />
    );
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'baixo':
        return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      case 'médio':
        return 'text-orange-700 bg-orange-50 border-orange-200';
      case 'alto':
        return 'text-red-700 bg-red-50 border-red-200';
      default:
        return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  const getParameterIcon = (parameterName: string) => {
    switch (parameterName.toLowerCase()) {
      case 'ph':
        return <Beaker className="h-4 w-4" />;
      case 'cloro residual':
        return <Droplets className="h-4 w-4" />;
      case 'turbidez':
        return <Eye className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mr-3" />
          <span className="text-lg font-medium text-gray-700">
            Analisando conformidade da qualidade da água...
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Erro na Análise</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadComplianceData}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="text-center">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum Dado Encontrado</h3>
          <p className="text-gray-600">Não foram encontrados dados de qualidade da água para o período selecionado.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">Análise de Conformidade - Qualidade da Água</h2>
            <p className="text-blue-100">
              Período: {format(new Date(startDate), 'dd/MM/yyyy')} - {format(new Date(endDate), 'dd/MM/yyyy')}
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{analysis.complianceRate}%</div>
            <div className="text-blue-100">Taxa de Conformidade</div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          {[
            { id: 'overview', label: 'Visão Geral', icon: TrendingUp },
            { id: 'samples', label: 'Amostras', icon: FileText },
            { id: 'nonCompliance', label: 'Não Conformidades', icon: AlertTriangle }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id as any)}
              className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                selectedTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4 mr-2" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="p-6">
        {selectedTab === 'overview' && (
          <div className="space-y-6">
            {/* Resumo Executivo */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-center">
                  <FileText className="h-8 w-8 text-blue-600 mr-3" />
                  <div>
                    <div className="text-2xl font-bold text-blue-900">{analysis.totalSamples}</div>
                    <div className="text-sm text-blue-700">Total de Amostras</div>
                  </div>
                </div>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <div className="flex items-center">
                  <CheckCircle className="h-8 w-8 text-green-600 mr-3" />
                  <div>
                    <div className="text-2xl font-bold text-green-900">{analysis.compliantSamples}</div>
                    <div className="text-sm text-green-700">Amostras Conformes</div>
                  </div>
                </div>
              </div>
              
              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <div className="flex items-center">
                  <XCircle className="h-8 w-8 text-red-600 mr-3" />
                  <div>
                    <div className="text-2xl font-bold text-red-900">{analysis.nonCompliantSamples}</div>
                    <div className="text-sm text-red-700">Não Conformes</div>
                  </div>
                </div>
              </div>
              
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <div className="flex items-center">
                  <TrendingUp className="h-8 w-8 text-purple-600 mr-3" />
                  <div>
                    <div className="text-2xl font-bold text-purple-900">{analysis.complianceRate}%</div>
                    <div className="text-sm text-purple-700">Taxa de Conformidade</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Estatísticas por Parâmetro */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {Object.entries(analysis.parameterStats).map(([key, stats]) => {
                const parameterName = key === 'ph' ? 'pH' : key === 'chlorine' ? 'Cloro Residual' : 'Turbidez';
                const unit = key === 'ph' ? '' : key === 'chlorine' ? 'mg/L' : 'NTU';
                
                return (
                  <div key={key} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div className="flex items-center mb-3">
                      {getParameterIcon(parameterName)}
                      <h4 className="font-medium text-gray-900 ml-2">{parameterName}</h4>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total de Medições:</span>
                        <span className="font-medium">{stats.totalMeasurements}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Conformes:</span>
                        <span className="font-medium text-green-600">{stats.compliantMeasurements}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Taxa de Conformidade:</span>
                        <span className="font-medium">{stats.complianceRate.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Valor Médio:</span>
                        <span className="font-medium">{stats.averageValue.toFixed(2)} {unit}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Não Conformidades:</span>
                        <span className="font-medium text-red-600">{stats.nonCompliantValues.length}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Limites de Conformidade */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-900 mb-3">Limites de Conformidade Estabelecidos</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-blue-700">pH:</span>
                  <span className="font-medium text-blue-900">
                    {COMPLIANCE_LIMITS.ph.min} - {COMPLIANCE_LIMITS.ph.max}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-blue-700">Cloro Residual:</span>
                  <span className="font-medium text-blue-900">
                    até {COMPLIANCE_LIMITS.chlorine.max} mg/L
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-blue-700">Turbidez:</span>
                  <span className="font-medium text-blue-900">
                    até {COMPLIANCE_LIMITS.turbidity.max} NTU
                  </span>
                </div>
              </div>
            </div>

            {/* Recomendações */}
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <h4 className="font-medium text-yellow-900 mb-3 flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2" />
                Recomendações
              </h4>
              <ul className="space-y-2 text-sm text-yellow-800">
                {analysis.recommendations.map((recommendation, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-yellow-600 mr-2">•</span>
                    {recommendation}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {selectedTab === 'samples' && (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data/Hora
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ponto de Coleta
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      pH
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cloro (mg/L)
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Turbidez (NTU)
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status Geral
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {samples.map((sample) => (
                    <tr key={sample.id} className={sample.overallCompliance ? 'bg-white' : 'bg-red-50'}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>
                          <div className="font-medium">{format(sample.timestamp, 'dd/MM/yyyy')}</div>
                          <div className="text-gray-500">{format(sample.timestamp, 'HH:mm')}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>
                          <div className="font-medium">{sample.collectionPointName}</div>
                          <div className="text-gray-500">{sample.areaName}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {sample.parameters.ph ? (
                          <div className="flex items-center justify-center space-x-2">
                            {getComplianceIcon(sample.parameters.ph.isCompliant)}
                            <span className={`text-sm font-medium ${
                              sample.parameters.ph.isCompliant ? 'text-green-700' : 'text-red-700'
                            }`}>
                              {sample.parameters.ph.value.toFixed(2)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {sample.parameters.chlorine ? (
                          <div className="flex items-center justify-center space-x-2">
                            {getComplianceIcon(sample.parameters.chlorine.isCompliant)}
                            <span className={`text-sm font-medium ${
                              sample.parameters.chlorine.isCompliant ? 'text-green-700' : 'text-red-700'
                            }`}>
                              {sample.parameters.chlorine.value.toFixed(2)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {sample.parameters.turbidity ? (
                          <div className="flex items-center justify-center space-x-2">
                            {getComplianceIcon(sample.parameters.turbidity.isCompliant)}
                            <span className={`text-sm font-medium ${
                              sample.parameters.turbidity.isCompliant ? 'text-green-700' : 'text-red-700'
                            }`}>
                              {sample.parameters.turbidity.value.toFixed(2)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center space-x-2">
                          {getComplianceIcon(sample.overallCompliance)}
                          <span className={`text-sm font-medium ${
                            sample.overallCompliance ? 'text-green-700' : 'text-red-700'
                          }`}>
                            {sample.overallCompliance ? 'CONFORME' : 'NÃO CONFORME'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {selectedTab === 'nonCompliance' && (
          <div className="space-y-6">
            {Object.entries(analysis.parameterStats).map(([key, stats]) => {
              if (stats.nonCompliantValues.length === 0) return null;
              
              const parameterName = key === 'ph' ? 'pH' : key === 'chlorine' ? 'Cloro Residual' : 'Turbidez';
              const unit = key === 'ph' ? '' : key === 'chlorine' ? 'mg/L' : 'NTU';
              
              return (
                <div key={key} className="bg-red-50 p-4 rounded-lg border border-red-200">
                  <h4 className="font-medium text-red-900 mb-4 flex items-center">
                    {getParameterIcon(parameterName)}
                    <span className="ml-2">{parameterName} - Não Conformidades ({stats.nonCompliantValues.length})</span>
                  </h4>
                  
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-red-200">
                      <thead className="bg-red-100">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-red-700 uppercase">
                            Data/Hora
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-red-700 uppercase">
                            Ponto
                          </th>
                          <th className="px-4 py-2 text-center text-xs font-medium text-red-700 uppercase">
                            Valor Medido
                          </th>
                          <th className="px-4 py-2 text-center text-xs font-medium text-red-700 uppercase">
                            Limite
                          </th>
                          <th className="px-4 py-2 text-center text-xs font-medium text-red-700 uppercase">
                            Desvio (%)
                          </th>
                          <th className="px-4 py-2 text-center text-xs font-medium text-red-700 uppercase">
                            Risco
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-red-200">
                        {stats.nonCompliantValues.map((nc, index) => (
                          <tr key={index}>
                            <td className="px-4 py-2 text-sm text-gray-900">
                              {format(nc.timestamp, 'dd/MM/yyyy HH:mm')}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-900">
                              {nc.pointName}
                            </td>
                            <td className="px-4 py-2 text-center text-sm font-medium text-red-700">
                              {nc.value.toFixed(2)} {unit}
                            </td>
                            <td className="px-4 py-2 text-center text-sm text-gray-600">
                              {key === 'ph' 
                                ? `${COMPLIANCE_LIMITS.ph.min} - ${COMPLIANCE_LIMITS.ph.max}`
                                : `≤ ${key === 'chlorine' ? COMPLIANCE_LIMITS.chlorine.max : COMPLIANCE_LIMITS.turbidity.max} ${unit}`
                              }
                            </td>
                            <td className="px-4 py-2 text-center text-sm font-medium text-red-700">
                              {nc.deviation.toFixed(1)}%
                            </td>
                            <td className="px-4 py-2 text-center">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getRiskColor(nc.riskLevel)}`}>
                                {nc.riskLevel.toUpperCase()}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
            
            {Object.values(analysis.parameterStats).every(stats => stats.nonCompliantValues.length === 0) && (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma Não Conformidade Detectada</h3>
                <p className="text-gray-600">Todas as amostras estão dentro dos limites de conformidade estabelecidos.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div>
            Análise gerada automaticamente pelo Sistema ACQUASALLES
          </div>
          <div className="flex items-center space-x-4">
            <span>Confidencial & Proprietário</span>
            <span>•</span>
            <span>{format(new Date(), 'yyyy')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}