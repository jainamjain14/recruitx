import { AtsVerificationService as atsVerificationService, APPLICATION_STATUS_CONFIG } from '../src/services/atsVerificationService.js';
import { Application } from '../src/models/Application.js';

async function runTests() {
  console.log('================================================================');
  console.log('RECRUITX RIGOROUS VERIFICATION SYSTEM AUDIT & REGRESSION TESTS');
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
    submissionStatus: 'external_action_required',
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
  externalApp.submissionStatus = 'dispatched';
  externalApp.evidenceClassification = 'candidate_provided';
  externalApp.portalSubmissionConfirmedAt = new Date();

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
    submissionStatus: 'dispatched',
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
  // Test 7: Verify all 7 Primary Application Statuses are defined and unique
  // -------------------------------------------------------------
  console.log('\n--- TEST 7: Mutually exclusive status coverage ---');
  const expectedStatuses = [
    'saved_in_recruitx',
    'external_application_required',
    'awaiting_employer_verification',
    'employer_receipt_confirmed',
    'employer_status_updated',
    'submission_failed',
    'unable_to_verify',
  ];

  const configuredStatuses = Object.keys(APPLICATION_STATUS_CONFIG);
  assert(expectedStatuses.length === 7, 'Expected exactly 7 statuses');
  for (const s of expectedStatuses) {
    assert(configuredStatuses.includes(s), `Config has key: ${s}`);
  }

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
