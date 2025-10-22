import { useState, useEffect } from 'react';
import { getSupabase } from '../lib/supabase';
import { format, eachDayOfInterval, parseISO, subDays } from 'date-fns';
import { useIntl } from 'react-intl';
import type { ReportData } from '../types/report';
import type { Client } from '../types/client';
import { formatData } from '../lib/formatData';
import { getMeasurementColor } from '../constants/measurementColors';

/**
 * Interpolates Sunday volumes by redistributing Monday's accumulated volume.
 *
 * Sunday has no measurements in the database (volume = 0).
 * Monday accumulates Sunday + Monday consumption.
 * This function splits Monday's volume equally between Sunday and Monday.
 *
 * @param volumeData - Array of daily volume differences
 * @param dateLabels - Array of date labels in 'dd/MM/yyyy' format
 * @returns Array with interpolated Sunday volumes
 *
 * @example
 * Input:  Saturday(20) → Sunday(0) → Monday(50)
 * Output: Saturday(20) → Sunday(25) → Monday(25)
 */
function interpolateSundayVolumes(volumeData: number[], dateLabels: string[]): number[] {
  const interpolatedData = [...volumeData];

  for (let i = 0; i < dateLabels.length; i++) {
    const date = dateLabels[i];
    const [day, month, year] = date.split('/').map(Number);
    const dateObj = new Date(year, month - 1, day);
    const dayOfWeek = dateObj.getDay();

    // Check if current day is Monday (1) and has volume > 0
    if (dayOfWeek === 1 && interpolatedData[i] > 0) {
      // Check if previous day is Sunday (0) with volume = 0
      if (i > 0) {
        const prevDate = dateLabels[i - 1];
        const [prevDay, prevMonth, prevYear] = prevDate.split('/').map(Number);
        const prevDateObj = new Date(prevYear, prevMonth - 1, prevDay);
        const prevDayOfWeek = prevDateObj.getDay();

        if (prevDayOfWeek === 0 && interpolatedData[i - 1] === 0) {
          // Split Monday's volume equally between Sunday and Monday
          const mondayVolume = interpolatedData[i];
          const redistributedVolume = Number((mondayVolume / 2).toFixed(2));

          interpolatedData[i - 1] = redistributedVolume; // Sunday
          interpolatedData[i] = redistributedVolume;     // Monday

          console.log(`Interpolated Sunday ${prevDate}: ${redistributedVolume}m³ (from Monday ${date}: ${mondayVolume}m³)`);
        }
      }
    }
  }

  return interpolatedData;
}

interface CollectionPointData {
  id: string;
  name: string;
  areaName?: string;
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
  outorga?: {
    volumeMax?: {
      unit: string;
      value: number;
    };
    horimetroMax?: {
      unit: string;
      value: number;
    };
  };
  totalVolumeConsumed?: number;
  isLoading: boolean;
  error: string | null;
}

