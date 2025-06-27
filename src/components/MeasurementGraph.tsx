import React from 'react';
import { Bar } from 'react-chartjs-2';
import { AlertCircle } from 'lucide-react';
import { useIntl } from 'react-intl';
import type { ChartData, ChartOptions } from 'chart.js';

interface MeasurementGraphProps {
  graphData: ChartData<'bar'>;
  graphOptions: ChartOptions<'bar'>;
  datasetStats: Array<{
    label: string;
    min: number;
    max: number;
    avg: number;
    color: string;
    hidden: boolean;
  }>;
}

export function MeasurementGraph({
  graphData,
  graphOptions,
  datasetStats
}: MeasurementGraphProps) {
  const intl = useIntl();

  if (!graphData) {
    return (
      <div className="mt-6 bg-gray-50 rounded-lg border border-gray-200 p-8">
        <div className="flex flex-col items-center justify-center text-gray-500">
          <AlertCircle className="h-12 w-12 mb-4" />
          <p className="text-lg font-medium mb-2">
            {intl.formatMessage({ id: 'admin.report.noData' })}
          </p>
          <p className="text-sm text-gray-400">
            {intl.formatMessage({ id: 'admin.report.selectDifferentRange' })}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <div className="h-[400px]">
        <Bar
          data={graphData}
          options={graphOptions}
        />
      </div>
      
      <div className="mt-4 grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {datasetStats.filter(stat => !stat.hidden).map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-lg border p-4 shadow-sm"
            style={{ borderColor: stat.color }}
          >
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: stat.color }}
              />
              <h3 className="font-semibold text-lg text-gray-800">
                {stat.label}
              </h3>
            </div>
            <div className="space-y-1 text-sm">
              <p className="text-gray-600">
                Minimum: <span className="font-medium text-gray-900">{stat.min}</span>
              </p>
              <p className="text-gray-600">
                Average: <span className="font-medium text-gray-900">{stat.avg}</span>
              </p>
              <p className="text-gray-600">
                Maximum: <span className="font-medium text-gray-900">{stat.max}</span>
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}