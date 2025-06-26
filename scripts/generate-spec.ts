// scripts/generate-spec.ts
import * as fs from 'fs';
import * as path from 'path';

// --- Definición de Interfaces (MODIFICADAS para Multi-Página) ---
interface TestStep {
  page: string; // OBLIGATORIO: Indica qué Page Object usar
  action: string;
  params: any[];
  waitFor?: {
    element: string;
    state: string;
  };
  assert?: {
    type: string;
    expected?: any;
    expectedOptions?: any[];
  };
}

interface PageDefinition {
  className: string;
}

interface FullDefinition {
  pageObject: PageDefinition;
  additionalPageObjects?: PageDefinition[]; // <-- Acepta páginas adicionales
  testSteps: TestStep[];
}

interface TestCase {
  name: string;
  path: string;
}

// --- Lógica Principal (MODIFICADA PARA MULTI-PÁGINA) ---

const fullDefinitionPath = process.argv[2];
const testCasePath = process.argv[3];

if (!fullDefinitionPath || !testCasePath) {
  console.error("Error: Se requieren dos rutas de archivo: la de los activos de la IA y la del caso de prueba.");
  process.exit(1);
}

const fullDefinition: FullDefinition = JSON.parse(fs.readFileSync(fullDefinitionPath, 'utf8'));
const testCase: TestCase = JSON.parse(fs.readFileSync(testCasePath, 'utf8'));
const { pageObject, additionalPageObjects = [], testSteps } = fullDefinition;

// =======================================================================
// INICIO DE LA MODIFICACIÓN: Lógica Multi-Página
// =======================================================================

// 1. Identificar todos los Page Objects únicos que se necesitan para el flujo.
const allPageClasses = [pageObject, ...additionalPageObjects];
const uniqueClassNames = [...new Set(allPageClasses.map(p => p.className))];

// 2. Generar las sentencias 'import' para cada Page Object.
const pomImports = uniqueClassNames.map(className =>
  `import { ${className} } from '../../pages/generated/${className}';`
).join('\n');

// 3. Generar las declaraciones de variables para cada instancia de Page Object.
const pomDeclarations = uniqueClassNames.map(className => {
  const instanceName = `${className.charAt(0).toLowerCase()}${className.slice(1)}`;
  return `  let ${instanceName}: ${className};`;
}).join('\n');

// 4. Generar las inicializaciones dentro de beforeEach.
const pomInitializations = uniqueClassNames.map(className => {
    const instanceName = `${className.charAt(0).toLowerCase()}${className.slice(1)}`;
    return `    ${instanceName} = new ${className}(page);`;
}).join('\n');

// El nombre del archivo de prueba se basa en el nombre del caso de prueba para consistencia.
const testFileName = testCase.name.replace(/\s+/g, '-').toLowerCase();

// 5. Generar los pasos del test, usando el Page Object correcto para cada paso.
const specSteps = testSteps.map((step, index) => {
  // Validar que el paso tenga una página definida y que esa página sea una de las que conocemos.
  if (!step.page || !uniqueClassNames.includes(step.page)) {
    console.warn(`[ADVERTENCIA] El paso de prueba '${step.action}' tiene una propiedad 'page' inválida o faltante ('${step.page}'). Se omitirá.`);
    return `// Paso omitido por 'page' inválida: ${JSON.stringify(step)}`;
  }

  // Determinar la instancia correcta del POM a usar (ej. 'homePage' o 'searchResultsPage').
  const instanceName = `${step.page.charAt(0).toLowerCase()}${step.page.slice(1)}`;
  const paramsString = step.params.map(p => JSON.stringify(p)).join(', ');
  let stepCode = '';

  // Lógica de generación de pasos (sin cambios en su lógica interna, solo usando 'instanceName')
  if (step.action.toLowerCase().includes('navigate')) {
    stepCode = `await ${instanceName}.navigate(${JSON.stringify(testCase.path)});`;
  } else if (step.action.startsWith('expect')) {
    stepCode = `await expect(page).toHaveURL(new RegExp(${paramsString}));`;
  } else {
    stepCode = `await ${instanceName}.${step.action}(${paramsString});`;
  }

  if (index > 0) {
      stepCode = `\n    // Paso ${index + 1}: ${step.action} en la página ${step.page}\n    ${stepCode}`;
  }

  return stepCode;
}).join('\n    ');

// =======================================================================
// FIN DE LA MODIFICACIÓN
// =======================================================================


// Construir el template final del archivo de prueba
const template = `// tests/generated/${testFileName}.spec.ts
// Archivo de prueba multi-página generado automáticamente.
// Historia de usuario: ${testCase.name}

import { test, expect, type Page } from '@playwright/test';
${pomImports}
import * as fs from 'fs';
import * as path from 'path';

test.describe('${testCase.name}', () => {
${pomDeclarations}
  const testFileName = '${testFileName}';

  test.beforeEach(async ({ page }) => {
    // Instanciar todos los Page Objects necesarios para el flujo
${pomInitializations}

    // Configuración inicial
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
      console.error('❌ Fallo detectado en el flujo de prueba:', error);
      // La captura de fallo ahora se maneja exclusivamente en afterEach.
      throw error;
    }
  });

  test.afterEach(async ({ page }, testInfo) => {
    // Guardar artefactos solo si la prueba falló
    if (testInfo.status !== 'passed') {
      console.log(\`[DEBUG] El test falló: \${testInfo.error?.message}\`);
      const failureDir = path.resolve(__dirname, '../../test-results/failures');
      if (!fs.existsSync(failureDir)) fs.mkdirSync(failureDir, { recursive: true });

      const timestamp = new Date().toISOString().replace(/:/g, '-');
      const safeTestName = testInfo.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const baseFilePath = path.join(failureDir, \`\${safeTestName}_\${timestamp}\`);

      // Guardar captura de pantalla
      const screenshotPath = \`\${baseFilePath}_screenshot.png\`;
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(\`[DEBUG] Captura de pantalla de fallo guardada en: \${screenshotPath}\`);

      // Guardar HTML
      const htmlPath = \`\${baseFilePath}_page.html\`;
      const html = await page.content();
      await fs.promises.writeFile(htmlPath, html);
      console.log(\`[DEBUG] HTML de fallo guardado en: \${htmlPath}\`);
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

console.log(`✅ Archivo de prueba multi-página generado exitosamente!`);
console.log(`📄 Ubicación: ${outputPath}`);
console.log(`🧠 Page Objects involucrados: ${uniqueClassNames.join(', ')}`);
console.log(`🎯 Pasos de prueba generados: ${testSteps.length}`);
