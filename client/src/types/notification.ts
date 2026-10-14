export type NotificationType =
  | 'application_update'
  | 'interview_invite'
  | 'job_alert'
  | 'job_recommendation'
  | 'placement_drive'
  | 'system'
  | 'maintenance';

export type NotificationFormat = 'inbox' | 'banner' | 'modal' | 'toast' | 'slideout';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';
export type TargetAudience = 'all' | 'student' | 'recruiter';

export interface NotificationItem {
  _id: string;
  recipient: string;
  title: string;
  message: string;
  type: NotificationType;
  format?: NotificationFormat;
  priority?: NotificationPriority;
  link?: string;
  actionText?: string;
  actionUrl?: string;
  imageUrl?: string;
  announcementId?: string;
  expiresAt?: string;
  read: boolean;
  metadata?: any;
  createdAt: string;
  updatedAt?: string;
}

export interface Announcement {
  _id: string;
  title: string;
  message: string;
  type: NotificationType;
  format: NotificationFormat;
  targetAudience: TargetAudience;
  targetSegment?: string;
  priority: NotificationPriority;
  actionText?: string;
  actionUrl?: string;
  imageUrl?: string;
  status: 'active' | 'scheduled' | 'expired' | 'draft';
  scheduledAt: string;
  expiresAt?: string | null;
  impressions: number;
  clicks: number;
  ctr?: number;
  metadata?: any;
  createdBy?: string;
  createdAt: string;
}

export interface ToastItem {
  id: string;
  title: string;
  message: string;
  type?: NotificationType;
  priority?: NotificationPriority;
  actionText?: string;
  actionUrl?: string;
  durationMs?: number;
  announcementId?: string;
  timestamp: Date;
}

export interface CampaignAnalytics {
  summary: {
    totalCampaigns: number;
    totalImpressions: number;
    totalClicks: number;
    averageCtr: number;
  };
  campaigns: Announcement[];
}
