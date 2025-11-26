
# Documentación del Esquema de Base de Datos (Supabase)

ViralZIA utiliza una base de datos PostgreSQL alojada en Supabase. A continuación se detalla la estructura de las tablas y las políticas de seguridad.

## Resumen de Seguridad (RLS)
Todas las tablas tienen **Row Level Security (RLS)** habilitado. Esto significa que, aunque todos los usuarios comparten las mismas tablas, **un usuario solo puede ver, insertar, editar o eliminar filas donde la columna `user_id` coincida con su propio ID de autenticación**.

---

## 1. Tabla: `sessions`
Almacena las sesiones de trabajo del "Analizador" y la "Suite Creativa".

| Columna | Tipo | Descripción |
| :--- | :--- | :--- |
| `id` | `uuid` | Identificador único de la sesión (PK). |
| `user_id` | `uuid` | ID del usuario propietario (FK a `auth.users`). |
| `created_at` | `timestamp` | Fecha de creación. |
| `updated_at` | `timestamp` | Fecha de última actualización. |
| `title` | `text` | Título de la sesión. |
| `original_transcript`| `text` | Texto original ingresado por el usuario. |
| `analysis` | `jsonb` | Objeto JSON con el resultado del análisis de IA. |
| `generated_scripts` | `jsonb` | Array JSON con los guiones generados. |
| `image_prompts` | `jsonb` | Objeto JSON con los prompts de imagen. |

---

## 2. Tabla: `landing_page_analyses`
Almacena los reportes generados en el "Radar de Tendencias" (Analista de Landing Pages).

| Columna | Tipo | Descripción |
| :--- | :--- | :--- |
| `id` | `uuid` | Identificador único del análisis (PK). |
| `user_id` | `uuid` | ID del usuario propietario (FK a `auth.users`). |
| `created_at` | `timestamp` | Fecha de creación. |
| `url` | `text` | Nombre del archivo o URL analizada. |
| `product_description`| `jsonb` | Datos estructurados del producto. |
| `value_proposition` | `jsonb` | Datos de la propuesta de valor. |
| `ideal_avatar` | `jsonb` | Datos del perfil de cliente ideal. |
| `buyer_personas` | `jsonb` | Array de perfiles generados. |
| ...otros campos JSON | `jsonb` | Resto de secciones del análisis. |

---

## 3. Tabla: `brand_kit`
Almacena la configuración de marca personal del usuario. Cada usuario tiene máximo una fila en esta tabla.

| Columna | Tipo | Descripción |
| :--- | :--- | :--- |
| `id` | `uuid` | Identificador único (PK). |
| `user_id` | `uuid` | ID del usuario propietario (FK a `auth.users`). Único. |
| `tone_of_voice` | `text` | Descripción del tono de voz. |
| `visual_style` | `text` | Descripción del estilo visual. |
| `target_audience` | `text` | Descripción del público objetivo. |
| `content_language` | `text` | Preferencia de idioma ('es' o 'en'). |
| `created_at` | `timestamp` | Fecha de creación. |
