import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { api } from '../services/api';
import { Video, Mic, MicOff, Play, CheckCircle, Sparkles, Clapperboard, Camera, Code2, TrendingUp, Palette, Award, RotateCcw, AlertTriangle, XCircle, Loader2, Info } from 'lucide-react';

export interface EvaluationItem {
  score: number;
  verdict: 'Gibberish / Invalid' | 'Off-Topic' | 'Needs Improvement' | 'Competent' | 'Exemplary';
  isGibberish: boolean;
  feedback: string;
  matchedKeyPoints: string[];
  missingKeyPoints: string[];
  evaluatedBy?: string;
}

interface QuestionSet {
  roleTitle: string;
  domain: string;
  questions: {
    question: string;
    keyPoints: string[];
  }[];
}

const INTERVIEW_DOMAINS: Record<string, QuestionSet> = {
  film: {
    roleTitle: 'Feature Film & OTT Director',
    domain: 'Film Direction & Production',
    questions: [
      {
        question: 'How do you establish creative trust and communicate character subtext to actors during high-intensity dramatic sequences?',
        keyPoints: ['Active listening & psychological safety', 'Focus on emotional objectives vs line delivery', 'Rehearsal protocols & improvisation boundaries'],
      },
      {
        question: 'Walk me through how you plan a multi-camera scene with complex actor blocking: how do you ensure cinematic pacing without breaking spatial continuity?',
        keyPoints: ['180-degree axis rule management', 'Master shot establishment vs close-up coverage', 'Dynamic camera motion synchronized with dramatic beats'],
      },
      {
        question: 'If a producer or studio notes require cutting 20% of an essential emotional scene due to budget constraints, how do you handle this creatively?',
        keyPoints: ['Finding visual metaphors to replace exposition', 'Negotiating key thematic essentials', 'Collaborative problem-solving with producing partners'],
      },
      {
        question: 'How do you collaborate with your cinematographer and sound designer in pre-production to establish a cohesive visual motif?',
        keyPoints: ['Look-books and lighting contrast references', 'Sonic atmospheres and leitmotifs', 'Color palette alignment with production design'],
      },
    ],
  },
  cinematography: {
    roleTitle: 'Director of Photography (Cinematographer)',
    domain: 'Cinematography & Camera Operations',
    questions: [
      {
        question: 'Walk me through how you choose your camera sensor format and prime lens package to achieve a specific atmospheric aesthetic.',
        keyPoints: ['Large-format vs Super 35 depth of field', 'Anamorphic flare characteristics vs spherical sharpness', 'Sensor color response under low-light'],
      },
      {
        question: 'How would you design lighting for a low-key night exterior scene to maintain deep shadow detail without noisy grain or clipping highlights?',
        keyPoints: ['Edge lighting & backlight motivation', 'Bouncing ambient fill into negative space', 'Controlling exposure through false color and waveforms'],
      },
      {
        question: 'Explain your on-set color pipeline and how you work with the DIT and colorist to preserve dynamic range and color contrast.',
        keyPoints: ['ACES / Log color transforms', 'Custom show LUTs created during camera tests', 'Preserving highlight roll-off and skin tone integrity'],
      },
      {
        question: 'How do you coordinate camera movement between handheld, Steadicam, and dolly rigs to serve the director’s emotional beat?',
        keyPoints: ['Translating emotional tension into camera stability', 'Operator communication and rehearsal cues', 'Lens choice affecting perceived velocity'],
      },
    ],
  },
  software: {
    roleTitle: 'Full-Stack Software Engineer',
    domain: 'Software Engineering',
    questions: [
      {
        question: 'Describe your approach to designing a high-throughput, low-latency REST or GraphQL microservice backend.',
        keyPoints: ['Stateless API design and horizontal scalability', 'Database indexing and caching strategies (Redis)', 'Rate limiting and connection pooling'],
      },
      {
        question: 'Explain how you troubleshoot memory leaks or asynchronous concurrency bottlenecks in a Node.js or distributed production service.',
        keyPoints: ['Heap dump analysis and CPU profiling', 'Event loop monitoring and unhandled Promise rejections', 'Database connection leaks'],
      },
      {
        question: 'How do you maintain data consistency across distributed services when transactional boundaries span multiple databases?',
        keyPoints: ['Saga pattern (orchestration vs choreography)', 'Eventual consistency and idempotent consumers', 'Outbox pattern for atomic event publishing'],
      },
      {
        question: 'Tell me about a challenging architectural refactor you executed and how you ensured zero downtime for active users.',
        keyPoints: ['Blue/green or rolling deployments', 'Backwards-compatible API versioning', 'Automated regression and canary testing'],
      },
    ],
  },
  marketing: {
    roleTitle: 'Product Marketing & Growth Manager',
    domain: 'Product Marketing & Growth',
    questions: [
      {
        question: 'How do you evaluate product-market fit and design your primary customer acquisition funnel for a new market rollout?',
        keyPoints: ['Target persona interviews and churn signals', 'Paid vs organic acquisition mix', 'CAC-to-LTV payback period modeling'],
      },
      {
        question: 'Walk me through how you optimize conversion rates and analyze cohort retention curves when scaling paid media campaigns.',
        keyPoints: ['A/B multivariate landing page testing', 'Cohort churn inflection points', 'Attribution modeling across search and social channels'],
      },
      {
        question: 'If user acquisition costs increase by 40% while customer retention drops by 15%, how would you diagnose and rectify the growth bottleneck?',
        keyPoints: ['Segmenting retention by cohort source', 'Auditing product onboarding drop-off', 'Aligning ad creative expectations with in-app value'],
      },
      {
        question: 'How do you structure cross-functional positioning and go-to-market alignment between product, sales, and design teams?',
        keyPoints: ['Competitive differentiation matrix', 'Internal enablement playbooks and demo scripts', 'Shared KPI scorecards across departments'],
      },
    ],
  },
  design: {
    roleTitle: 'Lead Product & UX/UI Designer',
    domain: 'Product Design & User Experience',
    questions: [
      {
        question: 'Walk me through your end-to-end design process when transforming an ambiguous, complex business workflow into an intuitive interface.',
        keyPoints: ['User journey mapping & friction audits', 'Rapid low-fidelity prototyping & usability testing', 'Iterative validation against measurable task completion rates'],
      },
      {
        question: 'How do you establish, document, and govern a scalable design system across multiple web and mobile engineering teams?',
        keyPoints: ['Design tokens (color, typography, elevation, spacing)', 'Component state definitions in Figma and Storybook', 'Versioning governance and cross-functional design review cycles'],
      },
      {
        question: 'Describe a situation where qualitative user feedback directly contradicted stakeholder preferences: how did you navigate and resolve the conflict?',
        keyPoints: ['Presenting recorded usability session data objectively', 'Framing decisions around business metrics and customer retention', 'Collaborative compromise via live usability A/B testing'],
      },
      {
        question: 'How do you advocate for accessibility (WCAG 2.1 AA) and micro-interactions when engineering is constrained on sprint timelines?',
        keyPoints: ['Highlighting business & legal benefits of inclusive design', 'Tokenizing contrast and touch targets in advance', 'Phased delivery: accessible core first, then animations'],
      },
    ],
  },
};

