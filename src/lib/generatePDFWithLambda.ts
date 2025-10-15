import { format } from 'date-fns';

const LAMBDA_URL = 'https://ojfr7f6uptqqhvlnzo5eze7jay0erxyx.lambda-url.us-west-2.on.aws/';

interface LambdaResponse {
  statusCode: number;
  headers: {
    'Content-Type': string;
    'Content-Disposition': string;
  };
  body: string;
}

export async function generatePDFWithLambda(
  htmlContent: string,
  clientName: string
): Promise<void> {
  try {
    console.log('Sending HTML to Lambda for PDF generation...');

    const response = await fetch(LAMBDA_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ html: htmlContent }),
    });

    if (!response.ok) {
      throw new Error(`Lambda request failed with status: ${response.status}`);
    }

    const result: LambdaResponse = await response.json();

    if (result.statusCode !== 200) {
      throw new Error(`Lambda returned error status: ${result.statusCode}`);
    }

    console.log('Lambda response received, processing PDF buffer...');

    const base64String = result.body;
    const pdfBuffer = base64StringToUint8Array(base64String);

    const blob = new Blob([pdfBuffer], { type: 'application/pdf' });

    const filename = `Relatorio_${clientName.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`;

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(link.href);

    console.log('PDF downloaded successfully:', filename);
  } catch (error) {
    console.error('Error generating PDF with Lambda:', error);
    throw new Error(
      error instanceof Error
        ? `Erro ao gerar PDF: ${error.message}`
        : 'Erro desconhecido ao gerar PDF'
    );
  }
}

function base64StringToUint8Array(base64String: string): Uint8Array {
  const numbers = base64String.split(',').map(num => parseInt(num.trim(), 10));
  return new Uint8Array(numbers);
}
