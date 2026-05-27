const path = require('path');
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const { MongoClient } = require('mongodb');
const bcrypt = require('bcrypt');
const classContentDefaults = require('./default-class-content');

const app = express();
const PORT = process.env.PORT || 3000;
const SALT_ROUNDS = 10;
const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
const mongoDbName = process.env.MONGO_DB_NAME || 'ipsa_plateforme';

if (!mongoUri) {
  throw new Error('MONGO_URI est requis (local + production).');
}

const client = new MongoClient(mongoUri);
let db;
let usersCollection;
let classContentCollection;

async function initMongo() {
  if (db) return;
  await client.connect();
  db = client.db(mongoDbName);
  usersCollection = db.collection('users');
  classContentCollection = db.collection('class_content');
  await usersCollection.createIndex({ email: 1 }, { unique: true });
  await classContentCollection.createIndex({ classe: 1, section: 1 }, { unique: true });
  console.log(`MongoDB connecté : ${mongoDbName}`);
}

if (isProduction) {
  app.set('trust proxy', 1);
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const sessionSecret = process.env.SESSION_SECRET || 'ipsa-plateforme-secret-key-2025';
if (isProduction && !process.env.SESSION_SECRET) {
  console.warn('SESSION_SECRET non défini — utilisez une valeur aléatoire en production.');
}

const sessionOptions = {
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 jours
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
  },
  store: MongoStore.create({
    mongoUrl: mongoUri,
    dbName: mongoDbName,
    collectionName: 'sessions',
    ttl: 60 * 60 * 24 * 7,
    autoRemove: 'native',
  }),
};

app.use(session(sessionOptions));

function sanitizeUser(row) {
  if (!row) return null;
  const { password, ...user } = row;
  return {
    ...user,
    createdAt: user.created_at,
    classe: user.classe || '',
    manages_classe: user.manages_classe || '',
  };
}

function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Non authentifié' });
  next();
}

