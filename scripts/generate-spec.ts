// scripts/generate-spec.ts
import * as fs from 'fs';
import * as path from 'path';

// --- Definición de Interfaces ---
interface TestStep {
  action: string;
  params: string[];
  waitFor?: {
    element: string;
    state: string;
  };
  assert?: {
    type: string;
    expected?: string;
    expectedOptions?: string[];
  };
}

interface PageDefinition {
  className: string;
}

interface FullDefinition {
  pageObject: PageDefinition;
  testSteps: TestStep[];
}

interface TestCase {
  name: string;
  path: string;
}

// Argumento 1: Ruta al archivo de activos de la IA (.ai-assets.json)
const fullDefinitionPath = process.argv[2];
// Argumento 2: Ruta al caso de prueba original (.testcase.json)
const testCasePath = process.argv[3];

if (!fullDefinitionPath || !testCasePath) {
  console.error("Error: Se requieren dos rutas de archivo: la de los activos de la IA y la del caso de prueba.");
  process.exit(1);
}

const fullDefinition: FullDefinition = JSON.parse(fs.readFileSync(fullDefinitionPath, 'utf8'));
const testCase: TestCase = JSON.parse(fs.readFileSync(testCasePath, 'utf8'));
const { pageObject, testSteps } = fullDefinition;
const { className } = pageObject;
const { path: navigationPath } = testCase;
const pomInstanceName = `${className.charAt(0).toLowerCase()}${className.slice(1)}`;
const testFileName = className.replace(/([A-Z])/g, '-$1').toLowerCase().slice(1);

// Función para generar aserciones apropiadas según el tipo
const generateAssertion = (step: TestStep, pomInstanceName: string): string => {
  if (!step.assert) return '';

  const { type, expected } = step.assert;

  // Para aserciones de tipo "oneOf", el método ya está implementado en el POM
  if (type === 'oneOf' && step.action.includes('OneOf')) {
    return ''; // El método del POM ya maneja la aserción
  }

  // Para otras aserciones, generar el código apropiado
  if (type === 'text' && expected) {
    return `\n    // Validación: ${step.action}\n    await expect(${pomInstanceName}.page).toContainText('${expected}');`;
  }

  return '';
};

// Función para generar esperas inteligentes
const generateWaitFor = (step: TestStep, pomInstanceName: string): string => {
  if (!step.waitFor) return '';

  const { element, state } = step.waitFor;

  // Si el método ya incluye "waitFor" en su nombre, no duplicar
  if (step.action.includes('waitFor')) {
    return '';
  }

  // Generar espera explícita antes de la acción
  return `\n    // Esperando que ${element} esté ${state}\n    await ${pomInstanceName}.waitFor${element.charAt(0).toUpperCase() + element.slice(1)}Visible();`;
};

// Generar los pasos del test con manejo inteligente
const specSteps = testSteps.map((step, index) => {
  const paramsString = step.params.map(p => JSON.stringify(p)).join(', ');
  let stepCode = '';

  // Manejo especial para navegación
  if (step.action.toLowerCase().includes('navigate')) {
    stepCode = `await ${pomInstanceName}.navigate(${JSON.stringify(navigationPath)});`;

    // Si hay waitFor después de navegación, agregarlo
    if (step.waitFor) {
      stepCode += `\n    // Esperando que la página cargue completamente`;
      stepCode += `\n    await ${pomInstanceName}.page.waitForLoadState('networkidle');`;
    }
  }
  // Manejo especial para expects de URL
  else if (step.action.startsWith('expect')) {
    stepCode = `await expect(page).toHaveURL(new RegExp(${paramsString}));`;
  }
  // Todos los demás métodos del POM
  else {
    // Agregar espera si es necesaria
    const waitCode = generateWaitFor(step, pomInstanceName);
    if (waitCode) {
      stepCode += waitCode + '\n    ';
    }

    // Llamar al método del POM
    stepCode += `await ${pomInstanceName}.${step.action}(${paramsString});`;

    // Agregar aserción si es necesaria
    const assertCode = generateAssertion(step, pomInstanceName);
    if (assertCode) {
      stepCode += assertCode;
    }
  }

  // Agregar comentario descriptivo para cada paso importante
  if (index > 0 && (step.waitFor || step.assert || step.action.includes('click'))) {
    stepCode = `\n    // Paso ${index + 1}: ${step.action}\n    ${stepCode}`;
  }

  return stepCode;
}).join('\n    ');

// Construir el template final del archivo de prueba con mejor estructura
const template = `// tests/generated/${testFileName}.spec.ts
// Archivo de prueba generado automáticamente por 'npm run orchestrate'
// Historia de usuario: ${testCase.name}

import { test, expect } from '@playwright/test';
import { ${className} } from '../../pages/generated/${className}';
import * as fs from 'fs';

test.describe('${testCase.name}', () => {
  let ${pomInstanceName}: ${className};
  const testFileName = '${testFileName}'; // Definir la variable que faltaba

  test.beforeEach(async ({ page }) => {
    ${pomInstanceName} = new ${className}(page);

    // Configuración inicial para mejorar estabilidad
    await page.setViewportSize({ width: 1280, height: 720 });
    page.setDefaultTimeout(30000);
  });

  test('Flujo completo de la historia de usuario', async ({ page }) => {
    try {
      // === INICIO DEL FLUJO DE PRUEBA ===
      ${specSteps}

      // === FIN DEL FLUJO DE PRUEBA ===
      console.log('✅ Test "${testCase.name}" ejecutado con éxito!');
    } catch (error) {
      // Captura de pantalla en caso de fallo para debugging
      await page.screenshot({
        path: \`test-results/\${testFileName}-failure-\${Date.now()}.png\`,
        fullPage: true
      });
      throw error;
    }
  });

  test.afterEach(async ({ page }, testInfo) => {
    // Log adicional si el test falló
    if (testInfo.status !== 'passed') {
      console.log(\`❌ Test falló: \${testInfo.error?.message}\`);

      // Guardar el HTML de la página para debugging
      const html = await page.content();
      const htmlPath = \`test-results/\${testFileName}-failure-\${Date.now()}.html\`;
      await fs.promises.writeFile(htmlPath, html);
      console.log(\`HTML guardado en: \${htmlPath}\`);
    }
  });
});
`;

// Escribir el nuevo archivo en la carpeta 'tests/generated'
const outputDir = path.resolve(__dirname, `../tests/generated`);
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}
const outputPath = path.join(outputDir, `${testFileName}.spec.ts`);
fs.writeFileSync(outputPath, template);

console.log(`✅ Archivo de prueba generado exitosamente!`);
console.log(`📄 Ubicación: ${outputPath}`);
console.log(`🎯 Pasos de prueba: ${testSteps.length}`);
console.log(`⏳ Esperas inteligentes: ${testSteps.filter(s => s.waitFor).length}`);
console.log(`✓ Aserciones: ${testSteps.filter(s => s.assert).length}`);
