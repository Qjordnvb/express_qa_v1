// orchestrator/index.ts
import * as dotenv from 'dotenv';
dotenv.config();

import * as fs from 'fs';
import { execSync } from 'child_process';
import { chromium } from '@playwright/test'; // <-- ¡Importamos Playwright!
import { getTestAssetsFromIA } from './llm-service';

interface TestCase {
  name: string;
  url: string;
  userStory: string;
}

async function main() {
  console.log("Iniciando orquestador de pruebas con IA...");

  const testCasePath = process.argv[2];
  if (!testCasePath) { /* ... */ process.exit(1); }

  // 1. Leer el caso de prueba completo desde el archivo JSON
  const testCase: TestCase = JSON.parse(fs.readFileSync(testCasePath, 'utf-8'));
  console.log(`Caso de prueba leído: "${testCase.name}"`);

  // 2. Usar Playwright para navegar y tomar una captura de pantalla
  console.log(`Navegando a ${testCase.url} para tomar una captura...`);
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(testCase.url);
  const screenshotBuffer = await page.screenshot();
  await browser.close();
  console.log("Captura de pantalla tomada.");

  // 3. Llamar a la IA con la historia de usuario y la imagen (en base64)
  const testAssets = await getTestAssetsFromIA(testCase.userStory, screenshotBuffer.toString('base64'));
  if (!testAssets) { /* ... */ process.exit(1); }

  const fullDefinitionPath = testCasePath.replace('.testcase.json', '.ai-assets.json');
  fs.writeFileSync(fullDefinitionPath, JSON.stringify(testAssets, null, 2));
  console.log(`Activos completos guardados en: ${fullDefinitionPath}`);

  // 4. Generar el Page Object
  console.log("\n--- Generando Page Object ---");
  execSync(`npm run generate:pom -- ${fullDefinitionPath}`, { stdio: 'inherit' });

  // 5. Generar el archivo de Test (.spec.ts)
  console.log("\n--- Generando Archivo de Prueba ---");
  execSync(`npm run generate:spec -- ${fullDefinitionPath}`, { stdio: 'inherit' });

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
    console.error("\nLa prueba generada por IA ha fallado.");
  }
}

main().catch(console.error);
