# Utilisez une image PHP officielle avec Apache
FROM php:8.2-apache

# Installation des dépendances système
RUN apt-get update && apt-get install -y \
    libpng-dev \
    libonig-dev \
    libxml2-dev \
    zip \
    unzip \
    curl \
    nano \
    nodejs \
    npm

# Nettoyage
RUN apt-get clean && rm -rf /var/lib/apt/lists/*

# Installation des extensions PHP requises par Laravel
RUN docker-php-ext-install pdo_mysql mbstring exif pcntl bcmath gd

# Activation du module mod_rewrite pour Apache
RUN a2enmod rewrite

# Configuration du DocumentRoot VHOST
ENV APACHE_DOCUMENT_ROOT /var/www/html/public
RUN sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/sites-available/*.conf
RUN sed -ri -e 's!/var/www/!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/apache2.conf /etc/apache2/conf-available/*.conf

# Copier le code source de l'application
COPY . /var/www/html

# Définir le dossier de travail
WORKDIR /var/www/html

# Installer Composer globalement
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Création du script d'initialisation pour configurer l'APP en production au démarrage
RUN echo '#!/bin/bash\n\
composer install --no-dev --optimize-autoloader\n\
npm install\n\
npm run build\n\
php artisan key:generate --force\n\
php artisan migrate --force\n\
php artisan db:seed --force\n\
php artisan optimize:clear\n\
php artisan config:cache\n\
php artisan route:cache\n\
php artisan view:cache\n\
chmod -R 775 storage bootstrap/cache\n\
chown -R www-data:www-data /var/www/html\n\
apache2-foreground' > /usr/local/bin/start-container && \
    chmod +x /usr/local/bin/start-container

# Exposer le port par défaut Railway
EXPOSE 80

# Forcer le port apache
RUN echo "Listen 80" > /etc/apache2/ports.conf

# Lancer via notre script
CMD ["start-container"]
