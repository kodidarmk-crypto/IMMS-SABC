# IMMS-SABC — Instructions de déploiement

## ÉTAPE 1 — Supabase : créer les tables

1. Va sur https://supabase.com/dashboard/project/afujoysgsoluozufbbrg
2. Clique sur **SQL Editor** dans le menu gauche
3. Colle tout le contenu de `database-schema.sql`
4. Clique **Run**
5. Vérifie que toutes les tables apparaissent dans **Table Editor**

## ÉTAPE 2 — Supabase : configurer l'auth email

1. Va dans **Authentication > URL Configuration**
2. Dans **Redirect URLs**, ajoute :
   - `https://TON-SITE.vercel.app/change-password.html`
   - `http://localhost:5500/change-password.html` (pour tests locaux)
3. Dans **Email Templates > Reset Password**, vérifie que le lien utilise bien `{{ .ConfirmationURL }}`

## ÉTAPE 3 — Supabase : créer les Storage Buckets

1. Va dans **Storage**
2. Crée 4 buckets :
   - `machine-images` → Public: ✅
   - `usine-images`   → Public: ✅
   - `avatars`        → Public: ✅
   - `documents`      → Public: ❌ (privé)

## ÉTAPE 4 — Push les fichiers modifiés sur GitHub

```bash
# Clone le repo si pas déjà fait
git clone https://github.com/kodidarmk-crypto/IMMS-SABC.git
cd IMMS-SABC

# Remplace les fichiers modifiés :
# supabase-config.js
# script.js
# forgot-password.js
# change-password.js
# usines.js
# chaines.js
# machines.js
# gmao.js
# database-schema.sql

git add .
git commit -m "fix: connexion Supabase + navigation par rôle + machine_id context"
git push origin main
```

## ÉTAPE 5 — Vercel : connecter le repo

1. Va sur https://vercel.com
2. **New Project** → Import Git Repository → `kodidarmk-crypto/IMMS-SABC`
3. Framework Preset : **Other** (pas de build, c'est du HTML/JS pur)
4. Root Directory : `/` (laisser par défaut)
5. Clique **Deploy**
6. Récupère l'URL (ex: `https://imms-sabc.vercel.app`)

## ÉTAPE 6 — Mettre à jour Supabase avec l'URL Vercel

1. Retourne dans Supabase > **Authentication > URL Configuration**
2. **Site URL** : `https://imms-sabc.vercel.app`
3. **Redirect URLs** : ajoute `https://imms-sabc.vercel.app/change-password.html`

## ÉTAPE 7 — Créer le premier compte admin

Dans Supabase > **Authentication > Users** :
1. Clique **Add user**
2. Email + Password de l'admin
3. Puis dans **Table Editor > profiles**, trouve ce user et change son rôle à `administrateur`

---

## Ce qui est réglé par ces fichiers

| Fichier | Problème réglé |
|---------|---------------|
| `supabase-config.js` | Connexion BDD + helpers navigation |
| `database-schema.sql` | Toutes les tables créées |
| `script.js` | Login + routing intern→dashboard / admin→usines |
| `forgot-password.js` | Email de reset envoyé via Supabase Auth |
| `change-password.js` | Nouveau mot de passe confirmé |
| `usines.js` | Liste usines depuis BDD + statut 3 états |
| `chaines.js` | Liste chaînes d'une usine + statut + navigation |
| `machines.js` | Liste machines d'une chaîne + statut + navigation |
| `gmao.js` | Infos machine, alertes, interventions semaine, équipe, composants |
