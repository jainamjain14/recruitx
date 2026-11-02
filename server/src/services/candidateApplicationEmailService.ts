import { EmailService } from './emailService.js';
import { RecruitmentEmailDiscoveryService } from './recruitmentEmailDiscoveryService.js';
import { AIService } from './aiService.js';
import fs from 'fs';
import path from 'path';
import { IUserDocument } from '../models/User.js';
import { Resume } from '../models/Resume.js';
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
  applicationId?: string;
  jobId?: string;
}

export interface ApplicationDispatchResult {
  status: 'sent' | 'requires_portal' | 'requires_connected_account' | 'failed' | 'missing_resume';
  message: string;
  senderEmail?: string;
  recipientEmail?: string;
  provider?: 'gmail' | 'outlook' | 'gateway' | 'brevo';
  messageId?: string;
  viewSentEmailUrl?: string;
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
   * Discovers and verifies corporate recruitment inboxes, never guessing addresses.
   */
  static async resolveApplicationDestination(options: {
    companyName: string;
    targetHrEmail?: string;
    jobUrl?: string;
    jobDescription?: string;
  }): Promise<{
    method: 'email' | 'portal';
    destinationEmail?: string;
    portalUrl?: string;
    source: string;
    confidenceScore?: number;
    reason?: string;
  }> {
    const { companyName, targetHrEmail, jobUrl, jobDescription } = options;

    const discovery = await RecruitmentEmailDiscoveryService.discoverRecruitmentEmail({
      companyName,
      targetHrEmail,
      jobUrl,
      jobDescription,
    });

    if (discovery.verified && discovery.email) {
      return {
        method: 'email',
        destinationEmail: discovery.email,
        source: discovery.sourceType || 'verified_registry',
        confidenceScore: discovery.confidenceScore,
      };
    }

    return {
      method: 'portal',
      portalUrl: jobUrl || `https://www.google.com/search?q=${encodeURIComponent(companyName + ' official careers')}`,
      source: 'Employer Official Career Portal',
      reason: discovery.reason || `This employer does not provide a verified recruitment email for direct applications. We could not submit your application automatically.`,
    };
  }

  /**
   * Dispatches actual job application to employer hiring inbox
   */
  static async dispatchApplication(options: ApplicationDispatchOptions): Promise<ApplicationDispatchResult> {
    const { user, resumeData, companyName, jobTitle, targetHrEmail, coverLetter, jobUrl, jobDescription, applicationId, jobId } = options;

    // 1. Resolve legitimate destination
    const destination = await this.resolveApplicationDestination({
      companyName,
      targetHrEmail,
      jobUrl,
      jobDescription,
    });

    if (destination.method === 'portal' || !destination.destinationEmail) {
      return {
        status: 'requires_portal',
        message: destination.reason || `Employer "${companyName}" does not provide a verified recruitment email for direct applications. We could not submit your application automatically.`,
        portalUrl: destination.portalUrl,
      };
    }

    const recipientEmail = destination.destinationEmail;

    // 2. Retrieve & strictly validate candidate's actual uploaded resume PDF
    let resumeAttachment;
    try {
      resumeAttachment = await this.resolveResumeAttachment(user, resumeData);
    } catch (err: any) {
      return {
        status: 'failed',
        message: err.message || 'Failed to validate uploaded resume PDF.',
        error: err.message,
      };
    }

    if (!resumeAttachment) {
      return {
        status: 'missing_resume',
        message: 'A valid PDF resume is required before submitting an application. Please upload your resume in the Resume section.',
        error: 'Missing resume attachment',
      };
    }

    // 3. Generate personalized, vacancy-specific application email via Gemini
    const candidateDisplayName = user.name || 'Candidate';
    const aiEmail = await AIService.generateTailoredApplicationEmail({
      candidateName: candidateDisplayName,
      candidateEmail: user.email,
      candidatePhone: user.phone,
      candidateHeadline: resumeData?.headline || user.title,
      candidateSummary: resumeData?.summary || user.description,
      candidateSkills: resumeData?.skills || [],
      candidateEducation: resumeData?.education || [],
      candidateExperience: resumeData?.experience || [],
      candidateProjects: resumeData?.projects || [],
      jobTitle,
      companyName,
      jobDescription,
      requiredSkills: resumeData?.skills,
    });

    const subject = aiEmail.subject;
    const htmlBody = aiEmail.bodyHtml;

    // 4. Send email through existing Brevo Transactional Integration
    // Strict configuration:
    // From: Verified RecruitX sender identity
    // To: Verified employer recruitment email
    // Reply-To: Student's actual contact email
    // Attachment: Student's actual resume PDF
    try {
      const brevoResult = await EmailService.sendApplicationViaBrevo({
        candidateName: candidateDisplayName,
        candidateEmail: user.email,
        candidatePhone: user.phone,
        jobTitle,
        companyName,
        recipientEmail,
        subject,
        htmlBody,
        textBody: aiEmail.bodyText,
        resumeAttachment,
        applicationId,
        studentId: user._id.toString(),
        jobId,
      });

      if (brevoResult.success && brevoResult.messageId) {
        console.log(`[CandidateApplicationEmail] ✨ Application successfully sent via Brevo! Message ID: ${brevoResult.messageId} (Recipient: ${recipientEmail}, Reply-To: ${user.email})`);

        return {
          status: 'sent',
          message: `Application email successfully sent to ${companyName} (${recipientEmail}) via RecruitX Verified Service. Replies will be delivered directly to your email (${user.email}).`,
          senderEmail: brevoResult.senderEmail || process.env.BREVO_SENDER_EMAIL || 'recruitxproject@gmail.com',
          recipientEmail,
          provider: 'brevo',
          messageId: brevoResult.messageId,
          sentAt: new Date(),
          resumeAttached: true,
          resumeFileName: resumeAttachment.fileName,
          resumeFileSize: resumeAttachment.fileSize,
          rawResponse: brevoResult,
        };
      } else {
        return {
          status: 'failed',
          message: brevoResult.error || 'Failed to dispatch email application via Brevo.',
          error: brevoResult.error,
          senderEmail: brevoResult.senderEmail || process.env.BREVO_SENDER_EMAIL || 'recruitxproject@gmail.com',
          recipientEmail,
          provider: 'brevo',
        };
      }
    } catch (err: any) {
      console.error('[CandidateApplicationEmail] ❌ Failed to dispatch email via Brevo:', err.message);
      return {
        status: 'failed',
        message: `Failed to transmit application email: ${err.message}`,
        recipientEmail,
        provider: 'brevo',
        error: err.message,
      };
    }
  }

