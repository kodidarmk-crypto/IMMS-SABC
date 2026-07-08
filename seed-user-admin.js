// =========================================================================
// IMMS — Seed User via Supabase Admin API (Node.js)
// =========================================================================
// Prerequisites:
// 1. npm install @supabase/supabase-js
// 2. Set environment variables:
//    - SUPABASE_URL="https://your-project.supabase.co"
//    - SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-from-settings"
// 3. Run: node seed-user-admin.js
// =========================================================================

const { createClient } = require('@supabase/supabase-js');

// ⚠️ CRITICAL: Use SERVICE_ROLE_KEY for admin operations, NOT the public key
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://afujoysgsoluozufbbrg.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ ERROR: SUPABASE_SERVICE_ROLE_KEY environment variable is not set!');
  console.error('   Get your service role key from: https://app.supabase.com/project/_/settings/api');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function seedUser() {
  try {
    console.log('🚀 Starting user seeding...\n');

    // 1) Create auth user
    console.log('1️⃣ Creating auth.users record...');
    const { data: user, error: userError } = await supabase.auth.admin.createUser({
      email: 'kodidarmk@gmail.com',
      password: 'KodiDarm',
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        role: 'administrator'
      }
    });

    if (userError) {
      throw new Error(`Failed to create user: ${userError.message}`);
    }

    const userId = user.user.id;
    console.log(`   ✅ User created with ID: ${userId}\n`);

    // 2) Create profile
    console.log('2️⃣ Creating profile...');
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        first_name: 'Kochere Djiomegni',
        last_name: 'Arilic Riveti Merwan',
        full_name: 'Kochere Djiomegni Arilic Riveti Merwan',
        email: 'kodidarmk@gmail.com',
        phone: '+237688760026',
        role: 'administrator'
      });

    if (profileError) {
      throw new Error(`Failed to create profile: ${profileError.message}`);
    }
    console.log(`   ✅ Profile created\n`);

    // 3) Get or create factory
    console.log('3️⃣ Ensuring Usine SABC Koumassi exists...');
    const { data: existingUsine } = await supabase
      .from('usines')
      .select('id')
      .eq('name', 'Usine SABC Koumassi')
      .single();

    let usineId = existingUsine?.id;
    if (!usineId) {
      const { data: newUsine, error: usineError } = await supabase
        .from('usines')
        .insert({
          name: 'Usine SABC Koumassi',
          city: 'Douala',
          responsable: 'Stephane Descazeaud',
          sector: 'Beverages',
          creation_date: '1948-02-03',
          status: 'active'
        })
        .select()
        .single();

      if (usineError) throw new Error(`Failed to create usine: ${usineError.message}`);
      usineId = newUsine.id;
      console.log(`   ✅ Usine created with ID: ${usineId}\n`);
    } else {
      console.log(`   ✅ Usine already exists with ID: ${usineId}\n`);
    }

    // 4) Get or create chaine
    console.log('4️⃣ Ensuring chaine 9 exists...');
    const { data: existingChaine } = await supabase
      .from('chaines')
      .select('id')
      .eq('usine_id', usineId)
      .eq('name', 'chaine 9')
      .single();

    let chaineId = existingChaine?.id;
    if (!chaineId) {
      const { data: newChaine, error: chaineError } = await supabase
        .from('chaines')
        .insert({
          usine_id: usineId,
          name: 'chaine 9',
          responsable: 'Djoko Roosevelt',
          status: 'active'
        })
        .select()
        .single();

      if (chaineError) throw new Error(`Failed to create chaine: ${chaineError.message}`);
      chaineId = newChaine.id;
      console.log(`   ✅ Chaine created with ID: ${chaineId}\n`);
    } else {
      console.log(`   ✅ Chaine already exists with ID: ${chaineId}\n`);
    }

    // 5) Link user to chaine
    console.log('5️⃣ Linking user to chaine 9...');
    const { error: memberError } = await supabase
      .from('chaine_members')
      .insert({
        profile_id: userId,
        chaine_id: chaineId,
        role: 'administrator'
      });

    if (memberError && !memberError.message.includes('duplicate')) {
      throw new Error(`Failed to link user to chaine: ${memberError.message}`);
    }
    console.log(`   ✅ User linked to chaine\n`);

    console.log('✨ Seeding completed successfully!');
    console.log(`\n📝 Login credentials:`);
    console.log(`   Email: kodidarmk@gmail.com`);
    console.log(`   Password: KodiDarm`);

  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  }
}

seedUser();
