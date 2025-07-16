// scripts/generate-spec.ts
import * as fs from 'fs';
import * as path from 'path';

// --- Definición de Interfaces ---
interface TestStep {
  page: string;
  action: string;
  params: unknown[];
  waitFor?: {
    element: string;
    state: string;
  };
  assert?: {
    type: string;
    expected?: unknown;
    expectedOptions?: unknown[];
  };
}

interface PageDefinition {
  className: string;
}

interface FullDefinition {
  pageObject: PageDefinition;
  additionalPageObjects?: PageDefinition[];
  testSteps: TestStep[];
}

interface TestCase {
  name: string;
  path: string;
}

// --- Lógica Principal ---

const fullDefinitionPath = process.argv[2];
const testCasePath = process.argv[3];

if (!fullDefinitionPath || !testCasePath) {
  console.error("Error: Se requieren dos rutas de archivo: la de los activos de la IA y la del caso de prueba.");
  process.exit(1);
}

const fullDefinition: FullDefinition = JSON.parse(fs.readFileSync(fullDefinitionPath, 'utf8'));
const testCase: TestCase = JSON.parse(fs.readFileSync(testCasePath, 'utf8'));
const { pageObject, additionalPageObjects = [], testSteps } = fullDefinition;

const allPageClasses = [pageObject, ...additionalPageObjects];
const uniqueClassNames = [...new Set(allPageClasses.map(p => p.className))];

const pomImports = uniqueClassNames.map(className =>
  `import { ${className} } from '../../pages/generated/${className}';`
).join('\n');

const pomDeclarations = uniqueClassNames.map(className => {
  const instanceName = `${className.charAt(0).toLowerCase()}${className.slice(1)}`;
  return `  let ${instanceName}: ${className};`;
}).join('\n');

const pomInitializations = uniqueClassNames.map(className => {
    const instanceName = `${className.charAt(0).toLowerCase()}${className.slice(1)}`;
    return `    ${instanceName} = new ${className}(page);`;
}).join('\n');

const testFileName = testCase.name.replace(/\s+/g, '-').toLowerCase();

// --- Validación cruzada de métodos ---
function getAllPomMethods(className: string): string[] {
    const pomPath = path.resolve(__dirname, `../pages/generated/${className}.ts`);
   const basePagePath = path.resolve(__dirname, '../pages/BasePage.ts');

     let methods: string[] = [];
     const methodRegex = /async ([a-zA-Z0-9_]+)/g;
    let match;

    // Leer métodos de la clase específica
    if (fs.existsSync(pomPath)) {
      const content = fs.readFileSync(pomPath, 'utf8');
      while ((match = methodRegex.exec(content)) !== null) {
        methods.push(match[1]);
      }
    }

    // Leer y añadir métodos de la BasePage
    if (fs.existsSync(basePagePath)) {
      const baseContent = fs.readFileSync(basePagePath, 'utf8');
     // Resetear la regex para una nueva búsqueda
      methodRegex.lastIndex = 0;
      while ((match = methodRegex.exec(baseContent)) !== null) {
        methods.push(match[1]);
      }
    }

    // Devolver una lista única de métodos
    return [...new Set(methods)];
  }

const pomMethodsByClass: Record<string, string[]> = {};
uniqueClassNames.forEach(className => {
  pomMethodsByClass[className] = getAllPomMethods(className);
});

testSteps.forEach((step, index) => {
  if (!step.page || !uniqueClassNames.includes(step.page)) return;
  const className = step.page;
  const methodName = step.action;
  if (!pomMethodsByClass[className].includes(methodName)) {
    console.warn(`[ADVERTENCIA] El método '${methodName}' llamado en el paso ${index + 1} no existe en el Page Object '${className}'. Considera agregarlo o revisar la convención de nombres.`);
  }
});

const specSteps = testSteps.map((step, index) => {
  let className = step.page;
  const isMultiPageTest = uniqueClassNames.length > 1;

  // --- LÓGICA MEJORADA PARA DETERMINAR LA PÁGINA ---
  // Si la página no está definida en el paso...
  if (!className) {
    // Y si es un test de una sola página, asumimos que es esa única página.
    if (!isMultiPageTest) {
      className = uniqueClassNames[0];
    } else {
      // Si es multi-página y no se especifica, es un error y se omite.
      console.warn(
        `[ADVERTENCIA] El paso de prueba '${step.action}' en un test multi-página no especifica a qué página pertenece. Se omitirá.`
      );
      return `// Paso omitido: 'page' no especificada en test multi-página.`;
    }
  }
  // Si la página está definida pero no existe, también se omite.
  else if (!uniqueClassNames.includes(className)) {
    console.warn(
      `[ADVERTENCIA] El paso de prueba '${step.action}' tiene una propiedad 'page' inválida ('${className}'). Se omitirá.`
    );
    return `// Paso omitido por 'page' inválida: ${JSON.stringify(step)}`;
  }

  const methodName = step.action;
  const instanceName = `${className.charAt(0).toLowerCase()}${className.slice(1)}`;
  const params = Array.isArray(step.params) ? step.params : [];
  const paramsString = params.map(p => JSON.stringify(p)).join(', ');

  let stepCode = `    // Paso ${index + 1}: ${methodName} en la página ${className}\n`;

  // --- LÓGICA DE VALIDACIÓN Y GENERACIÓN DE CÓDIGO ---

  // Se mantiene la validación para asegurar que el método fue generado correctamente en el POM.
  // El método 'navigate' se maneja aquí porque ahora tenemos un 'className' válido.
  if (!pomMethodsByClass[className].includes(methodName)) {
    console.warn(
      `[ADVERTENCIA] El método '${methodName}' llamado en el paso ${index + 1} no existe en el Page Object '${className}'. Paso omitido.`
    );
    return `// Paso omitido: método '${methodName}' no existe en '${className}'`;
  }

  if (methodName.toLowerCase().includes('navigate')) {
    stepCode += `    await ${instanceName}.navigate(${JSON.stringify(testCase.path)});`;
  } else {
    stepCode += `    await ${instanceName}.${methodName}(${paramsString});`;
  }

  // LÓGICA DE ASERCIÓN
  if (step.assert) {
    switch (step.assert.type) {
      case 'textVisible':
        stepCode += `\n    await expect(page.locator('body')).toContainText(${JSON.stringify(
          step.assert.expected
        )});`;
        break;
      case 'urlContains': {
        const expectedString = String(step.assert.expected).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        stepCode += `\n    await expect(page).toHaveURL(new RegExp('.*' + ${JSON.stringify(
          expectedString
        )} + '.*'));`;
        break;
      }
      case 'oneOf': {
        const options = (step.assert.expectedOptions || [])
          .map(opt => JSON.stringify(opt))
          .join(', ');
        stepCode += `\n    await ${instanceName}.${methodName}([${options}]);`;
        break;
      }
      default:
        console.warn(`[ADVERTENCIA] Tipo de aserción no reconocido: ${step.assert.type}`);
    }
  }

  return stepCode;
}).join('\n');


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
    await page.setViewportSize({ width: 1920, height: 1080 });
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

      const screenshotPath = \`\${baseFilePath}_screenshot.png\`;
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(\`[DEBUG] Captura de pantalla de fallo guardada en: \${screenshotPath}\`);

      const htmlPath = \`\${baseFilePath}_page.html\`;
      const html = await page.content();
      await fs.promises.writeFile(htmlPath, html);
      console.log(\`[DEBUG] HTML de fallo guardado en: \${htmlPath}\`);
    }
  });
});
`;

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
