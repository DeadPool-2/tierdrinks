#!/usr/bin/env bash
# Deploy TierDrinks to Beget shared hosting. Run in the Beget web terminal:
#   cd ~/tierdrinks && git pull && bash deploy-beget.sh
set -e
REPO="$HOME/tierdrinks"

# locate the site docroot
SITE=$(ls -d "$HOME"/*.beget.tech 2>/dev/null | head -1)
[ -z "$SITE" ] && SITE=$(ls -d "$HOME"/*/public_html 2>/dev/null | head -1 | xargs -r dirname)
if [ -z "$SITE" ]; then echo "!! не нашёл сайт-каталог в $HOME — укажи вручную"; exit 1; fi
DOC="$SITE/public_html"
[ -d "$DOC" ] || DOC="$SITE"
DATA="$DOC/data"
echo "SITE=$SITE"; echo "DOC=$DOC"

mkdir -p "$DOC" "$DATA"

# static front + php backend
cp -f "$REPO"/public/index.html "$REPO"/public/app.js "$REPO"/public/styles.css "$DOC"/
cp -f "$REPO"/api.php "$REPO"/.htaccess "$DOC"/

# images
rm -rf "$DOC"/images
cp -r "$REPO"/data/images "$DOC"/images

# seed + protect data dir from web.
# db.json is KEPT: api.php merges new seed drinks into it on every request,
# so ratings/prices survive deploys while the catalog still updates.
cp -f "$REPO"/data/seed.json "$DATA"/seed.json
cat > "$DATA"/.htaccess <<'DENY'
<IfModule mod_authz_core.c>
  Require all denied
</IfModule>
<IfModule !mod_authz_core.c>
  Deny from all
</IfModule>
DENY

echo "✓ Готово. Файлов в docroot:"
ls -1 "$DOC" | head
echo "Открой https://$(basename "$SITE") — каталог должен подтянуться."
