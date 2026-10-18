import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { api } from '../services/api';
import { useAuth } from '../hooks/useAuth';
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
  Database,
  Cloud,
  Shield,
  Coffee,
  Loader2,
  Briefcase,
  Layers,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export interface MilestoneItem {
  title: string;
  desc: string;
  actionUrl?: string;
  actionLabel?: string;
}

export interface Milestone extends MilestoneItem {
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

// Industry domain tracks used as baseline templates
const DOMAIN_ROADMAPS: Record<string, { label: string; icon: any; roleName: string; milestones: MilestoneItem[] }> = {
  data: {
    label: 'Data Analytics & Business Intelligence Track',
    icon: Database,
    roleName: 'Data Analyst',
    milestones: [
      {
        title: 'SQL, Relational Databases & Data Extraction',
        desc: 'Master complex SQL joins, aggregations, CTEs, and window functions on enterprise databases.',
        actionUrl: '/student/resume',
        actionLabel: 'Add SQL Skills',
      },
      {
        title: 'Python for Data Analysis & Statistical Modeling',
        desc: 'Clean, reshape, and analyze messy business datasets using Pandas, NumPy, and statistical hypothesis testing.',
        actionUrl: '/student/roadmap',
        actionLabel: 'View Data Courses',
      },
      {
        title: 'Interactive Dashboards with Tableau & Power BI',
        desc: 'Architect executive-level KPIs, cohort retention curves, and automated business intelligence dashboards.',
        actionUrl: '/student/messages',
        actionLabel: 'Connect with Hiring Teams',
      },
      {
        title: 'End-to-End Business Analytics Case Studies',
        desc: 'Synthesize raw transaction logs into actionable product insights and deliver a data-driven slide deck.',
        actionUrl: '/student/resume',
        actionLabel: 'Upload Data Portfolio',
      },
      {
        title: 'Data Analyst Technical Interviews & Offer',
        desc: 'Practice live SQL querying screens, analytical case questions, take-home exercises, and interview loops.',
        actionUrl: '/student/jobs',
        actionLabel: 'Browse Data Roles',
      },
    ],
  },
  cloud: {
    label: 'Cloud Architecture & DevOps Engineering Track',
    icon: Cloud,
    roleName: 'Cloud Engineer',
    milestones: [
      {
        title: 'Linux Systems, Networking & Cloud Foundations',
        desc: 'Master Linux administration, TCP/IP, VPC routing, subnets, DNS, and fundamental cloud security principles.',
        actionUrl: '/student/resume',
        actionLabel: 'Add Cloud Skills',
      },
      {
        title: 'AWS / Azure Core Services & Infrastructure as Code',
        desc: 'Deploy resilient compute (EC2/ECS), serverless functions (Lambda), object storage (S3), and Terraform scripts.',
        actionUrl: '/student/roadmap',
        actionLabel: 'View Cloud Courses',
      },
      {
        title: 'Docker Containerization & Kubernetes Orchestration',
        desc: 'Containerize multi-tier microservices, write Helm charts, and manage cluster scaling and service meshes.',
        actionUrl: '/student/messages',
        actionLabel: 'Practice System Mocks',
      },
      {
        title: 'CI/CD Pipelines & Site Reliability Automation',
        desc: 'Implement zero-downtime deployment pipelines with GitHub Actions, Prometheus monitoring, and Grafana alerting.',
        actionUrl: '/student/resume',
        actionLabel: 'Link GitHub DevOps Repo',
      },
      {
        title: 'Enterprise Cloud Architecture Interviews & Offer',
        desc: 'Present high-availability cloud architecture diagrams, disaster recovery scenarios, and negotiate placement.',
        actionUrl: '/student/jobs',
        actionLabel: 'Explore Cloud Openings',
      },
    ],
  },
  cybersecurity: {
    label: 'Cybersecurity & Threat Defense Track',
    icon: Shield,
    roleName: 'Cybersecurity Analyst',
    milestones: [
      {
        title: 'Network Defense, Protocols & Threat Landscapes',
        desc: 'Analyze packet captures with Wireshark, configure firewall ACLs, and evaluate OWASP Top 10 vulnerabilities.',
        actionUrl: '/student/resume',
        actionLabel: 'Add Security Skills',
      },
      {
        title: 'SIEM Tools, Log Analysis & Incident Response',
        desc: 'Ingest and correlate enterprise security logs in Splunk/Elasticsearch to detect intrusions and triage IOCs.',
        actionUrl: '/student/roadmap',
        actionLabel: 'View Security Courses',
      },
      {
        title: 'Vulnerability Assessment & Pen-Testing Fundamentals',
        desc: 'Conduct automated vulnerability scans, patch audit reviews, and ethical attack surface assessments.',
        actionUrl: '/student/messages',
        actionLabel: 'Consult Security Mentors',
      },
      {
        title: 'Security Operations & Compliance Lab Portfolio',
        desc: 'Document incident response playbooks, MITRE ATT&CK mappings, and SOC investigation walkthroughs.',
        actionUrl: '/student/resume',
        actionLabel: 'Attach SOC Portfolio',
      },
      {
        title: 'SOC Analyst Technical Screenings & Placement',
        desc: 'Demonstrate log forensic reasoning and incident communication to land an information security role.',
        actionUrl: '/student/jobs',
        actionLabel: 'Apply for SOC Roles',
      },
    ],
  },
  java: {
    label: 'Enterprise Java & Spring Boot Track',
    icon: Coffee,
    roleName: 'Java Developer',
    milestones: [
      {
        title: 'Core Java, OOP & Collections Mastery',
        desc: 'Master memory management, multithreading, concurrency, generics, and object-oriented design patterns.',
        actionUrl: '/student/resume',
        actionLabel: 'Verify Java Skills',
      },
      {
        title: 'Spring Boot Microservices & Hibernate/JPA',
        desc: 'Build robust RESTful microservices with Spring Data JPA, Hibernate ORM, and Spring Security JWT filters.',
        actionUrl: '/student/roadmap',
        actionLabel: 'View Spring Courses',
      },
      {
        title: 'Database Architecture & Transaction Management',
        desc: 'Optimize relational queries, manage ACID transactions, connection pools, and design enterprise schemas.',
        actionUrl: '/student/messages',
        actionLabel: 'Schedule Technical Mock',
      },
      {
        title: 'Production Enterprise Project & Testing Suite',
        desc: 'Develop a comprehensive enterprise service with JUnit 5, Mockito test coverage, and Docker containerization.',
        actionUrl: '/student/resume',
        actionLabel: 'Upload Java Project',
      },
      {
        title: 'Enterprise Technical Rounds & Campus Placements',
        desc: 'Clear rigorous Java coding assessments, system design interviews, and secure an enterprise engineering offer.',
        actionUrl: '/student/jobs',
        actionLabel: 'Browse Java Jobs',
      },
    ],
  },
  design: {
    label: 'UI/UX & Digital Product Design Track',
    icon: Palette,
    roleName: 'UI/UX Designer',
    milestones: [
      {
        title: 'User Research, Empathy Mapping & Wireframing',
        desc: 'Conduct user discovery interviews, synthesize journey maps, and draft responsive low-fidelity wireframes.',
        actionUrl: '/student/resume',
        actionLabel: 'Update Design Profile',
      },
      {
        title: 'Design Systems & Tokenized Component Architecture',
        desc: 'Build modular Figma design systems with auto-layout, atomic variants, variables, and dark mode tokens.',
        actionUrl: '/student/roadmap',
        actionLabel: 'View UI/UX Courses',
      },
      {
        title: 'Interactive Prototyping & Usability Testing',
        desc: 'Create realistic high-fidelity micro-interactions and conduct moderated usability testing rounds.',
        actionUrl: '/student/messages',
        actionLabel: 'Connect with Hiring Teams',
      },
      {
        title: 'End-to-End Product Design Case Study',
        desc: 'Publish an in-depth portfolio case study documenting problem framing, iterative tests, and business impact.',
        actionUrl: '/student/resume',
        actionLabel: 'Link Figma / Portfolio',
      },
      {
        title: 'Product Studio Design Critique & Placement',
        desc: 'Present design rationale to design directors and product leaders to secure a product design role.',
        actionUrl: '/student/jobs',
        actionLabel: 'Browse Design Roles',
      },
    ],
  },
  marketing: {
    label: 'Product Marketing & Growth Track',
    icon: TrendingUp,
    roleName: 'Product Marketer',
    milestones: [
      {
        title: 'Market Research & Audience Persona Mapping',
        desc: 'Define target customer personas, competitive landscape, and value proposition messaging frameworks.',
        actionUrl: '/student/resume',
        actionLabel: 'Update Profile & Bio',
      },
      {
        title: 'Performance Marketing & Multi-Channel ROI',
        desc: 'Run campaign simulations, Google/Meta attribution modeling, and unit economic CAC/LTV calculations.',
        actionUrl: '/student/roadmap',
        actionLabel: 'Review Marketing Skills',
      },
      {
        title: 'Content Funnels & Viral Distribution Loops',
        desc: 'Architect SEO keyword content funnels, referral loops, and organic brand amplification campaigns.',
        actionUrl: '/student/messages',
        actionLabel: 'Connect with Recruiters',
      },
      {
        title: 'Growth Case Study Presentation',
        desc: 'Synthesize product launch metrics and conversion rate optimization experiments into an executive deck.',
        actionUrl: '/student/resume',
        actionLabel: 'Upload Growth Portfolio',
      },
      {
        title: 'Enterprise & Scale-Up Growth Placement',
        desc: 'Pitch growth roadmaps and apply to leading consumer brands, digital agencies, and tech scale-ups.',
        actionUrl: '/student/jobs',
        actionLabel: 'Browse Marketing Jobs',
      },
    ],
  },
  software: {
    label: 'Software Engineering & Full Stack Track',
    icon: Code2,
    roleName: 'Software Engineer',
    milestones: [
      {
        title: 'Core Programming & Data Structures Foundations',
        desc: 'Solidify algorithmic complexity, data structures, and modular object-oriented software design.',
        actionUrl: '/student/resume',
        actionLabel: 'Verify Tech Skills',
      },
      {
        title: 'Full-Stack Architecture & Scalable API Design',
        desc: 'Build and deploy scalable, database-backed products with authentication, caching, and clean APIs.',
        actionUrl: '/student/roadmap',
        actionLabel: 'View Backend Courses',
      },
      {
        title: 'System Design & Distributed Scalability',
        desc: 'Master load balancers, caching strategies, horizontal partitioning, and asynchronous message queues.',
        actionUrl: '/student/messages',
        actionLabel: 'Schedule Mock Interview',
      },
      {
        title: 'Production Portfolio Assembly & GitHub Showcase',
        desc: 'Package deployable projects with comprehensive READMEs, test coverage, and automated CI/CD.',
        actionUrl: '/student/resume',
        actionLabel: 'Attach GitHub & Projects',
      },
      {
        title: 'Technical Screenings & Offer Negotiation',
        desc: 'Crack coding assessments, whiteboard rounds, and receive an engineering offer letter.',
        actionUrl: '/student/jobs',
        actionLabel: 'Explore Tech Jobs',
      },
    ],
  },
  film: {
    label: 'Film Direction & Production Track',
    icon: Clapperboard,
    roleName: 'Film Director / Producer',
    milestones: [
      {
        title: 'Screenplay Structure & Visual Treatment',
        desc: 'Craft your 3-act narrative treatment, scene blocking schematics, and directorial visual tone.',
        actionUrl: '/student/resume',
        actionLabel: 'Update Film Profile',
      },
      {
        title: 'Storyboarding & Camera Framing Plan',
        desc: 'Develop master shot lists, storyboard pivotal dramatic beats, and determine visual motifs.',
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
    roleName: 'Cinematographer',
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
        title: 'Color Science & ACES Grading Workflow',
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

/**
 * Helper to determine student domain key from role/field string
 */
function resolveDomainKey(text: string): string {
  const t = (text || '').toLowerCase();

  // Highest-priority specific disciplines (check BEFORE generic overlap categories)
  if (t.includes('interior') || t.includes('spatial') || t.includes('space plan') || t.includes('decorat') || t.includes('furnish')) return 'interior';
  if (t.includes('coach') || t.includes('sport') || t.includes('athlet') || t.includes('football') || t.includes('soccer') || t.includes('conditioning')) return 'sports';
  if ((t.includes('game') || t.includes('gaming')) && (t.includes('test') || t.includes('qa') || t.includes('quality') || t.includes('bug'))) return 'gameqa';
  if ((t.includes('game') || t.includes('gaming')) && (t.includes('dev') || t.includes('program') || t.includes('unity') || t.includes('unreal') || t.includes('engine'))) return 'gamedev';
  if (t.includes('graphic') || t.includes('visual designer') || t.includes('illustrat') || t.includes('branding') || t.includes('logo')) return 'graphic';

  // General categories
  if (t.includes('data') || t.includes('analyst') || t.includes('analytics') || t.includes('bi')) return 'data';
  if (t.includes('cloud') || t.includes('devops') || t.includes('aws') || t.includes('azure') || t.includes('sre')) return 'cloud';
  if (t.includes('cyber') || t.includes('security') || t.includes('infosec') || t.includes('soc')) return 'cybersecurity';
  if (t.includes('java') || t.includes('spring')) return 'java';
  // design / UI / UX — only if NOT interior
  if (t.includes('ui') || t.includes('ux') || t.includes('product design') || t.includes('user experience') || t.includes('figma') || t.includes('wireframe')) return 'design';
  if (t.includes('camera') || t.includes('cinematograph') || t.includes('dp')) return 'cinematography';
  if (t.includes('film') || t.includes('director') || t.includes('movie') || t.includes('media')) return 'film';
  if (t.includes('market') || t.includes('growth') || t.includes('seo')) return 'marketing';
  return 'software';
}

/**
 * Intelligent client-side fallback generator that merges target company AND student role
 * Used if the server or Gemini is offline, ensuring we NEVER fall back to generic software engineering.
 */
function generateRoleAndCompanyRoadmap(company: string, roleTitle: string, domainKey: string): MilestoneItem[] {
  const normComp = company.trim();
  const domainConfig = DOMAIN_ROADMAPS[domainKey] || DOMAIN_ROADMAPS.software;
  const role = roleTitle || domainConfig.roleName;

  return [
    {
      title: `${normComp} ${role} Hiring Requirements & Core Foundations`,
      desc: `Analyze ${normComp}'s active job specifications, tech stack, and evaluation rubrics for ${role} positions. Solidify essential domain proficiencies.`,
      actionUrl: '/student/resume',
      actionLabel: `Update ${role} Skills`,
    },
    {
      title: `Targeted Technical Upskilling for ${normComp}`,
      desc: `Complete industry-recognized Coursera courses and build hands-on labs matching ${normComp}'s domain stack in ${role}.`,
      actionUrl: '/student/roadmap',
      actionLabel: 'View Required Courses',
    },
    {
      title: `${normComp}-Aligned Practical Project & Architecture`,
      desc: `Architect a production-grade portfolio project addressing challenges typical of ${normComp}'s business domain and infrastructure.`,
      actionUrl: '/student/resume',
      actionLabel: 'Attach Project Link',
    },
    {
      title: `${normComp} Interview Rounds & Role-Specific Mocks`,
      desc: `Prepare for ${normComp}'s specific interview loop for ${role}: technical screening, portfolio/domain deep dive, and culture-fit assessments.`,
      actionUrl: '/student/messages',
      actionLabel: 'Schedule Mock Interview',
    },
    {
      title: `${normComp} Placement Application & Offer Finalization`,
      desc: `Submit your verified candidate profile through ${normComp}'s hiring pipeline on RecruitX, complete final evaluations, and secure your offer.`,
      actionUrl: '/student/applications',
      actionLabel: 'View Applications',
    },
  ];
}

export const StudentRoadmap: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Active student profession / role state
  const [studentRole, setStudentRole] = useState<string>('Software Engineering');
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
    'Google',
    'Microsoft',
    'Amazon',
    'TCS',
    'Infosys',
    'Shiv IT',
    'Roy Kapur Films',
    'HAWKSTAR',
    'Adobe',
    'Netflix',
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

  // Dynamic storage key tracking progress uniquely per target company and role
  const storageKey = useMemo(() => {
    const roleSlug = studentRole.toLowerCase().replace(/[^a-z0-9]/g, '_');
    if (selectedCompany) {
      const compSlug = selectedCompany.toLowerCase().replace(/[^a-z0-9]/g, '_');
      return `recruitx_roadmap_progress_${compSlug}_${roleSlug}`;
    }
    return `recruitx_roadmap_progress_${activeDomain}_${roleSlug}`;
  }, [selectedCompany, studentRole, activeDomain]);

  // Sync completion count with localStorage whenever storage key changes
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
  }, [storageKey]);

  /**
   * Fetch Coursera courses tailored specifically to the given role and target company
   */
  const fetchCourseraCourses = useCallback(async (role: string, company?: string | null) => {
    setCoursesLoading(true);
    try {
      const params: Record<string, string> = { pricing: 'all' };
      if (role) params.role = role;
      if (company) params.company = company;

      const res = await api.get('/courses/recommended', { params });
      if (res.data?.data?.courses) {
        setCourses(res.data.data.courses);
      }
    } catch (err) {
      console.error('Failed to fetch Coursera courses for roadmap:', err);
    } finally {
      setCoursesLoading(false);
    }
  }, []);

  /**
   * Fetch company-specific and role-specific roadmap from backend AI service
   */
  const fetchRoadmapForCompany = useCallback(async (company: string, role: string, domain: string) => {
    setGeneratingAI(true);
    try {
      const res = await api.get('/resume/roadmap', { params: { company } });
      if (res.data?.data?.roadmap) {
        const rData = res.data.data.roadmap;
        if (Array.isArray(rData.milestones) && rData.milestones.length === 5) {
          setCustomMilestones(rData.milestones);
          setCustomTrackTitle(rData.trackTitle || `${company} ${role} Preparation Track`);
          setIsAiGenerated(true);
          return;
        }
      }
      // If backend returned non-5 milestones, use client-side role+company generator
      const fallbackMilestones = generateRoleAndCompanyRoadmap(company, role, domain);
      setCustomMilestones(fallbackMilestones);
      setCustomTrackTitle(`${company} ${role} Preparation Track`);
      setIsAiGenerated(true);
    } catch (err) {
      console.warn('Backend roadmap request failed, falling back to role-tailored company plan:', err);
      const fallbackMilestones = generateRoleAndCompanyRoadmap(company, role, domain);
      setCustomMilestones(fallbackMilestones);
      setCustomTrackTitle(`${company} ${role} Preparation Track`);
      setIsAiGenerated(true);
    } finally {
      setGeneratingAI(false);
    }
  }, []);

  /**
   * Initial page load: fetches student profile, resume, active role, and company list
   */
  const fetchStudentStatus = useCallback(async () => {
    setLoading(true);
    try {
      const [resRes, appRes] = await Promise.allSettled([
        api.get('/resume'),
        api.get('/applications'),
      ]);

      let derivedRole = 'Software Engineering';
      let resumeData: any = null;

      if (resRes.status === 'fulfilled' && resRes.value.data?.data?.resume) {
        resumeData = resRes.value.data.data.resume;
        // Latest resume always wins over stale onboarding profession
        if (resumeData.fieldOfInterest || resumeData.headline) {
          derivedRole = resumeData.fieldOfInterest || resumeData.headline;
        } else {
          derivedRole = user?.profession || user?.title || 'Software Engineering';
        }
      } else {
        derivedRole = user?.profession || user?.title || 'Software Engineering';
      }

      const domainKey = resolveDomainKey(derivedRole);
      setStudentRole(derivedRole);
      setActiveDomain(domainKey);

      if (appRes.status === 'fulfilled' && (appRes.value.data?.data?.applications?.length || 0) > 0) {
        const appCompanies = appRes.value.data.data.applications
          .map((a: any) => a.companyName || a.job?.company)
          .filter(Boolean);
        if (appCompanies.length > 0) {
          setAvailableCompanies((prev) => Array.from(new Set([...appCompanies, ...prev])));
        }
      }

      // Fetch initial domain courses
      await fetchCourseraCourses(derivedRole, null);
    } catch (err) {
      console.error('Failed to load roadmap status:', err);
    } finally {
      setLoading(false);
    }
  }, [user, fetchCourseraCourses]);

  useEffect(() => {
    fetchStudentStatus();
  }, [fetchStudentStatus]);

  /**
   * Handle company selection: trigger genuine backend AI roadmap & course re-fetch
   */
  const handleSelectCompany = async (comp: string) => {
    const trimmed = comp.trim();
    if (!trimmed) return;

    setSelectedCompany(trimmed);

    // Normalize and add to quick-select list if not present
    setAvailableCompanies((prev) => {
      const exists = prev.some((c) => c.toLowerCase() === trimmed.toLowerCase());
      return exists ? prev : [trimmed, ...prev];
    });

    // Simultaneously fetch company roadmap and role-matched Coursera courses
    await Promise.allSettled([
      fetchRoadmapForCompany(trimmed, studentRole, activeDomain),
      fetchCourseraCourses(studentRole, trimmed),
    ]);
  };

  /**
   * Regenerate roadmap with AI for the current selection
   */
  const handleRegenerateWithAI = async () => {
    if (selectedCompany) {
      await Promise.allSettled([
        fetchRoadmapForCompany(selectedCompany, studentRole, activeDomain),
        fetchCourseraCourses(studentRole, selectedCompany),
      ]);
    } else {
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
        await fetchCourseraCourses(studentRole, null);
      } catch (err) {
        console.error('Failed to regenerate AI roadmap:', err);
      } finally {
        setGeneratingAI(false);
      }
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
        await fetchCourseraCourses(studentRole, selectedCompany);
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
        await fetchCourseraCourses(studentRole, selectedCompany);
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

  // Determine active milestone list
  const activeMilestones: MilestoneItem[] = customMilestones && customMilestones.length === 5
    ? customMilestones
    : selectedCompany
    ? generateRoleAndCompanyRoadmap(selectedCompany, studentRole, activeDomain)
    : (DOMAIN_ROADMAPS[activeDomain] || DOMAIN_ROADMAPS.software).milestones;

  // Determine track title
  const currentTrackLabel = customTrackTitle
    ? customTrackTitle
    : selectedCompany
    ? `${selectedCompany} ${studentRole} Placement Track`
    : (DOMAIN_ROADMAPS[activeDomain] || DOMAIN_ROADMAPS.software).label;

  // Determine track icon
  const DomainIcon = (DOMAIN_ROADMAPS[activeDomain] || DOMAIN_ROADMAPS.software).icon;

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

  /**
   * Intelligently assign relevant Coursera courses to each milestone step
   * Prioritizes courses whose skills or title match keywords from the milestone
   */
  const getCoursesForStep = (stepIdx: number): CourseraCourseItem[] => {
    if (!courses || courses.length === 0) return [];
    const step = activeMilestones[stepIdx];
    if (!step) return [];

    const stepText = `${step.title} ${step.desc}`.toLowerCase();

    // 1. Search for courses matching skills covered or key words
    const keywordMatches = courses.filter((c) => {
      const courseText = `${c.title} ${c.description} ${c.skillsCovered.join(' ')}`.toLowerCase();
      // Check for skill overlaps
      const hasSkillOverlap = c.skillsCovered.some((sk) => stepText.includes(sk.toLowerCase()));
      if (hasSkillOverlap) return true;

      // Check key keywords in step title
      const titleTokens = step.title.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
      return titleTokens.some((tok) => courseText.includes(tok));
    });

    if (keywordMatches.length > 0) {
      return keywordMatches.slice(0, 2);
    }

    // 2. Fallback: distribute available role courses across steps
    const perStep = Math.max(1, Math.ceil(courses.length / 5));
    const start = (stepIdx * perStep) % courses.length;
    return courses.slice(start, start + 2);
  };

  const markCurrentComplete = () => {
    const stepCourses = getCoursesForStep(completedCount);
    const hasVerifiedCourse = stepCourses.some((c) => c.isCompleted);

    // If this milestone has courses and none have been verified, prompt completion
    if (stepCourses.length > 0 && !hasVerifiedCourse) {
      alert(
        `⚠️ Certificate Verification Recommended:\n\nPlease complete or authenticate at least one Coursera certificate for Step ${completedCount + 1} by clicking "Verify / Complete" or using Free Audit before completing this milestone.`
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-neutral-900">Career &amp; Placement Roadmap</h1>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-600 text-white flex items-center gap-1">
              <GraduationCap className="w-3 h-3" />
              Coursera Integrated
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
              Role: {studentRole}
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            {selectedCompany
              ? `Personalized placement milestones and accredited Coursera skills for ${studentRole} candidates targeting ${selectedCompany}.`
              : `Select your target hiring organization to generate a company-tailored roadmap for your ${studentRole} track.`}
          </p>
        </div>

        {selectedCompany && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRegenerateWithAI}
              disabled={generatingAI}
              className="text-xs gap-1.5 h-8 border-neutral-300 hover:bg-neutral-100"
            >
              {generatingAI ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              <span>Regenerate with AI</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedCompany(null);
                setCustomMilestones(null);
                setCustomTrackTitle(null);
                setCustomCompanyInput('');
                fetchCourseraCourses(studentRole, null);
              }}
              className="text-xs gap-1.5 h-8 border-neutral-300 hover:bg-neutral-100"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Change Company</span>
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
            <h2 className="text-lg font-bold text-neutral-900">Select Your Target Hiring Organization</h2>
            <p className="text-xs text-neutral-500 max-w-md mx-auto leading-relaxed">
              Every employer evaluates candidates with unique rubrics and tech stacks. Select a verified campus recruiter or enter any target company to adapt the roadmap to your <strong className="text-neutral-800">{studentRole}</strong> profile.
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
                placeholder="e.g. Netflix, Adobe, Spotify, Oracle, Flipkart..."
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
                disabled={!customCompanyInput.trim() || generatingAI}
                onClick={() => handleSelectCompany(customCompanyInput.trim())}
                size="sm"
                className="text-xs gap-1.5 h-10 px-4"
              >
                {generatingAI ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <span>Generate Roadmap</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
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
                <div className="p-2.5 rounded-lg bg-neutral-900 text-white shrink-0">
                  <DomainIcon className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-bold text-neutral-900">{currentTrackLabel}</h2>
                    <span className="text-[10px] bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded flex items-center gap-1">
                      <Building2 className="w-3 h-3" />
                      {selectedCompany}
                    </span>
                    <span className="text-[10px] bg-purple-100 text-purple-800 font-semibold px-2 py-0.5 rounded flex items-center gap-1">
                      <Briefcase className="w-3 h-3" />
                      {studentRole}
                    </span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded flex items-center gap-1">
                      <BookOpen className="w-3 h-3" />
                      Coursera Powered
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 mt-1">
                    {completedCount === 5
                      ? `All 5 milestones completed! Your placement profile is market-ready for ${selectedCompany} as a ${studentRole}.`
                      : `Milestone ${completedCount + 1} of 5 in progress. Verify or complete the recommended Coursera course to advance.`}
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
            {generatingAI ? (
              <div className="py-12 text-center space-y-3">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-neutral-700" />
                <p className="text-sm font-semibold text-neutral-700">
                  Generating tailored roadmap for {selectedCompany} ({studentRole})...
                </p>
                <p className="text-xs text-neutral-400">
                  Synthesizing real recruiter job specs, interview rounds, and accredited Coursera courses.
                </p>
              </div>
            ) : (
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
            )}
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
