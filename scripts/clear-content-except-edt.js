'use strict';

const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { getPack, SECTIONS } = require('../default-class-content');

const DB_PATH = path.join(__dirname, '..', 'data', 'ipsa.db');
const CLASSES = ['3APS', '3APV'];
const now = Date.now();

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error(err.message);
    process.exit(1);
  }
});

function upsert(classe, section, payload) {
  return new Promise((resolve, reject) => {
    const json = JSON.stringify(payload);
    db.run(
      `INSERT INTO class_content (classe, section, payload, updated_at, updated_by)
       VALUES (?, ?, ?, ?, 'purge-demo')
       ON CONFLICT(classe, section) DO UPDATE SET
         payload = excluded.payload,
         updated_at = excluded.updated_at,
         updated_by = excluded.updated_by`,
      [classe, section, json, now],
      (err) => (err ? reject(err) : resolve())
    );
  });
}

(async () => {
  try {
    for (const classe of CLASSES) {
      const pack = getPack(classe);
      for (const section of SECTIONS) {
        await upsert(classe, section, pack[section]);
        const count = Array.isArray(pack[section]) ? pack[section].length : 0;
        console.log(`${classe} / ${section} : ${count} élément(s)`);
      }
    }
    console.log('\nContenu vidé (EDT 3APS conservé).');
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  } finally {
    db.close();
  }
})();
