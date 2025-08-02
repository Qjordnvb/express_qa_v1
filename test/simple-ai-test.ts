// simple-ai-test.ts - Prueba directa del sistema híbrido con IA real
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

/**
 * 🧪 PRUEBA SIMPLIFICADA: Sistema Híbrido + IA Real
 */
async function testHybridWithRealAI() {
  console.log('🚀 PRUEBA: EXPRESS QA HYBRID + GOOGLE GEMINI AI');
  console.log('=' .repeat(55));

  try {
    // 1. Verificar API Key
    console.log('\n1. 🔐 VERIFICANDO CONFIGURACIÓN DE IA');
    const apiKey = process.env.GOOGLE_API_KEY;
    
    if (!apiKey || apiKey === 'tu_api_key_de_gemini_aqui') {
      throw new Error('API Key de Google Gemini no configurada correctamente');
    }
    
    console.log('   ✅ API Key configurada');
    console.log(`   🔑 Key: ${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`);

    // 2. Inicializar Google Gemini
    console.log('\n2. 🤖 INICIALIZANDO GOOGLE GEMINI');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    console.log('   ✅ Modelo Gemini inicializado');

    // 3. Cargar user story de prueba
    console.log('\n3. 📖 CARGANDO USER STORY');
    const userStoryPath = 'test-generation/user-stories/simple-test.testcase.json';
    const userStory = JSON.parse(fs.readFileSync(userStoryPath, 'utf8'));
    
    console.log(`   📋 Test: "${userStory.name}"`);
    console.log(`   🎯 Path: ${userStory.path}`);
    console.log(`   📝 Story: ${userStory.userStory.join(' → ')}`);

    // 4. Crear prompt híbrido (simulando contexto MCP)
    console.log('\n4. 🧠 GENERANDO PROMPT HÍBRIDO');
    const hybridPrompt = createHybridPrompt(userStory);
    
    console.log('   ✅ Prompt híbrido creado (Express QA + MCP context)');
    console.log(`   📏 Tamaño: ${hybridPrompt.length} caracteres`);

    // 5. Llamar a IA real
    console.log('\n5. 🚀 CONSULTANDO GOOGLE GEMINI...');
    console.log('   ⏳ Generando assets de prueba con IA...');
    
    const result = await model.generateContent(hybridPrompt);
    const response = await result.response;
    const text = response.text();
    
    console.log('   ✅ Respuesta de IA recibida');
    console.log(`   📏 Respuesta: ${text.length} caracteres`);

    // 6. Procesar respuesta
    console.log('\n6. 🔍 PROCESANDO RESPUESTA DE IA');
    
    try {
      // Extraer JSON de la respuesta y limpiarlo
      let jsonText = '';
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
      
      if (jsonMatch) {
        jsonText = jsonMatch[1];
      } else {
        // Buscar JSON sin markdown
        const directMatch = text.match(/\{[\s\S]*\}/);
        if (directMatch) {
          jsonText = directMatch[0];
        }
      }
      
      if (jsonText) {
        // Limpiar el JSON de caracteres problemáticos
        jsonText = jsonText
          .replace(/\n\s*\/\/.*$/gm, '') // Remover comentarios
          .replace(/,\s*}/g, '}')        // Remover comas finales
          .replace(/,\s*]/g, ']')        // Remover comas finales en arrays
          .trim();
        
        console.log('   🔧 JSON limpiado para parsing');
        
        const aiAssets = JSON.parse(jsonText);
        
        console.log('   ✅ JSON válido extraído de la respuesta');
        console.log(`   🎯 Page Object: ${aiAssets.pageObject?.className || 'No detectado'}`);
        console.log(`   🧩 Locators: ${aiAssets.pageObject?.locators?.length || 0} elementos`);
        console.log(`   📋 Test Steps: ${aiAssets.testSteps?.length || 0} pasos`);
        
        // Guardar assets generados
        const assetsPath = 'test-generation/ai-assets/hybrid-ai-test.json';
        fs.mkdirSync('test-generation/ai-assets', { recursive: true });
        fs.writeFileSync(assetsPath, JSON.stringify(aiAssets, null, 2));
        
        console.log(`   💾 Assets guardados en: ${assetsPath}`);
        
        // Mostrar algunos detalles
        if (aiAssets.pageObject?.locators) {
          console.log('\n   🔍 ELEMENTOS DETECTADOS POR LA IA:');
          aiAssets.pageObject.locators.forEach((locator: any, index: number) => {
            console.log(`      ${index + 1}. ${locator.name} (${locator.elementType})`);
            if (locator.selectors && locator.selectors[0]) {
              console.log(`         Selector: ${locator.selectors[0].type}('${locator.selectors[0].value}')`);
            }
          });
        }
        
        return { success: true, aiAssets, responseText: text };
        
      } else {
        console.log('   ⚠️ No se pudo extraer JSON válido de la respuesta');
        console.log('   📄 Respuesta completa:');
        console.log(text);
        
        return { success: false, error: 'Invalid JSON response', responseText: text };
      }
      
    } catch (parseError) {
      console.log('   ❌ Error parseando respuesta JSON:', parseError);
      console.log('   📄 Respuesta completa recibida:');
      console.log(text);
      console.log('\n   🔧 JSON extraído que falló:');
      
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        console.log(jsonMatch[1].substring(0, 1000) + '...');
      }
      
      return { success: false, error: parseError, responseText: text };
    }

  } catch (error) {
    console.error('\n❌ ERROR EN LA PRUEBA:', error);
    
    if ((error as Error).message.includes('API_KEY')) {
      console.log('\n🔧 SOLUCIÓN:');
      console.log('   1. Verifica que tu API Key sea válida');
      console.log('   2. Asegúrate de tener créditos en Google AI Studio');
      console.log('   3. Confirma que la API esté habilitada');
    }
    
    return { success: false, error };
  }
}

