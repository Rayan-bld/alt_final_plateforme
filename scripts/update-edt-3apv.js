'use strict';

const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { getPack } = require('../default-class-content');

const DB_PATH = path.join(__dirname, '..', 'data', 'ipsa.db');
const edt = getPack('3APV').edt;
const json = JSON.stringify(edt);
const now = Date.now();

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error(err.message);
    process.exit(1);
  }
});

db.run(
  `INSERT INTO class_content (classe, section, payload, updated_at, updated_by)
   VALUES ('3APV', 'edt', ?, ?, 'pegasus-import')
   ON CONFLICT(classe, section) DO UPDATE SET
     payload = excluded.payload,
     updated_at = excluded.updated_at,
     updated_by = excluded.updated_by`,
  [json, now],
  function (err) {
    if (err) {
      console.error(err.message);
      process.exit(1);
    }
    console.log(`EDT 3APV mis à jour : ${edt.length} créneaux.`);
    db.close();
  }
);
