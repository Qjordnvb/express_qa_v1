// test-browser-html-snapshot.ts
// Test específico para browser_html_snapshot - verificar si extrae atributos HTML

import { MCPClientService } from './orchestrator/services/McpClientService';

async function testBrowserHtmlSnapshot() {
  console.log('\n🧪 TEST: browser_html_snapshot para atributos HTML');
  console.log('=' .repeat(60));
  console.log('🎯 Objetivo: Verificar si browser_html_snapshot extrae type, name, placeholder');
  console.log('🌐 URL: https://admin-dev.membeers.com/');
  
  const mcpClient = new MCPClientService();
  
  try {
    // 1. Inicializar MCP
    console.log('\n🚀 Iniciando servidor MCP...');
    await mcpClient.startMCPServer();
    
    // 2. Navegar a la página de login
    console.log('🌐 Navegando a página de login...');
    await mcpClient.navigateToUrl('https://admin-dev.membeers.com/');
    
    // 3. Esperar a que cargue la página
    console.log('⏳ Esperando carga de página...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 4. PROBAR browser_html_snapshot
    console.log('\n🔍 EJECUTANDO browser_html_snapshot...');
    console.log('-' .repeat(50));
    
    const client = (mcpClient as any).mcpClient;
    
    const htmlResult = await client.callTool({
      name: 'browser_html_snapshot',
      arguments: {}
    });
    
    console.log('📊 RESULTADO DE browser_html_snapshot:');
    console.log('=' .repeat(40));
    
    if (htmlResult.content && Array.isArray(htmlResult.content)) {
      const textContent = htmlResult.content.find((item: any) => item.type === 'text');
      
      if (textContent?.text) {
        const htmlContent = textContent.text;
        console.log(`✅ HTML extraído: ${htmlContent.length} caracteres`);
        
        // 5. BUSCAR ELEMENTOS INPUT ESPECÍFICOS
        console.log('\n🔎 ANALIZANDO ELEMENTOS INPUT:');
        console.log('-' .repeat(40));
        
        // Buscar inputs con regex
        const inputRegex = /<input([^>]*)>/gi;
        let match;
        let inputCount = 0;
        
        while ((match = inputRegex.exec(htmlContent)) !== null) {
          inputCount++;
          const attributesString = match[1];
          
          console.log(`\n${inputCount}. INPUT encontrado:`);
          console.log(`   Atributos: ${attributesString.trim()}`);
          
          // Extraer atributos específicos
          const typeMatch = attributesString.match(/type=["']([^"']*)["']/i);
          const nameMatch = attributesString.match(/name=["']([^"']*)["']/i);
          const idMatch = attributesString.match(/id=["']([^"']*)["']/i);
          const placeholderMatch = attributesString.match(/placeholder=["']([^"']*)["']/i);
          
          if (typeMatch) console.log(`   🎯 TYPE: "${typeMatch[1]}"`);
          if (nameMatch) console.log(`   🏷️ NAME: "${nameMatch[1]}"`);
          if (idMatch) console.log(`   🆔 ID: "${idMatch[1]}"`);
          if (placeholderMatch) console.log(`   💬 PLACEHOLDER: "${placeholderMatch[1]}"`);
          
          // DETECTAR CAMPOS ESPECÍFICOS
          if (typeMatch && typeMatch[1] === 'email') {
            console.log(`   📧 ¡CAMPO EMAIL DETECTADO!`);
          }
          
          if (typeMatch && typeMatch[1] === 'password') {
            console.log(`   🔐 ¡CAMPO PASSWORD DETECTADO!`);
          }
        }
        
        // 6. BUSCAR ELEMENTOS BUTTON
        console.log('\n🔎 ANALIZANDO ELEMENTOS BUTTON:');
        console.log('-' .repeat(40));
        
        const buttonRegex = /<button([^>]*)>(.*?)<\/button>/gi;
        let buttonMatch;
        let buttonCount = 0;
        
        while ((buttonMatch = buttonRegex.exec(htmlContent)) !== null) {
          buttonCount++;
          const attributesString = buttonMatch[1];
          const buttonText = buttonMatch[2].replace(/<[^>]*>/g, '').trim();
          
          console.log(`\n${buttonCount}. BUTTON encontrado:`);
          console.log(`   Texto: "${buttonText}"`);
          console.log(`   Atributos: ${attributesString.trim()}`);
          
          const typeMatch = attributesString.match(/type=["']([^"']*)["']/i);
          if (typeMatch) console.log(`   🎯 TYPE: "${typeMatch[1]}"`);
        }
        
        // 7. RESUMEN FINAL
        console.log('\n📈 RESUMEN DE EXTRACCIÓN:');
        console.log('=' .repeat(40));
        console.log(`   📝 Inputs encontrados: ${inputCount}`);
        console.log(`   🔘 Buttons encontrados: ${buttonCount}`);
        
        if (inputCount > 0) {
          console.log('\n🎉 ¡ÉXITO! browser_html_snapshot SÍ extrae atributos HTML');
          console.log('✅ Podemos usar este método para obtener type, name, placeholder');
          return { success: true, inputCount, buttonCount };
        } else {
          console.log('\n⚠️ No se encontraron inputs en el HTML');
          return { success: false, reason: 'No inputs found' };
        }
        
      } else {
        console.log('❌ No se encontró contenido de texto en la respuesta');
        return { success: false, reason: 'No text content' };
      }
    } else {
      console.log('❌ Respuesta de MCP no tiene el formato esperado');
      console.log('📄 Respuesta completa:', JSON.stringify(htmlResult, null, 2));
      return { success: false, reason: 'Invalid response format' };
    }
    
  } catch (error) {
    console.error('\n💥 ERROR EN TEST:', error);
    return { success: false, error };
  } finally {
    // Cleanup
    console.log('\n🧹 Limpiando recursos...');
    await mcpClient.stopMCPServer();
  }
}

// Ejecutar test
if (require.main === module) {
  testBrowserHtmlSnapshot()
    .then((result) => {
      console.log('\n🏆 RESULTADO FINAL DEL TEST:');
      console.log('=' .repeat(50));
      
      if (result.success) {
        console.log('🎉 ¡browser_html_snapshot FUNCIONA!');
        console.log('✅ Puede extraer atributos HTML completos');
        console.log('🚀 Ready para implementar en correlación híbrida!');
      } else {
        console.log('❌ browser_html_snapshot no funcionó como esperábamos');
        if (result.error) {
          console.log(`💥 Error: ${result.error}`);
        } else if (result.reason) {
          console.log(`❓ Razón: ${result.reason}`);
        }
      }
    })
    .catch(console.error);
}

export { testBrowserHtmlSnapshot };