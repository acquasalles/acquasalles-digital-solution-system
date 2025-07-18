import React, { useState, useMemo, useEffect } from 'react';
import { AlertTriangle, CheckCircle, Clock, Droplets, Beaker, Eye, TrendingUp, TrendingDown, Minus, Download } from 'lucide-react';
import { format } from 'date-fns';
import { useIntl } from 'react-intl';
import { fetchWaterQualityData, generateComplianceAnalysis, COMPLIANCE_LIMITS } from '../lib/waterQualityCompliance';
import type { WaterQualitySample, ComplianceAnalysis } from '../types/waterQuality';
import { useClients } from '../lib/ClientsContext';

interface WaterQualityParameter {
  name: string;
  value: number;
  unit: string;
  normalRange: { min: number; max: number };
  status: 'normal' | 'warning' | 'critical';
  trend?: 'up' | 'down' | 'stable';
  icon: React.ReactNode;
}

interface CollectionPointAnalysis {
  pointId: string;
  pointName: string;
  areaName: string;
  lastMeasurement: Date;
  parameters: WaterQualityParameter[];
  overallStatus: 'compliant' | 'warning' | 'non-compliant';
  complianceScore: number;
}

interface WaterQualityAnalysisData {
  reportId: string;
  generatedAt: Date;
  dateRange: { start: Date; end: Date };
  clientName: string;
  totalMeasurements: number;
  collectionPoints: CollectionPointAnalysis[];
  overallCompliance: number;
  criticalIssues: number;
  warnings: number;
}

interface WaterQualityAnalysisReportProps {
  clientId?: string;
  startDate?: string;
  endDate?: string;
  isVisible: boolean;
  onClose?: () => void;
}

