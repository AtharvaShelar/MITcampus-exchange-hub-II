const db = require('../services/dbAdapter');

// @route   GET /api/conversations
exports.getConversations = async (req, res, next) => {
  try {
    const userEmail = req.user.email;
    const allConvs = await db.conversations.find({});

    // Filter conversations where user is a participant
    const userConvs = allConvs.filter(c => {
      if (Array.isArray(c.participants)) {
        return c.participants.includes(userEmail);
      }
      return c.withEmail !== userEmail; // fallback
    });

    // Enrich with other party details and product
    const enriched = [];
    for (const c of userConvs) {
      let otherEmail = '';
      if (Array.isArray(c.participants)) {
        otherEmail = c.participants.find(p => p !== userEmail) || c.participants[0];
      } else {
        otherEmail = c.withEmail;
      }

      const otherUser = await db.users.findOne({ email: otherEmail });
      const product = c.productId ? await db.products.findById(c.productId) : null;

      enriched.push({
        ...c,
        otherUser: otherUser ? {
          name: otherUser.name,
          email: otherUser.email,
          department: otherUser.department
        } : { name: otherEmail, email: otherEmail },
        product: product ? {
          id: product.id || product._id,
          name: product.name,
          image: product.image,
          price: product.price
        } : null
      });
    }

    res.json({
      success: true,
      count: enriched.length,
      conversations: enriched
    });
  } catch (err) {
    next(err);
  }
};

// @route   GET /api/conversations/:id
exports.getConversationById = async (req, res, next) => {
  try {
    const conv = await db.conversations.findOne({ id: req.params.id }) ||
                 await db.conversations.findById(req.params.id);

    if (!conv) {
      return res.status(404).json({ success: false, message: 'Conversation not found.' });
    }

    // Access authorization check
    const isParticipant = Array.isArray(conv.participants)
      ? conv.participants.includes(req.user.email)
      : (conv.withEmail === req.user.email || true);

    if (!isParticipant && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'You are not a participant in this conversation.' });
    }

    res.json({
      success: true,
      conversation: conv
    });
  } catch (err) {
    next(err);
  }
};

// @route   POST /api/conversations
exports.startConversation = async (req, res, next) => {
  try {
    const { withEmail, productId } = req.body;

    if (!withEmail) {
      return res.status(400).json({ success: false, message: 'Target recipient email is required.' });
    }

    if (withEmail === req.user.email) {
      return res.status(400).json({ success: false, message: 'You cannot start a conversation with yourself.' });
    }

    // Check if an existing conversation exists between these two users for this product
    const existing = await db.conversations.findOne({
      participants: { $in: [req.user.email] }
    });

    const all = await db.conversations.find({});
    const found = all.find(c => {
      const parts = c.participants || [];
      const hasMe = parts.includes(req.user.email);
      const hasOther = parts.includes(withEmail);
      const sameProd = productId ? String(c.productId) === String(productId) : true;
      return hasMe && hasOther && sameProd;
    });

    if (found) {
      return res.json({
        success: true,
        conversation: found,
        message: 'Existing conversation opened.'
      });
    }

    const convId = 'c_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    const newConv = await db.conversations.create({
      id: convId,
      participants: [req.user.email, withEmail],
      withEmail: withEmail,
      productId: productId || null,
      messages: []
    });

    res.status(201).json({
      success: true,
      conversation: newConv,
      message: 'New conversation started.'
    });
  } catch (err) {
    next(err);
  }
};

// @route   POST /api/conversations/:id/messages
exports.sendMessage = async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: 'Message text cannot be empty.' });
    }

    const conv = await db.conversations.findOne({ id: req.params.id }) ||
                 await db.conversations.findById(req.params.id);

    if (!conv) {
      return res.status(404).json({ success: false, message: 'Conversation not found.' });
    }

    const isParticipant = Array.isArray(conv.participants)
      ? conv.participants.includes(req.user.email)
      : true;

    if (!isParticipant && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to send messages in this conversation.' });
    }

    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

    const newMsg = {
      id: 'm_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
      from: req.user.email,
      text: text.trim(),
      time: timeStr,
      createdAt: now.toISOString()
    };

    const messages = Array.isArray(conv.messages) ? [...conv.messages, newMsg] : [newMsg];

    const updated = await db.conversations.findByIdAndUpdate(conv.id || conv._id, {
      messages,
      updatedAt: now.toISOString()
    });

    // Notify other participant
    let recipientEmail = '';
    if (Array.isArray(conv.participants)) {
      recipientEmail = conv.participants.find(p => p !== req.user.email) || '';
    } else if (conv.withEmail && conv.withEmail !== req.user.email) {
      recipientEmail = conv.withEmail;
    }

    if (recipientEmail) {
      await db.notifications.create({
        id: 'n_' + Date.now() + Math.random().toString(36).substring(2, 6),
        toEmail: recipientEmail,
        type: 'message',
        title: '💬 New Message',
        message: `${req.user.name}: "${text.trim().substring(0, 45)}${text.trim().length > 45 ? '...' : ''}"`,
        time: now.toLocaleString('en-GB'),
        read: false,
        link: 'chats'
      });
    }

    res.status(201).json({
      success: true,
      message: 'Message sent.',
      data: newMsg
    });
  } catch (err) {
    next(err);
  }
};
