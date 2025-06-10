import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

// Book information mapping
const bookInfo = {
  1: { topic: "Beginning of Divine Inspiration", pages: "~10 pages" },
  2: { topic: "Belief", pages: "~15 pages" },
  3: { topic: "Knowledge", pages: "~2 pages" },
  8: { topic: "Prayer (Salat)", pages: "~10+ pages" },
  23: { topic: "Funerals", pages: "~6 pages" },
  34: { topic: "Sales and Trade", pages: "~10+ pages" },
  52: { topic: "Fighting for the Cause", pages: "~10+ pages" },
  76: { topic: "Medicine", pages: "~8–9 pages" },
  87: { topic: "Interpretation of Dreams", pages: "~3 pages" }
};

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
      .map(file => {
        const id = parseInt(file.replace('book', '').replace('.json', ''));
        return {
          id,
          name: `Book ${id}`,
          topic: bookInfo[id]?.topic || "Not specified",
          pages: bookInfo[id]?.pages || "Not specified",
          totalHadiths: 0, // Will be updated after reading the file
          url: `/api/books/${id}`
        };
      });

    // Get total hadiths for each book
    for (const book of books) {
      try {
        const filePath = path.join(dataDir, `book${book.id}.json`);
        const data = await fs.readFile(filePath, 'utf8');
        const hadiths = JSON.parse(data);
        book.totalHadiths = hadiths.length;
      } catch (error) {
        console.error(`Error reading book ${book.id}:`, error);
      }
    }

    return NextResponse.json(books, { headers });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch books' },
      { status: 500, headers }
    );
  }
} 