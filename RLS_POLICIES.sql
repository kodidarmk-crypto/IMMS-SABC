-- =========================================================================
-- IMMS — Row Level Security (RLS) Policies
-- =========================================================================
-- CRITICAL: Without these policies, ANY authenticated user can access ALL data
-- 
-- Security Model: Users can only see and modify their own profile + 
-- resources assigned to them (factories, chains, machines they work on)
-- =========================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chaines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chaine_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pannes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.amdec ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.failures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machine_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.amdec_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membres_chaines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operations ENABLE ROW LEVEL SECURITY;

-- =========================================================================
-- PROFILES — Users can only see/edit their own profile + admin can see all
-- =========================================================================
DROP POLICY IF EXISTS "profiles_own_read" ON public.profiles;
CREATE POLICY "profiles_own_read"
  ON public.profiles
  FOR SELECT
  USING (
    auth.uid() = id 
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'administrator'
  );

DROP POLICY IF EXISTS "profiles_own_update" ON public.profiles;
CREATE POLICY "profiles_own_update"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_admin_all" ON public.profiles;
CREATE POLICY "profiles_admin_all"
  ON public.profiles
  FOR ALL
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'administrator');

-- =========================================================================
-- USINES — Administrators can manage all, operators see assigned ones
-- =========================================================================
DROP POLICY IF EXISTS "usines_read" ON public.usines;
CREATE POLICY "usines_read"
  ON public.usines
  FOR SELECT
  USING (
    -- Administrators see all
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'administrator'
    -- Operators see factories they're assigned to (via chaine_members)
    OR id IN (
      SELECT DISTINCT c.usine_id
      FROM public.chaines c
      JOIN public.chaine_members cm ON cm.chaine_id = c.id
      WHERE cm.profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "usines_admin_write" ON public.usines;
CREATE POLICY "usines_admin_write"
  ON public.usines
  FOR ALL
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'administrator');

-- =========================================================================
-- CHAINES — Operators see assigned chains, admins see all
-- =========================================================================
DROP POLICY IF EXISTS "chaines_read" ON public.chaines;
CREATE POLICY "chaines_read"
  ON public.chaines
  FOR SELECT
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'administrator'
    OR id IN (
      SELECT chaine_id FROM public.chaine_members WHERE profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "chaines_admin_write" ON public.chaines;
CREATE POLICY "chaines_admin_write"
  ON public.chaines
  FOR ALL
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'administrator');

-- =========================================================================
-- CHAINE_MEMBERS — Admins manage all, operators see their assignments
-- =========================================================================
DROP POLICY IF EXISTS "chaine_members_read" ON public.chaine_members;
CREATE POLICY "chaine_members_read"
  ON public.chaine_members
  FOR SELECT
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'administrator'
    OR profile_id = auth.uid()
  );

DROP POLICY IF EXISTS "chaine_members_admin_write" ON public.chaine_members;
CREATE POLICY "chaine_members_admin_write"
  ON public.chaine_members
  FOR ALL
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'administrator');

-- =========================================================================
-- MACHINES — Users see machines in their assigned chains/factories
-- =========================================================================
DROP POLICY IF EXISTS "machines_read" ON public.machines;
CREATE POLICY "machines_read"
  ON public.machines
  FOR SELECT
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'administrator'
    OR chaine_id IN (
      SELECT chaine_id FROM public.chaine_members WHERE profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "machines_admin_write" ON public.machines;
CREATE POLICY "machines_admin_write"
  ON public.machines
  FOR ALL
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'administrator');

