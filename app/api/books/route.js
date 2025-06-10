import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET(request) {
  // Handle CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { headers });
  }

  try {
    const dataDir = path.join(process.cwd(), 'data');
    const files = await fs.readdir(dataDir);
    
    const books = files
      .filter(file => file.endsWith('.json'))
      .map(file => ({
        id: parseInt(file.replace('book', '').replace('.json', '')),
        name: `Book ${file.replace('book', '').replace('.json', '')}`
      }));

    return NextResponse.json(books, { headers });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch books' },
      { status: 500, headers }
    );
  }
} 