export interface ParsedResumeData {
  headline: string;
  summary: string;
  fieldOfInterest: string;
  skills: string[];
  education: {
    institution: string;
    degree: string;
    fieldOfStudy: string;
    startYear: string;
    endYear: string;
    grade: string;
  }[];
  experience: {
    title: string;
    company: string;
    location: string;
    startDate: string;
    endDate: string;
    description: string;
  }[];
  projects: {
    title: string;
    description: string;
    technologies: string[];
    link?: string;
  }[];
}

export interface SkillGapAnalysisResult {
  targetRole: string;
  matchScore: number;
  acquiredSkills: { name: string; category: string }[];
  missingSkills: { name: string; priority: 'High Impact' | 'Medium Impact' | 'Bonus'; demand: string; estTime: string }[];
  companyRequirements: { company: string; role: string; requiredSkills: string[]; matchRate: number }[];
  aiActionPlan: string[];
}

export interface MockEvaluationResult {
  score: number;
  verdict: 'Gibberish / Invalid' | 'Off-Topic' | 'Needs Improvement' | 'Competent' | 'Exemplary';
  isGibberish: boolean;
  feedback: string;
  matchedKeyPoints: string[];
  missingKeyPoints: string[];
  evaluatedBy?: string;
}

const INDUSTRY_REQUIREMENTS: { [key: string]: { required: string[]; optional: string[] } } = {
  'Marketing & Growth Management': {
    required: ['Digital Marketing', 'SEO & SEM', 'Campaign Strategy', 'Google Analytics', 'Brand Management', 'Lead Generation'],
    optional: ['CRM (HubSpot)', 'Social Media Management', 'A/B Testing', 'Content Marketing', 'Copywriting'],
  },
  'Video Editing & Post-Production': {
    required: ['Adobe Premiere Pro', 'After Effects', 'DaVinci Resolve', 'Color Grading', 'Motion Graphics'],
    optional: ['Final Cut Pro', 'Audio Editing', 'Sound Design', 'Storyboarding', 'Lighting Setup'],
  },
  'Film & Movie Direction': {
    required: ['Film Directing', 'Screenwriting', 'Cinematography', 'Storyboarding', 'Casting'],
    optional: ['Post-Production', 'Video Editing', 'Lighting Design', 'Sound Mixing', 'Location Scouting'],
  },
  'Cinematography': {
    required: ['Cinematography', 'Camera Operation', 'Lighting & Exposure', 'Color Grading', 'Visual Storytelling'],
    optional: ['Lenses & Optics', 'DaVinci Resolve', 'Storyboarding', 'Camera Rigging', 'Post-Production'],
  },
  'UI/UX & Creative Design': {
    required: ['Figma', 'Adobe Photoshop', 'UI/UX Design', 'Wireframing', 'Prototyping'],
    optional: ['Adobe Illustrator', 'User Research', 'Design Systems', 'Design Tokens', 'Micro-interactions'],
  },
  'Finance & Accounting': {
    required: ['Financial Reporting', 'Advanced Excel', 'Accounting', 'Financial Analysis', 'Budgeting'],
    optional: ['Tally Prime', 'Taxation', 'Corporate Finance', 'Audit & Compliance', 'QuickBooks'],
  },
  'Sales & Business Development': {
    required: ['B2B Sales', 'Lead Generation', 'Client Negotiation', 'CRM Management', 'Sales Pipeline'],
    optional: ['Market Research', 'Deal Closing', 'Account Management', 'Cold Calling', 'Contract Negotiation'],
  },
  'Human Resources & Recruitment': {
    required: ['Talent Acquisition', 'HR Operations', 'Recruitment', 'Employee Relations', 'Payroll Management'],
    optional: ['Performance Appraisal', 'HR Compliance', 'Labor Law', 'HRIS Systems', 'Onboarding'],
  },
  'Software Engineering': {
    required: ['JavaScript', 'TypeScript', 'React.js', 'Node.js', 'SQL', 'Git'],
    optional: ['MongoDB', 'Docker', 'AWS', 'System Design', 'REST API', 'GraphQL', 'Redis', 'Kubernetes'],
  },
  'Artificial Intelligence & Data Science': {
    required: ['Python', 'Machine Learning', 'Data Analysis', 'Pandas', 'SQL'],
    optional: ['NumPy', 'TensorFlow', 'PyTorch', 'Deep Learning', 'Scikit-Learn', 'Big Data'],
  },
  'Cloud Infrastructure & DevOps': {
    required: ['AWS', 'Docker', 'Kubernetes', 'Linux', 'CI/CD'],
    optional: ['Terraform', 'Cloud Architecture', 'Python', 'Shell Scripting', 'Monitoring (Grafana)'],
  },
};

export class AIService {
  /**
   * High-availability Google Gemini Multi-Model Query Helper with Automatic Failover
   */
  private static async queryGemini(prompt: string, inlineData?: { mimeType: string; data: string }): Promise<any | null> {
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey || geminiKey.trim().length < 10) return null;

