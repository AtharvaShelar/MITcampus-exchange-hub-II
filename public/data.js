/* ==========================================================
   MIT Campus Exchange Hub  —  data.js
   ----------------------------------------------------------
   Client constants, categories, conditions and demo presets.
   Backend APIs handle real persistent database operations.
   ========================================================== */

const API_BASE = '/api';

const SAMPLE_CATEGORIES = [
  'Textbooks',
  'Notes',
  'Stationery',
  'Electronics',
  'Lab Equipment',
  'Reference Books',
  'Drawing Instruments',
  'Other'
];

const SAMPLE_CONDITIONS = ['New', 'Like New', 'Good', 'Fair'];

const SAMPLE_LISTING_TYPES = ['Sale', 'Rent', 'Exchange', 'Donation'];

const SAMPLE_REPORT_REASONS = [
  'Suspicious or fraudulent activity',
  'Misleading product description',
  'Inappropriate content',
  'Spam',
  'Other'
];

// Demo accounts for the jury login helper
const DEMO_CREDENTIALS = [
  { label: 'Student (Aarav)', email: 'student@demo.edu', password: 'demo123', role: 'student' },
  { label: 'Admin (Campus Admin)', email: 'admin@demo.edu', password: 'demo123', role: 'admin' },
  { label: 'Staff (Prof. Verma)', email: 'staff@demo.edu', password: 'demo123', role: 'staff' },
  { label: 'Student (Priya)', email: 'priya@demo.edu', password: 'demo123', role: 'student' },
  { label: 'Student (Rohan)', email: 'rohan@demo.edu', password: 'demo123', role: 'student' }
];
