# Checklist Final del Pitch y Demo en Vivo — Yáanal Ka’an

## 1. Preparación 10 Minutos Antes de Pasar al Escenario
- [ ] **Backend activo (`:8000`):** Verificar `GET http://127.0.0.1:8000/api/v1/health` devuelve `"status": "ok"` (`postgresql` o `sqlite`).
- [ ] **Frontend listo (`:5173` o `:4173`):** Abrir la app en el navegador con zoom legible (`100%`–`110%`).
- [ ] **Estado limpio de demo:** Si ya probaste el flujo antes, limpia `IndexedDB` en DevTools -> *Application -> Storage -> Clear site data* para que **1. Rutas** arranque con `0.00 MB de 50 MB` y `0 evento(s) en cola`.
- [ ] **Video de respaldo (30s):** Tener guardado localmente un clip corto mostrando el ciclo Offline -> Sync -> Portal B2B por si falla la red o el proyector.

## 2. Secuencia de Demo en Vivo (3 minutos dentro del pitch)
1. **Pestaña 1 (`1. Rutas`):** Señala el peso `< 3 MB por ruta` y descarga *Inglés Básico para Turismo* (`28 KB`).
2. **Activa `✈ Simular Modo Avión`:** Muestra en el encabezado el cambio a `Modo Avión (Offline) • Guardado local activo`.
3. **Pestaña 2 (`2. Aula Offline`):** Pulsa **Escuchar Lección (ES)** brevemente, contesta las 3 preguntas y pulsa **Guardar Evaluación en sync_queue**. Señala el cronómetro (`s`) y el hash `YK-...` generado sin internet.
4. **Pestaña 3 (`3. Pasaporte`):** Muestra el código QR, el estado `Pendiente de red` y `1 evento(s) en cola`.
5. **Desactiva `Modo Avión`:** El listener automático vacía `sync_queue` hacia `POST /api/v1/sync`. Pulsa **Verificar Credencial** para mostrar la validación en tiempo real.
6. **Pestaña 4 (`4. Portal B2B`):** Filtra por *Felipe Carrillo Puerto* o *Inglés Turístico* y muestra a *Carlos Pech* recién certificado junto con las métricas de tracción.

## 3. Respuestas Rápidas para Preguntas del Jurado
- **¿Por qué PWA y no app nativa pesada?** Porque en teléfonos de gama baja sin espacio libre, una PWA de `< 500 KB` se abre desde el navegador o se instala sin pasar por tiendas ni consumir datos en actualizaciones gigantes.
- **¿Cómo evitan fraudes al evaluar sin conexión?** Cada envío registra duración real de permanencia, número de intentos y firma SHA-256 antes de entrar a `sync_queue`, validados al sincronizar en el servidor.
- **¿Cómo es sostenible el proyecto?** Es 100% gratuito para estudiantes y comunidades (B2C); la monetización es B2B mediante suscripción para hoteles, operadoras turísticas y comercios que buscan talento local verificado.
