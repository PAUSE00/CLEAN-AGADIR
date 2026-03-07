# 🗑️ VillePropre v4 — Système de Collecte Agadir
**Stack : Laravel 11 · Inertia.js · React 18 · Leaflet · Tailwind-like CSS**

---

## ⚡ Installation rapide (pour demain)

### 1. Créer le projet Laravel
```bash
composer create-project laravel/laravel villepropre-app
cd villepropre-app
```

### 2. Installer Inertia (côté serveur)
```bash
composer require inertiajs/inertia-laravel
php artisan inertia:middleware
```
Ajouter `\App\Http\Middleware\HandleInertiaRequests::class` dans `bootstrap/app.php`.

### 3. Copier les fichiers de ce projet
Copiez tous les fichiers du dossier `villepropre/` dans votre projet Laravel :
```
app/Http/Controllers/     → Controllers
app/Models/               → Models
app/Services/VrpService.php
database/migrations/      → Migrations
database/seeders/         → Seeders
resources/js/Pages/       → Pages React
resources/js/app.jsx
resources/views/app.blade.php
routes/web.php
vite.config.js
package.json
```

### 4. Configurer la base de données (.env)
```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=villepropre
DB_USERNAME=root
DB_PASSWORD=

APP_URL=http://localhost:8000
```

### 5. Migrations et Seeder
```bash
php artisan migrate:fresh --seed
```
Ceci va :
- Créer les tables (collection_points, trucks, routes, iot_readings, collection_logs)
- Insérer les **833 points réels d'Agadir** depuis OSM
- Créer une flotte de **8 camions** par défaut

### 6. Installer les dépendances JS
```bash
npm install
npm run dev
```

### 7. Lancer le serveur
```bash
php artisan serve
```
Ouvrir **http://localhost:8000**

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Browser (React)                     │
│  Dashboard.jsx — Map Leaflet + Tabs + Formulaires    │
└──────────────────────┬──────────────────────────────┘
                       │ Inertia.js (XHR/fetch)
┌──────────────────────▼──────────────────────────────┐
│                 Laravel 11 (PHP)                     │
│  DashboardController → Inertia::render('Dashboard') │
│  Api/VrpController   → POST /api/vrp/optimize       │
│  Api/IoTController   → POST /api/iot/simulate       │
│  Api/CollectionPoint → GET  /api/points             │
└──────────────────────┬──────────────────────────────┘
                       │ Eloquent ORM
┌──────────────────────▼──────────────────────────────┐
│              MySQL / SQLite Database                  │
│  collection_points · trucks · routes                 │
│  iot_readings · collection_logs                      │
└─────────────────────────────────────────────────────┘
```

## 🔑 Fonctionnalités clés

| Fonctionnalité | Détail |
|---|---|
| **Carte interactive** | Leaflet dark mode, 833 points Agadir réels |
| **VRP multi-algo** | Greedy, 2-opt, Tabu Search, K-Means |
| **IoT simulation** | Niveaux dynamiques, alertes, priorités |
| **Base de données** | PostgreSQL/MySQL avec 5 tables relationnelles |
| **API REST** | 8 endpoints JSON complets |
| **Flotte** | CRUD camions avec capacité et type de déchet |
| **Historique** | Routes sauvegardées en BDD avec logs |

## 📡 API Endpoints

```
GET  /api/points              → Liste des points de collecte
POST /api/points              → Ajouter un point
GET  /api/trucks              → Liste des camions
POST /api/trucks              → Ajouter un camion
DELETE /api/trucks/{id}       → Supprimer un camion
POST /api/vrp/optimize        → Lancer optimisation VRP
GET  /api/vrp/routes          → Historique des routes
POST /api/iot/simulate        → Tick simulation IoT
GET  /api/iot/status          → Statut capteurs
POST /api/iot/reset           → Réinitialiser niveaux
```

## 🚀 Pour aller plus loin (après la soutenance)

1. **Routing réel** → OSRM ou GraphHopper sur réseau routier Agadir
2. **WebSockets** → Laravel Reverb pour IoT temps réel
3. **Auth** → Roles : Admin, Superviseur, Chauffeur
4. **App mobile** → PWA pour chauffeurs (React + Leaflet)
5. **Rapports** → Export PDF des tournées journalières