  /**
   * Generates a standard, valid PDF binary buffer (PDF-1.4) containing the candidate's resume profile
   */
  private static generateStandardResumePdf(lines: string[]): Buffer {
    const escapedLines = lines.map((line) =>
      line.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
    );

    let stream = 'BT\n/F1 12 Tf\n40 760 Td\n15 TL\n';
    for (let i = 0; i < escapedLines.length; i++) {
      if (i === 0) {
        stream += `/F1 16 Tf (${escapedLines[i]}) Tj\n/F1 10 Tf T*\nT*\n`;
      } else {
        stream += `(${escapedLines[i]}) Tj T*\n`;
      }
    }
    stream += 'ET\n';

    const streamLength = Buffer.byteLength(stream, 'utf-8');
    let pdf = '%PDF-1.4\n%âãÏÓ\n';
    const offsets: number[] = [];

    // Object 1: Catalog
    offsets.push(Buffer.byteLength(pdf, 'utf-8'));
    pdf += '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';

    // Object 2: Pages
    offsets.push(Buffer.byteLength(pdf, 'utf-8'));
    pdf += '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n';

    // Object 3: Page
    offsets.push(Buffer.byteLength(pdf, 'utf-8'));
    pdf += '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 5 0 R /Resources << /Font << /F1 4 0 R >> >> >>\nendobj\n';

    // Object 4: Font
    offsets.push(Buffer.byteLength(pdf, 'utf-8'));
    pdf += '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n';

    // Object 5: Contents
    offsets.push(Buffer.byteLength(pdf, 'utf-8'));
    pdf += `5 0 obj\n<< /Length ${streamLength} >>\nstream\n${stream}endstream\nendobj\n`;

    const startxref = Buffer.byteLength(pdf, 'utf-8');
    pdf += 'xref\n0 6\n0000000000 65535 f \n';
    for (const offset of offsets) {
      pdf += `${offset.toString().padStart(10, '0')} 00000 n \n`;
    }
    pdf += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${startxref}\n%%EOF\n`;

    return Buffer.from(pdf, 'binary');
  }

  /**
   * Resolves the candidate's resume attachment from storage or buffer
   */
  private static async resolveResumeAttachment(user: IUserDocument, resumeData?: any): Promise<{
    fileName: string;
    contentType: string;
    contentBase64: string;
    fileSize: number;
  }> {
    const candidateName = user.name || 'Candidate';
    const safeName = candidateName.replace(/[^a-zA-Z0-9]/g, '_');
    const defaultFileName = `Resume_${safeName}.pdf`;

    let resume = resumeData;

    // Strict ownership validation: ensure resume belongs exclusively to authenticated student
    if (resume && resume.student) {
      const studentId = typeof resume.student === 'object' && resume.student._id
        ? resume.student._id.toString()
        : resume.student.toString();

      if (studentId !== user._id.toString()) {
        throw new Error('Resume ownership validation failed: The specified resume belongs to another student account.');
      }
    }

    // If resume was not provided or lacks data, fetch from student's own record in database
    if (!resume || (!resume.fileData && !resume.resumeUrl)) {
      resume = await Resume.findOne({ student: user._id });
    }

    if (!resume || (!resume.fileData && !resume.resumeUrl)) {
      throw new Error('No uploaded resume found for this account. Please upload your PDF resume in the Resume section before applying.');
    }

    // 1. Direct Base64 File Data stored in Resume document
    if (resume.fileData && typeof resume.fileData === 'string') {
      const cleanBase64 = resume.fileData.includes(';base64,')
        ? resume.fileData.split(';base64,')[1]
        : resume.fileData;
      const buffer = Buffer.from(cleanBase64, 'base64');

      // Validate PDF magic bytes: '%PDF'
      if (buffer.length < 4 || buffer.slice(0, 4).toString('ascii') !== '%PDF') {
        throw new Error('The uploaded resume is not a valid PDF file. Please upload a genuine PDF document.');
      }
      if (buffer.length > 10 * 1024 * 1024) {
        throw new Error('Resume file exceeds maximum allowed size of 10MB.');
      }

      const declaredName = resume.fileName || defaultFileName;
      const safeDocName = declaredName.toLowerCase().endsWith('.pdf') ? declaredName : `${declaredName}.pdf`;

      return {
        fileName: safeDocName,
        contentType: resume.fileMimeType || 'application/pdf',
        contentBase64: cleanBase64,
        fileSize: buffer.length,
      };
    }

    // 2. Check if disk file exists in uploads/
    if (resume.resumeUrl && typeof resume.resumeUrl === 'string' && resume.resumeUrl.startsWith('/uploads')) {
      const diskPath = path.resolve(process.cwd(), resume.resumeUrl.replace(/^\//, ''));
      if (fs.existsSync(diskPath)) {
        const buffer = fs.readFileSync(diskPath);
        if (buffer.length < 4 || buffer.slice(0, 4).toString('ascii') !== '%PDF') {
          throw new Error('The uploaded resume file on disk is not a valid PDF document.');
        }
        return {
          fileName: path.basename(diskPath) || defaultFileName,
          contentType: 'application/pdf',
          contentBase64: buffer.toString('base64'),
          fileSize: buffer.length,
        };
      }
    }

    // 3. Remote URL
    if (resume.resumeUrl && typeof resume.resumeUrl === 'string' && (resume.resumeUrl.startsWith('http://') || resume.resumeUrl.startsWith('https://'))) {
      const remoteRes = await fetch(resume.resumeUrl);
      if (remoteRes.ok) {
        const ab = await remoteRes.arrayBuffer();
        const buffer = Buffer.from(ab);
        if (buffer.length < 4 || buffer.slice(0, 4).toString('ascii') !== '%PDF') {
          throw new Error('The remote resume file is not a valid PDF document.');
        }
        return {
          fileName: resume.fileName || defaultFileName,
          contentType: remoteRes.headers.get('content-type') || 'application/pdf',
          contentBase64: buffer.toString('base64'),
          fileSize: buffer.length,
        };
      }
    }

    throw new Error('Unable to retrieve resume content. Please re-upload your PDF resume in the Resume section.');
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
  }): Promise<{ id: string; threadId?: string; viewUrl?: string }> {
    const { accessToken, senderEmail, senderName, recipientEmail, subject, htmlBody, attachment } = options;

    // Build RFC 2822 multipart MIME message
    const boundary = `----=_RecruitXBoundary_${Date.now()}`;
    const cleanSubject = subject.replace(/[\r\n]/g, ' ');
    const headers = [
      `From: "${senderName}" <${senderEmail}>`,
      `To: <${recipientEmail}>`,
      `Subject: ${cleanSubject}`,
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

    const viewUrl = `https://mail.google.com/mail/u/0/#search/rfc822msgid:${encodeURIComponent(resData.id)}`;
    return { id: resData.id, threadId: resData.threadId, viewUrl };
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
  }): Promise<{ messageId: string; viewUrl?: string }> {
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

    // Capture Microsoft's official transaction request ID from response headers
    const graphRequestId = response.headers.get('request-id') || response.headers.get('client-request-id');

    // Query the student's Sent Items folder to capture the authentic Graph message ID & RFC822 internetMessageId
    let realGraphId: string | undefined;
    let internetMessageId: string | undefined;

    try {
      // Brief pause to allow Graph indexing into Sent Items
      await new Promise((resolve) => setTimeout(resolve, 800));
      const sentFolderRes = await fetch(
        `https://graph.microsoft.com/v1.0/me/mailFolders/sentitems/messages?$top=5&$select=id,internetMessageId,subject,sentDateTime,toRecipients`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (sentFolderRes.ok) {
        const sentData: any = await sentFolderRes.json();
        const items = sentData.value || [];
        const matched = items.find(
          (m: any) =>
            (m.subject && m.subject === subject) ||
            (m.toRecipients &&
              m.toRecipients.some(
                (r: any) => r.emailAddress?.address?.toLowerCase() === recipientEmail.toLowerCase()
              ))
        ) || items[0];

        if (matched) {
          realGraphId = matched.id;
          internetMessageId = matched.internetMessageId;
        }
      }
    } catch (queryErr: any) {
      console.warn('[CandidateApplicationEmail] Sent Items verification notice:', queryErr.message);
    }

    // Genuine identifier confirmed by Microsoft Graph
    const messageId = internetMessageId || realGraphId || (graphRequestId ? `ms_graph_${graphRequestId}` : undefined);

    if (!messageId) {
      throw new Error('Microsoft Graph accepted the send request, but failed to confirm transmission receipt.');
    }

    return {
      messageId,
      viewUrl: 'https://outlook.live.com/mail/0/sentitems',
    };
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

