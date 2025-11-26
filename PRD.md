

# Documento de Requisitos de Producto (PRD): ViralZIA

**Autor:** Equipo de Desarrollo de IA
**Versión:** 16.0 (The Complete Studio Update)
**Fecha:** Actualizado

---

## 1. Introducción

### 1.1. Problema
La creación de contenido viral requiere múltiples herramientas desconectadas: ChatGPT para guiones, Midjourney para imágenes, ElevenLabs para voz y herramientas de terceros para publicar. Además, los creadores a menudo pierden el rastro de qué videos funcionaron y por qué, careciendo de un sistema centralizado para medir el éxito.

### 1.2. Solución
**ViralZIA** es una plataforma SaaS de producción de video generativo "End-to-End". Centraliza todo el ciclo de vida, desde la ideación hasta el análisis de rendimiento post-publicación, integrando IA de vanguardia en cada paso.

### 1.3. Público Objetivo
-   **Creadores de Contenido y YouTubers:** Para automatizar la ideación y creación de activos.
-   **Agencias de Marketing:** Para gestionar múltiples marcas y producir conceptos visuales rápidos.
-   **Emprendedores:** Para crear anuncios de video basados en IA sin conocimientos técnicos.

---

## 2. Arquitectura del Sistema

### 2.1. Core (Nube y Seguridad)
-   **Backend:** Supabase (PostgreSQL, Auth, Edge Functions).
-   **Seguridad:** Row Level Security (RLS) garantiza que los datos estén aislados por usuario.
-   **Adquisición:** 
    -   **Landing Page de Alta Conversión:** Portada pública con diseño moderno (Glassmorphism) para captar leads.
    -   **Sistema de Solicitudes:** Flujo de "Lista de Espera" donde los usuarios solicitan acceso.
    -   **Educación BYOK:** El modal de solicitud incluye instrucciones claras y enlaces para que el usuario obtenga su **Google API Key** (vía Google AI Studio) antes de recibir la invitación.

### 2.2. Motor de IA
-   **Cerebro:** Gemini 2.5 Pro (Razonamiento, Guiones, Chat Mentor).
-   **Video Generativo:** Google VEO (Texto a Video MP4). Requiere API Key del usuario.
-   **Imágenes:** Imagen 4.0 (Alta Calidad) y Gemini Flash Image (Rápido/Nano).
-   **Audio:** Gemini TTS (Voces neuronales).

---

## 3. Funcionalidades Principales

### 3.1. Interfaz de Usuario (UI)
-   **Tema "Deep Space":** Fondo `Slate-950` con orbes de luz ambiental.
-   **Glassmorphism:** Paneles translúcidos para una sensación de profundidad moderna.
-   **Coherencia:** La aplicación interna comparte el 100% del ADN visual con la Landing Page de marketing.
-   **Motivación Diaria:** Componente modal que aparece al primer inicio de sesión del día, ofreciendo frases estratégicas y motivacionales para impulsar la creación.

### 3.2. Gestión y Estrategia
-   **Mis Análisis (Cloud Dashboard):** Repositorio centralizado de todos los proyectos.
-   **Radar de Tendencias:** 
    -   Análisis de URLs, PDFs y búsquedas.
    -   **El Estratega (Alquimista):** Convierte búsquedas simples (ej: "zapatos") en consultas de investigación de mercado complejas.
-   **Kit de Marca:** 
    -   Persistencia del Tono de Voz y Estilo Visual.
    -   **Gestión de API Key:** Campo seguro para ingresar la clave de Google AI Studio, habilitando el uso de VEO en toda la app.

### 3.3. Producción Creativa
-   **Laboratorio de Guiones:** 
    -   Editor colaborativo con IA.
    -   **Biblioteca de Estructuras Virales:** Plantillas predefinidas (Cazador de Mitos, Paso a Paso, etc.) para evitar la "página en blanco".
    -   **El Director Creativo (Alquimista):** Transforma ideas vagas en briefs de dirección detallados antes de generar el guion.
    -   **Smart Export Pack:** Empaqueta scripts, audios y referencias visuales en un ZIP estructurado para edición rápida.
    -   **Sala de Ensayo:** Audición instantánea de escenas con botón Play y amplificación de volumen.
    -   **Mezcladora de Audio:** Control de volumen independiente por escena y descarga de audio maestro unificado (.wav).
    -   **Cronómetro del Director:** Estimación de tiempo en tiempo real (150 wpm) con alertas de límite viral (60s).
    -   **Escudo Anti-Shadowban:** Detector de palabras peligrosas y sugerencia de sinónimos seguros.
    -   **Modo Cine:** Reproductor Animatic para visualizar el flujo completo del guion.
-   **Mentor IA:** Chatbot contextual que "lee" los guiones activos y ofrece consultoría creativa.
-   **Suite Creativa:**
    -   **VEO:** Creación de clips de video cinematográficos.
    -   **Chips de Estilo:** Botones de acceso rápido (Cyberpunk, Cinematic, etc.) para inyectar estilos visuales instantáneamente.
    -   **TTS:** Generación de locuciones.
    -   **Imágenes:** Creación de storyboards consistentes.
    -   **Miniaturas (Estudio de Titulares):** Generador de imágenes de alto CTR con editor gráfico integrado para añadir texto y emojis.

### 3.4. Distribución y Análisis
-   **Viralizador:** Generación automática de metadatos (Títulos, Hashtags, Descripciones).
-   **Conexión OAuth:** Integración real con TikTok, YouTube e Instagram.
-   **Centro de Rendimiento:**
    -   **Workflow Visual:** Seguimiento del estado del proyecto (Idea -> Publicado).
    -   **Bitácora de Métricas:** Registro manual de vistas, likes y engagement.
    -   **Exportación Híbrida:** Generación de CSV para análisis profundo en Excel/Google Sheets.

---

## 4. Requisitos Técnicos

-   **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Zustand.
-   **Backend:** Supabase (Tablas: `sessions`, `brand_kit`, `access_requests`, `social_accounts`, `project_metrics`).
-   **Inteligencia Artificial:** SDK `@google/genai`.
-   **Despliegue:** Vercel (Frontend) + Supabase CLI (Edge Functions).
