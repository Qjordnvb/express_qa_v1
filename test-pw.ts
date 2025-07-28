// diagnose-mcp.ts
import { chromium } from '@playwright/test';

async function diagnose() {
  const mcpEndpoint = 'ws://127.0.0.1:3333/mcp';
  console.log(`🔎 Intentando conectar a: ${mcpEndpoint}`);

  try {
    const browser = await chromium.connect(mcpEndpoint, {
      timeout: 30000, // Aumentamos el timeout a 30 segundos
    });

    console.log('✅ ¡CONEXIÓN EXITOSA!');
    console.log('🏁 Versión del navegador conectado:', browser.version());
    await browser.close();
    console.log('🛑 Conexión cerrada correctamente.');
    process.exit(0); // Termina con éxito
  } catch (error) {
    console.error('❌ ERROR FATAL EN LA CONEXIÓN:');
    console.error(error);
    process.exit(1); // Termina con un código de error
  }
}

diagnose();
