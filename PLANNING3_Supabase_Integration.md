
# Documento de Planificación: Integración de Supabase

**Autor:** Equipo de Desarrollo de IA
**Versión:** 1.1
**Fecha:** 31 de Mayo de 2024

Este documento detalla el plan de implementación y el proceso paso a paso para migrar ViralZIA de una arquitectura local basada en IndexedDB a una plataforma en la nube, segura y multiusuario, utilizando Supabase como backend.

---

## **Paso 1: Configuración del Backend en Supabase (Base de Operaciones)**

-   **Objetivo**: Preparar la infraestructura en la nube, definir el esquema de la base de datos y establecer las políticas de seguridad.
-   **Tareas**:
    1.  **Creación del Proyecto**: Crear un nuevo proyecto en `supabase.com`.
    2.  **Diseño de la Base de Datos**: Replicar el esquema de datos existente (`sessions`, `landing_page_analyses`, `brand_kit`) en tablas de PostgreSQL usando el `schema.sql`.
        -   Añadir una columna `user_id` (UUID) a cada tabla, vinculada a `auth.users`.
        -   Añadir una columna `updated_at` (timestamp) con actualización automática.
    3.  **Configuración de la Autenticación**: Deshabilitar los registros públicos (`Enable email signups`) en el panel de control de Supabase.
    4.  **Implementación de Seguridad (RLS)**:
        -   Activar la Seguridad a Nivel de Fila (Row-Level Security) en todas las tablas de datos.
        -   Crear políticas de seguridad que permitan a los usuarios realizar operaciones (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) únicamente sobre sus propios datos (donde `auth.uid() = user_id`).
-   **Estado:** ✅ **COMPLETADO**

---

## **Paso 2: Refactorización del Frontend (Adaptación de la App)**

-   **Objetivo**: Modificar el código de la aplicación para que se comunique con Supabase en lugar de con la base de datos local (IndexedDB).
-   **Tareas**:
    1.  **Instalación y Configuración del Cliente**: Añadir `@supabase/supabase-js` al proyecto y configurar el cliente con las credenciales del proyecto.
    2.  **Flujo de Autenticación**:
        -   Crear un componente `Auth.tsx` que gestione el estado de la sesión y actúe como enrutador principal (mostrando `LoginView` o `App`).
        -   Crear el componente `LoginView.tsx` con un formulario de inicio de sesión.
        -   Añadir un botón de "Cerrar Sesión" en la cabecera.
    3.  **Reemplazo de la Lógica de Datos**:
        -   Eliminar por completo la dependencia de `Dexie.js` (`services/db.ts`).
        -   Refactorizar todos los componentes (`MyAnalysesView`, `VideoAnalyzerView`, `TrendsView`, `BrandKitView`) para realizar operaciones CRUD directamente contra Supabase.
        -   Reescribir la lógica de autoguardado para que realice `upserts` a la base de datos de Supabase.
        -   Eliminar la funcionalidad de "Importar/Exportar" datos, ya que se vuelve obsoleta.
-   **Estado:** ✅ **COMPLETADO**

---

## **Paso 3: Creación de la Vista de Administrador (Panel de Control)**

-   **Objetivo**: Implementar la interfaz que permitirá al administrador gestionar el acceso de los usuarios a la plataforma.
-   **Tareas**:
    1.  **Creación de la Vista `AdminView.tsx`**:
        -   Diseñar un nuevo componente que será la interfaz del panel de administración.
        -   Añadir un botón "Admin" en la cabecera que será visible condicionalmente solo para el email del administrador.
    2.  **Formulario de Invitación**:
        -   Añadir un campo de texto para introducir el email del nuevo usuario y un botón para "Invitar".
    3.  **Lógica de Invitación Segura**:
        -   La acción de invitar llamará a una **Supabase Edge Function** (`invite-user`).
        -   La función segura en el backend se encargará de crear el nuevo usuario en el sistema de autenticación de Supabase y de enviar el correo electrónico de invitación.
-   **Estado:** ✅ **COMPLETADO**

---

## **Paso 4: Despliegue de Edge Functions**

-   **Objetivo**: Desplegar la lógica del lado del servidor necesaria para operaciones privilegiadas (como listar e invitar usuarios) que no se pueden realizar de forma segura desde el navegador.
-   **Tareas**:
    1.  Crear las funciones `list-users` e `invite-user` en la carpeta `supabase/functions`.
    2.  Desplegar las funciones usando Supabase CLI (`supabase functions deploy`).
-   **Estado:** ✅ **COMPLETADO**
