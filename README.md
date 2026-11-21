# HackMaya — Yáanal Ka’an (PWA Offline-First y Pasaporte de Talento)

> **Nombre sugerido del repositorio:** `HackMaya-Yaanal-Kaan`  
> Proyecto desarrollado para **Hack Maya (DevFest Cancún 2026)** bajo la línea temática **06. Educación y talento** (aprendizaje, empleabilidad y brecha digital).

## Arquitectura y Stack

- **Frontend (PWA Offline-First):** React 19 + TypeScript + Vite + TailwindCSS + `vite-plugin-pwa` (Workbox con `CacheFirst` para assets estáticos y precacheo completo).
- **Persistencia Local:** `Dexie.js` sobre `IndexedDB` (`courses`, `progress`, `sync_queue`, `student_profile`) con evaluación, firma SHA-256 y lectura en voz alta (`window.speechSynthesis`) operando en **Modo Avión**.
- **Backend API:** Python + FastAPI + Uvicorn + Pydantic + SQLAlchemy 2.
- **Base de Datos:** PostgreSQL 16 (mediante `DATABASE_URL` y `docker-compose.yml`) con fallback automático a SQLite local (`yaanal_kaan.db`).

## Las 4 Vistas Core

1. **1. Rutas (`CourseCatalog.tsx`):** Descarga de paquetes ligeros (*Inglés Básico para Turismo* y *Finanzas para Artesanos*), barra de almacenamiento local, indicador de versión (`Delta Sync`) y liberación de espacio tras aprobar.
2. **2. Aula Offline (`OfflineClassroom.tsx`):** Lección bilingüe, audio nativo en español, cronómetro de permanencia e intentos, evaluación de 3 preguntas con retroalimentación y guardado en `sync_queue`.
3. **3. Pasaporte (`TalentPassport.tsx`):** Perfil editable, racha de estudio, barra de avance curricular, código QR (`OpenBadges-YK`) y botón **Verificar Credencial** contra `GET /api/v1/verify/{validation_hash}`.
4. **4. Portal B2B (`RecruiterPortal.tsx`):** Directorio de talento certificado filtrable por habilidad y comunidad, métricas de tracción (`/api/v1/analytics`) e invitación a entrevista.

## Puesta en Marcha Rápida

### Opción A: Backend con SQLite (cero dependencias externas)
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Opción B: Backend conectado a PostgreSQL (Docker)
```powershell
docker compose up -d postgres
Copy-Item backend\.env.example backend\.env
cd backend
.\.venv\Scripts\uvicorn.exe app.main:app --reload --port 8000
```

### Frontend PWA
```powershell
cd frontend
npm install
npm run dev
```
Para probar el Service Worker en modo producción offline completo:
```powershell
cd frontend
npm run build
npm run preview
```

## Documentación de Entrega
- [Propuesta Técnica](docs/PROPUESTA_TECNICA.md)
- [Guion de Pitch (5 minutos)](docs/PITCH_5_MINUTOS.md)
- [Checklist Final del Pitch](docs/CHECKLIST_PITCH.md)
