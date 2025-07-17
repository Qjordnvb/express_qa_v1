# 1. Usa la imagen oficial de Playwright (trae Node.js y navegadores listos)
FROM mcr.microsoft.com/playwright:v1.52.0-jammy

# 2. Establece el directorio de trabajo
WORKDIR /app

# 3. Copia primero solo package.json y package-lock.json para aprovechar la cache de Docker
COPY package.json package-lock.json ./

# 4. Instala dependencias
RUN npm install

# 5. Copia el resto del código
COPY . .

# 6. (Opcional) Permite que otros usuarios escriban en los directorios de resultados y reportes.
RUN mkdir -p /app/test-results /app/playwright-report /app/snapshots \
    && chmod -R 777 /app/test-results /app/playwright-report /app/snapshots

# 7. Comando por defecto: ejecuta los tests (se puede sobreescribir desde Docker Compose)
CMD ["npx", "playwright", "test"]
