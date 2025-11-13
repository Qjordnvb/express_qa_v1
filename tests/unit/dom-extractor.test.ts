// tests/unit/dom-extractor.test.ts
import { test, expect } from '@playwright/test';
import { DOMExtractor } from '../../orchestrator/dom-extractor';

test.describe('DOMExtractor', () => {
  test('debería extraer elementos interactivos de una página', async ({ page }) => {
    // Crear una página HTML de prueba
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head><title>Test Page</title></head>
        <body>
          <form id="login-form">
            <input
              id="email-input"
              type="email"
              name="email"
              placeholder="Enter email"
              class="form-control"
              data-testid="email-field"
            />
            <input
              id="password-input"
              type="password"
              name="password"
              placeholder="Enter password"
              class="form-control"
            />
            <button
              id="submit-btn"
              type="submit"
              role="button"
              aria-label="Submit login form"
              class="btn btn-primary"
            >
              Login
            </button>
          </form>
          <a href="/register" id="register-link">Register</a>
          <div style="display: none;">
            <button id="hidden-button">Hidden</button>
          </div>
        </body>
      </html>
    `);

    const extractor = new DOMExtractor();
    const elements = await extractor.extractInteractiveElements(page);

    // Verificar que se extrajeron elementos
    expect(elements.length).toBeGreaterThan(0);

    // Verificar que NO se extrajo el botón oculto
    const hiddenButton = elements.find(el => el.id === 'hidden-button');
    expect(hiddenButton).toBeUndefined();

    // Verificar input de email
    const emailInput = elements.find(el => el.id === 'email-input');
    expect(emailInput).toBeDefined();
    expect(emailInput?.tagName).toBe('input');
    expect(emailInput?.type).toBe('email');
    expect(emailInput?.name).toBe('email');
    expect(emailInput?.placeholder).toBe('Enter email');
    expect(emailInput?.classes).toContain('form-control');
    expect(emailInput?.dataTestId).toBe('email-field');
    expect(emailInput?.cssPath).toBeTruthy();
    expect(emailInput?.xpath).toBeTruthy();
  });

  test('debería extraer atributos ARIA correctamente', async ({ page }) => {
    await page.setContent(`
      <button
        role="button"
        aria-label="Close dialog"
        id="close-btn"
      >
        X
      </button>
    `);

    const extractor = new DOMExtractor();
    const elements = await extractor.extractInteractiveElements(page);

    const button = elements.find(el => el.id === 'close-btn');
    expect(button?.ariaRole).toBe('button');
    expect(button?.ariaLabel).toBe('Close dialog');
  });

  test('debería calcular XPath correctamente', async ({ page }) => {
    await page.setContent(`
      <div>
        <form>
          <input id="test-input" type="text" />
        </form>
      </div>
    `);

    const extractor = new DOMExtractor();
    const elements = await extractor.extractInteractiveElements(page);

    const input = elements.find(el => el.id === 'test-input');
    expect(input?.xpath).toBe('//*[@id="test-input"]');
  });

  test('debería calcular CSS Path con ID', async ({ page }) => {
    await page.setContent(`
      <button id="my-button">Click</button>
    `);

    const extractor = new DOMExtractor();
    const elements = await extractor.extractInteractiveElements(page);

    const button = elements[0];
    expect(button.cssPath).toBe('#my-button');
  });

  test('debería extraer solo elementos visibles', async ({ page }) => {
    await page.setContent(`
      <button id="visible-btn">Visible</button>
      <button id="hidden-btn" style="display: none;">Hidden</button>
      <button id="opacity-btn" style="opacity: 0;">Zero Opacity</button>
    `);

    const extractor = new DOMExtractor();
    const elements = await extractor.extractInteractiveElements(page);

    const visibleBtn = elements.find(el => el.id === 'visible-btn');
    const hiddenBtn = elements.find(el => el.id === 'hidden-btn');
    const opacityBtn = elements.find(el => el.id === 'opacity-btn');

    expect(visibleBtn).toBeDefined();
    expect(hiddenBtn).toBeUndefined();
    // Nota: opacity: 0 todavía tiene dimensions, así que podría ser "visible"
  });

  test('debería truncar textContent largo', async ({ page }) => {
    const longText = 'A'.repeat(200);
    await page.setContent(`
      <button id="long-text-btn">${longText}</button>
    `);

    const extractor = new DOMExtractor();
    const elements = await extractor.extractInteractiveElements(page);

    const button = elements[0];
    expect(button.textContent?.length).toBeLessThanOrEqual(100);
  });

  test('debería extraer elementos por tipo', async ({ page }) => {
    await page.setContent(`
      <input type="text" id="input1" />
      <button id="button1">Button</button>
      <input type="email" id="input2" />
    `);

    const extractor = new DOMExtractor();
    const inputs = await extractor.extractByType(page, 'input');

    expect(inputs.length).toBe(2);
    expect(inputs.every(el => el.tagName === 'input')).toBe(true);
  });

  test('debería extraer múltiples clases', async ({ page }) => {
    await page.setContent(`
      <button class="btn btn-primary btn-large" id="styled-btn">Click</button>
    `);

    const extractor = new DOMExtractor();
    const elements = await extractor.extractInteractiveElements(page);

    const button = elements[0];
    expect(button.classes).toEqual(['btn', 'btn-primary', 'btn-large']);
  });

  test('debería manejar elementos sin atributos opcionales', async ({ page }) => {
    await page.setContent(`
      <button>Plain Button</button>
    `);

    const extractor = new DOMExtractor();
    const elements = await extractor.extractInteractiveElements(page);

    const button = elements[0];
    expect(button.id).toBeUndefined();
    expect(button.name).toBeUndefined();
    expect(button.dataTestId).toBeUndefined();
    expect(button.ariaLabel).toBeUndefined();
    expect(button.tagName).toBe('button');
  });
});
