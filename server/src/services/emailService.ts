import { getVerifiedCompanyHrEmail } from './linkedinService.js';

export interface BrevoApplicationPayload {
  candidateName: string;
  candidateEmail: string;
  candidatePhone?: string;
  jobTitle: string;
  companyName: string;
  recipientEmail: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
  resumeAttachment?: {
    fileName: string;
    contentType: string;
    contentBase64: string;
    fileSize: number;
  };
  applicationId?: string;
  studentId?: string;
  jobId?: string;
}

export interface ApplicationEmailPayload {
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  companyName: string;
  headline?: string;
  summary?: string;
  skills?: string[];
  fieldOfInterest?: string;
  targetHrEmail?: string;
}

export class EmailService {
  /**
   * Diagnostic: log email provider status on startup
   */
  static async verifyEmailConfiguration(): Promise<void> {
    const brevoKey = (process.env.BREVO_API_KEY || '').trim();
    const senderEmail = (process.env.BREVO_SENDER_EMAIL || process.env.EMAIL_FROM_ADDRESS || '').trim();
    const senderName = process.env.EMAIL_FROM_NAME || 'RecruitX Platform';

    console.log('[EmailService] Provider: Brevo Transactional HTTPS API (Port 443)');
    console.log('[EmailService] BREVO_API_KEY configured:', brevoKey.length > 5 ? `yes (${brevoKey.length} chars)` : 'NO');
    console.log('[EmailService] Sender email configured:', senderEmail || 'NOT SET (defaults to recruitxproject@gmail.com)');
    console.log('[EmailService] Sender name:', senderName);

    if (!brevoKey) {
      console.warn('[EmailService] ⚠️ BREVO_API_KEY is missing. Emails cannot be dispatched. Set BREVO_API_KEY in Render.');
    }
  }

