import "./styles.css";
import {
  atomcampOfferings,
  atomcampSignals,
  demoAccounts,
  fallbackAdminAnalytics,
  fallbackCareer,
  fallbackCourseAnalytics,
  fallbackCourses,
  fallbackDNA,
  fallbackInstructorDashboard,
  fallbackMastery,
  fallbackQuiz,
  fallbackRoadmap,
  fallbackSkillGraph,
  fallbackStudentDetail,
  fallbackTutorHistory,
  fallbackTwin,
  fallbackUsers,
} from "./demoData.js";

const API_BASE = import.meta.env?.VITE_API_BASE || "";

const state = {
  role: "student",
  token: "",
  user: fallbackUsers.student,
  accounts: demoAccounts,
  apiStatus: "checking",
  providers: { gemini: false, elevenlabs: false },
  voiceEnabled: false,
  speaking: false,
  voiceListening: false,
  voiceTranscript: "",
  voiceError: "",
  loading: true,
  loadingText: "Preparing atomcamp workspace",
  error: "",
  courses: fallbackCourses,
  roadmap: fallbackRoadmap,
  dna: fallbackDNA,
  mastery: fallbackMastery,
  skillGraph: fallbackSkillGraph,
  career: fallbackCareer,
  twin: fallbackTwin,
  tutorHistory: fallbackTutorHistory,
  quiz: null,
  quizResult: null,
  selectedModuleId: fallbackRoadmap.steps[1].module_id,
  instructor: fallbackInstructorDashboard,
  courseAnalytics: fallbackCourseAnalytics,
  studentDetail: fallbackStudentDetail,
  admin: fallbackAdminAnalytics,
  goalDraft: {
    courseId: fallbackRoadmap.course_id,
    goal: "Become job-ready in AI",
    priorExperience: "beginner",
    weeklyHours: 6,
    languagePref: "auto",
  },
};

const app = document.querySelector("#app");
let voiceRecognition = null;
let currentVoiceAudio = null;

function html(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function pct(value) {
  const normalized = Number(value) > 1 ? Number(value) / 100 : Number(value || 0);
  return `${Math.round(Math.max(0, Math.min(1, normalized)) * 100)}%`;
}

function money(value) {
  return new Intl.NumberFormat("en-PK", { maximumFractionDigits: 0 }).format(value || 0);
}

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value || 0)));
}

function avg(items, field) {
  if (!items?.length) return 0;
  return items.reduce((sum, item) => sum + Number(item[field] || 0), 0) / items.length;
}