-- =========================================================================
-- INTERVENTIONS — Access based on machine + chain access
-- =========================================================================
DROP POLICY IF EXISTS "interventions_read" ON public.interventions;
CREATE POLICY "interventions_read"
  ON public.interventions
  FOR SELECT
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'administrator'
    OR machine_id IN (
      SELECT id FROM public.machines
      WHERE chaine_id IN (
        SELECT chaine_id FROM public.chaine_members WHERE profile_id = auth.uid()
      )
    )
    OR chaine_id IN (
      SELECT chaine_id FROM public.chaine_members WHERE profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "interventions_mechanic_write" ON public.interventions;
CREATE POLICY "interventions_mechanic_write"
  ON public.interventions
  FOR ALL
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('administrator', 'mechanic')
    AND (
      machine_id IN (
        SELECT id FROM public.machines
        WHERE chaine_id IN (
          SELECT chaine_id FROM public.chaine_members WHERE profile_id = auth.uid()
        )
      )
      OR chaine_id IN (
        SELECT chaine_id FROM public.chaine_members WHERE profile_id = auth.uid()
      )
    )
  );

-- =========================================================================
-- PANNES (Failures) — Similar access control
-- =========================================================================
DROP POLICY IF EXISTS "pannes_read" ON public.pannes;
CREATE POLICY "pannes_read"
  ON public.pannes
  FOR SELECT
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('administrator', 'mechanic', 'operator')
    AND machine_id IN (
      SELECT id FROM public.machines
      WHERE chaine_id IN (
        SELECT chaine_id FROM public.chaine_members WHERE profile_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "pannes_write" ON public.pannes;
CREATE POLICY "pannes_write"
  ON public.pannes
  FOR ALL
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('administrator', 'mechanic')
    AND machine_id IN (
      SELECT id FROM public.machines
      WHERE chaine_id IN (
        SELECT chaine_id FROM public.chaine_members WHERE profile_id = auth.uid()
      )
    )
  );

-- =========================================================================
-- DOCUMENTS — Users see docs for their machines
-- =========================================================================
DROP POLICY IF EXISTS "documents_read" ON public.documents;
CREATE POLICY "documents_read"
  ON public.documents
  FOR SELECT
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('administrator', 'mechanic', 'operator')
    AND machine_id IN (
      SELECT id FROM public.machines
      WHERE chaine_id IN (
        SELECT chaine_id FROM public.chaine_members WHERE profile_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "documents_write" ON public.documents;
CREATE POLICY "documents_write"
  ON public.documents
  FOR ALL
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('administrator', 'mechanic')
    AND machine_id IN (
      SELECT id FROM public.machines
      WHERE chaine_id IN (
        SELECT chaine_id FROM public.chaine_members WHERE profile_id = auth.uid()
      )
    )
  );

-- =========================================================================
-- STOCKS — Users see stocks for their machines
-- =========================================================================
DROP POLICY IF EXISTS "stocks_read" ON public.stocks;
CREATE POLICY "stocks_read"
  ON public.stocks
  FOR SELECT
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('administrator', 'mechanic', 'operator')
    AND machine_id IN (
      SELECT id FROM public.machines
      WHERE chaine_id IN (
        SELECT chaine_id FROM public.chaine_members WHERE profile_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "stocks_write" ON public.stocks;
CREATE POLICY "stocks_write"
  ON public.stocks
  FOR ALL
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('administrator', 'mechanic')
    AND machine_id IN (
      SELECT id FROM public.machines
      WHERE chaine_id IN (
        SELECT chaine_id FROM public.chaine_members WHERE profile_id = auth.uid()
      )
    )
  );

-- =========================================================================
-- ELEMENTS — Users see elements for their machines
-- =========================================================================
DROP POLICY IF EXISTS "elements_read" ON public.elements;
CREATE POLICY "elements_read"
  ON public.elements
  FOR SELECT
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('administrator', 'mechanic', 'operator')
    AND machine_id IN (
      SELECT id FROM public.machines
      WHERE chaine_id IN (
        SELECT chaine_id FROM public.chaine_members WHERE profile_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "elements_write" ON public.elements;
CREATE POLICY "elements_write"
  ON public.elements
  FOR ALL
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('administrator', 'mechanic')
    AND machine_id IN (
      SELECT id FROM public.machines
      WHERE chaine_id IN (
        SELECT chaine_id FROM public.chaine_members WHERE profile_id = auth.uid()
      )
    )
  );

-- =========================================================================
-- MACHINE_COMPONENTS — Similar access control
-- =========================================================================
DROP POLICY IF EXISTS "machine_components_read" ON public.machine_components;
CREATE POLICY "machine_components_read"
  ON public.machine_components
  FOR SELECT
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('administrator', 'mechanic', 'operator')
    AND machine_id IN (
      SELECT id FROM public.machines
      WHERE chaine_id IN (
        SELECT chaine_id FROM public.chaine_members WHERE profile_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "machine_components_write" ON public.machine_components;
CREATE POLICY "machine_components_write"
  ON public.machine_components
  FOR ALL
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('administrator', 'mechanic')
    AND machine_id IN (
      SELECT id FROM public.machines
      WHERE chaine_id IN (
        SELECT chaine_id FROM public.chaine_members WHERE profile_id = auth.uid()
      )
    )
  );

-- =========================================================================
-- AMDEC & FAILURES & AMDEC_ENTRIES — Similar machine-based access
-- =========================================================================
DROP POLICY IF EXISTS "failures_read" ON public.failures;
CREATE POLICY "failures_read"
  ON public.failures
  FOR SELECT
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('administrator', 'mechanic', 'operator')
    AND machine_id IN (
      SELECT id FROM public.machines
      WHERE chaine_id IN (
        SELECT chaine_id FROM public.chaine_members WHERE profile_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "amdec_read" ON public.amdec;
CREATE POLICY "amdec_read"
  ON public.amdec
  FOR SELECT
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('administrator', 'mechanic', 'operator')
    AND machine_id IN (
      SELECT id FROM public.machines
      WHERE chaine_id IN (
        SELECT chaine_id FROM public.chaine_members WHERE profile_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "amdec_entries_read" ON public.amdec_entries;
CREATE POLICY "amdec_entries_read"
  ON public.amdec_entries
  FOR SELECT
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('administrator', 'mechanic', 'operator')
    AND machine_id IN (
      SELECT id FROM public.machines
      WHERE chaine_id IN (
        SELECT chaine_id FROM public.chaine_members WHERE profile_id = auth.uid()
      )
    )
  );

-- =========================================================================
-- MEMBRES_CHAINES — Administrators manage, users see their assignments
-- =========================================================================
DROP POLICY IF EXISTS "membres_chaines_read" ON public.membres_chaines;
CREATE POLICY "membres_chaines_read"
  ON public.membres_chaines
  FOR SELECT
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'administrator'
    OR profile_id = auth.uid()
  );

DROP POLICY IF EXISTS "membres_chaines_admin_write" ON public.membres_chaines;
CREATE POLICY "membres_chaines_admin_write"
  ON public.membres_chaines
  FOR ALL
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'administrator');

-- =========================================================================
-- OPERATIONS — Users see operations for assigned chains
-- =========================================================================
DROP POLICY IF EXISTS "operations_read" ON public.operations;
CREATE POLICY "operations_read"
  ON public.operations
  FOR SELECT
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('administrator', 'mechanic', 'operator')
    AND chaine_id IN (
      SELECT chaine_id FROM public.chaine_members WHERE profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "operations_write" ON public.operations;
CREATE POLICY "operations_write"
  ON public.operations
  FOR ALL
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('administrator', 'mechanic')
    AND chaine_id IN (
      SELECT chaine_id FROM public.chaine_members WHERE profile_id = auth.uid()
    )
  );

-- =========================================================================
-- FINAL VERIFICATION
-- =========================================================================
-- Run this query to verify all RLS policies are enabled:
-- SELECT schemaname, tablename, rowsecurity FROM pg.tables WHERE schemaname = 'public';
-- All should show 't' (true) in rowsecurity column
