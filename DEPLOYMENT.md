# Guía de Despliegue: ViralZIA

Esta guía cubre cómo llevar ViralZIA a producción, desplegando tanto el Frontend (la aplicación React) como el Backend (las funciones de servidor de Supabase).

---

## Parte 1: Despliegue del Frontend (Vercel)

Recomendamos Vercel por su facilidad de uso y plan gratuito generoso. Esto subirá tu interfaz visual (React).

### 1. Preparar el Repositorio
Asegúrate de que todo tu código esté subido a un repositorio en GitHub.

### 2. Importar Proyecto en Vercel
1.  Ve a [vercel.com](https://vercel.com) e inicia sesión (idealmente con tu cuenta de GitHub).
2.  Haz clic en **"Add New..."** -> **"Project"**.
3.  Importa el repositorio de `ViralZIA`.

### 3. Configurar Variables de Entorno
En la pantalla de configuración del proyecto en Vercel:
1.  Busca la sección **"Environment Variables"**.
2.  Añade la siguiente variable:
    *   **Name:** `API_KEY`
    *   **Value:** (Tu clave de API de Google Gemini AI Studio)

*Nota: Las claves de Supabase ya están configuradas en `services/supabaseClient.ts`, por lo que Vercel se conectará automáticamente.*

### 4. Desplegar
Haz clic en **Deploy**. Vercel construirá tu aplicación y te dará una URL pública (ej: `viralzia.vercel.app`).

---

## Parte 2: Despliegue del Backend (Supabase Edge Functions)

⚠️ **IMPORTANTE:** Este paso es INDEPENDIENTE de Vercel. Vercel no hace esto por ti.

Debes ejecutar estos comandos **manualmente en la Terminal de tu computadora** para subir el código de "invitar usuarios" a la nube de Supabase. Si no haces esto, el Panel de Admin dará error.

### Solución de Problemas Comunes

#### Error: "No Functions specified or found in supabase\functions"
Si ves este error y tu terminal dice `PS C:\Windows\System32>`, significa que **estás en la carpeta incorrecta**.

**Solución:**
1.  Busca la carpeta donde guardaste el proyecto ViralZIA.
2.  En la terminal, usa el comando `cd` para entrar a esa carpeta.
    *   Ejemplo: `cd C:\Usuarios\TuNombre\Escritorio\ViralZIA`
3.  Asegúrate de que estás en la raíz del proyecto (deberías ver archivos como `package.json` o la carpeta `supabase` si listas los archivos).
4.  Vuelve a intentar el comando de despliegue.

### Instrucciones Paso a Paso

Abre la terminal (CMD, PowerShell o Terminal) y **navega a la carpeta de tu proyecto ViralZIA**.

1.  **Iniciar sesión en Supabase CLI:**
    ```bash
    npx supabase login
    ```
    *(Presiona Enter, se abrirá el navegador, autoriza el acceso y vuelve a la terminal).*

2.  **Vincular tu carpeta local con la nube:**
    Este comando conecta tu código con tu proyecto `kweidvguczpkavzhcxpq`.
    ```bash
    npx supabase link --project-ref kweidvguczpkavzhcxpq
    ```
    *Te pedirá la contraseña de tu base de datos (la que creaste al hacer el proyecto en Supabase). Si no la recuerdas, puedes resetearla en el panel de Supabase: Settings -> Database -> Reset password.*

3.  **Desplegar las funciones (El paso final):**
    Este comando toma el código de tu carpeta `supabase/functions` y lo sube a los servidores de Supabase.
    ```bash
    npx supabase functions deploy
    ```

### ¡Misión Cumplida!
Una vez que la terminal diga "Deployed Function", tu aplicación en Vercel (y en local) empezará a funcionar automáticamente. No necesitas hacer nada más en Vercel.