const db = require('./dbAdapter');

const checkAndFinalizeAuctions = async () => {
  try {
    const now = new Date();
    // Find all active bidding listings whose auction end time has passed
    const activeAuctions = await db.products.find({
      pricingModel: 'bidding',
      auctionStatus: 'active'
    });

    const expiredListings = activeAuctions.filter(p => p.auctionEnd && new Date(p.auctionEnd) <= now);

    for (const listing of expiredListings) {
      const listingId = String(listing.id || listing._id);

      // Fetch all bids for this listing, sorted highest first
      const bids = await db.bids.find({ listingId }, { amount: -1, createdAt: 1 });

      if (bids.length > 0) {
        const winningBid = bids[0];

        // Update product to completed with winner details
        await db.products.findByIdAndUpdate(listingId, {
          auctionStatus: 'completed',
          status: 'reserved',
          winningBid: winningBid.amount,
          winnerEmail: winningBid.bidderEmail,
          winnerName: winningBid.bidderName,
          highestBidderEmail: winningBid.bidderEmail,
          highestBidderName: winningBid.bidderName
        });

        // Notify the winning student
        await db.notifications.create({
          id: 'n_' + Date.now() + Math.random().toString(36).substring(2, 6),
          toEmail: winningBid.bidderEmail,
          type: 'auction_win',
          title: '🎉 You Won the Auction!',
          message: `Congratulations! You won the auction for "${listing.name}" with a final bid of ₹${winningBid.amount}. Connect with the seller to finalize the exchange.`,
          time: new Date().toLocaleString('en-GB'),
          read: false,
          link: 'requests'
        });

        // Notify the seller
        await db.notifications.create({
          id: 'n_' + Date.now() + Math.random().toString(36).substring(2, 6),
          toEmail: listing.sellerEmail,
          type: 'auction_win',
          title: 'Auction Successfully Ended',
          message: `Your auction for "${listing.name}" ended with a winning bid of ₹${winningBid.amount} by ${winningBid.bidderName} (${winningBid.bidderEmail}).`,
          time: new Date().toLocaleString('en-GB'),
          read: false,
          link: 'requests'
        });

        // Check if an auction_win request already exists
        const existingReq = await db.requests.findOne({
          productId: listingId,
          buyerEmail: winningBid.bidderEmail,
          requestType: 'auction_win'
        });

        if (!existingReq) {
          // Automatically create an Accepted Request to seamlessly integrate into purchase/request workflow!
          await db.requests.create({
            id: 'r_auc_' + Date.now() + Math.random().toString(36).substring(2, 5),
            productId: listingId,
            productName: listing.name,
            buyerId: winningBid.bidderId,
            buyerEmail: winningBid.bidderEmail,
            buyerName: winningBid.bidderName,
            sellerId: listing.sellerId || listing.sellerEmail,
            sellerEmail: listing.sellerEmail,
            sellerName: listing.sellerName || listing.sellerEmail,
            requestType: 'auction_win',
            offeredPrice: winningBid.amount,
            note: `Winning auction bid: ₹${winningBid.amount}. Automated request generated upon auction completion.`,
            status: 'Accepted',
            date: new Date().toLocaleDateString('en-GB')
          });
        }

        // Log activity
        await db.activities.create({
          id: 'a_' + Date.now(),
          type: 'auction',
          text: `Auction for "${listing.name}" completed. Winner: ${winningBid.bidderName} (₹${winningBid.amount}).`,
          time: new Date().toLocaleString('en-GB')
        });

        console.log(`[Auction Service] Closed auction "${listing.name}" — Winner: ${winningBid.bidderName} at ₹${winningBid.amount}`);
      } else {
        // No bids placed
        await db.products.findByIdAndUpdate(listingId, {
          auctionStatus: 'completed',
          status: 'available',
          winningBid: null,
          winnerEmail: null
        });

        await db.notifications.create({
          id: 'n_' + Date.now() + Math.random().toString(36).substring(2, 6),
          toEmail: listing.sellerEmail,
          type: 'general',
          title: 'Auction Ended with No Bids',
          message: `Your auction for "${listing.name}" reached its deadline with no bids placed. You can re-list or set a fixed price.`,
          time: new Date().toLocaleString('en-GB'),
          read: false,
          link: 'listings'
        });

        await db.activities.create({
          id: 'a_' + Date.now(),
          type: 'auction',
          text: `Auction for "${listing.name}" closed with no bids placed.`,
          time: new Date().toLocaleString('en-GB')
        });

        console.log(`[Auction Service] Closed auction "${listing.name}" with 0 bids.`);
      }
    }
  } catch (err) {
    console.error('[Auction Service] Error checking auctions:', err);
  }
};

let auctionTimer = null;

const startAuctionScheduler = (intervalMs = 15000) => {
  if (auctionTimer) clearInterval(auctionTimer);
  // Run once immediately, then repeatedly
  checkAndFinalizeAuctions();
  auctionTimer = setInterval(checkAndFinalizeAuctions, intervalMs);
  console.log(`[Auction Scheduler] Started background auction monitor (interval: ${intervalMs}ms).`);
};

module.exports = { checkAndFinalizeAuctions, startAuctionScheduler };
