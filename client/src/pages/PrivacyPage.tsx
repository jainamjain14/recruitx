import React from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Lock, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const PrivacyPage: React.FC = () => {
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
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-neutral-900">Privacy Policy</h1>
              <p className="text-xs text-neutral-500">Last updated: October 2026</p>
            </div>
          </div>

          <div className="space-y-4 text-xs text-neutral-700 leading-relaxed">
            <section className="space-y-1.5">
              <h2 className="text-sm font-bold text-neutral-900">1. Information We Collect</h2>
              <p>
                We collect personal information you provide when registering, completing profile questionnaires, and uploading your resume. This includes your name, email, profession, technical competencies, educational qualifications, and work experience.
              </p>
            </section>

            <section className="space-y-1.5">
              <h2 className="text-sm font-bold text-neutral-900">2. How We Use Your Data</h2>
              <p>
                Your data is processed to calculate deterministic job readiness scores, recommend verified Coursera educational roadmaps, identify skill gaps, and match your profile with relevant employer job requisitions.
              </p>
            </section>

            <section className="space-y-1.5">
              <h2 className="text-sm font-bold text-neutral-900">3. Data Sharing &amp; Visibility</h2>
              <p>
                Candidate profile details and resumes are only visible to verified recruiters when an application is submitted or when a candidate opts into employer discovery. We never sell your personal information to third parties.
              </p>
            </section>

            <section className="space-y-1.5">
              <h2 className="text-sm font-bold text-neutral-900">4. Security &amp; Encryption</h2>
              <p>
                All account credentials, session tokens, and communication channels utilize industry-standard encryption, JSON Web Tokens (JWT), and secure Firebase Cloud Firestore infrastructure.
              </p>
            </section>

            <section className="space-y-1.5">
              <h2 className="text-sm font-bold text-neutral-900">5. Your Rights</h2>
              <p>
                You retain full rights to update your profile information, replace uploaded resumes, and request account deletion at any time via Settings.
              </p>
            </section>
          </div>
        </Card>
      </div>
    </div>
  );
};
