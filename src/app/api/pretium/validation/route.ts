import { NextRequest, NextResponse } from 'next/server';

const PRETIUM_BASE_URI = process.env.PRETIUM_BASE_URI || 'https://api.xwift.africa';
const PRETIUM_API_KEY = process.env.PRETIUM_API_KEY || '';

interface ValidationRequest extends Record<string, unknown> {
  type: 'MOBILE' | 'PAYBILL' | 'BUY_GOODS';
  shortcode: string;
  mobile_network: string; // Support all mobile networks from different countries
  currency_code?: string;
}

async function makeRequest(endpoint: string, data: Record<string, unknown>, currency?: string) {
  const url = currency 
    ? `${PRETIUM_BASE_URI}/v1/${endpoint}/${currency}`
    : `${PRETIUM_BASE_URI}/v1/${endpoint}`;
    
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': PRETIUM_API_KEY,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Pretium API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export async function POST(request: NextRequest) {
  try {
    const body: ValidationRequest = await request.json();
    
    const currency = body.currency_code || 'KES'; // Default to KES for Kenya
    const { ...requestData } = body;
    
    const result = await makeRequest('validation', requestData, currency !== 'KES' ? currency : undefined);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Pretium validation API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}