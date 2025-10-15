export function extractFirstPageHTML(reportElement: HTMLDivElement | null): string {
  if (!reportElement) {
    throw new Error('Report element not found');
  }

  const firstPageElement = reportElement.querySelector('[data-page="1"]') || reportElement;

  const htmlContent = firstPageElement.innerHTML;

  const fullHTML = `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
        <style>
          body {
            margin: 0;
            padding: 0;
            background: white;
          }
          .report-container {
            width: 297mm;
            min-height: 210mm;
            padding: 10mm;
            font-size: 9px;
            line-height: 1.2;
            background: white;
          }
        </style>
      </head>
      <body>
        <div class="report-container">
          ${htmlContent}
        </div>
      </body>
    </html>
  `;

  return fullHTML;
}

export async function extractAllPagesHTML(
  reportElement: HTMLDivElement | null,
  totalPages: number,
  setCurrentPageCallback: (page: number) => Promise<void>
): Promise<string> {
  if (!reportElement) {
    throw new Error('Report element not found');
  }

  const allPagesHTML: string[] = [];

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    await setCurrentPageCallback(pageNum);

    await new Promise(resolve => setTimeout(resolve, 100));

    const pageElement = reportElement.querySelector(`[data-page="${pageNum}"]`);

    if (pageElement) {
      allPagesHTML.push(pageElement.innerHTML);
    } else {
      console.warn(`Page ${pageNum} element not found`);
    }
  }

  const fullHTML = `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
        <style>
          body {
            margin: 0;
            padding: 0;
            background: white;
          }
          .report-page {
            width: 297mm;
            min-height: 210mm;
            padding: 10mm;
            font-size: 9px;
            line-height: 1.2;
            background: white;
            page-break-after: always;
            page-break-inside: avoid;
            box-sizing: border-box;
          }
          .report-page:last-child {
            page-break-after: auto;
          }
          @page {
            size: A4 landscape;
            margin: 0;
          }
          @media print {
            body {
              margin: 0;
              padding: 0;
            }
            .report-page {
              page-break-after: always;
            }
          }
        </style>
      </head>
      <body>
        ${allPagesHTML.map(pageHTML => `<div class="report-page">${pageHTML}</div>`).join('\n')}
      </body>
    </html>
  `;

  return fullHTML;
}
