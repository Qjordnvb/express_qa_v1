// core/mcp-playwright-engine/BrowserAutomation.ts
// 🤖 Browser Automation - Real interactions with web elements

import { Page, Locator } from '@playwright/test';

export interface InteractionResult {
  success: boolean;
  element?: string;
  action: string;
  timestamp: string;
  error?: string;
}

/**
 * 🤖 BrowserAutomation
 * 
 * Maneja interacciones reales con elementos web:
 * - Click, type, select, hover
 * - Wait strategies inteligentes
 * - Error handling robusto
 */
export class BrowserAutomation {
  constructor() {
    console.log('🤖 BrowserAutomation: Real interaction engine initialized');
  }

  /**
   * 👆 Click real en elemento
   */
  async click(page: Page, selector: string): Promise<InteractionResult> {
    const startTime = Date.now();
    
    try {
      console.log(`👆 Clicking real element: ${selector}`);
      
      const element = page.locator(selector);
      await element.waitFor({ state: 'visible', timeout: 10000 });
      await element.click();
      
      return {
        success: true,
        element: selector,
        action: 'click',
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error(`❌ Click failed for ${selector}:`, error);
      return {
        success: false,
        element: selector,
        action: 'click',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * ⌨️ Type real en input
   */
  async type(page: Page, selector: string, text: string): Promise<InteractionResult> {
    try {
      console.log(`⌨️ Typing real text in: ${selector}`);
      
      const element = page.locator(selector);
      await element.waitFor({ state: 'visible', timeout: 10000 });
      await element.clear();
      await element.fill(text);
      
      return {
        success: true,
        element: selector,
        action: `type: "${text}"`,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error(`❌ Type failed for ${selector}:`, error);
      return {
        success: false,
        element: selector,
        action: `type: "${text}"`,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 🎯 Select option in dropdown
   */
  async select(page: Page, selector: string, value: string): Promise<InteractionResult> {
    try {
      console.log(`🎯 Selecting option in: ${selector}`);
      
      const element = page.locator(selector);
      await element.waitFor({ state: 'visible', timeout: 10000 });
      await element.selectOption(value);
      
      return {
        success: true,
        element: selector,
        action: `select: "${value}"`,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error(`❌ Select failed for ${selector}:`, error);
      return {
        success: false,
        element: selector,
        action: `select: "${value}"`,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 🖱️ Hover over element
   */
  async hover(page: Page, selector: string): Promise<InteractionResult> {
    try {
      console.log(`🖱️ Hovering over: ${selector}`);
      
      const element = page.locator(selector);
      await element.waitFor({ state: 'visible', timeout: 10000 });
      await element.hover();
      
      return {
        success: true,
        element: selector,
        action: 'hover',
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error(`❌ Hover failed for ${selector}:`, error);
      return {
        success: false,
        element: selector,
        action: 'hover',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * ⏳ Wait for element with multiple strategies
   */
  async waitForElement(page: Page, selector: string, strategy: 'visible' | 'hidden' | 'attached' = 'visible', timeout: number = 10000): Promise<InteractionResult> {
    try {
      console.log(`⏳ Waiting for element: ${selector} (${strategy})`);
      
      const element = page.locator(selector);
      await element.waitFor({ state: strategy, timeout });
      
      return {
        success: true,
        element: selector,
        action: `wait: ${strategy}`,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error(`❌ Wait failed for ${selector}:`, error);
      return {
        success: false,
        element: selector,
        action: `wait: ${strategy}`,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 📝 Get text content from element
   */
  async getText(page: Page, selector: string): Promise<string | null> {
    try {
      console.log(`📝 Getting text from: ${selector}`);
      
      const element = page.locator(selector);
      await element.waitFor({ state: 'visible', timeout: 10000 });
      const text = await element.textContent();
      
      console.log(`✅ Text extracted: "${text?.substring(0, 100)}..."`);
      return text;
      
    } catch (error) {
      console.error(`❌ Get text failed for ${selector}:`, error);
      return null;
    }
  }

  /**
   * 🎯 Smart element finder - tries multiple selectors
   */
  async findElementSmart(page: Page, selectors: string[]): Promise<string | null> {
    console.log(`🎯 Smart finding element with ${selectors.length} strategies`);
    
    for (const selector of selectors) {
      try {
        const element = page.locator(selector);
        await element.waitFor({ state: 'visible', timeout: 3000 });
        
        console.log(`✅ Found element with selector: ${selector}`);
        return selector;
        
      } catch (error) {
        console.log(`⏭️ Selector failed, trying next: ${selector}`);
        continue;
      }
    }
    
    console.error('❌ No selector worked for element');
    return null;
  }
}