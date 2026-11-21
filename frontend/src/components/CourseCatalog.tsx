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
    setDownloadingId(course.id);
    try {
      await saveCourseOffline(course);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleReleaseStorage = async (courseId: string) => {
    await removeCourseAssetsOffline(courseId);
  };

  return (
    <section className="space-y-5">
      {/* Banner Catálogo Ligero con indicador de almacenamiento */}
      <div className="rounded-2xl bg-gradient-to-br from-[#064e44] via-[#0c5d51] to-[#117163] p-6 text-white shadow-sm">
        <span className="inline-block rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold tracking-wider uppercase text-amber-300">
          Catálogo Ligero • &lt; 3 MB por ruta
        </span>
        <h2 className="mt-3 text-xl font-bold leading-snug">
          Descarga rutas para estudiar sin internet
        </h2>
        <p className="mt-1.5 text-sm text-emerald-100/90">
          Empaquetado ultra-comprimido (JSON + WebP + Opus / Web Speech) guardado directamente en
          tu dispositivo mediante IndexedDB.
        </p>

        <div className="mt-5 rounded-xl bg-black/20 p-3.5">
          <div className="flex items-center justify-between text-xs font-medium text-emerald-50">
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
          Sin conexión con el servidor ({error}). Mostrando únicamente paquetes descargados en IndexedDB.
        </div>
      )}

      {mergedCourses.length === 0 && !loading ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-8 text-center text-sm text-stone-600">
          Conéctate brevemente (desactiva <strong>Modo Avión</strong>) para descargar las rutas
          iniciales de <em>Inglés Básico para Turismo</em> y <em>Finanzas para Artesanos</em>.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {mergedCourses.map((course) => {
            const localCopy = downloadedMap.get(course.id);
            const isDownloaded = Boolean(localCopy);
            const hasDeltaUpdate = Boolean(localCopy && localCopy.version !== course.version);
            const isApproved = passedCourseIds.has(course.id);

            return (
              <article
                key={course.id}
                className="flex flex-col justify-between rounded-2xl border border-stone-200 bg-white p-5 shadow-xs transition hover:border-teal-300"
              >
                <div className="space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                        Peso: {course.size_kb} KB
                      </span>
                      <span className="rounded-md bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-700">
                        {course.module_count} micro-módulos
                      </span>
                      <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                        Español / Maya
                      </span>
                    </div>

                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                        hasDeltaUpdate
                          ? 'bg-amber-100 text-amber-900'
                          : isDownloaded
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-sky-100 text-sky-800'
                      }`}
                    >
                      {hasDeltaUpdate
                        ? `Delta v${course.version}`
                        : isDownloaded
                          ? 'Descargado'
                          : 'En nube'}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-stone-900">{course.title}</h3>
                    <p className="text-xs italic text-teal-700">{course.maya_title}</p>
                  </div>

                  <p className="text-sm leading-relaxed text-stone-600">{course.description}</p>
                  <p className="text-xs text-stone-400">
                    Versión {course.version} • {course.estimated_minutes} min • Nivel {course.level}
                  </p>
                </div>

                <div className="mt-5 space-y-2">
                  {isDownloaded ? (
                    <>
                      <button
                        type="button"
                        onClick={() => onOpenCourse(course.id)}
                        className="w-full rounded-xl bg-[#0b4b42] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#083831]"
                      >
                        Abrir en Aula Offline
                      </button>
                      <div className="flex items-center justify-between gap-2">
                        {hasDeltaUpdate && isOnline ? (
                          <button
                            type="button"
                            onClick={() => void handleDownload(course)}
                            disabled={downloadingId === course.id}
                            className="text-xs font-semibold text-amber-700 hover:underline"
                          >
                            Aplicar Delta Sync (v{course.version})
                          </button>
                        ) : (
                          <span className="text-xs text-emerald-700 font-medium">
                            Disponible sin conexión
                          </span>
                        )}
                        {isApproved && (
                          <button
                            type="button"
                            onClick={() => void handleReleaseStorage(course.id)}
                            className="text-xs font-medium text-stone-500 hover:text-rose-700"
                            title="Libera el paquete de lecciones conservando tu certificado"
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
                      className="w-full rounded-xl bg-[#0b4b42] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#083831] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {downloadingId === course.id
                        ? 'Guardando en IndexedDB...'
                        : `Descargar para uso offline (${course.size_kb} KB)`}
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
