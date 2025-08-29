import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { Download, Printer, Calendar, MapPin, Phone, Mail, Building, FileText, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { Bar, getElementAtEvent, getDatasetAtEvent } from 'react-chartjs-2';
import { generatePDF } from '../lib/generatePDF';
import { useIntl } from 'react-intl';
import type { ReportData } from '../types/report';
import { fetchWaterQualityData, generateComplianceAnalysis } from '../lib/waterQualityCompliance';
import type { ComplianceAnalysis } from '../types/waterQuality';
import { fetchWaterQualityData, generateComplianceAnalysis } from '../lib/waterQualityCompliance';
import type { ComplianceAnalysis } from '../types/waterQuality';
import type { Chart } from 'chart.js';

interface ClientInfo {
  name: string;
  cnpj: string;
  address: string;
  city: string;
  state: string;
  phone: string;
  email: string;
  contact: string;
}

interface CollectionPointData {
  id: string;
  name: string;
  graphData: any;
  graphOptions: any;
  datasetStats: Array<{
    label: string;
    min: number;
    max: number;
    avg: number;
    total?: number;
    color: string;
    hidden: boolean;
  }>;
  isLoading: boolean;
  error: string | null;
}

interface A4ReportPreviewProps {
  clientInfo?: ClientInfo;
  collectionPointsData?: CollectionPointData[];
  reportData?: ReportData;
  reportTitle?: string;
  reportPeriod?: { start: Date; end: Date };
  onDownloadPDF?: (chartImages?: Map<string, string>) => Promise<void>;
  isGeneratingPDF?: boolean;
  clientId?: string;
}

// Default client info
const defaultClientInfo: ClientInfo = {
  name: 'ACQUASALLES LTDA',
  cnpj: '16.716.417/0001-95',
  address: 'Rua Industrial, 123',
  city: 'São Paulo',
  state: 'SP',
  phone: '+55 (11) 1234-5678',
  email: 'contato@acquasalles.com.br',
  contact: 'João Silva - Gerente de Qualidade'
};

export function A4ReportPreview({
  clientInfo = defaultClientInfo,
  collectionPointsData = [],
  reportData,
  reportTitle = 'Relatório de Qualidade da Água',
  reportPeriod = {
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    end: new Date()
  },
  onDownloadPDF,
  isGeneratingPDF = false,
  clientId
}: A4ReportPreviewProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [chartImages, setChartImages] = useState<Map<string, string>>(new Map());
  const chartRefs = useRef<Map<string, Chart>>(new Map());
  const reportRef = useRef<HTMLDivElement>(null);
  const [realAnalysis, setRealAnalysis] = useState<ComplianceAnalysis | null>(null);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const intl = useIntl();

  // Load real water quality data for accurate statistics
  useEffect(() => {
    if (clientId && reportPeriod) {
      const loadRealData = async () => {
        setIsLoadingAnalysis(true);
        try {
          const startDateString = format(reportPeriod.start, 'yyyy-MM-dd');
          const endDateString = format(reportPeriod.end, 'yyyy-MM-dd');
          
          const waterQualityData = await fetchWaterQualityData(clientId, startDateString, endDateString);
          const complianceAnalysis = generateComplianceAnalysis(waterQualityData);
          setRealAnalysis(complianceAnalysis);
          
          console.log('Real analysis loaded:', complianceAnalysis);
        } catch (error) {
          console.error('Error loading real water quality data:', error);
          // Use default analysis on error
          setRealAnalysis(null);
        } finally {
          setIsLoadingAnalysis(false);
        }
      };
      
      loadRealData();
    }
  }, [clientId, reportPeriod]);
  // Function to register chart reference
  const registerChart = useCallback((pointId: string, chartInstance: Chart | null) => {
    if (chartInstance) {
      chartRefs.current.set(pointId, chartInstance);
      console.log(`Chart registered for point: ${pointId}`);
    } else {
      chartRefs.current.delete(pointId);
    }
  }, []);

  // Function to capture chart images
  const captureChartImages = useCallback(async () => {
    const newChartImages = new Map<string, string>();
    
    // Wait a bit for charts to fully render
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log(`Attempting to capture ${chartRefs.current.size} chart images...`);
    
    for (const [pointId, chartInstance] of chartRefs.current.entries()) {
      try {
        if (chartInstance && chartInstance.canvas) {
          // Force chart update before capture
          chartInstance.update();
          
          // Wait a bit more after update
          await new Promise(resolve => setTimeout(resolve, 100));
          
          const base64Image = chartInstance.toBase64Image('image/png', 1.0);
          newChartImages.set(pointId, base64Image);
          console.log(`Captured chart image for point: ${pointId}`);
        }
      } catch (error) {
        console.error(`Error capturing chart for point ${pointId}:`, error);
      }
    }
    
    setChartImages(newChartImages);
    console.log(`Total chart images captured: ${newChartImages.size}`);
    return newChartImages;
  }, []);

  // Capture chart images when charts are visible
  useEffect(() => {
    if (collectionPointsData.length > 0 && currentPage > 1 && currentPage <= 1 + totalChartPages) {
      // Delay capture to ensure charts are rendered
      const timer = setTimeout(() => {
        console.log('Auto-capturing charts due to page change...');
        captureChartImages();
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [collectionPointsData, currentPage, captureChartImages, totalChartPages]);

  // Filter valid collection points with data
  const validCollectionPoints = collectionPointsData.filter(
    point => point.graphData && !point.error && !point.isLoading
  );

  // Calculate charts per page (3 columns, 2 rows = 6 charts per page in landscape)
  const chartsPerPage = 6;
  const totalChartPages = Math.ceil(validCollectionPoints.length / chartsPerPage);
  const totalPages = 1 + totalChartPages + (reportData ? 1 : 0); // Client info + Chart pages + Table page (if reportData exists)
  // Calculate statistics from available data
  const stats = useMemo(() => {
    if (realAnalysis) {
      // Use real analysis data when available
      const uniqueCollectionPoints = collectionPointsData.length;
      const totalDaysWithMeasurements = reportData?.datas.length || 0;
      const totalParameters = Object.entries(realAnalysis.parameterStats).reduce((sum, [key, stat]) => {
        return sum + (stat.totalMeasurements > 0 ? 1 : 0);
      }, 0);
      const criticalIssues = Object.entries(realAnalysis.parameterStats).reduce((sum, [key, stat]) => {
        const criticalCount = stat.nonCompliantValues.filter(nc => nc.riskLevel === 'alto').length;
        return sum + criticalCount;
      }, 0);
      const warnings = Object.entries(realAnalysis.parameterStats).reduce((sum, [key, stat]) => {
        const warningCount = stat.nonCompliantValues.filter(nc => nc.riskLevel === 'médio').length;
        return sum + warningCount;
      }, 0);

      return {
        totalCollectionPoints: uniqueCollectionPoints,
        totalMeasurementDays: totalDaysWithMeasurements,
        totalParameters,
        daysAnalyzed: Math.round((reportPeriod.end.getTime() - reportPeriod.start.getTime()) / (1000 * 60 * 60 * 24)),
        criticalAlerts: criticalIssues,
        warnings,
        complianceRate: realAnalysis.complianceRate
      };
    }
    
    // Fallback to calculated data
    return {
      totalCollectionPoints: collectionPointsData.length,
      totalMeasurementDays: reportData?.datas.length || 0,
      totalParameters: collectionPointsData.reduce((acc, point) => 
        acc + point.datasetStats.filter(stat => !stat.hidden).length, 0
      ),
      daysAnalyzed: Math.round((reportPeriod.end.getTime() - reportPeriod.start.getTime()) / (1000 * 60 * 60 * 24)),
      criticalAlerts: 0,
      warnings: 2,
      complianceRate: 87.5
    };
  }, [collectionPointsData, reportData, reportPeriod, realAnalysis]);

  const handleDownloadPDF = useCallback(async () => {
    if (onDownloadPDF) {
      // Capture latest chart images before download
      console.log('Capturing chart images before PDF generation...');
      const latestChartImages = await captureChartImages();
      console.log(`Captured ${chartImages.size} chart images for PDF generation`);
      await onDownloadPDF(latestChartImages.size > 0 ? latestChartImages : chartImages);
    } else if (reportData) {
      try {
        await generatePDF(reportData, intl);
      } catch (error) {
        console.error('Error generating PDF:', error);
      }
    }
  }, [onDownloadPDF, reportData, intl, captureChartImages, chartImages]);


  // Effect to capture chart images when page changes to charts
  useEffect(() => {
    if (currentPage > 1 && currentPage <= 1 + totalChartPages && validCollectionPoints.length > 0) {
      const timer = setTimeout(() => {
        console.log('Page changed to charts, capturing images...');
        captureChartImages();
      }, 1500); // Increased delay to ensure charts are fully rendered
      
      return () => clearTimeout(timer);
    }
  }, [currentPage, validCollectionPoints.length, totalChartPages, captureChartImages]);
  
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'normal':
        return 'text-green-700';
      case 'warning':
        return 'text-yellow-700';
      case 'critical':
        return 'text-red-700';
      default:
        return 'text-gray-700';
    }
  };


  const getCurrentPageCharts = () => {
    if (currentPage <= 1 || currentPage > 1 + totalChartPages) return [];
    const pageIndex = currentPage - 2; // Adjust for client info page
    const startIndex = pageIndex * chartsPerPage;
    return validCollectionPoints.slice(startIndex, startIndex + chartsPerPage);
  };

  // Generate table data from reportData with improved merged columns logic
  const generateTableData = useMemo(() => {
    if (!reportData) return null;

    const collectionPointsMap = new Map<string, {
      id: string;
      name: string;
      measurements: Array<{
        parameter: string;
        unit: string;
      }>;
    }>();

    const rowsMap = new Map<string, {
      date: string;
      pointData: Map<string, Array<{
        parameter: string;
        value: string;
        unit?: string;
        status?: 'normal' | 'warning' | 'critical';
      }>>;
    }>();

    // First pass: collect all collection points and their measurement types
    reportData.datas.forEach(dateEntry => {
      dateEntry.area.forEach(area => {
        area.pontos_de_coleta.forEach(ponto => {
          const pointId = `${area.nome}-${ponto.nome}`;
          
          // Add collection point if not already added
          if (!collectionPointsMap.has(pointId)) {
            collectionPointsMap.set(pointId, {
              id: pointId,
              name: ponto.nome,
              measurements: []
            });
          }

          const point = collectionPointsMap.get(pointId)!;
          
          // Add measurement types to this point with units
          ponto.medicoes
            .filter(m => m.tipo !== 'Foto')
            .forEach(m => {
              const measurementType = m.tipo === 'Vazão' ? 'Volume' : m.tipo;
              const unit = m.tipo === 'pH' ? '' : 
                          m.tipo === 'Cloro' ? 'mg/L' : 
                          m.tipo === 'Turbidez' ? 'NTU' : 
                          m.tipo === 'Vazão' ? 'L' : 
                          m.tipo === 'Hidrômetro' ? 'L' : '';
              
              // Check if this measurement type already exists for this point
              const existingMeasurement = point.measurements.find(m => m.parameter === measurementType);
              if (!existingMeasurement) {
                point.measurements.push({
                  parameter: measurementType,
                  unit: unit
                });
              }
            });
        });
      });
    });

    // Second pass: organize data by date and point
    reportData.datas.forEach(dateEntry => {
      if (!rowsMap.has(dateEntry.data)) {
        rowsMap.set(dateEntry.data, {
          date: dateEntry.data,
          pointData: new Map()
        });
      }

      const row = rowsMap.get(dateEntry.data)!;

      dateEntry.area.forEach(area => {
        area.pontos_de_coleta.forEach(ponto => {
          const pointId = `${area.nome}-${ponto.nome}`;
          
          if (!row.pointData.has(pointId)) {
            row.pointData.set(pointId, []);
          }

          const pointMeasurements = row.pointData.get(pointId)!;
          
          // Add measurements for this point
          ponto.medicoes
            .filter(m => m.tipo !== 'Foto')
            .forEach(m => {
              const measurementType = m.tipo === 'Vazão' ? 'Volume' : m.tipo;
              const unit = m.tipo === 'pH' ? '' : 
                          m.tipo === 'Cloro' ? 'mg/L' : 
                          m.tipo === 'Turbidez' ? 'NTU' : 
                          m.tipo === 'Vazão' ? 'L' : 
                          m.tipo === 'Hidrômetro' ? 'L' : '';

              pointMeasurements.push({
                parameter: measurementType,
                value: m.valor.toString(),
                unit: unit,
                status: 'normal' as const
              });
            });
        });
      });
    });

    // Convert to arrays and sort
    const collectionPoints = Array.from(collectionPointsMap.values()).map(point => ({
      ...point,
      measurements: point.measurements.sort((a, b) => a.parameter.localeCompare(b.parameter))
    }));

    const rows = Array.from(rowsMap.values())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 30); // Show 30 rows for the table

    return {
      headers: ['Data', ...collectionPoints.map(cp => cp.name)],
      collectionPoints,
      rows
    };
  }, [reportData]);

  return (
    <div className="bg-gray-100 min-h-screen py-8">
      <div className="max-w-7xl mx-auto">
        {/* Control Panel */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h2 className="text-lg font-semibold text-gray-900">Visualização do Relatório (Paisagem)</h2>
              <div className="text-sm text-gray-600">
                Página {currentPage} de {totalPages}
              </div>
              {isLoadingAnalysis && (
                <div className="flex items-center space-x-2 text-sm text-blue-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Carregando dados reais...</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Próxima
                </button>
              </div>
              
              <button
                onClick={handleDownloadPDF}
                disabled={isGeneratingPDF}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-blue-300 transition-colors duration-200"
              >
                {isGeneratingPDF ? (
                  <>
                    <Loader2 className="animate-spin h-4 w-4 mr-2" />
                    Gerando PDF...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* A4 Landscape Document Container */}
        <div 
          ref={reportRef}
          className="bg-white shadow-lg mx-auto"
          style={{
            width: '297mm',  // Landscape width
            minHeight: '210mm',  // Landscape height
            padding: '10mm',  // Reduced padding for more space
            fontSize: '9px',  // Smaller base font size
            lineHeight: '1.2'  // Tighter line height
          }}
        >
          {/* Page 1: Client Information */}
          {currentPage === 1 && (
            <div className="h-full flex flex-col">
              {/* Header */}
              <div className="border-b-2 border-blue-600 pb-3 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-xl font-bold text-gray-900 mb-1">{reportTitle}</h1>
                    <p className="text-gray-600 text-sm">
                      Período: {format(reportPeriod.start, 'dd/MM/yyyy')} - {format(reportPeriod.end, 'dd/MM/yyyy')}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-600">Relatório Nº</div>
                    <div className="text-base font-semibold">WQR-{format(new Date(), 'yyyyMMdd')}</div>
                  </div>
                </div>
              </div>

              {/* Client Information Section - Optimized for Landscape */}
              <div className="mb-4">
                <h2 className="text-base font-semibold text-gray-900 mb-3">
                  Informações do Cliente
                </h2>
                
                {/* Horizontal layout for landscape */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <h3 className="font-semibold text-gray-900 mb-2 text-sm">Dados da Empresa</h3>
                    <div className="space-y-1">
                      <div>
                        <span className="font-medium text-gray-700 text-xs">CNPJ:</span>
                        <div className="text-gray-900 text-xs">{clientInfo.cnpj}</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-3 rounded-lg">
                    <h3 className="font-semibold text-gray-900 mb-2 text-sm">Endereço</h3>
                    <div className="space-y-1">
                      <div>
                        <span className="font-medium text-gray-700 text-xs">Endereço:</span>
                        <div className="text-gray-900 text-xs">{clientInfo.address}</div>
                        <span className="font-medium text-gray-700 text-xs">Cidade:</span>
                        <div className="text-gray-900 text-xs">{clientInfo.city} - {clientInfo.state}</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-3 rounded-lg">
                    <h3 className="font-semibold text-gray-900 mb-2 text-sm">Contato</h3>
                    <div className="space-y-1">
                      <div>
                        <span className="font-medium text-gray-700 text-xs">Telefone:</span>
                        <div className="text-gray-900 text-xs">{clientInfo.phone}</div>
                        <span className="font-medium text-gray-700 text-xs">Email:</span>
                        <div className="text-gray-900 text-xs">{clientInfo.email}</div>
                        <span className="font-medium text-gray-700 text-xs">Responsável:</span>
                        <div className="text-gray-900 text-xs">{clientInfo.contact}</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                    <h3 className="font-semibold text-blue-900 mb-2 flex items-center text-sm">
                      <Calendar className="h-3 w-3 mr-1" />
                      Período do Relatório
                    </h3>
                    <div className="space-y-1 text-blue-900 text-xs">
                      <div><strong>Início:</strong> {format(reportPeriod.start, 'dd/MM/yyyy')}</div>
                      <div><strong>Fim:</strong> {format(reportPeriod.end, 'dd/MM/yyyy')}</div>
                      <div><strong>Gerado em:</strong> {format(new Date(), 'dd/MM/yyyy HH:mm')}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Summary Section - Using real data */}
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200 mb-4 mt-4">
                <h3 className="font-semibold text-blue-900 mb-3 flex items-center text-sm">
                  <FileText className="h-4 w-4 mr-2" />
                  Resumo Executivo
                </h3>
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div className="bg-white p-2 rounded-lg">
                    <div className="text-lg font-bold text-blue-600">{stats.totalCollectionPoints}</div>
                    <div className="text-xs text-gray-600">Pontos de Coleta</div>
                  </div>
                  <div className="bg-white p-2 rounded-lg">
                    <div className="text-lg font-bold text-green-600">{stats.totalMeasurementDays}</div>
                    <div className="text-xs text-gray-600">Dias com Medições</div>
                  </div>
                  <div className="bg-white p-2 rounded-lg">
                    <div className="text-lg font-bold text-purple-600">
                      {stats.totalParameters}
                    </div>
                    <div className="text-xs text-gray-600">Parâmetros</div>
                  </div>
                  <div className="bg-white p-2 rounded-lg">
                    <div className="text-lg font-bold text-orange-600">{stats.complianceRate}%</div>
                    <div className="text-xs text-gray-600">Taxa Conformidade</div>
                  </div>
                </div>
              </div>

              {/* Data source indicator */}
              <div className={`p-3 rounded-lg border mb-4 ${realAnalysis ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'}`}>
                <div className={`text-xs text-center ${realAnalysis ? 'text-green-700' : 'text-orange-700'}`}>
                  {realAnalysis ? (
                    <>
                      <CheckCircle className="h-4 w-4 inline mr-1" />
                      <span className="font-medium">✓ Usando dados reais da análise de conformidade</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-4 w-4 inline mr-1" />
                      <span className="font-medium">Visualização A4 com dados de exemplo</span>
                    </>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="mt-auto pt-3 border-t border-gray-200 text-center text-xs text-gray-500">
                <p>Este relatório foi gerado automaticamente pelo Sistema de Monitoramento ACQUASALLES</p>
                <p className="mt-1">Página 1 de {totalPages} | Formato Paisagem (297mm x 210mm)</p>
              </div>
            </div>
          )}

          {/* Chart Pages - Using real collection points data */}
          {currentPage > 1 && currentPage <= 1 + totalChartPages && (
            <div className="h-full flex flex-col">
              {/* Page Header - Smaller */}
              <div className="border-b border-gray-200 pb-2 mb-3">
                <h2 className="text-lg font-semibold text-gray-900">Gráficos de Monitoramento</h2>
                <p className="text-gray-600 text-xs">Análise temporal dos parâmetros de qualidade da água</p>
              </div>

              {/* Charts Grid - 3 columns, 2 rows for landscape with increased height */}
              <div className="flex-1 grid grid-cols-3 gap-3">
                {getCurrentPageCharts().map((point, index) => (
                  <div key={point.id} className="bg-gray-50 p-2 rounded-lg border border-gray-200 flex flex-col">
                    {/* Smaller title with reduced margin */}
                    <h3 className="font-medium text-gray-900 mb-0 text-center text-xs">{point.name}</h3>
                    
                    {/* Increased chart height with reduced padding */}
                    <div className="h-52">
                      <Bar
                        ref={(ref) => {
                          if (ref) {
                            registerChart(point.id, ref);
                          }
                        }}
                        data={point.graphData} options={{
                        ...point.graphOptions,
                        layout: {
                          padding: {
                            top: 5,
                            bottom: 5,
                            left: 5,
                            right: 5
                          }
                        },
                        plugins: {
                          ...point.graphOptions?.plugins,
                          title: { display: false },
                          legend: { 
                            display: true,
                            position: 'bottom' as const,
                            labels: {
                              font: { size: 7 },
                              padding: 3,
                              usePointStyle: true,
                              boxWidth: 5,
                              boxHeight: 5
                            }
                          }
                        },
                        scales: {
                          ...point.graphOptions?.scales,
                          x: {
                            ...point.graphOptions?.scales?.x,
                            ticks: {
                              font: { size: 7 },
                              maxRotation: 45,
                              maxTicksLimit: 5
                            }
                          },
                          y: {
                            ...point.graphOptions?.scales?.y,
                            ticks: {
                              font: { size: 7 },
                              maxTicksLimit: 5
                            }
                          }
                        }
                      }} />
                    </div>
                    
                    {/* Smaller stats summary below chart */}
                    <div className="grid grid-cols-2 gap-1 text-xs mt-1">
                      {point.datasetStats.filter(stat => !stat.hidden).slice(0, 4).map(stat => (
                        <div key={stat.label} className="bg-white p-1 rounded text-center">
                          <div className="font-medium text-xs" style={{ color: stat.color }}>
                            {stat.label}
                          </div>
                          <div className="text-gray-600 text-xs">
                            {stat.avg}
                            {stat.total !== undefined && (
                              <div className="text-xs">T: {stat.total}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="mt-auto pt-3 border-t border-gray-200 text-center text-xs text-gray-500">
                <p>Página {currentPage} de {totalPages} | Formato Paisagem</p>
              </div>
            </div>
          )}

          {/* Table Page - Optimized for 30 rows without scrolling */}
          {currentPage === totalPages && generateTableData && (
            <div className="h-full flex flex-col">
              {/* Minimal Page Header */}
              <div className="border-b border-gray-200 pb-1 mb-2">
                <h2 className="text-base font-semibold text-gray-900">Dados de Medição</h2>
                <p className="text-gray-600 text-xs">Registro detalhado das medições por ponto de coleta (30 registros)</p>
              </div>

              {/* Optimized Data Table for 30 rows */}
              <div className="flex-1 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full border border-gray-300" style={{ fontSize: '7px' }}>
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-300 px-1 py-1 text-left font-semibold text-gray-900" 
                            rowSpan={2}
                            style={{ width: '60px' }}>
                          Data
                        </th>
                        {generateTableData.collectionPoints.map(point => (
                          <th key={point.id} 
                              className="border border-gray-300 px-1 py-1 text-center font-semibold text-gray-900"
                              colSpan={point.measurements.length}>
                            <div className="text-xs font-bold">{point.name}</div>
                          </th>
                        ))}
                      </tr>
                      <tr className="bg-gray-50">
                        {generateTableData.collectionPoints.map(point => 
                          point.measurements.map(measurement => (
                            <th key={`${point.id}-${measurement.parameter}`} 
                                className="border border-gray-300 px-1 py-1 text-center font-medium text-gray-700"
                                style={{ width: '40px' }}>
                              <div className="flex flex-col items-center">
                                <span className="font-semibold text-xs">{measurement.parameter}</span>
                                {measurement.unit && (
                                  <span className="text-gray-500" style={{ fontSize: '6px' }}>({measurement.unit})</span>
                                )}
                              </div>
                            </th>
                          ))
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {generateTableData.rows.map((row, rowIndex) => (
                        <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="border border-gray-300 px-1 py-1 font-medium text-gray-900 text-xs">
                            {row.date}
                          </td>
                          {generateTableData.collectionPoints.map(point => 
                            point.measurements.map(measurement => {
                              const pointData = row.pointData.get(point.id) || [];
                              const value = pointData.find(v => v.parameter === measurement.parameter);
                              
                              return (
                                <td key={`${point.id}-${measurement.parameter}`} 
                                    className="border border-gray-300 px-1 py-1 text-center">
                                  <div className={`font-medium ${getStatusColor(value?.status)}`} style={{ fontSize: '7px' }}>
                                    {value ? parseFloat(value.value).toFixed(2) : '-'}
                                  </div>
                                </td>
                              );
                            })
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Minimal Footer */}
              <div className="mt-1 pt-1 border-t border-gray-200 text-center text-xs text-gray-500">
                <p>Página {currentPage} de {totalPages} | 30 registros exibidos</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}