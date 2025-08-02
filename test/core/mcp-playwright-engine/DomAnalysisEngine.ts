// core/mcp-playwright-engine/DomAnalysisEngine.ts
// 🔍 DOM Analysis Engine - Real DOM inspection and element detection

import { Page } from '@playwright/test';

export interface RealElement {
  tagName: string;
  id?: string;
  classes: string[];
  attributes: Record<string, string>;
  text?: string;
  role?: string;
  isInteractive: boolean;
  selectors: {
    css: string;
    xpath: string;
    role?: string;
    text?: string;
  };
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface DomSnapshot {
  url: string;
  title: string;
  timestamp: string;
  elements: RealElement[];
  structure: any;
  metrics: {
    totalElements: number;
    interactiveElements: number;
    forms: number;
    inputs: number;
    buttons: number;
    links: number;
  };
}

/**
 * 🔍 DomAnalysisEngine
 * 
 * Analiza el DOM real de la página para:
 * - Extraer elementos interactivos
 * - Generar selectores múltiples
 * - Detectar formularios y patrones
 * - Proporcionar contexto rico para AI
 */
export class DomAnalysisEngine {
  constructor() {
    console.log('🔍 DomAnalysisEngine: Real DOM analysis engine initialized');
  }

  /**
   * 📋 Extraer snapshot completo del DOM
   */
  async extractDomSnapshot(page: Page): Promise<DomSnapshot> {
    console.log('📋 Extracting real DOM snapshot...');
    
    try {
      const [title, url, elements, structure, metrics] = await Promise.all([
        page.title(),
        page.url(),
        this.findAllElements(page),
        this.extractDomStructure(page),
        this.calculateMetrics(page)
      ]);

      const snapshot: DomSnapshot = {
        url,
        title,
        timestamp: new Date().toISOString(),
        elements,
        structure,
        metrics
      };

      console.log(`✅ DOM snapshot extracted: ${elements.length} elements found`);
      return snapshot;
      
    } catch (error) {
      console.error('❌ DOM snapshot extraction failed:', error);
      throw error;
    }
  }

