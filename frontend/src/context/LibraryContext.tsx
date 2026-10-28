'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  BookTitle,
  LoanRecord,
  FineRecord,
  ReservationRecord,
  UserProfile,
  INITIAL_BOOKS,
  INITIAL_LOANS,
  INITIAL_FINES,
  DEMO_USERS,
  buildWhatsAppLink
} from '@/lib/api';

const INITIAL_RESERVATIONS: ReservationRecord[] = [
  {
    id: 'res-01',
    title_id: 't-01',
    title_name: 'Mere Christianity',
    author: 'C.S. Lewis',
    member_id: 'u-faith',
    member_name: 'Faith Mutua',
    member_reg: 'CU/2024/0119',
    status: 'READY_FOR_PICKUP',
    queue_position: 0,
    hold_expires_at: new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString(),
    created_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString()
  }
];

interface MaintenanceReport {
  loans_marked_overdue: number;
  fines_updated_or_created: number;
  reservations_expired: number;
  reservations_passed_to_next: number;
  copies_freed_available: number;
  due_soon_reminders_count: number;
  overdue_reminders_count: number;
}

interface LibraryContextType {
  currentUser: UserProfile;
  setCurrentUser: (user: UserProfile) => void;
  allMembers: UserProfile[];
  setAllMembers: React.Dispatch<React.SetStateAction<UserProfile[]>>;
  books: BookTitle[];
  setBooks: React.Dispatch<React.SetStateAction<BookTitle[]>>;
  loans: LoanRecord[];
  setLoans: React.Dispatch<React.SetStateAction<LoanRecord[]>>;
  fines: FineRecord[];
  setFines: React.Dispatch<React.SetStateAction<FineRecord[]>>;
  reservations: ReservationRecord[];
  setReservations: React.Dispatch<React.SetStateAction<ReservationRecord[]>>;
  settings: {
    loanDays: number;
    maxBooks: number;
    renewalDays: number;
    graceDays: number;
    fineRate: number;
    fineBlockThreshold: number;
    dueSoonTemplate: string;
    overdueTemplate: string;
  };
  setSettings: React.Dispatch<React.SetStateAction<any>>;
  issueBook: (copyCode: string, memberIdent: string, overrideReservation?: boolean) => {
    success: boolean;
    message: string;
    requiresOverride?: boolean;
    heldFor?: string;
  };
  returnBook: (copyCode: string) => { success: boolean; message: string; fineAccrued: number };
  renewLoan: (loanId: string) => { success: boolean; message: string };
  requestHold: (bookId: string) => { success: boolean; message: string; type?: 'HOLD' | 'QUEUE' };
  recordPayment: (fineId: string, amount: number, method: 'CASH' | 'MPESA', ref: string) => void;
  waiveFine: (fineId: string, reason: string) => void;
  addBook: (title: BookTitle) => void;
  quickAddMember: (data: { full_name: string; email: string; phone_whatsapp: string; reg_no: string }) => {
    success: boolean;
    message: string;
    member?: UserProfile;
  };
  approveMember: (memberId: string) => { success: boolean; message: string };
  runNightlyMaintenance: () => MaintenanceReport;
  logout: () => void;
}

