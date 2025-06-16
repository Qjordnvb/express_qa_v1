// scripts/generate-pom.ts
import * as fs from 'fs';
import * as path from 'path';

// --- Definición de Interfaces ---
interface SelectorDef {
  type: 'locator' | 'getByRole' | 'getByText' | 'getByLabel' | 'getByPlaceholder' | 'css';
  value: string;
  options?: any;
}

interface LocatorAction {
  name: string;
  elementType?: string;
  actions: ('click' | 'fill' | 'check' | 'select' | 'clear' | 'getValue')[];
  selectors: SelectorDef[];
  waitBefore?: string;
  validateAfter?: boolean;
}

interface PageDefinition {
  className: string;
  locators: LocatorAction[];
}

interface FullDefinition {
  pageObject: PageDefinition;
  testSteps: any[];
}

// --- Funciones Auxiliares ---
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// Función para construir el array de selectores
const buildLocatorsArray = (selectors: SelectorDef[]): string => {
  const selectorLines = selectors.map(s => {
    const optionsString = s.options ? `, ${JSON.stringify(s.options)}` : '';

    switch (s.type) {
      case 'getByRole':
        return `      this.page.getByRole('${s.value}'${optionsString})`;
      case 'getByLabel':
        return `      this.page.getByLabel('${s.value}'${optionsString})`;
      case 'getByPlaceholder':
        return `      this.page.getByPlaceholder('${s.value}'${optionsString})`;
      case 'getByText':
        return `      this.page.getByText('${s.value}'${optionsString})`;
      case 'css':
      case 'locator':
      default:
        return `      this.page.locator(\`${s.value}\`)`;
    }
  });

  return `    const locators = [\n${selectorLines.join(',\n')}\n    ];`;
};

