# 🧪 Tests et validation

## Prérequis

- WAMP démarré (icône verte)
- Base `glescrocs` créée et seedée
- Backend sur http://localhost:4000
- Frontend sur http://localhost:5173

## Tests backend (PowerShell)

### 1. Health check

```powershell
Invoke-RestMethod -Uri http://localhost:4000/api/health
```

Attendu : `@{ok=True}`

### 2. Récupérer menu

```powershell
$menu = Invoke-RestMethod -Uri http://localhost:4000/api/menu
$menu | Format-Table -AutoSize
```

Attendu : 4 plats (Sushi, Ramen, Donburi, Miso)

### 3. Login admin

```powershell
$body = @{
    email = "admin@demo.local"
    password = "Admin@123"
} | ConvertTo-Json

$auth = Invoke-RestMethod -Uri http://localhost:4000/api/auth/login -Method POST -Body $body -ContentType 'application/json'
$token = $auth.token
Write-Host "Token: $token"
```

Attendu : JWT token

### 4. Créer une commande

```powershell
$order = @{
    customer_name = "Test PowerShell"
    items = @(
        @{ menu_item_id = 1; quantity = 1 }
        @{ menu_item_id = 2; quantity = 1 }
    )
} | ConvertTo-Json -Depth 3

$result = Invoke-RestMethod -Uri http://localhost:4000/api/orders -Method POST -Body $order -ContentType 'application/json'
$orderId = $result.id
Write-Host "Order ID: $orderId, Estimation: $($result.estimated_wait_seconds)s"
```

Attendu : `id` + `estimated_wait_seconds`

### 5. Valider commande (admin)

```powershell
$headers = @{
    Authorization = "Bearer $token"
}

$validated = Invoke-RestMethod -Uri "http://localhost:4000/api/orders/$orderId/validate" -Method POST -Headers $headers
Write-Host "Ticket: $($validated.ticket_number)"
```

Attendu : `ticket_number` (ex: 1)

### 6. Récupérer file

```powershell
$queue = Invoke-RestMethod -Uri http://localhost:4000/api/orders/queue
Write-Host "En cours: $($queue.currentServing)"
$queue.queue | Format-Table -AutoSize
```

Attendu : Liste des commandes validées

### 7. Marquer prêt

```powershell
$ticket = $validated.ticket_number
Invoke-RestMethod -Uri "http://localhost:4000/api/orders/$ticket/ready" -Method POST -Headers $headers
```

### 8. Marquer servi

```powershell
Invoke-RestMethod -Uri "http://localhost:4000/api/orders/$ticket/served" -Method POST -Headers $headers
```

## Tests frontend (Manuel)

### Vue Client

1. Ouvrir http://localhost:5173
2. ✅ Voir numéro "0" (aucun servi)
3. ✅ Menu visible (4 plats)
4. ✅ Cliquer "+" sur Ramen → panier (1)
5. ✅ Cliquer "Commander" → alert avec estimation
6. ✅ Entrer numéro dans champ → suivre commande

### Vue Admin

1. Cliquer "Vue Admin"
2. ✅ Formulaire login visible
3. ✅ Se connecter : admin@demo.local / Admin@123
4. ✅ Dashboard affiché
5. ✅ File d'attente visible (si commandes)
6. ✅ Menu visible
7. ✅ Bouton "Prêt" sur commandes VALIDATED
8. ✅ Bouton "Servi" sur commandes READY
9. ✅ Cliquer "Servi" → commande disparaît, numéro augmente

### Socket.IO (temps réel)

**Setup** :
1. Ouvrir 2 onglets : `http://localhost:5173`
2. Onglet 1 : Vue Client
3. Onglet 2 : Vue Admin (connecté)

**Test** :
1. Onglet 1 : Commander un plat
2. Onglet 2 : Valider la commande
3. ✅ Onglet 1 : File se met à jour automatiquement (sans refresh)
4. Onglet 2 : Marquer "Prêt"
5. ✅ Onglet 1 : Fond devient vert (notification)

## Tests estimateur IA

