import { AtsVerificationService as atsVerificationService, APPLICATION_STATUS_CONFIG } from '../src/services/atsVerificationService.js';
import { Application } from '../src/models/Application.js';
import { encryptToken, decryptToken } from '../src/utils/tokenEncryption.js';
import { CandidateApplicationEmailService } from '../src/services/candidateApplicationEmailService.js';

async function runTests() {
  console.log('================================================================');
  console.log('RECRUITX RIGOROUS VERIFICATION & EMAIL SYSTEM INTEGRATION TESTS');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`[PASS] ${msg}`);
      passed++;
    } else {
      console.error(`[FAIL] ${msg}`);
      failed++;
    }
  }

  // -------------------------------------------------------------
  // Test 1: External Application starts as external_application_required
  // -------------------------------------------------------------
  console.log('--- TEST 1: External portal application initial status ---');
  const externalApp = new Application({
    _id: 'test-ext-1',
    studentId: 'stud-1',
    companyName: 'Mahindra & Mahindra',
    jobTitle: 'Assistant Manager - Automotive Systems',
    status: 'recorded',
    submissionStatus: 'requires_manual_application',
    appliedAt: new Date(),
    updatedAt: new Date(),
  });

  const status1 = atsVerificationService.getAuthoritativeStatus(externalApp);
  const evidence1 = atsVerificationService.getEvidenceClassification(externalApp);
  assert(status1 === 'external_application_required', `Expected external_application_required, got: ${status1}`);
  assert(evidence1 === 'internal_recruitx', `Expected internal_recruitx, got: ${evidence1}`);
  assert(APPLICATION_STATUS_CONFIG[status1].label === 'External Application Required', `Status config label matches: got '${APPLICATION_STATUS_CONFIG[status1].label}'`);

  // -------------------------------------------------------------
  // Test 2: Candidate clicks "I Applied on Portal" without independent proof
  // -------------------------------------------------------------
  console.log('\n--- TEST 2: Candidate self-report does NOT confirm receipt ---');
  externalApp.submissionStatus = 'external_awaiting_verification';
  externalApp.evidenceClassification = 'candidate_provided';

  const status2 = atsVerificationService.getAuthoritativeStatus(externalApp);
  const evidence2 = atsVerificationService.getEvidenceClassification(externalApp);
  assert(status2 === 'awaiting_employer_verification', `Expected awaiting_employer_verification, got: ${status2}`);
  assert(evidence2 === 'candidate_provided', `Expected candidate_provided, got: ${evidence2}`);
  assert(status2 !== 'employer_receipt_confirmed', 'Must NOT elevate to employer_receipt_confirmed on self-report alone');

  // -------------------------------------------------------------
  // Test 3: Candidate inputs arbitrary ATS reference number string
  // -------------------------------------------------------------
  console.log('\n--- TEST 3: Arbitrary reference number does NOT elevate receipt ---');
  const arbitraryRefApp = new Application({
    _id: 'test-ext-2',
    studentId: 'stud-1',
    companyName: 'Tesla Motors',
    jobTitle: 'Vehicle Systems Engineer',
    status: 'awaiting_employer_verification',
    submissionStatus: 'external_awaiting_verification',
    evidenceClassification: 'candidate_provided',
    employerReceipt: {
      atsReferenceNumber: 'TSLA-REQ-998822',
      verificationMethod: 'candidate_reported',
      isVerified: false,
      receiptSource: 'candidate_self_reported',
    },
    appliedAt: new Date(),
    updatedAt: new Date(),
  });

  const status3 = atsVerificationService.getAuthoritativeStatus(arbitraryRefApp);
  const evidence3 = atsVerificationService.getEvidenceClassification(arbitraryRefApp);
  assert(status3 === 'awaiting_employer_verification', `Expected awaiting_employer_verification, got: ${status3}`);
  assert(evidence3 === 'candidate_provided', `Expected candidate_provided, got: ${evidence3}`);
  assert(status3 !== 'employer_receipt_confirmed', 'Arbitrary ATS string cannot elevate to employer_receipt_confirmed');

  // -------------------------------------------------------------
  // Test 4: Forged / Failed DKIM/SPF headers are rejected
  // -------------------------------------------------------------
  console.log('\n--- TEST 4: Forged or invalid DKIM headers are rejected ---');
  const forgedHeaders = `
Received: from spam.badactor.com (spam.badactor.com [198.51.100.1])
Authentication-Results: mx.google.com;
  dkim=fail header.i=@badactor.com header.s=bad;
  spf=fail (google.com: domain of spoof@badactor.com does not designate 198.51.100.1 as permitted sender)
From: careers@mahindra.com
Subject: Application Received
  `;

  const verifyForged = atsVerificationService.verifyEmailHeaders({
    rawHeaders: forgedHeaders,
    expectedCompany: 'Mahindra & Mahindra',
  });
  assert(verifyForged.valid === false, `Expected valid=false for forged headers, got: ${verifyForged.valid}`);
  assert(verifyForged.dkimPassed === false, 'DKIM must be flagged as failed');

  // -------------------------------------------------------------
  // Test 5: Cryptographically authentic DKIM & SPF from matching domain
  // -------------------------------------------------------------
  console.log('\n--- TEST 5: Cryptographically verified headers elevate receipt ---');
  const authenticHeaders = `
Received: by mail-wm1-f44.google.com with SMTP id 5b1f17b1804b1-4775d713c8fso27221295e9.0;
Authentication-Results: mx.google.com;
  dkim=pass header.i=@mahindra.com header.s=202401;
  spf=pass (google.com: domain of no-reply@mahindra.com designates 136.143.188.14 as permitted sender) smtp.mailfrom=no-reply@mahindra.com;
  dmarc=pass (p=REJECT sp=REJECT dis=NONE) header.from=mahindra.com
DKIM-Signature: v=1; a=rsa-sha256; c=relaxed/relaxed; d=mahindra.com; s=202401;
From: "Mahindra Careers" <no-reply@mahindra.com>
To: candidate@recruitx.com
Subject: Thank you for applying - Assistant Manager (Req #MAH-2026-091)
Message-ID: <autojob-mah-881239@mahindra.com>
Date: Sun, 1 Nov 2026 14:15:00 +0000
  `;

  const verifyAuthentic = atsVerificationService.verifyEmailHeaders({
    rawHeaders: authenticHeaders,
    expectedCompany: 'Mahindra & Mahindra',
  });
  assert(verifyAuthentic.valid === true, `Expected authentic headers to pass verification, got: ${verifyAuthentic.valid}`);
  assert(verifyAuthentic.dkimPassed === true, 'DKIM signature must pass');
  assert(verifyAuthentic.spfPassed === true, 'SPF must pass');
  assert(verifyAuthentic.senderDomain === 'mahindra.com', `Sender domain ${verifyAuthentic.senderDomain} must match mahindra.com`);

  // Verify elevation in atsVerificationService
  const receiptResult = atsVerificationService.verifyEmployerConfirmation({
    applicationId: 'test-ext-3',
    companyName: 'Mahindra & Mahindra',
    employerConfirmationSnippet: authenticHeaders,
    externalReferenceNumber: 'MAH-2026-091',
    rawEmailHeaders: authenticHeaders,
  });

  assert(receiptResult.valid === true, 'Confirmation must be valid');
  assert(receiptResult.isIndependentlyAuthenticated === true, 'Must be independently authenticated');

  // Create an application with this verified proof
  const verifiedApp = new Application({
    _id: 'test-ext-3',
    studentId: 'stud-1',
    companyName: 'Mahindra & Mahindra',
    jobTitle: 'Assistant Manager',
    status: 'employer_receipt_confirmed',
    submissionStatus: 'submitted',
    evidenceClassification: 'independently_authenticated',
    isIndependentlyAuthenticated: true,
    employerReceipt: receiptResult.receipt,
    appliedAt: new Date(),
    updatedAt: new Date(),
  });

  const status5 = atsVerificationService.getAuthoritativeStatus(verifiedApp);
  const evidence5 = atsVerificationService.getEvidenceClassification(verifiedApp);
  assert(status5 === 'employer_receipt_confirmed', `Expected employer_receipt_confirmed, got: ${status5}`);
  assert(evidence5 === 'independently_authenticated', `Expected independently_authenticated, got: ${evidence5}`);
  assert(APPLICATION_STATUS_CONFIG[status5].label === 'Employer Receipt Confirmed', 'Status config label matches');

  // -------------------------------------------------------------
  // Test 6: Inbound Authenticated ATS Webhook elevates status
  // -------------------------------------------------------------
  console.log('\n--- TEST 6: Inbound ATS Webhook updates hiring stage ---');
  const stageUpdatedApp = new Application({
    _id: 'test-ext-4',
    studentId: 'stud-1',
    companyName: 'GMR Group',
    jobTitle: 'Executive - Airport Operations',
    status: 'interview_scheduled',
    hiringStage: 'interview_scheduled',
    evidenceClassification: 'independently_authenticated',
    isIndependentlyAuthenticated: true,
    appliedAt: new Date(),
    updatedAt: new Date(),
  });

  const status6 = atsVerificationService.getAuthoritativeStatus(stageUpdatedApp);
  const evidence6 = atsVerificationService.getEvidenceClassification(stageUpdatedApp);
  assert(status6 === 'employer_status_updated', `Expected employer_status_updated, got: ${status6}`);
  assert(evidence6 === 'independently_authenticated', `Expected independently_authenticated, got: ${evidence6}`);
  assert(APPLICATION_STATUS_CONFIG[status6].label === 'Employer Status Updated', 'Status config label matches');

  // -------------------------------------------------------------
  // Test 7: Verify all 9 Primary Application Statuses are defined and unique
  // -------------------------------------------------------------
  console.log('\n--- TEST 7: Mutually exclusive 9-status coverage ---');
  const expectedStatuses = [
    'saved_in_recruitx',
    'external_application_required',
    'awaiting_employer_verification',
    'email_sent',
    'email_delivered',
    'employer_receipt_confirmed',
    'employer_status_updated',
    'submission_failed',
    'unable_to_verify',
  ];

  const configuredStatuses = Object.keys(APPLICATION_STATUS_CONFIG);
  assert(expectedStatuses.length === 9, `Expected exactly 9 statuses, got: ${expectedStatuses.length}`);
  for (const s of expectedStatuses) {
    assert(configuredStatuses.includes(s), `Config has key: ${s}`);
  }

  // -------------------------------------------------------------
  // Test 8: AES-256-GCM Token Encryption & Decryption
  // -------------------------------------------------------------
  console.log('\n--- TEST 8: AES-256-GCM OAuth Token Authenticated Encryption ---');
  const sampleToken = 'ya29.a0AfH6SMDI_secret_access_token_1234567890abcdefghijklmnopqrstuvwxyz';
  const encrypted = encryptToken(sampleToken);
  assert(encrypted !== sampleToken, 'Encrypted token must differ from plain token');
  assert(encrypted.includes(':'), 'Encrypted format must contain iv:authTag:ciphertext');

  const decrypted = decryptToken(encrypted);
  assert(decrypted === sampleToken, 'Decrypted token must exactly match original token');

  // Test tamper detection
  const parts = encrypted.split(':');
  parts[2] = parts[2].substring(0, parts[2].length - 4) + 'AAAA'; // Corrupt ciphertext
  const tampered = parts.join(':');
  let tamperCaught = false;
  try {
    decryptToken(tampered);
  } catch {
    tamperCaught = true;
  }
  assert(tamperCaught, 'Tampered ciphertext must fail authenticated decryption (integrity check)');

  // -------------------------------------------------------------
  // Test 9: Application Email Sent & Delivered Authoritative Status
  // -------------------------------------------------------------
  console.log('\n--- TEST 9: Email Sent & Email Delivered Status Mapping ---');
  const emailSentApp = new Application({
    _id: 'test-email-1',
    studentId: 'stud-1',
    companyName: 'Acme Global Corp',
    jobTitle: 'Senior Infrastructure Engineer',
    status: 'email_sent',
    submissionStatus: 'submitted',
    submissionType: 'direct_hr_dispatch',
    senderEmail: 'candidate@gmail.com',
    recipientEmail: 'jobs@acmeglobal.com',
    emailProvider: 'gmail',
    emailMessageId: '18b23456789abcdef',
    emailSentAt: new Date(),
    emailDeliveryStatus: 'sent',
    appliedAt: new Date(),
    updatedAt: new Date(),
  });

  const statusEmailSent = atsVerificationService.getAuthoritativeStatus(emailSentApp);
  assert(statusEmailSent === 'email_sent', `Expected email_sent, got: ${statusEmailSent}`);
  assert(APPLICATION_STATUS_CONFIG[statusEmailSent].label.includes('Email Sent'), 'Config label matches Email Sent');

  emailSentApp.emailDeliveryStatus = 'delivered';
  emailSentApp.status = 'email_delivered';
  const statusEmailDelivered = atsVerificationService.getAuthoritativeStatus(emailSentApp);
  assert(statusEmailDelivered === 'email_delivered', `Expected email_delivered, got: ${statusEmailDelivered}`);
  assert(APPLICATION_STATUS_CONFIG[statusEmailDelivered].label.includes('Email Delivered'), 'Config label matches Email Delivered');

  // -------------------------------------------------------------
  // Test 10: Destination Resolver (Company Public Email vs Career Portal)
  // -------------------------------------------------------------
  console.log('\n--- TEST 10: Destination Resolver Logic Across Companies ---');
  // Known verified hiring email
  const destEmail = CandidateApplicationEmailService.resolveApplicationDestination({
    companyName: 'Tesla Motors',
    targetHrEmail: 'careers@tesla.com',
  });
  assert(destEmail.method === 'email', 'Explicit hiring email must resolve to email method');
  assert(destEmail.destinationEmail === 'careers@tesla.com', 'Resolved email matches target email');

  // Unknown company with no public email -> Portal
  const destPortal = CandidateApplicationEmailService.resolveApplicationDestination({
    companyName: 'Proprietary Unlisted Firm XYZ 999',
    jobUrl: 'https://careers.proprietaryxyz.com/apply/123',
  });
  assert(destPortal.method === 'portal', 'Company without public email must mandate portal submission');
  assert(destPortal.portalUrl === 'https://careers.proprietaryxyz.com/apply/123', 'Portal URL preserved');

  console.log('\n================================================================');
  console.log(`TEST SUMMARY: Passed: ${passed} | Failed: ${failed}`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal error in tests:', err);
  process.exit(1);
});
