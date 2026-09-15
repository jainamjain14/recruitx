import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { api } from '../services/api';
import { Zap, CheckCircle2, AlertTriangle, Building2, Sparkles, RefreshCw, ArrowRight, Target, ShieldCheck } from 'lucide-react';

interface SkillGapData {
  targetRole: string;
  matchScore: number;
  acquiredSkills: { name: string; category: string }[];
  missingSkills: { name: string; priority: 'High Impact' | 'Medium Impact' | 'Bonus'; demand: string; estTime: string }[];
  companyRequirements: { company: string; role: string; requiredSkills: string[]; matchRate: number }[];
  aiActionPlan: string[];
}

export const StudentSkillGap: React.FC = () => {
  const [data, setData] = useState<SkillGapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchSkillGap();
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-neutral-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-neutral-900">Skill Gap Analysis</h1>
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
              Compared against active job openings and top company requirements.
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
            <span className="text-[11px] text-neutral-500">From Your Resume</span>
          </div>

          {acquiredSkills.length === 0 ? (
            <p className="text-xs text-neutral-400 italic">No skills extracted yet. Upload your resume in the My Resume tab.</p>
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
            <span className="text-[11px] text-neutral-500">Company Standard</span>
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
    </div>
  );
};
