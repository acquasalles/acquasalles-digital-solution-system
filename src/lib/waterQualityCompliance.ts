import { getSupabase } from './supabase';
import type { 
  WaterQualitySample, 
  WaterQualityParameter, 
  ComplianceAnalysis, 
  ComplianceLimits 
} from '../types/waterQuality';

// Limites de conformidade conforme especificado
export const COMPLIANCE_LIMITS: ComplianceLimits = {
  ph: { min: 5.0, max: 9.0 },
  chlorine: { max: 5.0 },
  turbidity: { max: 5.0 }
};

export function analyzeParameterCompliance(
  parameterName: string,
  value: number,
  limits: { min?: number; max?: number }
): {
  isCompliant: boolean;
  deviationPercentage: number;
  riskLevel: 'baixo' | 'médio' | 'alto';
} {
  let isCompliant = true;
  let deviationPercentage = 0;
  let riskLevel: 'baixo' | 'médio' | 'alto' = 'baixo';

  // Verificar conformidade
  if (limits.min !== undefined && value < limits.min) {
    isCompliant = false;
    deviationPercentage = ((limits.min - value) / limits.min) * 100;
  } else if (limits.max !== undefined && value > limits.max) {
    isCompliant = false;
    deviationPercentage = ((value - limits.max) / limits.max) * 100;
  }

  // Classificar nível de risco baseado no desvio
  if (!isCompliant) {
    if (deviationPercentage <= 10) {
      riskLevel = 'baixo';
    } else if (deviationPercentage <= 25) {
      riskLevel = 'médio';
    } else {
      riskLevel = 'alto';
    }
  }

  return {
    isCompliant,
    deviationPercentage: Math.round(deviationPercentage * 100) / 100,
    riskLevel
  };
}

export function createWaterQualityParameter(
  name: string,
  value: number,
  unit: string,
  limits: { min?: number; max?: number }
): WaterQualityParameter {
  const analysis = analyzeParameterCompliance(name, value, limits);
  
  return {
    name,
    value,
    unit,
    limit: limits,
    isCompliant: analysis.isCompliant,
    deviationPercentage: analysis.deviationPercentage,
    riskLevel: analysis.riskLevel
  };
}

