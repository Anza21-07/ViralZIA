
# 🔬 ViralZIA Future Lab: Proyectos de Investigación y Desarrollo (R&D)

**Estado:** Documento de Preservación de Conceptos
**Última Actualización:** Proyecto "Espía Viral" (Competitor Intelligence)

Este documento sirve como repositorio para funcionalidades de alto impacto que han sido conceptualizadas y prototipadas, pero que requieren maduración tecnológica o infraestructura externa avanzada antes de ser integradas en la versión de producción de ViralZIA.

---

## 🕵️‍♂️ Proyecto: El Espía Viral (Competitor Spy)

### 1. La Visión (Concepto Funcional)
El objetivo del "Espía Viral" es permitir a un usuario realizar ingeniería inversa de la estrategia de cualquier competidor simplemente proporcionando un enlace a su perfil o video.

**La Promesa al Usuario:**
> "Pega un link de TikTok de tu competencia. En 10 segundos, te diré qué 'Hooks' usan, qué emociones explotan, cuáles son sus temas pilares y, lo más importante, cómo crear un video mejor que el suyo para robarles la audiencia."

### 2. El Desafío Actual (Por qué está en el Laboratorio)

Durante la fase de pruebas Beta, identificamos un obstáculo crítico conocido como **"Alucinación de Identidad"**.

#### El Problema (Explicación No Técnica)
Imagina que le pides a un detective (la IA) que investigue una casa (el perfil de TikTok), pero el detective tiene prohibido entrar en la casa. Solo puede mirar el buzón (el nombre de usuario).
*   Si el buzón dice "Panadería Juan", el detective acierta: "Venden pan".
*   Si el buzón dice "El Universo de Google" (un canal de vlogs de empleados), el detective se confunde y piensa que es el buscador oficial, dándote un reporte sobre algoritmos de búsqueda en lugar de vlogs.

**Resultado:** La herramienta funciona increíblemente bien con marcas obvias, pero falla catastróficamente con nombres creativos o abstractos, generando desconfianza en el usuario.

#### El Obstáculo Técnico (Explicación Técnica)
Actualmente, usamos **Google Search Grounding** a través de Gemini.
1.  **Limitación de Indexación:** Google Search indexa la *web*, pero las plataformas como TikTok e Instagram son "Jardines Cerrados" (Walled Gardens). Su contenido dinámico (videos, descripciones, comentarios en tiempo real) no es completamente visible para el crawler de Google.
2.  **Falta de Contexto Visual:** Al pasar solo una URL, Gemini no "ve" el video. Intenta inferir el contenido basándose en los resultados de búsqueda de texto del nombre de usuario.
3.  **Bloqueos de Scraping:** Intentar leer el HTML de TikTok directamente desde el servidor devuelve desafíos de seguridad (Captchas), impidiendo que una IA simple lea la descripción del perfil.

---

## 3. Hoja de Ruta para la Implementación Futura

Para reactivar el "Espía Viral" con un 100% de precisión, debemos implementar una de las siguientes arquitecturas avanzadas:

### A. La Solución "Ojos Reales" (Multimodalidad) - **Recomendada**
En lugar de pedir solo un enlace, pedimos al usuario una **Captura de Pantalla** o el **Archivo de Video**.
*   **Flujo:** El usuario sube un screenshot del perfil de TikTok del competidor.
*   **Tecnología:** Usamos **Gemini 2.5 Pro Vision**.
*   **Ventaja:** La IA *ve* literalmente las miniaturas, lee la biografía de la imagen y analiza la estética visual. No hay alucinaciones porque la prueba es visual, no inferida por nombre.

### B. La Solución de Fuerza Bruta (APIs de Terceros)
Utilizar servicios de scraping dedicados que "simulan" ser un navegador real.
*   **Servicios:** Apify (TikTok Scraper), RapidAPI.
*   **Flujo:** `App -> Apify API -> JSON con datos reales (vistas, likes, descripción) -> Gemini Analysis`.
*   **Costo:** Requiere suscripciones mensuales a servicios externos ($49/mes aprox), lo que eleva el costo operativo de ViralZIA.

### C. La Solución Oficial (Research APIs)
Solicitar acceso oficial a la **TikTok Research API** o **YouTube Data API**.
*   **Ventaja:** Datos 100% reales y legales.
*   **Desventaja:** Procesos de aprobación muy estrictos y complejos para aplicaciones SaaS pequeñas.

---

## 4. Lógica de "Inferencia Forense" (A Preservar)

*Esta es la lógica de prompt que diseñamos. Aunque falló por falta de datos, el razonamiento deductivo es válido y debe reutilizarse cuando tengamos acceso a los datos reales (Vía Solución A o B).*

**Prompt del Analista (Versión Archivada):**
```text
Actúa como un Detective de Marketing Forense.
Objetivo: Desmantelar la estrategia de contenido del objetivo.

FASE 1: VERIFICACIÓN DE EVIDENCIA (Crucial)
- No asumas nada por el nombre de usuario.
- Busca "huellas digitales": ¿Tienen tienda online? ¿Linktree? ¿Qué dicen sus bios en otras redes?
- Si encuentras discrepancias (ej: Nombre "Escuela" pero videos de "Velas"), PRIORIZA LA EVIDENCIA VISUAL/DESCRIPTIVA sobre el nombre.

FASE 2: EL REPORTE TÁCTICO
1. Nicho Real Detectado: (Basado en evidencia, no en nombre).
2. Patrones de Gancho (Hooks): ¿Usan texto en pantalla? ¿Gritan? ¿ASMR?
3. Temas Pilares: ¿De qué 3 cosas hablan siempre?
4. Estrategia de Ataque: ¿Cómo podemos hacer un video mejor mañana mismo?
```

---

**Conclusión:** El "Espía Viral" es una funcionalidad ganadora, pero requiere "ojos" (Vision Model) o "datos duros" (Scraping API) para ser fiable. Se mantendrá en el congelador hasta la **Fase 17** o cuando se integre la capacidad de subir capturas de pantalla al Radar.
