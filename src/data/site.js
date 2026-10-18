// All portfolio content lives here. Everything is taken from Anika's resume;
// edit this file to update the site without touching component markup.

export const site = {
  name: "Anika",
  fullName: "Anika Jain",
  // Edited from Anika.jpeg by scripts/make-portrait.py.
  portrait: { src: "/images/anika-portrait.jpg", width: 960, height: 832 },
  role: "AI/ML & Full-Stack Developer",
  // Short form that fits the badge and the identity read-out.
  roleShort: "AI/ML & Full-Stack",
  description:
    "Anika Jain is a B.Tech Computer Science and Engineering student specialising in Data Science and AI, building practical AI/ML and full-stack solutions for real-world problems.",
  email: "anika.bin@gmail.com",
  phone: { label: "+91 97537 02530", href: "tel:+919753702530" },
  location: "Noida, India",
  year: "2026",
  availability: { open: true, label: "Open to opportunities" },
  badge: { serial: "0001", edition: "MMXXVI", pass: "Student pass" },

  hero: {
    // "Hello," / "I'm Anika" / closing line. Kept to one line (like the
    // reference's "a creative developer.") so the hero stays three lines;
    // "full-stack" is carried by the intro, badge, loader and page title.
    closing: "an AI/ML developer.",
    intro:
      "I'm a Computer Science and Engineering student specialising in Data Science and AI, building practical AI/ML and full-stack solutions for real-world problems.",
  },

  identity: {
    statement:
      "Turning real-world problems into practical AI/ML and full-stack systems, one carefully built project at a time.",
    facts: [
      { label: "Name", icon: "name", lines: ["Anika Jain"] },
      { label: "Focus", icon: "role", lines: ["AI/ML & Full-Stack", "Development"] },
      { label: "Education", icon: "education", lines: ["B.Tech CSE (DS & AI)", "CGPA 9.28 / 10"] },
      { label: "Institution", icon: "institution", lines: ["SRM University, Delhi NCR", "2024 – 2028"] },
      { label: "Location", icon: "location", lines: ["Noida, India"] },
      { label: "Currently", icon: "currently", lines: ["Developing applied AI/ML", "& full-stack projects"] },
    ],
  },

  contact: {
    github: { label: "github.com/anikabin-lang", href: "https://github.com/anikabin-lang" },
    linkedin: {
      label: "linkedin.com/in/anika-jain",
      href: "https://www.linkedin.com/in/anika-jain-81980b359?utm_source=share_via&utm_content=profile&utm_medium=member_ios",
    },
    resume: {
      label: "Download PDF",
      href: "/files/anika-jain-resume.pdf",
      file: "Anika-Jain-Resume.pdf",
    },
  },

  closing: {
    heading: ["Let’s Build Something", "Intelligent."],
    invitation:
      "I’m always open to meaningful collaborations, hackathons and ideas that turn data into something useful.",
    signOff: "Let’s solve something real.",
  },
};

// Selected work. `plate`/`light` choose the card material and the room light;
// `mark` is the large etched word at the foot of each card.
export const projects = [
  {
    name: "Jaldrishti",
    category: "Heritage AI",
    year: "2026 – Present",
    line: "AI-powered digital intelligence for India’s",
    emphasis: "traditional water heritage.",
    summary:
      "An AI-assisted heritage conservation platform using computer vision and Indian Knowledge Systems (IKS), enabling damage assessment and restoration planning through image analysis and 3D modelling.",
    detail: "Hackathon winner · 2026",
    stack: ["Python", "OpenCV", "YOLOv8-Seg"],
    mark: { text: "जलदृष्टि", cut: "devanagari", lang: "hi" },
    plate: "stone",
    light: "morning",
    links: [
      { label: "Live demo", href: "https://jaldrishti-sigma.vercel.app/", primary: true },
      { label: "GitHub", href: "https://github.com/anikabin-lang/JalDrishti.git" },
    ],
  },
  {
    name: "DRISHTI",
    category: "Network threat intelligence",
    year: "2026 – Present",
    line: "Real-time threat intelligence across",
    emphasis: "8.85M network flows.",
    summary:
      "An ML ensemble that detects cyber threats, with dynamic feature extraction, risk scoring, explainable evidence graphs and real-time human-in-the-loop alerts.",
    detail: "IBM National Hackathon · Finalist",
    stack: ["Python", "scikit-learn", "XGBoost", "LightGBM", "CatBoost", "Pandas", "NumPy"],
    mark: { text: "DRISHTI", cut: "fine" },
    plate: "cobalt",
    light: "soft",
    links: [{ label: "GitHub", href: "https://github.com/anikabin-lang/DRISHTI.git", primary: true }],
  },
  {
    name: "BACK2U",
    category: "Multimodal lost & found",
    year: "2026 – Present",
    line: "Finding the same lost item",
    emphasis: "from an image or a few words.",
    summary:
      "Image–text retrieval with instance-level re-identification, multimodal reranking and uncertainty calibration — plus contributions to the UI, APIs and database architecture.",
    detail: "Instance-level re-ID",
    stack: ["PyTorch", "DINOv2", "Grounding DINO", "SigLIP2", "FAISS", "FastAPI"],
    mark: { text: "back2u", cut: "round" },
    plate: "clay",
    light: "daylight",
    links: [{ label: "GitHub", href: "https://github.com/anikabin-lang/Back2U.git", primary: true }],
  },
];

