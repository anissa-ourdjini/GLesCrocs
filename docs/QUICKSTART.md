# 🚀 Guide de démarrage GLesCrocs

## Avant de commencer

✅ Backend et frontend installés  
✅ Vérifiez que WAMP est démarré (icône verte)  
✅ MySQL actif sur port 3306

## Étape 1 : Créer la base de données

Ouvrez phpMyAdmin (http://localhost/phpmyadmin) ou MySQL CLI :

```sql
CREATE DATABASE glescrocs;
```

## Étape 2 : Initialiser le schéma et les données

```powershell
cd C:\wamp64\www\GLesCrocs\backend
node src/db/seed.js
```

Vous devriez voir :
```
Admin seed: admin@demo.local / Admin@123
Menu seed done
```

## Étape 3 : Démarrer le backend

**Terminal 1** :
```powershell
cd C:\wamp64\www\GLesCrocs\backend
npm run dev
```

Attendez : `API listening on http://localhost:4000`

## Étape 4 : Démarrer le frontend

**Terminal 2** :
```powershell
cd C:\wamp64\www\GLesCrocs\frontend
npm run dev
```

Ouvrez : http://localhost:5173

## 🎮 Utilisation

### Vue Client (pour les clients)
1. Consultez le menu du jour
2. Ajoutez des plats au panier
3. Cliquez "Commander"
4. Notez votre numéro estimé
5. Entrez-le dans le champ pour suivre votre commande en temps réel

### Vue Admin (pour le personnel)
1. Cliquez "Vue Admin"
2. Connectez-vous : `admin@demo.local` / `Admin@123`
3. Validez les commandes → elles reçoivent un numéro de ticket
4. Marquez "Prêt" quand le plat est prêt
5. Marquez "Servi" quand le client récupère

## 🔧 Dépannage

### Le backend ne démarre pas
- Vérifiez MySQL actif : `mysql -u root -e "SHOW DATABASES;"`
- Vérifiez `.env` : credentials MySQL corrects
- Port 4000 libre : `netstat -ano | findstr :4000`

### Le frontend ne charge pas
- Backend démarré ?
- `VITE_API_URL` dans `frontend/.env` = `http://localhost:4000`

### Socket.IO ne se connecte pas
- Inspectez console navigateur (F12)
- Vérifiez CORS : `CORS_ORIGIN=http://localhost:5173` dans `backend/.env`

## 📱 Accès mobile (réseau local)

1. Trouvez votre IP : `ipconfig` → IPv4 (ex: 192.168.1.50)
2. Modifiez `frontend/.env` :
   ```
   VITE_API_URL=http://192.168.1.50:4000
   ```
3. Rebuild : `npm run build` puis `npm run preview -- --host`
4. Accès mobile : `http://192.168.1.50:4173`

## 🎯 Test complet du flux

1. **Client** : Commandez "Ramen Shoyu x2"
2. **Admin** : Validez la commande → ticket #1 créé
3. **Client** : Entrez "1" pour suivre → estimation ~9 min
4. **Admin** : Marquez "Prêt"
5. **Client** : Notification verte "Prêt à récupérer"
6. **Admin** : Marquez "Servi" → client #1 disparaît

## 📊 Estimateur IA

L'algorithme considère :
- **Temps base** : somme (temps_préparation × quantité) par plat
- **Backlog** : +5% par commande devant (max +200%)
- **Service** : x1.2 si rush (12h-14h ou 19h-22h)
- **Postes cuisine** : ÷2 (parallélisation)
- **Minimum** : 2 minutes

Exemple :
- Ramen (540s) + Sushi (420s) = 960s base
- 3 commandes devant → x1.15
- Service midi → x1.2
- 2 postes → ÷2
- = **~11 minutes**

## 🔐 Production

Avant déploiement :
- Changez `JWT_SECRET` (backend/.env)
- Utilisez mdp fort pour admin
- Configurez HTTPS
- Limitez CORS à votre domaine