function icon(name) {
  const paths = {
    brain:
      '<path d="M9 5a3 3 0 0 0-3 3v1a3 3 0 0 0 0 6v1a3 3 0 0 0 5 2.2V5.8A3 3 0 0 0 9 5Z"/><path d="M15 5a3 3 0 0 1 3 3v1a3 3 0 0 1 0 6v1a3 3 0 0 1-5 2.2V5.8A3 3 0 0 1 15 5Z"/>',
    route:
      '<path d="M5 6h4a3 3 0 0 1 0 6H7a3 3 0 0 0 0 6h12"/><circle cx="5" cy="6" r="2"/><circle cx="19" cy="18" r="2"/>',
    chart:
      '<path d="M4 19V5"/><path d="M4 19h16"/><path d="M8 15l3-4 3 2 4-7"/>',
    warning:
      '<path d="M12 4 3 20h18L12 4Z"/><path d="M12 9v5"/><path d="M12 17h.01"/>',
    send:
      '<path d="m4 12 16-8-5 16-3-7-8-1Z"/><path d="m12 13 8-9"/>',
    refresh:
      '<path d="M20 12a8 8 0 0 1-14.5 4.5"/><path d="M4 16v5h5"/><path d="M4 12A8 8 0 0 1 18.5 7.5"/><path d="M20 8V3h-5"/>',
    play:
      '<path d="M8 5v14l11-7-11-7Z"/>',
    mic:
      '<path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><path d="M12 19v3"/><path d="M8 22h8"/>',
    volume:
      '<path d="M4 10v4h4l5 4V6l-5 4H4Z"/><path d="M16 9a4 4 0 0 1 0 6"/><path d="M18.5 6.5a8 8 0 0 1 0 11"/>',
    user:
      '<circle cx="12" cy="8" r="4"/><path d="M5 21a7 7 0 0 1 14 0"/>',
    shield:
      '<path d="M12 3 20 6v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3Z"/><path d="m9 12 2 2 4-5"/>',
    check:
      '<path d="m5 13 4 4L19 7"/>',
    book:
      '<path d="M5 4h10a4 4 0 0 1 4 4v12H8a3 3 0 0 0-3 3V4Z"/><path d="M5 18h14"/>',
    spark:
      '<path d="M12 3l1.5 5L19 10l-5.5 2L12 19l-1.5-7L5 10l5.5-2L12 3Z"/>',
    target:
      '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><path d="M12 2v4"/><path d="M12 18v4"/><path d="M2 12h4"/><path d="M18 12h4"/>',
    clock:
      '<circle cx="12" cy="12" r="9"/><path d="M12 7v6l4 2"/>',
  };

  return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${
    paths[name] || paths.spark
  }</svg>`;
}

async function request(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (state.token) headers.Authorization = `Bearer ${state.token}`;

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  return response.json();
}

async function safe(load, fallback) {
  try {
    return await load();
  } catch (error) {
    state.error = state.error || error.message;
    return fallback;
  }
}

async function switchRole(role) {
  state.role = role;
  state.loading = true;
  state.loadingText = `Opening ${role} workspace`;
  state.error = "";
  state.quiz = null;
  state.quizResult = null;
  render();

  try {
    await loadPlatformStatus();
    const accountPayload = await safe(() => request("/api/auth/demo-accounts"), { accounts: demoAccounts });
    state.accounts = accountPayload.accounts?.length ? accountPayload.accounts : demoAccounts;
    const account = state.accounts.find((item) => item.role === role) || demoAccounts.find((item) => item.role === role);
    const auth = await request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: account.email, password: account.password }),
    });

    state.token = auth.access_token;
    state.user = auth.user;
    state.apiStatus = "connected";
    await loadRoleData(role);
  } catch (error) {
    state.token = "";
    state.user = fallbackUsers[role];
    state.apiStatus = "demo-data";
    state.error = "Backend not reachable, using seeded demo data.";
    loadFallback(role);
  } finally {
    state.loading = false;
    render();
  }
}

async function loadPlatformStatus() {
  const health = await safe(() => request("/api/health"), { providers: { gemini: false, elevenlabs: false } });
  const voice = await safe(() => request("/api/tutor/voice/status"), { enabled: false });
  state.providers = health.providers || state.providers;
  state.voiceEnabled = Boolean(voice.enabled);
}

async function loadRoleData(role) {
  state.courses = await safe(() => request("/api/courses"), fallbackCourses);

  if (role === "student") {
    const [roadmap, dna, mastery, skillGraph, career, twin, tutorHistory] = await Promise.all([
      safe(() => request("/api/student/roadmap"), fallbackRoadmap),
      safe(() => request("/api/student/dna"), fallbackDNA),
      safe(() => request("/api/student/mastery"), fallbackMastery),
      safe(() => request("/api/student/skill-graph"), fallbackSkillGraph),
      safe(() => request("/api/student/career"), fallbackCareer),
      safe(() => request("/api/student/twin"), fallbackTwin),
      safe(() => request("/api/tutor/history?limit=6"), fallbackTutorHistory),
    ]);

    state.roadmap = roadmap;
    state.dna = dna;
    state.mastery = mastery;
    state.skillGraph = skillGraph || fallbackSkillGraph;
    state.career = career;
    state.twin = twin || fallbackTwin;
    state.tutorHistory = tutorHistory?.length ? tutorHistory : fallbackTutorHistory;
    state.selectedModuleId =
      roadmap.steps?.find((step) => !step.completed)?.module_id || roadmap.steps?.[0]?.module_id || fallbackRoadmap.steps[1].module_id;
  }

  if (role === "instructor") {
    const instructor = await safe(() => request("/api/instructor/dashboard"), fallbackInstructorDashboard);
    state.instructor = instructor;
    const courseId = instructor.course_id || fallbackInstructorDashboard.course_id;
    state.courseAnalytics = await safe(
      () => request(`/api/instructor/courses/${courseId}/analytics`),
      fallbackCourseAnalytics,
    );
    const firstStudent = instructor.students?.[0]?.user_id || fallbackStudentDetail.user_id;
    state.studentDetail = await safe(() => request(`/api/instructor/students/${firstStudent}`), fallbackStudentDetail);
  }

  if (role === "admin") {
    state.admin = await safe(() => request("/api/admin/analytics"), fallbackAdminAnalytics);
  }
}

function loadFallback(role) {
  state.courses = fallbackCourses;

  if (role === "student") {
    state.roadmap = fallbackRoadmap;
    state.dna = fallbackDNA;
    state.mastery = fallbackMastery;
    state.skillGraph = fallbackSkillGraph;
    state.career = fallbackCareer;
    state.twin = fallbackTwin;
    state.tutorHistory = fallbackTutorHistory;
    state.selectedModuleId = fallbackRoadmap.steps.find((step) => !step.completed)?.module_id;
  }

  if (role === "instructor") {
    state.instructor = fallbackInstructorDashboard;
    state.courseAnalytics = fallbackCourseAnalytics;
    state.studentDetail = fallbackStudentDetail;
  }

  if (role === "admin") {
    state.admin = fallbackAdminAnalytics;
  }
}

async function startQuiz() {
  state.loading = true;
  state.loadingText = "Selecting adaptive quiz items";
  state.quizResult = null;
  render();

  if (state.token) {
    state.quiz = await safe(() => request(`/api/student/modules/${state.selectedModuleId}/quiz`), fallbackQuiz);
  } else {
    state.quiz = fallbackQuiz;
  }

  state.loading = false;
  render();
}

async function submitQuizOption(selectedIndex) {
  const item = state.quiz?.items?.[0];
  if (!item) return;

  state.loading = true;
  state.loadingText = "Updating mastery estimate";
  render();

  if (state.token && item.id !== fallbackQuiz.items[0].id) {
    state.quizResult = await safe(
      () =>
        request("/api/student/quiz/answer", {
          method: "POST",
          body: JSON.stringify({
            quiz_item_id: item.id,
            selected_index: selectedIndex,
            seconds: 42,
            retries: 0,
          }),
        }),
      buildFallbackQuizResult(selectedIndex),
    );
  } else {
    state.quizResult = buildFallbackQuizResult(selectedIndex);
  }

  state.loading = false;
  render();
}

function buildFallbackQuizResult(selectedIndex) {
  return {
    correct: selectedIndex === 0,
    correct_index: 0,
    explanation: "A held-out test set gives an honest estimate of performance on unseen examples.",
    mastery_delta: {
      concept_name: "Model evaluation",
      before: 0.38,
      after: selectedIndex === 0 ? 0.46 : 0.35,
    },
    confusion_triggered: selectedIndex !== 0,
    confusion_message: "The tutor queued a short precision and recall refresher.",
  };
}

async function askTutor(message, options = {}) {
  const trimmed = message.trim();
  if (!trimmed) return null;

  state.tutorHistory = [
    ...state.tutorHistory,
    { role: "user", content: trimmed, language: "en" },
  ];
  render();

  let assistantMessage;
  if (state.token) {
    const response = await safe(
      () =>
        request("/api/tutor/ask", {
          method: "POST",
          body: JSON.stringify({
            message: trimmed,
            module_id: state.selectedModuleId,
            language_hint: "auto",
          }),
        }),
      {
        reply:
          "Focus on one confusion matrix example. Compare precision and recall by asking which mistakes are more expensive for the use case.",
        language: "en",
        suggested_followups: ["Show me a confusion matrix", "Give me a 5-minute practice task"],
      },
    );
    assistantMessage = {
      role: "assistant",
      content: response.reply,
      language: response.language,
      provider: response.provider || "gemini",
      suggested_followups: response.suggested_followups || [],
    };
    state.tutorHistory = [
      ...state.tutorHistory,
      assistantMessage,
    ];
  } else {
    assistantMessage = {
      role: "assistant",
      content:
        "Start with a tiny model evaluation example. Identify true positives, false positives, and false negatives before naming the metric.",
      language: "en",
      provider: "offline",
      suggested_followups: [],
    };
    state.tutorHistory = [
      ...state.tutorHistory,
      assistantMessage,
    ];
  }

  render();
  if (options.autoSpeak && assistantMessage?.content) {
    await speakText(assistantMessage.content);
  }
  return assistantMessage;
}

async function speakLatestAssistant() {
  const latest = [...(state.tutorHistory || [])].reverse().find((message) => message.role === "assistant");
  if (!latest?.content) return;
  await speakText(latest.content);
}

async function speakText(text) {
  const spokenText = String(text || "").trim();
  if (!spokenText || !state.token) return;

  state.speaking = true;
  state.voiceError = "";
  render();
  try {
    if (currentVoiceAudio) {
      currentVoiceAudio.pause();
      currentVoiceAudio = null;
    }
    const response = await fetch(`${API_BASE}/api/tutor/voice/tts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${state.token}`,
      },
      body: JSON.stringify({ text: spokenText }),
    });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    const blob = await response.blob();
    currentVoiceAudio = new Audio(URL.createObjectURL(blob));
    await currentVoiceAudio.play();
  } catch (error) {
    state.voiceError = `ElevenLabs voice unavailable: ${error.message}`;
  } finally {
    state.speaking = false;
    render();
  }
}

async function speakTypedText(form) {
  const formData = new FormData(form);
  const text = String(formData.get("speakText") || "");
  form.reset();
  await speakText(text);
}

function startVoiceAssistant() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    state.voiceError = "Voice input is not supported in this browser. Use Chrome or type your question.";
    render();
    return;
  }

  if (voiceRecognition && state.voiceListening) {
    voiceRecognition.stop();
    state.voiceListening = false;
    render();
    return;
  }

  voiceRecognition = new SpeechRecognition();
  voiceRecognition.lang = state.goalDraft.languagePref === "ur" ? "ur-PK" : "en-US";
  voiceRecognition.interimResults = false;
  voiceRecognition.maxAlternatives = 1;

  state.voiceListening = true;
  state.voiceTranscript = "";
  state.voiceError = "";
  render();

  voiceRecognition.onresult = async (event) => {
    const transcript = Array.from(event.results)
      .map((result) => result[0]?.transcript || "")
      .join(" ")
      .trim();
    state.voiceTranscript = transcript;
    state.voiceListening = false;
    render();
    if (transcript) {
      await askTutor(transcript, { autoSpeak: true });
    }
  };

  voiceRecognition.onerror = (event) => {
    state.voiceListening = false;
    state.voiceError = event.error ? `Voice input failed: ${event.error}` : "Voice input failed.";
    render();
  };

  voiceRecognition.onend = () => {
    state.voiceListening = false;
    render();
  };

  voiceRecognition.start();
}

function askTwinCoach() {
  const twin = state.twin || fallbackTwin;
  askTutor(
    `Use my peer twin ${twin.twin_name}'s pattern to coach me. Shared strengths: ${(twin.shared_strengths || []).join(", ")}. Twin note: ${twin.note}. What should I do next for my current module?`,
    { autoSpeak: false },
  );
}

