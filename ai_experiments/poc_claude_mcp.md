# Prueba de Concepto: Análisis de UI con LLM Multimodal

**ID de Tarea:** E3S3T1
**Fecha:** 10 de junio de 2025

## 1. Objetivo

Validar la capacidad de un modelo de lenguaje grande (LLM) multimodal para analizar una captura de pantalla de una interfaz de usuario, interpretar una historia de usuario y generar un plan de pruebas en formato Gherkin, junto con sugerencias de selectores para un framework de Page Object Model (POM) en Playwright.

## 2. Material de Entrada

### Historia de Usuario

**Como** un usuario curioso,
**Quiero** buscar el término "Playwright" en la página de inicio de Google,
**Para** poder ver una lista de resultados de búsqueda relevantes.
**Y** verificar que el primer resultado contenga un enlace al sitio oficial "playwright.dev".

### Captura de Pantalla de la UI

(Se adjuntará la imagen `images/google-homepage.png` al prompt del LLM).

## 3. Prompt para el Modelo (Model Context Protocol - MCP)

A continuación, se presenta el prompt estructurado que se le proporcionará al LLM.

---

**[INICIO DEL PROMPT]**

**CONTEXTO:**
Eres "Visionary QA", un asistente experto en ingeniería de calidad de software y automatización de pruebas, especializado en el framework Playwright con TypeScript. Estás ayudando a construir un ecosistema de pruebas avanzado. Tu tarea es analizar los requerimientos y los artefactos visuales para generar planes de prueba y esqueletos de código.

**TAREA:**
Analiza la **Historia de Usuario** y la **imagen adjunta** (`google-homepage.png`). Con base en esta información, realiza las siguientes dos acciones:

**ACCIÓN 1: Generar un Plan de Pruebas**
Escribe un plan de pruebas detallado en formato Gherkin (`Feature`, `Scenario`, `Given`, `When`, `Then`). El escenario debe reflejar exactamente los pasos descritos en la historia de usuario.

**ACCIÓN 2: Sugerir Selectores para el Page Object Model (POM)**
Identifica los elementos clave de la UI necesarios para ejecutar el escenario anterior. Para cada elemento, proporciona una lista de posibles selectores de Playwright, ordenados del más robusto al más frágil (priorizando selectores user-facing como `getByRole`, `getByLabel`, `getByText`). El formato de salida debe ser un objeto JSON.

**REQUERIMIENTOS DE FORMATO:**
-   **Plan de Pruebas:** Usa sintaxis Gherkin estándar.
-   **Sugerencia de Selectores:** Proporciona un bloque de código JSON válido.

**HISTORIA DE USUARIO:**
Como un usuario curioso, quiero buscar el término "Playwright" en la página de inicio de Google, para poder ver una lista de resultados de búsqueda relevantes, y verificar que la página de resultados contenga un enlace al sitio oficial "playwright.dev".

**[FIN DEL PROMPT]**

---

## 4. Resultados Generados por el LLM

Analizando la imagen de la página de inicio de Google y la historia de usuario proporcionada, procedo a generar el plan de pruebas y los selectores sugeridos.
ACCIÓN 1: Plan de Pruebas en GherkinPlan de Pruebas - Búsqueda en GoogleDocument # Plan de Pruebas - Búsqueda de Playwright en Google

## Feature: Búsqueda en Google
Como un usuario curioso
Quiero buscar términos en la página de inicio de Google
Para poder obtener resultados de búsqueda relevantes

