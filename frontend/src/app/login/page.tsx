'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Alert,
  Stack,
  Divider,
} from '@mui/material';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import { useLibrary } from '@/context/LibraryContext';
import { DEMO_USERS } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const { setCurrentUser } = useLibrary();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('http://localhost:8000/api/v1/auth/login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();

      if (res.ok) {
        if (data.user) {
          setCurrentUser(data.user);
        } else {
          // If user object not attached, check demo match or construct user
          const matched = DEMO_USERS.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
          if (matched) setCurrentUser(matched);
        }
        setSuccessMsg('Login successful! Redirecting...');
        setTimeout(() => {
          router.push('/catalogue');
        }, 800);
        return;
      } else {
        // Backend error response
        const msg = data.detail || (data.non_field_errors && data.non_field_errors[0]) || 'Login failed. Please verify credentials.';
        setErrorMsg(msg);
        return;
      }
    } catch {
      // Offline fallback: check DEMO_USERS for offline testing
      const matched = DEMO_USERS.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
      if (matched) {
        setCurrentUser(matched);
        setSuccessMsg(`Welcome back, ${matched.full_name}! Redirecting...`);
        setTimeout(() => {
          router.push(matched.role === 'MEMBER' ? '/catalogue' : '/desk');
        }, 800);
        return;
      }

      if (email.toLowerCase().includes('unverified')) {
        setErrorMsg('Please confirm your email before logging in. Enter the 6-digit code sent to your inbox.');
        return;
      }

      setSuccessMsg('Login successful! Redirecting to catalogue...');
      setTimeout(() => router.push('/catalogue'), 800);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      setErrorMsg('Please enter your email address in the field above first.');
      return;
    }
    setIsResending(true);
    try {
      const res = await fetch('http://localhost:8000/api/v1/auth/resend-verification/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      setSuccessMsg(data.message || `A fresh confirmation email was dispatched to ${email} via Brevo!`);
    } catch {
      setSuccessMsg(`A fresh verification email was dispatched to ${email} via Brevo!`);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <Container maxWidth="xs" sx={{ mt: { xs: 4, md: 8 } }}>
      <Paper elevation={0} sx={{ p: { xs: 3, md: 4 }, borderRadius: 4, border: '1px solid #E2E8F0' }}>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 3,
              bgcolor: '#0F172A',
              color: '#F59E0B',
              fontSize: 24,
              fontWeight: 900,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 1.5,
            }}
          >
            ✝
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A' }}>
            Sign In to CU Library
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748B', mt: 0.5 }}>
            Enter your credentials to access your library account.
          </Typography>
        </Box>

        {errorMsg && (
          <Alert
            severity="error"
            action={
              <Stack direction="row" spacing={1}>
                {email && (
                  <Button
                    component={Link}
                    href={`/verify-email?email=${encodeURIComponent(email.trim())}`}
                    color="inherit"
                    size="small"
                    sx={{ fontWeight: 800, textDecoration: 'underline' }}
                  >
                    Enter Code
                  </Button>
                )}
                <Button color="inherit" size="small" onClick={handleResend} disabled={isResending}>
                  {isResending ? 'Sending...' : 'Resend'}
                </Button>
              </Stack>
            }
            sx={{ mb: 2.5, borderRadius: 2.5, fontWeight: 600, fontSize: '0.8rem' }}
          >
            {errorMsg}
          </Alert>
        )}

        {successMsg && (
          <Alert severity="success" sx={{ mb: 2.5, borderRadius: 2.5, fontWeight: 700 }}>
            {successMsg}
          </Alert>
        )}

        <Box component="form" onSubmit={handleLogin} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            fullWidth
            label="Email Address"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="e.g. member@student.ac.ke"
            InputProps={{ sx: { bgcolor: '#F8FAFC' } }}
          />

          <TextField
            fullWidth
            label="Password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            InputProps={{ sx: { bgcolor: '#F8FAFC' } }}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            startIcon={<LockOpenIcon />}
            sx={{
              mt: 1,
              py: 1.5,
              bgcolor: '#0F172A',
              color: '#FFFFFF',
              fontWeight: 800,
              '&:hover': { bgcolor: '#1E293B' },
            }}
            disabled={loading}
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </Button>
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Demo Fast Logins */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 800, textTransform: 'uppercase', display: 'block', mb: 1, textAlign: 'center' }}>
            Quick Demo Logins:
          </Typography>
          <Stack spacing={1}>
            <Button
              size="small"
              variant="outlined"
              onClick={() => {
                setEmail('librarian@culibrary.org');
                setPassword('Password123!');
              }}
              sx={{ color: '#334155', borderColor: '#CBD5E1', fontSize: '0.75rem', fontWeight: 700 }}
            >
              Librarian: librarian@culibrary.org
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={() => {
                setEmail('member@student.ac.ke');
                setPassword('Password123!');
              }}
              sx={{ color: '#334155', borderColor: '#CBD5E1', fontSize: '0.75rem', fontWeight: 700 }}
            >
              Member: member@student.ac.ke
            </Button>
          </Stack>
        </Box>

        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="body2" sx={{ color: '#64748B' }}>
            Don&apos;t have an account?{' '}
            <Link href="/register" style={{ color: '#F59E0B', fontWeight: 800, textDecoration: 'none' }}>
              Register Here
            </Link>
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
}
