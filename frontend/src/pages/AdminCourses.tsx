import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  endpoints,
  type AdminCourseSummary,
  type Course as CourseDetail,
  type CourseInput,
  type ModuleInput,
} from "../lib/api";
import { useAuth } from "../lib/authStore";
import { Card, CardTitle } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Skeleton } from "../components/ui/Skeleton";
import { Badge } from "../components/ui/Badge";
import { Icon } from "../components/ui/Icon";
import { useToast } from "../components/ui/Toaster";
import { cn } from "../lib/cn";

const DEFAULT_COLOR = "#0F766E";
const COLOR_OPTIONS = [
  "#0F766E",
  "#14B8A6",
  "#22C55E",
  "#0EA5E9",
  "#8B5CF6",
  "#F59E0B",
  "#EF4444",
];

export function AdminCourses() {
  const token = useAuth((s) => s.token)!;
  const toast = useToast();
  const [list, setList] = useState<AdminCourseSummary[] | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<CourseDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<number | null>(null);

  const reloadList = useCallback(async () => {
    try {
      const rows = await endpoints.adminCourses(token);
      setList(rows);
      if (rows.length > 0 && selectedId === null) {
        setSelectedId(rows[0].id);
      }
    } catch (err) {
      toast.fail((err as Error).message, "Could not load courses");
    }
  }, [selectedId, toast, token]);

  useEffect(() => {
    reloadList();
  }, [reloadList]);

  useEffect(() => {
    if (selectedId === null) {
      setDetail(null);
      return;
    }
    setDetailLoading(true);
    endpoints
      .adminCourse(selectedId, token)
      .then(setDetail)
      .catch((err) => toast.fail((err as Error).message, "Could not load course"))
      .finally(() => setDetailLoading(false));
  }, [selectedId, toast, token]);

  const summaryById = useMemo(() => {
    const map = new Map<number, AdminCourseSummary>();
    list?.forEach((c) => map.set(c.id, c));
    return map;
  }, [list]);

  const handleDelete = async (courseId: number) => {
    if (pendingDelete !== null) return;
    setPendingDelete(courseId);
    try {
      await endpoints.adminDeleteCourse(courseId, token);
      toast.success("Course deleted", "Catalogue");
      if (selectedId === courseId) setSelectedId(null);
      await reloadList();
    } catch (err) {
      toast.fail((err as Error).message, "Delete failed");
    } finally {
      setPendingDelete(null);
    }
  };

  const handleCreate = async (payload: CourseInput) => {
    const created = await endpoints.adminCreateCourse(payload, token);
    toast.success(`${created.title} added`, "Catalogue");
    await reloadList();
    setSelectedId(created.id);
  };

  const handlePatch = async (
    courseId: number,
    payload: Parameters<typeof endpoints.adminUpdateCourse>[1],
  ) => {
    const updated = await endpoints.adminUpdateCourse(courseId, payload, token);
    setDetail(updated);
    await reloadList();
    toast.success("Saved", "Catalogue");
  };

  const handleAddModule = async (courseId: number, payload: ModuleInput) => {
    await endpoints.adminAddModule(courseId, payload, token);
    const updated = await endpoints.adminCourse(courseId, token);
    setDetail(updated);
    await reloadList();
    toast.success(`Module “${payload.title}” added`, "Catalogue");
  };

  const handleDeleteModule = async (moduleId: number) => {
    if (!detail) return;
    await endpoints.adminDeleteModule(moduleId, token);
    const updated = await endpoints.adminCourse(detail.id, token);
    setDetail(updated);
    await reloadList();
    toast.success("Module removed", "Catalogue");
  };

  return (
    <div className="space-y-24">
      <div className="flex flex-wrap items-end justify-between gap-12">
        <div>
          <p className="label-caps text-secondary">Catalogue</p>
          <h1 className="display text-36">Manage courses</h1>
          <p className="text-ink/60 mt-4">
            Add a track, edit metadata, or grow the curriculum with new modules. Changes are live
            immediately for every student.
          </p>
        </div>
        <Button onClick={() => setShowNew(true)} icon={<Icon name="rocket" size={14} />}>
          New course
        </Button>
      </div>

      <div className="grid gap-24 lg:grid-cols-[320px_1fr]">
        <Card>
          <CardTitle kicker="Tracks">Catalogue</CardTitle>
          {list === null ? (
            <Skeleton className="h-40" />
          ) : list.length === 0 ? (
            <p className="text-ink/60">No courses yet. Click “New course” to add one.</p>
          ) : (
            <ul className="space-y-6">
              {list.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(c.id)}
                    className={cn(
                      "w-full rounded-md border px-12 py-10 text-left transition-colors",
                      c.id === selectedId
                        ? "border-primary bg-aqua-soft/70"
                        : "border-line bg-surface hover:border-primary/35 hover:bg-aqua-soft/30",
                    )}
                  >
                    <div className="flex items-center gap-8">
                      <span
                        className="inline-block h-10 w-10 shrink-0 rounded-sm border border-line"
                        style={{ background: c.color || DEFAULT_COLOR }}
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-body text-14 text-ink truncate">{c.title}</p>
                        <p className="font-body text-11 text-secondary truncate">
                          {c.module_count} mod · {c.concept_count} concepts
                        </p>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="space-y-16">
          {selectedId === null ? (
            <Card>
              <p className="text-ink/60">Select a course on the left to edit it.</p>
            </Card>
          ) : detailLoading || !detail ? (
            <Skeleton className="h-64" />
          ) : (
            <CourseEditor
              key={detail.id}
              summary={summaryById.get(detail.id)}
              course={detail}
              onPatch={(payload) => handlePatch(detail.id, payload)}
              onAddModule={(m) => handleAddModule(detail.id, m)}
              onDeleteModule={handleDeleteModule}
              onDeleteCourse={() => handleDelete(detail.id)}
              deleting={pendingDelete === detail.id}
            />
          )}
        </div>
      </div>

      <AnimatePresence>
        {showNew && (
          <NewCourseModal onClose={() => setShowNew(false)} onCreate={handleCreate} />
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Editor
// ---------------------------------------------------------------------------

function CourseEditor({
  summary,
  course,
  onPatch,
  onAddModule,
  onDeleteModule,
  onDeleteCourse,
  deleting,
}: {
  summary?: AdminCourseSummary;
  course: CourseDetail;
  onPatch: (
    payload: Parameters<typeof endpoints.adminUpdateCourse>[1],
  ) => Promise<void>;
  onAddModule: (m: ModuleInput) => Promise<void>;
  onDeleteModule: (moduleId: number) => Promise<void>;
  onDeleteCourse: () => Promise<void>;
  deleting: boolean;
}) {
  const [title, setTitle] = useState(course.title);
  const [tagline, setTagline] = useState(course.tagline);
  const [description, setDescription] = useState(course.description);
  const [color, setColor] = useState(course.color || DEFAULT_COLOR);
  const [saving, setSaving] = useState(false);
  const dirty =
    title !== course.title ||
    tagline !== course.tagline ||
    description !== course.description ||
    color !== course.color;

  const save = async () => {
    if (!dirty) return;
    setSaving(true);
    try {
      await onPatch({ title, tagline, description, color });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Card accent="primary">
        <div className="flex flex-wrap items-baseline justify-between gap-8 mb-12">
          <CardTitle kicker="Editing">{course.title}</CardTitle>
          <Badge tone="primary">slug: {course.slug}</Badge>
        </div>

        <div className="grid gap-12 md:grid-cols-2">
          <FormField label="Title">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={fieldStyles}
            />
          </FormField>
          <FormField label="Tagline">
            <input
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              className={fieldStyles}
            />
          </FormField>
          <FormField label="Description" className="md:col-span-2">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className={cn(fieldStyles, "min-h-[88px]")}
            />
          </FormField>
          <FormField label="Accent colour" className="md:col-span-2">
            <div className="flex flex-wrap items-center gap-6">
              {COLOR_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setColor(opt)}
                  aria-label={`Pick ${opt}`}
                  className={cn(
                    "h-22 w-22 rounded-sm border-2 transition-shadow",
                    color === opt ? "border-ink shadow-bold" : "border-transparent",
                  )}
                  style={{ background: opt }}
                />
              ))}
              <input
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className={cn(fieldStyles, "max-w-[140px] uppercase tracking-wide")}
              />
            </div>
          </FormField>
        </div>

        <div className="mt-16 flex flex-wrap items-center gap-8">
          <Button
            type="button"
            onClick={save}
            loading={saving}
            disabled={!dirty}
            icon={<Icon name="check" size={14} />}
          >
            Save changes
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={onDeleteCourse}
            loading={deleting}
            icon={<Icon name="x" size={14} />}
            className="text-danger hover:!bg-danger/5 !border-danger/35"
          >
            Delete course
          </Button>
          <span className="ml-auto font-body text-12 text-ink/55">
            {summary?.module_count ?? course.modules.length} modules ·{" "}
            {summary?.concept_count ?? 0} concepts
          </span>
        </div>
      </Card>

      <Card>
        <CardTitle kicker="Modules">Curriculum</CardTitle>
        {course.modules.length === 0 ? (
          <p className="font-body text-13 text-ink/60 mb-12">
            No modules yet. Add the first lesson below.
          </p>
        ) : (
          <ul className="space-y-8 mb-16">
            {course.modules
              .slice()
              .sort((a, b) => a.position - b.position)
              .map((m) => (
                <li
                  key={m.id}
                  className="flex items-start gap-12 rounded-md border border-line bg-surface px-12 py-10"
                >
                  <span className="inline-flex h-22 w-22 shrink-0 items-center justify-center rounded-sm border border-line bg-mint/60 font-body text-12 text-ink/80">
                    {m.position}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-body text-14 text-ink leading-tight">{m.title}</p>
                    <p className="font-body text-12 text-secondary mt-2 line-clamp-2">
                      {m.summary}
                    </p>
                    <p className="font-body text-11 text-ink/45 mt-4">
                      {m.estimated_minutes}m · slug {m.slug}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDeleteModule(m.id)}
                    className="inline-flex h-22 w-22 items-center justify-center rounded-sm border border-line text-secondary hover:border-danger hover:text-danger"
                    aria-label="Delete module"
                    title="Delete module"
                  >
                    <Icon name="x" size={12} />
                  </button>
                </li>
              ))}
          </ul>
        )}
        <NewModuleForm onAdd={onAddModule} />
      </Card>
    </>
  );
}

const fieldStyles =
  "w-full rounded-md border border-line bg-surface px-12 py-8 font-body text-14 leading-snug text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/25";

function FormField({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="block label-caps mb-4">{label}</span>
      {children}
    </label>
  );
}

function NewModuleForm({ onAdd }: { onAdd: (m: ModuleInput) => Promise<void> }) {
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [minutes, setMinutes] = useState(30);
  const [concepts, setConcepts] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !summary.trim()) return;
    setSaving(true);
    try {
      const conceptList = concepts
        .split(/[\n,]/)
        .map((c) => c.trim())
        .filter(Boolean)
        .map((name) => ({ name }));
      await onAdd({
        title: title.trim(),
        summary: summary.trim(),
        estimated_minutes: minutes,
        content_md: content.trim() || undefined,
        concepts: conceptList,
      });
      setTitle("");
      setSummary("");
      setMinutes(30);
      setConcepts("");
      setContent("");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="rounded-md border border-dashed border-line bg-mint/30 p-12 grid gap-10 md:grid-cols-2"
    >
      <FormField label="Module title" className="md:col-span-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Working with DataFrames"
          className={fieldStyles}
        />
      </FormField>
      <FormField label="One-line summary" className="md:col-span-2">
        <input
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="What learners walk away with"
          className={fieldStyles}
        />
      </FormField>
      <FormField label="Estimated minutes">
        <input
          type="number"
          min={5}
          max={600}
          value={minutes}
          onChange={(e) => setMinutes(Math.max(5, Math.min(600, Number(e.target.value) || 30)))}
          className={fieldStyles}
        />
      </FormField>
      <FormField label="Concepts (comma or new-line separated)">
        <input
          value={concepts}
          onChange={(e) => setConcepts(e.target.value)}
          placeholder="loc/iloc, groupby, merge"
          className={fieldStyles}
        />
      </FormField>
      <FormField label="Markdown content (optional)" className="md:col-span-2">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          placeholder="# Heading…"
          className={cn(fieldStyles, "min-h-[80px] font-mono")}
        />
      </FormField>
      <div className="md:col-span-2 flex items-center justify-between gap-12">
        <p className="font-body text-12 text-ink/55">
          Concepts feed the skill graph, RAG tutor, and adaptive quiz instantly.
        </p>
        <Button
          type="submit"
          loading={saving}
          disabled={!title.trim() || !summary.trim()}
          icon={<Icon name="check" size={14} />}
        >
          Add module
        </Button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// New course modal
// ---------------------------------------------------------------------------

function NewCourseModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (payload: CourseInput) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [seedModule, setSeedModule] = useState("");
  const [saving, setSaving] = useState(false);
  const valid = title.trim() && tagline.trim() && description.trim();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setSaving(true);
    try {
      const payload: CourseInput = {
        title: title.trim(),
        tagline: tagline.trim(),
        description: description.trim(),
        color,
        modules: seedModule.trim()
          ? [
              {
                title: seedModule.trim(),
                summary: `Opening lesson for ${title.trim()}.`,
                content_md: `# ${seedModule.trim()}\n\nIntroduce the topic and key vocabulary.`,
                estimated_minutes: 30,
                concepts: [],
              },
            ]
          : [],
      };
      await onCreate(payload);
      onClose();
    } catch {
      // toast handled upstream
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-[80] flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <button
        type="button"
        className="absolute inset-0 bg-ink/30 backdrop-blur-sm"
        aria-label="Close"
        onClick={onClose}
      />
      <motion.form
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 16, opacity: 0 }}
        transition={{ type: "spring", stiffness: 280, damping: 28 }}
        onSubmit={submit}
        className="relative z-10 w-[min(560px,92vw)] rounded-lg border border-line bg-surface shadow-bold p-24"
      >
        <div className="flex items-start justify-between mb-12">
          <div>
            <p className="label-caps text-secondary">New course</p>
            <h2 className="display text-24">Add a track to atomcamp</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-22 w-22 items-center justify-center rounded-sm border border-line text-secondary hover:border-ink/40"
            aria-label="Close"
          >
            <Icon name="x" size={14} />
          </button>
        </div>
        <div className="grid gap-12 md:grid-cols-2">
          <FormField label="Course title" className="md:col-span-2">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Applied Data Science"
              className={fieldStyles}
            />
          </FormField>
          <FormField label="Tagline" className="md:col-span-2">
            <input
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="One sentence that sells the journey"
              className={fieldStyles}
            />
          </FormField>
          <FormField label="Description" className="md:col-span-2">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Who this is for, what they will build, how it fits the Pakistan tech market."
              className={cn(fieldStyles, "min-h-[88px]")}
            />
          </FormField>
          <FormField label="Accent" className="md:col-span-2">
            <div className="flex flex-wrap items-center gap-6">
              {COLOR_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setColor(opt)}
                  className={cn(
                    "h-22 w-22 rounded-sm border-2",
                    color === opt ? "border-ink shadow-bold" : "border-transparent",
                  )}
                  style={{ background: opt }}
                  aria-label={`Pick ${opt}`}
                />
              ))}
            </div>
          </FormField>
          <FormField label="Opening module title (optional)" className="md:col-span-2">
            <input
              value={seedModule}
              onChange={(e) => setSeedModule(e.target.value)}
              placeholder="e.g. Welcome & setup"
              className={fieldStyles}
            />
          </FormField>
        </div>
        <div className="mt-16 flex items-center justify-end gap-8">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            loading={saving}
            disabled={!valid}
            icon={<Icon name="check" size={14} />}
          >
            Create
          </Button>
        </div>
      </motion.form>
    </motion.div>
  );
}
