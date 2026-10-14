import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import {
  getConversations,
  getConversation,
  sendMessage,
  markConversationRead,
  getRecruiterContacts,
} from '../controllers/messageController.js';

import { validateSendMessage } from '../middleware/validateMiddleware.js';

const router = Router();
router.use(authenticate);

// List available recruiters & placement coordinators
router.get('/contacts/recruiters', getRecruiterContacts);

// List user conversation threads
router.get('/', getConversations);

// Fetch conversation with a specific contact
router.get('/:recipientId', getConversation);

// Send message to contact
router.post('/', validateSendMessage, sendMessage);

// Mark conversation with contact as read
router.patch('/:recipientId/read', markConversationRead);

export default router;
