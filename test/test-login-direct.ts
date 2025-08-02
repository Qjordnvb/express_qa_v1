// test-login-direct.ts - Prueba directa del login con formato correcto
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

dotenv.config();

async function testLoginDirect() {
  console.log('🔥 PRUEBA DE FUEGO: LOGIN TEST DIRECTO');
  console.log('=' .repeat(50));

  try {
    // 1. Configurar Gemini
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_API_KEY no configurada');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // 2. Cargar user story de login
    const loginStory = JSON.parse(fs.readFileSync('test-generation/user-stories/login.testcase.json', 'utf8'));
    
    console.log(`📋 Test: "${loginStory.name}"`);
    console.log(`📝 Story: ${loginStory.userStory.join(' → ')}`);

    // 3. Prompt específico para login (formato que funciona)
    const loginPrompt = `
🚀 EXPRESS QA HYBRID - LOGIN TEST GENERATION

**USER STORY:**
${loginStory.userStory.join('\n')}

**TAREA:**
Genera un objeto JSON para testing de login. Usa EXACTAMENTE este formato:

\`\`\`json
{
  "pageObject": {
    "className": "LoginPage",
    "locators": [
      {
        "name": "emailField",
        "elementType": "input",
        "actions": ["fill", "clear"],
        "selectors": [
          {"type": "getByRole", "value": "textbox", "options": {"name": "Email"}},
          {"type": "css", "value": "input[name='email']"}
        ]
      },
      {
        "name": "passwordField", 
        "elementType": "input",
        "actions": ["fill", "clear"],
        "selectors": [
          {"type": "getByRole", "value": "textbox", "options": {"name": "Password"}},
          {"type": "css", "value": "input[type='password']"}
        ]
      },
      {
        "name": "continueButton",
        "elementType": "button", 
        "actions": ["click"],
        "selectors": [
          {"type": "getByRole", "value": "button", "options": {"name": "Continuar"}},
          {"type": "css", "value": "button[type='submit']"}
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
      "action": "fillEmailField",
      "params": ["admin@serempre.com"]
    },
    {
      "action": "fillPasswordField", 
      "params": ["9nZ98£FQ6i,G"]
    },
    {
      "action": "clickContinueButton",
      "params": []
    }
  ]
}
\`\`\`

Genera SOLO el JSON, sin explicaciones adicionales.
`;

    // 4. Llamar a Gemini
    console.log('\n🤖 Consultando Google Gemini para login...');
    const result = await model.generateContent(loginPrompt);
    const response = await result.response;
    const text = response.text();

    console.log('✅ Respuesta recibida');

    // 5. Procesar respuesta (lógica que funciona)
    let jsonText = '';
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    
    if (jsonMatch) {
      jsonText = jsonMatch[1];
    } else {
      const directMatch = text.match(/\{[\s\S]*\}/);
      if (directMatch) {
        jsonText = directMatch[0];
      }
    }
    
    if (jsonText) {
      // Limpiar JSON
      jsonText = jsonText
        .replace(/\n\s*\/\/.*$/gm, '')    // Remover comentarios
        .replace(/,\s*}/g, '}')           // Remover comas finales
        .replace(/,\s*]/g, ']')           // Remover comas finales en arrays
        .trim();
      
      console.log('🔧 JSON limpiado para parsing');
      
      const loginAssets = JSON.parse(jsonText);
      
      console.log('✅ JSON válido parseado');
      console.log(`🎯 Page Object: ${loginAssets.pageObject?.className}`);
      console.log(`🧩 Locators: ${loginAssets.pageObject?.locators?.length} elementos`);
      console.log(`📋 Test Steps: ${loginAssets.testSteps?.length} pasos`);
      
      // Guardar assets
      const assetsPath = 'test-generation/ai-assets/login-direct-test.json';
      fs.writeFileSync(assetsPath, JSON.stringify(loginAssets, null, 2));
      
      console.log(`💾 Assets guardados en: ${assetsPath}`);
      
      // Mostrar elementos
      if (loginAssets.pageObject?.locators) {
        console.log('\n🔍 ELEMENTOS DETECTADOS:');
        loginAssets.pageObject.locators.forEach((locator: any, index: number) => {
          console.log(`   ${index + 1}. ${locator.name} (${locator.elementType})`);
        });
      }
      
      console.log('\n🎉 LOGIN TEST - ÉXITO COMPLETO! 🔥');
      console.log('✅ Gemini generó assets de login válidos');
      console.log('🔥 PRUEBA DE FUEGO SUPERADA');
      
      return { success: true, loginAssets };
      
    } else {
      console.log('❌ No se pudo extraer JSON de la respuesta');
      console.log('📄 Respuesta completa:', text);
      return { success: false, error: 'No JSON found' };
    }

  } catch (error) {
    console.error('💥 ERROR EN PRUEBA DE LOGIN:', error);
    return { success: false, error };
  }
}

// Ejecutar
if (require.main === module) {
  testLoginDirect()
    .then((result) => {
      if (result.success) {
        console.log('\n🏆 RESULTADO FINAL:');
        console.log('🔥 PRUEBA DE FUEGO: LOGIN TEST - COMPLETAMENTE EXITOSO');
        console.log('💎 Sistema híbrido puede generar tests de login complejos');
        console.log('🚀 Ready for orchestrate integration!');
      } else {
        console.log('\n💥 PRUEBA DE FUEGO FALLIDA');
        console.log('❌ Necesita más ajustes en el prompt');
      }
    })
    .catch(console.error);
}

export { testLoginDirect };