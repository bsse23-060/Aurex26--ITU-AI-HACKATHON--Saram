import {
  AlertTriangle,
  BarChart3,
  Brain,
  CheckCircle2,
  Clock3,
  Compass,
  Languages,
  MessageSquareText,
  RefreshCcw,
  Route,
  Send,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  AdminInsights,
  api,
  CourseModule,
  DailyPlan,
  InstructorDashboard,
  Mood,
  OnboardingPayload,
  OnboardingResponse,
} from "./api";

type Tab = "learner" | "instructor" | "admin";

const initialPayload: OnboardingPayload = {
  name: "Sana",
  goal: "Become job-ready for data analytics and build an interview portfolio",
  background: "Final-year student with Excel knowledge, weak SQL, and limited dashboard practice",
  weekly_hours: 6,
  language: "Mixed",
  confidence: 3,
  baseline_quiz: 54,
  attendance_rate: 82,
  activity_rate: 61,
  motivation_style: "visible career progress",
  barriers: ["needs portfolio direction", "gets nervous during quizzes"],
  weak_skills: ["sql", "data storytelling"],
};

const moodOptions: { mood: Mood; label: string }[] = [
  { mood: "focused", label: "Focused" },
  { mood: "confused", label: "Confused" },
  { mood: "busy", label: "Busy" },
  { mood: "low-confidence", label: "Low confidence" },
  { mood: "energized", label: "Energized" },
];

