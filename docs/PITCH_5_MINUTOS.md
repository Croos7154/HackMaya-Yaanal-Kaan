# Guion de Pitch (5 Minutos) — Yáanal Ka’an

## Protocolo Previo a la Demostración
- [ ] Verificar precarga de los 2 cursos en FastAPI y build PWA (`< 500 KB`).
- [ ] Tener abierto `localhost:5173` (o `npm run preview`) en **1. Rutas**.
- [ ] Contar con un **video de respaldo de 30 segundos** mostrando el flujo en Modo Avión por si falla la proyección en vivo.

---

## 0:00 – 0:45 | El Problema Real y Propuesta de Valor
- **Escenario:** Un joven en Felipe Carrillo Puerto o una artesana en Puerto Morelos tiene el talento, pero sin internet estable ni credenciales verificables pierde empleo mejor pagado en el corredor turístico.
- **Solución:** **Yáanal Ka’an** ("Bajo el mismo cielo" en maya), una PWA bilingüe (Español/Maya) que funciona **100% en Modo Avión** y convierte cada lección completada en un **Pasaporte de Talento con QR verificable**.

## 0:45 – 2:30 | Demo en Vivo: Ciclo Offline-First
1. **1. Rutas:** Mostramos el indicador de almacenamiento (`< 3 MB por ruta`) y descargamos *Inglés Básico para Turismo* (`28 KB`) directo a `IndexedDB`.
2. **Activamos `✈ Simular Modo Avión`:** La barra superior cambia a `Modo Avión (Offline) • Guardado local activo`.
3. **2. Aula Offline:** Abrimos la lección, activamos la lectura en voz alta (`Web Speech API`), observamos el cronómetro de permanencia y respondemos las 3 preguntas.
4. **Cola local:** Guardamos la evaluación en `sync_queue` (`1 evento(s) en cola`) con su firma SHA-256.

## 2:30 – 3:45 | Reconexión Automática, Pasaporte QR y Portal B2B
1. **3. Pasaporte:** Mostramos la tarjeta de *Carlos Pech*, su barra de avance curricular, el código QR (`Open Badges`) y el estado `Pendiente de red`.
2. **Desactivamos `Modo Avión`:** El listener automático vacía `sync_queue` hacia `POST /api/v1/sync` en FastAPI; el estado cambia a `Sincronizado con PostgreSQL` y verificamos el hash con **Verificar Credencial**.
3. **4. Portal B2B:** Filtramos por comunidad y habilidad para mostrar las métricas de tracción y al candidato listo para entrevista.

## 3:45 – 5:00 | Modelo de Negocio e Impacto
- **Gratuito para estudiantes (B2C)** con despliegue en telebachilleratos y centros comunitarios.
- **Monetización B2B:** Suscripción para empresas turísticas y comercios de Quintana Roo que reducen rotación contratando talento local certificado.
