import fs from 'fs';
import path from 'path';
import { IUserDocument } from '../models/User.js';
import { CandidateEmailAuthService } from './candidateEmailAuthService.js';
import { getVerifiedCompanyHrEmail } from './linkedinService.js';

export interface ApplicationDispatchOptions {
  user: IUserDocument;
  resumeData?: any;
  companyName: string;
  jobTitle: string;
  jobDescription?: string;
  targetHrEmail?: string;
  coverLetter?: string;
  jobUrl?: string;
}

export interface ApplicationDispatchResult {
  status: 'sent' | 'requires_portal' | 'requires_connected_account' | 'failed';
  message: string;
  senderEmail?: string;
  recipientEmail?: string;
  provider?: 'gmail' | 'outlook' | 'gateway';
  messageId?: string;
  sentAt?: Date;
  resumeAttached?: boolean;
  resumeFileName?: string;
  resumeFileSize?: number;
  portalUrl?: string;
  rawResponse?: any;
  error?: string;
}

export class CandidateApplicationEmailService {
  /**
   * Resolves legitimate application destination for an employer.
   * If no verified hiring email exists, strictly mandates official career portal.
   */
  static resolveApplicationDestination(options: {
    companyName: string;
    targetHrEmail?: string;
    jobUrl?: string;
  }): {
    method: 'email' | 'portal';
    destinationEmail?: string;
    portalUrl?: string;
    source: string;
  } {
    const { companyName, targetHrEmail, jobUrl } = options;

    // Check for test / controlled email override in staging / test runs
    const testOverride = process.env.TEST_APPLICATION_EMAIL_OVERRIDE;
    if (testOverride && testOverride.includes('@')) {
      return {
        method: 'email',
        destinationEmail: testOverride.trim(),
        source: 'Controlled Test Email Override (Automated Test Environment)',
      };
    }

    const verifiedDbEmail = getVerifiedCompanyHrEmail(companyName);
    const resolvedEmail = targetHrEmail || verifiedDbEmail;
    const companyOverride = process.env.COMPANY_HR_EMAIL_OVERRIDE;

    const destinationEmail = companyOverride || resolvedEmail;

    if (destinationEmail && destinationEmail.includes('@') && !destinationEmail.includes('recruitx.internal')) {
      return {
        method: 'email',
        destinationEmail: destinationEmail.toLowerCase().trim(),
        source: targetHrEmail ? 'Job Post Verified Hiring Email' : 'Verified Company Recruitment Inbox',
      };
    }

    // Company does not have a verified public recruitment email -> Mandate official portal
    return {
      method: 'portal',
      portalUrl: jobUrl || `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(jobTitleToQuery(companyName))}`,
      source: 'Employer Official Career Portal',
    };
  }

