import crypto from 'crypto';
import { logger } from '../utils/logger.js';
import { db, Collections } from '../config/firebase.js';

export interface CandidateProfessionalIdentity {
  primaryProfession: string;
  functionalDiscipline: string;
  coreCompetencies: string[];
  transferableSkills: string[];
  experienceLevel: string;
  summaryContext: string;
}

export interface JobProfessionalProfile {
  jobId: string;
  title: string;
  company: string;
  functionalRole: string;
  employerIndustry: string;
  keyResponsibilities: string[];
  requiredCompetencies: string[];
  seniorityLevel: string;
  isCrossIndustryOpportunity: boolean;
}

export interface CompatibilityEvaluation {
  jobId: string;
  jobTitle: string;
  company: string;
  compatibilityScore: number;
  functionalAlignment: number;
  competencyCoverage: number;
  isCompatible: boolean;
  matchedSkills: string[];
  missingSkills: string[];
  transferableSkills: string[];
  matchReason: string;
}

export interface CandidateProfileData {
  studentId?: string;
  headline?: string;
  fieldOfInterest?: string;
  summary?: string;
  skills?: string[];
  experience?: any[];
  education?: any[];
}

export interface JobOpportunityData {
  id?: string;
  title: string;
  company: string;
  description?: string;
  requirements?: string[];
  skillsRequired?: string[];
}