function App() {
  const [tab, setTab] = useState<Tab>("learner");
  const [courses, setCourses] = useState<CourseModule[]>([]);
  const [demo, setDemo] = useState<OnboardingResponse[]>([]);
  const [active, setActive] = useState<OnboardingResponse | null>(null);
  const [instructor, setInstructor] = useState<InstructorDashboard | null>(null);
  const [admin, setAdmin] = useState<AdminInsights | null>(null);
  const [form, setForm] = useState<OnboardingPayload>(initialPayload);
  const [mood, setMood] = useState<Mood>("focused");
  const [checkConfidence, setCheckConfidence] = useState(2);
  const [coachQuestion, setCoachQuestion] = useState("I feel stuck on today's task. What should I do first?");
  const [coachAnswer, setCoachAnswer] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    boot();
  }, []);

  async function boot() {
    setLoading(true);
    setError("");
    try {
      const [courseData, demoData, instructorData, adminData] = await Promise.all([
        api.courses(),
        api.demo(),
        api.instructor(),
        api.admin(),
      ]);
      setCourses(courseData);
      setDemo(demoData);
      setActive(demoData[0]);
      setInstructor(instructorData);
      setAdmin(adminData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reach RaastaAI backend.");
    } finally {
      setLoading(false);
    }
  }

  async function refreshDashboards() {
    const [instructorData, adminData] = await Promise.all([api.instructor(), api.admin()]);
    setInstructor(instructorData);
    setAdmin(adminData);
  }

  async function submitOnboarding(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const response = await api.onboard(form);
      setActive(response);
      setDemo((items) => [response, ...items.filter((item) => item.twin.id !== response.twin.id)]);
      await refreshDashboards();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the Learning Twin.");
    }
  }

  async function runCheckin() {
    if (!active) return;
    setError("");
    try {
      const response = await api.checkin(active.twin.id, mood, checkConfidence);
      setActive(response);
      setDemo((items) => items.map((item) => (item.twin.id === response.twin.id ? response : item)));
      await refreshDashboards();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not adapt the route.");
    }
  }

  async function askCoach() {
    if (!active) return;
    setCoachAnswer("Thinking through the learner twin...");
    try {
      const response = await api.coach(active.twin.id, coachQuestion, mood);
      setCoachAnswer(`${response.answer}\n\nNext step: ${response.recommended_next_step}`);
    } catch (err) {
      setCoachAnswer(err instanceof Error ? err.message : "Coach is unavailable right now.");
    }
  }

  const selectedCourse = useMemo(() => {
    if (!active) return null;
    return courses.find((course) => course.title === active.twin.primary_track) ?? courses[0];
  }, [active, courses]);

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <Compass size={25} />
          </div>
          <div>
            <strong>RaastaAI</strong>
            <span>Personal Learning Twin</span>
          </div>
        </div>

        <nav className="nav-tabs" aria-label="RaastaAI views">
          <button className={tab === "learner" ? "active" : ""} onClick={() => setTab("learner")}>
            <Route size={18} /> Learner GPS
          </button>
          <button className={tab === "instructor" ? "active" : ""} onClick={() => setTab("instructor")}>
            <Users size={18} /> Instructor Radar
          </button>
          <button className={tab === "admin" ? "active" : ""} onClick={() => setTab("admin")}>
            <BarChart3 size={18} /> Admin Signals
          </button>
        </nav>

        <div className="demo-switcher">
          <span>Demo learners</span>
          {demo.map((item) => (
            <button
              key={item.twin.id}
              className={active?.twin.id === item.twin.id ? "selected" : ""}
              onClick={() => setActive(item)}
            >
              <span>{item.twin.name}</span>
              <small>{item.twin.primary_track}</small>
            </button>
          ))}
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">atomcamp adaptive LMS prototype</p>
            <h1>{tab === "learner" ? "Today’s Raasta" : tab === "instructor" ? "Learner Risk Radar" : "Cohort Intelligence"}</h1>
          </div>
          <button className="icon-button" onClick={boot} title="Refresh data">
            <RefreshCcw size={18} />
          </button>
        </header>

        {error && <div className="error-banner">{error}</div>}
        {loading && <div className="loading">Loading RaastaAI...</div>}

        {!loading && tab === "learner" && active && (
          <LearnerView
            active={active}
            selectedCourse={selectedCourse}
            form={form}
            setForm={setForm}
            submitOnboarding={submitOnboarding}
            mood={mood}
            setMood={setMood}
            checkConfidence={checkConfidence}
            setCheckConfidence={setCheckConfidence}
            runCheckin={runCheckin}
            coachQuestion={coachQuestion}
            setCoachQuestion={setCoachQuestion}
            askCoach={askCoach}
            coachAnswer={coachAnswer}
          />
        )}

        {!loading && tab === "instructor" && instructor && <InstructorView dashboard={instructor} />}
        {!loading && tab === "admin" && admin && <AdminView insights={admin} courses={courses} />}
      </section>
    </main>
  );
}

interface LearnerViewProps {
  active: OnboardingResponse;
  selectedCourse: CourseModule | null;
  form: OnboardingPayload;
  setForm: (payload: OnboardingPayload) => void;
  submitOnboarding: (event: FormEvent) => void;
  mood: Mood;
  setMood: (mood: Mood) => void;
  checkConfidence: number;
  setCheckConfidence: (value: number) => void;
  runCheckin: () => void;
  coachQuestion: string;
  setCoachQuestion: (value: string) => void;
  askCoach: () => void;
  coachAnswer: string;
}

