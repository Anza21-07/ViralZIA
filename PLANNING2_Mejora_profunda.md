# Documento de Planificación: ViralZIA - Mejoras Profundas

**Autor:** Equipo de Desarrollo de IA
**Versión:** 1.2
**Fecha:** 31 de Mayo de 2024

---

## 1. Introducción

Este documento describe la siguiente etapa evolutiva de ViralZIA, enfocada en transformar la aplicación de una herramienta personal de alta potencia a una plataforma de producción de contenido profesional, colaborativa y global. Las siguientes fases están diseñadas para construir sobre la sólida base existente, añadiendo funcionalidades que representan un salto cualitativo en las capacidades de la herramienta.

---

## Fase 1: Integración de Video Generativo Real (VEO)

-   **Objetivo**: Transformar la Suite Creativa de un ensamblador de storyboards a un estudio de producción de video real, permitiendo a los usuarios generar videos MP4 completos a partir de un guion o prompt de texto, utilizando modelos de IA de última generación como VEO.
-   **Funcionalidades Clave**:
    -   **Rediseño de la Suite Creativa**: Se introduce una nueva pestaña principal "✨ Generar Video (IA)" y se renombra la funcionalidad existente a "Ensamblar Storyboard".
    -   **Gestión de Clave API (Crítico)**:
        -   Antes de mostrar la interfaz de VEO, se verificará si el usuario ha seleccionado una clave API con `window.aistudio.hasSelectedApiKey()`.
        -   Si no hay clave, se mostrará un modal (`ApiKeyModal`) que explica la necesidad de una clave con facturación y un botón para llamar a `window.aistudio.openSelectKey()`.
        -   El modal incluirá un enlace a la documentación de facturación de Google AI.
        -   Se manejarán errores específicos de clave inválida para pedir al usuario que seleccione una nueva.
    -   **Flujo de API Asíncrono**:
        -   Se implementará la llamada a `ai.models.generateVideos` para iniciar la tarea de generación.
        -   Se creará un bucle de sondeo (polling) que llamará a `ai.operations.getVideosOperation` cada 10 segundos para verificar el estado de la operación.
    -   **Experiencia de Carga Inmersiva**:
        -   Durante la generación (que puede durar varios minutos), se mostrará una pantalla de carga atractiva en lugar de un simple spinner.
        -   Se mostrará una secuencia de mensajes dinámicos y creativos para mantener al usuario informado y tranquilo (ej: "Despertando a los directores de IA...", "Renderizando los píxeles mágicos...").
    -   **Presentación y Descarga del Resultado**:
        -   Una vez completada la generación, se mostrará el video en un reproductor HTML5.
        -   Se proveerá un botón de "Descargar Video (MP4)" que obtendrá el video haciendo un `fetch` a la URL proporcionada, añadiendo la clave API para la autenticación.
-   **Estado:** ✅ **COMPLETADO**

---

## Fase 2: "Kit de Marca" y Personalización Avanzada

-   **Objetivo**: Permitir a los usuarios definir una identidad de marca persistente (Tono de Voz, Estilo Visual, Público Objetivo) que la IA utilizará como contexto en todas las generaciones, asegurando consistencia y reduciendo la necesidad de repetir instrucciones.
-   **Funcionalidades Clave**:
    -   Crear una nueva sección en la aplicación, posiblemente llamada "Mi Marca" o "Kit de Marca".
    -   Diseñar una interfaz de usuario para que los usuarios puedan definir y guardar:
        -   **Tono de Voz**: Ej. "Divertido y sarcástico", "Profesional y educativo".
        -   **Estilo Visual**: Ej. "Cinematográfico, colores oscuros", "Estilo acuarela, brillante".
        -   **Público Objetivo**: Descripción de su audiencia.
    -   Almacenar esta información de forma persistente en IndexedDB.
    -   Modificar el `geminiService` para que inyecte automáticamente esta información como una `systemInstruction` en las llamadas relevantes (generación de guiones, prompts de imagen, etc.).
-   **Estado:** ✅ **COMPLETADO**

---

## Fase 3: Cuentas de Usuario y Colaboración en Equipo

-   **Objetivo**: Evolucionar ViralZIA de una aplicación del lado del cliente a una plataforma SaaS controlada, utilizando Supabase para la autenticación y el almacenamiento de datos. Se implementará un sistema de acceso "solo por invitación" gestionado por un administrador.
-   **Funcionalidades Clave**:
    -   **Backend y Autenticación (Supabase)**:
        -   Configurar un proyecto en Supabase (plan gratuito).
        -   **Deshabilitar registros públicos** en el panel de Supabase.
        -   Implementar una pantalla de inicio de sesión en la aplicación.
    -   **Gestión de Cuentas (Control de Administrador)**:
        -   Se implementará una **vista de "Administrador"** dentro de la aplicación, accesible solo por el usuario administrador.
        -   Desde esta vista, el administrador podrá **invitar a nuevos usuarios** introduciendo su dirección de correo electrónico, lo que activará el flujo de creación de cuenta de Supabase.
    -   **Migración y Seguridad de Datos**:
        -   Replicar el esquema de datos de IndexedDB en tablas de PostgreSQL en Supabase, añadiendo una columna `user_id`.
        -   Reemplazar las llamadas a `Dexie.js` con el cliente de `@supabase/supabase-js`.
        -   **Activar Row-Level Security (RLS)** para garantizar que cada usuario solo pueda acceder a sus propios datos.
-   **Estado:** ✅ **COMPLETADO**

---

## Fase 4: Internacionalización (i18n) y Expansión Global

-   **Objetivo**: Permitir la generación de contenido en diferentes idiomas (empezando con inglés) mientras la interfaz de usuario se mantiene en español, proporcionando una expansión global gradual.
-   **Funcionalidades Clave**:
    -   **Configuración en Kit de Marca**: Añadir un nuevo campo desplegable "Idioma del Contenido" al Kit de Marca, con opciones iniciales "Español" e "Inglés".
    -   **Inyección de Instrucciones de IA**: Modificar `geminiService.ts` para que, basado en la selección del Kit de Marca, se añada una instrucción de sistema a la IA para generar el contenido en el idioma solicitado (ej: `"All generated text MUST be in English."`).
    -   **Enfoque en Contenido, no en UI**: No se traducirá la interfaz de la aplicación en esta fase. El foco está exclusivamente en la salida de la IA.
-   **Estado:** ✅ **COMPLETADO**