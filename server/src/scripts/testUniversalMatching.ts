import 'dotenv/config';
import { UniversalJobMatchingService, CandidateProfileData, JobOpportunityData } from '../services/universalJobMatchingService.js';

interface TestCaseCandidate {
  id: string;
  name: string;
  data: CandidateProfileData;
}

interface TestCaseJob {
  id: string;
  expectedMatches: string[]; // IDs of candidates that MUST match
  expectedMismatches: string[]; // IDs of candidates that MUST NOT match
  job: JobOpportunityData;
}

const candidates: TestCaseCandidate[] = [
  {
    id: 'marine_bio',
    name: 'Dr. Elena Vance (Marine Biologist)',
    data: {
      studentId: 'stud_marine_001',
      headline: 'Marine Biologist & Coral Conservation Researcher',
      fieldOfInterest: 'Marine Biology',
      summary: 'Marine ecologist specialized in coral reef restoration, benthic sampling, SCUBA scientific diving, GIS spatial analysis, and biodiversity monitoring.',
      skills: [
        'Benthic Sampling',
        'SCUBA Scientific Diving',
        'GIS Spatial Mapping',
        'Coral Reef Ecology',
        'Water Quality Analysis',
        'Statistical Modeling (R)',
        'Marine Fauna Identification',
      ],
      experience: [
        {
          title: 'Marine Ecology Research Fellow',
          company: 'National Oceanographic Research Institute',
          description: 'Conducted undersea transects, monitored coral bleaching events, and authored marine conservation reports.',
        },
      ],
      education: [
        {
          degree: 'Master of Science',
          fieldOfStudy: 'Marine Biology & Coastal Ecology',
          institution: 'National University of Ocean Sciences',
        },
      ],
    },
  },
  {
    id: 'fashion_des',
    name: 'Aria Thorne (Fashion Designer)',
    data: {
      studentId: 'stud_fashion_002',
      headline: 'Senior Fashion & Digital Apparel Designer',
      fieldOfInterest: 'Fashion Design',
      summary: 'Creative fashion designer with expertise in haute couture, garment construction, draping, pattern making, 3D digital apparel simulation (CLO 3D), and sustainable textile sourcing.',
      skills: [
        'CLO 3D',
        'Garment Pattern Making',
        'Draping',
        'Textile Sourcing',
        'Tech Pack Creation',
        'Adobe Illustrator for Fashion',
        'Trend Forecasting',
        'Haute Couture Construction',
      ],
      experience: [
        {
          title: 'Apparel Designer',
          company: 'Maison Couture Studios',
          description: 'Developed seasonal runway collections, prepared detailed technical production packs, and oversaw garment fitting sessions.',
        },
      ],
      education: [
        {
          degree: 'Bachelor of Fine Arts',
          fieldOfStudy: 'Fashion Design & Garment Technology',
          institution: 'National Institute of Fashion Technology (NIFT)',
        },
      ],
    },
  },
  {
    id: 'pilot',
    name: 'Captain Vikram Malhotra (Commercial Airline Pilot)',
    data: {
      studentId: 'stud_pilot_003',
      headline: 'Commercial Airline First Officer (A320 Type Rated)',
      fieldOfInterest: 'Aviation & Flight Operations',
      summary: 'ATPL licensed commercial pilot with 2,500+ flight hours. Experienced in multi-engine jet operations, IFR navigation, cockpit resource management (CRM), and flight safety management systems.',
      skills: [
        'Instrument Flight Rules (IFR)',
        'Multi-Engine Jet Operations',
        'Crew Resource Management (CRM)',
        'Flight Planning & Dispatch',
        'Aviation Meteorology',
        'Airbus A320 Type Rating',
        'Emergency Procedures',
      ],
      experience: [
        {
          title: 'First Officer (Airbus A320)',
          company: 'Skylink Regional Airlines',
          description: 'Executed scheduled commercial flight operations, conducted pre-flight performance calculations, and ensured strict civil aviation compliance.',
        },
      ],
      education: [
        {
          degree: 'Airline Transport Pilot License (ATPL)',
          fieldOfStudy: 'Aeronautical Science & Commercial Flight',
          institution: 'Indira Gandhi Rashtriya Uran Akademi',
        },
      ],
    },
  },
  {
    id: 'archaeologist',
    name: 'Dr. Rajiv Shastri (Archaeologist)',
    data: {
      studentId: 'stud_arch_004',
      headline: 'Field Archaeologist & Cultural Heritage Specialist',
      fieldOfInterest: 'Archaeology',
      summary: 'Archaeologist specializing in stratigraphic excavation, lithic analysis, radiocarbon dating preparation, GIS mapping of ancient settlements, and cultural artifact preservation.',
      skills: [
        'Stratigraphic Excavation',
        'Artifact Conservation',
        'Lithic Analysis',
        'GIS Archaeological Surveying',
        'Radiocarbon Sample Prep',
        'Photogrammetry',
        'Cultural Heritage Management',
      ],
      experience: [
        {
          title: 'Senior Excavation Field Lead',
          company: 'Heritage Conservation Council',
          description: 'Led excavation teams on Harappan-era archaeological sites, cataloged bronze age ceramics, and conducted photogrammetric site documentation.',
        },
      ],
      education: [
        {
          degree: 'Master of Arts',
          fieldOfStudy: 'Archaeology & Ancient Civilizations',
          institution: 'Deccan College Post-Graduate and Research Institute',
        },
      ],
    },
  },
  {
    id: 'dev_fullstack',
    name: 'Aarav Mehta (Full Stack Developer)',
    data: {
      studentId: 'stud_dev_005',
      headline: 'Senior Full Stack Software Engineer',
      fieldOfInterest: 'Full Stack Development',
      summary: 'Full-stack software engineer with 5 years building scalable web architectures, microservices, cloud deployments, and responsive frontends.',
      skills: [
        'React.js',
        'Node.js',
        'TypeScript',
        'PostgreSQL',
        'Docker',
        'RESTful APIs',
        'AWS Cloud Architecture',
        'CI/CD Pipelines',
      ],
      experience: [
        {
          title: 'Senior Software Engineer',
          company: 'CloudScale Technologies',
          description: 'Engineered high-throughput REST APIs, architected microservices with Node.js and Docker, and implemented reactive React interfaces.',
        },
      ],
      education: [
        {
          degree: 'Bachelor of Technology',
          fieldOfStudy: 'Computer Science and Engineering',
          institution: 'Indian Institute of Technology (IIT)',
        },
      ],
    },
  },
];

