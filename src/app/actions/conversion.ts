'use server';

import https from 'https';

interface ConversionParams {
  from: string;
  to: string;
  amount: number;
}

interface ConversionResponse {
  converted: number;
  from_usd_quote: number;
  to_usd_quote: number;
}

export async function getConversionRate(params: ConversionParams): Promise<ConversionResponse> {
  const requestBody = JSON.stringify({
    from: params.from,
    to: params.to,
    amount: params.amount,
  });

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'preview-api.tooma.xyz',
      path: '/conversion',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestBody),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            const parsedData = JSON.parse(data);
            resolve(parsedData);
          } else {
            reject(new Error(`HTTP error! status: ${res.statusCode}, message: ${data}`));
          }
        } catch (error) {
          reject(new Error('Failed to parse response JSON'));
        }
      });
    });

    req.on('error', (error) => {
      console.error('Request error:', error);
      reject(new Error('Network error'));
    });

    // Write the request body
    req.write(requestBody);
    req.end();
  });
}