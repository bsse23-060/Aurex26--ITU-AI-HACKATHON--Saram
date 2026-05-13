const base = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function api<T>(
  path: string,
  init: RequestInit & { token?: string | null } = {},
): Promise<T> {
  const { token, headers: h, ...rest } = init;
  const headers = new Headers(h);
  if (!headers.has("Content-Type") && rest.body && typeof rest.body === "string") {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  const url = path.startsWith("http") ? path : `${base}${path}`;
  const res = await fetch(url, { ...rest, headers });
  const text = await res.text();
  if (!res.ok) {
    throw new ApiError(res.statusText || "Request failed", res.status, text);
  }
  if (!text) return undefined as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}

export type Role = "student" | "instructor" | "admin";

export type User = {
  id: number;
  email: string;
  full_name: string;
  role: Role;
  avatar_seed: string;
  enrolled_course_id: number | null;
  weekly_hours: number;
  goal: string | null;
  prior_experience: string | null;
  language_pref: string;
  onboarded_at: string | null;
};

export type Course = {
  id: number;
  slug: string;
  title: string;
  tagline: string;
  description: string;
  color: string;
  icon: string;
  instructor_id: number | null;
  modules: ModuleSummary[];
};

export type ModuleSummary = {
  id: number;
  course_id: number;
  slug: string;
  title: string;
  summary: string;
  estimated_minutes: number;
  position: number;
};

export type ConceptOut = {
  id: number;
  slug: string;
  name: string;
  description: string;
  module_id: number;
};

export type ModuleDetail = ModuleSummary & {
  content_md: string;
  concepts: ConceptOut[];
  refresher_concepts: ConceptOut[];
  related_recommendations: ModuleSummary[];
};

export type RoadmapStep = {
  id: number | null;
  position: number;
  module_id: number;
  module_title: string;
  module_summary: string;
  target_week: number;
  rationale: string;
  completed: boolean;
  estimated_minutes: number;
};

export type Roadmap = {
  course_id: number;
  course_title: string;
  course_color: string;
  steps: RoadmapStep[];
  generated_by: string;
};

export type DNAVector = {
  modality: number;
  depth: number;
  pace: number;
  abstraction: number;
  time_of_day: number;
};

export type MasteryRow = {
  concept_id: number;
  concept_slug: string;
  concept_name: string;
  module_id: number;
  p_mastery: number;
  last_seen: string | null;
};

export type QuizItem = {
  id: number;
  module_id: number;
  concept_id: number;
  prompt: string;
  options: string[];
  difficulty: number;
};

export type AdaptiveQuiz = {
  module_id: number;
  items: QuizItem[];
  weak_concept_ids: number[];
  rationale: string;
};

export type QuizAnswerResult = {
  quiz_item_id: number;
  correct: boolean;
  correct_index: number;
  explanation: string;
  mastery_delta: {
    concept_id: number;
    concept_name: string;
    before: number;
    after: number;
  };
  confusion_triggered: boolean;
  confusion_message: string | null;
};

export type TutorCitation = {
  module_id: number;
  module_title: string;
  concept: string | null;
  snippet: string;
};

export type TutorResponse = {
  reply: string;
  language: string;
  citations: TutorCitation[];
  suggested_followups: string[];
};

export type TutorMessage = {
  id: number;
  role: "user" | "assistant";
  content: string;
  language: string;
  citations: TutorCitation[];
  created_at: string;
};

export type SkillNode = {
  id: number;
  slug: string;
  name: string;
  module_id: number;
  module_title: string;
  course_id: number;
  p_mastery: number;
  state: "mastered" | "learning" | "locked";
};

export type SkillEdge = { src: number; dst: number };

export type SkillGraph = { nodes: SkillNode[]; edges: SkillEdge[] };

export type PeerTwin = {
  twin_id: number;
  twin_name: string;
  avatar_seed: string;
  modules_ahead: number;
  similarity: number;
  shared_strengths: string[];
  note: string;
} | null;

export type CareerSkillGap = {
  concept_slug: string;
  concept_name: string;
  current: number;
  required: number;
};

export type CareerRole = {
  role_slug: string;
  role_title: string;
  description: string;
  match_pct: number;
  weeks_to_ready: number | null;
  salary_pkr_min: number;
  salary_pkr_max: number;
  market_demand: number;
  skill_gaps: CareerSkillGap[];
};

export type CareerProjection = {
  horizon_weeks: number;
  projected_mastery_avg: number;
  label: string;
};

export type Career = {
  current_mastery_avg: number;
  weekly_hours: number;
  projections: CareerProjection[];
  roles: CareerRole[];
};

export type DiagnosticItem = {
  quiz_item_id: number;
  module_id: number;
  concept_id: number;
  concept_slug: string;
  prompt: string;
  options: string[];
};

export type DnaScenario = {
  id: string;
  dim: keyof DNAVector;
  prompt: string;
  options: { label: string; value: number }[];
};

export type DnaScenarios = { scenarios: DnaScenario[] };

export type AtRiskStudent = {
  user_id: number;
  full_name: string;
  email: string;
  avatar_seed: string;
  course_id: number | null;
  course_title: string | null;
  risk_prob: number;
  risk_band: string;
  burnout_flag: boolean;
  mastery_avg: number;
  days_since_active: number;
  completion_pct: number;
  top_reasons: { feature: string; label: string; contribution: number }[];
};

export type InstructorDashboard = {
  instructor_id: number;
  course_id: number | null;
  course_title: string | null;
  total_students: number;
  active_last_7d: number;
  avg_completion_pct: number;
  avg_mastery: number;
  high_risk_count: number;
  burnout_count: number;
  students: AtRiskStudent[];
};

export type StudentDetail = {
  user_id: number;
  full_name: string;
  email: string;
  avatar_seed: string;
  role: string;
  course_id: number | null;
  course_title: string | null;
  dna: Record<string, number> | null;
  weekly_hours: number;
  goal: string | null;
  mastery_avg: number;
  completion_pct: number;
  risk_prob: number;
  burnout_flag: boolean;
  top_reasons: { feature: string; label: string; contribution: number }[];
  recent_attempts: number;
  recent_tutor_questions: number;
  concept_mastery: {
    concept_id: number;
    concept_name: string;
    module_id: number;
    module_title: string;
    avg_mastery: number;
    learners_struggling: number;
  }[];
  confusion_incidents: number;
};

export type TrackHealth = {
  course_id: number;
  course_title: string;
  enrolled: number;
  active_last_7d: number;
  avg_completion_pct: number;
  avg_mastery: number;
  high_risk_count: number;
};

export type AdminAnalytics = {
  total_learners: number;
  total_instructors: number;
  active_last_7d: number;
  avg_mastery: number;
  tracks: TrackHealth[];
  funnel: { label: string; count: number }[];
};

export const endpoints = {
  demoAccounts: () =>
    api<{
      accounts: { role: string; email: string; password: string; label: string }[];
    }>("/api/auth/demo-accounts"),
  me: (token: string) => api<User>("/api/auth/me", { token }),
  courses: (token?: string | null) => api<Course[]>("/api/courses", { token: token ?? undefined }),
  dnaScenarios: (token: string) => api<DnaScenarios>("/api/onboarding/dna-scenarios", { token }),
  diagnostic: (courseId: number, token: string) =>
    api<{ course_id: number; items: DiagnosticItem[] }>(
      `/api/onboarding/diagnostic/${courseId}`,
      { token },
    ),
  completeOnboarding: (payload: unknown, token: string) =>
    api<Roadmap>("/api/onboarding/complete", {
      method: "POST",
      body: JSON.stringify(payload),
      token,
    }),
  roadmap: (token: string) => api<Roadmap>("/api/student/roadmap", { token }),
  dna: (token: string) => api<DNAVector>("/api/student/dna", { token }),
  mastery: (token: string) => api<MasteryRow[]>("/api/student/mastery", { token }),
  module: (id: number, token: string) =>
    api<ModuleDetail>(`/api/student/modules/${id}`, { token }),
  adaptiveQuiz: (moduleId: number, token: string) =>
    api<AdaptiveQuiz>(`/api/student/modules/${moduleId}/quiz`, { token }),
  answerQuiz: (
    body: { quiz_item_id: number; selected_index: number; seconds: number; retries: number },
    token: string,
  ) =>
    api<QuizAnswerResult>("/api/student/quiz/answer", {
      method: "POST",
      body: JSON.stringify(body),
      token,
    }),
  completeRoadmapStep: (id: number, token: string) =>
    api<RoadmapStep>(`/api/student/roadmap/${id}/complete`, { method: "POST", token }),
  logEvent: (
    body: { kind: string; module_id?: number | null; payload?: Record<string, unknown> },
    token: string,
  ) =>
    api<{ ok: boolean }>("/api/student/events", {
      method: "POST",
      body: JSON.stringify(body),
      token,
    }),
  skillGraph: (token: string) => api<SkillGraph>("/api/student/skill-graph", { token }),
  career: (token: string) => api<Career>("/api/student/career", { token }),
  twin: (token: string) => api<PeerTwin>("/api/student/twin", { token }),
  tutorAsk: (
    body: { message: string; module_id?: number | null; language_hint?: string | null },
    token: string,
  ) =>
    api<TutorResponse>("/api/tutor/ask", {
      method: "POST",
      body: JSON.stringify(body),
      token,
    }),
  tutorHistory: (limit: number, token: string) =>
    api<TutorMessage[]>(`/api/tutor/history?limit=${limit}`, { token }),
  voiceStatus: () =>
    api<{
      enabled: boolean;
      tts_enabled: boolean;
      stt_enabled: boolean;
      voice_id: string | null;
      stt_model: string | null;
      stt_languages: string[];
    }>("/api/tutor/voice/status"),
  voiceTranscribe: (blob: Blob, language: "auto" | "en" | "ur", token: string) => {
    const form = new FormData();
    const ext = (blob.type.split("/")[1] || "webm").split(";")[0];
    form.append("audio", blob, `clip.${ext}`);
    form.append("language", language);
    return api<{
      text: string;
      language: string;
      duration_s: number | null;
      model: string;
    }>("/api/tutor/voice/stt", {
      method: "POST",
      body: form,
      token,
    });
  },
  instructorDashboard: (token: string) =>
    api<InstructorDashboard>("/api/instructor/dashboard", { token }),
  studentDetail: (id: number, token: string) =>
    api<StudentDetail>(`/api/instructor/students/${id}`, { token }),
  adminAnalytics: (token: string) =>
    api<AdminAnalytics>("/api/admin/analytics", { token }),
};
