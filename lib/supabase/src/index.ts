import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qbaigamoagjymiuxbqyv.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFiYWlnYW1vYWdqeW1pdXhicXl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5MzA5MTYsImV4cCI6MjA5MzUwNjkxNn0.6zki0OlcKnFsx1Kf9PPz2CbiiJKeI5Ee7yYu4OrCR0w';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
