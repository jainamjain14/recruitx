import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { api } from '../services/api';
import {
  Code2,
  Terminal,
  CheckCircle2,
  XCircle,
  Play,
  RotateCcw,
  Sparkles,
  Award,
  Clock,
  BookOpen,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  Cpu,
  Layers,
  Send,
  HelpCircle,
  FileCode,
} from 'lucide-react';

interface QuizQuestion {
  id: string;
  category: string;
  question: string;
  options: string[];
  difficulty: string;
}

interface QuizReviewItem {
  id: string;
  question: string;
  options: string[];
  selectedIndex: number;
  correctAnswer: number;
  isCorrect: boolean;
  explanation: string;
}

interface CodingChallenge {
  id: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  category: string;
  description: string;
  examples: { input: string; output: string; explanation?: string }[];
  constraints: string[];
  starterCode: {
    javascript: string;
    python: string;
    cpp: string;
  };
  visibleTestCases: { input: any[]; expected: any }[];
}

export const StudentCodingAssessment: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'quiz' | 'coding' | 'history'>('quiz');

  // Quiz State
  const [quizCategory, setQuizCategory] = useState<'dsa' | 'web-dev' | 'python-ai'>('dsa');
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [currentQuizIdx, setCurrentQuizIdx] = useState(0);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizSubmitting, setQuizSubmitting] = useState(false);
  const [quizResult, setQuizResult] = useState<{
    score: number;
    passed: boolean;
    correctCount: number;
    total: number;
    reviewDetails: QuizReviewItem[];
    skillsAwarded: string[];
  } | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(300); // 5 min timer
  const [timerRunning, setTimerRunning] = useState<boolean>(false);

  // Coding Challenge State
  const [challengeId, setChallengeId] = useState<string>('two-sum');
  const [challenge, setChallenge] = useState<CodingChallenge | null>(null);
  const [language, setLanguage] = useState<'javascript' | 'python' | 'cpp'>('javascript');
  const [code, setCode] = useState<string>('');
  const [executing, setExecuting] = useState(false);
  const [testResults, setTestResults] = useState<any[] | null>(null);
  const [execSummary, setExecSummary] = useState<{ allPassed: boolean; score: number; aiFeedback: string; runtime: string } | null>(null);
  const [submittingSolution, setSubmittingSolution] = useState(false);
  const [submitSuccessMsg, setSubmitSuccessMsg] = useState<string | null>(null);

  // History State
  const [history, setHistory] = useState<any[]>([]);
  const [avgScore, setAvgScore] = useState<number>(0);
  const [passedCount, setPassedCount] = useState<number>(0);

  useEffect(() => {
    fetchQuizQuestions(quizCategory);
    fetchChallenge(challengeId);
    fetchHistory();
  }, []);

  // Timer countdown
  useEffect(() => {
    let interval: any = null;
    if (timerRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && timerRunning) {
      setTimerRunning(false);
      handleSubmitQuiz();
    }
    return () => clearInterval(interval);
  }, [timerRunning, timeLeft]);

  const fetchQuizQuestions = async (category: string) => {
    setQuizLoading(true);
    setQuizResult(null);
    setQuizAnswers({});
    setCurrentQuizIdx(0);
    setTimeLeft(300);
    setTimerRunning(false);

    try {
      const res = await api.get(`/assessments/quiz-questions?category=${category}`);
      if (res.data?.data?.questions) {
        setQuizQuestions(res.data.data.questions);
      }
    } catch (err) {
      console.error('Failed to load quiz questions:', err);
    } finally {
      setQuizLoading(false);
    }
  };

  const fetchChallenge = async (id: string) => {
    try {
      const res = await api.get(`/assessments/challenge/${id}`);
      if (res.data?.data?.challenge) {
        const ch = res.data.data.challenge;
        setChallenge(ch);
        setCode(ch.starterCode[language] || '');
        setTestResults(null);
        setExecSummary(null);
        setSubmitSuccessMsg(null);
      }
    } catch (err) {
      console.error('Failed to load challenge:', err);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await api.get('/assessments/history');
      if (res.data?.data) {
        setHistory(res.data.data.history || []);
        setAvgScore(res.data.data.averageScore || 0);
        setPassedCount(res.data.data.passedCount || 0);
      }
    } catch (err) {
      console.error('Failed to load history:', err);
    }
  };

  const handleLanguageChange = (newLang: 'javascript' | 'python' | 'cpp') => {
    setLanguage(newLang);
    if (challenge?.starterCode[newLang]) {
      setCode(challenge.starterCode[newLang]);
    }
  };

  const handleSelectOption = (questionId: string, optionIdx: number) => {
    if (!timerRunning) setTimerRunning(true);
    setQuizAnswers((prev) => ({ ...prev, [questionId]: optionIdx }));
  };

  const handleSubmitQuiz = async () => {
    setQuizSubmitting(true);
    setTimerRunning(false);
    try {
      const res = await api.post('/assessments/quiz-submit', {
        categoryKey: quizCategory,
        answers: quizAnswers,
      });

      if (res.data?.data) {
        setQuizResult(res.data.data);
        fetchHistory();
      }
    } catch (err) {
      console.error('Failed to submit quiz:', err);
    } finally {
      setQuizSubmitting(false);
    }
  };

  const handleRunCode = async () => {
    if (!challenge) return;
    setExecuting(true);
    setTestResults(null);
    setExecSummary(null);
    setSubmitSuccessMsg(null);

    try {
      const res = await api.post('/assessments/run-code', {
        challengeId: challenge.id,
        code,
        language,
      });

      if (res.data?.data) {
        setTestResults(res.data.data.testResults);
        setExecSummary({
          allPassed: res.data.data.allPassed,
          score: res.data.data.score,
          aiFeedback: res.data.data.aiFeedback,
          runtime: res.data.data.runtime,
        });
      }
    } catch (err: any) {
      console.error('Code execution failed:', err);
      setExecSummary({
        allPassed: false,
        score: 0,
        aiFeedback: err.response?.data?.message || 'Execution error encountered. Check syntax.',
        runtime: 'N/A',
      });
    } finally {
      setExecuting(false);
    }
  };

  const handleSubmitSolution = async () => {
    if (!challenge) return;
    setSubmittingSolution(true);
    try {
      const res = await api.post('/assessments/submit-solution', {
        challengeId: challenge.id,
        code,
        language,
        score: execSummary?.score || 100,
        passed: execSummary?.allPassed ?? true,
      });

      if (res.data?.success) {
        setSubmitSuccessMsg('Solution verified and recorded! Skills added to your placement profile.');
        fetchHistory();
      }
    } catch (err) {
      console.error('Failed to submit solution:', err);
    } finally {
      setSubmittingSolution(false);
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const currentQ = quizQuestions[currentQuizIdx];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-neutral-900">Technical Assessment & Coding IDE</h1>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-neutral-900 text-white flex items-center gap-1">
              <Code2 className="w-3 h-3 text-emerald-400" />
              Automated Scoring
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Validate core algorithmic competencies and hands-on coding skills. Your scores directly boost your placement readiness.
          </p>
        </div>

        {/* Mode Navigation Tabs */}
        <div className="flex items-center gap-1.5 bg-neutral-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('quiz')}
            className={`text-xs px-3 py-1.5 rounded-md font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === 'quiz' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Technical Quiz</span>
          </button>
          <button
            onClick={() => setActiveTab('coding')}
            className={`text-xs px-3 py-1.5 rounded-md font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === 'coding' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Coding IDE Sandbox</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`text-xs px-3 py-1.5 rounded-md font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === 'history' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>My Scorecard</span>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: TECHNICAL MCQ QUIZ ASSESSMENT */}
      {/* ============================================================== */}
      {activeTab === 'quiz' && (
        <div className="space-y-6">
          {/* Domain Category Selector */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-neutral-50 p-3.5 rounded-xl border border-neutral-200">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-neutral-500 mr-1">Assessment Track:</span>
              <button
                onClick={() => {
                  setQuizCategory('dsa');
                  fetchQuizQuestions('dsa');
                }}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  quizCategory === 'dsa'
                    ? 'bg-neutral-900 text-white'
                    : 'bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-100'
                }`}
              >
                Data Structures & Algorithms
              </button>
              <button
                onClick={() => {
                  setQuizCategory('web-dev');
                  fetchQuizQuestions('web-dev');
                }}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  quizCategory === 'web-dev'
                    ? 'bg-neutral-900 text-white'
                    : 'bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-100'
                }`}
              >
                Full-Stack Web Development
              </button>
              <button
                onClick={() => {
                  setQuizCategory('python-ai');
                  fetchQuizQuestions('python-ai');
                }}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  quizCategory === 'python-ai'
                    ? 'bg-neutral-900 text-white'
                    : 'bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-100'
                }`}
              >
                Python & AI Architecture
              </button>
            </div>

            {/* Timer Badge */}
            <div className="flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-lg bg-neutral-900 text-white">
              <Clock className="w-3.5 h-3.5 text-amber-300" />
              <span>Time: {formatTimer(timeLeft)}</span>
            </div>
          </div>

          {/* Quiz Review Results (if completed) */}
          {quizResult ? (
            <Card className="p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-3 rounded-full ${
                      quizResult.passed ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                  >
                    {quizResult.passed ? <Award className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-neutral-900">
                      {quizResult.passed ? 'Assessment Passed!' : 'Assessment Completed'}
                    </h2>
                    <p className="text-xs text-neutral-500">
                      You scored {quizResult.correctCount} out of {quizResult.total} questions ({quizResult.score}%)
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className={`text-2xl font-black ${quizResult.passed ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {quizResult.score}%
                  </span>
                  <p className="text-[10px] uppercase font-bold text-neutral-400">
                    {quizResult.passed ? 'Certified' : 'Needs Review'}
                  </p>
                </div>
              </div>

              {/* Skills Awarded Badge */}
              {quizResult.skillsAwarded.length > 0 && (
                <div className="p-3.5 rounded-lg bg-emerald-50/70 border border-emerald-200 flex items-start gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-emerald-900">Verified Technical Skills Added to Profile:</p>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {quizResult.skillsAwarded.map((s) => (
                        <span key={s} className="px-2 py-0.5 rounded text-[11px] font-bold bg-white text-emerald-800 border border-emerald-300">
                          ✓ {s}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Question Review Breakdown */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-neutral-700 uppercase tracking-wider">Detailed Question Analysis</h3>
                {quizResult.reviewDetails.map((item, idx) => (
                  <div
                    key={item.id}
                    className={`p-4 rounded-xl border text-xs space-y-2.5 ${
                      item.isCorrect ? 'bg-emerald-50/20 border-emerald-200' : 'bg-rose-50/20 border-rose-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2">
                        <span className="font-bold text-neutral-500">Q{idx + 1}.</span>
                        <span className="font-semibold text-neutral-900">{item.question}</span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded border shrink-0 ${
                          item.isCorrect
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : 'bg-rose-100 text-rose-800 border-rose-300'
                        }`}
                      >
                        {item.isCorrect ? 'Correct (+20 pts)' : 'Incorrect'}
                      </span>
                    </div>

                    <div className="space-y-1.5 pl-6">
                      {item.options.map((opt, optIdx) => {
                        const isChosen = item.selectedIndex === optIdx;
                        const isActualCorrect = item.correctAnswer === optIdx;

                        return (
                          <div
                            key={optIdx}
                            className={`p-2 rounded text-xs flex items-center justify-between ${
                              isActualCorrect
                                ? 'bg-emerald-100 text-emerald-900 font-semibold'
                                : isChosen && !isActualCorrect
                                ? 'bg-rose-100 text-rose-900 font-semibold line-through'
                                : 'text-neutral-600'
                            }`}
                          >
                            <span>{opt}</span>
                            {isActualCorrect && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 ml-2" />}
                            {isChosen && !isActualCorrect && <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 ml-2" />}
                          </div>
                        );
                      })}
                    </div>

                    {/* Explanation */}
                    <div className="mt-2 p-2.5 rounded bg-neutral-100/70 border border-neutral-200 text-[11px] text-neutral-600 pl-3">
                      <strong className="text-neutral-800">Explanation: </strong>
                      {item.explanation}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-2">
                <Button onClick={() => fetchQuizQuestions(quizCategory)} size="sm" className="gap-1.5">
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Retake Assessment</span>
                </Button>
              </div>
            </Card>
          ) : quizLoading ? (
            <div className="py-16 text-center text-xs text-neutral-500">Loading assessment questions...</div>
          ) : (
            /* Active Question Card */
            currentQ && (
              <Card className="p-6 space-y-6">
                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-neutral-500">
                    <span>
                      Question <strong className="text-neutral-900">{currentQuizIdx + 1}</strong> of {quizQuestions.length}
                    </span>
                    <span className="font-semibold text-neutral-700">{currentQ.difficulty}</span>
                  </div>
                  <div className="w-full h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-neutral-900 rounded-full transition-all duration-300"
                      style={{ width: `${((currentQuizIdx + 1) / quizQuestions.length) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Question Text */}
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-blue-600 tracking-wider">
                    {currentQ.category}
                  </span>
                  <h3 className="text-base font-bold text-neutral-900 leading-snug">
                    {currentQ.question}
                  </h3>
                </div>

                {/* Options List */}
                <div className="space-y-2.5">
                  {currentQ.options.map((opt, idx) => {
                    const isSelected = quizAnswers[currentQ.id] === idx;

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectOption(currentQ.id, idx)}
                        className={`w-full text-left p-3.5 rounded-xl border text-xs transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-neutral-900 text-white border-neutral-900 shadow-sm'
                            : 'bg-white text-neutral-800 border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50'
                        }`}
                      >
                        <span className="font-medium">{opt}</span>
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ml-3 ${
                            isSelected ? 'border-white bg-white' : 'border-neutral-300'
                          }`}
                        >
                          {isSelected && <div className="w-2 h-2 rounded-full bg-neutral-900" />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Question Nav & Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-neutral-100">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentQuizIdx((prev) => Math.max(0, prev - 1))}
                    disabled={currentQuizIdx === 0}
                    className="text-xs"
                  >
                    Previous
                  </Button>

                  <div className="flex items-center gap-1.5">
                    {quizQuestions.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setCurrentQuizIdx(i)}
                        className={`w-7 h-7 rounded-lg text-xs font-bold transition-colors ${
                          currentQuizIdx === i
                            ? 'bg-neutral-900 text-white'
                            : quizAnswers[quizQuestions[i].id] !== undefined
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>

                  {currentQuizIdx < quizQuestions.length - 1 ? (
                    <Button
                      size="sm"
                      onClick={() => setCurrentQuizIdx((prev) => Math.min(quizQuestions.length - 1, prev + 1))}
                      className="text-xs gap-1"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={handleSubmitQuiz}
                      disabled={quizSubmitting}
                      className="text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{quizSubmitting ? 'Evaluating...' : 'Submit & Score'}</span>
                    </Button>
                  )}
                </div>
              </Card>
            )
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: INTERACTIVE CODING IDE & TEST RUNNER */}
      {/* ============================================================== */}
      {activeTab === 'coding' && (
        <div className="space-y-4">
          {/* Challenge Selector */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-neutral-50 p-3 rounded-xl border border-neutral-200">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-neutral-500">Problem:</span>
              <select
                value={challengeId}
                onChange={(e) => {
                  setChallengeId(e.target.value);
                  fetchChallenge(e.target.value);
                }}
                className="text-xs p-1.5 rounded-lg border border-neutral-300 font-bold bg-white text-neutral-900 focus:outline-none"
              >
                <option value="two-sum">Two Sum (Arrays & Hash Map)</option>
                <option value="valid-parentheses">Valid Syntax Parentheses (Stack)</option>
                <option value="max-subarray">Maximum Subarray (Kadane’s DP)</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-neutral-500">Language:</span>
              <select
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value as any)}
                className="text-xs p-1.5 rounded-lg border border-neutral-300 font-semibold bg-white text-neutral-900 focus:outline-none"
              >
                <option value="javascript">JavaScript (ES6)</option>
                <option value="python">Python 3.12</option>
                <option value="cpp">C++ 20</option>
              </select>
            </div>
          </div>

          {/* Split Panel: Description vs IDE */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left Panel: Problem Statement */}
            <Card className="p-5 space-y-4 max-h-[620px] overflow-y-auto">
              {challenge ? (
                <>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                        {challenge.category}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                          challenge.difficulty === 'Easy'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {challenge.difficulty}
                      </span>
                    </div>
                    <h2 className="text-base font-bold text-neutral-900">{challenge.title}</h2>
                  </div>

                  <div className="text-xs text-neutral-700 whitespace-pre-line leading-relaxed">
                    {challenge.description}
                  </div>

                  {/* Examples */}
                  <div className="space-y-2.5">
                    <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">Examples</h4>
                    {challenge.examples.map((ex, idx) => (
                      <div key={idx} className="p-3 rounded-lg bg-neutral-100/70 border border-neutral-200 text-xs space-y-1 font-mono">
                        <div>
                          <strong className="text-neutral-500">Input: </strong>
                          <span className="text-neutral-900">{ex.input}</span>
                        </div>
                        <div>
                          <strong className="text-neutral-500">Output: </strong>
                          <span className="text-emerald-700 font-bold">{ex.output}</span>
                        </div>
                        {ex.explanation && (
                          <div className="text-[11px] font-sans text-neutral-500 pt-0.5">
                            {ex.explanation}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Constraints */}
                  <div className="space-y-1.5">
                    <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">Constraints</h4>
                    <ul className="list-disc pl-4 text-xs text-neutral-600 space-y-0.5 font-mono">
                      {challenge.constraints.map((c, idx) => (
                        <li key={idx}>{c}</li>
                      ))}
                    </ul>
                  </div>
                </>
              ) : (
                <div className="text-xs text-neutral-500 py-10 text-center">Loading challenge...</div>
              )}
            </Card>

            {/* Right Panel: Code Editor & Test Execution Console */}
            <div className="space-y-3 flex flex-col">
              <Card className="p-0 overflow-hidden border-neutral-800 bg-neutral-950 text-white flex-1 flex flex-col">
                {/* Editor Header */}
                <div className="px-4 py-2.5 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-neutral-400">
                    <FileCode className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="font-mono text-[11px]">solution.{language === 'javascript' ? 'js' : language === 'python' ? 'py' : 'cpp'}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => challenge && setCode(challenge.starterCode[language] || '')}
                    className="text-[10px] text-neutral-400 hover:text-white flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset
                  </button>
                </div>

                {/* Editor Area */}
                <textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full h-80 bg-neutral-950 text-neutral-100 font-mono text-xs p-4 focus:outline-none resize-none leading-relaxed border-none"
                  spellCheck={false}
                />

                {/* Execution Action Footer */}
                <div className="p-3 bg-neutral-900 border-t border-neutral-800 flex items-center justify-between gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleRunCode}
                    disabled={executing}
                    className="text-xs gap-1.5 bg-neutral-800 hover:bg-neutral-700 text-white border-neutral-700"
                  >
                    <Play className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{executing ? 'Executing Tests...' : 'Run Test Cases'}</span>
                  </Button>

                  <Button
                    size="sm"
                    onClick={handleSubmitSolution}
                    disabled={submittingSolution}
                    className="text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{submittingSolution ? 'Submitting...' : 'Submit Solution'}</span>
                  </Button>
                </div>
              </Card>

              {/* Execution Console Output */}
              {execSummary && (
                <Card className="p-4 space-y-3 bg-white border-neutral-300">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-neutral-700" />
                      <h4 className="text-xs font-bold text-neutral-900">Execution Output</h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-neutral-500 font-mono">Runtime: {execSummary.runtime}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          execSummary.allPassed ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {execSummary.allPassed ? 'All Test Cases Passed' : 'Test Cases Failed'}
                      </span>
                    </div>
                  </div>

                  {/* AI Review Snippet */}
                  <div className="p-2.5 rounded-lg bg-neutral-50 border border-neutral-200 text-xs text-neutral-700 flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-neutral-900">AI Code Review: </strong>
                      {execSummary.aiFeedback}
                    </span>
                  </div>

                  {/* Test Case Details */}
                  {testResults && (
                    <div className="space-y-1.5">
                      {testResults.map((tc, idx) => (
                        <div
                          key={idx}
                          className={`p-2 rounded text-xs font-mono flex items-center justify-between ${
                            tc.passed ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {tc.passed ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                            <span>Test Case {idx + 1} {tc.isHidden ? '(Hidden)' : ''}</span>
                          </div>
                          <span>{tc.passed ? 'Passed' : 'Failed'}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {submitSuccessMsg && (
                    <div className="p-2.5 rounded bg-emerald-50 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>{submitSuccessMsg}</span>
                    </div>
                  )}
                </Card>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: ASSESSMENT HISTORY & SCORECARD */}
      {/* ============================================================== */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-4">
              <p className="text-2xl font-bold text-neutral-900">{history.length}</p>
              <p className="text-xs text-neutral-500 mt-1">Total Assessments Taken</p>
            </Card>
            <Card className="p-4">
              <p className="text-2xl font-bold text-emerald-600">{passedCount}</p>
              <p className="text-xs text-neutral-500 mt-1">Certifications Passed</p>
            </Card>
            <Card className="p-4">
              <p className="text-2xl font-bold text-neutral-900">{avgScore}%</p>
              <p className="text-xs text-neutral-500 mt-1">Average Technical Score</p>
            </Card>
          </div>

          {/* History List */}
          <Card className="p-0 overflow-hidden">
            <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-neutral-900">Verified Technical Assessment Records</h2>
              <span className="text-xs text-neutral-500">Synced to Job Readiness Score</span>
            </div>

            {history.length === 0 ? (
              <div className="p-8 text-center text-xs text-neutral-400">
                No technical assessments recorded yet. Take a quiz or code challenge to earn certified badges!
              </div>
            ) : (
              <div className="divide-y divide-neutral-100">
                {history.map((item) => (
                  <div key={item._id} className="p-4 flex items-center justify-between text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-neutral-900">{item.title}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                            item.passed
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {item.passed ? 'Passed' : 'Failed'}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-500 mt-0.5">
                        {item.category} • Completed on {new Date(item.completedAt).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-sm font-black text-neutral-900">{item.score}%</span>
                      <p className="text-[10px] text-neutral-400 uppercase">Score</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
};