async function updateLearningGoal(form) {
  const formData = new FormData(form);
  state.goalDraft = {
    courseId: Number(formData.get("courseId") || state.goalDraft.courseId),
    goal: String(formData.get("goal") || state.goalDraft.goal),
    priorExperience: String(formData.get("priorExperience") || state.goalDraft.priorExperience),
    weeklyHours: Number(formData.get("weeklyHours") || state.goalDraft.weeklyHours),
    languagePref: String(formData.get("languagePref") || state.goalDraft.languagePref),
  };

  state.loading = true;
  state.loadingText = "Connecting goal, diagnostics, progress, and roadmap";
  render();

  if (state.token) {
    state.roadmap = await safe(
      () =>
        request("/api/onboarding/complete", {
          method: "POST",
          body: JSON.stringify({
            course_id: state.goalDraft.courseId,
            goal: state.goalDraft.goal,
            prior_experience: state.goalDraft.priorExperience,
            weekly_hours: state.goalDraft.weeklyHours,
            language_pref: state.goalDraft.languagePref,
            dna: state.dna,
            diagnostic: [],
          }),
        }),
      fallbackRoadmap,
    );
    await loadRoleData("student");
  }

  state.loading = false;
  render();
}

async function viewStudent(userId) {
  state.studentDetail = await safe(() => request(`/api/instructor/students/${userId}`), fallbackStudentDetail);
  render();
}

