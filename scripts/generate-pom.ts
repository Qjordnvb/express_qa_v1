// scripts/generate-pom.ts
import * as fs from 'fs';
import * as path from 'path';

// --- Definición de Interfaces ---
interface SelectorDef {
  type: 'locator' | 'getByRole' | 'getByText' | 'getByLabel' | 'getByPlaceholder';
  value: string;
  options?: any;
}
interface LocatorAction {
  name: string;
  actions: ('click' | 'fill' | 'check' | 'select')[];
  selectors: SelectorDef[];
}
interface PageDefinition {
  className: string;
  locators: LocatorAction[];
}
// Interfaz para el archivo JSON completo que nos da la IA
interface FullDefinition {
  pageObject: PageDefinition;
  testSteps: any[]; // No nos importa la estructura de testSteps en este script
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// --- Lógica Principal del Script ---
const definitionPath = process.argv[2];
if (!definitionPath) {
  console.error('Error: Por favor, proporciona la ruta al archivo de definición JSON.');
  process.exit(1);
}

// ---- LA CORRECCIÓN DEFINITIVA ESTÁ AQUÍ ----
// 1. Leemos el archivo completo que nos pasa el orquestador
const fullDefinition: FullDefinition = JSON.parse(fs.readFileSync(definitionPath, 'utf8'));

// 2. Extraemos la sección 'pageObject' de ese archivo
const pageObjectDefinition = fullDefinition.pageObject;
if (!pageObjectDefinition) {
  console.error('Error: El archivo de definición JSON no contiene la propiedad "pageObject".');
  process.exit(1);
}

// 3. Ahora sí, extraemos 'className' y 'locators' de la sección correcta.
const { className, locators } = pageObjectDefinition;

if (!locators || !className) {
  console.error('Error: El objeto "pageObject" en el archivo JSON debe contener las propiedades "className" y "locators".');
  process.exit(1);
}
// ------------------------------------------

const methods = locators.map(loc => {
  const description = loc.name.replace(/([A-Z])/g, ' $1').trim();

  const buildLocatorsArray = () => `const locators = [
${loc.selectors.map(s => {
  const optionsString = s.options ? JSON.stringify(s.options) : '';
  switch (s.type) {
    case 'getByRole':
      return `        this.page.getByRole('${s.value}', ${optionsString})`;
    case 'getByLabel':
      return `        this.page.getByLabel('${s.value}')`;
    case 'getByPlaceholder':
      return `        this.page.getByPlaceholder('${s.value}')`;
    case 'getByText':
      return `        this.page.getByText('${s.value}')`;
    case 'locator':
    default:
      return `        this.page.locator("${s.value}")`;
  }
}).join(',\n')}
      ];`;

  return loc.actions.map(action => {
    const methodName = `${action}${capitalize(loc.name)}`;
    let methodSignature = `async ${methodName}(): Promise<void> {`;
    let actionCall = `await element.click();`;

    if (action === 'fill') {
      methodSignature = `async ${methodName}(text: string): Promise<void> {`;
      actionCall = `await element.fill(text);`;
    } else if (action === 'select') {
      methodSignature = `async ${methodName}(value: string | { label: string }): Promise<void> {`;
      actionCall = `await element.selectOption(value);`;
    } else if (action === 'check') {
      actionCall = `await element.check();`;
    }

    return `
  /**
   * Acción resiliente generada para '${loc.name}'.
   * Usa findSmartly para intentar con múltiples selectores.
   */
  ${methodSignature}
    ${buildLocatorsArray()}
    const element = await this.findSmartly(locators, '${description}');
    ${actionCall}
  }`;
  }).join('');
}).join('');

const template = `// pages/${className}.ts
// Archivo generado automáticamente por 'npm run orchestrate'
import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class ${className} extends BasePage {
  constructor(page: Page) {
    super(page);
  }
${methods}
}
`;

const outputDir = path.resolve(__dirname, `../pages/generated`);
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}
const outputPath = path.join(outputDir, `${className}.ts`);
fs.writeFileSync(outputPath, template);

console.log(`¡Éxito! Page Object resiliente generado en: ${outputPath}`);
