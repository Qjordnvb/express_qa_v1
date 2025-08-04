# Problema con Extracción de Atributos HTML via MCP

## Resumen del Problema

Estamos intentando extraer **todos los atributos HTML disponibles** de elementos web usando **Model Context Protocol (MCP)** para implementar **detección contextual inteligente** sin hardcodeo. El objetivo es obtener información completa de cada elemento (tagName, type, name, id, placeholder, etc.) para generar selectores de Playwright de forma automática.

## Estado Actual

### ✅ Funcionando Correctamente
- **Navegación MCP**: La navegación a `https://admin-dev.membeers.com/` funciona correctamente
- **Parsing YAML**: Extracción de atributos ARIA del snapshot YAML (cursor=pointer, level=3, etc.)
- **Detección de elementos**: 12 elementos detectados con sus roles y nombres
- **Patrones contextuales**: Detectamos email field, password field, y submit button usando contexto ARIA

### ❌ Problema Actual
Cuando intentamos usar `browser_evaluate` con `ref` para obtener atributos HTML reales del DOM, obtenemos errores de JSON:

```
SyntaxError: Unexpected token 'E', "Error: pag"... is not valid JSON
```

## Análisis Técnico

### Elementos Detectados Correctamente (YAML/ARIA)
```yaml
- textbox "Email" [ref=e19]                    # ✅ Campo Email
- textbox [ref=e32]                           # ✅ Campo Password (sin nombre)
- generic [cursor=pointer]: Contraseña        # ✅ Label contexto password
- button "Continuar" [ref=e34] [cursor=pointer] # ✅ Submit button
```

### Código Actual de Extracción HTML
```typescript
const evalResult = await this.mcpClient.callTool({
  name: 'browser_evaluate',
  arguments: {
    ref: element.ref,
    function: `
      function(element) {
        const result = {
          tagName: element.tagName?.toLowerCase() || '',
          type: element.type || '',
          name: element.name || '',
          id: element.id || '',
          className: element.className || '',
          placeholder: element.placeholder || '',
          value: element.value || '',
          href: element.href || '',
          disabled: element.disabled || false,
          required: element.required || false,
          readonly: element.readOnly || false,
          checked: element.checked || false,
          selected: element.selected || false,
          ariaLabel: element.getAttribute('aria-label') || ''
        };
        return JSON.stringify(result);
      }
    `
  }
});
```

### Error Específico
- **Todos los elementos** fallan con el mismo error de JSON parsing
- El error sugiere que `browser_evaluate` devuelve texto que empieza con "Error: pag..."
- Posible problema: `browser_evaluate` con `ref` no funciona como esperamos

## Objetivo Final

### Lo Que Queremos Lograr
1. **Obtener atributos HTML completos** para cada elemento con `ref` 
2. **Información específica** como:
   - `<input type="email">` → detectar como campo email
   - `<input type="password">` → detectar como campo password  
   - `<button type="submit">` → detectar como submit button
   - `name`, `id`, `placeholder` → para generar selectores resilientes

### Detección Contextual Inteligente (Sin Hardcodeo)
```typescript
// En lugar de hardcodear "email", "password", etc.
// Usar los atributos HTML reales que proporcione MCP
const detectType = (htmlAttrs) => {
  if (htmlAttrs.type === 'email') return 'email';
  if (htmlAttrs.type === 'password') return 'password';  
  if (htmlAttrs.type === 'submit') return 'submit';
  return htmlAttrs.type || 'unknown';
}
```

### Generación de Selectores Automática
```typescript
// Basado en atributos HTML reales, generar múltiples selectores
const generateSelectors = (element, htmlAttrs) => {
  const selectors = [];
  
  // getByRole con name del ARIA
  if (element.role && element.name) {
    selectors.push({
      type: 'getByRole',
      value: element.role,
      options: { name: element.name }
    });
  }
  
  // CSS por ID (si existe)
  if (htmlAttrs.id) {
    selectors.push({
      type: 'css', 
      value: `#${htmlAttrs.id}`
    });
  }
  
  // CSS por type+tagName (para inputs)
  if (htmlAttrs.type && htmlAttrs.tagName) {
    selectors.push({
      type: 'css',
      value: `${htmlAttrs.tagName}[type="${htmlAttrs.type}"]`
    });
  }
  
  // getByPlaceholder (si existe)
  if (htmlAttrs.placeholder) {
    selectors.push({
      type: 'getByPlaceholder',
      value: htmlAttrs.placeholder
    });
  }
  
  return selectors;
}
```

## Próximos Pasos

### 1. Diagnóstico del Error browser_evaluate
- Ejecutar test con debug mejorado para ver **exactamente** qué devuelve `browser_evaluate`
- Identificar por qué falla el JSON parsing
- Verificar si el parámetro `ref` se está usando correctamente

### 2. Alternativas si browser_evaluate No Funciona
- **Usar solo datos ARIA**: Aprovechar mejor el contexto del YAML
- **HTML Snapshot**: Intentar `browser_html_snapshot` y hacer matching por ref
- **Correlación híbrida**: Combinar ARIA + screenshot analysis

### 3. Implementación Final
- Una vez obtenidos los atributos HTML, implementar detección contextual genérica
- Generar selectores automáticamente sin hardcodeo
- Integrar con el sistema de generación de tests existente

## Contexto del Proyecto

Este trabajo es parte del framework **Express QA v4** que:
- Genera tests de Playwright desde historias de usuario en lenguaje natural
- Usa **AI + MCP** para análisis DOM en tiempo real  
- Implementa **aprendizaje automático** para reparar tests fallidos
- Requiere **detección inteligente** de campos sin hardcodeo para máxima flexibilidad

La extracción correcta de atributos HTML es **crítica** para que el sistema pueda trabajar con cualquier sitio web sin configuración manual.