import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { api } from '../services/api';
import {
  Zap,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Sparkles,
  RefreshCw,
  ArrowRight,
  Target,
  ShieldCheck,
  GraduationCap,
  ExternalLink,
  Award,
  BookOpen,
  Star,
  Clock,
  X,
  RotateCcw,
} from 'lucide-react';

interface SkillGapData {
  targetRole: string;
  matchScore: number;
  acquiredSkills: { name: string; category: string }[];
  missingSkills: { name: string; priority: 'High Impact' | 'Medium Impact' | 'Bonus'; demand: string; estTime: string }[];
  companyRequirements: { company: string; role: string; requiredSkills: string[]; matchRate: number }[];
  aiActionPlan: string[];
}

interface CourseraCourseItem {
  id: string;
  title: string;
  provider: string;
  domain: string;
  pricingType: 'free' | 'paid' | 'both';
  pricingLabel: string;
  courseraUrl: string;
  duration: string;
  rating: number;
  enrolledCount: string;
  level: string;
  skillsCovered: string[];
  description: string;
  certificateType: string;
  isCompleted: boolean;
  completionDetails?: {
    completedAt: string;
    verificationMethod: string;
    certificateUrl?: string;
    certificateId?: string;
    skillsAcquired: string[];
  } | null;
  matchedMissingSkills: string[];
}

