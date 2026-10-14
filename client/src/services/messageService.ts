import { api } from './api';

export interface ChatContact {
  _id: string;
  name: string;
  email?: string;
  role: string;
  company?: string;
  headline?: string;
}

export interface ChatMessage {
  _id: string;
  sender: string | { _id: string; name: string; role: string };
  recipient: string | { _id: string; name: string; role: string };
  content: string;
  read: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationItem {
  contact: ChatContact;
  lastMessage: ChatMessage;
  unreadCount: number;
}

export const messageService = {
  getConversations: async (): Promise<ConversationItem[]> => {
    const res = await api.get('/messages');
    return res.data?.data?.conversations || [];
  },

  getRecruiterContacts: async (): Promise<ChatContact[]> => {
    const res = await api.get('/messages/contacts/recruiters');
    return res.data?.data?.contacts || [];
  },

  getConversation: async (
    recipientId: string
  ): Promise<{ messages: ChatMessage[]; recipient: ChatContact }> => {
    const res = await api.get(`/messages/${recipientId}`);
    return res.data?.data || { messages: [], recipient: { _id: recipientId, name: 'User', role: 'student' } };
  },

  sendMessage: async (recipientId: string, content: string): Promise<ChatMessage> => {
    const res = await api.post('/messages', { recipientId, content });
    return res.data?.data?.message;
  },

  markConversationRead: async (recipientId: string): Promise<number> => {
    const res = await api.patch(`/messages/${recipientId}/read`);
    return res.data?.data?.count || 0;
  },
};
