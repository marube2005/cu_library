'use client';

import React, { useState, useRef, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Container,
  Paper,
  Typography,
  Button,
  Box,
  Alert,
  CircularProgress,
  Stack,
  TextField,
} from '@mui/material';
import VerifiedIcon from '@mui/icons-material/Verified';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import RefreshIcon from '@mui/icons-material/Refresh';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

function VerifyOTPContent() {
  const searchParams = useSearchParams();
  const emailFromQuery = searchParams.get('email') || '';

  const [email] = useState(emailFromQuery);
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [resendMsg, setResendMsg] = useState('');
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Auto-focus first box on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleDigitChange = (index: number, value: string) => {
    // Accept only digits
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    setErrorMsg('');

    // Auto-advance
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all filled
    if (digit && index === 5) {
      const full = next.join('');
      if (full.length === 6) handleVerify(full);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const next = [...digits];
    pasted.split('').forEach((ch, i) => { if (i < 6) next[i] = ch; });
    setDigits(next);
    if (pasted.length === 6) {
      inputRefs.current[5]?.focus();
      handleVerify(pasted);
    } else {
      inputRefs.current[pasted.length]?.focus();
    }
  };

  const handleVerify = async (code?: string) => {
    const otp = code || digits.join('');
    if (otp.length < 6) {
      setErrorMsg('Please enter all 6 digits of your verification code.');
      return;
    }
    if (!email) {
      setErrorMsg('Email address is missing. Please go back to registration or sign in.');
      return;
    }

    setVerifying(true);
    setErrorMsg('');
    try {
      const res = await fetch(`${API}/auth/verify-otp/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), otp }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setVerified(true);
      } else {
        setErrorMsg(data.detail || 'Incorrect code. Please check your email and try again.');
        setDigits(['', '', '', '', '', '']);
        setTimeout(() => inputRefs.current[0]?.focus(), 50);
      }
    } catch {
      setErrorMsg('Could not connect to server. Please check your connection.');
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    if (!email) return;
    setResending(true);
    setResendMsg('');
    try {
      const res = await fetch(`${API}/auth/resend-verification/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      setResendMsg(data.message || 'A new code was sent to your inbox.');
      setCountdown(60);
      setDigits(['', '', '', '', '', '']);
      setTimeout(() => inputRefs.current[0]?.focus(), 50);
    } catch {
      setResendMsg('A new code was sent to your inbox.');
      setCountdown(60);
    } finally {
      setResending(false);
    }
  };

  if (verified) {
    return (
      <Paper elevation={0} sx={{ p: { xs: 3, md: 5 }, borderRadius: 4, border: '1px solid #E2E8F0', textAlign: 'center' }}>
        <VerifiedIcon sx={{ fontSize: 72, color: '#10B981', mb: 2 }} />
        <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A', mb: 1 }}>
          Email Verified!
        </Typography>
        <Typography variant="body1" sx={{ color: '#475569', mb: 3 }}>
          Your CU Library account is now active. You can sign in.
        </Typography>
        <Button
          component={Link}
          href="/login"
          variant="contained"
          size="large"
          sx={{ bgcolor: '#0F172A', color: '#FFFFFF', fontWeight: 800, px: 5, py: 1.5, borderRadius: 2, '&:hover': { bgcolor: '#1E293B' } }}
        >
          Proceed to Login
        </Button>
      </Paper>
    );
  }

  return (
    <Paper elevation={0} sx={{ p: { xs: 3, md: 5 }, borderRadius: 4, border: '1px solid #E2E8F0', textAlign: 'center' }}>
      {/* Icon & Header */}
      <Box sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 64, height: 64, borderRadius: '50%', bgcolor: '#FFFBEB', mb: 2 }}>
        <MarkEmailReadIcon sx={{ fontSize: 36, color: '#F59E0B' }} />
      </Box>
      <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A', mb: 0.5 }}>
        Check Your Email
      </Typography>
      <Typography variant="body2" sx={{ color: '#64748B', mb: 0.5 }}>
        We sent a 6-digit verification code to
      </Typography>
      <Typography variant="body1" sx={{ fontWeight: 700, color: '#0F172A', mb: 3 }}>
        {email || 'your email address'}
      </Typography>

      {/* Error / Resend alerts */}
      {errorMsg && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2.5, textAlign: 'left' }}>{errorMsg}</Alert>
      )}
      {resendMsg && (
        <Alert severity="success" sx={{ mb: 2, borderRadius: 2.5, textAlign: 'left' }}>{resendMsg}</Alert>
      )}

      {/* 6-digit OTP boxes */}
      <Stack direction="row" spacing={1} justifyContent="center" sx={{ mb: 3 }} onPaste={handlePaste}>
        {digits.map((digit, i) => (
          <TextField
            key={i}
            inputRef={(el) => { inputRefs.current[i] = el; }}
            value={digit}
            onChange={(e) => handleDigitChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            inputProps={{
              maxLength: 1,
              style: {
                textAlign: 'center',
                fontSize: '1.6rem',
                fontWeight: 900,
                padding: '12px 0',
                color: '#0F172A',
              },
            }}
            sx={{
              width: 52,
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                bgcolor: digit ? '#FFFBEB' : '#F8FAFC',
                '& fieldset': { borderColor: digit ? '#F59E0B' : '#CBD5E1', borderWidth: digit ? 2 : 1 },
                '&:hover fieldset': { borderColor: '#F59E0B' },
                '&.Mui-focused fieldset': { borderColor: '#F59E0B', borderWidth: 2 },
              },
            }}
          />
        ))}
      </Stack>

      {/* Submit button */}
      <Button
        fullWidth
        variant="contained"
        size="large"
        disabled={verifying || digits.join('').length < 6}
        onClick={() => handleVerify()}
        sx={{
          py: 1.5,
          bgcolor: '#0F172A',
          color: '#FFFFFF',
          fontWeight: 800,
          borderRadius: 2,
          '&:hover': { bgcolor: '#1E293B' },
          mb: 2,
        }}
      >
        {verifying ? <CircularProgress size={22} color="inherit" /> : 'Verify Email'}
      </Button>

      {/* Resend */}
      <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
        <Typography variant="body2" sx={{ color: '#64748B' }}>
          Didn&apos;t receive a code?
        </Typography>
        <Button
          size="small"
          startIcon={<RefreshIcon />}
          onClick={handleResend}
          disabled={resending || countdown > 0}
          sx={{ fontWeight: 700, color: countdown > 0 ? '#94A3B8' : '#F59E0B', textTransform: 'none' }}
        >
          {countdown > 0 ? `Resend in ${countdown}s` : resending ? 'Sending...' : 'Resend Code'}
        </Button>
      </Stack>

      <Box sx={{ mt: 3 }}>
        <Button component={Link} href="/login" size="small" sx={{ color: '#64748B', textTransform: 'none' }}>
          &larr; Back to Login
        </Button>
      </Box>
    </Paper>
  );
}

export default function VerifyEmailPage() {
  return (
    <Container maxWidth="sm" sx={{ mt: { xs: 4, md: 8 }, mb: 6 }}>
      <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>}>
        <VerifyOTPContent />
      </Suspense>
    </Container>
  );
}
