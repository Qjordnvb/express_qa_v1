# Express QA Framework 🚀

## Descripción

Este repositorio contiene el código fuente de un framework de automatización de pruebas de última generación. Construido con **TypeScript**, **Playwright** y **Docker**, este proyecto tiene como objetivo crear un ecosistema de pruebas robusto, escalable y portátil.

El objetivo final es evolucionar hacia un framework impulsado por Inteligencia Artificial capaz de realizar pruebas de forma más autónoma e inteligente.

## Tecnologías Clave

* **Lenguaje:** TypeScript
* **Framework de Pruebas:** Playwright
* **Entorno de Ejecución:** Node.js
* **Containerización:** Docker

---

## Requisitos Previos

El único requisito para este proyecto es tener **Docker Engine** instalado y en ejecución.

* **Versión Recomendada:** Se recomienda usar una versión de Docker Engine `20.10.0` o superior para evitar problemas de compatibilidad. Puedes verificar tu versión con el comando:
    ```bash
    docker --version
    ```

### Opciones de Instalación de Docker

#### Opción 1: Docker Desktop (Recomendado para macOS y Windows)

La forma más sencilla de obtener Docker en sistemas de escritorio es a través de Docker Desktop. Incluye el motor de Docker, el cliente de línea de comandos y una interfaz gráfica.

* [Descargar Docker Desktop](https://www.docker.com/products/docker-desktop/)

#### Opción 2: Instalación por Consola (Típico para Servidores Linux)

En sistemas Linux, puedes instalar Docker Engine directamente desde la terminal.

1.  **Ejecuta el script de instalación oficial de Docker:**
    ```bash
    curl -fsSL [https://get.docker.com](https://get.docker.com) -o get-docker.sh
    sudo sh get-docker.sh
    ```
2.  **(Recomendado) Añade tu usuario al grupo de Docker** para poder ejecutar comandos de Docker sin `sudo`:
    ```bash
    sudo usermod -aG docker $USER
    ```
    **Importante:** Después de ejecutar este último comando, debes **cerrar la sesión y volver a iniciarla**, o reiniciar tu máquina, para que los cambios de grupo surtan efecto.

---

## Ejecución de las Pruebas

Para ejecutar el conjunto de pruebas completo en un entorno limpio y consistente, sigue estos pasos desde la terminal en la raíz del proyecto.

#### 1. Construir la Imagen de Docker

Este comando crea la imagen del contenedor con todas las dependencias del sistema y del proyecto. Solo necesitas reconstruir la imagen si cambias el `Dockerfile` o las dependencias en `package.json`.

```bash
docker build -t express_qa_v1 .
```

#### 2. Ejecutar las Pruebas

Este comando inicia un contenedor a partir de la imagen, ejecuta las pruebas y conecta la carpeta de reportes del contenedor a tu máquina local para que puedas ver los resultados.

```bash
# Para macOS / Linux
docker run --rm -it -v $(pwd)/playwright-report:/app/playwright-report express_qa_v1

# Para Windows (Command Prompt)
docker run --rm -it -v %cd%/playwright-report:/app/playwright-report express_qa_v1
```

#### 3. Ver el Reporte de Pruebas

Una vez que el comando anterior termine, se habrá creado una carpeta `playwright-report` en tu proyecto. Para ver el reporte HTML interactivo, ejecuta:

```bash
npx playwright show-report
```
*(Si el puerto por defecto está en uso, puedes especificar otro: `npx playwright show-report --port 9324`)*

---
## Estructura del Proyecto

```
/
├── pages/         # Clases del Page Object Model (POM) que representan las páginas.
├── tests/         # Los archivos de prueba (`.spec.ts`).
├── utils/         # Funciones de ayuda y utilidades reutilizables.
├── .dockerignore  # Especifica qué archivos ignorar al construir la imagen de Docker.
├── Dockerfile     # La "receta" para construir nuestro entorno de pruebas en un contenedor.
└── playwright.config.ts # Archivo de configuración principal de Playwright.
```