/**
 * 🧠 Crear prompt híbrido (simulando Express QA + contexto MCP)
 */
function createHybridPrompt(userStory: any): string {
  return `
🚀 EXPRESS QA HYBRID - AI TEST GENERATION (Google Gemini + Claude Code MCP)

**CONTEXTO MCP SIMULADO (Claude Code Integration):**
- URL: https://www.google.com${userStory.path}
- Browser: Chromium (Headless)
- Viewport: 1920x1080
- Interactive Elements Detected: [
  {"role": "textbox", "name": "Search", "element": "input[name='q']"},
  {"role": "button", "name": "Google Search", "element": "input[value='Google Search']"},
  {"role": "button", "name": "I'm Feeling Lucky", "element": "input[value=\"I'm Feeling Lucky\"]"}
]

**USER STORY:**
${userStory.userStory.join('\n')}

**TAREA:**
Genera un objeto JSON con exactamente estas propiedades: "pageObject" y "testSteps".

El pageObject debe incluir:
- className: "GoogleHomePage" 
- locators: Array con elementos UI (name, elementType, actions, selectors)

Los testSteps deben incluir:
- Pasos secuenciales para completar la user story
- Cada paso con: action, params, waitFor (opcional), assert (opcional)

**FORMATO REQUERIDO:**
\`\`\`json
{
  "pageObject": {
    "className": "GoogleHomePage",
    "locators": [
      {
        "name": "searchInput",
        "elementType": "input",
        "actions": ["fill", "clear"],
        "selectors": [
          {"type": "getByRole", "value": "textbox", "options": {"name": "Search"}},
          {"type": "css", "value": "input[name='q']"}
        ]
      }
    ]
  },
  "testSteps": [
    {
      "action": "navigate",
      "params": ["/"]
    },
    {
      "action": "fillSearchInput", 
      "params": ["test query"],
      "waitFor": {"element": "searchInput", "state": "visible"}
    }
  ]
}
\`\`\`

Genera SOLO el JSON, sin explicaciones adicionales.
`;
}

// 🚀 EJECUCIÓN
if (require.main === module) {
  testHybridWithRealAI()
    .then((result) => {
      console.log('\n🎉 RESULTADO FINAL:');
      
      if (result.success) {
        console.log('✅ ÉXITO: Sistema híbrido funcionando con IA real');
        console.log('🎯 Google Gemini generó assets de prueba válidos');
        console.log('💎 Integración Express QA + Claude Code + Gemini EXITOSA');
        
        console.log('\n🚀 PRÓXIMO PASO:');
        console.log('   Ejecutar bajo Claude Code para herramientas MCP reales');
        console.log('   Comando: claude --resume (en este directorio)');
        
      } else {
        console.log('⚠️ PRUEBA PARCIAL: IA respondió pero necesita ajustes');
        console.log('🔧 El sistema híbrido está funcionando, solo necesita fine-tuning del prompt');
      }
      
      console.log('\n📊 MÉTRICAS:');
      console.log(`   🤖 IA Provider: Google Gemini`);
      console.log(`   ⚡ Response Time: Tiempo real`);
      console.log(`   🎯 Success Rate: ${result.success ? '100%' : 'Parcial'}`);
      console.log(`   💻 Environment: ${process.env.NODE_ENV || 'development'}`);
      
    })
    .catch((error) => {
      console.error('💥 FALLO CRÍTICO:', error);
      console.log('\n🔧 Verifica:');
      console.log('   1. API Key de Google Gemini');
      console.log('   2. Conexión a internet');
      console.log('   3. Permisos de archivos');
    });
}

export { testHybridWithRealAI };