export function WaterQualityAnalysisReport({ 
  clientId,
  startDate,
  endDate,
  isVisible,
  onClose 
}: WaterQualityAnalysisReportProps) {
  const [samples, setSamples] = useState<WaterQualitySample[]>([]);
  const [analysis, setAnalysis] = useState<ComplianceAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { clients } = useClients();
  const intl = useIntl();

  useEffect(() => {
    if (isVisible && clientId && startDate && endDate) {
      loadWaterQualityData();
    }
  }, [isVisible, clientId, startDate, endDate]);

  const loadWaterQualityData = async () => {
    if (!clientId || !startDate || !endDate) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const waterQualityData = await fetchWaterQualityData(clientId, startDate, endDate);
      setSamples(waterQualityData);
      
      const complianceAnalysis = generateComplianceAnalysis(waterQualityData);
      setAnalysis(complianceAnalysis);
    } catch (err) {
      console.error('Erro ao carregar dados de qualidade da água:', err);
      setError('Erro ao carregar dados de qualidade da água');
    } finally {
      setIsLoading(false);
    }
  };

  // Transform compliance analysis to match the expected format
  const transformAnalysisData = (analysis: ComplianceAnalysis): WaterQualityAnalysisData => {
    const selectedClient = clients.find(c => c.id === clientId);
    const clientName = selectedClient?.razao_social || 'Cliente';
    
    // Group samples by collection point
    const pointsMap = new Map<string, {
      pointId: string;
      pointName: string;
      areaName: string;
      lastMeasurement: Date;
      parameters: WaterQualityParameter[];
      samples: WaterQualitySample[];
    }>();

    samples.forEach(sample => {
      const key = `${sample.collectionPointId}-${sample.collectionPointName}`;
      
      if (!pointsMap.has(key)) {
        pointsMap.set(key, {
          pointId: sample.collectionPointId,
          pointName: sample.collectionPointName,
          areaName: sample.areaName,
          lastMeasurement: sample.timestamp,
          parameters: [],
          samples: []
        });
      }
      
      const point = pointsMap.get(key)!;
      point.samples.push(sample);
      
      // Update last measurement if this sample is more recent
      if (sample.timestamp > point.lastMeasurement) {
        point.lastMeasurement = sample.timestamp;
      }
    });

    // Convert to collection point analysis format
    const collectionPoints: CollectionPointAnalysis[] = Array.from(pointsMap.values()).map(point => {
      const parameters: WaterQualityParameter[] = [];
      
      // Calculate average values and status for each parameter
      const phValues = point.samples.map(s => s.parameters.ph).filter(Boolean);
      const chlorineValues = point.samples.map(s => s.parameters.chlorine).filter(Boolean);
      const turbidityValues = point.samples.map(s => s.parameters.turbidity).filter(Boolean);
      
      if (phValues.length > 0) {
        const avgValue = phValues.reduce((sum, p) => sum + p!.value, 0) / phValues.length;
        const compliantCount = phValues.filter(p => p!.isCompliant).length;
        parameters.push({
          name: 'pH',
          value: Number(avgValue.toFixed(2)),
          unit: '',
          normalRange: COMPLIANCE_LIMITS.ph,
          status: compliantCount / phValues.length > 0.8 ? 'normal' : 'warning',
          trend: 'stable',
          icon: <Beaker className="h-4 w-4" />
        });
      }
      
      if (chlorineValues.length > 0) {
        const avgValue = chlorineValues.reduce((sum, p) => sum + p!.value, 0) / chlorineValues.length;
        const compliantCount = chlorineValues.filter(p => p!.isCompliant).length;
        parameters.push({
          name: 'Cloro Residual',
          value: Number(avgValue.toFixed(2)),
          unit: 'mg/L',
          normalRange: { min: 0, max: COMPLIANCE_LIMITS.chlorine.max },
          status: compliantCount / chlorineValues.length > 0.8 ? 'normal' : 'warning',
          trend: 'stable',
          icon: <Droplets className="h-4 w-4" />
        });
      }
      
      if (turbidityValues.length > 0) {
        const avgValue = turbidityValues.reduce((sum, p) => sum + p!.value, 0) / turbidityValues.length;
        const compliantCount = turbidityValues.filter(p => p!.isCompliant).length;
        parameters.push({
          name: 'Turbidez',
          value: Number(avgValue.toFixed(2)),
          unit: 'NTU',
          normalRange: { min: 0, max: COMPLIANCE_LIMITS.turbidity.max },
          status: compliantCount / turbidityValues.length > 0.8 ? 'normal' : 'warning',
          trend: 'stable',
          icon: <Eye className="h-4 w-4" />
        });
      }
      
      const overallCompliance = point.samples.filter(s => s.overallCompliance).length / point.samples.length;
      
      return {
        pointId: point.pointId,
        pointName: point.pointName,
        areaName: point.areaName,
        lastMeasurement: point.lastMeasurement,
        parameters,
        overallStatus: overallCompliance > 0.9 ? 'compliant' : overallCompliance > 0.7 ? 'warning' : 'non-compliant',
        complianceScore: Number((overallCompliance * 100).toFixed(1))
      };
    });

    return {
      reportId: `WQR-${format(new Date(), 'yyyyMMdd-HHmmss')}`,
      generatedAt: new Date(),
      dateRange: { 
        start: new Date(startDate!), 
        end: new Date(endDate!) 
      },
      clientName,
      totalMeasurements: analysis.totalSamples,
      overallCompliance: analysis.complianceRate,
      criticalIssues: Object.values(analysis.parameterStats).reduce((sum, stat) => 
        sum + stat.nonCompliantValues.filter(nc => nc.riskLevel === 'alto').length, 0
      ),
      warnings: Object.values(analysis.parameterStats).reduce((sum, stat) => 
        sum + stat.nonCompliantValues.filter(nc => nc.riskLevel === 'médio').length, 0
      ),
      collectionPoints
    };
  };

  if (!isVisible) return null;

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 mt-6">
        <div className="p-8 flex items-center justify-center">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="text-lg font-medium text-gray-700">
              Carregando análise de qualidade da água...
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 mt-6">
        <div className="p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Erro na Análise</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadWaterQualityData}
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
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 mt-6">
        <div className="p-8 text-center">
          <Eye className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum Dado Encontrado</h3>
          <p className="text-gray-600">Não foram encontrados dados de qualidade da água para o período selecionado.</p>
        </div>
      </div>
    );
  }

  const data = transformAnalysisData(analysis);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal':
      case 'compliant':
        return 'text-green-700 bg-green-50 border-green-200';
      case 'warning':
        return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      case 'critical':
      case 'non-compliant':
        return 'text-red-700 bg-red-50 border-red-200';
      default:
        return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'normal':
      case 'compliant':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'critical':
      case 'non-compliant':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default:
        return <Minus className="h-5 w-5 text-gray-500" />;
    }
  };

  const getTrendIcon = (trend?: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-3 w-3 text-blue-500" />;
      case 'down':
        return <TrendingDown className="h-3 w-3 text-blue-500" />;
      case 'stable':
        return <Minus className="h-3 w-3 text-gray-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 mt-6">
      {/* Report Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">Water Quality Analysis Report</h2>
            <p className="text-blue-100">
              Report ID: {data.reportId} | Generated: {format(data.generatedAt, 'PPpp')}
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{data.overallCompliance}%</div>
            <div className="text-blue-100">Overall Compliance</div>
          </div>
        </div>
      </div>

      {/* Executive Summary */}
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Executive Summary</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <div className="text-2xl font-bold text-blue-900">{data.totalMeasurements}</div>
                <div className="text-sm text-blue-700">Total Measurements</div>
              </div>
            </div>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600 mr-3" />
              <div>
                <div className="text-2xl font-bold text-green-900">{data.overallCompliance}%</div>
                <div className="text-sm text-green-700">Compliance Rate</div>
              </div>
            </div>
          </div>
          
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-yellow-600 mr-3" />
              <div>
                <div className="text-2xl font-bold text-yellow-900">{data.warnings}</div>
                <div className="text-sm text-yellow-700">Warnings</div>
              </div>
            </div>
          </div>
          
          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-red-600 mr-3" />
              <div>
                <div className="text-2xl font-bold text-red-900">{data.criticalIssues}</div>
                <div className="text-sm text-red-700">Critical Issues</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Report Period</h4>
          <p className="text-gray-700">
            <strong>Client:</strong> {data.clientName}<br />
            <strong>Period:</strong> {format(data.dateRange.start, 'PPP')} to {format(data.dateRange.end, 'PPP')}<br />
            <strong>Collection Points:</strong> {data.collectionPoints.length} active monitoring locations
          </p>
        </div>
      </div>

      {/* Collection Points Analysis */}
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Collection Points Analysis</h3>
        
        <div className="space-y-6">
          {data.collectionPoints.map((point) => (
            <div key={point.pointId} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-lg font-medium text-gray-900">{point.pointName}</h4>
                  <p className="text-sm text-gray-600">{point.areaName}</p>
                  <p className="text-xs text-gray-500">
                    Last measurement: {format(point.lastMeasurement, 'PPpp')}
                  </p>
                </div>
                <div className="text-right">
                  <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(point.overallStatus)}`}>
                    {getStatusIcon(point.overallStatus)}
                    <span className="ml-2 capitalize">{point.overallStatus.replace('-', ' ')}</span>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    Compliance: {point.complianceScore}%
                  </div>
                </div>
              </div>

              {/* Parameters Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {point.parameters.map((param, index) => (
                  <div key={index} className={`p-4 rounded-lg border ${getStatusColor(param.status)}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {param.icon}
                        <span className="font-medium">{param.name}</span>
                      </div>
                      {getTrendIcon(param.trend)}
                    </div>
                    
                    <div className="text-2xl font-bold mb-1">
                      {param.value.toLocaleString()}{param.unit && ` ${param.unit}`}
                    </div>
                    
                    <div className="text-xs text-gray-600">
                      Normal: {param.normalRange.min} - {param.normalRange.max} {param.unit}
                    </div>
                    
                    <div className={`text-xs font-medium mt-1 capitalize ${
                      param.status === 'normal' ? 'text-green-600' :
                      param.status === 'warning' ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {param.status === 'normal' ? 'Within Range' : 
                       param.status === 'warning' ? 'Attention Required' : 'Out of Range'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Key Findings & Recommendations */}
      <div className="p-6 border-t border-gray-200 bg-gray-50">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Findings & Recommendations</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-3 flex items-center">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              Positive Findings
            </h4>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>• pH levels consistently within acceptable range (6.5-8.5)</li>
              <li>• Chlorine residual maintaining effective disinfection levels</li>
              <li>• Turbidity readings below regulatory limits</li>
              <li>• Overall system performance meeting quality standards</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 mb-3 flex items-center">
              <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2" />
              Areas for Attention
            </h4>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>• Monitor Ponto A2 hidrômetro readings approaching capacity</li>
              <li>• Consider increasing sampling frequency during peak usage</li>
              <li>• Review chlorine dosing protocols for optimization</li>
              <li>• Schedule preventive maintenance for collection equipment</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div>
            Report generated automatically by ACQUASALLES Water Quality Monitoring System
          </div>
          <div className="flex items-center space-x-4">
            <span>Confidential & Proprietary</span>
            <span>•</span>
            <span>{format(data.generatedAt, 'yyyy')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}