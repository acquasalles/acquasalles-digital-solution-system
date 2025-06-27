import { format } from 'date-fns';
import type { ReportData, Area, DataEntry } from '../types/report';

export function formatData(data: any[], clientName: string): ReportData {
  const dateMap = new Map<string, Map<string, Area>>();

  data.forEach(medicao => {
    const date = format(new Date(medicao.data_hora_medicao), 'dd/MM/yyyy');
    
    if (!dateMap.has(date)) {
      dateMap.set(date, new Map<string, Area>());
    }

    const areasForDate = dateMap.get(date)!;
    const areaId = medicao.area_de_trabalho_id;
    const areaName = medicao.area_de_trabalho?.nome_area || 'Unknown Area';

    if (!areasForDate.has(areaId)) {
      areasForDate.set(areaId, {
        nome: areaName,
        pontos_de_coleta: []
      });
    }

    const area = areasForDate.get(areaId)!;
    const ponto = {
      nome: medicao.ponto_de_coleta?.nome || 'Unknown Point',
      medicoes: medicao.medicao_items.map((item: any) => {
        // Temporary fix: Determine measurement type based on value ranges
        let tipo = item.tipo_medicao_nome || item.parametro;
        
        // If tipo is null or undefined, determine based on value
        if (!tipo) {
          const valor = parseFloat(item.valor);
          if (valor < 5) {
            tipo = "Cloro";
          } else if (valor >= 5 && valor < 15) {
            tipo = "pH";
          } else if (valor >= 15 && valor < 1000) {
            tipo = "Volume";
          } else if (valor >= 1000) {
            tipo = "Hidrômetro";
          } else {
            tipo = "Unknown Parameter";
          }
        }
        
        const medicao = {
          tipo,
          valor: item.valor
        };
        
        if (item.tipo_medicao_id === '300ad69c-268b-4a5f-befc-fbaee3a110cc') {
          const photo = item.medicao_photos?.[0];
          const imageUrl = photo?.photo_url;
          return { ...medicao, imageUrl };
        }
        
        return medicao;
      })
    };

    const existingPontoIndex = area.pontos_de_coleta.findIndex(
      p => p.nome === ponto.nome
    );

    if (existingPontoIndex === -1) {
      area.pontos_de_coleta.push(ponto);
    } else {
      area.pontos_de_coleta[existingPontoIndex].medicoes = [
        ...area.pontos_de_coleta[existingPontoIndex].medicoes,
        ...ponto.medicoes
      ];
    }
  });

  const datas: DataEntry[] = Array.from(dateMap.entries())
    .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
    .map(([date, areas]) => ({
      data: date,
      area: Array.from(areas.values()).map(area => ({
        nome: area.nome,
        pontos_de_coleta: area.pontos_de_coleta
      }))
    }));

  return {
    cliente: clientName,
    datas
  };
}