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
  bairro?: string;
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
      {
        ...clientInfo,
        cnpj: clientInfo.cnpj || '16.716.417/0001-95',
        address: clientInfo.address || 'Endereço não informado',
        city: clientInfo.city || 'Bela Vista de Minas (MG)',
        state: clientInfo.state || 'SP',
        phone: clientInfo.phone || '+55 (11) 1234-5678',
        email: clientInfo.email || 'contato@cliente.com.br',
        contact: clientInfo.contact || ''
      }, 
      reportPeriod, 
      validCollectionPoints, 
      reportData, 
      margin, 
      contentWidth, 
      pageHeight, 
      pageWidth,
      realAnalysis
    );
    
    // Skip chart pages - go directly to table page
    
    // Table Page - Use the same data as the A4 preview  
    if (reportData && reportData.datas.length > 0) {
      doc.addPage();
      currentPage++;
      
      generateTablePage(
        doc, 
        reportData, 
        validCollectionPoints, 
        currentPage,
        2, // Total pages (only 2 pages now)
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
  doc.rect(margin, yPos, contentWidth, 35, 'F');
  
  // Title - larger and positioned to match preview exactly
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('Relatório de Qualidade da Água', margin + 8, yPos + 15);
  
  // Period - positioned below title exactly as in preview
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Período: ${format(reportPeriod.start, 'dd/MM/yyyy')} - ${format(reportPeriod.end, 'dd/MM/yyyy')}`,
    margin + 8,
    yPos + 25
  );
  
  // Report number - positioned at top right exactly as in preview
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(`WQR-${format(new Date(), 'yyyyMMdd')}`, pageWidth - margin - 50, yPos + 20);
  
  yPos += 45;
  doc.setTextColor(0, 0, 0);
  
  // Client Information Section - exact positioning as preview
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Informações do Cliente', margin, yPos);
  yPos += 15;
  
  // Client info in 4 columns with exact spacing as preview
  const colWidth = contentWidth / 4;
  
  // Column 1: Company Data - exact styling as preview
  doc.setFillColor(249, 250, 251); // bg-gray-50
  doc.rect(margin, yPos, colWidth - 5, 35, 'F');
  doc.setDrawColor(229, 231, 235); // border-gray-200
  doc.rect(margin, yPos, colWidth - 5, 35);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Dados da Empresa', margin + 5, yPos + 10);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`CNPJ: ${clientInfo.cnpj}`, margin + 5, yPos + 18);
  
  // Column 2: Address - exact styling as preview
  doc.setFillColor(249, 250, 251);
  doc.rect(margin + colWidth, yPos, colWidth - 5, 35, 'F');
  doc.setDrawColor(229, 231, 235);
  doc.rect(margin + colWidth, yPos, colWidth - 5, 35);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Endereço', margin + colWidth + 5, yPos + 10);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  // Split long address into multiple lines
  const addressLines = doc.splitTextToSize(clientInfo.address, colWidth - 12);
  let addressY = yPos + 18;
  addressLines.slice(0, 2).forEach((line: string) => {
    doc.text(line, margin + colWidth + 5, addressY);
    addressY += 6;
  });
  doc.text(`${clientInfo.city} - ${clientInfo.state}`, margin + colWidth + 5, addressY);
  
  // Column 3: Contact - exact styling as preview  
  doc.setFillColor(249, 250, 251);
  doc.rect(margin + colWidth * 2, yPos, colWidth - 5, 35, 'F');
  doc.setDrawColor(229, 231, 235);
  doc.rect(margin + colWidth * 2, yPos, colWidth - 5, 35);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Contato', margin + colWidth * 2 + 5, yPos + 10);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(clientInfo.phone, margin + colWidth * 2 + 5, yPos + 18);
  doc.text(clientInfo.email, margin + colWidth * 2 + 5, yPos + 24);
  
  // Column 4: Report Period with blue styling - exact styling as preview
  doc.setFillColor(239, 246, 255); // bg-blue-50
  doc.rect(margin + colWidth * 3, yPos, colWidth - 5, 35, 'F');
  doc.setDrawColor(147, 197, 253); // border-blue-300
  doc.rect(margin + colWidth * 3, yPos, colWidth - 5, 35);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 64, 175); // text-blue-800
  doc.text('Período do Relatório', margin + colWidth * 3 + 5, yPos + 10);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Início: ${format(reportPeriod.start, 'dd/MM/yyyy')}`, margin + colWidth * 3 + 5, yPos + 18);
  doc.text(`Fim: ${format(reportPeriod.end, 'dd/MM/yyyy')}`, margin + colWidth * 3 + 5, yPos + 24);
  doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, margin + colWidth * 3 + 5, yPos + 30);
  
  yPos += 50;
  doc.setTextColor(0, 0, 0);
  
  // Executive Summary with exact blue gradient styling - matching preview
  doc.setFillColor(37, 99, 235); // Darker blue for better contrast
  doc.rect(margin, yPos, contentWidth, 40, 'F');
  
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('Resumo Executivo', margin + 10, yPos + 15);
  
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
  const statColWidth = (contentWidth - 60) / 4;
  const stats = [
    { label: 'Pontos de Coleta', value: realStats.totalCollectionPoints.toString() },
    { label: 'Dias com Medições', value: realStats.totalMeasurementDays.toString() },
    { label: 'Parâmetros', value: realStats.totalParameters.toString() },
    { label: 'Taxa Conformidade', value: `${realStats.complianceRate.toFixed(1)}%` }
  ];
  
  stats.forEach((stat, index) => {
    const x = margin + 30 + (index * (statColWidth + 10));
    doc.setFillColor(255, 255, 255); // bg-white
    doc.rect(x, yPos + 20, statColWidth, 20, 'F');
    doc.setDrawColor(229, 231, 235);
    doc.rect(x, yPos + 20, statColWidth, 20);
    
    // Large number - exact styling as preview
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(59, 130, 246); // text-blue-600
    doc.text(stat.value, x + statColWidth/2, yPos + 28, { align: 'center' });
    
    // Label below - exact styling as preview
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(75, 85, 99); // text-gray-600
    doc.text(stat.label, x + statColWidth/2, yPos + 35, { align: 'center' });
  });
  
  yPos += 55;
  doc.setTextColor(0, 0, 0);
  
  // Non-conformities section - exact match to preview
  if (realAnalysis) {
    doc.setFillColor(254, 242, 242); // bg-red-50
    doc.rect(margin, yPos, contentWidth, 50, 'F');
    doc.setDrawColor(252, 165, 165); // border-red-200
    doc.rect(margin, yPos, contentWidth, 50);
    
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(153, 27, 27); // text-red-900
    doc.text('Ocorrências de Não Conformidades', margin + 8, yPos + 12);
    
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
      doc.rect(margin + 10, yPos + 20, contentWidth - 20, 20, 'F');
      doc.setDrawColor(34, 197, 94); // border-green-200
      doc.rect(margin + 10, yPos + 20, contentWidth - 20, 20);
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(21, 128, 61); // text-green-800
      doc.text('✓ Nenhuma não conformidade detectada no período', margin + contentWidth/2, yPos + 32, { align: 'center' });
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
        startY: yPos + 20,
        head: [['Data', 'Ponto de Coleta', 'Parâmetro', 'Valor', 'Nível de Risco']],
        body: tableData,
        headStyles: { 
          fillColor: [254, 202, 202], // bg-red-100
          textColor: [153, 27, 27], // text-red-800
          fontStyle: 'bold',
          fontSize: 9,
          halign: 'center'
        },
        bodyStyles: { 
          fontSize: 8,
          halign: 'center',
          alternateRowStyles: { fillColor: [254, 242, 242] } // bg-red-25
        },
        columnStyles: {
          0: { cellWidth: 30, fontStyle: 'bold' },
          1: { cellWidth: 50 },
          2: { cellWidth: 35, fontStyle: 'bold' },
          3: { cellWidth: 30, textColor: [185, 28, 28] }, // text-red-700
          4: { cellWidth: 35, textColor: [185, 28, 28], fontStyle: 'bold' }
        },
        margin: { left: margin + 10, right: margin + 10 },
        tableWidth: contentWidth - 20,
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
        doc.rect(margin + 10, tableEndY, contentWidth - 20, 10, 'F');
        doc.setFontSize(9);
        doc.setTextColor(185, 28, 28); // text-red-700
        doc.text(
          `Mostrando 10 de ${allNonCompliantValues.length} não conformidades`,
          margin + contentWidth/2,
          tableEndY + 7,
          { align: 'center' }
        );
        yPos = tableEndY + 20;
      } else {
        yPos = (doc as any).lastAutoTable.finalY + 10;
      }
    }
    
    yPos += 10; // Add extra spacing after non-conformities section
  }
  
  // Real data summary if available - exact styling as preview
  if (realAnalysis) {
    doc.setFillColor(240, 253, 244); // bg-green-50
    doc.rect(margin, yPos, contentWidth, 25, 'F');
    doc.setDrawColor(34, 197, 94); // border-green-200
    doc.rect(margin, yPos, contentWidth, 25);
    
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(21, 128, 61); // text-green-900
    doc.text('Dados Reais Carregados', margin + 8, yPos + 12);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(22, 101, 52); // text-green-800
    doc.text(`Total de Amostras: ${realAnalysis.totalSamples}`, margin + 8, yPos + 18);
    doc.text(`Taxa de Conformidade: ${realAnalysis.complianceRate.toFixed(1)}%`, margin + 100, yPos + 18);
    doc.text(`Parâmetros Monitorados: ${realStats.totalParameters}`, margin + 200, yPos + 18);
    
    yPos += 35;
  }
  
  // Data source indicator - exact styling as preview
  doc.setFillColor(249, 250, 251); // bg-gray-50
  doc.rect(margin, yPos, contentWidth, 15, 'F');
  doc.setDrawColor(229, 231, 235); // border-gray-200
  doc.rect(margin, yPos, contentWidth, 15);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  if (realAnalysis) {
    doc.setTextColor(22, 163, 74); // text-green-600
    doc.text('✓ Usando dados reais da análise de conformidade', margin + contentWidth/2, yPos + 10, { align: 'center' });
  } else {
    doc.setTextColor(234, 88, 12); // text-orange-600
    doc.text('⚠ Usando dados estimados (carregando dados reais...)', margin + contentWidth/2, yPos + 10, { align: 'center' });
  }
  
  yPos += 25;
  doc.setTextColor(0, 0, 0);
  
  // Footer - exact positioning as preview
  yPos = pageHeight - 15;
  doc.setFontSize(10);
  // Footer - exact positioning from preview
  yPos = pageHeight - 12;
  doc.setFontSize(9);
  doc.setTextColor(107, 114, 128); // text-gray-500 (#6B7280)
  doc.text('Este relatório foi gerado automaticamente pelo Sistema de Monitoramento ACQUASALLES', margin, yPos);
  doc.text(`Página 1 de 2 | Formato Paisagem (297mm x 210mm)`, margin, yPos + 5);
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
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Gráficos de Monitoramento', margin, yPos + 12);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(107, 114, 128); // text-gray-600
  doc.text('Análise temporal dos parâmetros de qualidade da água', margin, yPos + 22);
  
  yPos += 35;
  doc.setTextColor(0, 0, 0);
  
  // Charts Grid - 3 columns, 2 rows with exact spacing as preview
  const chartWidth = (contentWidth - 30) / 3;
  const chartHeight = 120;
  const chartSpacing = 15;
  
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
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(point.name, x + chartWidth/2, y + 10, { align: 'center' });
    
    // Chart area - white background exactly as preview
    const chartAreaX = x + 5;
    const chartAreaY = y + 15;
    const chartAreaWidth = chartWidth - 10;
    const chartAreaHeight = 70;
    
    doc.setFillColor(255, 255, 255);
    doc.rect(chartAreaX, chartAreaY, chartAreaWidth, chartAreaHeight, 'F');
    doc.setDrawColor(229, 231, 235);
    doc.rect(chartAreaX, chartAreaY, chartAreaWidth, chartAreaHeight);
    
    // Insert chart image if available - exact positioning as preview
    const chartImage = chartImages?.get(point.id);
    console.log(`Checking chart image for ${point.id}:`, !!chartImage, chartImage?.substring(0, 50));
    
    if (chartImage && chartImage.startsWith('data:image/')) {
      try {
        console.log(`Adding chart image for point: ${point.name}`);
        
        // Add image with precise positioning to match preview
        doc.addImage(
          chartImage, 
          'PNG', 
          chartAreaX + 2, 
          chartAreaY + 2, 
          chartAreaWidth - 4, 
          chartAreaHeight - 4
        );
        
        console.log(`Successfully added chart image for ${point.name}`);
      } catch (error) {
        console.error(`Error adding chart image for point ${point.name}:`, error);
        doc.setFillColor(252, 165, 165); // bg-red-200
        doc.rect(chartAreaX + 2, chartAreaY + 2, chartAreaWidth - 4, chartAreaHeight - 4, 'F');
        doc.setFontSize(8);
        doc.text('Gráfico Indisponível', x + chartWidth/2, y + 50, { align: 'center' });
      }
    } else {
      // Chart placeholder text - exact styling as preview
      doc.setTextColor(107, 114, 128); // text-gray-500
      doc.setFontSize(10);
      doc.text('Gráfico não disponível', x + chartWidth/2, y + 45, { align: 'center' });
      doc.setFontSize(8);
      const measurementTypes = point.datasetStats.filter(stat => !stat.hidden).map(stat => stat.label).join(', ');
      const typeLines = doc.splitTextToSize(measurementTypes, chartAreaWidth - 10);
      typeLines.slice(0, 2).forEach((line: string, lineIndex: number) => {
        doc.text(line, x + chartWidth/2, y + 55 + (lineIndex * 6), { align: 'center' });
      });
    }
    
    // Stats summary below chart - 2x2 grid exactly as preview
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8);
    const visibleStats = point.datasetStats.filter(stat => !stat.hidden).slice(0, 4);
    visibleStats.forEach((stat, statIndex) => {
      const statX = x + 5 + (statIndex % 2) * (chartWidth/2 - 5);
      const statY = y + 95 + Math.floor(statIndex / 2) * 12;
      
      // Small white box for each stat - exact styling as preview
      doc.setFillColor(255, 255, 255);
      doc.rect(statX, statY, chartWidth/2 - 10, 10, 'F');
      doc.setDrawColor(229, 231, 235);
      doc.rect(statX, statY, chartWidth/2 - 10, 10);
      
      // Stat label and value - exact styling as preview
      doc.setFont('helvetica', 'bold');
      doc.text(stat.label, statX + 3, statY + 4);
      doc.setFont('helvetica', 'normal');
      doc.text(`${stat.avg}${stat.total !== undefined ? ` (T: ${stat.total})` : ''}`, statX + 3, statY + 8);
    });
  });
  
  // Footer - exact positioning as preview
  yPos = pageHeight - 10;
  doc.setFontSize(10);
  doc.setTextColor(107, 114, 128);
  doc.text(`Página ${currentPage} de ${totalPages} | Formato Paisagem`, margin, yPos);
}