### Scenario: Buscar "PlaywrighACCIÓN 2: Selectores Sugeridos para Page Object Model (POM)Selectores POM - Página de GoogleCode {
  "googleHomePage": {
    "logo": {
      "description": "Logo principal de Google",
      "selectors": [
        "page.getByRole('img', { name: 'Google' })",
        "page.getByAltText('Google')",
        "page.locator('img[alt=\"Google\"]')",
   Resumen de Análisis
He generado un plan de pruebas completo y una guía de selectores basados en la imagen de Google que proporcionaste.
Puntos clave del análisis:

Plan de Pruebas: Incluye el escenario principal solicitado y escenarios adicionales para una cobertura más completa de la funcionalidad de búsqueda.
Selectores POM: Están organizados por robustez, priorizando:

Selectores user-facing (getByRole, getByText, getByLabel)
Selectores semánticos (getByAltText, getByPlaceholder)
Selectores de atributos estables (name, aria-label)
Selectores CSS como último recurso


Consideraciones especiales:

La página está en español, por lo que los selectores incluyen texto en español
Se incluyen selectores alternativos para elementos que pueden cambiar dinámicamente
Se consideran tanto elementos visibles como elementos que aparecen condicionalmente (como sugerencias de búsqueda)



Los selectores están diseñados para ser resilientes a cambios en el DOM y seguir las mejores prácticas de Playwright para pruebas automatizadas estables.*

### 4.1. Plan de Pruebas (Gherkin)

# Plan de Pruebas - Búsqueda de Playwright en Google

## Feature: Búsqueda en Google
Como un usuario curioso
Quiero buscar términos en la página de inicio de Google
Para poder obtener resultados de búsqueda relevantes

### Scenario: Buscar "Playwright" y verificar enlace al sitio oficial
**Given** que estoy en la página de inicio de Google
**When** ingreso "Playwright" en el campo de búsqueda
**And** presiono el botón "Buscar con Google" o presiono Enter
**Then** debo ser redirigido a la página de resultados de búsqueda
**And** debo ver una lista de resultados de búsqueda relevantes
**And** debo encontrar un enlace al sitio oficial "playwright.dev" en los resultados

### Scenario Outline: Validar elementos de la página de inicio
**Given** que estoy en la página de inicio de Google
**Then** debo ver el logo de Google
**And** debo ver el campo de búsqueda vacío
**And** debo ver el botón "Buscar con Google"
**And** debo ver el botón "Voy a tener suerte"

### Scenario: Validar funcionalidad del botón "Voy a tener suerte"
**Given** que estoy en la página de inicio de Google
**When** ingreso "Playwright" en el campo de búsqueda
**And** hago clic en el botón "Voy a tener suerte"
**Then** debo ser redirigido directamente al primer resultado de búsqueda

### Scenario: Validar sugerencias de búsqueda (si están disponibles)
**Given** que estoy en la página de inicio de Google
**When** comienzo a escribir "Play" en el campo de búsqueda
**Then** pueden aparecer sugerencias de búsqueda en un dropdown
**And** puedo seleccionar una sugerencia haciendo clic en ella

### 4.2. Sugerencia de Selectores (JSON)

{
  "googleHomePage": {
    "logo": {
      "description": "Logo principal de Google",
      "selectors": [
        "page.getByRole('img', { name: 'Google' })",
        "page.getByAltText('Google')",
        "page.locator('img[alt=\"Google\"]')",
        "page.locator('.lnXdpd')",
        "page.locator('img[src*=\"googlelogo\"]')"
      ]
    },
    "searchBox": {
      "description": "Campo de entrada de búsqueda principal",
      "selectors": [
        "page.getByRole('combobox', { name: 'Buscar' })",
        "page.getByRole('textbox', { name: 'Buscar' })",
        "page.getByLabel('Buscar')",
        "page.getByPlaceholder('Buscar')",
        "page.locator('input[name=\"q\"]')",
        "page.locator('textarea[name=\"q\"]')",
        "page.locator('.gLFyf')"
      ]
    },
    "searchButton": {
      "description": "Botón 'Buscar con Google'",
      "selectors": [
        "page.getByRole('button', { name: 'Buscar con Google' })",
        "page.getByText('Buscar con Google')",
        "page.locator('input[value=\"Buscar con Google\"]')",
        "page.locator('.gNO89b')",
        "page.locator('input[name=\"btnK\"]')"
      ]
    },
    "luckyButton": {
      "description": "Botón 'Voy a tener suerte'",
      "selectors": [
        "page.getByRole('button', { name: 'Voy a tener suerte' })",
        "page.getByText('Voy a tener suerte')",
        "page.locator('input[value=\"Voy a tener suerte\"]')",
        "page.locator('input[name=\"btnI\"]')",
        "page.locator('.RNmpXc')"
      ]
    },
    "languageSelector": {
      "description": "Selector de idioma en la parte inferior",
      "selectors": [
        "page.getByText('Español (Latinoamérica)')",
        "page.getByRole('link', { name: 'Español (Latinoamérica)' })",
        "page.locator('a[href*=\"setprefs\"]')",
        "page.locator('.FP7HEc')"
      ]
    },
    "voiceSearchButton": {
      "description": "Botón de búsqueda por voz (micrófono)",
      "selectors": [
        "page.getByRole('button', { name: 'Búsqueda por voz' })",
        "page.getByTitle('Búsqueda por voz')",
        "page.locator('.goxjub')",
        "page.locator('[aria-label=\"Búsqueda por voz\"]')"
      ]
    },
    "cameraSearchButton": {
      "description": "Botón de búsqueda por imagen (cámara)",
      "selectors": [
        "page.getByRole('button', { name: 'Buscar por imagen' })",
        "page.getByTitle('Buscar por imagen')",
        "page.locator('.nDcEnd')",
        "page.locator('[aria-label=\"Buscar por imagen\"]')"
      ]
    }
  },
  "searchResultsPage": {
    "resultsContainer": {
      "description": "Contenedor principal de resultados",
      "selectors": [
        "page.locator('#search')",
        "page.locator('.g')",
        "page.locator('#rso')",
        "page.locator('.srg')"
      ]
    },
    "searchResultLinks": {
      "description": "Enlaces individuales de resultados de búsqueda",
      "selectors": [
        "page.locator('.g a[href*=\"playwright.dev\"]')",
        "page.getByRole('link', { name: /playwright/i })",
        "page.locator('a[href*=\"playwright.dev\"]')",
        "page.locator('.yuRUbf a')"
      ]
    },
    "resultTitles": {
      "description": "Títulos de los resultados de búsqueda",
      "selectors": [
        "page.locator('.LC20lb')",
        "page.locator('h3')",
        "page.locator('.g h3')",
        "page.locator('.yuRUbf h3')"
      ]
    },
    "resultDescriptions": {
      "description": "Descripciones de los resultados de búsqueda",
      "selectors": [
        "page.locator('.VwiC3b')",
        "page.locator('.s3v9rd')",
        "page.locator('.g .s')",
        "page.locator('.IsZvec')"
      ]
    },
    "searchStats": {
      "description": "Estadísticas de búsqueda (número de resultados)",
      "selectors": [
        "page.locator('#result-stats')",
        "page.getByText(/Cerca de .* resultados/)",
        "page.locator('.LHJvCe')"
      ]
    }
  },
  "navigationElements": {
    "searchSuggestions": {
      "description": "Lista de sugerencias de búsqueda",
      "selectors": [
        "page.locator('.wM6W7d')",
        "page.locator('.OBMEnb')",
        "page.locator('.G43f7e')",
        "page.locator('[role=\"listbox\"]')"
      ]
    },
    "suggestionItems": {
      "description": "Elementos individuales de sugerencias",
      "selectors": [
        "page.locator('.wM6W7d li')",
        "page.locator('[role=\"option\"]')",
        "page.locator('.sbct')",
        "page.locator('.pcTkSc')"
      ]
    }
  }
}
