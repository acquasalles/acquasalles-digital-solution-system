import React, { useState, useMemo, useCallback } from 'react';
import { ChevronUp, ChevronDown, AlertTriangle, Droplets, Beaker, Eye, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

interface MeasurementValue {
  value: number;
  unit: string;
  isOutOfRange?: boolean;
  rangeType?: 'low' | 'high';
}

interface CollectionPointMeasurements {
  pointId: string;
  pointName: string;
  chlorine: MeasurementValue | null;
  ph: MeasurementValue | null;
  turbidity: MeasurementValue | null;
}

interface WaterQualityData {
  timestamp: Date;
  measurements: CollectionPointMeasurements[];
}

interface WaterQualityReportPreviewProps {
  data: WaterQualityData[];
  isLoading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
}

type SortField = 'timestamp' | string; // string for collection point IDs
type SortDirection = 'asc' | 'desc';

const ITEMS_PER_PAGE = 20;

// Sample data for demonstration
const sampleData: WaterQualityData[] = Array.from({ length: 50 }, (_, i) => ({
  timestamp: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
  measurements: [
    {
      pointId: 'point-a1',
      pointName: 'Ponto A1',
      chlorine: {
        value: 1.2 + Math.random() * 0.8,
        unit: 'mg/L',
        isOutOfRange: Math.random() > 0.8,
        rangeType: Math.random() > 0.5 ? 'high' : 'low'
      },
      ph: {
        value: 6.8 + Math.random() * 1.4,
        unit: '',
        isOutOfRange: Math.random() > 0.9,
        rangeType: Math.random() > 0.5 ? 'high' : 'low'
      },
      turbidity: {
        value: Math.random() * 5,
        unit: 'NTU',
        isOutOfRange: Math.random() > 0.85,
        rangeType: 'high'
      }
    },
    {
      pointId: 'point-a2',
      pointName: 'Ponto A2',
      chlorine: {
        value: 1.0 + Math.random() * 1.0,
        unit: 'mg/L',
        isOutOfRange: Math.random() > 0.8,
        rangeType: Math.random() > 0.5 ? 'high' : 'low'
      },
      ph: {
        value: 6.5 + Math.random() * 1.8,
        unit: '',
        isOutOfRange: Math.random() > 0.9,
        rangeType: Math.random() > 0.5 ? 'high' : 'low'
      },
      turbidity: {
        value: Math.random() * 4,
        unit: 'NTU',
        isOutOfRange: Math.random() > 0.85,
        rangeType: 'high'
      }
    },
    {
      pointId: 'point-b1',
      pointName: 'Ponto B1',
      chlorine: {
        value: 0.8 + Math.random() * 1.2,
        unit: 'mg/L',
        isOutOfRange: Math.random() > 0.8,
        rangeType: Math.random() > 0.5 ? 'high' : 'low'
      },
      ph: {
        value: 7.0 + Math.random() * 1.0,
        unit: '',
        isOutOfRange: Math.random() > 0.9,
        rangeType: Math.random() > 0.5 ? 'high' : 'low'
      },
      turbidity: {
        value: Math.random() * 3,
        unit: 'NTU',
        isOutOfRange: Math.random() > 0.85,
        rangeType: 'high'
      }
    }
  ]
}));

export function WaterQualityReportPreview({ 
  data = sampleData, 
  isLoading = false, 
  error = null,
  onRefresh 
}: WaterQualityReportPreviewProps) {
  const [sortField, setSortField] = useState<SortField>('timestamp');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});

  // Get unique collection points
  const collectionPoints = useMemo(() => {
    if (!data.length) return [];
    const pointsMap = new Map();
    data.forEach(row => {
      row.measurements.forEach(measurement => {
        if (!pointsMap.has(measurement.pointId)) {
          pointsMap.set(measurement.pointId, measurement.pointName);
        }
      });
    });
    return Array.from(pointsMap.entries()).map(([id, name]) => ({ id, name }));
  }, [data]);

  // Sort data
  const sortedData = useMemo(() => {
    const sorted = [...data].sort((a, b) => {
      if (sortField === 'timestamp') {
        const comparison = a.timestamp.getTime() - b.timestamp.getTime();
        return sortDirection === 'asc' ? comparison : -comparison;
      }
      
      // Sort by collection point values
      const aPoint = a.measurements.find(m => m.pointId === sortField);
      const bPoint = b.measurements.find(m => m.pointId === sortField);
      
      if (!aPoint && !bPoint) return 0;
      if (!aPoint) return 1;
      if (!bPoint) return -1;
      
      // Sort by pH value as primary sort for collection points
      const aValue = aPoint.ph?.value || 0;
      const bValue = bPoint.ph?.value || 0;
      const comparison = aValue - bValue;
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    
    return sorted;
  }, [data, sortField, sortDirection]);

  // Paginate data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedData.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [sortedData, currentPage]);

  const totalPages = Math.ceil(sortedData.length / ITEMS_PER_PAGE);

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  }, [sortField]);

  const renderMeasurementValue = useCallback((measurement: MeasurementValue | null, icon: React.ReactNode) => {
    if (!measurement) {
      return (
        <div className="flex items-center justify-center text-gray-400 py-2">
          <span className="text-xs">N/A</span>
        </div>
      );
    }

    const { value, unit, isOutOfRange, rangeType } = measurement;
    
    return (
      <div className={`flex items-center justify-between px-2 py-1 rounded text-sm ${
        isOutOfRange 
          ? rangeType === 'high' 
            ? 'bg-red-50 text-red-700 border border-red-200' 
            : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
          : 'bg-green-50 text-green-700 border border-green-200'
      }`}>
        <div className="flex items-center space-x-1">
          {icon}
          <span className="font-medium">
            {value.toFixed(2)}{unit && ` ${unit}`}
          </span>
        </div>
        {isOutOfRange && (
          <AlertTriangle className="h-3 w-3 flex-shrink-0" />
        )}
      </div>
    );
  }, []);

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center space-x-1 hover:bg-gray-100 px-2 py-1 rounded transition-colors duration-150"
      aria-label={`Sort by ${field}`}
    >
      <span>{children}</span>
      {sortField === field ? (
        sortDirection === 'asc' ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )
      ) : (
        <ArrowUpDown className="h-4 w-4 opacity-50" />
      )}
    </button>
  );

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4 w-1/3"></div>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Data</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors duration-200"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8">
        <div className="text-center">
          <Eye className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
          <p className="text-gray-600">No water quality measurements found for the selected period.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Water Quality Report</h2>
          <div className="text-sm text-gray-600">
            Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, sortedData.length)} of {sortedData.length} records
          </div>
        </div>
      </div>

      {/* Table Container with Horizontal Scroll */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {/* Date Column */}
              <th className="sticky left-0 z-10 bg-gray-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                <SortButton field="timestamp">Date & Time</SortButton>
              </th>
              
              {/* Collection Point Columns */}
              {collectionPoints.map(point => (
                <th key={point.id} className="px-6 py-3 text-center border-r border-gray-200">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                    <SortButton field={point.id}>{point.name}</SortButton>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="flex items-center justify-center space-x-1">
                      <Droplets className="h-3 w-3 text-blue-500" />
                      <span>Chlorine</span>
                    </div>
                    <div className="flex items-center justify-center space-x-1">
                      <Beaker className="h-3 w-3 text-purple-500" />
                      <span>pH</span>
                    </div>
                    <div className="flex items-center justify-center space-x-1">
                      <Eye className="h-3 w-3 text-orange-500" />
                      <span>Turbidity</span>
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedData.map((row, rowIndex) => (
              <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                {/* Date Column */}
                <td className="sticky left-0 z-10 bg-inherit px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border-r border-gray-200">
                  <div>
                    <div className="font-medium">{format(row.timestamp, 'MMM dd, yyyy')}</div>
                    <div className="text-xs text-gray-500">{format(row.timestamp, 'HH:mm:ss')}</div>
                  </div>
                </td>
                
                {/* Collection Point Data */}
                {collectionPoints.map(point => {
                  const measurement = row.measurements.find(m => m.pointId === point.id);
                  
                  return (
                    <td key={point.id} className="px-3 py-4 border-r border-gray-200">
                      <div className="grid grid-cols-3 gap-2">
                        {/* Chlorine */}
                        <div className="min-w-0">
                          {renderMeasurementValue(
                            measurement?.chlorine || null,
                            <Droplets className="h-3 w-3 text-blue-500 flex-shrink-0" />
                          )}
                        </div>
                        
                        {/* pH */}
                        <div className="min-w-0">
                          {renderMeasurementValue(
                            measurement?.ph || null,
                            <Beaker className="h-3 w-3 text-purple-500 flex-shrink-0" />
                          )}
                        </div>
                        
                        {/* Turbidity */}
                        <div className="min-w-0">
                          {renderMeasurementValue(
                            measurement?.turbidity || null,
                            <Eye className="h-3 w-3 text-orange-500 flex-shrink-0" />
                          )}
                        </div>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors duration-150"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            
            <span className="text-sm text-gray-700">
              Page {currentPage} of {totalPages}
            </span>
            
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors duration-150"
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          
          <div className="text-sm text-gray-600">
            Total: {sortedData.length} measurements
          </div>
        </div>
      )}
    </div>
  );
}