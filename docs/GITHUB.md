# Публикация на GitHub

Репозиторий уже подготовлен локально (ветка `main`, лицензия MIT, README).

## 1. Войти в GitHub (один раз)

```powershell
gh auth login
```

Выберите:
- GitHub.com
- HTTPS
- Login with a web browser (или token)

## 2. Создать репозиторий и отправить код

Из корня проекта:

```powershell
cd C:\Users\reper\Projects\rub-price-converter
.\scripts\publish-github.ps1
```

Или вручную:

```powershell
gh repo create rub-price-converter --public --source=. --remote=origin --push --description "Браузерное расширение: цены в иностранных валютах в рублях"
```

Если репозиторий на GitHub уже создан пустым:

```powershell
git remote add origin https://github.com/ВАШ_ЛОГИН/rub-price-converter.git
git push -u origin main
```

## 3. Проверка

Откройте `https://github.com/ВАШ_ЛОГИН/rub-price-converter` — на главной странице должен отображаться README с инструкцией по установке.
