import React from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Shield, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const TermsPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-neutral-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(-1)}
          className="gap-2 text-xs"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>

        <Card className="p-8 space-y-6 border-neutral-200">
          <div className="flex items-center gap-3 border-b border-neutral-200 pb-4">
            <div className="p-2 rounded-lg bg-neutral-900 text-white">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-neutral-900">Terms of Service</h1>
              <p className="text-xs text-neutral-500">Last updated: October 2026</p>
            </div>
          </div>

          <div className="space-y-4 text-xs text-neutral-700 leading-relaxed">
            <section className="space-y-1.5">
              <h2 className="text-sm font-bold text-neutral-900">1. Acceptance of Terms</h2>
              <p>
                By creating an account or accessing the RecruitX recruitment and placement platform, you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, you may not access or use the platform.
              </p>
            </section>

            <section className="space-y-1.5">
              <h2 className="text-sm font-bold text-neutral-900">2. User Accounts &amp; Roles</h2>
              <p>
                RecruitX provides specialized services for Candidates (Students), Recruiters, and Academic Administrators. You agree to provide accurate, complete, and truthful information during registration, profile creation, and job applications.
              </p>
            </section>

            <section className="space-y-1.5">
              <h2 className="text-sm font-bold text-neutral-900">3. Recruitment &amp; Application Protocol</h2>
              <p>
                Candidates may submit resumes, review career roadmaps, and apply to job openings. Recruiters may post opportunities and contact candidates through direct in-platform messaging. Automated job applications are dispatched only when explicitly authorized by the candidate.
              </p>
            </section>

            <section className="space-y-1.5">
              <h2 className="text-sm font-bold text-neutral-900">4. Code of Conduct</h2>
              <p>
                Users agree not to upload fraudulent resumes, post misleading job listings, or engage in abusive communication. RecruitX reserves the right to suspend or terminate accounts that violate professional recruitment standards.
              </p>
            </section>

            <section className="space-y-1.5">
              <h2 className="text-sm font-bold text-neutral-900">5. Limitation of Liability</h2>
              <p>
                RecruitX facilitates recruitment connections but does not guarantee employment offers, interview scheduling by third-party recruiters, or candidate acceptance.
              </p>
            </section>
          </div>
        </Card>
      </div>
    </div>
  );
};
