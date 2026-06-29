-- ============================================================
--  IMMS-SABC — Schéma Supabase complet
--  À coller dans : Supabase Dashboard > SQL Editor > Run
-- ============================================================

-- Extension UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ────────────────────────────────────────────────
-- 1. PROFILES (liés à auth.users de Supabase)
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nom           TEXT NOT NULL,
  prenom        TEXT,
  email         TEXT UNIQUE NOT NULL,
  telephone     TEXT,
  role          TEXT NOT NULL CHECK (role IN ('intern','operateur','mecanicien','administrateur')),
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger : crée automatiquement un profil quand un user s'inscrit
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, nom, role)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'nom','Nouveau Membre'), 
          COALESCE(NEW.raw_user_meta_data->>'role','intern'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ────────────────────────────────────────────────
-- 2. USINES
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS usines (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom           TEXT NOT NULL,
  localisation  TEXT,
  description   TEXT,
  image_url     TEXT,
  statut        TEXT DEFAULT 'active' CHECK (statut IN ('active','maintenance','inactive')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────
-- 3. CHAINES (lignes de production)
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chaines (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usine_id      UUID NOT NULL REFERENCES usines(id) ON DELETE CASCADE,
  nom           TEXT NOT NULL,
  description   TEXT,
  statut        TEXT DEFAULT 'active' CHECK (statut IN ('active','maintenance','inactive')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────
-- 4. MACHINES
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS machines (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chaine_id     UUID NOT NULL REFERENCES chaines(id) ON DELETE CASCADE,
  usine_id      UUID NOT NULL REFERENCES usines(id),
  nom           TEXT NOT NULL,
  type          TEXT,
  manufacturer  TEXT,
  description   TEXT,
  image_url     TEXT,
  statut        TEXT DEFAULT 'running' CHECK (statut IN ('running','maintenance','inactive')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────
-- 5. ELEMENTS/COMPOSANTS d'une machine
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS elements (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  machine_id    UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  nom           TEXT NOT NULL,
  description   TEXT,
  quantite      INTEGER DEFAULT 1,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────
-- 6. MEMBRES — affectation chaine/machine
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS membres_chaines (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  chaine_id     UUID NOT NULL REFERENCES chaines(id) ON DELETE CASCADE,
  usine_id      UUID NOT NULL REFERENCES usines(id),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id, chaine_id)
);

-- ────────────────────────────────────────────────
-- 7. INTERVENTIONS
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS interventions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  machine_id      UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  chaine_id       UUID REFERENCES chaines(id),
  usine_id        UUID REFERENCES usines(id),
  titre           TEXT NOT NULL,
  description     TEXT,
  type            TEXT DEFAULT 'preventive' CHECK (type IN ('preventive','corrective','predictive','inspection')),
  statut          TEXT DEFAULT 'planifiee' CHECK (statut IN ('planifiee','en_cours','terminee','annulee')),
  priorite        TEXT DEFAULT 'normale' CHECK (priorite IN ('basse','normale','haute','critique')),
  date_prevue     TIMESTAMPTZ,
  date_realisation TIMESTAMPTZ,
  duree_estimee   INTEGER,  -- en minutes
  duree_reelle    INTEGER,
  assignee_id     UUID REFERENCES profiles(id),
  created_by      UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────
-- 8. PANNES (Failures)
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pannes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  machine_id      UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  element_id      UUID REFERENCES elements(id),
  titre           TEXT NOT NULL,
  description     TEXT,
  type            TEXT DEFAULT 'mecanique' CHECK (type IN ('mecanique','electrique','hydraulique','pneumatique','electronique','autre')),
  severite        TEXT DEFAULT 'normale' CHECK (severite IN ('mineure','normale','majeure','critique')),
  statut          TEXT DEFAULT 'non_resolu' CHECK (statut IN ('non_resolu','en_cours','resolu')),
  date_debut      TIMESTAMPTZ DEFAULT NOW(),
  date_fin        TIMESTAMPTZ,          -- rempli quand statut = 'resolu'
  duree_minutes   INTEGER,              -- calculé automatiquement à la résolution
  signale_par     UUID REFERENCES profiles(id),
  resolu_par      UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────
-- 9. DOCUMENTS
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS documents (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  machine_id    UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  nom           TEXT NOT NULL,
  description   TEXT,
  type          TEXT DEFAULT 'autre' CHECK (type IN ('schema_cablage','manuel','rapport','procedure','autre')),
  fichier_url   TEXT,
  uploaded_by   UUID REFERENCES profiles(id),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────
-- 10. STOCKS / INVENTAIRE
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stocks (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  machine_id      UUID REFERENCES machines(id),
  nom             TEXT NOT NULL,
  reference       TEXT,
  categorie       TEXT DEFAULT 'mecanique' CHECK (categorie IN ('mecanique','hydraulique','electrique','pneumatique','safety','software','autre')),
  quantite        INTEGER DEFAULT 0,
  quantite_min    INTEGER DEFAULT 1,   -- seuil alerte bas stock
  unite           TEXT DEFAULT 'pcs',
  fournisseur     TEXT,
  prix_unitaire   DECIMAL(10,2),
  statut          TEXT DEFAULT 'normal' CHECK (statut IN ('normal','bas','critique','rupture')),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger : met à jour statut stock automatiquement
CREATE OR REPLACE FUNCTION update_stock_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.quantite = 0 THEN
    NEW.statut := 'rupture';
  ELSIF NEW.quantite <= NEW.quantite_min THEN
    NEW.statut := 'critique';
  ELSIF NEW.quantite <= NEW.quantite_min * 2 THEN
    NEW.statut := 'bas';
  ELSE
    NEW.statut := 'normal';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_stock_update ON stocks;
CREATE TRIGGER on_stock_update
  BEFORE INSERT OR UPDATE ON stocks
  FOR EACH ROW EXECUTE FUNCTION update_stock_status();

-- ────────────────────────────────────────────────
-- 11. AMDEC (pour analysis.html)
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS amdec (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  machine_id      UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  element_id      UUID REFERENCES elements(id),
  composant       TEXT NOT NULL,
  fonction        TEXT,
  mode_defaillance TEXT NOT NULL,
  effet           TEXT,
  cause           TEXT,
  gravite         INTEGER CHECK (gravite BETWEEN 1 AND 10),
  occurrence      INTEGER CHECK (occurrence BETWEEN 1 AND 10),
  detection       INTEGER CHECK (detection BETWEEN 1 AND 10),
  ipr             INTEGER GENERATED ALWAYS AS (gravite * occurrence * detection) STORED,
  action          TEXT,
  responsable     UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────
-- 12. OPERATIONS DASHBOARD (intern/operateur)
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS operations (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chaine_id     UUID NOT NULL REFERENCES chaines(id) ON DELETE CASCADE,
  assignee_id   UUID NOT NULL REFERENCES profiles(id),
  titre         TEXT NOT NULL,
  description   TEXT,
  date_prevue   DATE NOT NULL,
  statut        TEXT DEFAULT 'pending' CHECK (statut IN ('pending','done')),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────
-- ROW LEVEL SECURITY (RLS) — sécurité de base
-- ────────────────────────────────────────────────
ALTER TABLE profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE usines           ENABLE ROW LEVEL SECURITY;
ALTER TABLE chaines          ENABLE ROW LEVEL SECURITY;
ALTER TABLE machines         ENABLE ROW LEVEL SECURITY;
ALTER TABLE elements         ENABLE ROW LEVEL SECURITY;
ALTER TABLE membres_chaines  ENABLE ROW LEVEL SECURITY;
ALTER TABLE interventions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE pannes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents        ENABLE ROW LEVEL SECURITY;
ALTER TABLE stocks           ENABLE ROW LEVEL SECURITY;
ALTER TABLE amdec            ENABLE ROW LEVEL SECURITY;
ALTER TABLE operations       ENABLE ROW LEVEL SECURITY;

-- Politique : utilisateur connecté peut lire tout
CREATE POLICY "Authenticated read all" ON profiles         FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated read all" ON usines           FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated read all" ON chaines          FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated read all" ON machines         FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated read all" ON elements         FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated read all" ON membres_chaines  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated read all" ON interventions    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated read all" ON pannes           FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated read all" ON documents        FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated read all" ON stocks           FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated read all" ON amdec            FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated read all" ON operations       FOR SELECT USING (auth.role() = 'authenticated');

-- Politique : utilisateur connecté peut insert/update/delete
CREATE POLICY "Authenticated write"    ON profiles         FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated write"    ON usines           FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated write"    ON chaines          FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated write"    ON machines         FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated write"    ON elements         FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated write"    ON membres_chaines  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated write"    ON interventions    FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated write"    ON pannes           FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated write"    ON documents        FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated write"    ON stocks           FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated write"    ON amdec            FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated write"    ON operations       FOR ALL USING (auth.role() = 'authenticated');

-- ────────────────────────────────────────────────
-- STORAGE BUCKETS (pour images et fichiers)
-- ────────────────────────────────────────────────
-- À créer dans Supabase Dashboard > Storage :
-- Bucket "machine-images"  → public: true
-- Bucket "usine-images"    → public: true
-- Bucket "avatars"         → public: true
-- Bucket "documents"       → public: false (accès authentifié)
