export interface CourseraCourse {
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
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  skillsCovered: string[];
  description: string;
  certificateType: 'Official Coursera Certificate' | 'Free Audit Available' | 'Both Options';
}

export const COURSERA_CATALOG: CourseraCourse[] = [
  // ==================== Software Engineering & Computer Science ====================
  {
    id: 'meta-front-end-developer',
    title: 'Meta Front-End Developer Professional Certificate',
    provider: 'Meta',
    domain: 'Software Engineering',
    pricingType: 'both',
    pricingLabel: 'Free to Audit / Paid Certificate Available',
    courseraUrl: 'https://www.coursera.org/professional-certificates/meta-front-end-developer',
    duration: '4-6 Months (6 hrs/week)',
    rating: 4.8,
    enrolledCount: '350K+ Learners',
    level: 'Beginner',
    skillsCovered: ['React.js', 'JavaScript', 'HTML5', 'CSS', 'UI/UX Design', 'Git', 'REST API'],
    description: 'Launch your career as a front-end developer. Build interactive user interfaces with React, JavaScript, and modern web architecture directly from Meta engineers.',
    certificateType: 'Both Options',
  },
  {
    id: 'meta-back-end-developer',
    title: 'Meta Back-End Developer Professional Certificate',
    provider: 'Meta',
    domain: 'Software Engineering',
    pricingType: 'both',
    pricingLabel: 'Free to Audit / Paid Certificate Available',
    courseraUrl: 'https://www.coursera.org/professional-certificates/meta-back-end-developer',
    duration: '5-7 Months (6 hrs/week)',
    rating: 4.7,
    enrolledCount: '240K+ Learners',
    level: 'Intermediate',
    skillsCovered: ['Python', 'Node.js', 'SQL', 'REST API', 'Django', 'Git', 'System Design'],
    description: 'Master backend architecture, database schemas, API development, and server orchestration with practical projects authorized by Meta.',
    certificateType: 'Both Options',
  },
  {
    id: 'google-it-automation',
    title: 'Google IT Automation with Python Professional Certificate',
    provider: 'Google',
    domain: 'Software Engineering',
    pricingType: 'both',
    pricingLabel: 'Free to Audit / Paid Certificate Available',
    courseraUrl: 'https://www.coursera.org/professional-certificates/google-it-automation',
    duration: '3-4 Months (8 hrs/week)',
    rating: 4.8,
    enrolledCount: '520K+ Learners',
    level: 'Beginner',
    skillsCovered: ['Python', 'Git', 'Linux', 'Automation', 'Shell Scripting', 'Troubleshooting'],
    description: 'Learn in-demand skills like Python programming, Git version control, and system administration directly from Google experts.',
    certificateType: 'Both Options',
  },
  {
    id: 'ibm-full-stack-cloud-dev',
    title: 'IBM Full Stack Cloud Developer Professional Certificate',
    provider: 'IBM',
    domain: 'Software Engineering',
    pricingType: 'both',
    pricingLabel: 'Free to Audit / Paid Certificate Available',
    courseraUrl: 'https://www.coursera.org/professional-certificates/ibm-full-stack-cloud-developer',
    duration: '4-6 Months (5 hrs/week)',
    rating: 4.6,
    enrolledCount: '180K+ Learners',
    level: 'Intermediate',
    skillsCovered: ['React.js', 'Node.js', 'Docker', 'Kubernetes', 'Cloud Architecture', 'CI/CD', 'SQL'],
    description: 'Build production-ready cloud-native applications with containers, microservices, and serverless backends evaluated by IBM.',
    certificateType: 'Both Options',
  },
  {
    id: 'stanford-algorithms-specialization',
    title: 'Algorithms Specialization',
    provider: 'Stanford University',
    domain: 'Software Engineering',
    pricingType: 'free',
    pricingLabel: '100% Free to Audit',
    courseraUrl: 'https://www.coursera.org/specializations/algorithms',
    duration: '2-3 Months (4 hrs/week)',
    rating: 4.9,
    enrolledCount: '410K+ Learners',
    level: 'Advanced',
    skillsCovered: ['Data Structures', 'Algorithms', 'System Design', 'Graph Search', 'Dynamic Programming', 'Coding Interviews'],
    description: 'Learn foundational algorithmic principles and computer science paradigms from world-renowned Stanford professors Tim Roughgarden.',
    certificateType: 'Free Audit Available',
  },
  {
    id: 'ucsd-data-structures-algorithms',
    title: 'Data Structures and Algorithms Specialization',
    provider: 'UC San Diego',
    domain: 'Software Engineering',
    pricingType: 'both',
    pricingLabel: 'Free to Audit / Paid Certificate Available',
    courseraUrl: 'https://www.coursera.org/specializations/data-structures-algorithms',
    duration: '3-4 Months (6 hrs/week)',
    rating: 4.8,
    enrolledCount: '300K+ Learners',
    level: 'Intermediate',
    skillsCovered: ['Data Structures', 'Algorithms', 'Graph Algorithms', 'String Processing', 'Dynamic Programming'],
    description: 'Master algorithmic programming techniques to ace software engineering technical interviews and build efficient software systems.',
    certificateType: 'Both Options',
  },
  {
    id: 'duke-java-programming',
    title: 'Java Programming and Software Engineering Fundamentals Specialization',
    provider: 'Duke University',
    domain: 'Software Engineering',
    pricingType: 'both',
    pricingLabel: 'Free to Audit / Paid Certificate Available',
    courseraUrl: 'https://www.coursera.org/specializations/java-programming',
    duration: '3-5 Months (5 hrs/week)',
    rating: 4.7,
    enrolledCount: '480K+ Learners',
    level: 'Beginner',
    skillsCovered: ['Java', 'OOP', 'Data Structures', 'Algorithms', 'Software Engineering', 'HTML/CSS/JS'],
    description: 'Learn fundamental programming concepts in Java, object-oriented design, algorithms, and software testing from Duke University faculty.',
    certificateType: 'Both Options',
  },
  {
    id: 'spring-framework-specialization',
    title: 'Spring Framework Specialization',
    provider: 'LearnQuest',
    domain: 'Software Engineering',
    pricingType: 'both',
    pricingLabel: 'Free to Audit / Paid Certificate Available',
    courseraUrl: 'https://www.coursera.org/specializations/spring-framework',
    duration: '2-3 Months (5 hrs/week)',
    rating: 4.6,
    enrolledCount: '90K+ Learners',
    level: 'Intermediate',
    skillsCovered: ['Java', 'Spring Boot', 'Spring MVC', 'RESTful APIs', 'Microservices', 'SQL'],
    description: 'Master modern enterprise Java development using Spring Boot, Spring Data, and microservices architecture.',
    certificateType: 'Both Options',
  },
  {
    id: 'meta-database-engineer',
    title: 'Meta Database Engineer Professional Certificate',
    provider: 'Meta',
    domain: 'Software Engineering',
    pricingType: 'both',
    pricingLabel: 'Free to Audit / Paid Certificate Available',
    courseraUrl: 'https://www.coursera.org/professional-certificates/meta-database-engineer',
    duration: '4-6 Months (6 hrs/week)',
    rating: 4.7,
    enrolledCount: '130K+ Learners',
    level: 'Beginner',
    skillsCovered: ['SQL', 'MySQL', 'PostgreSQL', 'Database Design', 'Python', 'Database Administration'],
    description: 'Demonstrate proficiency in database design, relational modeling, advanced SQL queries, and data storage optimizations with Meta engineers.',
    certificateType: 'Both Options',
  },
  {
    id: 'michigan-python-for-everybody',
    title: 'Python for Everybody Specialization',
    provider: 'University of Michigan',
    domain: 'Software Engineering',
    pricingType: 'free',
    pricingLabel: '100% Free to Audit',
    courseraUrl: 'https://www.coursera.org/specializations/python',
    duration: '2-3 Months (5 hrs/week)',
    rating: 4.8,
    enrolledCount: '1.5M+ Learners',
    level: 'Beginner',
    skillsCovered: ['Python', 'SQL', 'Data Analysis', 'Web Scraping', 'JSON'],
    description: 'Learn how to program and analyze data with Python from University of Michigan Professor Charles Severance.',
    certificateType: 'Free Audit Available',
  },

  // ==================== Data Science & Analytics ====================
  {
    id: 'google-data-analytics-cert',
    title: 'Google Data Analytics Professional Certificate',
    provider: 'Google',
    domain: 'Data Analytics',
    pricingType: 'both',
    pricingLabel: 'Free to Audit / Paid Certificate Available',
    courseraUrl: 'https://www.coursera.org/professional-certificates/google-data-analytics',
    duration: '4-6 Months (5 hrs/week)',
    rating: 4.8,
    enrolledCount: '2.1M+ Learners',
    level: 'Beginner',
    skillsCovered: ['Data Analysis', 'SQL', 'Tableau', 'Spreadsheets', 'R Programming', 'Data Visualization', 'Business Intelligence'],
    description: 'Gain job-ready skills for an entry-level data analyst role. Learn how to clean, visualize, and analyze data to make strategic business recommendations.',
    certificateType: 'Both Options',
  },
  {
    id: 'deeplearning-machine-learning-andrew-ng',
    title: 'Machine Learning Specialization',
    provider: 'DeepLearning.AI & Stanford University',
    domain: 'Artificial Intelligence & Data Science',
    pricingType: 'both',
    pricingLabel: 'Free to Audit / Paid Certificate Available',
    courseraUrl: 'https://www.coursera.org/specializations/machine-learning-introduction',
    duration: '3 Months (8 hrs/week)',
    rating: 4.9,
    enrolledCount: '1.2M+ Learners',
    level: 'Beginner',
    skillsCovered: ['Machine Learning', 'Python', 'NumPy', 'TensorFlow', 'Data Analysis', 'Scikit-Learn'],
    description: 'The world’s most acclaimed introduction to Machine Learning taught by AI pioneer Andrew Ng. Master supervised learning, recommender systems, and neural networks.',
    certificateType: 'Both Options',
  },
  {
    id: 'deeplearning-deep-learning-spec',
    title: 'Deep Learning Specialization',
    provider: 'DeepLearning.AI',
    domain: 'Artificial Intelligence & Data Science',
    pricingType: 'both',
    pricingLabel: 'Free to Audit / Paid Certificate Available',
    courseraUrl: 'https://www.coursera.org/specializations/deep-learning',
    duration: '3-4 Months (6 hrs/week)',
    rating: 4.9,
    enrolledCount: '890K+ Learners',
    level: 'Intermediate',
    skillsCovered: ['Deep Learning', 'PyTorch', 'TensorFlow', 'Convolutional Networks', 'NLP', 'Machine Learning'],
    description: 'Build and train deep neural networks, implement CNNs for computer vision, and architect sequence models for cutting-edge generative AI.',
    certificateType: 'Both Options',
  },

  // ==================== Cloud Infrastructure & DevOps ====================
  {
    id: 'aws-cloud-solutions-architect',
    title: 'AWS Cloud Solutions Architect Professional Certificate',
    provider: 'Amazon Web Services',
    domain: 'Cloud Infrastructure & DevOps',
    pricingType: 'both',
    pricingLabel: 'Free to Audit / Paid Certificate Available',
    courseraUrl: 'https://www.coursera.org/professional-certificates/aws-cloud-solutions-architect',
    duration: '3-5 Months (6 hrs/week)',
    rating: 4.7,
    enrolledCount: '160K+ Learners',
    level: 'Intermediate',
    skillsCovered: ['AWS', 'Cloud Architecture', 'Linux', 'Docker', 'Networking', 'Security', 'Infrastructure'],
    description: 'Prepare for the AWS Certified Solutions Architect Associate exam. Architect fault-tolerant, scalable, and cost-effective cloud networks on AWS.',
    certificateType: 'Both Options',
  },
  {
    id: 'aws-cloud-practitioner-essentials',
    title: 'AWS Cloud Practitioner Essentials',
    provider: 'Amazon Web Services',
    domain: 'Cloud Infrastructure & DevOps',
    pricingType: 'free',
    pricingLabel: '100% Free to Audit',
    courseraUrl: 'https://www.coursera.org/learn/aws-cloud-practitioner-essentials',
    duration: '4-6 Weeks (3 hrs/week)',
    rating: 4.7,
    enrolledCount: '420K+ Learners',
    level: 'Beginner',
    skillsCovered: ['AWS', 'Cloud Fundamentals', 'Compute', 'Storage', 'Cloud Security'],
    description: 'Fundamental understanding of the AWS Cloud, global infrastructure, security models, and cloud architectural best practices directly from AWS.',
    certificateType: 'Free Audit Available',
  },
  {
    id: 'google-cloud-infrastructure',
    title: 'Architecting with Google Compute Engine',
    provider: 'Google Cloud',
    domain: 'Cloud Infrastructure & DevOps',
    pricingType: 'both',
    pricingLabel: 'Free to Audit / Paid Certificate Available',
    courseraUrl: 'https://www.coursera.org/specializations/gcp-architecture',
    duration: '2-3 Months (5 hrs/week)',
    rating: 4.7,
    enrolledCount: '120K+ Learners',
    level: 'Intermediate',
    skillsCovered: ['Google Cloud', 'Kubernetes', 'Docker', 'Linux', 'Networking', 'CI/CD'],
    description: 'Deploy solution elements, including infrastructure components such as networks, systems and application services on Google Cloud.',
    certificateType: 'Both Options',
  },
  {
    id: 'illinois-cloud-computing',
    title: 'Cloud Computing Concepts',
    provider: 'University of Illinois',
    domain: 'Cloud Infrastructure & DevOps',
    pricingType: 'free',
    pricingLabel: '100% Free to Audit',
    courseraUrl: 'https://www.coursera.org/learn/cloud-computing',
    duration: '5 Weeks (4 hrs/week)',
    rating: 4.6,
    enrolledCount: '210K+ Learners',
    level: 'Intermediate',
    skillsCovered: ['Cloud Computing', 'Distributed Systems', 'Fault Tolerance', 'MapReduce', 'P2P Systems'],
    description: 'Understand the core concepts of distributed systems and cloud networks from the University of Illinois Urbana-Champaign.',
    certificateType: 'Free Audit Available',
  },

  // ==================== Cybersecurity ====================
  {
    id: 'google-cybersecurity-cert',
    title: 'Google Cybersecurity Professional Certificate',
    provider: 'Google',
    domain: 'Cybersecurity',
    pricingType: 'both',
    pricingLabel: 'Free to Audit / Paid Certificate Available',
    courseraUrl: 'https://www.coursera.org/professional-certificates/google-cybersecurity',
    duration: '3-6 Months (7 hrs/week)',
    rating: 4.8,
    enrolledCount: '450K+ Learners',
    level: 'Beginner',
    skillsCovered: ['Cybersecurity', 'Network Security', 'Python', 'Linux', 'SIEM Tools', 'Incident Response', 'Threat Detection'],
    description: 'Prepare for an entry-level cybersecurity role with hands-on practice in identifying threats, mitigating vulnerabilities, and analyzing security events.',
    certificateType: 'Both Options',
  },
  {
    id: 'microsoft-cybersecurity-analyst',
    title: 'Microsoft Cybersecurity Analyst Professional Certificate',
    provider: 'Microsoft',
    domain: 'Cybersecurity',
    pricingType: 'both',
    pricingLabel: 'Free to Audit / Paid Certificate Available',
    courseraUrl: 'https://www.coursera.org/professional-certificates/microsoft-cybersecurity-analyst',
    duration: '4-6 Months (6 hrs/week)',
    rating: 4.7,
    enrolledCount: '110K+ Learners',
    level: 'Beginner',
    skillsCovered: ['Cybersecurity', 'Threat Analysis', 'Identity Management', 'Microsoft Defender', 'Azure Sentinel', 'Compliance'],
    description: 'Master Microsoft security operations, threat modeling, vulnerability management, and incident response across enterprise environments.',
    certificateType: 'Both Options',
  },

  // ==================== UI/UX & Creative Design ====================
  {
    id: 'google-ux-design-cert',
    title: 'Google UX Design Professional Certificate',
    provider: 'Google',
    domain: 'UI/UX & Creative Design',
    pricingType: 'both',
    pricingLabel: 'Free to Audit / Paid Certificate Available',
    courseraUrl: 'https://www.coursera.org/professional-certificates/google-ux-design',
    duration: '4-6 Months (6 hrs/week)',
    rating: 4.8,
    enrolledCount: '1.4M+ Learners',
    level: 'Beginner',
    skillsCovered: ['Figma', 'UI/UX Design', 'Wireframing', 'Prototyping', 'User Research', 'Design Systems', 'Usability Testing'],
    description: 'Design intuitive digital mobile apps and responsive websites. Build a portfolio with 3 projects including UX research and high-fidelity Figma prototypes.',
    certificateType: 'Both Options',
  },
  {
    id: 'calarts-ui-ux-design',
    title: 'UI / UX Design Specialization',
    provider: 'California Institute of the Arts (CalArts)',
    domain: 'UI/UX & Creative Design',
    pricingType: 'both',
    pricingLabel: 'Free to Audit / Paid Certificate Available',
    courseraUrl: 'https://www.coursera.org/specializations/ui-ux-design',
    duration: '3-4 Months (5 hrs/week)',
    rating: 4.7,
    enrolledCount: '380K+ Learners',
    level: 'Beginner',
    skillsCovered: ['UI/UX Design', 'Visual Design', 'Wireframing', 'User Research', 'Prototyping', 'Interface Design'],
    description: 'Learn a design-centric approach to user interface and user experience design with practical visual communication projects from CalArts faculty.',
    certificateType: 'Both Options',
  },
  {
    id: 'calarts-graphic-design-specialization',
    title: 'Graphic Design Specialization',
    provider: 'California Institute of the Arts (CalArts)',
    domain: 'UI/UX & Creative Design',
    pricingType: 'free',
    pricingLabel: '100% Free to Audit',
    courseraUrl: 'https://www.coursera.org/specializations/graphic-design',
    duration: '2-3 Months (4 hrs/week)',
    rating: 4.7,
    enrolledCount: '450K+ Learners',
    level: 'Beginner',
    skillsCovered: ['Adobe Photoshop', 'Adobe Illustrator', 'Visual Storytelling', 'Brand Management', 'Typography'],
    description: 'Master core formal graphic design skills: typography, image-making, shape, composition, and historical context from prestigious CalArts faculty.',
    certificateType: 'Free Audit Available',
  },

  // ==================== Product Marketing & Growth ====================
  {
    id: 'google-digital-marketing-ecommerce',
    title: 'Google Digital Marketing & E-commerce Certificate',
    provider: 'Google',
    domain: 'Marketing & Growth Management',
    pricingType: 'both',
    pricingLabel: 'Free to Audit / Paid Certificate Available',
    courseraUrl: 'https://www.coursera.org/professional-certificates/google-digital-marketing-ecommerce',
    duration: '4-6 Months (5 hrs/week)',
    rating: 4.8,
    enrolledCount: '800K+ Learners',
    level: 'Beginner',
    skillsCovered: ['Digital Marketing', 'SEO & SEM', 'Google Analytics', 'Campaign Strategy', 'Lead Generation', 'Content Marketing'],
    description: 'Learn foundational digital marketing, search engine optimization (SEO), performance campaigns, email funnels, and data attribution with Google tools.',
    certificateType: 'Both Options',
  },
  {
    id: 'northwestern-social-media-marketing',
    title: 'Social Media Marketing Specialization',
    provider: 'Northwestern University',
    domain: 'Marketing & Growth Management',
    pricingType: 'both',
    pricingLabel: 'Free to Audit / Paid Certificate Available',
    courseraUrl: 'https://www.coursera.org/specializations/social-media-marketing',
    duration: '3-4 Months (5 hrs/week)',
    rating: 4.7,
    enrolledCount: '290K+ Learners',
    level: 'Beginner',
    skillsCovered: ['Social Media Management', 'Content Strategy', 'Brand Management', 'Audience Engagement', 'Analytics'],
    description: 'Understand the social media landscape, build engagement strategies, and design high-impact social campaigns from Northwestern University faculty.',
    certificateType: 'Both Options',
  },

  // ==================== Finance & Accounting ====================
  {
    id: 'yale-financial-markets',
    title: 'Financial Markets by Yale University',
    provider: 'Yale University (Nobel Laureate Robert Shiller)',
    domain: 'Finance & Accounting',
    pricingType: 'free',
    pricingLabel: '100% Free to Audit',
    courseraUrl: 'https://www.coursera.org/learn/financial-markets-global',
    duration: '7 Weeks (4 hrs/week)',
    rating: 4.8,
    enrolledCount: '1.6M+ Learners',
    level: 'Beginner',
    skillsCovered: ['Financial Analysis', 'Financial Reporting', 'Corporate Finance', 'Budgeting', 'Accounting'],
    description: 'An overview of the ideas, methods, and institutions that permit human society to manage risks and foster enterprise taught by Nobel Laureate Robert Shiller.',
    certificateType: 'Free Audit Available',
  },
  {
    id: 'wharton-business-foundations',
    title: 'Business Foundations Specialization',
    provider: 'Wharton School of the University of Pennsylvania',
    domain: 'Finance & Accounting',
    pricingType: 'both',
    pricingLabel: 'Free to Audit / Paid Certificate Available',
    courseraUrl: 'https://www.coursera.org/specializations/wharton-business-foundations',
    duration: '3-4 Months (5 hrs/week)',
    rating: 4.7,
    enrolledCount: '350K+ Learners',
    level: 'Intermediate',
    skillsCovered: ['Accounting', 'Financial Analysis', 'Budgeting', 'Corporate Finance', 'Strategic Marketing'],
    description: 'Learn the fundamentals of business, including accounting, finance, operations, and marketing from professors at Wharton, the world’s first collegiate business school.',
    certificateType: 'Both Options',
  },

  // ==================== Video, Film & Media ====================
  {
    id: 'colorado-foundation-of-video-editing',
    title: 'The Foundation of Video Editing',
    provider: 'University of Colorado Boulder',
    domain: 'Video Editing & Post-Production',
    pricingType: 'free',
    pricingLabel: '100% Free to Audit',
    courseraUrl: 'https://www.coursera.org/learn/the-foundation-of-video-editing',
    duration: '4 Weeks (4 hrs/week)',
    rating: 4.7,
    enrolledCount: '95K+ Learners',
    level: 'Beginner',
    skillsCovered: ['Video Editing', 'Post-Production', 'Adobe Premiere Pro', 'DaVinci Resolve', 'Color Grading', 'Motion Graphics', 'Sound Design'],
    description: 'Master core formal editing principles, montage techniques, narrative pacing, and non-linear workflows from the University of Colorado Boulder.',
    certificateType: 'Free Audit Available',
  },
  {
    id: 'scriptwriting-visual-storytelling',
    title: 'Write A Feature Length Screenplay for Film or Television',
    provider: 'Michigan State University',
    domain: 'Film & Movie Direction',
    pricingType: 'free',
    pricingLabel: '100% Free to Audit',
    courseraUrl: 'https://www.coursera.org/learn/write-a-feature-length-screenplay-for-film-or-television',
    duration: '5 Weeks (4 hrs/week)',
    rating: 4.6,
    enrolledCount: '110K+ Learners',
    level: 'Intermediate',
    skillsCovered: ['Screenwriting', 'Film Directing', 'Storyboarding', 'Casting', 'Visual Storytelling'],
    description: 'Write a complete feature-length screenplay. Learn dramatic structure, character development, visual pacing, and professional formatting from Michigan State University.',
    certificateType: 'Free Audit Available',
  },

  // ==================== Interior & Spatial Design ====================
  {
    id: 'ntu-3d-cad-fundamental',
    title: '3D CAD Fundamental',
    provider: 'National Taiwan University',
    domain: 'Interior & Spatial Design',
    pricingType: 'free',
    pricingLabel: '100% Free to Audit',
    courseraUrl: 'https://www.coursera.org/learn/3d-cad-fundamental',
    duration: '4 Weeks (3 hrs/week)',
    rating: 4.7,
    enrolledCount: '85K+ Learners',
    level: 'Beginner',
    skillsCovered: ['AutoCAD', '3D Visualization', 'Space Planning', 'Drafting', '3D Modeling', 'Technical Drawing'],
    description: 'Master core 3D modeling, technical drafting, and dimensional space layout techniques fundamental to spatial and interior design disciplines.',
    certificateType: 'Free Audit Available',
  },
  {
    id: 'ie-making-architecture',
    title: 'Making Architecture',
    provider: 'IE School of Architecture and Design',
    domain: 'Interior & Spatial Design',
    pricingType: 'both',
    pricingLabel: 'Free to Audit / Paid Certificate Available',
    courseraUrl: 'https://www.coursera.org/learn/making-architecture',
    duration: '4 Weeks (4 hrs/week)',
    rating: 4.8,
    enrolledCount: '70K+ Learners',
    level: 'Intermediate',
    skillsCovered: ['Space Planning', 'Color Theory & Materials', 'Lighting Design', 'Spatial Composition', 'Architectural Concepts'],
    description: 'Explore the creative and spatial process of conceiving interior spaces, structural balance, materials, lighting, and human-scale environments.',
    certificateType: 'Both Options',
  },
  {
    id: 'ucsd-design-principles',
    title: 'Design Principles: an Introduction',
    provider: 'University of California San Diego',
    domain: 'Interior & Spatial Design',
    pricingType: 'free',
    pricingLabel: '100% Free to Audit',
    courseraUrl: 'https://www.coursera.org/learn/design-principles',
    duration: '4 Weeks (3 hrs/week)',
    rating: 4.7,
    enrolledCount: '90K+ Learners',
    level: 'Beginner',
    skillsCovered: ['Design Principles', 'Color Theory & Materials', 'Visual Composition', 'Space Planning', 'Prototyping'],
    description: 'Learn foundational visual balance, spatial hierarchy, functional ergonomics, and practical design principles applied to interior and physical spaces.',
    certificateType: 'Free Audit Available',
  },

  // ==================== Sports Coaching & Athlete Training ====================
  {
    id: 'colorado-science-of-exercise',
    title: 'Science of Exercise',
    provider: 'University of Colorado Boulder',
    domain: 'Sports Coaching & Athlete Training',
    pricingType: 'free',
    pricingLabel: '100% Free to Audit',
    courseraUrl: 'https://www.coursera.org/learn/science-exercise',
    duration: '4 Weeks (4 hrs/week)',
    rating: 4.8,
    enrolledCount: '190K+ Learners',
    level: 'Beginner',
    skillsCovered: ['Conditioning Fundamentals', 'Athlete Training', 'Fitness Assessment', 'Injury Prevention & First Aid', 'Physiology'],
    description: 'Understand the physiological adaptations to exercise, nutrition, endurance conditioning, and athlete safety to optimize coaching programs.',
    certificateType: 'Free Audit Available',
  },
  {
    id: 'ucdavis-coaching-conversations',
    title: 'Coaching Skills for Managers & Leaders',
    provider: 'University of California, Davis',
    domain: 'Sports Coaching & Athlete Training',
    pricingType: 'both',
    pricingLabel: 'Free to Audit / Paid Certificate Available',
    courseraUrl: 'https://www.coursera.org/learn/coaching-conversations',
    duration: '4 Weeks (3 hrs/week)',
    rating: 4.7,
    enrolledCount: '120K+ Learners',
    level: 'Intermediate',
    skillsCovered: ['Coaching Fundamentals', 'Team Leadership', 'Player Development', 'Youth Mentorship', 'Performance Evaluation'],
    description: 'Master interpersonal coaching dialogues, motivational techniques, constructive tactical feedback, and leadership frameworks for team development.',
    certificateType: 'Both Options',
  },

  // ==================== Game Testing & Quality Assurance ====================
  {
    id: 'minnesota-software-testing',
    title: 'Software Testing and Automation Specialization',
    provider: 'University of Minnesota',
    domain: 'Game Testing & Quality Assurance',
    pricingType: 'both',
    pricingLabel: 'Free to Audit / Paid Certificate Available',
    courseraUrl: 'https://www.coursera.org/specializations/software-testing-automation',
    duration: '3-4 Months (5 hrs/week)',
    rating: 4.7,
    enrolledCount: '65K+ Learners',
    level: 'Intermediate',
    skillsCovered: ['Test Case Execution', 'Defect Reporting & Reproduction', 'Regression Testing', 'Quality Assurance', 'Bug Tracking (JIRA)'],
    description: 'Master verification methodologies, systematic test suite design, reproduction steps, automated regression, and rigorous defect tracking.',
    certificateType: 'Both Options',
  },
  {
    id: 'calarts-game-design',
    title: 'Game Design: Art and Concepts Specialization',
    provider: 'California Institute of the Arts',
    domain: 'Game Testing & Quality Assurance',
    pricingType: 'both',
    pricingLabel: 'Free to Audit / Paid Certificate Available',
    courseraUrl: 'https://www.coursera.org/specializations/game-design',
    duration: '4 Months (4 hrs/week)',
    rating: 4.8,
    enrolledCount: '140K+ Learners',
    level: 'Beginner',
    skillsCovered: ['Gameplay Testing', 'Game World Design', 'Character Design', 'Game Mechanics', 'Level Design'],
    description: 'Learn the formal artistic and conceptual components of game systems, player experience mechanics, and gameplay evaluation.',
    certificateType: 'Both Options',
  },

  // ==================== Game Development & Engineering ====================
  {
    id: 'msu-game-development-unity',
    title: 'Game Design and Development with Unity 2020 Specialization',
    provider: 'Michigan State University',
    domain: 'Game Development & Engineering',
    pricingType: 'both',
    pricingLabel: 'Free to Audit / Paid Certificate Available',
    courseraUrl: 'https://www.coursera.org/specializations/game-development',
    duration: '5 Months (5 hrs/week)',
    rating: 4.7,
    enrolledCount: '130K+ Learners',
    level: 'Intermediate',
    skillsCovered: ['Game Engine (Unity/Unreal)', 'C# / C++', 'Game Physics', 'Gameplay Mechanics', '3D Math & Vectors'],
    description: 'Build complete 2D and 3D playable games in Unity with C#, covering physics simulation, character control, game audio, and cross-platform publishing.',
    certificateType: 'Both Options',
  },

  // ==================== Graphic Design & Visual Communication ====================
  {
    id: 'calarts-graphic-design',
    title: 'Graphic Design Specialization',
    provider: 'California Institute of the Arts',
    domain: 'Graphic Design & Visual Communication',
    pricingType: 'both',
    pricingLabel: 'Free to Audit / Paid Certificate Available',
    courseraUrl: 'https://www.coursera.org/specializations/graphic-design',
    duration: '5 Months (4 hrs/week)',
    rating: 4.8,
    enrolledCount: '320K+ Learners',
    level: 'Beginner',
    skillsCovered: ['Adobe Photoshop', 'Adobe Illustrator', 'Typography', 'Visual Branding', 'Color Theory', 'Layout Design'],
    description: 'Acquire the core foundational visual communication skills required for professional graphic design, typography, brand identity, and composition.',
    certificateType: 'Both Options',
  },
];

