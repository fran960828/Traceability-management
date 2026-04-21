#!/bin/bash
set -e  # Detiene el script si algo falla

echo "Instalando dependencias del sistema..."

apt-get update
apt-get -y install \
    netcat-traditional \
    gcc \
    postgresql \
    python3-pip \
    python3-cffi \
    python3-brotli \
    libpango-1.0-0 \
    libharfbuzz0b \
    libpangoft2-1.0-0 \
    libpangocairo-1.0-0

# Limpieza para reducir el peso de la imagen
apt-get clean
rm -rf /var/lib/apt/lists/*

echo "Dependencias instaladas con éxito."