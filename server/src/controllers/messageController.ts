import { Response } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import { Message } from '../models/Message.js';
import { User } from '../models/User.js';
import { Notification } from '../models/Notification.js';
import { Job } from '../models/Job.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { emitToUser } from '../socket.js';

/**
 * Get roster of available recruiters and campus placement coordinators
 */
export const getRecruiterContacts = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const [recruiters, admins, jobs] = await Promise.all([
      User.find({ role: 'recruiter' }),
      User.find({ role: 'admin' }),
      Job.find({}),
    ]);

    const contactMap = new Map<string, any>();

    // 1. Add active recruiters
    for (const r of recruiters) {
      contactMap.set(r._id, {
        _id: r._id,
        name: r.name,
        email: r.email,
        role: 'recruiter',
        company: r.company || 'Corporate Partner',
        title: `${r.company || 'Hiring'} Recruitment Lead`,
      });
    }

    // 2. Add placement cell administrators
    for (const a of admins) {
      contactMap.set(a._id, {
        _id: a._id,
        name: a.name,
        email: a.email,
        role: 'admin',
        company: 'Campus Placement Cell',
        title: 'Placement Officer / Coordinator',
      });
    }

    // 3. Add recruiters from active campus jobs if not yet in map
    for (const j of jobs) {
      const rId = typeof j.recruiter === 'object' && j.recruiter?._id ? j.recruiter._id : j.recruiter;
      if (rId && !contactMap.has(rId)) {
        contactMap.set(rId, {
          _id: rId,
          name: typeof j.recruiter === 'object' && j.recruiter?.name ? j.recruiter.name : `${j.company || 'Campus Partner'} Hiring Lead`,
          email: typeof j.recruiter === 'object' && j.recruiter?.email ? j.recruiter.email : '',
          role: 'recruiter',
          company: j.company || 'Campus Partner',
          title: `Hiring for ${j.title}`,
        });
      }
    }

    const contacts = Array.from(contactMap.values());
    sendSuccess(res, 'Recruiter contacts retrieved', { contacts });
  } catch (error: any) {
    sendError(res, error.message || 'Failed to fetch recruiter contacts', null, 500);
  }
};

/**
 * Send a message to a recipient
 */
export const sendMessage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const currentUser = req.user;
    if (!currentUser || !currentUser._id) {
      sendError(res, 'Authentication required', null, 401);
      return;
    }

    const { recipientId, content } = req.body;
    if (!recipientId || !content || !content.trim()) {
      sendError(res, 'Recipient ID and message content are required', null, 400);
      return;
    }

    const message = await Message.create({
      sender: currentUser._id,
      recipient: recipientId,
      content: content.trim(),
    });

    // Real-time delivery via Socket.io to recipient
    emitToUser(recipientId, 'message:new', {
      message,
      sender: {
        _id: currentUser._id,
        name: currentUser.name,
        role: currentUser.role,
        company: (currentUser as any).company || undefined,
      },
    });

    // In-app notification for recipient
    try {
      const senderRole = currentUser.role;
      const targetUrl = senderRole === 'student' ? '/recruiter/messages' : '/student/messages';
      const snippet = content.trim().length > 60 ? content.trim().slice(0, 60) + '...' : content.trim();

      const notif = await Notification.create({
        recipient: recipientId,
        title: `Message from ${currentUser.name}`,
        message: snippet,
        type: 'message',
        format: 'toast',
        priority: 'high',
        actionText: 'Reply',
        actionUrl: targetUrl,
        link: targetUrl,
      });

      emitToUser(recipientId, 'notification:new', { notification: notif });
    } catch {
      // Non-blocking
    }

    sendSuccess(res, 'Message sent', { message }, 201);
  } catch (error: any) {
    sendError(res, error.message || 'Failed to send message', null, 500);
  }
};
export const getConversations = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const currentUserId = req.user?._id;
    if (!currentUserId) {
      sendError(res, 'Authentication required', null, 401);
      return;
    }

    const convSummaries = await Message.getConversationsForUser(currentUserId);

    // Populate user profile info for each conversation contact
    const conversations = await Promise.all(
      convSummaries.map(async (c) => {
        const otherUser = await User.findById(c.otherUserId);
        return {
          contact: otherUser
            ? {
                _id: otherUser._id,
                name: otherUser.name,
                email: otherUser.email,
                role: otherUser.role,
                company: otherUser.company,
              }
            : {
                _id: c.otherUserId,
                name: 'Unknown User',
                role: 'student',
              },
          lastMessage: c.lastMessage,
          unreadCount: c.unreadCount,
        };
      })
    );

    sendSuccess(res, 'Conversations retrieved', { conversations });
  } catch (error: any) {
    sendError(res, error.message || 'Failed to fetch conversations', null, 500);
  }
};

/**
 * Get all messages in a conversation between current user and specified recipient
 */
export const getConversation = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const currentUserId = req.user?._id;
    if (!currentUserId) {
      sendError(res, 'Authentication required', null, 401);
      return;
    }

    const recipientId = Array.isArray(req.params.recipientId) ? req.params.recipientId[0] : req.params.recipientId;
    if (!recipientId) {
      sendError(res, 'Recipient ID is required', null, 400);
      return;
    }

    const [messages, recipientUser] = await Promise.all([
      Message.findConversation(currentUserId, recipientId),
      User.findById(recipientId),
    ]);

    // Automatically mark incoming messages as read
    await Message.markConversationAsRead(currentUserId, recipientId);

    sendSuccess(res, 'Messages retrieved', {
      messages,
      recipient: recipientUser
        ? {
            _id: recipientUser._id,
            name: recipientUser.name,
            email: recipientUser.email,
            role: recipientUser.role,
            company: recipientUser.company,
          }
        : {
            _id: recipientId,
            name: 'User',
            role: 'student',
          },
    });
  } catch (error: any) {
    sendError(res, error.message || 'Failed to fetch conversation', null, 500);
  }
};


/**
 * Mark all unread messages from a contact as read
 */
export const markConversationRead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const currentUserId = req.user?._id;
    if (!currentUserId) {
      sendError(res, 'Authentication required', null, 401);
      return;
    }

    const recipientId = Array.isArray(req.params.recipientId) ? req.params.recipientId[0] : req.params.recipientId;
    const count = await Message.markConversationAsRead(currentUserId, recipientId);
    sendSuccess(res, `Marked messages as read`, { count });
  } catch (error: any) {
    sendError(res, error.message || 'Failed to mark messages as read', null, 500);
  }
};
