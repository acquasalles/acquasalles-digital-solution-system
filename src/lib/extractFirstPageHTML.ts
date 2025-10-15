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
