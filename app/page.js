'use client';

import { useState, useEffect } from 'react';
import { Container, Typography, Grid, Card, CardContent, CardActionArea } from '@mui/material';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [books, setBooks] = useState([]);
  const router = useRouter();

  useEffect(() => {
    // In a real app, this would fetch from your API
    const fetchBooks = async () => {
      try {
        const response = await fetch('/api/books');
        const data = await response.json();
        setBooks(data);
      } catch (error) {
        console.error('Error fetching books:', error);
      }
    };

    fetchBooks();
  }, []);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h2" component="h1" gutterBottom align="center">
        Sahih al-Bukhari
      </Typography>
      <Grid container spacing={3}>
        {books.map((book) => (
          <Grid item xs={12} sm={6} md={4} key={book.id}>
            <Card>
              <CardActionArea onClick={() => router.push(`/book/${book.id}`)}>
                <CardContent>
                  <Typography variant="h5" component="h2">
                    {book.name}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
} 