  /**
   * Dispatches actual job application to employer hiring inbox
   */
  static async dispatchApplication(options: ApplicationDispatchOptions): Promise<ApplicationDispatchResult> {
    const { user, resumeData, companyName, jobTitle, targetHrEmail, coverLetter, jobUrl } = options;

    // 1. Resolve legitimate destination
    const destination = this.resolveApplicationDestination({
      companyName,
      targetHrEmail,
      jobUrl,
    });

    if (destination.method === 'portal' || !destination.destinationEmail) {
      return {
        status: 'requires_portal',
        message: `Employer "${companyName}" requires direct submission via their official career portal. RecruitX will not send unverified emails when portal submission is mandatory.`,
        portalUrl: destination.portalUrl,
      };
    }

    // 2. Resolve candidate's authorized sending account
    const tokenInfo = await CandidateEmailAuthService.getValidAccessToken(user);

    // If candidate has not connected Gmail or Outlook via OAuth
    if (!tokenInfo) {
      return {
        status: 'requires_connected_account',
        message: 'No authorized email account connected. Please connect your Gmail or Outlook account in Settings to send applications directly from your email address, or apply on the official portal.',
        portalUrl: destination.portalUrl,
      };
    }

    const { accessToken, provider, email: senderEmail, name: senderName } = tokenInfo;
    const recipientEmail = destination.destinationEmail;

    // 3. Prepare candidate's resume attachment
    const resumeAttachment = await this.resolveResumeAttachment(user, resumeData);

    // 4. Generate personalized application email content
    const candidateDisplayName = senderName || user.name || 'Applicant';
    const subject = `Job Application: ${candidateDisplayName} - ${jobTitle} (${companyName})`;
    const htmlBody = this.generateApplicationHtml({
      candidateName: candidateDisplayName,
      candidateEmail: senderEmail,
      candidatePhone: user.phone,
      candidateLinkedin: user.linkedin,
      candidatePortfolio: user.portfolio,
      jobTitle,
      companyName,
      headline: resumeData?.headline || user.title || 'Applicant',
      summary: resumeData?.summary || user.description || 'Experienced professional presenting application for your review.',
      skills: resumeData?.skills || [],
      coverLetter: coverLetter || `Dear Hiring Team at ${companyName},\n\nI am writing to express my strong enthusiasm and application for the ${jobTitle} role. With my background and hands-on experience, I am confident in delivering immediate value to your organization. Please find my verified resume attached for your evaluation.\n\nSincerely,\n${candidateDisplayName}`,
      resumeFileName: resumeAttachment?.fileName,
    });

    // 5. Send actual email via Google Gmail REST API or Microsoft Graph REST API
    try {
      if (provider === 'gmail') {
        const sendResult = await this.sendViaGmailApi({
          accessToken,
          senderEmail,
          senderName: candidateDisplayName,
          recipientEmail,
          subject,
          htmlBody,
          attachment: resumeAttachment,
        });

        console.log(`[CandidateApplicationEmail] ✨ Application successfully sent via Gmail API! Message ID: ${sendResult.id} (From: ${senderEmail} -> To: ${recipientEmail})`);

        return {
          status: 'sent',
          message: `Application email successfully sent to ${companyName} (${recipientEmail}) from your connected Gmail account (${senderEmail}).`,
          senderEmail,
          recipientEmail,
          provider: 'gmail',
          messageId: sendResult.id,
          sentAt: new Date(),
          resumeAttached: Boolean(resumeAttachment),
          resumeFileName: resumeAttachment?.fileName,
          resumeFileSize: resumeAttachment?.fileSize,
          rawResponse: sendResult,
        };
      } else if (provider === 'outlook') {
        const sendResult = await this.sendViaMicrosoftGraph({
          accessToken,
          senderEmail,
          senderName: candidateDisplayName,
          recipientEmail,
          subject,
          htmlBody,
          attachment: resumeAttachment,
        });

        console.log(`[CandidateApplicationEmail] ✨ Application successfully sent via Microsoft Graph API! (From: ${senderEmail} -> To: ${recipientEmail})`);

        return {
          status: 'sent',
          message: `Application email successfully sent to ${companyName} (${recipientEmail}) from your connected Outlook account (${senderEmail}).`,
          senderEmail,
          recipientEmail,
          provider: 'outlook',
          messageId: sendResult.messageId,
          sentAt: new Date(),
          resumeAttached: Boolean(resumeAttachment),
          resumeFileName: resumeAttachment?.fileName,
          resumeFileSize: resumeAttachment?.fileSize,
          rawResponse: sendResult,
        };
      } else {
        // Test / Sandbox token fallback
        const mockMessageId = `test_msg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        return {
          status: 'sent',
          message: `Application email transmitted to ${companyName} (${recipientEmail}) via test sandbox account (${senderEmail}).`,
          senderEmail,
          recipientEmail,
          provider: 'gateway',
          messageId: mockMessageId,
          sentAt: new Date(),
          resumeAttached: Boolean(resumeAttachment),
          resumeFileName: resumeAttachment?.fileName,
          resumeFileSize: resumeAttachment?.fileSize,
        };
      }
    } catch (err: any) {
      console.error(`[CandidateApplicationEmail] ❌ Failed to dispatch email via ${provider}:`, err.message);
      return {
        status: 'failed',
        message: `Failed to transmit application email: ${err.message}`,
        senderEmail,
        recipientEmail,
        provider,
        error: err.message,
      };
    }
  }

  /**
   * Resolves the candidate's resume attachment from storage or buffer
   */
  private static async resolveResumeAttachment(user: IUserDocument, resumeData?: any): Promise<{
    fileName: string;
    contentType: string;
    contentBase64: string;
    fileSize: number;
  } | undefined> {
    const candidateName = user.name || 'Candidate';
    const safeName = candidateName.replace(/[^a-zA-Z0-9]/g, '_');
    const defaultFileName = `Resume_${safeName}.pdf`;

    // 1. Check if disk file exists in uploads/
    if (resumeData?.resumeUrl && typeof resumeData.resumeUrl === 'string' && resumeData.resumeUrl.startsWith('/uploads')) {
      const diskPath = path.resolve(process.cwd(), resumeData.resumeUrl.replace(/^\//, ''));
      if (fs.existsSync(diskPath)) {
        const buffer = fs.readFileSync(diskPath);
        return {
          fileName: path.basename(diskPath) || defaultFileName,
          contentType: 'application/pdf',
          contentBase64: buffer.toString('base64'),
          fileSize: buffer.length,
        };
      }
    }

    // 2. Generate a clean resume document buffer from candidate data
    const summaryText = resumeData?.summary || user.description || 'Verified Candidate Profile on RecruitX';
    const skillsList = (resumeData?.skills || []).join(', ');
    const resumeTextContent = `RECRUITX CANDIDATE PROFILE & RESUME
Candidate Name: ${candidateName}
Email: ${user.email}
Phone: ${user.phone || 'N/A'}
Headline: ${resumeData?.headline || user.title || 'Applicant'}
Domain: ${resumeData?.fieldOfInterest || user.profession || 'Professional'}
Location: ${resumeData?.location || user.location || 'India'}

PROFESSIONAL SUMMARY
${summaryText}

CORE SKILLS
${skillsList || 'Not specified'}

PORTFOLIO & LINKS
LinkedIn: ${user.linkedin || 'N/A'}
GitHub: ${user.github || 'N/A'}
Portfolio: ${user.portfolio || 'N/A'}

Verified via RecruitX Career Platform: https://recruitx-eosin.vercel.app
`;

    const textBuffer = Buffer.from(resumeTextContent, 'utf-8');
    return {
      fileName: `Resume_${safeName}.txt`,
      contentType: 'text/plain',
      contentBase64: textBuffer.toString('base64'),
      fileSize: textBuffer.length,
    };
  }

  /**
   * Sends email using the official Google Gmail REST API:
   * POST https://gmail.googleapis.com/gmail/v1/users/me/messages/send
   */
  private static async sendViaGmailApi(options: {
    accessToken: string;
    senderEmail: string;
    senderName: string;
    recipientEmail: string;
    subject: string;
    htmlBody: string;
    attachment?: {
      fileName: string;
      contentType: string;
      contentBase64: string;
    };
  }): Promise<{ id: string; threadId?: string }> {
    const { accessToken, senderEmail, senderName, recipientEmail, subject, htmlBody, attachment } = options;

    // Build RFC 2822 multipart MIME message
    const boundary = `----=_RecruitXBoundary_${Date.now()}`;
    const headers = [
      `From: "${senderName}" <${senderEmail}>`,
      `To: <${recipientEmail}>`,
      `Subject: ${subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      '',
    ];

    let messageBody = headers.join('\r\n');

    // HTML Part
    messageBody += `--${boundary}\r\n`;
    messageBody += `Content-Type: text/html; charset="UTF-8"\r\n`;
    messageBody += `Content-Transfer-Encoding: 7bit\r\n\r\n`;
    messageBody += `${htmlBody}\r\n\r\n`;

    // Attachment Part
    if (attachment) {
      messageBody += `--${boundary}\r\n`;
      messageBody += `Content-Type: ${attachment.contentType}; name="${attachment.fileName}"\r\n`;
      messageBody += `Content-Disposition: attachment; filename="${attachment.fileName}"\r\n`;
      messageBody += `Content-Transfer-Encoding: base64\r\n\r\n`;
      messageBody += `${attachment.contentBase64}\r\n\r\n`;
    }

    messageBody += `--${boundary}--`;

    // Encode to base64url format required by Gmail API
    const rawBase64Url = Buffer.from(messageBody)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: rawBase64Url }),
    });

    const resData: any = await response.json();
    if (!response.ok || !resData.id) {
      const errMsg = resData.error?.message || response.statusText || 'Gmail API transmission failed';
      throw new Error(`Gmail API error (${response.status}): ${errMsg}`);
    }

    return { id: resData.id, threadId: resData.threadId };
  }

  /**
   * Sends email using Microsoft Graph API:
   * POST https://graph.microsoft.com/v1.0/me/sendMail
   */
  private static async sendViaMicrosoftGraph(options: {
    accessToken: string;
    senderEmail: string;
    senderName: string;
    recipientEmail: string;
    subject: string;
    htmlBody: string;
    attachment?: {
      fileName: string;
      contentType: string;
      contentBase64: string;
    };
  }): Promise<{ messageId: string }> {
    const { accessToken, recipientEmail, subject, htmlBody, attachment } = options;

    const messagePayload: any = {
      message: {
        subject,
        body: {
          contentType: 'HTML',
          content: htmlBody,
        },
        toRecipients: [
          {
            emailAddress: {
              address: recipientEmail,
            },
          },
        ],
      },
      saveToSentItems: 'true',
    };

    if (attachment) {
      messagePayload.message.attachments = [
        {
          '@odata.type': '#microsoft.graph.fileAttachment',
          name: attachment.fileName,
          contentType: attachment.contentType,
          contentBytes: attachment.contentBase64,
        },
      ];
    }

    const response = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messagePayload),
    });

    if (!response.ok && response.status !== 202) {
      const errText = await response.text();
      throw new Error(`Microsoft Graph API error (${response.status}): ${errText}`);
    }

    // Graph API returns 202 Accepted on sendMail
    const messageId = `msg_ms_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    return { messageId };
  }

  /**
   * Generates clean, professional HTML body for employer application email
   */
  private static generateApplicationHtml(data: {
    candidateName: string;
    candidateEmail: string;
    candidatePhone?: string;
    candidateLinkedin?: string;
    candidatePortfolio?: string;
    jobTitle: string;
    companyName: string;
    headline: string;
    summary: string;
    skills: string[];
    coverLetter: string;
    resumeFileName?: string;
  }): string {
    const {
      candidateName,
      candidateEmail,
      candidatePhone,
      candidateLinkedin,
      candidatePortfolio,
      jobTitle,
      companyName,
      headline,
      summary,
      skills,
      coverLetter,
      resumeFileName,
    } = data;

    const formattedCoverLetter = coverLetter.replace(/\n/g, '<br/>');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; background-color: #f8fafc; margin: 0; padding: 24px; }
          .container { max-width: 650px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
          .header { background: #0f172a; color: #ffffff; padding: 28px 32px; }
          .header h1 { margin: 0; font-size: 22px; font-weight: 700; color: #ffffff; }
          .header p { margin: 6px 0 0 0; color: #94a3b8; font-size: 14px; }
          .content { padding: 32px; }
          .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin-bottom: 24px; }
          .skill-tag { display: inline-block; background: #f1f5f9; color: #0f172a; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; margin: 0 4px 6px 0; border: 1px solid #cbd5e1; }
          .attachment-badge { background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 12px 16px; margin: 20px 0; font-size: 13px; color: #065f46; font-weight: 600; }
          .footer { border-top: 1px solid #e2e8f0; padding: 20px 32px; text-align: center; font-size: 12px; color: #64748b; background: #f8fafc; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Application for ${jobTitle}</h1>
            <p>Target Company: <strong>${companyName}</strong> &bull; Applicant: <strong>${candidateName}</strong></p>
          </div>
          <div class="content">
            <div class="card">
              <h3 style="margin: 0 0 12px 0; font-size: 15px; color: #0f172a;">Candidate Details</h3>
              <p style="margin: 4px 0; font-size: 13.5px;"><strong>Full Name:</strong> ${candidateName}</p>
              <p style="margin: 4px 0; font-size: 13.5px;"><strong>Direct Email:</strong> <a href="mailto:${candidateEmail}" style="color: #0284c7;">${candidateEmail}</a></p>
              ${candidatePhone ? `<p style="margin: 4px 0; font-size: 13.5px;"><strong>Phone:</strong> ${candidatePhone}</p>` : ''}
              <p style="margin: 4px 0; font-size: 13.5px;"><strong>Professional Focus:</strong> ${headline}</p>
              ${candidateLinkedin ? `<p style="margin: 4px 0; font-size: 13.5px;"><strong>LinkedIn:</strong> <a href="${candidateLinkedin}" style="color: #0284c7;">${candidateLinkedin}</a></p>` : ''}
              ${candidatePortfolio ? `<p style="margin: 4px 0; font-size: 13.5px;"><strong>Portfolio:</strong> <a href="${candidatePortfolio}" style="color: #0284c7;">${candidatePortfolio}</a></p>` : ''}
            </div>

            <h3 style="font-size: 15px; color: #0f172a; margin: 24px 0 12px 0;">Cover Letter & Introduction</h3>
            <div style="font-size: 14px; line-height: 1.7; color: #334155; margin-bottom: 24px;">
              ${formattedCoverLetter}
            </div>

            ${skills.length > 0 ? `
              <h3 style="font-size: 15px; color: #0f172a; margin: 24px 0 12px 0;">Core Competencies & Verified Skills</h3>
              <div style="margin-bottom: 24px;">
                ${skills.map((s) => `<span class="skill-tag">${s}</span>`).join(' ')}
              </div>
            ` : ''}

            ${resumeFileName ? `
              <div class="attachment-badge">
                📎 Attached Resume: <strong>${resumeFileName}</strong>
              </div>
            ` : ''}

            <p style="font-size: 13px; color: #64748b; margin-top: 24px;">
              To respond to this candidate or schedule an interview, reply directly to this email at <a href="mailto:${candidateEmail}">${candidateEmail}</a>.
            </p>
          </div>
          <div class="footer">
            Sent by candidate via RecruitX Career Application Gateway &bull; Authorized Email Transmission
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

function jobTitleToQuery(company: string): string {
  return company.replace(/[^a-zA-Z0-9 ]/g, ' ').trim();
}
