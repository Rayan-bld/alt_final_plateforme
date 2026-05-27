'use strict';

const LAUNCH_DATE = '2026-05-18';

function platformLaunchNews() {
  return [
    {
      id: 'launch-2026',
      title: 'Bienvenue sur la plateforme IPSA Alternants',
      cat: 'info',
      body:
        'Cette interface a été créée pour les étudiants en alternance : un seul espace pour retrouver ' +
        'l’essentiel de votre vie scolaire — emploi du temps, examens, rendus, actualités, événements, ' +
        'ressources pédagogiques et informations de classe — sans multiplier les outils.<br><br>' +
        'Lancée le <strong>18 mai 2026</strong>, la plateforme est en pleine évolution : de nouvelles informations et ' +
        'fonctionnalités sont ajoutées au fil des semaines, avec une attention particulière portée à la ' +
        'fiabilité des contenus et à la sécurisation des accès.<br><br>' +
        'Merci de votre confiance : vos retours nous aident à faire grandir ce projet au service des alternants.',
      author: 'Équipe plateforme',
      date: LAUNCH_DATE,
      createdAt: new Date(LAUNCH_DATE + 'T08:00:00').getTime(),
    },
  ];
}

function emptySections() {
  return {
    subjects: [],
    examens: [],
    rendus: [],
    news: platformLaunchNews(),
    profs: [],
    events: [],
    softs: [],
  };
}
/** Semaine 22 — 25 au 29 mai 2026 (3APS) */
const EDT_3APS = [
  { id: 'e1', matiere: 'Systèmes aérospatiaux autonomes — Conférence', prof: '', jour: 2, debut: '08:30', fin: '10:30', salle: 'Amphi 1-1', type: 'cours' },
  { id: 'e2', matiere: 'Électrotechnique et génération électrique embarquée 2', prof: 'ARZANDE Amir', jour: 2, debut: '13:30', fin: '15:30', salle: 'C035', type: 'td' },
  { id: 'e3', matiere: 'Électrotechnique et génération électrique embarquée 2 — Projet', prof: 'ARZANDE Amir', jour: 2, debut: '15:30', fin: '17:30', salle: 'L021', type: 'cours' },
  { id: 'e4', matiere: 'Prospective — Budget TRON', prof: 'DINIZ Zinedine', jour: 3, debut: '08:30', fin: '10:30', salle: 'ISTM 102', type: 'td' },
  { id: 'e5', matiere: 'Outil de gestion — certification Excel, TOSA et VBA', prof: 'BOUTELOUP Suzanne', jour: 3, debut: '10:30', fin: '12:30', salle: 'ISTM 03', type: 'td' },
  { id: 'e6', matiere: 'Modélisation et simulation numérique — Application Systèmes', prof: 'CIRIL Igor', jour: 4, debut: '08:30', fin: '10:30', salle: 'ISTM 102', type: 'td' },
  { id: 'e7', matiere: 'Modélisation et simulation numérique — Application Systèmes', prof: 'CIRIL Igor', jour: 4, debut: '10:30', fin: '12:30', salle: 'ISTM 102', type: 'td' },
  { id: 'e8', matiere: 'Initiation à la logique programmée sur FPGA', prof: 'METIVIER Ludovic', jour: 4, debut: '13:30', fin: '17:30', salle: 'ISTM 02', type: 'tp' },
  { id: 'e9', matiere: 'Projet SI embarqué & Gestion de projet', prof: 'ALLAOUI HANI Robert', jour: 5, debut: '08:30', fin: '12:30', salle: 'ISTM 02', type: 'tp' },
  { id: 'e10', matiere: 'Électrotechnique et génération électrique embarquée 2 — Projet', prof: 'ARZANDE Amir', jour: 5, debut: '13:30', fin: '15:30', salle: 'L201', type: 'cours' },
];

/** Semaine du 18 au 22 mai 2026 (3APV) — agenda Pegasus */
const EDT_3APV = [
  { id: 'v1', matiere: 'Anglais général 2 — My job project', prof: 'BELARED Hadjer', jour: 1, debut: '08:30', fin: '10:30', salle: 'ISTM 102', type: 'td' },
  { id: 'v2', matiere: 'Prospective — Badges TEDS', prof: 'SAID Zinedine', jour: 1, debut: '10:30', fin: '12:30', salle: 'ISTM 103', type: 'td' },
  { id: 'v3', matiere: 'Outil de gestion — certification Excel-TOSA et VBA', prof: 'BOUTELOUP Suzanne', jour: 1, debut: '13:30', fin: '15:30', salle: 'ISTM 02', type: 'td' },
  { id: 'v4', matiere: 'Modélisation et analyse dynamique des aéronefs', prof: 'HABRACHE Nouara', jour: 2, debut: '08:30', fin: '10:30', salle: 'ISTM 102', type: 'cours' },
  { id: 'v5', matiere: 'Modélisation et analyse dynamique des aéronefs', prof: 'HABRACHE Nouara', jour: 2, debut: '10:30', fin: '12:30', salle: 'ISTM 102', type: 'cours' },
  { id: 'v6', matiere: 'Projet aérospatial & Gestion de projet', prof: 'EL HANAFI Abderrahmane', jour: 4, debut: '08:30', fin: '12:30', salle: 'C301', type: 'tp' },
  { id: 'v7', matiere: 'Transferts thermiques 2', prof: 'AMMAR Sirine', jour: 4, debut: '13:30', fin: '16:30', salle: 'L018c', type: 'tp' },
  { id: 'v8', matiere: 'Aérodynamique 2', prof: 'PÉRARD LECOMTE Aude', jour: 5, debut: '13:30', fin: '15:30', salle: 'C410', type: 'cours' },
  { id: 'v9', matiere: 'Aérodynamique 2', prof: 'PÉRARD LECOMTE Aude', jour: 5, debut: '15:30', fin: '17:30', salle: 'C410', type: 'td' },
];

function pack3APV() {
  return {
    edt: EDT_3APV,
    ...emptySections(),
  };
}
function pack3APS() {
  return {
    edt: EDT_3APS,
    ...emptySections(),
  };
}

const SECTIONS = ['edt', 'subjects', 'examens', 'rendus', 'news', 'profs', 'events', 'softs'];

function getPack(classe) {
  if (classe === '3APV') return pack3APV();
  return pack3APS();
}

module.exports = { SECTIONS, getPack };
