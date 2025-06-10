import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET(request, { params }) {
  try {
    const { id } = params;
    const filePath = path.join(process.cwd(), 'data', `book${id}.json`);
    const data = await fs.readFile(filePath, 'utf8');
    const bookData = JSON.parse(data);

    return NextResponse.json({
      name: `Book ${id}`,
      hadiths: bookData
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch hadiths' },
      { status: 500 }
    );
  }
} 