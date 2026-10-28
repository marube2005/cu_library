'use client';

import React, { useState } from 'react';
import {
  Container,
  Card,
  CardMedia,
  CardContent,
  Typography,
  TextField,
  InputAdornment,
  Chip,
  Stack,
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Checkbox,
  Divider,
  Paper
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import SearchIcon from '@mui/icons-material/Search';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { useLibrary } from '@/context/LibraryContext';
import { BookTitle } from '@/lib/api';

const CATEGORIES = [
  'ALL',
  'Theology & Doctrine',
  'Spiritual Growth & Prayer',
  'Christian Living & Marriage',
  'Leadership & Ministry',
];

export default function CataloguePage() {
  const { books, requestHold } = useLibrary();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [availableOnly, setAvailableOnly] = useState(false);
  const [selectedBook, setSelectedBook] = useState<BookTitle | null>(null);
  const [feedback, setFeedback] = useState<{ severity: 'success' | 'error' | 'info'; title: string; message: string } | null>(null);

  const filteredBooks = books.filter((b) => {
    const matchesSearch =
      b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.isbn.includes(searchQuery);
    const matchesCategory = selectedCategory === 'ALL' || b.category_name === selectedCategory;
    const matchesAvailable = !availableOnly || b.available_copies > 0;
    return matchesSearch && matchesCategory && matchesAvailable;
  });

  return (
    <Container maxWidth="xl">
      {/* Top Search & Filter Bar */}
      <Paper elevation={0} sx={{ p: { xs: 2.5, md: 3 }, mb: 4, borderRadius: 4, border: '1px solid #E2E8F0' }}>
        <Grid container spacing={2} alignItems="center">
          <Grid size={{ xs: 12, md: 8 }}>
            <TextField
              fullWidth
              variant="outlined"
              size="medium"
              placeholder="Search catalogue by title, author, or ISBN (e.g. Mere Christianity, Packer)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
                sx: { borderRadius: 3, bgcolor: '#F8FAFC' },
              }}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={availableOnly}
                  onChange={(e) => setAvailableOnly(e.target.checked)}
                  sx={{ color: '#F59E0B', '&.Mui-checked': { color: '#F59E0B' } }}
                />
              }
              label={
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#334155' }}>
                  Available On Shelf Only
                </Typography>
              }
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', pb: 0.5 }}>
              {CATEGORIES.map((cat) => (
                <Chip
                  key={cat}
                  label={cat === 'ALL' ? 'All Categories' : cat}
                  clickable
                  onClick={() => setSelectedCategory(cat)}
                  sx={{
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    bgcolor: selectedCategory === cat ? '#0F172A' : '#F1F5F9',
                    color: selectedCategory === cat ? '#FFFFFF' : '#475569',
                    '&:hover': {
                      bgcolor: selectedCategory === cat ? '#1E293B' : '#E2E8F0',
                    },
                  }}
                />
              ))}
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      {/* Books Grid */}
      <Grid container spacing={3}>
        {filteredBooks.map((book) => (
          <Grid key={book.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
            <Card
              onClick={() => setSelectedBook(book)}
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                cursor: 'pointer',
                transition: 'all 0.25s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 12px 30px rgba(15, 23, 42, 0.1)',
                  borderColor: '#F59E0B',
                },
              }}
            >
              {/* Cover Media */}
              <Box sx={{ position: 'relative', height: 240, bgcolor: '#F1F5F9', p: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CardMedia
                  component="img"
                  image={book.cover_url || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&q=80'}
                  alt={book.title}
                  sx={{ height: '100%', width: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' }}
                />

                <Chip
                  size="small"
                  icon={book.available_copies > 0 ? <CheckCircleOutlineIcon sx={{ fontSize: '14px !important' }} /> : <ErrorOutlineIcon sx={{ fontSize: '14px !important' }} />}
                  label={book.available_copies > 0 ? `${book.available_copies} Available` : 'All Out'}
                  sx={{
                    position: 'absolute',
                    top: 12,
                    right: 12,
                    fontWeight: 800,
                    fontSize: '0.7rem',
                    bgcolor: book.available_copies > 0 ? '#ECFDF5' : '#FFF1F2',
                    color: book.available_copies > 0 ? '#065F46' : '#BE123C',
                    border: '1px solid',
                    borderColor: book.available_copies > 0 ? '#A7F3D0' : '#FECDD3',
                  }}
                />
              </Box>

              <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', p: 2.5 }}>
                <Box>
                  <Typography variant="caption" sx={{ color: '#D97706', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {book.category_name}
                  </Typography>
                  <Typography variant="h6" sx={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', mt: 0.5, lineHeight: 1.3 }} noWrap>
                    {book.title}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#64748B', fontSize: '0.85rem', mt: 0.5 }} noWrap>
                    by {book.author}
                  </Typography>
                </Box>

                <Box sx={{ mt: 2, pt: 1.5, borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 600 }}>
                    ISBN: {book.isbn || 'N/A'}
                  </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: '#0F172A' }}>
                    {book.total_copies} {book.total_copies === 1 ? 'Copy' : 'Copies'}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Book Detail & Request Modal */}
      {selectedBook && (
        <Dialog open={Boolean(selectedBook)} onClose={() => setSelectedBook(null)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
          <DialogTitle sx={{ pb: 1, fontWeight: 800, color: '#0F172A' }}>
            <Typography variant="caption" sx={{ color: '#D97706', fontWeight: 800, textTransform: 'uppercase', display: 'block' }}>
              {selectedBook.category_name}
            </Typography>
            {selectedBook.title}
            <Typography variant="subtitle2" sx={{ color: '#64748B', fontWeight: 600 }}>
              by {selectedBook.author}
            </Typography>
          </DialogTitle>

          <DialogContent dividers sx={{ py: 2.5 }}>
            <Typography variant="body2" sx={{ color: '#475569', lineHeight: 1.6, mb: 3 }}>
              {selectedBook.description || 'No extended summary registered for this title.'}
            </Typography>

            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0F172A', mb: 1.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Shelf Inventory & Physical Copies ({selectedBook.total_copies})
            </Typography>

            <Stack spacing={1}>
              {selectedBook.copies?.map((copy) => (
                <Paper
                  key={copy.id}
                  variant="outlined"
                  sx={{
                    p: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    bgcolor: '#F8FAFC',
                    borderRadius: 2.5,
                  }}
                >
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 800, fontFamily: 'monospace', color: '#0F172A' }}>
                      {copy.copy_code}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#64748B' }}>
                      {copy.shelf_location} • Condition: {copy.condition}
                    </Typography>
                  </Box>
                  <Chip
                    size="small"
                    label={copy.status}
                    sx={{
                      fontWeight: 800,
                      fontSize: '0.65rem',
                      bgcolor: copy.status === 'AVAILABLE' ? '#ECFDF5' : '#FFF1F2',
                      color: copy.status === 'AVAILABLE' ? '#065F46' : '#BE123C',
                    }}
                  />
                </Paper>
              ))}
            </Stack>
          </DialogContent>

          <DialogActions sx={{ p: 2.5, justifyContent: 'space-between' }}>
            <Typography variant="caption" sx={{ color: '#94A3B8' }}>
              Publisher: {selectedBook.publisher || 'N/A'} ({selectedBook.publication_year || 'N/A'})
            </Typography>

            {selectedBook.available_copies > 0 ? (
              <Button
                variant="contained"
                startIcon={<BookmarkBorderIcon />}
                onClick={() => {
                  const res = requestHold(selectedBook.id);
                  setSelectedBook(null);
                  setFeedback({
                    severity: res.success ? 'success' : 'error',
                    title: res.success ? 'Hold Requested Successfully' : 'Request Cannot Be Placed',
                    message: res.message
                  });
                }}
                sx={{ bgcolor: '#0F172A', color: '#FFFFFF', fontWeight: 800 }}
              >
                Request Hold (3 Days)
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={() => {
                  const res = requestHold(selectedBook.id);
                  setSelectedBook(null);
                  setFeedback({
                    severity: res.success ? 'info' : 'error',
                    title: res.success ? 'Placed in Reservation Queue' : 'Reservation Not Allowed',
                    message: res.message
                  });
                }}
                sx={{ bgcolor: '#F59E0B', color: '#0F172A', fontWeight: 800 }}
              >
                Reserve (Join Queue)
              </Button>
            )}
          </DialogActions>
        </Dialog>
      )}

      {/* Feedback Dialog */}
      {feedback && (
        <Dialog open={Boolean(feedback)} onClose={() => setFeedback(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 4, p: 1 } }}>
          <DialogTitle sx={{ fontWeight: 800, color: feedback.severity === 'error' ? '#DC2626' : '#0F172A' }}>
            {feedback.title}
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" sx={{ color: '#475569', lineHeight: 1.6 }}>
              {feedback.message}
            </Typography>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button
              variant="contained"
              onClick={() => setFeedback(null)}
              sx={{ bgcolor: '#0F172A', color: '#FFFFFF', fontWeight: 800 }}
            >
              Close
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Container>
  );
}

