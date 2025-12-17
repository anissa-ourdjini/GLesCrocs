# Exemples d'appels API — GLesCrocs

Base URL : `http://localhost:4000/api`

## Auth

### Login Admin
```http
POST /auth/login
Content-Type: application/json

{
  "email": "admin@demo.local",
  "password": "Admin@123"
}
```

Réponse :
```json
{
  "token": "eyJhbGc...",
  "user": { "id": 1, "email": "admin@demo.local", "role": "ADMIN" }
}
```

## Menu

### Récupérer le menu
```http
GET /menu
```

### Créer un plat (admin)
```http
POST /menu
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Gyoza 6p",
  "description": "Raviolis japonais frits",
  "price_cents": 650,
  "avg_prep_seconds": 360,
  "active": 1
}
```

### Modifier un plat (admin)
```http
PUT /menu/1
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Sushi Mix 10p",
  "description": "Assortiment sushi premium",
  "price_cents": 1300,
  "avg_prep_seconds": 420,
  "active": 1
}
```

## Commandes

### Récupérer la file
```http
GET /orders/queue
```

Réponse :
```json
{
  "currentServing": 5,
  "queue": [
    {
      "ticket_number": 6,
      "status": "VALIDATED",
      "estimated_wait_seconds": 480
    }
  ]
}
```

### Créer une commande
```http
POST /orders
Content-Type: application/json

{
  "customer_name": "Table 5",
  "items": [
    { "menu_item_id": 1, "quantity": 2 },
    { "menu_item_id": 3, "quantity": 1 }
  ]
}
```

Réponse :
```json
{
  "id": 42,
  "estimated_wait_seconds": 540
}
```

### Valider une commande (admin)
```http
POST /orders/42/validate
Authorization: Bearer <token>
```

Réponse :
```json
{
  "ok": true,
  "ticket_number": 7,
  "estimated_wait_seconds": 600
}
```

### Marquer prêt (admin)
```http
POST /orders/7/ready
Authorization: Bearer <token>
```

### Marquer servi (admin)
```http
POST /orders/7/served
Authorization: Bearer <token>
```

## Socket.IO Events

### Connexion
```javascript
import { io } from 'socket.io-client';
const socket = io('http://localhost:4000');
```

### Écouter les mises à jour
```javascript
// Mise à jour de la file
socket.on('queue_update', () => {
  // Recharger la file
});

// Mise à jour commande
socket.on('order_update', (data) => {
  console.log(data); // { orderId, status, estimated_wait_seconds }
});
```

## Tests curl (PowerShell)

### Login
```powershell
$body = '{"email":"admin@demo.local","password":"Admin@123"}'
$res = Invoke-RestMethod -Uri http://localhost:4000/api/auth/login -Method POST -Body $body -ContentType 'application/json'
$token = $res.token
```

### Créer commande
```powershell
$body = '{"customer_name":"Test","items":[{"menu_item_id":1,"quantity":1}]}'
Invoke-RestMethod -Uri http://localhost:4000/api/orders -Method POST -Body $body -ContentType 'application/json'
```

### Valider (avec token)
```powershell
$headers = @{ Authorization = "Bearer $token" }
Invoke-RestMethod -Uri http://localhost:4000/api/orders/1/validate -Method POST -Headers $headers
```
