# 📦 Dossier Assets - Images & Médias

## Structure

```
asset/
├── Images/              # Dossier images existant
│   ├── logo.png         # Logo restaurant
│   └── ...
└── menu/                # À créer - Images plats
    ├── sushi.jpg        # Plat Sushi
    ├── ramen.jpg        # Plat Ramen
    ├── donburi.jpg      # Plat Donburi
    └── miso.jpg         # Soupe Miso
```

## 📝 Guide images menu

### Dimensions recommandées
- **Largeur**: 600px minimum
- **Hauteur**: 400px minimum (ratio 3:2)
- **Format**: JPG ou PNG
- **Taille**: < 200KB chaque

### Noms de fichiers (frontend/src/pages/Client.jsx)
```javascript
const imageMap = {
  'Sushi Mix 10p': 'sushi.jpg',
  'Ramen Shoyu': 'ramen.jpg',
  'Donburi Poulet Teriyaki': 'donburi.jpg',
  'Soupe Miso': 'miso.jpg'
};
```

Si le nom du plat ne correspond pas, un placeholder emoji s'affiche (👨‍🍳).

## 🔧 Ajouter une nouvelle image

1. **Placer l'image** : `asset/menu/monplat.jpg`
2. **Mapper le nom** : Ajouter dans `imageMap` :
```javascript
'Nom du plat dans DB': 'monplat.jpg'
```
3. **Relancer** : `npm run dev`

## 🚫 Image manquante?
- Format sera: `/assets/menu/filename.jpg`
- Le fallback affiche un emoji 👨‍🍳
- Pas de crash, juste placeholder

## 🎨 Optimisation images

```bash
# Avec ImageMagick (optionnel)
mogrify -resize 600x400 *.jpg
mogrify -quality 85 *.jpg
```

---

**Note**: Images sont servies depuis `/asset/` en production.
Mettez à jour les chemins si votre serveur change d'architecture.
