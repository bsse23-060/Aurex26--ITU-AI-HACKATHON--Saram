export type RiskLevel = "low" | "medium" | "high";
export type Mode = "accelerate" | "steady" | "repair" | "support";
export type Mood = "focused" | "confused" | "busy" | "low-confidence" | "energized";

export interface CourseModule {
  id: string;
  title: string;
  program: string;
  level: string;
  duration_minutes: number;
  skills: string[];
  outcomes: string[];
  best_for: string[];
  project_seed: string;
}

export interface LearningTwin {
  id: string;
  name: string;
  goal: string;
  background: string;
  weekly_hours: number;
  language: "English" | "Urdu" | "Mixed";
  confidence: number;
  baseline_quiz: number;
  attendance_rate: number;
  activity_rate: number;
  motivation_style: string;
  barriers: string[];
  weak_skills: string[];
  primary_track: string;
  risk_score: number;
  risk_level: RiskLevel;
  signature: string;
}

export interface DailyPlan {
  title: string;
  duration_minutes: number;
  lesson: string;
  micro_task: string;
  confidence_check: string;
  next_action: string;
  capstone_path: string;
  peer_pod: string[];
  explanation: string[];
  mode: Mode;
}

export interface OnboardingResponse {
  twin: LearningTwin;
  today: DailyPlan;
}

export interface OnboardingPayload {
  name: string;
  goal: string;
  background: string;
  weekly_hours: number;
  language: "English" | "Urdu" | "Mixed";
  confidence: number;
  baseline_quiz: number;
  attendance_rate: number;
  activity_rate: number;
  motivation_style: string;
  barriers: string[];
  weak_skills: string[];
}

export interface RiskCard {
  learner: string;
  risk_score: number;
  risk_level: RiskLevel;
  reasons: string[];
  nudge: string;
  suggested_action: string;
}

export interface InstructorDashboard {
  risk_cards: RiskCard[];
  peer_pods: string[][];
  focus_summary: string;
}

export interface AdminInsights {
  cohort_health: string;
  top_skill_gaps: string[];
  content_opportunities: string[];
  demand_signals: string[];
  recommended_experiments: string[];
}

export interface CoachResponse {
  answer: string;
  source: "llm" | "fallback";
  recommended_next_step: string;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed: ${response.status}`);
  }
  return response.json();
}

export const api = {
  courses: () => request<CourseModule[]>("/api/courses"),
  demo: () => request<OnboardingResponse[]>("/api/demo"),
  onboard: (payload: OnboardingPayload) =>
    request<OnboardingResponse>("/api/onboarding", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  checkin: (learnerId: string, mood: Mood, confidence: number) =>
    request<OnboardingResponse>("/api/checkin", {
      method: "POST",
      body: JSON.stringify({ learner_id: learnerId, mood, confidence }),
    }),
  coach: (learnerId: string, question: string, mood: Mood) =>
    request<CoachResponse>("/api/coach", {
      method: "POST",
      body: JSON.stringify({ learner_id: learnerId, question, mood }),
    }),
  instructor: () => request<InstructorDashboard>("/api/instructor/risk"),
  admin: () => request<AdminInsights>("/api/admin/insights"),
};

