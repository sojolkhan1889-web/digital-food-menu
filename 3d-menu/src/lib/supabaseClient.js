import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://rsbwehchoovcmaclssuh.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzYndlaGNob292Y21hY2xzc3VoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM0NjE5MDYsImV4cCI6MjEwOTAzNzkwNn0.tz-WTAIvxzrLX_EHJauirsyBXWF-iXg88uf549tGKzM';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

