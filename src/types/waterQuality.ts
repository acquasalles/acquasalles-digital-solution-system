export interface WaterQualityParameter {
  name: string;
  value: number;
  unit: string;
  limit: {
    min?: number;
    max?: number;
  };
  isCompliant: boolean;
  deviationPercentage?: number;
  riskLevel: 'baixo' | 'médio' | 'alto';
}

export interface WaterQualitySample {
  id: string;
  timestamp: Date;
  collectionPointId: string;
  collectionPointName: string;
  areaName: string;
  parameters: {
    ph?: WaterQualityParameter;
    chlorine?: WaterQualityParameter;
    turbidity?: WaterQualityParameter;
  };
  overallCompliance: boolean | null; // null = N/A, true = conforme, false = não conforme
  nonComplianceCount: number;
}

export interface ComplianceAnalysis {
  totalSamples: number;
  compliantSamples: number;
  nonCompliantSamples: number;
  complianceRate: number;
  parameterStats: {
    ph: {
      totalMeasurements: number;
      compliantMeasurements: number;
      complianceRate: number;
      averageValue: number;
      nonCompliantValues: Array<{
        value: number;
        deviation: number;
        riskLevel: string;
        timestamp: Date;
        pointName: string;
      }>;
    };
    chlorine: {
      totalMeasurements: number;
      compliantMeasurements: number;
      complianceRate: number;
      averageValue: number;
      nonCompliantValues: Array<{
        value: number;
        deviation: number;
        riskLevel: string;
        timestamp: Date;
        pointName: string;
      }>;
    };
    turbidity: {
      totalMeasurements: number;
      compliantMeasurements: number;
      complianceRate: number;
      averageValue: number;
      nonCompliantValues: Array<{
        value: number;
        deviation: number;
        riskLevel: string;
        timestamp: Date;
        pointName: string;
      }>;
    };
  };
  recommendations: string[];
}

export interface ComplianceLimits {
  ph: { min: number; max: number };
  chlorine: { max: number };
  turbidity: { max: number };
}