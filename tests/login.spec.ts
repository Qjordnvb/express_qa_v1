// tests/login.spec.ts

import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage'; // Nuestra clase LoginPage sigue siendo útil
import * as fs from 'fs'; // Importamos el módulo 'fs' (File System) de Node.js para leer archivos
import * as path from 'path'; // Importamos el módulo 'path' de Node.js para construir rutas de archivo de forma segura

// --- LECTURA DEL ARCHIVO DE DATOS ---
// Construimos la ruta al archivo JSON de forma dinámica para que funcione en cualquier SO.
// '__dirname' es una variable de Node.js que da la ruta del directorio del archivo actual (tests/).
const credentialsPath = path.join(__dirname, 'data/login-credentials.json');
// Leemos el contenido del archivo de forma síncrona y lo parseamos como JSON.
const testCases = JSON.parse(fs.readFileSync(credentialsPath, 'utf-8'));
// ------------------------------------

// Usamos test.describe para agrupar nuestros tests de login.
// Añadimos "- Data Driven" para diferenciarlo en los reportes si tuviéramos otros tests de login.
test.describe('Login Functionality - Data Driven', () => {
  // Iteramos sobre cada objeto (caso de prueba) en nuestro array 'testCases'
  testCases.forEach((data: any) => {
    // Creamos un test individual para cada conjunto de datos.
    // El título del test usará la propiedad 'description' de nuestros datos.
    test(data.description, async ({ page }) => {
      // Creamos una instancia de nuestra LoginPage
      const loginPage = new LoginPage(page);

      // 1. NAVEGACIÓN
      // Usamos el método navigate de nuestra BasePage (heredado por LoginPage)
      await loginPage.navigate('index.php?route=account/login');

      // 2. ACCIÓN DE LOGIN
      // Usamos el método login de LoginPage, pasándole el email y password del caso de prueba actual
      await loginPage.login(data.email, data.password);

      // 3. ASERCIONES CONDICIONALES
      if (data.shouldSucceed) {
        // Si 'shouldSucceed' es true, esperamos un login exitoso
        // Verificamos que la URL contenga la subcadena esperada
        await expect(page).toHaveURL(new RegExp(data.expectedUrlSubstring));
        // Verificamos que el título "My Account" esté visible en la página de la cuenta
        const myAccountTitle = page.locator('h2:has-text("My Account")');
        await expect(myAccountTitle).toBeVisible();
      } else {
        // Si 'shouldSucceed' es false, esperamos un mensaje de error
        const errorMessage = page.locator('.alert.alert-danger');
        await expect(errorMessage).toBeVisible();
        // Verificamos que el mensaje de error contenga el texto definido en nuestra expresión regular
        await expect(errorMessage).toContainText(new RegExp(data.expectedErrorMessageRegex));
      }
    });
  });
});