function generateTablePage(
  doc: jsPDF,
  reportData: ReportData,
  validCollectionPoints: CollectionPointData[],
  currentPage: number,
  totalPages: number,
  margin: number,
  contentWidth: number,
  pageHeight: number,
  pageWidth: number
) {
  let yPos = margin;
  
  // Page Header - exact styling as preview
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Dados de Medição', margin, yPos + 12);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(107, 114, 128); // text-gray-600
  doc.text('Registro detalhado das medições por ponto de coleta (30 registros)', margin, yPos + 22);
  
  yPos += 35;
  doc.setTextColor(0, 0, 0);
  
  // Generate table
  const tableData = generateTableDataFromReport(reportData);
  
  if (tableData && tableData.rows.length > 0) {
    // Prepare headers
    const mainHeaders = ['Data'];
    const subHeaders = [''];
    
    // Add collection point headers
    tableData.collectionPoints.forEach(point => {
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
    
    // Generate table
    (doc as any).autoTable({
      startY: yPos,
      head: [mainHeaders, subHeaders],
      body: tableRows,
      headStyles: [
        { 
          fillColor: [34, 197, 94], // Green-500 for main headers
          textColor: [255, 255, 255], 
          fontStyle: 'bold',
          fontSize: 11,
          halign: 'center'
        },
        {
          fillColor: [34, 197, 94], // Green-500 for sub headers
          textColor: [255, 255, 255],
          fontSize: 10,
          halign: 'center',
          fontStyle: 'normal'
        }
      ],
      bodyStyles: { 
        fontSize: 9,
        halign: 'center',
        cellPadding: 3,
        alternateRowStyles: { fillColor: [249, 250, 251] } // bg-gray-50
      },
      margin: { left: margin, right: margin },
      styles: {
        lineColor: [200, 200, 200],
        lineWidth: 0.5,
        overflow: 'linebreak'
      }
    });
    
    const tableEndY = (doc as any).lastAutoTable.finalY;
    doc.text('Nenhum dado de medição disponível para o período selecionado.', margin, yPos + 30);
  }
    // No data message - exact styling as preview
  // Footer - exact positioning as preview
  yPos = pageHeight - 10;
  doc.setFontSize(10);
  doc.setTextColor(107, 114, 128);
  doc.text(`Página ${currentPage} de ${totalPages} | 30 registros exibidos`, margin, yPos);
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