### Scénario 1 : Une commande simple

```powershell
$order1 = @{
    items = @(@{ menu_item_id = 4; quantity = 1 })  # Miso Soup (180s)
} | ConvertTo-Json -Depth 3

$r = Invoke-RestMethod -Uri http://localhost:4000/api/orders -Method POST -Body $order1 -ContentType 'application/json'
Write-Host "Estimation: $($r.estimated_wait_seconds)s"
```

Attendu : **120s** (minimum, car 180÷2=90 < 120)

### Scénario 2 : Commande complexe

```powershell
$order2 = @{
    items = @(
        @{ menu_item_id = 1; quantity = 2 }  # Sushi 2x (420s chacun)
        @{ menu_item_id = 2; quantity = 1 }  # Ramen (540s)
    )
} | ConvertTo-Json -Depth 3

$r = Invoke-RestMethod -Uri http://localhost:4000/api/orders -Method POST -Body $order2 -ContentType 'application/json'
Write-Host "Estimation: $($r.estimated_wait_seconds)s (~$([math]::Round($r.estimated_wait_seconds/60))min)"
```

Attendu : **~690s (11-12 min)**  
Calcul : (420×2 + 540) ÷ 2 = 690s

### Scénario 3 : Backlog (5 commandes devant)

```powershell
# Créer 5 commandes
1..5 | ForEach-Object {
    $o = @{ items = @(@{ menu_item_id = 1; quantity = 1 }) } | ConvertTo-Json -Depth 3
    $res = Invoke-RestMethod -Uri http://localhost:4000/api/orders -Method POST -Body $o -ContentType 'application/json'
    Invoke-RestMethod -Uri "http://localhost:4000/api/orders/$($res.id)/validate" -Method POST -Headers @{ Authorization = "Bearer $token" }
}

# 6e commande
$order6 = @{ items = @(@{ menu_item_id = 2; quantity = 1 }) } | ConvertTo-Json -Depth 3
$r = Invoke-RestMethod -Uri http://localhost:4000/api/orders -Method POST -Body $order6 -ContentType 'application/json'
Write-Host "Estimation avec backlog: $($r.estimated_wait_seconds)s"
```

Attendu : **~337s** (facteur backlog ×1.25)  
Calcul : (540 × 1.25) ÷ 2 = 337s

### Scénario 4 : Heure de pointe

```powershell
# Forcer l'heure (modifier temporairement estimator.js)
# serviceWindowFactor() { return 1.2; }

$orderRush = @{ items = @(@{ menu_item_id = 1; quantity = 1 }) } | ConvertTo-Json -Depth 3
$r = Invoke-RestMethod -Uri http://localhost:4000/api/orders -Method POST -Body $orderRush -ContentType 'application/json'
Write-Host "Estimation rush: $($r.estimated_wait_seconds)s"
```

Attendu : **~252s** (facteur rush ×1.2)  
Calcul : (420 × 1.2) ÷ 2 = 252s

## Tests d'intégration (flux complet)

### Script automatique

```powershell
# Configuration
$apiUrl = "http://localhost:4000/api"

# 1. Login admin
$auth = Invoke-RestMethod -Uri "$apiUrl/auth/login" -Method POST -Body (@{email="admin@demo.local";password="Admin@123"}|ConvertTo-Json) -ContentType 'application/json'
$headers = @{ Authorization = "Bearer $($auth.token)" }

# 2. Créer 3 commandes client
Write-Host "`n=== Création commandes ===" -ForegroundColor Cyan
$orders = @()
1..3 | ForEach-Object {
    $o = @{ customer_name="Client $_"; items=@(@{menu_item_id=(Get-Random -Min 1 -Max 4);quantity=1}) } | ConvertTo-Json -Depth 3
    $res = Invoke-RestMethod -Uri "$apiUrl/orders" -Method POST -Body $o -ContentType 'application/json'
    $orders += $res.id
    Write-Host "Commande $($res.id) créée, estimation: $($res.estimated_wait_seconds)s"
}

