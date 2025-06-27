import React, { useState, useMemo } from 'react';
import { AlertTriangle, CheckCircle, Clock, Droplets, Beaker, Eye, TrendingUp, TrendingDown, Minus, Download } from 'lucide-react';
import { format } from 'date-fns';
import { useIntl } from 'react-intl';

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
  data?: WaterQualityAnalysisData;
  isVisible: boolean;
  onClose?: () => void;
}

// Sample analysis data
const generateSampleAnalysis = (): WaterQualityAnalysisData => {
  const now = new Date();
  const startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
  
  return {
    reportId: `WQR-${format(now, 'yyyyMMdd-HHmmss')}`,
    generatedAt: now,
    dateRange: { start: startDate, end: now },
    clientName: 'ACQUASALLES LTDA',
    totalMeasurements: 156,
    overallCompliance: 87.5,
    criticalIssues: 2,
    warnings: 8,
    collectionPoints: [
      {
        pointId: 'point-a1',
        pointName: 'Ponto A1',
        areaName: 'Área Industrial Principal',
        lastMeasurement: new Date(now.getTime() - 2 * 60 * 60 * 1000),
        overallStatus: 'compliant',
        complianceScore: 92.3,
        parameters: [
          {
            name: 'pH',
            value: 7.2,
            unit: '',
            normalRange: { min: 6.5, max: 8.5 },
            status: 'normal',
            trend: 'stable',
            icon: <Beaker className="h-4 w-4" />
          },
          {
            name: 'Cloro Residual',
            value: 1.8,
            unit: 'mg/L',
            normalRange: { min: 0.5, max: 2.0 },
            status: 'normal',
            trend: 'up',
            icon: <Droplets className="h-4 w-4" />
          },
          {
            name: 'Turbidez',
            value: 2.1,
            unit: 'NTU',
            normalRange: { min: 0, max: 5.0 },
            status: 'normal',
            trend: 'down',
            icon: <Eye className="h-4 w-4" />
          }
        ]
      },
      {
        pointId: 'point-a2',
        pointName: 'Ponto A2',
        areaName: 'Área Industrial Principal',
        lastMeasurement: new Date(now.getTime() - 1 * 60 * 60 * 1000),
        overallStatus: 'warning',
        complianceScore: 78.5,
        parameters: [
          {
            name: 'Hidrômetro',
            value: 45230,
            unit: 'L',
            normalRange: { min: 0, max: 50000 },
            status: 'warning',
            trend: 'up',
            icon: <TrendingUp className="h-4 w-4" />
          },
          {
            name: 'Vazão',
            value: 650,
            unit: 'L/h',
            normalRange: { min: 400, max: 800 },
            status: 'normal',
            trend: 'stable',
            icon: <Droplets className="h-4 w-4" />
          }
        ]
      }
    ]
  };
};

export function WaterQualityAnalysisReport({ 
  data = generateSampleAnalysis(), 
  isVisible,
  onClose 
}: WaterQualityAnalysisReportProps) {
  const intl = useIntl();

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

  if (!isVisible) return null;

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