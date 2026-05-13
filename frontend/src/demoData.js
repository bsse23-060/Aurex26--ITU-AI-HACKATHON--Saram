export const demoAccounts = [
  { role: "student", email: "student@atomcamp.dev", password: "student123", label: "Student" },
  { role: "instructor", email: "instructor@atomcamp.dev", password: "instructor123", label: "Instructor" },
  { role: "admin", email: "admin@atomcamp.dev", password: "admin123", label: "Admin" },
];

export const fallbackUsers = {
  student: {
    full_name: "Saram Aslam",
    email: "student@atomcamp.dev",
    role: "student",
    goal: "Become job-ready in AI",
  },
  instructor: {
    full_name: "Hira Khan",
    email: "instructor@atomcamp.dev",
    role: "instructor",
  },
  admin: {
    full_name: "Atomcamp Admin",
    email: "admin@atomcamp.dev",
    role: "admin",
  },
};

export const atomcampSignals = [
  { label: "People trained", value: "10,000+", tone: "green" },
  { label: "Corporate clients", value: "70", tone: "blue" },
  { label: "Women participation", value: "45%", tone: "rose" },
  { label: "Flagship tracks", value: "AI + Data", tone: "amber" },
];

export const atomcampOfferings = [
  {
    title: "AI Bootcamp",
    audience: "Engineers and early-career builders",
    outcome: "Build applied AI projects with Python, ML, LLMs, and agents.",
    focus: ["Python", "Machine Learning", "Generative AI", "Portfolio"],
  },
  {
    title: "Data Analytics Bootcamp",
    audience: "Professionals moving into data roles",
    outcome: "Turn raw data into decisions using analytics, dashboards, and storytelling.",
    focus: ["Excel", "SQL", "Power BI", "Business Insight"],
  },
  {
    title: "Automation with AI",
    audience: "Teams and professionals",
    outcome: "Automate repetitive work and operational workflows with modern AI tools.",
    focus: ["AI Tools", "Workflow Design", "Productivity", "No-code"],
  },
  {
    title: "Agentic AI Bootcamp",
    audience: "AI builders and automation teams",
    outcome: "Design agents that use tools, retrieval, and reliable multi-step workflows.",
    focus: ["Agents", "RAG", "Tool Use", "Evaluation"],
  },
  {
    title: "AI for Teens",
    audience: "Young learners",
    outcome: "Introduce AI safely through creative, practical projects.",
    focus: ["AI Basics", "Projects", "Responsible Use", "Creativity"],
  },
  {
    title: "Python Summer Coding Camp",
    audience: "Beginners",
    outcome: "Learn programming fundamentals through hands-on coding.",
    focus: ["Python", "Logic", "Problem Solving", "Mini Apps"],
  },
];

export const fallbackCourses = [
  {
    id: 1,
    slug: "ai-bootcamp",
    title: "AI Bootcamp",
    tagline: "Python, ML, LLMs, computer vision, and AI agents.",
    description:
      "A practical 3-month track for learners moving from fundamentals to job-ready intelligent systems.",
    color: "#1f7a68",
    icon: "Brain",
    modules: [
      {
        id: 101,
        course_id: 1,
        slug: "python-foundations",
        title: "Python Foundations",
        summary: "Core syntax, functions, control flow, and debugging habits.",
        estimated_minutes: 35,
        position: 1,
      },
      {
        id: 102,
        course_id: 1,
        slug: "machine-learning-core",
        title: "Machine Learning Core",
        summary: "Regression, classification, evaluation, and model selection.",
        estimated_minutes: 50,
        position: 2,
      },
      {
        id: 103,
        course_id: 1,
        slug: "generative-ai",
        title: "Generative AI and LLMs",
        summary: "Prompting, retrieval, embeddings, and applied agent workflows.",
        estimated_minutes: 45,
        position: 3,
      },
    ],
  },
  {
    id: 2,
    slug: "data-analytics-bootcamp",
    title: "Data Analytics Bootcamp",
    tagline: "Excel, SQL, Power BI, dashboards, and decision storytelling.",
    description:
      "A non-technical learner path for turning raw data into practical business insight.",
    color: "#4d6bff",
    icon: "Chart",
    modules: [],
  },
  {
    id: 3,
    slug: "agentic-ai-bootcamp",
    title: "Agentic AI Bootcamp",
    tagline: "Build useful AI agents with tools, workflows, and guardrails.",
    description:
      "A focused track for automating work through agentic AI and retrieval systems.",
    color: "#d76a3d",
    icon: "Spark",
    modules: [],
  },
  {
    id: 4,
    slug: "automation-with-ai",
    title: "Automation with AI",
    tagline: "Automate repetitive work with modern AI tools.",
    description:
      "A short applied program for professionals who want immediate workplace productivity gains.",
    color: "#805ad5",
    icon: "Bolt",
    modules: [],
  },
];

