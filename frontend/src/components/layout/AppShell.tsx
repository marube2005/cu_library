'use client';

import React from 'react';
import Navbar from './Navbar';
import { useLibrary } from '@/context/LibraryContext';
import { Box } from '@mui/material';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { currentUser, setCurrentUser } = useLibrary();

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: '#F8FAFC' }}>
      <Navbar currentUser={currentUser} onUserChange={setCurrentUser} />
      <Box component="main" sx={{ flexGrow: 1, py: { xs: 3, md: 4 } }}>
        {children}
      </Box>
    </Box>
  );
}
