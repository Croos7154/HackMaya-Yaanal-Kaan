import { useEffect, useState } from 'react';
import type { AnalyticsSummary, CandidateOut, VerificationResult } from '../types/domain';

interface RecruiterPortalProps {
  isOnline: boolean;
}

const API_BASE = import.meta.env.VITE_API_BASE ?? '';
const COMMUNITIES = ['', 'Cancún', 'Puerto Morelos', 'Felipe Carrillo Puerto'];
const SKILLS = ['', 'Inglés Turístico', 'Finanzas y Costeo'];

export function RecruiterPortal({ isOnline }: RecruiterPortalProps) {
  const [community, setCommunity] = useState('');
  const [skill, setSkill] = useState('');
  const [candidates, setCandidates] = useState<CandidateOut[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contactTarget, setContactTarget] = useState<CandidateOut | null>(null);
  const [contactSent, setContactSent] = useState(false);

  // Modal de escaneo/verificación QR en Portal B2B
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [hashInput, setHashInput] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<VerificationResult | null>(null);

  useEffect(() => {
    if (!isOnline) return;
    let active = true;
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (community) params.set('community', community);
    if (skill) params.set('skill', skill);

    const query = params.toString();

    Promise.all([
      fetch(`${API_BASE}/api/v1/candidates${query ? `?${query}` : ''}`).then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<CandidateOut[]>;
      }),
      fetch(`${API_BASE}/api/v1/analytics`).then((res) =>
        res.ok ? (res.json() as Promise<AnalyticsSummary>) : null
      ),
    ])
      .then(([candData, analyticsData]) => {
        if (!active) return;
        setCandidates(candData);
        if (analyticsData) setAnalytics(analyticsData);
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err.message : 'Error al consultar candidatos');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [community, skill, isOnline]);

  const handleOpenQrScanner = () => {
    const firstHash = candidates[0]?.certifications[0]?.validation_hash ?? 'YK-77A1-VERIFIED-9821';
    setHashInput(firstHash);
    setVerifyResult(null);
    setQrModalOpen(true);
  };

  const handleCheckHash = async () => {
    const trimmed = hashInput.trim();
    if (!trimmed) return;
    setVerifying(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/verify/${encodeURIComponent(trimmed)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as VerificationResult;
      setVerifyResult(data);
    } catch {
      setVerifyResult({ verified: false, validation_hash: trimmed });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-teal-100 bg-white p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-teal-700">
              Portal Empresas y Turismo • B2B
            </span>
            <h2 className="mt-0.5 text-xl font-extrabold text-stone-900">
              Directorio de Talento Certificado
            </h2>
            <p className="text-sm text-stone-600">
              Filtra candidatos verificados en Quintana Roo o valida un Pasaporte QR al instante.
            </p>
          </div>
          <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-800 border border-teal-200">
            Empresas
          </span>
        </div>

        {/* Métricas rápidas de tracción */}
        {analytics && (
          <div className="grid grid-cols-3 gap-3 rounded-xl bg-stone-50 p-3 border border-stone-200 text-center">
            <div>
              <p className="text-lg font-extrabold text-stone-900">{analytics.total_candidates}</p>
              <p className="text-[11px] text-stone-500">Candidatos activos</p>
            </div>
            <div>
              <p className="text-lg font-extrabold text-teal-800">{analytics.pass_rate_pct}%</p>
              <p className="text-[11px] text-stone-500">Aprobación</p>
            </div>
            <div>
              <p className="text-lg font-extrabold text-stone-900">
                {analytics.avg_duration_seconds}s
              </p>
              <p className="text-[11px] text-stone-500">Tiempo promedio</p>
            </div>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label
              htmlFor="filter-skill"
              className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-stone-500"
            >
              Filtrar por habilidad
            </label>
            <select
              id="filter-skill"
              value={skill}
              onChange={(e) => setSkill(e.target.value)}
              className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-800"
            >
              {SKILLS.map((item) => (
                <option key={item || 'all-skill'} value={item}>
                  {item || 'Todas las habilidades'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="filter-community"
              className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-stone-500"
            >
              Filtrar por ubicación
            </label>
            <select
              id="filter-community"
              value={community}
              onChange={(e) => setCommunity(e.target.value)}
              className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-800"
            >
              {COMMUNITIES.map((item) => (
                <option key={item || 'all-comm'} value={item}>
                  {item || 'Todas las zonas'}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="button"
          disabled={!isOnline}
          onClick={handleOpenQrScanner}
          className="w-full rounded-xl border-2 border-[#0d9488] bg-white py-2.5 text-sm font-extrabold text-[#0f766e] transition hover:bg-teal-50 disabled:opacity-40"
        >
          📷 Verificar Pasaporte QR (Validar Hash SHA-256)
        </button>
      </div>

      {!isOnline && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          El Portal B2B requiere conexión activa para consultar candidatos sincronizados en el
          servidor.
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm text-rose-900">
          No se pudo conectar con FastAPI ({error}).
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-stone-200 bg-white p-6 text-center text-sm text-stone-500">
          Consultando directorio de talento...
        </div>
      ) : candidates.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-6 text-center text-sm text-stone-500">
          No se encontraron candidatos para los filtros seleccionados.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {candidates.map((candidate) => (
            <article
              key={candidate.id}
              className="flex flex-col justify-between gap-3 rounded-2xl border border-teal-100 bg-white p-4 shadow-xs"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-extrabold text-stone-900">{candidate.full_name}</h3>
                    <p className="text-xs text-stone-600">
                      📍 <strong>{candidate.community}</strong> • {candidate.primary_language}
                    </p>
                  </div>
                  {candidate.certifications[0] && (
                    <span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-extrabold text-teal-800 border border-teal-200">
                      {Math.round(
                        (candidate.certifications[0].score /
                          candidate.certifications[0].max_score) *
                          100
                      )}
                      %
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {candidate.certifications.map((cert) => (
                    <span
                      key={cert.validation_hash}
                      className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 border border-emerald-200"
                    >
                      <span>✓ {cert.skill_tag}</span>
                      <span className="font-mono text-[10px] text-stone-500">
                        {cert.validation_hash}
                      </span>
                    </span>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setContactTarget(candidate);
                  setContactSent(false);
                }}
                className="w-full rounded-xl bg-gradient-to-b from-[#14b8a6] to-[#0d9488] px-4 py-2 text-xs font-extrabold text-white shadow-[0_3px_0_#0f766e] hover:from-[#0d9488] hover:to-[#0f766e]"
              >
                Contactar Candidato
              </button>
            </article>
          ))}
        </div>
      )}

      {/* Modal Verificador QR / Hash */}
      {qrModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-extrabold text-stone-900">
                  Verificador de Pasaporte QR
                </h3>
                <p className="text-xs text-stone-500">
                  Consulta en tiempo real `GET /api/v1/verify/&#123;hash&#125;`
                </p>
              </div>
              <button
                type="button"
                onClick={() => setQrModalOpen(false)}
                className="text-xs font-bold text-stone-500 hover:text-stone-900"
              >
                Cerrar
              </button>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={hashInput}
                onChange={(e) => setHashInput(e.target.value)}
                placeholder="Ej. YK-77A1-VERIFIED-9821"
                className="flex-1 rounded-xl border border-stone-300 px-3 py-2 font-mono text-xs text-stone-800"
              />
              <button
                type="button"
                disabled={verifying}
                onClick={() => void handleCheckHash()}
                className="rounded-xl bg-[#0d9488] px-4 py-2 text-xs font-extrabold text-white hover:bg-[#0f766e] disabled:opacity-50"
              >
                {verifying ? '...' : 'Verificar'}
              </button>
            </div>

            {verifyResult && (
              <div
                className={`rounded-xl border p-3 text-xs ${
                  verifyResult.verified
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-950'
                    : 'border-rose-300 bg-rose-50 text-rose-950'
                }`}
              >
                {verifyResult.verified ? (
                  <div className="space-y-1">
                    <p className="font-extrabold">✓ FIRMA CRIPTOGRÁFICA VÁLIDA</p>
                    <p>
                      <strong>Titular:</strong> {verifyResult.candidate_name} (
                      {verifyResult.community})
                    </p>
                    <p>
                      <strong>Insignia:</strong> {verifyResult.badge_name} ({verifyResult.score}/
                      {verifyResult.max_score})
                    </p>
                    <p className="font-mono text-[11px]">{verifyResult.validation_hash}</p>
                  </div>
                ) : (
                  <p className="font-bold">
                    No se encontró una credencial sincronizada para `{verifyResult.validation_hash}`.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Contactar Candidato */}
      {contactTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-extrabold text-stone-900">
                  Invitar a Entrevista — {contactTarget.full_name}
                </h3>
                <p className="text-xs text-stone-500">{contactTarget.community}</p>
              </div>
              <button
                type="button"
                onClick={() => setContactTarget(null)}
                className="text-xs font-bold text-stone-500 hover:text-stone-900"
              >
                Cerrar
              </button>
            </div>

            {contactSent ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                Solicitud enviada directamente a <strong>{contactTarget.full_name}</strong>.
              </div>
            ) : (
              <>
                <p className="text-xs text-stone-600">
                  Certificaciones verificadas:{' '}
                  {contactTarget.certifications.map((c) => c.badge_name).join(', ')}.
                </p>
                <textarea
                  rows={3}
                  defaultValue={`Hola ${contactTarget.full_name}, vimos tu insignia verificada en Yáanal Ka’an y nos gustaría invitarte a una entrevista en ${contactTarget.community}.`}
                  className="w-full rounded-xl border border-stone-300 p-2.5 text-xs text-stone-800"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setContactTarget(null)}
                    className="rounded-xl border border-stone-300 px-3.5 py-2 text-xs font-bold text-stone-700"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => setContactSent(true)}
                    className="rounded-xl bg-[#0d9488] px-4 py-2 text-xs font-extrabold text-white hover:bg-[#0f766e]"
                  >
                    Enviar Invitación B2B
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
