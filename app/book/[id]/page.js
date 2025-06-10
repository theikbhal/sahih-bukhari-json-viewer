'use client';

import { useState, useEffect } from 'react';
import { Container, Typography, Paper, Box, Divider } from '@mui/material';
import { useParams } from 'next/navigation';

export default function BookPage() {
  const [hadiths, setHadiths] = useState([]);
  const [bookName, setBookName] = useState('');
  const { id } = useParams();

  useEffect(() => {
    const fetchHadiths = async () => {
      try {
        const response = await fetch(`/api/books/${id}`);
        const data = await response.json();
        setHadiths(data.hadiths);
        setBookName(data.name);
      } catch (error) {
        console.error('Error fetching hadiths:', error);
      }
    };

    fetchHadiths();
  }, [id]);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h3" component="h1" gutterBottom>
        {bookName}
      </Typography>
      <Box sx={{ mt: 4 }}>
        {hadiths.map((hadith, index) => (
          <Paper key={index} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Hadith #{hadith.number}
            </Typography>
            <Typography variant="body1" paragraph>
              {hadith.arabic}
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Typography variant="body1" paragraph>
              {hadith.english}
            </Typography>
            <Typography variant="subtitle2" color="text.secondary">
              Narrated by: {hadith.narrator}
            </Typography>
          </Paper>
        ))}
      </Box>
    </Container>
  );
} 