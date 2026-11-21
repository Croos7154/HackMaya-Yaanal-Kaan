import { useCallback, useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, enqueueLessonEvaluation } from '../db/indexedDb';
import type { ClassroomLanguage, OfflineCourseRecord } from '../types/domain';

interface OfflineClassroomProps {
  selectedCourseId: string | null;
  onSelectCourse: (courseId: string) => void;
  onGoToCatalog: () => void;
  onCompleted: () => void;
}

const STEP_LABELS = ['1. Vocab', '2. Ordenar', '3. Pares', '4. Audio', '5. Examen'];

export function OfflineClassroom({
  selectedCourseId,
  onSelectCourse,
  onGoToCatalog,
  onCompleted,
}: OfflineClassroomProps) {
  const downloadedCourses = useLiveQuery(() => db.courses.toArray(), [], [] as OfflineCourseRecord[]);
  const activeCourse =
    downloadedCourses.find((c) => c.id === selectedCourseId) ?? downloadedCourses[0] ?? null;

  const [lang, setLang] = useState<ClassroomLanguage>('es');
  const [lessonStep, setLessonStep] = useState(0);
  const [stepsDone, setStepsDone] = useState<boolean[]>([false, false, false, false, false]);
  const [hearts, setHearts] = useState(3);
  const [streak, setStreak] = useState(0);
  const [studySeconds, setStudySeconds] = useState(0);
  const [attempts, setAttempts] = useState(0);

  // Estado del reproductor offline (Paso 1)
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [audioRate, setAudioRate] = useState(1.0);
  const [audioProgressPct, setAudioProgressPct] = useState(0);
  const audioTimerRef = useRef<number | null>(null);

  // Paso 2: Ordenar oración
  const [builderSel, setBuilderSel] = useState<number[]>([]);
  const [builderStatus, setBuilderStatus] = useState<'ok' | 'err' | null>(null);

  // Paso 3: Conectar pares
  const [matchLeft, setMatchLeft] = useState<number | null>(null);
  const [matchRight, setMatchRight] = useState<number | null>(null);
  const [matchedIds, setMatchedIds] = useState<number[]>([]);
  const [wrongPair, setWrongPair] = useState<[number, number] | null>(null);

  // Paso 4: Audio comprensión
  const [listenChoice, setListenChoice] = useState<number | null>(null);
  const [listenStatus, setListenStatus] = useState<'ok' | 'err' | null>(null);

  // Paso 5: Examen Final
  const [examStep, setExamStep] = useState(0);
  const [examHits, setExamHits] = useState(0);
  const [examBuilderSel, setExamBuilderSel] = useState<number[]>([]);
  const [examChoiceSel, setExamChoiceSel] = useState<number | null>(null);
  const [submittedResult, setSubmittedResult] = useState<{
    score: number;
    maxScore: number;
    passed: boolean;
    validationHash: string;
    durationSeconds: number;
  } | null>(null);

  // Fallback si la copia descargada es anterior a v1.1.0 sin interactive_unit
  const [fallbackAnswers, setFallbackAnswers] = useState<Record<string, number>>({});

  const stopSpeech = useCallback(() => {
    if (audioTimerRef.current !== null) {
      window.clearInterval(audioTimerRef.current);
      audioTimerRef.current = null;
    }
    setIsPlaying(false);
    setIsPaused(false);
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  const resetUnitState = useCallback(() => {
    stopSpeech();
    setLessonStep(0);
    setStepsDone([false, false, false, false, false]);
    setHearts(3);
    setStreak(0);
    setStudySeconds(0);
    setPhraseIdx(0);
    setAudioProgressPct(0);
    setBuilderSel([]);
    setBuilderStatus(null);
    setMatchLeft(null);
    setMatchRight(null);
    setMatchedIds([]);
    setWrongPair(null);
    setListenChoice(null);
    setListenStatus(null);
    setExamStep(0);
    setExamHits(0);
    setExamBuilderSel([]);
    setExamChoiceSel(null);
    setSubmittedResult(null);
    setFallbackAnswers({});
  }, [stopSpeech]);

  useEffect(() => {
    resetUnitState();
    setAttempts(0);
    return () => stopSpeech();
  }, [activeCourse?.id, resetUnitState, stopSpeech]);

  useEffect(() => {
    if (!activeCourse) return;
    const interval = window.setInterval(() => {
      setStudySeconds((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(interval);
  }, [activeCourse?.id]);

  const speakText = useCallback((text: string, rate = 1.0, speechLang = 'en-US') => {
    if (!text || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    window.setTimeout(() => {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = speechLang;
      u.rate = rate;
      window.speechSynthesis.speak(u);
    }, 25);
  }, []);

  const playPhraseAt = useCallback(
    (idx: number, rateOverride?: number) => {
      const phrases = activeCourse?.interactive_unit?.phrases;
      if (!phrases || phrases.length === 0) return;

      const safeIdx = Math.max(0, Math.min(phrases.length - 1, idx));
      const rate = rateOverride ?? audioRate;
      const speechLang = activeCourse.interactive_unit?.speech_lang ?? 'en-US';

      if (audioTimerRef.current !== null) {
        window.clearInterval(audioTimerRef.current);
      }

      setPhraseIdx(safeIdx);
      setIsPlaying(true);
      setIsPaused(false);

      const basePct = (safeIdx / phrases.length) * 100;
      const stepShare = 100 / phrases.length;
      let subPct = 0;

      speakText(phrases[safeIdx].main, rate, speechLang);

      audioTimerRef.current = window.setInterval(() => {
        subPct += 10 * rate;
        setAudioProgressPct(Math.min(100, basePct + (subPct / 100) * stepShare));

        if (subPct >= 100) {
          if (audioTimerRef.current !== null) {
            window.clearInterval(audioTimerRef.current);
            audioTimerRef.current = null;
          }
          if (safeIdx + 1 < phrases.length) {
            playPhraseAt(safeIdx + 1, rate);
          } else {
            setIsPlaying(false);
            setIsPaused(false);
            setAudioProgressPct(100);
          }
        }
      }, 240);
    },
    [activeCourse, audioRate, speakText]
  );

  const togglePlayPause = () => {
    if (!isPlaying && !isPaused) {
      const startIdx = audioProgressPct >= 99 ? 0 : phraseIdx;
      playPhraseAt(startIdx);
    } else if (isPlaying && !isPaused) {
      setIsPaused(true);
      if (audioTimerRef.current !== null) {
        window.clearInterval(audioTimerRef.current);
        audioTimerRef.current = null;
      }
      if ('speechSynthesis' in window) window.speechSynthesis.pause();
    } else if (isPaused) {
      setIsPaused(false);
      if ('speechSynthesis' in window) window.speechSynthesis.resume();
      playPhraseAt(phraseIdx);
    }
  };

  const registerSuccess = (stepIdx: number) => {
    setStepsDone((prev) => {
      const next = [...prev];
      next[stepIdx] = true;
      return next;
    });
    setStreak((s) => s + 1);
  };

  const registerMistake = () => {
    setHearts((h) => Math.max(1, h - 1));
    setStreak(0);
  };

  if (!activeCourse) {
    return (
      <section className="rounded-2xl border border-stone-200 bg-white px-6 py-12 text-center shadow-xs">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className="h-6 w-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 4v11"
            />
          </svg>
        </div>
        <h2 className="mt-4 text-lg font-bold text-stone-900">Aún no has descargado una ruta</h2>
        <p className="mx-auto mt-1.5 max-w-md text-sm text-stone-600">
          Para probar el Aula Offline (incluso en Modo Avión), primero descarga{' '}
          <strong>Inglés Básico para Turismo</strong> o <strong>Finanzas para Artesanos</strong>{' '}
          desde la pestaña 1.
        </p>
        <button
          type="button"
          onClick={onGoToCatalog}
          className="mt-5 rounded-xl bg-[#0d9488] px-5 py-2.5 text-sm font-extrabold text-white shadow-[0_3px_0_#0f766e]"
        >
          Ir al Selector de Rutas →
        </button>
      </section>
    );
  }

  const unit = activeCourse.interactive_unit;

  // Fallback si la copia local en IndexedDB fue descargada antes de v1.1.0
  if (!unit) {
    const allAnswered = activeCourse.quiz.every((q) => fallbackAnswers[q.id] !== undefined);
    const handleFallbackSubmit = async () => {
      let score = 0;
      for (const q of activeCourse.quiz) {
        if (fallbackAnswers[q.id] === q.correct_index) score += 1;
      }
      const nextAttempt = attempts + 1;
      setAttempts(nextAttempt);
      const { progress } = await enqueueLessonEvaluation({
        course: activeCourse,
        score,
        maxScore: activeCourse.quiz.length,
        durationSeconds: studySeconds,
        attempts: nextAttempt,
      });
      setSubmittedResult({
        score,
        maxScore: activeCourse.quiz.length,
        passed: progress.passed,
        validationHash: progress.validationHash,
        durationSeconds: studySeconds,
      });
    };

    return (
      <section className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-stone-900">{activeCourse.title}</h2>
            <p className="text-xs text-stone-500">
              Permanencia: {studySeconds}s • Actualiza este paquete en 1. Rutas para activar las 5
              dinámicas interactivas.
            </p>
          </div>
          <button
            type="button"
            onClick={onGoToCatalog}
            className="rounded-lg border border-teal-700 px-3 py-1.5 text-xs font-bold text-teal-800"
          >
            Ir a 1. Rutas
          </button>
        </div>
        <p className="text-sm text-stone-700">{activeCourse.lesson.body_text}</p>
        {activeCourse.quiz.map((q, idx) => (
          <fieldset key={q.id} className="space-y-1.5 rounded-xl border border-stone-200 p-3">
            <legend className="text-sm font-semibold text-stone-800">
              {idx + 1}. {q.prompt}
            </legend>
            {q.options.map((opt, optIdx) => (
              <label key={opt} className="flex items-center gap-2 text-sm text-stone-700">
                <input
                  type="radio"
                  name={q.id}
                  checked={fallbackAnswers[q.id] === optIdx}
                  onChange={() =>
                    setFallbackAnswers((prev) => ({ ...prev, [q.id]: optIdx }))
                  }
                />
                <span>{opt}</span>
              </label>
            ))}
          </fieldset>
        ))}
        <button
          type="button"
          disabled={!allAnswered}
          onClick={() => void handleFallbackSubmit()}
          className="rounded-xl bg-[#0d9488] px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
        >
          Guardar Evaluación en sync_queue
        </button>
        {submittedResult && (
          <div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">
            Resultado {submittedResult.score}/{submittedResult.maxScore} —{' '}
            {submittedResult.validationHash}
          </div>
        )}
      </section>
    );
  }

  const isMaya = lang === 'yua';
  const doneCount = stepsDone.filter(Boolean).length;
  const hudPct = Math.round((doneCount / 5) * 100);
  const rightOrder = [2, 0, 3, 1];

  const handleSelectMatch = (side: 'left' | 'right', id: number) => {
    if (matchedIds.includes(id)) return;
    setWrongPair(null);

    const nextLeft = side === 'left' ? id : matchLeft;
    const nextRight = side === 'right' ? id : matchRight;

    if (side === 'left') setMatchLeft(id);
    else {
      setMatchRight(id);
      speakText(unit.pairs[id].target, 1.0, unit.speech_lang);
    }

    if (nextLeft === null || nextRight === null) return;

    if (nextLeft === nextRight) {
      const updated = [...matchedIds, nextLeft];
      setMatchedIds(updated);
      setMatchLeft(null);
      setMatchRight(null);
      if (updated.length === unit.pairs.length) {
        registerSuccess(2);
      }
    } else {
      setWrongPair([nextLeft, nextRight]);
      registerMistake();
      window.setTimeout(() => {
        setMatchLeft(null);
        setMatchRight(null);
        setWrongPair(null);
      }, 450);
    }
  };

  const handleSubmitExamStep = async () => {
    const challenge = unit.exam[examStep];
    let hit = false;

    if (challenge.type === 'order') {
      if (examBuilderSel.length < challenge.expected.length) return;
      const formed = examBuilderSel.map((i) => challenge.tiles[i]).join(' ');
      hit = formed === challenge.expected.join(' ');
    } else {
      if (examChoiceSel === null) return;
      hit = examChoiceSel === challenge.correct;
    }

    const nextHits = examHits + (hit ? 1 : 0);
    if (hit) {
      setExamHits(nextHits);
      setStreak((s) => s + 1);
    } else {
      registerMistake();
    }

    setExamBuilderSel([]);
    setExamChoiceSel(null);

    if (examStep + 1 < unit.exam.length) {
      setExamStep(examStep + 1);
      return;
    }

    const nextAttempt = attempts + 1;
    setAttempts(nextAttempt);
    registerSuccess(4);

    const { progress } = await enqueueLessonEvaluation({
      course: activeCourse,
      score: nextHits,
      maxScore: unit.exam.length,
      durationSeconds: studySeconds,
      attempts: nextAttempt,
    });

    setSubmittedResult({
      score: nextHits,
      maxScore: unit.exam.length,
      passed: progress.passed,
      validationHash: progress.validationHash,
      durationSeconds: studySeconds,
    });
  };

  return (
    <section className="rounded-2xl border border-teal-100 border-t-4 border-t-[#0d9488] bg-white p-5 shadow-xs space-y-4">
      {/* Cabecera de la unidad */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-stone-900">{activeCourse.title}</h2>
          <p className="text-xs text-stone-500">
            {unit.subtitle} • 0 ms offline • Permanencia: <strong>{studySeconds}s</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {downloadedCourses.length > 1 && (
            <select
              aria-label="Cambiar ruta descargada"
              value={activeCourse.id}
              onChange={(e) => onSelectCourse(e.target.value)}
              className="rounded-xl border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-bold text-stone-800"
            >
              {downloadedCourses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={resetUnitState}
            className="rounded-full border border-stone-300 bg-stone-50 px-3 py-1.5 text-xs font-bold text-stone-700 hover:bg-stone-100"
          >
            ↺ Reiniciar
          </button>
        </div>
      </div>

      {/* Selector bilingüe Español / Maayat'aan */}
      <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-teal-50/80 p-1 border border-teal-100">
        <button
          type="button"
          onClick={() => setLang('es')}
          className={`rounded-lg py-2 text-xs font-bold transition ${
            lang === 'es' ? 'bg-white text-teal-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          🇲🇽 Español / Contenido
        </button>
        <button
          type="button"
          onClick={() => setLang('yua')}
          className={`rounded-lg py-2 text-xs font-bold transition ${
            lang === 'yua'
              ? 'bg-white text-teal-900 shadow-xs'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          🌿 Maayat&apos;aan / Maya
        </button>
      </div>

      {/* HUD estilo Duolingo */}
      <div className="flex items-center gap-2.5">
        <div className="h-3 flex-1 overflow-hidden rounded-full bg-stone-200">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 transition-all duration-300"
            style={{ width: `${hudPct}%` }}
          />
        </div>
        <span className="rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs font-extrabold text-rose-600">
          ♥ {hearts}
        </span>
        <span className="rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs font-extrabold text-amber-600">
          🔥 {streak}
        </span>
      </div>

      {/* Navegación por los 5 pasos */}
      <div className="grid grid-cols-5 gap-1.5">
        {STEP_LABELS.map((label, idx) => (
          <button
            key={label}
            type="button"
            onClick={() => {
              stopSpeech();
              setLessonStep(idx);
            }}
            className={`rounded-lg border px-1 py-1.5 text-[11px] font-extrabold transition ${
              lessonStep === idx
                ? 'border-teal-700 bg-[#0d9488] text-white shadow-xs'
                : stepsDone[idx]
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                  : 'border-stone-200 bg-stone-50 text-stone-600 hover:bg-stone-100'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* PASO 1: VOCABULARIO + REPRODUCTOR OFFLINE */}
      {lessonStep === 0 && (
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-extrabold text-stone-900">{unit.vocab_title}</h3>
            <p className="text-xs text-stone-600">{unit.vocab_desc}</p>
          </div>

          <div className="rounded-2xl border border-teal-200 bg-gradient-to-b from-teal-50/70 to-teal-50 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-stone-700">
              <span>
                Tarjeta {phraseIdx + 1} de {unit.phrases.length} • Audio Offline
              </span>
              <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[11px] text-teal-800">
                0 ms
              </span>
            </div>

            <div
              role="slider"
              aria-label="Progreso de audio"
              aria-valuenow={Math.round(audioProgressPct)}
              tabIndex={0}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const ratio = Math.max(0, Math.min(0.99, (e.clientX - rect.left) / rect.width));
                const idx = Math.floor(ratio * unit.phrases.length);
                setAudioProgressPct(ratio * 100);
                playPhraseAt(idx);
              }}
              className="h-2.5 w-full cursor-pointer overflow-hidden rounded-full bg-teal-200/80"
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-teal-600 to-amber-500 transition-all duration-150"
                style={{ width: `${audioProgressPct}%` }}
              />
            </div>

            <div className="grid grid-cols-5 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setAudioProgressPct(0);
                  playPhraseAt(0);
                }}
                className="rounded-lg border border-stone-300 bg-white py-2 text-[11px] font-extrabold text-stone-700 hover:bg-stone-50"
              >
                ⏮ Inicio
              </button>
              <button
                type="button"
                onClick={() => playPhraseAt(Math.max(0, phraseIdx - 1))}
                className="rounded-lg border border-stone-300 bg-white py-2 text-[11px] font-extrabold text-stone-700 hover:bg-stone-50"
              >
                ⏪ -1
              </button>
              <button
                type="button"
                onClick={togglePlayPause}
                className="rounded-lg bg-[#0d9488] py-2 text-[11px] font-extrabold text-white hover:bg-[#0f766e]"
              >
                {isPlaying && !isPaused ? '⏸ Pausar' : isPaused ? '▶ Seguir' : '▶ Escuchar'}
              </button>
              <button
                type="button"
                onClick={() => playPhraseAt(Math.min(unit.phrases.length - 1, phraseIdx + 1))}
                className="rounded-lg border border-stone-300 bg-white py-2 text-[11px] font-extrabold text-stone-700 hover:bg-stone-50"
              >
                ⏩ +1
              </button>
              <button
                type="button"
                onClick={() => {
                  const nextRate = audioRate === 1.0 ? 0.8 : 1.0;
                  setAudioRate(nextRate);
                  if (isPlaying && !isPaused) playPhraseAt(phraseIdx, nextRate);
                }}
                className="rounded-lg border border-stone-300 bg-white py-2 text-[11px] font-extrabold text-stone-700 hover:bg-stone-50"
              >
                {audioRate.toFixed(1)}x
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {unit.phrases.map((phrase, idx) => (
              <button
                key={phrase.main}
                type="button"
                onClick={() => playPhraseAt(idx)}
                className={`w-full rounded-xl border p-3 text-left transition ${
                  idx === phraseIdx
                    ? 'border-teal-600 bg-teal-50/70 shadow-xs'
                    : 'border-stone-200 bg-white hover:border-teal-300'
                }`}
              >
                <div className="text-sm font-extrabold text-teal-900">
                  {activeCourse.id.includes('ingles') ? '🇬🇧' : '💰'} {phrase.main}
                </div>
                <div className="mt-0.5 text-xs text-stone-600">
                  {isMaya ? `🌿 ${phrase.yua}` : `🇲🇽 ${phrase.es}`}
                </div>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              stopSpeech();
              registerSuccess(0);
              setLessonStep(1);
            }}
            className="w-full rounded-xl bg-gradient-to-b from-[#14b8a6] to-[#0d9488] py-3 text-sm font-extrabold text-white shadow-[0_3px_0_#0f766e]"
          >
            Continuar a Práctica Interactiva →
          </button>
        </div>
      )}

      {/* PASO 2: ORDENAR LA ORACIÓN */}
      {lessonStep === 1 && (
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-extrabold text-stone-900">{unit.builder.title}</h3>
            <p className="text-xs text-stone-600">
              {isMaya ? unit.builder.prompt_yua : unit.builder.prompt_es}
            </p>
          </div>

          <div className="flex min-h-14 flex-wrap items-center gap-2 rounded-xl border-2 border-dashed border-teal-300 bg-teal-50/40 p-2.5">
            {builderSel.length === 0 ? (
              <span className="text-xs text-stone-500">
                Toca las fichas de abajo en el orden correcto...
              </span>
            ) : (
              builderSel.map((tileIdx, pos) => (
                <button
                  key={`${tileIdx}-${pos}`}
                  type="button"
                  onClick={() => {
                    setBuilderSel((prev) => prev.filter((_, i) => i !== pos));
                    setBuilderStatus(null);
                  }}
                  className="rounded-xl bg-[#0d9488] px-3 py-1.5 text-sm font-extrabold text-white shadow-[0_2px_0_#115e59]"
                >
                  {unit.builder.tiles[tileIdx]}
                </button>
              ))
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {unit.builder.tiles.map((tile, idx) => {
              const used = builderSel.includes(idx);
              return (
                <button
                  key={`${tile}-${idx}`}
                  type="button"
                  disabled={used}
                  onClick={() => {
                    setBuilderSel((prev) => [...prev, idx]);
                    setBuilderStatus(null);
                    speakText(tile, 1.0, unit.speech_lang);
                  }}
                  className="rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-sm font-extrabold text-stone-800 shadow-[0_3px_0_#cbd5e1] disabled:opacity-30 disabled:shadow-none"
                >
                  {tile}
                </button>
              );
            })}
          </div>

          {builderStatus === 'ok' && (
            <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-xs text-emerald-900">
              <strong>¡Excelente!</strong> {unit.builder.ok_msg}
            </div>
          )}
          {builderStatus === 'err' && (
            <div className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs text-rose-900">
              {unit.builder.err_msg}
            </div>
          )}

          {builderStatus === 'ok' ? (
            <button
              type="button"
              onClick={() => setLessonStep(2)}
              className="w-full rounded-xl bg-gradient-to-b from-[#14b8a6] to-[#0d9488] py-3 text-sm font-extrabold text-white shadow-[0_3px_0_#0f766e]"
            >
              Siguiente: Emparejar Pares →
            </button>
          ) : (
            <button
              type="button"
              disabled={builderSel.length < unit.builder.expected.length}
              onClick={() => {
                const formed = builderSel.map((i) => unit.builder.tiles[i]).join(' ');
                const target = unit.builder.expected.join(' ');
                if (formed === target) {
                  setBuilderStatus('ok');
                  speakText(target, 0.95, unit.speech_lang);
                  registerSuccess(1);
                } else {
                  setBuilderStatus('err');
                  registerMistake();
                }
              }}
              className="w-full rounded-xl bg-gradient-to-b from-[#14b8a6] to-[#0d9488] py-3 text-sm font-extrabold text-white shadow-[0_3px_0_#0f766e] disabled:opacity-40"
            >
              Comprobar Respuesta
            </button>
          )}
        </div>
      )}

      {/* PASO 3: EMPAREJAR PARES */}
      {lessonStep === 2 && (
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-extrabold text-stone-900">Paso 3 · Conecta los Pares</h3>
            <p className="text-xs text-stone-600">
              Toca un concepto en {isMaya ? "Maayat'aan" : 'Español'} y luego su pareja
              correspondiente.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-2">
              {unit.pairs.map((pair) => {
                const isMatched = matchedIds.includes(pair.id);
                const isSel = matchLeft === pair.id;
                const isWrong = wrongPair?.[0] === pair.id;
                return (
                  <button
                    key={pair.id}
                    type="button"
                    disabled={isMatched}
                    onClick={() => handleSelectMatch('left', pair.id)}
                    className={`w-full rounded-xl border p-3 text-xs font-extrabold transition ${
                      isMatched
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-800 opacity-70'
                        : isWrong
                          ? 'border-rose-400 bg-rose-50 text-rose-900'
                          : isSel
                            ? 'border-teal-600 bg-teal-50 text-teal-900'
                            : 'border-stone-300 bg-white text-stone-800'
                    }`}
                  >
                    {isMaya ? pair.yua : pair.es}
                  </button>
                );
              })}
            </div>

            <div className="space-y-2">
              {rightOrder.map((idx) => {
                const pair = unit.pairs[idx];
                if (!pair) return null;
                const isMatched = matchedIds.includes(pair.id);
                const isSel = matchRight === pair.id;
                const isWrong = wrongPair?.[1] === pair.id;
                return (
                  <button
                    key={pair.id}
                    type="button"
                    disabled={isMatched}
                    onClick={() => handleSelectMatch('right', pair.id)}
                    className={`w-full rounded-xl border p-3 text-xs font-extrabold transition ${
                      isMatched
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-800 opacity-70'
                        : isWrong
                          ? 'border-rose-400 bg-rose-50 text-rose-900'
                          : isSel
                            ? 'border-teal-600 bg-teal-50 text-teal-900'
                            : 'border-stone-300 bg-white text-stone-800'
                    }`}
                  >
                    {pair.target}
                  </button>
                );
              })}
            </div>
          </div>

          {matchedIds.length === unit.pairs.length && (
            <>
              <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-xs font-bold text-emerald-900">
                ¡Todos los pares conectados!
              </div>
              <button
                type="button"
                onClick={() => setLessonStep(3)}
                className="w-full rounded-xl bg-gradient-to-b from-[#14b8a6] to-[#0d9488] py-3 text-sm font-extrabold text-white shadow-[0_3px_0_#0f766e]"
              >
                Siguiente: Caso Auditivo →
              </button>
            </>
          )}
        </div>
      )}

      {/* PASO 4: ESCUCHA Y COMPRENDE */}
      {lessonStep === 3 && (
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-extrabold text-stone-900">{unit.listen.title}</h3>
            <p className="text-xs text-stone-600">
              {isMaya ? unit.listen.question_yua : unit.listen.question_es}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => speakText(unit.listen.audio_text, 1.0, unit.speech_lang)}
              className="rounded-xl border border-stone-300 bg-stone-50 py-2.5 text-xs font-extrabold text-stone-800 hover:bg-stone-100"
            >
              🔊 Normal (1.0x)
            </button>
            <button
              type="button"
              onClick={() => speakText(unit.listen.audio_text, 0.75, unit.speech_lang)}
              className="rounded-xl border border-stone-300 bg-stone-50 py-2.5 text-xs font-extrabold text-stone-800 hover:bg-stone-100"
            >
              🐢 Lento (0.75x)
            </button>
          </div>

          <div className="space-y-2">
            {unit.listen.options.map((opt, idx) => (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  setListenChoice(idx);
                  setListenStatus(null);
                }}
                className={`w-full rounded-xl border p-3 text-left text-xs font-bold transition ${
                  listenChoice === idx
                    ? 'border-teal-600 bg-teal-50 text-teal-900'
                    : 'border-stone-300 bg-white text-stone-800 hover:bg-stone-50'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>

          {listenStatus === 'ok' && (
            <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-xs text-emerald-900">
              <strong>¡Correcto!</strong> {unit.listen.ok_msg}
            </div>
          )}
          {listenStatus === 'err' && (
            <div className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs text-rose-900">
              No coincide con el audio (-1 vida). Escúchalo en velocidad lenta (0.75x).
            </div>
          )}

          {listenStatus === 'ok' ? (
            <button
              type="button"
              onClick={() => setLessonStep(4)}
              className="w-full rounded-xl bg-gradient-to-b from-[#14b8a6] to-[#0d9488] py-3 text-sm font-extrabold text-white shadow-[0_3px_0_#0f766e]"
            >
              Ir al Examen Final de Certificación →
            </button>
          ) : (
            <button
              type="button"
              disabled={listenChoice === null}
              onClick={() => {
                if (listenChoice === unit.listen.correct_index) {
                  setListenStatus('ok');
                  registerSuccess(3);
                } else {
                  setListenStatus('err');
                  registerMistake();
                }
              }}
              className="w-full rounded-xl bg-gradient-to-b from-[#14b8a6] to-[#0d9488] py-3 text-sm font-extrabold text-white shadow-[0_3px_0_#0f766e] disabled:opacity-40"
            >
              Validar Respuesta
            </button>
          )}
        </div>
      )}

      {/* PASO 5: EXAMEN FINAL DE CERTIFICACIÓN */}
      {lessonStep === 4 && (
        <div className="space-y-4">
          {submittedResult ? (
            <div className="space-y-3">
              <div
                className={`rounded-xl border p-4 text-sm ${
                  submittedResult.passed
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-950'
                    : 'border-amber-300 bg-amber-50 text-amber-950'
                }`}
              >
                <p className="font-extrabold">
                  ¡{activeCourse.title} completado! Puntaje: {submittedResult.score}/
                  {submittedResult.maxScore}
                </p>
                <p className="mt-1 text-xs">
                  Evento firmado con SHA-256 y guardado en IndexedDB (`sync_queue`).
                </p>
                <p className="mt-1 font-mono text-xs">
                  Hash ({submittedResult.durationSeconds}s): {submittedResult.validationHash}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={resetUnitState}
                  className="rounded-xl border border-teal-700 py-2.5 text-xs font-extrabold text-teal-800 hover:bg-teal-50"
                >
                  ↺ Repetir Unidad
                </button>
                <button
                  type="button"
                  onClick={onCompleted}
                  className="rounded-xl bg-[#0d9488] py-2.5 text-xs font-extrabold text-white hover:bg-[#0f766e]"
                >
                  Ver Pasaporte QR →
                </button>
              </div>
            </div>
          ) : (
            (() => {
              const challenge = unit.exam[examStep];
              return (
                <div className="space-y-3">
                  <div>
                    <h3 className="text-sm font-extrabold text-stone-900">
                      Paso 5 · Examen Final de Certificación
                    </h3>
                    <p className="text-xs text-stone-600">
                      {isMaya ? challenge.label_yua : challenge.label_es}
                    </p>
                  </div>

                  {challenge.type === 'order' ? (
                    <>
                      <div className="flex min-h-14 flex-wrap items-center gap-2 rounded-xl border-2 border-dashed border-teal-300 bg-teal-50/40 p-2.5">
                        {examBuilderSel.length === 0 ? (
                          <span className="text-xs text-stone-500">
                            Toca las fichas en orden...
                          </span>
                        ) : (
                          examBuilderSel.map((tIdx, pos) => (
                            <button
                              key={`${tIdx}-${pos}`}
                              type="button"
                              onClick={() =>
                                setExamBuilderSel((prev) => prev.filter((_, i) => i !== pos))
                              }
                              className="rounded-xl bg-[#0d9488] px-3 py-1.5 text-sm font-extrabold text-white"
                            >
                              {challenge.tiles[tIdx]}
                            </button>
                          ))
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {challenge.tiles.map((tile, tIdx) => {
                          const used = examBuilderSel.includes(tIdx);
                          return (
                            <button
                              key={`${tile}-${tIdx}`}
                              type="button"
                              disabled={used}
                              onClick={() => {
                                setExamBuilderSel((prev) => [...prev, tIdx]);
                                speakText(tile, 1.0, unit.speech_lang);
                              }}
                              className="rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-sm font-extrabold text-stone-800 shadow-[0_3px_0_#cbd5e1] disabled:opacity-30 disabled:shadow-none"
                            >
                              {tile}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <div className="space-y-2">
                      {challenge.options.map((opt, oIdx) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setExamChoiceSel(oIdx)}
                          className={`w-full rounded-xl border p-3 text-left text-xs font-bold transition ${
                            examChoiceSel === oIdx
                              ? 'border-teal-600 bg-teal-50 text-teal-900'
                              : 'border-stone-300 bg-white text-stone-800 hover:bg-stone-50'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={
                      challenge.type === 'order'
                        ? examBuilderSel.length < challenge.expected.length
                        : examChoiceSel === null
                    }
                    onClick={() => void handleSubmitExamStep()}
                    className="w-full rounded-xl bg-gradient-to-b from-[#14b8a6] to-[#0d9488] py-3 text-sm font-extrabold text-white shadow-[0_3px_0_#0f766e] disabled:opacity-40"
                  >
                    {examStep + 1 < unit.exam.length
                      ? 'Siguiente Reto →'
                      : 'Finalizar y Generar Pasaporte QR ✓'}
                  </button>
                </div>
              );
            })()
          )}
        </div>
      )}
    </section>
  );
}
