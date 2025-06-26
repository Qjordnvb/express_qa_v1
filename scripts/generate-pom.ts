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

// MODIFICADO: La definición completa ahora puede incluir múltiples Page Objects.
interface FullDefinition {
  pageObject: PageDefinition;
  additionalPageObjects?: PageDefinition[];
  testSteps: any[];
}

// --- Funciones Auxiliares ---
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// Función para construir el array de selectores (sin cambios)
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

// =======================================================================
// INICIO DE LA MODIFICACIÓN DE `generateMethodsForElement`
// =======================================================================
// Se respeta el código original y se AÑADE la lógica proactiva.

const generateMethodsForElement = (loc: LocatorAction, testSteps: any[]): string => {
  const methods: string[] = [];
  // Usamos un Set para evitar generar el mismo método dos veces.
  const generatedMethodNames = new Set<string>();
  const elementName = capitalize(loc.name);
  const description = loc.name.replace(/([A-Z])/g, ' $1').trim();

  // Función de ayuda para añadir métodos de forma segura y sin duplicados.
  const addMethod = (methodCode: string, methodName: string) => {
      if (methodCode && !generatedMethodNames.has(methodName)) {
          methods.push(methodCode);
          generatedMethodNames.add(methodName);
      }
  };

  // Lógica de tu archivo original (INTACTA)
  // SIEMPRE generar método waitFor...Visible para TODOS los elementos
  addMethod(`
  /**
   * Espera a que ${description} sea visible
   */
  async waitFor${elementName}Visible(timeout: number = 10000): Promise<void> {
${buildLocatorsArray(loc.selectors)}
    const element = await this.findSmartly(locators, '${description}');
    await element.waitFor({ state: 'visible', timeout });
    console.log('${description} es visible');
  }`, `waitFor${elementName}Visible`);

  // Lógica de tu archivo original (INTACTA)
  // Para elementos sin acciones (texto/alertas), generar métodos adicionales
  if (loc.actions.length === 0) {
    addMethod(`
  /**
   * Obtiene el texto de ${description}
   */
  async get${elementName}Text(): Promise<string> {
${buildLocatorsArray(loc.selectors)}
    const element = await this.findSmartly(locators, '${description}');
    const text = await element.textContent();
    return text || '';
  }`, `get${elementName}Text`);

    addMethod(`
  /**
   * Verifica que ${description} contenga el texto esperado
   */
  async assert${elementName}Text(expectedText: string): Promise<void> {
${buildLocatorsArray(loc.selectors)}
    const element = await this.findSmartly(locators, '${description}');
    await expect(element).toContainText(expectedText);
    console.log(\`${description} contiene el texto esperado: "\${expectedText}"\`);
  }`, `assert${elementName}Text`);

    addMethod(`
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
  }`, `is${elementName}Visible`);
  }

  // --- NUEVA LÓGICA PROACTIVA ---
  // Se analizan los testSteps para asegurar que todos los métodos necesarios se generen,
  // independientemente de si la IA los incluyó en el array `actions`.
  const allRequiredActions = new Set(loc.actions);
  const relevantSteps = testSteps.filter(step => step.action.toLowerCase().includes(loc.name.toLowerCase()));

  relevantSteps.forEach(step => {
      if (step.action.startsWith('click')) allRequiredActions.add('click');
      if (step.action.startsWith('fill')) allRequiredActions.add('fill');
      if (step.action.startsWith('check')) allRequiredActions.add('check');
      if (step.action.startsWith('select')) allRequiredActions.add('select');
      if (step.action.startsWith('clear')) allRequiredActions.add('clear');
      if (step.action.startsWith('getValue')) allRequiredActions.add('getValue');
      // Generar métodos de aserción específicos (como assertErrorMessageOneOf)
      if (step.action.startsWith('assert') && step.action.endsWith('OneOf')) {
          const assertMethod = `
  /**
   * Verifica que ${description} contenga uno de los textos esperados
   */
  async ${step.action}(expectedTexts: string[]): Promise<void> {
${buildLocatorsArray(loc.selectors)}
    const element = await this.findSmartly(locators, '${description}');
    const actualText = await element.textContent() || '';
    const matchFound = expectedTexts.some(expectedText => actualText.includes(expectedText));
    if (!matchFound) {
      throw new Error(\`El texto del elemento "${description}" no coincide con ninguna de las opciones esperadas. Texto actual: "\${actualText}"\`);
    }
    console.log(\`${description} contiene uno de los textos esperados.\`);
  }`;
          addMethod(assertMethod, step.action);
      }
  });

  // Lógica de tu archivo original (INTACTA)
  // Generar métodos para acciones definidas, ahora usando la lista enriquecida.
  allRequiredActions.forEach(action => {
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
    addMethod(method, methodName);
  });

  return methods.join('\n');
};
// =======================================================================
// FIN DE LA MODIFICACIÓN
// =======================================================================

