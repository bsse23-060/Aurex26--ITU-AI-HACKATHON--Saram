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
  const [voiceMode, setVoiceMode] = useState(false);
  const voiceModeRef = useRef(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recorderChunksRef = useRef<Blob[]>([]);
  const recorderStreamRef = useRef<MediaStream | null>(null);
  const recorderTimerRef = useRef<number | null>(null);
  const recorderStartedAtRef = useRef<number>(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [followups, setFollowups] = useState<string[]>([]);
  const [playingIdx, setPlayingIdx] = useState<number | null>(null);
  const [pendingPlay, setPendingPlay] = useState<{ url: string; idx: number; text: string } | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const sendRef = useRef<((text: string, opts?: { speak?: boolean }) => Promise<void>) | null>(null);

  const voiceModeAvailable = ttsEnabled && sttEnabled;

  useEffect(() => {
    voiceModeRef.current = voiceMode;
  }, [voiceMode]);

  useEffect(() => {
    if (!voiceModeAvailable && voiceMode) setVoiceMode(false);
  }, [voiceModeAvailable, voiceMode]);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.removeAttribute("src");
        audioRef.current.load();
      } catch {
        // best-effort cleanup
      }
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setPlayingIdx(null);
    setPendingPlay(null);
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
        // eslint-disable-next-line no-console
        console.debug("[tutor] requesting ElevenLabs TTS", { idx, chars: text.length });
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
        // eslint-disable-next-line no-console
        console.debug("[tutor] ElevenLabs audio blob", { size: blob.size, type: blob.type });
        if (!blob.size) {
          throw new Error("Empty audio response from ElevenLabs");
        }
        const audioBlob = blob.type.startsWith("audio/")
          ? blob
          : blob.slice(0, blob.size, "audio/mpeg");
        const url = URL.createObjectURL(audioBlob);
        objectUrlRef.current = url;

        const audio = audioRef.current ?? new Audio();
        audioRef.current = audio;
        audio.src = url;
        audio.preload = "auto";
        audio.volume = 1.0;
        audio.muted = false;
        try {
          audio.load();
        } catch {
          // ignore: some browsers throw when load() is called before metadata
        }
        try {
          await audio.play();
          // eslint-disable-next-line no-console
          console.debug("[tutor] ElevenLabs playback started");
        } catch (playErr) {
          // eslint-disable-next-line no-console
          console.warn("[tutor] autoplay blocked by browser", playErr);
          setPendingPlay({ url, idx, text });
          setPlayingIdx(null);
          toast.warn(
            "Browser blocked autoplay. Tap “Tap to hear reply” to play.",
            "ElevenLabs",
          );
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("[tutor] ElevenLabs TTS failed", err);
        toast.fail((err as Error).message, "ElevenLabs");
        stopAudio();
      }
    },
    [playingIdx, stopAudio, toast, token],
  );

  const playPending = useCallback(async () => {
    const pending = pendingPlay;
    if (!pending || !audioRef.current) return;
    try {
      setPlayingIdx(pending.idx);
      setPendingPlay(null);
      await audioRef.current.play();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[tutor] manual play failed", err);
      toast.fail((err as Error).message, "ElevenLabs");
      stopAudio();
    }
  }, [pendingPlay, stopAudio, toast]);

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
        if (sendRef.current) {
          toast.success(`Heard you in ${out.language} · sending…`, "Voice assistant");
          void sendRef.current(cleaned, { speak: true });
        } else {
          setInput((curr) => (curr ? `${curr.trim()} ${cleaned}` : cleaned));
          inputRef.current?.focus();
          toast.success(`Transcribed (${out.language})`, "Voice input");
        }
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

  const send = useCallback(
    async (text?: string, opts?: { speak?: boolean }) => {
      const m = (text ?? input).trim();
      if (!m || busy) return;
      const shouldSpeak = (opts?.speak ?? false) || voiceModeRef.current;
      setBusy(true);
      setInput("");
      setMessages((curr) => [
        ...curr,
        { role: "user", content: m },
        { role: "assistant", content: "", pending: true },
      ]);
      try {
        const res = await endpoints.tutorAsk({ message: m }, token);
        let assistantIdx = -1;
        setMessages((curr) => {
          const next = curr.slice(0, -1);
          next.push({
            role: "assistant",
            content: res.reply,
            language: res.language,
            citations: res.citations,
          });
          assistantIdx = next.length - 1;
          return next;
        });
        setFollowups(res.suggested_followups);
        if (shouldSpeak && ttsEnabled && assistantIdx >= 0 && res.reply) {
          void playMessage(assistantIdx, res.reply);
        }
      } catch (err) {
        setMessages((curr) => curr.slice(0, -1));
        toast.fail((err as Error).message, "Tutor failed");
      } finally {
        setBusy(false);
      }
    },
    [busy, input, playMessage, toast, token, ttsEnabled],
  );

  useEffect(() => {
    sendRef.current = send;
  }, [send]);

  const voiceToggleTitle = !voiceModeAvailable
    ? "Configure ELEVENLABS_API_KEY + GROQ_API_KEY in backend/.env to enable voice"
    : voiceMode
      ? "Voice assistant on — every reply is spoken aloud via ElevenLabs"
      : "Tap the mic to talk; replies are spoken via ElevenLabs. Toggle on to also speak typed replies.";
  const speaking = playingIdx !== null;

  return (
    <div className="grid gap-16 sm:gap-24 lg:grid-cols-[minmax(0,1fr)_320px]">
      <audio
        ref={audioRef}
        playsInline
        preload="auto"
        onEnded={stopAudio}
        onError={() => {
          // eslint-disable-next-line no-console
          console.warn("[tutor] audio element fired error", audioRef.current?.error);
          stopAudio();
        }}
        className="hidden"
      />
      <div className="flex flex-col min-w-0 min-h-[460px] h-[calc(100dvh-160px)] lg:min-h-[560px]">
        <header className="mb-12 sm:mb-16 flex flex-col gap-12 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="label-caps text-secondary">AI tutor</p>
            <h1 className="display text-22 sm:text-26 md:text-30 leading-tight">
              Ask anything · code-switch friendly
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-8 font-body">
            <button
              type="button"
              onClick={() => setVoiceMode((v) => !v)}
              disabled={!voiceModeAvailable}
              aria-pressed={voiceMode}
              title={voiceToggleTitle}
              className={cn(
                "inline-flex items-center gap-8 rounded-md border px-12 py-8 text-13 transition-colors",
                voiceMode
                  ? "border-primary bg-primary text-surface shadow-glow"
                  : voiceModeAvailable
                    ? "border-line bg-surface text-ink hover:border-primary/40 hover:bg-aqua-soft"
                    : "border-line bg-neutral text-ink/40 cursor-not-allowed",
              )}
            >
              <span
                className={cn(
                  "inline-flex h-18 w-18 items-center justify-center rounded-full",
                  voiceMode
                    ? "bg-surface/25 text-surface"
                    : voiceModeAvailable
                      ? "bg-aqua-soft text-primary"
                      : "bg-neutral text-ink/35",
                )}
              >
                <Icon name="mic" size={12} />
              </span>
              <span className="font-medium">
                {voiceMode ? "Voice on" : "Voice assistant"}
              </span>
              <span
                className={cn(
                  "rounded-sm px-6 py-2 text-10 uppercase tracking-[0.08em]",
                  voiceMode
                    ? "bg-surface/20 text-surface"
                    : voiceModeAvailable
                      ? "bg-aqua-soft text-primary"
                      : "bg-neutral text-ink/40",
                )}
              >
                ElevenLabs
              </span>
              {voiceMode && (
                <span className="inline-block h-6 w-6 rounded-full bg-aqua-bright/90 animate-pulse" aria-hidden />
              )}
            </button>
            {speaking && (
              <span className="inline-flex items-center gap-6 rounded-md border border-primary/30 bg-aqua-soft px-10 py-6 text-12 text-primary">
                <Icon name="speaker" size={12} />
                <span>Speaking via ElevenLabs…</span>
                <button
                  type="button"
                  onClick={stopAudio}
                  className="ml-4 rounded-sm border border-primary/40 px-6 py-1 text-11 hover:bg-mint"
                >
                  stop
                </button>
              </span>
            )}
            {pendingPlay && !speaking && (
              <button
                type="button"
                onClick={playPending}
                className="inline-flex items-center gap-6 rounded-md border border-warning/40 bg-warning/10 px-10 py-6 text-12 text-warning hover:bg-warning/20"
                title="Browser blocked autoplay — tap to hear the reply"
              >
                <Icon name="speaker" size={12} />
                Tap to hear reply
              </button>
            )}
            <div className="hidden md:flex items-center gap-8 text-12 text-ink/55">
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
          </div>
        </header>
        <Card className="flex-1 flex flex-col p-0 overflow-hidden" pad="sm">
          {voiceMode && (
            <div className="flex items-center gap-8 border-b border-line bg-aqua-soft/60 px-12 sm:px-20 py-8 font-body text-12 text-primary">
              <span className="inline-block h-6 w-6 shrink-0 rounded-full bg-primary animate-pulse" aria-hidden />
              <span className="leading-snug">
                Voice mode is on — tap the mic to speak; replies will be spoken aloud.
              </span>
            </div>
          )}
          <div
            ref={listRef}
            className="flex-1 min-h-0 overflow-y-auto scrollbar-thin px-12 sm:px-20 py-16 sm:py-24 space-y-14 sm:space-y-16 bg-canvas/40"
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
                      "max-w-[88%] sm:max-w-[78%] min-w-0 rounded-lg border px-12 sm:px-16 py-10 sm:py-12 text-14 leading-relaxed shadow-artistic",
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
                      : voiceMode
                        ? "Tap the mic to talk — or type…"
                        : "Ask in English or Roman Urdu…"
                }
                disabled={recording || transcribing}
                className="flex-1 min-w-0 rounded-md border border-line bg-surface px-12 sm:px-16 font-body text-15 leading-none focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 disabled:bg-neutral disabled:text-ink/55"
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
                        : voiceMode
                          ? "border-primary bg-aqua-soft text-primary hover:bg-mint"
                          : "border-line bg-surface text-ink hover:border-primary/40 hover:bg-aqua-soft",
                  )}
                  style={{ width: 44, height: 44 }}
                  title={recording ? "Stop recording" : voiceMode ? "Talk to the tutor" : "Click to speak"}
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

