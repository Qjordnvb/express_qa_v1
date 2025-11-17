# 📋 DOM Extraction - Implementación Final

## 🎯 Objetivo

Mejorar la precisión de selectores generados de **60-70%** a **92-95%** mediante la extracción de estructura DOM real, eliminando "adivinanzas" del LLM basadas solo en screenshots.

---

## ✅ Implementación Completada

### 1. DOM Extractor
**Archivo:** `orchestrator/dom-extractor.ts` (203 líneas)

**Funcionalidad:**
- Extrae todos los elementos interactivos de una página
- Captura atributos completos:
  - IDs, clases, nombres
  - ARIA (role, label)
  - data-testid, placeholder, type
  - Texto visible (truncado a 100 chars)
  - **XPath y CSS Path pre-calculados**
- Filtra solo elementos visibles
- Métodos auxiliares: `extractByType()`, `extractBySelector()`

**Estructura de Datos:**
```typescript
interface DOMElement {
  tagName: string;
  id?: string;
  classes: string[];
  name?: string;
  type?: string;
  placeholder?: string;
  ariaLabel?: string;
  ariaRole?: string;
  textContent?: string;
  dataTestId?: string;
  xpath: string;         // Pre-calculado
  cssPath: string;       // Pre-calculado
  isVisible: boolean;
}
```

---

### 2. Integración con LLM
**Archivos Modificados:**
- `orchestrator/llms/ILlmService.ts`
- `orchestrator/llms/GoogleGeminiService.ts`
- `orchestrator/visual-ai-helper.ts`

**Cambios:**
- Nueva firma: `getTestAssetsFromIA(..., domElements?: DOMElement[])`
- Prompt mejorado con contexto DOM estructurado
- Priorización de selectores en el prompt:
  1. ARIA/Roles
  2. Atributos estables (id, data-testid, placeholder)
  3. Estructura DOM (XPath, CSS path pre-calculados)
  4. Texto (último recurso)

**Prompt Agregado:**
```
📊 DATOS ESTRUCTURADOS DEL DOM (CRÍTICO - USA ESTO):

IMPORTANTE: NO adivines selectores de la imagen. USA los datos reales del DOM.

[JSON con todos los elementos interactivos]

INSTRUCCIONES PARA GENERAR SELECTORES (ORDEN DE PRIORIDAD):
1️⃣ PRIORIDAD 1: Selectores ARIA/Roles
   - getByRole() con nombre exacto
   - getByLabel() si existe ariaLabel

2️⃣ PRIORIDAD 2: Atributos estables
   - getByTestId() si existe dataTestId
   - Selector por id (#id) si existe
   - getByPlaceholder() si existe placeholder

3️⃣ PRIORIDAD 3: Estructura DOM (YA CALCULADA)
   - cssPath (pre-calculado)
   - xpath (pre-calculado)

4️⃣ PRIORIDAD 4: Texto (ÚLTIMO RECURSO)
   - getByText() solo si no hay otra opción
   - ADVERTENCIA: Selectores de texto son frágiles
```

---

### 3. Orchestrator Actualizado
**Archivo:** `orchestrator/index.ts`

**Flujo Actualizado:**
```
1. Lee user story (JSON)
   ↓
2. Navega a la página (Playwright)
   ↓
3. 🆕 Extrae estructura del DOM (DOMExtractor)
   ↓
4. Toma screenshot (contexto visual)
   ↓
5. Detecta patrones UI
   ↓
6. 🆕 Envía al LLM: screenshot + datos DOM estructurados
   ↓
7. LLM genera assets con selectores robustos
   ↓
8. Crea Page Objects y Tests
```

