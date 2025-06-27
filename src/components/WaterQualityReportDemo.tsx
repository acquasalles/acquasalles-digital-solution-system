import React from 'react';
import { WaterQualityReportPreview } from './WaterQualityReportPreview';

export function WaterQualityReportDemo() {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Water Quality Monitoring Dashboard</h1>
          <p className="text-gray-600">Real-time water quality measurements across collection points</p>
        </div>
        
        <WaterQualityReportPreview />
      </div>
    </div>
  );
}