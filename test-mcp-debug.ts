// test-mcp-debug.ts
// Test específico para debuggear problemas de captura de elementos MCP

import { MCPManager } from './orchestrator/services/MCPManager';
import { MCPClientService } from './orchestrator/services/McpClientService';

async function debugMCPElementCapture() {
  console.log('🔍 [DEBUG] Iniciando test de debugging MCP...');
  
  try {
    // 1. Inicializar MCP
    const mcpManager = MCPManager.getInstance();
    const mcpClient = mcpManager.getMCPClient();
    
    if (!mcpClient.isConnected()) {
      console.log('[DEBUG] Iniciando servidor MCP...');
      await mcpClient.startMCPServer();
    }
    
    // 2. Navegar a la página de login
    const loginUrl = 'https://ecommerce-playground.lambdatest.io/index.php?route=account/login';
    console.log(`[DEBUG] 🧭 Navegando a: ${loginUrl}`);
    await mcpClient.navigateToUrl(loginUrl);
    
    // 3. Obtener contexto inicial y analizar estructura
    console.log('[DEBUG] 📊 Obteniendo contexto inicial...');
    const initialContext = await mcpClient.getRealTimeContext(loginUrl);
    
    console.log('[DEBUG] ===== ANÁLISIS DE CONTEXTO INICIAL =====');
    console.log(`[DEBUG] Total elementos interactivos: ${initialContext.interactiveElements?.length || 0}`);
    
    // 4. DEBUGGING DETALLADO: Analizar estructura de elementos
    if (initialContext.interactiveElements && initialContext.interactiveElements.length > 0) {
      console.log('[DEBUG] 🔬 PRIMEROS 10 ELEMENTOS (estructura completa):');
      
      initialContext.interactiveElements.slice(0, 10).forEach((element, index) => {
        console.log(`[DEBUG] --- Elemento ${index + 1} ---`);
        console.log(JSON.stringify(element, null, 2));
        console.log('');
      });
      
      // 5. Buscar elementos específicos que necesitamos
      console.log('[DEBUG] 🎯 BUSCANDO ELEMENTOS ESPECÍFICOS:');
      
      // Buscar botones
      const buttons = initialContext.interactiveElements.filter((el: any) => {
        return el.role === 'button' || 
               el.elementType === 'button' || 
               el.htmlAttributes?.type === 'submit' ||
               (typeof el === 'string' && el.includes('button:'));
      });
      
      console.log(`[DEBUG] 🔘 Botones encontrados (${buttons.length}):`);
      buttons.forEach((btn, idx) => {
        console.log(`[DEBUG]   ${idx + 1}. ${JSON.stringify(btn, null, 2)}`);
      });
      
      // Buscar campos de texto
      const textInputs = initialContext.interactiveElements.filter((el: any) => {
        return el.role === 'textbox' || 
               el.elementType === 'input' ||
               el.htmlAttributes?.type === 'text' ||
               el.htmlAttributes?.type === 'email' ||
               (typeof el === 'string' && el.includes('textbox:'));
      });
      
      console.log(`[DEBUG] 📝 Campos de texto encontrados (${textInputs.length}):`);
      textInputs.forEach((input, idx) => {
        console.log(`[DEBUG]   ${idx + 1}. ${JSON.stringify(input, null, 2)}`);
      });
      
      // Buscar elementos con "Login" en el nombre
      const loginElements = initialContext.interactiveElements.filter((el: any) => {
        const elementStr = JSON.stringify(el).toLowerCase();
        return elementStr.includes('login');
      });
      
      console.log(`[DEBUG] 🔑 Elementos con 'login' (${loginElements.length}):`);
      loginElements.forEach((login, idx) => {
        console.log(`[DEBUG]   ${idx + 1}. ${JSON.stringify(login, null, 2)}`);
      });
      
      // Buscar elementos con "Email" 
      const emailElements = initialContext.interactiveElements.filter((el: any) => {
        const elementStr = JSON.stringify(el).toLowerCase();
        return elementStr.includes('email') || elementStr.includes('e-mail');
      });
      
      console.log(`[DEBUG] ✉️ Elementos con 'email' (${emailElements.length}):`);
      emailElements.forEach((email, idx) => {
        console.log(`[DEBUG]   ${idx + 1}. ${JSON.stringify(email, null, 2)}`);
      });
    }
    
    // 6. Analizar todos los elementos para encontrar patrones
    console.log('\n[DEBUG] ===== ANÁLISIS DE PATRONES DE ELEMENTOS =====');
    
    // Agrupar elementos por tipo de role
    const elementsByRole = {};
    initialContext.interactiveElements.forEach((el: any) => {
      let role = 'unknown';
      
      if (typeof el === 'string') {
        // Elemento es string, extraer role
        const roleMatch = el.match(/^(\w+):/);
        role = roleMatch ? roleMatch[1] : 'string';
      } else if (el && typeof el === 'object') {
        // Elemento es objeto
        role = el.role || el.elementType || 'object';
      }
      
      if (!elementsByRole[role]) {
        elementsByRole[role] = [];
      }
      elementsByRole[role].push(el);
    });
    
    console.log('[DEBUG] 📊 ELEMENTOS AGRUPADOS POR ROLE:');
    Object.keys(elementsByRole).forEach(role => {
      console.log(`[DEBUG] 🏷️ ${role}: ${elementsByRole[role].length} elementos`);
      
      // Mostrar primeros 3 ejemplos de cada tipo
      elementsByRole[role].slice(0, 3).forEach((el, idx) => {
        console.log(`[DEBUG]     ${idx + 1}. ${JSON.stringify(el, null, 2)}`);
      });
      
      if (elementsByRole[role].length > 3) {
        console.log(`[DEBUG]     ... y ${elementsByRole[role].length - 3} más`);
      }
      console.log('');
    });
    
    // 7. Simular el filtro que está fallando en index.ts
    console.log('[DEBUG] ===== SIMULANDO FILTROS DE index.ts =====');
    
    const simulatedButtons = initialContext.interactiveElements.filter((el: any) =>
      el.role === 'button' || el.elementType === 'button' || el.htmlAttributes?.type === 'submit'
    );
    
    console.log(`[DEBUG] 🔘 Filtro actual encuentra ${simulatedButtons.length} botones:`);
    simulatedButtons.forEach((btn, idx) => {
      console.log(`[DEBUG]   ${idx + 1}. ${JSON.stringify(btn, null, 2)}`);
    });
    
    // Filtro alternativo más flexible
    const flexibleButtons = initialContext.interactiveElements.filter((el: any) => {
      if (typeof el === 'string') {
        return el.toLowerCase().includes('button:') && el.toLowerCase().includes('login');
      }
      return false;
    });
    
    console.log(`[DEBUG] 🔘 Filtro flexible encuentra ${flexibleButtons.length} botones:`);
    flexibleButtons.forEach((btn, idx) => {
      console.log(`[DEBUG]   ${idx + 1}. ${JSON.stringify(btn, null, 2)}`);
    });
    
  } catch (error) {
    console.error('[DEBUG] ❌ Error general:', error);
  } finally {
    // Cleanup
    console.log('[DEBUG] 🧹 Cerrando MCP...');
    const mcpManager = MCPManager.getInstance();
    await mcpManager.stopMCP();
  }
}

// Ejecutar el test
debugMCPElementCapture().catch(console.error);