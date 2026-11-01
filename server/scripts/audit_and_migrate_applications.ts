import dotenv from 'dotenv';
dotenv.config();
import { initFirebase } from '../src/config/firebase.js';
import { cleanDataForFirestore } from '../src/models/firestoreHelper.js';

async function migrateExistingApplications() {
  console.log('================================================================');
  console.log('  AUDITING & RECLASSIFYING EXISTING FIRESTORE APPLICATIONS');
  console.log('================================================================\n');

  const db = initFirebase();
  const snapshot = await db.collection('applications').get();
  console.log(`Found ${snapshot.size} application records in Cloud Firestore.\n`);

  let migratedCount = 0;

  for (const doc of snapshot.docs) {
    const d = doc.data();
    const appId = doc.id;
    const company = d.companyName || 'Employer';
    const jobTitle = d.jobTitle || 'Open Position';
    const oldStatus = d.status;
    const hasRecruiter = Boolean(d.recruiter);

    let newStatus = d.status;
    let newSubmissionStatus = d.submissionStatus || 'submitted';
    let newEvidenceClassification = d.evidenceClassification || 'internal_recruitx';
    let newLifecycleStage = d.verificationLifecycleStage || 'recorded';
    let auditNote = '';

    // Classify based on authentic evidence
    if (d.hiringStage && d.hiringStage !== 'applied') {
      newStatus = 'employer_status_updated';
      newSubmissionStatus = 'submitted';
      newEvidenceClassification = hasRecruiter ? 'internal_recruitx' : 'independently_authenticated';
      newLifecycleStage = 'employer_status_updated';
      auditNote = `Audit Migration: Preserved employer stage update to "${d.hiringStage.toUpperCase()}". Evidence source: ${hasRecruiter ? 'RecruitX Platform Recruiter Review' : 'Verified Employer ATS'}.`;
    } else if (['under_review', 'shortlisted', 'interview_scheduled', 'offered', 'rejected'].includes(oldStatus)) {
      newStatus = 'employer_status_updated';
      newSubmissionStatus = 'submitted';
      newEvidenceClassification = hasRecruiter ? 'internal_recruitx' : 'independently_authenticated';
      newLifecycleStage = 'employer_status_updated';
      auditNote = `Audit Migration: Reclassified from legacy status "${oldStatus}" to "Employer Status Updated" (Hiring Stage: ${oldStatus.toUpperCase()}). Evidence source: ${hasRecruiter ? 'RecruitX Platform Recruiter' : 'Authorized ATS'}.`;
    } else if (d.employerReceipt?.isIndependentlyAuthenticated) {
      newStatus = 'employer_receipt_confirmed';
      newSubmissionStatus = 'submitted';
      newEvidenceClassification = 'independently_authenticated';
      newLifecycleStage = 'employer_receipt_confirmed';
      auditNote = `Audit Migration: Independently authenticated employer receipt on file (Ref #${d.employerReceipt.externalReferenceNumber || 'CONFIRMED'}).`;
    } else if (d.submissionStatus === 'external_awaiting_verification' || d.employerReceipt?.receiptSource === 'candidate_self_reported' || d.confirmationDetails?.dispatchMethod?.includes('Candidate')) {
      newStatus = 'awaiting_employer_verification';
      newSubmissionStatus = 'external_awaiting_verification';
      newEvidenceClassification = 'candidate_provided';
      newLifecycleStage = 'dispatched';
      auditNote = `Audit Migration: Reclassified to "Submitted — Awaiting Employer Verification" (Candidate self-reported external portal dispatch; independent employer receipt pending).`;
    } else if (d.submissionType === 'direct_hr_dispatch' && d.confirmationDetails?.messageId) {
      newStatus = 'awaiting_employer_verification';
      newSubmissionStatus = 'submitted';
      newEvidenceClassification = 'external_system_response';
      newLifecycleStage = 'external_accepted';
      auditNote = `Audit Migration: Classified as External System Response (Brevo HTTPS MessageId: ${d.confirmationDetails.messageId} accepted; awaiting independent employer confirmation).`;
    } else if (hasRecruiter) {
      newStatus = 'awaiting_employer_verification';
      newSubmissionStatus = 'submitted';
      newEvidenceClassification = 'internal_recruitx';
      newLifecycleStage = 'external_accepted';
      auditNote = `Audit Migration: Verified as delivered to RecruitX Platform Recruiter ATS Queue for ${company}.`;
    } else {
      // External portal application without platform recruiter and without verified submission
      newStatus = 'external_application_required';
      newSubmissionStatus = 'requires_manual_application';
      newEvidenceClassification = 'internal_recruitx';
      newLifecycleStage = 'recorded';
      auditNote = `Audit Migration: Corrected from legacy "applied" to "External Application Required" (Candidate must complete submission on official ${company} career portal).`;
    }

    const currentHistory = Array.isArray(d.statusHistory) ? d.statusHistory : [];
    const updatedHistory = [
      ...currentHistory,
      {
        status: newStatus,
        changedAt: new Date(),
        note: auditNote,
      },
    ];

    const updates: any = cleanDataForFirestore({
      status: newStatus,
      primaryStatus: newStatus,
      submissionStatus: newSubmissionStatus,
      evidenceClassification: newEvidenceClassification,
      verificationLifecycleStage: newLifecycleStage,
      statusHistory: updatedHistory,
      updatedAt: new Date(),
    });

    if (['under_review', 'shortlisted', 'interview_scheduled', 'offered', 'rejected'].includes(oldStatus) && !d.hiringStage) {
      updates.hiringStage = oldStatus;
    }

    await db.collection('applications').doc(appId).update(updates);
    migratedCount++;

    console.log(`[${migratedCount}/${snapshot.size}] App ${appId.slice(0, 8)} (${company} - ${jobTitle.slice(0, 30)}):`);
    console.log(`   Old Status: "${oldStatus}" -> New Status: "${newStatus}"`);
    console.log(`   Evidence Level: "${newEvidenceClassification}" | Lifecycle: "${newLifecycleStage}"\n`);
  }

  console.log('================================================================');
  console.log(`  AUDIT MIGRATION COMPLETE: All ${migratedCount} applications updated!`);
  console.log('================================================================');
}

migrateExistingApplications().catch(console.error);
