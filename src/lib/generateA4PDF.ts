import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import { IntlShape } from 'react-intl';
import type { ReportData } from '../types/report';
import type { ComplianceAnalysis } from '../types/waterQuality';

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
  chartImages?: Map<string, string>,
  realAnalysis?: ComplianceAnalysis
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
        
        generateChartsPage(doc, pageCharts, currentPage, totalChartPages + 2, margin, contentWidth, pageHeight, pageWidth, chartImages, intl);
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
  pageWidth: number,
  realAnalysis?: ComplianceAnalysis
) {
  let yPos = margin;
  
  // Header with blue gradient background - exact match to preview
  doc.setFillColor(59, 130, 246); // Blue-600
  doc.rect(margin, yPos, contentWidth, 30, 'F');
  
  // Title - white text on blue background
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('Relatório de Qualidade da Água', margin + 10, yPos + 15);
  
  // Period - white text on blue background
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Período: ${format(reportPeriod.start, 'dd/MM/yyyy')} - ${format(reportPeriod.end, 'dd/MM/yyyy')}`,
    margin + 10,
    yPos + 25
  );
  
  // Report number - white text on blue background at top right
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text('Relatório Nº', pageWidth - margin - 50, yPos + 10);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(`WQR-${format(new Date(), 'yyyyMMdd')}`, pageWidth - margin - 50, yPos + 22);
  
  yPos += 40;
  doc.setTextColor(0, 0, 0);
  
  // Client Information Section
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Informações do Cliente', margin, yPos);
  yPos += 12;
  
  // Client info in 4 columns - matching preview layout
  const colWidth = (contentWidth - 15) / 4; // Account for gaps between columns
  
  // Column 1: Company Data
  doc.setFillColor(249, 250, 251); // Gray-50
  doc.rect(margin, yPos, colWidth, 35, 'F');
  doc.setDrawColor(229, 231, 235);
  doc.rect(margin, yPos, colWidth, 35);
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Dados da Empresa', margin + 3, yPos + 8);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`CNPJ:`, margin + 3, yPos + 15);
  doc.text(`${clientInfo.cnpj}`, margin + 3, yPos + 20);
  // Don't show full company name here as it's too long for the box
  
  // Column 2: Address
  doc.setFillColor(249, 250, 251);
  doc.rect(margin + colWidth + 5, yPos, colWidth, 35, 'F');
  doc.setDrawColor(229, 231, 235);
  doc.rect(margin + colWidth + 5, yPos, colWidth, 35);
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Endereço', margin + colWidth + 8, yPos + 8);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Endereço:', margin + colWidth + 8, yPos + 15);
  doc.text('Endereço não informado', margin + colWidth + 8, yPos + 20);
  doc.text('Cidade:', margin + colWidth + 8, yPos + 25);
  doc.text(`${clientInfo.city} - ${clientInfo.state}`, margin + colWidth + 8, yPos + 30);
  
  // Column 3: Contact
  doc.setFillColor(249, 250, 251);
  doc.rect(margin + colWidth * 2 + 10, yPos, colWidth, 35, 'F');
  doc.setDrawColor(229, 231, 235);
  doc.rect(margin + colWidth * 2 + 10, yPos, colWidth, 35);
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Contato', margin + colWidth * 2 + 13, yPos + 8);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(clientInfo.phone, margin + colWidth * 2 + 13, yPos + 15);
  doc.text(clientInfo.email, margin + colWidth * 2 + 13, yPos + 20);
  doc.text(`Responsável: ${clientInfo.contact}`, margin + colWidth * 2 + 13, yPos + 25);
  
  // Column 4: Report Period with blue styling
  doc.setFillColor(239, 246, 255); // Blue-50
  doc.rect(margin + colWidth * 3 + 15, yPos, colWidth, 35, 'F');
  doc.setDrawColor(59, 130, 246);
  doc.rect(margin + colWidth * 3 + 15, yPos, colWidth, 35);
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 64, 175); // Blue-800
  doc.text('Período do Relatório', margin + colWidth * 3 + 18, yPos + 8);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Início: ${format(reportPeriod.start, 'dd/MM/yyyy')}`, margin + colWidth * 3 + 18, yPos + 15);
  doc.text(`Fim: ${format(reportPeriod.end, 'dd/MM/yyyy')}`, margin + colWidth * 3 + 18, yPos + 20);
  doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, margin + colWidth * 3 + 18, yPos + 25);
  
  yPos += 45;
  doc.setTextColor(0, 0, 0);
  
  // Executive Summary with blue background - matching preview
  doc.setFillColor(59, 130, 246); // Blue-600
  doc.rect(margin, yPos, contentWidth, 45, 'F');
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('Resumo Executivo', margin + 10, yPos + 10);
  
  // Summary stats in 6 columns - white boxes with blue text
  const statColWidth = (contentWidth - 50) / 6;
  
  // Calculate real statistics if available
  let realStats;
  if (realAnalysis) {
    const uniqueCollectionPoints = collectionPointsData.length;
    const totalDaysWithMeasurements = reportData?.datas.length || 0;
    const totalParameters = Object.entries(realAnalysis.parameterStats).reduce((sum, [key, stat]) => {
      return sum + (stat.totalMeasurements > 0 ? 1 : 0);
    }, 0);
    const criticalIssues = Object.entries(realAnalysis.parameterStats).reduce((sum, [key, stat]) => {
      const criticalCount = stat.nonCompliantValues.filter(nc => nc.riskLevel === 'alto').length;
      return sum + criticalCount;
    }, 0);
    
    realStats = {
      totalCollectionPoints: uniqueCollectionPoints,
      totalMeasurementDays: totalDaysWithMeasurements,
      totalParameters,
      daysAnalyzed: Math.round((reportPeriod.end.getTime() - reportPeriod.start.getTime()) / (1000 * 60 * 60 * 24)),
      criticalAlerts: criticalIssues,
      complianceRate: realAnalysis.complianceRate
    };
  } else {
    realStats = {
      totalCollectionPoints: collectionPointsData.length,
      totalMeasurementDays: reportData?.datas.length || 0,
      totalParameters: collectionPointsData.reduce((acc, point) => acc + point.datasetStats.filter(stat => !stat.hidden).length, 0),
      daysAnalyzed: Math.round((reportPeriod.end.getTime() - reportPeriod.start.getTime()) / (1000 * 60 * 60 * 24)),
      criticalAlerts: 0,
      complianceRate: 0
    };
  }
  
  const stats = [
    { label: 'Pontos de Coleta', value: realStats.totalCollectionPoints.toString() },
    { label: 'Dias com Medições', value: realStats.totalMeasurementDays.toString() },
    { label: 'Parâmetros', value: realStats.totalParameters.toString() },
    { label: 'Taxa Conformidade', value: `${realStats.complianceRate.toFixed(1)}%` },
    { label: 'Alertas Críticos', value: realStats.criticalAlerts.toString() },
    { label: 'Monitoramento', value: '24h' }
  ];
  
  stats.forEach((stat, index) => {
    const x = margin + 15 + (index * (statColWidth + 2));
    doc.setFillColor(255, 255, 255);
    doc.rect(x, yPos + 15, statColWidth, 25, 'F');
    doc.setDrawColor(229, 231, 235);
    doc.rect(x, yPos + 15, statColWidth, 25);
    
    // Large number - blue text
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(59, 130, 246); // Blue-600
    doc.text(stat.value, x + statColWidth/2, yPos + 26, { align: 'center' });
    
    // Label below - gray text
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(75, 85, 99); // Gray-600
    doc.text(stat.label, x + statColWidth/2, yPos + 35, { align: 'center' });
  });
  
  yPos += 55;
  doc.setTextColor(0, 0, 0);
  
  // Add Non-Conformities section if there are any
  if (realAnalysis && realAnalysis.nonCompliantSamples > 0) {
    // Non-conformities section with red styling
    doc.setFillColor(254, 242, 242); // Red-50
    doc.rect(margin, yPos, contentWidth, 40, 'F');
    doc.setDrawColor(252, 165, 165); // Red-300
    doc.rect(margin, yPos, contentWidth, 40);
    
    doc.setFillColor(239, 68, 68); // Red-500
    doc.rect(margin, yPos, contentWidth, 8, 'F');
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('⚠ Ocorrências de Não Conformidades', margin + 5, yPos + 6);
    
    // Table header
    doc.setTextColor(0, 0, 0);
    doc.setFillColor(254, 226, 226); // Red-100
    doc.rect(margin, yPos + 8, contentWidth, 8, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('Data', margin + 5, yPos + 13);
    doc.text('Ponto de Coleta', margin + 30, yPos + 13);
    doc.text('Parâmetro', margin + 80, yPos + 13);
    doc.text('Valor', margin + 120, yPos + 13);
    doc.text('Nível de Risco', margin + 150, yPos + 13);
    
    // Add first few non-compliant values
    let tableY = yPos + 18;
    const allNonCompliantValues: Array<{
      date: string;
      pointName: string;
      parameter: string;
      value: string;
      riskLevel: string;
    }> = [];
    
    Object.entries(realAnalysis.parameterStats).forEach(([key, stats]) => {
      const parameterName = key === 'ph' ? 'pH' : key === 'chlorine' ? 'Cloro' : 'Turbidez';
      const unit = key === 'ph' ? '' : key === 'chlorine' ? 'mg/L' : 'NTU';
      
      stats.nonCompliantValues.forEach(nc => {
        allNonCompliantValues.push({
          date: format(nc.timestamp, 'dd/MM/yyyy'),
          pointName: nc.pointName,
          parameter: parameterName,
          value: `${nc.value.toFixed(2)}${unit ? ` ${unit}` : ''}`,
          riskLevel: nc.riskLevel
        });
      });
    });
    
    // Show first 3 non-compliant values
    allNonCompliantValues.slice(0, 3).forEach((nc, index) => {
      doc.setFillColor(index % 2 === 0 ? 255 : 254, 250, 250); // Alternating red backgrounds
      doc.rect(margin, tableY, contentWidth, 6, 'F');
      
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.text(nc.date, margin + 5, tableY + 4);
      doc.text(nc.pointName.substring(0, 15), margin + 30, tableY + 4);
      doc.text(nc.parameter, margin + 80, tableY + 4);
      doc.text(nc.value, margin + 120, tableY + 4);
      
      // Risk level with color
      const riskColor = nc.riskLevel === 'alto' ? [220, 38, 38] : 
                       nc.riskLevel === 'médio' ? [234, 88, 12] : [202, 138, 4];
      doc.setTextColor(riskColor[0], riskColor[1], riskColor[2]);
      doc.setFont('helvetica', 'bold');
      doc.text(nc.riskLevel.toUpperCase(), margin + 150, tableY + 4);
      
      tableY += 6;
    });
    
    yPos += 50;
  } else {
    // Compliance success section
    doc.setFillColor(240, 253, 244); // Green-50
    doc.rect(margin, yPos, contentWidth, 15, 'F');
    doc.setDrawColor(34, 197, 94); // Green-500
    doc.rect(margin, yPos, contentWidth, 15);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(34, 197, 94); // Green-500
    doc.text('✓ Usando dados reais da análise de conformidade', margin + 10, yPos + 9);
    
    yPos += 25;
  }
  
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
  // Page Header
  intl?: IntlShape
) {
  let yPos = margin;
  
  // Page Header with exact styling
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Gráficos de Monitoramento', margin, yPos + 8);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(107, 114, 128);
  doc.text('Análise temporal dos parâmetros de qualidade da água', margin, yPos + 16);
  
  yPos += 30;
  doc.setTextColor(0, 0, 0);
  
  // Charts Grid - 3 columns, 2 rows for landscape
  const chartSpacing = 8;
  const chartWidth = (contentWidth - (2 * chartSpacing)) / 3;
  const chartHeight = 75;
  
  pageCharts.forEach((point, index) => {
    const col = index % 3;
    const row = Math.floor(index / 3);
    const x = margin + (col * (chartWidth + chartSpacing));
    const y = yPos + (row * (chartHeight + chartSpacing));
    
    // Chart container with gray background
    doc.setFillColor(249, 250, 251); // Gray-50
    doc.rect(x, y, chartWidth, chartHeight, 'F');
    doc.setDrawColor(229, 231, 235); // Gray-200
    doc.rect(x, y, chartWidth, chartHeight);
    
    // Chart title
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(point.name, x + chartWidth/2, y + 8, { align: 'center' });
    
    // Chart area
    doc.setFillColor(255, 255, 255);
    doc.rect(x + 3, y + 12, chartWidth - 6, 40, 'F');
    doc.setDrawColor(229, 231, 235);
    doc.rect(x + 3, y + 12, chartWidth - 6, 40);
    
    // Try to insert chart image if available
    const chartImage = chartImages?.get(point.id);
    if (chartImage) {
      try {
        console.log(`Adding chart image for point: ${point.name} (ID: ${point.id})`);
        
        // Calculate image dimensions to fit within the chart area  
        const imageX = x + 5;
        const imageY = y + 14;
        const imageWidth = chartWidth - 10;
        const imageHeight = 36;
        
        // Remove data:image/png;base64, prefix if present
        const cleanBase64 = chartImage.replace(/^data:image\/[a-z]+;base64,/, '');
        
        doc.addImage(cleanBase64, 'PNG', imageX, imageY, imageWidth, imageHeight, undefined, 'FAST');
        console.log(`Successfully added chart image for point: ${point.name}`);
      } catch (error) {
        console.error(`Error adding chart image for point ${point.name}:`, error);
        
        // Fallback: show placeholder text
        doc.setTextColor(107, 114, 128);
        doc.setFontSize(8);
        doc.text('Gráfico não disponível', x + chartWidth/2, y + 30, { align: 'center' });
        doc.text('(erro ao carregar)', x + chartWidth/2, y + 37, { align: 'center' });
      }
    } else {
      console.log(`No chart image available for point: ${point.name} (ID: ${point.id})`);
      
      // Fallback: show placeholder with measurement info
      doc.setTextColor(107, 114, 128); // Gray-500
      doc.setFontSize(8);
      doc.text('Gráfico de Medições', x + chartWidth/2, y + 28, { align: 'center' });
      
      // Show measurement types
      const measurementTypes = point.datasetStats
        .filter(stat => !stat.hidden)
        .map(stat => stat.label)
        .slice(0, 2) // Limit to first 2 to fit
        .join(', ');
      if (measurementTypes) {
        doc.text(measurementTypes, x + chartWidth/2, y + 35, { align: 'center' });
      }
    }
    
    // Stats summary below chart
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(7);
    const visibleStats = point.datasetStats.filter(stat => !stat.hidden).slice(0, 4);
    visibleStats.forEach((stat, statIndex) => {
      const statX = x + 3 + (statIndex % 2) * (chartWidth/2 - 3);
      const statY = y + 55 + Math.floor(statIndex / 2) * 8;
      
      // Small box for each stat
      doc.setFillColor(255, 255, 255);
      doc.rect(statX, statY - 2, chartWidth/2 - 8, 6, 'F');
      doc.setDrawColor(229, 231, 235);
      doc.rect(statX, statY - 2, chartWidth/2 - 8, 6);
      
      // Stat text
      doc.setFont('helvetica', 'bold');
      doc.text(stat.label.substring(0, 8), statX + 1, statY + 1); // Truncate long labels
      doc.setFont('helvetica', 'normal');
      const value = stat.total !== undefined ? stat.total.toString() : stat.avg.toString();
      doc.text(value, statX + 1, statY + 4);
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