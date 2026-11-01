import { AtsVerificationService } from '../src/services/atsVerificationService.js';
import { ApplicationDoc, VerificationLifecycleStage } from '../src/models/Application.js';

console.log('================================================================');
console.log('  RECRUITX EMPLOYER-SIDE VERIFICATION TEST SUITE');
console.log('================================================================\n');

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, msg: string) {
  totalTests++;
  if (condition) {
    console.log(`  ✓ PASS: ${msg}`);
    passedTests++;
  } else {
    console.error(`  ✕ FAIL: ${msg}`);
    throw new Error(`Test failed: ${msg}`);
  }
}

// TEST SUITE 1: ATS Provider Pattern Detection
console.log('--- TEST 1: ATS Provider Pattern Detection ---');
assert(
  AtsVerificationService.detectAtsProvider('WD-2026-98124') === 'Workday',
  'Workday prefix WD-... detected as Workday'
);
assert(
  AtsVerificationService.detectAtsProvider('WKD_10928374') === 'Workday',
  'Workday prefix WKD_... detected as Workday'
);
assert(
  AtsVerificationService.detectAtsProvider('GH-981234') === 'Greenhouse',
  'Greenhouse prefix GH-... detected as Greenhouse'
);
assert(
  AtsVerificationService.detectAtsProvider('GRN_448201') === 'Greenhouse',
  'Greenhouse prefix GRN_... detected as Greenhouse'
);
assert(
  AtsVerificationService.detectAtsProvider('LEV-abcdef1234') === 'Lever',
  'Lever prefix LEV-... detected as Lever'
);
assert(
  AtsVerificationService.detectAtsProvider('SR-4482910') === 'SmartRecruiters',
  'SmartRecruiters prefix SR-... detected as SmartRecruiters'
);
assert(
  AtsVerificationService.detectAtsProvider('REQ-449102') === 'Oracle Taleo',
  'Oracle Taleo prefix REQ-... detected as Oracle Taleo'
);
assert(
  AtsVerificationService.detectAtsProvider('LI-992817462') === 'LinkedIn Easy Apply',
  'LinkedIn Easy Apply prefix LI-... detected as LinkedIn Easy Apply'
);
assert(
  AtsVerificationService.detectAtsProvider(undefined, 'jobs-noreply@workday.com') === 'Workday',
  'Workday sender domain detected as Workday'
);
assert(
  AtsVerificationService.detectAtsProvider(undefined, 'notifications@greenhouse.io') === 'Greenhouse',
  'Greenhouse sender domain detected as Greenhouse'
);

// TEST SUITE 2: Cryptographic Receipt Fingerprint (SHA-256)
console.log('\n--- TEST 2: Cryptographic Receipt Fingerprint (SHA-256) ---');
const testDate = new Date('2026-11-01T12:00:00.000Z');
const hash1 = AtsVerificationService.generateReceiptHash({
  applicationId: 'app-12345',
  referenceNumber: 'WD-2026-98124',
  senderEmail: 'jobs-noreply@google.com',
  confirmedAt: testDate,
});
const hash2 = AtsVerificationService.generateReceiptHash({
  applicationId: 'app-12345',
  referenceNumber: 'WD-2026-98124',
  senderEmail: 'jobs-noreply@google.com',
  confirmedAt: testDate,
});
assert(hash1.length === 64, 'SHA-256 receipt hash is 64 hex characters');
assert(hash1 === hash2, 'Identical receipt inputs yield deterministic hash');

const hashDifferent = AtsVerificationService.generateReceiptHash({
  applicationId: 'app-12345',
  referenceNumber: 'WD-2026-98125', // 1 char diff
  senderEmail: 'jobs-noreply@google.com',
  confirmedAt: testDate,
});
assert(hash1 !== hashDifferent, 'Different reference number yields distinct hash (tamper-evident)');

