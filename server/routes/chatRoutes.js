const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { protect } = require('../middleware/auth');

router.get('/', protect, chatController.getConversations);
router.post('/', protect, chatController.startConversation);
router.get('/:id', protect, chatController.getConversationById);
router.post('/:id/messages', protect, chatController.sendMessage);

module.exports = router;
