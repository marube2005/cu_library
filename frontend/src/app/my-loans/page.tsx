'use client';

import React from 'react';
import Link from 'next/link';
import {
  Container,
  Paper,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  Box,
  Stack,
  Alert,
  AlertTitle,
  Divider,
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import PaymentsIcon from '@mui/icons-material/Payments';
import { useLibrary } from '@/context/LibraryContext';

export default function MyLoansPage() {
  const { loans, reservations, fines, currentUser, renewLoan } = useLibrary();

  const myLoans = loans.filter(
    (l) =>
      (l.member_name.includes(currentUser.full_name) || l.member_reg === currentUser.reg_no) &&
      (l.status === 'ISSUED' || l.status === 'OVERDUE')
  );

  const myReservations = reservations.filter(
    (r) =>
      (r.member_name === currentUser.full_name || r.member_reg === currentUser.reg_no) &&
      (r.status === 'READY_FOR_PICKUP' || r.status === 'QUEUED')
  );

  const myFines = fines.filter(
    (f) =>
      (f.member_name === currentUser.full_name || f.member_reg === currentUser.reg_no) &&
      f.status === 'UNPAID'
  );

  const totalOwed = myFines.reduce((sum, f) => sum + f.balance, 0);

  return (
    <Container maxWidth="md">
      {/* Pending Account Notice */}
      {currentUser.status === 'PENDING' && (
        <Alert severity="warning" sx={{ mb: 3, borderRadius: 3, border: '1px solid #FCD34D' }}>
          <AlertTitle sx={{ fontWeight: 800 }}>Account Registration Pending Approval</AlertTitle>
          Your membership registration is currently awaiting verification by the Librarian. Once approved, you will be able to request holds and borrow books from the CU Library shelves.
        </Alert>
      )}

      {/* Suspended Notice */}
      {currentUser.status === 'SUSPENDED' && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 3 }}>
          <AlertTitle sx={{ fontWeight: 800 }}>Account Suspended</AlertTitle>
          Your library account has been suspended. Please visit the circulation desk to resolve overdue items or fine balances.
        </Alert>
      )}

      {/* Main Loans Card */}
      <Paper elevation={0} sx={{ p: { xs: 3, md: 4 }, borderRadius: 4, border: '1px solid #E2E8F0', mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 2, mb: 3, borderBottom: '1px solid #F1F5F9' }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A' }}>
              My Borrowed Books & Renewals
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748B', mt: 0.5 }}>
              Student: {currentUser.full_name} • Reg No: {currentUser.reg_no || 'N/A'} (Limit: 2 books)
            </Typography>
          </Box>
          <Chip
            label={currentUser.status}
            sx={{
              fontWeight: 800,
              bgcolor: currentUser.status === 'APPROVED' ? '#ECFDF5' : currentUser.status === 'SUSPENDED' ? '#FEF2F2' : '#FFFBEB',
              color: currentUser.status === 'APPROVED' ? '#065F46' : currentUser.status === 'SUSPENDED' ? '#DC2626' : '#92400E',
            }}
          />
        </Box>

        <Stack spacing={2.5}>
          {myLoans.map((loan) => (
            <Card key={loan.id} variant="outlined" sx={{ borderRadius: 3, p: 1 }}>
              <CardContent sx={{ p: '16px !important', display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { sm: 'center' }, gap: 2 }}>
                <Box>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                    <Chip
                      size="small"
                      label={loan.copy_code}
                      sx={{ fontFamily: 'monospace', fontWeight: 800, bgcolor: '#0F172A', color: '#FFFFFF', height: 22 }}
                    />
                    <Chip
                      size="small"
                      label={loan.status}
                      sx={{
                        fontWeight: 800,
                        fontSize: '0.65rem',
                        bgcolor: loan.status === 'OVERDUE' ? '#FFF1F2' : '#ECFDF5',
                        color: loan.status === 'OVERDUE' ? '#BE123C' : '#065F46',
                      }}
                    />
                  </Stack>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: '#0F172A', fontSize: '1.1rem' }}>
                    {loan.title_name}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#64748B' }}>
                    by {loan.author}
                  </Typography>

                  <Box sx={{ mt: 1.5, display: 'flex', gap: 2, alignItems: 'center' }}>
                    <Typography variant="caption" sx={{ color: '#475569', fontWeight: 600 }}>
                      Issued: {loan.issue_date}
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 800, color: loan.status === 'OVERDUE' ? '#DC2626' : '#059669' }}>
                      Due: {loan.due_date} {loan.status === 'OVERDUE' && `(${loan.days_overdue} days late)`}
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ textAlign: { sm: 'right' } }}>
                  {loan.status === 'ISSUED' && loan.renewals_count < 1 && (
                    <Button
                      variant="contained"
                      color="secondary"
                      startIcon={<AutorenewIcon />}
                      onClick={() => {
                        const res = renewLoan(loan.id);
                        alert(res.message);
                      }}
                      sx={{ fontWeight: 800, whiteSpace: 'nowrap' }}
                    >
                      Renew (+7 Days)
                    </Button>
                  )}
                  {loan.renewals_count >= 1 && (
                    <Typography variant="caption" sx={{ color: '#94A3B8', fontStyle: 'italic', display: 'block' }}>
                      1 Renewal Used (Max)
                    </Typography>
                  )}
                </Box>
              </CardContent>
            </Card>
          ))}

          {myLoans.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 5 }}>
              <MenuBookIcon sx={{ fontSize: 44, color: '#CBD5E1', mb: 1 }} />
              <Typography variant="body1" sx={{ fontWeight: 700, color: '#334155' }}>
                You have no active borrowed books.
              </Typography>
              <Typography variant="body2" sx={{ color: '#94A3B8', mt: 0.5 }}>
                Browse the catalogue to request a 3-day hold or reserve your next book.
              </Typography>
              <Button
                component={Link}
                href="/catalogue"
                variant="outlined"
                size="small"
                sx={{ mt: 2, fontWeight: 700 }}
              >
                Browse Catalogue
              </Button>
            </Box>
          )}
        </Stack>
      </Paper>

      {/* Holds & Reservations Section */}
      <Paper elevation={0} sx={{ p: { xs: 3, md: 4 }, borderRadius: 4, border: '1px solid #E2E8F0', mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 2, mb: 2.5, borderBottom: '1px solid #F1F5F9' }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#0F172A' }}>
              My Requested Holds & Queue
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748B' }}>
              Books held for desk pickup (kept 3 days) and pending waiting lists.
            </Typography>
          </Box>
          <Chip label={`${myReservations.length} Active`} size="small" sx={{ fontWeight: 700 }} />
        </Box>

        <Stack spacing={2}>
          {myReservations.map((res) => (
            <Card key={res.id} variant="outlined" sx={{ borderRadius: 3, p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0F172A' }}>
                    {res.title_name}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#64748B' }}>
                    by {res.author}
                  </Typography>
                  <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    {res.status === 'READY_FOR_PICKUP' ? (
                      <Chip
                        icon={<CheckCircleOutlineIcon sx={{ fontSize: '14px !important' }} />}
                        size="small"
                        label={`Ready for Pickup (Hold expires ${res.hold_expires_at ? new Date(res.hold_expires_at).toLocaleDateString('en-GB') : 'in 3 days'})`}
                        sx={{ bgcolor: '#ECFDF5', color: '#065F46', fontWeight: 800 }}
                      />
                    ) : (
                      <Chip
                        icon={<HourglassEmptyIcon sx={{ fontSize: '14px !important' }} />}
                        size="small"
                        label={`In Queue: Position #${res.queue_position}`}
                        sx={{ bgcolor: '#FFFBEB', color: '#92400E', fontWeight: 800 }}
                      />
                    )}
                  </Box>
                </Box>
              </Box>
            </Card>
          ))}

          {myReservations.length === 0 && (
            <Typography variant="body2" sx={{ color: '#94A3B8', py: 2, textAlign: 'center' }}>
              No active holds or reservation requests.
            </Typography>
          )}
        </Stack>
      </Paper>

      {/* My Fines Section */}
      <Paper elevation={0} sx={{ p: { xs: 3, md: 4 }, borderRadius: 4, border: '1px solid #E2E8F0' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 2, mb: 2, borderBottom: '1px solid #F1F5F9' }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#0F172A' }}>
              My Fines & Dues
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748B' }}>
              Late return fees and payments. Borrowing is blocked if unpaid fines exceed Ksh 50.
            </Typography>
          </Box>
          <Chip
            icon={<PaymentsIcon fontSize="small" />}
            label={`Owed: Ksh ${totalOwed.toFixed(2)}`}
            sx={{
              fontWeight: 800,
              bgcolor: totalOwed > 50 ? '#FFF1F2' : totalOwed > 0 ? '#FFFBEB' : '#ECFDF5',
              color: totalOwed > 50 ? '#DC2626' : totalOwed > 0 ? '#D97706' : '#059669',
            }}
          />
        </Box>

        {myFines.length > 0 ? (
          <Stack spacing={1.5}>
            {myFines.map((f) => (
              <Card key={f.id} variant="outlined" sx={{ p: 2, borderRadius: 2.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0F172A' }}>
                      {f.book_title} ({f.copy_code})
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#64748B' }}>
                      Status: {f.status} • Total: Ksh {f.amount.toFixed(2)}
                    </Typography>
                  </Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#DC2626' }}>
                    Ksh {f.balance.toFixed(2)}
                  </Typography>
                </Box>
              </Card>
            ))}
            <Alert severity="info" sx={{ mt: 1.5, borderRadius: 2 }}>
              Fines can be paid in Cash or M-Pesa at the library circulation desk.
            </Alert>
          </Stack>
        ) : (
          <Typography variant="body2" sx={{ color: '#94A3B8', py: 2, textAlign: 'center' }}>
            No unpaid fines on your account. You have a clean borrowing record!
          </Typography>
        )}
      </Paper>
    </Container>
  );
}
