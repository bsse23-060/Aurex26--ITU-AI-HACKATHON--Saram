import { useCallback, useEffect, useRef, useState } from "react";
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

type SttLang = "auto" | "en" | "ur";

const STT_LABEL: Record<SttLang, string> = { auto: "Auto", en: "EN", ur: "UR" };

export function StudentTutor() {
  const token = useAuth((s) => s.token)!;
  const user = useAuth((s) => s.user)!;
  const toast = useToast();
  const [messages, setMessages] = useState<LocalMsg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [sttEnabled, setSttEnabled] = useState(false);
  const [sttLang, setSttLang] = useState<SttLang>("auto");
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [recordedSec, setRecordedSec] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recorderChunksRef = useRef<Blob[]>([]);
  const recorderStreamRef = useRef<MediaStream | null>(null);
  const recorderTimerRef = useRef<number | null>(null);
  const recorderStartedAtRef = useRef<number>(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [followups, setFollowups] = useState<string[]>([]);
  const [playingIdx, setPlayingIdx] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setPlayingIdx(null);
  }, []);

  useEffect(() => () => stopAudio(), [stopAudio]);

  const playMessage = useCallback(
    async (idx: number, text: string) => {
      if (playingIdx === idx) {
        stopAudio();
        return;
      }
      stopAudio();
      setPlayingIdx(idx);
      try {
        const base = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");
        const res = await fetch(`${base}/api/tutor/voice/tts`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ text }),
        });
        if (!res.ok) {
          let detail = `Voice failed (${res.status})`;
          try {
            const data = await res.json();
            detail = data.detail ?? detail;
          } catch {
            // ignore non-JSON bodies
          }
          throw new Error(detail);
        }
        const blob = await res.blob();
        if (!blob.size || !blob.type.startsWith("audio/")) {
          throw new Error("Empty audio response");
        }
        const url = URL.createObjectURL(blob);
        objectUrlRef.current = url;
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.addEventListener("ended", stopAudio);
        audio.addEventListener("error", () => {
          toast.warn("Could not play audio.", "ElevenLabs");
          stopAudio();
        });
        await audio.play();
      } catch (err) {
        toast.fail((err as Error).message, "ElevenLabs");
        stopAudio();
      }
    },
    [playingIdx, stopAudio, toast, token],
  );

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
    endpoints.voiceStatus().then((s) => {
      setTtsEnabled(Boolean(s.tts_enabled ?? s.enabled));
      setSttEnabled(Boolean(s.stt_enabled));
    });
  }, [token]);

  const stopRecorder = useCallback((discard = false) => {
    if (recorderTimerRef.current !== null) {
      window.clearInterval(recorderTimerRef.current);
      recorderTimerRef.current = null;
    }
    if (discard) {
      recorderChunksRef.current = [];
    }
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") {
      try {
        rec.stop();
      } catch {
        // already stopped
      }
    }
    if (recorderStreamRef.current) {
      recorderStreamRef.current.getTracks().forEach((t) => t.stop());
      recorderStreamRef.current = null;
    }
    setRecording(false);
  }, []);

  useEffect(() => () => stopRecorder(true), [stopRecorder]);

  const pickMimeType = (): string | undefined => {
    if (typeof MediaRecorder === "undefined") return undefined;
    const candidates = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/ogg;codecs=opus",
      "audio/mp4",
    ];
    return candidates.find((c) => MediaRecorder.isTypeSupported(c));
  };

  const startRecording = useCallback(async () => {
    if (recording || transcribing) return;
    if (!sttEnabled) {
      toast.warn("Speech-to-text not configured. Set GROQ_API_KEY in backend/.env.", "Voice input");
      return;
    }
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      toast.fail("This browser does not support microphone capture.", "Voice input");
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 },
      });
    } catch (err) {
      toast.fail((err as Error).message || "Microphone permission denied.", "Voice input");
      return;
    }
    const mimeType = pickMimeType();
    let rec: MediaRecorder;
    try {
      rec = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    } catch (err) {
      stream.getTracks().forEach((t) => t.stop());
      toast.fail((err as Error).message || "Could not start recorder.", "Voice input");
      return;
    }
    recorderChunksRef.current = [];
    recorderStreamRef.current = stream;
    recorderRef.current = rec;
    rec.addEventListener("dataavailable", (ev) => {
      if (ev.data && ev.data.size > 0) recorderChunksRef.current.push(ev.data);
    });
    rec.addEventListener("stop", async () => {
      const chunks = recorderChunksRef.current;
      recorderChunksRef.current = [];
      const type = rec.mimeType || mimeType || "audio/webm";
      const blob = chunks.length ? new Blob(chunks, { type }) : null;
      if (!blob || blob.size < 800) {
        toast.warn("That clip was too short. Try again.", "Voice input");
        return;
      }
      setTranscribing(true);
      try {
        const out = await endpoints.voiceTranscribe(blob, sttLang, token);
        const cleaned = out.text.trim();
        if (!cleaned) {
          toast.warn("No speech detected.", "Voice input");
          return;
        }
        setInput((curr) => (curr ? `${curr.trim()} ${cleaned}` : cleaned));
        inputRef.current?.focus();
        toast.success(`Transcribed (${out.language})`, "Voice input");
      } catch (err) {
        toast.fail((err as Error).message, "Voice input");
      } finally {
        setTranscribing(false);
      }
    });
    recorderStartedAtRef.current = Date.now();
    setRecordedSec(0);
    recorderTimerRef.current = window.setInterval(() => {
      const elapsed = (Date.now() - recorderStartedAtRef.current) / 1000;
      setRecordedSec(elapsed);
      if (elapsed >= 60) {
        stopRecorder(false);
      }
    }, 200);
    setRecording(true);
    rec.start();
  }, [recording, transcribing, sttEnabled, sttLang, stopRecorder, toast, token]);

  const toggleRecording = useCallback(() => {
    if (recording) stopRecorder(false);
    else startRecording();
  }, [recording, startRecording, stopRecorder]);

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
      <div className="flex flex-col h-[calc(100vh-160px)] min-h-[560px]">
        <header className="mb-16 flex items-end justify-between gap-16">
          <div>
            <p className="label-caps text-secondary">AI tutor</p>
            <h1 className="display text-30 leading-tight">Ask anything · code-switch friendly</h1>
          </div>
          <div className="hidden md:flex items-center gap-8 text-12 text-ink/55 font-body">
            {ttsEnabled && (
              <span className="inline-flex items-center gap-4 rounded-sm border border-line bg-surface px-8 py-4">
                <Icon name="speaker" size={12} /> TTS
              </span>
            )}
            {sttEnabled && (
              <span className="inline-flex items-center gap-4 rounded-sm border border-line bg-surface px-8 py-4">
                <Icon name="mic" size={12} /> STT
              </span>
            )}
          </div>
        </header>
        <Card className="flex-1 flex flex-col p-0 overflow-hidden" pad="sm">
          <div
            ref={listRef}
            className="flex-1 min-h-0 overflow-y-auto scrollbar-thin px-20 py-24 space-y-16 bg-canvas/40"
          >
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center text-ink/55 py-32">
                <div className="mb-12 flex h-48 w-48 items-center justify-center rounded-md border border-line bg-surface">
                  <Icon name="spark" size={20} />
                </div>
                <p className="display text-24 mb-4 text-ink">Welcome, {user.full_name.split(" ")[0]}</p>
                <p className="text-14 max-w-[28ch]">
                  Ask in English or Roman Urdu — try one of the suggestions on the right, or speak with the mic.
                </p>
              </div>
            )}
            <AnimatePresence initial={false}>
              {messages.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "flex gap-12 items-start",
                    m.role === "user" ? "flex-row-reverse" : "flex-row",
                  )}
                >
                  {m.role === "user" ? (
                    <Avatar name={user.full_name} seed={user.avatar_seed} size={32} />
                  ) : (
                    <div className="flex h-32 w-32 shrink-0 items-center justify-center rounded-md border border-line bg-surface text-ink">
                      <Icon name="spark" size={16} />
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[78%] rounded-lg border px-16 py-12 text-14 leading-relaxed shadow-artistic",
                      m.role === "user"
                        ? "bg-primary text-surface border-primary"
                        : "bg-mint/40 text-ink border-line",
                    )}
                  >
                    {m.pending ? (
                      <div className="flex items-center gap-8 text-ink/55">
                        <span className="inline-flex gap-4">
                          <span className="inline-block h-4 w-4 rounded-full bg-primary/35 animate-pulse" />
                          <span className="inline-block h-4 w-4 rounded-full bg-primary/35 animate-pulse [animation-delay:120ms]" />
                          <span className="inline-block h-4 w-4 rounded-full bg-primary/35 animate-pulse [animation-delay:240ms]" />
                        </span>
                        <span>thinking…</span>
                      </div>
                    ) : (
                      <div
                        className={cn(
                          "prose prose-sm max-w-none font-body",
                          m.role === "user" && "prose-invert",
                        )}
                      >
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                      </div>
                    )}
                    {m.role === "assistant" && m.citations && m.citations.length > 0 && (
                      <div className="mt-12 pt-8 border-t border-line space-y-6">
                        <p className="label-caps text-secondary">Citations</p>
                        {m.citations.slice(0, 3).map((c, ci) => (
                          <div
                            key={ci}
                            className="border-l-2 border-line pl-8 font-body text-12 text-secondary"
                          >
                            <span className="text-ink/75">{c.module_title}</span>
                            {c.concept && <span> · {c.concept}</span>}
                            <p className="text-12 text-ink/55 mt-2 line-clamp-2">{c.snippet}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    {m.role === "assistant" && m.language && (
                      <div className="mt-12 flex gap-8 items-center">
                        <Badge tone="secondary">{m.language}</Badge>
                        {ttsEnabled && !m.pending && m.content && (
                          <button
                            type="button"
                            onClick={() => playMessage(i, m.content)}
                            className={cn(
                              "inline-flex items-center gap-4 rounded-sm border bg-surface px-8 py-4 font-body text-12 transition-colors",
                              playingIdx === i
                                ? "border-primary text-primary"
                                : "border-line text-secondary hover:border-primary/40 hover:text-primary",
                            )}
                          >
                            <Icon name="speaker" size={12} />
                            {playingIdx === i ? "stop" : "play"}
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
            className="border-t border-line p-12 flex flex-col gap-8 bg-surface"
          >
            <div className="flex gap-8 items-stretch">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  recording
                    ? "Listening…"
                    : transcribing
                      ? "Transcribing…"
                      : "Ask in English or Roman Urdu…"
                }
                disabled={recording || transcribing}
                className="flex-1 min-w-0 rounded-md border border-line bg-surface px-16 font-body text-15 leading-none focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 disabled:bg-neutral disabled:text-ink/55"
                style={{ height: 44 }}
              />
              {sttEnabled && (
                <button
                  type="button"
                  onClick={toggleRecording}
                  disabled={transcribing}
                  aria-label={recording ? "Stop recording" : "Start recording"}
                  className={cn(
                    "inline-flex items-center justify-center rounded-md border transition-colors shrink-0",
                    recording
                      ? "border-danger bg-danger text-surface animate-pulse"
                      : transcribing
                        ? "border-line bg-neutral text-ink/40 cursor-wait"
                        : "border-line bg-surface text-ink hover:border-primary/40 hover:bg-aqua-soft",
                  )}
                  style={{ width: 44, height: 44 }}
                  title={recording ? "Stop recording" : "Click to speak"}
                >
                  <Icon name="mic" size={18} />
                </button>
              )}
              <Button
                type="submit"
                loading={busy}
                disabled={recording || transcribing || !input.trim()}
                icon={<Icon name="send" size={14} />}
                className="shrink-0"
              >
                Send
              </Button>
            </div>
            {sttEnabled && (
              <div className="flex flex-wrap items-center gap-12 px-4 text-12 font-body">
                <span className="inline-flex items-center gap-6">
                  {recording ? (
                    <>
                      <span className="inline-block h-8 w-8 rounded-full bg-danger animate-pulse" />
                      <span className="text-danger">
                        recording · {recordedSec.toFixed(1)}s — click mic to stop
                      </span>
                    </>
                  ) : transcribing ? (
                    <>
                      <span className="inline-block h-3 w-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                      <span className="text-ink">transcribing with Whisper-Large-v3…</span>
                    </>
                  ) : (
                    <>
                      <Icon name="mic" size={12} />
                      <span className="text-ink/55">Voice input · Groq Whisper-Large-v3</span>
                    </>
                  )}
                </span>
                <div className="ml-auto inline-flex items-center gap-6 text-ink/50">
                  <span className="uppercase tracking-[0.08em] text-11">lang</span>
                  <div className="inline-flex rounded-sm border border-line bg-surface overflow-hidden">
                    {(["auto", "en", "ur"] as SttLang[]).map((l) => (
                      <button
                        key={l}
                        type="button"
                        onClick={() => setSttLang(l)}
                        disabled={recording || transcribing}
                        className={cn(
                          "px-8 py-4 transition-colors text-12 font-body min-w-[36px]",
                          sttLang === l
                            ? "bg-primary text-surface"
                            : "text-secondary hover:bg-aqua-soft",
                        )}
                      >
                        {STT_LABEL[l]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </form>
        </Card>
      </div>

      <aside className="space-y-16">
        <Card>
          <p className="label-caps text-secondary mb-8">Try a prompt</p>
          <div className="space-y-6">
            {PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => send(p)}
                disabled={busy}
                className="w-full text-left rounded-md border border-line bg-surface px-12 py-8 font-body text-14 leading-snug text-ink/85 hover:border-primary/35 hover:bg-aqua-soft/50 transition-colors disabled:opacity-40"
              >
                {p}
              </button>
            ))}
          </div>
        </Card>
        {followups.length > 0 && (
          <Card>
            <p className="label-caps text-secondary mb-8">Follow-ups</p>
            <div className="space-y-6">
              {followups.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => send(p)}
                  className="w-full text-left rounded-md border border-line bg-mint/50 px-12 py-8 font-body text-14 leading-snug text-ink hover:border-primary/35 hover:bg-mint transition-colors"
                >
                  {p}
                </button>
              ))}
            </div>
          </Card>
        )}
        <Card>
          <p className="label-caps text-secondary mb-8">Voice subsystems</p>
          <ul className="space-y-8 font-body text-13 leading-snug">
            <li className="flex items-start gap-8">
              <span
                className={cn(
                  "mt-2 inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-sm border",
                  ttsEnabled ? "border-primary bg-primary text-surface" : "border-line bg-neutral text-ink/40",
                )}
              >
                <Icon name="speaker" size={10} />
              </span>
              <span className={ttsEnabled ? "text-ink/85" : "text-ink/50"}>
                <span className="font-semibold">Text → speech.</span>{" "}
                {ttsEnabled
                  ? "ElevenLabs Multilingual v2 — English + Urdu."
                  : "Not configured. Set ELEVENLABS_API_KEY in backend/.env."}
              </span>
            </li>
            <li className="flex items-start gap-8">
              <span
                className={cn(
                  "mt-2 inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-sm border",
                  sttEnabled ? "border-success bg-success text-surface" : "border-line bg-neutral text-ink/40",
                )}
              >
                <Icon name="mic" size={10} />
              </span>
              <span className={sttEnabled ? "text-ink/85" : "text-ink/50"}>
                <span className="font-semibold">Speech → text.</span>{" "}
                {sttEnabled
                  ? "Groq Whisper-Large-v3 — auto-detects English & Urdu."
                  : "Not configured. Set GROQ_API_KEY in backend/.env."}
              </span>
            </li>
          </ul>
        </Card>
      </aside>
    </div>
  );
}