function render() {
  app.innerHTML = `
    <div class="app-shell">
      ${sidebar()}
      <main class="main-panel">
        ${topbar()}
        ${state.loading ? loadingPanel() : ""}
        ${state.role === "student" ? studentView() : ""}
        ${state.role === "instructor" ? instructorView() : ""}
        ${state.role === "admin" ? adminView() : ""}
      </main>
    </div>
  `;
}

function sidebar() {
  return `
    <aside class="sidebar" aria-label="Workspace navigation">
      <div class="brand-block">
        <div class="brand-mark">atomcamp</div>
        <div>
          <p class="eyebrow">Smart Adaptive LMS</p>
          <h1>Learn. Adapt. Get role-ready.</h1>
        </div>
      </div>

      <nav class="site-nav" aria-label="atomcamp-style navigation">
        <a href="#courses">Courses</a>
        <a href="#quiz">Quizzes</a>
        <a href="#twin">Twin</a>
        <a href="#voice">Voice</a>
        <a href="#outcomes">Outcomes</a>
      </nav>

      <div class="role-switcher" aria-label="Role switcher">
        ${roleButton("student", "Learner", "brain")}
        ${roleButton("instructor", "Instructor", "chart")}
        ${roleButton("admin", "Admin", "shield")}
      </div>
      <button class="nav-voice-button" data-action="voice-listen" type="button">
        ${icon("mic")}
        ${state.voiceListening ? "Listening..." : "Voice assistant"}
      </button>
    </aside>
  `;
}

function roleButton(role, label, iconName) {
  const active = state.role === role ? "active" : "";
  return `
    <button class="role-button ${active}" data-action="role" data-role="${role}" type="button">
      ${icon(iconName)}
      <span>${label}</span>
    </button>
  `;
}

function topbar() {
  const copy = {
    student: {
      title: "Data Science & AI upskilling for Engineers",
      subtitle: "Your atomcamp learning system ties goals, progress, feedback, quizzes, and outcomes into one adaptive path.",
    },
    instructor: {
      title: "Instructor intelligence center",
      subtitle: "At-risk learners, failure modes, burnout signals, and concept-level interventions.",
    },
    admin: {
      title: "Program outcome command center",
      subtitle: "Track health, active cohorts, completion funnel, and projected job readiness.",
    },
  }[state.role];

  return `
    <header class="topbar">
      <div>
        <p class="eyebrow">${html(state.user?.full_name || "Demo user")}</p>
        <h2>${copy.title}</h2>
        <p>${copy.subtitle}</p>
      </div>
      <div class="topbar-actions">
        <span class="pill">${state.providers.gemini ? "Gemini active" : "Gemini key needed"}</span>
        <span class="pill">${state.voiceEnabled ? "ElevenLabs voice" : "Voice key needed"}</span>
        <button class="icon-button" data-action="refresh" type="button" aria-label="Refresh workspace" title="Refresh workspace">
          ${icon("refresh")}
        </button>
      </div>
    </header>
  `;
}

function loadingPanel() {
  return `
    <div class="loading-band" role="status">
      <span class="loader"></span>
      <strong>${html(state.loadingText)}</strong>
    </div>
  `;
}

function studentView() {
  const roadmap = state.roadmap || fallbackRoadmap;
  const nextStep = roadmap.steps?.find((step) => !step.completed) || roadmap.steps?.[0] || fallbackRoadmap.steps[1];
  const masteryAvg = avg(state.mastery, "p_mastery");
  const careerRole = state.career?.roles?.[0] || fallbackCareer.roles[0];

  return `
    ${atomcampHero()}
    ${goalWorkspace(roadmap, nextStep, masteryAvg, careerRole)}

    <section class="metric-row" aria-label="Learner metrics">
      ${metricCard("Current course", roadmap.course_title, `${roadmap.steps?.length || 0} adaptive modules`, "green", "book")}
      ${metricCard("Next best action", nextStep.module_title, `${nextStep.estimated_minutes} minutes`, "blue", "route")}
      ${metricCard("Mastery average", pct(masteryAvg), "Bayesian knowledge tracing", "amber", "target")}
      ${metricCard("Career match", pct(careerRole.match_pct), careerRole.role_title, "rose", "spark")}
    </section>

    <section class="workspace-grid two" id="goals">
      <article class="surface">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Learning journey</p>
            <h3>Adaptive roadmap</h3>
          </div>
          <span class="pill">${html(roadmap.generated_by || "rules")}</span>
        </div>
        ${roadmapTimeline(roadmap.steps || [])}
      </article>

      <article class="surface">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Learner DNA</p>
            <h3>Personalization vector</h3>
          </div>
          <span class="pill">${pct((state.dna.modality + state.dna.depth + state.dna.pace) / 3)} fit</span>
        </div>
        ${dnaPanel(state.dna)}
      </article>
    </section>

    <section class="workspace-grid two" id="twin">
      <article class="surface twin-feature">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Peer intelligence</p>
            <h3>Learning twin coach</h3>
          </div>
          <span class="pill">${pct(state.twin?.similarity || 0)} match</span>
        </div>
        ${twinFeaturePanel()}
      </article>

      <article class="surface voice-feature" id="voice">
        <div class="section-heading">
          <div>
            <p class="eyebrow">ElevenLabs live voice</p>
            <h3>Talk to your AI coach</h3>
          </div>
          <span class="pill">${state.voiceEnabled ? "Voice ready" : "Voice unavailable"}</span>
        </div>
        ${voiceAssistantPanel()}
      </article>
    </section>

    <section class="workspace-grid two wide-left">
      <article class="surface">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Mastery map</p>
            <h3>Skill graph and blockers</h3>
          </div>
          <span class="pill">${state.skillGraph?.nodes?.length || 0} concepts</span>
        </div>
        ${skillGraphPanel()}
      </article>

      <article class="surface tutor-surface">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Context tutor</p>
            <h3>AI learning coach</h3>
          </div>
          <span class="pill">RAG</span>
        </div>
        ${tutorPanel()}
      </article>
    </section>

    <section class="workspace-grid two" id="quiz">
      <article class="surface" id="outcomes">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Knowledge check</p>
            <h3>Adaptive quiz</h3>
          </div>
          <button class="command-button" data-action="start-quiz" type="button">${icon("play")} Start check</button>
        </div>
        ${quizPanel()}
      </article>

      <article class="surface">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Outcomes</p>
            <h3>Career readiness</h3>
          </div>
          <span class="pill">${state.career?.weekly_hours || 0} hrs/week</span>
        </div>
        ${careerPanel()}
      </article>
    </section>

    <section class="surface" id="courses">
      <div class="section-heading">
        <div>
          <p class="eyebrow">atomcamp catalogue</p>
          <h3>Programs mapped into learner paths</h3>
        </div>
        <span class="pill">${state.courses.length} tracks</span>
      </div>
      ${courseRail()}
    </section>
  `;
}

