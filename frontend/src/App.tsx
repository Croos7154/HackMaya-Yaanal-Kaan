import { useEffect, useState } from 'react';
import { CourseCatalog } from './components/CourseCatalog';
import { OfflineClassroom } from './components/OfflineClassroom';
import { RecruiterPortal } from './components/RecruiterPortal';
import { TalentPassport } from './components/TalentPassport';
import { ensureDefaultStudentProfile } from './db/indexedDb';
import { useOfflineSync } from './hooks/useOfflineSync';

type ActiveTab = 'catalog' | 'classroom' | 'passport' | 'recruiter';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const TABS: Array<{ id: ActiveTab; label: string }> = [
  { id: 'catalog', label: '1. Rutas' },
  { id: 'classroom', label: '2. Aula Offline' },
  { id: 'passport', label: '3. Pasaporte' },
  { id: 'recruiter', label: '4. Portal B2B' },
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
  const {
    isOnline,
    simulatedOffline,
    toggleSimulatedOffline,
    isSyncing,
    pendingCount,
    lastError,
    syncNow,
  } = useOfflineSync();

  useEffect(() => {
    void ensureDefaultStudentProfile();
  }, []);

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
    <div className="min-h-screen flex flex-col bg-stone-100 text-stone-900">
      {/* Header estilo prototipo Yáanal Ka'an */}
      <header className="bg-[#053b34] text-white shadow-sm print:hidden">
        <div className="mx-auto max-w-5xl px-4 pt-3.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/95 shadow-xs">
                <img src="/icon.svg" alt="Yáanal Ka’an" className="h-7 w-7 rounded-md" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-bold leading-tight text-white">Yáanal Ka’an</h1>
                  <span className="rounded-md bg-white/15 px-1.5 py-0.5 text-[10px] font-bold tracking-wider">
                    PWA
                  </span>
                </div>
                <p className="text-xs text-emerald-200">Bajo el mismo cielo • Offline-First</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {installPrompt && (
                <button
                  type="button"
                  onClick={() => void handleInstallPwa()}
                  className="rounded-xl border border-amber-300/60 bg-amber-400/15 px-3 py-1.5 text-xs font-semibold text-amber-200 hover:bg-amber-400/25"
                >
                  Instalar App
                </button>
              )}
              <button
                type="button"
                onClick={toggleSimulatedOffline}
                className={`rounded-xl border px-3.5 py-1.5 text-xs font-semibold transition ${
                  simulatedOffline
                    ? 'border-amber-300 bg-amber-400 text-stone-950 hover:bg-amber-300'
                    : 'border-emerald-700 bg-emerald-900/70 text-emerald-50 hover:bg-emerald-800'
                }`}
              >
                {simulatedOffline ? '✈ Modo Avión Activo (Desactivar)' : '✈ Simular Modo Avión'}
              </button>
            </div>
          </div>

          {/* Barra de estado de sincronización y cola */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-2.5 text-xs">
            <div className="flex items-center gap-2">
              <span
                className={`h-2 w-2 rounded-full ${
                  isOnline ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              />
              <span className="font-medium text-emerald-50">
                {!isOnline
                  ? 'Modo Avión (Offline) • Guardado local activo'
                  : isSyncing
                    ? 'Sincronizando con PostgreSQL...'
                    : pendingCount > 0
                      ? 'En Línea • Sincronización pendiente'
                      : 'En Línea • Sincronizado'}
              </span>
            </div>

            <span className="rounded-full bg-black/25 px-3 py-0.5 text-[11px] font-semibold text-amber-200">
              {pendingCount} evento(s) en cola
            </span>
          </div>

          {/* Navegación principal 4 vistas */}
          <nav className="mt-2.5 flex gap-1 overflow-x-auto">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 min-w-max border-b-2 px-3 py-2.5 text-xs font-semibold transition ${
                    isActive
                      ? 'border-amber-400 bg-white/10 text-white'
                      : 'border-transparent text-emerald-100/80 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 space-y-4">
        {lastError && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-xs text-amber-900">
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

      <footer className="border-t border-stone-200 bg-white py-3 text-center text-xs text-stone-500 print:hidden">
        Yáanal Ka’an • Arquitectura PWA Offline-First · Hack Maya (DevFest Cancún 2026)
      </footer>
    </div>
  );
}
