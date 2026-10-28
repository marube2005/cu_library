'use client';

import React, { useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Divider,
  Alert,
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import SaveIcon from '@mui/icons-material/Save';
import { useLibrary } from '@/context/LibraryContext';

export default function SettingsPage() {
  const { settings, setSettings } = useLibrary();

  const [form, setForm] = useState({ ...settings });
  const [savedAlert, setSavedAlert] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSettings(form);
    setSavedAlert(true);
    setTimeout(() => setSavedAlert(false), 4000);
  };

  return (
    <Container maxWidth="md">
      <Paper elevation={0} sx={{ p: { xs: 3, md: 4 }, borderRadius: 4, border: '1px solid #E2E8F0' }}>
        <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A' }}>
          Library Rules & Fine Policy Settings
        </Typography>
        <Typography variant="body2" sx={{ color: '#64748B', mt: 0.5, mb: 3 }}>
          Configure lending limits, grace period, fine accrual, and WhatsApp reminder templates per Section A6.
        </Typography>

        {savedAlert && (
          <Alert severity="success" sx={{ mb: 3, borderRadius: 2.5, fontWeight: 700 }}>
            Policy configuration saved and active across circulation desks and WhatsApp messaging!
          </Alert>
        )}

        <Box component="form" onSubmit={handleSave} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Standard Loan Duration (Days)"
                type="number"
                value={form.loanDays}
                onChange={(e) => setForm({ ...form, loanDays: parseInt(e.target.value) || 14 })}
                InputProps={{ sx: { fontWeight: 800 } }}
                helperText="Proposed default: 14 days."
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Grace Period (Days Before Fine Starts)"
                type="number"
                value={form.graceDays}
                onChange={(e) => setForm({ ...form, graceDays: parseInt(e.target.value) || 2 })}
                InputProps={{ sx: { fontWeight: 800 } }}
                helperText="Proposed default: 2 days."
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Daily Fine Rate (Ksh / Day)"
                type="number"
                value={form.fineRate}
                onChange={(e) => setForm({ ...form, fineRate: parseFloat(e.target.value) || 5 })}
                InputProps={{ sx: { fontWeight: 800, color: '#DC2626' } }}
                helperText="Proposed default: Ksh 5.00 / day."
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Borrowing Block Threshold (Ksh)"
                type="number"
                value={form.fineBlockThreshold}
                onChange={(e) => setForm({ ...form, fineBlockThreshold: parseFloat(e.target.value) || 50 })}
                InputProps={{ sx: { fontWeight: 800, color: '#DC2626' } }}
                helperText="Block borrowing if unpaid fines exceed Ksh 50."
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0F172A', mb: 1, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                WhatsApp Reminder Message Templates (Section A3)
              </Typography>
            </Grid>

            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Due Soon Reminder Template"
                value={form.dueSoonTemplate}
                onChange={(e) => setForm({ ...form, dueSoonTemplate: e.target.value })}
                InputProps={{ sx: { fontFamily: 'monospace', fontSize: '0.85rem' } }}
                helperText="Available placeholders: {name}, {title}, {due_date}"
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Overdue Loan Notice Template"
                value={form.overdueTemplate}
                onChange={(e) => setForm({ ...form, overdueTemplate: e.target.value })}
                InputProps={{ sx: { fontFamily: 'monospace', fontSize: '0.85rem' } }}
                helperText="Available placeholders: {name}, {title}, {due_date}, {fine}"
              />
            </Grid>
          </Grid>

          <Box sx={{ pt: 2, borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              type="submit"
              variant="contained"
              size="large"
              color="secondary"
              startIcon={<SaveIcon />}
              sx={{ fontWeight: 800, px: 4 }}
            >
              Save Policy Configuration
            </Button>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
}
