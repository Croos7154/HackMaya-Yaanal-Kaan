import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, removeCourseAssetsOffline, saveCourseOffline } from '../db/indexedDb';
import type { CoursePackage, OfflineCourseRecord, ProgressRecord } from '../types/domain';

interface CourseCatalogProps {
  isOnline: boolean;
  onOpenCourse: (courseId: string) => void;
}

const API_BASE = import.meta.env.VITE_API_BASE ?? '';
const STORAGE_QUOTA_MB = 50;

export function CourseCatalog({ isOnline, onOpenCourse }: CourseCatalogProps) {
  const downloadedCourses = useLiveQuery(() => db.courses.toArray(), [], [] as OfflineCourseRecord[]);
  const progressList = useLiveQuery(() => db.progress.toArray(), [], [] as ProgressRecord[]);
  const [cloudCourses, setCloudCourses] = useState<CoursePackage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadPct, setDownloadPct] = useState(0);

  useEffect(() => {
    if (!isOnline) return;
    let active = true;
    setLoading(true);
    setError(null);

    fetch(`${API_BASE}/api/v1/courses`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<CoursePackage[]>;
      })
      .then((data) => {
        if (active) setCloudCourses(data);
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err.message : 'No se pudo cargar el catálogo');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isOnline]);

  const downloadedMap = new Map(downloadedCourses.map((c) => [c.id, c]));
  const passedCourseIds = new Set(progressList.filter((p) => p.passed).map((p) => p.courseId));
  const mergedCourses: CoursePackage[] = cloudCourses.length > 0 ? cloudCourses : downloadedCourses;

  const totalUsedKb = downloadedCourses.reduce((acc, c) => acc + c.size_kb, 0);
  const usedMb = (totalUsedKb / 1024).toFixed(2);
  const usagePct = Math.min(100, Math.round((totalUsedKb / (STORAGE_QUOTA_MB * 1024)) * 100));

  const handleDownload = async (course: CoursePackage) => {
    if (downloadingId) return;
    setDownloadingId(course.id);
    setDownloadPct(30);
    try {
      await new Promise((r) => window.setTimeout(r, 120));
      setDownloadPct(70);
      await saveCourseOffline(course);
      setDownloadPct(100);
      await new Promise((r) => window.setTimeout(r, 120));
    } finally {
      setDownloadingId(null);
      setDownloadPct(0);
    }
  };

  const handleReleaseStorage = async (courseId: string) => {
    await removeCourseAssetsOffline(courseId);
  };

  return (
    <section className="space-y-5">
      {/* Banner Catálogo Ligero */}
      <div className="rounded-2xl bg-gradient-to-br from-[#0f766e] via-[#0d9488] to-[#14b8a6] p-6 text-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="inline-block rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold tracking-wider uppercase text-amber-300">
            PWA &lt; 2.5 MB • Catálogo de Micro-Rutas
          </span>
          <span className="text-xs font-semibold text-teal-100">
            0 ms latencia offline
          </span>
        </div>

        <h2 className="mt-3 text-xl font-bold leading-snug">
          Descarga paquetes ligeros para estudiar sin gastar datos
        </h2>
        <p className="mt-1.5 text-sm text-teal-50/90">
          Empaquetado ultra-comprimido (JSON + SVG/WebP + Web Speech ES/EN/YUA) guardado
          directamente en IndexedDB.
        </p>

        <div className="mt-5 rounded-xl bg-black/20 p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-medium text-teal-50">
            <span>Almacenamiento local usado:</span>
            <span className="font-semibold text-amber-300">
              {usedMb} MB de {STORAGE_QUOTA_MB} MB disponibles ({downloadedCourses.length} rutas)
            </span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/15">
            <div
              className="h-full rounded-full bg-amber-400 transition-all duration-300"
              style={{ width: `${Math.max(downloadedCourses.length > 0 ? 4 : 0, usagePct)}%` }}
            />
          </div>
        </div>
      </div>

      {loading && (
        <div className="rounded-xl border border-stone-200 bg-white p-4 text-sm text-stone-600">
          Cargando catálogo ligero desde FastAPI...
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          Sin conexión con el servidor ({error}). Mostrando paquetes guardados en IndexedDB.
        </div>
      )}

      {mergedCourses.length === 0 && !loading ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-8 text-center text-sm text-stone-600">
          Desactiva <strong>Modo Avión</strong> brevemente para descargar las rutas iniciales de{' '}
          <em>Inglés Básico para Turismo</em> y <em>Finanzas para Artesanos</em>.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {mergedCourses.map((course) => {
            const localCopy = downloadedMap.get(course.id);
            const isDownloaded = Boolean(localCopy);
            const hasDeltaUpdate = Boolean(localCopy && localCopy.version !== course.version);
            const isApproved = passedCourseIds.has(course.id);
            const videoCompare = course.video_compare_mb ?? 45;
            const savingsPct = Math.max(
              90,
              Math.round((1 - course.size_kb / (videoCompare * 1024)) * 100)
            );

            return (
              <article
                key={course.id}
                className="flex flex-col justify-between rounded-2xl border border-teal-100 bg-white p-5 shadow-xs transition hover:border-teal-400"
              >
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="rounded-md bg-teal-50 px-2 py-0.5 text-[11px] font-bold text-teal-800">
                        {course.size_kb} KB
                      </span>
                      <span className="rounded-md bg-stone-100 px-2 py-0.5 text-[11px] font-semibold text-stone-700">
                        {course.module_count} micro-módulos
                      </span>
                      <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                        ES / Maayat&apos;aan
                      </span>
                    </div>

                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-extrabold ${
                        isApproved
                          ? 'bg-amber-100 text-amber-900'
                          : hasDeltaUpdate
                            ? 'bg-amber-100 text-amber-900'
                            : isDownloaded
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-sky-100 text-sky-800'
                      }`}
                    >
                      {isApproved
                        ? '✓ Certificado'
                        : hasDeltaUpdate
                          ? `Delta v${course.version}`
                          : isDownloaded
                            ? 'Descargado'
                            : 'En nube'}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-extrabold text-stone-900">{course.title}</h3>
                    <p className="text-xs italic text-teal-700">{course.maya_title}</p>
                  </div>

                  <p className="text-sm leading-relaxed text-stone-600">{course.description}</p>

                  {/* Barra comparativa de ahorro de datos */}
                  <div className="flex items-center justify-between gap-2 rounded-xl border border-teal-100 bg-teal-50/50 px-3 py-2 text-xs">
                    <span className="text-stone-700">
                      ⚡ Ahorro de datos: <strong>{course.size_kb} KB</strong> vs {videoCompare} MB
                      en video
                    </span>
                    <span className="font-extrabold text-teal-700">-{savingsPct}% MB</span>
                  </div>

                  {downloadingId === course.id && (
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-stone-200">
                      <div
                        className="h-full rounded-full bg-teal-600 transition-all duration-150"
                        style={{ width: `${downloadPct}%` }}
                      />
                    </div>
                  )}
                </div>

                <div className="mt-4 space-y-2">
                  {isDownloaded ? (
                    <>
                      <button
                        type="button"
                        onClick={() => onOpenCourse(course.id)}
                        className="w-full rounded-xl bg-gradient-to-b from-amber-400 to-amber-500 px-4 py-2.5 text-sm font-extrabold text-stone-950 shadow-[0_3px_0_#b45309] transition active:translate-y-0.5 active:shadow-none"
                      >
                        ✓ Listo sin internet · Abrir Aula Offline
                      </button>
                      <div className="flex items-center justify-between gap-2 pt-1">
                        {hasDeltaUpdate && isOnline ? (
                          <button
                            type="button"
                            onClick={() => void handleDownload(course)}
                            disabled={downloadingId === course.id}
                            className="text-xs font-bold text-amber-700 hover:underline"
                          >
                            Aplicar Delta Sync (v{course.version})
                          </button>
                        ) : (
                          <span className="text-xs font-medium text-teal-700">
                            v{course.version} • {course.estimated_minutes} min
                          </span>
                        )}
                        {isApproved && (
                          <button
                            type="button"
                            onClick={() => void handleReleaseStorage(course.id)}
                            className="text-xs font-medium text-stone-500 hover:text-rose-700"
                          >
                            Liberar espacio ({course.size_kb} KB)
                          </button>
                        )}
                      </div>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void handleDownload(course)}
                      disabled={downloadingId === course.id || !isOnline}
                      className="w-full rounded-xl bg-gradient-to-b from-[#14b8a6] to-[#0d9488] px-4 py-2.5 text-sm font-extrabold text-white shadow-[0_3px_0_#0f766e] transition hover:from-[#0d9488] hover:to-[#0f766e] active:translate-y-0.5 active:shadow-none disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {downloadingId === course.id
                        ? 'Guardando en IndexedDB...'
                        : `⬇ Descargar Offline (${course.size_kb} KB)`}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
