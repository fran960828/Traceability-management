#!/bin/bash
set -e  # Detiene el script si algo falla

echo "Instalando dependencias del sistema..."

apt-get update \
  && apt-get -y install netcat-traditional gcc postgresql \
  && apt-get clean

echo "Dependencias instaladas con éxito."