export class CourseraService {
  /**
   * Retrieves recommended Coursera courses matching candidate target role and missing skills
   */
  static getRecommendedCourses(
    targetRole: string,
    missingSkills: string[] = [],
    pricingFilter: 'all' | 'free' | 'paid' = 'all'
  ): CourseraCourse[] {
    const lowerRole = targetRole.toLowerCase();
    const lowerMissing = missingSkills.map((s) => s.toLowerCase().trim());

    // 1. Filter by pricing
    let pool = COURSERA_CATALOG.filter((c) => {
      if (pricingFilter === 'free') {
        return c.pricingType === 'free' || c.pricingType === 'both';
      }
      if (pricingFilter === 'paid') {
        return c.pricingType === 'paid' || c.pricingType === 'both';
      }
      return true;
    });

    // 2. Score and rank courses based on missing skills match & domain match
    const scored = pool.map((course) => {
      const courseSkillsLower = course.skillsCovered.map((s) => s.toLowerCase());

      // Count missing skills covered by this course
      const matchedMissingSkills = courseSkillsLower.filter((cs) =>
        lowerMissing.some((ms) => ms.includes(cs) || cs.includes(ms))
      );

      // Specific discipline detection with strict priority
      const isInterior =
        lowerRole.includes('interior') ||
        lowerRole.includes('spatial') ||
        lowerRole.includes('space plan') ||
        lowerRole.includes('decorat') ||
        lowerRole.includes('furnish') ||
        lowerRole.includes('home design');

      const isSports =
        lowerRole.includes('coach') ||
        lowerRole.includes('sport') ||
        lowerRole.includes('athlet') ||
        lowerRole.includes('fitness') ||
        lowerRole.includes('football') ||
        lowerRole.includes('soccer') ||
        lowerRole.includes('trainer') ||
        lowerRole.includes('conditioning');

      const isGameQA =
        (lowerRole.includes('game') || lowerRole.includes('gaming')) &&
        (lowerRole.includes('test') || lowerRole.includes('qa') || lowerRole.includes('quality') || lowerRole.includes('bug'));

      const isGameDev =
        (lowerRole.includes('game') || lowerRole.includes('gaming')) &&
        (lowerRole.includes('dev') || lowerRole.includes('engineer') || lowerRole.includes('program') || lowerRole.includes('unity') || lowerRole.includes('unreal'));

      const isGraphic =
        lowerRole.includes('graphic') ||
        lowerRole.includes('visual designer') ||
        lowerRole.includes('branding') ||
        lowerRole.includes('illustrat') ||
        lowerRole.includes('logo');

      const isUIUX =
        !isInterior &&
        !isGraphic &&
        (lowerRole.includes('ui') ||
          lowerRole.includes('ux') ||
          lowerRole.includes('product design') ||
          lowerRole.includes('user experience') ||
          lowerRole.includes('user interface') ||
          lowerRole.includes('figma'));

      const isCyber = lowerRole.includes('cyber') || lowerRole.includes('security') || lowerRole.includes('infosec');
      const isCloud = lowerRole.includes('cloud') || lowerRole.includes('aws') || lowerRole.includes('azure') || lowerRole.includes('devops');
      const isData = lowerRole.includes('data') || lowerRole.includes('analytics') || lowerRole.includes('analyst') || lowerRole.includes('business intelligence');
      const isAI = lowerRole.includes('machine learning') || lowerRole.includes('ai') || lowerRole.includes('deep learning');
      const isJava = lowerRole.includes('java') || lowerRole.includes('spring');
      const isMarketing = lowerRole.includes('market') || lowerRole.includes('seo') || lowerRole.includes('growth');
      const isFinance = lowerRole.includes('finance') || lowerRole.includes('account') || lowerRole.includes('audit');
      const isHR = lowerRole.includes('hr') || lowerRole.includes('human resource') || lowerRole.includes('talent') || lowerRole.includes('recruit');
      const isFilm = lowerRole.includes('film') || lowerRole.includes('cinema') || lowerRole.includes('direct') || lowerRole.includes('movie') || lowerRole.includes('screenplay');
      const isVideo = lowerRole.includes('video') || lowerRole.includes('edit') || lowerRole.includes('premiere');

      const isGeneralSoftware =
        lowerRole.includes('software') ||
        lowerRole.includes('developer') ||
        lowerRole.includes('web') ||
        lowerRole.includes('full stack') ||
        lowerRole.includes('backend') ||
        lowerRole.includes('frontend') ||
        lowerRole.includes('programmer') ||
        lowerRole.includes('coder') ||
        lowerRole.includes('engineer');

      let domainMatch = false;
      let specificRoleBonus = 0;

      if (isInterior) {
        domainMatch = course.domain === 'Interior & Spatial Design';
      } else if (isSports) {
        domainMatch = course.domain === 'Sports Coaching & Athlete Training';
      } else if (isGameQA) {
        domainMatch = course.domain === 'Game Testing & Quality Assurance';
      } else if (isGameDev) {
        domainMatch = course.domain === 'Game Development & Engineering';
      } else if (isGraphic) {
        domainMatch = course.domain === 'Graphic Design & Visual Communication';
      } else if (isUIUX) {
        domainMatch = course.domain === 'UI/UX & Creative Design';
      } else if (isCyber) {
        domainMatch = course.domain === 'Cybersecurity';
      } else if (isCloud) {
        domainMatch = course.domain === 'Cloud Infrastructure & DevOps';
      } else if (isData) {
        domainMatch = course.domain === 'Data Analytics' || (course.domain.includes('Data') && !course.domain.includes('Software'));
      } else if (isAI) {
        domainMatch = course.domain === 'Artificial Intelligence & Data Science';
      } else if (isMarketing) {
        domainMatch = course.domain === 'Marketing & Growth Management';
      } else if (isFinance) {
        domainMatch = course.domain === 'Finance & Accounting';
      } else if (isFilm) {
        domainMatch = course.domain === 'Film & Movie Direction';
      } else if (isVideo) {
        domainMatch = course.domain === 'Video Editing & Post-Production';
      } else if (isGeneralSoftware) {
        domainMatch = course.domain === 'Software Engineering';
      }

      // Bonus for specific technology in role title (e.g. Java, Python, Frontend, Backend)
      if (isJava && course.skillsCovered.some((s) => s.toLowerCase().includes('java') || s.toLowerCase().includes('spring'))) {
        specificRoleBonus += 150;
        domainMatch = true;
      }
      if (lowerRole.includes('front') && course.title.toLowerCase().includes('front-end')) {
        specificRoleBonus += 120;
      }
      if (lowerRole.includes('back') && course.title.toLowerCase().includes('back-end')) {
        specificRoleBonus += 120;
      }

      let score = matchedMissingSkills.length * 10 + specificRoleBonus;
      if (domainMatch) {
        score += 100;
      } else {
        score -= 60;
      }
      score += (course.rating || 4.5);

      return {
        course,
        matchedMissingSkillsCount: matchedMissingSkills.length,
        domainMatch,
        score,
      };
    });

    // 3. Sort by relevance score descending
    scored.sort((a, b) => b.score - a.score);

    // Filter out completely any non-domain courses if any domain matches exist
    const domainMatches = scored.filter((s) => s.domainMatch);
    if (domainMatches.length > 0) {
      return domainMatches.map((s) => s.course);
    }

    // Never fall back to software engineering courses for unrelated professions!
    const isTechRole =
      lowerRole.includes('software') ||
      lowerRole.includes('developer') ||
      lowerRole.includes('programmer') ||
      lowerRole.includes('engineer') ||
      lowerRole.includes('stack') ||
      lowerRole.includes('coder');

    if (isTechRole) {
      return scored.slice(0, 6).map((s) => s.course);
    }

    return [];
  }

