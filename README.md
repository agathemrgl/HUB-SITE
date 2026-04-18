# Mon Hub Personnel

Page centrale qui regroupe tous mes sites web.

## Structure

```
mon-hub/
├── index.html          ← Page centrale (hub)
├── site1/
│   └── index.html      ← Sous-site 1
├── site2/
│   └── index.html      ← Sous-site 2
├── site3/
│   └── index.html      ← Sous-site 3
└── README.md
```

## Ajouter un nouveau site

1. Crée un dossier `mon-nouveau-site/`
2. Copie `site1/index.html` dedans et adapte le contenu
3. Ajoute un lien dans `index.html` :
   ```html
   <li><a href="./mon-nouveau-site/index.html">Mon nouveau site</a></li>
   ```

## Utilisation en local

Ouvre simplement `index.html` dans ton navigateur.

## Déploiement sur GitHub Pages

```bash
cd mon-hub
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/TON_PSEUDO/mon-hub.git
git push -u origin main
```

Ensuite dans les paramètres du repo GitHub :
Settings → Pages → Source → Deploy from branch → main → / (root)

Ton hub sera accessible sur : `https://TON_PSEUDO.github.io/mon-hub/`