function atomcampHero() {
  return `
    <section class="atom-hero">
      <div>
        <p class="eyebrow">atomcamp style learning intelligence</p>
        <h3>High-visibility adaptive LMS for Pakistan's AI learners</h3>
        <p>Every learner sees a live path: goal, diagnostic signal, progress, feedback loop, and career outcome.</p>
      </div>
      <div class="atom-stat-wall">
        <strong>80% <span>Job Placement</span></strong>
        <strong>45% <span>Women Participation</span></strong>
        <strong>70 <span>Corporate Clients</span></strong>
        <strong>10,000 <span>People Trained</span></strong>
      </div>
    </section>
  `;
}

function goalWorkspace(roadmap, nextStep, masteryAvg, careerRole) {
  const courses = state.courses?.length ? state.courses : fallbackCourses;
  return `
    <section class="surface goal-command">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Connected learner loop</p>
          <h3>Goal -> progress -> feedback -> outcome</h3>
        </div>
        <span class="pill">${html(roadmap.generated_by || "rules")} roadmap</span>
      </div>
      <form class="goal-form" data-form="goal">
        <label>
          Goal
          <input name="goal" value="${html(state.goalDraft.goal || state.user?.goal || "")}" placeholder="e.g. become job-ready in AI" />
        </label>
        <label>
          Course
          <select name="courseId">
            ${courses
              .map(
                (course) => `
                  <option value="${course.id}" ${Number(course.id) === Number(roadmap.course_id) ? "selected" : ""}>
                    ${html(course.title)}
                  </option>
                `,
              )
              .join("")}
          </select>
        </label>
        <label>
          Weekly hours
          <input name="weeklyHours" type="number" min="1" max="80" value="${html(state.goalDraft.weeklyHours || state.user?.weekly_hours || 6)}" />
        </label>
        <label>
          Experience
          <select name="priorExperience">
            ${["beginner", "intermediate", "advanced"]
              .map(
                (level) => `<option value="${level}" ${state.goalDraft.priorExperience === level ? "selected" : ""}>${level}</option>`,
              )
              .join("")}
          </select>
        </label>
        <label>
          Language
          <select name="languagePref">
            <option value="auto">Auto</option>
            <option value="en">English</option>
            <option value="roman_ur">Roman Urdu</option>
            <option value="ur">Urdu</option>
          </select>
        </label>
        <button class="command-button" type="submit">${icon("spark")} Generate AI path</button>
      </form>

      <div class="connected-strip">
        ${loopStep("Goal", state.goalDraft.goal || state.user?.goal || "Become job-ready", "target")}
        ${loopStep("Progress", `${pct(masteryAvg)} mastery`, "chart")}
        ${loopStep("Feedback", state.quizResult ? `${state.quizResult.correct ? "Correct" : "Review"}: ${state.quizResult.mastery_delta?.concept_name}` : `Next: ${nextStep.module_title}`, "brain")}
        ${loopStep("Outcome", `${pct(careerRole.match_pct)} ${careerRole.role_title}`, "spark")}
      </div>
    </section>
  `;
}

function loopStep(label, value, iconName) {
  return `
    <div class="loop-step">
      <div>${icon(iconName)}</div>
      <span>${html(label)}</span>
      <strong>${html(value)}</strong>
    </div>
  `;
}

