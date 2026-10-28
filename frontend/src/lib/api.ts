// API Client and Mock Data Provider for CU Library System
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  phone_whatsapp: string;
  reg_no: string;
  role: 'MEMBER' | 'ASSISTANT' | 'LIBRARIAN' | 'ADMIN';
  status: 'PENDING' | 'APPROVED' | 'SUSPENDED';
  whatsapp_consent: boolean;
}

export interface BookCopy {
  id: string;
  copy_code: string;
  shelf_location: string;
  condition: 'NEW' | 'GOOD' | 'FAIR' | 'POOR' | 'DAMAGED';
  status: 'AVAILABLE' | 'BORROWED' | 'RESERVED' | 'LOST' | 'DAMAGED';
  replacement_cost: number;
}

export interface BookTitle {
  id: string;
  title: string;
  author: string;
  isbn: string;
  publisher: string;
  publication_year: number;
  category_name: string;
  description: string;
  cover_url: string;
  total_copies: number;
  available_copies: number;
  copies?: BookCopy[];
}

export interface LoanRecord {
  id: string;
  copy_code: string;
  title_name: string;
  author: string;
  member_name: string;
  member_reg: string;
  member_phone: string;
  issue_date: string;
  due_date: string;
  return_date?: string;
  renewals_count: number;
  status: 'REQUESTED' | 'ISSUED' | 'RETURNED' | 'OVERDUE' | 'LOST';
  is_overdue: boolean;
  days_overdue: number;
  fine_accrued: number;
}

export interface FineRecord {
  id: string;
  member_name: string;
  member_reg: string;
  book_title: string;
  copy_code: string;
  amount: number;
  paid_amount: number;
  balance: number;
  status: 'UNPAID' | 'PARTIAL' | 'PAID' | 'WAIVED';
  waive_reason?: string;
}

export interface ReservationRecord {
  id: string;
  title_id: string;
  title_name: string;
  author: string;
  member_id: string;
  member_name: string;
  member_reg: string;
  status: 'READY_FOR_PICKUP' | 'QUEUED' | 'FULFILLED' | 'EXPIRED' | 'CANCELLED';
  queue_position: number;
  hold_expires_at?: string;
  created_at: string;
}


// Initial realistic dataset matching the database seed
export const INITIAL_BOOKS: BookTitle[] = [
  {
    id: 't-01',
    title: 'Mere Christianity',
    author: 'C.S. Lewis',
    isbn: '9780060652920',
    publisher: 'HarperOne',
    publication_year: 2001,
    category_name: 'Theology & Doctrine',
    description: 'A forceful and rational defense of the Christian faith, exploring core doctrines and the common ground of Christianity.',
    cover_url: 'https://covers.openlibrary.org/b/isbn/9780060652920-L.jpg',
    total_copies: 2,
    available_copies: 2,
    copies: [
      { id: 'c-01', copy_code: 'CU-0001', shelf_location: 'Shelf A-1', condition: 'GOOD', status: 'AVAILABLE', replacement_cost: 850 },
      { id: 'c-02', copy_code: 'CU-0002', shelf_location: 'Shelf A-1', condition: 'NEW', status: 'AVAILABLE', replacement_cost: 850 },
    ]
  },
  {
    id: 't-02',
    title: 'Knowing God',
    author: 'J.I. Packer',
    isbn: '9780830816507',
    publisher: 'IVP Books',
    publication_year: 1993,
    category_name: 'Theology & Doctrine',
    description: 'A landmark classic demonstrating how knowing God in relationship transforms the Christian heart, mind, and everyday walk.',
    cover_url: 'https://covers.openlibrary.org/b/isbn/9780830816507-L.jpg',
    total_copies: 1,
    available_copies: 1,
    copies: [
      { id: 'c-03', copy_code: 'CU-0003', shelf_location: 'Shelf A-2', condition: 'GOOD', status: 'AVAILABLE', replacement_cost: 900 }
    ]
  },
  {
    id: 't-03',
    title: 'Celebration of Discipline',
    author: 'Richard J. Foster',
    isbn: '9780060628390',
    publisher: 'HarperSanFrancisco',
    publication_year: 1998,
    category_name: 'Spiritual Growth & Prayer',
    description: 'An exploration of the classic spiritual disciplines: prayer, fasting, study, simplicity, solitude, and worship.',
    cover_url: 'https://covers.openlibrary.org/b/isbn/9780060628390-L.jpg',
    total_copies: 1,
    available_copies: 0,
    copies: [
      { id: 'c-04', copy_code: 'CU-0004', shelf_location: 'Shelf B-1', condition: 'GOOD', status: 'BORROWED', replacement_cost: 750 }
    ]
  },
  {
    id: 't-04',
    title: 'Spiritual Leadership',
    author: 'J. Oswald Sanders',
    isbn: '9780802482273',
    publisher: 'Moody Publishers',
    publication_year: 2007,
    category_name: 'Leadership & Ministry',
    description: 'Principles of excellence for every believer seeking to grow in spiritual influence, character, and biblical vision.',
    cover_url: 'https://covers.openlibrary.org/b/isbn/9780802482273-L.jpg',
    total_copies: 1,
    available_copies: 0,
    copies: [
      { id: 'c-05', copy_code: 'CU-0005', shelf_location: 'Shelf C-1', condition: 'FAIR', status: 'BORROWED', replacement_cost: 800 }
    ]
  },
  {
    id: 't-05',
    title: 'The Purpose Driven Life',
    author: 'Rick Warren',
    isbn: '9780310205715',
    publisher: 'Zondervan',
    publication_year: 2002,
    category_name: 'Christian Living & Marriage',
    description: 'A 40-day spiritual journey explaining why you are alive and revealing God’s amazing plan for you both now and into eternity.',
    cover_url: 'https://covers.openlibrary.org/b/isbn/9780310205715-L.jpg',
    total_copies: 2,
    available_copies: 2,
    copies: [
      { id: 'c-06', copy_code: 'CU-0006', shelf_location: 'Shelf D-1', condition: 'GOOD', status: 'AVAILABLE', replacement_cost: 700 },
      { id: 'c-07', copy_code: 'CU-0007', shelf_location: 'Shelf D-1', condition: 'NEW', status: 'AVAILABLE', replacement_cost: 700 }
    ]
  }
];