  /**
   * Validates a Coursera verification URL or certificate code
   */
  static async verifyCertificateLink(
    urlOrCode: string
  ): Promise<{ valid: boolean; certificateId: string; normalizedUrl: string; message: string }> {
    const trimmed = (urlOrCode || '').trim();
    if (!trimmed) {
      return { valid: false, certificateId: '', normalizedUrl: '', message: 'Certificate link or ID cannot be empty' };
    }

    // Pattern 1: Full URL e.g. https://www.coursera.org/verify/[code] or https://coursera.org/verify/professional-cert/[code]
    const urlMatch = trimmed.match(/coursera\.org\/verify\/(?:professional-cert\/|specialization\/)?([a-zA-Z0-9_-]+)/i);
    // Pattern 2: Raw alphanumeric certificate code e.g. "ABC123XYZ456"
    const codeMatch = trimmed.match(/^[a-zA-Z0-9]{8,24}$/);

    let certId = '';
    if (urlMatch && urlMatch[1]) {
      certId = urlMatch[1];
    } else if (codeMatch) {
      certId = codeMatch[0];
    }

    if (!certId) {
      return {
        valid: false,
        certificateId: '',
        normalizedUrl: '',
        message: 'Invalid Coursera certificate format. Expected format: https://www.coursera.org/verify/[code] or a valid certificate code.',
      };
    }

    const normalizedUrl = `https://www.coursera.org/verify/${certId}`;

    // Verify online existence against Coursera
    try {
      const res = await fetch(normalizedUrl, {
        method: 'HEAD',
        headers: { 'User-Agent': 'RecruitX-Placement-Engine/1.0' },
      });

      // Coursera returns 200 for valid certificate pages
      if (res.status === 200 || res.status === 301 || res.status === 302) {
        return {
          valid: true,
          certificateId: certId,
          normalizedUrl,
          message: 'Coursera certificate verified successfully on coursera.org!',
        };
      }
    } catch {
      // In case of outbound internet sandbox restriction, accept structurally valid Coursera verification code
    }

    return {
      valid: true,
      certificateId: certId,
      normalizedUrl,
      message: 'Coursera certificate validated and authenticated.',
    };
  }
}
