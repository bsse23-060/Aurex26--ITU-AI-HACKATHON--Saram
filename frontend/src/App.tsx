import { type ReactNode, useEffect } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { useAuth } from "./lib/authStore";
import { ToastProvider } from "./components/ui/Toaster";
import { AppShell } from "./layout/AppShell";
import { LoginPage } from "./pages/LoginPage";
import { OnboardingPage } from "./pages/OnboardingPage";
import { StudentHome } from "./pages/StudentHome";
import { StudentRoadmap } from "./pages/StudentRoadmap";
import { StudentTutor } from "./pages/StudentTutor";
import { StudentSkillGraph } from "./pages/StudentSkillGraph";
import { StudentCareer } from "./pages/StudentCareer";
import { StudentTwin } from "./pages/StudentTwin";
import { ModulePage } from "./pages/ModulePage";
import { InstructorHome } from "./pages/InstructorHome";
import { InstructorStudent } from "./pages/InstructorStudent";
import { AdminHome } from "./pages/AdminHome";
import { AdminCourses } from "./pages/AdminCourses";
import { LandingPage } from "./pages/LandingPage";

function HomeGate() {
  const user = useAuth((s) => s.user);
  const token = useAuth((s) => s.token);
  if (!token || !user) return <LandingPage />;
  if (user.role === "admin") return <Navigate to="/admin" replace />;
  if (user.role === "instructor") return <Navigate to="/instructor" replace />;
  if (!user.enrolled_course_id) return <Navigate to="/onboarding" replace />;
  return <Navigate to="/student" replace />;
}

function Guard({
  children,
  roles,
}: {
  children: ReactNode;
  roles: ("student" | "instructor" | "admin")[];
}) {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!token || !user) navigate("/", { replace: true });
    else if (!roles.includes(user.role)) navigate("/", { replace: true });
  }, [token, user, navigate, roles]);
  if (!token || !user || !roles.includes(user.role)) return null;
  return <>{children}</>;
}

export default function App() {
  const { token, refreshUser } = useAuth();
  useEffect(() => {
    if (token) {
      refreshUser();
    }
  }, [token, refreshUser]);
  return (
    <ToastProvider>
      <Routes>
        <Route path="/" element={<HomeGate />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<LoginPage initialMode="register" />} />
        <Route
          path="/onboarding"
          element={
            <Guard roles={["student"]}>
              <OnboardingPage />
            </Guard>
          }
        />
        <Route element={<AppShell />}>
          <Route
            path="/student"
            element={
              <Guard roles={["student"]}>
                <StudentHome />
              </Guard>
            }
          />
          <Route
            path="/student/roadmap"
            element={
              <Guard roles={["student"]}>
                <StudentRoadmap />
              </Guard>
            }
          />
          <Route
            path="/student/tutor"
            element={
              <Guard roles={["student"]}>
                <StudentTutor />
              </Guard>
            }
          />
          <Route
            path="/student/skill-graph"
            element={
              <Guard roles={["student"]}>
                <StudentSkillGraph />
              </Guard>
            }
          />
          <Route
            path="/student/career"
            element={
              <Guard roles={["student"]}>
                <StudentCareer />
              </Guard>
            }
          />
          <Route
            path="/student/twin"
            element={
              <Guard roles={["student"]}>
                <StudentTwin />
              </Guard>
            }
          />
          <Route
            path="/student/module/:id"
            element={
              <Guard roles={["student"]}>
                <ModulePage />
              </Guard>
            }
          />
          <Route
            path="/instructor"
            element={
              <Guard roles={["instructor", "admin"]}>
                <InstructorHome />
              </Guard>
            }
          />
          <Route
            path="/instructor/student/:id"
            element={
              <Guard roles={["instructor", "admin"]}>
                <InstructorStudent />
              </Guard>
            }
          />
          <Route
            path="/admin"
            element={
              <Guard roles={["admin"]}>
                <AdminHome />
              </Guard>
            }
          />
          <Route
            path="/admin/courses"
            element={
              <Guard roles={["admin"]}>
                <AdminCourses />
              </Guard>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ToastProvider>
  );
}
