

# Documento de Planificación: Evolución de ViralZIA

**Versión:** 15.5
**Fecha:** Actualizado

Este documento rastrea el progreso y la hoja de ruta futura de ViralZIA.

---

## ✅ Fases Completadas (Base Sólida)

1.  **Estrategia de Contenido:** Integración de búsqueda de tendencias y análisis de PDFs.
2.  **Suite Creativa 1.0:** Generación básica de imágenes y audio.
3.  **Flujos Integrados:** Conexión entre investigación -> guion -> producción.
4.  **Migración a la Nube (Supabase):** Autenticación, Base de datos PostgreSQL y RLS.
5.  **Video Generativo Real (VEO):** Integración del modelo Google VEO para generar MP4.
6.  **Kit de Marca (Brand Kit):** Persistencia de estilos y claves API (BYOK).
7.  **Integración Social (OAuth):** Edge Functions para conectar TikTok/YouTube.
8.  **Economía Básica:** Sistema de visualización de créditos.
9.  **Growth Hacking (Adquisición):** Landing Page, Solicitudes de Acceso y Admin Panel.
10. **Amplificación de Inteligencia (El Alquimista):** Mejoradores de prompts y búsqueda.
11. **Identidad Visual "Deep Space" (UI Overhaul):** Unificación visual total.
12. **Herramientas de Usabilidad:** Motivación Diaria, Estructuras Virales.
13. **Dominación Estratégica:** Smart Export Pack.
14. **Centro de Rendimiento:** Monitorización del ciclo de vida y métricas.
15. **Expansion Multimodal y Remix:** El Ojo de Horus, Miniaturas y Content Multiplier.
16. **Refinamiento UX (Laboratorio de Guiones):**
    *   Limpieza de interfaz (ocultar opciones redundantes).
    *   **Alquimia Granular:** Botones para mejorar visuales y audio escena por escena.
    *   Layout optimizado en fila para mayor densidad de información.
17. **Estudio de Producción Total:**
    *   **Audio Profesional:** Catálogo de 11 voces, Mezcla de volumen por escena, Descarga Master y Web Audio API.
    *   **Seguridad y Calidad:** Escudo Anti-Shadowban, Termómetro Viral, Modo Cine (Animatic).
    *   **Diseño Gráfico:** Editor de Miniaturas con Canvas (Texto sobre imagen).

---

## 🧪 Laboratorio de Futuro (R&D)

Las siguientes funcionalidades están conceptualizadas y documentadas en **`FUTURE_LAB.md`** pero esperan maduración tecnológica.

*   **🕵️‍♂️ El Espía Viral (Competitor Intelligence):**
    *   *Estado:* Pausado (Limitación técnica de APIs).
    *   *Objetivo:* Análisis profundo de competencia mediante URLs.
    *   *Solución Propuesta:* Implementación futura usando **Gemini Vision** (análisis de capturas de pantalla) o APIs de scraping dedicadas.

---

## 🚀 Fases Futuras (Roadmap Estratégico)

### Fase 18: Sistema de Economía Avanzado (Pasarela de Pago)
**Prioridad: ALTA**
*   **Objetivo:** Monetizar la plataforma.
*   **Tareas:**
    *   Integrar Stripe para la compra de paquetes de créditos.
    *   Automatizar la recarga de créditos en la base de datos.

### Fase 19: Avatares Parlantes (Human Connection)
**Prioridad: MEDIA**
*   **Objetivo:** Permitir la creación de videos tipo "Talking Head".
*   **Tareas:**
    *   Investigar integración con APIs de Lip-Sync.
    *   Permitir subir una foto de "cara" en el Kit de Marca.

### Fase 20: Analíticas de Rendimiento Automatizadas
**Prioridad: BAJA**
*   **Objetivo:** Cerrar el ciclo de feedback automáticamente.
*   **Tareas:**
    *   Consultar las APIs de redes sociales para traer vistas/likes automáticamente (actualmente es manual).

---

## Notas de Arquitectura
*   Se ha eliminado el editor de línea de tiempo manual (FFmpeg) para centrarse puramente en la IA Generativa.
*   Priorizar siempre el modelo BYOK (Bring Your Own Key) para usuarios intensivos de VEO.