function instructorView() {
  const data = state.instructor || fallbackInstructorDashboard;
  const analytics = state.courseAnalytics || fallbackCourseAnalytics;

  return `
    <section class="metric-row" aria-label="Instructor metrics">
      ${metricCard("Total learners", data.total_students, data.course_title || "All courses", "green", "user")}
      ${metricCard("Active last 7d", data.active_last_7d, `${pct(data.avg_completion_pct)} avg completion`, "blue", "clock")}
      ${metricCard("High risk", data.high_risk_count, `${data.burnout_count} burnout flags`, "rose", "warning")}
      ${metricCard("Cohort mastery", pct(data.avg_mastery), "Across active modules", "amber", "target")}
    </section>

    <section class="workspace-grid two wide-left">
      <article class="surface">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Risk queue</p>
            <h3>Students needing action</h3>
          </div>
          <span class="pill">AI triage</span>
        </div>
        ${riskTable(data.students || [])}
      </article>

      <article class="surface">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Selected learner</p>
            <h3>${html(state.studentDetail?.full_name || "Learner detail")}</h3>
          </div>
          <span class="pill">${pct(state.studentDetail?.risk_prob || 0)} risk</span>
        </div>
        ${studentDetailPanel()}
      </article>
    </section>

    <section class="workspace-grid two">
      <article class="surface">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Concept heatmap</p>
            <h3>Where the cohort is stuck</h3>
          </div>
          <span class="pill">${html(analytics.course_title)}</span>
        </div>
        ${conceptHeatmap(analytics.concept_mastery || [])}
      </article>

      <article class="surface">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Instruction signals</p>
            <h3>Failure modes and hard items</h3>
          </div>
          <span class="pill">Auto grouped</span>
        </div>
        ${failureModePanel(analytics)}
      </article>
    </section>
  `;
}

function adminView() {
  const data = state.admin || fallbackAdminAnalytics;

  return `
    <section class="metric-row" aria-label="Admin metrics">
      ${metricCard("Total learners", data.total_learners, `${data.total_instructors} instructors`, "green", "user")}
      ${metricCard("Active last 7d", data.active_last_7d, "Cross-program engagement", "blue", "clock")}
      ${metricCard("Average mastery", pct(data.avg_mastery), "All enrolled learners", "amber", "target")}
      ${metricCard("Projected ready", data.funnel?.at(-1)?.count || 0, "Role-readiness outcome", "rose", "spark")}
    </section>

    <section class="workspace-grid two wide-left">
      <article class="surface">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Program health</p>
            <h3>Track-level intelligence</h3>
          </div>
          <span class="pill">${data.tracks?.length || 0} tracks</span>
        </div>
        ${trackHealthTable(data.tracks || [])}
      </article>

      <article class="surface">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Outcomes</p>
            <h3>Completion funnel</h3>
          </div>
          <span class="pill">Impact</span>
        </div>
        ${funnelPanel(data.funnel || [])}
      </article>
    </section>

    <section class="surface">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Scale levers</p>
          <h3>What admins can act on</h3>
        </div>
        <span class="pill">Ready for demo</span>
      </div>
      <div class="admin-action-grid">
        ${adminAction("Curriculum redesign", "Prioritize modules where mastery is below 55% and failure modes repeat across cohorts.", "chart")}
        ${adminAction("Instructor support", "Route high-risk clusters to office hours and show the exact concepts blocking progress.", "user")}
        ${adminAction("Career outcomes", "Forecast readiness by role and weekly hours so learners see a credible path to employment.", "target")}
      </div>
    </section>
  `;
}

function metricCard(label, value, detail, tone, iconName) {
  return `
    <article class="metric ${tone}">
      <div class="metric-icon">${icon(iconName)}</div>
      <span>${html(label)}</span>
      <strong>${html(value)}</strong>
      <small>${html(detail)}</small>
    </article>
  `;
}

function roadmapTimeline(steps) {
  return `
    <div class="timeline">
      ${steps
        .map(
          (step) => `
            <button class="timeline-item ${step.completed ? "complete" : ""} ${
              state.selectedModuleId === step.module_id ? "selected" : ""
            }" data-action="module" data-module-id="${step.module_id}" type="button">
              <span class="timeline-index">${step.completed ? icon("check") : step.position}</span>
              <span>
                <strong>${html(step.module_title)}</strong>
                <small>Week ${html(step.target_week)} - ${html(step.module_summary)}</small>
                <em>${html(step.rationale)}</em>
              </span>
              <b>${html(step.estimated_minutes)}m</b>
            </button>
          `,
        )
        .join("")}
    </div>
  `;
}

function dnaPanel(dna) {
  const labels = [
    ["modality", "Visual-first"],
    ["depth", "Deep dive"],
    ["pace", "Longer sessions"],
    ["abstraction", "Theory-first"],
    ["time_of_day", "Evening energy"],
  ];

  return `
    <div class="dna-grid">
      ${labels
        .map(([key, label]) => {
          const value = clamp01(dna?.[key]);
          return `
            <div class="dna-row">
              <span>${label}</span>
              <div class="bar-track"><i style="width:${pct(value)}"></i></div>
              <strong>${pct(value)}</strong>
            </div>
          `;
        })
        .join("")}
    </div>
    <div class="twin-card">
      <div class="avatar">${initials(state.twin?.twin_name)}</div>
      <div>
        <span>Peer twin</span>
        <strong>${html(state.twin?.twin_name || "Matched learner")}</strong>
        <p>${html(state.twin?.note || "")}</p>
      </div>
    </div>
  `;
}

function skillGraphPanel() {
  const nodes = state.skillGraph?.nodes?.length ? state.skillGraph.nodes : fallbackSkillGraph.nodes;

  return `
    <div class="skill-grid">
      ${nodes
        .map(
          (node) => `
            <div class="skill-node ${html(node.state)}">
              <span>${html(node.module_title)}</span>
              <strong>${html(node.name)}</strong>
              <div class="bar-track"><i style="width:${pct(node.p_mastery)}"></i></div>
              <small>${pct(node.p_mastery)} mastery</small>
            </div>
          `,
        )
        .join("")}
    </div>
  `;
}

