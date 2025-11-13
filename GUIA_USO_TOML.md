# 🚀 Guía de Uso - Sistema TOML + DOM Extraction

## ✅ Estado Actual

### Implementado
- ✅ Parser TOML completamente funcional
- ✅ Extractor DOM integrado
- ✅ LLM (Google Gemini) recibiendo datos estructurados
- ✅ Soporte dual: archivos `.toml` y `.json`
- ✅ 2 ejemplos TOML de prueba
- ✅ Priorización de selectores (ARIA > atributos > estructura > texto)

### Próximos Pasos
- ⏳ Configurar `GOOGLE_API_KEY` en `.env`
- ⏳ Ejecutar primera prueba con TOML
- ⏳ Validar calidad de selectores generados
- ⏳ Medir tasa de éxito (objetivo: 92-95%)

---

## 📋 Prerequisitos

### 1. Configurar Variables de Entorno

**Editar el archivo `.env`** (ya creado en la raíz del proyecto):

```bash
# REQUERIDO: Obtén tu API key en https://makersuite.google.com/app/apikey
GOOGLE_API_KEY=tu_api_key_aqui

# Opcional
BROWSER=chromium
```

### 2. Instalar Dependencias

```bash
npm install
```

---

## 🎯 Cómo Usar

### Opción 1: Usar Formato TOML (Recomendado)

```bash
npm run orchestrate orchestrator/user-stories/login-error.testcase.toml
```

### Opción 2: Usar Formato JSON (Legacy)

```bash
npm run orchestrate orchestrator/user-stories/login-error.testcase.json
```

---

## 📝 Estructura de un Archivo TOML

```toml
# Comentarios permitidos!
name = "Nombre del test"
path = "/ruta/de/la/pagina"

# Pasos BDD
[[steps]]
type = "given"
description = "estoy en la página de login"

[[steps]]
type = "when"
description = "ingreso el email"
value = "test@example.com"
target = "emailInput"

[[steps]]
type = "then"
description = "debería ver un mensaje"
target = "successMessage"

# Validaciones opcionales
[validation]
expectedErrors = ["Error 1", "Error 2"]

# Hints para ayudar al LLM
[hints]
form = "login-form"
submitButton = "Login"
```

---

## 🔍 Qué Hace el Sistema

### 1. Lee el Archivo TOML
Parsea la historia de usuario estructurada.

### 2. Navega a la Página
Usa Playwright para abrir la URL especificada.

### 3. Extrae Estructura DOM
Obtiene TODOS los elementos interactivos:
- IDs, clases, nombres
- Atributos ARIA (role, label)
- data-testid
- Placeholders
- Texto visible
- **XPath y CSS Path pre-calculados**

### 4. Toma Screenshot
Para contexto visual del LLM.

### 5. Envía al LLM (Google Gemini)
**Ahora el LLM recibe**:
- ✅ Historia de usuario
- ✅ Screenshot (contexto visual)
- ✅ Patrones de UI detectados
- ✅ **Datos estructurados del DOM** ← NUEVO!

### 6. Genera Assets
El LLM genera:
- Page Objects con selectores robustos
- Test steps con acciones
- Validaciones

### 7. Crea Archivos
- `*.ai-assets.json` - Definición generada
- `pages/*.ts` - Page Objects
- `tests/*.spec.ts` - Tests de Playwright

---

## 📊 Mejora Esperada

### Antes (60-70% precisión)
```
❌ LLM solo veía screenshot
❌ "Adivinaba" selectores desde imagen
❌ Generaba: getByText("Submit")
❌ Selectores frágiles, rompen con cambios mínimos
```

### Ahora (92-95% esperado)
```
✅ LLM recibe datos reales del DOM
✅ Conoce IDs, clases, ARIA labels
✅ Genera: getByRole('button', { name: 'Submit' })
✅ O: #submit-btn (si tiene ID)
✅ O: button[data-testid="submit"]
✅ 3-5 selectores priorizados por elemento
```

---

## 🧪 Cómo Probar

### Test 1: Verificar Parser TOML
```bash
npx ts-node test-toml-parser.ts
```
Debería mostrar:
```
✅ Parser exitoso!
📊 Datos parseados...
```

### Test 2: Ejecutar Generación Completa
```bash
# Asegúrate de configurar GOOGLE_API_KEY primero!
npm run orchestrate orchestrator/user-stories/login-error.testcase.toml
```

Debería:
1. Navegar a la página
2. Extraer elementos del DOM
3. Enviar datos al LLM
4. Generar Page Objects y Tests

---

## 🔧 Troubleshooting

### Error: "GOOGLE_API_KEY no está definida"
**Solución**: Edita `.env` y agrega tu API key.

### Error: "Cannot find module"
**Solución**: Ejecuta `npm install`.

### Error: "Timeout waiting for page"
**Solución**: Verifica tu conexión a internet y que el sitio esté disponible.

### Selectores siguen fallando
**Posibles causas**:
1. El sitio usa shadow DOM (no soportado aún)
2. Elementos generados dinámicamente después del load
3. iFrames (requiere manejo especial)

---

## 📈 Métricas a Medir

1. **Tasa de éxito de selectores**: ¿Cuántos tests pasan sin errores?
2. **Robustez**: ¿Los tests siguen funcionando después de cambios menores?
3. **Tiempo de generación**: ¿Cuánto tarda en generar los assets?
4. **Precisión del LLM**: ¿Los selectores generados coinciden con la intención?

---

## 🎯 Próximos Pasos del Sprint

- **Día 2**: Ejecutar 5-10 pruebas y recopilar métricas
- **Día 3**: Ajustar prompt basado en resultados
- **Día 4**: Optimizar extracción DOM (filtros, priorización)
- **Día 5**: Documentar mejores prácticas

---

## 🤝 Contribuir

Si encuentras un bug o tienes una sugerencia:
1. Documenta el caso de prueba
2. Guarda screenshots
3. Comparte el archivo `.ai-assets.json` generado
4. Describe el comportamiento esperado vs actual

---

## 📚 Referencias

- [Playwright Selectors](https://playwright.dev/docs/selectors)
- [TOML Specification](https://toml.io/en/)
- [Google Gemini API](https://ai.google.dev/)
- [ARIA Roles](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles)
