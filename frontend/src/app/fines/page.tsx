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
  TextField,
  MenuItem,
  Stack
} from '@mui/material';
import PaymentsIcon from '@mui/icons-material/Payments';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useLibrary } from '@/context/LibraryContext';
import { FineRecord } from '@/lib/api';

export default function FinesPage() {
  const { fines, recordPayment, waiveFine, currentUser } = useLibrary();

  const [paymentModal, setPaymentModal] = useState<FineRecord | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<'CASH' | 'MPESA'>('MPESA');
  const [payRef, setPayRef] = useState('');

  const [waiverModal, setWaiverModal] = useState<FineRecord | null>(null);
  const [waiverReason, setWaiverReason] = useState('');

  const handleConfirmPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModal || !payAmount) return;
    const amount = parseFloat(payAmount);
    if (isNaN(amount) || amount <= 0) return;

    recordPayment(paymentModal.id, amount, payMethod, payRef);
    alert(`Payment of Ksh ${amount.toFixed(2)} recorded successfully.`);
    setPaymentModal(null);
    setPayAmount('');
    setPayRef('');
  };

  const handleConfirmWaiver = (e: React.FormEvent) => {
    e.preventDefault();
    if (!waiverModal || !waiverReason.trim()) {
      alert('A valid reason is required for audit log compliance.');
      return;
    }

    waiveFine(waiverModal.id, waiverReason.trim());
    alert(`Fine for ${waiverModal.member_name} has been waived and logged in the audit trail.`);
    setWaiverModal(null);
    setWaiverReason('');
  };

  const totalOutstanding = fines.reduce((acc, f) => acc + f.balance, 0);

  return (
    <Container maxWidth="xl">
      <Paper elevation={0} sx={{ p: { xs: 2.5, md: 3.5 }, borderRadius: 4, border: '1px solid #E2E8F0' }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { sm: 'center' }, pb: 2.5, mb: 3, borderBottom: '1px solid #F1F5F9', gap: 2 }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A' }}>
              Fine Policy & Revenue Collection Desk
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748B', mt: 0.5 }}>
              Record Cash or M-Pesa receipts, and manage audited waivers per Section A4.7.
            </Typography>
          </Box>
          <Box sx={{ textAlign: { sm: 'right' } }}>
            <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600 }}>
              Total Unpaid Balance:
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#DC2626' }}>
              Ksh {totalOutstanding.toFixed(2)}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ overflowX: 'auto' }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.8rem' }}>Member</TableCell>
                <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.8rem' }}>Book & Copy Code</TableCell>
                <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.8rem' }}>Total Fine</TableCell>
                <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.8rem' }}>Paid</TableCell>
                <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.8rem' }}>Outstanding</TableCell>
                <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.8rem' }}>Status</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800, color: '#475569', fontSize: '0.8rem' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {fines.map((fine) => (
                <TableRow key={fine.id} hover sx={{ '&:hover': { bgcolor: '#F8FAFC' } }}>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 800, color: '#0F172A' }}>
                      {fine.member_name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#94A3B8', fontFamily: 'monospace' }}>
                      {fine.member_reg}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#0F172A' }}>
                      {fine.book_title}
                    </Typography>
                    <Chip
                      size="small"
                      label={fine.copy_code}
                      sx={{ height: 20, fontSize: '0.65rem', fontWeight: 800, bgcolor: '#F1F5F9', color: '#334155' }}
                    />
                  </TableCell>

                  <TableCell sx={{ fontWeight: 700 }}>Ksh {fine.amount.toFixed(2)}</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#059669' }}>Ksh {fine.paid_amount.toFixed(2)}</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: fine.balance > 0 ? '#DC2626' : '#94A3B8' }}>
                    Ksh {fine.balance.toFixed(2)}
                  </TableCell>

                  <TableCell>
                    <Chip
                      size="small"
                      label={fine.status}
                      sx={{
                        fontWeight: 800,
                        fontSize: '0.7rem',
                        bgcolor: fine.status === 'PAID' ? '#ECFDF5' : fine.status === 'WAIVED' ? '#FFFBEB' : '#FFF1F2',
                        color: fine.status === 'PAID' ? '#065F46' : fine.status === 'WAIVED' ? '#92400E' : '#BE123C',
                      }}
                    />
                  </TableCell>

                  <TableCell align="right">
                    {fine.balance > 0 && (
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Button
                          size="small"
                          variant="contained"
                          color="success"
                          startIcon={<PaymentsIcon />}
                          onClick={() => {
                            setPaymentModal(fine);
                            setPayAmount(fine.balance.toString());
                          }}
                          sx={{ fontWeight: 700, fontSize: '0.75rem', bgcolor: '#10B981', '&:hover': { bgcolor: '#059669' } }}
                        >
                          Record Payment
                        </Button>
                        {currentUser.role === 'LIBRARIAN' && (
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => setWaiverModal(fine)}
                            sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#475569', borderColor: '#CBD5E1' }}
                          >
                            Waive
                          </Button>
                        )}
                      </Stack>
                    )}
                    {fine.status === 'WAIVED' && (
                      <Typography variant="caption" sx={{ color: '#92400E', fontStyle: 'italic', fontWeight: 600 }}>
                        Waived: {fine.waive_reason || 'Administrative waiver'}
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      </Paper>

      {/* Record Payment Dialog */}
      {paymentModal && (
        <Dialog open={Boolean(paymentModal)} onClose={() => setPaymentModal(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
          <DialogTitle sx={{ fontWeight: 800 }}>Record Fine Payment</DialogTitle>
          <Box component="form" onSubmit={handleConfirmPayment}>
            <DialogContent dividers sx={{ py: 2.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography variant="body2" sx={{ color: '#475569' }}>
                Member: <strong>{paymentModal.member_name}</strong> (Outstanding: Ksh {paymentModal.balance.toFixed(2)})
              </Typography>

              <TextField
                fullWidth
                label="Amount Paid (Ksh)"
                type="number"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                required
                InputProps={{ sx: { fontWeight: 800, fontSize: '1.1rem' } }}
              />

              <TextField
                select
                fullWidth
                label="Payment Method"
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value as 'CASH' | 'MPESA')}
              >
                <option value="MPESA">M-Pesa</option>
                <option value="CASH">Cash</option>
              </TextField>

              <TextField
                fullWidth
                label="Receipt / M-Pesa Reference"
                placeholder="e.g. QK89271..."
                value={payRef}
                onChange={(e) => setPayRef(e.target.value)}
                InputProps={{ sx: { fontFamily: 'monospace', textTransform: 'uppercase' } }}
              />
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <Button onClick={() => setPaymentModal(null)}>Cancel</Button>
              <Button type="submit" variant="contained" color="success" sx={{ fontWeight: 800 }}>
                Confirm Payment
              </Button>
            </DialogActions>
          </Box>
        </Dialog>
      )}

      {/* Waive Fine Dialog */}
      {waiverModal && (
        <Dialog open={Boolean(waiverModal)} onClose={() => setWaiverModal(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
          <DialogTitle sx={{ fontWeight: 800 }}>Waive Fine</DialogTitle>
          <Box component="form" onSubmit={handleConfirmWaiver}>
            <DialogContent dividers sx={{ py: 2.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography variant="body2" sx={{ color: '#475569' }}>
                Waiving fine of <strong>Ksh {waiverModal.balance.toFixed(2)}</strong> for {waiverModal.member_name}.
              </Typography>

              <TextField
                fullWidth
                multiline
                rows={3}
                label="Audited Justification Reason *"
                placeholder="e.g. Genuine delayed handover due to campus mission trip..."
                value={waiverReason}
                onChange={(e) => setWaiverReason(e.target.value)}
                required
                helperText="Per Section A6, every waiver is recorded immutably in the system audit log."
              />
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <Button onClick={() => setWaiverModal(null)}>Cancel</Button>
              <Button type="submit" variant="contained" color="primary" sx={{ fontWeight: 800 }}>
                Confirm Waiver
              </Button>
            </DialogActions>
          </Box>
        </Dialog>
      )}
    </Container>
  );
}
