import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { CourseCatalog } from './components/CourseCatalog';
import { OfflineClassroom } from './components/OfflineClassroom';
import { RecruiterPortal } from './components/RecruiterPortal';
import { TalentPassport } from './components/TalentPassport';
import { db, ensureDefaultStudentProfile, resetLocalOfflineStorage } from './db/indexedDb';
import { useOfflineSync } from './hooks/useOfflineSync';

type ActiveTab = 'catalog' | 'classroom' | 'passport' | 'recruiter';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const TABS: Array<{ id: ActiveTab; icon: string; label: string; shortLabel: string }> = [
  { id: 'catalog', icon: '📦', label: '1. Catálogo de Rutas', shortLabel: '1. Rutas' },
  { id: 'classroom', icon: '🎧', label: '2. Aula Offline', shortLabel: '2. Aula' },
  { id: 'passport', icon: '🪪', label: '3. Pasaporte QR', shortLabel: '3. Pasaporte' },
  { id: 'recruiter', icon: '🏨', label: '4. Portal B2B', shortLabel: '4. Portal B2B' },
];

export default function App() {
  const [initialVerifyHash] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return new URLSearchParams(window.location.search).get('verify');
  });
  const [activeTab, setActiveTab] = useState<ActiveTab>(() =>
    initialVerifyHash ? 'passport' : 'catalog'
  );
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [mode2G, setMode2G] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem('yk_mode_2g') === '1';
  });
  const [judgeOpen, setJudgeOpen] = useState(false);

  const {
    isOnline,
    simulatedOffline,
    toggleSimulatedOffline,
    isSyncing,
    pendingCount,
    lastError,
    syncNow,
  } = useOfflineSync();

  const downloadedCourses = useLiveQuery(() => db.courses.toArray(), [], []);
  const syncQueueItems = useLiveQuery(() => db.sync_queue.toArray(), [], []);

  useEffect(() => {
    void ensureDefaultStudentProfile();
  }, []);

  useEffect(() => {
    document.body.classList.toggle('mode-2g', mode2G);
    try {
      window.localStorage.setItem('yk_mode_2g', mode2G ? '1' : '0');
    } catch {
      // ignore storage errors
    }
  }, [mode2G]);

  useEffect(() => {
    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall);
  }, []);

  const handleInstallPwa = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#eff5f3] text-[#0f2922]">
      {/* Cabecera con greca maya y controles de red */}
      <header className="sticky top-0 z-30 bg-gradient-to-br from-[#0f766e] via-[#0d9488] to-[#14b8a6] text-white shadow-md print:hidden">
        <div className="mx-auto max-w-5xl px-4 pt-3 pb-3">
          <div className="maya-fretwork mb-2.5" />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 text-sm font-black text-[#0f2922] shadow-sm">
                YK
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-extrabold tracking-tight text-white">
                    Yáanal Ka&apos;an
                  </h1>
                  <span className="rounded-md bg-white/15 px-1.5 py-0.5 text-[10px] font-bold">
                    PWA
                  </span>
                </div>
                <p className="text-[11px] font-medium text-teal-100">
                  Bajo el mismo cielo · Offline-First
                </p>
              </div>
            </div>

            <span
              className={`rounded-full border px-3 py-1 text-xs font-extrabold ${
                pendingCount > 0
                  ? 'border-amber-200 bg-amber-400 text-[#0f2922]'
                  : 'border-white/30 bg-white/15 text-white'
              }`}
            >
              Cola: {pendingCount}
            </span>
          </div>

          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
            <div
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold ${
                !isOnline
                  ? 'border-amber-400 bg-amber-100 text-amber-900'
                  : 'border-white/30 bg-white/15 text-white'
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  isOnline ? 'bg-emerald-300 shadow-[0_0_6px_#34d399]' : 'bg-amber-500'
                }`}
              />
              <span>
                {!isOnline ? 'Modo Sin Conexión · 0 ms' : 'En Línea · Sync Activo'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {installPrompt && (
                <button
                  type="button"
                  onClick={() => void handleInstallPwa()}
                  className="rounded-full border border-amber-300/70 bg-amber-400/20 px-2.5 py-1 text-[11px] font-bold text-amber-100 hover:bg-amber-400/30"
                >
                  Instalar App
                </button>
              )}
              <button
                type="button"
                onClick={() => setMode2G((prev) => !prev)}
                className={`rounded-full border px-2.5 py-1 text-[11px] font-bold transition ${
                  mode2G
                    ? 'border-stone-900 bg-stone-900 text-white'
                    : 'border-white/35 bg-white/15 text-white hover:bg-white/25'
                }`}
              >
                {mode2G ? '2G/3G: ON' : '2G/3G: OFF'}
              </button>
              <button
                type="button"
                onClick={toggleSimulatedOffline}
                className={`rounded-full border px-3 py-1 text-[11px] font-bold transition ${
                  simulatedOffline
                    ? 'border-amber-200 bg-amber-400 text-[#0f2922]'
                    : 'border-white/35 bg-white/15 text-white hover:bg-white/25'
                }`}
              >
                {simulatedOffline ? '✈ Avión: ON' : '✈ Modo Avión'}
              </button>
            </div>
          </div>

          {/* Navegación Desktop */}
          <nav
            aria-label="Navegación principal"
            className="mt-3 hidden grid-cols-4 gap-2 border-t border-white/20 pt-3 md:grid"
          >
            {TABS.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-extrabold transition ${
                    active
                      ? 'border-white bg-white text-[#0f766e] shadow-sm'
                      : 'border-white/25 bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Banner de reconciliación automática */}
      {isSyncing && (
        <div className="bg-gradient-to-r from-emerald-800 to-emerald-700 px-4 py-2 text-xs font-bold text-white print:hidden">
          <div className="mx-auto max-w-5xl">
            Reconciliando {pendingCount} evento(s) con POST /api/v1/sync...
          </div>
        </div>
      )}

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-5 pb-28 md:pb-8 space-y-4">
        {lastError && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-xs text-amber-900 print:hidden">
            Sincronización diferida ({lastError}). Los datos siguen seguros en `sync_queue`.
          </div>
        )}

        {activeTab === 'catalog' && (
          <CourseCatalog
            isOnline={isOnline}
            onOpenCourse={(courseId) => {
              setSelectedCourseId(courseId);
              setActiveTab('classroom');
            }}
          />
        )}

        {activeTab === 'classroom' && (
          <OfflineClassroom
            selectedCourseId={selectedCourseId}
            onSelectCourse={setSelectedCourseId}
            onGoToCatalog={() => setActiveTab('catalog')}
            onCompleted={() => setActiveTab('passport')}
          />
        )}

        {activeTab === 'passport' && (
          <TalentPassport
            isOnline={isOnline}
            isSyncing={isSyncing}
            pendingCount={pendingCount}
            initialVerifyHash={initialVerifyHash}
            onSyncNow={() => void syncNow()}
          />
        )}

        {activeTab === 'recruiter' && <RecruiterPortal isOnline={isOnline} />}
      </main>

      {/* Inspector Técnico Desplegable (Modo Juez) */}
      <div className="sticky bottom-16 md:bottom-0 z-30 border-t-2 border-amber-500 bg-slate-900 text-slate-200 print:hidden">
        <div className="mx-auto max-w-5xl">
          <button
            type="button"
            onClick={() => setJudgeOpen((prev) => !prev)}
            className="flex w-full items-center justify-between px-4 py-2 text-xs font-bold"
          >
            <span>🛠 Inspector Técnico (IndexedDB · sync_queue)</span>
            <span>{judgeOpen ? '▼ Ocultar JSON' : '▲ Ver JSON'}</span>
          </button>

          {judgeOpen && (
            <div className="max-h-56 overflow-y-auto border-t border-slate-700 px-4 py-3 text-xs">
              <div className="mb-2 flex items-center justify-between">
                <span>
                  Latencia Offline: <strong className="text-emerald-400">0 ms</strong>
                </span>
                <button
                  type="button"
                  onClick={() => void resetLocalOfflineStorage()}
                  className="rounded-lg border border-slate-600 px-2.5 py-1 text-[11px] font-bold text-slate-200 hover:bg-slate-800"
                >
                  Limpiar IDB
                </button>
              </div>
              <pre className="overflow-x-auto rounded-lg bg-slate-950 p-2.5 font-mono text-[11px] text-emerald-400">
                {JSON.stringify(
                  {
                    db: 'yaanal_kaan_offline_db (Dexie / IndexedDB)',
                    offline: !isOnline,
                    mode_2g: mode2G,
                    downloaded_packages: downloadedCourses.map((c) => ({
                      id: c.id,
                      version: c.version,
                      size_kb: c.size_kb,
                    })),
                    sync_queue: syncQueueItems,
                  },
                  null,
                  2
                )}
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* Barra inferior móvil */}
      <nav
        aria-label="Navegación móvil"
        className="fixed bottom-0 left-0 right-0 z-40 grid h-16 grid-cols-4 border-t border-teal-100 bg-white shadow-[0_-2px_10px_rgba(15,41,34,0.06)] md:hidden print:hidden"
      >
        {TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex flex-col items-center justify-center gap-0.5 text-[11px] font-extrabold transition ${
                active ? 'bg-teal-50 text-[#0f766e]' : 'text-stone-500'
              }`}
            >
              {active && (
                <span className="absolute top-0 left-1/4 right-1/4 h-0.5 rounded-b bg-[#0d9488]" />
              )}
              <span>{tab.icon}</span>
              <span>{tab.shortLabel}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
