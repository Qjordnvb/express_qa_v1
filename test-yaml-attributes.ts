// test-yaml-attributes.ts
// Test para ver qué atributos hay en el YAML de los 12 elementos

import { MCPClientService } from './orchestrator/services/McpClientService';

async function testYamlAttributes() {
  console.log('\n🔍 TEST: Atributos en YAML de MCP');
  console.log('='.repeat(50));

  const mcpClient = new MCPClientService();

  try {
    await mcpClient.startMCPServer();
    await mcpClient.navigateToUrl('https://admin-dev.membeers.com/');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Obtener contexto que ya no tiene browser_evaluate problemático
    const context = await mcpClient.getRealTimeContext();

    console.log(`\n📊 RESUMEN:`);
    console.log(`  - Elementos YAML: ${context.interactiveElements.length}`);
    console.log(`  - DOM elements: ${context.domElements ? context.domElements.length : 'undefined'}`);

    console.log(`\n🔍 ELEMENTOS YAML DETALLADOS:`);
    context.interactiveElements.forEach((element, index) => {
      console.log(`\n${index + 1}. ELEMENTO [ref=${element.ref}]:`);
      console.log(`   - Role: "${element.role}"`);
      console.log(`   - Name: "${element.name}"`);
      console.log(`   - Element: "${element.element}"`);
      console.log(`   - Attributes: "${element.attributes}"`);

      // Mostrar TODAS las propiedades
      console.log(`   - ALL PROPERTIES:`, Object.keys(element));

      // Mostrar el objeto completo
      console.log(`   - FULL OBJECT:`, JSON.stringify(element, null, 6));
    });

    console.log(`\n📄 SNAPSHOT YAML RAW:`);
    if (context.domSnapshot) {
      // Mostrar los primeros 1000 caracteres del YAML
      console.log(context.domSnapshot.substring(0, 1000));
      console.log('\n... [truncated]');

      // Buscar específicamente type="password"
      if (context.domSnapshot.includes('type=')) {
        console.log(`\n🎯 FOUND TYPE ATTRIBUTES:`);
        const typeMatches = context.domSnapshot.match(/\[type=[^\]]+\]/g);
        if (typeMatches) {
          typeMatches.forEach(match => {
            console.log(`   - ${match}`);
          });
        }
      }

      // Buscar placeholder
      if (context.domSnapshot.includes('placeholder=')) {
        console.log(`\n🎯 FOUND PLACEHOLDER ATTRIBUTES:`);
        const placeholderMatches = context.domSnapshot.match(/\[placeholder=[^\]]+\]/g);
        if (placeholderMatches) {
          placeholderMatches.forEach(match => {
            console.log(`   - ${match}`);
          });
        }
      }
    }

  } catch (error) {
    console.error('💥 ERROR:', error);
  } finally {
    await mcpClient.stopMCPServer();
  }
}

if (require.main === module) {
  testYamlAttributes().catch(console.error);
}
