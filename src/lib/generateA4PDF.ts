import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import { IntlShape } from 'react-intl';
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

export async function generateA4PDF(
  reportData: ReportData,
  collectionPointsData: CollectionPointData[],
  clientInfo: ClientInfo,
  reportPeriod: { start: Date; end: Date },
  intl: IntlShape,
  chartImages?: Map<string, string>
): Promise<void> {
  try {
    // Create PDF in landscape mode (A4)
    const doc = new jsPDF('landscape', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 10;
    const contentWidth = pageWidth - (margin * 2);
    
    let currentPage = 1;
    
    // Page 1: Client Information and Summary
    generateClientInfoPage(doc, clientInfo, reportPeriod, collectionPointsData, reportData, margin, contentWidth, pageHeight, pageWidth);
    
    // Chart Pages - 6 charts per page (3x2 grid)
    const chartsPerPage = 6;
    const validCollectionPoints = collectionPointsData.filter(
      point => point.datasetStats && point.datasetStats.length > 0
    );
    
    if (validCollectionPoints.length > 0) {
      const totalChartPages = Math.ceil(validCollectionPoints.length / chartsPerPage);
      
      for (let pageIndex = 0; pageIndex < totalChartPages; pageIndex++) {
        doc.addPage();
        currentPage++;
        
        const startIndex = pageIndex * chartsPerPage;
        const pageCharts = validCollectionPoints.slice(startIndex, startIndex + chartsPerPage);
        
        generateChartsPage(doc, pageCharts, currentPage, totalChartPages + 2, margin, contentWidth, pageHeight, pageWidth, chartImages);
      }
    }
    
    // Table Page - Use the same data as the A4 preview
    if (reportData && reportData.datas.length > 0) {
      doc.addPage();
      currentPage++;
      
      generateTablePage(doc, reportData, collectionPointsData, currentPage, margin, contentWidth, pageHeight, pageWidth);
    }
    
    // Save the PDF
    const fileName = `A4_Report_${clientInfo.name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`;
    doc.save(fileName);
  } catch (error) {
    console.error('Error in generateA4PDF:', error);
    throw new Error(`Failed to generate A4 PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function generateClientInfoPage(
  doc: jsPDF,
  clientInfo: ClientInfo,
  reportPeriod: { start: Date; end: Date },
  collectionPointsData: CollectionPointData[],
  reportData: ReportData,
  margin: number,
  contentWidth: number,
  pageHeight: number,
  pageWidth: number
) {
  let yPos = margin;
  
  // Header with blue background - exact match to desired layout
  doc.setFillColor(59, 130, 246); // Blue-600
  doc.rect(margin, yPos, contentWidth, 25, 'F');
  
  // Title - positioned to match desired layout
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('Relatório de Qualidade da Água', margin + 10, yPos + 12);
  
  // Period - positioned below title
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Período: ${format(reportPeriod.start, 'dd/MM/yyyy')} - ${format(reportPeriod.end, 'dd/MM/yyyy')}`,
    margin + 10,
    yPos + 20
  );
  
  // Report number - positioned at top right without "Relatório Nº" prefix
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(`WQR-${format(new Date(), 'yyyyMMdd')}`, pageWidth - margin - 60, yPos + 15);
  
  yPos += 35;
  doc.setTextColor(0, 0, 0);
  
  // Client Information Section - exact positioning
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Informações do Cliente', margin, yPos);
  yPos += 15;
  
  // Client info in 4 columns with exact spacing
  const colWidth = contentWidth / 4;
  
  // Column 1: Company Data
  doc.setFillColor(249, 250, 251); // Gray-50
  doc.rect(margin, yPos, colWidth - 5, 35, 'F');
  doc.setDrawColor(229, 231, 235);
  doc.rect(margin, yPos, colWidth - 5, 35);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Dados da Empresa', margin + 5, yPos + 8);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Razão Social: ${clientInfo.name}`, margin + 5, yPos + 16);
  doc.text(`CNPJ: ${clientInfo.cnpj}`, margin + 5, yPos + 23);
  
  // Column 2: Address
  doc.setFillColor(249, 250, 251);
  doc.rect(margin + colWidth, yPos, colWidth - 5, 35, 'F');
  doc.setDrawColor(229, 231, 235);
  doc.rect(margin + colWidth, yPos, colWidth - 5, 35);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Endereço', margin + colWidth + 5, yPos + 8);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(clientInfo.address, margin + colWidth + 5, yPos + 16);
  doc.text(`${clientInfo.city} - ${clientInfo.state}`, margin + colWidth + 5, yPos + 23);
  
  // Column 3: Contact
  doc.setFillColor(249, 250, 251);
  doc.rect(margin + colWidth * 2, yPos, colWidth - 5, 35, 'F');
  doc.setDrawColor(229, 231, 235);
  doc.rect(margin + colWidth * 2, yPos, colWidth - 5, 35);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Contato', margin + colWidth * 2 + 5, yPos + 8);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(clientInfo.phone, margin + colWidth * 2 + 5, yPos + 16);
  doc.text(clientInfo.email, margin + colWidth * 2 + 5, yPos + 23);
  doc.text(`Responsável: ${clientInfo.contact}`, margin + colWidth * 2 + 5, yPos + 30);
  
  // Column 4: Report Period with blue styling
  doc.setFillColor(239, 246, 255); // Blue-50
  doc.rect(margin + colWidth * 3, yPos, colWidth - 5, 35, 'F');
  doc.setDrawColor(59, 130, 246);
  doc.rect(margin + colWidth * 3, yPos, colWidth - 5, 35);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 64, 175); // Blue-800
  doc.text('Período do Relatório', margin + colWidth * 3 + 5, yPos + 8);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Início: ${format(reportPeriod.start, 'dd/MM/yyyy')}`, margin + colWidth * 3 + 5, yPos + 16);
  doc.text(`Fim: ${format(reportPeriod.end, 'dd/MM/yyyy')}`, margin + colWidth * 3 + 5, yPos + 23);
  doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, margin + colWidth * 3 + 5, yPos + 30);
  
  yPos += 45;
  doc.setTextColor(0, 0, 0);
  
  // Executive Summary with exact blue gradient styling
  doc.setFillColor(59, 130, 246); // Blue-600
  doc.rect(margin, yPos, contentWidth, 40, 'F');
  
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('Resumo Executivo', margin + 10, yPos + 12);
  
  // Summary stats in 6 columns with exact positioning
  const statColWidth = (contentWidth - 40) / 6;
  const stats = [
    { label: 'Pontos de Coleta', value: collectionPointsData.length.toString() },
    { label: 'Dias com Medições', value: reportData?.datas.length.toString() || '0' },
    { label: 'Parâmetros', value: collectionPointsData.reduce((acc, point) => acc + point.datasetStats.filter(stat => !stat.hidden).length, 0).toString() },
    { label: 'Dias Analisados', value: Math.round((reportPeriod.end.getTime() - reportPeriod.start.getTime()) / (1000 * 60 * 60 * 24)).toString() },
    { label: 'Alertas Críticos', value: '0' },
    { label: 'Monitoramento', value: '24h' }
  ];
  
  stats.forEach((stat, index) => {
    const x = margin + 20 + (index * statColWidth);
    doc.setFillColor(255, 255, 255);
    doc.rect(x, yPos + 18, statColWidth - 5, 18, 'F');
    
    // Large number
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(59, 130, 246); // Blue-600
    doc.text(stat.value, x + statColWidth/2, yPos + 26, { align: 'center' });
    
    // Label below
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(75, 85, 99); // Gray-600
    doc.text(stat.label, x + statColWidth/2, yPos + 32, { align: 'center' });
  });
  
  // Footer with exact positioning
  yPos = pageHeight - 20;
  doc.setFontSize(9);
  doc.setTextColor(107, 114, 128);
  doc.text('Este relatório foi gerado automaticamente pelo Sistema de Monitoramento ACQUASALLES', margin, yPos);
  doc.text(`Página 1 de ${Math.ceil(collectionPointsData.length / 6) + 2} | Formato Paisagem (297mm x 210mm)`, margin, yPos + 5);
}

function generateChartsPage(
  doc: jsPDF,
  pageCharts: CollectionPointData[],
  currentPage: number,
  totalPages: number,
  margin: number,
  contentWidth: number,
  pageHeight: number,
  pageWidth: number,
  chartImages?: Map<string, string>
) {
  let yPos = margin;
  
  // Page Header with exact styling
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Gráficos de Monitoramento', margin, yPos + 8);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(107, 114, 128);
  doc.text('Análise temporal dos parâmetros de qualidade da água', margin, yPos + 16);
  
  yPos += 25;
  doc.setTextColor(0, 0, 0);
  
  // Charts Grid - 3 columns, 2 rows with exact spacing
  const chartWidth = (contentWidth - 20) / 3;
  const chartHeight = 85;
  const chartSpacing = 10;
  
  pageCharts.forEach((point, index) => {
    const col = index % 3;
    const row = Math.floor(index / 3);
    const x = margin + (col * (chartWidth + chartSpacing));
    const y = yPos + (row * (chartHeight + chartSpacing));
    
    // Chart container with exact gray background
    doc.setFillColor(249, 250, 251); // Gray-50
    doc.rect(x, y, chartWidth, chartHeight, 'F');
    doc.setDrawColor(229, 231, 235); // Gray-200
    doc.rect(x, y, chartWidth, chartHeight);
    
    // Chart title - centered and bold
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(point.name, x + chartWidth/2, y + 8, { align: 'center' });
    
    // Chart area - white background
    doc.setFillColor(255, 255, 255);
    doc.rect(x + 5, y + 12, chartWidth - 10, 45, 'F');
    doc.setDrawColor(229, 231, 235);
    doc.rect(x + 5, y + 12, chartWidth - 10, 45);
    
    // Insert chart image if available
    const chartImage = chartImages?.get(point.id);
    if (chartImage) {
      try {
        // Calculate image dimensions to fit within the chart area
        const imageX = x + 7;
        const imageY = y + 14;
        const imageWidth = chartWidth - 14;
        const imageHeight = 41;
        
        doc.addImage(chartImage, 'PNG', imageX, imageY, imageWidth, imageHeight);
        console.log(`Added chart image for point: ${point.name}`);
      } catch (error) {
        console.error(`Error adding chart image for point ${point.name}:`, error);
        // Fallback to placeholder text
        doc.setTextColor(107, 114, 128);
        doc.setFontSize(10);
        doc.text('Chart Error', x + chartWidth/2, y + 35, { align: 'center' });
      }
    } else {
      // Chart placeholder text if no image available
      doc.setTextColor(107, 114, 128); // Gray-500
      doc.setFontSize(10);
      doc.text('Gráfico de Medições', x + chartWidth/2, y + 30, { align: 'center' });
      doc.setFontSize(8);
      const measurementTypes = point.datasetStats.filter(stat => !stat.hidden).map(stat => stat.label).join(', ');
      doc.text(measurementTypes, x + chartWidth/2, y + 38, { align: 'center' });
    }
    
    // Stats summary below chart - 2x2 grid
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8);
    const visibleStats = point.datasetStats.filter(stat => !stat.hidden).slice(0, 4);
    visibleStats.forEach((stat, statIndex) => {
      const statX = x + 5 + (statIndex % 2) * (chartWidth/2 - 5);
      const statY = y + 62 + Math.floor(statIndex / 2) * 10;
      
      // Small white box for each stat
      doc.setFillColor(255, 255, 255);
      doc.rect(statX, statY - 3, chartWidth/2 - 10, 8, 'F');
      doc.setDrawColor(229, 231, 235);
      doc.rect(statX, statY - 3, chartWidth/2 - 10, 8);
      
      // Stat label and value
      doc.setFont('helvetica', 'bold');
      doc.text(stat.label, statX + 2, statY + 1);
      doc.setFont('helvetica', 'normal');
      let statText = `${stat.avg}`;
      if (stat.total !== undefined) {
        statText += ` (T: ${stat.total})`;
      }
      
      // Add total volume consumed for Volume measurements
      const pointData = pageCharts.find(p => p.id === point.id);
      if (pointData?.totalVolumeConsumed !== undefined && stat.label === 'Volume') {
        statText += ` | C: ${pointData.totalVolumeConsumed}m³`;
      }
      
      doc.text(statText, statX + 2, statY + 4);
    });
    
    // Add outorga information if available
    const pointData = pageCharts.find(p => p.id === point.id);
    visibleStats.forEach((stat, statIndex) => {
      const statX = x + 5 + (statIndex % 2) * (chartWidth/2 - 5);
      const statY = y + 62 + Math.floor(statIndex / 2) * 10;
      
      if (pointData?.outorga?.volumeMax && stat.label === 'Volume') {
        doc.setTextColor(239, 68, 68); // Red color
        doc.setFontSize(7);
        doc.text(`Máx: ${pointData.outorga.volumeMax.value}${pointData.outorga.volumeMax.unit}`, statX + 2, statY + 7);
        doc.setTextColor(0, 0, 0); // Reset to black
      }
    });
  });
  
  // Footer
  yPos = pageHeight - 15;
  doc.setFontSize(9);
  doc.setTextColor(107, 114, 128);
  doc.text(`Página ${currentPage} de ${totalPages} | Formato Paisagem`, margin, yPos);
}

function generateTablePage(
  doc: jsPDF,
  reportData: ReportData,
  collectionPointsData: CollectionPointData[],
  currentPage: number,
  margin: number,
  contentWidth: number,
  pageHeight: number,
  pageWidth: number
) {
  let yPos = margin;
  
  // Page Header
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Dados de Medição', margin, yPos + 8);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(107, 114, 128);
  doc.text('Registro detalhado das medições por ponto de coleta (30 registros)', margin, yPos + 16);
  
  yPos += 25;
  doc.setTextColor(0, 0, 0);
  
  // Generate table data using the same logic as A4 preview
  const tableData = generateTableDataFromReport(reportData);
  
  if (tableData && tableData.rows.length > 0) {
    // Prepare headers with merged structure
    const mainHeaders = ['Data'];
    const subHeaders = [''];
    
    // Add collection point headers
    tableData.collectionPoints.forEach(point => {
      // Add main header for each measurement of this point
      point.measurements.forEach(measurement => {
        mainHeaders.push(point.name);
        subHeaders.push(`${measurement.parameter}${measurement.unit ? ` (${measurement.unit})` : ''}`);
      });
    });
    
    // Prepare table rows (limit to 30 rows)
    const tableRows = tableData.rows.slice(0, 30).map(row => {
      const rowData = [row.date];
      
      tableData.collectionPoints.forEach(point => {
        point.measurements.forEach(measurement => {
          const pointData = row.pointData.get(point.id) || [];
          const value = pointData.find(v => v.parameter === measurement.parameter);
          rowData.push(value ? parseFloat(value.value).toFixed(2) : '-');
        });
      });
      
      return rowData;
    });
    
    // Generate table using autoTable with exact styling
    (doc as any).autoTable({
      startY: yPos,
      head: [mainHeaders, subHeaders],
      body: tableRows,
      headStyles: [
        { 
          fillColor: [34, 197, 94], // Green header for main
          textColor: [255, 255, 255], 
          fontStyle: 'bold', 
          fontSize: 8,
          halign: 'center',
          cellPadding: 2
        },
        { 
          fillColor: [34, 197, 94], // Green header for sub
          textColor: [255, 255, 255], 
          fontStyle: 'normal', 
          fontSize: 7,
          halign: 'center',
          cellPadding: 1
        }
      ],
      bodyStyles: { 
        fontSize: 7, 
        cellPadding: 1,
        halign: 'center',
        alternateRowStyles: { fillColor: [249, 250, 251] }
      },
      columnStyles: {
        0: { cellWidth: 20, fontStyle: 'bold', halign: 'center' }
      },
      theme: 'grid',
      tableWidth: 'auto',
      margin: { left: margin, right: margin },
      styles: {
        lineColor: [200, 200, 200],
        lineWidth: 0.1,
        overflow: 'linebreak'
      }
    });
  } else {
    // No data message
    doc.setFontSize(12);
    doc.setTextColor(107, 114, 128);
    doc.text('Nenhum dado de medição disponível para o período selecionado.', margin, yPos + 20);
  }
  
  // Footer
  yPos = pageHeight - 15;
  doc.setFontSize(9);
  doc.setTextColor(107, 114, 128);
  doc.text(`Página ${currentPage} | 30 registros exibidos`, margin, yPos);
}

function generateTableDataFromReport(reportData: ReportData) {
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
            const unit = m.tipo === 'pH' ? '' : 
                        m.tipo === 'Cloro' ? 'mg/L' : 
                        m.tipo === 'Turbidez' ? 'NTU' : 
                        m.tipo === 'Vazão' ? 'L' : 
                        m.tipo === 'Hidrômetro' ? 'L' : '';
            
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

  const collectionPoints = Array.from(collectionPointsMap.values()).map(point => ({
    ...point,
    measurements: point.measurements.sort((a, b) => a.parameter.localeCompare(b.parameter))
  }));

  const rows = Array.from(rowsMap.values())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return {
    headers: ['Data', ...collectionPoints.map(cp => cp.name)],
    collectionPoints,
    rows
  };
}