// orchestrator/index.ts
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });
import * as fs from 'fs';
import { execSync } from 'child_process';
import { chromium, Page, Browser } from '@playwright/test';
import { getLlmService } from './llm-service';
import { LearningSystem } from './learning-system';
import { FailureAnalyzer } from './failure-analyzer';
import { UIPatternDetector } from './ui-pattern-detector';
import playwrightConfig from '../playwright.config';

interface TestCase {
  name: string;
  path: string;
  userStory: string;
}

async function getOrGenerateAssets(testCase: TestCase, testCasePath: string, llmService: any): Promise<any> {
    const fullDefinitionPath = testCasePath.replace('.testcase.json', '.ai-assets.json');
    const baseURL = playwrightConfig.use?.baseURL;
    if (!baseURL) throw new Error("baseURL no está definida en playwright.config.ts");
    const fullUrl = new URL(testCase.path, baseURL).toString();

    if (fs.existsSync(fullDefinitionPath)) {
        console.log(`[LOG] ℹ️ Usando archivo de assets existente: ${path.basename(fullDefinitionPath)}`);
        return JSON.parse(fs.readFileSync(fullDefinitionPath, 'utf8'));
    }

    console.log(`[LOG] 📝 No se encontró ${path.basename(fullDefinitionPath)}. Generando desde la IA...`);
    const browser: Browser = await chromium.launch();
    const page: Page = await browser.newPage();
    const viewport = playwrightConfig.use?.viewport || { width: 1280, height: 720 };
    await page.setViewportSize(viewport);
    console.log(`[LOG] 📸 Navegando a ${fullUrl} para tomar captura y analizar patrones...`);
    await page.goto(fullUrl, { waitUntil: 'networkidle' });

    const patternDetector = new UIPatternDetector();
    const detectedPatterns = await patternDetector.detectPatterns(page);
    console.log(`[LOG] ✅ Patrones de UI detectados: ${detectedPatterns.map(p => p.type).join(', ') || 'Ninguno'}`);

    const screenshotBuffer = await page.screenshot({ fullPage: true });
    await browser.close();
    console.log("[LOG] ✅ Captura de pantalla tomada.");

    console.log("[LOG] 🤖 Enviando datos y contexto de UI a la IA...");
    const testAssets = await llmService.getTestAssetsFromIA(testCase.userStory, screenshotBuffer.toString('base64'), detectedPatterns);
    if (!testAssets) throw new Error("La IA no pudo generar los assets de prueba");

    return testAssets;
}

async function main() {
  console.log("🚀 Iniciando orquestador v11.0 (Logging en Tiempo Real)...");

  const learningSystem = new LearningSystem();
  const failureAnalyzer = new FailureAnalyzer();
  const llmService = getLlmService();
  const testCasePath = process.argv[2];
  if (!testCasePath) { process.exit(1); }
  const testCase: any = JSON.parse(fs.readFileSync(testCasePath, 'utf-8'));

  const fullDefinitionPath = testCasePath.replace('.testcase.json', '.ai-assets.json');
  let attempt = 0;
  const maxRetries = 1;

  while (attempt <= maxRetries) {
    if (attempt > 0) console.log(`\n🔄 Reintentando prueba después de auto-reparación (Intento ${attempt + 1})...`);

    let testAssets;
    const fullUrl = new URL(testCase.path, playwrightConfig.use!.baseURL!).toString();

    try {
      testAssets = await getOrGenerateAssets(testCase, testCasePath, llmService);
      testAssets = learningSystem.enhanceAIAssets(testAssets, fullUrl);
      fs.writeFileSync(fullDefinitionPath, JSON.stringify(testAssets, null, 2));
      console.log("✨ Assets mejorados y guardados.");

      console.log("\n⚙️ Generando código...");
      execSync(`npm run generate:pom -- ${fullDefinitionPath}`, { stdio: 'inherit' });
      execSync(`npm run generate:spec -- ${fullDefinitionPath} ${testCasePath}`, { stdio: 'inherit' });

      const testFileName = testAssets.pageObject.className.replace(/([A-Z])/g, '-$1').toLowerCase().slice(1);
      const testFilePath = `tests/generated/${testFileName}.spec.ts`;

      // --- PASO 5: EJECUCIÓN DE LA PRUEBA (CON LOGS EN TIEMPO REAL) ---
      console.log("\n🧪 Ejecutando prueba generada...");
      const testCommand = `npx playwright test ${testFilePath}`;
      console.log(`▶️ Ejecutando: ${testCommand}\n`);
      execSync(testCommand, { stdio: 'inherit' });

      console.log("\n✅ ¡ÉXITO! La prueba generada por IA se ha ejecutado correctamente.");
      await learningSystem.learnFromSuccess(testCase.name, testAssets, fullUrl);
      break;

    } catch (error: any) {
      console.error("\n❌ La prueba falló. Iniciando análisis inteligente...");

      // Si el primer intento falla, re-ejecutamos silenciosamente para capturar el reporte JSON.
      const testFileName = testAssets?.pageObject?.className.replace(/([A-Z])/g, '-$1').toLowerCase().slice(1) || 'unknown-test';
      const testFilePath = `tests/generated/${testFileName}.spec.ts`;
      let playwrightReport = `Error ejecutando el test: ${error.message}`;

      try {
        console.log(`[LOG] 🤫 Re-ejecutando para obtener reporte de fallo detallado...`);
        const reportCommand = `npx playwright test "${testFilePath}" --reporter=json`;
        execSync(reportCommand, { stdio: 'pipe', encoding: 'utf8' });
      } catch (reportError: any) {
        playwrightReport = reportError.stdout?.toString() || reportError.toString();
      }

      const analysis = await failureAnalyzer.analyzeFailure(testFilePath, playwrightReport, fullDefinitionPath, fullUrl);

      console.log('🔬 Análisis del Fallo:', JSON.stringify(analysis, null, 2));
      await learningSystem.learnFromFailure(testCase.name, analysis, testAssets, fullUrl);

      if (attempt < maxRetries) {
        const fixed = await failureAnalyzer.applyFixes(analysis, fullDefinitionPath);
        if (fixed) {
          attempt++;
          continue;
        }
      }

      console.log("⚠️ La auto-reparación no fue posible o ya se intentó. El fallo persiste.");
      process.exit(1);
    }
  }
}

main().catch(console.error);