// High-speed in-memory LRU cache for job semantic classifications (TTL: 24 hours)
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}
const jobProfileCache = new Map<string, CacheEntry<JobProfessionalProfile>>();
const candidateProfileCache = new Map<string, CacheEntry<CandidateProfessionalIdentity>>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export class UniversalJobMatchingService {
  /**
   * Gemini Multi-Model API Query Helper with Automatic Failover
   */
  private static async queryGemini(prompt: string): Promise<any | null> {
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey || geminiKey.trim().length < 10) return null;

    const models = [
      'gemini-2.0-flash',
      'gemini-1.5-flash',
      'gemini-1.5-pro',
    ];

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
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                responseMimeType: 'application/json',
                temperature: 0.1,
              },
            }),
            signal: AbortSignal.timeout(5000),
          }
        );

        if (response.ok) {
          const data: any = await response.json();
          const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            try {
              return JSON.parse(rawText);
            } catch {
              const jsonMatch = rawText.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
              if (jsonMatch) return JSON.parse(jsonMatch[0]);
            }
          }
        }
      } catch (err: any) {
        logger.warn(`UniversalMatcher Gemini (${model}) request exception:`, err?.message || err);
      }
    }
    return null;
  }

  /**
   * 1. CANDIDATE UNDERSTANDING:
   * Dynamically analyze candidate credentials, experience, education, and skills.
   * Understands ANY profession (e.g. Marine Biologist, Archaeologist, Fashion Designer, Pilot, Full Stack Dev).
   * Never forces or defaults to software engineering unless that is the candidate's actual profession.
   */
  static async analyzeCandidateProfile(candidateData: {
    studentId?: string;
    headline?: string;
    fieldOfInterest?: string;
    summary?: string;
    skills?: string[];
    experience?: any[];
    education?: any[];
  }): Promise<CandidateProfessionalIdentity> {
    const cacheKey = candidateData.studentId || 
      crypto.createHash('sha256')
        .update(`${candidateData.headline || ''}|${candidateData.fieldOfInterest || ''}|${(candidateData.skills || []).join(',')}`)
        .digest('hex');

    const cached = candidateProfileCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    const headline = candidateData.headline || '';
    const fieldOfInterest = candidateData.fieldOfInterest || '';
    const summary = candidateData.summary || '';
    const skills = Array.isArray(candidateData.skills) ? candidateData.skills : [];
    const experienceTitles = (candidateData.experience || []).map((e: any) => e.title || e.role).filter(Boolean);
    const educationFields = (candidateData.education || []).map((ed: any) => `${ed.degree || ''} in ${ed.fieldOfStudy || ''}`).filter(Boolean);

    // AI Semantic Extraction
    const prompt = `You are a Universal Career Intelligence and Professional Identity Engine.
Analyze the following candidate's profile and identify their GENUINE professional identity, functional discipline, and core capabilities.
CRITICAL MANDATE:
- Support ANY profession under the sun, including specialized, non-tech, emerging, creative, academic, or traditional fields (e.g. Marine Biologist, Fashion Designer, Archaeologist, Commercial Pilot, Sommelier, Civil Engineer, Full Stack Developer, Biochemist, Sound Designer, etc.).
- DO NOT default to Software Engineer or Computer Science if the person is in a different profession.
- Extract what functional work they actually perform and their core discipline.

Candidate Input:
Headline: "${headline}"
Field of Interest / Stated Domain: "${fieldOfInterest}"
Professional Summary: "${summary}"
Skills Listed: ${JSON.stringify(skills)}
Recent Job Titles / Experience: ${JSON.stringify(experienceTitles)}
Education Background: ${JSON.stringify(educationFields)}

Return ONLY a valid JSON object matching this schema:
{
  "primaryProfession": "string (the canonical job title / profession, e.g. Marine Biologist, Full Stack Developer, Commercial Pilot, Fashion Designer, Archaeologist)",
  "functionalDiscipline": "string (the underlying functional domain, e.g. Marine Science & Aquatic Ecology, Software Engineering, Aviation Flight Operations, Apparel & Fashion Design, Archaeology & Heritage)",
  "coreCompetencies": ["string (top 5-8 verified domain-specific skills and techniques)"],
  "transferableSkills": ["string (domain-agnostic skills like GIS, Project Management, Data Analysis, Quality Control)"],
  "experienceLevel": "string ('Entry-Level' | 'Mid-Level' | 'Senior' | 'Lead')",
  "summaryContext": "string (1 concise sentence summarizing their functional capabilities)"
}`;

    let result: CandidateProfessionalIdentity | null = null;
    try {
      const parsed = await this.queryGemini(prompt);
      if (parsed && parsed.primaryProfession && parsed.functionalDiscipline) {
        result = {
          primaryProfession: parsed.primaryProfession.trim(),
          functionalDiscipline: parsed.functionalDiscipline.trim(),
          coreCompetencies: Array.isArray(parsed.coreCompetencies) && parsed.coreCompetencies.length > 0 
            ? parsed.coreCompetencies 
            : skills,
          transferableSkills: Array.isArray(parsed.transferableSkills) ? parsed.transferableSkills : [],
          experienceLevel: parsed.experienceLevel || 'Mid-Level',
          summaryContext: parsed.summaryContext || `${parsed.primaryProfession} specializing in ${parsed.functionalDiscipline}`,
        };
      }
    } catch (err) {
      logger.warn('Gemini candidate analysis fallback to semantic NLP engine:', err);
    }

    // Dynamic Deterministic Fallback (NLP-based, ZERO hardcoded professions)
    if (!result) {
      result = this.deterministicCandidateAnalysis(headline, fieldOfInterest, summary, skills, experienceTitles, educationFields);
    }

    candidateProfileCache.set(cacheKey, { data: result, expiresAt: Date.now() + CACHE_TTL_MS });
    return result;
  }

  /**
   * Deterministic semantic candidate analysis when AI is offline.
   * Derives profession dynamically from candidate inputs without any fixed profession list.
   */
  private static deterministicCandidateAnalysis(
    headline: string,
    fieldOfInterest: string,
    summary: string,
    skills: string[],
    experienceTitles: string[],
    educationFields: string[]
  ): CandidateProfessionalIdentity {
    // 1. Identify primary profession candidate expresses
    let rawProfession = fieldOfInterest || headline || experienceTitles[0] || educationFields[0] || 'Professional Specialist';
    // Clean separators like '|', '-', '•', '@'
    const parts = rawProfession.split(/[|•\-–—@,]/).map((p) => p.trim()).filter(Boolean);
    const primaryProfession = parts[0] || rawProfession;

    // 2. Identify functional discipline
    const functionalDiscipline = fieldOfInterest && fieldOfInterest !== primaryProfession
      ? fieldOfInterest
      : `${primaryProfession} Practice`;

    // 3. Separate transferable from domain-specific competencies
    const commonTransferable = new Set([
      'communication', 'team leadership', 'project management', 'problem solving',
      'data analysis', 'strategic planning', 'research', 'critical thinking', 'gis'
    ]);

    const core: string[] = [];
    const transferable: string[] = [];

    skills.forEach((s) => {
      if (commonTransferable.has(s.toLowerCase().trim())) {
        transferable.push(s);
      } else {
        core.push(s);
      }
    });

    const finalCore = core.length > 0 ? core : skills.slice(0, 6);
    const finalTransferable = transferable.length > 0 ? transferable : ['Domain Analysis', 'Project Execution', 'Professional Standards'];

    return {
      primaryProfession,
      functionalDiscipline,
      coreCompetencies: finalCore,
      transferableSkills: finalTransferable,
      experienceLevel: experienceTitles.length > 2 ? 'Senior' : experienceTitles.length > 0 ? 'Mid-Level' : 'Entry-Level',
      summaryContext: `${primaryProfession} professional qualified in ${functionalDiscipline} with verified competencies in ${finalCore.slice(0, 3).join(', ')}.`,
    };
  }

  /**
   * 2. JOB UNDERSTANDING & CLASSIFICATION:
   * Analyzes job title, description, employer, and requirements.
   * Distinguishes between what work is actually done (functionalRole) vs what the employer does (employerIndustry).
   * E.g., A film studio hiring a Full Stack Developer has functionalRole = "Software Engineering" and employerIndustry = "Entertainment".
   * Results are strictly cached to minimize AI API calls.
   */
  static async analyzeJobOpportunity(jobData: {
    id?: string;
    title: string;
    company: string;
    description?: string;
    requirements?: string[];
    skillsRequired?: string[];
  }): Promise<JobProfessionalProfile> {
    const title = jobData.title || 'Professional Role';
    const company = jobData.company || 'Employer';
    const description = jobData.description || '';
    const requirements = Array.isArray(jobData.requirements) ? jobData.requirements : [];
    const skillsRequired = Array.isArray(jobData.skillsRequired) ? jobData.skillsRequired : [];
    const combinedSkills = Array.from(new Set([...requirements, ...skillsRequired]));

    const cacheKey = jobData.id || 
      crypto.createHash('sha256')
        .update(`${title}|${company}|${combinedSkills.join(',')}|${description.slice(0, 200)}`)
        .digest('hex');

    const cached = jobProfileCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    // Check persistent Firestore cache if available
    try {
      if (db) {
        const docRef = db.collection('job_semantic_cache').doc(cacheKey);
        const docSnap = await docRef.get();
        if (docSnap.exists) {
          const cachedDoc = docSnap.data() as JobProfessionalProfile;
          jobProfileCache.set(cacheKey, { data: cachedDoc, expiresAt: Date.now() + CACHE_TTL_MS });
          return cachedDoc;
        }
      }
    } catch {
      // Non-fatal if Firestore cache is not configured
    }

    const prompt = `You are a Universal Job Classification Engine.
Analyze this job opportunity to understand the ACTUAL WORK the candidate will perform and the employer's industry.
CRITICAL INSTRUCTIONS:
- Distinguish between the FUNCTIONAL NATURE OF THE WORK and the EMPLOYER'S INDUSTRY.
  * Example: If "Dharma Productions" (Film Studio) advertises "Full Stack Developer", the functionalRole is "Full Stack Web Development / Software Engineering", while the employerIndustry is "Media & Entertainment".
  * Example: If "Dharma Productions" advertises "Film Director", the functionalRole is "Film & Creative Direction", while employerIndustry is "Media & Entertainment".
  * Example: If "Shell" (Energy) advertises "Marine Ecologist", the functionalRole is "Marine Ecology & Environmental Science", while employerIndustry is "Energy & Resources".
  * Example: If "IndiGo" advertises "Commercial Airline Pilot", the functionalRole is "Commercial Aviation Flight Operations", while employerIndustry is "Airlines & Transportation".
  * Example: If "L&T" (Construction) advertises "Staff Archaeologist", the functionalRole is "Archaeological Survey & Heritage Mitigation", while employerIndustry is "Construction & Infrastructure".
- DO NOT assume a job is in software development unless the actual job title and duties involve software/IT.
- Support ANY job role across any sector.

Job Title: "${title}"
Employer Company: "${company}"
Job Description: "${description.slice(0, 1000)}"
Skills & Requirements: ${JSON.stringify(combinedSkills)}

Return ONLY a valid JSON object matching this schema:
{
  "functionalRole": "string (the actual work being performed, e.g. Full Stack Web Development, Marine Ecology Research, Film Direction, Archaeological Excavation, Airline Flight Operations, Haute Couture Design)",
  "employerIndustry": "string (the company's business domain, e.g. Media & Entertainment, Energy, Healthcare, Aerospace, Hospitality, Construction)",
  "keyResponsibilities": ["string (2-3 concise bullet points summarizing actual daily tasks)"],
  "requiredCompetencies": ["string (top 5-8 essential skills/competencies required to perform this work)"],
  "seniorityLevel": "string ('Entry-Level' | 'Mid-Level' | 'Senior' | 'Lead' | 'Executive')",
  "isCrossIndustryOpportunity": boolean (true if the functionalRole is an internal specialized service like IT, Legal, Finance, Environmental or Design within a company whose primary product is different)
}`;

    let profile: JobProfessionalProfile | null = null;
    try {
      const parsed = await this.queryGemini(prompt);
      if (parsed && parsed.functionalRole && parsed.employerIndustry) {
        profile = {
          jobId: jobData.id || cacheKey,
          title,
          company,
          functionalRole: parsed.functionalRole.trim(),
          employerIndustry: parsed.employerIndustry.trim(),
          keyResponsibilities: Array.isArray(parsed.keyResponsibilities) ? parsed.keyResponsibilities : [],
          requiredCompetencies: Array.isArray(parsed.requiredCompetencies) && parsed.requiredCompetencies.length > 0 
            ? parsed.requiredCompetencies 
            : combinedSkills,
          seniorityLevel: parsed.seniorityLevel || 'Mid-Level',
          isCrossIndustryOpportunity: Boolean(parsed.isCrossIndustryOpportunity),
        };
      }
    } catch (err) {
      logger.warn('Gemini job analysis fallback to semantic NLP engine:', err);
    }

    if (!profile) {
      profile = this.deterministicJobAnalysis(jobData.id || cacheKey, title, company, description, combinedSkills);
    }

    // Persist to memory and Firestore cache
    jobProfileCache.set(cacheKey, { data: profile, expiresAt: Date.now() + CACHE_TTL_MS });
    try {
      if (db) {
        await db.collection('job_semantic_cache').doc(cacheKey).set(profile, { merge: true });
      }
    } catch {
      // Non-fatal
    }

    return profile;
  }

  /**
   * Deterministic semantic job analysis when AI is offline.
   * Decouples the functional job title from the company without hardcoded restrictions.
   */
  private static deterministicJobAnalysis(
    jobId: string,
    title: string,
    company: string,
    description: string,
    combinedSkills: string[]
  ): JobProfessionalProfile {
    // Dynamic functional role directly from title
    const functionalRole = title;
    
    // Infer employer industry dynamically from company hints or default to general corporate enterprise
    let employerIndustry = 'Enterprise Services';
    const compLower = company.toLowerCase();
    if (compLower.includes('film') || compLower.includes('production') || compLower.includes('entertainment') || compLower.includes('media') || compLower.includes('studios')) {
      employerIndustry = 'Media & Entertainment';
    } else if (compLower.includes('health') || compLower.includes('hospital') || compLower.includes('pharma') || compLower.includes('clinic')) {
      employerIndustry = 'Healthcare & Life Sciences';
    } else if (compLower.includes('air') || compLower.includes('aviation') || compLower.includes('aero')) {
      employerIndustry = 'Aviation & Aerospace';
    } else if (compLower.includes('energy') || compLower.includes('petroleum') || compLower.includes('oil') || compLower.includes('solar')) {
      employerIndustry = 'Energy & Natural Resources';
    } else if (compLower.includes('construct') || compLower.includes('infra') || compLower.includes('build')) {
      employerIndustry = 'Infrastructure & Construction';
    } else if (compLower.includes('tech') || compLower.includes('software') || compLower.includes('digital') || compLower.includes('systems') || compLower.includes('solutions')) {
      employerIndustry = 'Technology & Software';
    } else if (compLower.includes('fashion') || compLower.includes('apparel') || compLower.includes('couture') || compLower.includes('wear')) {
      employerIndustry = 'Fashion & Apparel';
    }

    const titleWords = title.toLowerCase().split(/\s+/);
    const isCrossIndustry = (employerIndustry !== 'Technology & Software') && 
      titleWords.some(w => ['developer', 'engineer', 'analyst', 'designer', 'accountant', 'counsel', 'specialist'].includes(w));

    return {
      jobId,
      title,
      company,
      functionalRole,
      employerIndustry,
      keyResponsibilities: [
        `Execute primary duties and functional workflows as ${title}.`,
        `Collaborate with stakeholders and drive key deliverables at ${company}.`,
      ],
      requiredCompetencies: combinedSkills.length > 0 ? combinedSkills : [title, 'Core Execution', 'Industry Standards'],
      seniorityLevel: title.toLowerCase().includes('senior') || title.toLowerCase().includes('lead') ? 'Senior' : 'Mid-Level',
      isCrossIndustryOpportunity: isCrossIndustry,
    };
  }

  /**
   * 3. INTELLIGENT COMPATIBILITY & MATCHING:
   * Compares candidate's capabilities & career interests against actual job responsibilities.
   *
   * KEY INVARIANT:
   * A company is NEVER rejected simply because of its industry. (e.g. A film studio can hire a software developer).
   * BUT a candidate is NEVER recommended an unrelated job role simply because of company keywords. (e.g. A software developer is NOT matched to a Film Director role).
   */
  static async evaluateCompatibility(
    candidate: CandidateProfessionalIdentity,
    job: JobProfessionalProfile
  ): Promise<CompatibilityEvaluation> {
    const candidateSkillsLower = Array.from(
      new Set([
        ...candidate.coreCompetencies.map((s) => s.toLowerCase().trim()),
        ...candidate.transferableSkills.map((s) => s.toLowerCase().trim()),
      ])
    );

    const jobSkills = job.requiredCompetencies.length > 0 
      ? job.requiredCompetencies 
      : [job.functionalRole, 'Domain Execution'];

    // 1. Compute Functional Alignment (0 to 100)
    // Compares candidate's functional discipline & primary profession against JOB'S FUNCTIONAL ROLE (not the company's industry!)
    const candProfLower = candidate.primaryProfession.toLowerCase();
    const candDiscLower = candidate.functionalDiscipline.toLowerCase();
    const jobRoleLower = job.functionalRole.toLowerCase();
    const jobTitleLower = job.title.toLowerCase();

    // Tokenize functional roles (removing generic noise words)
    const stopWords = new Set(['and', 'or', 'the', 'of', 'in', 'at', 'for', 'with', 'a', 'an', '&', '/', '-', 'lead', 'senior', 'junior', 'associate', 'head', 'specialist', 'manager']);
    const getTokens = (str: string) => str.toLowerCase().split(/[\s,/_—–-]+/).filter(t => t.length > 2 && !stopWords.has(t));

    // Dynamic morphological stemmer to bridge term variations (e.g. archaeology <-> archaeologist, aviation <-> aviator)
    const stem = (word: string) => {
      return word
        .replace(/(ology|ologist|ological)$/, '')
        .replace(/(ation|ator|ative|ating)$/, '')
        .replace(/(ment|mental)$/, '')
        .replace(/(ing|ed|es|s)$/, '')
        .replace(/(er|ers|or|ors)$/, '')
        .replace(/(ic|ical)$/, '');
    };

    const candRoleTokens = Array.from(new Set([
      ...getTokens(candProfLower),
      ...getTokens(candDiscLower),
      ...getTokens(candidate.summaryContext || '')
    ]));
    const jobTokens = Array.from(new Set([...getTokens(jobRoleLower), ...getTokens(jobTitleLower)]));

    const matchesToken = (t1: string, t2: string) => {
      if (t1 === t2) return true;
      if (t1.includes(t2) || t2.includes(t1)) return true;
      const s1 = stem(t1);
      const s2 = stem(t2);
      if (s1.length >= 4 && s2.length >= 4 && (s1 === s2 || s1.startsWith(s2) || s2.startsWith(s1))) return true;
      if (t1.length >= 5 && t2.length >= 5 && (t1.startsWith(t2.slice(0, 5)) || t2.startsWith(t1.slice(0, 5)))) return true;
      return false;
    };

    const sharedTokens = candRoleTokens.filter(ct => jobTokens.some(jt => matchesToken(ct, jt)));
    let functionalAlignment = 0;

    if (sharedTokens.length > 0) {
      functionalAlignment = Math.min(100, Math.round((sharedTokens.length / Math.max(candRoleTokens.length, jobTokens.length)) * 120));
      if (functionalAlignment < 65) functionalAlignment = 70;
    }

    // Direct substring match
    if (jobRoleLower.includes(candProfLower) || candProfLower.includes(jobRoleLower) ||
        jobTitleLower.includes(candProfLower) || candProfLower.includes(jobTitleLower)) {
      functionalAlignment = Math.max(functionalAlignment, 90);
    }

    // 2. Compute Competency & Skill Match
    const matchedSkills: string[] = [];
    const missingSkills: string[] = [];
    const transferableSkills: string[] = [];

    jobSkills.forEach((reqSkill) => {
      const reqLower = reqSkill.toLowerCase().trim();
      const hasDirectSkill = candidateSkillsLower.some(cs => 
        cs.includes(reqLower) || 
        reqLower.includes(cs) ||
        reqLower.split(/\s+/).filter(w => w.length > 3).some(w => cs.includes(w))
      );

      if (hasDirectSkill) {
        matchedSkills.push(reqSkill);
      } else {
        // Check if candidate has a transferable equivalent
        const isTransferableMatch = candidate.transferableSkills.some(ts => {
          const tsLower = ts.toLowerCase();
          return tsLower.includes(reqLower) || reqLower.includes(tsLower);
        });

        if (isTransferableMatch) {
          transferableSkills.push(reqSkill);
        } else {
          missingSkills.push(reqSkill);
        }
      }
    });

    const totalReqCount = Math.max(1, jobSkills.length);
    const directScore = (matchedSkills.length / totalReqCount) * 100;
    const transferableScore = (transferableSkills.length / totalReqCount) * 50;
    const competencyCoverage = Math.min(100, Math.round(directScore + transferableScore));

    // If candidate demonstrates strong direct technical competency match (>50% coverage with 2+ core skills),
    // this directly proves functional alignment across varied nomenclature (e.g. Airline Pilot vs First Officer)
    if (competencyCoverage >= 50 && matchedSkills.length >= 2) {
      functionalAlignment = Math.max(functionalAlignment, Math.min(95, Math.round(competencyCoverage * 0.95)));
    }

    // 3. AI-Assisted Compatibility Refinement if candidate/job have nuanced semantic overlap
    // E.g. "GIS Mapping" in Marine Biology vs Archaeology, or "High-Scale Distributed Systems" in Film Streaming vs Fintech
    if (functionalAlignment === 0 && candidateSkillsLower.length > 0) {
      // Evaluate if there is an underlying discipline bridge via AI or semantic intersection
      const prompt = `You are a Universal Professional Compatibility Judge.
Determine whether a candidate in profession "${candidate.primaryProfession}" (Functional Discipline: "${candidate.functionalDiscipline}") is genuinely compatible with the following job opportunity:
Job Title: "${job.title}"
Functional Work: "${job.functionalRole}"
Employer: "${job.company}" (Industry: "${job.employerIndustry}")
Candidate Skills: ${JSON.stringify(candidate.coreCompetencies.concat(candidate.transferableSkills))}
Job Requirements: ${JSON.stringify(jobSkills)}

RULES:
- A company should NEVER be rejected solely because its industry is different from the candidate's traditional sector (e.g. A hospital or film production company hiring a Full Stack Developer is a 100% VALID MATCH).
- However, if the functional work is completely unrelated (e.g. A Full Stack Developer applying for Film Director, or an Archaeologist applying for Commercial Pilot), functionalAlignment must be VERY LOW (0 to 15) and isCompatible must be FALSE.
- If the role is genuinely compatible, score functionalAlignment (0-100) and provide a concise, factual reason.

Return ONLY a valid JSON:
{
  "functionalAlignment": number (0 to 100),
  "isCompatible": boolean,
  "matchReason": "string (1-2 sentences explaining why this is or is not a match)"
}`;

      try {
        const aiEval = await this.queryGemini(prompt);
        if (aiEval && typeof aiEval.functionalAlignment === 'number') {
          functionalAlignment = Math.min(100, Math.max(0, Math.round(aiEval.functionalAlignment)));
        }
      } catch {
        // Fallback to token metrics
      }
    }

    // 4. Calculate Final Composite Compatibility Score
    // Crucial rule: If functional alignment is below 35%, the overall compatibility score CANNOT exceed 25% (prevents keyword false-positives!)
    let compatibilityScore = 0;
    if (functionalAlignment >= 35) {
      compatibilityScore = Math.min(99, Math.max(30, Math.round((functionalAlignment * 0.55) + (competencyCoverage * 0.45))));
    } else {
      compatibilityScore = Math.min(25, Math.round(functionalAlignment * 0.5));
    }

    const isCompatible = functionalAlignment >= 45 && compatibilityScore >= 45;

    // 5. Generate Dynamic Match Reason
    let matchReason = '';
    if (job.isCrossIndustryOpportunity && isCompatible) {
      matchReason = `Cross-industry opportunity: Your ${candidate.primaryProfession} capabilities match the ${job.functionalRole} functional requirements at ${job.company} (${job.employerIndustry}).`;
    } else if (isCompatible && matchedSkills.length > 0) {
      matchReason = `Strong functional fit: Your verified expertise in ${matchedSkills.slice(0, 3).join(', ')} directly aligns with this ${job.title} role at ${job.company}.`;
    } else if (isCompatible) {
      matchReason = `Direct domain alignment: Your background in ${candidate.functionalDiscipline} provides the core competencies required for ${job.title} at ${job.company}.`;
    } else {
      matchReason = `Functional role mismatch: This position requires ${job.functionalRole} competencies which do not align with your primary profession as a ${candidate.primaryProfession}.`;
    }

    return {
      jobId: job.jobId,
      jobTitle: job.title,
      company: job.company,
      compatibilityScore,
      functionalAlignment,
      competencyCoverage,
      isCompatible,
      matchedSkills,
      missingSkills,
      transferableSkills,
      matchReason,
    };
  }

  /**
   * 4. UNIVERSAL JOB MATCHER:
   * Takes a candidate and any list of jobs (platform DB jobs + external live jobs),
   * analyzes every job dynamically, filters out unrelated disciplines, and returns
   * ranked, compatible opportunities with structured match insights.
   */
  static async matchJobsForCandidate(
    candidateData: {
      studentId?: string;
      headline?: string;
      fieldOfInterest?: string;
      summary?: string;
      skills?: string[];
      experience?: any[];
      education?: any[];
    },
    rawJobs: any[],
    userLat?: number,
    userLng?: number
  ): Promise<{
    candidateIdentity: CandidateProfessionalIdentity;
    matchedJobs: any[];
    incompatibleCount: number;
  }> {
    // 1. Analyze candidate
    const candidateIdentity = await this.analyzeCandidateProfile(candidateData);

    // 2. Analyze all jobs (utilizes caching)
    const evaluatedJobs: any[] = [];
    let incompatibleCount = 0;

    for (const rawJob of rawJobs) {
      try {
        const jobProfile = await this.analyzeJobOpportunity({
          id: rawJob._id?.toString() || rawJob.id,
          title: rawJob.title,
          company: rawJob.company,
          description: rawJob.description || '',
          requirements: rawJob.requirements || rawJob.requiredSkills || [],
          skillsRequired: rawJob.skillsRequired || [],
        });

        // 3. Evaluate multi-dimensional compatibility
        const compatibility = await this.evaluateCompatibility(candidateIdentity, jobProfile);

        if (compatibility.isCompatible) {
          evaluatedJobs.push({
            ...rawJob,
            matchPercentage: compatibility.compatibilityScore,
            atsMatchScore: compatibility.compatibilityScore,
            compatibilityScore: compatibility.compatibilityScore,
            functionalAlignment: compatibility.functionalAlignment,
            competencyCoverage: compatibility.competencyCoverage,
            matchedSkills: compatibility.matchedSkills,
            missingSkills: compatibility.missingSkills,
            transferableSkills: compatibility.transferableSkills,
            matchReason: compatibility.matchReason,
            employerIndustry: jobProfile.employerIndustry,
            functionalRole: jobProfile.functionalRole,
            isCrossIndustry: jobProfile.isCrossIndustryOpportunity,
          });
        } else {
          incompatibleCount++;
        }
      } catch (err) {
        logger.error(`Error matching job "${rawJob.title}":`, err);
      }
    }

    // 4. Sort compatible jobs: highest compatibility score first (or by distance if location provided)
    if (userLat !== undefined && userLng !== undefined && !isNaN(userLat) && !isNaN(userLng)) {
      evaluatedJobs.sort((a, b) => (a.distanceMiles ?? Infinity) - (b.distanceMiles ?? Infinity));
    } else {
      evaluatedJobs.sort((a, b) => b.matchPercentage - a.matchPercentage);
    }

    return {
      candidateIdentity,
      matchedJobs: evaluatedJobs,
      incompatibleCount,
    };
  }
}

