// Enhanced Lambda handler with proper error handling and debugging
exports.handler = async (event, context) => {
  console.log('Lambda invocation started');
  console.log('Event:', JSON.stringify(event, null, 2));
  console.log('Context:', JSON.stringify(context, null, 2));
  
  try {
    // Handle different event sources (API Gateway, direct invocation, etc.)
    let payload;
    
    if (event.body) {
      // API Gateway event
      console.log('Processing API Gateway event');
      console.log('Raw body:', event.body);
      console.log('Body type:', typeof event.body);
      
      if (typeof event.body === 'string') {
        try {
          payload = JSON.parse(event.body);
        } catch (parseError) {
          console.error('JSON parse error:', parseError);
          return {
            statusCode: 400,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ 
              error: 'Invalid JSON in request body',
              details: parseError.message 
            })
          };
        }
      } else {
        payload = event.body;
      }
    } else if (event.reportData || event.collectionPointsData) {
      // Direct invocation with payload in event
      console.log('Processing direct invocation');
      payload = event;
    } else {
      // No valid payload found
      console.error('No valid payload found in event');
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          error: 'No valid payload found',
          receivedEvent: event 
        })
      };
    }
    
    console.log('Parsed payload:', JSON.stringify(payload, null, 2));
    
    // Validate required fields
    const { reportData, collectionPointsData, clientInfo, reportPeriod, options = {} } = payload;
    
    if (!reportData) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Missing reportData in payload' })
      };
    }
    
    if (!collectionPointsData) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Missing collectionPointsData in payload' })
      };
    }
    
    if (!clientInfo) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Missing clientInfo in payload' })
      };
    }
    
    if (!reportPeriod) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Missing reportPeriod in payload' })
      };
    }
    
    // Convert date strings to Date objects
    const period = {
      start: new Date(reportPeriod.start),
      end: new Date(reportPeriod.end)
    };
    
    console.log('Validation passed, generating PDF...');
    
    // Import your PDF generation function
    const { generateA4PDF } = require('./generateA4PDF'); // Adjust path as needed
    
    // Create a mock intl object for testing
    const mockIntl = {
      formatMessage: ({ id }) => {
        const messages = {
          'admin.report.title': 'Relatório de Qualidade da Água',
          'admin.report.client': 'Cliente',
          'admin.report.area': 'Área',
          'admin.report.point': 'Ponto',
          'admin.report.measurements': 'Medições',
          'admin.report.photo': 'Foto'
        };
        return messages[id] || id;
      }
    };
    
    // Generate PDF
    const pdfBuffer = await generateA4PDF(
      reportData,
      collectionPointsData,
      clientInfo,
      period,
      mockIntl
    );
    
    console.log('PDF generated successfully, buffer size:', pdfBuffer.length);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="water-quality-report.pdf"',
        'Access-Control-Allow-Origin': '*'
      },
      body: pdfBuffer.toString('base64'),
      isBase64Encoded: true
    };
    
  } catch (error) {
    console.error('Lambda execution error:', error);
    console.error('Error stack:', error.stack);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      })
    };
  }
};