function generatePageObjectClass(pageDefinition: PageDefinition, allTestSteps: any[]): { className: string; content: string; elementCount: number; methodCount: number; } {
    const { className, locators } = pageDefinition;
    if (!locators || !className) {
        throw new Error(`Cada definición de "pageObject" debe contener "className" y "locators". Error en definición: ${JSON.stringify(pageDefinition)}`);
    }

    const allMethods = locators.map(loc => generateMethodsForElement(loc, allTestSteps)).join('\n');
    const methodCount = allMethods.split('async ').length - 1;

    const template = `// pages/generated/${className}.ts
// Archivo generado automáticamente. No editar manualmente.
// Generador Inteligente v2.3 - Proactivo y Estable

import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from '../BasePage';

export class ${className} extends BasePage {
  constructor(page: Page) {
    super(page);
  }
${allMethods}
}
`;

    return {
        className,
        content: template,
        elementCount: locators.length,
        methodCount
    };
}


// --- Lógica Principal del Script (INTACTA) ---
const definitionPath = process.argv[2];
if (!definitionPath) {
  console.error('Error: Por favor, proporciona la ruta al archivo de definición JSON.');
  process.exit(1);
}

try {
  // 1. Leer el archivo JSON completo
  const fullDefinition: FullDefinition = JSON.parse(fs.readFileSync(definitionPath, 'utf8'));

  // 2. Recopilar TODAS las definiciones de page objects en una sola lista
  const allPageObjects: PageDefinition[] = [];
  if (fullDefinition.pageObject) {
    allPageObjects.push(fullDefinition.pageObject);
  }
  if (fullDefinition.additionalPageObjects && Array.isArray(fullDefinition.additionalPageObjects)) {
    allPageObjects.push(...fullDefinition.additionalPageObjects);
  }

  if (allPageObjects.length === 0) {
    throw new Error("No se encontraron definiciones de 'pageObject' en el archivo JSON. Asegúrate de que exista 'pageObject' o 'additionalPageObjects'.");
  }

  const outputDir = path.resolve(__dirname, `../pages/generated`);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log(`✅ ¡Iniciando generación de Page Objects Inteligentes para ${allPageObjects.length} página(s)!`);

  // 3. Iterar y generar un archivo para cada page object encontrado
  allPageObjects.forEach(pageDef => {
    // Usar la función modular para generar el contenido de la clase
    const { className, content, elementCount, methodCount } = generatePageObjectClass(pageDef, fullDefinition.testSteps);
    const outputPath = path.join(outputDir, `${className}.ts`);
    fs.writeFileSync(outputPath, content);

    console.log(`\n  --- Page Object '${className}' generado ---`);
    console.log(`  📄 Archivo: ${outputPath}`);
    console.log(`  🧠 Elementos procesados: ${elementCount}`);
    console.log(`  🎯 Métodos generados: ${methodCount}`);
  });

  console.log(`\n✅ Proceso de generación de Page Objects completado.`);

} catch (error) {
  console.error('❌ Error al generar los Page Objects:', error);
  process.exit(1);
}
