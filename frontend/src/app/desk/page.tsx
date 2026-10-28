'use client';

import React, { useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Alert,
  Chip,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import AssignmentReturnIcon from '@mui/icons-material/AssignmentReturn';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import NightlightRoundIcon from '@mui/icons-material/NightlightRound';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useLibrary } from '@/context/LibraryContext';

export default function CirculationDeskPage() {
  const {
    books,
    loans,
    fines,
    allMembers,
    issueBook,
    returnBook,
    quickAddMember,
    approveMember,
    runNightlyMaintenance
  } = useLibrary();

  const [copyCode, setCopyCode] = useState('');
  const [memberId, setMemberId] = useState('');
  const [feedback, setFeedback] = useState<{ severity: 'success' | 'error' | 'warning'; message: string } | null>(null);

  // Hold override prompt state
  const [holdWarning, setHoldWarning] = useState<{
    copyCode: string;
    memberId: string;
    message: string;
  } | null>(null);

  // Quick Add Member Modal
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberReg, setNewMemberReg] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberPhone, setNewMemberPhone] = useState('');

  // Night Watchman Report Modal
  const [watchmanReport, setWatchmanReport] = useState<any | null>(null);

  const pendingMembers = allMembers.filter((m) => m.status === 'PENDING');
  const activeLoansCount = loans.filter((l) => l.status === 'ISSUED').length;
  const overdueCount = loans.filter((l) => l.status === 'OVERDUE').length;

  const handleIssue = (e: React.FormEvent, override = false) => {
    e.preventDefault();
    setFeedback(null);
    setHoldWarning(null);

    const res = issueBook(copyCode, memberId, override);

    if (res.requiresOverride) {
      setHoldWarning({
        copyCode,
        memberId,
        message: res.message
      });
      return;
    }

    setFeedback({
      severity: res.success ? 'success' : 'error',
      message: res.message,
    });

    if (res.success) {
      setCopyCode('');
    }
  };

  const handleReturn = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setHoldWarning(null);
    const res = returnBook(copyCode);
    setFeedback({
      severity: res.success ? 'success' : 'error',
      message: res.message,
    });
    if (res.success) {
      setCopyCode('');
    }
  };

  const handleQuickAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName || !newMemberReg || !newMemberEmail) {
      alert('Please fill Name, Registration Number, and Email.');
      return;
    }
    const res = quickAddMember({
      full_name: newMemberName,
      reg_no: newMemberReg,
      email: newMemberEmail,
      phone_whatsapp: newMemberPhone || '+254700000000'
    });
    setMemberId(newMemberReg);
    setQuickAddOpen(false);
    setNewMemberName('');
    setNewMemberReg('');
    setNewMemberEmail('');
    setNewMemberPhone('');
    setFeedback({
      severity: 'success',
      message: res.message
    });
  };

  const handleRunWatchman = () => {
    const report = runNightlyMaintenance();
    setWatchmanReport(report);
  };

  return (
    <Container maxWidth="md">
      {/* KPI Stats Strip */}
      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid #E2E8F0', mb: 3, bgcolor: '#0F172A', color: '#FFFFFF' }}>
        <Grid container spacing={2} alignItems="center">
          <Grid size={{ xs: 6, sm: 3 }}>
            <Typography variant="caption" sx={{ color: '#94A3B8', textTransform: 'uppercase', fontWeight: 700 }}>
              Books Out
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 900, color: '#38BDF8' }}>
              {activeLoansCount}
            </Typography>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Typography variant="caption" sx={{ color: '#94A3B8', textTransform: 'uppercase', fontWeight: 700 }}>
              Overdue
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 900, color: '#F87171' }}>
              {overdueCount}
            </Typography>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Typography variant="caption" sx={{ color: '#94A3B8', textTransform: 'uppercase', fontWeight: 700 }}>
              Pending Approvals
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 900, color: '#FBBF24' }}>
              {pendingMembers.length}
            </Typography>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }} sx={{ textAlign: { sm: 'right' } }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<NightlightRoundIcon />}
              onClick={handleRunWatchman}
              sx={{ color: '#F59E0B', borderColor: '#F59E0B', fontWeight: 800, fontSize: '0.75rem', '&:hover': { bgcolor: 'rgba(245, 158, 11, 0.1)' } }}
            >
              Run Night Watchman
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Main Desk Circulation Form */}
      <Paper elevation={0} sx={{ p: { xs: 3, md: 4 }, borderRadius: 4, border: '1px solid #E2E8F0', mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 2, mb: 3, borderBottom: '1px solid #F1F5F9' }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A' }}>
              Circulation Fast Desk
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748B', mt: 0.5 }}>
              Issue physical books, process student returns, and manage shelf reservations.
            </Typography>
          </Box>
          <Button
            variant="outlined"
            size="small"
            startIcon={<PersonAddIcon />}
            onClick={() => setQuickAddOpen(true)}
            sx={{ fontWeight: 800, color: '#0F172A', borderColor: '#CBD5E1' }}
          >
            Quick Add Member
          </Button>
        </Box>

        {feedback && (
          <Alert severity={feedback.severity} sx={{ mb: 3, borderRadius: 3, fontWeight: 600 }}>
            {feedback.message}
          </Alert>
        )}

        {/* Hold Conflict Alert */}
        {holdWarning && (
          <Alert
            severity="warning"
            icon={<WarningAmberIcon />}
            action={
              <Button
                color="inherit"
                size="small"
                variant="outlined"
                onClick={(e) => handleIssue(e, true)}
                sx={{ fontWeight: 800 }}
              >
                Override & Issue
              </Button>
            }
            sx={{ mb: 3, borderRadius: 3, fontWeight: 700 }}
          >
            {holdWarning.message}
          </Alert>
        )}

        <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <TextField
            fullWidth
            label="1. Book Copy Code (Scan Barcode or Type)"
            placeholder="e.g. CU-0001, CU-0002"
            value={copyCode}
            onChange={(e) => setCopyCode(e.target.value.toUpperCase())}
            autoFocus
            InputProps={{
              sx: {
                borderRadius: 3,
                fontFamily: 'monospace',
                fontWeight: 800,
                fontSize: '1.1rem',
                bgcolor: '#F8FAFC',
              },
            }}
            helperText="Located on the library barcode sticker affixed to the front or back cover."
          />

          <TextField
            fullWidth
            label="2. Member Registration Number / Email (For Issue)"
            placeholder="e.g. CU/2024/0482 or student@student.ac.ke"
            value={memberId}
            onChange={(e) => setMemberId(e.target.value)}
            InputProps={{
              sx: { borderRadius: 3, bgcolor: '#F8FAFC', fontWeight: 600 },
            }}
            helperText="Required when issuing a book; leave empty when recording returns."
          />

          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Button
                fullWidth
                variant="contained"
                size="large"
                startIcon={<FlashOnIcon />}
                onClick={(e) => handleIssue(e, false)}
                sx={{
                  py: 1.75,
                  bgcolor: '#0F172A',
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  '&:hover': { bgcolor: '#1E293B' },
                }}
              >
                Issue Book (14 Days)
              </Button>
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <Button
                fullWidth
                variant="contained"
                size="large"
                startIcon={<AssignmentReturnIcon />}
                onClick={handleReturn}
                sx={{
                  py: 1.75,
                  bgcolor: '#10B981',
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  '&:hover': { bgcolor: '#059669' },
                }}
              >
                Record Return
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Paper>

      {/* Pending Member Approvals Panel */}
      {pendingMembers.length > 0 && (
        <Paper elevation={0} sx={{ p: 3, borderRadius: 4, border: '1px solid #FCD34D', bgcolor: '#FFFDF5', mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#92400E' }}>
                Pending Member Approvals ({pendingMembers.length})
              </Typography>
              <Typography variant="body2" sx={{ color: '#B45309' }}>
                Verify CU student credentials before enabling borrowing privileges.
              </Typography>
            </Box>
          </Box>
          <Stack spacing={1.5}>
            {pendingMembers.map((m) => (
              <Paper
                key={m.id}
                variant="outlined"
                sx={{ p: 2, borderRadius: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#FFFFFF' }}
              >
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0F172A' }}>
                    {m.full_name}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748B' }}>
                    Reg No: {m.reg_no || 'N/A'} • Email: {m.email} • Phone: {m.phone_whatsapp}
                  </Typography>
                </Box>
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<HowToRegIcon />}
                  onClick={() => {
                    const res = approveMember(m.id);
                    setFeedback({ severity: 'success', message: `Approved membership for ${m.full_name}.` });
                  }}
                  sx={{ bgcolor: '#059669', color: '#FFFFFF', fontWeight: 800, '&:hover': { bgcolor: '#047857' } }}
                >
                  Approve
                </Button>
              </Paper>
            ))}
          </Stack>
        </Paper>
      )}

      {/* Quick Code Shortcuts Reference */}
      <Paper elevation={0} sx={{ p: 3, borderRadius: 4, border: '1px solid #E2E8F0' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0F172A', mb: 2 }}>
          Quick Code Shortcuts:
        </Typography>
        <Grid container spacing={1.5}>
          {books.flatMap((b) =>
            b.copies?.map((c) => (
              <Grid key={c.id} size={{ xs: 6, sm: 4, md: 3 }}>
                <Paper
                  variant="outlined"
                  onClick={() => setCopyCode(c.copy_code)}
                  sx={{
                    p: 1.5,
                    cursor: 'pointer',
                    borderRadius: 2.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    '&:hover': { borderColor: '#F59E0B', bgcolor: '#FFFBEB' },
                  }}
                >
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 800, color: '#0F172A' }}>
                    {c.copy_code}
                  </Typography>
                  <Chip
                    size="small"
                    label={c.status === 'AVAILABLE' ? 'On Shelf' : c.status === 'RESERVED' ? 'Held' : 'Out'}
                    sx={{
                      height: 20,
                      fontSize: '0.65rem',
                      fontWeight: 800,
                      bgcolor: c.status === 'AVAILABLE' ? '#ECFDF5' : c.status === 'RESERVED' ? '#FFFBEB' : '#FFF1F2',
                      color: c.status === 'AVAILABLE' ? '#065F46' : c.status === 'RESERVED' ? '#B45309' : '#BE123C',
                    }}
                  />
                </Paper>
              </Grid>
            ))
          )}
        </Grid>
      </Paper>

      {/* Quick Add Member Dialog */}
      <Dialog open={quickAddOpen} onClose={() => setQuickAddOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle sx={{ fontWeight: 800, color: '#0F172A' }}>
          Quick Add Member (On the Spot)
        </DialogTitle>
        <DialogContent dividers>
          <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Student Full Name"
              placeholder="e.g. Elvis Marube"
              size="small"
              fullWidth
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              required
            />
            <TextField
              label="Registration / ID Number"
              placeholder="e.g. S13/02982/23"
              size="small"
              fullWidth
              value={newMemberReg}
              onChange={(e) => setNewMemberReg(e.target.value)}
              required
            />
            <TextField
              label="Email Address"
              placeholder="e.g. elvis@student.ac.ke"
              type="email"
              size="small"
              fullWidth
              value={newMemberEmail}
              onChange={(e) => setNewMemberEmail(e.target.value)}
              required
            />
            <TextField
              label="WhatsApp Phone Number"
              placeholder="+2547XXXXXXXX"
              size="small"
              fullWidth
              value={newMemberPhone}
              onChange={(e) => setNewMemberPhone(e.target.value)}
            />
            <Typography variant="caption" sx={{ color: '#64748B' }}>
              Note: Member will be approved immediately for desk issuing and will set password via their email link.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setQuickAddOpen(false)} sx={{ color: '#64748B' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleQuickAddSubmit}
            sx={{ bgcolor: '#0F172A', color: '#FFFFFF', fontWeight: 800 }}
          >
            Register & Approve
          </Button>
        </DialogActions>
      </Dialog>

      {/* Night Watchman Report Modal */}
      {watchmanReport && (
        <Dialog open={Boolean(watchmanReport)} onClose={() => setWatchmanReport(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
          <DialogTitle sx={{ fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 1 }}>
            <NightlightRoundIcon sx={{ color: '#F59E0B' }} /> Night Watchman Report
          </DialogTitle>
          <DialogContent dividers>
            <Stack spacing={1.5}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" sx={{ color: '#64748B' }}>Loans Marked Overdue:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 800 }}>{watchmanReport.loans_marked_overdue}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" sx={{ color: '#64748B' }}>Fines Accrued / Updated:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 800 }}>{watchmanReport.fines_updated_or_created}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" sx={{ color: '#64748B' }}>Expired 3-Day Holds Cancelled:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 800 }}>{watchmanReport.reservations_expired}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" sx={{ color: '#64748B' }}>Queued Members Advanced:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 800 }}>{watchmanReport.reservations_passed_to_next}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" sx={{ color: '#64748B' }}>Overdue Reminders Ready:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 800, color: '#DC2626' }}>{watchmanReport.overdue_reminders_count}</Typography>
              </Box>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button
              variant="contained"
              onClick={() => setWatchmanReport(null)}
              sx={{ bgcolor: '#0F172A', color: '#FFFFFF', fontWeight: 800 }}
            >
              Done
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Container>
  );
}