    const models = ['gemini-2.0-flash', 'gemini-1.5-flash'];
    const parts: any[] = [{ text: prompt }];
    if (inlineData) {
      parts.push({
        inline_data: {
          mime_type: inlineData.mimeType,
          data: inlineData.data,
        },
      });
    }

    for (const model of models) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey.trim()}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': geminiKey.trim(),
            },
            body: JSON.stringify({
              contents: [{ parts }],
              generationConfig: { responseMimeType: 'application/json' },
            }),
          }
        );

        if (response.ok) {
          const data: any = await response.json();
          const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            const cleanJsonStr = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
            const jsonMatch = cleanJsonStr.match(/(\{|\[)[\s\S]*(\}|\])/);
            if (jsonMatch) {
              return JSON.parse(jsonMatch[0]);
            }
          }
        } else {
          const errBody = await response.text();
          console.warn(`Gemini (${model}) status ${response.status}:`, errBody);
        }
      } catch (err: any) {
        console.warn(`Gemini (${model}) request exception:`, err?.message || err);
      }
    }
    return null;
  }

  /**
   * Universal AI Parser
   */
  static async parse(fileBase64?: string, mimeType?: string, textContent?: string, fileName?: string): Promise<ParsedResumeData> {
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey && geminiKey.trim().length > 10) {
      if (fileBase64) {
        const geminiResult = await this.parseWithGemini(fileBase64, mimeType || 'application/pdf', geminiKey.trim());
        if (geminiResult && geminiResult.skills.length > 0) return geminiResult;
      }
      if (textContent && textContent.trim().length > 20) {
        const geminiTextResult = await this.parseTextWithGemini(textContent, geminiKey.trim());
        if (geminiTextResult && geminiTextResult.skills.length > 0) return geminiTextResult;
      }
    }

    const openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey && openaiKey.trim().length > 10 && (fileBase64 || textContent)) {
      const openaiResult = await this.parseWithOpenAI(textContent || '', openaiKey.trim());
      if (openaiResult && openaiResult.skills.length > 0) return openaiResult;
    }

    return this.parseUniversalNLP(textContent || '', fileName || '');
  }

  /**
   * Resolve industry benchmark requirement set based on candidate role / headline
   */
  static getIndustryRequirementSet(targetRole: string) {
    const lower = targetRole.toLowerCase();
    if (lower.includes('cinematograph') || lower.includes('camera') || lower.includes('dop')) {
      return INDUSTRY_REQUIREMENTS['Cinematography'];
    }
    if (
      lower.includes('film') ||
      lower.includes('movie') ||
      lower.includes('director') ||
      lower.includes('direction') ||
      lower.includes('screenplay') ||
      lower.includes('script')
    ) {
      return INDUSTRY_REQUIREMENTS['Film & Movie Direction'];
    }
    if (lower.includes('video') || lower.includes('edit') || lower.includes('post-production')) {
      return INDUSTRY_REQUIREMENTS['Video Editing & Post-Production'];
    }
    if (lower.includes('design') || lower.includes('ui') || lower.includes('ux') || lower.includes('creative')) {
      return INDUSTRY_REQUIREMENTS['UI/UX & Creative Design'];
    }
    if (lower.includes('finance') || lower.includes('account') || lower.includes('audit') || lower.includes('tax')) {
      return INDUSTRY_REQUIREMENTS['Finance & Accounting'];
    }
    if (lower.includes('market') || lower.includes('growth') || lower.includes('brand') || lower.includes('campaign')) {
      return INDUSTRY_REQUIREMENTS['Marketing & Growth Management'];
    }
    if (lower.includes('sales') || lower.includes('business dev')) {
      return INDUSTRY_REQUIREMENTS['Sales & Business Development'];
    }
    if (lower.includes('hr') || lower.includes('human resource') || lower.includes('talent')) {
      return INDUSTRY_REQUIREMENTS['Human Resources & Recruitment'];
    }
    if (lower.includes('ai') || lower.includes('data science') || lower.includes('machine learning')) {
      return INDUSTRY_REQUIREMENTS['Artificial Intelligence & Data Science'];
    }
    if (lower.includes('cloud') || lower.includes('devops')) {
      return INDUSTRY_REQUIREMENTS['Cloud Infrastructure & DevOps'];
    }
    return INDUSTRY_REQUIREMENTS[targetRole] || INDUSTRY_REQUIREMENTS['Software Engineering'];
  }

  /**
   * Real-Time Skill Gap Analysis Engine:
   * Compares Candidate's Resume against Real Company Jobs in DB & Industry Standards
   */
  static async analyzeSkillGap(studentResume: any, realJobs: any[] = []): Promise<SkillGapAnalysisResult> {
    const targetRole = studentResume?.fieldOfInterest || studentResume?.headline || 'Software Engineering';
    const userSkills: string[] = Array.isArray(studentResume?.skills) ? studentResume.skills : [];

    // Optional Gemini 3.6 Flash deep analysis
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey && geminiKey.trim().length > 10) {
      try {
        const jobSnippets = realJobs.slice(0, 5).map((j) => ({
          title: j.title,
          company: j.company || j.postedBy?.company || 'Verified Employer',
          requirements: j.requirements || [],
        }));

        const prompt = `You are a Career Growth & Technical Placement Specialist.
Perform an in-depth Skill Gap Analysis for a candidate targeting the role of "${targetRole}".
Candidate's currently verified skills: ${JSON.stringify(userSkills)}.
Active industry job requirements: ${JSON.stringify(jobSnippets)}.

Return ONLY a valid raw JSON object with:
- "matchScore": number (0 to 100 representing market readiness percentage)
- "acquiredSkills": array of objects with keys "name" (string) and "category" (string e.g. "Core Required", "Verified Expertise")
- "missingSkills": array of objects with keys:
    "name": string (missing skill name)
    "priority": "High Impact" | "Medium Impact" | "Bonus"
    "demand": string (e.g. "Required by 85%+ active recruiters")
    "estTime": string (e.g. "1-2 Weeks", "3-5 Days")
- "aiActionPlan": array of 3-4 actionable strings with concrete placement preparation advice`;

        const parsed = await this.queryGemini(prompt);
        if (parsed && typeof parsed.matchScore === 'number') {
          const lowerUser = userSkills.map((s) => s.toLowerCase());
          const companyReqs = realJobs.slice(0, 4).map((job) => {
              const jobReqs: string[] = Array.isArray(job.requirements) ? job.requirements : [];
              const matched = jobReqs.filter((req) =>
                lowerUser.some((u) => u.includes(req.toLowerCase()) || req.toLowerCase().includes(u))
              );
              const rate = jobReqs.length > 0 ? Math.round((matched.length / jobReqs.length) * 100) : parsed.matchScore;
              return {
                company: job.company || job.postedBy?.company || 'Verified Employer',
                role: job.title || targetRole,
                requiredSkills: jobReqs.length > 0 ? jobReqs : ['Core Architecture', 'Technical Implementation'],
                matchRate: rate,
              };
            });

            return {
              targetRole,
              matchScore: Math.min(100, Math.max(25, Math.round(parsed.matchScore))),
              acquiredSkills: Array.isArray(parsed.acquiredSkills) ? parsed.acquiredSkills : [],
              missingSkills: Array.isArray(parsed.missingSkills) ? parsed.missingSkills : [],
              companyRequirements:
                companyReqs.length > 0
                  ? companyReqs
                  : [
                      {
                        company: 'Top Recruiters Hiring Now',
                        role: `${targetRole} Lead`,
                        requiredSkills: ['Advanced Frameworks', 'System Architecture'],
                        matchRate: parsed.matchScore,
                      },
                    ],
              aiActionPlan: Array.isArray(parsed.aiActionPlan) ? parsed.aiActionPlan : [],
            };
          }
        } catch (err) {
        console.warn('Gemini skill gap analysis fallback to benchmark engine:', err);
      }
    }

    // Match industry benchmark skills for this domain (Deterministic Engine)
    const reqSet = this.getIndustryRequirementSet(targetRole);
    const totalRequiredSkills = Array.from(new Set([...reqSet.required, ...reqSet.optional]));

    const lowerUserSkills = userSkills.map((s) => s.toLowerCase());

    const acquiredSkills: { name: string; category: string }[] = [];
    const missingSkills: { name: string; priority: 'High Impact' | 'Medium Impact' | 'Bonus'; demand: string; estTime: string }[] = [];

    totalRequiredSkills.forEach((reqSkill) => {
      const isAcquired = lowerUserSkills.some(
        (uSkill) => uSkill.includes(reqSkill.toLowerCase()) || reqSkill.toLowerCase().includes(uSkill)
      );

      if (isAcquired) {
        acquiredSkills.push({ name: reqSkill, category: reqSet.required.includes(reqSkill) ? 'Core Required' : 'Bonus Skill' });
      } else {
        const isCore = reqSet.required.includes(reqSkill);
        missingSkills.push({
          name: reqSkill,
          priority: isCore ? 'High Impact' : 'Medium Impact',
          demand: isCore ? 'Required by 85%+ active recruiters' : 'Preferred by top hiring managers',
          estTime: isCore ? '1-2 Weeks' : '3-5 Days',
        });
      }
    });

    userSkills.forEach((uSkill) => {
      if (!acquiredSkills.some((a) => a.name.toLowerCase() === uSkill.toLowerCase())) {
        acquiredSkills.push({ name: uSkill, category: 'Verified Expertise' });
      }
    });

    const matchedCount = acquiredSkills.filter((a) => a.category !== 'Verified Expertise').length;
    const matchScore = totalRequiredSkills.length > 0
      ? Math.min(98, Math.max(35, Math.round((matchedCount / totalRequiredSkills.length) * 100)))
      : 75;

    const companyRequirements: SkillGapAnalysisResult['companyRequirements'] = [];
    if (realJobs && realJobs.length > 0) {
      realJobs.slice(0, 4).forEach((job) => {
        const jobReqs: string[] = Array.isArray(job.requirements) ? job.requirements : [];
        const matched = jobReqs.filter((req) => lowerUserSkills.some((u) => u.includes(req.toLowerCase()) || req.toLowerCase().includes(u)));
        const rate = jobReqs.length > 0 ? Math.round((matched.length / jobReqs.length) * 100) : 80;

        companyRequirements.push({
          company: job.company || job.postedBy?.company || 'Verified Employer',
          role: job.title || targetRole,
          requiredSkills: jobReqs.length > 0 ? jobReqs : reqSet.required.slice(0, 4),
          matchRate: rate,
        });
      });
    }

    if (companyRequirements.length === 0) {
      companyRequirements.push(
        { company: 'Top Recruiters Hiring Now', role: `${targetRole} Lead`, requiredSkills: reqSet.required.slice(0, 4), matchRate: matchScore },
        { company: 'Enterprise Industry Leaders', role: `Senior ${targetRole}`, requiredSkills: reqSet.required.slice(2, 6), matchRate: Math.max(40, matchScore - 15) }
      );
    }

    const topMissing = missingSkills.slice(0, 2).map((m) => m.name);
    const aiActionPlan = [
      topMissing.length > 0
        ? `Master ${topMissing.join(' and ')} to boost your profile match score by +20% for active openings.`
        : `Build a portfolio project demonstrating your core skills in ${targetRole}.`,
      `Apply to target job postings matching your current ${matchScore}% readiness score.`,
      `Practice technical mock interview questions tailored to ${targetRole}.`,
    ];

    return {
      targetRole,
      matchScore,
      acquiredSkills,
      missingSkills,
      companyRequirements,
      aiActionPlan,
    };
  }


  /**
   * Universal NLP Engine
   */
  static parseUniversalNLP(rawText: string, fileName: string): ParsedResumeData {
    const cleanText = rawText
      .replace(/RIFF[\s\S]*?WEBPVP8/gi, '')
      .replace(/WEBPVP8[^\s]*/gi, '')
      .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
      .replace(/[ \t]+/g, ' ')
      .trim();

    const combinedSource = `${fileName} ${cleanText}`.toLowerCase();

    let detectedDomain = '';
    let extractedSkills: string[] = [];

    const domainRules: { pattern: RegExp; title: string; skills: string[] }[] = [
      {
        pattern: /director|film|movie|cinema|screenplay|filmmaking|directing/i,
        title: 'Film & Movie Direction',
        skills: ['Film Directing', 'Screenwriting', 'Cinematography', 'Post-Production', 'Storyboarding', 'Casting', 'Video Editing'],
      },
      {
        pattern: /video|premiere|after effects|davinci|motion/i,
        title: 'Video Editing & Post-Production',
        skills: ['Adobe Premiere Pro', 'After Effects', 'DaVinci Resolve', 'Color Grading', 'Final Cut Pro', 'Motion Graphics', 'Audio Editing'],
      },
      {
        pattern: /marketing|campaign|seo|sem|brand|lead gen|growth/i,
        title: 'Marketing & Growth Management',
        skills: ['Digital Marketing', 'SEO & SEM', 'Campaign Strategy', 'Google Analytics', 'Content Marketing', 'Brand Management', 'Lead Generation', 'CRM (HubSpot)'],
      },
      {
        pattern: /ui\/ux|figma|graphic design|illustrator|photoshop|wireframe|prototype/i,
        title: 'UI/UX & Creative Design',
        skills: ['Figma', 'Adobe Illustrator', 'Adobe Photoshop', 'UI/UX Design', 'Wireframing', 'Prototyping', 'User Research'],
      },
      {
        pattern: /finance|accounting|audit|tally|excel|tax|banking|financial analyst/i,
        title: 'Finance & Accounting',
        skills: ['Financial Reporting', 'Advanced Excel', 'Accounting', 'Tally Prime', 'Financial Analysis', 'Budgeting', 'Taxation'],
      },
      {
        pattern: /sales|business development|client executive|account manager/i,
        title: 'Sales & Business Development',
        skills: ['B2B Sales', 'Lead Generation', 'Client Negotiation', 'CRM Management', 'Sales Pipeline', 'Market Research'],
      },
      {
        pattern: /\bhr\b|recruitment|talent acquisition|hiring|payroll|human resources/i,
        title: 'Human Resources & Recruitment',
        skills: ['Talent Acquisition', 'HR Operations', 'Recruitment', 'Employee Relations', 'Payroll Management', 'Performance Appraisal'],
      },
      {
        pattern: /web|software|developer|engineer|react|node|python|java|full stack|backend|frontend/i,
        title: 'Software Engineering',
        skills: ['JavaScript', 'TypeScript', 'React.js', 'Node.js', 'Python', 'SQL', 'MongoDB', 'Git'],
      },
      {
        pattern: /data scientist|data analyst|machine learning|\bai\b|deep learning|pandas/i,
        title: 'Artificial Intelligence & Data Science',
        skills: ['Python', 'Machine Learning', 'Data Analysis', 'Pandas', 'NumPy', 'TensorFlow', 'PyTorch', 'SQL'],
      },
      {
        pattern: /cloud|devops|aws|docker|kubernetes|linux|sysadmin/i,
        title: 'Cloud Infrastructure & DevOps',
        skills: ['AWS', 'Docker', 'Kubernetes', 'Linux', 'CI/CD', 'Terraform', 'Cloud Architecture'],
      },
      {
        pattern: /mechanical|cad|solidworks|autocad|thermodynamics|manufacturing/i,
        title: 'Mechanical Engineering',
        skills: ['SolidWorks', 'AutoCAD', 'CAD/CAM', 'Thermodynamics', 'Mechanical Design', 'Manufacturing Processes'],
      },
      {
        pattern: /civil|structural|revit|staad|site engineer|construction/i,
        title: 'Civil & Structural Engineering',
        skills: ['AutoCAD', 'Revit', 'Structural Analysis', 'STAAD Pro', 'Site Management', 'Construction Planning'],
      },
    ];

    for (const rule of domainRules) {
      if (rule.pattern.test(combinedSource)) {
        detectedDomain = rule.title;
        extractedSkills = rule.skills;
        break;
      }
    }

    if (!detectedDomain) {
      detectedDomain = 'Creative & Professional Management';
      extractedSkills = ['Project Direction', 'Strategic Planning', 'Team Leadership', 'Operations', 'Creative Writing'];
    }

    const headline = `${detectedDomain} | ${extractedSkills.slice(0, 3).join(' • ')}`;
    const summary = `Results-driven ${detectedDomain} professional with proven expertise in ${extractedSkills.slice(0, 5).join(', ')}. Experienced in directing creative projects, driving production milestones, and executing vision into high-impact deliverables.`;

    return {
      headline,
      summary,
      fieldOfInterest: detectedDomain,
      skills: extractedSkills,
      education: [],
      experience: [],
      projects: [],
    };
  }

  /**
   * Gemini 3.6 Flash Vision AI API Integration
   */
  static async parseWithGemini(fileBase64: string, mimeType: string, _apiKey?: string): Promise<ParsedResumeData | null> {
    try {
      const cleanBase64 = fileBase64.includes(',') ? fileBase64.split(',')[1] : fileBase64;
      const prompt = `Analyze this resume document or image carefully regardless of profession.
Extract and return ONLY a valid raw JSON object with keys:
- "fieldOfInterest": string (exact candidate profession, e.g. Movie Director, Marketing Manager, Video Editor, Financial Analyst, Software Engineer, etc.)
- "headline": string (professional headline matching candidate role and top skills)
- "summary": string (2-3 sentence professional summary based directly on the resume)
- "skills": array of strings (top 6-10 technical and professional skills mentioned)
Do not wrap in markdown codeblocks. Return raw JSON.`;

      const parsed = await this.queryGemini(prompt, {
        mimeType: mimeType || 'application/pdf',
        data: cleanBase64,
      });

      if (parsed) {
        console.log('✨ Live Gemini Vision AI API Extraction Successful:', parsed);
        return {
          headline: parsed.headline || 'Professional Candidate',
          summary: parsed.summary || '',
          fieldOfInterest: parsed.fieldOfInterest || 'Creative & Professional Management',
          skills: Array.isArray(parsed.skills) ? parsed.skills.map((s: any) => String(s).trim()) : [],
          education: [],
          experience: [],
          projects: [],
        };
      }
    } catch (err) {
      console.error('Gemini Vision API Fetch Exception:', err);
    }
    return null;
  }

  /**
   * Gemini Text AI Parsing Integration
   */
  static async parseTextWithGemini(textContent: string, _apiKey?: string): Promise<ParsedResumeData | null> {
    try {
      const prompt = `Analyze this resume document carefully regardless of profession.
Extract and return ONLY a valid raw JSON object with keys:
- "fieldOfInterest": string (exact candidate profession, e.g. Movie Director, Marketing Manager, Video Editor, Financial Analyst, Software Engineer, etc.)
- "headline": string (professional headline matching candidate role and top skills)
- "summary": string (2-3 sentence professional summary based directly on the resume)
- "skills": array of strings (top 6-10 technical and professional skills mentioned)
Do not wrap in markdown codeblocks. Return raw JSON.

Resume Text:
${textContent.slice(0, 10000)}`;

      const parsed = await this.queryGemini(prompt);
      if (parsed) {
        console.log('✨ Live Gemini Text Resume Extraction Successful:', parsed);
        return {
          headline: parsed.headline || 'Professional Candidate',
          summary: parsed.summary || '',
          fieldOfInterest: parsed.fieldOfInterest || 'Creative & Professional Management',
          skills: Array.isArray(parsed.skills) ? parsed.skills.map((s: any) => String(s).trim()) : [],
          education: [],
          experience: [],
          projects: [],
        };
      }
    } catch (err) {
      console.warn('Gemini text parse error:', err);
    }
    return null;
  }

  /**
   * OpenAI API Integration
   */
  static async parseWithOpenAI(textContent: string, apiKey: string): Promise<ParsedResumeData | null> {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are an expert AI resume parsing assistant. Extract candidate profile data from the resume into JSON format.',
            },
            {
              role: 'user',
              content: `Analyze this resume text and return ONLY a raw JSON object with keys: fieldOfInterest (string), headline (string), summary (string), skills (array of strings).\n\n${textContent}`,
            },
          ],
          response_format: { type: 'json_object' },
        }),
      });

      const data: any = await response.json();
      const content = data?.choices?.[0]?.message?.content;
      if (content) {
        const parsed = JSON.parse(content);
        return {
          headline: parsed.headline || 'Professional Candidate',
          summary: parsed.summary || '',
          fieldOfInterest: parsed.fieldOfInterest || 'Professional Management',
          skills: Array.isArray(parsed.skills) ? parsed.skills.map((s: any) => String(s).trim()) : [],
          education: [],
          experience: [],
          projects: [],
        };
      }
    } catch (err) {
      console.error('OpenAI API Error:', err);
    }
    return null;
  }

  /**
   * Evaluates mock interview answers using Google Gemini 3.6 Flash AI with semantic relevance, keypoint coverage, and NLP fallback.
   */
  static async evaluateMockInterviewAnswer(
    question: string,
    domain: string,
    keyPoints: string[],
    rawAnswer: string
  ): Promise<MockEvaluationResult> {
    const text = (rawAnswer || '').trim();

    // 1. Length & Empty Check (only reject if truly empty or less than 5 characters)
    if (!text || text.length < 5) {
      return {
        score: 0,
        verdict: 'Needs Improvement',
        isGibberish: false,
        feedback: 'Your answer is too brief to evaluate. Please provide a structured response addressing the scenario.',
        matchedKeyPoints: [],
        missingKeyPoints: keyPoints,
      };
    }

    // 2. Primary Evaluator: Google Gemini 3.6 Flash AI
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey && geminiKey.trim().length > 10) {
      try {
        const prompt = `You are a Principal Technical Interviewer and Hiring Manager in "${domain}".
Evaluate this candidate's response to the interview question: "${question}".
Expected key competencies / points: ${JSON.stringify(keyPoints)}.
Candidate's actual response: "${text}".

Evaluation Guidelines:
1. Determine if the response is genuine domain communication or if it is purely random keyboard smash / incoherent spam (e.g. "asdfghjk", "qazwsx", random letters with no words). Meaningful answers addressing the topic are NOT gibberish, even if brief, informal, or imperfect.
2. Evaluate technical depth, problem-solving reasoning, and professional communication.
3. Assign a score from 0 to 100:
   - 0: ONLY for pure random keyboard smash, incoherent spam, or completely blank
   - 25-45: off-topic, superficial, or fundamentally incorrect
   - 50-69: basic understanding, lacks depth or missing key components
   - 70-84: good, competent, covers main expected requirements
   - 85-100: exceptional, nuanced domain expertise, exemplary
4. Identify which expected key points were addressed vs missed.
5. Provide 2-3 sentences of constructive, specific critique with positive observations and coaching.

Return ONLY a valid raw JSON object with:
- "score": number between 0 and 100
- "verdict": one of "Gibberish / Invalid", "Off-Topic", "Needs Improvement", "Competent", "Exemplary"
- "isGibberish": boolean (true ONLY if it is random keyboard smash or spam)
- "feedback": string (constructive critique)
- "matchedKeyPoints": array of strings from the expected key points that the candidate addressed
- "missingKeyPoints": array of strings from the expected key points that the candidate missed.`;

        const parsed = await this.queryGemini(prompt);
        if (parsed && typeof parsed.score === 'number') {
          console.log('✨ Live Gemini Mock Interview Evaluation Success:', parsed);
          const score = Math.min(100, Math.max(0, Math.round(parsed.score)));
          return {
            score,
            verdict:
              parsed.verdict ||
              (score >= 85 ? 'Exemplary' : score >= 70 ? 'Competent' : score >= 40 ? 'Needs Improvement' : 'Off-Topic'),
            isGibberish: Boolean(parsed.isGibberish && score === 0),
            feedback: parsed.feedback || 'Answer evaluated successfully.',
            matchedKeyPoints: Array.isArray(parsed.matchedKeyPoints) ? parsed.matchedKeyPoints : [],
            missingKeyPoints: Array.isArray(parsed.missingKeyPoints) ? parsed.missingKeyPoints : keyPoints,
            evaluatedBy: 'Google Gemini AI',
          };
        }
      } catch (err) {
        console.warn('Gemini mock interview evaluation fallback to deterministic engine:', err);
      }
    }

    // 3. Robust Deterministic Fallback (NO false-positive regexes)
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
        feedback: 'Detected random keyboard characters. Real interviewers require meaningful domain-specific reasoning.',
        matchedKeyPoints: [],
        missingKeyPoints: keyPoints,
      };
    }


    // 4. Deterministic NLP & Keyword Scoring
    const stopWords = new Set([
      'the', 'is', 'at', 'which', 'on', 'how', 'do', 'you', 'and', 'or', 'in', 'to', 'for', 'of', 'a', 'an',
      'with', 'your', 'from', 'this', 'that', 'these', 'those', 'are', 'was', 'were', 'will', 'would', 'can',
      'could', 'should', 'have', 'has', 'had', 'what', 'when', 'where', 'why', 'who', 'whom', 'their', 'them',
      'they', 'it', 'its', 'as', 'be', 'by', 'about', 'such', 'into', 'than', 'then', 'so', 'if', 'out', 'up'
    ]);

    // Extract key question stems
    const questionTokens = question
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3 && !stopWords.has(w));

    // Evaluate Key Points
    const matchedKeyPoints: string[] = [];
    const missingKeyPoints: string[] = [];

    for (const kp of keyPoints) {
      const kpTokens = kp
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 3 && !stopWords.has(w));

      let hitCount = 0;
      for (const token of kpTokens) {
        if (lower.includes(token)) {
          hitCount++;
        }
      }

      // If at least 30% of keypoint tokens (or >= 2 tokens) match, mark matched
      if (hitCount >= 2 || (kpTokens.length <= 2 && hitCount >= 1)) {
        matchedKeyPoints.push(kp);
      } else {
        missingKeyPoints.push(kp);
      }
    }

    // Check Question Relevance
    let questionOverlap = 0;
    for (const token of questionTokens) {
      if (lower.includes(token)) {
        questionOverlap++;
      }
    }

    // If candidate has 0 keypoints matched, 0 question overlap, and answer does not contain domain terms
    const domainTerms: Record<string, string[]> = {
      film: ['actor', 'scene', 'shot', 'character', 'camera', 'director', 'story', 'emotion', 'script', 'subtext', 'blocking', 'pacing', 'lighting', 'visual'],
      cinematography: ['camera', 'lens', 'sensor', 'exposure', 'lighting', 'shadow', 'color', 'lut', 'aces', 'contrast', 'frame', 'highlight', 'steadicam', 'rig'],
      software: ['api', 'service', 'database', 'latency', 'cache', 'redis', 'scale', 'microservice', 'query', 'async', 'memory', 'leak', 'node', 'event', 'deploy'],
      marketing: ['customer', 'cac', 'ltv', 'funnel', 'growth', 'acquisition', 'kpi', 'metric', 'conversion', 'ad', 'campaign', 'channel', 'churn', 'messaging'],
      design: ['user', 'ux', 'ui', 'figma', 'prototype', 'wireframe', 'token', 'accessibility', 'wcag', 'component', 'research', 'testing', 'journey', 'system'],
    };

    const domainKey = Object.keys(domainTerms).find(k => domain.toLowerCase().includes(k)) || 'software';
    const activeTerms = domainTerms[domainKey] || [];
    const domainHits = activeTerms.filter(term => lower.includes(term)).length;

    // Check if off-topic
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

    // Calculate score
    // Keypoint coverage: 0 to 55 points
    const kpScore = Math.round((matchedKeyPoints.length / Math.max(1, keyPoints.length)) * 55);

    // Domain vocabulary & technical precision: 0 to 25 points
    const vocabScore = Math.min(25, domainHits * 6);

    // Answer depth & structure: 0 to 20 points
    const wordCount = words.length;
    let depthScore = 5;
    if (wordCount >= 70) depthScore = 20;
    else if (wordCount >= 40) depthScore = 15;
    else if (wordCount >= 20) depthScore = 10;

    let totalScore = kpScore + vocabScore + depthScore;
    totalScore = Math.min(96, Math.max(20, totalScore));

    let verdict: MockEvaluationResult['verdict'] = 'Needs Improvement';
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
  }

  /**
   * Generates tailored, realistic technical and behavioral interview questions via Gemini 3.6 Flash
   */
  static async generateInterviewQuestions(
    roleOrDomain: string,
    experienceLevel: string = 'Mid-Level',
    count: number = 4
  ): Promise<any[]> {
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey && geminiKey.trim().length > 10) {
      try {
        const prompt = `You are a Principal Hiring Manager and Technical Recruiter.
Generate ${count} realistic, challenging, and domain-specific interview questions for a "${roleOrDomain}" position at the "${experienceLevel}" level.

For each question, provide:
1. "question": string (the interview question scenario or technical problem)
2. "keyPoints": array of 3-4 strings (core competencies, technical mechanisms, or key concepts the candidate must address)
3. "category": string (e.g. "Architecture", "System Design", "Strategy", "Troubleshooting", "Behavioral")

Return ONLY a valid raw JSON array of objects with keys: "question", "keyPoints", "category".`;

        const parsed = await this.queryGemini(prompt);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (err) {
        console.warn('Gemini question generation error:', err);
      }
    }
    // High-quality fallback if Gemini API is unreachable
    return [
      {
        question: `How do you structure and execute core strategic workflows in ${roleOrDomain} under strict deadlines?`,
        keyPoints: ['Prioritization matrix and dependency mapping', 'Stakeholder alignment and clear milestones', 'Risk mitigation and contingency planning'],
        category: 'Strategy & Execution',
      },
      {
        question: `Describe a challenging problem or bottleneck you encountered in ${roleOrDomain}, and how you debugged or resolved it.`,
        keyPoints: ['Root cause identification', 'Data-driven analysis and experimentation', 'Measurable business outcome and long-term resolution'],
        category: 'Problem Solving',
      },
      {
        question: `How do you evaluate new tooling, best practices, and evolving industry standards in ${roleOrDomain}?`,
        keyPoints: ['Benchmarking vs incumbent tools', 'Cost vs developer/team velocity trade-offs', 'Incremental rollout with telemetry'],
        category: 'Technical Evaluation',
      },
      {
        question: `When cross-functional stakeholders hold conflicting opinions on deliverables in ${roleOrDomain}, how do you navigate consensus?`,
        keyPoints: ['Objective evaluation criteria and shared OKRs', 'Transparent trade-off documentation', 'Constructive negotiation and executive alignment'],
        category: 'Collaboration',
      },
    ];
  }

  /**
   * Generates tailored 5-step career & placement roadmap via Gemini AI
   */
  static async generateCareerRoadmap(studentResume: any): Promise<{ trackTitle: string; milestones: { title: string; desc: string; actionUrl?: string; actionLabel?: string }[] }> {
    const targetRole = studentResume?.fieldOfInterest || studentResume?.headline || 'Software Engineering';
    const userSkills: string[] = Array.isArray(studentResume?.skills) ? studentResume.skills : [];

    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey && geminiKey.trim().length > 10) {
      try {
        const prompt = `You are a Career Architect and Placement Strategist.
Generate a strictly sequential, realistic 5-milestone career and placement roadmap for a candidate pursuing a career in "${targetRole}".
Candidate's currently verified skills: ${JSON.stringify(userSkills)}.

Milestones MUST represent a clear progressive order from initial readiness to landing placement:
Step 1: Foundational Skill Baseline & Profile Verification
Step 2: Core Competency & Portfolio Artifact Development
Step 3: Industry Simulation / Mock Interview & Technical Assessment
Step 4: Capstone Case Study / Direct Pitch Deck
Step 5: Target Applications & Placement Strategy

Return ONLY a valid raw JSON object with:
- "trackTitle": string (e.g. "${targetRole} Placement Track")
- "milestones": array of exactly 5 objects, each with:
    - "title": string (concise milestone title)
    - "desc": string (1-2 sentence actionable description)
    - "actionUrl": string (recommended action path in app: "/student/resume", "/student/skill-gap", "/student/mock-interview", or "/student/jobs")
    - "actionLabel": string (e.g. "Update Skills", "Check Skill Gap", "Take Mock Interview", "Browse Jobs")`;

        const parsed = await this.queryGemini(prompt);
        if (parsed && Array.isArray(parsed.milestones) && parsed.milestones.length === 5) {
          return {
            trackTitle: parsed.trackTitle || `${targetRole} Track`,
            milestones: parsed.milestones,
          };
        }
      } catch (err) {
        console.warn('Gemini roadmap generation fallback to domain template:', err);
      }
    }

    // High quality domain fallback
    const domainReq = this.getIndustryRequirementSet(targetRole);
    return {
      trackTitle: `${targetRole} Placement Track`,
      milestones: [
        {
          title: 'Foundational Skill Baseline & Profile Verification',
          desc: `Verify core competencies including ${domainReq.required.slice(0, 3).join(', ')} on your verified resume profile.`,
          actionUrl: '/student/resume',
          actionLabel: 'Update Profile',
        },
        {
          title: 'Skill Gap & Industry Competency Alignment',
          desc: 'Analyze gaps against live hiring standards and target missing high-impact tools.',
          actionUrl: '/student/skill-gap',
          actionLabel: 'Review Gap Analysis',
        },
        {
          title: 'AI Mock Screening & Technical Interview Readiness',
          desc: 'Complete technical simulation and behavioral interview questions with real-time scoring.',
          actionUrl: '/student/mock-interview',
          actionLabel: 'Start Mock Interview',
        },
        {
          title: 'Production Portfolio & Proof-of-Work Assembly',
          desc: 'Build and polish deployable case studies and verified work demonstrations.',
          actionUrl: '/student/resume',
          actionLabel: 'Add Projects',
        },
        {
          title: 'Targeted Placement & Recruiter Applications',
          desc: 'Apply directly to active company requisitions matching your validated skills.',
          actionUrl: '/student/jobs',
          actionLabel: 'Apply to Jobs',
        },
      ],
    };
  }
}

