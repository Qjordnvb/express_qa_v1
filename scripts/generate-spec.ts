// scripts/generate-spec.ts
import * as fs from 'fs';
import * as path from 'path';

// --- Definición de Interfaces ---
interface TestStep {
  action: string;
  params: string[];
}

interface PageDefinition {
  className: string;
}

interface FullDefinition {
  pageObject: PageDefinition;
  testSteps: TestStep[];
}



// --- Lógica Principal ---
const definitionPath = process.argv[2];
if (!definitionPath) {
  console.error('Error: Por favor, proporciona la ruta al archivo de definición JSON completo.');
  process.exit(1);
}

const fullDefinition: FullDefinition = JSON.parse(fs.readFileSync(definitionPath, 'utf8'));
const { pageObject, testSteps } = fullDefinition;
const { className } = pageObject;
const pomInstanceName = `${className.charAt(0).toLowerCase()}${className.slice(1)}`;
const testFileName = className.replace(/([A-Z])/g, '-$1').toLowerCase().slice(1);

// Generar los pasos del test
const specSteps = testSteps.map(step => {
  const paramsString = step.params.map(p => typeof p === 'string' ? `'${p}'` : p).join(', ');

  if (step.action === 'navigate') {
    return `    await page.goto('/${paramsString.replace(/'/g, '')}');`;
  }
  if (step.action.startsWith('expect')) {
    return `    await expect(page).toHaveURL(new RegExp(${paramsString}));`;
  }
  return `    await ${pomInstanceName}.${step.action}(${paramsString});`;
}).join('\n');


// Construir el template final del archivo de prueba
const template = `// tests/generated/${testFileName}.spec.ts
// Archivo de prueba generado automáticamente por 'npm run orchestrate'
import { test, expect } from '@playwright/test';
import { ${className} } from '../../pages/${className}';

test.describe('Test generado por IA para ${className}', () => {
  test('Debería completar el flujo descrito en la historia de usuario', async ({ page }) => {
    const ${pomInstanceName} = new ${className}(page);

${specSteps}

    console.log('Test generado por IA ejecutado con éxito!');
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

console.log(`¡Éxito! Archivo de prueba generado en: ${outputPath}`);
