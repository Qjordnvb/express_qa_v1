import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

test.describe('Login Functionality', () => {


  test('should allow a user to log in successfully', async ({ page }) => {
    // 1. CREAR UNA INSTANCIA de la página que vamos a probar
    const loginPage = new LoginPage(page);
    // 2. NAVEGAR a la página usando el método de nuestra BasePage
    await loginPage.navigate('/index.php?route=account/login');
     // 3. EJECUTAR la acción de login usando el método de negocio de LoginPage
    // IMPORTANTE: Reemplaza estas credenciales con las tuyas.
    await loginPage.login('jordanvillarreal1994@gmail.com', '12345678');
    // 4. VERIFICAR (ASSERT) el resultado esperado.
    // Un login exitoso nos debe redirigir a la página de la cuenta.
    await expect(page).toHaveURL('index.php?route=account/account');

    const myAccountTitle = page.locator('h2:has-text("My Account")');
    await expect(myAccountTitle).toBeVisible();
});



test('should show an error message with invalid credentials', async ({ page }) => {
  // 1. CREAR INSTANCIA
  const loginPage = new LoginPage(page);

  // 2. NAVEGAR
  await loginPage.navigate('index.php?route=account/login');

  // 3. EJECUTAR la acción con datos incorrectos
  await loginPage.login('invalid@email.com', 'invalidpassword');

  // 4. VERIFICAR el resultado esperado.
  // Debe aparecer un mensaje de alerta/error.
  const errorMessage = page.locator('.alert.alert-danger'); // Localizador del mensaje de error
  await expect(errorMessage).toBeVisible();
  await expect(errorMessage).toContainText(/Warning: No match for E-Mail Address and\/or Password.|Warning: Your account has exceeded allowed number of login attempts./);
});

})
