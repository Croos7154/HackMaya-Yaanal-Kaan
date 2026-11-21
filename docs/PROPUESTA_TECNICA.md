# Propuesta Técnica — Yáanal Ka’an

**Proyecto:** Yáanal Ka’an ("Bajo el mismo cielo")  
**Evento:** Hack Maya (DevFest Cancún 2026)  
**Línea Temática:** 06. Educación y talento (aprendizaje, empleabilidad y brecha digital)

---

## 1. Diagnóstico del Problema
En comunidades rurales y semiurbanas de Quintana Roo (como Felipe Carrillo Puerto o Puerto Morelos), la conectividad intermitente, el costo de datos móviles y los teléfonos de gama baja impiden acceder a capacitación laboral continua y acreditar habilidades ante empleadores del corredor turístico.

## 2. Arquitectura Offline-First y Métricas Objetivo (KPIs)

| Componente | Configuración Técnica del MVP | Métricas Objetivo (KPIs) |
| :--- | :--- | :--- |
| **Frontend y Caché** | PWA (`React + TypeScript + Vite + TailwindCSS`) con Workbox (`vite-plugin-pwa`) bajo estrategia `CacheFirst`. | Peso base < 2.5 MB; carga inicial < 1.8 s en redes 3G inestables. |
| **Almacenamiento Local** | `Dexie.js` sobre `IndexedDB` con paquetes ligeros (JSON + SVG/WebP + Web Speech API) y control de espacio disponible. | Consumo < 3 MB por ruta completa; 0 ms de latencia en Modo Avión. |
| **Backend y Sincronización** | `FastAPI` + `SQLAlchemy` (`PostgreSQL` vía `DATABASE_URL` / fallback `SQLite`). Cola local `sync_queue` con reconciliación automática al volver la red. | Reconciliación idempotente en segundo plano sin pérdida de progreso. |
| **Validación y Negocio** | Pasaporte de Talento verificable por QR (`Open Badges`), acceso gratuito B2C y suscripción B2B para reclutadores locales. | 4 pantallas core funcionales para demostración en vivo. |

## 3. Confiabilidad Offline e Integridad Pragmática
1. **Sincronización Diferencial (`Delta Sync`):** Cada paquete incluye su `version`. Al reconectarse, solo se actualizan rutas cuya versión cambió respecto a la copia en `IndexedDB`.
2. **Integridad Pragmática de Evaluaciones:** El Aula Offline mide el tiempo real de permanencia (`duration_seconds`) y número de intentos (`attempts`), generando un `validation_hash` SHA-256 en el cliente antes de encolar el evento en `sync_queue`.
3. **Gestión Inteligente de Almacenamiento:** Barra de espacio usado (`de 50 MB disponibles`) y opción de **liberar paquetes** de rutas ya aprobadas conservando intacto el certificado en `IndexedDB`.
4. **Detección de Cuellos de Botella Pedagógicos y Analítica B2B/B2G:** El endpoint `GET /api/v1/analytics` resume tasa de aprobación, tiempo promedio por evaluación y cobertura por comunidad.

## 4. Modelo de Adopción y Sostenibilidad
- **Despliegue Comunitario (Go-to-Market):** Jornadas de descarga inicial en telebachilleratos, centros comunitarios y comisariados ejidales con Wi-Fi público.
- **Modelo B2B:** Acceso 100% gratuito para estudiantes; suscripción para hoteles, operadoras ecoturísticas y comercios de la Riviera Maya que contratan talento local certificado mediante el Portal B2B y el verificador QR (`GET /api/v1/verify/{validation_hash}`).