// Función para generar métodos según el tipo de elemento
const generateMethodsForElement = (loc: LocatorAction, testSteps: any[]): string => {
  const methods: string[] = [];
  const elementName = capitalize(loc.name);
  const description = loc.name.replace(/([A-Z])/g, ' $1').trim();




  // SIEMPRE generar método waitFor...Visible para TODOS los elementos
  methods.push(`
  /**
   * Espera a que ${description} sea visible
   */
  async waitFor${elementName}Visible(timeout: number = 10000): Promise<void> {
${buildLocatorsArray(loc.selectors)}
    const element = await this.findSmartly(locators, '${description}');
    await element.waitFor({ state: 'visible', timeout });
    console.log('${description} es visible');
  }`);

  // Buscar si hay métodos de aserción específicos en testSteps
  const relevantSteps = testSteps.filter(step => {
    const stepLower = step.action.toLowerCase();
    const nameLower = loc.name.toLowerCase();
    return stepLower.includes(nameLower);
});

  relevantSteps.forEach(step => {
    const methodName = step.action;

    // Generar métodos de aserción específicos (como assertErrorMessageOneOf)
    if (methodName.startsWith('assert') && methodName.endsWith('OneOf')) {
      const method = `
  /**
   * Verifica que ${description} contenga uno de los textos esperados
   */
  async ${methodName}(expectedTexts: string[]): Promise<void> {
${buildLocatorsArray(loc.selectors)}
    const element = await this.findSmartly(locators, '${description}');
    const actualText = await element.textContent() || '';
    const matchFound = expectedTexts.some(expectedText => actualText.includes(expectedText));
    if (!matchFound) {
      throw new Error(\`El texto del elemento "${description}" no coincide con ninguna de las opciones esperadas. Texto actual: "\${actualText}"\`);
    }
    console.log(\`${description} contiene uno de los textos esperados.\`);
  }`;
      methods.push(method);
    }
  });

  // Para elementos sin acciones (texto/alertas), generar métodos adicionales
  if (loc.actions.length === 0) {
    // Método getText
    methods.push(`
  /**
   * Obtiene el texto de ${description}
   */
  async get${elementName}Text(): Promise<string> {
${buildLocatorsArray(loc.selectors)}
    const element = await this.findSmartly(locators, '${description}');
    const text = await element.textContent();
    return text || '';
  }`);

    // Método assertText
    methods.push(`
  /**
   * Verifica que ${description} contenga el texto esperado
   */
  async assert${elementName}Text(expectedText: string): Promise<void> {
${buildLocatorsArray(loc.selectors)}
    const element = await this.findSmartly(locators, '${description}');
    await expect(element).toContainText(expectedText);
    console.log(\`${description} contiene el texto esperado: "\${expectedText}"\`);
  }`);

    // Método isVisible
    methods.push(`
  /**
   * Verifica si ${description} está visible
   */
  async is${elementName}Visible(): Promise<boolean> {
    try {
${buildLocatorsArray(loc.selectors)}
      const element = await this.findSmartly(locators, '${description}');
      return await element.isVisible();
    } catch {
      return false;
    }
  }`);
  }

  // Generar métodos para acciones definidas
  loc.actions.forEach(action => {
    let method = '';
    const methodName = `${action}${elementName}`;

    switch (action) {
      case 'fill':
        method = `
  /**
   * Llena ${description} con el texto proporcionado
   */
  async ${methodName}(text: string): Promise<void> {
${buildLocatorsArray(loc.selectors)}
    const element = await this.findSmartly(locators, '${description}');
    ${loc.waitBefore ? `await element.waitFor({ state: '${loc.waitBefore}', timeout: 5000 });` : ''}
    await element.clear();
    await element.fill(text);
    ${loc.validateAfter ? `
    const actualValue = await element.inputValue();
    if (actualValue !== text) {
      throw new Error(\`Error al llenar ${description}: se esperaba "\${text}" pero se obtuvo "\${actualValue}"\`);
    }` : ''}
    console.log(\`${description} llenado con: "\${text}"\`);
  }`;
        break;

      case 'click':
        method = `
  /**
   * Hace clic en ${description}
   */
  async ${methodName}(): Promise<void> {
${buildLocatorsArray(loc.selectors)}
    const element = await this.findSmartly(locators, '${description}');
    ${loc.waitBefore === 'enabled' ? `
    await element.waitFor({ state: 'visible', timeout: 5000 });
    await expect(element).toBeEnabled({ timeout: 5000 });` : loc.waitBefore ? `
    await element.waitFor({ state: '${loc.waitBefore}', timeout: 5000 });` : ''}
    try {
      await element.click();
    } catch (error) {
      console.log(\`Primer intento de clic falló en ${description}, reintentando...\`);
      await element.click({ force: true });
    }
    ${loc.validateAfter ? `await this.page.waitForTimeout(500);` : ''}
    console.log(\`Clic realizado en ${description}\`);
  }`;
        break;



      case 'clear':
        method = `
  /**
   * Limpia el contenido de ${description}
   */
  async ${methodName}(): Promise<void> {
${buildLocatorsArray(loc.selectors)}
    const element = await this.findSmartly(locators, '${description}');
    await element.clear();
    console.log(\`${description} limpiado\`);
  }`;
        break;

      case 'getValue':
        method = `
  /**
   * Obtiene el valor actual de ${description}
   */
  async ${methodName}(): Promise<string> {
${buildLocatorsArray(loc.selectors)}
    const element = await this.findSmartly(locators, '${description}');
    return await element.inputValue();
  }`;
        break;

      case 'check':
        method = `
  /**
   * Marca ${description}
   */
  async ${methodName}(): Promise<void> {
${buildLocatorsArray(loc.selectors)}
    const element = await this.findSmartly(locators, '${description}');
    await element.check();
    console.log(\`${description} marcado\`);
  }`;
        break;

      case 'select':
        method = `
  /**
   * Selecciona una opción en ${description}
   */
  async ${methodName}(value: string | { label?: string; value?: string; index?: number }): Promise<void> {
${buildLocatorsArray(loc.selectors)}
    const element = await this.findSmartly(locators, '${description}');
    await element.selectOption(value);
    console.log(\`Opción seleccionada en ${description}\`);
  }`;
        break;
    }

    if (method) {
      methods.push(method);
    }
  });

  return methods.join('\n');
};

// --- Lógica Principal del Script ---
const definitionPath = process.argv[2];
if (!definitionPath) {
  console.error('Error: Por favor, proporciona la ruta al archivo de definición JSON.');
  process.exit(1);
}

try {
  // 1. Leer el archivo JSON
  const fullDefinition: FullDefinition = JSON.parse(fs.readFileSync(definitionPath, 'utf8'));

  // 2. Extraer la definición del page object
  const pageObjectDefinition = fullDefinition.pageObject;
  if (!pageObjectDefinition) {
    console.error('Error: El archivo de definición JSON no contiene la propiedad "pageObject".');
    process.exit(1);
  }

  const { className, locators } = pageObjectDefinition;
  if (!locators || !className) {
    console.error('Error: El objeto "pageObject" debe contener "className" y "locators".');
    process.exit(1);
  }

  // 3. Generar métodos para cada locator
  const allMethods = locators.map(loc => generateMethodsForElement(loc, fullDefinition.testSteps)).join('\n');

  // 4. Generar el template completo
  const template = `// pages/generated/${className}.ts
// Archivo generado automáticamente por 'npm run orchestrate'
// Generador inteligente v2.0 - Adaptado para cualquier sitio web

import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from '../BasePage';

export class ${className} extends BasePage {
  constructor(page: Page) {
    super(page);
  }
${allMethods}
}
`;

  // 5. Escribir el archivo
  const outputDir = path.resolve(__dirname, `../pages/generated`);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, `${className}.ts`);
  fs.writeFileSync(outputPath, template);

  console.log(`✅ Page Object inteligente generado exitosamente!`);
  console.log(`📄 Archivo: ${outputPath}`);
  console.log(`🧠 Elementos procesados: ${locators.length}`);
  console.log(`🎯 Métodos generados: ${allMethods.split('async ').length - 1}`);

} catch (error) {
  console.error('❌ Error al generar Page Object:', error);
  process.exit(1);
}
