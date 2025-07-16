// orchestrator/ui-pattern-detector.ts
import { Page, ElementHandle } from '@playwright/test';

export interface DetectedPattern {
  type: 'form' | 'modal' | 'list' | 'navigation' | 'loading' | 'wizard' | 'table' | 'search';
  confidence: number;
  elements: PatternElement[];
  behavior: PatternBehavior;
}

interface PatternElement {
  role: string;
  selector: string;
  attributes: Record<string, unknown>;
}

interface PatternBehavior {
  hasValidation: boolean;
  isAsync: boolean;
  hasMultiStep: boolean;
  requiresAuth: boolean;
  hasConditionalFields: boolean;
}

export class UIPatternDetector {
  /**
   * Detecta patrones de UI en una página
   */
  async detectPatterns(page: Page): Promise<DetectedPattern[]> {
    console.log('🔍 Detectando patrones de UI...');

    const patterns: DetectedPattern[] = [];

    // Detectar diferentes tipos de patrones
    patterns.push(...(await this.detectFormPatterns(page)));
    patterns.push(...(await this.detectModalPatterns(page)));
    patterns.push(...(await this.detectLoadingPatterns(page)));
    patterns.push(...(await this.detectNavigationPatterns(page)));
    patterns.push(...(await this.detectListPatterns(page)));
    patterns.push(...(await this.detectWizardPatterns(page)));

    // Ordenar por confianza
    return patterns.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Detecta patrones de formularios
   */
  private async detectFormPatterns(page: Page): Promise<DetectedPattern[]> {
    const patterns: DetectedPattern[] = [];

    // Buscar elementos de formulario
    const forms = await page.$$('form');

    for (const form of forms) {
      const inputs = await form.$$('input, textarea, select');
      const buttons = await form.$$('button[type="submit"], input[type="submit"]');

      if (inputs.length > 0 && buttons.length > 0) {
        const elements: PatternElement[] = [];

        // Analizar inputs
        for (const input of inputs) {
          const type = (await input.getAttribute('type')) || 'text';
          const name = (await input.getAttribute('name')) || '';
          const required = (await input.getAttribute('required')) !== null;

          elements.push({
            role: 'input',
            selector: `[name="${name}"]`,
            attributes: { type, required },
          });
        }

        // Detectar validaciones
        const hasValidation = await this.detectFormValidation(form);

        // Detectar si es multi-step
        const hasStepIndicators = await form.$$('.step, [data-step], .wizard-step');
        const hasMultiStep = hasStepIndicators.length > 0;

        patterns.push({
          type: 'form',
          confidence: 0.9,
          elements,
          behavior: {
            hasValidation,
            isAsync: await this.detectAsyncBehavior(form),
            hasMultiStep,
            requiresAuth: await this.detectAuthRequirement(page),
            hasConditionalFields: await this.detectConditionalFields(form),
          },
        });
      }
    }

    return patterns;
  }

  /**
   * Detecta patrones de modales
   */
  private async detectModalPatterns(page: Page): Promise<DetectedPattern[]> {
    const patterns: DetectedPattern[] = [];

    // Selectores comunes para modales
    const modalSelectors = [
      '[role="dialog"]',
      '.modal',
      '[class*="modal"]',
      '[id*="modal"]',
      '.popup',
      '[class*="overlay"]',
    ];

    for (const selector of modalSelectors) {
      const modals = await page.$$(selector);

      for (const modal of modals) {
        const isVisible = await modal.isVisible();

        if (!isVisible) {
          // Detectar triggers de modal
          const triggers = await page.$$(
            `[data-toggle="modal"], [onclick*="modal"], [class*="open-modal"]`,
          );

          if (triggers.length > 0) {
            patterns.push({
              type: 'modal',
              confidence: 0.8,
              elements: [
                {
                  role: 'modal',
                  selector,
                  attributes: { initiallyHidden: true },
                },
              ],
              behavior: {
                hasValidation: false,
                isAsync: true,
                hasMultiStep: false,
                requiresAuth: false,
                hasConditionalFields: false,
              },
            });
          }
        }
      }
    }

    return patterns;
  }

  /**
   * Detecta patrones de carga
   */
  private async detectLoadingPatterns(page: Page): Promise<DetectedPattern[]> {
    const patterns: DetectedPattern[] = [];

    const loadingSelectors = [
      '.spinner',
      '.loader',
      '[class*="loading"]',
      '.skeleton',
      '[class*="shimmer"]',
      '.progress',
      '[role="progressbar"]',
    ];

    const loadingElements: PatternElement[] = [];

    for (const selector of loadingSelectors) {
      const elements = await page.$$(selector);
      if (elements.length > 0) {
        loadingElements.push({
          role: 'loader',
          selector,
          attributes: { count: elements.length },
        });
      }
    }

    if (loadingElements.length > 0) {
      patterns.push({
        type: 'loading',
        confidence: 0.9,
        elements: loadingElements,
        behavior: {
          hasValidation: false,
          isAsync: true,
          hasMultiStep: false,
          requiresAuth: false,
          hasConditionalFields: false,
        },
      });
    }

    return patterns;
  }

  /**
   * Detecta patrones de navegación
   */
  private async detectNavigationPatterns(page: Page): Promise<DetectedPattern[]> {
    const patterns: DetectedPattern[] = [];

    // Buscar elementos de navegación
    const navElements = await page.$$('nav, [role="navigation"], .navbar, .menu, .nav');

    for (const nav of navElements) {
      const links = await nav.$$('a, [role="link"]');
      const dropdowns = await nav.$$('.dropdown, [class*="dropdown"]');

      if (links.length > 3) {
        patterns.push({
          type: 'navigation',
          confidence: 0.85,
          elements: [
            {
              role: 'navigation',
              selector: await this.getSelector(nav),
              attributes: {
                linkCount: links.length,
                hasDropdowns: dropdowns.length > 0,
              },
            },
          ],
          behavior: {
            hasValidation: false,
            isAsync: false,
            hasMultiStep: false,
            requiresAuth: false,
            hasConditionalFields: false,
          },
        });
      }
    }

    return patterns;
  }

  /**
   * Detecta patrones de listas
   */
  private async detectListPatterns(page: Page): Promise<DetectedPattern[]> {
    const patterns: DetectedPattern[] = [];

    // Buscar estructuras de lista
    const listSelectors = [
      'ul li',
      'ol li',
      '.list-item',
      '[class*="list-item"]',
      '.card',
      '[role="list"] [role="listitem"]',
    ];

    for (const selector of listSelectors) {
      const items = await page.$$(selector);

      if (items.length > 2) {
        // Analizar si tiene paginación
        const paginationElements = await page.$$(
          '.pagination, [class*="pagination"], .page-numbers',
        );

        // Analizar si tiene filtros
        const filterElements = await page.$$(
          '[class*="filter"], [class*="search"], input[type="search"]',
        );

        patterns.push({
          type: 'list',
          confidence: 0.8,
          elements: [
            {
              role: 'list',
              selector,
              attributes: {
                itemCount: items.length,
                hasPagination: paginationElements.length > 0,
                hasFilters: filterElements.length > 0,
              },
            },
          ],
          behavior: {
            hasValidation: false,
            isAsync: paginationElements.length > 0 || filterElements.length > 0,
            hasMultiStep: false,
            requiresAuth: false,
            hasConditionalFields: false,
          },
        });
      }
    }

    return patterns;
  }

  /**
   * Detecta patrones de wizard/multi-step
   */
  private async detectWizardPatterns(page: Page): Promise<DetectedPattern[]> {
    const patterns: DetectedPattern[] = [];

    // Buscar indicadores de wizard
    const wizardSelectors = [
      '.wizard',
      '[class*="step"]',
      '.stepper',
      '[class*="progress-bar"]',
      '.breadcrumb',
    ];

    for (const selector of wizardSelectors) {
      const elements = await page.$$(selector);

      if (elements.length > 0) {
        // Buscar botones de navegación
        const nextButtons = await page.$$(
          'button:has-text("Next"), button:has-text("Continue"), [class*="next"]',
        );
        const prevButtons = await page.$$(
          'button:has-text("Previous"), button:has-text("Back"), [class*="prev"]',
        );

        if (nextButtons.length > 0 || prevButtons.length > 0) {
          patterns.push({
            type: 'wizard',
            confidence: 0.85,
            elements: [
              {
                role: 'wizard',
                selector,
                attributes: {
                  hasNextButton: nextButtons.length > 0,
                  hasPrevButton: prevButtons.length > 0,
                },
              },
            ],
            behavior: {
              hasValidation: true,
              isAsync: false,
              hasMultiStep: true,
              requiresAuth: false,
              hasConditionalFields: true,
            },
          });
        }
      }
    }

    return patterns;
  }

  /**
   * Detecta validación en formularios
   */
  private async detectFormValidation(form: ElementHandle): Promise<boolean> {
    // Buscar indicadores de validación
    const validationIndicators = [
      '[required]',
      '[pattern]',
      '[min]',
      '[max]',
      '[minlength]',
      '[maxlength]',
      '.error',
      '.invalid',
      '[class*="error"]',
      '[class*="validation"]',
    ];

    for (const indicator of validationIndicators) {
      const elements = await form.$$(indicator);
      if (elements.length > 0) {
        return true;
      }
    }

    return false;
  }

  /**
   * Detecta comportamiento asíncrono
   */
  private async detectAsyncBehavior(element: ElementHandle): Promise<boolean> {
    // Buscar indicadores de comportamiento asíncrono
    const asyncIndicators = [
      '[data-ajax]',
      '[hx-post]', // htmx
      '[hx-get]',
      '[data-remote]',
      '[onclick*="fetch"]',
      '[onclick*="ajax"]',
      '[onclick*="axios"]',
    ];

    for (const indicator of asyncIndicators) {
      const elements = await element.$$(indicator);
      if (elements.length > 0) {
        return true;
      }
    }

    return false;
  }

  /**
   * Detecta si requiere autenticación
   */
  private async detectAuthRequirement(page: Page): Promise<boolean> {
    // Buscar indicadores de autenticación
    const authIndicators = [
      'input[type="password"]',
      '[name="username"]',
      '[name="email"]',
      '.login',
      '#login',
      '[class*="auth"]',
      '[class*="signin"]',
    ];

    for (const indicator of authIndicators) {
      const elements = await page.$$(indicator);
      if (elements.length > 0) {
        return true;
      }
    }

    return false;
  }

  /**
   * Detecta campos condicionales
   */
  private async detectConditionalFields(form: ElementHandle): Promise<boolean> {
    // Buscar campos que puedan aparecer/desaparecer
    const hiddenFields = await form.$$(
      '[style*="display: none"], [style*="display:none"], .hidden, [hidden]',
    );
    const conditionalSelectors = await form.$$(
      '[data-condition], [data-depends-on], [ng-if], [v-if], [x-show]',
    );

    return hiddenFields.length > 0 || conditionalSelectors.length > 0;
  }

  /**
   * Obtiene un selector único para un elemento
   */
  private async getSelector(element: ElementHandle): Promise<string> {
    // Intentar obtener un selector único
    const id = await element.getAttribute('id');
    if (id) return `#${id}`;

    const className = await element.getAttribute('class');
    if (className) {
      const mainClass = className.split(' ')[0];
      return `.${mainClass}`;
    }

    const tagName = await element.evaluate((el: HTMLElement) => el.tagName.toLowerCase());
    return tagName;
  }

  /**
   * Genera recomendaciones basadas en los patrones detectados
   */
  generateRecommendations(patterns: DetectedPattern[]): string[] {
    const recommendations: string[] = [];

    for (const pattern of patterns) {
      switch (pattern.type) {
        case 'form':
          if (pattern.behavior.hasValidation) {
            recommendations.push('Implementar validación de campos antes de envío');
          }
          if (pattern.behavior.hasMultiStep) {
            recommendations.push('Manejar navegación entre pasos del formulario');
          }
          if (pattern.behavior.hasConditionalFields) {
            recommendations.push('Detectar y manejar campos condicionales dinámicamente');
          }
          break;

        case 'modal':
          recommendations.push('Implementar esperas para apertura/cierre de modales');
          recommendations.push('Verificar que el modal esté visible antes de interactuar');
          break;

        case 'loading':
          recommendations.push('Esperar a que los elementos de carga desaparezcan');
          recommendations.push('Implementar waitForLoadState o esperas personalizadas');
          break;

        case 'list':
          if (pattern.elements[0].attributes.hasPagination) {
            recommendations.push('Manejar paginación para acceder a todos los elementos');
          }
          if (pattern.elements[0].attributes.hasFilters) {
            recommendations.push('Probar funcionalidad de filtros y búsqueda');
          }
          break;

        case 'wizard':
          recommendations.push('Implementar flujo completo de navegación por pasos');
          recommendations.push('Validar estado entre transiciones de pasos');
          break;
      }
    }

    return [...new Set(recommendations)]; // Eliminar duplicados
  }
}
