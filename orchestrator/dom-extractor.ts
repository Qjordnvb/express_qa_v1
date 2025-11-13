// orchestrator/dom-extractor.ts
import { Page } from '@playwright/test';

export interface DOMElement {
  tagName: string;
  id?: string;
  classes: string[];
  name?: string;
  type?: string;
  placeholder?: string;
  ariaLabel?: string;
  ariaRole?: string;
  textContent?: string;
  dataTestId?: string;
  xpath: string;
  cssPath: string;
  isVisible: boolean;
}

export class DOMExtractor {
  /**
   * Extrae todos los elementos interactivos de la página actual
   * @param page Página de Playwright
   * @returns Array de elementos interactivos con sus atributos
   */
  async extractInteractiveElements(page: Page): Promise<DOMElement[]> {
    console.log('🔍 Extrayendo estructura del DOM...');

    const elements = await page.evaluate(() => {
      // Selector para elementos interactivos
      const interactiveSelector =
        'input, button, select, textarea, a[href], [role], [data-testid], ' +
        '[onclick], [type="submit"], [type="button"], label';

      const allElements = document.querySelectorAll(interactiveSelector);

      // Función auxiliar para calcular XPath
      const getXPath = (element: Element): string => {
        if (element.id) {
          return `//*[@id="${element.id}"]`;
        }

        const parts: string[] = [];
        let current: Element | null = element;

        while (current && current.nodeType === Node.ELEMENT_NODE) {
          let index = 0;
          let sibling: Element | null = current;

          // Contar hermanos previos del mismo tipo
          while (sibling) {
            if (sibling.nodeType === Node.ELEMENT_NODE &&
                sibling.tagName === current.tagName) {
              index++;
            }
            sibling = sibling.previousElementSibling;
          }

          const tagName = current.tagName.toLowerCase();
          const part = index > 1 ? `${tagName}[${index}]` : tagName;
          parts.unshift(part);
          current = current.parentElement;
        }

        return '/' + parts.join('/');
      };

      // Función auxiliar para calcular CSS Path único
      const getCSSPath = (element: Element): string => {
        if (element.id) {
          return `#${element.id}`;
        }

        const path: string[] = [];
        let current: Element | null = element;

        while (current && current !== document.body) {
          let selector = current.tagName.toLowerCase();

          // Si tiene ID, usarlo y terminar
          if (current.id) {
            selector += `#${current.id}`;
            path.unshift(selector);
            break;
          }

          // Agregar clases si existen
          if (current.className && typeof current.className === 'string') {
            const classes = Array.from(current.classList)
              .filter(c => c && !c.includes(' '))
              .join('.');
            if (classes) {
              selector += `.${classes}`;
            }
          }

          // Agregar índice si hay múltiples elementos del mismo tipo
          let index = 0;
          let sibling: Element | null = current;
          while (sibling) {
            if (sibling.tagName === current.tagName) {
              index++;
            }
            sibling = sibling.previousElementSibling;
          }

          if (index > 1) {
            selector += `:nth-of-type(${index})`;
          }

          path.unshift(selector);
          current = current.parentElement;
        }

        return path.join(' > ');
      };

      // Mapear todos los elementos
      return Array.from(allElements).map((el) => {
        const rect = el.getBoundingClientRect();
        const isVisible = rect.width > 0 &&
                         rect.height > 0 &&
                         window.getComputedStyle(el).visibility !== 'hidden' &&
                         window.getComputedStyle(el).display !== 'none';

        return {
          tagName: el.tagName.toLowerCase(),
          id: el.id || undefined,
          classes: Array.from(el.classList),
          name: (el as HTMLInputElement).name || undefined,
          type: (el as HTMLInputElement).type || undefined,
          placeholder: (el as HTMLInputElement).placeholder || undefined,
          ariaLabel: el.getAttribute('aria-label') || undefined,
          ariaRole: el.getAttribute('role') || undefined,
          textContent: el.textContent?.trim().substring(0, 100) || undefined,
          dataTestId: el.getAttribute('data-testid') || undefined,
          xpath: getXPath(el),
          cssPath: getCSSPath(el),
          isVisible,
        };
      }).filter(el => el.isVisible); // Solo elementos visibles
    });

    console.log(`✅ Extraídos ${elements.length} elementos interactivos del DOM`);
    return elements;
  }

  /**
   * Extrae elementos filtrados por tipo
   * @param page Página de Playwright
   * @param elementType Tipo de elemento (button, input, etc.)
   * @returns Array de elementos del tipo especificado
   */
  async extractByType(page: Page, elementType: string): Promise<DOMElement[]> {
    const allElements = await this.extractInteractiveElements(page);
    return allElements.filter(el => el.tagName === elementType.toLowerCase());
  }

  /**
   * Extrae elementos que coincidan con un selector específico
   * @param page Página de Playwright
   * @param selector Selector CSS
   * @returns Array de elementos que coinciden
   */
  async extractBySelector(page: Page, selector: string): Promise<DOMElement[]> {
    const allElements = await this.extractInteractiveElements(page);

    // Evaluar el selector en el navegador para obtener los elementos coincidentes
    const matchingXPaths = await page.evaluate((sel) => {
      const elements = document.querySelectorAll(sel);

      const getXPath = (element: Element): string => {
        if (element.id) {
          return `//*[@id="${element.id}"]`;
        }

        const parts: string[] = [];
        let current: Element | null = element;

        while (current && current.nodeType === Node.ELEMENT_NODE) {
          let index = 0;
          let sibling: Element | null = current;

          while (sibling) {
            if (sibling.nodeType === Node.ELEMENT_NODE &&
                sibling.tagName === current.tagName) {
              index++;
            }
            sibling = sibling.previousElementSibling;
          }

          const tagName = current.tagName.toLowerCase();
          const part = index > 1 ? `${tagName}[${index}]` : tagName;
          parts.unshift(part);
          current = current.parentElement;
        }

        return '/' + parts.join('/');
      };

      return Array.from(elements).map(el => getXPath(el));
    }, selector);

    // Filtrar elementos por XPath coincidente
    return allElements.filter(el => matchingXPaths.includes(el.xpath));
  }
}
