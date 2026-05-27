const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'ipsa.db');
const OUT_PATH = path.join(__dirname, '..', 'ipsa.sql');

function escape(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return String(val);
  if (typeof val === 'bigint') return String(val);
  return "'" + String(val).replace(/'/g, "''") + "'";
}

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Erreur ouverture DB :', err.message);
    process.exit(1);
  }
});

db.all(
  "SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
  (err, tables) => {
    if (err) {
      console.error(err.message);
      process.exit(1);
    }

    let pending = tables.length;
    const tableData = new Array(tables.length);

    if (!pending) {
      writeFile([]);
      return;
    }

    tables.forEach((t, i) => {
      db.all(`SELECT * FROM "${t.name.replace(/"/g, '""')}"`, (err2, rows) => {
        if (err2) {
          console.error(err2.message);
          process.exit(1);
        }
        tableData[i] = { name: t.name, sql: t.sql, rows };
        if (--pending === 0) writeFile(tableData);
      });
    });
  }
);

function writeFile(tableData) {
  const lines = [
    '-- Export SQLite — IPSA plateforme apprentissage',
    `-- Date: ${new Date().toISOString()}`,
    'PRAGMA foreign_keys=OFF;',
    'BEGIN TRANSACTION;',
  ];

  for (const { name, sql, rows } of tableData) {
    lines.push('');
    lines.push(`DROP TABLE IF EXISTS ${name};`);
    lines.push(`${sql};`);
    if (rows.length) {
      const cols = Object.keys(rows[0]);
      for (const row of rows) {
        const vals = cols.map((c) => escape(row[c]));
        lines.push(`INSERT INTO ${name} (${cols.join(', ')}) VALUES (${vals.join(', ')});`);
      }
    }
  }

  lines.push('');
  lines.push('COMMIT;');
  fs.writeFileSync(OUT_PATH, lines.join('\n'), 'utf8');
  const stat = fs.statSync(OUT_PATH);
  console.log('Export créé :', OUT_PATH);
  console.log(
    'Tables :',
    tableData.map((t) => `${t.name} (${t.rows.length} lignes)`).join(', ')
  );
  console.log('Taille :', (stat.size / 1024).toFixed(1), 'Ko');
  db.close();
}
