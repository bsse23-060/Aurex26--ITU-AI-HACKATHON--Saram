import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { endpoints, type TutorCitation, type TutorMessage } from "../lib/api";
import { useAuth } from "../lib/authStore";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Avatar } from "../components/ui/Avatar";
import { Icon } from "../components/ui/Icon";
import { useToast } from "../components/ui/Toaster";
import { cn } from "../lib/cn";

type LocalMsg = {
  role: "user" | "assistant";
  content: string;
  language?: string;
  citations?: TutorCitation[];
  pending?: boolean;
};

const PRESETS = [
  "Explain BKT in Roman Urdu with one example",
  "Why is recall important in a fraud model?",
  "How is t-test different from a z-test?",
  "Roman Urdu mein gradient descent samjhao",
];

export function StudentTutor() {
  const token = useAuth((s) => s.token)!;
  const user = useAuth((s) => s.user)!;
  const toast = useToast();
  const [messages, setMessages] = useState<LocalMsg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [followups, setFollowups] = useState<string[]>([]);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endpoints.tutorHistory(20, token).then((rows) => {
      const hist: LocalMsg[] = rows.map((r: TutorMessage) => ({
        role: r.role,
        content: r.content,
        language: r.language,
        citations: r.citations,
      }));
      setMessages(hist);
    });
    endpoints.voiceStatus().then((s) => setVoiceEnabled(s.enabled));
  }, [token]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  async function send(text?: string) {
    const m = (text ?? input).trim();
    if (!m || busy) return;
    setBusy(true);
    setInput("");
    setMessages((curr) => [...curr, { role: "user", content: m }, { role: "assistant", content: "", pending: true }]);
    try {
      const res = await endpoints.tutorAsk({ message: m }, token);
      setMessages((curr) => {
        const next = curr.slice(0, -1);
        next.push({
          role: "assistant",
          content: res.reply,
          language: res.language,
          citations: res.citations,
        });
        return next;
      });
      setFollowups(res.suggested_followups);
    } catch (err) {
      setMessages((curr) => curr.slice(0, -1));
      toast.fail((err as Error).message, "Tutor failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-24 lg:grid-cols-[1fr_320px]">
      <div className="flex flex-col h-[calc(100vh-180px)]">
        <header className="mb-12">
          <p className="label-caps text-secondary">AI tutor</p>
          <h1 className="display text-30">Ask anything · code-switch friendly</h1>
        </header>
        <Card className="flex-1 flex flex-col p-0 overflow-hidden" pad="sm">
          <div ref={listRef} className="flex-1 overflow-y-auto scrollbar-thin p-20 space-y-16">
            {messages.length === 0 && (
              <div className="text-center text-ink/50 py-32">
                <p className="display text-22 mb-4">Welcome, {user.full_name.split(" ")[0]}</p>
                <p className="text-14">Try one of the suggestions on the right, or just ask.</p>
              </div>
            )}
            <AnimatePresence initial={false}>
              {messages.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "flex gap-12",
                    m.role === "user" ? "flex-row-reverse" : "flex-row",
                  )}
                >
                  {m.role === "user" ? (
                    <Avatar name={user.full_name} seed={user.avatar_seed} size={32} />
                  ) : (
                    <div className="h-32 w-32 rounded-md bg-artistic-gradient flex items-center justify-center text-surface">
                      <Icon name="spark" size={16} />
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[80%] rounded-lg px-16 py-12 text-14 leading-relaxed",
                      m.role === "user"
                        ? "bg-primary text-surface"
                        : "bg-ink/5 text-ink",
                    )}
                  >
                    {m.pending ? (
                      <div className="flex items-center gap-8 text-ink/50">
                        <Icon name="spark" size={14} />
                        <span className="animate-pulse">thinking...</span>
                      </div>
                    ) : (
                      <div className="prose prose-sm max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                      </div>
                    )}
                    {m.role === "assistant" && m.citations && m.citations.length > 0 && (
                      <div className="mt-8 pt-8 border-t border-ink/10 space-y-4">
                        <p className="label-caps text-secondary">Citations</p>
                        {m.citations.slice(0, 3).map((c, ci) => (
                          <div key={ci} className="text-12 font-mono text-ink/70 border-l-2 border-secondary pl-8">
                            <span className="text-secondary">{c.module_title}</span>
                            {c.concept && <span> · {c.concept}</span>}
                            <p className="text-11 text-ink/50 mt-2 line-clamp-2">{c.snippet}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    {m.role === "assistant" && m.language && (
                      <div className="mt-8 flex gap-8 items-center">
                        <Badge tone="secondary">{m.language}</Badge>
                        {voiceEnabled && (
                          <button
                            type="button"
                            onClick={() => playTts(m.content, token, toast)}
                            className="inline-flex items-center gap-4 text-12 text-secondary hover:text-primary"
                          >
                            <Icon name="speaker" size={14} /> play
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="border-t border-ink/5 p-12 flex gap-8 bg-surface"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask in English or Roman Urdu..."
              className="flex-1 rounded-md border-2 border-ink/10 px-16 py-12 font-body text-15 focus:outline-none focus:border-primary focus:shadow-glow"
            />
            <Button type="submit" loading={busy} icon={<Icon name="send" size={14} />}>
              Send
            </Button>
          </form>
        </Card>
      </div>

      <aside className="space-y-16">
        <Card accent="secondary">
          <p className="label-caps text-secondary mb-8">Try a prompt</p>
          <div className="space-y-8">
            {PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => send(p)}
                disabled={busy}
                className="w-full text-left rounded-md border-2 border-ink/10 px-12 py-12 text-14 hover:border-primary hover:text-primary transition-colors disabled:opacity-40"
              >
                {p}
              </button>
            ))}
          </div>
        </Card>
        {followups.length > 0 && (
          <Card accent="primary">
            <p className="label-caps text-secondary mb-8">Follow-ups</p>
            <div className="space-y-8">
              {followups.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => send(p)}
                  className="w-full text-left rounded-md bg-primary/5 border-2 border-primary/20 px-12 py-8 text-14 hover:bg-primary hover:text-surface"
                >
                  {p}
                </button>
              ))}
            </div>
          </Card>
        )}
        <Card accent="warning">
          <p className="label-caps text-warning mb-4">Voice</p>
          <p className="text-14 text-ink/70">
            {voiceEnabled
              ? "ElevenLabs is on — click the speaker on any reply."
              : "ElevenLabs not configured. Add credentials in backend/.env."}
          </p>
        </Card>
      </aside>
    </div>
  );
}

async function playTts(text: string, token: string, toast: ReturnType<typeof useToast>) {
  try {
    const url = `${(import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "")}/api/tutor/voice/tts`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) throw new Error("voice failed");
    const blob = await res.blob();
    const audio = new Audio(URL.createObjectURL(blob));
    audio.play();
  } catch {
    toast.warn("Voice not available right now.");
  }
}
