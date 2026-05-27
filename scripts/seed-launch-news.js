'use strict';

const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { getPack } = require('../default-class-content');

const DB_PATH = path.join(__dirname, '..', 'data', 'ipsa.db');
const CLASSES = ['3APS', '3APV'];
const now = Date.now();

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error(err.message);
    process.exit(1);
  }
});

function upsert(classe, news) {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO class_content (classe, section, payload, updated_at, updated_by)
       VALUES (?, 'news', ?, ?, 'launch-news')
       ON CONFLICT(classe, section) DO UPDATE SET
         payload = excluded.payload,
         updated_at = excluded.updated_at,
         updated_by = excluded.updated_by`,
      [classe, JSON.stringify(news), now],
      (err) => (err ? reject(err) : resolve())
    );
  });
}

(async () => {
  try {
    for (const classe of CLASSES) {
      const news = getPack(classe).news;
      await upsert(classe, news);
      console.log(`${classe} : actualité de lancement publiée.`);
    }
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  } finally {
    db.close();
  }
})();