export const fallbackRoadmap = {
  course_id: 1,
  course_title: "Artificial Intelligence Bootcamp",
  course_color: "#1f7a68",
  generated_by: "adaptive-rules",
  steps: [
    {
      position: 1,
      module_id: 101,
      module_title: "Python Foundations",
      module_summary: "Refresher first because diagnostics showed inconsistent syntax fluency.",
      target_week: 1,
      rationale: "Short sessions and visual examples match the learner DNA.",
      completed: true,
      estimated_minutes: 35,
    },
    {
      position: 2,
      module_id: 102,
      module_title: "Machine Learning Core",
      module_summary: "Focus on model evaluation before moving deeper into deployment.",
      target_week: 2,
      rationale: "Weakness in metrics would block later AI project work.",
      completed: false,
      estimated_minutes: 50,
    },
    {
      position: 3,
      module_id: 103,
      module_title: "Generative AI and LLMs",
      module_summary: "Prompting, retrieval, embeddings, and applied agents.",
      target_week: 3,
      rationale: "Sequenced after ML evaluation so outputs can be tested responsibly.",
      completed: false,
      estimated_minutes: 45,
    },
    {
      position: 4,
      module_id: 104,
      module_title: "Capstone Studio",
      module_summary: "Build a real-world AI app with an instructor review loop.",
      target_week: 4,
      rationale: "Portfolio work starts once foundations are stable.",
      completed: false,
      estimated_minutes: 70,
    },
  ],
};

export const fallbackDNA = {
  modality: 0.72,
  depth: 0.58,
  pace: 0.62,
  abstraction: 0.44,
  time_of_day: 0.82,
};

export const fallbackMastery = [
  { concept_id: 1, concept_slug: "py.syntax", concept_name: "Python syntax", module_id: 101, p_mastery: 0.76 },
  { concept_id: 2, concept_slug: "py.functions", concept_name: "Functions", module_id: 101, p_mastery: 0.68 },
  { concept_id: 3, concept_slug: "ml.supervised", concept_name: "Supervised learning", module_id: 102, p_mastery: 0.49 },
  { concept_id: 4, concept_slug: "ml.evaluation", concept_name: "Model evaluation", module_id: 102, p_mastery: 0.38 },
  { concept_id: 5, concept_slug: "llm.retrieval", concept_name: "Retrieval augmented generation", module_id: 103, p_mastery: 0.26 },
  { concept_id: 6, concept_slug: "agents.tools", concept_name: "Agent tool use", module_id: 103, p_mastery: 0.18 },
];

export const fallbackSkillGraph = {
  nodes: [
    { id: 1, name: "Python syntax", p_mastery: 0.76, state: "mastered", module_title: "Python" },
    { id: 2, name: "Functions", p_mastery: 0.68, state: "learning", module_title: "Python" },
    { id: 3, name: "Supervised learning", p_mastery: 0.49, state: "learning", module_title: "ML Core" },
    { id: 4, name: "Model evaluation", p_mastery: 0.38, state: "learning", module_title: "ML Core" },
    { id: 5, name: "RAG", p_mastery: 0.26, state: "locked", module_title: "Generative AI" },
    { id: 6, name: "AI agents", p_mastery: 0.18, state: "locked", module_title: "Generative AI" },
  ],
  edges: [
    { src: 1, dst: 2 },
    { src: 2, dst: 3 },
    { src: 3, dst: 4 },
    { src: 4, dst: 5 },
    { src: 5, dst: 6 },
  ],
};

