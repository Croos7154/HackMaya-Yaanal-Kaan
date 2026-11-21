import { useCallback, useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { QRCodeSVG } from 'qrcode.react';
import { db, updateStudentProfile } from '../db/indexedDb';
import type { ProgressRecord, StudentProfile, VerificationResult } from '../types/domain';

interface TalentPassportProps {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  initialVerifyHash?: string | null;
  onSyncNow: () => void;
}

const API_BASE = import.meta.env.VITE_API_BASE ?? '';

export function TalentPassport({
  isOnline,
  isSyncing,
  pendingCount,
  initialVerifyHash,
  onSyncNow,
}: TalentPassportProps) {
  const profiles = useLiveQuery(() => db.student_profile.toArray(), [], [] as StudentProfile[]);
  const progressList = useLiveQuery(
    () => db.progress.orderBy('completedAt').reverse().toArray(),
    [],
    [] as ProgressRecord[]
  );

  const student = profiles[0];
  const latestProgress = progressList[0] ?? null;
  const passedCourses = new Set(progressList.filter((p) => p.passed).map((p) => p.courseId));
  const progressPct = Math.min(100, Math.round((passedCourses.size / 2) * 100));

  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [communityDraft, setCommunityDraft] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<VerificationResult | null>(null);

  const activeHash = latestProgress?.validationHash ?? 'YK-PENDIENTE-SINCRONIZACION';
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const qrPayload =
    activeHash !== 'YK-PENDIENTE-SINCRONIZACION' && origin
      ? `${origin}/?verify=${encodeURIComponent(activeHash)}`
      : JSON.stringify({
          standard: 'OpenBadges-YK',
          hash: activeHash,
          candidate: student?.fullName ?? 'Carlos Pech',
          community: student?.community ?? 'Felipe Carrillo Puerto, Q. Roo',
          course: latestProgress?.courseTitle ?? 'En Formación',
        });

  const handleOpenEdit = () => {
    setNameDraft(student?.fullName ?? '');
    setCommunityDraft(student?.community ?? '');
    setEditing(true);
  };

  const handleSaveProfile = async () => {
    if (!nameDraft.trim() || !communityDraft.trim()) return;
    await updateStudentProfile({
      fullName: nameDraft.trim(),
      community: communityDraft.trim(),
    });
    setEditing(false);
  };

  const handleVerifyCredential = useCallback(
    async (hashToCheck: string) => {
      if (hashToCheck === 'YK-PENDIENTE-SINCRONIZACION') {
        setVerifyResult({
          verified: false,
          validation_hash: hashToCheck,
        });
        return;
      }

      if (!isOnline) {
        const localMatch = progressList.find((p) => p.validationHash === hashToCheck);
        setVerifyResult({
          verified: Boolean(localMatch),
          validation_hash: hashToCheck,
          candidate_name: student?.fullName,
          community: student?.community,
          course_title: localMatch?.courseTitle,
          badge_name: localMatch?.badgeName,
          score: localMatch?.score,
          max_score: localMatch?.maxScore,
          duration_seconds: localMatch?.durationSeconds,
          completed_at: localMatch?.completedAt,
        });
        return;
      }

      setVerifying(true);
      try {
        const res = await fetch(`${API_BASE}/api/v1/verify/${encodeURIComponent(hashToCheck)}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as VerificationResult;
        setVerifyResult(data);
      } catch {
        setVerifyResult({
          verified: false,
          validation_hash: hashToCheck,
        });
      } finally {
        setVerifying(false);
      }
    },
    [isOnline, progressList, student?.community, student?.fullName]
  );

  useEffect(() => {
    if (initialVerifyHash) {
      void handleVerifyCredential(initialVerifyHash);
    }
  }, [initialVerifyHash, handleVerifyCredential]);

  return (
    <section className="space-y-5">
      {/* Tarjeta principal de Pasaporte de Talento */}
      <div className="passport-card-surface rounded-3xl bg-gradient-to-br from-[#0f766e] via-[#0d9488] to-[#064e3b] p-6 text-white shadow-sm">
        <div className="maya-fretwork mb-4" />
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-widest text-amber-300">
              Pasaporte de Talento Verificable
            </span>
            <h2 className="mt-1 text-2xl font-bold">{student?.fullName ?? 'Cargando...'}</h2>
            <p className="mt-1 text-xs text-emerald-100">
              Comunidad: {student?.community ?? '—'} • Idioma: {student?.primaryLanguage ?? '—'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-amber-200">
              Racha: {student?.streakDays ?? 1} día(s)
            </span>
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white">
              {passedCourses.size > 0 ? 'Certificado' : 'En Formación'}
            </span>
            <button
              type="button"
              onClick={handleOpenEdit}
              className="rounded-lg border border-white/25 px-2.5 py-1 text-xs font-medium text-emerald-50 hover:bg-white/10"
            >
              Editar
            </button>
          </div>
        </div>

        {editing && (
          <div className="mt-4 grid gap-2 rounded-xl bg-black/25 p-3 sm:grid-cols-3">
            <input
              type="text"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              placeholder="Nombre completo"
              className="rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs text-white placeholder:text-emerald-200"
            />
            <input
              type="text"
              value={communityDraft}
              onChange={(e) => setCommunityDraft(e.target.value)}
              placeholder="Comunidad"
              className="rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs text-white placeholder:text-emerald-200"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void handleSaveProfile()}
                className="rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-semibold text-stone-950"
              >
                Guardar
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-lg border border-white/25 px-3 py-1.5 text-xs text-white"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Barra de Avance Curricular Validado */}
        <div className="mt-5 rounded-2xl bg-black/20 p-4">
          <div className="flex items-center justify-between text-xs font-medium">
            <span className="text-emerald-50">Avance Curricular Validado</span>
            <span className="font-bold text-white">{progressPct}%</span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/15">
            <div
              className="h-full rounded-full bg-amber-400 transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-emerald-100/85">
            {passedCourses.size > 0
              ? `Has validado ${passedCourses.size} ruta(s). Estado de red: ${
                  pendingCount > 0
                    ? `Pendiente de red (${pendingCount} en cola)`
                    : 'Sincronizado con PostgreSQL'
                }.`
              : 'Completa una ruta en el Aula Offline y sincronízala para emitir tu insignia verificable.'}
          </p>
        </div>

        {/* Bloque blanco QR + Firma Criptográfica */}
        <div className="mt-5 flex flex-col items-start gap-4 rounded-2xl bg-white p-4 text-stone-900 sm:flex-row sm:items-center">
          <div className="shrink-0 rounded-xl border border-stone-200 bg-white p-2">
            <QRCodeSVG value={qrPayload} size={108} level="M" />
          </div>

          <div className="flex-1 space-y-2.5 w-full">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-teal-800">
                Firma Criptográfica de Integridad
              </span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                  pendingCount > 0
                    ? 'bg-amber-100 text-amber-900'
                    : latestProgress
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-stone-100 text-stone-600'
                }`}
              >
                {pendingCount > 0
                  ? 'Pendiente de red'
                  : latestProgress
                    ? 'Sincronizado con PostgreSQL'
                    : 'Sin evaluaciones'}
              </span>
            </div>

            <div className="rounded-lg bg-stone-100 px-3 py-2 font-mono text-xs text-stone-700 break-all">
              {activeHash}
            </div>

            <div className="flex flex-wrap items-center gap-2 print:hidden">
              <button
                type="button"
                disabled={verifying}
                onClick={() => void handleVerifyCredential(activeHash)}
                className="rounded-xl bg-[#0b4b42] px-4 py-2 text-xs font-semibold text-white hover:bg-[#083831] disabled:opacity-50"
              >
                {verifying ? 'Verificando...' : 'Verificar Credencial'}
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="rounded-xl border border-stone-300 px-3.5 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50"
              >
                Imprimir / PDF
              </button>
              {pendingCount > 0 && (
                <button
                  type="button"
                  disabled={!isOnline || isSyncing}
                  onClick={onSyncNow}
                  className="rounded-xl border border-teal-700 px-3.5 py-2 text-xs font-semibold text-teal-800 hover:bg-teal-50 disabled:opacity-40"
                >
                  {isSyncing ? 'Sincronizando...' : 'Sincronizar Cola Ahora'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {verifyResult && (
        <div
          className={`rounded-2xl border p-4 text-sm ${
            verifyResult.verified
              ? 'border-emerald-300 bg-emerald-50 text-emerald-950'
              : 'border-amber-300 bg-amber-50 text-amber-950'
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-bold">
                {verifyResult.verified
                  ? 'Credencial Verificada (Open Badges / Yáanal Ka’an)'
                  : 'Credencial aún no registrada en el servidor'}
              </p>
              <p className="mt-1 font-mono text-xs">Hash: {verifyResult.validation_hash}</p>
              {verifyResult.verified && (
                <p className="mt-1 text-xs">
                  {verifyResult.candidate_name} ({verifyResult.community}) •{' '}
                  {verifyResult.badge_name} • Puntaje {verifyResult.score}/{verifyResult.max_score}
                  {typeof verifyResult.duration_seconds === 'number'
                    ? ` • Permanencia ${verifyResult.duration_seconds}s`
                    : ''}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setVerifyResult(null)}
              className="text-xs font-semibold underline"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Historial de insignias desbloqueadas */}
      {progressList.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wide text-stone-600">
            Insignias Desbloqueadas ({progressList.length})
          </h3>
          <div className="grid gap-3 md:grid-cols-2">
            {progressList.map((item) => (
              <article
                key={`${item.id}-${item.validationHash}`}
                className="flex items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-xs"
              >
                <div className="space-y-1">
                  <span
                    className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                      item.syncStatus === 'synced'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-900'
                    }`}
                  >
                    {item.syncStatus === 'synced'
                      ? 'Sincronizado con PostgreSQL'
                      : 'Pendiente de red'}
                  </span>
                  <h4 className="text-sm font-bold text-stone-900">{item.badgeName}</h4>
                  <p className="text-xs text-stone-600">
                    {item.courseTitle} • {item.score}/{item.maxScore} ({item.durationSeconds}s)
                  </p>
                  <p className="font-mono text-[11px] text-teal-800">{item.validationHash}</p>
                </div>

                <button
                  type="button"
                  onClick={() => void handleVerifyCredential(item.validationHash)}
                  className="shrink-0 rounded-lg border border-stone-300 px-2.5 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50"
                >
                  Validar
                </button>
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
