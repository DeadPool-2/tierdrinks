# TierDrinks ⚡

Рейтинг энергетиков на двоих с авто тир-листом. Оценка по 4 осям (вкус,
бодрость, цена/качество, послевкусие), общий тир-лист S–F, два профиля без пароля.

**Стек:** Node без зависимостей (`node:http`) + JSON-стор на диске, статичный
SPA (vanilla JS). Деплой = один `rsync`, никакой сборки на сервере.

## Локально

```bash
npm start           # http://localhost:3000
npm run dev         # то же с авто-перезапуском (node --watch)
```

Данные лежат в `data/db.json` (создаётся при первом старте из сида). Картинки —
в `data/images/`. Оба гитигнорятся (это runtime-данные).

## Каталог и картинки

- Список напитков — `src/seedData.js` (50 энергетиков). При старте сервер
  засевает их в `data/db.json`; добавление новых в сид только дополняет, оценки
  не трогает.
- Фото тянутся из Open Food Facts:
  ```bash
  node scripts/fetch-images.mjs --dry   # отчёт матчинга без скачивания
  node scripts/fetch-images.mjs         # скачать в data/images + записать src/imageMap.json
  ```
  `src/imageMap.json` (id→путь) в гите; бинарники — нет. Нет фото → карточка
  рисует плейсхолдер в цвет бренда (28/50 с фото, остальное заглушки).
- Своё фото/напиток — вкладка «＋ Напиток» в UI (ссылка на картинку).

## Деплой на VPS (drinks.bondapp.ru)

Приложение zero-deps, поэтому выкатка тривиальна:

```bash
./deploy.sh          # rsync + systemd restart + nginx (ssh alias "vps")
```

Что делает: rsync в `/opt/tierdrinks` (исключая живой `data/db.json`), ставит
`ops/tierdrinks.service`, поднимает systemd-юнит на :3000, подключает
`ops/nginx-drinks.conf`.

**Разово вручную:**
1. **DNS:** в Cloudflare добавить запись `drinks` → `155.212.130.193` (Proxied),
   SSL режим Full.
2. Первый `./deploy.sh` — юнит и nginx-блок встанут сами.

> ⚠️ С машины за прокси (Shadowrocket/MacPacket, fake-IP) SSH к прямому IP VPS
> рвётся на handshake. Перед деплоем: выключить прокси или добавить DIRECT-правило
> для `155.212.130.193` / `*.bondapp.ru`.
