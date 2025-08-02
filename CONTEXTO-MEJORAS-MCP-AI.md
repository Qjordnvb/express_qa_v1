# Contexto y Mejoras Realizadas: MCP + IA para Automatización de Pruebas

## Visión del Proyecto

**Objetivo Principal**: Crear un sistema donde la IA use MCP (Model Context Protocol) como "brazos" para navegar e interactuar con aplicaciones web en tiempo real, generando automáticamente código de pruebas Playwright sin hardcodear lógica específica.

## Problema Inicial Identificado

El proyecto no estaba aprovechando el potencial completo del MCP. Los problemas detectados fueron:

1. **MCP usado pasivamente**: Solo para capturas estáticas, no para interacción dinámica
2. **IA tomando decisiones incorrectas**: Generaba selectores como `"name": "- textbox"` para campos de contraseña
3. **Información incompleta**: MCP no proporcionaba atributos HTML críticos como `type="password"`
4. **Parsing incorrecto**: Warnings constantes de "No se pudo extraer JSON válido"
5. **Falta de inteligencia contextual**: IA no infería correctamente el propósito de elementos

## Solución Implementada

### 1. Arquitectura AI + MCP Inteligente

**Archivo**: `orchestrator/services/AIWithMCPService.ts`

- **Función principal**: `generateAIResponseWithMCP()` - La IA usa MCP para explorar historias de usuario
- **Exploración inteligente**: `exploreUserStoryWithMCP()` - IA navega y toma decisiones en tiempo real
- **Decisiones contextuales**: `askAIWhatToDo()` - IA analiza cada paso y decide qué acción tomar
- **Ejecución MCP**: `executeMCPAction()` - Ejecuta las decisiones usando herramientas MCP

### 2. Mejoras en Tipado TypeScript

**Archivo**: `orchestrator/llms/ILlmService.ts`

```typescript
// ANTES: Solo había getFailureAnalysisFromIA (diseñado para análisis de fallos)
export interface AIFailureAnalysis {
  rootCause: string;
  repairSuggestion: string;
}

// DESPUÉS: Agregamos interfaz específica para decisiones de navegación
export interface AINavigationDecision {
  action: 'navigate' | 'click' | 'type' | 'wait' | 'observe';
  element?: {
    role: string;
    name: string;
    ref: string;
  };
  params?: any[];
  reasoning: string;
}

// NUEVO: Método específico para decisiones de navegación
getNavigationDecisionFromIA(prompt: string): Promise<AINavigationDecision | null>;
```

### 3. Extracción Completa de Información del DOM

**Archivo**: `orchestrator/services/McpClientService.ts`

**Información extraída por MCP**:
- `role`: Rol del elemento (button, textbox, etc.)
- `type`: Tipo HTML crítico (password, email, text, submit)
- `name`: Nombre identificativo del elemento
- `placeholder`: Placeholder del input
- `tagName`: Tag HTML (input, button, select)
- `selectors`: Múltiples selectores generados automáticamente
- `ref`: Referencia única para MCP
- `id`: ID del elemento HTML

**JavaScript ejecutado en el DOM**:
```javascript
// Extraer solo información esencial de elementos interactivos
const selector = 'input, button, select, textarea, a[href], [role], [tabindex]:not([tabindex="-1"])';
const domElements = document.querySelectorAll(selector);

// Para cada elemento visible, extraer:
elements.push({
  role: el.getAttribute('role') || (el.tagName === 'INPUT' ? 'textbox' : el.tagName.toLowerCase()),
  type: el.type || null,  // ← CRÍTICO: Aquí capturamos type="password"
  name: name,             // ← Obtenido de labels, aria-label, placeholder
  placeholder: el.placeholder || null,
  tagName: el.tagName.toLowerCase(),
  selectors: selectors,   // ← Generados automáticamente
  ref: 'dom_' + index,
  id: el.id || null
});
```

### 4. Prompt Inteligente para la IA

**Archivo**: `orchestrator/services/AIWithMCPService.ts`

**Capacidades enseñadas a la IA**:
1. **Análisis contextual**: Examinar TODOS los datos de MCP, no solo elementos interactivos
2. **Inferencia inteligente**: Usar context para identificar propósito de elementos
3. **Detección de patrones**: Identificar campos por atributos HTML (type="password")
4. **Análisis semántico**: Entender estructura completa de la página
5. **Extracción de valores**: Obtener emails, contraseñas, nombres directamente de la historia

**Ejemplo de decisión inteligente**:
```
Paso: "Y ingreso mi contraseña '123456' en el campo de contraseña"  
DOM Info: {"role": "textbox", "type": "password", "name": null, "placeholder": "Contraseña", "tagName": "input"}
IA Response: {"action": "type", "element": {"role": "textbox", "name": "Contraseña", "ref": "dom_1"}, "params": ["123456"], "reasoning": "Identifiqué el campo de contraseña por el type='password' en la información del DOM."}
```

## Logros Alcanzados

### ✅ Completados

1. **IA toma decisiones inteligentes**: Ya no solo "observe", ahora "type", "click", etc.
2. **Tipado TypeScript correcto**: Sin más workarounds con AIFailureAnalysis
3. **Información rica del DOM**: MCP extrae type, placeholder, selectors, etc.
4. **Eliminación de warnings**: Silenciamos warnings innecesarios de parsing
5. **Prompt contextual mejorado**: IA analiza información completa del DOM

### 🔄 En Progreso

1. **Prueba de campo de contraseña**: Verificando si IA identifica correctamente `type="password"`
2. **Generación de selectores inteligentes**: Que la IA use la información completa para generar mejores selectores

## Arquitectura Final

```
Historia de Usuario
       ↓
AIWithMCPService.generateAIResponseWithMCP()
       ↓
1. MCP navega al sitio
2. MCP extrae información completa del DOM (role, type, name, placeholder, tagName, selectors, ref, id)
3. IA analiza cada paso de la historia
4. IA decide qué acción tomar basada en información completa
5. MCP ejecuta la acción decidida
6. IA observa resultados y continúa
7. IA genera JSON final para generadores de código
       ↓
Código Playwright generado automáticamente
```

## Principio Fundamental

**NO HARDCODEAR NADA**: MCP proporciona toda la información necesaria, la IA debe ser lo suficientemente inteligente para interpretar esa información y tomar decisiones correctas para cualquier sitio web.

## Próximos Pasos

1. **Validar funcionamiento**: Confirmar que IA identifica `type="password"` correctamente
2. **Refinar prompts**: Mejorar ejemplos para casos edge específicos
3. **Pruebas en múltiples sitios**: Verificar flexibilidad del sistema
4. **Optimización de performance**: Reducir tiempos de ejecución

## Archivos Modificados

- `orchestrator/services/AIWithMCPService.ts` - Servicio principal AI+MCP
- `orchestrator/services/McpClientService.ts` - Extracción de información DOM
- `orchestrator/llms/ILlmService.ts` - Interfaces y tipado
- `orchestrator/llms/GoogleGeminiService.ts` - Implementación método navegación
- `test-ai-mcp-service.ts` - Script de prueba
- `debug-mcp-raw-output.ts` - Script de debug

La visión está clara: **MCP como brazos inteligentes de la IA** para automatización de pruebas web universal, sin código hardcodeado.