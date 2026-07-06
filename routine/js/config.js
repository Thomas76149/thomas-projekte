// ===== Supabase-Verbindung =====
// Der publishable key darf öffentlich sein – die Daten schützt die
// Row-Level-Security in der Datenbank, nicht die Geheimhaltung des Keys.
const SUPABASE_URL = "https://rkvujydpsovvluezaofe.supabase.co";
const SUPABASE_KEY = "sb_publishable_CE2x2Z7EVOKhKC1JPPGJ5A_AHHxniP6";

// Globaler Client, den alle anderen Scripts als `db` nutzen.
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
