import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { api } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { Plus, Trash2, Save, FileText, CheckCircle2, Sparkles, Wand2, Target } from 'lucide-react';

export const StudentResume: React.FC = () => {
  const { updateUser } = useAuth();
  const [headline, setHeadline] = useState('');
  const [summary, setSummary] = useState('');
  const [fieldOfInterest, setFieldOfInterest] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [existingFileName, setExistingFileName] = useState<string>('');
  const [existingUpdatedAt, setExistingUpdatedAt] = useState<string | null>(null);

  // Selected file state for AI parsing
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [aiParsing, setAiParsing] = useState(false);
  const [aiSuccessMessage, setAiSuccessMessage] = useState('');

  useEffect(() => {
    fetchExistingResume();
  }, []);

  const fetchExistingResume = async () => {
    try {
      const res = await api.get('/resume');
      const data = res.data?.data?.resume;
      if (data) {
        if (data.fileName) setExistingFileName(data.fileName);
        if (data.updatedAt) setExistingUpdatedAt(data.updatedAt);
        if (data.headline) setHeadline(data.headline);
        if (data.summary) setSummary(data.summary);
        if (data.fieldOfInterest) setFieldOfInterest(data.fieldOfInterest);
        if (data.skills) setSkills(data.skills);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills([...skills, newSkill.trim()]);
      setNewSkill('');
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setSkills(skills.filter((s) => s !== skillToRemove));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/resume', { headline, summary, fieldOfInterest, skills });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setAiSuccessMessage('');
    }
  };

  const handleAIExtractFromFile = async () => {
    if (!selectedFile) {
      alert('Please choose a PDF resume file first.');
      return;
    }

    setAiParsing(true);
    setAiSuccessMessage('');

    const reader = new FileReader();
    reader.readAsDataURL(selectedFile);

    reader.onload = async () => {
      try {
        const base64String = reader.result as string;
        const res = await api.post('/resume/ai-parse', {
          fileBase64: base64String,
          mimeType: selectedFile.type,
          fileName: selectedFile.name,
        });

        const parsed = res.data?.data?.parsedData || res.data?.data?.resume;
        const returnedUser = res.data?.data?.user;

        if (parsed) {
          if (parsed.headline) setHeadline(parsed.headline);
          if (parsed.summary) setSummary(parsed.summary);
          if (parsed.fieldOfInterest) setFieldOfInterest(parsed.fieldOfInterest);
          if (parsed.skills && parsed.skills.length > 0) {
            setSkills(parsed.skills);
          }
          setAiSuccessMessage(`✨ AI extracted profile data & skills from "${selectedFile.name}"!`);
        }

        // Sync auth context with updated user profile from server
        if (returnedUser) {
          updateUser({
            profession: returnedUser.profession,
            title: returnedUser.title,
            industry: returnedUser.industry,
          });
        }

        // Clear ALL stale roadmap / course / job cache so next page load re-fetches fresh
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (
            key.startsWith('recruitx_roadmap') ||
            key.startsWith('recruitx_courses') ||
            key.startsWith('recruitx_jobs') ||
            key.startsWith('recruitx_skillgap')
          )) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
      } catch (err: any) {
        console.error('AI Parse error:', err);
        alert(err.response?.data?.message || 'AI resume extraction failed. Please try again.');
      } finally {
        setAiParsing(false);
      }
    };

    reader.onerror = () => {
      alert('Failed to read file');
      setAiParsing(false);
    };
  };

  if (loading) {
    return <p className="text-xs text-neutral-400">Loading your profile...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-neutral-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">My Resume & Profile</h1>
          <p className="text-xs text-neutral-500">Manage your profile, skills, and resume information.</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="flex items-center gap-2">
          {saved ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Resume'}
        </Button>
      </div>

      {/* Unified AI Resume Upload & Extraction Interface */}
      <Card className="p-5 border-neutral-300 bg-neutral-50/50 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-neutral-900 font-semibold text-sm">
            <Sparkles className="w-4 h-4 text-neutral-900" />
            <span>Unified Resume Upload & AI Profile Extraction</span>
          </div>
          {existingFileName && !selectedFile && (
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              Active: {existingFileName}
            </span>
          )}
        </div>

        <p className="text-xs text-neutral-600">
          Upload or replace your PDF resume below. RecruitX uses Gemini AI to analyze your resume, auto-populate your verified skills and domain, and attach this genuine PDF to your automated job applications.
        </p>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            className="text-xs text-neutral-600 border border-neutral-200 rounded-md p-2 bg-white flex-1 cursor-pointer"
          />
          <Button
            onClick={handleAIExtractFromFile}
            disabled={aiParsing || !selectedFile}
            className="flex items-center justify-center gap-1.5 whitespace-nowrap"
          >
            <Wand2 className="w-3.5 h-3.5" />
            {aiParsing ? 'Extracting with AI...' : selectedFile ? 'Upload & Extract with AI' : 'Select PDF to Extract'}
          </Button>
        </div>

        {aiSuccessMessage && (
          <p className="text-xs font-semibold text-emerald-700 pt-1">{aiSuccessMessage}</p>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-neutral-600" />
              <h2 className="text-sm font-semibold text-neutral-900">Field of Interest / Domain</h2>
            </div>
            <Input
              value={fieldOfInterest}
              onChange={(e) => setFieldOfInterest(e.target.value)}
              placeholder="e.g. Full Stack Web Development, Artificial Intelligence..."
            />

            <h2 className="text-sm font-semibold text-neutral-900 pt-2">Professional Headline</h2>
            <Input
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="e.g. Full Stack Engineer | React & Node.js"
            />

            <h2 className="text-sm font-semibold text-neutral-900 pt-2">Professional Summary</h2>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={4}
              className="w-full text-xs rounded-md border border-neutral-200 p-3 focus:outline-none focus:ring-1 focus:ring-neutral-900"
              placeholder="Your summary will be populated here by AI or manual input..."
            />
          </Card>

          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-neutral-900">Skills</h2>
              {skills.length > 0 && (
                <button
                  onClick={() => setSkills([])}
                  className="text-xs text-neutral-400 hover:text-red-600 flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" /> Clear All
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <Input
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                placeholder="Add a skill"
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
              />
              <Button onClick={addSkill} variant="secondary">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {skills.length === 0 ? (
              <p className="text-xs text-neutral-400 italic pt-1">No skills added yet. Choose a PDF file above and click AI Extract & Auto-Fill.</p>
            ) : (
              <div className="flex flex-wrap gap-2 pt-2">
                {skills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-neutral-100 border border-neutral-200 text-neutral-800"
                  >
                    {skill}
                    <button onClick={() => removeSkill(skill)} className="text-neutral-400 hover:text-neutral-700">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-5 space-y-3">
            <div className="flex items-center gap-2 text-neutral-900 font-semibold text-sm">
              <FileText className="w-4 h-4 text-neutral-700" />
              <span>Application Readiness</span>
            </div>
            <div className="space-y-2.5 text-xs">
              <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200 space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-neutral-500">Active Resume:</span>
                  <span className="font-semibold text-neutral-800 truncate max-w-[150px]">
                    {selectedFile ? selectedFile.name : (existingFileName || (headline ? 'Resume Profile Active' : 'Not Uploaded'))}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-500">Format:</span>
                  <span className="font-semibold text-emerald-700">PDF Document ✓</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-500">Auto-Apply:</span>
                  <span className="text-emerald-700 font-semibold">Direct Dispatch Ready ✓</span>
                </div>
              </div>
              <p className="text-[11px] text-neutral-500 leading-relaxed">
                This verified resume PDF is automatically attached whenever you click <strong>Apply Automatically</strong>. To replace it, select a new file in the unified upload section above.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