async function requireAdmin(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Non authentifié' });
  try {
    const user = await usersCollection.findOne(
      { id: req.session.userId },
      { projection: { role: 1 } }
    );
    if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Accès refusé' });
    next();
  } catch (e) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

const VALID_CLASSES = ['3APS', '3APV'];
const CONTENT_SECTIONS = classContentDefaults.SECTIONS;

const dbReady = initMongo().catch((e) => {
  console.error('Initialisation MongoDB :', e);
  throw e;
});

app.use(async (req, res, next) => {
  try {
    await dbReady;
    next();
  } catch (e) {
    res.status(500).json({ error: 'Erreur initialisation serveur' });
  }
});

app.use(express.static(path.join(__dirname, 'public')));

async function getOrSeedSection(classe, section) {
  const row = await classContentCollection.findOne({ classe, section });
  if (row) return row.payload;

  const pack = classContentDefaults.getPack(classe);
  const data = pack[section];
  await classContentCollection.updateOne(
    { classe, section },
    {
      $setOnInsert: {
        classe,
        section,
        payload: data,
        updated_at: Date.now(),
        updated_by: 'seed',
      },
    },
    { upsert: true }
  );

  const inserted = await classContentCollection.findOne({ classe, section });
  if (inserted) return inserted.payload;

  return data;
}

async function buildClassPayload(classe) {
  const out = { classe };
  for (const sec of CONTENT_SECTIONS) {
    out[sec] = await getOrSeedSection(classe, sec);
  }
  return out;
}

// ── Routes API ───────────────────────────────────────

// Vérifier la session courante
app.get('/api/me', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Non authentifié' });
  try {
    const row = await usersCollection.findOne({ id: req.session.userId });
    if (!row) { req.session.destroy(); return res.status(401).json({ error: 'Utilisateur introuvable' }); }
    res.json({ user: sanitizeUser(row) });
  } catch (e) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Connexion
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email et mot de passe requis' });

  try {
    const row = await usersCollection.findOne({ email: email.trim().toLowerCase() });
    if (!row) return res.status(401).json({ error: 'Email ou mot de passe incorrect' });

    const match = await bcrypt.compare(password, row.password);
    if (!match) return res.status(401).json({ error: 'Email ou mot de passe incorrect' });

    req.session.userId = row.id;
    res.json({ user: sanitizeUser(row) });
  } catch (e) {
    console.error('Erreur login :', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Inscription
app.post('/api/register', async (req, res) => {
  const { prenom, nom, email, promo, classe, password } = req.body;
  if (!prenom || !nom || !email || !password) {
    return res.status(400).json({ error: 'Tous les champs sont requis' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Mot de passe trop court (6 caractères min)' });
  }

  try {
    const normalizedEmail = email.trim().toLowerCase();
    const existing = await usersCollection.findOne(
      { email: normalizedEmail },
      { projection: { id: 1 } }
    );
    if (existing) return res.status(409).json({ error: 'Cet email est déjà utilisé' });

    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    const colors = ['#4f46e5', '#e5395f', '#16a34a', '#d97706', '#0284c7'];
    const count = await usersCollection.countDocuments();
    const id = 'u' + Date.now();
    const userDoc = {
      id,
      email: normalizedEmail,
      password: hash,
      name: `${prenom} ${nom}`,
      prenom,
      nom,
      promo: promo || '',
      classe: classe || '',
      role: 'student',
      color: colors[count % colors.length],
      manages_classe: '',
      created_at: Date.now(),
    };
    await usersCollection.insertOne(userDoc);

    const row = await usersCollection.findOne({ id });
    req.session.userId = id;
    res.status(201).json({ user: sanitizeUser(row) });
  } catch (e) {
    console.error('Erreur register :', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Déconnexion
app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ ok: true });
  });
});

// Liste des utilisateurs (admin)
app.get('/api/users', requireAdmin, async (req, res) => {
  try {
    const rows = await usersCollection.find({}).sort({ created_at: -1 }).toArray();
    res.json(rows.map(sanitizeUser));
  } catch (e) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Contenu pédagogique (emploi du temps, cours, etc.) — une classe = données isolées
app.get('/api/my-class-content', requireAuth, async (req, res) => {
  try {
    const user = await usersCollection.findOne({ id: req.session.userId });
    if (!user) return res.status(401).json({ error: 'Utilisateur introuvable' });

    const classe =
      user.role === 'admin'
        ? (user.manages_classe || '').trim()
        : (user.classe || '').trim();

    if (!VALID_CLASSES.includes(classe)) {
      return res.status(400).json({
        error:
          user.role === 'admin'
            ? 'Compte admin sans classe assignée (manages_classe).'
            : 'Classe étudiant manquante ou invalide.',
      });
    }

    const payload = await buildClassPayload(classe);
    res.json(payload);
  } catch (e) {
    console.error('Erreur my-class-content :', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Mise à jour d’une section (admin de la classe uniquement)
app.put('/api/class-content/:section', requireAuth, async (req, res) => {
  const { section } = req.params;
  if (!CONTENT_SECTIONS.includes(section)) {
    return res.status(400).json({ error: 'Section inconnue' });
  }
  try {
    const user = await usersCollection.findOne({ id: req.session.userId });
    if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Accès refusé' });

    const manages = (user.manages_classe || '').trim();
    if (!VALID_CLASSES.includes(manages)) {
      return res.status(400).json({ error: 'Aucune classe gérée sur ce compte admin' });
    }

    const body = req.body;
    if (body === undefined || body === null) {
      return res.status(400).json({ error: 'Corps JSON requis (tableau ou objet)' });
    }

    const payload = typeof body === 'string' ? JSON.parse(body) : body;
    await classContentCollection.updateOne(
      { classe: manages, section },
      {
        $set: {
          payload,
          updated_at: Date.now(),
          updated_by: user.id,
        },
      },
      { upsert: true }
    );

    res.json({ ok: true, classe: manages, section });
  } catch (e) {
    console.error('Erreur PUT class-content :', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Supprimer un utilisateur (admin)
app.delete('/api/users/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const target = await usersCollection.findOne(
      { id },
      { projection: { role: 1 } }
    );
    if (!target) return res.status(404).json({ error: 'Utilisateur introuvable' });
    if (target.role === 'admin') return res.status(403).json({ error: 'Impossible de supprimer un admin' });

    await usersCollection.deleteOne({ id });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Route protégée — dashboard (redirige vers login si non connecté)
app.get('/dashboard', (req, res) => {
  if (!req.session.userId) return res.redirect('/');
  res.sendFile(path.join(__dirname, 'public', 'ipsa_plateforme.html'));
});

module.exports = app;

// ── Démarrage local (node server.js) ─────────────────
if (require.main === module) {
  dbReady.then(() => {
    app.listen(PORT, () => {
      console.log(`\n🚀 Serveur IPSA démarré sur http://localhost:${PORT}`);
      console.log(`   Dashboard : http://localhost:${PORT}/ipsa_plateforme.html`);
      console.log(`   Mobile    : http://localhost:${PORT}/ipsa_plateforme_mobile.html\n`);
      console.log(`   MongoDB   : ${mongoDbName}\n`);
    });
  }).catch(() => process.exit(1));

  process.on('SIGINT', () => {
    client.close().finally(() => process.exit(0));
  });
}
