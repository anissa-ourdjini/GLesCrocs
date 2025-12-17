# 🔧 Configuration GitHub — CI/CD

## Notifications Discord (Push sur main)

### 1. Créer un webhook Discord

1. Ouvrez votre serveur Discord
2. Paramètres du salon → Intégrations → Webhooks
3. Créer un webhook
4. Copiez l'URL : `https://discord.com/api/webhooks/...`

### 2. Ajouter le secret GitHub

1. Repository → Settings → Secrets and variables → Actions
2. New repository secret
   - Name: `DISCORD_WEBHOOK_URL`
   - Value: `https://discord.com/api/webhooks/...`
3. Save

### 3. Test

```powershell
git add .
git commit -m "Test CI notification"
git push origin main
```

Vous recevrez un message Discord : ✅ Push sur **main** par [votre nom]...

## Déploiement GitHub Pages (Frontend)

### 1. Activer GitHub Pages

1. Repository → Settings → Pages
2. Source: **GitHub Actions**
3. Save

### 2. Configurer la base (optionnel)

Si votre repo s'appelle `GLesCrocs` et que vous voulez déployer sous `username.github.io/GLesCrocs/` :

Éditez `frontend/vite.config.js` :

```javascript
export default defineConfig({
  plugins: [react()],
  base: '/GLesCrocs/'  // <-- Nom du repo
});
```

### 3. Déployer

Push sur `main` ou déclenchez manuellement :

1. Actions → Deploy Frontend to GitHub Pages → Run workflow

### 4. Accès

URL : `https://username.github.io/GLesCrocs/`

**Note :** Le backend ne sera pas accessible (uniquement le frontend statique).

## Déploiement backend (optionnel)

### Solutions gratuites/payantes

#### 1. Render.com (gratuit + pause après inactivité)

1. Créez un compte sur https://render.com
2. New → Web Service
3. Connectez votre repo GitHub
4. Root Directory: `backend`
5. Build Command: `npm install`
6. Start Command: `npm start`
7. Environment Variables:
   ```
   DB_HOST=<votre_mysql_host>
   DB_USER=<user>
   DB_PASSWORD=<password>
   DB_NAME=glescrocs
   JWT_SECRET=<secret>
   CORS_ORIGIN=https://username.github.io
   ```
8. Deploy

URL : `https://glescrocs-backend.onrender.com`

#### 2. Railway.app (gratuit limité)

Similar à Render, avec MySQL inclus.

#### 3. VPS (Hostinger, OVH, etc.)

**Setup complet** :

```bash
# Connexion SSH
ssh user@votre-ip

# Installer Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Installer MySQL
sudo apt install -y mysql-server

# Cloner le repo
git clone https://github.com/username/GLesCrocs.git
cd GLesCrocs/backend

# Config
cp .env.example .env
nano .env  # Éditez les valeurs

# Installer et seed
npm install
node src/db/seed.js

# Installer PM2 (process manager)
sudo npm install -g pm2
pm2 start src/server.js --name glescrocs
pm2 startup
pm2 save

# Nginx reverse proxy
sudo apt install -y nginx
sudo nano /etc/nginx/sites-available/glescrocs
```

Config Nginx :

```nginx
server {
    listen 80;
    server_name votre-domaine.com;

    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/glescrocs /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# SSL (Certbot)
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d votre-domaine.com
```

### Mettre à jour le frontend

Éditez `frontend/.env` (pour la production) :

```
VITE_API_URL=https://votre-domaine.com
```

Rebuild et redéployez.

## Workflow automatique backend (VPS)

Ajoutez `.github/workflows/deploy-backend.yml` :

```yaml
name: Deploy Backend to VPS

on:
  push:
    branches: [main]
    paths:
      - 'backend/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy via SSH
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd ~/GLesCrocs
            git pull origin main
            cd backend
            npm install
            pm2 restart glescrocs
```

**Secrets requis** :
- `VPS_HOST` : IP ou domaine
- `VPS_USER` : utilisateur SSH
- `VPS_SSH_KEY` : clé privée SSH

## Monitoring

### 1. Uptime monitoring (gratuit)

- https://uptimerobot.com
- Créez un monitor HTTP : `https://votre-domaine.com/api/health`
- Alertes par email si down

### 2. Logs backend

```bash
pm2 logs glescrocs
pm2 monit
```

### 3. Analytics frontend

Ajoutez Google Analytics ou Plausible dans `frontend/index.html` :

```html
<script defer data-domain="yourdomain.com" src="https://plausible.io/js/script.js"></script>
```

## Sécurité production

### Backend

- [ ] JWT_SECRET fort (32+ caractères aléatoires)
- [ ] CORS limité au domaine frontend exact
- [ ] Rate limiting (express-rate-limit)
- [ ] Helmet.js pour headers sécurité
- [ ] HTTPS obligatoire
- [ ] Validation entrées (express-validator)

### Frontend

- [ ] Variables d'environnement pour API_URL
- [ ] Pas de secrets dans le code
- [ ] Content Security Policy
- [ ] Build minifié (`npm run build`)

### Base de données

- [ ] Utilisateur MySQL dédié (pas root)
- [ ] Mot de passe fort
- [ ] Accès localhost uniquement (si backend sur même serveur)
- [ ] Backups automatiques

```bash
# Backup quotidien (crontab)
0 2 * * * mysqldump -u user -ppassword glescrocs > /backups/glescrocs_$(date +\%Y\%m\%d).sql
```

## Support

Pour toute question :
- Ouvrez une issue GitHub
- Consultez la doc : `docs/QUICKSTART.md`
