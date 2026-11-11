// One shared connection to the Supabase database.
// The URL and key come from app/.env.local (on your computer) or from
// Cloudflare Pages settings (when deployed). See app/README.md.
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_KEY;

// False until the two settings above are filled in. The app shows a setup screen instead of crashing.
export const isConfigured = Boolean(url && key);

export const supabase = isConfigured ? createClient(url, key) : null;
