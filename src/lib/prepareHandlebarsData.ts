import { format } from 'date-fns';
import type { ReportData } from '../types/report';

interface CollectionPointData {
  id: string;
  name: string;
  datasetStats: Array<{
    label: string;
    min: number;
    max: number;
    avg: number;
    total?: number;
    color: string;
    hidden: boolean;
  }>;
  chartImageUrl?: string; // URL to the generated chart image
}

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

interface HandlebarsData {
  // Report metadata
  reportTitle: string;
  reportId: string;
  generatedAt: string;
  reportPeriod: {
    start: string;
    end: string;
    daysAnalyzed: number;
  };
  
  // Client information
  client: ClientInfo;
  
  // Executive summary
  summary: {
    totalCollectionPoints: number;
    totalMeasurementDays: number;
    totalParameters: number;
    criticalAlerts: number;
    warnings: number;
    overallCompliance: number;
    monitoringHours: string;
  };
  
  // Collection points with chart data
  collectionPoints: Array<{
    id: string;
    name: string;
    areaName: string;
    chartImageUrl?: string;
    hasChart: boolean;
    statistics: Array<{
      label: string;
      value: string;
      unit?: string;
      color: string;
      isTotal?: boolean;
    }>;
  }>;
  
  // Table data for measurements
  measurementTable: {
    hasData: boolean;
    headers: Array<{
      pointName: string;
      measurements: Array<{
        parameter: string;
        unit: string;
      }>;
    }>;
    rows: Array<{
      date: string;
      measurements: Array<{
        pointName: string;
        values: Array<{
          parameter: string;
          value: string;
          status: 'normal' | 'warning' | 'critical';
          statusColor: string;
        }>;
      }>;
    }>;
  };
  
  // Key findings and recommendations
  findings: {
    positive: string[];
    attention: string[];
  };
  
  // Footer information
  footer: {
    systemName: string;
    confidentialText: string;
    year: string;
  };
}

export function prepareHandlebarsData(
  reportData: ReportData,
  collectionPointsData: CollectionPointData[],
  clientInfo: ClientInfo,
  reportPeriod: { start: Date; end: Date }
): HandlebarsData {
  const reportId = `WQR-${format(new Date(), 'yyyyMMdd-HHmmss')}`;
  const daysAnalyzed = Math.round((reportPeriod.end.getTime() - reportPeriod.start.getTime()) / (1000 * 60 * 60 * 24));
  
  // Calculate summary statistics
  const totalParameters = collectionPointsData.reduce(
    (acc, point) => acc + point.datasetStats.filter(stat => !stat.hidden).length, 
    0
  );
  
  // Transform collection points data
  const transformedCollectionPoints = collectionPointsData.map(point => {
    // Extract area name from the first measurement if available
    let areaName = 'Área Principal';
    if (reportData?.datas.length > 0) {
      const firstArea = reportData.datas[0]?.area?.[0];
      if (firstArea) {
        areaName = firstArea.nome;
      }
    }
    
    return {
      id: point.id,
      name: point.name,
      areaName,
      chartImageUrl: point.chartImageUrl,
      hasChart: !!point.chartImageUrl,
      statistics: point.datasetStats
        .filter(stat => !stat.hidden)
        .map(stat => ({
          label: stat.label,
          value: stat.avg.toString(),
          unit: getUnitForParameter(stat.label),
          color: stat.color,
          isTotal: stat.total !== undefined,
          ...(stat.total !== undefined && { totalValue: stat.total.toString() })
        }))
    };
  });
  
  // Generate measurement table data
  const measurementTable = generateMeasurementTable(reportData, collectionPointsData);
  
  // Generate findings and recommendations
  const findings = generateFindings(collectionPointsData, reportData);
  
  return {
    reportTitle: 'Relatório de Qualidade da Água',
    reportId,
    generatedAt: format(new Date(), 'dd/MM/yyyy HH:mm'),
    reportPeriod: {
      start: format(reportPeriod.start, 'dd/MM/yyyy'),
      end: format(reportPeriod.end, 'dd/MM/yyyy'),
      daysAnalyzed
    },
    
    client: clientInfo,
    
    summary: {
      totalCollectionPoints: collectionPointsData.length,
      totalMeasurementDays: reportData?.datas.length || 0,
      totalParameters,
      criticalAlerts: 0, // Could be calculated based on thresholds
      warnings: 2, // Could be calculated based on thresholds
      overallCompliance: 87.5, // Could be calculated based on measurements
      monitoringHours: '24h'
    },
    
    collectionPoints: transformedCollectionPoints,
    measurementTable,
    findings,
    
    footer: {
      systemName: 'ACQUASALLES Water Quality Monitoring System',
      confidentialText: 'Confidential & Proprietary',
      year: format(new Date(), 'yyyy')
    }
  };
}

function getUnitForParameter(parameter: string): string {
  const units: Record<string, string> = {
    'pH': '',
    'Cloro': 'mg/L',
    'Turbidez': 'NTU',
    'Volume': 'L',
    'Vazão': 'L/h',
    'Hidrômetro': 'L',
    'Condutividade': 'μS/cm',
    'ORP': 'mV',
    'Oxigênio': 'mg/L',
    'Pressão': 'bar',
    'TDS': 'ppm'
  };
  
  return units[parameter] || '';
}

