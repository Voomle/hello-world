# Étape 1: Build (si nécessaire, pour l'instant simple copie)
FROM node:18-alpine AS base

# Créer le répertoire de l'application
WORKDIR /usr/src/app

# Variables d'environnement par défaut (peuvent être surchargées au lancement)
ENV NODE_ENV=production
ENV PORT=5000 
# La DATABASE_URL sera fournie au moment de l'exécution du conteneur

# Copier package.json et package-lock.json (ou yarn.lock)
COPY package*.json ./

# Installer les dépendances de production uniquement
# Utiliser npm ci pour une installation propre basée sur package-lock.json
RUN npm ci --omit=dev 

# Créer le répertoire pour les fichiers statiques du front-end
RUN mkdir -p public_root

# Copier les fichiers statiques de la racine du projet (../) dans public_root/
COPY ../index.html ./public_root/
COPY ../style.css ./public_root/
COPY ../api.js ./public_root/
COPY ../auth.js ./public_root/
COPY ../ui.js ./public_root/
COPY ../app.js ./public_root/ 

# Copier le reste du code du serveur (contenu de server/)
# Le .dockerignore s'assurera que node_modules local, .git etc. ne sont pas copiés
COPY . .

# Exposer le port sur lequel l'application écoute
EXPOSE ${PORT}

# Commande pour démarrer l'application
# app.js est le point d'entrée de notre serveur Express
CMD [ "node", "app.js" ]

# Optionnel: Pour une meilleure sécurité, créer un utilisateur non-root
# RUN addgroup -S appgroup && adduser -S appuser -G appgroup
# USER appuser