export const process = [
  {
    when: "First",
    name: "Understand",
    emphasis: "the problem",
    text: "Identify the real-world challenge and the context in which the solution will be used.",
    yields: ["Context", "Users", "Constraints"],
    paper: "stone",
  },
  {
    when: "Then",
    name: "Explore",
    emphasis: "the data",
    text: "Work with the relevant images, data, network flows and other evidence to understand the problem.",
    yields: ["Images", "Flows", "Evidence"],
    paper: "sage",
  },
  {
    when: "Next",
    name: "Build",
    emphasis: "intelligent systems",
    text: "Combine AI/ML models, computer vision, retrieval, APIs and full-stack components where they fit.",
    yields: ["Models", "Retrieval", "APIs"],
    paper: "mist",
  },
  {
    when: "Finally",
    name: "Validate",
    emphasis: "and refine",
    text: "Use evidence, risk scoring, uncertainty calibration and practical iteration to improve the system.",
    yields: ["Evidence", "Calibration", "Iteration"],
    paper: "clay",
  },
];

export const education = [
  {
    school: "SRM University, Delhi NCR",
    place: "Sonipat, India",
    award: "B.Tech in Computer Science and Engineering",
    detail: "Data Science and Artificial Intelligence",
    years: "2024 – 2028",
    score: "CGPA 9.28 / 10",
  },
  {
    school: "Delhi Public School",
    place: "Gwalior, India",
    award: "Class XII",
    detail: "CBSE",
    years: "2023 – 2024",
  },
  {
    school: "Delhi Public School",
    place: "Gwalior, India",
    award: "Class X",
    detail: "CBSE",
    years: "2021 – 2022",
    score: "95.3%",
  },
];

export const skills = [
  { group: "Programming languages", items: ["C", "C++", "Python", "JavaScript", "SQL"] },
  {
    group: "AI/ML & data science",
    items: ["Artificial Intelligence", "Machine Learning", "PyTorch", "TensorFlow", "scikit-learn", "NumPy", "Pandas", "Matplotlib"],
  },
  { group: "Full-stack development", items: ["MERN Stack", "MongoDB", "Express.js", "React.js", "Node.js"] },
  { group: "Databases", items: ["SQL", "MySQL", "MongoDB", "IBM Cloudant", "PostgreSQL"] },
  {
    group: "Core computer science",
    items: ["Data Structures & Algorithms", "DBMS", "Operating Systems", "Computer Networks", "Theory of Computation"],
  },
  {
    group: "Tools & platforms",
    items: [
      "Git", "GitHub", "VS Code", "Antigravity", "Postman", "Docker", "Vercel", "Firebase",
      "Google Cloud Platform (GCP)", "Tableau", "Power BI", "IBM Watson AI Services", "CI/CD",
    ],
  },
];

export const awards = [
  {
    tag: "Winner · 1st position",
    title: "Viksit Bharat Conclave 2026",
    text: "First position in the Parampara to Prototype — Design Hackathon, organised by SRM University Delhi-NCR, with Jaldrishti.",
    meta: ["8 October 2026", "Team of 4", "Project: Jaldrishti"],
    href: "https://drive.google.com/file/d/1Hm_xB7pdh8Igu9q5kPfeUDMWKT6287Sv/view",
  },
  {
    tag: "National-level finalist",
    title: "IBM National Hackathon 2026",
    text: "Qualified as one of 8 campus finalists with DRISHTI at IBM Expert Labs, Coimbatore.",
    meta: ["12–13 September 2026", "Team of 4", "Project: DRISHTI"],
    href: "https://drive.google.com/file/d/1Kzz3IGaISCRjDRUaWsuhOlFrvj2R9u3Y/view",
  },
];

export const certifications = [
  { name: "Tata GenAI Data Analytics Simulation", by: "Forage", when: "Oct 2026" },
  { name: "Deloitte Data Analytics Simulation", by: "Forage", when: "Jan 2026" },
  { name: "BCG X Data for Decision Makers Simulation", by: "Forage", when: "Jan 2026" },
  { name: "Introduction to AI", by: "Simplilearn SkillUp", when: "Jan 2026" },
  { name: "ServiceNow AI Foundation", by: "FutureSkills Prime" },
  { name: "GenAI & Prompt Engineering", by: "AILytics × HackWithIndia", note: "Workshop" },
  { name: "Full-Stack Web Development", note: "One-week workshop" },
  { name: "SRM Builds 7.0, Verge 2026", note: "Certificate of participation" },
];

export const campus = [
  { role: "Developers Team Member", org: "Appirates, SRM", text: "Contributing to student-led product development." },
  { role: "Volunteer", org: "Agentic AI/GenAI Bootcamp, SRM", text: "Supported a one-day technical event." },
  { role: "Volunteer", org: "Walk In with Zero Experience, SRM", when: "Oct 2026", text: "Supported hackathon preparation activities." },
  { role: "Volunteer", org: "From Campus to Global Careers, SRM", text: "Assisted with career-event coordination." },
];

export const learning = [
  { name: "Data Structures & Algorithms", by: "Apna College", status: "In progress" },
  { name: "Web Development", by: "Apna College", status: "In progress" },
];
