import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uyyqlwlnpipytsuqdjjm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5eXFsd2xucGlweXRzdXFkamptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5NTQ5MDMsImV4cCI6MjA3ODUzMDkwM30.mHGRqkZrqSmMqhFWMYfC-sq4elPgIN6Ac61Jec2BFwM';

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase URL and Anon Key must be provided.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);