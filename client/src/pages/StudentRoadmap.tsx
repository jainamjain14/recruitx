import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { api } from '../services/api';
import {
  CheckCircle2,
  Clock,
  Sparkles,
  Clapperboard,
  Camera,
  Code2,
  TrendingUp,
  Palette,
  Lock,
  ArrowRight,
  RotateCcw,
  RefreshCw,
  ExternalLink,
  Award,
  Star,
  ShieldCheck,
  GraduationCap,
  AlertTriangle,
  X,
  BookOpen,
  Building2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface MilestoneItem {
  title: string;
  desc: string;
  actionUrl?: string;
  actionLabel?: string;
}

interface Milestone extends MilestoneItem {
  status: 'completed' | 'in_progress' | 'pending';
}

export interface CourseraCourseItem {
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

const DOMAIN_ROADMAPS: Record<string, { label: string; icon: any; milestones: MilestoneItem[] }> = {
  marketing: {
    label: 'Product Marketing & Growth Track',
    icon: TrendingUp,
    milestones: [
      {
        title: 'Market Research & Audience Persona Mapping',
        desc: 'Define target customer personas, competitive landscape, and value proposition hooks.',
        actionUrl: '/student/resume',
        actionLabel: 'Update Profile & Bio',
      },
      {
        title: 'Performance Marketing & Ad Spend ROI',
        desc: 'Run multi-channel campaign simulations, Google Ads/Meta attribution, and CAC/LTV calculations.',
        actionUrl: '/student/roadmap',
        actionLabel: 'Review Missing Skills',
      },
      {
        title: 'Content & Viral Distribution Strategy',
        desc: 'Architect viral loops, SEO content funnels, and organic brand amplification campaigns.',
        actionUrl: '/student/messages',
        actionLabel: 'Connect with Recruiters',
      },
      {
        title: 'Growth Case Study Presentation',
        desc: 'Synthesize product launch metrics and conversion rate optimization experiments into a deck.',
        actionUrl: '/student/resume',
        actionLabel: 'Upload Case Study & Portfolio',
      },
      {
        title: 'Agency & Enterprise Growth Role Applications',
        desc: 'Pitch growth roadmaps and apply to leading consumer brands, agencies, and tech scale-ups.',
        actionUrl: '/student/jobs',
        actionLabel: 'Browse Matching Jobs',
      },
    ],
  },
  software: {
    label: 'Software Engineering Track',
    icon: Code2,
    milestones: [
      {
        title: 'Core Programming & Data Structures Foundations',
        desc: 'Solidify algorithmic complexity, data structures, and modular architectural design.',
        actionUrl: '/student/resume',
        actionLabel: 'Verify Tech Skills',
      },
      {
        title: 'Production Full-Stack Application & System Design',
        desc: 'Build and deploy scalable, database-backed products with authentication and caching layers.',
        actionUrl: '/student/roadmap',
        actionLabel: 'Analyze Tech Stack Gaps',
      },
      {
        title: 'Technical Screenings & Recruiter Outreach',
        desc: 'Refine technical communication and architectural reasoning for employer discussions.',
        actionUrl: '/student/messages',
        actionLabel: 'Message Recruiters',
      },
      {
        title: 'Clean Architecture Portfolio & GitHub Assembly',
        desc: 'Package deployable projects with comprehensive READMEs and production CI/CD.',
        actionUrl: '/student/resume',
        actionLabel: 'Attach GitHub & Projects',
      },
      {
        title: 'Enterprise & Tech Scale-Up Applications',
        desc: 'Apply directly to verified tech openings matching your verified tech competencies.',
        actionUrl: '/student/jobs',
        actionLabel: 'Explore Tech Jobs',
      },
    ],
  },
  design: {
    label: 'UI/UX & Product Design Track',
    icon: Palette,
    milestones: [
      {
        title: 'Design Thinking & Information Architecture',
        desc: 'Conduct user research interviews, empathy mapping, and low-fidelity wireframing.',
        actionUrl: '/student/resume',
        actionLabel: 'Update Design Profile',
      },
      {
        title: 'Design Systems & Component Architecture',
        desc: 'Build comprehensive tokenized Figma design systems with auto-layout and interactive states.',
        actionUrl: '/student/roadmap',
        actionLabel: 'Review Design Tools Gap',
      },
      {
        title: 'Portfolio Critique & Recruiter Discussions',
        desc: 'Engage with hiring teams to present interactive design prototypes and user journeys.',
        actionUrl: '/student/messages',
        actionLabel: 'Connect with Hiring Teams',
      },
      {
        title: 'End-to-End Product Design Case Study',
        desc: 'Publish a polished case study documenting problem discovery, user journeys, and UX solutions.',
        actionUrl: '/student/resume',
        actionLabel: 'Link Figma / Portfolio',
      },
      {
        title: 'Studio & Tech Product Design Applications',
        desc: 'Submit portfolio case studies to digital product studios, consumer tech companies, and UX agencies.',
        actionUrl: '/student/jobs',
        actionLabel: 'Browse Design Roles',
      },
    ],
  },
  film: {
    label: 'Film Direction & Production Track',
    icon: Clapperboard,
    milestones: [
      {
        title: 'Screenplay & Visual Grammar Treatment',
        desc: 'Craft your 3-act narrative treatment, scene blocking schematics, and directorial statement.',
        actionUrl: '/student/resume',
        actionLabel: 'Update Film Profile',
      },
      {
        title: 'Storyboarding & Camera Framing Plan',
        desc: 'Develop master shot lists, storyboard pivotal dramatic beats, and determine visual motif.',
        actionUrl: '/student/roadmap',
        actionLabel: 'Check Production Skills',
      },
      {
        title: 'Creative Pitch & Studio Communication',
        desc: 'Demonstrate directorial vision, scene blocking leadership, and tension-building skills to studios.',
        actionUrl: '/student/messages',
        actionLabel: 'Pitch to Producers',
      },
      {
        title: 'Director’s Showreel & Pitch Package',
        desc: 'Cut a 90-second director’s reel showcasing cinematic pacing, audio-visual dynamics, and visual tone.',
        actionUrl: '/student/resume',
        actionLabel: 'Add Showreel Link',
      },
      {
        title: 'Studio Pitching & Directorial Applications',
        desc: 'Pitch spec projects and apply to major production studios and OTT production houses.',
        actionUrl: '/student/jobs',
        actionLabel: 'Browse Creative Jobs',
      },
    ],
  },
  cinematography: {
    label: 'Cinematography & Camera Operations Track',
    icon: Camera,
    milestones: [
      {
        title: 'Camera Sensors & Prime Lens Schematics',
        desc: 'Master Arri / RED / FX9 sensor physics, anamorphic vs spherical glass, and optical compression.',
        actionUrl: '/student/resume',
        actionLabel: 'Update Camera Experience',
      },
      {
        title: 'Lighting Schematics & Contrast Ratios',
        desc: 'Execute low-key noir, 3-point dramatic lighting, and soft-box diffusion setups with negative fill.',
        actionUrl: '/student/roadmap',
        actionLabel: 'Check Lighting & Optics Gap',
      },
      {
        title: 'Color Science & Production Outreach',
        desc: 'Engage with production units on ACES pipelines, DaVinci Resolve color grading, and on-set DIT communication.',
        actionUrl: '/student/messages',
        actionLabel: 'Message Production Units',
      },
      {
        title: 'Cinematography Showreel Assembly',
        desc: 'Compile a 60-second DP reel showing diverse lighting conditions, gimbal motion, and depth of field.',
        actionUrl: '/student/resume',
        actionLabel: 'Link DP Reel',
      },
      {
        title: 'Studio & Commercial Production Applications',
        desc: 'Submit camera crew & DP reels to feature film units, commercial houses, and streaming productions.',
        actionUrl: '/student/jobs',
        actionLabel: 'Explore Camera Openings',
      },
    ],
  },
};

export const StudentRoadmap: React.FC = () => {
  const navigate = useNavigate();
  const [activeDomain, setActiveDomain] = useState<string>('software');
  const [customMilestones, setCustomMilestones] = useState<MilestoneItem[] | null>(null);
  const [customTrackTitle, setCustomTrackTitle] = useState<string | null>(null);
  const [completedCount, setCompletedCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [isAiGenerated, setIsAiGenerated] = useState(false);

  // Target Company Selection State
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [customCompanyInput, setCustomCompanyInput] = useState<string>('');
  const [availableCompanies, setAvailableCompanies] = useState<string[]>([
    'Shiv IT',
    'Roy Kapur Films',
    'Google',
    'Microsoft',
    'TCS',
    'Infosys',
    'Amazon',
    'Meta',
    'Accenture',
    'Wipro',
  ]);

  // Coursera Courses Integrated State
  const [courses, setCourses] = useState<CourseraCourseItem[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);

  // Coursera Verification Modal State
  const [selectedCourseForModal, setSelectedCourseForModal] = useState<CourseraCourseItem | null>(null);
  const [certInput, setCertInput] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifySuccess, setVerifySuccess] = useState<string | null>(null);

  const storageKey = selectedCompany
    ? `recruitx_roadmap_progress_${selectedCompany.toLowerCase().replace(/[^a-z0-9]/g, '_')}`
    : `recruitx_roadmap_progress_${activeDomain}`;

  useEffect(() => {
    fetchStudentStatus();
    fetchCourseraCourses();
  }, []);

  // Sync completion count with localStorage whenever target company or domain changes
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved !== null) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 5) {
        setCompletedCount(parsed);
      } else {
        setCompletedCount(0);
      }
    } else {
      setCompletedCount(0);
    }
  }, [selectedCompany, activeDomain, storageKey]);

  const fetchCourseraCourses = async () => {
    setCoursesLoading(true);
    try {
      const res = await api.get('/courses/recommended?pricing=all');
      if (res.data?.data?.courses) {
        setCourses(res.data.data.courses);
      }
    } catch (err) {
      console.error('Failed to fetch Coursera courses for roadmap:', err);
    } finally {
      setCoursesLoading(false);
    }
  };

  const fetchStudentStatus = async () => {
    setLoading(true);
    try {
      const [resRes, appRes, roadmapRes] = await Promise.allSettled([
        api.get('/resume'),
        api.get('/applications'),
        api.get('/resume/roadmap'),
      ]);

      let domainKey = 'software';
      let hasProfile = false;
      let hasApplied = false;

      if (resRes.status === 'fulfilled' && resRes.value.data?.data?.resume) {
        const resume = resRes.value.data.data.resume;
        const interest = `${resume.fieldOfInterest || ''} ${resume.headline || ''}`.toLowerCase();
        if (interest.includes('camera') || interest.includes('cinematograph')) {
          domainKey = 'cinematography';
        } else if (interest.includes('market') || interest.includes('growth')) {
          domainKey = 'marketing';
        } else if (interest.includes('design') || interest.includes('ui') || interest.includes('ux')) {
          domainKey = 'design';
        } else if (interest.includes('film') || interest.includes('director') || interest.includes('movie')) {
          domainKey = 'film';
        } else {
          domainKey = 'software';
        }

        if (resume.headline && (resume.skills?.length || 0) >= 2) {
          hasProfile = true;
        }
      }

      if (appRes.status === 'fulfilled' && (appRes.value.data?.data?.applications?.length || 0) > 0) {
        hasApplied = true;
        const appCompanies = appRes.value.data.data.applications
          .map((a: any) => a.companyName || a.job?.company)
          .filter(Boolean);
        if (appCompanies.length > 0) {
          setAvailableCompanies((prev) => Array.from(new Set([...appCompanies, ...prev])));
        }
      }

      setActiveDomain(domainKey);

      // Check if backend returned an AI generated roadmap
      if (roadmapRes.status === 'fulfilled' && roadmapRes.value.data?.data?.roadmap) {
        const rData = roadmapRes.value.data.data.roadmap;
        if (Array.isArray(rData.milestones) && rData.milestones.length === 5) {
          setCustomMilestones(rData.milestones);
          setCustomTrackTitle(rData.trackTitle || null);
          setIsAiGenerated(true);
        }
      }

      const savedCount = localStorage.getItem(`recruitx_roadmap_progress_${domainKey}`);
      if (savedCount !== null) {
        setCompletedCount(Math.min(5, Math.max(0, parseInt(savedCount, 10) || 0)));
      } else {
        setCompletedCount(0);
      }
    } catch (err) {
      console.error('Failed to load roadmap status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateWithAI = async () => {
    setGeneratingAI(true);
    try {
      const res = await api.get('/resume/roadmap');
      if (res.data?.data?.roadmap) {
        const rData = res.data.data.roadmap;
        if (Array.isArray(rData.milestones) && rData.milestones.length === 5) {
          setCustomMilestones(rData.milestones);
          setCustomTrackTitle(rData.trackTitle || null);
          setIsAiGenerated(true);
        }
      }
    } catch (err) {
      console.error('Failed to generate AI roadmap:', err);
    } finally {
      setGeneratingAI(false);
    }
  };

  const generateMilestonesForCompany = (company: string): MilestoneItem[] => {
    const key = company.toLowerCase().replace(/\s+/g, '');

    // Google
    if (key.includes('google')) return [
      { title: 'Data Structures & Algorithms Mastery', desc: 'Master arrays, trees, graphs, dynamic programming, and greedy algorithms to crack Google\'s rigorous Leetcode-style coding rounds. Aim for 200+ problems.', actionUrl: '/student/resume', actionLabel: 'Add DSA Skills' },
      { title: 'System Design & Scalability (Google Scale)', desc: 'Study distributed systems, consistent hashing, load balancing, Bigtable, Spanner, MapReduce, and Pub/Sub. Practice designing Search, YouTube, Gmail at scale.', actionUrl: '/student/roadmap', actionLabel: 'View Courses' },
      { title: 'Google-Style Coding Interview Prep', desc: 'Practice 4 rounds of coding interviews: 2 technical coding, 1 system design, 1 behavioral ("Googleyness"). Mock interview with structured STAR answers.', actionUrl: '/student/messages', actionLabel: 'Schedule Mock' },
      { title: 'Open Source & Portfolio Projects', desc: 'Contribute to Google-backed open source (Android, TensorFlow, Kubernetes, Angular). Build a portfolio of 3+ deployable projects with clean code and documentation.', actionUrl: '/student/resume', actionLabel: 'Update Portfolio' },
      { title: 'Google Hiring Process & Offer Acceptance', desc: 'Submit application via Google Careers, complete the phone screen, on-site loop (4-5 rounds), and receive offer letter from Google Recruitment team.', actionUrl: '/student/applications', actionLabel: 'View Applications' },
    ];

    // Microsoft
    if (key.includes('microsoft')) return [
      { title: 'Core CS Fundamentals & OOP Principles', desc: 'Solidify Object-Oriented Programming (C#, Java, or Python), SOLID principles, design patterns (Factory, Observer, Singleton), and data structures fundamentals.', actionUrl: '/student/resume', actionLabel: 'Add CS Skills' },
      { title: 'Azure Cloud & DevOps Certification', desc: 'Earn AZ-900 (Azure Fundamentals) or AZ-204 (Azure Developer). Study cloud services, microservices architecture, CI/CD pipelines, and DevOps with GitHub Actions.', actionUrl: '/student/roadmap', actionLabel: 'View Azure Courses' },
      { title: 'Coding Round Preparation (LeetCode + HackerRank)', desc: 'Practice Microsoft\'s OA (Online Assessment): arrays, strings, trees, BFS/DFS, and two-pointer problems. Microsoft typically asks 2 medium Leetcode-style questions.', actionUrl: '/student/messages', actionLabel: 'Schedule Mock' },
      { title: '.NET / Full Stack Development Project', desc: 'Build a full-stack web application using ASP.NET Core, React/Angular, SQL Server, and Azure deployment. Focus on clean architecture, unit testing, and CI/CD setup.', actionUrl: '/student/resume', actionLabel: 'Update Portfolio' },
      { title: 'Microsoft Interview Loop & Offer', desc: 'Complete Microsoft\'s hiring loop: OA → Phone Screen → 3-4 Technical Rounds (coding + design) → HR Discussion. Receive and accept offer via Microsoft Careers portal.', actionUrl: '/student/applications', actionLabel: 'View Applications' },
    ];

    // Amazon
    if (key.includes('amazon')) return [
      { title: 'Amazon Leadership Principles (LPs) Mastery', desc: 'Study all 16 Amazon Leadership Principles deeply. Prepare 3 STAR stories per LP. Amazon\'s behavioral rounds are as critical as coding — each interviewer covers 2 LPs.', actionUrl: '/student/resume', actionLabel: 'Update Profile' },
      { title: 'Coding & Problem Solving (OA Focus)', desc: 'Crack Amazon\'s Online Assessment: 2 coding questions (Medium-Hard LeetCode) + Work Simulation. Practice arrays, hash maps, sliding window, and graph traversals.', actionUrl: '/student/roadmap', actionLabel: 'View Courses' },
      { title: 'AWS Cloud Architecture Knowledge', desc: 'Learn core AWS services: EC2, S3, Lambda, DynamoDB, SQS/SNS, API Gateway. Understand distributed systems, eventual consistency, and event-driven architecture.', actionUrl: '/student/messages', actionLabel: 'Schedule Mock' },
      { title: 'E-Commerce & Scalable System Design', desc: 'Practice designing Amazon-scale systems: product catalog, shopping cart, order management, recommendation engine, and real-time delivery tracking.', actionUrl: '/student/resume', actionLabel: 'Update Portfolio' },
      { title: 'Amazon Virtual Loop & Offer Acceptance', desc: 'Complete 4-5 virtual interview rounds (2 coding + 1 system design + 2 behavioral). Receive offer from Amazon Recruiting — negotiate total compensation (base + RSUs + sign-on).', actionUrl: '/student/applications', actionLabel: 'View Applications' },
    ];

    // TCS
    if (key.includes('tcs')) return [
      { title: 'TCS NQT (National Qualifier Test) Preparation', desc: 'Clear TCS NQT: Verbal Ability, Reasoning Ability, Numerical Ability, Programming Logic, and Coding rounds. Score 70%+ in all sections to qualify for interview.', actionUrl: '/student/resume', actionLabel: 'Update Profile' },
      { title: 'Core Java / Python Programming Proficiency', desc: 'Master Java or Python fundamentals — OOP, Collections, Exception Handling, JDBC. TCS interviews test core programming, not competitive DSA. Build 2-3 projects.', actionUrl: '/student/roadmap', actionLabel: 'View Java Courses' },
      { title: 'Database & SQL Skills (Oracle/MySQL)', desc: 'Study SQL queries (joins, aggregations, subqueries), database normalization, stored procedures, and triggers. TCS heavily uses Oracle DB in their projects.', actionUrl: '/student/messages', actionLabel: 'Schedule Mock' },
      { title: 'Communication & MR (Management Round) Prep', desc: 'Prepare for TCS Technical + HR rounds: explain projects, career goals, and situational questions. Practice "Tell me about yourself" and project explanations clearly.', actionUrl: '/student/resume', actionLabel: 'Update Portfolio' },
      { title: 'TCS Campus Drive & Digital / Prime Selection', desc: 'Appear for TCS Campus Drive or TCS Smart Hiring. Qualify Digital/Prime/Ninja role based on scores. Receive offer letter and complete joining formalities.', actionUrl: '/student/applications', actionLabel: 'View Applications' },
    ];

    // Infosys
    if (key.includes('infosys')) return [
      { title: 'Infosys InfyTQ & HackWithInfy Preparation', desc: 'Register on InfyTQ platform. Complete Infosys courses in Java, Python, and data structures. Score 65%+ to get shortlisted for HackWithInfy coding competition.', actionUrl: '/student/resume', actionLabel: 'Update Profile' },
      { title: 'Programming & Aptitude Test (PseudoCode + Coding)', desc: 'Clear Infosys Online Test: Pseudocode questions, Data Interpretation, Logical Reasoning, and 2 coding problems. Practice HackerRank and Infosys sample papers.', actionUrl: '/student/roadmap', actionLabel: 'View Courses' },
      { title: 'Java Full Stack or Python Track Certification', desc: 'Complete Infosys Springboard Java Full Stack certification or Python Developer track. Infosys trains selected candidates in Spring Boot, React, and Microservices.', actionUrl: '/student/messages', actionLabel: 'Schedule Mock' },
      { title: 'Communication Skills & HR Round Readiness', desc: 'Infosys evaluates English fluency heavily. Practice GD (Group Discussion) topics, situational judgment, and "Why Infosys?" question with concrete career alignment answers.', actionUrl: '/student/resume', actionLabel: 'Update Portfolio' },
      { title: 'Infosys Campus Offer & Mysore Training', desc: 'Accept Infosys offer, complete documentation, and prepare for the Mysore Foundation Training Program (6 weeks). Map to a stream (Java/Python/Testing/Mainframe) based on assessment.', actionUrl: '/student/applications', actionLabel: 'View Applications' },
    ];

    // Meta / Facebook
    if (key.includes('meta') || key.includes('facebook')) return [
      { title: 'Competitive Programming & LeetCode Grind', desc: 'Solve 300+ LeetCode problems — focus on Graph algorithms, Dynamic Programming, Binary Search, and Sliding Window. Meta\'s coding bar is very high (Hard-level problems common).', actionUrl: '/student/resume', actionLabel: 'Add CP Skills' },
      { title: 'System Design for Social Scale', desc: 'Practice designing Facebook News Feed, Instagram feed ranking, WhatsApp messaging, Facebook Messenger, and Ads auction system. Study consistency, partitioning, and caching.', actionUrl: '/student/roadmap', actionLabel: 'View Courses' },
      { title: 'React & Frontend Engineering Excellence', desc: 'Master React (Meta\'s own framework), JavaScript runtime, V8 internals, CSS performance, and Web accessibility. Build a production-quality frontend application.', actionUrl: '/student/messages', actionLabel: 'Schedule Mock' },
      { title: 'Behavioral Rounds & Culture Fit (Move Fast)', desc: 'Prepare for Meta\'s "Move Fast" culture. Practice conflict resolution, failure scenarios, cross-functional collaboration, and innovation examples. Meta cares deeply about impact.', actionUrl: '/student/resume', actionLabel: 'Update Portfolio' },
      { title: 'Meta Hiring Loop & Offer Negotiation', desc: 'Complete Meta\'s loop: 2 coding + 1 system design + 2 behavioral rounds. Meta offers equity-heavy packages — negotiate base salary, RSUs, and signing bonus with recruiter.', actionUrl: '/student/applications', actionLabel: 'View Applications' },
    ];

    // Wipro
    if (key.includes('wipro')) return [
      { title: 'Wipro NLTH (National Level Talent Hunt) Prep', desc: 'Prepare for Wipro\'s online test: Aptitude, Logical, Verbal, Essay Writing, and Coding rounds. Score above cutoff in all sections to clear to the interview stage.', actionUrl: '/student/resume', actionLabel: 'Update Profile' },
      { title: 'Core Programming & IT Fundamentals', desc: 'Strengthen Java/Python/C++ basics, DBMS, OS, Computer Networks, and Software Engineering concepts. Wipro technical interviews test fundamentals more than advanced DSA.', actionUrl: '/student/roadmap', actionLabel: 'View Courses' },
      { title: 'Project Presentation & Technical Interview Prep', desc: 'Prepare to explain your final year project clearly in 5 minutes — tech stack, challenges, architecture, and your individual contribution. Wipro gives weight to project experience.', actionUrl: '/student/messages', actionLabel: 'Schedule Mock' },
      { title: 'Communication Skills & HR Readiness', desc: 'Practice HR round questions: strengths/weaknesses, relocation readiness, career goals, and team scenarios. Wipro places emphasis on communication and adaptability.', actionUrl: '/student/resume', actionLabel: 'Update Portfolio' },
      { title: 'Wipro Offer & Velocity/Wilp Training', desc: 'Accept Wipro offer and complete documentation. Attend WILP (Work Integrated Learning Program) or Velocity training. Get allocated to a project/account based on skills.', actionUrl: '/student/applications', actionLabel: 'View Applications' },
    ];

    // Accenture
    if (key.includes('accenture')) return [
      { title: 'Accenture Cognitive & Technical Assessment', desc: 'Clear Accenture\'s 3-section online assessment: Cognitive Ability, Technical (IT fundamentals), and Coding Test. Score 70%+ in all sections — no negative marking.', actionUrl: '/student/resume', actionLabel: 'Update Profile' },
      { title: 'SAP / Salesforce / Cloud Skills Certification', desc: 'Get certified in SAP Fundamentals, Salesforce Admin, or AWS Cloud Practitioner. Accenture heavily places graduates in ERP, CRM, and Cloud consulting projects.', actionUrl: '/student/roadmap', actionLabel: 'View Courses' },
      { title: 'Technical Interview & Communication Round', desc: 'Prepare for Accenture\'s Technical Interview: explain your project, basic coding questions (sorting, searching), and IT concepts. Practice clear and structured communication.', actionUrl: '/student/messages', actionLabel: 'Schedule Mock' },
      { title: 'HR Round & Digital Fluency Preparation', desc: 'Prepare HR questions: adaptability, remote work, diversity stories. Accenture tests "Digital Fluency" — awareness of AI/ML trends, blockchain, and metaverse concepts.', actionUrl: '/student/resume', actionLabel: 'Update Portfolio' },
      { title: 'Accenture Offer & Role Allocation', desc: 'Receive Accenture offer letter (ASE role or Consulting Analyst). Complete documentation, background verification, and 3-month foundation training at Accenture Solutions Pvt. Ltd.', actionUrl: '/student/applications', actionLabel: 'View Applications' },
    ];

    // Roy Kapur Films
    if (key.includes('roykapur') || key.includes('roy kapur')) return [
      { title: 'Film Industry Fundamentals & Portfolio', desc: 'Build a strong creative portfolio: screenwriting samples, short films, production stills, or editing reels. Roy Kapur Films evaluates creative output above academic qualifications.', actionUrl: '/student/resume', actionLabel: 'Update Portfolio' },
      { title: 'Scriptwriting & Storytelling Certification', desc: 'Complete coursework in screenplay writing, narrative structure, and story development. Practice writing 10-page short film scripts and feature film treatments.', actionUrl: '/student/roadmap', actionLabel: 'View Courses' },
      { title: 'Film Production Knowledge & Role Clarity', desc: 'Study pre-production, production, and post-production workflows. Identify your role: Director\'s Assistant, Production Coordinator, Content Researcher, or Marketing & PR.', actionUrl: '/student/messages', actionLabel: 'Schedule Mock' },
      { title: 'Digital Marketing & Film Promotions', desc: 'Learn film marketing strategies, OTT platform content distribution, social media campaigns for film releases, trailer marketing, and influencer collaborations in Bollywood.', actionUrl: '/student/resume', actionLabel: 'Update Portfolio' },
      { title: 'Roy Kapur Films Interview & Internship Offer', desc: 'Submit creative portfolio and cover letter tailored to Roy Kapur Films\' upcoming projects. Attend creative interview, pitching sessions, and receive internship or placement offer.', actionUrl: '/student/applications', actionLabel: 'View Applications' },
    ];

    // Elance Group
    if (key.includes('elance')) return [
      { title: 'Freelance & Digital Services Portfolio', desc: 'Build a strong portfolio of digital work: web development projects, graphic design samples, content writing pieces, or digital marketing case studies relevant to Elance clients.', actionUrl: '/student/resume', actionLabel: 'Update Portfolio' },
      { title: 'Client Communication & Project Management', desc: 'Complete courses in client communication, proposal writing, project scoping, and remote collaboration tools (Slack, Trello, Asana). Elance values strong client management skills.', actionUrl: '/student/roadmap', actionLabel: 'View Courses' },
      { title: 'Specialization Track (Dev/Design/Content/Marketing)', desc: 'Choose your specialization and earn a relevant certification: Web Development (React/Node), UI/UX Design (Figma), SEO & Content, or Digital Marketing (Google Ads, Meta Ads).', actionUrl: '/student/messages', actionLabel: 'Schedule Mock' },
      { title: 'Live Project Execution & Client Testimonials', desc: 'Complete 2-3 live freelance projects, collect client testimonials, and build measurable case studies showing business impact. Elance Group values proven delivery track records.', actionUrl: '/student/resume', actionLabel: 'Update Portfolio' },
      { title: 'Elance Group Interview & Talent Onboarding', desc: 'Apply through Elance Group\'s recruitment portal, present your portfolio, complete a skills test relevant to your track, and receive placement confirmation with project assignment.', actionUrl: '/student/applications', actionLabel: 'View Applications' },
    ];

    // Shiv IT
    if (key.includes('shivit') || key.includes('shiv it')) return [
      { title: 'Core Web Development & IT Stack Proficiency', desc: 'Master HTML, CSS, JavaScript, and at least one backend framework (Node.js, PHP, or .NET). Shiv IT Solutions focuses on full-stack web development and enterprise software delivery.', actionUrl: '/student/resume', actionLabel: 'Add Tech Skills' },
      { title: 'Database Design & Backend APIs', desc: 'Build proficiency in MySQL/PostgreSQL, REST API design, authentication flows (JWT/OAuth), and server-side logic. Practice building CRUD applications end-to-end.', actionUrl: '/student/roadmap', actionLabel: 'View Courses' },
      { title: 'Project-Based Interview Preparation', desc: 'Prepare to demonstrate a live project during the interview. Shiv IT gives practical coding exercises. Practice debugging, code review readiness, and explaining architectural decisions.', actionUrl: '/student/messages', actionLabel: 'Schedule Mock' },
      { title: 'Team Collaboration & Version Control Skills', desc: 'Get comfortable with Git, GitHub workflows (branching, PRs, code reviews), and agile project workflows. Shiv IT works in small agile teams — collaborative skills are essential.', actionUrl: '/student/resume', actionLabel: 'Update Portfolio' },
      { title: 'Shiv IT Solutions Offer & Onboarding', desc: 'Clear the technical round (live coding task + project discussion) and HR round. Receive offer letter, complete documentation, and get assigned to a live client project on joining.', actionUrl: '/student/applications', actionLabel: 'View Applications' },
    ];

    // HAWKSTAR
    if (key.includes('hawkstar')) return [
      { title: 'Media Production & Content Creation Portfolio', desc: 'Build a portfolio of media projects: video production, photography, graphic design, or content writing. HAWKSTAR MEDIA evaluates creative talent first and academic scores second.', actionUrl: '/student/resume', actionLabel: 'Update Portfolio' },
      { title: 'Digital Media Tools & Software Proficiency', desc: 'Learn Adobe Creative Suite (Premiere Pro, After Effects, Photoshop, Illustrator), Canva Pro, and DaVinci Resolve. Obtain at least one Adobe certification for credibility.', actionUrl: '/student/roadmap', actionLabel: 'View Courses' },
      { title: 'Social Media Strategy & Content Marketing', desc: 'Study content strategy, Instagram/YouTube algorithm optimization, influencer marketing, and brand storytelling. Practice creating viral content briefs and social media calendars.', actionUrl: '/student/messages', actionLabel: 'Schedule Mock' },
      { title: 'Live Campaign Execution & Analytics', desc: 'Run a real social media campaign (even personal/college-level) and document metrics: reach, engagement rate, CTR, and conversions. HAWKSTAR values data-backed creativity.', actionUrl: '/student/resume', actionLabel: 'Update Portfolio' },
      { title: 'HAWKSTAR MEDIA Interview & Creative Role Offer', desc: 'Submit your creative reel/portfolio, attend a creative brief presentation round, and receive placement offer for Content Creator, Video Editor, or Social Media Manager role.', actionUrl: '/student/applications', actionLabel: 'View Applications' },
    ];

    // Default — generic but still directional
    return [
      {
        title: `Research ${company}'s Hiring Process & Requirements`,
        desc: `Study ${company}'s official careers page, Glassdoor interview reviews, and LinkedIn job postings to understand exact skill requirements, interview rounds, and assessment formats.`,
        actionUrl: '/student/resume',
        actionLabel: 'Update Profile',
      },
      {
        title: `Build Required Technical Skills for ${company}`,
        desc: `Identify skill gaps between your current profile and ${company}'s job requirements. Complete targeted Coursera certifications and projects to fill those gaps with proof.`,
        actionUrl: '/student/roadmap',
        actionLabel: 'View Courses',
      },
      {
        title: `Portfolio & Project Alignment for ${company}`,
        desc: `Build or update 2-3 projects that directly reflect ${company}'s domain and product focus. Include live deployment links, GitHub repos, and measurable impact metrics in your resume.`,
        actionUrl: '/student/resume',
        actionLabel: 'Update Portfolio',
      },
      {
        title: `Mock Interviews & Assessment Practice for ${company}`,
        desc: `Practice technical and behavioral interview questions specific to ${company}'s hiring rubric. Use AI mock interview, peer practice, and coding platforms to sharpen your performance.`,
        actionUrl: '/student/messages',
        actionLabel: 'Schedule Mock Interview',
      },
      {
        title: `Apply & Complete ${company}'s Hiring Process`,
        desc: `Submit your verified application through ${company}'s official careers portal or via RecruitX campus placements. Track interview rounds, collect feedback, and respond promptly to offers.`,
        actionUrl: '/student/applications',
        actionLabel: 'View Applications',
      },
    ];
  };

  const handleSelectCompany = (comp: string) => {
    const trimmed = comp.trim();
    if (!trimmed) return;
    setSelectedCompany(trimmed);
    const key = `recruitx_roadmap_progress_${trimmed.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
    const saved = localStorage.getItem(key);
    if (saved !== null) {
      setCompletedCount(Math.min(5, Math.max(0, parseInt(saved, 10) || 0)));
    } else {
      setCompletedCount(0);
      localStorage.setItem(key, '0');
    }
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
        await fetchCourseraCourses();
        setTimeout(() => {
          closeVerifyModal();
        }, 1600);
      } else {
        setVerifyError(res.data?.message || 'Verification failed. Please check the URL.');
      }
    } catch (err: any) {
      setVerifyError(err.response?.data?.message || err.message || 'Verification failed.');
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
        await fetchCourseraCourses();
        setTimeout(() => {
          closeVerifyModal();
        }, 1400);
      }
    } catch (err: any) {
      setVerifyError(err.response?.data?.message || err.message || 'Failed to mark course completed.');
    } finally {
      setVerifying(false);
    }
  };

  const activeMilestones: MilestoneItem[] = selectedCompany
    ? generateMilestonesForCompany(selectedCompany)
    : customMilestones && isAiGenerated
    ? customMilestones
    : (DOMAIN_ROADMAPS[activeDomain] || DOMAIN_ROADMAPS.software).milestones;

  const currentTrackLabel = selectedCompany
    ? `${selectedCompany} Placement Preparation Track`
    : customTrackTitle && isAiGenerated
    ? customTrackTitle
    : (DOMAIN_ROADMAPS[activeDomain] || DOMAIN_ROADMAPS.software).label;

  const DomainIcon = selectedCompany
    ? Building2
    : (DOMAIN_ROADMAPS[activeDomain] || DOMAIN_ROADMAPS.software).icon;

  const milestones: Milestone[] = activeMilestones.map((m, idx) => {
    let status: 'completed' | 'in_progress' | 'pending';
    if (idx < completedCount) {
      status = 'completed';
    } else if (idx === completedCount) {
      status = 'in_progress';
    } else {
      status = 'pending';
    }
    return { ...m, status };
  });

  const markCurrentComplete = () => {
    const stepCourses = getCoursesForStep(completedCount);
    const hasVerifiedCourse = stepCourses.some((c) => c.isCompleted);

    // If this milestone has courses and none have been verified, block completion!
    if (stepCourses.length > 0 && !hasVerifiedCourse) {
      alert(
        `⚠️ Certificate Verification Required:\n\nPlease complete or authenticate at least one Coursera certificate for Step ${completedCount + 1} by clicking "Verify / Complete" before marking this milestone complete.`
      );
      if (stepCourses[0]) {
        openVerifyModal(stepCourses[0]);
      }
      return;
    }

    if (completedCount < 5) {
      const next = completedCount + 1;
      setCompletedCount(next);
      localStorage.setItem(storageKey, String(next));
    }
  };

  const rollbackStep = () => {
    if (completedCount > 0) {
      const prev = completedCount - 1;
      setCompletedCount(prev);
      localStorage.setItem(storageKey, String(prev));
    }
  };

  const resetAll = () => {
    setCompletedCount(0);
    localStorage.setItem(storageKey, '0');
  };

  const progressPercent = Math.round((completedCount / 5) * 100);

  /**
   * Intelligently assign Coursera courses to each milestone step
   */
  const getCoursesForStep = (stepIdx: number): CourseraCourseItem[] => {
    if (!courses || courses.length === 0) return [];
    // Distribute available courses evenly across the 5 steps or map by index
    const perStep = Math.max(1, Math.ceil(courses.length / 5));
    const start = (stepIdx * perStep) % courses.length;
    return courses.slice(start, start + 2);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-neutral-900">Career & Placement Roadmap</h1>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-600 text-white flex items-center gap-1">
              <GraduationCap className="w-3 h-3" />
              Coursera Integrated
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            {selectedCompany
              ? `Personalized placement roadmap and Coursera skill milestones for ${selectedCompany}.`
              : 'Select a target hiring company to generate its specific placement milestones.'}
          </p>
        </div>

        {selectedCompany && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedCompany(null);
                setCustomCompanyInput('');
              }}
              className="text-xs gap-1.5 h-8 border-neutral-300 hover:bg-neutral-100"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Change Target Company</span>
            </Button>
          </div>
        )}
      </div>

      {/* Target Company Selector (shown when no company is selected) */}
      {!selectedCompany ? (
        <Card className="p-8 text-center space-y-6 max-w-2xl mx-auto border-neutral-200 shadow-sm">
          <div className="w-14 h-14 bg-purple-50 text-purple-700 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <Building2 className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-lg font-bold text-neutral-900">Select a Target Company</h2>
            <p className="text-xs text-neutral-500 max-w-md mx-auto leading-relaxed">
              Placement preparation milestones and Coursera course requirements are tailored to each hiring organization. Choose a company to view its preparation roadmap.
            </p>
          </div>

          {/* Quick Select Buttons */}
          <div className="space-y-2 text-left">
            <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block">
              Active &amp; Verified Campus Recruiters:
            </label>
            <div className="flex flex-wrap gap-2">
              {availableCompanies.map((comp) => (
                <button
                  key={comp}
                  type="button"
                  onClick={() => handleSelectCompany(comp)}
                  className="text-xs px-3 py-2 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-900 hover:text-white hover:border-neutral-900 font-medium transition-all shadow-2xs flex items-center gap-1.5"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>{comp}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Company Search / Input */}
          <div className="pt-4 border-t border-neutral-200 text-left space-y-2">
            <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block">
              Or Enter Any Target Company Name:
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="e.g. Netflix, Oracle, Adobe, Samsung..."
                value={customCompanyInput}
                onChange={(e) => setCustomCompanyInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && customCompanyInput.trim()) {
                    handleSelectCompany(customCompanyInput.trim());
                  }
                }}
                className="flex-1 text-xs p-2.5 rounded-lg border border-neutral-200 focus:outline-none focus:ring-1 focus:ring-neutral-900"
              />
              <Button
                disabled={!customCompanyInput.trim()}
                onClick={() => handleSelectCompany(customCompanyInput.trim())}
                size="sm"
                className="text-xs gap-1.5 h-10 px-4"
              >
                <span>View Roadmap</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <>
          {/* Active Track Banner & Progress Bar */}
          <Card className="p-4 bg-neutral-50 border-neutral-300 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-neutral-900 text-white">
                  <DomainIcon className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-neutral-900">{currentTrackLabel}</h2>
                    <span className="text-[10px] bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded">
                      Target Company
                    </span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded flex items-center gap-1">
                      <BookOpen className="w-3 h-3" />
                      Coursera Powered
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500">
                    {completedCount === 5
                      ? `All 5 milestones completed! Your placement profile is market-ready for ${selectedCompany}.`
                      : `Milestone ${completedCount + 1} of 5 in progress. Verify its Coursera course to unlock the next milestone.`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                {completedCount > 0 && (
                  <button
                    onClick={rollbackStep}
                    className="text-[11px] text-neutral-500 hover:text-neutral-900 flex items-center gap-1 px-2 py-1 rounded hover:bg-neutral-200 transition-colors"
                    title="Undo last completed step"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Undo Step
                  </button>
                )}
                <button
                  onClick={resetAll}
                  className="text-[11px] text-neutral-400 hover:text-neutral-700 px-2 py-1 rounded hover:bg-neutral-200 transition-colors"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-xs font-semibold text-neutral-700">
                <span>{selectedCompany} Placement Readiness</span>
                <span>{progressPercent}% Completed ({completedCount}/5 Milestones)</span>
              </div>
              <div className="w-full h-2.5 bg-neutral-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-neutral-900 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </Card>

      {/* Sequential Milestone Steps with Embedded Coursera Courses */}
      <Card className="p-6">
        <div className="space-y-8">
          {milestones.map((step, idx) => {
            const stepCourses = getCoursesForStep(idx);

            return (
              <div key={step.title} className="flex gap-4">
                {/* Timeline Connector & Status Icon */}
                <div className="flex flex-col items-center">
                  {step.status === 'completed' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  ) : step.status === 'in_progress' ? (
                    <Clock className="w-5 h-5 text-amber-500 shrink-0 animate-pulse" />
                  ) : (
                    <Lock className="w-4 h-4 text-neutral-300 shrink-0 mt-0.5" />
                  )}
                  {idx !== milestones.length - 1 && (
                    <div
                      className={`w-0.5 my-1 transition-colors flex-1 ${
                        idx < completedCount ? 'bg-emerald-500' : 'bg-neutral-200'
                      }`}
                    />
                  )}
                </div>

                {/* Milestone Details */}
                <div className="pt-0.5 flex-1 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-neutral-400">Step {idx + 1}</span>
                      <h3
                        className={`text-sm font-semibold ${
                          step.status === 'completed'
                            ? 'text-neutral-900 line-through opacity-80'
                            : step.status === 'in_progress'
                            ? 'text-neutral-900 font-bold'
                            : 'text-neutral-400'
                        }`}
                      >
                        {step.title}
                      </h3>
                    </div>

                    {/* Status Badge */}
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${
                        step.status === 'completed'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : step.status === 'in_progress'
                          ? 'bg-amber-50 text-amber-700 border-amber-300'
                          : 'bg-neutral-100 text-neutral-400 border-neutral-200'
                      }`}
                    >
                      {step.status === 'completed'
                        ? 'Completed'
                        : step.status === 'in_progress'
                        ? 'In Progress'
                        : 'Locked'}
                    </span>
                  </div>

                  <p
                    className={`text-xs ${
                      step.status === 'pending' ? 'text-neutral-400' : 'text-neutral-600'
                    }`}
                  >
                    {step.desc}
                  </p>

                  {/* ============================================================== */}
                  {/* EMBEDDED COURSERA COURSES FOR THIS MILESTONE STEP */}
                  {/* ============================================================== */}
                  {stepCourses.length > 0 && (
                    <div className="mt-3 space-y-2.5">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-neutral-700">
                        <span className="p-1 rounded bg-blue-600 text-white font-black text-[9px] tracking-wider leading-none">
                          coursera
                        </span>
                        <span>Recommended Coursera Courses for Step {idx + 1}:</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {stepCourses.map((c) => (
                          <div
                            key={c.id}
                            className={`p-3.5 rounded-lg border text-xs flex flex-col justify-between space-y-2 transition-all ${
                              c.isCompleted
                                ? 'bg-emerald-50/60 border-emerald-300 ring-1 ring-emerald-200'
                                : 'bg-neutral-50/70 border-neutral-200 hover:bg-white hover:border-neutral-300'
                            }`}
                          >
                            <div className="space-y-1.5">
                              <div className="flex items-start justify-between gap-1.5">
                                <div>
                                  <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">
                                    {c.provider}
                                  </span>
                                  <h4 className="font-bold text-neutral-900 text-xs line-clamp-1">
                                    {c.title}
                                  </h4>
                                </div>

                                {c.isCompleted ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    Done
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-neutral-200/70 text-neutral-700 uppercase tracking-wider shrink-0">
                                    {c.pricingType === 'free' ? 'Free Audit' : 'Cert Available'}
                                  </span>
                                )}
                              </div>

                              <p className="text-[11px] text-neutral-500 line-clamp-2">{c.description}</p>

                              <div className="flex items-center gap-2 text-[10px] text-neutral-400">
                                <span className="flex items-center gap-0.5 text-amber-600 font-semibold">
                                  <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                                  {c.rating}
                                </span>
                                <span>• {c.duration}</span>
                                <span>• {c.level}</span>
                              </div>

                              {/* Skills Covered */}
                              <div className="flex flex-wrap gap-1 pt-0.5">
                                {c.skillsCovered.slice(0, 3).map((sk) => (
                                  <span key={sk} className="text-[9px] px-1.5 py-0.5 rounded bg-white border border-neutral-200 text-neutral-700 font-medium">
                                    {sk}
                                  </span>
                                ))}
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="pt-2 border-t border-neutral-200/60 flex items-center justify-between gap-2">
                              <a
                                href={c.courseraUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                              >
                                <span>Open Course</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>

                              {c.isCompleted ? (
                                <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                                  <ShieldCheck className="w-3 h-3" />
                                  Skills Added
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => openVerifyModal(c)}
                                  className="text-[10px] font-bold px-2 py-1 rounded bg-neutral-900 text-white hover:bg-neutral-800 flex items-center gap-1"
                                >
                                  <Award className="w-2.5 h-2.5 text-amber-300" />
                                  Verify / Complete
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Interactive Action Bar for Current Step */}
                  {step.status === 'in_progress' && (
                    <div className="flex flex-wrap items-center gap-2 pt-2">
                      {step.actionUrl && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(step.actionUrl!)}
                          className="text-xs gap-1.5 h-7"
                        >
                          <span>{step.actionLabel || 'Go to Task'}</span>
                          <ArrowRight className="w-3 h-3" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        onClick={markCurrentComplete}
                        className="text-xs gap-1.5 h-7 bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Mark Step {idx + 1} Complete</span>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </>
  )}

      {/* ============================================================== */}
      {/* COURSERA VERIFICATION MODAL IN ROADMAP */}
      {/* ============================================================== */}
      {selectedCourseForModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-5 border border-neutral-200">
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

            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-700 block">
                Coursera Certificate URL or Certificate ID:
              </label>
              <Input
                type="text"
                placeholder="https://www.coursera.org/verify/XXXXXX or Certificate ID"
                value={certInput}
                onChange={(e) => setCertInput(e.target.value)}
                disabled={verifying}
                className="text-xs"
              />
              <Button
                onClick={handleVerifyCertificate}
                disabled={verifying || !certInput.trim()}
                className="w-full text-xs font-semibold gap-1.5 bg-blue-600 hover:bg-blue-700 text-white mt-1"
              >
                <Award className="w-3.5 h-3.5" />
                {verifying ? 'Authenticating with Coursera...' : 'Verify Certificate & Award Skills'}
              </Button>
            </div>

            <div className="relative my-3">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-200" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-bold text-neutral-400">
                <span className="bg-white px-2">OR Free Audit Track</span>
              </div>
            </div>

            <div className="space-y-2 text-center bg-emerald-50/50 p-3 rounded-lg border border-emerald-100">
              <p className="text-[11px] text-neutral-600">
                Learned via Coursera&apos;s <strong>100% Free Audit Mode</strong>?
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleMarkAudit(selectedCourseForModal)}
                disabled={verifying}
                className="text-xs gap-1.5 border-emerald-300 text-emerald-800 hover:bg-emerald-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Confirm Free Audit Completion</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
