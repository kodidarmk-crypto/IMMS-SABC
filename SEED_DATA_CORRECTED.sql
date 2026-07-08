-- =========================================================================
-- IMMS — CORRECTED Seed Script
-- =========================================================================
-- NOTE: For auth.users, use Supabase Auth API, NOT direct SQL
-- This script handles data tables only. For users, follow instructions below.
-- =========================================================================

-- 1) Create the Factory: Usine SABC Koumassi
INSERT INTO public.usines (name, city, responsable, sector, creation_date, status)
SELECT 'Usine SABC Koumassi', 'Douala', 'Stephane Descazeaud',
       'Beverages', DATE '1948-02-03', 'active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.usines WHERE name = 'Usine SABC Koumassi'
);

-- 2) Create the Production Line: chaine 9 (linked to Usine SABC Koumassi)
DO $$
DECLARE
  v_usine_id UUID;
BEGIN
  SELECT id INTO v_usine_id
  FROM public.usines
  WHERE name = 'Usine SABC Koumassi'
  LIMIT 1;

  IF v_usine_id IS NULL THEN
    RAISE NOTICE 'Factory "Usine SABC Koumassi" not found. Please create the factory first.';
  ELSE
    INSERT INTO public.chaines (usine_id, name, responsable, status)
    SELECT v_usine_id, 'chaine 9', 'Djoko Roosevelt', 'active'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.chaines
      WHERE usine_id = v_usine_id AND name = 'chaine 9'
    );
  END IF;
END $$;

-- 3) Create a Profile for the test user
-- NOTE: The auth.users record MUST be created via Supabase Auth API FIRST
-- Get the UUID from auth.users after using Supabase signup/admin API, then run this:
-- 
-- INSERT INTO public.profiles (id, first_name, last_name, full_name, email, phone, role)
-- VALUES (
--   '<USER_ID_FROM_AUTH_USERS>',
--   'Kochere Djiomegni',
--   'Arilic Riveti Merwan',
--   'Kochere Djiomegni Arilic Riveti Merwan',
--   'kodidarmk@gmail.com',
--   '+237688760026',
--   'administrator'
-- );

-- 4) Link user to "chaine 9" under "Usine SABC Koumassi"
-- Run this after creating the profile:
-- 
-- DO $$
-- DECLARE
--   v_chaine_id UUID;
--   v_user_id UUID := '<USER_ID_FROM_AUTH_USERS>';
-- BEGIN
--   SELECT c.id INTO v_chaine_id
--   FROM public.usines u
--   JOIN public.chaines c ON c.usine_id = u.id
--   WHERE u.name = 'Usine SABC Koumassi'
--     AND c.name = 'chaine 9'
--   LIMIT 1;

--   IF v_chaine_id IS NULL THEN
--     RAISE NOTICE 'Could not find "chaine 9".';
--   ELSE
--     IF NOT EXISTS (
--       SELECT 1 FROM public.chaine_members
--       WHERE profile_id = v_user_id AND chaine_id = v_chaine_id
--     ) THEN
--       INSERT INTO public.chaine_members (profile_id, chaine_id, role)
--       VALUES (v_user_id, v_chaine_id, 'administrator');
--     END IF;
--   END IF;
-- END $$;