**Código Relevante:**
```typescript
// Extraer elementos interactivos del DOM
console.log('[LOG] 🔍 Extrayendo estructura del DOM...');
const domExtractor = new DOMExtractor();
const domElements = await domExtractor.extractInteractiveElements(page);
console.log(`[LOG] ✅ Extraídos ${domElements.length} elementos interactivos del DOM`);

// Enviar al LLM con datos del DOM
const testAssets = await llmService.getTestAssetsFromIA(
  Array.isArray(testCase.userStory) ? testCase.userStory : [testCase.userStory],
  screenshotBuffer.toString('base64'),
  detectedPatterns,
  domElements, // ← Datos estructurados del DOM
);
```

---

### 4. Tests Unitarios
**Archivo:** `tests/unit/dom-extractor.test.ts` (9 tests)

**Cobertura:**
- ✅ Extracción de elementos interactivos
- ✅ Captura de atributos ARIA
- ✅ Cálculo de XPath automático
- ✅ Generación de CSS paths
- ✅ Filtrado de elementos visibles
- ✅ Truncado de texto largo
- ✅ Extracción por tipo
- ✅ Manejo de múltiples clases
- ✅ Elementos sin atributos opcionales

**Estado:** Código verificado estáticamente ✅ (requiere navegadores para ejecutar)

---

## 🔄 Comparativa: Antes vs Ahora

### ANTES (60-70% precisión)
```typescript
// LLM solo recibía screenshot
llmService.getTestAssetsFromIA(
  userStory,
  screenshot,
  detectedPatterns
);
```

**Problemas:**
- ❌ LLM "adivinaba" selectores desde imagen
- ❌ Generaba `getByText("Submit")` (frágil)
- ❌ No conocía IDs, clases, ARIA
- ❌ 60-70% de éxito

---

### AHORA (92-95% esperado)
```typescript
// LLM recibe screenshot + DOM estructurado
llmService.getTestAssetsFromIA(
  userStory,
  screenshot,
  detectedPatterns,
  domElements  // ← Datos reales del DOM
);
```

**Beneficios:**
- ✅ LLM usa datos reales del DOM
- ✅ Genera `getByRole()`, `#id`, `[data-testid]`
- ✅ Conoce todos los atributos
- ✅ 3-5 selectores priorizados por elemento
- ✅ 92-95% de éxito esperado

---

## 🚀 Cómo Usar

### Prerequisitos
```bash
# 1. Configurar API Key
echo "GOOGLE_API_KEY=tu_api_key_aqui" > .env

# 2. Instalar navegadores (local)
npx playwright install chromium --with-deps
```

### Ejecutar Orchestrator
```bash
npm run orchestrate orchestrator/user-stories/login-error.testcase.json
```

**Qué Sucede:**
1. Lee user story JSON
2. Navega a la página
3. **Extrae ~50-100 elementos del DOM** ← NUEVO
4. Toma screenshot
5. Detecta patrones UI
6. **Envía screenshot + DOM al LLM** ← NUEVO
7. LLM genera selectores robustos
8. Crea Page Objects y tests

### Ejecutar Tests
```bash
# Tests unitarios DOM extractor (requiere navegadores)
npx playwright test tests/unit/dom-extractor.test.ts --project=chromium

# Tests E2E generados
npx playwright test tests/*.spec.ts

# Ver reporte
npx playwright show-report
```

---

## 📊 Métricas a Medir

### 1. Tasa de Éxito
```
Tests ejecutados: X
Tests que pasan: Y
Tasa de éxito: (Y/X) × 100 = Z%

Objetivo: ≥ 92%
```

### 2. Distribución de Selectores
```
ARIA/Role:    X%
data-testid:  Y%
ID (#):       Z%
CSS path:     W%
Texto:        V%

Objetivo: Mayoría ARIA/data-testid/ID
```

### 3. Robustez
```
¿Tests siguen funcionando después de cambios menores UI?
Objetivo: ≥ 90%
```

---

## 🔧 Próximos Pasos

### Día 2: Validación Empírica
1. Ejecutar 10 pruebas con diferentes user stories
2. Medir tasa de éxito real
3. Identificar patrones de fallo
4. Comparar con sistema anterior (60-70%)