export const StudentSkillGap: React.FC = () => {
  const [data, setData] = useState<SkillGapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Coursera Course State
  const [courses, setCourses] = useState<CourseraCourseItem[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [pricingFilter, setPricingFilter] = useState<'all' | 'free' | 'paid'>('all');
  const [onlyMissingFilter, setOnlyMissingFilter] = useState(true);

  // Verification Modal State
  const [selectedCourseForModal, setSelectedCourseForModal] = useState<CourseraCourseItem | null>(null);
  const [certInput, setCertInput] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifySuccess, setVerifySuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchSkillGap();
    fetchCourses('all');
  }, []);

  const fetchSkillGap = async () => {
    setRefreshing(true);
    try {
      const res = await api.get('/resume/skill-gap');
      if (res.data?.data?.analysis) {
        setData(res.data.data.analysis);
      }
    } catch (err) {
      console.error('Failed to fetch skill gap analysis:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchCourses = async (pricing = pricingFilter) => {
    setCoursesLoading(true);
    try {
      const res = await api.get(`/courses/recommended?pricing=${pricing}`);
      if (res.data?.data?.courses) {
        setCourses(res.data.data.courses);
      }
    } catch (err) {
      console.error('Failed to fetch recommended courses:', err);
    } finally {
      setCoursesLoading(false);
    }
  };

  const handlePricingChange = (pricing: 'all' | 'free' | 'paid') => {
    setPricingFilter(pricing);
    fetchCourses(pricing);
  };

  const openVerifyModal = (course: CourseraCourseItem) => {
    setSelectedCourseForModal(course);
    setCertInput(course.completionDetails?.certificateUrl || '');
    setVerifyError(null);
    setVerifySuccess(null);
  };

  const closeVerifyModal = () => {
    setSelectedCourseForModal(null);
    setCertInput('');
    setVerifyError(null);
    setVerifySuccess(null);
  };

  const handleVerifyCertificate = async () => {
    if (!selectedCourseForModal) return;
    if (!certInput.trim()) {
      setVerifyError('Please enter a Coursera certificate verification URL or Certificate ID.');
      return;
    }

    setVerifying(true);
    setVerifyError(null);
    setVerifySuccess(null);

    try {
      const res = await api.post('/courses/verify', {
        courseId: selectedCourseForModal.id,
        certificateUrlOrCode: certInput.trim(),
      });

      if (res.data?.success) {
        setVerifySuccess(res.data.message || 'Coursera certificate authenticated!');
        // Refresh skill gap and courses to reflect new acquired skills in real time
        await Promise.all([fetchSkillGap(), fetchCourses(pricingFilter)]);
        setTimeout(() => {
          closeVerifyModal();
        }, 1800);
      } else {
        setVerifyError(res.data?.message || 'Verification failed. Please check the URL.');
      }
    } catch (err: any) {
      setVerifyError(err.response?.data?.message || err.message || 'Verification failed. Please check your certificate link.');
    } finally {
      setVerifying(false);
    }
  };

  const handleMarkAudit = async (course: CourseraCourseItem) => {
    setVerifying(true);
    setVerifyError(null);
    try {
      const res = await api.post('/courses/mark-audit', { courseId: course.id });
      if (res.data?.success) {
        setVerifySuccess('Course marked completed! Skills synced to your profile.');
        await Promise.all([fetchSkillGap(), fetchCourses(pricingFilter)]);
        setTimeout(() => {
          closeVerifyModal();
        }, 1500);
      }
    } catch (err: any) {
      setVerifyError(err.response?.data?.message || err.message || 'Failed to mark course completed.');
    } finally {
      setVerifying(false);
    }
  };

  const handleUnmark = async (courseId: string) => {
    try {
      await api.post('/courses/unmark', { courseId });
      await Promise.all([fetchSkillGap(), fetchCourses(pricingFilter)]);
    } catch (err) {
      console.error('Failed to unmark course:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-xs text-neutral-500 flex items-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-neutral-900" />
          AI is analyzing your resume against live company job requirements...
        </p>
      </div>
    );
  }

  const targetRole = data?.targetRole || 'Software Development';
  const matchScore = data?.matchScore || 75;
  const acquiredSkills = data?.acquiredSkills || [];
  const missingSkills = data?.missingSkills || [];
  const companyRequirements = data?.companyRequirements || [];
  const aiActionPlan = data?.aiActionPlan || [];

  // Filter courses by missing skills scope if enabled
  const displayedCourses = onlyMissingFilter
    ? courses.filter((c) => c.matchedMissingSkills.length > 0 || c.isCompleted)
    : courses;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-neutral-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-neutral-900">Skill Gap Analysis & Upskilling</h1>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-neutral-900 text-white">
              AI Real-Time
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Target Job Domain: <span className="font-semibold text-neutral-900">{targetRole}</span>
          </p>
        </div>

        <Button onClick={fetchSkillGap} disabled={refreshing} variant="secondary" size="sm" className="flex items-center gap-1.5">
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Analyzing...' : 'Re-Analyze with AI'}
        </Button>
      </div>

      {/* Match Score Meter Banner */}
      <Card className="p-5 border-neutral-300 bg-neutral-900 text-white space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-semibold text-neutral-300">Target Role Readiness</span>
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight">{targetRole}</h2>
            <p className="text-xs text-neutral-400">
              Compared against active job openings and verified company requirements.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-neutral-800 p-3 rounded-lg border border-neutral-700">
            <div className="text-right">
              <div className="text-2xl font-black text-emerald-400">{matchScore}%</div>
              <div className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider">Job Match Score</div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-neutral-800 rounded-full h-2.5 overflow-hidden">
          <div
            className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500"
            style={{ width: `${matchScore}%` }}
          />
        </div>
      </Card>

      {/* Grid: Acquired Skills vs Missing Skills */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Acquired Skills Card */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-semibold text-neutral-900">Acquired Skills ({acquiredSkills.length})</h2>
            </div>
            <span className="text-[11px] text-neutral-500">From Your Resume & Verified Courses</span>
          </div>

          {acquiredSkills.length === 0 ? (
            <p className="text-xs text-neutral-400 italic">No skills extracted yet. Upload your resume or complete a Coursera course below.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {acquiredSkills.map((skill) => (
                <span
                  key={skill.name}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  {skill.name}
                </span>
              ))}
            </div>
          )}
        </Card>

        {/* Missing Skills Card */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <h2 className="text-sm font-semibold text-neutral-900">Missing Skills for Top Roles ({missingSkills.length})</h2>
            </div>
            <span className="text-[11px] text-neutral-500">Recommended Courses Below</span>
          </div>

          {missingSkills.length === 0 ? (
            <p className="text-xs text-emerald-600 font-semibold">🎉 Outstanding! You meet all core requirements for your target role.</p>
          ) : (
            <div className="space-y-2.5">
              {missingSkills.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between p-3 bg-neutral-50 rounded-md border border-neutral-200"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-neutral-900">{item.name}</span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          item.priority === 'High Impact'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-neutral-200 text-neutral-700'
                        }`}
                      >
                        {item.priority}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-500 mt-0.5">{item.demand}</p>
                  </div>
                  <span className="text-[11px] text-neutral-400 whitespace-nowrap">Est. {item.estTime}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* ============================================================== */}
      {/* COURSERA COURSE RECOMMENDATIONS & AUTOMATED VERIFICATION */}
      {/* ============================================================== */}
      <Card className="p-6 space-y-6 border-neutral-300">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded bg-blue-600 text-white font-black text-xs tracking-wider">
                coursera
              </div>
              <h2 className="text-base font-bold text-neutral-900">
                Recommended Coursera Courses to Bridge Your Gaps
              </h2>
            </div>
            <p className="text-xs text-neutral-500">
              Verified university and industry courses mapped to your missing skills. Completing a course on Coursera automatically marks it completed and adds the skills to your profile.
            </p>
          </div>

          {/* Pricing Selector: User's Choice (All / Free / Paid) */}
          <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-center">
            <span className="text-xs font-medium text-neutral-500 mr-1">Pricing:</span>
            <button
              onClick={() => handlePricingChange('all')}
              className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
                pricingFilter === 'all'
                  ? 'bg-neutral-900 text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              All Options
            </button>
            <button
              onClick={() => handlePricingChange('free')}
              className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors flex items-center gap-1 ${
                pricingFilter === 'free'
                  ? 'bg-emerald-700 text-white'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
              }`}
            >
              <span>100% Free (Audit)</span>
            </button>
            <button
              onClick={() => handlePricingChange('paid')}
              className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors flex items-center gap-1 ${
                pricingFilter === 'paid'
                  ? 'bg-blue-700 text-white'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
              }`}
            >
              <span>Paid Certificate</span>
            </button>
          </div>
        </div>

        {/* Filter Toggle: Missing Skills vs All */}
        <div className="flex items-center justify-between text-xs text-neutral-600">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setOnlyMissingFilter(true)}
              className={`px-3 py-1 rounded text-xs font-medium border transition-colors ${
                onlyMissingFilter
                  ? 'bg-neutral-900 text-white border-neutral-900'
                  : 'bg-white text-neutral-600 border-neutral-300 hover:bg-neutral-50'
              }`}
            >
              Targeted to My Missing Skills ({missingSkills.length})
            </button>
            <button
              onClick={() => setOnlyMissingFilter(false)}
              className={`px-3 py-1 rounded text-xs font-medium border transition-colors ${
                !onlyMissingFilter
                  ? 'bg-neutral-900 text-white border-neutral-900'
                  : 'bg-white text-neutral-600 border-neutral-300 hover:bg-neutral-50'
              }`}
            >
              All {targetRole} Courses ({courses.length})
            </button>
          </div>

          <span className="text-xs text-neutral-500">
            Showing <strong className="text-neutral-900">{displayedCourses.length}</strong> Coursera courses
          </span>
        </div>

        {/* Course Cards Grid */}
        {coursesLoading ? (
          <div className="py-12 flex justify-center items-center">
            <RefreshCw className="w-5 h-5 animate-spin text-neutral-700" />
            <span className="ml-2 text-xs text-neutral-500">Loading Coursera course catalog...</span>
          </div>
        ) : displayedCourses.length === 0 ? (
          <div className="py-10 text-center bg-neutral-50 rounded-lg border border-dashed border-neutral-300 space-y-2">
            <GraduationCap className="w-8 h-8 text-neutral-400 mx-auto" />
            <p className="text-sm font-semibold text-neutral-700">No courses match this filter.</p>
            <p className="text-xs text-neutral-500">Try switching to &quot;All Options&quot; or toggle &quot;All {targetRole} Courses&quot;.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {displayedCourses.map((course) => (
              <div
                key={course.id}
                className={`p-5 rounded-lg border transition-all flex flex-col justify-between space-y-4 ${
                  course.isCompleted
                    ? 'bg-emerald-50/40 border-emerald-300 ring-1 ring-emerald-200'
                    : 'bg-white border-neutral-200 hover:border-neutral-300 hover:shadow-sm'
                }`}
              >
                <div className="space-y-3">
                  {/* Top Bar: Provider, Rating & Pricing Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider block">
                        {course.provider}
                      </span>
                      <h3 className="text-sm font-bold text-neutral-900 line-clamp-2 mt-0.5">
                        {course.title}
                      </h3>
                    </div>

                    {/* Completion Status Badge */}
                    {course.isCompleted ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Completed
                      </span>
                    ) : (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider shrink-0 ${
                          course.pricingType === 'free'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : course.pricingType === 'paid'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-purple-50 text-purple-700 border-purple-200'
                        }`}
                      >
                        {course.pricingType === 'free'
                          ? 'Free Audit'
                          : course.pricingType === 'paid'
                          ? 'Paid Track'
                          : 'Free / Paid'}
                      </span>
                    )}
                  </div>

                  {/* Course Details Snippet */}
                  <p className="text-xs text-neutral-600 line-clamp-2">{course.description}</p>

                  {/* Meta: Rating, Duration, Level */}
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-neutral-500">
                    <span className="flex items-center gap-1 text-amber-600 font-semibold">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      {course.rating}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {course.duration}
                    </span>
                    <span>• {course.level}</span>
                    <span>• {course.enrolledCount}</span>
                  </div>

                  {/* Skills Covered Tags with Highlight on Candidate Missing Skills */}
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 block mb-1.5">
                      Skills You Learn:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {course.skillsCovered.map((sk) => {
                        const isMissing = course.matchedMissingSkills.some(
                          (m) => m.toLowerCase().includes(sk.toLowerCase()) || sk.toLowerCase().includes(m.toLowerCase())
                        );
                        return (
                          <span
                            key={sk}
                            className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                              isMissing
                                ? 'bg-amber-100 text-amber-900 border border-amber-300 font-bold'
                                : 'bg-neutral-100 text-neutral-600'
                            }`}
                          >
                            {isMissing && '★ '}
                            {sk}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="pt-3 border-t border-neutral-100 flex items-center justify-between gap-2">
                  {/* Direct Coursera Link */}
                  <a
                    href={course.courseraUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    <span>Open on Coursera</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>

                  {/* Verification / Completion Controls */}
                  {course.isCompleted ? (
                    <div className="flex items-center gap-2">
                      {course.completionDetails?.certificateUrl && (
                        <a
                          href={course.completionDetails.certificateUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-emerald-700 font-semibold underline flex items-center gap-1"
                        >
                          <Award className="w-3 h-3" />
                          View Cert
                        </a>
                      )}
                      <button
                        onClick={() => handleUnmark(course.id)}
                        className="text-[11px] text-neutral-400 hover:text-neutral-600 underline"
                        title="Remove completion"
                      >
                        Reset
                      </button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => openVerifyModal(course)}
                      className="text-xs gap-1.5 h-8 bg-neutral-900 hover:bg-neutral-800 text-white"
                    >
                      <Award className="w-3.5 h-3.5 text-amber-300" />
                      <span>Verify Completion</span>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Real-World Company Requirements Benchmarks */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2 border-b border-neutral-100 pb-3">
          <Building2 className="w-4 h-4 text-neutral-700" />
          <h2 className="text-sm font-semibold text-neutral-900">Real-World Company Requirements & Readiness</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {companyRequirements.map((comp, idx) => (
            <div key={idx} className="p-4 rounded-md border border-neutral-200 bg-white space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-neutral-900">{comp.company}</h3>
                  <p className="text-[11px] text-neutral-500">{comp.role}</p>
                </div>
                <span className="text-xs font-black px-2 py-1 rounded bg-neutral-100 text-neutral-900 border border-neutral-200">
                  {comp.matchRate}% Match
                </span>
              </div>

              <div>
                <p className="text-[11px] font-medium text-neutral-500 mb-1">Required Skills:</p>
                <div className="flex flex-wrap gap-1.5">
                  {comp.requiredSkills.map((sk) => (
                    <span key={sk} className="px-2 py-0.5 text-[10px] font-medium rounded bg-neutral-100 text-neutral-700">
                      {sk}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* AI Action Plan */}
      <Card className="p-5 space-y-3 bg-neutral-50/50 border-neutral-300">
        <div className="flex items-center gap-2 text-neutral-900 font-semibold text-sm">
          <Sparkles className="w-4 h-4 text-neutral-900" />
          <span>AI Actionable Skill Plan</span>
        </div>
        <div className="space-y-2 pt-1">
          {aiActionPlan.map((plan, idx) => (
            <div key={idx} className="flex items-start gap-2.5 text-xs text-neutral-700">
              <ArrowRight className="w-3.5 h-3.5 text-neutral-900 mt-0.5 shrink-0" />
              <span>{plan}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* ============================================================== */}
      {/* COURSERA COMPLETION & CERTIFICATE VERIFICATION MODAL */}
      {/* ============================================================== */}
      {selectedCourseForModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-5 border border-neutral-200">
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded bg-blue-600 text-white font-black text-[10px] tracking-wider">
                    coursera
                  </span>
                  <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                    Certificate Verification
                  </span>
                </div>
                <h3 className="text-base font-bold text-neutral-900">
                  {selectedCourseForModal.title}
                </h3>
                <p className="text-xs text-neutral-500">
                  Authorized by <strong className="text-neutral-800">{selectedCourseForModal.provider}</strong>
                </p>
              </div>

              <button
                onClick={closeVerifyModal}
                className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error or Success Alert */}
            {verifyError && (
              <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{verifyError}</span>
              </div>
            )}

            {verifySuccess && (
              <div className="p-3 rounded-md bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{verifySuccess}</span>
              </div>
            )}

            {/* Verification Instructions */}
            <div className="space-y-3 bg-neutral-50 p-4 rounded-lg border border-neutral-200 text-xs text-neutral-600">
              <p className="font-semibold text-neutral-800">How auto-verification works:</p>
              <ol className="list-decimal pl-4 space-y-1 text-[11px] text-neutral-600">
                <li>Complete your course or specialization on <a href={selectedCourseForModal.courseraUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline font-medium">coursera.org</a>.</li>
                <li>Copy your public Coursera Certificate link (e.g. <code className="bg-neutral-200 px-1 py-0.5 rounded text-neutral-800">https://www.coursera.org/verify/XXXXXX</code>) or Certificate ID.</li>
                <li>Paste it below — RecruitX will authenticate the certificate with Coursera and automatically add the verified skills to your profile!</li>
              </ol>
            </div>

            {/* Option A: Paid / Verified Certificate Verification */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-700 block">
                Coursera Certificate URL or Certificate ID:
              </label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="https://www.coursera.org/verify/XXXXXX or Certificate ID"
                  value={certInput}
                  onChange={(e) => setCertInput(e.target.value)}
                  disabled={verifying}
                  className="text-xs"
                />
              </div>
              <Button
                onClick={handleVerifyCertificate}
                disabled={verifying || !certInput.trim()}
                className="w-full text-xs font-semibold gap-1.5 bg-blue-600 hover:bg-blue-700 text-white mt-1"
              >
                <Award className="w-3.5 h-3.5" />
                {verifying ? 'Authenticating with Coursera...' : 'Verify Certificate & Sync Skills'}
              </Button>
            </div>

            {/* Divider */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-200" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-bold text-neutral-400">
                <span className="bg-white px-2">OR Free Audit Track</span>
              </div>
            </div>

            {/* Option B: Free Audit Track Confirmation */}
            <div className="space-y-2 text-center bg-emerald-50/50 p-3 rounded-lg border border-emerald-100">
              <p className="text-[11px] text-neutral-600">
                Learned via Coursera&apos;s <strong>100% Free Audit Mode</strong> without purchasing a certificate?
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleMarkAudit(selectedCourseForModal)}
                disabled={verifying}
                className="text-xs gap-1.5 border-emerald-300 text-emerald-800 hover:bg-emerald-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Confirm Free Audit Completion & Add Skills</span>
              </Button>
            </div>

            {/* Skills Awarded Notice */}
            <div className="text-[11px] text-neutral-500 flex items-center gap-1.5 pt-1">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Skills awarded upon completion: <strong>{selectedCourseForModal.skillsCovered.join(', ')}</strong>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
