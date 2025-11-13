// orchestrator/index.ts
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });
import * as fs from 'fs';
import { execSync } from 'child_process';
import { chromium, Page, Browser } from '@playwright/test';
import { getLlmService } from './llm-service';
import { ILlmService } from './llms/ILlmService';
import { LearningSystem } from './learning-system';
import { FailureAnalyzer, AIAsserts, FailureAnalysis } from './failure-analyzer';
import { UIPatternDetector } from './ui-pattern-detector';
import { DOMExtractor } from './dom-extractor';
import { TomlParser } from './parsers/TomlParser';
import playwrightConfig from '../playwright.config';

interface TestCase {
  name: string;
  path: string;
  userStory: string[];
}

async function getOrGenerateAssets(
  testCase: TestCase,
  testCasePath: string,
  llmService: ILlmService,
): Promise<AIAsserts | undefined> {
  const fullDefinitionPath = testCasePath.replace('.testcase.json', '.ai-assets.json');
  const baseURL = playwrightConfig.use?.baseURL;
  if (!baseURL) throw new Error('baseURL no está definida en playwright.config.ts');
  const fullUrl = new URL(testCase.path, baseURL).toString();

  if (fs.existsSync(fullDefinitionPath)) {
    console.log(
      `[LOG] ℹ️ Usando archivo de assets existente: ${path.basename(fullDefinitionPath)}`,
    );
    return JSON.parse(fs.readFileSync(fullDefinitionPath, 'utf8')) as AIAsserts;
  }

  console.log(
    `[LOG] 📝 No se encontró ${path.basename(fullDefinitionPath)}. Generando desde la IA...`,
  );
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();


  // Simula acciones humanas mínimas
  await page.mouse.move(100, 100);
  await page.waitForTimeout(800);


  const viewport = playwrightConfig.use?.viewport || { width: 1920, height: 1080};
  await page.setViewportSize({ width: 1920, height: 1080 });
  console.log(`[LOG] 📸 Navegando a ${fullUrl} para tomar captura y analizar patrones...`);
  await page.goto(fullUrl, { waitUntil: 'networkidle' });

  const patternDetector = new UIPatternDetector();
  const detectedPatterns = await patternDetector.detectPatterns(page);
  console.log(
    `[LOG] ✅ Patrones de UI detectados: ${detectedPatterns.map((p) => p.type).join(', ') || 'Ninguno'}`,
  );

  // 🆕 Extraer elementos interactivos del DOM
  console.log('[LOG] 🔍 Extrayendo estructura del DOM...');
  const domExtractor = new DOMExtractor();
  const domElements = await domExtractor.extractInteractiveElements(page);
  console.log(`[LOG] ✅ Extraídos ${domElements.length} elementos interactivos del DOM`);

  const screenshotBuffer = await page.screenshot({ fullPage: true });
  await browser.close();
  console.log('[LOG] ✅ Captura de pantalla tomada.');

  console.log('[LOG] 🤖 Enviando datos, contexto de UI y estructura del DOM a la IA...');
  const testAssets = await llmService.getTestAssetsFromIA(
    Array.isArray(testCase.userStory) ? testCase.userStory : [testCase.userStory],
    screenshotBuffer.toString('base64'),
    detectedPatterns,
    domElements, // 🆕 Pasamos los elementos del DOM al LLM
  );
  if (!testAssets) throw new Error('La IA no pudo generar los assets de prueba');

  return testAssets;
}

