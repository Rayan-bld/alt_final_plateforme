$ErrorActionPreference = 'Stop'
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$OutZip = Join-Path $ProjectRoot 'ipsa-deploy.zip'
$OutSql = Join-Path $ProjectRoot 'ipsa.sql'
$Staging = Join-Path $env:TEMP ("ipsa-deploy-" + [guid]::NewGuid().ToString('n'))

Write-Host ">> Export base de donnees..."
Push-Location $ProjectRoot
node (Join-Path $PSScriptRoot 'export-db-sql.js')
if ($LASTEXITCODE -ne 0) { Pop-Location; exit $LASTEXITCODE }
Pop-Location

Write-Host ">> Preparation du dossier de deploiement..."
New-Item -ItemType Directory -Path $Staging -Force | Out-Null

$files = @(
  'server.js',
  'package.json',
  'package-lock.json',
  'init-db.js',
  'default-class-content.js'
)
foreach ($f in $files) {
  Copy-Item (Join-Path $ProjectRoot $f) -Destination $Staging
}

Copy-Item (Join-Path $ProjectRoot 'public') -Destination (Join-Path $Staging 'public') -Recurse
Copy-Item (Join-Path $ProjectRoot 'data') -Destination (Join-Path $Staging 'data') -Recurse
Copy-Item $OutSql -Destination (Join-Path $Staging 'ipsa.sql')

$deployTxt = @'
IPSA Plateforme — deploiement Node.js
=====================================

1. Uploadez sur votre hebergeur :
   - ipsa-deploy.zip (ce fichier archive / le site)
   - ipsa.sql (fichier base de donnees, aussi present dans le zip)

2. Sur Hostinger (Applications Web / Node.js) :
   - Fichier de demarrage : server.js
   - Commande : npm start
   - Apres upload : npm install (si node_modules absent)

3. Le dossier data/ipsa.db contient la base SQLite utilisee par l'app.

4. Ne lancez PAS init-db.js en production sauf premiere install vide
   (cela reinitialiserait les comptes admin).
'@
Set-Content -Path (Join-Path $Staging 'LISEZMOI-DEPLOI.txt') -Value $deployTxt -Encoding UTF8

if (Test-Path $OutZip) { Remove-Item $OutZip -Force }

Write-Host ">> Creation de $OutZip ..."
Compress-Archive -Path (Join-Path $Staging '*') -DestinationPath $OutZip -CompressionLevel Optimal

Remove-Item $Staging -Recurse -Force

$zipSize = (Get-Item $OutZip).Length / 1KB
$sqlSize = (Get-Item $OutSql).Length / 1KB
Write-Host ""
Write-Host "=== Pret pour l'upload ===" -ForegroundColor Green
Write-Host "  Site  : $OutZip ($([math]::Round($zipSize, 1)) Ko)"
Write-Host "  BDD   : $OutSql ($([math]::Round($sqlSize, 1)) Ko)"
Write-Host ""
Write-Host "Glissez les DEUX fichiers dans la zone de migration de l'hebergeur."
