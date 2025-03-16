import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Create a single global instance for the client side
// Using a module-level variable ensures we only create one instance
let globalInstance: ReturnType<typeof createClient> | null = null;

// Create a function that returns the Supabase client
export const getSupabaseClient = () => {
  if (typeof window === 'undefined') {
    // Server-side: Create a new instance each time
    return createClient(supabaseUrl, supabaseAnonKey);
  }
  
  // Client-side: Use the global instance
  if (!globalInstance) {
    // Create a new instance only if one doesn't exist yet
    globalInstance = createClient(supabaseUrl, supabaseAnonKey);
    console.log('Supabase client initialized with URL:', supabaseUrl);
  }
  
  return globalInstance;
};

// Export the client for backward compatibility
export const supabase = getSupabaseClient();