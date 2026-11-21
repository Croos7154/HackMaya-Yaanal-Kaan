import { useEffect, useState } from 'react';
import type { AnalyticsSummary, CandidateOut } from '../types/domain';

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

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-teal-700">
              Portal Empresas y Turismo • B2B
            </span>
            <h2 className="mt-0.5 text-xl font-bold text-stone-900">
              Directorio de Talento Certificado
            </h2>
            <p className="text-sm text-stone-600">
              Conecta directamente con candidatos locales cuyas habilidades han sido validadas en
              campo.
            </p>
          </div>
          <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800 border border-teal-200">
            Quintana Roo
          </span>
        </div>

        {/* Métricas rápidas de tracción */}
        {analytics && (
          <div className="grid grid-cols-3 gap-3 rounded-xl bg-stone-50 p-3 border border-stone-200 text-center">
            <div>
              <p className="text-lg font-bold text-stone-900">{analytics.total_candidates}</p>
              <p className="text-[11px] text-stone-500">Candidatos activos</p>
            </div>
            <div>
              <p className="text-lg font-bold text-teal-800">{analytics.pass_rate_pct}%</p>
              <p className="text-[11px] text-stone-500">Aprobación</p>
            </div>
            <div>
              <p className="text-lg font-bold text-stone-900">{analytics.avg_duration_seconds}s</p>
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
              className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800"
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
              className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800"
            >
              {COMMUNITIES.map((item) => (
                <option key={item || 'all-comm'} value={item}>
                  {item || 'Todas las ubicaciones'}
                </option>
              ))}
            </select>
          </div>
        </div>
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
        <div className="space-y-3">
          {candidates.map((candidate) => (
            <article
              key={candidate.id}
              className="flex flex-col justify-between gap-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-xs sm:flex-row sm:items-center"
            >
              <div className="space-y-2">
                <div>
                  <h3 className="text-base font-bold text-stone-900">{candidate.full_name}</h3>
                  <p className="text-xs text-stone-600">
                    Comunidad: <strong>{candidate.community}</strong> • Idiomas:{' '}
                    {candidate.primary_language}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {candidate.certifications.map((cert) => (
                    <span
                      key={cert.validation_hash}
                      className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200"
                    >
                      <span>
                        ✓ {cert.skill_tag} ({Math.round((cert.score / cert.max_score) * 100)}%)
                      </span>
                      <span className="font-mono text-[10px] text-stone-500">
                        ID: {cert.validation_hash}
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
                className="shrink-0 rounded-xl bg-[#0b4b42] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#083831]"
              >
                Contactar Candidato
              </button>
            </article>
          ))}
        </div>
      )}

      {contactTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-stone-900">
                  Invitar a Entrevista — {contactTarget.full_name}
                </h3>
                <p className="text-xs text-stone-500">{contactTarget.community}</p>
              </div>
              <button
                type="button"
                onClick={() => setContactTarget(null)}
                className="text-xs font-semibold text-stone-500 hover:text-stone-900"
              >
                Cerrar
              </button>
            </div>

            {contactSent ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                Solicitud registrada para vinculación local con{' '}
                <strong>{contactTarget.full_name}</strong>.
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
                    className="rounded-xl border border-stone-300 px-3.5 py-2 text-xs font-semibold text-stone-700"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => setContactSent(true)}
                    className="rounded-xl bg-[#0b4b42] px-4 py-2 text-xs font-semibold text-white hover:bg-[#083831]"
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
