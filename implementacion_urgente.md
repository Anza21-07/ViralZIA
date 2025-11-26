
# Plan de Implementación Urgente: Viralización y Edición

**Estado:** En Progreso
**Prioridad:** **MÁXIMA**

Este documento detalla las funcionalidades críticas necesarias para cerrar el ciclo de producción de contenido y mejorar la calidad del ensamblaje de video.

---

## 1. Integración de Redes Sociales (El Cierre del Círculo)

-   **Estado:** ✅ **COMPLETADO**

### El Objetivo
No basta con entregar un archivo de video. ViralZIA debe entregar el "paquete completo" listo para publicar, optimizando los metadatos para los algoritmos de búsqueda y recomendación.

### Nuevas Funcionalidades Requeridas

#### A. Generador de Metadatos Virales (SEO & Copywriting)
-   **Estado:** ✅ **COMPLETADO**
Al finalizar un video, la IA genera automáticamente títulos SEO, descripciones con storytelling y hashtags estratégicos. Se ha añadido una nueva pestaña "Viralizar (Redes)" en la Suite Creativa.

#### B. Conexión Directa (OAuth)
-   **Estado:** ✅ **COMPLETADO**
Se ha implementado el flujo OAuth 2.0 real utilizando arquitectura Serverless.
*   **Base de Datos:** Se ha creado la tabla `social_accounts` para almacenar los tokens de acceso y credenciales.
*   **Backend (Edge Functions):** Se ha desplegado la función `exchange-token` para manejar la comunicación segura con las APIs de redes sociales, evitando bloqueos CORS.
*   **Frontend:** Interfaz de usuario para ingreso de credenciales (BYOK) y manejo de redirecciones.

---

## 2. Editor de Video con Línea de Tiempo (Timeline)

-   **Estado:** ✅ **COMPLETADO**

### El Objetivo
Potenciar el **Ensamblador Manual** actual (basado en FFmpeg) para dar al usuario control creativo total sobre el ritmo y la sincronización del video, superando la limitación actual donde todas las imágenes duran lo mismo.

### Enfoque Técnico
Esta solución está diseñada específicamente para el flujo de trabajo manual (Imágenes + Audio + FFmpeg).

### Funcionalidades Implementadas

#### A. Interfaz Visual (UI)
*   ✅ **Visualizador de Onda de Audio (Waveform)**: El usuario ahora puede ver la representación gráfica del audio cargado para identificar picos y silencios.
*   ✅ **Pista de Video/Imágenes:** Un carril horizontal donde se ven las miniaturas de las imágenes.
*   ✅ **Control de Duración Individual**: Cada imagen tiene un input numérico para ajustar su duración exacta en segundos.
*   ✅ **Feedback de Sincronización**: Un indicador visual muestra si la duración total del video coincide con la del audio.

#### B. Motor de Renderizado (FFmpeg)
*   ✅ **Concat Demuxer**: Se actualizó la lógica de FFmpeg para usar un archivo `input.txt` complejo en lugar de una tasa de cuadros constante. Esto permite que cada imagen tenga una duración única y personalizada definida por el usuario.

### Beneficio para el Usuario
Permite crear videos con ritmo profesional ("cortes rápidos" en momentos intensos, "cortes lentos" en momentos emotivos) sin necesitar un software de edición externo.

---

## 3. Gestión de Costos y Acceso: Modelo BYOK (Bring Your Own Key)

-   **Estado:** ✅ **COMPLETADO** (Integrado en Kit de Marca)

### El Objetivo
Facilitar la adopción temprana de la plataforma por parte de equipos o usuarios intensivos sin disparar los costos de operación para el administrador de ViralZIA.

### La Solución: "Trae tu propia clave"
Permitir que cada usuario (o administrador de equipo) configure su propia `API_KEY` de Google Gemini en su perfil.

### Implementación Técnica
1.  **Base de Datos:**
    *   Crear una nueva tabla `user_settings` o agregar columna a `brand_kit` para almacenar la `openai_api_key` (encriptada o protegida).
2.  **Frontend:**
    *   Añadir una sección en "Admin" o "Perfil" para ingresar y validar la clave.
3.  **Lógica de Servicio (Backend/Service):**
    *   Modificar `geminiService.ts` para priorizar la clave del usuario.
    *   Lógica: `const apiKey = userProvidedKey || process.env.API_KEY;`
