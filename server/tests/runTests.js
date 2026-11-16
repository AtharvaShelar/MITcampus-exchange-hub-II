const assert = require('assert');
require('dotenv').config();
const { seedDatabase } = require('../scripts/seed');
const db = require('../services/dbAdapter');
const authController = require('../controllers/authController');
const productController = require('../controllers/productController');
const bidController = require('../controllers/bidController');
const requestController = require('../controllers/requestController');
const reviewController = require('../controllers/reviewController');
const adminController = require('../controllers/adminController');
const { checkAndFinalizeAuctions } = require('../services/auctionService');

// Mock Express req, res, next helpers
const createMockReq = (body = {}, params = {}, query = {}, user = null) => ({
  body,
  params,
  query,
  user,
  protocol: 'http',
  get: () => 'localhost:5000'
});

const createMockRes = () => {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    }
  };
  return res;
};

async function runTestSuite() {
  console.log('\n======================================================');
  console.log('🧪 RUNNING AUTOMATED FULL-STACK INTEGRATION TEST SUITE');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(`     Error: ${err.message}`);
      failed++;
    }
  }

  // Seed fresh state before tests
  await seedDatabase();

  // Test 1: Institute Email Domain Validation
  await test('Registration enforces institute domain (@demo.edu or allowed)', async () => {
    const mockReqBad = createMockReq({
      name: 'External User',
      email: 'hacker@gmail.com',
      password: 'password123',
      department: 'Computer Engineering'
    });
    const mockResBad = createMockRes();
    await authController.register(mockReqBad, mockResBad, (e) => { throw e; });
    assert.strictEqual(mockResBad.statusCode, 400);
    assert(mockResBad.body.message.includes('restricted to verified institute email'));

    // Valid registration
    const mockReqGood = createMockReq({
      name: 'Neha Patil',
      email: 'neha@demo.edu',
      password: 'password123',
      department: 'Information Technology',
      year: '3rd Year',
      role: 'student'
    });
    const mockResGood = createMockRes();
    await authController.register(mockReqGood, mockResGood, (e) => { throw e; });
    assert.strictEqual(mockResGood.statusCode, 201);
    assert.strictEqual(mockResGood.body.success, true);
    assert.strictEqual(mockResGood.body.user.email, 'neha@demo.edu');
  });

  // Test 2: Authentication Login & Password Hashing
  await test('Login verifies bcrypt hashed password and blocks incorrect credentials', async () => {
    // Bad password
    const mockReqWrong = createMockReq({ email: 'student@demo.edu', password: 'wrongPassword' });
    const mockResWrong = createMockRes();
    await authController.login(mockReqWrong, mockResWrong, (e) => { throw e; });
    assert.strictEqual(mockResWrong.statusCode, 401);

    // Correct password
    const mockReqRight = createMockReq({ email: 'student@demo.edu', password: 'demo123' });
    const mockResRight = createMockRes();
    await authController.login(mockReqRight, mockResRight, (e) => { throw e; });
    assert.strictEqual(mockResRight.statusCode, 200);
    assert.strictEqual(mockResRight.body.success, true);
    assert(mockResRight.body.token);
  });

  // Test 3: Suspended User Login Block
  await test('Suspended users are prevented from logging in', async () => {
    const mockReqSuspended = createMockReq({ email: 'kabir@demo.edu', password: 'demo123' });
    const mockResSuspended = createMockRes();
    await authController.login(mockReqSuspended, mockResSuspended, (e) => { throw e; });
    assert.strictEqual(mockResSuspended.statusCode, 403);
    assert(mockResSuspended.body.message.includes('suspended'));
  });

  // Test 4: Creating Bidding / Auction Listing
  let testAuctionId = null;
  await test('Seller can create a Bidding / Auction listing with start price and increment', async () => {
    const seller = await db.users.findOne({ email: 'sneha@demo.edu' });
    const mockReq = createMockReq(
      {
        name: 'Compiler Design Dragon Book (Rare Hardcover)',
        category: 'Reference Books',
        condition: 'Like New',
        listingType: 'Sale',
        pricingModel: 'bidding',
        startingBid: 500,
        minIncrement: 50,
        auctionDurationHours: 48,
        description: 'Hardcover edition of Aho, Lam, Sethi, Ullman. Excellent for advanced compilers.'
      },
      {},
      {},
      seller
    );
    const mockRes = createMockRes();
    await productController.createProduct(mockReq, mockRes, (e) => { throw e; });
    assert.strictEqual(mockRes.statusCode, 201);
    assert.strictEqual(mockRes.body.product.pricingModel, 'bidding');
    assert.strictEqual(mockRes.body.product.startingBid, 500);
    assert.strictEqual(mockRes.body.product.minIncrement, 50);
    assert.strictEqual(mockRes.body.product.auctionStatus, 'active');
    testAuctionId = String(mockRes.body.product.id || mockRes.body.product._id);
  });

  // Test 5: Bidding Rules - Seller Cannot Bid on Own Item
  await test('Seller cannot bid on their own auction listing', async () => {
    const seller = await db.users.findOne({ email: 'sneha@demo.edu' });
    const mockReq = createMockReq({ amount: 600 }, { id: testAuctionId }, {}, seller);
    const mockRes = createMockRes();
    await bidController.placeBid(mockReq, mockRes, (e) => { throw e; });
    assert.strictEqual(mockRes.statusCode, 400);
    assert(mockRes.body.message.includes('own listing'));
  });

  // Test 6: Bidding Rules - Bid Below Starting Bid Rejected
  await test('Bid below starting bid is rejected on new auction', async () => {
    const bidder = await db.users.findOne({ email: 'student@demo.edu' });
    const mockReq = createMockReq({ amount: 450 }, { id: testAuctionId }, {}, bidder);
    const mockRes = createMockRes();
    await bidController.placeBid(mockReq, mockRes, (e) => { throw e; });
    assert.strictEqual(mockRes.statusCode, 400);
    assert(mockRes.body.message.includes('too low'));
  });

  // Test 7: Bidding Rules - Valid Highest Bid Placement
  await test('Valid bid updates current highest bid, bidder, and bid count', async () => {
    const bidderA = await db.users.findOne({ email: 'student@demo.edu' });
    const mockReq = createMockReq({ amount: 550 }, { id: testAuctionId }, {}, bidderA);
    const mockRes = createMockRes();
    await bidController.placeBid(mockReq, mockRes, (e) => { throw e; });
    assert.strictEqual(mockRes.statusCode, 201);
    assert.strictEqual(mockRes.body.product.currentHighestBid, 550);
    assert.strictEqual(mockRes.body.product.highestBidderEmail, 'student@demo.edu');
    assert.strictEqual(mockRes.body.product.bidsCount, 1);
  });

  // Test 8: Bidding Rules - Minimum Increment Enforced
  await test('Subsequent bid must exceed current highest bid by minimum increment', async () => {
    const bidderB = await db.users.findOne({ email: 'rohan@demo.edu' });
    // Current is 550, min increment is 50 -> minimum valid is 600
    // Try bidding 580 (only +30)
    const mockReqBad = createMockReq({ amount: 580 }, { id: testAuctionId }, {}, bidderB);
    const mockResBad = createMockRes();
    await bidController.placeBid(mockReqBad, mockResBad, (e) => { throw e; });
    assert.strictEqual(mockResBad.statusCode, 400);
    assert(mockResBad.body.message.includes('minimum valid bid'));

    // Try bidding 650 (valid +100)
    const mockReqGood = createMockReq({ amount: 650 }, { id: testAuctionId }, {}, bidderB);
    const mockResGood = createMockRes();
    await bidController.placeBid(mockReqGood, mockResGood, (e) => { throw e; });
    assert.strictEqual(mockResGood.statusCode, 201);
    assert.strictEqual(mockResGood.body.product.currentHighestBid, 650);
    assert.strictEqual(mockResGood.body.product.highestBidderEmail, 'rohan@demo.edu');
    assert.strictEqual(mockResGood.body.product.bidsCount, 2);
  });

  // Test 9: Purchase Request Conflict Prevention
  await test('Accepting a request reserves listing and cancels conflicting requests', async () => {
    // Product p3 (Casio FX-991ES) has pending request r3 from rohan
    // Let's create another pending request for p3 from priya
    const priya = await db.users.findOne({ email: 'priya@demo.edu' });
    const mockReqPriya = createMockReq(
      { productId: 'p3', note: 'I also want to buy this calculator.' },
      {},
      {},
      priya
    );
    const mockResPriya = createMockRes();
    await requestController.createRequest(mockReqPriya, mockResPriya, (e) => { throw e; });
    assert.strictEqual(mockResPriya.statusCode, 201);
    const priyaReqId = mockResPriya.body.request.id || mockResPriya.body.request._id;

    // Now seller (student@demo.edu) accepts Rohan's request (r3)
    const seller = await db.users.findOne({ email: 'student@demo.edu' });
    const mockReqAccept = createMockReq({ status: 'Accepted' }, { id: 'r3' }, {}, seller);
    const mockResAccept = createMockRes();
    await requestController.updateRequestStatus(mockReqAccept, mockResAccept, (e) => { throw e; });
    assert.strictEqual(mockResAccept.statusCode, 200);

    // Verify product is now reserved
    const p3 = await db.products.findById('p3');
    assert.strictEqual(p3.status, 'reserved');

    // Verify Priya's conflicting request was automatically cancelled!
    const updatedPriyaReq = await db.requests.findById(priyaReqId);
    assert.strictEqual(updatedPriyaReq.status, 'Cancelled');
  });

  // Test 10: Ratings & Reviews with Fraud / Duplicate Prevention
  await test('Reviews are allowed only after completed transactions without duplicates', async () => {
    const student = await db.users.findOne({ email: 'student@demo.edu' });

    // Request r1 is still Pending, so review must be rejected
    const mockReqPending = createMockReq(
      { requestId: 'r1', rating: 5, comment: 'Great seller' },
      {},
      {},
      student
    );
    const mockResPending = createMockRes();
    await reviewController.createReview(mockReqPending, mockResPending, (e) => { throw e; });
    assert.strictEqual(mockResPending.statusCode, 400);
    assert(mockResPending.body.message.includes('only be submitted after a transaction has been successfully marked as Completed'));

    // Request r2 is Completed, but student already reviewed it in seed data!
    const mockReqDuplicate = createMockReq(
      { requestId: 'r2', rating: 4, comment: 'Duplicate review attempt' },
      {},
      {},
      student
    );
    const mockResDuplicate = createMockRes();
    await reviewController.createReview(mockReqDuplicate, mockResDuplicate, (e) => { throw e; });
    assert.strictEqual(mockResDuplicate.statusCode, 400);
    assert(mockResDuplicate.body.message.includes('already submitted a review'));
  });

  // Test 11: Admin Moderation Controls
  await test('Admin can toggle user status and view system activity', async () => {
    const admin = await db.users.findOne({ email: 'admin@demo.edu' });

    // Reactivate Kabir (who was suspended)
    const mockReqToggle = createMockReq({}, { id: 'kabir@demo.edu' }, {}, admin);
    const mockResToggle = createMockRes();
    await adminController.toggleUserStatus(mockReqToggle, mockResToggle, (e) => { throw e; });
    assert.strictEqual(mockResToggle.statusCode, 200);
    assert.strictEqual(mockResToggle.body.user.status, 'active');

    // Check admin stats
    const mockResStats = createMockRes();
    await adminController.getStats(createMockReq({}, {}, {}, admin), mockResStats, (e) => { throw e; });
    assert.strictEqual(mockResStats.statusCode, 200);
    assert(mockResStats.body.stats.totalUsers >= 6);
  });

  // Test 12: Auction Expiration & Winner Auto-Resolution
  await test('Auction expiration scheduler automatically finalizes winner and creates accepted request', async () => {
    // Manually backdate testAuctionId to the past
    await db.products.findByIdAndUpdate(testAuctionId, {
      auctionEnd: new Date(Date.now() - 1000).toISOString()
    });

    // Run scheduler check
    await checkAndFinalizeAuctions();

    const finalizedProd = await db.products.findById(testAuctionId);
    assert.strictEqual(finalizedProd.auctionStatus, 'completed');
    assert.strictEqual(finalizedProd.winnerEmail, 'rohan@demo.edu');
    assert.strictEqual(finalizedProd.winningBid, 650);

    // Verify automated transaction request was generated for the winner
    const winReq = await db.requests.findOne({
      productId: testAuctionId,
      buyerEmail: 'rohan@demo.edu',
      requestType: 'auction_win'
    });
    assert(winReq !== null);
    assert.strictEqual(winReq.status, 'Accepted');
    assert.strictEqual(winReq.offeredPrice, 650);
  });

  console.log('\n======================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  runTestSuite()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Fatal test error:', err);
      process.exit(1);
    });
}

module.exports = { runTestSuite };