export function useAdminData() {
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedPonto, setSelectedPonto] = useState('');
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [pontosList, setPontosList] = useState<Array<{ id: string; nome: string }>>([]);
  const [collectionPointsData, setCollectionPointsData] = useState<CollectionPointData[]>([]);
  const [medicaoTypes, setMedicaoTypes] = useState<Array<{ id: string; nome: string }>>([]);
  const [availableMedicaoTypes, setAvailableMedicaoTypes] = useState<Set<string>>(new Set());
  const [visibleMedicaoTypes, setVisibleMedicaoTypes] = useState<Set<string>>(new Set(['pH']));
  const [graphData, setGraphData] = useState<any>(null);
  const [graphOptions, setGraphOptions] = useState<any>(null);
  const [datasetStats, setDatasetStats] = useState<Array<{
    label: string;
    min: number;
    max: number;
    avg: number;
    total?: number;
    color: string;
    hidden: boolean;
  }>>([]);
  const [isLoading, setIsLoading] = useState<{[key: string]: boolean}>({
    report: false,
    pdf: false,
    graph: false,
    waterQuality: false
  });
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const intl = useIntl();

  useEffect(() => {
    setStartDate(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
    setEndDate(format(new Date(), 'yyyy-MM-dd'));
  }, []);

  useEffect(() => {
    if (!selectedClient) {
      setPontosList([]);
      setMedicaoTypes([]);
      setCollectionPointsData([]);
      return;
    }

    const fetchData = async () => {
      try {
        const supabase = getSupabase();
        setIsLoading(prev => ({ ...prev, graph: true }));
        
        const [pontosResult, tiposResult] = await Promise.all([
          supabase
            .from('ponto_de_coleta')
            .select('id, nome')
            .eq('cliente_id', selectedClient),
          supabase
            .from('tipos_medicao')
            .select('id, nome')
            .neq('nome', 'Foto')
        ]);

        if (pontosResult.error) throw pontosResult.error;
        if (tiposResult.error) throw tiposResult.error;

        setPontosList(pontosResult.data || []);
        setMedicaoTypes(tiposResult.data || []);

        if (pontosResult.data && pontosResult.data.length > 0) {
          setSelectedPonto(pontosResult.data[0].id);
          await generateAllCollectionPointCharts(pontosResult.data);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setError(intl.formatMessage({ id: 'admin.report.error.fetch' }));
      } finally {
        setIsLoading(prev => ({ ...prev, graph: false }));
      }
    };

    fetchData();
  }, [selectedClient, intl]);

  useEffect(() => {
    if (!selectedClient || pontosList.length === 0) {
      setCollectionPointsData([]);
      return;
    }
    generateAllCollectionPointCharts(pontosList);
  }, [selectedClient, startDate, endDate, pontosList]);

  const generateChartForCollectionPoint = async (pontoId: string, pontoName: string): Promise<CollectionPointData> => {
    const initialData: CollectionPointData = {
      id: pontoId,
      name: pontoName,
      areaName: undefined,
      graphData: null,
      graphOptions: null,
      datasetStats: [],
      outorga: undefined,
      totalVolumeConsumed: undefined,
      isLoading: true,
      error: null
    };

    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('medicao')
        .select(`
          id,
          data_hora_medicao,
          area_de_trabalho:area_de_trabalho_id (
            nome_area
          ),
          ponto_de_coleta:ponto_de_coleta_id (
            nome,
            area_de_trabalho_id,
            outorga
          ),
          medicao_items!inner (
            id,
            valor,
            tipo_medicao:tipo_medicao_id (
              id,
              nome
            )
          )
        `)
        .eq('cliente_id', selectedClient)
        .eq('ponto_de_coleta_id', pontoId)
        .gte('data_hora_medicao', startDate)
        .lte('data_hora_medicao', endDate + 'T23:59:59')
        .order('data_hora_medicao', { ascending: true });

      if (error) throw error;

      // Generate all dates in the interval
      const dateInterval = {
        start: parseISO(startDate),
        end: parseISO(endDate)
      };
      
      const allDates = eachDayOfInterval(dateInterval)
        .map(date => format(date, 'dd/MM/yyyy'));

      // If no data and no dates, show error
      if ((!data || data.length === 0) && allDates.length === 0) {
        return {
          ...initialData,
          isLoading: false,
          error: intl.formatMessage({ id: 'admin.report.noData' })
        };
      }

      // Get area name from the data
      const areaName = data && data.length > 0 && data[0].area_de_trabalho?.nome_area
        ? data[0].area_de_trabalho.nome_area
        : undefined;
      
      // Get outorga data from the first measurement's ponto_de_coleta
      const outorgaData = data && data.length > 0 && data[0].ponto_de_coleta?.outorga 
        ? data[0].ponto_de_coleta.outorga 
        : null;
      
      //console.log('Outorga data for point:', pontoName, outorgaData);
      
      // Create chart title with area name
      const chartTitle = areaName ? `${areaName} - ${pontoName}` : pontoName;
      // Get available measurement types for this point
      const availableTypes = new Set<string>();
      if (data) {
        data.forEach(m => {
          m.medicao_items.forEach(item => {
            const typeName = item.tipo_medicao?.nome;
            if (typeName && typeName !== 'Foto') {
              availableTypes.add(typeName);
            }
          });
        });
      }

      // Create datasets - special handling for Registro (m3) to show daily differences
      const datasets = Array.from(availableTypes).sort().map((type) => {
        const displayName = type === 'Vazão' ? 'Volume' : 
                           type === 'Registro (m3)' ? 'Volume' : type;
        
        let typeData: number[];
        
        if (type === 'Registro (m3)') {
          // Special handling for Registro (m3) - calculate daily differences
          console.log('Processing Registro (m3) for daily differences');
          
          // First, get the accumulated values for each day
          const accumulatedValues = allDates.map(date => {
            const measurementsForDate = data?.filter(m => 
              format(new Date(m.data_hora_medicao), 'dd/MM/yyyy') === date
            ) || [];
            
            const values = measurementsForDate.flatMap(m => 
              m.medicao_items
                .filter(item => item.tipo_medicao?.nome === type)
                .map(item => parseFloat(item.valor))
            );

            // Return the last (highest) value for the day, or null if no data
            return values.length > 0 ? Math.max(...values) : null;
          });
          
          console.log('Accumulated values by date:', accumulatedValues);
          
          // Fill gaps with previous known values
          let lastKnownValue: number | null = null;
          const filledValues = accumulatedValues.map(value => {
            if (value !== null) {
              lastKnownValue = value;
              return value;
            }
            return lastKnownValue;
          });
          
          console.log('Filled accumulated values:', filledValues);

          // Calculate daily differences
          typeData = filledValues.map((currentValue, index) => {
            if (index === 0 || currentValue === null) {
              return 0; // First day or no data
            }

            const previousValue = filledValues[index - 1];
            if (previousValue === null) {
              return 0;
            }

            const difference = currentValue - previousValue;
            return Number(Math.max(0, difference).toFixed(2)); // Ensure non-negative
          });

          console.log('Daily differences calculated (before interpolation):', typeData);

          // Apply Sunday interpolation
          typeData = interpolateSundayVolumes(typeData, allDates);

          console.log('Daily differences calculated (after Sunday interpolation):', typeData);
        } else {
          // Standard handling for other measurement types (average per day)
          typeData = allDates.map(date => {
            const measurementsForDate = data?.filter(m => 
              format(new Date(m.data_hora_medicao), 'dd/MM/yyyy') === date
            ) || [];
            
            const values = measurementsForDate.flatMap(m => 
              m.medicao_items
                .filter(item => item.tipo_medicao?.nome === type)
                .map(item => parseFloat(item.valor))
            );

            if (values.length === 0) return 0;
            const average = values.reduce((a, b) => a + b, 0) / values.length;
            return Number(average.toFixed(2));
          });
        }

        const validValues = typeData.filter(v => v !== 0);
        const min = validValues.length > 0 ? Math.min(...validValues) : 0;
        const max = validValues.length > 0 ? Math.max(...validValues) : 0;
        const avg = validValues.length > 0 
          ? Number((validValues.reduce((a, b) => a + b, 0) / validValues.length).toFixed(2))
          : 0;
        
        // Calculate total for volume measurements
        const total = (type === 'Registro (m3)' || type === 'Vazão')
          ? Number(validValues.reduce((a, b) => a + b, 0).toFixed(2))
          : undefined;
        
        console.log(`Dataset for ${type}:`, { min, max, avg, total, validValues: validValues.length });

        const color = getMeasurementColor(type);

        return {
          type: 'bar',
          label: displayName,
          data: typeData,
          backgroundColor: color.replace('rgb', 'rgba').replace(')', ', 0.5)'),
          borderColor: color,
          borderWidth: 2,
          hidden: false,
          minBarLength: 5,
        };
      });

      // Calculate total volume consumed for Volume/Vazão measurements
      let totalVolumeConsumed: number | undefined;
      const volumeDataset = datasets.find(d => d.label === 'Volume' || d.label === 'Registro (m3)');
      console.log('Volume dataset found:', !!volumeDataset);
      if (volumeDataset && volumeDataset.data.length > 0) {
        const validVolumeData = volumeDataset.data.filter(v => v !== 0);
        if (validVolumeData.length > 0) {
          totalVolumeConsumed = Number(validVolumeData.reduce((a, b) => a + b, 0).toFixed(2));
          console.log('Total volume consumed (sum of daily differences):', totalVolumeConsumed);
        }
      }

      // Calculate stats
      const stats = datasets
        .filter((dataset, index, arr) => {
          // Remove duplicates - keep only one Volume dataset
          if (dataset.label === 'Volume') {
            return arr.findIndex(d => d.label === 'Volume') === index;
          }
          return true;
        })
        .map(dataset => ({
        label: dataset.label,
        min: Math.min(...dataset.data.filter(v => v !== 0)) || 0,
        max: Math.max(...dataset.data) || 0,
        avg: dataset.data.some(v => v !== 0)
          ? Number((dataset.data.reduce((a, b) => a + b, 0) / dataset.data.filter(v => v !== 0).length).toFixed(2))
          : 0,
        total: (dataset.label === 'Volume' || dataset.label === 'Registro (m3)')
          ? Number(dataset.data.reduce((a, b) => a + b, 0).toFixed(2))
          : undefined,
        color: dataset.borderColor,
        hidden: dataset.hidden
      }));

      const chartData = {
        labels: allDates,
        datasets
      };

      // Create proper y-axis configuration without duplicate ticks
      const yAxisConfig: any = {
        beginAtZero: true,
        ticks: {
          font: { size: 12 },
          callback: function(value: any) {
            if (availableTypes.has('pH') && value === 7) {
              return `Reference: ${value}`;
            }
            return value;
          }
        },
        afterDataLimits: (scale: any) => {
          const range = scale.max - scale.min;
          scale.max += range * 0.1;
          scale.min -= range * 0.1;
        }
      };

      // Add grid configuration for pH reference line if pH is present
      if (availableTypes.has('pH')) {
        yAxisConfig.grid = {
          drawOnChartArea: true,
          color: (context: any) => {
            if (context.tick.value === 7) {
              return 'rgba(255, 99, 132, 0.2)';
            }
            return 'rgba(0, 0, 0, 0.1)';
          },
          lineWidth: (context: any) => {
            if (context.tick.value === 7) {
              return 2;
            }
            return 1;
          },
          borderDash: (context: any) => {
            if (context.tick.value === 7) {
              return [5, 5];
            }
            return [];
          }
        };
      }

      const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: {
            top: 60, // Add padding at the top for the title
            bottom: 20,
            left: 20,
            right: 20
          }
        },
        interaction: {
          mode: 'nearest' as const,
          axis: 'x' as const,
          intersect: false
        },
        font: {
          size: 12
        },
        plugins: {
          legend: {
            position: 'top' as const,
            labels: {
              font: { size: 12 },
              padding: 15,
              usePointStyle: true
            }
          },
          title: {
            display: true,
            text: chartTitle,
            font: { 
              size: 24, 
              weight: 'bold' as const,
              family: 'system-ui, -apple-system, sans-serif'
            },
            color: '#1f2937', // gray-800
            padding: {
              top: 10,
              bottom: 30
            },
            position: 'top' as const,
            align: 'center' as const
          },
          annotation: {
            annotations: {} as any
          }
        },
        scales: {
          x: {
            ticks: {
              font: { size: 10 },
              maxRotation: 45
            }
          },
          y: yAxisConfig
        }
      };

      // Add outorga annotation if volumeMax is available
      if (outorgaData?.volumeMax?.value && (availableTypes.has('Vazão') || availableTypes.has('Registro (m3)'))) {
        console.log('Adding outorga annotation:', outorgaData.volumeMax);
        (chartOptions.plugins.annotation.annotations as any) = {
          volumeMaxLine: {
            type: 'line',
            yMin: outorgaData.volumeMax.value,
            yMax: outorgaData.volumeMax.value,
            borderColor: 'rgb(239, 68, 68)', // Red color
            borderWidth: 2,
            borderDash: [5, 5],
            label: {
              display: true,
              content: `Volume Máximo Outorgado: ${outorgaData.volumeMax.value} ${outorgaData.volumeMax.unit}`,
              position: 'end',
              backgroundColor: 'rgba(239, 68, 68, 0.8)',
              color: 'white',
              font: {
                size: 12,
                weight: 'bold'
              },
              padding: 4
            }
          }
        };
      }

      return {
        id: pontoId,
        name: pontoName,
        areaName: areaName,
        graphData: chartData,
        graphOptions: chartOptions,
        datasetStats: stats,
        outorga: outorgaData,
        totalVolumeConsumed,
        isLoading: false,
        error: null
      };

    } catch (error) {
      console.error('Error generating chart for collection point:', error);
      return {
        ...initialData,
        outorga: null,
        totalVolumeConsumed: undefined,
        isLoading: false,
        error: intl.formatMessage({ id: 'admin.report.error.generate' })
      };
    }
  };

  const generateAllCollectionPointCharts = async (pontos: Array<{ id: string; nome: string }>) => {
    setIsLoading(prev => ({ ...prev, graph: true }));
    setError(null);

    try {
      const chartPromises = pontos.map(ponto => 
        generateChartForCollectionPoint(ponto.id, ponto.nome)
      );

      const chartResults = await Promise.all(chartPromises);
      setCollectionPointsData(chartResults);

      // Set the first chart as the main one for backward compatibility
      if (chartResults.length > 0 && chartResults[0].graphData) {
        setGraphData(chartResults[0].graphData);
        setGraphOptions(chartResults[0].graphOptions);
        setDatasetStats(chartResults[0].datasetStats);
      }

    } catch (error) {
      console.error('Error generating charts:', error);
      setError(intl.formatMessage({ id: 'admin.report.error.generate' }));
    } finally {
      setIsLoading(prev => ({ ...prev, graph: false }));
    }
  };

  const handleGenerateGraph = async (pontoId: string) => {
    setIsLoading(prev => ({ ...prev, graph: true }));
    setError(null);

    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('medicao')
        .select(`
          id,
          data_hora_medicao,
          area_de_trabalho:area_de_trabalho_id (
            nome_area
          ),
          ponto_de_coleta:ponto_de_coleta_id (
            nome,
            area_de_trabalho_id,
            outorga
          ),
          medicao_items!inner (
            id,
            valor,
            tipo_medicao:tipo_medicao_id (
              id,
              nome
            )
          )
        `)
        .eq('cliente_id', selectedClient)
        .eq('ponto_de_coleta_id', pontoId)
        .gte('data_hora_medicao', startDate)
        .lte('data_hora_medicao', endDate + 'T23:59:59')
        .order('data_hora_medicao', { ascending: true });

      if (error) throw error;

      // Generate all dates in the interval
      const dateInterval = {
        start: parseISO(startDate),
        end: parseISO(endDate)
      };
      
      const allDates = eachDayOfInterval(dateInterval)
        .map(date => format(date, 'dd/MM/yyyy'));

      // If no data and no dates, show error
      if ((!data || data.length === 0) && allDates.length === 0) {
        setError(intl.formatMessage({ id: 'admin.report.noData' }));
        setGraphData(null);
        setGraphOptions(null);
        setAvailableMedicaoTypes(new Set());
        return;
      }

      // Get area name and point name from the data
      const areaName = data && data.length > 0 && data[0].area_de_trabalho?.nome_area 
        ? data[0].area_de_trabalho.nome_area 
        : '';
      const pontoName = data && data.length > 0 && data[0].ponto_de_coleta?.nome 
        ? data[0].ponto_de_coleta.nome 
        : 'Ponto de Coleta';
      
      // Get outorga data from the first measurement's ponto_de_coleta
      const outorgaData = data && data.length > 0 && data[0].ponto_de_coleta?.outorga 
        ? data[0].ponto_de_coleta.outorga 
        : null;
      
      // Create chart title with area name
      const chartTitle = areaName ? `${areaName} - ${pontoName}` : pontoName;
      // Get available measurement types
      const availableTypes = new Set<string>();
      if (data) {
        data.forEach(m => {
          m.medicao_items.forEach(item => {
            const typeName = item.tipo_medicao?.nome;
            if (typeName && typeName !== 'Foto') {
              availableTypes.add(typeName);
            }
          });
        });
      }

      setAvailableMedicaoTypes(availableTypes);
      setVisibleMedicaoTypes(prev => {
        const newVisible = new Set([...prev].filter(type => availableTypes.has(type)));
        if (availableTypes.has('pH') && !newVisible.has('pH')) {
          newVisible.add('pH');
        }
        return newVisible;
      });

      // Create datasets with zero values for missing dates
      const datasets = Array.from(availableTypes).sort().map((type) => {
        const displayName = type === 'Vazão' ? 'Volume' : 
                           type === 'Registro (m3)' ? 'Volume' : type;
        const typeData = allDates.map(date => {
          const measurementsForDate = data?.filter(m => 
            format(new Date(m.data_hora_medicao), 'dd/MM/yyyy') === date
          ) || [];
          
          const values = measurementsForDate.flatMap(m => 
            m.medicao_items
              .filter(item => item.tipo_medicao?.nome === type)
              .map(item => parseFloat(item.valor))
          );

          if (values.length === 0) return 0;
          const average = values.reduce((a, b) => a + b, 0) / values.length;
          return Number(average.toFixed(2));
        });

        const validValues = typeData.filter(v => v !== 0);
        const min = validValues.length > 0 ? Math.min(...validValues) : 0;
        const max = validValues.length > 0 ? Math.max(...validValues) : 0;
        const avg = validValues.length > 0 
          ? Number((validValues.reduce((a, b) => a + b, 0) / validValues.length).toFixed(2))
          : 0;
        const total = type === 'Vazão' || type === 'Registro (m3)'
          ? Number(validValues.reduce((a, b) => a + b, 0).toFixed(2))
          : undefined;

        const color = getMeasurementColor(type);

        return {
          type: 'bar',
          label: displayName,
          data: typeData,
          backgroundColor: color.replace('rgb', 'rgba').replace(')', ', 0.5)'),
          borderColor: color,
          borderWidth: 2,
          hidden: !visibleMedicaoTypes.has(type),
          minBarLength: 5,
        };
      });

      // Calculate total volume consumed for Volume/Vazão measurements
      let totalVolumeConsumed: number | undefined;
      const volumeDataset = datasets.find(d => d.label === 'Volume');
      console.log('Main function - Volume dataset found:', !!volumeDataset);
      if (volumeDataset && volumeDataset.data.length > 0) {
        // For daily differences, total consumption is the sum of all daily differences
        const validVolumeData = volumeDataset.data.filter(v => v !== 0);
        if (validVolumeData.length > 0) {
          totalVolumeConsumed = Number(validVolumeData.reduce((a, b) => a + b, 0).toFixed(2));
          console.log('Main function - Total volume consumed (sum of daily differences):', totalVolumeConsumed);
        }
      }

      // Update stats to include total for Volume
      setDatasetStats(datasets.map(dataset => ({
        label: dataset.label,
        min: Math.min(...dataset.data.filter(v => v !== 0)) || 0,
        max: Math.max(...dataset.data) || 0,
        avg: dataset.data.some(v => v !== 0)
          ? Number((dataset.data.reduce((a, b) => a + b, 0) / dataset.data.filter(v => v !== 0).length).toFixed(2))
          : 0,
        total: dataset.label === 'Volume'
          ? Number(dataset.data.reduce((a, b) => a + b, 0).toFixed(2))
          : undefined,
        color: dataset.borderColor,
        hidden: dataset.hidden
      })));

      setGraphData({
        labels: allDates,
        datasets
      });

      // Create proper y-axis configuration without duplicate ticks
      const yAxisConfig: any = {
        beginAtZero: true,
        ticks: {
          font: { size: 16 },
          callback: function(value: any) {
            if (visibleMedicaoTypes.has('pH') && value === 7) {
              return `Reference: ${value}`;
            }
            return value;
          }
        },
        afterDataLimits: (scale: any) => {
          const range = scale.max - scale.min;
          scale.max += range * 0.1;
          scale.min -= range * 0.1;
        }
      };

      // Add grid configuration for pH reference line if pH is visible
      if (visibleMedicaoTypes.has('pH')) {
        yAxisConfig.grid = {
          drawOnChartArea: true,
          color: (context: any) => {
            if (context.tick.value === 7) {
              return 'rgba(255, 99, 132, 0.2)';
            }
            return 'rgba(0, 0, 0, 0.1)';
          },
          lineWidth: (context: any) => {
            if (context.tick.value === 7) {
              return 2;
            }
            return 1;
          },
          borderDash: (context: any) => {
            if (context.tick.value === 7) {
              return [5, 5];
            }
            return [];
          }
        };
      }

      const baseGraphOptions = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'nearest' as const,
          axis: 'x' as const,
          intersect: false
        },
        font: {
          size: 14
        },
        plugins: {
          legend: {
            position: 'top' as const,
            labels: {
              font: { size: 16 },
              padding: 20,
              usePointStyle: true
            },
            onClick: (_e: any, legendItem: any) => {
              const type = legendItem.text === 'Volume' ? 'Vazão' : legendItem.text;
              
              setVisibleMedicaoTypes(prev => {
                const newVisible = new Set(prev);
                if (newVisible.has(type)) {
                  newVisible.delete(type);
                } else {
                  newVisible.add(type);
                }
                return newVisible;
              });
              
              setGraphData((currentData: any) => {
                if (!currentData) return null;
                return {
                  ...currentData,
                  datasets: currentData.datasets.map((dataset: any) => ({
                    ...dataset,
                    hidden: dataset.label === legendItem.text ? !dataset.hidden : dataset.hidden,
                  }))
                };
              });
              
              setDatasetStats(prev => 
                prev.map(stat => ({
                  ...stat,
                  hidden: stat.label === legendItem.text ? !stat.hidden : stat.hidden
                }))
              );
            }
          },
          title: { 
            display: true,
            text: chartTitle,
            font: { 
              size: 20, 
              weight: 'bold' as const 
            },
            color: '#1f2937',
            padding: {
              top: 10,
              bottom: 20
            }
          },
          annotation: {
            annotations: {} as any
          }
        },
        scales: {
          x: {
            ticks: {
              font: { size: 12 }
            }
          },
          y: yAxisConfig
        }
      };

      // Add outorga annotation if volumeMax is available
      if (outorgaData?.volumeMax?.value && availableTypes.has('Registro (m3)')) {
        console.log('Main function - Adding outorga annotation:', outorgaData.volumeMax);
        (baseGraphOptions.plugins.annotation.annotations as any) = {
          volumeMaxLine: {
            type: 'line',
            yMin: outorgaData.volumeMax.value,
            yMax: outorgaData.volumeMax.value,
            borderColor: 'rgb(239, 68, 68)', // Red color
            borderWidth: 2,
            borderDash: [5, 5],
            label: {
              display: true,
              content: `Volume Máximo Outorgado: ${outorgaData.volumeMax.value} ${outorgaData.volumeMax.unit}`,
              position: 'end',
              backgroundColor: 'rgba(239, 68, 68, 0.8)',
              color: 'white',
              font: {
                size: 12,
                weight: 'bold'
              },
              padding: 4
            }
          }
        };
      }

      setGraphOptions(baseGraphOptions);
      
      console.log('Final graph options with annotations:', baseGraphOptions.plugins?.annotation);
    } catch (error) {
      console.error('Error generating graph:', error);
      setError(intl.formatMessage({ id: 'admin.report.error.generate' }));
    } finally {
      setIsLoading(prev => ({ ...prev, graph: false }));
    }
  };

  const handleGenerateReport = async (clients: Client[]) => {
    setError(null);
    setReportData(null);
    
    if (!selectedClient || !startDate || !endDate) {
      alert(intl.formatMessage({ id: 'admin.report.fillFields' }));
      return;
    }

    const selectedClientData = clients.find(c => c.id === selectedClient);
    if (!selectedClientData) {
      alert(intl.formatMessage({ id: 'admin.report.clientNotFound' }));
      return;
    }

    setIsLoading(prev => ({ ...prev, report: true }));
    try {
      const supabase = getSupabase();
      const [clientResult, measurementsResult] = await Promise.all([
        supabase
          .from('clientes')
          .select('razao_social, cnpj_cpf, endereco, bairro, cidade')
          .eq('id', selectedClient)
          .single(),
        supabase
          .from('medicao')
          .select(`
            id,
            data_hora_medicao,
            area_de_trabalho_id,
            area_de_trabalho:area_de_trabalho_id (
              nome_area
            ),
            ponto_de_coleta_id,
            ponto_de_coleta:ponto_de_coleta_id (
              nome
            ),
            medicao_items!inner (
              parametro,
              valor,
              tipo_medicao_id,
              tipo_medicao_nome,
              medicao_photos!left (
                photo_url,
                thumbnail_url
              )
            )
          `)
          .eq('cliente_id', selectedClient)
          .gte('data_hora_medicao', startDate)
          .lte('data_hora_medicao', endDate + 'T23:59:59')
      ]);

      if (clientResult.error) throw clientResult.error;
      if (measurementsResult.error) throw measurementsResult.error;
      
      if (!clientResult.data) throw new Error('Client not found');
      if (!measurementsResult.data || measurementsResult.data.length === 0) {
        setReportData(null);
        setError(intl.formatMessage({ id: 'admin.report.noData' }));
        return;
      }

      const formattedData = {
        ...formatData(measurementsResult.data, clientResult.data.razao_social),
        graphOptions: baseGraphOptions,
        endereco: clientResult.data.endereco,
        outorga: outorgaData,
        totalVolumeConsumed,
        bairro: clientResult.data.bairro,
        cidade: clientResult.data.cidade
      };

      setReportData(formattedData);
    } catch (error) {
      setError(intl.formatMessage({ id: 'admin.report.error.generate' }));
      setReportData(null);
    } finally {
      setIsLoading(prev => ({ ...prev, report: false }));
    }
  };

  return {
    selectedClient,
    setSelectedClient,
    selectedPonto,
    setSelectedPonto,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    pontosList,
    medicaoTypes,
    collectionPointsData,
    graphData,
    graphOptions,
    datasetStats,
    isLoading,
    setIsLoading,
    reportData,
    error,
    setError,
    handleGenerateGraph,
    handleGenerateReport
  };
}