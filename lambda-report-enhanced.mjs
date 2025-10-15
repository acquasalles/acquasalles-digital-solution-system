const puppeteer = require("puppeteer-core");
const chromium = require("@sparticuz/chromium");
const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const s3 = new S3Client({
  region: 'us-west-2',
  forcePathStyle: false,
  useChecksum: false,
  useArnRegion: false

});
const BUCKET = "water-report-chart-images"; // seu bucket
const PREFIX = "relatorios"; // pasta no bucket

exports.handler = async (event) => {
  try {
    const { html } = JSON.parse(event.body || "{}");

    if (!html) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Campo 'html' é obrigatório" }),
      };
    }

    console.log('Launching Chromium...');

    // Lança o Chromium
    const executablePath = await chromium.executablePath;
    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();

    console.log('Setting HTML content...');
    await page.setContent(html, { waitUntil: "networkidle0" });

    console.log('Generating PDF...');

    // Gera PDF em buffer com configurações otimizadas para multi-página
    const pdfBuffer = await page.pdf({
      format: "A4",
      landscape: true,
      printBackground: true,
      preferCSSPageSize: true,  // Respeita as regras @page do CSS
      margin: {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0
      }
    });

    await browser.close();
    console.log('PDF generated successfully');

    // Nome único para o arquivo
    const key = `${PREFIX}/relatorio-${Date.now()}.pdf`;

    // // Salva no S3 (opcional)
    // console.log('Uploading to S3...');
    // await s3.send(
    //   new PutObjectCommand({
    //     Bucket: BUCKET,
    //     Key: key,
    //     Body: pdfBuffer,
    //     ContentType: "application/pdf",
    //   })
    // );

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "attachment; filename=relatorio.pdf",
      },
      body: pdfBuffer.toString("base64"),
      isBase64Encoded: true,
    };

  } catch (error) {
    console.error("Erro ao gerar PDF:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