function LearnerView(props: LearnerViewProps) {
  const {
    active,
    selectedCourse,
    form,
    setForm,
    submitOnboarding,
    mood,
    setMood,
    checkConfidence,
    setCheckConfidence,
    runCheckin,
    coachQuestion,
    setCoachQuestion,
    askCoach,
    coachAnswer,
  } = props;
  const { twin, today } = active;

  return (
    <div className="learner-grid">
      <section className="panel twin-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Learning Twin</p>
            <h2>{twin.name}</h2>
          </div>
          <RiskPill level={twin.risk_level} score={twin.risk_score} />
        </div>
        <p className="signature">{twin.signature}</p>
        <div className="metric-row">
          <Metric icon={<Target size={18} />} label="Goal" value={twin.goal} />
          <Metric icon={<Clock3 size={18} />} label="Weekly time" value={`${twin.weekly_hours} hrs`} />
          <Metric icon={<Languages size={18} />} label="Language" value={twin.language} />
        </div>
        <div className="skill-cloud">
          {twin.weak_skills.map((skill) => (
            <span key={skill}>{skill}</span>
          ))}
        </div>
      </section>

      <RouteMap plan={today} course={selectedCourse} />

      <section className="panel route-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">{today.mode} mode</p>
            <h2>{today.title}</h2>
          </div>
          <div className="duration">{today.duration_minutes} min</div>
        </div>
        <PlanBlock title="Lesson" text={today.lesson} icon={<Brain size={19} />} />
        <PlanBlock title="Micro-task" text={today.micro_task} icon={<CheckCircle2 size={19} />} />
        <PlanBlock title="Confidence check" text={today.confidence_check} icon={<MessageSquareText size={19} />} />
        <PlanBlock title="Next action" text={today.next_action} icon={<Sparkles size={19} />} />
      </section>

      <section className="panel explain-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Explainable AI</p>
            <h2>Why this route?</h2>
          </div>
        </div>
        <ul className="explain-list">
          {today.explanation.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <div className="capstone">
          <span>Career-to-capstone path</span>
          <p>{today.capstone_path}</p>
        </div>
        <div className="peer-pod">
          <span>Peer match pod</span>
          <div>
            {today.peer_pod.map((peer) => (
              <strong key={peer}>{peer}</strong>
            ))}
          </div>
        </div>
      </section>

      <section className="panel checkin-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Mood adaptation</p>
            <h2>Change the route live</h2>
          </div>
        </div>
        <div className="segmented">
          {moodOptions.map((option) => (
            <button
              key={option.mood}
              className={mood === option.mood ? "active" : ""}
              onClick={() => setMood(option.mood)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <label className="field-label">
          Confidence today: {checkConfidence}/5
          <input
            type="range"
            min="1"
            max="5"
            value={checkConfidence}
            onChange={(event) => setCheckConfidence(Number(event.target.value))}
          />
        </label>
        <button className="primary-action" onClick={runCheckin}>
          <Route size={18} /> Adapt today’s Raasta
        </button>
      </section>

      <section className="panel coach-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">AI coach</p>
            <h2>Personal support</h2>
          </div>
        </div>
        <textarea value={coachQuestion} onChange={(event) => setCoachQuestion(event.target.value)} />
        <button className="primary-action" onClick={askCoach}>
          <Send size={18} /> Ask coach
        </button>
        {coachAnswer && <pre className="coach-answer">{coachAnswer}</pre>}
      </section>

      <section className="panel onboarding-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">New learner</p>
            <h2>Create a twin</h2>
          </div>
        </div>
        <form className="onboarding-form" onSubmit={submitOnboarding}>
          <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Learner name" />
          <textarea value={form.goal} onChange={(event) => setForm({ ...form, goal: event.target.value })} placeholder="Learning goal" />
          <textarea
            value={form.background}
            onChange={(event) => setForm({ ...form, background: event.target.value })}
            placeholder="Background"
          />
          <div className="form-grid">
            <label>
              Weekly hours
              <input
                type="number"
                min="1"
                max="40"
                value={form.weekly_hours}
                onChange={(event) => setForm({ ...form, weekly_hours: Number(event.target.value) })}
              />
            </label>
            <label>
              Quiz score
              <input
                type="number"
                min="0"
                max="100"
                value={form.baseline_quiz}
                onChange={(event) => setForm({ ...form, baseline_quiz: Number(event.target.value) })}
              />
            </label>
            <label>
              Confidence
              <input
                type="number"
                min="1"
                max="5"
                value={form.confidence}
                onChange={(event) => setForm({ ...form, confidence: Number(event.target.value) })}
              />
            </label>
            <label>
              Language
              <select
                value={form.language}
                onChange={(event) => setForm({ ...form, language: event.target.value as OnboardingPayload["language"] })}
              >
                <option>Mixed</option>
                <option>English</option>
                <option>Urdu</option>
              </select>
            </label>
          </div>
          <input
            value={form.weak_skills.join(", ")}
            onChange={(event) =>
              setForm({ ...form, weak_skills: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) })
            }
            placeholder="Weak skills, comma separated"
          />
          <button className="primary-action" type="submit">
            <Sparkles size={18} /> Generate Learning Twin
          </button>
        </form>
      </section>
    </div>
  );
}

function RouteMap({ plan, course }: { plan: DailyPlan; course: CourseModule | null }) {
  return (
    <section className="panel map-panel">
      <div className="route-visual" aria-label="Personal upskilling route">
        <div className="map-node start">Goal</div>
        <div className="map-line one" />
        <div className="map-node lesson">Lesson</div>
        <div className="map-line two" />
        <div className="map-node task">Task</div>
        <div className="map-line three" />
        <div className="map-node capstone">Capstone</div>
      </div>
      <div className="map-copy">
        <p className="eyebrow">Personal upskilling GPS</p>
        <h2>{course?.program ?? "atomcamp track"}</h2>
        <p>{plan.capstone_path}</p>
      </div>
    </section>
  );
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="metric">
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function PlanBlock({ title, text, icon }: { title: string; text: string; icon: ReactNode }) {
  return (
    <div className="plan-block">
      <div>{icon}</div>
      <span>{title}</span>
      <p>{text}</p>
    </div>
  );
}

function RiskPill({ level, score }: { level: string; score: number }) {
  return <div className={`risk-pill ${level}`}>{score}/100 {level}</div>;
}

function InstructorView({ dashboard }: { dashboard: InstructorDashboard }) {
  return (
    <div className="dashboard-grid">
      <section className="panel wide">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Today’s teaching focus</p>
            <h2>{dashboard.focus_summary}</h2>
          </div>
          <AlertTriangle size={24} />
        </div>
      </section>

      {dashboard.risk_cards.map((card) => (
        <article className="panel risk-card" key={card.learner}>
          <div className="panel-heading">
            <h2>{card.learner}</h2>
            <RiskPill level={card.risk_level} score={card.risk_score} />
          </div>
          <ul>
            {card.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
          <div className="nudge-card">
            <span>{card.suggested_action}</span>
            <p>{card.nudge}</p>
          </div>
        </article>
      ))}

      <section className="panel wide">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Peer support pods</p>
            <h2>Matched by goal, confidence, and weak skills</h2>
          </div>
          <Users size={24} />
        </div>
        <div className="pod-grid">
          {dashboard.peer_pods.map((pod) => (
            <div key={pod.join("-")} className="pod">
              {pod.map((name) => (
                <strong key={name}>{name}</strong>
              ))}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function AdminView({ insights, courses }: { insights: AdminInsights; courses: CourseModule[] }) {
  return (
    <div className="dashboard-grid">
      <section className="panel wide">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Cohort health</p>
            <h2>{insights.cohort_health}</h2>
          </div>
          <BarChart3 size={24} />
        </div>
      </section>

      <InsightPanel title="Top skill gaps" items={insights.top_skill_gaps} />
      <InsightPanel title="Content opportunities" items={insights.content_opportunities} />
      <InsightPanel title="Demand signals" items={insights.demand_signals} />
      <InsightPanel title="Experiments" items={insights.recommended_experiments} />

      <section className="panel wide">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">atomcamp catalog foundation</p>
            <h2>Programs used by the adaptive engine</h2>
          </div>
        </div>
        <div className="course-strip">
          {courses.map((course) => (
            <article key={course.id}>
              <span>{course.level}</span>
              <strong>{course.title}</strong>
              <p>{course.skills.slice(0, 3).join(" · ")}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function InsightPanel({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>{title}</h2>
      </div>
      <ul className="insight-list">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

export default App;
