import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import { IntlShape } from 'react-intl';
import type { ReportData } from '../types/report';

export async function generatePDF(reportData: ReportData, intl: IntlShape): Promise<void> {
  const doc = new jsPDF();
  
  // Add title
  doc.setFontSize(20);
  doc.text(intl.formatMessage({ id: 'admin.report.title' }), 14, 20);
  doc.setFontSize(10);
  doc.text(`${intl.formatMessage({ id: 'admin.report.generatedAt' })}: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 27);
  
  // Add client information
  doc.setFontSize(11);
  doc.text(`${intl.formatMessage({ id: 'admin.report.client' })}: ${reportData.cliente}`, 14, 35);
  doc.text(`${intl.formatMessage({ id: 'admin.report.cnpj' })}: ${reportData.cnpj_cpf || '-'}`, 14, 41);
  doc.text(`${intl.formatMessage({ id: 'admin.report.address' })}: ${reportData.endereco || '-'}`, 14, 47);
  doc.text(`${intl.formatMessage({ id: 'admin.report.neighborhood' })}: ${reportData.bairro || '-'}`, 14, 53);
  doc.text(`${intl.formatMessage({ id: 'admin.report.city' })}: ${reportData.cidade || '-'}`, 14, 59);
  
  let yPos = 70;
  
  // Process each date
  for (const dateEntry of reportData.datas) {
    // Calculate total height needed for this date group
    const tableData = [];
    let photoGroups = 0;
    let tableHeight = 0;
    
    for (const area of dateEntry.area) {
      for (const ponto of area.pontos_de_coleta) {
        const measurements = ponto.medicoes
          .filter(m => !m.imageUrl)
          .map(m => `${m.tipo}: ${m.valor}`)
          .join('\n');
        
        tableData.push([
          area.nome,
          ponto.nome,
          measurements,
          ponto.medicoes.some(m => m.imageUrl) ? 'Yes' : 'No'
        ]);
        
        // Count photos for height calculation
        photoGroups += Math.ceil(ponto.medicoes.filter(m => m.imageUrl).length / 2);
      }
    }
    
    // Estimate table height based on number of rows and line height
    const lineHeight = 7; // Approximate line height in points
    const headerHeight = 10;
    tableHeight = (tableData.length * lineHeight) + headerHeight;
    
    // Estimate total height needed
    const photoHeight = photoGroups * 120; // Each row of 2 photos needs about 120 units
    const totalHeight = tableHeight + photoHeight + 30; // Add margin
    
    // If not enough space on current page, start a new one
    if (yPos + totalHeight > 270) {
      doc.addPage();
      yPos = 20;
    }
    
    // Add date header
    doc.setFontSize(10);
    doc.text(dateEntry.data, 14, yPos);
    yPos += 7;
    
    // Add table
    (doc as any).autoTable({
      startY: yPos,
      head: [[
        intl.formatMessage({ id: 'admin.report.area' }),
        intl.formatMessage({ id: 'admin.report.point' }),
        intl.formatMessage({ id: 'admin.report.measurements' }),
        intl.formatMessage({ id: 'admin.report.photo' })
      ]],
      body: tableData,
      headStyles: { 
        fillColor: [59, 130, 246],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      styles: { fontSize: 10 },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 40 },
        2: { cellWidth: 70 },
        3: { cellWidth: 20 }
      },
      theme: 'grid'
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 15;
    
    // Process photos
    for (const area of dateEntry.area) {
      for (const ponto of area.pontos_de_coleta) {
        try {
          const photosToProcess = ponto.medicoes.filter(m => m.imageUrl);
          if (photosToProcess.length === 0) continue;

          // Add photo information
          doc.setFontSize(10);
          doc.text(
            intl.formatMessage(
              { id: 'admin.report.photoFrom' },
              { area: area.nome, point: ponto.nome }
            ),
            14,
            yPos
          );
          yPos += 7;
          
          // Load all photos for this point
          const photos = await Promise.all(
            photosToProcess.map(async (photo) => {
              if (!photo.imageUrl) return null;
              
              const img = new Image();
              img.crossOrigin = 'Anonymous';
              img.referrerPolicy = 'no-referrer';
              
              try {
                await new Promise((resolve, reject) => {
                  img.onload = resolve;
                  img.onerror = reject;
                  img.src = photo.imageUrl!;
                });
                
                if (!img.complete || img.naturalWidth === 0) {
                  return null;
                }
                
                return img;
              } catch (error) {
                console.error('Error loading image:', error);
                return null;
              }
            })
          );
          
          // Filter out failed loads
          const validPhotos = photos.filter(Boolean);

          if (validPhotos.length === 0) {
            doc.setTextColor(128, 128, 128);
            doc.text(intl.formatMessage({ id: 'imageModal.notAvailable' }), 14, yPos);
            doc.setTextColor(0, 0, 0);
            yPos += 10;
            continue;
          }
          
          // Calculate dimensions for images (40% of page width)
          const pageWidth = doc.internal.pageSize.getWidth();
          const maxImgWidth = pageWidth * 0.4;
          const leftMargin = 14;
          const gutter = 10;
          
          // Process images in pairs
          for (let i = 0; i < validPhotos.length; i += 2) {
            const img1 = validPhotos[i];
            const img2 = validPhotos[i + 1];

            if (!img1) continue;
            
            // Calculate heights maintaining aspect ratio
            const getScaledDimensions = (img: HTMLImageElement) => {
              const ratio = img.height / img.width;
              const width = maxImgWidth;
              const height = width * ratio;
              return {
                width: Math.min(width, pageWidth * 0.4),
                height: Math.min(height, 120)
              };
            };
            
            const dim1 = getScaledDimensions(img1);
            const dim2 = img2 ? getScaledDimensions(img2) : null;
            
            let rowHeight = Math.max(
              dim1.height,
              dim2 ? dim2.height : 0
            );
            rowHeight = Math.min(rowHeight, 120); // Cap row height
            
            // Check if we need a new page
            if (yPos + rowHeight > 270) {
              doc.addPage();
              yPos = 20;
            }
            
            // Add first image
            doc.addImage(
              img1,
              'PNG',
              leftMargin,
              yPos,
              dim1.width,
              dim1.height,
              undefined,
              'FAST'
            );
            
            // Add second image if exists
            if (img2) {
              doc.addImage(
                img2,
                'PNG',
                leftMargin + maxImgWidth + gutter,
                yPos,
                dim2.width,
                dim2.height,
                undefined,
                'FAST'
              );
            }
          
            yPos += Math.min(rowHeight + 15, 135); // Cap the spacing between rows
          }
        } catch (error) {
          console.error('Error processing image:', error);
          doc.setTextColor(128, 128, 128);
          doc.text(intl.formatMessage({ id: 'imageModal.notAvailable' }), 14, yPos);
          doc.setTextColor(0, 0, 0);
          yPos += 10;
        }
      }
    }
  }
  
  // Save the PDF
  doc.save(`report_${reportData.cliente.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`);
}