async function main() {
  console.log('🚀 Iniciando orquestador v11.0 (Logging en Tiempo Real)...');

  // --- 1. INICIALIZACIÓN ---
  const learningSystem = new LearningSystem();
  const failureAnalyzer = new FailureAnalyzer();
  const llmService = getLlmService();
  const testCasePath = process.argv[2];
  if (!testCasePath) {
    console.error('Error: La ruta al archivo .testcase.json o .testcase.toml es obligatoria.');
    process.exit(1);
  }

  // 🆕 Soporte para TOML y JSON
  let testCase: TestCase;
  const isTomlFile = testCasePath.endsWith('.toml');
  const isJsonFile = testCasePath.endsWith('.json');

  if (isTomlFile) {
    console.log('📄 Detectado archivo TOML, usando TomlParser...');
    const tomlData = TomlParser.parseUserStory(testCasePath);
    // Convertir formato TOML a formato TestCase esperado
    testCase = {
      name: tomlData.name,
      path: tomlData.path,
      userStory: tomlData.steps.map(step => {
        const prefix = step.type === 'given' ? 'DADO' : step.type === 'when' ? 'CUANDO' : 'ENTONCES';
        let description = `${prefix} que ${step.description}`;
        if (step.value && step.target) {
          description += ` "${step.value}" en ${step.target}`;
        } else if (step.value) {
          description += ` "${step.value}"`;
        } else if (step.target) {
          description += ` ${step.target}`;
        }
        return description;
      })
    };
  } else if (isJsonFile) {
    console.log('📄 Detectado archivo JSON, leyendo formato clásico...');
    testCase = JSON.parse(fs.readFileSync(testCasePath, 'utf-8'));
  } else {
    console.error('❌ Error: El archivo debe ser .testcase.json o .testcase.toml');
    process.exit(1);
  }

  console.log(`📋 Caso de prueba leído: "${testCase.name}"`);

  // --- MEJORA: Centralización y Organización de Rutas ---
  const storiesDir = path.dirname(testCasePath);
  const testCaseName = path.basename(testCasePath).replace(/\.(testcase\.)?(json|toml)$/, '');

  // 1. Definimos la nueva carpeta para los assets generados
  const assetsDir = path.join(storiesDir, '../generated-assets');
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
    console.log(`[LOG] 🗂️ Carpeta creada: ${assetsDir}`);
  }

  // 2. La ruta del "plano" ahora apunta a la nueva carpeta
  const fullDefinitionPath = path.join(assetsDir, `${testCaseName}.ai-assets.json`);
  let attempt = 0;
  const maxRetries = 1;

  while (attempt <= maxRetries) {
    if (attempt > 0)
      console.log(
        `\n🔄 Reintentando prueba después de auto-reparación (Intento ${attempt + 1})...`,
      );

    let testAssets: AIAsserts | undefined;

    if (!playwrightConfig.use || !playwrightConfig.use.baseURL) {
      throw new Error('baseURL no está definida en playwright.config.ts');
    }
    const fullUrl = new URL(testCase.path, playwrightConfig.use.baseURL).toString();

    try {
      testAssets = await getOrGenerateAssets(testCase, testCasePath, llmService);
      if (!testAssets) throw new Error('No se pudieron obtener los assets de prueba');
      testAssets = learningSystem.enhanceAIAssets(testAssets, fullUrl);
      fs.writeFileSync(fullDefinitionPath, JSON.stringify(testAssets, null, 2));
      console.log('✨ Assets mejorados y guardados.');

      console.log('\n⚙️ Generando código...');
      execSync(`npm run generate:pom -- ${fullDefinitionPath}`, { stdio: 'inherit' });
      execSync(`npm run generate:spec -- ${fullDefinitionPath} ${testCasePath}`, {
        stdio: 'inherit',
      });

      // sincronizándolo con la lógica de `generate-spec.ts`.
      const testFileName = testCase.name.replace(/\s+/g, '-').toLowerCase();
      const testFilePath = `tests/generated/${testFileName}.spec.ts`;

      // --- PASO 5: EJECUCIÓN DE LA PRUEBA (CON LOGS EN TIEMPO REAL) ---
      console.log('\n🧪 Ejecutando prueba generada...');
      const testCommand = `npx playwright test ${testFilePath}`;
      console.log(`▶️ Ejecutando: ${testCommand}\n`);
      execSync(testCommand, { stdio: 'inherit' });

      console.log('\n✅ ¡ÉXITO! La prueba generada por IA se ha ejecutado correctamente.');
      if (testAssets) {
        await learningSystem.learnFromSuccess(testCase.name, testAssets, fullUrl);
      }
      break;
    } catch (error) {
      console.error('\n❌ La prueba falló. Iniciando análisis inteligente...');

      // Usar la misma lógica de nomenclatura para asegurar que se analiza el archivo correcto.
      const testFileNameForAnalysis = testCase.name.replace(/\s+/g, '-').toLowerCase();
      const testFilePathForAnalysis = `tests/generated/${testFileNameForAnalysis}.spec.ts`;
      // =======================================================================

      let playwrightReport: string;
      if (error instanceof Error) {
        playwrightReport = `Error ejecutando el test: ${error.message}`;
      } else {
        playwrightReport = `Error ejecutando el test: ${String(error)}`;
      }

      try {
        console.log(`[LOG] 🤫 Re-ejecutando para obtener reporte de fallo detallado...`);
        const reportCommand = `npx playwright test "${testFilePathForAnalysis}" --reporter=json`;
        execSync(reportCommand, { stdio: 'pipe', encoding: 'utf8' });
      } catch (reportError) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const err = reportError as any;
        playwrightReport = err.stdout?.toString() || String(reportError);
      }

      const analysis: FailureAnalysis = await failureAnalyzer.analyzeFailure(
        testFilePathForAnalysis,
        playwrightReport,
        fullDefinitionPath,
        fullUrl,
      );

      console.log('🔬 Análisis del Fallo:', JSON.stringify(analysis, null, 2));
      if (testAssets) {
        await learningSystem.learnFromFailure(testCase.name, analysis, testAssets, fullUrl);
      }

      if (attempt < maxRetries) {
        const fixed = await failureAnalyzer.applyFixes(analysis, fullDefinitionPath);
        if (fixed) {
          attempt++;
          continue;
        }
      }

      console.log('⚠️ La auto-reparación no fue posible o ya se intentó. El fallo persiste.');
      process.exit(1);
    }
  }
}

main().catch(console.error);
