# Paso 1: Usar la imagen oficial de Playwright que ya incluye Node.js y todas las dependencias del sistema.
FROM mcr.microsoft.com/playwright:v1.52.0-jammy

# Paso 2: Establecer el directorio de trabajo dentro del contenedor.
WORKDIR /app

# Paso 3: Copiar los archivos de dependencias.
COPY package.json ./
COPY package-lock.json ./

# Paso 4: Instalar las dependencias de nuestro proyecto (selenium, etc. si las hubiera).
RUN npm install

# Paso 5: Copiar todo el código de nuestro framework al contenedor.
COPY . .

# Paso 6: Comando por defecto que se ejecutará cuando iniciemos el contenedor.
CMD ["npx", "playwright", "test"]