// TEST SUITE 3: Receipt Validation & Ingestion
console.log('\n--- TEST 3: Receipt Validation & Ingestion ---');
const invalidEmpty = AtsVerificationService.verifyEmployerConfirmation({
  applicationId: 'app-test',
  companyName: 'Acme Corp',
  externalReferenceNumber: '',
  employerSenderEmail: '',
});
assert(!invalidEmpty.valid, 'Empty reference and email rejected');

const invalidEmail = AtsVerificationService.verifyEmployerConfirmation({
  applicationId: 'app-test',
  companyName: 'Acme Corp',
  externalReferenceNumber: '',
  employerSenderEmail: 'not-an-email',
});
assert(!invalidEmail.valid, 'Malformed email address rejected');

const validEmailOnly = AtsVerificationService.verifyEmployerConfirmation({
  applicationId: 'app-test',
  companyName: 'Google',
  employerSenderEmail: 'jobs-noreply@google.com',
  employerConfirmationSnippet: 'Thank you for applying for Senior Software Engineer.',
  receivedAt: testDate,
});
assert(validEmailOnly.valid && validEmailOnly.receipt !== undefined, 'Valid employer confirmation email accepted');
assert(
  validEmailOnly.receipt?.receiptSource === 'employer_confirmation_email',
  'Receipt source categorized as employer_confirmation_email'
);
assert(
  validEmailOnly.receipt?.acknowledgedBy?.includes('Google Talent Acquisition') === true,
  'Acknowledged by contains company Talent Acquisition'
);

const validAtsRefOnly = AtsVerificationService.verifyEmployerConfirmation({
  applicationId: 'app-test',
  companyName: 'Tesla',
  externalReferenceNumber: 'WD-2026-98124',
  receivedAt: testDate,
});
assert(validAtsRefOnly.valid && validAtsRefOnly.receipt !== undefined, 'Valid ATS reference number accepted');
assert(
  validAtsRefOnly.receipt?.receiptSource === 'external_ats_reference',
  'Receipt source categorized as external_ats_reference'
);

// TEST SUITE 4: Verification Lifecycle Stages Evaluation
console.log('\n--- TEST 4: Verification Lifecycle Stages Evaluation ---');

// Stage 1: Recorded
const appRecorded = new ApplicationDoc(
  {
    student: 'student-1',
    companyName: 'OpenAI',
    jobTitle: 'Research Scientist',
    submissionStatus: 'requires_manual_application',
    submissionType: 'external_portal',
    verificationLifecycleStage: 'recorded',
  },
  'rec-app-1'
);
const evalRecorded = AtsVerificationService.evaluateApplicationVerification(appRecorded);
assert(evalRecorded.lifecycleStage === 'recorded', 'Manual portal requirement evaluated as recorded');
assert(!evalRecorded.isEmployerConfirmed, 'Unsubmitted manual portal is NOT employer confirmed');
assert(!evalRecorded.hasAuthorizedIntegration, 'External portal has no unauthorized integration');

// Stage 2: Dispatched (External submission awaiting verification)
const appDispatched = new ApplicationDoc(
  {
    student: 'student-1',
    companyName: 'Meta',
    jobTitle: 'Production Engineer',
    submissionStatus: 'external_awaiting_verification',
    submissionType: 'external_portal',
    verificationLifecycleStage: 'dispatched',
  },
  'disp-app-2'
);
const evalDispatched = AtsVerificationService.evaluateApplicationVerification(appDispatched);
assert(evalDispatched.lifecycleStage === 'dispatched', 'Candidate portal submission evaluated as dispatched');
assert(!evalDispatched.isEmployerConfirmed, 'Awaiting verification is NOT falsely marked as employer confirmed');
assert(
  evalDispatched.externalStatus === 'External Submission — Awaiting Verification',
  'External status clearly indicates Awaiting Verification'
);