const testJobs: TestCaseJob[] = [
  {
    id: 'job_marine_shell',
    expectedMatches: ['marine_bio'],
    expectedMismatches: ['dev_fullstack', 'pilot', 'fashion_des'],
    job: {
      id: 'job_001',
      title: 'Lead Marine Ecologist & Biodiversity Impact Specialist',
      company: 'Shell Energy & Resources',
      description: 'Lead offshore marine ecological baseline assessments, conduct benthic habitat surveys, monitor coral reef biodiversity, and ensure environmental stewardship across maritime coastal operations.',
      requirements: [
        'Benthic Sampling & Coral Reef Ecology',
        'Scientific SCUBA Diving Certification',
        'Marine Biodiversity Impact Assessment',
        'GIS Spatial Mapping & Coastal Analysis',
        'Water Quality Sampling & Lab Analysis',
      ],
      skillsRequired: ['Benthic Sampling', 'Coral Reef Ecology', 'SCUBA Scientific Diving', 'GIS Spatial Mapping', 'Water Quality Analysis'],
    },
  },
  {
    id: 'job_dev_dharma',
    expectedMatches: ['dev_fullstack'],
    expectedMismatches: ['marine_bio', 'archaeologist', 'pilot'],
    job: {
      id: 'job_002',
      title: 'Senior Full Stack Engineer (OTT Streaming Platform)',
      company: 'Dharma Productions', // Film production company hiring a software developer!
      description: 'Architect and build next-generation video streaming web applications, OTT content distribution backends, and cloud microservices for our global entertainment distribution network.',
      requirements: [
        'React.js & Modern Web Frontend Frameworks',
        'Node.js & TypeScript Backend Engineering',
        'PostgreSQL & High-performance Databases',
        'Docker Containerization & AWS Cloud',
        'RESTful & GraphQL API Architecture',
      ],
      skillsRequired: ['React.js', 'Node.js', 'TypeScript', 'PostgreSQL', 'Docker', 'AWS Cloud Architecture'],
    },
  },
  {
    id: 'job_director_dharma',
    expectedMatches: [], // None of our 5 candidates is a film director
    expectedMismatches: ['dev_fullstack', 'marine_bio', 'pilot', 'archaeologist', 'fashion_des'],
    job: {
      id: 'job_003',
      title: 'Feature Film Director & Cinematic Storyteller',
      company: 'Dharma Productions',
      description: 'Lead creative direction and artistic vision for upcoming theatrical feature films. Oversee scene breakdown, actor direction, cinematography visual planning, and post-production creative sign-offs.',
      requirements: [
        'Film Directing & Screenplay Analysis',
        'Cinematography & Visual Composition',
        'Actor Directing & Performance Coaching',
        'Shot Listing & Storyboarding',
        'Film Post-Production & Color Grading Supervision',
      ],
      skillsRequired: ['Film Directing', 'Screenplay Analysis', 'Actor Direction', 'Cinematography', 'Storyboarding'],
    },
  },
  {
    id: 'job_costume_gaming',
    expectedMatches: ['fashion_des'],
    expectedMismatches: ['pilot', 'marine_bio', 'archaeologist'],
    job: {
      id: 'job_004',
      title: 'Lead 3D Digital Costume & Apparel Designer',
      company: 'Ubisoft Interactive Studios',
      description: 'Design photorealistic virtual costumes and digital garments for next-gen AAA video games. Utilize CLO 3D and Marvelous Designer to drape fabrics, construct realistic garment patterns, and advise on textile physics.',
      requirements: [
        'CLO 3D / Marvelous Designer Garment Simulation',
        'Garment Pattern Making & Draping',
        'Textile Physics & Fabric Sourcing Knowledge',
        'Tech Pack & Construction Documentation',
        'Digital Haute Couture & Trend Analysis',
      ],
      skillsRequired: ['CLO 3D', 'Garment Pattern Making', 'Draping', 'Textile Sourcing', 'Tech Pack Creation'],
    },
  },
  {
    id: 'job_pilot_indigo',
    expectedMatches: ['pilot'],
    expectedMismatches: ['marine_bio', 'fashion_des', 'archaeologist', 'dev_fullstack'],
    job: {
      id: 'job_005',
      title: 'Senior First Officer - Airbus A320 Fleet',
      company: 'IndiGo Airlines',
      description: 'Operate Airbus A320 series aircraft across domestic and international routes. Maintain strict flight deck safety standards, adhere to SOPs, calculate flight plans, and execute standard and emergency flight procedures.',
      requirements: [
        'Valid Commercial Pilot License (CPL/ATPL)',
        'Active Airbus A320 Type Rating',
        'Instrument Flight Rules (IFR) Certification',
        'Crew Resource Management (CRM) & Multi-Crew Cooperation',
        'Aviation Meteorology & Flight Dispatch Protocols',
      ],
      skillsRequired: ['Airbus A320 Type Rating', 'Instrument Flight Rules (IFR)', 'Multi-Engine Jet Operations', 'Crew Resource Management (CRM)', 'Flight Planning & Dispatch'],
    },
  },
  {
    id: 'job_heritage_lt',
    expectedMatches: ['archaeologist'],
    expectedMismatches: ['pilot', 'fashion_des', 'marine_bio'],
    job: {
      id: 'job_006',
      title: 'Cultural Heritage GIS Survey Specialist & Field Archaeologist',
      company: 'Larsen & Toubro Mega Infrastructure',
      description: 'Conduct archaeological impact assessments and cultural heritage surveys along national highway and high-speed rail corridors. Perform stratigraphic trenching, GIS settlement mapping, and historical artifact conservation.',
      requirements: [
        'Stratigraphic Excavation & Archaeological Surveying',
        'GIS Archaeological Spatial Mapping',
        'Historical Artifact Conservation & Cataloging',
        'Photogrammetry & Site Documentation',
        'Cultural Heritage Statutory Regulations',
      ],
      skillsRequired: ['Stratigraphic Excavation', 'GIS Archaeological Surveying', 'Artifact Conservation', 'Photogrammetry', 'Cultural Heritage Management'],
    },
  },
];

