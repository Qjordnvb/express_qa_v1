// orchestrator/index.ts
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
import * as fs from 'fs';
import { execSync } from 'child_process';
import { chromium, Page, Browser} from '@playwright/test';
import { getLlmService } from './llm-service';
import playwrightConfig from '../playwright.config';

const provider = process.env.LLM_PROVIDER;
if (!provider) {
    throw new Error('Error de Configuración: La variable LLM_PROVIDER no está definida en tu archivo .env');
}
if (provider.toLowerCase() === 'openai' && !process.env.OPENAI_API_KEY) {
    throw new Error('Error de Configuración: Has seleccionado "openai" pero OPENAI_API_KEY no está definida en tu archivo .env');
}
if (provider.toLowerCase() === 'google' && !process.env.GOOGLE_API_KEY) {
    throw new Error('Error de Configuración: Has seleccionado "google" pero GOOGLE_API_KEY no está definida en tu archivo .env');
}

interface TestCase {
  name: string;
  path: string;
  userStory: string;
}

async function main() {
  console.log("Iniciando orquestador de pruebas con IA...");

  const testCasePath = process.argv[2];
  if (!testCasePath) { /* ... */ process.exit(1); }

  // 1. Leer el caso de prueba completo desde el archivo JSON
  const testCase: TestCase = JSON.parse(fs.readFileSync(testCasePath, 'utf-8'));
  console.log(`Caso de prueba leído: "${testCase.name}"`);

  // Extraemos la baseURL de la configuración de Playwright
  const baseURL = playwrightConfig.use?.baseURL;
  if (!baseURL) {
    throw new Error("baseURL no está definida en playwright.config.ts");
  }

  const fullUrl = new URL(testCase.path, baseURL).toString();

  const browser: Browser = await chromium.launch();

  // 2. Usar Playwright para navegar y tomar una captura de pantalla

    const page: Page = await browser.newPage();

    console.log(`Navegando a ${fullUrl} para tomar una captura...`);
    await page.goto(fullUrl, { waitUntil: 'networkidle' });
    const screenshotBuffer = await page.screenshot();
    console.log("Captura de pantalla tomada.");

    await page.close();



  // 3. Llamar a la IA con la historia de usuario y la imagen (en base64)
  const llmService = getLlmService();

  const testAssets = await llmService.getTestAssetsFromIA(testCase.userStory, screenshotBuffer.toString('base64'));
  if (!testAssets) { /* ... */ process.exit(1); }

  const fullDefinitionPath = testCasePath.replace('.testcase.json', '.ai-assets.json');
  fs.writeFileSync(fullDefinitionPath, JSON.stringify(testAssets, null, 2));
  console.log(`Activos completos guardados en: ${fullDefinitionPath}`);

  // 4. Generar el Page Object
  console.log("\n--- Generando Page Object ---");
  execSync(`npm run generate:pom -- ${fullDefinitionPath}`, { stdio: 'inherit' });

  // 5. Generar el archivo de Test (.spec.ts)
  console.log("\n--- Generando Archivo de Prueba ---");
  execSync(`npm run generate:spec -- ${fullDefinitionPath} ${testCasePath}`, { stdio: 'inherit' });

  // 6. Ejecutar el test recién creado
  console.log("\n--- Ejecutando Prueba Generada ---");
  const testFileName = testAssets.pageObject.className.replace(/([A-Z])/g, '-$1').toLowerCase().slice(1);
  const testFilePath = `tests/generated/${testFileName}.spec.ts`;

  try {
    const testCommand = `npx playwright test ${testFilePath}`;
    console.log(`Ejecutando: ${testCommand}\n`);
    execSync(testCommand, { stdio: 'inherit' });
    console.log("\n¡VISIÓN COMPLETA ALCANZADA! La prueba generada por IA se ha ejecutado.");
  } catch (error) {
    console.error("\nEl proceso del orquestador ha fallado:", error);
  } finally {
    await browser.close();
  }
}

main()
