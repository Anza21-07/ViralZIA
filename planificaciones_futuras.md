
# Planificaciones Futuras: Robustez y Escalabilidad

**Estado:** Planificación
**Prioridad:** Media/Alta (Siguientes pasos tras la fase urgente)

Este documento detalla las funcionalidades destinadas a convertir ViralZIA en una plataforma SaaS robusta, segura y colaborativa, protegiendo los recursos de la API y permitiendo el trabajo en equipo.

---

## 1. Sistema de Créditos y Límites (Protección de Recursos)

### El Problema
Actualmente, el uso de las APIs de IA (especialmente VEO e Imagen) es ilimitado para cualquier usuario registrado. Dado que los costos de la API recaen sobre el propietario de la plataforma, esto representa un riesgo financiero y de estabilidad (límites de cuota).

### La Solución Propuesta
Implementar una economía interna de "Tokens" o "Créditos" gestionada a través de Supabase.

*   **Mecánica:**
    *   Asignar una cuota mensual de créditos a cada usuario (ej. 1000 créditos/mes).
    *   **Costos por Acción:**
        *   Generar Guion: 5 créditos.
        *   Generar Imagen (Nano): 1 crédito.
        *   Generar Imagen (Imagen 4.0): 10 créditos.
        *   Generar Video VEO: 100 créditos.
    *   **UI:** Mostrar el saldo restante en el Header de la aplicación.
    *   **Backend:** Validar el saldo antes de ejecutar cualquier `Edge Function` o llamada a la API.

---

## 2. Colaboración Real (Equipos y Organizaciones)

### El Problema
La aplicación funciona actualmente bajo un modelo de "un usuario, un espacio de trabajo". No existe forma de que un estratega, un copywriter y un editor trabajen sobre el mismo proyecto sin compartir credenciales.

### La Solución Propuesta

Evolucionar el modelo de datos para soportar "Organizaciones" o "Teams" con una estrategia de costos flexible.

#### Estructura de Equipos
*   Crear tablas `teams` y `team_members`.
*   Modificar la tabla `sessions` para que pertenezca a un `team_id`.
*   **Roles:** Admin (Gestiona usuarios), Editor (Crea contenido), Viewer (Solo lectura).

---

## 3. Avatares Parlantes (Talking Heads)

### El Problema
Aunque VEO genera videos cinematográficos impresionantes, el contenido más viral en redes sociales suele requerir una "figura humana" hablando a la cámara (UGC - User Generated Content), lo cual genera más confianza y conexión.

### La Solución Propuesta
Integrar una tecnología de sincronización labial (Lip-Sync) o generación de avatares.

*   **Implementación:**
    *   Permitir al usuario subir una foto de un rostro (o elegir un avatar predefinido).
    *   Utilizar el audio generado por nuestra herramienta de Voz en Off.
    *   Animar la boca y expresiones faciales de la imagen para que coincidan con el audio.
*   **Tecnología:** Evaluar APIs como D-ID, HeyGen o futuras actualizaciones de los modelos de Google que permitan "Live Portrait".
