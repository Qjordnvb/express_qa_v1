# Visionary QA Framework 🚀

## Descripción

Este repositorio contiene el código fuente de un framework de automatización de pruebas de última generación. Construido con **TypeScript**, **Playwright** y **Docker**, este proyecto tiene como objetivo crear un ecosistema de pruebas robusto, escalable y portátil.

El objetivo final es evolucionar hacia un framework impulsado por Inteligencia Artificial capaz de realizar pruebas de forma más autónoma e inteligente.

## Tecnologías Clave

- **Lenguaje:** TypeScript
- **Framework de Pruebas:** Playwright
- **Entorno de Ejecución:** Node.js
- **Containerización:** Docker

---

## Requisitos Previos

El único requisito para este proyecto es tener **Docker Engine** instalado y en ejecución.

- **Versión Recomendada:** Se recomienda usar una versión de Docker Engine `20.10.0` o superior para evitar problemas de compatibilidad. Puedes verificar tu versión con el comando:
  ```bash
  docker --version
  ```

### Opciones de Instalación de Docker

#### Opción 1: Docker Desktop (Recomendado para macOS y Windows)

La forma más sencilla de obtener Docker en sistemas de escritorio es a través de Docker Desktop. Incluye el motor de Docker, el cliente de línea de comandos y una interfaz gráfica.

- [Descargar Docker Desktop](https://www.docker.com/products/docker-desktop/)

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

Este comando inicia un contenedor a partir de la imagen, ejecuta las pruebas y conecta las carpetas clave (reportes, tests, snapshots y resultados de tests) del contenedor a tu máquina local para que puedas ver los resultados.

```bash
# Para macOS / Linux
docker run --rm -it \
  -v $(pwd)/playwright-report:/app/playwright-report \
  -v $(pwd)/tests:/app/tests \
  -v $(pwd)/snapshots:/app/snapshots \
  -v $(pwd)/test-results:/app/test-results \
  express_qa_v1

# Para Windows (Command Prompt)
docker run --rm -it ^
  -v %cd%/playwright-report:/app/playwright-report ^
  -v %cd%/tests:/app/tests ^
  -v %cd%/snapshots:/app/snapshots ^
  -v %cd%/test-results:/app/test-results ^
  express_qa_v1
```

#### 3. Ver el Reporte de Pruebas

Una vez que el comando anterior termine, se habrán actualizado las carpetas `playwright-report/` y `test-results/` en tu proyecto. Para ver el reporte HTML interactivo, ejecuta:

```bash
npx playwright show-report
```

_(Si el puerto por defecto está en uso, puedes especificar otro: `npx playwright show-report --port 9324`)_

## Estrategia de Pruebas y Fiabilidad

### Reintentos en CI

Para mejorar la estabilidad y fiabilidad de nuestra suite de pruebas en el entorno de Integración Continua, hemos implementado una estrategia de reintentos. Las pruebas que fallen en CI se reintentarán automáticamente hasta 2 veces antes de ser marcadas como fallidas.

- **Localmente (`docker run ...`):** Los reintentos están **desactivados** (`retries: 0`) para permitir una depuración más rápida y obtener feedback inmediato sobre los fallos.
- **En CI (GitHub Actions):** Los reintentos están **activados** (`retries: 2`) para mitigar fallos intermitentes (o "flaky tests") causados por problemas temporales de red o de entorno.

Esta configuración se gestiona en `playwright.config.ts` y se activa automáticamente gracias a la variable de entorno `CI` que provee GitHub Actions.

## Ecosistema de Pruebas con IA 🤖

Este framework incluye un **orquestador de pruebas impulsado por IA** diseñado para acelerar drásticamente la creación de nuevos tests. El sistema puede tomar una historia de usuario y generar un Page Object y un archivo de prueba de Playwright completamente funcionales.

### Flujo de Trabajo de Generación de Pruebas

1.  **Crear un Caso de Prueba (`.testcase.json`)**
    - En la carpeta `orchestrator/user-stories/`, crea un archivo `.json` con la siguiente estructura:
      ```json
      {
        "name": "Nombre Descriptivo del Test",
        "path": "/ruta/de/la/pagina/a/probar",
        "userStory": "La historia de usuario en lenguaje natural que describe el flujo a probar."
      }
      ```
    - El `path` se combinará con la `baseURL` definida en `playwright.config.ts`.

2.  **Configurar la Clave de API**
    - Crea un archivo `.env` en la raíz del proyecto.
    - Añade tu clave de API de Google AI:
      ```
      GOOGLE_API_KEY="TU_API_KEY_AQUI"
      ```
    - Asegúrate de que el archivo `.env` esté listado en tu `.gitignore`.

3.  **Ejecutar el Orquestador**
    - Lanza el proceso completo con el siguiente comando:
      ```bash
      npm run orchestrate -- <ruta/al/archivo.testcase.json>
      ```
    - **Ejemplo:**
      ```bash
      npm run orchestrate -- orchestrator/user-stories/guest-checkout.testcase.json
      ```

### El Ciclo de Retroalimentación (Human-in-the-Loop)

La IA proporciona una primera versión del código. Si el test generado falla debido a selectores incorrectos (un "fallo de precondición"), este es el flujo de trabajo para refinarlo:

1.  **Analizar el Error:** Revisa la salida de la consola y el reporte de Playwright para identificar qué selector falló.
2.  **Corregir el "Plano":** Abre el archivo `.ai-assets.json` correspondiente a tu caso de prueba. Este archivo contiene los "planos" que la IA generó. Localiza el selector incorrecto y corrígelo con el valor correcto que puedes obtener usando el inspector del navegador o de Playwright.
3.  **Re-ejecutar:** Vuelve a lanzar el comando `npm run orchestrate`. El sistema ahora usará tu plano corregido para generar el código, y la prueba debería pasar.

---

## Estructura del Proyecto

```
/
├── pages/         # Clases del Page Object Model (POM) que representan las páginas.
├── tests/         # Los archivos de prueba (`.spec.ts`).
├── snapshots/     # Imágenes de referencia (snapshots) para las pruebas visuales.
├── test-results/  # Resultados detallados de las ejecuciones de prueba (incluye diffs visuales).
├── utils/         # Funciones de ayuda y utilidades reutilizables.
├── .dockerignore  # Especifica qué archivos ignorar al construir la imagen de Docker.
├── Dockerfile     # La "receta" para construir nuestro entorno de pruebas en un contenedor.
└── playwright.config.ts # Archivo de configuración principal de Playwright.
```
