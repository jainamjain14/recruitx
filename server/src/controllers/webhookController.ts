import { Request, Response } from 'express';
import { Application } from '../models/Application.js';
import { AtsVerificationService } from '../services/atsVerificationService.js';
import { Notification } from '../models/Notification.js';
import { emitToUser } from '../socket.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

export const handleEmployerAtsWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers['x-recruitx-webhook-secret'] || req.headers['authorization'];
    const expectedSecret = process.env.WEBHOOK_SECRET || process.env.JWT_SECRET || 'recruitx_secure_ats_webhook_secret_2026';

    const providedSecret = typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : authHeader;

    if (!providedSecret || providedSecret !== expectedSecret) {
      sendError(res, 'Unauthorized webhook request: Invalid or missing webhook secret header', null, 401);
      return;
    }

    const {
      event,
      applicationId,
      externalApplicationId,
      atsProvider = 'External ATS',
      company,
      candidateEmail,
      newStatus,
      notes,
    } = req.body;

    if (!event || (!applicationId && (!company || !candidateEmail))) {
      sendError(res, 'Missing required webhook payload fields (event, and either applicationId or company + candidateEmail)', null, 400);
      return;
    }

    let application: any = null;
    if (applicationId) {
      application = await Application.findById(applicationId);
    }

    if (!application && company) {
      const allApps = await Application.find({});
      application = allApps.find(
        (a) => a.companyName && a.companyName.toLowerCase().trim() === company.toLowerCase().trim()
      );
    }

    if (!application) {
      sendError(res, 'Target application matching webhook criteria not found', null, 404);
      return;
    }

    const confirmedAt = new Date();
    const refNum = externalApplicationId || `WH-${Date.now().toString(36).toUpperCase()}`;

    const receiptHash = AtsVerificationService.generateReceiptHash({
      applicationId: application._id,
      referenceNumber: refNum,
      senderEmail: `${(company || 'ats').toLowerCase().replace(/[^a-z0-9]/g, '')}@ats-webhook.internal`,
      confirmedAt,
    });

    application.employerReceipt = {
      receiptSource: 'employer_webhook',
      externalReferenceNumber: refNum,
      acknowledgedBy: `${company || application.companyName} (${atsProvider} Authorized Webhook)`,
      receiptHash,
      confirmedAt,
      isIndependentlyAuthenticated: true,
      evidenceClassification: 'independently_authenticated',
      verifiedNotes: notes || `Authenticated webhook event [${event}] confirmed by ${atsProvider}.`,
    };

    application.evidenceClassification = 'independently_authenticated';
    application.externalAtsName = atsProvider;
    application.externalStatus = newStatus || 'Application Received by Employer';

    if (event === 'application.received') {
      application.status = 'employer_receipt_confirmed';
      application.primaryStatus = 'employer_receipt_confirmed';
      application.submissionStatus = 'submitted';
      application.verificationLifecycleStage = 'employer_receipt_confirmed';
      application.statusHistory.push({
        status: application.status,
        changedAt: confirmedAt,
        note: `Employer-side receipt confirmed via authenticated ${atsProvider} webhook (Ref #${refNum}).`,
      });
    } else if (event === 'application.status_update' || newStatus) {
      const stage = newStatus || 'under_review';
      application.status = 'employer_status_updated';
      application.primaryStatus = 'employer_status_updated';
      application.hiringStage = stage;
      application.verificationLifecycleStage = 'employer_status_updated';
      application.statusHistory.push({
        status: stage,
        changedAt: confirmedAt,
        note: `Employer updated status to ${stage.replace('_', ' ').toUpperCase()} via ${atsProvider} webhook.`,
      });
    }

    await application.save();

    // Notify candidate
    const studentId = typeof application.student === 'object' && application.student?._id ? application.student._id : application.student;
    if (studentId) {
      try {
        const notif = await Notification.create({
          recipient: studentId,
          title: event === 'application.received' ? 'Employer Application Receipt Confirmed' : 'Employer Updated Application Status',
          message: `${application.companyName} independently acknowledged your application via ${atsProvider} (Ref #${refNum}).`,
          type: 'application_update',
          priority: 'high',
          format: 'toast',
        });
        emitToUser(studentId.toString(), 'notification:new', { notification: notif });
      } catch (err) {
        // Notification creation non-fatal
      }
    }

    sendSuccess(res, 'Employer ATS webhook processed and application record authenticated successfully', {
      applicationId: application._id,
      authoritativeStatus: application.status,
      evidenceClassification: application.evidenceClassification,
      externalReferenceNumber: refNum,
    });
  } catch (error: any) {
    sendError(res, error.message || 'Failed to process employer ATS webhook', null, 500);
  }
};
