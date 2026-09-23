import { createClient } from '@supabase/supabase-js';

// Même projet, même clé "publishable" que le hub (auth.js à la racine du repo) : la
// session est partagée via localStorage puisque hub et notes sont sur la même origine.
export const supabase = createClient(
  'https://ngbadmsmgnzopdsromqd.supabase.co',
  'sb_publishable_N8uKDD5t8Fp0uKCaPplTOQ_lG1NrzLU',
);
