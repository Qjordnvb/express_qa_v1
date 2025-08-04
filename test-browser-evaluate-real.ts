/**
 * TEST: Implementar la solución real de browser_evaluate documentada
 * 
 * Objetivo: Usar la API MCP directamente para ejecutar JavaScript real
 */

import { MCPClientService } from './orchestrator/services/McpClientService';

console.log('🔧 TEST: Implementando solución browser_evaluate REAL\n');

async function testRealBrowserEvaluate() {
  const mcpClient = new MCPClientService();

  try {
    console.log('1️⃣ Iniciando servidor MCP...');
    await mcpClient.startMCPServer();
    console.log('✅ Servidor MCP iniciado\n');

    console.log('2️⃣ Navegando a página de prueba...');
    await mcpClient.navigateToUrl('https://admin-dev.membeers.com/');
    console.log('✅ Navegación exitosa\n');

    console.log('3️⃣ IMPLEMENTANDO browser_evaluate DOCUMENTADO...');
    console.log('Solución: Usar herramienta MCP browser_evaluate directamente\n');

    // ✅ IMPLEMENTACIÓN REAL: Acceso directo a MCP client
    console.log('Accediendo al cliente MCP interno...');
    
    // Usar reflexión para acceder al cliente MCP privado
    const mcpClientPrivate = (mcpClient as any).mcpClient;
    
    if (!mcpClientPrivate) {
      throw new Error('No se pudo acceder al cliente MCP interno');
    }

    console.log('✅ Cliente MCP interno obtenido');
    console.log('📋 Ejecutando JavaScript para extraer atributos HTML reales...\n');

    // ✅ SOLUCIÓN DOCUMENTADA: JavaScript directo sin parámetro ref
    const result = await mcpClientPrivate.callTool({
      name: 'browser_evaluate',
      arguments: {
        function: `() => {
          // Extraer TODOS los elementos interactivos con atributos HTML REALES
          const selector = 'input, button, select, textarea, a[href], [role], [tabindex]:not([tabindex="-1"])';
          const elements = document.querySelectorAll(selector);
          
          return Array.from(elements).map((el, index) => {
            // Obtener TODOS los atributos HTML reales
            const rect = el.getBoundingClientRect();
            
            // Solo elementos visibles
            if (rect.width > 0 && rect.height > 0) {
              return {
                index: index,
                tagName: el.tagName.toLowerCase(),
                
                // ✅ CRÍTICO: Atributos HTML directos
                type: el.type || null,  // ← AQUÍ debe capturar type="password"
                name: el.name || null,
                id: el.id || null,
                className: el.className || null,
                placeholder: el.placeholder || null,
                value: el.value || null,
                
                // Atributos ARIA
                role: el.getAttribute('role') || null,
                ariaLabel: el.getAttribute('aria-label') || null,
                ariaLabelledby: el.getAttribute('aria-labelledby') || null,
                
                // Texto y contenido
                textContent: el.textContent?.trim().substring(0, 50) || null,
                innerText: el.innerText?.trim().substring(0, 50) || null,
                
                // Propiedades computadas
                disabled: el.disabled || false,
                required: el.required || false,
                readonly: el.readOnly || false,
                checked: el.checked || false,
                selected: el.selected || false,
                
                // Posición
                boundingBox: {
                  x: rect.x,
                  y: rect.y,
                  width: rect.width,
                  height: rect.height
                }
              };
            }
            return null;
          }).filter(el => el !== null);
        }`
      }
    });

    console.log('📊 RESPUESTA browser_evaluate REAL:');
    console.log('===================================');
    console.log(JSON.stringify(result, null, 2));
    console.log('===================================\n');

    // Parsear respuesta usando método documentado
    if (result && result.content && result.content[0] && result.content[0].text) {
      const textContent = result.content[0].text;
      
      // Intentar regex primero (método documentado)
      const resultMatch = textContent.match(/### Result\n(.*?)(?:\n\n###|$)/s);
      let jsonData;
      
      if (resultMatch) {
        console.log('✅ Usando regex documentado...');
        jsonData = resultMatch[1].trim();
      } else {
        console.log('✅ Usando parsing directo...');
        jsonData = textContent;
      }

      try {
        const htmlElements = JSON.parse(jsonData);
        console.log('🎉 ÉXITO! Elementos HTML extraídos correctamente');
        console.log(`📊 Total elementos encontrados: ${htmlElements.length}\n`);
        
        // Analizar elementos con atributos HTML REALES
        htmlElements.forEach((el, index) => {
          console.log(`${index + 1}. ELEMENTO REAL [${el.tagName}]:`);
          console.log(`   - Type HTML: "${el.type || 'N/A'}"`);
          console.log(`   - Name: "${el.name || 'N/A'}"`);  
          console.log(`   - ID: "${el.id || 'N/A'}"`);
          console.log(`   - Placeholder: "${el.placeholder || 'N/A'}"`);
          console.log(`   - ClassName: "${el.className || 'N/A'}"`);
          console.log(`   - ARIA Role: "${el.role || 'N/A'}"`);
          console.log(`   - Text: "${el.textContent || el.innerText || 'N/A'}"`);
          
          // ✅ VERIFICACIÓN CRÍTICA: ¿Se detectan los types reales?
          if (el.type === 'password') {
            console.log('   🔐 ¡CAMPO PASSWORD DETECTADO CORRECTAMENTE!');
          }
          if (el.type === 'email') {
            console.log('   📧 ¡CAMPO EMAIL DETECTADO CORRECTAMENTE!');  
          }
          if (el.type === 'submit') {
            console.log('   🚀 ¡BOTÓN SUBMIT DETECTADO CORRECTAMENTE!');
          }
          if (el.type === 'text') {
            console.log('   📝 Campo de texto estándar');
          }
          
          console.log(''); // Línea en blanco
        });

        return { success: true, elements: htmlElements };
        
      } catch (parseError) {
        console.log('❌ Error parseando JSON:', parseError);
        return { success: false, error: 'JSON parse failed', rawData: jsonData };
      }
    } else {
      console.log('❌ Respuesta inesperada de browser_evaluate');
      return { success: false, error: 'Unexpected response structure' };
    }

  } catch (error) {
    console.log('❌ ERROR EN TEST:', error);
    return { success: false, error: error.message };
  } finally {
    try {
      await mcpClient.stopMCPServer();
      console.log('✅ Servidor MCP cerrado');
    } catch (closeError) {
      console.log('⚠️ Error cerrando servidor:', closeError);
    }
  }
}

async function runRealTest() {
  console.log('🎯 OBJETIVO: Implementar browser_evaluate con acceso MCP directo');
  console.log('📋 ESPERAMOS:');
  console.log('   - ✅ Ejecución de JavaScript real en el DOM');
  console.log('   - ✅ Extracción de type="password" y type="email"');
  console.log('   - ✅ Todos los atributos HTML reales\n');

  const result = await testRealBrowserEvaluate();

  console.log('\n🏁 RESULTADO FINAL:');
  console.log('==================');
  
  if (result.success) {
    console.log('🎉 BROWSER_EVALUATE REAL FUNCIONA!');
    
    const passwordFields = result.elements.filter(el => el.type === 'password');
    const emailFields = result.elements.filter(el => el.type === 'email');
    const submitButtons = result.elements.filter(el => el.type === 'submit');
    
    console.log(`🔐 Campos password: ${passwordFields.length}`);
    console.log(`📧 Campos email: ${emailFields.length}`);
    console.log(`🚀 Botones submit: ${submitButtons.length}`);
    
    if (passwordFields.length > 0 || emailFields.length > 0) {
      console.log('✅ SOLUCIÓN BROWSER_EVALUATE DOCUMENTADA FUNCIONA!');
      console.log('✅ Ahora podemos implementar UniversalMcpExtractor');
    } else {
      console.log('⚠️ JavaScript ejecutado pero tipos específicos no detectados');
      console.log('🔍 Puede ser que los inputs no tengan type="password" en esta página');
    }
    
  } else {
    console.log('❌ BROWSER_EVALUATE REAL FALLÓ');
    console.log(`❌ Error: ${result.error}`);
  }
}

// Ejecutar test
runRealTest().catch(console.error);