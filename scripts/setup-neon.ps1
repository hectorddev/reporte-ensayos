# Configura la base de datos en Neon y carga datos iniciales
# Uso: .\scripts\setup-neon.ps1 "postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require"

param(
    [Parameter(Mandatory = $true)]
    [string]$DatabaseUrl
)

$envPath = Join-Path $PSScriptRoot "..\backend\.env"
$envContent = @"
DATABASE_URL="$DatabaseUrl"
PORT=3001
ADMIN_PASSWORD="admin123"
FRONTEND_URL="http://localhost:5173"
NODE_ENV=development
"@

Set-Content -Path $envPath -Value $envContent -Encoding UTF8
Write-Host "backend/.env actualizado" -ForegroundColor Green

Push-Location (Join-Path $PSScriptRoot "..\backend")
try {
    npm run db:setup
    Write-Host "`nBase de datos Neon lista: tablas + agrupaciones creadas." -ForegroundColor Green
} finally {
    Pop-Location
}