  /**
   * 🎯 Encontrar elementos interactivos específicamente
   */
  async findInteractiveElements(page: Page): Promise<RealElement[]> {
    console.log('🎯 Finding real interactive elements...');
    
    try {
      // Ejecutar análisis en el browser
      const interactiveElements = await page.evaluate(() => {
        // Helper functions dentro del evaluate context
        const generateBasicCssSelector = (element: Element): string => {
          if (element.id) return `#${element.id}`;
          if (element.className && typeof element.className === 'string') {
            return `.${element.className.split(' ').filter(cls => cls.trim()).join('.')}`;
          }
          return element.tagName.toLowerCase();
        };

        const generateBasicXPathSelector = (element: Element): string => {
          if (element.id) return `//*[@id="${element.id}"]`;
          return `//${element.tagName.toLowerCase()}`;
        };
        const elements: any[] = [];
        
        // Selectores para elementos interactivos
        const interactiveSelectors = [
          'input:not([type="hidden"])',
          'button',
          'select',
          'textarea',
          'a[href]',
          '[role="button"]',
          '[role="textbox"]',
          '[role="combobox"]',
          '[onclick]',
          '[tabindex]:not([tabindex="-1"])'
        ];

        // Primero buscar con selectores estándar
        interactiveSelectors.forEach(selector => {
          const nodes = document.querySelectorAll(selector);
          
          nodes.forEach((element, index) => {
            const rect = element.getBoundingClientRect();
            
            // Solo elementos visibles y con área suficiente para interacción
            if (rect.width > 0 && rect.height > 0 && rect.width * rect.height > 10) {
              const elementData = {
                tagName: element.tagName.toLowerCase(),
                id: element.id || undefined,
                classes: Array.from(element.classList),
                attributes: {},
                text: element.textContent?.trim().substring(0, 100) || undefined,
                role: element.getAttribute('role') || undefined,
                isInteractive: true,
                selectors: {
                  css: '',
                  xpath: '',
                  role: element.getAttribute('role') || undefined,
                  text: element.textContent?.trim() || undefined
                },
                boundingBox: {
                  x: rect.x,
                  y: rect.y,
                  width: rect.width,
                  height: rect.height
                }
              };

              // Extraer atributos importantes
              ['name', 'type', 'placeholder', 'value', 'href', 'title'].forEach(attr => {
                const value = element.getAttribute(attr);
                if (value) {
                  (elementData.attributes as any)[attr] = value;
                }
              });

              // Generar selectores básicos
              elementData.selectors.css = generateBasicCssSelector(element);
              elementData.selectors.xpath = generateBasicXPathSelector(element);

              elements.push(elementData);
            }
          });
        });

        // 🔍 DETECCIÓN ADICIONAL: Buscar elementos que pueden ser clickeables
        // pero no están en los selectores estándar
        const potentialClickables = document.querySelectorAll('*');
        const elementsFound = new Set(elements.map(el => el.id || el.text || `${el.tagName}-${el.classes.join('-')}`));
        
        potentialClickables.forEach(element => {
          const rect = element.getBoundingClientRect();
          const style = window.getComputedStyle(element);
          
          // Detectar elementos que parecen clickeables por estilo o eventos
          const hasClickCursor = style.cursor === 'pointer';
          const hasClickEvents = (element as any).onclick || 
                                element.getAttribute('onclick') ||
                                element.hasAttribute('onclick');
          const hasInteractiveClasses = Array.from(element.classList).some(cls => 
            cls.includes('btn') || 
            cls.includes('button') || 
            cls.includes('click') || 
            cls.includes('link') || 
            cls.includes('action')
          );
          
          const elementKey = element.id || element.textContent?.trim() || `${element.tagName}-${Array.from(element.classList).join('-')}`;
          
          if ((hasClickCursor || hasClickEvents || hasInteractiveClasses) && 
              rect.width > 0 && rect.height > 0 && 
              rect.width * rect.height > 10 &&
              !elementsFound.has(elementKey)) {
            
            const elementData = {
              tagName: element.tagName.toLowerCase(),
              id: element.id || undefined,
              classes: Array.from(element.classList),
              attributes: {},
              text: element.textContent?.trim().substring(0, 100) || undefined,
              role: element.getAttribute('role') || 'clickable',
              isInteractive: true,
              selectors: {
                css: '',
                xpath: '',
                role: element.getAttribute('role') || 'clickable',
                text: element.textContent?.trim() || undefined
              },
              boundingBox: {
                x: rect.x,
                y: rect.y,
                width: rect.width,
                height: rect.height
              }
            };

            // Extraer atributos importantes
            ['name', 'type', 'placeholder', 'value', 'href', 'title', 'class'].forEach(attr => {
              const value = element.getAttribute(attr);
              if (value) {
                (elementData.attributes as any)[attr] = value;
              }
            });

            // Generar selectores básicos
            elementData.selectors.css = generateBasicCssSelector(element);
            elementData.selectors.xpath = generateBasicXPathSelector(element);

            elements.push(elementData);
            elementsFound.add(elementKey);
          }
        });

        return elements;
      });

      console.log(`✅ Found ${interactiveElements.length} real interactive elements`);
      
      // 🔍 DEBUG: Log detalles de cada elemento detectado
      interactiveElements.forEach((element, index) => {
        console.log(`[MCP-DEBUG] Elemento ${index + 1}:`, {
          tag: element.tagName,
          text: element.text?.substring(0, 50) || 'Sin texto',
          id: element.id || 'Sin ID',
          classes: element.classes.join(' ') || 'Sin clases',
          attributes: element.attributes
        });
      });
      
      return interactiveElements;
      
    } catch (error) {
      console.error('❌ Interactive elements detection failed:', error);
      return [];
    }
  }

  /**
   * 🏗️ Extraer estructura del DOM
   */
  private async extractDomStructure(page: Page): Promise<any> {
    try {
      return await page.evaluate(() => {
        const getStructure = (element: Element, depth: number = 0): any => {
          if (depth > 3) return null; // Limitar profundidad
          
          return {
            tagName: element.tagName.toLowerCase(),
            id: element.id || undefined,
            classes: Array.from(element.classList),
            children: Array.from(element.children)
              .slice(0, 10) // Limitar hijos
              .map(child => getStructure(child, depth + 1))
              .filter(Boolean)
          };
        };

        return getStructure(document.body);
      });
      
    } catch (error) {
      console.error('❌ DOM structure extraction failed:', error);
      return {};
    }
  }