export const fallbackCareer = {
  current_mastery_avg: 0.51,
  weekly_hours: 6,
  projections: [
    { horizon_weeks: 2, projected_mastery_avg: 0.6, label: "Capstone ready" },
    { horizon_weeks: 5, projected_mastery_avg: 0.72, label: "Internship ready" },
    { horizon_weeks: 8, projected_mastery_avg: 0.82, label: "Junior role ready" },
  ],
  roles: [
    {
      role_slug: "junior-ai-engineer",
      role_title: "Junior AI Engineer",
      description: "Build and evaluate applied ML and LLM workflows.",
      match_pct: 0.64,
      weeks_to_ready: 6,
      salary_pkr_min: 120000,
      salary_pkr_max: 280000,
      market_demand: 0.82,
      skill_gaps: [
        { concept_slug: "ml.evaluation", concept_name: "Model evaluation", current: 0.38, required: 0.72 },
        { concept_slug: "llm.retrieval", concept_name: "RAG", current: 0.26, required: 0.62 },
      ],
    },
    {
      role_slug: "data-analyst",
      role_title: "Data Analyst",
      description: "Analyze learner and business data with Python and dashboards.",
      match_pct: 0.71,
      weeks_to_ready: 4,
      salary_pkr_min: 80000,
      salary_pkr_max: 180000,
      market_demand: 0.86,
      skill_gaps: [
        { concept_slug: "py.functions", concept_name: "Functions", current: 0.68, required: 0.76 },
      ],
    },
  ],
};

export const fallbackTwin = {
  twin_id: 7,
  twin_name: "Ayesha Raza",
  avatar_seed: "ayesha",
  modules_ahead: 2,
  similarity: 0.84,
  shared_strengths: ["visual learning", "evening study", "project focus"],
  note: "Ayesha improved model evaluation by switching from videos to micro-quizzes.",
};

export const fallbackTutorHistory = [
  {
    role: "assistant",
    content:
      "Your weakest current concept is model evaluation. Start with precision and recall, then test one confusion matrix example.",
    language: "en",
  },
];

export const fallbackQuiz = {
  module_id: 102,
  weak_concept_ids: [3, 4],
  rationale: "Selected items emphasize evaluation because it is the blocker for later LLM work.",
  items: [
    {
      id: 9001,
      module_id: 102,
      concept_id: 4,
      prompt: "Why do we keep a test set separate from the training set?",
      options: [
        "To honestly measure generalisation",
        "To make training faster",
        "To increase the number of labels",
        "To avoid writing evaluation code",
      ],
      difficulty: 0.42,
    },
  ],
};

export const fallbackInstructorDashboard = {
  instructor_id: 2,
  course_id: 1,
  course_title: "Artificial Intelligence Bootcamp",
  total_students: 36,
  active_last_7d: 29,
  avg_completion_pct: 0.58,
  avg_mastery: 0.61,
  high_risk_count: 5,
  burnout_count: 3,
  students: [
    {
      user_id: 12,
      full_name: "Bilal Shah",
      email: "bilal@atomcamp.dev",
      avatar_seed: "bilal",
      course_title: "Artificial Intelligence Bootcamp",
      risk_prob: 0.82,
      risk_band: "high",
      burnout_flag: false,
      mastery_avg: 0.36,
      days_since_active: 6,
      completion_pct: 0.28,
      top_reasons: [
        { feature: "mastery", label: "Low quiz mastery", contribution: 0.34 },
        { feature: "activity", label: "Declining sessions", contribution: 0.26 },
      ],
    },
    {
      user_id: 15,
      full_name: "Hassan Ali",
      email: "hassan@atomcamp.dev",
      avatar_seed: "hassan",
      course_title: "Artificial Intelligence Bootcamp",
      risk_prob: 0.73,
      risk_band: "high",
      burnout_flag: true,
      mastery_avg: 0.48,
      days_since_active: 2,
      completion_pct: 0.41,
      top_reasons: [
        { feature: "burnout", label: "Long sessions with repeated confusion", contribution: 0.38 },
        { feature: "quiz", label: "Retries increasing", contribution: 0.21 },
      ],
    },
    {
      user_id: 18,
      full_name: "Maryam Iqbal",
      email: "maryam@atomcamp.dev",
      avatar_seed: "maryam",
      course_title: "Artificial Intelligence Bootcamp",
      risk_prob: 0.43,
      risk_band: "medium",
      burnout_flag: false,
      mastery_avg: 0.55,
      days_since_active: 1,
      completion_pct: 0.51,
      top_reasons: [
        { feature: "concept", label: "Evaluation gap", contribution: 0.16 },
      ],
    },
  ],
};

