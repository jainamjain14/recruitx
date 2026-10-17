/**
 * Interview Reminder Service
 * ---------------------------
 * Runs every minute. If an interview is scheduled to start within the next
 * 15 minutes (and hasn't been reminded yet), sends a push notification via
 * Socket.io + persists a DB notification to both the recruiter and the student.
 *
 * "reminderSent" flag on the interview document prevents duplicate firing.
 */

import { Interview } from '../models/Interview.js';
import { Notification } from '../models/Notification.js';
import { emitToUser } from '../socket.js';
import { logger } from '../utils/logger.js';

const REMINDER_WINDOW_MINUTES = 15; // how many minutes before the meeting to send the reminder
const POLL_INTERVAL_MS = 60 * 1000; // check every 60 seconds

let reminderTimer: ReturnType<typeof setInterval> | null = null;

async function checkAndSendReminders(): Promise<void> {
  try {
    const now = new Date();
    // Window: interviews starting between now and (now + 15 min)
    const windowStart = new Date(now.getTime());
    const windowEnd   = new Date(now.getTime() + REMINDER_WINDOW_MINUTES * 60 * 1000);

    const upcoming = await Interview.findUpcomingUnreminded(windowStart, windowEnd);

    for (const interview of upcoming) {
      const studentId   = typeof interview.student   === 'object' ? interview.student?._id?.toString()   : interview.student?.toString();
      const recruiterId = typeof interview.recruiter === 'object' ? interview.recruiter?._id?.toString() : interview.recruiter?.toString();

      if (!studentId || !recruiterId) continue;

      const scheduledTime = new Date(interview.scheduledAt).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Kolkata',
      });

      const meetingPath = interview.meetingLink?.startsWith('/')
        ? interview.meetingLink
        : `/meeting/${interview.meetingLink?.split('recruitx-').pop() || interview._id.slice(-6)}`;

      // ── Notify student ──────────────────────────────────────────────────────
      const studentNotif = await Notification.create({
        recipient: studentId,
        title: '⏰ Interview Starting Soon!',
        message: `Your interview "${interview.title}" starts at ${scheduledTime}. Join the meeting now to be ready.`,
        type: 'interview_invite',
        format: 'modal',
        priority: 'urgent',
        actionText: 'Join Meeting',
        actionUrl: '/student/applications',
        link: '/student/applications',
        metadata: {
          meetingLink: meetingPath,
          scheduledAt: interview.scheduledAt,
          interviewId: interview._id,
        },
      });
      emitToUser(studentId, 'notification:new', { notification: studentNotif });

      // ── Notify recruiter ────────────────────────────────────────────────────
      const recruiterNotif = await Notification.create({
        recipient: recruiterId,
        title: '⏰ Interview Starting Soon!',
        message: `Your interview "${interview.title}" with the candidate starts at ${scheduledTime}. Open the meeting room to host.`,
        type: 'interview_invite',
        format: 'modal',
        priority: 'urgent',
        actionText: 'Join as Host',
        actionUrl: '/recruiter/interviews',
        link: '/recruiter/interviews',
        metadata: {
          meetingLink: meetingPath,
          scheduledAt: interview.scheduledAt,
          interviewId: interview._id,
        },
      });
      emitToUser(recruiterId, 'notification:new', { notification: recruiterNotif });

      // ── Mark reminder sent so we don't fire again ────────────────────────────
      await Interview.markReminderSent(interview._id);

      logger.info(`[ReminderService] Sent 15-min reminder for interview "${interview.title}" (${interview._id})`);
    }
  } catch (err: any) {
    logger.error('[ReminderService] Error during reminder check:', err?.message || err);
  }
}

/** Start the reminder cron (called once from server.ts) */
export function startReminderService(): void {
  if (reminderTimer) return; // already running
  logger.info(`[ReminderService] Started — checking every ${POLL_INTERVAL_MS / 1000}s for interviews within ${REMINDER_WINDOW_MINUTES} min`);

  // Run immediately on startup, then every minute
  checkAndSendReminders();
  reminderTimer = setInterval(checkAndSendReminders, POLL_INTERVAL_MS);
}

/** Stop the reminder cron (graceful shutdown) */
export function stopReminderService(): void {
  if (reminderTimer) {
    clearInterval(reminderTimer);
    reminderTimer = null;
    logger.info('[ReminderService] Stopped.');
  }
}