const LibraryContext = createContext<LibraryContextType | undefined>(undefined);

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const [allMembers, setAllMembers] = useState<UserProfile[]>(DEMO_USERS);
  const [currentUser, setCurrentUser] = useState<UserProfile>(DEMO_USERS[0]); // Default: Elvis (Librarian)
  const [books, setBooks] = useState<BookTitle[]>(INITIAL_BOOKS);
  const [loans, setLoans] = useState<LoanRecord[]>(INITIAL_LOANS);
  const [fines, setFines] = useState<FineRecord[]>(INITIAL_FINES);
  const [reservations, setReservations] = useState<ReservationRecord[]>(INITIAL_RESERVATIONS);

  const [settings, setSettings] = useState({
    loanDays: 14,
    maxBooks: 2,
    renewalDays: 7,
    graceDays: 2,
    fineRate: 5,
    fineBlockThreshold: 50,
    dueSoonTemplate: 'Hello {name}, a gentle reminder that {title} is due on {due_date}. Blessings, CU Library.',
    overdueTemplate: 'Hello {name}, {title} was due on {due_date}. Please return it. A fine of Ksh {fine} has accrued so far. Blessings, CU Library.'
  });

  // Issue Book with all desk rules, hold warnings, and reservation fulfillment
  const issueBook = (copyCode: string, memberIdent: string, overrideReservation = false) => {
    const codeClean = copyCode.trim().toUpperCase();
    const identClean = memberIdent.trim();

    if (!codeClean || !identClean) {
      return { success: false, message: 'Both Copy Code and Member Reg/ID are required.' };
    }

    // 1. Locate member
    const targetMember = allMembers.find(
      (m) =>
        m.email.toLowerCase() === identClean.toLowerCase() ||
        m.reg_no.toLowerCase() === identClean.toLowerCase() ||
        m.full_name.toLowerCase().includes(identClean.toLowerCase())
    ) || {
      id: `member-${Date.now()}`,
      full_name: identClean.includes('/') ? `Student (${identClean})` : identClean,
      email: `${identClean.toLowerCase().replace(/[^a-z0-9]/g, '')}@student.ac.ke`,
      phone_whatsapp: '+254712345678',
      reg_no: identClean,
      role: 'MEMBER' as const,
      status: 'APPROVED' as const,
      whatsapp_consent: true
    };

    // Rule: Member status must be APPROVED
    if (targetMember.status !== 'APPROVED') {
      return {
        success: false,
        message: `Member status is "${targetMember.status}". Account must be approved before borrowing books.`
      };
    }

    // Rule: Check overdue loans
    const memberOverdue = loans.some(
      (l) =>
        (l.member_name === targetMember.full_name || l.member_reg === targetMember.reg_no) &&
        (l.status === 'OVERDUE' || (l.status === 'ISSUED' && new Date() > new Date(l.due_date)))
    );
    if (memberOverdue) {
      return {
        success: false,
        message: `Member has an overdue book. Overdue items must be returned before new loans can be issued.`
      };
    }

    // Rule: Limit of max books
    const activeMemberLoans = loans.filter(
      (l) =>
        (l.member_name === targetMember.full_name || l.member_reg === targetMember.reg_no) &&
        (l.status === 'ISSUED' || l.status === 'OVERDUE')
    ).length;
    if (activeMemberLoans >= settings.maxBooks) {
      return {
        success: false,
        message: `Member has reached borrowing limit of ${settings.maxBooks} books.`
      };
    }

    // Rule: Unpaid fines threshold (Ksh 50)
    const memberUnpaidFines = fines
      .filter((f) => (f.member_name === targetMember.full_name || f.member_reg === targetMember.reg_no) && f.status === 'UNPAID')
      .reduce((sum, f) => sum + f.balance, 0);
    if (memberUnpaidFines > settings.fineBlockThreshold) {
      return {
        success: false,
        message: `Member has unpaid fines of Ksh ${memberUnpaidFines.toFixed(2)}, exceeding Ksh ${settings.fineBlockThreshold} threshold.`
      };
    }

    // 2. Locate copy
    let foundBook: BookTitle | null = null;
    let foundCopy = null;

    for (const b of books) {
      const c = b.copies?.find((cp) => cp.copy_code.toUpperCase() === codeClean);
      if (c) {
        foundBook = b;
        foundCopy = c;
        break;
      }
    }

    if (!foundCopy || !foundBook) {
      return { success: false, message: `Copy code "${codeClean}" not found on catalogue.` };
    }

    if (foundCopy.status !== 'AVAILABLE' && foundCopy.status !== 'RESERVED') {
      return { success: false, message: `Copy "${codeClean}" is currently ${foundCopy.status} and cannot be issued.` };
    }

    // 3. Check Reservation Hold Conflict
    if (foundCopy.status === 'RESERVED') {
      const activeRes = reservations.find(
        (r) => r.title_id === foundBook!.id && r.status === 'READY_FOR_PICKUP'
      );
      if (activeRes && activeRes.member_reg !== targetMember.reg_no && !overrideReservation) {
        const holdDateStr = activeRes.hold_expires_at
          ? new Date(activeRes.hold_expires_at).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
          : 'Friday';
        return {
          success: false,
          requiresOverride: true,
          heldFor: activeRes.member_name,
          message: `⚠️ Copy "${codeClean}" is currently held for ${activeRes.member_name} until ${holdDateStr}. Issue anyway or select another copy?`
        };
      }
    }

    // 4. Issue the Loan
    const today = new Date();
    const dueDate = new Date();
    dueDate.setDate(today.getDate() + settings.loanDays);

    const newLoan: LoanRecord = {
      id: `loan-${Date.now()}`,
      copy_code: codeClean,
      title_name: foundBook.title,
      author: foundBook.author,
      member_name: targetMember.full_name,
      member_reg: targetMember.reg_no,
      member_phone: targetMember.phone_whatsapp,
      issue_date: today.toISOString().split('T')[0],
      due_date: dueDate.toISOString().split('T')[0],
      renewals_count: 0,
      status: 'ISSUED',
      is_overdue: false,
      days_overdue: 0,
      fine_accrued: 0
    };

    setBooks((prev) =>
      prev.map((b) => {
        if (b.id === foundBook!.id) {
          return {
            ...b,
            available_copies: Math.max(0, b.available_copies - 1),
            copies: b.copies?.map((cp) => (cp.copy_code.toUpperCase() === codeClean ? { ...cp, status: 'BORROWED' } : cp))
          };
        }
        return b;
      })
    );

    // Fulfill reservation if this member held it
    setReservations((prev) =>
      prev.map((r) =>
        r.title_id === foundBook!.id && (r.member_reg === targetMember.reg_no || r.member_name === targetMember.full_name) && r.status === 'READY_FOR_PICKUP'
          ? { ...r, status: 'FULFILLED' }
          : r
      )
    );

    setLoans((prev) => [newLoan, ...prev]);
    return {
      success: true,
      message: `Issued "${foundBook.title}" (${codeClean}) to ${targetMember.full_name}. Due: ${dueDate.toLocaleDateString('en-GB')}`
    };
  };

  // Return Book logic with queue advancement & grace period fine calculation
  const returnBook = (copyCode: string) => {
    const codeClean = copyCode.trim().toUpperCase();
    if (!codeClean) {
      return { success: false, message: 'Please enter a Copy Code to return.', fineAccrued: 0 };
    }

    const loanIndex = loans.findIndex(
      (l) => l.copy_code.toUpperCase() === codeClean && (l.status === 'ISSUED' || l.status === 'OVERDUE')
    );

    if (loanIndex === -1) {
      return { success: false, message: `No active borrowed loan found for copy "${codeClean}".`, fineAccrued: 0 };
    }

    const targetLoan = loans[loanIndex];
    const today = new Date();
    const dueDate = new Date(targetLoan.due_date);

    let accruedFine = 0;
    if (today > dueDate) {
      const daysLate = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 3600 * 24));
      const chargeableDays = Math.max(0, daysLate - settings.graceDays);
      accruedFine = chargeableDays * settings.fineRate;
    }

    const updatedLoans = [...loans];
    updatedLoans[loanIndex] = {
      ...targetLoan,
      status: 'RETURNED',
      return_date: today.toISOString().split('T')[0],
      fine_accrued: accruedFine
    };
    setLoans(updatedLoans);

    // Check if someone is in queue for this title
    let foundBook = books.find((b) => b.copies?.some((cp) => cp.copy_code.toUpperCase() === codeClean));
    const nextQueuedRes = reservations
      .filter((r) => foundBook && r.title_id === foundBook.id && r.status === 'QUEUED')
      .sort((a, b) => a.queue_position - b.queue_position)[0];

    if (nextQueuedRes) {
      // Hold copy for the next student
      const holdExpiry = new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString();
      setReservations((prev) =>
        prev.map((r) =>
          r.id === nextQueuedRes.id
            ? { ...r, status: 'READY_FOR_PICKUP', hold_expires_at: holdExpiry }
            : r
        )
      );
      setBooks((prev) =>
        prev.map((b) => {
          if (foundBook && b.id === foundBook.id) {
            return {
              ...b,
              copies: b.copies?.map((cp) => (cp.copy_code.toUpperCase() === codeClean ? { ...cp, status: 'RESERVED' } : cp))
            };
          }
          return b;
        })
      );
    } else {
      // Free copy back to shelf
      setBooks((prev) =>
        prev.map((b) => {
          const hasCopy = b.copies?.some((cp) => cp.copy_code.toUpperCase() === codeClean);
          if (hasCopy) {
            return {
              ...b,
              available_copies: b.available_copies + 1,
              copies: b.copies?.map((cp) => (cp.copy_code.toUpperCase() === codeClean ? { ...cp, status: 'AVAILABLE' } : cp))
            };
          }
          return b;
        })
      );
    }

    if (accruedFine > 0) {
      const newFine: FineRecord = {
        id: `fine-${Date.now()}`,
        member_name: targetLoan.member_name,
        member_reg: targetLoan.member_reg,
        book_title: targetLoan.title_name,
        copy_code: targetLoan.copy_code,
        amount: accruedFine,
        paid_amount: 0,
        balance: accruedFine,
        status: 'UNPAID'
      };
      setFines((prev) => [newFine, ...prev]);
    }

    return {
      success: true,
      message: `Return recorded for ${codeClean}. ${accruedFine > 0 ? `Fine accrued: Ksh ${accruedFine.toFixed(2)}` : 'No fine.'} ${nextQueuedRes ? `(Held for next student in queue: ${nextQueuedRes.member_name})` : ''}`,
      fineAccrued: accruedFine
    };
  };

  // Renew Loan
  const renewLoan = (loanId: string) => {
    let msg = '';
    let success = false;
    setLoans((prev) =>
      prev.map((l) => {
        if (l.id === loanId) {
          if (l.renewals_count >= 1) {
            msg = 'Maximum renewals limit (1 renewal) already reached.';
            return l;
          }
          // Check if anyone is waiting
          const book = books.find((b) => b.title === l.title_name);
          const hasWaiting = reservations.some((r) => book && r.title_id === book.id && r.status === 'QUEUED');
          if (hasWaiting) {
            msg = 'Cannot renew: another member is waiting in the reservation queue.';
            return l;
          }

          const currentDue = new Date(l.due_date);
          currentDue.setDate(currentDue.getDate() + settings.renewalDays);
          success = true;
          msg = `Loan extended by +${settings.renewalDays} days!`;
          return {
            ...l,
            due_date: currentDue.toISOString().split('T')[0],
            renewals_count: l.renewals_count + 1,
            status: 'ISSUED',
            is_overdue: false
          };
        }
        return l;
      })
    );
    return { success, message: msg };
  };

  // Member Request Hold (3 days) or Reserve (Queue)
  const requestHold = (bookId: string) => {
    if (!currentUser) {
      return { success: false, message: 'Please sign in to request books.' };
    }

    // 1. Account status check
    if (currentUser.status !== 'APPROVED') {
      return {
        success: false,
        message: `Your account status is ${currentUser.status}. Only approved members can request or reserve books.`
      };
    }

    // 2. Overdue loan check
    const hasOverdue = loans.some(
      (l) =>
        (l.member_name === currentUser.full_name || l.member_reg === currentUser.reg_no) &&
        (l.status === 'OVERDUE' || (l.status === 'ISSUED' && new Date() > new Date(l.due_date)))
    );
    if (hasOverdue) {
      return {
        success: false,
        message: 'You have an overdue book that must be returned first.'
      };
    }

    // 3. Limit of max books
    const activeBorrowed = loans.filter(
      (l) =>
        (l.member_name === currentUser.full_name || l.member_reg === currentUser.reg_no) &&
        (l.status === 'ISSUED' || l.status === 'OVERDUE')
    ).length;
    const activeHolds = reservations.filter(
      (r) =>
        (r.member_name === currentUser.full_name || r.member_reg === currentUser.reg_no) &&
        r.status === 'READY_FOR_PICKUP'
    ).length;

    if (activeBorrowed + activeHolds >= settings.maxBooks) {
      return {
        success: false,
        message: `You have reached your borrowing/hold limit of ${settings.maxBooks} books.`
      };
    }

    // 4. Unpaid fines check (Ksh 50)
    const unpaidTotal = fines
      .filter((f) => (f.member_name === currentUser.full_name || f.member_reg === currentUser.reg_no) && f.status === 'UNPAID')
      .reduce((sum, f) => sum + f.balance, 0);
    if (unpaidTotal > settings.fineBlockThreshold) {
      return {
        success: false,
        message: `You have unpaid fines of Ksh ${unpaidTotal.toFixed(2)}, exceeding the Ksh ${settings.fineBlockThreshold} threshold.`
      };
    }

    // 5. Duplicate check
    const book = books.find((b) => b.id === bookId);
    if (!book) {
      return { success: false, message: 'Book not found.' };
    }

    const alreadyHas =
      loans.some(
        (l) =>
          l.title_name === book.title &&
          (l.member_name === currentUser.full_name || l.member_reg === currentUser.reg_no) &&
          (l.status === 'ISSUED' || l.status === 'OVERDUE')
      ) ||
      reservations.some(
        (r) =>
          r.title_id === book.id &&
          (r.member_name === currentUser.full_name || r.member_reg === currentUser.reg_no) &&
          (r.status === 'READY_FOR_PICKUP' || r.status === 'QUEUED')
      );

    if (alreadyHas) {
      return { success: false, message: 'You already have an active loan or reservation for this book.' };
    }

    // Free copy available?
    if (book.available_copies > 0) {
      const holdExpiry = new Date(Date.now() + 3 * 24 * 3600 * 1000);
      const newReservation: ReservationRecord = {
        id: `res-${Date.now()}`,
        title_id: book.id,
        title_name: book.title,
        author: book.author,
        member_id: currentUser.id,
        member_name: currentUser.full_name,
        member_reg: currentUser.reg_no,
        status: 'READY_FOR_PICKUP',
        queue_position: 0,
        hold_expires_at: holdExpiry.toISOString(),
        created_at: new Date().toISOString()
      };

      setReservations((prev) => [newReservation, ...prev]);

      // Decrement copy
      setBooks((prev) =>
        prev.map((b) => {
          if (b.id === book.id) {
            let reservedOne = false;
            return {
              ...b,
              available_copies: Math.max(0, b.available_copies - 1),
              copies: b.copies?.map((cp) => {
                if (!reservedOne && cp.status === 'AVAILABLE') {
                  reservedOne = true;
                  return { ...cp, status: 'RESERVED' };
                }
                return cp;
              })
            };
          }
          return b;
        })
      );

      return {
        success: true,
        type: 'HOLD' as const,
        message: `Hold requested! "${book.title}" is reserved for you. Please collect it at the library circulation desk within 3 days (by ${holdExpiry.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}).`
      };
    } else {
      const queuePos = reservations.filter((r) => r.title_id === book.id && r.status === 'QUEUED').length + 1;
      const newReservation: ReservationRecord = {
        id: `res-${Date.now()}`,
        title_id: book.id,
        title_name: book.title,
        author: book.author,
        member_id: currentUser.id,
        member_name: currentUser.full_name,
        member_reg: currentUser.reg_no,
        status: 'QUEUED',
        queue_position: queuePos,
        created_at: new Date().toISOString()
      };

      setReservations((prev) => [...prev, newReservation]);
      return {
        success: true,
        type: 'QUEUE' as const,
        message: `All shelf copies are out. You have joined the reservation queue for "${book.title}" at position #${queuePos}.`
      };
    }
  };

  // Quick Add Member at Desk
  const quickAddMember = (data: { full_name: string; email: string; phone_whatsapp: string; reg_no: string }) => {
    const newMember: UserProfile = {
      id: `u-${Date.now()}`,
      full_name: data.full_name,
      email: data.email,
      phone_whatsapp: data.phone_whatsapp,
      reg_no: data.reg_no,
      role: 'MEMBER',
      status: 'APPROVED',
      whatsapp_consent: true
    };
    setAllMembers((prev) => [newMember, ...prev]);
    return {
      success: true,
      message: `Member ${newMember.full_name} (${newMember.reg_no}) registered and approved immediately!`,
      member: newMember
    };
  };

  // Approve pending member
  const approveMember = (memberId: string) => {
    setAllMembers((prev) =>
      prev.map((m) => (m.id === memberId || m.email === memberId ? { ...m, status: 'APPROVED' } : m))
    );
    if (currentUser.id === memberId || currentUser.email === memberId) {
      setCurrentUser((prev) => ({ ...prev, status: 'APPROVED' }));
    }
    return { success: true, message: 'Member registration approved successfully.' };
  };

  // Nightly Watchman maintenance routine
  const runNightlyMaintenance = (): MaintenanceReport => {
    const today = new Date();
    let overdueMarked = 0;
    let finesUpdated = 0;
    let expiredHolds = 0;
    let passedToNext = 0;
    let copiesFreed = 0;
    let dueSoonCount = 0;
    let overdueCount = 0;

    // Check loans
    const updatedLoans = loans.map((l) => {
      const due = new Date(l.due_date);
      if (today > due && l.status === 'ISSUED') {
        overdueMarked++;
        overdueCount++;
        const daysLate = Math.floor((today.getTime() - due.getTime()) / (1000 * 3600 * 24));
        const chargeable = Math.max(0, daysLate - settings.graceDays);
        const fineAccrued = chargeable * settings.fineRate;
        if (fineAccrued > 0) finesUpdated++;
        return {
          ...l,
          status: 'OVERDUE' as const,
          is_overdue: true,
          days_overdue: daysLate,
          fine_accrued: fineAccrued
        };
      }
      return l;
    });
    setLoans(updatedLoans);

    // Check reservations (expired 3-day holds)
    const nowTime = today.getTime();
    const updatedRes = reservations.map((r) => {
      if (r.status === 'READY_FOR_PICKUP' && r.hold_expires_at && new Date(r.hold_expires_at).getTime() < nowTime) {
        expiredHolds++;
        return { ...r, status: 'EXPIRED' as const };
      }
      return r;
    });
    setReservations(updatedRes);

    return {
      loans_marked_overdue: overdueMarked,
      fines_updated_or_created: finesUpdated,
      reservations_expired: expiredHolds,
      reservations_passed_to_next: passedToNext,
      copies_freed_available: copiesFreed,
      due_soon_reminders_count: dueSoonCount,
      overdue_reminders_count: overdueCount
    };
  };

  // Record fine payment
  const recordPayment = (fineId: string, amount: number, method: 'CASH' | 'MPESA', ref: string) => {
    setFines((prev) =>
      prev.map((f) => {
        if (f.id === fineId) {
          const newPaid = f.paid_amount + amount;
          const newBalance = Math.max(0, f.amount - newPaid);
          return {
            ...f,
            paid_amount: newPaid,
            balance: newBalance,
            status: newBalance <= 0 ? 'PAID' : 'PARTIAL'
          };
        }
        return f;
      })
    );
  };

  // Waive fine
  const waiveFine = (fineId: string, reason: string) => {
    setFines((prev) =>
      prev.map((f) => {
        if (f.id === fineId) {
          return {
            ...f,
            balance: 0,
            status: 'WAIVED',
            waive_reason: reason
          };
        }
        return f;
      })
    );
  };

  // Add Book
  const addBook = (title: BookTitle) => {
    setBooks((prev) => [title, ...prev]);
  };

  const logout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
    }
    // Set to demo guest or redirect to login
    window.location.href = '/login';
  };

  return (
    <LibraryContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        allMembers,
        setAllMembers,
        books,
        setBooks,
        loans,
        setLoans,
        fines,
        setFines,
        reservations,
        setReservations,
        settings,
        setSettings,
        issueBook,
        returnBook,
        renewLoan,
        requestHold,
        recordPayment,
        waiveFine,
        addBook,
        quickAddMember,
        approveMember,
        runNightlyMaintenance,
        logout
      }}
    >
      {children}
    </LibraryContext.Provider>
  );
}

export function useLibrary() {
  const context = useContext(LibraryContext);
  if (!context) {
    throw new Error('useLibrary must be used within a LibraryProvider');
  }
  return context;
}