function tutorPanel() {
  const messages = (state.tutorHistory || []).slice(-5);
  const latest = [...(state.tutorHistory || [])].reverse().find((message) => message.role === "assistant");

  return `
    <div class="tutor-tools">
      <span class="pill">${state.providers.gemini ? "Gemini answers" : "Gemini key missing"}</span>
      <button class="command-button ghost" data-action="speak" type="button" ${state.voiceEnabled ? "" : "disabled"}>
        ${icon("play")} ${state.speaking ? "Speaking..." : "Speak latest"}
      </button>
    </div>
    <div class="chat-log">
      ${messages
        .map(
          (message) => `
            <div class="chat-message ${message.role === "user" ? "user" : "assistant"}">
              <span>${message.role === "user" ? "You" : `Tutor - ${html(message.provider || "Gemini/offline")}`}</span>
              <p>${html(message.content)}</p>
            </div>
          `,
        )
        .join("")}
    </div>
    ${
      latest?.suggested_followups?.length
        ? `<div class="followups">${latest.suggested_followups
            .map((item) => `<button data-action="followup" data-message="${html(item)}" type="button">${html(item)}</button>`)
            .join("")}</div>`
        : ""
    }
    <form class="chat-form" data-form="tutor">
      <input name="message" type="text" placeholder="Ask about atomcamp courses, your quiz, career path, or any topic" autocomplete="off" />
      <button class="icon-button solid" type="submit" aria-label="Send tutor question" title="Send tutor question">${icon("send")}</button>
    </form>
  `;
}

function quizPanel() {
  if (!state.quiz) {
    return `
      <div class="empty-state">
        <div class="empty-icon">${icon("brain")}</div>
        <strong>Ready when the learner is.</strong>
        <p>The quiz engine picks questions from weak concepts and updates mastery after each answer.</p>
      </div>
    `;
  }

  const item = state.quiz.items?.[0];
  return `
    <div class="quiz-card">
      <p>${html(state.quiz.rationale)}</p>
      <h4>${html(item.prompt)}</h4>
      <div class="answer-grid">
        ${item.options
          .map(
            (option, index) => `
              <button class="answer-button" data-action="quiz-option" data-option="${index}" type="button">
                <span>${String.fromCharCode(65 + index)}</span>
                ${html(option)}
              </button>
            `,
          )
          .join("")}
      </div>
      ${state.quizResult ? quizResultPanel() : ""}
    </div>
  `;
}

function quizResultPanel() {
  const result = state.quizResult;
  return `
    <div class="quiz-result ${result.correct ? "correct" : "review"}">
      <strong>${result.correct ? "Correct" : "Needs review"} - ${html(result.mastery_delta?.concept_name || "Concept")}</strong>
      <span>${pct(result.mastery_delta?.before)} to ${pct(result.mastery_delta?.after)}</span>
      <p>${html(result.explanation)}</p>
      ${result.confusion_triggered ? `<em>${html(result.confusion_message || "Confusion support queued.")}</em>` : ""}
    </div>
  `;
}

function careerPanel() {
  const career = state.career || fallbackCareer;

  return `
    <div class="projection-row">
      ${career.projections
        .map(
          (item) => `
            <div class="projection">
              <strong>${pct(item.projected_mastery_avg)}</strong>
              <span>${html(item.horizon_weeks)} weeks</span>
              <small>${html(item.label)}</small>
            </div>
          `,
        )
        .join("")}
    </div>
    <div class="role-list">
      ${career.roles
        .map(
          (role) => `
            <div class="role-card">
              <div>
                <strong>${html(role.role_title)}</strong>
                <span>${html(role.description)}</span>
              </div>
              <b>${pct(role.match_pct)}</b>
              <small>PKR ${money(role.salary_pkr_min)} - ${money(role.salary_pkr_max)}</small>
            </div>
          `,
        )
        .join("")}
    </div>
  `;
}

function courseRail() {
  const apiCourses = state.courses || [];
  return `
    <div class="course-rail">
      ${atomcampOfferings
        .map(
          (course, index) => `
            <article class="course-card" style="--course-color:${index % 2 ? "#98ed23" : "#19a887"}">
              <div class="course-thumb">${icon(index % 2 ? "spark" : "brain")}</div>
              <div>
                <span>${html(course.audience)}</span>
                <strong>${html(course.title)}</strong>
                <p>${html(course.outcome)}</p>
                <small>${course.focus.map((item) => html(item)).join(" - ")}</small>
              </div>
            </article>
          `,
        )
        .join("")}
    </div>
    <div class="course-sync-note">
      <strong>Backend catalogue synced:</strong>
      ${apiCourses.map((course) => `<span>${html(course.title)}</span>`).join("")}
    </div>
  `;
}

function riskTable(students) {
  return `
    <div class="table-list">
      ${students
        .map(
          (student) => `
            <button class="risk-row" data-action="student" data-user-id="${student.user_id}" type="button">
              <div class="avatar">${initials(student.full_name)}</div>
              <div>
                <strong>${html(student.full_name)}</strong>
                <span>${html(student.course_title || "Learner")} - ${html(student.days_since_active)}d since active</span>
              </div>
              <div class="risk-meter">
                <i style="width:${pct(student.risk_prob)}"></i>
              </div>
              <b class="${student.risk_band}">${html(student.risk_band)}</b>
              <small>${student.burnout_flag ? "Burnout flag" : pct(student.mastery_avg)}</small>
            </button>
          `,
        )
        .join("")}
    </div>
  `;
}

