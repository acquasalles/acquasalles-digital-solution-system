import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import { IntlShape } from 'react-intl';
import type { ReportData } from '../types/report';
import { fetchWaterQualityData, generateComplianceAnalysis } from './waterQualityCompliance';
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
  validCollectionPoints: CollectionPointData[],
  clientInfo: ClientInfo,
  reportPeriod: { start: Date; end: Date },
  intl: IntlShape,
  chartImages?: Map<string, string>,
  clientId?: string,
  startDateStr?: string,
  endDateStr?: string
): Promise<void> {
  try {
    console.log('Starting A4 PDF generation...');
    console.log('Chart images available:', chartImages?.size || 0);
    
    // Load real analysis data if parameters are provided
    let realAnalysis: ComplianceAnalysis | null = null;
    if (clientId && startDateStr && endDateStr) {
      try {
        console.log('Loading real analysis data for PDF...');
        const waterQualityData = await fetchWaterQualityData(clientId, startDateStr, endDateStr);
        realAnalysis = generateComplianceAnalysis(waterQualityData);
        console.log('Real analysis loaded for PDF:', {
          totalSamples: realAnalysis.totalSamples,
          complianceRate: realAnalysis.complianceRate
        });
      } catch (error) {
        console.error('Error loading real analysis for PDF:', error);
        // Continue without real analysis
      }
    }

    // Create PDF in landscape mode (A4)
    const doc = new jsPDF('landscape', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 10;
    const contentWidth = pageWidth - (margin * 2);
    
    let currentPage = 1;
    
    // Page 1: Client Information and Summary
    generateClientInfoPage(
      doc, 
      clientInfo, 
      reportPeriod, 
      validCollectionPoints, 
      reportData, 
      margin, 
      contentWidth, 
      pageHeight, 
      pageWidth,
      realAnalysis
    );
    
    // Chart Pages - 6 charts per page (3x2 grid)
    const chartsPerPage = 6;
    
    if (validCollectionPoints.length > 0) {
      const totalChartPages = Math.ceil(validCollectionPoints.length / chartsPerPage);
      
      for (let pageIndex = 0; pageIndex < totalChartPages; pageIndex++) {
        doc.addPage();
        currentPage++;
        
        const startIndex = pageIndex * chartsPerPage;
        const pageCharts = validCollectionPoints.slice(startIndex, startIndex + chartsPerPage);
        
        generateChartsPage(
          doc, 
          pageCharts, 
          currentPage, 
          totalChartPages + 2, 
          margin, 
          contentWidth, 
          pageHeight, 
          pageWidth, 
          chartImages
        );
      }
    }
    
    // Table Page - Use the same data as the A4 preview
    if (reportData && reportData.datas.length > 0) {
      doc.addPage();
      currentPage++;
      
      generateTablePage(
        doc, 
        reportData, 
        validCollectionPoints, 
        currentPage, 
        margin, 
        contentWidth, 
        pageHeight, 
        pageWidth
      );
    }
    
    // Save the PDF
    const fileName = `A4_Report_${clientInfo.name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`;
    doc.save(fileName);
    console.log('A4 PDF generation completed successfully');
  } catch (error) {
    console.error('Error in generateA4PDF:', error);
    throw new Error(`Failed to generate A4 PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function generateClientInfoPage(
  doc: jsPDF,
  clientInfo: ClientInfo,
  reportPeriod: { start: Date; end: Date },
  validCollectionPoints: CollectionPointData[],
  reportData: ReportData,
  margin: number,
  contentWidth: number,
  pageHeight: number,
  pageWidth: number,
  realAnalysis: ComplianceAnalysis | null
) {
  let yPos = margin;
  
  // Header with blue background - exact match to preview
  doc.setFillColor(59, 130, 246); // Blue-600 bg-blue-600
  doc.rect(margin, yPos, contentWidth, 25, 'F');
  
  // Title - positioned to match preview exactly
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Relatório de Qualidade da Água', margin + 5, yPos + 10);
  
  // Period - positioned below title exactly as in preview
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Período: ${format(reportPeriod.start, 'dd/MM/yyyy')} - ${format(reportPeriod.end, 'dd/MM/yyyy')}`,
    margin + 5,
    yPos + 18
  );
  
  // Report number - positioned at top right exactly as in preview
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(`WQR-${format(new Date(), 'yyyyMMdd')}`, pageWidth - margin - 40, yPos + 15);
  
  yPos += 35;
  doc.setTextColor(0, 0, 0);
  
  // Client Information Section - exact positioning as preview
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Informações do Cliente', margin, yPos);
  yPos += 12;
  
  // Client info in 4 columns with exact spacing as preview
  const colWidth = contentWidth / 4;
  
  // Column 1: Company Data - exact styling as preview
  doc.setFillColor(249, 250, 251); // bg-gray-50
  doc.rect(margin, yPos, colWidth - 2, 30, 'F');
  doc.setDrawColor(229, 231, 235); // border-gray-200
  doc.rect(margin, yPos, colWidth - 2, 30);
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Dados da Empresa', margin + 3, yPos + 8);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`CNPJ: ${clientInfo.cnpj}`, margin + 3, yPos + 15);
  
  // Column 2: Address - exact styling as preview
  doc.setFillColor(249, 250, 251);
  doc.rect(margin + colWidth, yPos, colWidth - 2, 30, 'F');
  doc.setDrawColor(229, 231, 235);
  doc.rect(margin + colWidth, yPos, colWidth - 2, 30);
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Endereço', margin + colWidth + 3, yPos + 8);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  // Split long address into multiple lines
  const addressLines = doc.splitTextToSize(clientInfo.address, colWidth - 8);
  let addressY = yPos + 15;
  addressLines.slice(0, 2).forEach((line: string) => {
    doc.text(line, margin + colWidth + 3, addressY);
    addressY += 5;
  });
  doc.text(`${clientInfo.city} - ${clientInfo.state}`, margin + colWidth + 3, addressY);
  
  // Column 3: Contact - exact styling as preview  
  doc.setFillColor(249, 250, 251);
  doc.rect(margin + colWidth * 2, yPos, colWidth - 2, 30, 'F');
  doc.setDrawColor(229, 231, 235);
  doc.rect(margin + colWidth * 2, yPos, colWidth - 2, 30);
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Contato', margin + colWidth * 2 + 3, yPos + 8);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(clientInfo.phone, margin + colWidth * 2 + 3, yPos + 15);
  doc.text(clientInfo.email, margin + colWidth * 2 + 3, yPos + 20);
  
  // Column 4: Report Period with blue styling - exact styling as preview
  doc.setFillColor(239, 246, 255); // bg-blue-50
  doc.rect(margin + colWidth * 3, yPos, colWidth - 2, 30, 'F');
  doc.setDrawColor(59, 130, 246); // border-blue-500
  doc.rect(margin + colWidth * 3, yPos, colWidth - 2, 30);
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 64, 175); // text-blue-800
  doc.text('Período do Relatório', margin + colWidth * 3 + 3, yPos + 8);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Início: ${format(reportPeriod.start, 'dd/MM/yyyy')}`, margin + colWidth * 3 + 3, yPos + 15);
  doc.text(`Fim: ${format(reportPeriod.end, 'dd/MM/yyyy')}`, margin + colWidth * 3 + 3, yPos + 20);
  doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, margin + colWidth * 3 + 3, yPos + 25);
  
  yPos += 40;
  doc.setTextColor(0, 0, 0);
  
  // Executive Summary with exact blue gradient styling - matching preview
  doc.setFillColor(59, 130, 246); // bg-blue-600 gradient start
  doc.rect(margin, yPos, contentWidth, 35, 'F');
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('Resumo Executivo', margin + 8, yPos + 10);
  
  // Calculate real statistics from analysis exactly as in preview
  const realStats = realAnalysis ? (() => {
    const totalParameters = Object.values(realAnalysis.parameterStats).reduce((sum, stat) => 
      sum + (stat.totalMeasurements > 0 ? 1 : 0), 0
    );
    
    const criticalAlerts = Object.values(realAnalysis.parameterStats).reduce((sum, stat) => 
      sum + stat.nonCompliantValues.filter(nc => nc.riskLevel === 'alto').length, 0
    );
    
    const warnings = Object.values(realAnalysis.parameterStats).reduce((sum, stat) => 
      sum + stat.nonCompliantValues.filter(nc => nc.riskLevel === 'médio').length, 0
    );

    const estimatedPoints = Math.max(1, Math.ceil(realAnalysis.totalSamples / 15));
    const estimatedDays = Math.max(1, Math.ceil(realAnalysis.totalSamples / estimatedPoints));

    return {
      totalCollectionPoints: estimatedPoints,
      totalMeasurementDays: estimatedDays,
      totalParameters,
      daysAnalyzed: Math.round((reportPeriod.end.getTime() - reportPeriod.start.getTime()) / (1000 * 60 * 60 * 24)),
      criticalAlerts,
      warnings,
      totalSamples: realAnalysis.totalSamples,
      complianceRate: realAnalysis.complianceRate
    };
  })() : {
    totalCollectionPoints: validCollectionPoints.length,
    totalMeasurementDays: reportData?.datas.length || 0,
    totalParameters: validCollectionPoints.reduce((acc, point) => 
      acc + point.datasetStats.filter(stat => !stat.hidden).length, 0
    ),
    daysAnalyzed: Math.round((reportPeriod.end.getTime() - reportPeriod.start.getTime()) / (1000 * 60 * 60 * 24)),
    criticalAlerts: 0,
    warnings: 0,
    complianceRate: 0
  };
  
  // Summary stats in 4 columns - exact positioning as preview
  const statColWidth = (contentWidth - 40) / 4;
  const stats = [
    { label: 'Pontos de Coleta', value: realStats.totalCollectionPoints.toString() },
    { label: 'Dias com Medições', value: realStats.totalMeasurementDays.toString() },
    { label: 'Parâmetros', value: realStats.totalParameters.toString() },
    { label: 'Taxa Conformidade', value: `${realStats.complianceRate.toFixed(1)}%` }
  ];
  
  stats.forEach((stat, index) => {
    const x = margin + 20 + (index * statColWidth);
    doc.setFillColor(255, 255, 255); // bg-white
    doc.rect(x, yPos + 15, statColWidth - 5, 18, 'F');
    doc.setDrawColor(229, 231, 235);
    doc.rect(x, yPos + 15, statColWidth - 5, 18);
    
    // Large number - exact styling as preview
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(59, 130, 246); // text-blue-600
    doc.text(stat.value, x + (statColWidth - 5)/2, yPos + 23, { align: 'center' });
    
    // Label below - exact styling as preview
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(75, 85, 99); // text-gray-600
    doc.text(stat.label, x + (statColWidth - 5)/2, yPos + 29, { align: 'center' });
  });
  
  yPos += 45;
  doc.setTextColor(0, 0, 0);
  
  // Non-conformities section - exact match to preview
  if (realAnalysis) {
    doc.setFillColor(254, 242, 242); // bg-red-50
    doc.rect(margin, yPos, contentWidth, 35, 'F');
    doc.setDrawColor(252, 165, 165); // border-red-200
    doc.rect(margin, yPos, contentWidth, 35);
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(153, 27, 27); // text-red-900
    doc.text('Ocorrências de Não Conformidades', margin + 5, yPos + 8);
    
    // Collect all non-compliant values exactly as in preview
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
    
    // Sort by date (most recent first) exactly as in preview
    allNonCompliantValues.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    if (allNonCompliantValues.length === 0) {
      // Green success message - exact styling as preview
      doc.setFillColor(240, 253, 244); // bg-green-50
      doc.rect(margin + 5, yPos + 12, contentWidth - 10, 15, 'F');
      doc.setDrawColor(34, 197, 94); // border-green-200
      doc.rect(margin + 5, yPos + 12, contentWidth - 10, 15);
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(21, 128, 61); // text-green-800
      doc.text('✓ Nenhuma não conformidade detectada no período', margin + contentWidth/2, yPos + 20, { align: 'center' });
    } else {
      // Non-compliance table - exact styling as preview
      const tableData = allNonCompliantValues.slice(0, 10).map(nc => [
        nc.date,
        nc.pointName,
        nc.parameter,
        nc.value,
        nc.riskLevel.toUpperCase()
      ]);
      
      (doc as any).autoTable({
        startY: yPos + 12,
        head: [['Data', 'Ponto de Coleta', 'Parâmetro', 'Valor', 'Nível de Risco']],
        body: tableData,
        headStyles: { 
          fillColor: [254, 202, 202], // bg-red-100
          textColor: [153, 27, 27], // text-red-800
          fontStyle: 'bold',
          fontSize: 8,
          halign: 'center'
        },
        bodyStyles: { 
          fontSize: 7,
          halign: 'center',
          alternateRowStyles: { fillColor: [254, 242, 242] } // bg-red-25
        },
        columnStyles: {
          0: { cellWidth: 25, fontStyle: 'bold' },
          1: { cellWidth: 40 },
          2: { cellWidth: 30, fontStyle: 'bold' },
          3: { cellWidth: 25, textColor: [185, 28, 28] }, // text-red-700
          4: { cellWidth: 25, textColor: [185, 28, 28], fontStyle: 'bold' }
        },
        margin: { left: margin + 5, right: margin + 5 },
        tableWidth: contentWidth - 10,
        theme: 'grid',
        styles: {
          lineColor: [252, 165, 165], // border-red-100
          lineWidth: 0.1
        }
      });
      
      // Show count message if more than 10 - exact styling as preview
      if (allNonCompliantValues.length > 10) {
        const tableEndY = (doc as any).lastAutoTable.finalY;
        doc.setFillColor(254, 202, 202); // bg-red-100
        doc.rect(margin + 5, tableEndY, contentWidth - 10, 8, 'F');
        doc.setFontSize(8);
        doc.setTextColor(185, 28, 28); // text-red-700
        doc.text(
          `Mostrando 10 de ${allNonCompliantValues.length} não conformidades`,
          margin + contentWidth/2,
          tableEndY + 5,
          { align: 'center' }
        );
        yPos = tableEndY + 15;
      } else {
        yPos = (doc as any).lastAutoTable.finalY + 8;
      }
    }
  }
  
  // Real data summary if available - exact styling as preview
  if (realAnalysis) {
    doc.setFillColor(240, 253, 244); // bg-green-50
    doc.rect(margin, yPos, contentWidth, 20, 'F');
    doc.setDrawColor(34, 197, 94); // border-green-200
    doc.rect(margin, yPos, contentWidth, 20);
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(21, 128, 61); // text-green-900
    doc.text('Dados Reais Carregados', margin + 5, yPos + 8);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(22, 101, 52); // text-green-800
    doc.text(`Total de Amostras: ${realAnalysis.totalSamples}`, margin + 5, yPos + 15);
    doc.text(`Taxa de Conformidade: ${realAnalysis.complianceRate.toFixed(1)}%`, margin + 80, yPos + 15);
    doc.text(`Parâmetros Monitorados: ${realStats.totalParameters}`, margin + 160, yPos + 15);
    
    yPos += 25;
  }
  
  // Data source indicator - exact styling as preview
  doc.setFillColor(249, 250, 251); // bg-gray-50
  doc.rect(margin, yPos, contentWidth, 12, 'F');
  doc.setDrawColor(229, 231, 235); // border-gray-200
  doc.rect(margin, yPos, contentWidth, 12);
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  if (realAnalysis) {
    doc.setTextColor(22, 163, 74); // text-green-600
    doc.text('✓ Usando dados reais da análise de conformidade', margin + contentWidth/2, yPos + 7, { align: 'center' });
  } else {
    doc.setTextColor(234, 88, 12); // text-orange-600
    doc.text('⚠ Usando dados estimados (carregando dados reais...)', margin + contentWidth/2, yPos + 7, { align: 'center' });
  }
  
  yPos += 20;
  doc.setTextColor(0, 0, 0);
  
  // Footer - exact positioning as preview
  yPos = pageHeight - 15;
  doc.setFontSize(9);
  doc.setTextColor(107, 114, 128); // text-gray-500
  doc.text('Este relatório foi gerado automaticamente pelo Sistema de Monitoramento ACQUASALLES', margin, yPos);
  doc.text(`Página 1 de ${Math.ceil(validCollectionPoints.length / 6) + 2} | Formato Paisagem (297mm x 210mm)`, margin, yPos + 5);
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
  
  // Page Header - exact styling as preview
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Gráficos de Monitoramento', margin, yPos + 8);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(107, 114, 128); // text-gray-600
  doc.text('Análise temporal dos parâmetros de qualidade da água', margin, yPos + 16);
  
  yPos += 25;
  doc.setTextColor(0, 0, 0);
  
  // Charts Grid - 3 columns, 2 rows with exact spacing as preview
  const chartWidth = (contentWidth - 20) / 3;
  const chartHeight = 90;
  const chartSpacing = 10;
  
  pageCharts.forEach((point, index) => {
    const col = index % 3;
    const row = Math.floor(index / 3);
    const x = margin + (col * (chartWidth + chartSpacing));
    const y = yPos + (row * (chartHeight + chartSpacing));
    
    // Chart container - exact styling as preview
    doc.setFillColor(249, 250, 251); // bg-gray-50
    doc.rect(x, y, chartWidth, chartHeight, 'F');
    doc.setDrawColor(229, 231, 235); // border-gray-200
    doc.rect(x, y, chartWidth, chartHeight);
    
    // Chart title - centered and bold exactly as preview
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(point.name, x + chartWidth/2, y + 8, { align: 'center' });
    
    // Chart area - white background exactly as preview
    const chartAreaX = x + 3;
    const chartAreaY = y + 12;
    const chartAreaWidth = chartWidth - 6;
    const chartAreaHeight = 52;
    
    doc.setFillColor(255, 255, 255);
    doc.rect(chartAreaX, chartAreaY, chartAreaWidth, chartAreaHeight, 'F');
    doc.setDrawColor(229, 231, 235);
    doc.rect(chartAreaX, chartAreaY, chartAreaWidth, chartAreaHeight);
    
    // Insert chart image if available - exact positioning as preview
    const chartImage = chartImages?.get(point.id);
    console.log(`Checking chart image for ${point.id}:`, !!chartImage);
    
    if (chartImage && chartImage.startsWith('data:image/')) {
      try {
        console.log(`Adding chart image for point: ${point.name}, size: ${chartImage.length}`);
        
        // Add image with precise positioning to match preview
        doc.addImage(
          chartImage, 
          'PNG', 
          chartAreaX + 1, 
          chartAreaY + 1, 
          chartAreaWidth - 2, 
          chartAreaHeight - 2
        );
        
        console.log(`Successfully added chart image for ${point.name}`);
      } catch (error) {
        console.error(`Error adding chart image for point ${point.name}:`, error);
        // Fallback to placeholder text
        doc.setTextColor(107, 114, 128);
        doc.setFontSize(10);
        doc.text('Gráfico Indisponível', x + chartWidth/2, y + 35, { align: 'center' });
      }
    } else {
      // Chart placeholder text - exact styling as preview
      doc.setTextColor(107, 114, 128); // text-gray-500
      doc.setFontSize(9);
      doc.text('Gráfico de Medições', x + chartWidth/2, y + 32, { align: 'center' });
      doc.setFontSize(7);
      const measurementTypes = point.datasetStats.filter(stat => !stat.hidden).map(stat => stat.label).join(', ');
      const typeLines = doc.splitTextToSize(measurementTypes, chartWidth - 12);
      typeLines.slice(0, 2).forEach((line: string, lineIndex: number) => {
        doc.text(line, x + chartWidth/2, y + 40 + (lineIndex * 4), { align: 'center' });
      });
    }
    
    // Stats summary below chart - 2x2 grid exactly as preview
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(7);
    const visibleStats = point.datasetStats.filter(stat => !stat.hidden).slice(0, 4);
    visibleStats.forEach((stat, statIndex) => {
      const statX = x + 3 + (statIndex % 2) * (chartWidth/2 - 3);
      const statY = y + 68 + Math.floor(statIndex / 2) * 10;
      
      // Small white box for each stat - exact styling as preview
      doc.setFillColor(255, 255, 255);
      doc.rect(statX, statY, chartWidth/2 - 6, 8, 'F');
      doc.setDrawColor(229, 231, 235);
      doc.rect(statX, statY, chartWidth/2 - 6, 8);
      
      // Stat label and value - exact styling as preview
      doc.setFont('helvetica', 'bold');
      doc.text(stat.label, statX + 2, statY + 3);
      doc.setFont('helvetica', 'normal');
      doc.text(`${stat.avg}${stat.total !== undefined ? ` (T: ${stat.total})` : ''}`, statX + 2, statY + 6);
    });
  });
  
  // Footer - exact positioning as preview
  yPos = pageHeight - 10;
  doc.setFontSize(9);
  doc.setTextColor(107, 114, 128);
  doc.text(`Página ${currentPage} de ${totalPages} | Formato Paisagem`, margin, yPos);
}

function generateTablePage(
  doc: jsPDF,
  reportData: ReportData,
  validCollectionPoints: CollectionPointData[],
  currentPage: number,
  margin: number,
  contentWidth: number,
  pageHeight: number,
  pageWidth: number
) {
  let yPos = margin;
  
  // Page Header - exact styling as preview
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Dados de Medição', margin, yPos + 8);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(107, 114, 128); // text-gray-600
  doc.text('Registro detalhado das medições por ponto de coleta (30 registros)', margin, yPos + 16);
  
  yPos += 25;
  doc.setTextColor(0, 0, 0);
  
  // Generate table data using the same logic as A4 preview
  const tableData = generateTableDataFromReport(reportData);
  
  if (tableData && tableData.rows.length > 0) {
    // Prepare headers with merged structure exactly as preview
    const mainHeaders = ['Data'];
    const subHeaders = [''];
    
    // Add collection point headers exactly as preview
    tableData.collectionPoints.forEach(point => {
      point.measurements.forEach(measurement => {
        mainHeaders.push(point.name);
        subHeaders.push(`${measurement.parameter}${measurement.unit ? ` (${measurement.unit})` : ''}`);
      });
    });
    
    // Prepare table rows (limit to 30 rows) exactly as preview
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
    
    // Generate table using autoTable with exact styling as preview
    (doc as any).autoTable({
      startY: yPos,
      head: [mainHeaders, subHeaders],
      body: tableRows,
      headStyles: [
        { 
          fillColor: [34, 197, 94], // bg-green-500 for main headers
          textColor: [255, 255, 255], 
          fontStyle: 'bold', 
          fontSize: 10,
          halign: 'center',
          cellPadding: 2
        },
        { 
          fillColor: [34, 197, 94], // bg-green-500 for sub headers
          textColor: [255, 255, 255], 
          fontStyle: 'normal', 
          fontSize: 10,
          halign: 'center',
          cellPadding: 1
        }
      ],
      bodyStyles: { 
        fontSize: 7, 
        cellPadding: 1,
        halign: 'center',
        alternateRowStyles: { fillColor: [249, 250, 251] } // bg-gray-50
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
    // No data message - exact styling as preview
    doc.setFontSize(12);
    doc.setTextColor(107, 114, 128);
    doc.text('Nenhum dado de medição disponível para o período selecionado.', margin, yPos + 20);
  }
  
  // Footer - exact positioning as preview
  yPos = pageHeight - 10;
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

  // First pass: collect all collection points and their measurement types - exact logic as preview
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

  // Second pass: organize data by date and point - exact logic as preview
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

  // Convert to arrays and sort - exact logic as preview
  const collectionPoints = Array.from(collectionPointsMap.values()).map(point => ({
    ...point,
    measurements: point.measurements.sort((a, b) => a.parameter.localeCompare(b.parameter))
  }));

  const rows = Array.from(rowsMap.values())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 30); // Show 30 rows for the table

  return {
    headers: ['Data', ...collectionPoints.map(cp => cp.name)],
    collectionPoints,
    rows
  };
}