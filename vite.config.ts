import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Carga las variables de entorno del directorio actual.
  // El tercer parámetro '' le dice a Vite que cargue todas las variables, no solo las que empiezan por VITE_
  // Fix: Cast process to any to avoid "Property 'cwd' does not exist on type 'Process'" error
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  return {
    plugins: [react()],
    define: {
      // Esto inyecta process.env.API_KEY en el código compilado
      // Vital para que Vercel y otros entornos de producción funcionen con la lógica actual
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
    }
  }
})