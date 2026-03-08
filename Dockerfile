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

# Pré-compiler les assets (ViteJS / React) pendant le build de l'image Docker plutôt qu'au runtime
RUN composer install --no-dev --optimize-autoloader && \
    npm install && \
    npm run build

# Création du script d'initialisation pour configurer l'APP en production au démarrage
RUN echo '#!/bin/bash\n\
    echo "ServerName localhost" >> /etc/apache2/apache2.conf\n\
    a2dismod mpm_event mpm_worker || true\n\
    a2enmod mpm_prefork || true\n\
    sed -i "s/Listen 80/Listen ${PORT:-80}/g" /etc/apache2/ports.conf\n\
    sed -i "s/<VirtualHost \\*:80>/<VirtualHost \\*:${PORT:-80}>/g" /etc/apache2/sites-available/000-default.conf\n\
    echo "Waiting for MySQL database to be ready..."\n\
    sleep 5\n\
    chmod -R 775 storage bootstrap/cache public/build\n\
    chown -R www-data:www-data /var/www/html\n\
    php artisan key:generate --force || true\n\
    php artisan migrate --force\n\
    php artisan db:seed --force || true\n\
    php artisan optimize:clear\n\
    php artisan config:cache\n\
    php artisan route:cache\n\
    php artisan view:cache\n\
    source /etc/apache2/envvars\n\
    exec apache2 -D FOREGROUND' > /usr/local/bin/start-container && \
    chmod +x /usr/local/bin/start-container

# Exposer le port par défaut (optionnel mais utile pour la doc)
EXPOSE 80

# Forcer le port apache à utiliser la variable PORT de Railway (ou 80 par défaut)


# Lancer via notre script
CMD ["start-container"]
