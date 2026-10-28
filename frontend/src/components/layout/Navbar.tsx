'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Container,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Stack,
  useTheme,
  useMediaQuery
} from '@mui/material';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PaymentsIcon from '@mui/icons-material/Payments';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import SettingsIcon from '@mui/icons-material/Settings';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import MenuIcon from '@mui/icons-material/Menu';
import { DEMO_USERS, UserProfile } from '@/lib/api';

interface NavbarProps {
  currentUser: UserProfile;
  onUserChange: (user: UserProfile) => void;
}

export default function Navbar({ currentUser, onUserChange }: NavbarProps) {
  const pathname = usePathname();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [mobileMenuEl, setMobileMenuEl] = React.useState<null | HTMLElement>(null);

  const handleOpenUserMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseUserMenu = () => {
    setAnchorEl(null);
  };

  const handleOpenMobileMenu = (event: React.MouseEvent<HTMLElement>) => {
    setMobileMenuEl(event.currentTarget);
  };

  const handleCloseMobileMenu = () => {
    setMobileMenuEl(null);
  };

  // Nav items based on role
  const navItems = [
    { label: 'Catalogue', href: '/catalogue', icon: <AutoStoriesIcon fontSize="small" /> },
    ...(currentUser.role !== 'MEMBER'
      ? [
          { label: 'Circulation Desk', href: '/desk', icon: <FlashOnIcon fontSize="small" /> },
          { label: 'Loans & Overdue', href: '/loans', icon: <AccessTimeIcon fontSize="small" /> },
          { label: 'Fines & Payments', href: '/fines', icon: <PaymentsIcon fontSize="small" /> },
          { label: 'Add Books', href: '/inventory', icon: <AddCircleOutlineIcon fontSize="small" /> },
        ]
      : [
          { label: 'My Loans', href: '/my-loans', icon: <AccountCircleIcon fontSize="small" /> },
        ]),
    ...(currentUser.role === 'LIBRARIAN'
      ? [{ label: 'Settings', href: '/settings', icon: <SettingsIcon fontSize="small" /> }]
      : []),
  ];

  return (
    <AppBar position="sticky" elevation={1} sx={{ backgroundColor: '#0F172A', borderBottom: '1px solid #1E293B' }}>
      <Container maxWidth="xl">
        <Toolbar disableGutters sx={{ minHeight: { xs: 64, md: 72 } }}>
          {/* Brand Logo & Name */}
          <Box component={Link} href="/catalogue" sx={{ display: 'flex', alignItems: 'center', textDecoration: 'none', color: 'inherit', mr: 3 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: '12px',
                backgroundColor: '#F59E0B',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                color: '#0F172A',
                fontSize: 22,
                mr: 1.5,
                boxShadow: '0 2px 8px rgba(245, 158, 11, 0.4)',
              }}
            >
              ✝
            </Box>
            <Box>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: '-0.02em', color: '#FFFFFF', lineHeight: 1.2 }}>
                  CU Library
                </Typography>
                <Chip
                  label="PWA"
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    backgroundColor: 'rgba(245, 158, 11, 0.2)',
                    color: '#FBBF24',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                  }}
                />
              </Stack>
              <Typography variant="caption" sx={{ color: '#94A3B8', fontSize: '0.7rem', display: { xs: 'none', sm: 'block' } }}>
                Christian Union Literature Ministry
              </Typography>
            </Box>
          </Box>

          {/* Desktop Navigation Links */}
          {!isMobile && (
            <Box sx={{ flexGrow: 1, display: 'flex', gap: 1 }}>
              {navItems.map((item) => {
                const isActive = pathname === item.href || (item.href === '/catalogue' && pathname === '/');
                return (
                  <Button
                    key={item.href}
                    component={Link}
                    href={item.href}
                    startIcon={item.icon}
                    sx={{
                      px: 2,
                      py: 1,
                      color: isActive ? '#0F172A' : '#E2E8F0',
                      backgroundColor: isActive ? '#F59E0B' : 'transparent',
                      fontWeight: isActive ? 800 : 600,
                      '&:hover': {
                        backgroundColor: isActive ? '#D97706' : 'rgba(255, 255, 255, 0.08)',
                      },
                    }}
                  >
                    {item.label}
                  </Button>
                );
              })}
            </Box>
          )}

          {/* Right Section: User & Account Switcher */}
          <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {/* Quick Login / Register Links - only when not signed in */}
            {(!currentUser || !currentUser.id) && (
              <>
                <Button
                  component={Link}
                  href="/login"
                  variant="outlined"
                  size="small"
                  sx={{
                    color: '#E2E8F0',
                    borderColor: '#334155',
                    display: { xs: 'none', sm: 'inline-flex' },
                    '&:hover': { borderColor: '#F59E0B', color: '#F59E0B' },
                  }}
                >
                  Sign In
                </Button>
                <Button
                  component={Link}
                  href="/register"
                  variant="contained"
                  size="small"
                  sx={{
                    backgroundColor: '#F59E0B',
                    color: '#0F172A',
                    fontWeight: 800,
                    display: { xs: 'none', sm: 'inline-flex' },
                    '&:hover': { backgroundColor: '#D97706' },
                  }}
                >
                  Sign Up
                </Button>
              </>
            )}

            {/* Profile Avatar & Switcher */}
            {currentUser && currentUser.id && (
              <Chip
                avatar={<Avatar sx={{ bgcolor: '#F59E0B', color: '#0F172A', fontWeight: 800 }}>{currentUser.full_name[0]}</Avatar>}
                label={
                  <Box sx={{ textAlign: 'left', py: 0.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.75rem', lineHeight: 1.1 }}>
                      {currentUser.full_name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#94A3B8', fontSize: '0.65rem' }}>
                      {currentUser.role}
                    </Typography>
                  </Box>
                }
                onClick={handleOpenUserMenu}
                sx={{
                  backgroundColor: '#1E293B',
                  color: '#FFFFFF',
                  border: '1px solid #334155',
                  cursor: 'pointer',
                  height: 38,
                  '&:hover': { backgroundColor: '#2D3748' },
                }}
              />
            )}

            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleCloseUserMenu}
              PaperProps={{
                sx: {
                  mt: 1.5,
                  backgroundColor: '#1E293B',
                  color: '#FFFFFF',
                  border: '1px solid #334155',
                  minWidth: 220,
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                },
              }}
            >
              <Box sx={{ px: 2, py: 1, borderBottom: '1px solid #334155' }}>
                <Typography variant="caption" sx={{ color: '#F59E0B', fontWeight: 800 }}>
                  SWITCH DEMO PROFILE:
                </Typography>
              </Box>
              {DEMO_USERS.map((usr) => (
                <MenuItem
                  key={usr.id}
                  selected={usr.id === currentUser?.id}
                  onClick={() => {
                    onUserChange(usr);
                    handleCloseUserMenu();
                  }}
                  sx={{
                    fontSize: '0.85rem',
                    '&.Mui-selected': { backgroundColor: 'rgba(245, 158, 11, 0.2)', color: '#FBBF24', fontWeight: 700 },
                    '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.08)' },
                  }}
                >
                  {usr.full_name} ({usr.role})
                </MenuItem>
              ))}
              <Box sx={{ borderTop: '1px solid #334155', mt: 1 }}>
                <MenuItem component={Link} href="/login" onClick={handleCloseUserMenu} sx={{ fontSize: '0.85rem' }}>
                  🔑 Go to Login Page
                </MenuItem>
                <MenuItem component={Link} href="/register" onClick={handleCloseUserMenu} sx={{ fontSize: '0.85rem' }}>
                  📝 Member Registration
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    handleCloseUserMenu();
                    if (typeof window !== 'undefined') {
                      localStorage.clear();
                      window.location.href = '/login';
                    }
                  }}
                  sx={{ fontSize: '0.85rem', color: '#F87171', fontWeight: 700 }}
                >
                  🚪 Sign Out
                </MenuItem>
              </Box>
            </Menu>

            {/* Mobile Hamburger Button */}
            {isMobile && (
              <IconButton onClick={handleOpenMobileMenu} sx={{ color: '#FFFFFF' }}>
                <MenuIcon />
              </IconButton>
            )}

            <Menu
              anchorEl={mobileMenuEl}
              open={Boolean(mobileMenuEl)}
              onClose={handleCloseMobileMenu}
              PaperProps={{
                sx: {
                  backgroundColor: '#0F172A',
                  color: '#FFFFFF',
                  width: 200,
                  border: '1px solid #334155',
                },
              }}
            >
              {navItems.map((item) => (
                <MenuItem
                  key={item.href}
                  component={Link}
                  href={item.href}
                  onClick={handleCloseMobileMenu}
                  sx={{
                    fontWeight: pathname === item.href ? 800 : 500,
                    color: pathname === item.href ? '#F59E0B' : '#E2E8F0',
                  }}
                >
                  {item.label}
                </MenuItem>
              ))}
              <MenuItem component={Link} href="/login" onClick={handleCloseMobileMenu}>
                Sign In
              </MenuItem>
              <MenuItem component={Link} href="/register" onClick={handleCloseMobileMenu}>
                Sign Up
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
}
