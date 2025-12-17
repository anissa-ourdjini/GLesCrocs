# 🤖 Estimateur IA — Documentation technique

## Concept

L'estimateur calcule le temps d'attente pour une commande en tenant compte de plusieurs facteurs dynamiques. C'est une IA simple basée sur des règles et des statistiques.

## Algorithme

### Formule générale

```
Temps_estimé = (Temps_base × Facteur_backlog × Facteur_service) ÷ Postes_parallèles
```

Avec un minimum garanti de **120 secondes** (2 minutes).

### 1. Temps de base

Somme pondérée par quantité :

```javascript
temps_base = Σ (plat.avg_prep_seconds × quantité)
```

Exemple :
- Ramen (540s) × 1 = 540s
- Sushi (420s) × 2 = 840s
- **Total : 1380s (23 min)**

### 2. Facteur backlog

Plus il y a de commandes en attente, plus le temps augmente :

```javascript
commandes_devant = COUNT(orders WHERE id < current_order AND status IN ('VALIDATED','PREPARING','READY'))
facteur = 1 + min(0.05 × commandes_devant, 2.0)
```

- **+5% par commande** devant
- **Maximum +200%** (facteur 3.0)

Exemples :
- 0 commandes → ×1.0
- 3 commandes → ×1.15 (+15%)
- 10 commandes → ×1.5 (+50%)
- 40+ commandes → ×3.0 (+200%, plafond)

### 3. Facteur service (heures de pointe)

Période de rush = préparations plus lentes :

```javascript
heure = date.getHours()
if ((12 ≤ heure < 14) || (19 ≤ heure < 22)) {
  facteur = 1.2  // +20%
} else {
  facteur = 1.0
}
```

### 4. Parallélisation cuisine

Hypothèse : **2 postes de cuisine** travaillent simultanément.

```javascript
temps_final = temps_estimé ÷ 2
```

Cela réduit de moitié le temps théorique.

## Exemple complet

**Commande :** Ramen (540s) + Donburi (420s) à 13h00

**Calcul :**
1. Temps base : 540 + 420 = **960s**
2. Backlog : 5 commandes devant → ×1.25
   - 960 × 1.25 = **1200s**
3. Service (13h = rush) → ×1.2
   - 1200 × 1.2 = **1440s**
4. Parallélisation ÷ 2
   - 1440 ÷ 2 = **720s**
5. **Résultat : 12 minutes**

## Amélioration future (ML)

Pour passer à un vrai ML :

### Données à collecter

```sql
CREATE TABLE prep_history (
  order_id INT,
  plat_id INT,
  quantite INT,
  heure_validation TIMESTAMP,
  heure_pret TIMESTAMP,
  duree_reelle_seconds INT,
  jour_semaine ENUM('lundi','mardi',...),
  service ENUM('midi','soir','hors_service')
);
```

### Modèle de régression

**Features (X) :**
- `nombre_plats` (quantité totale)
- `complexite_moyenne` (avg_prep_seconds moyen)
- `commandes_en_cours`
- `heure` (0-23)
- `jour_semaine` (encodé one-hot)
- `service` (midi/soir/autre)

**Target (y) :**
- `duree_reelle_seconds`

**Algorithme :** Random Forest Regressor ou Gradient Boosting

```python
from sklearn.ensemble import RandomForestRegressor

model = RandomForestRegressor(n_estimators=100)
model.fit(X_train, y_train)

# Prédiction
temps_estime = model.predict([[nb_plats, complexite, backlog, heure, ...]])
```

### Entraînement continu

Chaque commande servie alimente le modèle :

```javascript
// Après markServed()
const dureeReelle = (served_at - validated_at) / 1000;
await pool.query('INSERT INTO prep_history (...) VALUES (...)', [orderId, dureeReelle, ...]);

// Réentraîner le modèle chaque nuit (cron job)
```

## Métriques de qualité

Pour évaluer l'estimateur :

```sql
SELECT 
  AVG(ABS(estimated_wait_seconds - actual_duration)) AS mae,
  SQRT(AVG(POW(estimated_wait_seconds - actual_duration, 2))) AS rmse
FROM (
  SELECT 
    estimated_wait_seconds,
    TIMESTAMPDIFF(SECOND, validated_at, served_at) AS actual_duration
  FROM orders
  WHERE status = 'SERVED' AND validated_at IS NOT NULL
) AS stats;
```

- **MAE** (Mean Absolute Error) : écart moyen en secondes
- **RMSE** (Root Mean Square Error) : pénalise les gros écarts

**Objectif :** MAE < 120s (±2 minutes)

## Intégration Python ML (optionnel)

### Backend hybride

```javascript
// routes/orders.js
import { exec } from 'child_process';

async function estimateWithML(orderId) {
  return new Promise((resolve) => {
    exec(`python ml/predict.py ${orderId}`, (err, stdout) => {
      if (err) return resolve(estimateWaitSecondsForOrder(orderId)); // fallback
      resolve(parseInt(stdout.trim()));
    });
  });
}
```

### Script Python

```python
# ml/predict.py
import sys
import joblib
import mysql.connector

order_id = int(sys.argv[1])
model = joblib.load('ml/model.pkl')

# Charger features depuis MySQL
conn = mysql.connector.connect(host='localhost', user='root', database='glescrocs')
cursor = conn.cursor()
cursor.execute("SELECT ... FROM orders WHERE id=%s", (order_id,))
features = cursor.fetchone()

# Prédiction
prediction = model.predict([features])[0]
print(int(prediction))
```

## Configuration dynamique

Permettre d'ajuster les facteurs :

```sql
CREATE TABLE estimator_config (
  key VARCHAR(50) PRIMARY KEY,
  value FLOAT
);

INSERT INTO estimator_config VALUES
  ('backlog_increment', 0.05),
  ('backlog_max', 2.0),
  ('service_rush_factor', 1.2),
  ('parallel_posts', 2);
```

Charger au démarrage :

```javascript
const config = await pool.query('SELECT key, value FROM estimator_config');
const settings = Object.fromEntries(config[0].map(r => [r.key, r.value]));
```

## Conclusion

L'estimateur actuel est **simple mais efficace** pour un MVP. Pour aller plus loin :
1. Collecter des données réelles pendant 2-4 semaines
2. Entraîner un modèle ML (Random Forest)
3. A/B tester vs algorithme actuel
4. Déployer le meilleur modèle
