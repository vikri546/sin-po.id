import { NextResponse } from 'next/server';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function GET() {
  return NextResponse.json(
    {
      success: false,
      enabled: false,
      message: 'Fitur TTS saat ini dinonaktifkan.',
    },
    { headers: corsHeaders }
  );
}

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      enabled: false,
      message: 'Fitur TTS saat ini dinonaktifkan.',
    },
    { status: 200, headers: corsHeaders }
  );
}