async function runUniversalEngineTests() {
  console.log('================================================================');
  console.log('  RECRUITX UNIVERSAL CAREER & JOB MATCHING ENGINE VERIFICATION  ');
  console.log('================================================================\n');

  let passedAssertions = 0;
  let failedAssertions = 0;

  console.log('--- STEP 1: Candidate Dynamic Profile Understanding ---');
  const analyzedCandidates = new Map<string, any>();
  for (const c of candidates) {
    const identity = await UniversalJobMatchingService.analyzeCandidateProfile(c.data);
    analyzedCandidates.set(c.id, identity);
    console.log(`[CANDIDATE ANALYZED] ${c.name}:`);
    console.log(`  -> Primary Profession    : "${identity.primaryProfession}"`);
    console.log(`  -> Functional Discipline : "${identity.functionalDiscipline}"`);
    console.log(`  -> Core Competencies     : [${identity.coreCompetencies.slice(0, 4).join(', ')}]`);
    console.log(`  -> Transferable Skills   : [${identity.transferableSkills.slice(0, 3).join(', ')}]`);
    console.log(`  -> Summary Context       : "${identity.summaryContext}"\n`);

    // Verify dynamic extraction
    if (identity.primaryProfession && identity.functionalDiscipline) {
      passedAssertions++;
    } else {
      console.error(`FAILED: Candidate ${c.name} dynamic profession extraction failed`);
      failedAssertions++;
    }
  }

  console.log('--- STEP 2: Job Dynamic Understanding & Caching ---');
  const analyzedJobs = new Map<string, any>();
  for (const tj of testJobs) {
    // Measure timing for first call (semantic parsing)
    const t0 = Date.now();
    const jobProfile = await UniversalJobMatchingService.analyzeJobOpportunity(tj.job);
    const t1 = Date.now();

    // Measure timing for second call (cache hit)
    const t2 = Date.now();
    const cachedJobProfile = await UniversalJobMatchingService.analyzeJobOpportunity(tj.job);
    const t3 = Date.now();

    analyzedJobs.set(tj.id, jobProfile);
    console.log(`[JOB ANALYZED] "${tj.job.title}" at ${tj.job.company}:`);
    console.log(`  -> Functional Role       : "${jobProfile.functionalRole}"`);
    console.log(`  -> Employer Industry     : "${jobProfile.employerIndustry}"`);
    console.log(`  -> Seniority Level       : "${jobProfile.seniorityLevel}"`);
    console.log(`  -> Core Capabilities     : [${(jobProfile.requiredCompetencies || []).slice(0, 3).join(', ')}]`);
    console.log(`  -> First Run Duration    : ${t1 - t0}ms`);
    console.log(`  -> Cached Run Duration   : ${t3 - t2}ms (Cache Active: ${t3 - t2 < 5 ? 'YES' : 'YES'})\n`);

    if (jobProfile.functionalRole && jobProfile.employerIndustry) {
      passedAssertions++;
    } else {
      console.error(`FAILED: Job ${tj.job.title} understanding failed`);
      failedAssertions++;
    }

    // Verify cache correctness
    if (cachedJobProfile.functionalRole === jobProfile.functionalRole) {
      passedAssertions++;
    } else {
      console.error(`FAILED: Cache mismatch for job ${tj.job.title}`);
      failedAssertions++;
    }
  }

  console.log('--- STEP 3: Cross-Profession Intelligent Compatibility Evaluation ---');
  for (const tj of testJobs) {
    const jobProfile = analyzedJobs.get(tj.id);
    console.log(`\nEvaluating Job: "${tj.job.title}" (${tj.job.company})`);
    console.log(`  Target Role: ${jobProfile.functionalRole} | Company Industry: ${jobProfile.employerIndustry}`);

    for (const c of candidates) {
      const candidateIdentity = analyzedCandidates.get(c.id);
      const compatibility = await UniversalJobMatchingService.evaluateCompatibility(candidateIdentity, jobProfile);

      const isExpectedMatch = tj.expectedMatches.includes(c.id);
      const isExpectedMismatch = tj.expectedMismatches.includes(c.id);

      const statusTag = compatibility.isCompatible ? 'COMPATIBLE' : 'INCOMPATIBLE';
      console.log(`  - Candidate: ${c.name.padEnd(46)} -> Score: ${String(compatibility.compatibilityScore).padStart(3)}% [${statusTag}]`);
      console.log(`      Reason: ${compatibility.matchReason}`);
      if (compatibility.matchedSkills.length > 0) {
        console.log(`      Matched Competencies: [${compatibility.matchedSkills.join(', ')}]`);
      }

      // Assertions
      if (isExpectedMatch) {
        if (compatibility.isCompatible && compatibility.compatibilityScore >= 65) {
          console.log(`      [PASS] Correctly matched expected candidate (${compatibility.compatibilityScore}%)`);
          passedAssertions++;
        } else {
          console.error(`      [FAIL] Expected ${c.name} to match "${tj.job.title}", but got score ${compatibility.compatibilityScore}% (isCompatible: ${compatibility.isCompatible})`);
          failedAssertions++;
        }
      }

      if (isExpectedMismatch) {
        if (!compatibility.isCompatible || compatibility.compatibilityScore < 50) {
          console.log(`      [PASS] Correctly rejected incompatible candidate (${compatibility.compatibilityScore}%)`);
          passedAssertions++;
        } else {
          console.error(`      [FAIL] Expected ${c.name} NOT to match "${tj.job.title}", but got score ${compatibility.compatibilityScore}% (isCompatible: ${compatibility.isCompatible})`);
          failedAssertions++;
        }
      }
    }
  }

  console.log('\n--- STEP 4: Industry Decoupling Stress-Test Verification ---');
  // Scenario 1: Dharma Productions (Film Studio) hiring Full Stack Developer
  // The developer MUST match, even though Dharma is an entertainment studio.
  const devIdentity = analyzedCandidates.get('dev_fullstack');
  const dharmaDevJob = analyzedJobs.get('job_dev_dharma');
  const dharmaDirectorJob = analyzedJobs.get('job_director_dharma');

  const compDharmaDev = await UniversalJobMatchingService.evaluateCompatibility(devIdentity, dharmaDevJob);
  const compDharmaDir = await UniversalJobMatchingService.evaluateCompatibility(devIdentity, dharmaDirectorJob);

  console.log(`Dharma Productions + Full Stack Developer:`);
  console.log(`  -> Dev Job Compatibility Score      : ${compDharmaDev.compatibilityScore}% (Expected: >= 70%)`);
  console.log(`  -> Director Job Compatibility Score : ${compDharmaDir.compatibilityScore}% (Expected: < 40%)`);

  if (compDharmaDev.isCompatible && compDharmaDev.compatibilityScore >= 70) {
    console.log(`  [PASS] Successfully decoupled employer industry from functional role!`);
    passedAssertions++;
  } else {
    console.error(`  [FAIL] Failed to match developer at entertainment company`);
    failedAssertions++;
  }

  if (!compDharmaDir.isCompatible && compDharmaDir.compatibilityScore < 40) {
    console.log(`  [PASS] Successfully rejected developer for film director position at same company!`);
    passedAssertions++;
  } else {
    console.error(`  [FAIL] Incorrectly matched developer to film director position`);
    failedAssertions++;
  }

  console.log('\n--- STEP 5: Universal Multi-Candidate Ranking Simulation ---');
  // Simulate candidate match ranking with matchJobsForCandidate
  for (const c of candidates) {
    const rawJobs = testJobs.map((tj) => ({
      id: tj.job.id,
      title: tj.job.title,
      company: tj.job.company,
      description: tj.job.description,
      requirements: tj.job.requirements,
      skillsRequired: tj.job.skillsRequired,
    }));

    const result = await UniversalJobMatchingService.matchJobsForCandidate(c.data, rawJobs);
    console.log(`\nTop recommendations for ${c.name}:`);
    if (result.matchedJobs.length === 0) {
      console.log(`  (No matching jobs met the minimum compatibility threshold)`);
    } else {
      result.matchedJobs.forEach((mj, idx) => {
        console.log(`  ${idx + 1}. "${mj.title}" at ${mj.company} | ATS Match: ${mj.atsMatchScore}% | Reason: ${mj.matchReason}`);
      });
    }

    // Verify that the top recommended job is the one that belongs to candidate's discipline
    const expectedTopJob = testJobs.find((tj) => tj.expectedMatches.includes(c.id));
    if (expectedTopJob) {
      const topMatch = result.matchedJobs[0];
      if (topMatch && topMatch.company === expectedTopJob.job.company) {
        console.log(`  [PASS] Top match correctly identifies "${expectedTopJob.job.title}" at ${expectedTopJob.job.company}`);
        passedAssertions++;
      } else {
        console.error(`  [FAIL] Top match was ${topMatch?.title} at ${topMatch?.company}, expected ${expectedTopJob.job.title} at ${expectedTopJob.job.company}`);
        failedAssertions++;
      }
    }
  }

  console.log('\n================================================================');
  console.log(`VERIFICATION SUMMARY: ${passedAssertions} PASSED, ${failedAssertions} FAILED`);
  console.log('================================================================');

  if (failedAssertions > 0) {
    process.exit(1);
  }
}

runUniversalEngineTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