  /**
   * 📊 Calcular métricas del DOM
   */
  private async calculateMetrics(page: Page): Promise<DomSnapshot['metrics']> {
    try {
      return await page.evaluate(() => {
        return {
          totalElements: document.querySelectorAll('*').length,
          interactiveElements: document.querySelectorAll('input, button, select, textarea, a[href], [onclick], [role="button"]').length,
          forms: document.querySelectorAll('form').length,
          inputs: document.querySelectorAll('input:not([type="hidden"])').length,
          buttons: document.querySelectorAll('button, input[type="button"], input[type="submit"]').length,
          links: document.querySelectorAll('a[href]').length
        };
      });
      
    } catch (error) {
      console.error('❌ Metrics calculation failed:', error);
      return {
        totalElements: 0,
        interactiveElements: 0,
        forms: 0,
        inputs: 0,
        buttons: 0,
        links: 0
      };
    }
  }

  /**
   * 🔍 Encontrar todos los elementos (incluyendo no interactivos)
   */
  private async findAllElements(page: Page): Promise<RealElement[]> {
    // Por ahora, retornamos solo elementos interactivos
    // En el futuro podemos expandir para incluir todos los elementos
    return await this.findInteractiveElements(page);
  }

  /**
   * 🎯 Generar selector CSS inteligente
   */
  static generateCssSelector(element: Element): string {
    try {
      // 1. Si tiene ID único, usarlo
      if (element.id && document.querySelectorAll(`#${element.id}`).length === 1) {
        return `#${element.id}`;
      }

      // 2. Si tiene clases específicas
      const classes = Array.from(element.classList)
        .filter(cls => cls && !cls.match(/^(ng-|mat-|_|\\d)/)) // Filtrar clases generadas
        .slice(0, 2); // Max 2 clases

      if (classes.length > 0) {
        const classSelector = `.${classes.join('.')}`;
        if (document.querySelectorAll(classSelector).length === 1) {
          return classSelector;
        }
      }

      // 3. Combinar tag + atributos importantes
      let selector = element.tagName.toLowerCase();
      
      // Agregar atributos importantes
      const importantAttrs = ['name', 'type', 'role', 'data-testid'];
      for (const attr of importantAttrs) {
        const value = element.getAttribute(attr);
        if (value) {
          selector += `[${attr}="${value}"]`;
          if (document.querySelectorAll(selector).length === 1) {
            return selector;
          }
        }
      }

      // 4. Fallback: nth-child si es necesario
      const parent = element.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter(el => el.tagName === element.tagName);
        if (siblings.length > 1) {
          const index = siblings.indexOf(element) + 1;
          selector += `:nth-child(${index})`;
        }
      }

      return selector;

    } catch (error) {
      console.warn('Error generating CSS selector:', error);
      return element.tagName.toLowerCase();
    }
  }

  /**
   * 🔍 Generar selector XPath inteligente
   */
  static generateXPathSelector(element: Element): string {
    try {
      // 1. Si tiene ID único
      if (element.id && document.querySelectorAll(`#${element.id}`).length === 1) {
        return `//*[@id="${element.id}"]`;
      }

      // 2. Por texto único (para elementos con texto)
      const text = element.textContent?.trim();
      if (text && text.length > 0 && text.length < 50) {
        const textXPath = `//*[normalize-space(text())="${text}"]`;
        if (document.evaluate(textXPath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue === element) {
          return textXPath;
        }
      }

      // 3. Por atributos específicos
      const attrs = ['name', 'type', 'role', 'data-testid', 'placeholder'];
      for (const attr of attrs) {
        const value = element.getAttribute(attr);
        if (value) {
          const attrXPath = `//${element.tagName.toLowerCase()}[@${attr}="${value}"]`;
          const result = document.evaluate(attrXPath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
          if (result.singleNodeValue === element) {
            return attrXPath;
          }
        }
      }

      // 4. Fallback: posición en DOM
      const getElementIndex = (el: Element): number => {
        const parent = el.parentElement;
        if (!parent) return 1;
        
        const siblings = Array.from(parent.children).filter(child => child.tagName === el.tagName);
        return siblings.indexOf(el) + 1;
      };

      let xpath = '';
      let currentElement: Element | null = element;
      
      while (currentElement && currentElement !== document.documentElement) {
        const index = getElementIndex(currentElement);
        const tagName = currentElement.tagName.toLowerCase();
        xpath = `/${tagName}[${index}]${xpath}`;
        currentElement = currentElement.parentElement;
      }

      return xpath ? `/${xpath}` : `//${element.tagName.toLowerCase()}`;

    } catch (error) {
      console.warn('Error generating XPath selector:', error);
      return `//${element.tagName.toLowerCase()}`;
    }
  }
}