export const StudentMockInterview: React.FC = () => {
  const [activeDomainKey, setActiveDomainKey] = useState<string>('film');
  const [inSession, setInSession] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [evaluating, setEvaluating] = useState(false);
  const [evaluations, setEvaluations] = useState<EvaluationItem[]>([]);
  const [sessionCompleted, setSessionCompleted] = useState(false);

  // Real-Time Speech Recognition State
  const recognitionRef = useRef<any>(null);
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [interimTranscript, setInterimTranscript] = useState('');

  // Live Webcam Self-Preview State
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Gemini Dynamic AI Question Generation State
  const [customQuestionSet, setCustomQuestionSet] = useState<QuestionSet | null>(null);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [customRoleInput, setCustomRoleInput] = useState('');
  const [customLevelInput, setCustomLevelInput] = useState('Mid-Level');
  const [showAiGenBox, setShowAiGenBox] = useState(false);

  useEffect(() => {
    fetchStudentInterest();
  }, []);

  const fetchStudentInterest = async () => {
    try {
      const res = await api.get('/resume');
      const resume = res.data?.data?.resume;
      if (resume) {
        const text = `${resume.fieldOfInterest || ''} ${resume.headline || ''}`.toLowerCase();
        if (text.includes('camera') || text.includes('cinematograph')) {
          setActiveDomainKey('cinematography');
        } else if (text.includes('software') || text.includes('developer') || text.includes('engineer')) {
          setActiveDomainKey('software');
        } else if (text.includes('market') || text.includes('growth')) {
          setActiveDomainKey('marketing');
        } else if (text.includes('design') || text.includes('ui') || text.includes('ux')) {
          setActiveDomainKey('design');
        } else {
          setActiveDomainKey('film');
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const domainData = (activeDomainKey === 'custom' && customQuestionSet)
    ? customQuestionSet
    : (INTERVIEW_DOMAINS[activeDomainKey] || INTERVIEW_DOMAINS.film);
  const questions = domainData.questions;

  const handleGenerateAiQuestions = async () => {
    if (!customRoleInput.trim()) return;
    setGeneratingAI(true);
    try {
      const res = await api.post('/interviews/generate-questions', {
        roleOrDomain: customRoleInput.trim(),
        experienceLevel: customLevelInput,
        count: 4,
      });
      const generated = res.data?.data?.questions;
      if (Array.isArray(generated) && generated.length > 0) {
        setCustomQuestionSet({
          roleTitle: `${customRoleInput.trim()} (${customLevelInput})`,
          domain: customRoleInput.trim(),
          questions: generated.map((g: any) => ({
            question: g.question,
            keyPoints: Array.isArray(g.keyPoints) ? g.keyPoints : ['Technical depth', 'Problem solving', 'Communication'],
          })),
        });
        setActiveDomainKey('custom');
        setShowAiGenBox(false);
        restartSession();
      }
    } catch (err) {
      console.error('Failed to generate AI questions:', err);
    } finally {
      setGeneratingAI(false);
    }
  };

  const evaluateClientFallback = (
    qText: string,
    domain: string,
    keyPoints: string[],
    rawAnswer: string
  ): EvaluationItem => {
    const text = (rawAnswer || '').trim();
    if (!text || text.length < 5) {
      return {
        score: 0,
        verdict: 'Needs Improvement',
        isGibberish: false,
        feedback: 'The response is empty or too short. Real technical interviewers require structured reasoning addressing the prompt.',
        matchedKeyPoints: [],
        missingKeyPoints: keyPoints,
        evaluatedBy: 'RecruitX Assessment Engine',
      };
    }

    const words = text.split(/\s+/).filter((w) => w.length > 0);
    const lower = text.toLowerCase();
    const cleanChars = lower.replace(/[^a-z0-9]/g, '');
    const uniqueChars = new Set(cleanChars).size;

    // Only flag as keyboard smash if extreme repetition of 1-2 chars across long string
    const isObviousKeyboardSmash = cleanChars.length >= 25 && uniqueChars <= 3;

    if (isObviousKeyboardSmash) {
      return {
        score: 0,
        verdict: 'Gibberish / Invalid',
        isGibberish: true,
        feedback:
          'Detected random keyboard smash characters. Real interviewers require meaningful domain-specific reasoning.',
        matchedKeyPoints: [],
        missingKeyPoints: keyPoints,
        evaluatedBy: 'RecruitX Assessment Engine',
      };
    }

    const stopWords = new Set([
      'the', 'is', 'at', 'which', 'on', 'how', 'do', 'you', 'and', 'or', 'in', 'to', 'for', 'of', 'a', 'an',
      'with', 'your', 'from', 'this', 'that', 'these', 'those', 'are', 'was', 'were', 'will', 'would', 'can',
      'could', 'should', 'have', 'has', 'had', 'what', 'when', 'where', 'why', 'who', 'whom', 'their', 'them',
      'they', 'it', 'its', 'as', 'be', 'by', 'about', 'such', 'into', 'than', 'then', 'so', 'if', 'out', 'up',
    ]);

    const questionTokens = qText
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 3 && !stopWords.has(w));

    const matchedKeyPoints: string[] = [];
    const missingKeyPoints: string[] = [];

    for (const kp of keyPoints) {
      const kpTokens = kp
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 3 && !stopWords.has(w));

      let hitCount = 0;
      for (const token of kpTokens) {
        if (lower.includes(token)) {
          hitCount++;
        }
      }
      if (hitCount >= 2 || (kpTokens.length <= 2 && hitCount >= 1)) {
        matchedKeyPoints.push(kp);
      } else {
        missingKeyPoints.push(kp);
      }
    }

    let questionOverlap = 0;
    for (const token of questionTokens) {
      if (lower.includes(token)) {
        questionOverlap++;
      }
    }

    const domainTerms: Record<string, string[]> = {
      film: ['actor', 'scene', 'shot', 'character', 'camera', 'director', 'story', 'emotion', 'script', 'subtext', 'blocking', 'pacing', 'lighting', 'visual'],
      cinematography: ['camera', 'lens', 'sensor', 'exposure', 'lighting', 'shadow', 'color', 'lut', 'aces', 'contrast', 'frame', 'highlight', 'steadicam', 'rig'],
      software: ['api', 'service', 'database', 'latency', 'cache', 'redis', 'scale', 'microservice', 'query', 'async', 'memory', 'leak', 'node', 'event', 'deploy'],
      marketing: ['customer', 'cac', 'ltv', 'funnel', 'growth', 'acquisition', 'kpi', 'metric', 'conversion', 'ad', 'campaign', 'channel', 'churn', 'messaging'],
      design: ['user', 'ux', 'ui', 'figma', 'prototype', 'wireframe', 'token', 'accessibility', 'wcag', 'component', 'research', 'testing', 'journey', 'system'],
    };

    const domainKey = Object.keys(domainTerms).find((k) => domain.toLowerCase().includes(k)) || 'software';
    const activeTerms = domainTerms[domainKey] || [];
    const domainHits = activeTerms.filter((term) => lower.includes(term)).length;

    if (matchedKeyPoints.length === 0 && questionOverlap === 0 && domainHits === 0) {
      return {
        score: 10,
        verdict: 'Off-Topic',
        isGibberish: false,
        feedback: `Your response does not address the question scenario or ${domain} practices. Ensure you directly tackle the specific challenges outlined in the prompt.`,
        matchedKeyPoints: [],
        missingKeyPoints: keyPoints,
      };
    }

    const kpScore = Math.round((matchedKeyPoints.length / Math.max(1, keyPoints.length)) * 55);
    const vocabScore = Math.min(25, domainHits * 6);
    const wordCount = words.length;
    let depthScore = 5;
    if (wordCount >= 70) depthScore = 20;
    else if (wordCount >= 40) depthScore = 15;
    else if (wordCount >= 20) depthScore = 10;

    let totalScore = kpScore + vocabScore + depthScore;
    totalScore = Math.min(96, Math.max(20, totalScore));

    let verdict: EvaluationItem['verdict'] = 'Needs Improvement';
    if (totalScore >= 85) verdict = 'Exemplary';
    else if (totalScore >= 70) verdict = 'Competent';
    else if (totalScore >= 45) verdict = 'Needs Improvement';
    else verdict = 'Off-Topic';

    let feedback = '';
    if (verdict === 'Exemplary') {
      feedback = `Excellent answer! You demonstrated nuanced domain expertise, directly addressing ${matchedKeyPoints.length} core technical criteria with high articulation.`;
    } else if (verdict === 'Competent') {
      feedback = `Strong response covering essential principles (${matchedKeyPoints.join(', ')}). Elaborating further on ${missingKeyPoints[0] || 'trade-offs'} would elevate this to top percentile.`;
    } else if (verdict === 'Needs Improvement') {
      feedback = `Identified fundamental concepts, but missed critical depth. Be sure to address: ${missingKeyPoints.slice(0, 2).join(' and ')}.`;
    } else {
      feedback = `Response lacks technical specifics required for a senior ${domain} interview. Focus on concrete methodologies and expected production standards.`;
    }

    return {
      score: totalScore,
      verdict,
      isGibberish: false,
      feedback,
      matchedKeyPoints,
      missingKeyPoints,
      evaluatedBy: 'RecruitX Assessment Engine',
    };
  };

  const handleNextOrFinish = async () => {
    const activeQ = questions[currentQuestion];
    setEvaluating(true);

    let evalResult: EvaluationItem;

    try {
      const res = await api.post('/interviews/evaluate-mock', {
        question: activeQ.question,
        domain: domainData.domain,
        keyPoints: activeQ.keyPoints,
        answer: userAnswer,
      });
      if (res.data?.data) {
        evalResult = res.data.data;
      } else {
        evalResult = evaluateClientFallback(activeQ.question, domainData.domain, activeQ.keyPoints, userAnswer);
      }
    } catch {
      evalResult = evaluateClientFallback(activeQ.question, domainData.domain, activeQ.keyPoints, userAnswer);
    } finally {
      setEvaluating(false);
    }

    stopListening();
    const updatedEvals = [...evaluations, evalResult];
    setEvaluations(updatedEvals);
    setUserAnswer('');

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      stopCamera();
      setSessionCompleted(true);
    }
  };

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setIsListening(false);
    setInterimTranscript('');
  }, []);

  const stopCamera = useCallback(() => {
    if (cameraStreamRef.current) {
      try {
        cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      } catch {}
      cameraStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  const toggleCamera = useCallback(async () => {
    if (cameraActive) {
      stopCamera();
      return;
    }

    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Webcam access is not supported by your browser environment.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 360 }, facingMode: 'user' },
        audio: false,
      });

      cameraStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
    } catch (err: any) {
      console.error('Camera access error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera access denied. Please grant camera permission in your browser URL bar.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('No webcam video device detected on your machine.');
      } else {
        setCameraError(`Camera error: ${err.message || 'Could not start webcam stream.'}`);
      }
      setCameraActive(false);
    }
  }, [cameraActive, stopCamera]);

  useEffect(() => {
    if (cameraActive && videoRef.current && cameraStreamRef.current) {
      videoRef.current.srcObject = cameraStreamRef.current;
    }
  }, [cameraActive]);

  const toggleSpeechRecognition = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechError(
        'Live speech recognition is not supported in this browser. Please use Google Chrome, Brave, or Microsoft Edge.'
      );
      return;
    }

    if (isListening) {
      stopListening();
      return;
    }

    setSpeechError(null);

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechError(null);
      };

      recognition.onresult = (event: any) => {
        let currentInterim = '';
        let finalTranscripts = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item.isFinal) {
            finalTranscripts += item[0].transcript + ' ';
          } else {
            currentInterim += item[0].transcript;
          }
        }

        if (finalTranscripts) {
          setUserAnswer((prev) =>
            prev.trim() ? `${prev.trim()} ${finalTranscripts.trim()}` : finalTranscripts.trim()
          );
        }
        setInterimTranscript(currentInterim);
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'not-allowed') {
          setSpeechError(
            'Microphone access denied. Please allow microphone permission in browser settings to speak your answers.'
          );
        } else if (event.error === 'no-speech') {
          // ignore silence
        } else {
          setSpeechError(`Speech recognition: ${event.error}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimTranscript('');
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (err: any) {
      console.error('Speech recognition error:', err);
      setSpeechError(err.message || 'Could not access microphone.');
      setIsListening(false);
    }
  }, [isListening, stopListening]);

  useEffect(() => {
    return () => {
      stopListening();
      stopCamera();
    };
  }, [stopListening, stopCamera]);

  const restartSession = () => {
    stopListening();
    stopCamera();
    setInSession(false);
    setCurrentQuestion(0);
    setUserAnswer('');
    setEvaluations([]);
    setSessionCompleted(false);
  };

  const overallScore =
    evaluations.length > 0
      ? Math.round(evaluations.reduce((acc, curr) => acc + curr.score, 0) / evaluations.length)
      : 0;

  const hasGibberishOrZero = evaluations.some((e) => e.isGibberish || e.score === 0);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-neutral-900">AI Mock Technical Interview</h1>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-neutral-900 text-white">
              Domain-Specific
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Simulate realistic placement and studio interviews tailored to your exact career discipline with strict semantic scoring.
          </p>
        </div>

        {/* Domain Selection Tabs (if not mid-session) */}
        {!inSession && (
          <div className="flex flex-wrap items-center gap-1.5">
            {Object.entries(INTERVIEW_DOMAINS).map(([k, v]) => (
              <button
                key={k}
                onClick={() => {
                  setActiveDomainKey(k);
                  restartSession();
                }}
                className={`text-xs px-2.5 py-1.5 rounded-md font-medium transition-colors ${
                  activeDomainKey === k
                    ? 'bg-neutral-900 text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                {v.roleTitle.split(' ')[0]}
              </button>
            ))}
            {customQuestionSet && (
              <button
                onClick={() => {
                  setActiveDomainKey('custom');
                  restartSession();
                }}
                className={`text-xs px-2.5 py-1.5 rounded-md font-medium transition-colors ${
                  activeDomainKey === 'custom'
                    ? 'bg-neutral-900 text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                Custom AI ({customQuestionSet.domain.slice(0, 10)})
              </button>
            )}
            <button
              onClick={() => setShowAiGenBox(!showAiGenBox)}
              className="text-xs px-2.5 py-1.5 rounded-md font-medium border border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3 text-purple-600" />
              Generate Custom AI Role
            </button>
          </div>
        )}
      </div>

      {/* Gemini AI Dynamic Question Generator Box */}
      {showAiGenBox && !inSession && (
        <Card className="p-4 border-purple-200 bg-purple-50/40 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <h3 className="text-xs font-bold text-purple-900">Google Gemini 3.6 Flash Interview Generator</h3>
            </div>
            <span className="text-[10px] uppercase font-bold text-purple-600 bg-purple-100 px-2 py-0.5 rounded">
              Instant AI
            </span>
          </div>
          <p className="text-xs text-neutral-600">
            Generate realistic domain-specific technical & behavioral interview questions tailored to any custom job title or specialty.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input
              type="text"
              placeholder="e.g. Cloud Security Architect, Video Producer, ML Engineer"
              value={customRoleInput}
              onChange={(e) => setCustomRoleInput(e.target.value)}
              className="sm:col-span-2 text-xs p-2.5 rounded-md border border-purple-200 focus:outline-none focus:ring-1 focus:ring-purple-600 bg-white"
            />
            <select
              value={customLevelInput}
              onChange={(e) => setCustomLevelInput(e.target.value)}
              className="text-xs p-2.5 rounded-md border border-purple-200 focus:outline-none focus:ring-1 focus:ring-purple-600 bg-white"
            >
              <option value="Entry-Level / Junior">Entry-Level / Junior</option>
              <option value="Mid-Level">Mid-Level</option>
              <option value="Senior / Lead">Senior / Lead</option>
              <option value="Principal / Director">Principal / Director</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" size="sm" onClick={() => setShowAiGenBox(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleGenerateAiQuestions}
              disabled={generatingAI || !customRoleInput.trim()}
              className="flex items-center gap-1.5 bg-purple-700 hover:bg-purple-800 text-white"
            >
              {generatingAI ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Synthesizing with Gemini 3.6 Flash...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  Generate Mock Interview
                </>
              )}
            </Button>
          </div>
        </Card>
      )}

      {!inSession ? (
        <Card className="p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-neutral-100 border border-neutral-200 flex items-center justify-center mx-auto text-neutral-800">
            <Video className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-neutral-100 text-neutral-700">
              {domainData.domain}
            </span>
            <h2 className="text-lg font-bold text-neutral-900 mt-2">{domainData.roleTitle} Mock Interview</h2>
            <p className="text-xs text-neutral-500 max-w-md mx-auto mt-1">
              4 interactive scenario-based questions designed to evaluate technical depth, artistic decision-making, and communication under pressure. Responses are strictly evaluated against industry criteria.
            </p>
          </div>
          <Button onClick={() => setInSession(true)} className="mx-auto flex items-center gap-2">
            <Play className="w-4 h-4 fill-white" />
            Start Session
          </Button>
        </Card>
      ) : sessionCompleted ? (
        /* Results Report */
        <Card className="p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
            <div className="flex items-center gap-3">
              <div
                className={`p-2.5 rounded-full border ${
                  hasGibberishOrZero
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : overallScore >= 70
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}
              >
                {hasGibberishOrZero ? <AlertTriangle className="w-6 h-6" /> : <Award className="w-6 h-6" />}
              </div>
              <div>
                <h2 className="text-base font-bold text-neutral-900">Session Completed!</h2>
                <p className="text-xs text-neutral-500">{domainData.roleTitle} Simulation Report</p>
              </div>
            </div>
            <div className="text-right">
              <span
                className={`text-2xl font-black ${
                  hasGibberishOrZero ? 'text-red-600' : overallScore >= 70 ? 'text-emerald-600' : 'text-amber-600'
                }`}
              >
                {overallScore}%
              </span>
              <p className="text-[10px] uppercase font-bold text-neutral-400">Readiness Score</p>
            </div>
          </div>

          {/* Gibberish Alert Banner if any response scored 0 */}
          {hasGibberishOrZero && (
            <div className="p-3.5 rounded-lg border border-red-200 bg-red-50 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-red-900">Disqualification Warning: Gibberish / Random Input Flagged</h4>
                <p className="text-[11px] text-red-700 mt-0.5 leading-relaxed">
                  One or more answers were flagged as random keyboard input or gibberish and received <strong>0/100</strong>. In actual production hiring and studio recruitment pipelines, automated screening algorithms immediately reject incoherent responses. Review the feedback breakdown below and retake the session.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <h3 className="text-xs font-bold text-neutral-700 uppercase tracking-wider">Question Breakdown & AI Feedback</h3>
            {questions.map((q, idx) => {
              const ev = evaluations[idx];
              return (
                <div key={idx} className="p-4 rounded-lg border border-neutral-200 bg-neutral-50/50 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-neutral-900">Question {idx + 1}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                          ev?.isGibberish
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : ev?.score >= 85
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : ev?.score >= 70
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : ev?.score >= 40
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {ev?.verdict || 'Evaluated'}
                      </span>
                      {ev?.evaluatedBy && (
                        <span className="text-[10px] text-neutral-600 font-semibold flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-neutral-200">
                          <Sparkles className="w-3 h-3 text-purple-600" />
                          {ev.evaluatedBy}
                        </span>
                      )}
                    </div>
                    <span
                      className={`text-xs font-bold ${
                        ev?.score === 0 ? 'text-red-600 font-extrabold' : 'text-neutral-800'
                      }`}
                    >
                      {ev?.score ?? 0}/100
                    </span>
                  </div>

                  <p className="text-xs text-neutral-700 font-medium">"{q.question}"</p>

                  {/* Feedback Card */}
                  <div
                    className={`p-2.5 rounded-md text-[11px] flex items-start gap-2 ${
                      ev?.isGibberish
                        ? 'bg-red-50 text-red-800 border border-red-200'
                        : ev?.score >= 70
                        ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                        : 'bg-amber-50 text-amber-900 border border-amber-200'
                    }`}
                  >
                    {ev?.isGibberish ? (
                      <XCircle className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    )}
                    <span className="leading-relaxed">{ev?.feedback || 'Evaluated against domain criteria.'}</span>
                  </div>

                  {/* Matched vs Missing Criteria */}
                  <div className="pt-1 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px]">
                    <div className="bg-white rounded p-2.5 border border-neutral-200 space-y-1">
                      <span className="font-bold text-neutral-700 block">Addressed Key Points:</span>
                      {ev?.matchedKeyPoints && ev.matchedKeyPoints.length > 0 ? (
                        <ul className="space-y-1">
                          {ev.matchedKeyPoints.map((kp, kIdx) => (
                            <li key={kIdx} className="text-emerald-700 flex items-center gap-1.5 font-medium">
                              <CheckCircle className="w-3 h-3 text-emerald-600 shrink-0" />
                              <span>{kp}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-neutral-400 italic">None addressed (0 criteria met)</span>
                      )}
                    </div>

                    <div className="bg-white rounded p-2.5 border border-neutral-200 space-y-1">
                      <span className="font-bold text-neutral-700 block">Missing Competencies:</span>
                      {ev?.missingKeyPoints && ev.missingKeyPoints.length > 0 ? (
                        <ul className="space-y-1">
                          {ev.missingKeyPoints.map((kp, kIdx) => (
                            <li key={kIdx} className="text-amber-800 flex items-center gap-1.5">
                              <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                              <span>{kp}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-emerald-700 font-semibold flex items-center gap-1">
                          <CheckCircle className="w-3 h-3 text-emerald-600 shrink-0" /> All expected key criteria covered!
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 flex justify-between">
            <Button variant="secondary" onClick={restartSession} className="flex items-center gap-1.5">
              <RotateCcw className="w-3.5 h-3.5" /> Retake Mock Interview
            </Button>
            <Button onClick={() => setInSession(false)}>Back to Overview</Button>
          </div>
        </Card>
      ) : (
        /* Active Interview Card */
        <Card className="p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 pb-3">
            <span className="text-xs font-semibold text-neutral-500">
              Question {currentQuestion + 1} of {questions.length} • {domainData.roleTitle}
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={toggleCamera}
                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  cameraActive
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700 shadow-xs'
                    : 'bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-50 shadow-xs'
                }`}
              >
                <Camera className={`w-4 h-4 ${cameraActive ? 'text-emerald-600' : 'text-neutral-500'}`} />
                <span>{cameraActive ? 'Webcam On' : 'Enable Webcam'}</span>
              </button>

              <button
                type="button"
                onClick={toggleSpeechRecognition}
                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-2 transition-all ${
                  isListening
                    ? 'bg-rose-50 border-rose-300 text-rose-700 animate-pulse shadow-xs'
                    : 'bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-50 shadow-xs'
                }`}
              >
                {isListening ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping"></span>
                    <Mic className="w-4 h-4 text-rose-600" />
                    <span>Recording Voice... (Click to Pause)</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4 text-neutral-500" />
                    <span>Start Voice Answering (Mic)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Camera Error Banner */}
          {cameraError && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{cameraError}</span>
              </div>
              <button
                type="button"
                onClick={() => setCameraError(null)}
                className="text-amber-700 hover:text-amber-900 font-bold text-xs"
              >
                ✕
              </button>
            </div>
          )}

          {/* Live Webcam Self-Preview */}
          {cameraActive && (
            <div className="relative rounded-xl overflow-hidden bg-neutral-950 border border-neutral-800 shadow-md">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full aspect-video sm:h-56 object-cover scale-x-[-1]"
              />
              <div className="absolute top-3 left-3 flex items-center gap-2 bg-neutral-900/85 backdrop-blur-xs px-2.5 py-1 rounded-full text-[11px] font-semibold text-white border border-neutral-700 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Live Candidate Video Stream</span>
              </div>
              <div className="absolute bottom-2.5 right-3 text-[10px] text-neutral-400 bg-neutral-900/80 px-2 py-0.5 rounded backdrop-blur-xs">
                Self-Preview • Audio is evaluated via speech/text
              </div>
              <button
                type="button"
                onClick={stopCamera}
                className="absolute top-3 right-3 bg-neutral-900/80 hover:bg-neutral-900 text-white/80 hover:text-white px-2 py-1 rounded text-xs border border-neutral-700 transition-colors"
                title="Turn off webcam"
              >
                ✕ Close Camera
              </button>
            </div>
          )}

          {/* Speech Error Banner */}
          {speechError && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{speechError}</span>
              </div>
              <button
                onClick={() => setSpeechError(null)}
                className="text-amber-700 hover:text-amber-900 font-bold"
              >
                ✕
              </button>
            </div>
          )}

          {/* Live Recording Stream Indicator */}
          {isListening && (
            <div className="p-3 rounded-lg bg-rose-50/70 border border-rose-200 text-rose-900 text-xs flex items-center gap-2.5 animate-in fade-in">
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-bounce"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-bounce [animation-delay:0.4s]"></span>
              </div>
              <span className="font-medium">
                {interimTranscript ? `"${interimTranscript}"` : 'Listening to your speech... speak your technical reasoning now.'}
              </span>
            </div>
          )}

          {/* Prompt Question */}
          <div className="bg-neutral-900 text-white rounded-lg p-5 space-y-2">
            <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">Scenario Question</span>
            <h3 className="text-sm font-semibold leading-relaxed">{questions[currentQuestion].question}</h3>
          </div>

          {/* Key Points Hint */}
          <div className="bg-neutral-50 border border-neutral-200 rounded-md p-3">
            <p className="text-[11px] font-bold text-neutral-700 mb-1">Key Evaluation Areas Expected by Interviewers:</p>
            <ul className="text-[11px] text-neutral-500 space-y-0.5 list-disc list-inside">
              {questions[currentQuestion].keyPoints.map((kp, i) => (
                <li key={i}>{kp}</li>
              ))}
            </ul>
          </div>

          {/* Candidate Answer Box */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-neutral-700">Your Response / Talking Points:</label>
              {userAnswer.trim().length > 0 && !evaluating && (
                <button
                  type="button"
                  onClick={() => setUserAnswer('')}
                  className="text-[10px] font-semibold text-neutral-400 hover:text-rose-600 transition-colors"
                >
                  Clear response
                </button>
              )}
            </div>
            <textarea
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              rows={4}
              placeholder="Speak aloud using the mic button above, or type your structured response..."
              disabled={evaluating}
              className="w-full text-xs rounded-md border border-neutral-200 p-3 focus:outline-none focus:ring-1 focus:ring-neutral-900 disabled:bg-neutral-50"
            />
          </div>

          <div className="flex justify-between items-center pt-2">
            <Button variant="secondary" onClick={restartSession} disabled={evaluating}>
              End Session
            </Button>
            <Button onClick={handleNextOrFinish} disabled={evaluating} className="flex items-center gap-1.5">
              {evaluating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Analyzing Technical Depth...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  {currentQuestion < questions.length - 1 ? 'Evaluate & Next Question' : 'Evaluate & Finish'}
                </>
              )}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};
