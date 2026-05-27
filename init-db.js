const { MongoClient } = require('mongodb');
const bcrypt = require('bcrypt');
const classContentDefaults = require('./default-class-content');

const SALT_ROUNDS = 10;
const MONGO_URI = process.env.MONGO_URI;
const MONGO_DB_NAME = process.env.MONGO_DB_NAME || 'ipsa_plateforme';

if (!MONGO_URI) {
  console.error('MONGO_URI manquant. Exemple:');
  console.error('MONGO_URI="mongodb+srv://<user>:<pass>@<cluster>/<db>" npm run init-db');
  process.exit(1);
}

async function seedDatabase() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();

  try {
    const db = client.db(MONGO_DB_NAME);
    const users = db.collection('users');
    const classContent = db.collection('class_content');

    await users.createIndex({ email: 1 }, { unique: true });
    await classContent.createIndex({ classe: 1, section: 1 }, { unique: true });

    const rayanHash = await bcrypt.hash('Rayan@9019.', SALT_ROUNDS);
    const amarHash = await bcrypt.hash('Amar@app26.', SALT_ROUNDS);
    const testHash = await bcrypt.hash('Test1234!', SALT_ROUNDS);

    await users.deleteMany({
      $or: [
        { id: 'admin-root' },
        { email: { $in: ['admin@ipsa.fr', 'rayan.belaidi@ipsa.fr', 'amar.belaidi@ipsa.fr'] } },
      ],
    });

    await users.updateOne(
      { id: 'admin-rayan' },
      {
        $set: {
          email: 'rayan.belaidi@ipsa.fr',
          password: rayanHash,
          name: 'Rayan Belaidi',
          prenom: 'Rayan',
          nom: 'Belaidi',
          promo: 'Admin',
          classe: '',
          role: 'admin',
          color: '#e5395f',
          manages_classe: '3APS',
          created_at: Date.now(),
        },
      },
      { upsert: true }
    );

    await users.updateOne(
      { id: 'admin-amar' },
      {
        $set: {
          email: 'amar.belaidi@ipsa.fr',
          password: amarHash,
          name: 'Amar Belaidi',
          prenom: 'Amar',
          nom: 'Belaidi',
          promo: 'Admin',
          classe: '',
          role: 'admin',
          color: '#0284c7',
          manages_classe: '3APV',
          created_at: Date.now(),
        },
      },
      { upsert: true }
    );

    await users.updateOne(
      { id: 'test-user' },
      {
        $set: {
          email: 'etudiant@ipsa.fr',
          password: testHash,
          name: 'Jean Dupont',
          prenom: 'Jean',
          nom: 'Dupont',
          promo: '2028',
          classe: '3APS',
          role: 'student',
          color: '#4f46e5',
          manages_classe: '',
          created_at: Date.now(),
        },
      },
      { upsert: true }
    );

    for (const classe of ['3APS', '3APV']) {
      const pack = classContentDefaults.getPack(classe);
      for (const [section, payload] of Object.entries(pack)) {
        await classContent.updateOne(
          { classe, section },
          {
            $setOnInsert: {
              classe,
              section,
              payload,
              updated_at: Date.now(),
              updated_by: 'seed',
            },
          },
          { upsert: true }
        );
      }
    }

    console.log('\n=== Base MongoDB initialisée ===');
    console.log(`Base : ${MONGO_DB_NAME}`);
    console.log('Admin 1 : rayan.belaidi@ipsa.fr  / Rayan@9019.');
    console.log('Admin 2 : amar.belaidi@ipsa.fr   / Amar@app26.');
    console.log('Test    : etudiant@ipsa.fr       / Test1234!');
  } finally {
    await client.close();
  }
}

seedDatabase().catch((err) => {
  console.error('Erreur init MongoDB :', err);
  process.exit(1);
});
