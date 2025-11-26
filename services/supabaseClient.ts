import { createClient } from '@supabase/supabase-js';

// User-provided Supabase credentials
const supabaseUrl = 'https://kweidvguczpkavzhcxpq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3ZWlkdmd1Y3pwa2F2emhjeHBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwMzYxODYsImV4cCI6MjA3ODYxMjE4Nn0.rORILzLzyDHft1i8MDm0y4-41tJ-xZBQvzmgCwKC7z0';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);