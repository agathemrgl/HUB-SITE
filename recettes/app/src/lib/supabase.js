import { createClient } from '@supabase/supabase-js';

// Même projet et même clé "publishable" que le hub (auth.js) et Notes : faite pour être exposée
// côté client, protégée par les règles d'accès (RLS) de supabase-schema.sql.
// Même origine que le hub : la session est partagée, se connecter sur le hub connecte aussi ici.
export const supabase = createClient(
  'https://ngbadmsmgnzopdsromqd.supabase.co',
  'sb_publishable_N8uKDD5t8Fp0uKCaPplTOQ_lG1NrzLU',
);
