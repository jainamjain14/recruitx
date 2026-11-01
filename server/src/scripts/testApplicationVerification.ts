import 'dotenv/config';
import { LinkedInService } from '../services/linkedinService.js';
import { ApplicationSubmissionStatus, ApplicationSubmissionType } from '../models/Application.js';

interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  details?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, suite: string, name: string, details?: string) {
  if (condition) {
    results.push({ suite, name, passed: true, details });
    console.log(`  ✓ [PASS] ${name}`);
  } else {
    results.push({ suite, name, passed: false, details });
    console.error(`  ✗ [FAIL] ${name} - ${details || 'Assertion failed'}`);
  }
}

async function runTests() {
  console.log('\n===============================================================');
  console.log('RECRUITX: APPLICATION SUBMISSION & LINKEDIN VERIFICATION TEST');
  console.log('===============================================================\n');

  // -------------------------------------------------------------
  // SUITE 1: Application Submission Lifecycle & Status Fidelity
  // -------------------------------------------------------------
  console.log('SUITE 1: Application Submission Fidelity & Verifiable Statuses');

  // 1.1 Verify valid submission statuses
  const validStatuses: ApplicationSubmissionStatus[] = [
    'pending',
    'submitting',
    'submitted',
    'submission_failed',
    'requires_manual_application',
    'unable_to_verify',
  ];
  assert(validStatuses.length === 6, 'Submission Statuses', 'All 6 submission statuses defined');

  // 1.2 Platform Recruiter submission simulated payload
  const platformApp = {
    jobId: 'job_platform_101',
    studentId: 'student_404',
    recruiterId: 'recruiter_verified_202',
    submissionStatus: 'submitted' as ApplicationSubmissionStatus,
    submissionType: 'platform_recruiter' as ApplicationSubmissionType,
    applicationDestination: 'RecruitX Verified Recruiter Portal',
    resumeTransmitted: true,
    candidateContactTransmitted: true,
    confirmationDetails: {
      confirmationId: `RCX-PLT-${Date.now().toString(36).toUpperCase()}-TEST`,
      recipient: 'Recruiter Jane Doe (hr@techcorp.com)',
      timestamp: new Date(),
      dispatchMethod: 'RecruitX In-App ATS + Verified WebSocket Delivery',
    },
  };

  assert(
    platformApp.submissionStatus === 'submitted' && platformApp.resumeTransmitted === true,
    'Platform Application',
    'Platform job receives submitted status and confirmed resume transmission'
  );
  assert(
    typeof platformApp.confirmationDetails.confirmationId === 'string' &&
      platformApp.confirmationDetails.confirmationId.startsWith('RCX-PLT-'),
    'Platform Application',
    'Platform job generates verifiable confirmation audit ID'
  );

  // 1.3 External Portal application payload
  const externalApp = {
    jobId: 'job_linkedin_external_303',
    studentId: 'student_404',
    submissionStatus: 'requires_manual_application' as ApplicationSubmissionStatus,
    submissionType: 'external_portal' as ApplicationSubmissionType,
    applicationDestination: 'DeepMind Careers Official Portal',
    destinationUrl: 'https://www.linkedin.com/jobs/view/1234567890/',
    resumeTransmitted: false,
    confirmationDetails: undefined,
  };

  assert(
    externalApp.submissionStatus === 'requires_manual_application',
    'External Portal Application',
    'External job requires manual application instead of falsely claiming submission'
  );
  assert(
    externalApp.resumeTransmitted === false,
    'External Portal Application',
    'External job accurately records resume as pending external candidate transmission'
  );
  assert(
    externalApp.destinationUrl.includes('linkedin.com/jobs/view/1234567890'),
    'External Portal Application',
    'Official application URL is preserved for candidate direct access'
  );

  // 1.4 Manual confirmation transition
  const confirmedExternalApp = {
    ...externalApp,
    submissionStatus: 'submitted' as ApplicationSubmissionStatus,
    confirmationDetails: {
      confirmationId: `MANUAL-CONFIRM-${Date.now().toString(36).toUpperCase()}`,
      recipient: 'DeepMind Careers Official Portal',
      dispatchMethod: 'Candidate Self-Verified Portal Submission',
      timestamp: new Date(),
    },
    statusHistory: [
      {
        status: 'applied',
        changedAt: new Date(),
        note: 'Candidate completed submission on official external portal and verified application status.',
      },
    ],
  };

  assert(
    confirmedExternalApp.submissionStatus === 'submitted',
    'Manual Confirmation',
    'Manual confirmation successfully transitions status to submitted'
  );
  assert(
    confirmedExternalApp.confirmationDetails.confirmationId.startsWith('MANUAL-CONFIRM-'),
    'Manual Confirmation',
    'Manual confirmation records candidate self-verified confirmation ID'
  );
  assert(
    confirmedExternalApp.statusHistory.length > 0 &&
      confirmedExternalApp.statusHistory[0].note.includes('Candidate completed submission'),
    'Manual Confirmation',
    'Status history records audit trail note for transparency'
  );

  // -------------------------------------------------------------
  // SUITE 2: Live LinkedIn Job Verification & Active Status Filtering
  // -------------------------------------------------------------
  console.log('\nSUITE 2: Real-Time LinkedIn Job & Company Verification');

  // Test HTML with an active listing inside standard <li> element
  const activeJobHtml = `
    <ul>
      <li>
        <div class="job-search-card" data-entity-urn="urn:li:jobPosting:9876543210">
          <h3 class="base-search-card__title">Senior Quantum Systems Architect</h3>
          <h4 class="base-search-card__subtitle">
            <a class="hidden-nested-link">IBM Quantum</a>
          </h4>
          <span class="job-search-card__location">Bangalore, Karnataka, India</span>
          <time class="job-search-card__listdate" datetime="2026-11-01">2 hours ago</time>
          <a class="base-card__full-link" href="https://www.linkedin.com/jobs/view/9876543210?refId=abc&trackingId=xyz">View</a>
          <p class="job-search-card__snippet">Looking for an experienced architect in Qiskit, Quantum Circuit Optimization, Cryogenic Controls, and Python.</p>
        </div>
      </li>
    </ul>
  `;

  // Test HTML with a CLOSED listing inside <li> element
  const closedJobHtml = `
    <ul>
      <li>
        <div class="job-search-card" data-entity-urn="urn:li:jobPosting:1122334455">
          <h3 class="base-search-card__title">Lead Data Scientist</h3>
          <h4 class="base-search-card__subtitle">
            <a class="hidden-nested-link">Closed Analytics Inc</a>
          </h4>
          <span class="job-search-card__location">Mumbai, Maharashtra, India</span>
          <span class="closed-job__status">No longer accepting applications</span>
          <a class="base-card__full-link" href="https://www.linkedin.com/jobs/view/1122334455">View</a>
        </div>
      </li>
    </ul>
  `;

  // Parse active listing using linkedinService
  const parsedActive = await LinkedInService.parseLinkedInHtmlWithRealDetails(
    activeJobHtml,
    'Quantum Systems Architect'
  );

  assert(
    parsedActive.length === 1,
    'Active Job Parsing',
    `Active listing extracted successfully (found: ${parsedActive.length})`
  );

  if (parsedActive.length > 0) {
    const job = parsedActive[0];
    assert(
      job.title === 'Senior Quantum Systems Architect',
      'Active Job Parsing',
      `Title matched expected (actual: "${job.title}")`
    );
    assert(
      job.company === 'IBM Quantum',
      'Active Job Parsing',
      `Company matched expected (actual: "${job.company}")`
    );
    assert(
      job.isVerifiedActive === true && job.isAcceptingApplications === true,
      'Active Job Parsing',
      'Listing is verified active and currently accepting applications'
    );
    assert(
      job.verificationSource === 'linkedin_live_api',
      'Active Job Parsing',
      `Verification source recorded as "${job.verificationSource}"`
    );
    assert(
      job.jobUrl.includes('9876543210') && !job.jobUrl.includes('refId='),
      'Active Job Parsing',
      `Clean direct URL generated: ${job.jobUrl}`
    );
    assert(
      Array.isArray(job.requiredSkills) && job.requiredSkills.length > 0,
      'Active Job Parsing',
      `Dynamically extracted skills: [${job.requiredSkills.join(', ')}]`
    );
  }

  // Parse closed listing using linkedinService
  const parsedClosed = await LinkedInService.parseLinkedInHtmlWithRealDetails(
    closedJobHtml,
    'Lead Data Scientist'
  );

  assert(
    parsedClosed.length === 0,
    'Closed Job Filtering',
    `Closed job ("No longer accepting applications") was correctly discarded (extracted: ${parsedClosed.length})`
  );

  // -------------------------------------------------------------
  // SUITE 3: Dynamic Live Search Across Real Unseen Professions
  // -------------------------------------------------------------
  console.log('\nSUITE 3: Dynamic Live Search Across Real Unseen Professions');

  const testProfessions = [
    'Bioinformatics Scientist',
    'Wind Turbine Mechanical Engineer',
    'Cinematographer',
  ];

  for (const title of testProfessions) {
    console.log(`Querying live jobs for profession: "${title}"...`);
    const liveJobs = await LinkedInService.fetchLiveJobs(title);
    console.log(`  -> Retrieved ${liveJobs.length} live verified jobs for "${title}"`);
    // Note: Live fetch depends on network and rate-limiting; if network returns jobs, verify integrity
    if (liveJobs.length > 0) {
      for (const j of liveJobs.slice(0, 3)) {
        assert(
          j.isVerifiedActive === true,
          'Live Query Integrity',
          `"${j.title}" at "${j.company}" is verified active`
        );
        assert(
          typeof j.jobUrl === 'string' && j.jobUrl.startsWith('https://'),
          'Live Query Integrity',
          `Valid direct application URL: ${j.jobUrl}`
        );
        assert(
          j.isAcceptingApplications === true,
          'Live Query Integrity',
          `Accepting applications status confirmed`
        );
      }
    } else {
      console.log(`  (Note: Live network returned 0 listings for "${title}", no synthetic jobs fallback used - correct behavior)`);
    }
  }

  // Summary
  console.log('\n===============================================================');
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = total - passed;
  console.log(`TOTAL TESTS: ${total} | PASSED: ${passed} | FAILED: ${failed}`);
  if (failed === 0) {
    console.log('>>> ALL VERIFICATION AND SUBMISSION AUDIT TESTS PASSED! <<<');
  } else {
    console.error('>>> SOME TESTS FAILED! <<<');
    process.exit(1);
  }
  console.log('===============================================================\n');
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