function studentDetailPanel() {
  const detail = state.studentDetail || fallbackStudentDetail;

  return `
    <div class="student-detail">
      <div class="detail-stat">
        <span>Goal</span>
        <strong>${html(detail.goal || "Course completion")}</strong>
      </div>
      <div class="detail-grid">
        ${miniStat("Mastery", pct(detail.mastery_avg))}
        ${miniStat("Completion", pct(detail.completion_pct))}
        ${miniStat("Attempts", detail.recent_attempts || 0)}
        ${miniStat("Tutor asks", detail.recent_tutor_questions || 0)}
      </div>
      <div class="reason-list">
        ${(detail.top_reasons || [])
          .map(
            (reason) => `
              <div>
                <span>${html(reason.label)}</span>
                <div class="bar-track"><i style="width:${pct(reason.contribution)}"></i></div>
              </div>
            `,
          )
          .join("")}
      </div>
    </div>
  `;
}

function conceptHeatmap(items) {
  return `
    <div class="heatmap">
      ${items
        .map(
          (item) => `
            <div class="heat-row">
              <div>
                <strong>${html(item.concept_name)}</strong>
                <span>${html(item.module_title)}</span>
              </div>
              <div class="bar-track"><i style="width:${pct(item.avg_mastery)}"></i></div>
              <b>${pct(item.avg_mastery)}</b>
              <small>${html(item.learners_struggling)} struggling</small>
            </div>
          `,
        )
        .join("")}
    </div>
  `;
}

function failureModePanel(analytics) {
  return `
    <div class="failure-grid">
      <div>
        <h4>Failure modes</h4>
        ${(analytics.failure_modes || [])
          .map(
            (mode) => `
              <div class="failure-row">
                <span>${html(mode.failure_mode)}</span>
                <strong>${html(mode.count)}</strong>
              </div>
            `,
          )
          .join("")}
      </div>
      <div>
        <h4>Hardest questions</h4>
        ${(analytics.hardest_items || [])
          .map(
            (item) => `
              <div class="hard-item">
                <strong>${html(item.concept_name)}</strong>
                <p>${html(item.prompt)}</p>
                <span>${pct(item.accuracy)} accuracy</span>
              </div>
            `,
          )
          .join("")}
      </div>
    </div>
  `;
}

function trackHealthTable(tracks) {
  return `
    <div class="track-list">
      ${tracks
        .map(
          (track) => `
            <div class="track-row">
              <div>
                <strong>${html(track.course_title)}</strong>
                <span>${html(track.enrolled)} learners - ${html(track.active_last_7d)} active</span>
              </div>
              <div class="track-bars">
                <label>Completion <i style="width:${pct(track.avg_completion_pct)}"></i></label>
                <label>Mastery <i style="width:${pct(track.avg_mastery)}"></i></label>
              </div>
              <b>${html(track.high_risk_count)} risk</b>
            </div>
          `,
        )
        .join("")}
    </div>
  `;
}

function funnelPanel(funnel) {
  const max = Math.max(...funnel.map((item) => item.count), 1);

  return `
    <div class="funnel">
      ${funnel
        .map(
          (item) => `
            <div class="funnel-step">
              <span>${html(item.label)}</span>
              <strong>${html(item.count)}</strong>
              <div style="width:${Math.max(18, (item.count / max) * 100)}%"></div>
            </div>
          `,
        )
        .join("")}
    </div>
  `;
}

function adminAction(title, text, iconName) {
  return `
    <article class="action-card">
      <div class="metric-icon">${icon(iconName)}</div>
      <strong>${html(title)}</strong>
      <p>${html(text)}</p>
    </article>
  `;
}

function miniStat(label, value) {
  return `
    <div class="mini-stat">
      <span>${html(label)}</span>
      <strong>${html(value)}</strong>
    </div>
  `;
}

function initials(name = "") {
  const letters = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
  return html(letters || "AC");
}

function iconNameForCourse(name = "") {
  const normalized = name.toLowerCase();
  if (normalized.includes("brain")) return "brain";
  if (normalized.includes("chart")) return "chart";
  if (normalized.includes("bolt")) return "spark";
  return "book";
}

document.addEventListener("click", (event) => {
  const actionEl = event.target.closest("[data-action]");
  if (!actionEl) return;

  const { action } = actionEl.dataset;
  if (action === "role") {
    switchRole(actionEl.dataset.role);
  }
  if (action === "refresh") {
    switchRole(state.role);
  }
  if (action === "module") {
    state.selectedModuleId = Number(actionEl.dataset.moduleId);
    state.quiz = null;
    state.quizResult = null;
    render();
  }
  if (action === "start-quiz") {
    startQuiz();
  }
  if (action === "quiz-option") {
    submitQuizOption(Number(actionEl.dataset.option));
  }
  if (action === "student") {
    viewStudent(Number(actionEl.dataset.userId));
  }
  if (action === "speak") {
    speakLatestAssistant();
  }
  if (action === "followup") {
    askTutor(actionEl.dataset.message || "");
  }
});

document.addEventListener("submit", (event) => {
  const form = event.target.closest("[data-form='tutor']");
  const goalForm = event.target.closest("[data-form='goal']");

  if (form) {
    event.preventDefault();
    const formData = new FormData(form);
    const message = String(formData.get("message") || "");
    form.reset();
    askTutor(message);
  }

  if (goalForm) {
    event.preventDefault();
    updateLearningGoal(goalForm);
  }
});

render();
switchRole("student");