// Stage 3: External Gateway Accepted (Brevo Email Dispatch)
const appGatewayAccepted = new ApplicationDoc(
  {
    student: 'student-1',
    companyName: 'Stripe',
    jobTitle: 'Backend Engineer',
    submissionStatus: 'submitted',
    submissionType: 'direct_hr_dispatch',
    verificationLifecycleStage: 'external_accepted',
    confirmationDetails: {
      confirmationId: 'RCX-EMAIL-1234',
      messageId: '<brevo-message-id-9921@smtp.brevo.com>',
      recipient: 'hr@stripe.com',
      dispatchMethod: 'Transactional Brevo HTTPS Gateway',
      timestamp: new Date(),
    },
  },
  'gw-app-3'
);
const evalGateway = AtsVerificationService.evaluateApplicationVerification(appGatewayAccepted);
assert(evalGateway.lifecycleStage === 'external_accepted', 'Email payload accepted evaluated as external_accepted');
assert(
  evalGateway.externalReferenceNumber === '<brevo-message-id-9921@smtp.brevo.com>',
  'Gateway messageId preserved as external reference number'
);

// Stage 4: Employer Receipt Confirmed (Candidate linked ATS ref / confirmation email)
const appReceiptConfirmed = new ApplicationDoc(
  {
    student: 'student-1',
    companyName: 'Amazon',
    jobTitle: 'SDE II',
    submissionStatus: 'submitted',
    submissionType: 'external_portal',
    verificationLifecycleStage: 'employer_receipt_confirmed',
    externalAtsName: 'Workday',
    employerReceipt: {
      receiptSource: 'employer_confirmation_email',
      externalReferenceNumber: 'WD-2026-98124',
      employerSenderEmail: 'jobs-noreply@amazon.com',
      employerConfirmationSnippet: 'Your application has been received.',
      acknowledgedBy: 'Amazon Talent Acquisition <jobs-noreply@amazon.com>',
      receiptHash: 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789',
      confirmedAt: new Date(),
      verifiedNotes: 'Employer receipt verified via Workday.',
    },
  },
  'rec-app-4'
);
const evalReceipt = AtsVerificationService.evaluateApplicationVerification(appReceiptConfirmed);
assert(evalReceipt.lifecycleStage === 'employer_receipt_confirmed', 'Verified receipt evaluated as employer_receipt_confirmed');
assert(evalReceipt.isEmployerConfirmed === true, 'Confirmed receipt evaluated as isEmployerConfirmed: true');
assert(evalReceipt.externalReferenceNumber === 'WD-2026-98124', 'External ATS reference correctly exposed');
assert(evalReceipt.externalAtsName === 'Workday', 'Workday ATS detected correctly');

// Stage 5: Employer Status Updated (On-Platform Recruiter advances candidate)
const appStatusUpdated = new ApplicationDoc(
  {
    student: 'student-1',
    recruiter: { _id: 'rec-1', name: 'Sarah Connor', company: 'Cyberdyne Systems' },
    companyName: 'Cyberdyne Systems',
    jobTitle: 'AI Safety Specialist',
    status: 'interview_scheduled',
    submissionStatus: 'submitted',
    submissionType: 'platform_recruiter',
    verificationLifecycleStage: 'employer_status_updated',
  },
  'stat-app-5'
);
const evalStatusUpdated = AtsVerificationService.evaluateApplicationVerification(appStatusUpdated);
assert(evalStatusUpdated.lifecycleStage === 'employer_status_updated', 'Recruiter pipeline update evaluated as employer_status_updated');
assert(evalStatusUpdated.isEmployerConfirmed === true, 'Employer status updated evaluated as isEmployerConfirmed: true');
assert(evalStatusUpdated.hasAuthorizedIntegration === true, 'Platform recruiter has authorized integration');

console.log('\n================================================================');
console.log(`  ALL ${totalTests} TESTS PASSED SUCCESSFULLY (${passedTests}/${totalTests})!`);
console.log('================================================================');