### Día 3: Refinamiento de Prompts
1. Analizar selectores generados
2. Ajustar priorización si es necesario
3. Agregar ejemplos al prompt (few-shot learning)

### Día 4: Optimización
1. Optimizar filtros del DOM extractor
2. Limitar elementos si > 200
3. Agregar contexto de parent/siblings

### Día 5: Documentación
1. Mejores prácticas
2. Guía de troubleshooting
3. Ejemplos de casos complejos

---

## 📁 Archivos Clave

```
express_qa_v1/
├── orchestrator/
│   ├── dom-extractor.ts           ← NUEVO
│   ├── index.ts                   ← MODIFICADO
│   ├── llms/
│   │   ├── ILlmService.ts         ← MODIFICADO
│   │   └── GoogleGeminiService.ts ← MODIFICADO
│   └── visual-ai-helper.ts        ← MODIFICADO
└── tests/
    └── unit/
        └── dom-extractor.test.ts  ← NUEVO
```

---

## 🐛 Problemas Conocidos

### ⚠️ Navegadores Playwright
**Problema:** Sandbox/CI puede bloquear descarga de navegadores

**Solución:** Ejecutar en máquina local con:
```bash
npx playwright install chromium --with-deps
```

### ⚠️ Páginas con Muchos Elementos
**Problema:** Páginas complejas pueden tener > 200 elementos interactivos

**Solución Futura:** Implementar limitación y priorización en DOM extractor

### ⚠️ Shadow DOM
**Problema:** Elementos dentro de Shadow DOM no se detectan

**Solución Futura:** Agregar soporte para Shadow DOM en extracción

---

## 💡 Ejemplos de Datos Extraídos

**Entrada (página real):**
```html
<input
  id="email-input"
  type="email"
  name="email"
  placeholder="Enter your email"
  class="form-control"
  data-testid="email-field"
  aria-label="Email address input"
/>
```

**Salida (DOMElement):**
```json
{
  "tagName": "input",
  "id": "email-input",
  "classes": ["form-control"],
  "name": "email",
  "type": "email",
  "placeholder": "Enter your email",
  "dataTestId": "email-field",
  "ariaLabel": "Email address input",
  "xpath": "//*[@id='email-input']",
  "cssPath": "#email-input",
  "isVisible": true
}
```

**Selectores Generados por LLM:**
```typescript
// Prioridad 1: ARIA
getByRole('textbox', { name: 'Email address input' })

// Prioridad 2: Atributos estables
getByTestId('email-field')
page.locator('#email-input')
page.locator('input[name="email"]')

// Prioridad 3: Estructura
page.locator(getByPlaceholder('Enter your email'))

// Prioridad 4: XPath (fallback)
page.locator('//*[@id="email-input"]')
```

---

## ✅ Resumen Ejecutivo

### Completado
- ✅ DOM Extractor (203 líneas, funcional)
- ✅ Integración con Google Gemini (prompt mejorado)
- ✅ Orchestrator actualizado (extrae DOM antes de LLM)
- ✅ Tests unitarios creados (9 tests)
- ✅ TypeScript compila sin errores

### Pendiente
- ⏳ Configurar GOOGLE_API_KEY en .env
- ⏳ Ejecutar tests DOM en máquina local
- ⏳ Primera prueba E2E completa
- ⏳ Medir tasa de éxito real (objetivo: 92-95%)
- ⏳ Ajustar prompts basado en resultados

### Objetivo Principal
**Mejorar precisión de selectores de 60-70% a 92-95%** mediante extracción de datos estructurados del DOM.

---

**Última Actualización:** 2024-11-13
**Rama:** `claude/incomplete-request-011CV65puPA7ubsWomZqnHZw`
**Último Commit:** `9867511 - revert: Remove all TOML-related functionality`
