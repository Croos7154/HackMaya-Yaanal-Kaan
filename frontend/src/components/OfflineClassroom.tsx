import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, enqueueLessonEvaluation } from '../db/indexedDb';
import type { OfflineCourseRecord } from '../types/domain';

interface OfflineClassroomProps {
  selectedCourseId: string | null;
  onSelectCourse: (courseId: string) => void;
  onGoToCatalog: () => void;
  onCompleted: () => void;
}

export function OfflineClassroom({
  selectedCourseId,
  onSelectCourse,
  onGoToCatalog,
  onCompleted,
}: OfflineClassroomProps) {
  const downloadedCourses = useLiveQuery(() => db.courses.toArray(), [], [] as OfflineCourseRecord[]);
  const activeCourse =
    downloadedCourses.find((c) => c.id === selectedCourseId) ?? downloadedCourses[0] ?? null;

  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [studySeconds, setStudySeconds] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [submittedResult, setSubmittedResult] = useState<{
    score: number;
    maxScore: number;
    passed: boolean;
    validationHash: string;
    durationSeconds: number;
  } | null>(null);

  useEffect(() => {
    setAnswers({});
    setSubmittedResult(null);
    setStudySeconds(0);
    setAttempts(0);
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [activeCourse?.id]);

  // Cronómetro real de permanencia en el módulo (Integridad pragmática)
  useEffect(() => {
    if (!activeCourse) return;
    const interval = window.setInterval(() => {
      setStudySeconds((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(interval);
  }, [activeCourse?.id]);

  const handleToggleSpeech = () => {
    if (!activeCourse || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(activeCourse.lesson.speech_script);
    utterance.lang = 'es-MX';
    utterance.rate = 0.92;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleSpeakEnglishPhrase = (vocabItem: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const phrase = vocabItem.split('=')[0].trim();
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(phrase);
    utterance.lang = 'en-US';
    utterance.rate = 0.88;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleSubmitQuiz = async () => {
    if (!activeCourse) return;
    let score = 0;
    for (const q of activeCourse.quiz) {
      if (answers[q.id] === q.correct_index) {
        score += 1;
      }
    }
    const nextAttempt = attempts + 1;
    setAttempts(nextAttempt);

    const maxScore = activeCourse.quiz.length;
    const { progress } = await enqueueLessonEvaluation({
      course: activeCourse,
      score,
      maxScore,
      durationSeconds: studySeconds,
      attempts: nextAttempt,
    });

    setSubmittedResult({
      score,
      maxScore,
      passed: progress.passed,
      validationHash: progress.validationHash,
      durationSeconds: studySeconds,
    });
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
          Para probar el Aula Offline (incluso en Modo Avión), primero descarga el paquete ligero
          de <strong>Inglés Básico para Turismo</strong> o <strong>Finanzas para Artesanos</strong>{' '}
          desde la pestaña 1.
        </p>
        <button
          type="button"
          onClick={onGoToCatalog}
          className="mt-5 rounded-xl bg-[#0b4b42] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#083831]"
        >
          Ir al Selector de Rutas
        </button>
      </section>
    );
  }

  const allAnswered = activeCourse.quiz.every((q) => answers[q.id] !== undefined);

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-stone-900">Aula Interactiva Offline</h2>
          <p className="text-xs text-stone-600">
            0 ms de latencia sin señal • Permanencia registrada: <strong>{studySeconds}s</strong>
          </p>
        </div>

        {downloadedCourses.length > 1 && (
          <select
            aria-label="Cambiar curso descargado"
            value={activeCourse.id}
            onChange={(e) => onSelectCourse(e.target.value)}
            className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-800"
          >
            {downloadedCourses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        )}
      </div>

      <article className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wide text-teal-700">
              {activeCourse.lesson.maya_subtitle ?? activeCourse.maya_title}
            </span>
            <h3 className="mt-0.5 text-base font-bold text-stone-900">
              {activeCourse.lesson.title}
            </h3>
          </div>
          <button
            type="button"
            onClick={handleToggleSpeech}
            className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
              isSpeaking
                ? 'bg-stone-900 text-white hover:bg-stone-800'
                : 'bg-amber-400 text-stone-950 hover:bg-amber-300'
            }`}
          >
            {isSpeaking ? 'Detener Lectura' : 'Escuchar Lección (ES)'}
          </button>
        </div>

        <p className="text-sm leading-relaxed text-stone-700">{activeCourse.lesson.body_text}</p>

        <div className="rounded-xl border border-stone-200 bg-stone-50 p-3.5">
          <p className="mb-2 text-xs font-semibold text-stone-700">Vocabulario Clave</p>
          <ul className="grid gap-1.5 text-xs text-stone-700 sm:grid-cols-2">
            {activeCourse.lesson.key_vocabulary.map((item) => (
              <li
                key={item}
                className="flex items-center justify-between gap-2 rounded-lg border border-stone-200 bg-white px-2.5 py-1.5"
              >
                <span>{item}</span>
                {activeCourse.id.includes('ingles') && (
                  <button
                    type="button"
                    onClick={() => handleSpeakEnglishPhrase(item)}
                    className="shrink-0 rounded-md bg-teal-50 px-2 py-0.5 text-[11px] font-semibold text-teal-800 hover:bg-teal-100"
                    title="Escuchar pronunciación en inglés"
                  >
                    EN
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      </article>

      <article className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-stone-900">Evaluación Rápida (3 preguntas)</h3>
          <span className="text-xs text-stone-500">Intento #{attempts + 1}</span>
        </div>

        <div className="space-y-4">
          {activeCourse.quiz.map((question, idx) => {
            const selectedOpt = answers[question.id];
            return (
              <fieldset
                key={question.id}
                className="space-y-2 rounded-xl border border-stone-200 p-3.5"
              >
                <legend className="px-1 text-sm font-semibold text-stone-800">
                  {idx + 1}. {question.prompt}
                </legend>
                <div className="space-y-1.5">
                  {question.options.map((option, optIdx) => (
                    <label
                      key={option}
                      className={`flex cursor-pointer items-center gap-2.5 rounded-lg border p-2.5 text-sm transition ${
                        selectedOpt === optIdx
                          ? 'border-teal-600 bg-teal-50/70'
                          : 'border-transparent hover:bg-stone-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name={question.id}
                        checked={selectedOpt === optIdx}
                        onChange={() =>
                          setAnswers((prev) => ({ ...prev, [question.id]: optIdx }))
                        }
                        className="accent-teal-700"
                      />
                      <span className="text-stone-700">{option}</span>
                    </label>
                  ))}
                </div>
                {submittedResult && (
                  <p
                    className={`rounded-lg px-3 py-1.5 text-xs ${
                      selectedOpt === question.correct_index
                        ? 'bg-emerald-50 text-emerald-900'
                        : 'bg-amber-50 text-amber-900'
                    }`}
                  >
                    <strong>
                      {selectedOpt === question.correct_index ? '✓ Correcto:' : '✗ Revisar:'}
                    </strong>{' '}
                    {question.explanation}
                  </p>
                )}
              </fieldset>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={!allAnswered}
            onClick={() => void handleSubmitQuiz()}
            className="rounded-xl bg-[#0b4b42] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#083831] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Guardar Evaluación en sync_queue
          </button>

          {submittedResult && (
            <button
              type="button"
              onClick={onCompleted}
              className="rounded-xl border border-[#0b4b42] px-4 py-2.5 text-sm font-semibold text-[#0b4b42] hover:bg-emerald-50"
            >
              Ver en Pasaporte QR
            </button>
          )}
        </div>

        {submittedResult && (
          <div
            className={`rounded-xl border p-4 text-sm ${
              submittedResult.passed
                ? 'border-emerald-300 bg-emerald-50 text-emerald-950'
                : 'border-amber-300 bg-amber-50 text-amber-950'
            }`}
          >
            <p className="font-bold">
              Resultado: {submittedResult.score}/{submittedResult.maxScore}{' '}
              {submittedResult.passed ? '— Insignia desbloqueada' : '— Intenta de nuevo'}
            </p>
            <p className="mt-1 font-mono text-xs">
              Hash SHA-256 ({submittedResult.durationSeconds}s): {submittedResult.validationHash}
            </p>
          </div>
        )}
      </article>
    </section>
  );
}
