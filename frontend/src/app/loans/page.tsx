'use client';

import React, { useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  Button,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Alert
} from '@mui/material';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { useLibrary } from '@/context/LibraryContext';
import { LoanRecord, buildWhatsAppLink } from '@/lib/api';

export default function LoansPage() {
  const { loans, settings } = useLibrary();

  const [reminderModal, setReminderModal] = useState<{
    loan: LoanRecord;
    renderedText: string;
    waLink: string;
  } | null>(null);

  const openWhatsAppModal = (loan: LoanRecord) => {
    const rawTemplate = loan.status === 'OVERDUE' ? settings.overdueTemplate : settings.dueSoonTemplate;
    const rendered = rawTemplate
      .replace('{name}', loan.member_name.split(' ')[0])
      .replace('{title}', loan.title_name)
      .replace('{due_date}', loan.due_date)
      .replace('{fine}', loan.fine_accrued.toFixed(2));

    const link = buildWhatsAppLink(loan.member_phone, rendered);
    setReminderModal({
      loan,
      renderedText: rendered,
      waLink: link,
    });
  };

  const overdueCount = loans.filter((l) => l.status === 'OVERDUE').length;
  const activeCount = loans.filter((l) => l.status === 'ISSUED').length;

  return (
    <Container maxWidth="xl">
      <Paper elevation={0} sx={{ p: { xs: 2.5, md: 3.5 }, borderRadius: 4, border: '1px solid #E2E8F0' }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { sm: 'center' }, pb: 2.5, mb: 3, borderBottom: '1px solid #F1F5F9', gap: 2 }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A' }}>
              Circulation Loans & WhatsApp Notifications
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748B', mt: 0.5 }}>
              Monitor borrowing duration, days overdue, fine accrual, and send 1-click wa.me reminders.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1.5}>
            <Chip
              label={`Active Loans: ${activeCount}`}
              sx={{ fontWeight: 700, bgcolor: '#F1F5F9', color: '#334155' }}
            />
            <Chip
              label={`Overdue: ${overdueCount}`}
              sx={{ fontWeight: 800, bgcolor: '#FFF1F2', color: '#BE123C', border: '1px solid #FECDD3' }}
            />
          </Stack>
        </Box>

        <Box sx={{ overflowX: 'auto' }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.8rem' }}>Borrower Member</TableCell>
                <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.8rem' }}>Book Title & Code</TableCell>
                <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.8rem' }}>Due Date</TableCell>
                <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.8rem' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.8rem' }}>Accrued Fine</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800, color: '#475569', fontSize: '0.8rem' }}>WhatsApp Reminder</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loans.map((loan) => (
                <TableRow key={loan.id} hover sx={{ '&:hover': { bgcolor: '#F8FAFC' } }}>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 800, color: '#0F172A' }}>
                      {loan.member_name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#94A3B8', fontFamily: 'monospace' }}>
                      {loan.member_reg} • {loan.member_phone}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#0F172A' }}>
                      {loan.title_name}
                    </Typography>
                    <Chip
                      size="small"
                      label={loan.copy_code}
                      sx={{ height: 20, fontSize: '0.65rem', fontWeight: 800, bgcolor: '#F1F5F9', color: '#334155' }}
                    />
                  </TableCell>

                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 700, color: '#0F172A' }}>
                      {loan.due_date}
                    </Typography>
                    {loan.status === 'OVERDUE' && (
                      <Typography variant="caption" sx={{ color: '#DC2626', fontWeight: 800, display: 'block' }}>
                        {loan.days_overdue} days late
                      </Typography>
                    )}
                  </TableCell>

                  <TableCell>
                    <Chip
                      size="small"
                      label={loan.status}
                      sx={{
                        fontWeight: 800,
                        fontSize: '0.7rem',
                        bgcolor: loan.status === 'OVERDUE' ? '#FFF1F2' : loan.status === 'ISSUED' ? '#ECFDF5' : '#F1F5F9',
                        color: loan.status === 'OVERDUE' ? '#BE123C' : loan.status === 'ISSUED' ? '#065F46' : '#475569',
                      }}
                    />
                  </TableCell>

                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 800, color: loan.fine_accrued > 0 ? '#DC2626' : '#94A3B8' }}>
                      {loan.fine_accrued > 0 ? `Ksh ${loan.fine_accrued.toFixed(2)}` : 'Ksh 0.00'}
                    </Typography>
                  </TableCell>

                  <TableCell align="right">
                    {loan.status === 'OVERDUE' ? (
                      <Button
                        size="small"
                        variant="contained"
                        color="success"
                        startIcon={<WhatsAppIcon />}
                        onClick={() => openWhatsAppModal(loan)}
                        sx={{ fontWeight: 800, fontSize: '0.75rem', bgcolor: '#10B981', '&:hover': { bgcolor: '#059669' } }}
                      >
                        Send WhatsApp
                      </Button>
                    ) : loan.status === 'ISSUED' ? (
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => openWhatsAppModal(loan)}
                        sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#334155', borderColor: '#CBD5E1' }}
                      >
                        Due Reminder
                      </Button>
                    ) : (
                      <Typography variant="caption" sx={{ color: '#94A3B8' }}>Returned</Typography>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      </Paper>

      {/* WhatsApp Modal */}
      {reminderModal && (
        <Dialog open={Boolean(reminderModal)} onClose={() => setReminderModal(null)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1, fontWeight: 800 }}>
            <WhatsAppIcon sx={{ color: '#10B981', fontSize: 28 }} />
            WhatsApp Click-to-Chat Dispatch
          </DialogTitle>
          <DialogContent dividers sx={{ py: 2.5 }}>
            <Typography variant="body2" sx={{ color: '#64748B', mb: 2 }}>
              Recipient: <strong style={{ color: '#0F172A' }}>{reminderModal.loan.member_name}</strong> ({reminderModal.loan.member_phone})
            </Typography>

            <Paper variant="outlined" sx={{ p: 2, bgcolor: '#F0FDF4', borderColor: '#BBF7D0', borderRadius: 3, mb: 2 }}>
              <Typography variant="caption" sx={{ fontWeight: 800, color: '#166534', textTransform: 'uppercase', display: 'block', mb: 0.5 }}>
                Pre-Filled Message:
              </Typography>
              <Typography variant="body2" sx={{ color: '#14532D', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                {reminderModal.renderedText}
              </Typography>
            </Paper>

            <Alert severity="info" sx={{ borderRadius: 2.5, fontSize: '0.75rem' }}>
              Clicking below opens WhatsApp with the message already typed. Per Section A3, tapping send takes one second and costs Ksh 0.
            </Alert>
          </DialogContent>
          <DialogActions sx={{ p: 2.5 }}>
            <Button onClick={() => setReminderModal(null)} sx={{ color: '#64748B' }}>
              Cancel
            </Button>
            <Button
              variant="contained"
              color="success"
              startIcon={<WhatsAppIcon />}
              href={reminderModal.waLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setReminderModal(null)}
              sx={{ fontWeight: 800, bgcolor: '#10B981', '&:hover': { bgcolor: '#059669' } }}
            >
              Open in WhatsApp & Send
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Container>
  );
}