export const fallbackCourseAnalytics = {
  course_id: 1,
  course_title: "Artificial Intelligence Bootcamp",
  concept_mastery: [
    { concept_id: 1, concept_name: "Python syntax", module_title: "Python", avg_mastery: 0.78, learners_struggling: 4 },
    { concept_id: 2, concept_name: "Functions", module_title: "Python", avg_mastery: 0.66, learners_struggling: 8 },
    { concept_id: 3, concept_name: "Supervised learning", module_title: "ML Core", avg_mastery: 0.52, learners_struggling: 13 },
    { concept_id: 4, concept_name: "Model evaluation", module_title: "ML Core", avg_mastery: 0.42, learners_struggling: 17 },
    { concept_id: 5, concept_name: "RAG", module_title: "Generative AI", avg_mastery: 0.35, learners_struggling: 19 },
  ],
  failure_modes: [
    { failure_mode: "metric-confusion", count: 21 },
    { failure_mode: "syntax", count: 14 },
    { failure_mode: "causal-confusion", count: 9 },
  ],
  hardest_items: [
    {
      quiz_item_id: 41,
      module_title: "ML Core",
      concept_name: "Model evaluation",
      prompt: "Accuracy is misleading on imbalanced data because...",
      accuracy: 0.34,
    },
    {
      quiz_item_id: 53,
      module_title: "Generative AI",
      concept_name: "RAG",
      prompt: "Embeddings help retrieval by...",
      accuracy: 0.39,
    },
  ],
};

export const fallbackStudentDetail = {
  user_id: 12,
  full_name: "Bilal Shah",
  course_title: "Artificial Intelligence Bootcamp",
  weekly_hours: 4,
  goal: "Switch into AI engineering",
  mastery_avg: 0.36,
  completion_pct: 0.28,
  risk_prob: 0.82,
  burnout_flag: false,
  recent_attempts: 7,
  recent_tutor_questions: 5,
  confusion_incidents: 6,
  top_reasons: [
    { feature: "mastery", label: "Low quiz mastery", contribution: 0.34 },
    { feature: "activity", label: "Declining sessions", contribution: 0.26 },
  ],
  concept_mastery: fallbackCourseAnalytics.concept_mastery,
};

export const fallbackAdminAnalytics = {
  total_learners: 1180,
  total_instructors: 42,
  active_last_7d: 914,
  avg_mastery: 0.63,
  tracks: [
    {
      course_id: 1,
      course_title: "Artificial Intelligence Bootcamp",
      enrolled: 360,
      active_last_7d: 298,
      avg_completion_pct: 0.62,
      avg_mastery: 0.64,
      high_risk_count: 34,
    },
    {
      course_id: 2,
      course_title: "Data Analytics Bootcamp",
      enrolled: 420,
      active_last_7d: 336,
      avg_completion_pct: 0.69,
      avg_mastery: 0.68,
      high_risk_count: 25,
    },
    {
      course_id: 3,
      course_title: "Agentic AI Bootcamp",
      enrolled: 180,
      active_last_7d: 141,
      avg_completion_pct: 0.49,
      avg_mastery: 0.56,
      high_risk_count: 21,
    },
    {
      course_id: 4,
      course_title: "Automation with AI",
      enrolled: 220,
      active_last_7d: 139,
      avg_completion_pct: 0.57,
      avg_mastery: 0.61,
      high_risk_count: 18,
    },
  ],
  funnel: [
    { label: "Onboarded", count: 1180 },
    { label: "Active 7d", count: 914 },
    { label: ">= 50% complete", count: 653 },
    { label: "Projected role-ready", count: 487 },
  ],
};