export async function fetchWaterQualityData(
  clientId: string,
  startDate: string,
  endDate: string
): Promise<WaterQualitySample[]> {
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
        id,
        nome
      ),
      medicao_items!inner (
        valor,
        parametro,
        tipo_medicao_nome,
        tipo_medicao:tipo_medicao_id (
          nome
        )
      )
    `)
    .eq('cliente_id', clientId)
    .gte('data_hora_medicao', startDate)
    .lte('data_hora_medicao', endDate + 'T23:59:59')
    .order('data_hora_medicao', { ascending: false });

  if (error) throw error;

  // Agrupar dados por medição
  const samplesMap = new Map<string, WaterQualitySample>();

  data?.forEach(measurement => {
    const sampleId = measurement.id;
    
    if (!samplesMap.has(sampleId)) {
      samplesMap.set(sampleId, {
        id: sampleId,
        timestamp: new Date(measurement.data_hora_medicao),
        collectionPointId: measurement.ponto_de_coleta.id,
        collectionPointName: measurement.ponto_de_coleta.nome,
        areaName: measurement.area_de_trabalho?.nome_area || 'Área não informada',
        parameters: {},
        overallCompliance: true,
        nonComplianceCount: 0
      });
    }

    const sample = samplesMap.get(sampleId)!;

    // Processar cada item de medição
    measurement.medicao_items.forEach(item => {
      const value = parseFloat(item.valor);
      
      // Determinar o tipo de parâmetro baseado em múltiplas fontes
      let parameterType = item.tipo_medicao_nome || 
                         item.tipo_medicao?.nome || 
                         item.parametro;
      
      // Se ainda não temos o tipo, tentar determinar pelo valor
      if (!parameterType) {
        if (value >= 0 && value <= 14) {
          parameterType = 'pH';
        } else if (value >= 0 && value <= 10) {
          parameterType = 'Cloro';
        } else if (value >= 0 && value <= 100) {
          parameterType = 'Turbidez';
        }
      }
      
      // Normalizar nomes de parâmetros
      if (parameterType) {
        parameterType = parameterType.toLowerCase();
        
        if (parameterType.includes('ph') || parameterType === 'ph') {
          parameterType = 'pH';
        } else if (parameterType.includes('cloro') || parameterType.includes('chlorine')) {
          parameterType = 'Cloro';
        } else if (parameterType.includes('turbidez') || parameterType.includes('turbidity')) {
          parameterType = 'Turbidez';
        }
      }
      
      console.log('Processing measurement:', {
        originalType: item.tipo_medicao_nome,
        tipoMedicaoNome: item.tipo_medicao?.nome,
        parametro: item.parametro,
        finalType: parameterType,
        value: value
      });

      if (parameterType === 'pH') {
        sample.parameters.ph = createWaterQualityParameter(
          'pH',
          value,
          '',
          COMPLIANCE_LIMITS.ph
        );
      } else if (parameterType === 'Cloro') {
        sample.parameters.chlorine = createWaterQualityParameter(
          'Cloro Residual',
          value,
          'mg/L',
          { max: COMPLIANCE_LIMITS.chlorine.max }
        );
      } else if (parameterType === 'Turbidez') {
        sample.parameters.turbidity = createWaterQualityParameter(
          'Turbidez',
          value,
          'NTU',
          { max: COMPLIANCE_LIMITS.turbidity.max }
        );
      }
    });

    // Calcular conformidade geral da amostra
    const parameters = Object.values(sample.parameters).filter(Boolean);
    const nonCompliantParams = parameters.filter(p => !p.isCompliant);
    
    sample.overallCompliance = nonCompliantParams.length === 0;
    sample.nonComplianceCount = nonCompliantParams.length;
  });

  console.log('Final samples processed:', samplesMap.size);
  console.log('Sample data preview:', Array.from(samplesMap.values()).slice(0, 2));
  
  return Array.from(samplesMap.values());
}

export function generateComplianceAnalysis(samples: WaterQualitySample[]): ComplianceAnalysis {
  const totalSamples = samples.length;
  const compliantSamples = samples.filter(s => s.overallCompliance).length;
  const nonCompliantSamples = totalSamples - compliantSamples;
  const complianceRate = totalSamples > 0 ? (compliantSamples / totalSamples) * 100 : 0;

  // Analisar cada parâmetro
  const phValues: number[] = [];
  const chlorineValues: number[] = [];
  const turbidityValues: number[] = [];
  
  const phNonCompliant: any[] = [];
  const chlorineNonCompliant: any[] = [];
  const turbidityNonCompliant: any[] = [];

  samples.forEach(sample => {
    if (sample.parameters.ph) {
      phValues.push(sample.parameters.ph.value);
      if (!sample.parameters.ph.isCompliant) {
        phNonCompliant.push({
          value: sample.parameters.ph.value,
          deviation: sample.parameters.ph.deviationPercentage || 0,
          riskLevel: sample.parameters.ph.riskLevel,
          timestamp: sample.timestamp,
          pointName: sample.collectionPointName
        });
      }
    }

    if (sample.parameters.chlorine) {
      chlorineValues.push(sample.parameters.chlorine.value);
      if (!sample.parameters.chlorine.isCompliant) {
        chlorineNonCompliant.push({
          value: sample.parameters.chlorine.value,
          deviation: sample.parameters.chlorine.deviationPercentage || 0,
          riskLevel: sample.parameters.chlorine.riskLevel,
          timestamp: sample.timestamp,
          pointName: sample.collectionPointName
        });
      }
    }

    if (sample.parameters.turbidity) {
      turbidityValues.push(sample.parameters.turbidity.value);
      if (!sample.parameters.turbidity.isCompliant) {
        turbidityNonCompliant.push({
          value: sample.parameters.turbidity.value,
          deviation: sample.parameters.turbidity.deviationPercentage || 0,
          riskLevel: sample.parameters.turbidity.riskLevel,
          timestamp: sample.timestamp,
          pointName: sample.collectionPointName
        });
      }
    }
  });

  // Gerar recomendações
  const recommendations: string[] = [];
  
  if (phNonCompliant.length > 0) {
    const highRiskPh = phNonCompliant.filter(nc => nc.riskLevel === 'alto').length;
    if (highRiskPh > 0) {
      recommendations.push(`Atenção: ${highRiskPh} medições de pH com risco alto detectadas. Verificar sistema de correção de pH.`);
    }
  }

  if (chlorineNonCompliant.length > 0) {
    const highRiskChlorine = chlorineNonCompliant.filter(nc => nc.riskLevel === 'alto').length;
    if (highRiskChlorine > 0) {
      recommendations.push(`Atenção: ${highRiskChlorine} medições de cloro residual com risco alto. Revisar dosagem de cloro.`);
    }
  }

  if (turbidityNonCompliant.length > 0) {
    const highRiskTurbidity = turbidityNonCompliant.filter(nc => nc.riskLevel === 'alto').length;
    if (highRiskTurbidity > 0) {
      recommendations.push(`Atenção: ${highRiskTurbidity} medições de turbidez com risco alto. Verificar sistema de filtração.`);
    }
  }

  if (complianceRate < 90) {
    recommendations.push('Taxa de conformidade abaixo de 90%. Recomenda-se revisão geral dos processos de tratamento.');
  }

  if (recommendations.length === 0) {
    recommendations.push('Todos os parâmetros estão dentro dos limites de conformidade. Manter monitoramento regular.');
  }

  return {
    totalSamples,
    compliantSamples,
    nonCompliantSamples,
    complianceRate: Math.round(complianceRate * 100) / 100,
    parameterStats: {
      ph: {
        totalMeasurements: phValues.length,
        compliantMeasurements: phValues.length - phNonCompliant.length,
        complianceRate: phValues.length > 0 ? ((phValues.length - phNonCompliant.length) / phValues.length) * 100 : 0,
        averageValue: phValues.length > 0 ? phValues.reduce((a, b) => a + b, 0) / phValues.length : 0,
        nonCompliantValues: phNonCompliant
      },
      chlorine: {
        totalMeasurements: chlorineValues.length,
        compliantMeasurements: chlorineValues.length - chlorineNonCompliant.length,
        complianceRate: chlorineValues.length > 0 ? ((chlorineValues.length - chlorineNonCompliant.length) / chlorineValues.length) * 100 : 0,
        averageValue: chlorineValues.length > 0 ? chlorineValues.reduce((a, b) => a + b, 0) / chlorineValues.length : 0,
        nonCompliantValues: chlorineNonCompliant
      },
      turbidity: {
        totalMeasurements: turbidityValues.length,
        compliantMeasurements: turbidityValues.length - turbidityNonCompliant.length,
        complianceRate: turbidityValues.length > 0 ? ((turbidityValues.length - turbidityNonCompliant.length) / turbidityValues.length) * 100 : 0,
        averageValue: turbidityValues.length > 0 ? turbidityValues.reduce((a, b) => a + b, 0) / turbidityValues.length : 0,
        nonCompliantValues: turbidityNonCompliant
      }
    },
    recommendations
  };
}