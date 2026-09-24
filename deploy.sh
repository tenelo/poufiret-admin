#!/bin/bash
set -e
echo "→ Build..."
ng build --configuration production
echo "→ Envoi vers le VPS..."
ssh root@92.112.194.25 "rm -rf /var/www/poufiret-admin/*"
scp -r dist/poufiret-admin/browser/* root@92.112.194.25:/var/www/poufiret-admin/
echo "✅ Déployé sur https://businesscenter.tenelo.cloud"
