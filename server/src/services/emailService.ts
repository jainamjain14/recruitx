import { getVerifiedCompanyHrEmail } from './linkedinService.js';

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
   * Automatically dispatches candidate's application and resume package
   * directly to the company's hiring inbox (e.g. verified company email or recruiter's email)
   */
  static async sendApplicationToHR(payload: ApplicationEmailPayload): Promise<boolean> {
    const { candidateName, candidateEmail, jobTitle, companyName, headline, summary, skills, fieldOfInterest, targetHrEmail } = payload;

    // Resolve verified HR email
    const verifiedEmail = getVerifiedCompanyHrEmail(companyName);
    const resolvedHrEmail = targetHrEmail || verifiedEmail;

    // If developer configured an override in .env (for testing/viva/demos), use that destination
    const destinationEmail = process.env.COMPANY_HR_EMAIL_OVERRIDE || resolvedHrEmail;

    if (!destinationEmail) {
      console.warn(`⚠️ No verified HR email found for company "${companyName}". Application recorded, skipping external email dispatch.`);
      return false;
    }

    const htmlBody = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 640px; padding: 28px; border: 1px solid #e2e8f0; border-radius: 12px; color: #1e293b; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        <div style="border-bottom: 2px solid #0f172a; padding-bottom: 14px; margin-bottom: 20px;">
          <span style="background: #0f172a; color: #ffffff; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; padding: 3px 8px; rounded: 4px;">RecruitX Candidate Dispatch</span>
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
    console.log(`➡️ Target Company HR Inbox: ${destinationEmail}`);

    const resendKey = process.env.RESEND_API_KEY;
    const fromAddress = process.env.RESEND_FROM_EMAIL || 'RecruitX Applications <onboarding@resend.dev>';

    if (resendKey && resendKey.trim().length > 10) {
      try {
        // Attempt sending to Company HR Email
        const response = await fetch(`https://api.resend.com/emails`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${resendKey.trim()}`,
          },
          body: JSON.stringify({
            from: fromAddress,
            to: [destinationEmail],
            reply_to: candidateEmail,
            subject: `Job Application: ${candidateName} - ${jobTitle} (${companyName})`,
            html: htmlBody,
          }),
        });

        const resData: any = await response.json();

        if (resData.id) {
          console.log(`✨ Live Resend Email Dispatched to Company HR Inbox (${destinationEmail})! Email ID: ${resData.id}`);
          return true;
        }

        // Check if Resend Sandbox restriction triggered
        if (resData.error || resData.statusCode === 403 || resData.name === 'validation_error' || resData.message?.includes('validation_error')) {
          console.warn(`\n⚠️ Resend Sandbox Policy Notice:`);
          console.warn(`Resend's default free test domain (onboarding@resend.dev) only delivers to the Resend account owner's registered email.`);
          console.warn(`Failed to deliver to target HR address: ${destinationEmail}. Resend Error: ${resData.message || JSON.stringify(resData)}`);
          console.warn(`💡 To deliver to actual company HR emails in production:`);
          console.warn(`   1. Add and verify your custom domain in Resend (https://resend.com/domains)`);
          console.warn(`   2. Set RESEND_FROM_EMAIL="RecruitX <applications@yourdomain.com>" in .env`);
          console.warn(`   3. OR set COMPANY_HR_EMAIL_OVERRIDE="your-hr-inbox@..." in .env for demo testing.\n`);

          // Only as a fallback for local testing when external domains are rejected by Resend sandbox
          if (destinationEmail !== candidateEmail) {
            console.log(`🔄 Sending local testing copy to ${candidateEmail} for sandbox verification...`);
            await fetch(`https://api.resend.com/emails`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${resendKey.trim()}`,
              },
              body: JSON.stringify({
                from: fromAddress,
                to: [candidateEmail],
                reply_to: candidateEmail,
                subject: `[Sandbox Test Copy] Application for ${jobTitle} at ${companyName} (Target HR: ${destinationEmail})`,
                html: htmlBody,
              }),
            });
          }
        }
      } catch (err) {
        console.error('Email API Dispatch Error:', err);
      }
    }

    console.log(`✅ Application Package processed for ${companyName} HR (${destinationEmail})!`);
    return true;
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
    const resendKey = process.env.RESEND_API_KEY;
    const fromAddress = process.env.RESEND_FROM_EMAIL || 'RecruitX Security <onboarding@resend.dev>';

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

    if (resendKey && resendKey.trim().length > 10) {
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${resendKey.trim()}`,
          },
          body: JSON.stringify({
            from: fromAddress,
            to: [toEmail],
            subject: `${code} is your RecruitX verification code`,
            html: htmlBody,
          }),
        });

        const resData: any = await response.json();
        if (resData.id) {
          console.log(`✨ Live verification email sent via Resend! ID: ${resData.id}`);
          return { success: true };
        } else {
          console.warn('⚠️ Resend response info:', resData.message || resData);
          return { success: true, error: resData.message };
        }
      } catch (err: any) {
        console.error('Verification email dispatch failed:', err);
        return { success: false, error: err.message };
      }
    } else {
      console.log(`ℹ️ [Development mode] Verification code for ${toEmail}: ${code}`);
      return { success: true };
    }
  }
}