export const INITIAL_LOANS: LoanRecord[] = [
  {
    id: 'loan-01',
    copy_code: 'CU-0004',
    title_name: 'Celebration of Discipline',
    author: 'Richard J. Foster',
    member_name: 'David Ochieng',
    member_reg: 'CU/2024/0482',
    member_phone: '+254712345678',
    issue_date: '2026-10-21',
    due_date: '2026-11-04',
    renewals_count: 0,
    status: 'ISSUED',
    is_overdue: false,
    days_overdue: 0,
    fine_accrued: 0
  },
  {
    id: 'loan-02',
    copy_code: 'CU-0005',
    title_name: 'Spiritual Leadership',
    author: 'J. Oswald Sanders',
    member_name: 'Faith Mutua',
    member_reg: 'CU/2024/0119',
    member_phone: '+254798765432',
    issue_date: '2026-10-04',
    due_date: '2026-10-18',
    renewals_count: 0,
    status: 'OVERDUE',
    is_overdue: true,
    days_overdue: 6,
    fine_accrued: 20.00
  }
];

export const INITIAL_FINES: FineRecord[] = [
  {
    id: 'fine-01',
    member_name: 'Faith Mutua',
    member_reg: 'CU/2024/0119',
    book_title: 'Spiritual Leadership',
    copy_code: 'CU-0005',
    amount: 20.00,
    paid_amount: 0.00,
    balance: 20.00,
    status: 'UNPAID'
  }
];

export const DEMO_USERS: UserProfile[] = [
  {
    id: 'u-elvis',
    email: 'librarian@culibrary.org',
    full_name: 'Elvis Marube',
    phone_whatsapp: '+254711000111',
    reg_no: 'STAFF/001',
    role: 'LIBRARIAN',
    status: 'APPROVED',
    whatsapp_consent: true
  },
  {
    id: 'u-grace',
    email: 'assistant@culibrary.org',
    full_name: 'Grace Wanjiku',
    phone_whatsapp: '+254722000222',
    reg_no: 'STAFF/002',
    role: 'ASSISTANT',
    status: 'APPROVED',
    whatsapp_consent: true
  },
  {
    id: 'u-david',
    email: 'member@student.ac.ke',
    full_name: 'David Ochieng',
    phone_whatsapp: '+254712345678',
    reg_no: 'CU/2024/0482',
    role: 'MEMBER',
    status: 'APPROVED',
    whatsapp_consent: true
  }
];

// WhatsApp URL generator
export function buildWhatsAppLink(phone: string, message: string): string {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const normalized = cleanPhone.startsWith('0') ? '254' + cleanPhone.slice(1) : cleanPhone;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}