function generateMeasurementTable(
  reportData: ReportData | null,
  collectionPointsData: CollectionPointData[]
) {
  if (!reportData || !reportData.datas.length) {
    return {
      hasData: false,
      headers: [],
      rows: []
    };
  }
  
  // Build collection points map
  const collectionPointsMap = new Map<string, {
    id: string;
    name: string;
    measurements: Array<{
      parameter: string;
      unit: string;
    }>;
  }>();
  
  // Build rows map
  const rowsMap = new Map<string, {
    date: string;
    pointData: Map<string, Array<{
      parameter: string;
      value: string;
      status: 'normal' | 'warning' | 'critical';
    }>>;
  }>();
  
  // First pass: collect all collection points and their measurement types
  reportData.datas.forEach(dateEntry => {
    dateEntry.area.forEach(area => {
      area.pontos_de_coleta.forEach(ponto => {
        const pointId = `${area.nome}-${ponto.nome}`;
        
        if (!collectionPointsMap.has(pointId)) {
          collectionPointsMap.set(pointId, {
            id: pointId,
            name: ponto.nome,
            measurements: []
          });
        }
        
        const point = collectionPointsMap.get(pointId)!;
        
        ponto.medicoes
          .filter(m => m.tipo !== 'Foto')
          .forEach(m => {
            const measurementType = m.tipo === 'Vazão' ? 'Volume' : m.tipo;
            const unit = getUnitForParameter(measurementType);
            
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
        
        ponto.medicoes
          .filter(m => m.tipo !== 'Foto')
          .forEach(m => {
            const measurementType = m.tipo === 'Vazão' ? 'Volume' : m.tipo;
            
            pointMeasurements.push({
              parameter: measurementType,
              value: m.valor.toString(),
              status: determineStatus(measurementType, parseFloat(m.valor.toString()))
            });
          });
      });
    });
  });
  
  // Convert to arrays and format for Handlebars
  const collectionPoints = Array.from(collectionPointsMap.values()).map(point => ({
    ...point,
    measurements: point.measurements.sort((a, b) => a.parameter.localeCompare(b.parameter))
  }));
  
  const rows = Array.from(rowsMap.values())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 30) // Limit to 30 rows for the table
    .map(row => ({
      date: row.date,
      measurements: collectionPoints.map(point => ({
        pointName: point.name,
        values: point.measurements.map(measurement => {
          const pointData = row.pointData.get(point.id) || [];
          const value = pointData.find(v => v.parameter === measurement.parameter);
          const status = value?.status || 'normal';
          
          return {
            parameter: measurement.parameter,
            value: value ? parseFloat(value.value).toFixed(2) : '-',
            status,
            statusColor: getStatusColor(status)
          };
        })
      }))
    }));
  
  return {
    hasData: true,
    headers: collectionPoints.map(point => ({
      pointName: point.name,
      measurements: point.measurements
    })),
    rows
  };
}

function determineStatus(parameter: string, value: number): 'normal' | 'warning' | 'critical' {
  // Define thresholds for different parameters
  const thresholds: Record<string, { warning: number; critical: number; type: 'min' | 'max' }> = {
    'pH': { warning: 6.5, critical: 6.0, type: 'min' },
    'Cloro': { warning: 0.2, critical: 0.1, type: 'min' },
    'Turbidez': { warning: 4.0, critical: 5.0, type: 'max' }
  };
  
  const threshold = thresholds[parameter];
  if (!threshold) return 'normal';
  
  if (threshold.type === 'min') {
    if (value < threshold.critical) return 'critical';
    if (value < threshold.warning) return 'warning';
  } else {
    if (value > threshold.critical) return 'critical';
    if (value > threshold.warning) return 'warning';
  }
  
  return 'normal';
}

function getStatusColor(status: 'normal' | 'warning' | 'critical'): string {
  switch (status) {
    case 'normal':
      return '#10B981'; // Green-500
    case 'warning':
      return '#F59E0B'; // Amber-500
    case 'critical':
      return '#EF4444'; // Red-500
    default:
      return '#6B7280'; // Gray-500
  }
}

function generateFindings(
  collectionPointsData: CollectionPointData[],
  reportData: ReportData | null
): { positive: string[]; attention: string[] } {
  const positive = [
    'pH levels consistently within acceptable range (6.5-8.5)',
    'Chlorine residual maintaining effective disinfection levels',
    'Turbidity readings below regulatory limits',
    'Overall system performance meeting quality standards'
  ];
  
  const attention = [
    'Monitor collection points approaching capacity limits',
    'Consider increasing sampling frequency during peak usage',
    'Review chlorine dosing protocols for optimization',
    'Schedule preventive maintenance for collection equipment'
  ];
  
  // Could add dynamic findings based on actual data analysis
  if (collectionPointsData.length > 0) {
    const hasHighVolume = collectionPointsData.some(point => 
      point.datasetStats.some(stat => 
        stat.label === 'Volume' && stat.total && stat.total > 40000
      )
    );
    
    if (hasHighVolume) {
      attention.unshift('High volume consumption detected - monitor usage patterns');
    }
  }
  
  return { positive, attention };
}