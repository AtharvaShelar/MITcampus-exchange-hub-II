require('dotenv').config();
const bcrypt = require('bcryptjs');
const { connectDB } = require('../config/db');
const db = require('../services/dbAdapter');

const seedDatabase = async () => {
  console.log('[Seeder] Initializing database seeding...');
  await connectDB();

  const passwordHash = await bcrypt.hash('demo123', 10);

  // 1. Demo Users
  const users = [
    {
      id: 'u_student',
      name: 'Aarav Sharma',
      email: 'student@demo.edu',
      password: passwordHash,
      role: 'student',
      department: 'Computer Engineering',
      year: '2nd Year',
      status: 'active',
      isVerified: true,
      wishlist: ['p2', 'p8', 'p13'],
      rating: 4.8,
      ratingsCount: 6,
      joined: '12 Jul 2026'
    },
    {
      id: 'u_admin',
      name: 'Campus Admin',
      email: 'admin@demo.edu',
      password: passwordHash,
      role: 'admin',
      department: 'Administration',
      year: 'Faculty / Admin',
      status: 'active',
      isVerified: true,
      wishlist: [],
      rating: 5.0,
      ratingsCount: 12,
      joined: '02 Jun 2026'
    },
    {
      id: 'u_priya',
      name: 'Priya Deshmukh',
      email: 'priya@demo.edu',
      password: passwordHash,
      role: 'student',
      department: 'Electronics & Telecom',
      year: '3rd Year',
      status: 'active',
      isVerified: true,
      wishlist: ['p3'],
      rating: 4.9,
      ratingsCount: 8,
      joined: '15 Jul 2026'
    },
    {
      id: 'u_rohan',
      name: 'Rohan Kulkarni',
      email: 'rohan@demo.edu',
      password: passwordHash,
      role: 'student',
      department: 'Mechanical Engineering',
      year: '2nd Year',
      status: 'active',
      isVerified: true,
      wishlist: ['p1', 'p14'],
      rating: 4.7,
      ratingsCount: 5,
      joined: '18 Jul 2026'
    },
    {
      id: 'u_sneha',
      name: 'Sneha Iyer',
      email: 'sneha@demo.edu',
      password: passwordHash,
      role: 'student',
      department: 'Computer Engineering',
      year: '4th Year',
      status: 'active',
      isVerified: true,
      wishlist: ['p6'],
      rating: 5.0,
      ratingsCount: 9,
      joined: '01 Aug 2026'
    },
    {
      id: 'u_kabir',
      name: 'Kabir Nair',
      email: 'kabir@demo.edu',
      password: passwordHash,
      role: 'student',
      department: 'Civil Engineering',
      year: '1st Year',
      status: 'suspended',
      isVerified: true,
      wishlist: [],
      rating: 3.5,
      ratingsCount: 2,
      joined: '09 Aug 2026'
    },
    {
      id: 'u_staff',
      name: 'Prof. Rajesh Verma',
      email: 'staff@demo.edu',
      password: passwordHash,
      role: 'staff',
      department: 'Computer Engineering',
      year: 'Assistant Professor',
      status: 'active',
      isVerified: true,
      wishlist: ['p15'],
      rating: 5.0,
      ratingsCount: 15,
      joined: '10 Jan 2026'
    }
  ];

  // 2. Sample Products with Fixed Price, Bidding/Auctions, Rent, Exchange, and Donation
  const now = Date.now();
  const twoDaysLater = new Date(now + 48 * 60 * 60 * 1000).toISOString();
  const threeDaysLater = new Date(now + 72 * 60 * 60 * 1000).toISOString();
  const oneDayLater = new Date(now + 24 * 60 * 60 * 1000).toISOString();

  const products = [
    {
      id: 'p1',
      name: 'Engineering Mathematics-III Textbook',
      price: 450,
      category: 'Textbooks',
      condition: 'Good',
      listingType: 'Sale',
      pricingModel: 'fixed',
      description: 'Prescribed textbook for M-III (Second Year). Covers linear algebra, complex analysis and transforms. Some solved examples highlighted in pencil, binding is intact.',
      sellerEmail: 'priya@demo.edu',
      sellerName: 'Priya Deshmukh',
      sellerDepartment: 'Electronics & Telecom',
      image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&q=80',
      status: 'available',
      createdAt: '2026-09-28'
    },
    {
      id: 'p2',
      name: 'Data Structures & Algorithms — Handwritten Notes',
      price: 250,
      category: 'Notes',
      condition: 'Like New',
      listingType: 'Sale',
      pricingModel: 'fixed',
      description: 'Complete semester notes for DSA with all 5 units, diagrams and previous-year questions solved. Spiral bound, 140 pages.',
      sellerEmail: 'rohan@demo.edu',
      sellerName: 'Rohan Kulkarni',
      sellerDepartment: 'Mechanical Engineering',
      image: 'https://images.unsplash.com/photo-1517842645767-c639042777db?w=600&q=80',
      status: 'available',
      createdAt: '2026-10-02'
    },
    {
      id: 'p3',
      name: 'Casio FX-991ES Plus Scientific Calculator',
      price: 750,
      category: 'Electronics',
      condition: 'Good',
      listingType: 'Sale',
      pricingModel: 'fixed',
      description: '417 functions, natural display. Used for two semesters, works perfectly. Slide-on hard case included.',
      sellerEmail: 'student@demo.edu',
      sellerName: 'Aarav Sharma',
      sellerDepartment: 'Computer Engineering',
      image: 'https://images.unsplash.com/photo-1611348586804-61bf6c080437?w=600&q=80',
      status: 'available',
      createdAt: '2026-10-04'
    },
    {
      id: 'p4',
      name: 'Complete Stationery Kit (Semester Pack)',
      price: 320,
      category: 'Stationery',
      condition: 'New',
      listingType: 'Sale',
      pricingModel: 'fixed',
      description: 'Brand new unopened kit — 4 ruled notebooks, 1 graph book, geometry set, gel pens, highlighters and sticky notes.',
      sellerEmail: 'sneha@demo.edu',
      sellerName: 'Sneha Iyer',
      sellerDepartment: 'Computer Engineering',
      image: 'https://images.unsplash.com/photo-1568205612837-017257d2310a?w=600&q=80',
      status: 'available',
      createdAt: '2026-10-05'
    },
    {
      id: 'p5',
      name: 'Lab Record Book (200 Pages, Unused)',
      price: 90,
      category: 'Stationery',
      condition: 'New',
      listingType: 'Sale',
      pricingModel: 'fixed',
      description: 'Hard-bound practical record book with margin and graph pages. Never used, cover slightly dusty from storage.',
      sellerEmail: 'kabir@demo.edu',
      sellerName: 'Kabir Nair',
      sellerDepartment: 'Civil Engineering',
      image: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=600&q=80',
      status: 'sold',
      createdAt: '2026-09-22'
    },
    {
      id: 'p6',
      name: 'Higher Engineering Mathematics — B.S. Grewal',
      price: 520,
      category: 'Reference Books',
      condition: 'Good',
      listingType: 'Sale',
      pricingModel: 'fixed',
      description: '44th edition. The standard reference for first and second year engineering mathematics. No torn pages, minor wear on the spine.',
      sellerEmail: 'priya@demo.edu',
      sellerName: 'Priya Deshmukh',
      sellerDepartment: 'Electronics & Telecom',
      image: 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=600&q=80',
      status: 'available',
      createdAt: '2026-09-25'
    },
    {
      id: 'p7',
      name: 'Drawing Instruments Box Set',
      price: 400,
      category: 'Drawing Instruments',
      condition: 'Good',
      listingType: 'Sale',
      pricingModel: 'fixed',
      description: 'Complete engineering drawing instrument box — compass, dividers, set squares, protractor and scale. Ideal for first year ED lab.',
      sellerEmail: 'student@demo.edu',
      sellerName: 'Aarav Sharma',
      sellerDepartment: 'Computer Engineering',
      image: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=600&q=80',
      status: 'available',
      createdAt: '2026-10-07'
    },
    {
      id: 'p8',
      name: 'boAt Rockerz 450 Bluetooth Headphones',
      price: 1100,
      category: 'Electronics',
      condition: 'Like New',
      listingType: 'Sale',
      pricingModel: 'fixed',
      description: '15 hours playback, padded ear cushions. Bought 3 months ago, used only for online lectures. Original box and charging cable included.',
      sellerEmail: 'rohan@demo.edu',
      sellerName: 'Rohan Kulkarni',
      sellerDepartment: 'Mechanical Engineering',
      image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80',
      status: 'available',
      createdAt: '2026-10-08'
    },
    {
      id: 'p9',
      name: 'Digital Logic Design — Morris Mano',
      price: 380,
      category: 'Textbooks',
      condition: 'Good',
      listingType: 'Sale',
      pricingModel: 'fixed',
      description: 'Standard textbook for Digital Electronics / DLD. All chapters present, few notes written on the last blank pages.',
      sellerEmail: 'sneha@demo.edu',
      sellerName: 'Sneha Iyer',
      sellerDepartment: 'Computer Engineering',
      image: 'https://images.unsplash.com/photo-1589998059171-988d887df646?w=600&q=80',
      status: 'available',
      createdAt: '2026-10-09'
    },
    {
      id: 'p10',
      name: 'Organic Chemistry Reference Notes',
      price: 180,
      category: 'Notes',
      condition: 'Good',
      listingType: 'Sale',
      pricingModel: 'fixed',
      description: 'Neatly written reaction-mechanism notes for first year chemistry, with all named reactions and a quick revision chart.',
      sellerEmail: 'student@demo.edu',
      sellerName: 'Aarav Sharma',
      sellerDepartment: 'Computer Engineering',
      image: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=600&q=80',
      status: 'available',
      createdAt: '2026-10-09'
    },
    {
      id: 'p11',
      name: 'Scientific Calculator — FX-82MS',
      price: 500,
      category: 'Electronics',
      condition: 'Fair',
      listingType: 'Sale',
      pricingModel: 'fixed',
      description: 'Working calculator with 240 functions. The display has a small scratch but readings are perfectly clear. Battery recently changed.',
      sellerEmail: 'kabir@demo.edu',
      sellerName: 'Kabir Nair',
      sellerDepartment: 'Civil Engineering',
      image: 'https://images.unsplash.com/photo-1587145820266-a5951ee6f620?w=600&q=80',
      status: 'available',
      createdAt: '2026-09-30'
    },
    {
      id: 'p12',
      name: 'Engineering Drawing Board + Mini Drafter',
      price: 850,
      category: 'Drawing Instruments',
      condition: 'Good',
      listingType: 'Sale',
      pricingModel: 'fixed',
      description: 'A2 size drawing board with a working mini drafter attached. Used for one year of ED lab, no cracks or dents.',
      sellerEmail: 'priya@demo.edu',
      sellerName: 'Priya Deshmukh',
      sellerDepartment: 'Electronics & Telecom',
      image: 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=600&q=80',
      status: 'available',
      createdAt: '2026-10-10'
    },

    // --- NEW AUCTION / BIDDING LISTINGS ---
    {
      id: 'p13',
      name: 'GATE CSE Master Reference Notes & Formula Compendium',
      price: 450, // reflects current highest bid
      category: 'Notes',
      condition: 'Like New',
      listingType: 'Sale',
      pricingModel: 'bidding',
      startingBid: 300,
      minIncrement: 50,
      currentHighestBid: 450,
      highestBidderEmail: 'student@demo.edu',
      highestBidderName: 'Aarav Sharma',
      highestBidderId: 'u_student',
      bidsCount: 3,
      auctionEnd: twoDaysLater,
      auctionStatus: 'active',
      description: 'High-demand comprehensive GATE CSE topper notes covering OS, DBMS, Algorithms, Theory of Computation, and Computer Networks with short tricks and solved past 15-year questions.',
      sellerEmail: 'sneha@demo.edu',
      sellerName: 'Sneha Iyer',
      sellerDepartment: 'Computer Engineering',
      image: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=600&q=80',
      status: 'available',
      createdAt: '2026-10-12'
    },
    {
      id: 'p14',
      name: 'Texas Instruments TI-84 Plus Color Graphing Calculator',
      price: 2800,
      category: 'Electronics',
      condition: 'Like New',
      listingType: 'Sale',
      pricingModel: 'bidding',
      startingBid: 2500,
      minIncrement: 100,
      currentHighestBid: 2800,
      highestBidderEmail: 'rohan@demo.edu',
      highestBidderName: 'Rohan Kulkarni',
      highestBidderId: 'u_rohan',
      bidsCount: 2,
      auctionEnd: oneDayLater,
      auctionStatus: 'active',
      description: 'Color screen TI-84 Plus CE graphing calculator. Used for advanced engineering mathematics and numerical analysis. Comes with rechargeable battery and USB data cable.',
      sellerEmail: 'priya@demo.edu',
      sellerName: 'Priya Deshmukh',
      sellerDepartment: 'Electronics & Telecom',
      image: 'https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?w=600&q=80',
      status: 'available',
      createdAt: '2026-10-13'
    },
    {
      id: 'p15',
      name: 'Raspberry Pi 4 (8GB RAM) + Embedded Sensors IoT Lab Kit',
      price: 3600,
      category: 'Lab Equipment',
      condition: 'Like New',
      listingType: 'Sale',
      pricingModel: 'bidding',
      startingBid: 3200,
      minIncrement: 150,
      currentHighestBid: 3600,
      highestBidderEmail: 'student@demo.edu',
      highestBidderName: 'Aarav Sharma',
      highestBidderId: 'u_student',
      bidsCount: 2,
      auctionEnd: threeDaysLater,
      auctionStatus: 'active',
      description: 'Complete IoT development kit: Raspberry Pi 4 Model B (8GB RAM), acrylic case with fan, 32GB high-speed SD card, breadboard, ultrasonic sensor, DHT11, and jumper wires.',
      sellerEmail: 'staff@demo.edu',
      sellerName: 'Prof. Rajesh Verma',
      sellerDepartment: 'Computer Engineering',
      image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&q=80',
      status: 'available',
      createdAt: '2026-10-14'
    },

    // --- RENT, EXCHANGE & DONATION LISTINGS ---
    {
      id: 'p16',
      name: 'Engineering Drawing Drafter & T-Scale (Semester Rental)',
      price: 150,
      category: 'Drawing Instruments',
      condition: 'Good',
      listingType: 'Rent',
      rentalPeriod: '₹150 for entire semester',
      pricingModel: 'fixed',
      description: 'Heavy duty mini-drafter and T-scale available for 1st-year students during their Engineering Graphics semester. Deposit ₹200 refundable on return.',
      sellerEmail: 'rohan@demo.edu',
      sellerName: 'Rohan Kulkarni',
      sellerDepartment: 'Mechanical Engineering',
      image: 'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=600&q=80',
      status: 'available',
      createdAt: '2026-10-11'
    },
    {
      id: 'p17',
      name: 'Digital Signal Processing (Proakis & Manolakis) — Book Exchange',
      price: 0,
      category: 'Textbooks',
      condition: 'Good',
      listingType: 'Exchange',
      exchangeFor: 'Looking to exchange for Computer Networks (Andrew S. Tanenbaum)',
      pricingModel: 'fixed',
      description: 'DSP textbook in excellent condition. Looking to exchange directly for Computer Networks textbook for the upcoming semester.',
      sellerEmail: 'priya@demo.edu',
      sellerName: 'Priya Deshmukh',
      sellerDepartment: 'Electronics & Telecom',
      image: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=600&q=80',
      status: 'available',
      createdAt: '2026-10-12'
    },
    {
      id: 'p18',
      name: 'First Year Engineering Mechanics Solved Question Bank',
      price: 0,
      category: 'Other',
      condition: 'Good',
      listingType: 'Donation',
      pricingModel: 'fixed',
      description: 'Free donation to any junior who needs help preparing for Mechanics end-sem. Includes step-by-step force resolution problems and centroid diagrams.',
      sellerEmail: 'student@demo.edu',
      sellerName: 'Aarav Sharma',
      sellerDepartment: 'Computer Engineering',
      image: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=600&q=80',
      status: 'available',
      createdAt: '2026-10-13'
    }
  ];

  // 3. Sample Bids
  const bids = [
    {
      id: 'b1',
      listingId: 'p13',
      listingName: 'GATE CSE Master Reference Notes & Formula Compendium',
      bidderId: 'u_rohan',
      bidderEmail: 'rohan@demo.edu',
      bidderName: 'Rohan Kulkarni',
      amount: 350,
      createdAt: new Date(now - 12 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'b2',
      listingId: 'p13',
      listingName: 'GATE CSE Master Reference Notes & Formula Compendium',
      bidderId: 'u_priya',
      bidderEmail: 'priya@demo.edu',
      bidderName: 'Priya Deshmukh',
      amount: 400,
      createdAt: new Date(now - 6 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'b3',
      listingId: 'p13',
      listingName: 'GATE CSE Master Reference Notes & Formula Compendium',
      bidderId: 'u_student',
      bidderEmail: 'student@demo.edu',
      bidderName: 'Aarav Sharma',
      amount: 450,
      createdAt: new Date(now - 2 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'b4',
      listingId: 'p14',
      listingName: 'Texas Instruments TI-84 Plus Color Graphing Calculator',
      bidderId: 'u_student',
      bidderEmail: 'student@demo.edu',
      bidderName: 'Aarav Sharma',
      amount: 2600,
      createdAt: new Date(now - 8 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'b5',
      listingId: 'p14',
      listingName: 'Texas Instruments TI-84 Plus Color Graphing Calculator',
      bidderId: 'u_rohan',
      bidderEmail: 'rohan@demo.edu',
      bidderName: 'Rohan Kulkarni',
      amount: 2800,
      createdAt: new Date(now - 3 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'b6',
      listingId: 'p15',
      listingName: 'Raspberry Pi 4 (8GB RAM) + Embedded Sensors IoT Lab Kit',
      bidderId: 'u_rohan',
      bidderEmail: 'rohan@demo.edu',
      bidderName: 'Rohan Kulkarni',
      amount: 3350,
      createdAt: new Date(now - 14 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'b7',
      listingId: 'p15',
      listingName: 'Raspberry Pi 4 (8GB RAM) + Embedded Sensors IoT Lab Kit',
      bidderId: 'u_student',
      bidderEmail: 'student@demo.edu',
      bidderName: 'Aarav Sharma',
      amount: 3600,
      createdAt: new Date(now - 4 * 60 * 60 * 1000).toISOString()
    }
  ];

  // 4. Sample Requests
  const requests = [
    {
      id: 'r1',
      productId: 'p1',
      productName: 'Engineering Mathematics-III Textbook',
      buyerId: 'u_student',
      buyerEmail: 'student@demo.edu',
      buyerName: 'Aarav Sharma',
      sellerId: 'u_priya',
      sellerEmail: 'priya@demo.edu',
      sellerName: 'Priya Deshmukh',
      requestType: 'purchase',
      offeredPrice: 450,
      date: '10 Oct 2026',
      status: 'Pending',
      createdAt: '2026-10-10'
    },
    {
      id: 'r2',
      productId: 'p6',
      productName: 'Higher Engineering Mathematics — B.S. Grewal',
      buyerId: 'u_student',
      buyerEmail: 'student@demo.edu',
      buyerName: 'Aarav Sharma',
      sellerId: 'u_priya',
      sellerEmail: 'priya@demo.edu',
      sellerName: 'Priya Deshmukh',
      requestType: 'purchase',
      offeredPrice: 520,
      date: '06 Oct 2026',
      status: 'Completed',
      createdAt: '2026-10-06'
    },
    {
      id: 'r3',
      productId: 'p3',
      productName: 'Casio FX-991ES Plus Scientific Calculator',
      buyerId: 'u_rohan',
      buyerEmail: 'rohan@demo.edu',
      buyerName: 'Rohan Kulkarni',
      sellerId: 'u_student',
      sellerEmail: 'student@demo.edu',
      sellerName: 'Aarav Sharma',
      requestType: 'purchase',
      offeredPrice: 750,
      date: '09 Oct 2026',
      status: 'Pending',
      createdAt: '2026-10-09'
    },
    {
      id: 'r4',
      productId: 'p7',
      productName: 'Drawing Instruments Box Set',
      buyerId: 'u_sneha',
      buyerEmail: 'sneha@demo.edu',
      buyerName: 'Sneha Iyer',
      sellerId: 'u_student',
      sellerEmail: 'student@demo.edu',
      sellerName: 'Aarav Sharma',
      requestType: 'purchase',
      offeredPrice: 400,
      date: '08 Oct 2026',
      status: 'Accepted',
      createdAt: '2026-10-08'
    },
    {
      id: 'r5',
      productId: 'p10',
      productName: 'Organic Chemistry Reference Notes',
      buyerId: 'u_kabir',
      buyerEmail: 'kabir@demo.edu',
      buyerName: 'Kabir Nair',
      sellerId: 'u_student',
      sellerEmail: 'student@demo.edu',
      sellerName: 'Aarav Sharma',
      requestType: 'purchase',
      offeredPrice: 180,
      date: '05 Oct 2026',
      status: 'Rejected',
      createdAt: '2026-10-05'
    }
  ];

  // 5. Sample Reviews (Ratings and Reviews)
  const reviews = [
    {
      id: 'rev1',
      requestId: 'r2',
      productId: 'p6',
      productName: 'Higher Engineering Mathematics — B.S. Grewal',
      reviewerEmail: 'student@demo.edu',
      reviewerName: 'Aarav Sharma',
      targetEmail: 'priya@demo.edu',
      rating: 5,
      comment: 'Excellent condition book, exactly as described! Priya was very prompt and met me right outside the Central Library.',
      date: '07 Oct 2026',
      createdAt: '2026-10-07'
    },
    {
      id: 'rev2',
      requestId: 'r2',
      productId: 'p6',
      productName: 'Higher Engineering Mathematics — B.S. Grewal',
      reviewerEmail: 'priya@demo.edu',
      reviewerName: 'Priya Deshmukh',
      targetEmail: 'student@demo.edu',
      rating: 5,
      comment: 'Smooth and pleasant deal with Aarav. Arrived right on time for pickup.',
      date: '07 Oct 2026',
      createdAt: '2026-10-07'
    }
  ];

  // 6. Sample Conversations & Messages
  const conversations = [
    {
      id: 'c1',
      participants: ['student@demo.edu', 'priya@demo.edu'],
      withEmail: 'priya@demo.edu',
      productId: 'p1',
      messages: [
        { id: 'm1', from: 'student@demo.edu', text: 'Hi Priya! Is the Engineering Mathematics-III book still available?', time: '09:12' },
        { id: 'm2', from: 'priya@demo.edu', text: 'Hey Aarav! Yes it is. The cover has a small fold but all pages are fine.', time: '09:18' },
        { id: 'm3', from: 'student@demo.edu', text: 'Great. Would you consider ₹400?', time: '09:21' },
        { id: 'm4', from: 'priya@demo.edu', text: '₹420 and it is yours. I can meet near the library at 4 pm.', time: '09:25' }
      ]
    },
    {
      id: 'c2',
      participants: ['student@demo.edu', 'rohan@demo.edu'],
      withEmail: 'rohan@demo.edu',
      productId: 'p3',
      messages: [
        { id: 'm5', from: 'rohan@demo.edu', text: 'Hi, I saw your Casio FX-991ES listing. Does it come with the case?', time: '14:02' },
        { id: 'm6', from: 'student@demo.edu', text: 'Yes, the slide-on hard case is included.', time: '14:10' },
        { id: 'm7', from: 'rohan@demo.edu', text: 'Perfect, I have sent a purchase request.', time: '14:12' }
      ]
    },
    {
      id: 'c3',
      participants: ['student@demo.edu', 'sneha@demo.edu'],
      withEmail: 'sneha@demo.edu',
      productId: 'p7',
      messages: [
        { id: 'm8', from: 'sneha@demo.edu', text: 'Is the drawing instrument box complete? Missing any pieces?', time: '11:40' },
        { id: 'm9', from: 'student@demo.edu', text: 'It is complete — compass, dividers, both set squares and the protractor.', time: '11:47' }
      ]
    }
  ];

  // 7. Sample Reports
  const reports = [
    {
      id: 'rep1',
      type: 'Product',
      targetId: 'p5',
      targetLabel: 'Lab Record Book (200 Pages, Unused)',
      reporterEmail: 'kabir@demo.edu',
      reporterName: 'Kabir Nair',
      reason: 'Misleading product description',
      description: 'The photos look like a different notebook than the one described in the listing.',
      date: '07 Oct 2026',
      status: 'Pending'
    },
    {
      id: 'rep2',
      type: 'User',
      targetId: 'rohan@demo.edu',
      targetLabel: 'Rohan Kulkarni',
      reporterEmail: 'sneha@demo.edu',
      reporterName: 'Sneha Iyer',
      reason: 'Spam',
      description: 'This user keeps sending repetitive inquiries without intending to finalize.',
      date: '06 Oct 2026',
      status: 'Under Review'
    },
    {
      id: 'rep3',
      type: 'Product',
      targetId: 'p11',
      targetLabel: 'Scientific Calculator — FX-82MS',
      reporterEmail: 'priya@demo.edu',
      reporterName: 'Priya Deshmukh',
      reason: 'Suspicious or fraudulent activity',
      description: 'Price changed several times within a single day, which looked odd.',
      date: '03 Oct 2026',
      status: 'Resolved'
    }
  ];

  // 8. Sample Notifications
  const notifications = [
    {
      id: 'n1',
      toEmail: 'student@demo.edu',
      type: 'request',
      title: 'New purchase request',
      message: 'Rohan Kulkarni wants to buy your "Casio FX-991ES Plus Scientific Calculator".',
      time: '09 Oct 2026, 14:12',
      read: false,
      link: 'requests'
    },
    {
      id: 'n2',
      toEmail: 'student@demo.edu',
      type: 'message',
      title: 'New chat message',
      message: 'Priya Deshmukh replied about "Engineering Mathematics-III Textbook".',
      time: '10 Oct 2026, 09:25',
      read: false,
      link: 'chats'
    },
    {
      id: 'n3',
      toEmail: 'student@demo.edu',
      type: 'request',
      title: 'Purchase request accepted',
      message: 'Priya Deshmukh accepted your request for "Higher Engineering Mathematics — B.S. Grewal".',
      time: '06 Oct 2026, 18:40',
      read: false,
      link: 'requests'
    },
    {
      id: 'n4',
      toEmail: 'student@demo.edu',
      type: 'bid',
      title: '📈 You Have the Highest Bid!',
      message: 'Your bid of ₹450 on "GATE CSE Master Reference Notes & Formula Compendium" is currently leading!',
      time: '12 Oct 2026, 16:30',
      read: false,
      link: 'browse'
    },
    {
      id: 'n5',
      toEmail: 'student@demo.edu',
      type: 'sold',
      title: 'Listing marked as sold',
      message: 'Your "Lab Record Book (200 Pages, Unused)" was marked as sold.',
      time: '23 Sep 2026, 16:20',
      read: true,
      link: 'listings'
    }
  ];

  // 9. Sample Activity Log
  const activities = [
    { id: 'a1', type: 'bid', text: 'Aarav Sharma placed a bid of ₹450 on "GATE CSE Master Reference Notes".', time: '12 Oct 2026, 16:30' },
    { id: 'a2', type: 'listing', text: 'Prof. Rajesh Verma listed "Raspberry Pi 4 IoT Lab Kit" (Bidding).', time: '12 Oct 2026, 14:15' },
    { id: 'a3', type: 'listing', text: 'Priya Deshmukh listed "Engineering Drawing Board + Mini Drafter".', time: '10 Oct 2026, 11:30' },
    { id: 'a4', type: 'request', text: 'Rohan Kulkarni sent a purchase request for "Casio FX-991ES Plus Scientific Calculator".', time: '09 Oct 2026, 14:12' },
    { id: 'a5', type: 'listing', text: 'Sneha Iyer listed "Digital Logic Design — Morris Mano".', time: '09 Oct 2026, 09:48' },
    { id: 'a6', type: 'report', text: 'Kabir Nair reported "Lab Record Book (200 Pages, Unused)".', time: '07 Oct 2026, 20:15' }
  ];

  // Clear existing and write fresh
  await db.users.deleteMany({});
  await db.products.deleteMany({});
  await db.bids.deleteMany({});
  await db.requests.deleteMany({});
  await db.reviews.deleteMany({});
  await db.conversations.deleteMany({});
  await db.reports.deleteMany({});
  await db.notifications.deleteMany({});
  await db.activities.deleteMany({});

  for (const u of users) await db.users.create(u);
  for (const p of products) await db.products.create(p);
  for (const b of bids) await db.bids.create(b);
  for (const r of requests) await db.requests.create(r);
  for (const rev of reviews) await db.reviews.create(rev);
  for (const c of conversations) await db.conversations.create(c);
  for (const rep of reports) await db.reports.create(rep);
  for (const n of notifications) await db.notifications.create(n);
  for (const a of activities) await db.activities.create(a);

  console.log(`[Seeder] Seed complete!`);
  console.log(`  - Users: ${users.length} (Student, Staff, Admin)`);
  console.log(`  - Products: ${products.length} (Fixed, Auctions, Rent, Exchange, Donation)`);
  console.log(`  - Bids: ${bids.length}`);
  console.log(`  - Requests: ${requests.length}`);
  console.log(`  - Reviews: ${reviews.length}`);
  console.log(`  - Conversations: ${conversations.length}`);
  console.log(`  - Reports: ${reports.length}`);
  console.log(`  - Notifications: ${notifications.length}`);
  console.log(`  - Activities: ${activities.length}`);

  return true;
};

// Execute if run directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('[Seeder] Finished successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Seeder] Error during seed:', err);
      process.exit(1);
    });
}

module.exports = { seedDatabase };
