'use client';

import React, { useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  MenuItem,
  CircularProgress,
  Alert,
  Card,
  CardMedia,
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import SearchIcon from '@mui/icons-material/Search';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import { useLibrary } from '@/context/LibraryContext';
import { BookTitle } from '@/lib/api';

const CATEGORIES = [
  'Theology & Doctrine',
  'Spiritual Growth & Prayer',
  'Christian Living & Marriage',
  'Leadership & Ministry',
  'Bible Study & Commentaries',
  'Biographies & Missions',
];

export default function InventoryPage() {
  const { addBook } = useLibrary();

  const [lookupIsbn, setLookupIsbn] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [lookupAlert, setLookupAlert] = useState<{ severity: 'success' | 'error'; message: string } | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    author: '',
    isbn: '',
    category: 'Theology & Doctrine',
    publisher: '',
    year: '2024',
    copyCode: '',
    shelfLocation: 'Shelf A-1',
    coverUrl: '',
    description: '',
  });

  const handleIsbnLookup = async () => {
    const cleanIsbn = lookupIsbn.replace(/[^0-9X]/gi, '').trim();
    if (!cleanIsbn) return;

    setIsSearching(true);
    setLookupAlert(null);

    try {
      const res = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${cleanIsbn}&jscmd=data&format=json`);
      if (res.ok) {
        const data = await res.json();
        const key = `ISBN:${cleanIsbn}`;
        if (data[key]) {
          const item = data[key];
          setFormData((prev) => ({
            ...prev,
            isbn: cleanIsbn,
            title: item.title || '',
            author: item.authors ? item.authors.map((a: any) => a.name).join(', ') : '',
            publisher: item.publishers ? item.publishers[0].name : '',
            year: item.publish_date ? item.publish_date.slice(-4) : '2024',
            coverUrl: item.cover?.large || item.cover?.medium || '',
          }));
          setLookupAlert({
            severity: 'success',
            message: `Found metadata for "${item.title}" from Open Library! Review details below.`,
          });
        } else {
          setLookupAlert({
            severity: 'error',
            message: 'No metadata found for this ISBN on Open Library. Please enter details manually.',
          });
        }
      }
    } catch {
      setLookupAlert({
        severity: 'error',
        message: 'Network error connecting to Open Library. Please check connection.',
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.author || !formData.copyCode) {
      alert('Title, Author, and Copy Code are required.');
      return;
    }

    const newTitle: BookTitle = {
      id: `t-${Date.now()}`,
      title: formData.title,
      author: formData.author,
      isbn: formData.isbn,
      publisher: formData.publisher,
      publication_year: parseInt(formData.year) || 2024,
      category_name: formData.category,
      description: formData.description || 'Newly catalogued Christian Union library book.',
      cover_url: formData.coverUrl || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&q=80',
      total_copies: 1,
      available_copies: 1,
      copies: [
        {
          id: `c-${Date.now()}`,
          copy_code: formData.copyCode.toUpperCase().trim(),
          shelf_location: formData.shelfLocation,
          condition: 'NEW',
          status: 'AVAILABLE',
          replacement_cost: 800,
        },
      ],
    };

    addBook(newTitle);
    alert(`Book "${formData.title}" (${formData.copyCode.toUpperCase()}) added to catalogue!`);
    setFormData({
      title: '',
      author: '',
      isbn: '',
      category: 'Theology & Doctrine',
      publisher: '',
      year: '2024',
      copyCode: '',
      shelfLocation: 'Shelf A-1',
      coverUrl: '',
      description: '',
    });
    setLookupIsbn('');
    setLookupAlert(null);
  };

  return (
    <Container maxWidth="md">
      <Paper elevation={0} sx={{ p: { xs: 3, md: 4 }, borderRadius: 4, border: '1px solid #E2E8F0' }}>
        <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A' }}>
          Add New Title or Accession Physical Copy
        </Typography>
        <Typography variant="body2" sx={{ color: '#64748B', mt: 0.5, mb: 3 }}>
          Auto-fill book details using Open Library ISBN lookup, or enter donated books manually.
        </Typography>

        {/* ISBN Lookup Section */}
        <Paper variant="outlined" sx={{ p: 2.5, bgcolor: '#FFFBEB', borderColor: '#FDE68A', borderRadius: 3, mb: 3 }}>
          <Typography variant="caption" sx={{ fontWeight: 800, color: '#92400E', textTransform: 'uppercase', display: 'block', mb: 1 }}>
            Step 1: Open Library ISBN Auto-Fetcher
          </Typography>
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Enter ISBN (e.g. 9780060652920 or 9780830816507)"
              value={lookupIsbn}
              onChange={(e) => setLookupIsbn(e.target.value)}
              InputProps={{ sx: { bgcolor: '#FFFFFF', fontFamily: 'monospace', fontWeight: 700 } }}
            />
            <Button
              variant="contained"
              color="secondary"
              disabled={isSearching}
              onClick={handleIsbnLookup}
              startIcon={isSearching ? <CircularProgress size={18} color="inherit" /> : <SearchIcon />}
              sx={{ fontWeight: 800, px: 3, whiteSpace: 'nowrap' }}
            >
              {isSearching ? 'Fetching...' : 'Look Up ISBN'}
            </Button>
          </Box>
        </Paper>

        {lookupAlert && (
          <Alert severity={lookupAlert.severity} sx={{ mb: 3, borderRadius: 2.5, fontWeight: 600 }}>
            {lookupAlert.message}
          </Alert>
        )}

        {/* Book Details Form */}
        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Book Title *"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                InputProps={{ sx: { fontWeight: 700 } }}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Author *"
                required
                value={formData.author}
                onChange={(e) => setFormData({ ...formData, author: e.target.value })}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                select
                fullWidth
                label="Category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                {CATEGORIES.map((cat) => (
                  <MenuItem key={cat} value={cat}>
                    {cat}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Copy Code Label (e.g. CU-0008) *"
                required
                value={formData.copyCode}
                onChange={(e) => setFormData({ ...formData, copyCode: e.target.value.toUpperCase() })}
                InputProps={{ sx: { fontFamily: 'monospace', fontWeight: 800 } }}
                helperText="Physical sticker code affixed to the copy."
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Shelf Location"
                placeholder="e.g. Shelf A-3"
                value={formData.shelfLocation}
                onChange={(e) => setFormData({ ...formData, shelfLocation: e.target.value })}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Publisher"
                value={formData.publisher}
                onChange={(e) => setFormData({ ...formData, publisher: e.target.value })}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Publication Year"
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: e.target.value })}
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Cover Image URL"
                placeholder="https://covers.openlibrary.org/..."
                value={formData.coverUrl}
                onChange={(e) => setFormData({ ...formData, coverUrl: e.target.value })}
              />
            </Grid>
          </Grid>

          {formData.coverUrl && (
            <Box sx={{ width: 100, height: 140, bgcolor: '#F1F5F9', borderRadius: 2, overflow: 'hidden', border: '1px solid #E2E8F0' }}>
              <CardMedia component="img" image={formData.coverUrl} sx={{ height: '100%', objectFit: 'cover' }} />
            </Box>
          )}

          <Box sx={{ pt: 2, borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              type="submit"
              variant="contained"
              size="large"
              startIcon={<AddCircleIcon />}
              sx={{ bgcolor: '#0F172A', color: '#FFFFFF', fontWeight: 800, px: 4 }}
            >
              Add to Library Catalogue
            </Button>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
}
