import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../hooks/useAuth';
import { notificationService } from '../services/notificationService';
import { NotificationItem, Announcement, ToastItem } from '../types/notification';

interface NotificationContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  toasts: ToastItem[];
  activeBanner: Announcement | null;
  activeModal: Announcement | null;
  activeSlideout: Announcement | null;
  isNotificationCenterOpen: boolean;
  isHotspotTourOpen: boolean;
  audioEnabled: boolean;
  setAudioEnabled: (enabled: boolean) => void;
  openNotificationCenter: () => void;
  closeNotificationCenter: () => void;
  toggleNotificationCenter: () => void;
  startHotspotTour: () => void;
  endHotspotTour: () => void;
  dismissBanner: (id: string) => void;
  dismissModal: (id: string) => void;
  dismissSlideout: (id: string) => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
  addToast: (toast: Omit<ToastItem, 'id' | 'timestamp'>) => void;
  removeToast: (id: string) => void;
  refreshNotifications: () => Promise<void>;
  handleClickAction: (actionUrl?: string, announcementId?: string) => void;
  triggerSimulatedNotification: (type: 'modal' | 'banner' | 'toast' | 'slideout' | 'application') => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Web Audio API chime synthesizer for notification alerts
const playSubtleChime = () => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {}
};

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, token } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [activeBanner, setActiveBanner] = useState<Announcement | null>(null);
  const [activeModal, setActiveModal] = useState<Announcement | null>(null);
  const [activeSlideout, setActiveSlideout] = useState<Announcement | null>(null);
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState<boolean>(false);
  const [isHotspotTourOpen, setIsHotspotTourOpen] = useState<boolean>(false);
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);

  // Helper to check if an announcement was dismissed locally
  const isDismissed = (id: string, format: string) => {
    try {
      return localStorage.getItem(`recruitx_dismissed_${format}_${id}`) === 'true';
    } catch {
      return false;
    }
  };

  const markDismissedLocally = (id: string, format: string) => {
    try {
      localStorage.setItem(`recruitx_dismissed_${format}_${id}`, 'true');
    } catch {}
  };

  const addToast = useCallback((toastData: Omit<ToastItem, 'id' | 'timestamp'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: ToastItem = {
      ...toastData,
      id,
      timestamp: new Date(),
    };

    setToasts((prev) => [newToast, ...prev].slice(0, 5)); // Keep max 5 active toasts

    if (audioEnabled) {
      playSubtleChime();
    }

    // Auto-remove toast
    const duration = toastData.durationMs || 5000;
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, [audioEnabled]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const refreshNotifications = useCallback(async () => {
    if (!token) return;
    try {
      const data = await notificationService.getNotifications();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch (err) {
      console.warn('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Fetch active announcements (Banners, Modals, Feature Spotlights)
  const refreshAnnouncements = useCallback(async () => {
    if (!token || user?.role === 'recruiter') return;
    try {
      const announcements = await notificationService.getActiveAnnouncements();
      
      // Find eligible banner
      const banner = announcements.find((a) => a.format === 'banner' && !isDismissed(a._id, 'banner'));
      if (banner) {
        setActiveBanner(banner);
        notificationService.trackImpression(banner._id);
      }

      // Find eligible modal
      const modal = announcements.find((a) => a.format === 'modal' && !isDismissed(a._id, 'modal'));
      if (modal) {
        setActiveModal(modal);
        notificationService.trackImpression(modal._id);
      }

      // Find eligible slideout spotlight
      const slideout = announcements.find((a) => a.format === 'slideout' && !isDismissed(a._id, 'slideout'));
      if (slideout) {
        setActiveSlideout(slideout);
        notificationService.trackImpression(slideout._id);
      }
    } catch (err) {
      console.warn('Failed to load active announcements:', err);
    }
  }, [token, user?.role]);

  // Initial load
  useEffect(() => {
    if (token) {
      refreshNotifications();
      if (user?.role !== 'recruiter') {
        refreshAnnouncements();
      } else {
        setActiveBanner(null);
        setActiveModal(null);
        setActiveSlideout(null);
      }
    } else {
      setNotifications([]);
      setUnreadCount(0);
      setActiveBanner(null);
      setActiveModal(null);
      setActiveSlideout(null);
      setToasts([]);
    }
  }, [token, refreshNotifications, refreshAnnouncements]);

  // Stable ref for addToast to avoid socket reconnect churn
  const addToastRef = useRef(addToast);
  useEffect(() => {
    addToastRef.current = addToast;
  }, [addToast]);

  // Socket.io Real-Time Connection
  useEffect(() => {
    if (!token) return;

    // Determine socket server URL
    const envSocketUrl = (import.meta as any).env?.VITE_SOCKET_URL;
    const envApiBase = (import.meta as any).env?.VITE_API_BASE_URL;
    let socketUrl = 'http://localhost:5000';

    if (envSocketUrl) {
      socketUrl = envSocketUrl;
    } else if (envApiBase) {
      // Strip trailing /api if user specified full backend URL
      socketUrl = envApiBase.replace(/\/api\/?$/, '');
    } else if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      socketUrl = window.location.origin;
    }

    const socket: Socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      console.log('⚡️ Connected to RecruitX Real-Time Notification Gateway');
    });

    // Handle direct user notifications (e.g. application submitted, status change, interview scheduled, new message)
    socket.on('notification:new', (payload: any) => {
      const notif = payload.notification || payload;
      if (!notif) return;

      // 1. Strict deduplication to ensure item never appears twice in drawer
      setNotifications((prev) => {
        if (notif._id && prev.some((n) => n._id === notif._id)) {
          return prev;
        }
        return [notif, ...prev];
      });
      setUnreadCount((prev) => prev + 1);

      // 2. If the user is actively inside the messages page, don't pop up an intrusive toast for chat messages
      const isMessagesPage = window.location.pathname.includes('/messages');
      if (notif.type === 'message' && isMessagesPage) {
        return;
      }

      if (notif.format === 'modal') {
        setActiveModal({
          _id: notif._id,
          title: notif.title,
          message: notif.message,
          type: notif.type,
          format: 'modal',
          targetAudience: 'student',
          priority: notif.priority || 'urgent',
          actionText: notif.actionText,
          actionUrl: notif.actionUrl,
          status: 'active',
          scheduledAt: new Date().toISOString(),
          impressions: 1,
          clicks: 0,
          createdAt: new Date().toISOString(),
        });
      } else {
        // Trigger clean single Toast popup
        addToastRef.current({
          title: notif.title,
          message: notif.message,
          type: notif.type,
          priority: notif.priority,
          actionText: notif.actionText,
          actionUrl: notif.actionUrl || notif.link,
        });
      }
    });

    // Handle platform-wide or targeted announcements broadcasted by Admin
    socket.on('announcement:new', (payload: any) => {
      if (user?.role === 'recruiter') return;
      const ann = payload.announcement;
      const notif = payload.notification;

      if (notif) {
        setNotifications((prev) => {
          if (notif._id && prev.some((n) => n._id === notif._id)) return prev;
          return [notif, ...prev];
        });
        setUnreadCount((prev) => prev + 1);
      }

      if (ann) {
        if (ann.format === 'banner' && !isDismissed(ann._id, 'banner')) {
          setActiveBanner(ann);
          notificationService.trackImpression(ann._id);
        } else if (ann.format === 'modal' && !isDismissed(ann._id, 'modal')) {
          setActiveModal(ann);
          notificationService.trackImpression(ann._id);
        } else if (ann.format === 'slideout' && !isDismissed(ann._id, 'slideout')) {
          setActiveSlideout(ann);
          notificationService.trackImpression(ann._id);
        } else if (ann.format === 'toast') {
          addToastRef.current({
            title: ann.title,
            message: ann.message,
            type: ann.type,
            priority: ann.priority,
            actionText: ann.actionText,
            actionUrl: ann.actionUrl,
            announcementId: ann._id,
          });
          notificationService.trackImpression(ann._id);
        }
      }
    });

    // Handle real-time incoming chat messages
    // Note: We only dispatch recruitx:message so active chat views update their chat bubble feed.
    // The notification toast & drawer item are handled cleanly and exclusively by notification:new above.
    socket.on('message:new', (payload: any) => {
      window.dispatchEvent(new CustomEvent('recruitx:message', { detail: payload }));
    });

    // Real-time job publishing, updating, and deactivation
    socket.on('job:published', (payload: any) => {
      window.dispatchEvent(new CustomEvent('recruitx:job-published', { detail: payload }));
      if (user?.role === 'student' && payload?.company) {
        addToastRef.current({
          title: 'New Opening Published',
          message: `${payload.company} posted: ${payload.title}`,
          type: 'job_alert',
          actionUrl: '/student/jobs',
        });
      }
    });

    socket.on('job:updated', (payload: any) => {
      window.dispatchEvent(new CustomEvent('recruitx:job-updated', { detail: payload }));
    });

    socket.on('job:deleted', (payload: any) => {
      window.dispatchEvent(new CustomEvent('recruitx:job-deleted', { detail: payload }));
    });

    return () => {
      socket.off('notification:new');
      socket.off('announcement:new');
      socket.off('message:new');
      socket.off('job:published');
      socket.off('job:updated');
      socket.off('job:deleted');
      socket.disconnect();
    };
  }, [token, user]);

  const markAsRead = async (id: string) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await notificationService.deleteNotification(id);
      const target = notifications.find((n) => n._id === id);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      if (target && !target.read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const clearAll = async () => {
    try {
      await notificationService.clearAll();
      setNotifications([]);
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  const dismissBanner = (id: string) => {
    markDismissedLocally(id, 'banner');
    setActiveBanner(null);
  };

  const dismissModal = (id: string) => {
    markDismissedLocally(id, 'modal');
    setActiveModal(null);
  };

  const dismissSlideout = (id: string) => {
    markDismissedLocally(id, 'slideout');
    setActiveSlideout(null);
  };

  const openNotificationCenter = () => setIsNotificationCenterOpen(true);
  const closeNotificationCenter = () => setIsNotificationCenterOpen(false);
  const toggleNotificationCenter = () => setIsNotificationCenterOpen((prev) => !prev);
  const startHotspotTour = () => setIsHotspotTourOpen(true);
  const endHotspotTour = () => setIsHotspotTourOpen(false);

  const handleClickAction = (actionUrl?: string, announcementId?: string) => {
    if (announcementId) {
      notificationService.trackClick(announcementId);
    }
    if (actionUrl) {
      if (actionUrl.startsWith('http://') || actionUrl.startsWith('https://')) {
        window.open(actionUrl, '_blank');
      } else {
        window.location.href = actionUrl;
      }
    }
  };

  // Function to simulate any notification format for easy evaluation & testing
  const triggerSimulatedNotification = (format: 'modal' | 'banner' | 'toast' | 'slideout' | 'application') => {
    const id = 'sim_' + Date.now();
    if (format === 'toast') {
      addToast({
        title: 'Interview Confirmed: Microsoft India',
        message: 'Your Technical Interview Round 1 has been scheduled for tomorrow at 2:00 PM IST.',
        type: 'interview_invite',
        priority: 'high',
        actionText: 'View Interview Details',
        actionUrl: '/student/jobs',
      });
    } else if (format === 'banner') {
      setActiveBanner({
        _id: id,
        title: 'Mega Campus Placement Drive 2026',
        message: 'Top tech companies are reviewing applications! Application deadline closes in 48 hours.',
        type: 'placement_drive',
        format: 'banner',
        targetAudience: 'student',
        priority: 'urgent',
        actionText: 'Explore & Apply',
        actionUrl: '/student/jobs',
        status: 'active',
        scheduledAt: new Date().toISOString(),
        impressions: 1,
        clicks: 0,
        createdAt: new Date().toISOString(),
      });
    } else if (format === 'modal') {
      setActiveModal({
        _id: id,
        title: '🎉 Formal Placement Offer Received!',
        message: 'Google Cloud has extended a Full-Time Software Engineer offer (₹24 LPA). Please review your offer letter and respond before October 5th.',
        type: 'placement_drive',
        format: 'modal',
        targetAudience: 'student',
        priority: 'urgent',
        actionText: 'Accept / Review Offer',
        actionUrl: '/student/jobs',
        status: 'active',
        scheduledAt: new Date().toISOString(),
        impressions: 1,
        clicks: 0,
        createdAt: new Date().toISOString(),
      });
    } else if (format === 'slideout') {
      setActiveSlideout({
        _id: id,
        title: '🤖 New: AI Mock Interview Simulator',
        message: 'Practice real-time technical and behavioral interviews with instant AI feedback on communication, coding logic, and confidence.',
        type: 'job_recommendation',
        format: 'slideout',
        targetAudience: 'student',
        priority: 'normal',
        actionText: 'Launch Mock Interview',
        actionUrl: '/student/mock-interview',
        status: 'active',
        scheduledAt: new Date().toISOString(),
        impressions: 1,
        clicks: 0,
        createdAt: new Date().toISOString(),
      });
    } else if (format === 'application') {
      addToast({
        title: 'New Candidate Applied: John Doe',
        message: 'Applied for Full Stack Engineer (React & Node.js). Match score: 94%',
        type: 'application_update',
        priority: 'normal',
        actionText: 'Review Candidate',
        actionUrl: '/recruiter/applications',
      });
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        toasts,
        activeBanner,
        activeModal,
        activeSlideout,
        isNotificationCenterOpen,
        isHotspotTourOpen,
        audioEnabled,
        setAudioEnabled,
        openNotificationCenter,
        closeNotificationCenter,
        toggleNotificationCenter,
        startHotspotTour,
        endHotspotTour,
        dismissBanner,
        dismissModal,
        dismissSlideout,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        clearAll,
        addToast,
        removeToast,
        refreshNotifications,
        handleClickAction,
        triggerSimulatedNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
