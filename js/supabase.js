// Conexión con Supabase (la usan todas las páginas que necesiten la base de datos)
const SUPABASE_URL = "https://ynqwmblqnvhnrfhypthg.supabase.co";
const SUPABASE_KEY = "sb_publishable_Mpq-6NkTIRJIucx6IjUWdQ_z_tF5Iuk";
 
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
 