# 3. Valider toutes
Write-Host "`n=== Validation commandes ===" -ForegroundColor Cyan
$orders | ForEach-Object {
    $v = Invoke-RestMethod -Uri "$apiUrl/orders/$_/validate" -Method POST -Headers $headers
    Write-Host "Commande $_ validée → Ticket #$($v.ticket_number)"
}

# 4. Récupérer file
Write-Host "`n=== File d'attente ===" -ForegroundColor Cyan
$queue = Invoke-RestMethod -Uri "$apiUrl/orders/queue"
Write-Host "En service: $($queue.currentServing)"
$queue.queue | Format-Table ticket_number, status, estimated_wait_seconds

# 5. Marquer 1ère prêt
Write-Host "`n=== Marquer prêt ===" -ForegroundColor Cyan
$first = $queue.queue[0].ticket_number
Invoke-RestMethod -Uri "$apiUrl/orders/$first/ready" -Method POST -Headers $headers
Write-Host "Ticket #$first marqué READY"

# 6. Marquer servi
Write-Host "`n=== Marquer servi ===" -ForegroundColor Cyan
Invoke-RestMethod -Uri "$apiUrl/orders/$first/served" -Method POST -Headers $headers
Write-Host "Ticket #$first marqué SERVED"

# 7. Vérifier file mise à jour
$queue2 = Invoke-RestMethod -Uri "$apiUrl/orders/queue"
Write-Host "`nNouveau numéro en service: $($queue2.currentServing)" -ForegroundColor Green
Write-Host "Tickets restants: $($queue2.queue.Count)"
```

## Tests de charge (optionnel)

### 100 commandes simultanées

```powershell
$jobs = 1..100 | ForEach-Object -Parallel {
    $body = @{
        customer_name = "Load Test $_"
        items = @(@{ menu_item_id = (Get-Random -Min 1 -Max 4); quantity = 1 })
    } | ConvertTo-Json -Depth 3
    
    Invoke-RestMethod -Uri "http://localhost:4000/api/orders" -Method POST -Body $body -ContentType 'application/json'
} -ThrottleLimit 10

Write-Host "Créé $($jobs.Count) commandes"
```

## Validation finale

### Checklist

- [ ] Backend démarre sans erreur
- [ ] Frontend démarre sans erreur
- [ ] Menu s'affiche (4 plats)
- [ ] Commande client fonctionne
- [ ] Estimation retournée (> 120s)
- [ ] Login admin fonctionne
- [ ] Validation commande → ticket généré
- [ ] File d'attente affichée
- [ ] Socket.IO met à jour en temps réel
- [ ] Marquer prêt → fond vert
- [ ] Marquer servi → numéro augmente
- [ ] Estimateur adaptatif (backlog, service)

### Résultat attendu

```
✅ Tous les tests passent
✅ Temps réel fonctionne
✅ Estimateur cohérent
✅ Flux complet OK
```

## Logs de débogage

### Backend

```powershell
# Terminal backend
# Vérifiez ces lignes :
API listening on http://localhost:4000
socket connected <id>
```

### Frontend (Console navigateur F12)

```javascript
// Devrait voir :
Socket connected
```

### MySQL

```sql
-- Vérifier données
SELECT COUNT(*) FROM orders;
SELECT COUNT(*) FROM menu_items;
SELECT * FROM orders WHERE status='VALIDATED';
```

## Dépannage rapide

| Problème | Solution |
|----------|----------|
| Backend ne démarre pas | Vérifier MySQL actif, .env correct |
| 401 Unauthorized | Token expiré, re-login |
| Socket ne connecte pas | CORS mal configuré (.env) |
| Estimation = 120 toujours | Backlog vide, normal pour 1ère commande |
| File vide | Aucune commande validée |

## Performance attendue

- Création commande : < 50ms
- Validation : < 100ms (calcul estimateur)
- Socket.IO latence : < 10ms (local)
- Queue fetch : < 20ms

Testez avec :
```powershell
Measure-Command { Invoke-RestMethod -Uri http://localhost:4000/api/orders/queue }
```
