param(
  [string]$RepoName = "rub-price-converter",
  [ValidateSet("public", "private")]
  [string]$Visibility = "public"
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
  Write-Error "GitHub CLI (gh) не установлен. Установите: winget install GitHub.cli"
}

$auth = gh auth status 2>&1
if ($LASTEXITCODE -ne 0) {
  Write-Host "Сначала выполните: gh auth login"
  exit 1
}

$description = "Браузерное расширение: показывает цены в иностранных валютах в рублях (Chrome, Firefox)"

if (git remote get-url origin 2>$null) {
  Write-Host "Remote origin уже настроен, выполняю push..."
  git push -u origin main
} else {
  gh repo create $RepoName `
    --$Visibility `
    --source=. `
    --remote=origin `
    --push `
    --description $description
}

Write-Host ""
Write-Host "Готово. Репозиторий:"
gh repo view --web 2>$null
if ($LASTEXITCODE -ne 0) {
  $user = gh api user -q .login
  Write-Host "https://github.com/$user/$RepoName"
}