  /**
   * Send an email using Brevo's official Transactional Email HTTPS API
   * POST https://api.brevo.com/v3/smtp/email
   * Operates over standard HTTPS (port 443) — never blocked by Render or other cloud providers
   */
  private static async sendMail(options: {
    to: string;
    subject: string;
    html: string;
    replyTo?: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const { to, subject, html, replyTo } = options;
    const brevoKey = (process.env.BREVO_API_KEY || '').trim();
    const senderEmail = (process.env.BREVO_SENDER_EMAIL || process.env.EMAIL_FROM_ADDRESS || 'recruitxproject@gmail.com').trim();
    const senderName = process.env.EMAIL_FROM_NAME || 'RecruitX Platform';

    if (!brevoKey) {
      const errMsg = 'Email dispatch aborted: BREVO_API_KEY is not configured on the server';
      console.error(`[EmailService] ❌ ${errMsg}`);
      return { success: false, error: errMsg };
    }

    console.log(`[EmailService] Dispatching email to ${to} via Brevo HTTPS API...`);

    try {
      const payload: any = {
        sender: {
          name: senderName,
          email: senderEmail,
        },
        to: [
          { email: to }
        ],
        subject,
        htmlContent: html,
      };

      if (replyTo) {
        payload.replyTo = { email: replyTo };
      }

      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': brevoKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const resData: any = await response.json().catch(() => ({}));

      if (response.ok && resData.messageId) {
        console.log(`[EmailService] ✨ Live email dispatched via Brevo HTTPS to ${to}! MessageId: ${resData.messageId}`);
        return { success: true, messageId: resData.messageId };
      }

      const status = response.status;
      const apiCode = resData.code || 'UNKNOWN_ERROR';
      const apiMsg = resData.message || response.statusText || 'Unknown Brevo API error';

      console.error(`[EmailService] ❌ Brevo API error (HTTP ${status}) [${apiCode}]: ${apiMsg}`);

      let userFriendlyError = 'Failed to deliver verification email.';
      if (status === 401 || status === 403) {
        userFriendlyError = 'Email service authentication failed. Please verify BREVO_API_KEY.';
      } else if (status === 400 && apiMsg.toLowerCase().includes('sender')) {
        userFriendlyError = `Sender email "${senderEmail}" is not verified in Brevo. Please verify it in Brevo senders.`;
      } else if (apiMsg) {
        userFriendlyError = apiMsg;
      }

      return { success: false, error: userFriendlyError };
    } catch (networkErr: any) {
      console.error('[EmailService] ❌ Network request to Brevo API failed:', networkErr.message || networkErr);
      return { success: false, error: 'Could not connect to email service: ' + (networkErr.message || 'Network error') };
    }
  }

  /**
   * Dispatches a candidate's job application email and attached PDF resume
   * using Brevo Transactional HTTPS API (Port 443).
   * 
   * Strict email configuration:
   * - From: Verified RecruitX sender identity
   * - Display Name: "${candidateName} via RecruitX"
   * - To: Verified employer recruitment email
   * - Reply-To: Student's actual contact email
   * - Subject: Job-specific subject
   * - Body: Personalized application content
   * - Attachment: Student's actual resume PDF in base64
   */
  static async sendApplicationViaBrevo(options: BrevoApplicationPayload): Promise<{
    success: boolean;
    messageId?: string;
    senderEmail?: string;
    replyTo?: string;
    error?: string;
  }> {
    const {
      candidateName,
      candidateEmail,
      jobTitle,
      companyName,
      recipientEmail,
      subject,
      htmlBody,
      textBody,
      resumeAttachment,
      applicationId,
      studentId,
      jobId,
    } = options;

    const brevoKey = (process.env.BREVO_API_KEY || '').trim();
    const verifiedSenderEmail = (process.env.BREVO_SENDER_EMAIL || process.env.EMAIL_FROM_ADDRESS || 'recruitxproject@gmail.com').trim();
    const senderDisplayName = `${candidateName} via RecruitX`;

    if (!brevoKey) {
      const errMsg = 'Email dispatch aborted: BREVO_API_KEY is not configured on the server. Please set BREVO_API_KEY in Render environment variables.';
      console.error(`[EmailService] ❌ ${errMsg}`);
      return { success: false, error: errMsg };
    }

    console.log(`[EmailService] 🚀 Dispatching job application email for "${jobTitle}" at ${companyName} via Brevo HTTPS API...`);
    console.log(`[EmailService] ✉️ From: "${senderDisplayName}" <${verifiedSenderEmail}> | To: <${recipientEmail}> | Reply-To: <${candidateEmail}>`);

    try {
      const payload: any = {
        sender: {
          name: senderDisplayName,
          email: verifiedSenderEmail,
        },
        to: [
          {
            email: recipientEmail,
            name: `${companyName} Recruiting Team`,
          },
        ],
        replyTo: {
          email: candidateEmail,
          name: candidateName,
        },
        subject,
        htmlContent: htmlBody,
        headers: {
          'X-RecruitX-Application-ID': applicationId || '',
          'X-RecruitX-Student-ID': studentId || '',
          'X-RecruitX-Job-ID': jobId || '',
        },
        tags: ['recruitx-job-application'],
      };

      if (textBody) {
        payload.textContent = textBody;
      }

      if (resumeAttachment && resumeAttachment.contentBase64) {
        payload.attachment = [
          {
            name: resumeAttachment.fileName,
            content: resumeAttachment.contentBase64,
          },
        ];
        console.log(`[EmailService] 📎 Attached candidate resume: ${resumeAttachment.fileName} (${resumeAttachment.fileSize} bytes)`);
      }

      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': brevoKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const resData: any = await response.json().catch(() => ({}));

      if (response.ok && resData.messageId) {
        console.log(`[EmailService] ✨ Live application email accepted by Brevo! MessageId: ${resData.messageId}`);
        return {
          success: true,
          messageId: resData.messageId,
          senderEmail: verifiedSenderEmail,
          replyTo: candidateEmail,
        };
      }

      const status = response.status;
      const apiCode = resData.code || 'UNKNOWN_ERROR';
      const apiMsg = resData.message || response.statusText || 'Unknown Brevo API error';

      console.error(`[EmailService] ❌ Brevo API error (HTTP ${status}) [${apiCode}]: ${apiMsg}`);

      let userFriendlyError = 'Failed to dispatch application email to employer.';
      if (status === 401 || status === 403) {
        userFriendlyError = 'Brevo API key is invalid or unauthorized. Please verify BREVO_API_KEY in Render.';
      } else if (status === 400 && apiMsg.toLowerCase().includes('sender')) {
        userFriendlyError = `Sender email "${verifiedSenderEmail}" is not verified in your Brevo account. Please verify it in Brevo Senders & IPs.`;
      } else if (status === 400 && apiMsg.toLowerCase().includes('recipient')) {
        userFriendlyError = `Recipient address "${recipientEmail}" was rejected by Brevo: ${apiMsg}`;
      } else if (apiMsg) {
        userFriendlyError = apiMsg;
      }

      return { success: false, error: userFriendlyError };
    } catch (networkErr: any) {
      console.error('[EmailService] ❌ Network request to Brevo API failed:', networkErr.message || networkErr);
      return { success: false, error: 'Could not connect to Brevo email service: ' + (networkErr.message || 'Network error') };
    }
  }

  /**
   * Automatically dispatches candidate's application and resume package
   * directly to the company's hiring inbox
   */
  static async sendApplicationToHR(payload: ApplicationEmailPayload): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const { candidateName, candidateEmail, jobTitle, companyName, headline, summary, skills, fieldOfInterest, targetHrEmail } = payload;

    const verifiedEmail = getVerifiedCompanyHrEmail(companyName);
    const resolvedHrEmail = targetHrEmail || verifiedEmail;
    const destinationEmail = process.env.COMPANY_HR_EMAIL_OVERRIDE || resolvedHrEmail;

    if (!destinationEmail) {
      console.warn(`⚠️ No verified HR email found for company "${companyName}". Application recorded, skipping external email dispatch.`);
      return { success: false, error: "No verified HR email address found" };
    }

    const htmlBody = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 640px; padding: 28px; border: 1px solid #e2e8f0; border-radius: 12px; color: #1e293b; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        <div style="border-bottom: 2px solid #0f172a; padding-bottom: 14px; margin-bottom: 20px;">
          <span style="background: #0f172a; color: #ffffff; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; padding: 3px 8px; border-radius: 4px;">RecruitX Candidate Dispatch</span>
          <h2 style="color: #0f172a; margin: 8px 0 0 0; font-size: 22px; font-weight: 700;">Job Application: ${jobTitle}</h2>
          <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0;">Target Employer: <strong>${companyName}</strong> &lt;${destinationEmail}&gt;</p>
        </div>

        <div style="background: #f8fafc; padding: 14px 18px; border-radius: 8px; margin-bottom: 18px; border-left: 4px solid #0284c7;">
          <p style="color: #0f172a; font-size: 14px; margin: 4px 0;"><strong>Candidate Name:</strong> ${candidateName}</p>
          <p style="color: #0f172a; font-size: 14px; margin: 4px 0;"><strong>Candidate Email:</strong> <a href="mailto:${candidateEmail}" style="color: #0284c7; text-decoration: none;">${candidateEmail}</a></p>
          <p style="color: #0f172a; font-size: 14px; margin: 4px 0;"><strong>Domain / Specialization:</strong> ${fieldOfInterest || 'Creative & Professional'}</p>
          <p style="color: #0f172a; font-size: 14px; margin: 4px 0;"><strong>Professional Headline:</strong> ${headline || 'Applicant'}</p>
        </div>
        
        <div style="background: #ffffff; padding: 16px; border-radius: 8px; margin: 18px 0; border: 1px solid #e2e8f0;">
          <h4 style="margin: 0 0 8px 0; color: #0f172a; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Candidate Summary</h4>
          <p style="color: #475569; font-size: 13.5px; line-height: 1.6; margin: 0;">${summary || 'Candidate has submitted their verified resume profile via RecruitX.'}</p>
        </div>

        <h4 style="margin: 18px 0 10px 0; color: #0f172a; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Verified Skills</h4>
        <div style="display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 24px 0;">
          ${(skills || []).map(s => `<span style="background: #f1f5f9; color: #0f172a; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 500; border: 1px solid #cbd5e1;">${s}</span>`).join(' ')}
        </div>

        <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px;">
          <p style="color: #065f46; font-size: 12.5px; margin: 0; line-height: 1.5;">
            <strong>Direct Reply:</strong> To schedule an interview or reply directly to the applicant, click reply or write to <a href="mailto:${candidateEmail}" style="color: #047857; font-weight: 600;">${candidateEmail}</a>.
          </p>
        </div>

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0 16px 0;" />
        
        <div style="text-align: center; padding-top: 4px;">
          <p style="font-size: 13px; font-weight: 700; color: #0f172a; margin: 0 0 4px 0;">RecruitX Platform - Founders</p>
          <p style="font-size: 12px; font-weight: 600; color: #64748b; margin: 0;">Naynam Vakhariya &nbsp;•&nbsp; Jainam Jain &nbsp;•&nbsp; Shiv Gupta</p>
        </div>
      </div>
    `;

    console.log(`📧 Dispatching Automated Application Package for "${jobTitle}" at ${companyName}...`);
    const result = await this.sendMail({
      to: destinationEmail,
      subject: `Job Application: ${candidateName} - ${jobTitle} (${companyName})`,
      html: htmlBody,
      replyTo: candidateEmail,
    });

    return { success: result.success, messageId: result.messageId, error: result.error };
  }

  /**
   * Dispatches an official 6-digit confirmation email to verify user's identity on sign-up
   */
  static async sendVerificationEmail(payload: {
    toEmail: string;
    userName: string;
    code: string;
  }): Promise<{ success: boolean; error?: string }> {
    const { toEmail, userName, code } = payload;

    const htmlBody = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 580px; margin: 0 auto; padding: 32px 24px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        <div style="border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 24px;">
          <h2 style="color: #0f172a; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">RecruitX</h2>
          <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0;">AI-Driven Campus Placement & Hiring Ecosystem</p>
        </div>

        <h3 style="color: #0f172a; font-size: 18px; margin: 0 0 12px 0;">Verify your email address</h3>
        <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
          Hi <strong>${userName || 'there'}</strong>,<br/>
          Thank you for signing up for RecruitX! To activate your account and verify your email address, please enter this 6-digit verification code:
        </p>

        <div style="background: #f8fafc; border-radius: 10px; padding: 22px; text-align: center; margin: 24px 0; border: 2px dashed #0284c7;">
          <div style="font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 800; letter-spacing: 10px; color: #0284c7;">${code}</div>
          <p style="color: #64748b; font-size: 12px; margin: 8px 0 0 0;">Valid for 15 minutes. Never share this code with anyone.</p>
        </div>

        <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin: 0 0 24px 0;">
          If you did not sign up for RecruitX, you can safely ignore this email.
        </p>

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0 16px 0;" />
        <div style="text-align: center;">
          <p style="font-size: 12px; color: #94a3b8; margin: 0;">
            &copy; 2026 RecruitX Platform • Naynam Vakhariya • Jainam Jain • Shiv Gupta
          </p>
        </div>
      </div>
    `;

    console.log(`📧 Dispatching Verification Code [${code}] to ${toEmail}...`);
    return this.sendMail({
      to: toEmail,
      subject: `${code} is your RecruitX verification code`,
      html: htmlBody,
    });
  }
  /**
   * Dispatches genuine 6-digit password reset verification code via Brevo Transactional HTTPS API
   */
  static async sendPasswordResetOtpEmail(payload: {
    toEmail: string;
    userName?: string;
    otpCode: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const { toEmail, userName, otpCode } = payload;
    const subject = 'RecruitX Password Reset Verification Code';

    const htmlBody = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 580px; margin: 0 auto; padding: 32px 24px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        <div style="border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 24px;">
          <h2 style="color: #0f172a; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">RecruitX</h2>
          <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0;">AI-Driven Campus Placement & Hiring Ecosystem</p>
        </div>

        <h3 style="color: #0f172a; font-size: 18px; margin: 0 0 12px 0;">RecruitX Password Reset Verification Code</h3>
        <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">
          Hi ${userName ? `<strong>${userName}</strong>` : 'there'},<br/>
          You requested to reset your RecruitX password.
        </p>

        <p style="color: #475569; font-size: 14px; margin: 0 0 8px 0;">Your verification code is:</p>
        <div style="text-align: center; margin: 24px 0;">
          <span style="display: inline-block; font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #0f172a; background-color: #f1f5f9; padding: 14px 28px; border-radius: 8px; border: 1px solid #cbd5e1;">
            ${otpCode}
          </span>
        </div>

        <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 12px 0;">
          This code expires in <strong>10 minutes</strong>.
        </p>
        <p style="color: #64748b; font-size: 12px; line-height: 1.5; margin: 0 0 24px 0;">
          If you did not request this, you can safely ignore this email.
        </p>

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0 16px 0;" />
        <div style="text-align: center;">
          <p style="font-size: 12px; color: #94a3b8; margin: 0;">
            &copy; 2026 RecruitX Platform • Naynam Vakhariya • Jainam Jain • Shiv Gupta
          </p>
        </div>
      </div>
    `;

    return this.sendMail({
      to: toEmail,
      subject,
      html: htmlBody,
    });
  }

/**
   * Dispatches password reset instructions with secure one-time link
   */
  static async sendPasswordResetEmail(payload: {
    toEmail: string;
    userName: string;
    resetUrl: string;
  }): Promise<{ success: boolean; error?: string }> {
    const { toEmail, userName, resetUrl } = payload;

    const htmlBody = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 580px; margin: 0 auto; padding: 32px 24px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        <div style="border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 24px;">
          <h2 style="color: #0f172a; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">RecruitX</h2>
          <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0;">AI-Driven Campus Placement & Hiring Ecosystem</p>
        </div>

        <h3 style="color: #0f172a; font-size: 18px; margin: 0 0 12px 0;">Reset your password</h3>
        <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
          Hi <strong>${userName || 'there'}</strong>,<br/>
          We received a request to reset your password for your RecruitX account. Click the button below to set a new password:
        </p>

        <div style="text-align: center; margin: 28px 0;">
          <a href="${resetUrl}" style="background-color: #0284c7; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block;">
            Reset Password
          </a>
        </div>

        <p style="color: #64748b; font-size: 12px; line-height: 1.5; margin: 0 0 24px 0;">
          This link is valid for 1 hour. If you did not request a password reset, you can safely ignore this email — your password will remain unchanged.
        </p>

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0 16px 0;" />
        <div style="text-align: center;">
          <p style="font-size: 12px; color: #94a3b8; margin: 0;">
            &copy; 2026 RecruitX Platform • Naynam Vakhariya • Jainam Jain • Shiv Gupta
          </p>
        </div>
      </div>
    `;

    console.log(`📧 Dispatching Password Reset link to ${toEmail}...`);
    return this.sendMail({
      to: toEmail,
      subject: `Reset your RecruitX password`,
      html: htmlBody,
    });
  }
}
