// core/claude-code-integration/StableMcpService.ts
// 🚀 REAL MCP INTEGRATION: Express QA AI Intelligence + Native MCP Protocol

import { RealTimeContext } from '../intelligent-learning/failure-analyzer';
import { McpToolsWrapper, McpSnapshot, McpElement } from '../mcp-client/McpToolsWrapper';

// Multi-page flow tracking interfaces
interface PageContext {
  pageName: string;
  url: string;
  title: string;
  timestamp: string;
  elements: McpElement[];
  elementCount: number;
  yamlSnapshot: string;
  networkRequests: any[];
  consoleMessages: any[];
  screenshot?: Buffer;
  interactiveElements: McpElement[];
}

interface NavigationEvent {
  stepIndex: number;
  fromPage: string;
  toPage: string;
  action: string;
  element: string;
  timestamp: string;
}

interface ActionStep {
  index: number;
  action: string;
  description: string;
  target: string;
  originalText: string;
}

interface PageState {
  url: string;
  title: string;
  elementCount: number;
}

interface MultiPageContext {
  contexts: PageContext[];
  navigationEvents: NavigationEvent[];
  totalPages: number;
  userStorySteps: ActionStep[];
  flowSummary: string;
  timestamp: string;
  error?: Error;
}

/**
 * StableMcpService - Bridge between Express QA's AI system and REAL MCP Protocol
 *
 * This service now uses the REAL MCP protocol as described in the guide:
 * - Native MCP tools when running in Claude Code
 * - JSON-RPC client when running standalone
 * - Perfect page snapshots with element references
 * - Same exact capabilities as Claude Code's MCP integration
 */
export class StableMcpService {
  private isInitialized = false;
  private mcpWrapper: McpToolsWrapper;
  private currentUserStory: any;
  private hasCompletedUserStoryGoal: any;

  constructor() {
    console.log('🔧 StableMcpService: Initializing REAL MCP integration...');
    this.mcpWrapper = new McpToolsWrapper();
  }

  /**
   * ✅ REAL MCP: Get real-time context using REAL MCP Protocol
   * This makes Express QA equivalent to Claude Code in browser automation
   */
  async getRealTimeContext(url: string): Promise<RealTimeContext> {
    try {
      console.log(`[REAL-MCP] 🌐 Getting REAL context for: ${url}`);
      console.log(`[REAL-MCP] 🎭 Mode: ${this.mcpWrapper.getOperationMode()}`);

      // 🚀 Use REAL MCP protocol (native tools or JSON-RPC)
      return await this.getRealMcpContext(url);

    } catch (error) {
      console.error('[REAL-MCP] ❌ Error getting real context:', error);

      // 🛡️ RESILIENCE: Return minimal functional context instead of crashing
      return this.getFallbackContext(url);
    }
  }

  /**
   * 🚀 REAL MCP: Use REAL MCP Protocol (native tools or JSON-RPC)
   */
  private async getRealMcpContext(url: string): Promise<RealTimeContext> {
    console.log('[REAL-MCP] 🎭 Using REAL MCP Protocol...');

    try {
      const startTime = Date.now();

      // Navigate using REAL MCP
      await this.mcpWrapper.navigate(url);

      // Wait for page to load
      await this.mcpWrapper.waitFor({ time: 2 });

      // Get REAL MCP snapshot with structured elements
      const snapshot: McpSnapshot = await this.mcpWrapper.snapshot();

      // Get additional information
      const [networkReqs, consoleMessages, screenshot] = await Promise.all([
        this.mcpWrapper.getNetworkRequests().catch(() => []),
        this.mcpWrapper.getConsoleMessages().catch(() => []),
        this.mcpWrapper.screenshot({ fullPage: true }).catch(() => null)
      ]);

      // Convert MCP elements to Express QA format
      const interactiveElements = snapshot.elements.map((element: McpElement) => ({
        type: element.type,
        text: element.text || '',
        name: element.name,
        role: element.role,
        ref: element.ref, // ✅ CRUCIAL: Include MCP reference for interactions
        attributes: element.attributes || {},
        selectors: this.generatePlaywrightSelectors(element),
        boundingBox: null // MCP doesn't provide bounding box in snapshot
      }));

      // Create RealTimeContext with REAL MCP data
      const context: RealTimeContext = {
        domSnapshot: snapshot.yaml, // ✅ REAL YAML snapshot from MCP
        accessibilityTree: this.parseAccessibilityTree(snapshot.yaml),
        interactiveElements,
        eventLog: [],
        consoleErrors: consoleMessages.filter((msg: any) => msg.type === 'error'),
        networkErrors: networkReqs.filter((req: any) => req.status >= 400),
        mcpConsoleMessages: consoleMessages,
        mcpNetworkRequests: networkReqs,
        mcpSnapshot: snapshot, // ✅ Include full MCP snapshot for AI processing
        pageInfo: {
          url: snapshot.url || url,
          title: snapshot.title || 'Unknown',
          timestamp: snapshot.timestamp || new Date().toISOString(),
          loadTime: Date.now() - startTime,
        },
        playwrightContext: {
          viewportSize: { width: 1920, height: 1080 },
          userAgent: `Express QA Hybrid - Real MCP (${this.mcpWrapper.getOperationMode()})`,
        },
        screenshot: screenshot ? this.extractScreenshotData(screenshot) : undefined
      };

      console.log(`[REAL-MCP] ✅ Real context obtained: ${context.interactiveElements.length} interactive elements`);
      console.log(`[REAL-MCP] 📊 Mode: ${this.mcpWrapper.getOperationMode()}`);

      return context;

    } catch (error) {
      console.error('[REAL-MCP] ❌ Real MCP context failed:', error);

      // Fallback
      console.log('[REAL-MCP] 🔄 Falling back to minimal context...');
      return this.getFallbackContext(url);
    }
  }

  /**
   * 🛡️ RESILIENCE: Fallback context when MCP fails
   * Express QA's AI can still function with minimal context
   */
  private getFallbackContext(url: string): RealTimeContext {
    return {
      domSnapshot: 'Fallback: MCP unavailable',
      accessibilityTree: {},
      interactiveElements: [],
      eventLog: [],
      consoleErrors: [],
      networkErrors: [],
      mcpConsoleMessages: [],
      mcpNetworkRequests: [],
      pageInfo: {
        url,
        title: 'Fallback Mode',
        timestamp: new Date().toISOString(),
      },
      playwrightContext: {
        viewportSize: { width: 1920, height: 1080 },
        userAgent: 'Fallback Agent',
      },
    };
  }

  /**
   * 🔧 Generate Playwright selectors from MCP element
   */
  private generatePlaywrightSelectors(element: McpElement): any {
    const selectors: any = {};

    // Priority order: role > text > attributes
    if (element.role) {
      selectors.role = element.role;
      if (element.text) {
        selectors.roleWithName = `${element.role}[name="${element.text}"]`;
      }
    }

    if (element.text) {
      selectors.text = element.text;
    }

    if (element.attributes?.id) {
      selectors.css = `#${element.attributes.id}`;
    } else if (element.attributes?.class) {
      const classes = element.attributes.class.split(' ');
      selectors.css = `.${classes[0]}`;
    }

    if (element.attributes?.name) {
      selectors.name = element.attributes.name;
    }

    return selectors;
  }

  /**
   * 🌳 Parse accessibility tree from YAML
   */
  private parseAccessibilityTree(yaml: string): any {
    // Basic parsing - could be enhanced based on needs
    const tree: any = {};
    const lines = yaml.split('\n');

    let currentLevel = 0;
    const stack: any[] = [tree];

    for (const line of lines) {
      const level = (line.match(/^\s*/)?.[0].length || 0) / 2;
      const content = line.trim();

      if (content && content.startsWith('-')) {
        const elementInfo = content.substring(1).trim();

        // Adjust stack to current level
        while (stack.length > level + 1) {
          stack.pop();
        }

        const parent = stack[stack.length - 1];
        if (!parent.children) parent.children = [];

        const element = { content: elementInfo, children: [] };
        parent.children.push(element);
        stack.push(element);
      }
    }

    return tree;
  }

  /**
   * Initialize REAL MCP integration
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('[REAL-MCP] 🚀 Initializing REAL MCP integration...');

      // Initialize MCP wrapper (detects native vs JSON-RPC automatically)
      await this.mcpWrapper.initialize();

      this.isInitialized = true;
      console.log(`[REAL-MCP] ✅ REAL MCP ready! Mode: ${this.mcpWrapper.getOperationMode()}`);

    } catch (error) {
      console.error('[REAL-MCP] ❌ Initialization failed:', error);
      throw error;
    }
  }

  /**
   * 📸 Capture screenshot using REAL MCP
   */
  async captureScreenshot(outputPath: string): Promise<Buffer | null> {
    try {
      console.log(`[REAL-MCP] 📸 Capturing screenshot: ${outputPath}`);

      // Capture screenshot using REAL MCP
      const screenshot = await this.mcpWrapper.screenshot({
        filename: outputPath,
        fullPage: true
      });

      console.log(`[REAL-MCP] ✅ Screenshot captured: ${outputPath}`);
      return screenshot as Buffer;

    } catch (error) {
      console.warn(`[REAL-MCP] ⚠️ Screenshot capture failed: ${error}`);
      return null;
    }
  }

  /**
   * 🔧 Extract Buffer from MCP screenshot response
   */
  private extractScreenshotData(screenshot: any): Buffer | undefined {
    // Handle different MCP screenshot response formats
    if (!screenshot) return undefined;

    console.log('[REAL-MCP] 🔍 Screenshot format analysis:', {
      type: typeof screenshot,
      isArray: Array.isArray(screenshot),
      hasContent: screenshot.content ? true : false,
      hasData: screenshot.data ? true : false,
      keys: typeof screenshot === 'object' ? Object.keys(screenshot) : 'N/A'
    });

    // Case 1: Screenshot is already a Buffer
    if (Buffer.isBuffer(screenshot)) {
      console.log('[REAL-MCP] ✅ Screenshot is Buffer, length:', screenshot.length);
      return screenshot;
    }

    // Case 2: Screenshot is a base64 string
    if (typeof screenshot === 'string') {
      try {
        const buffer = Buffer.from(screenshot, 'base64');
        console.log('[REAL-MCP] ✅ Screenshot converted from string, length:', buffer.length);
        return buffer;
      } catch (error) {
        console.warn('[REAL-MCP] ⚠️ Invalid base64 string:', error);
        return undefined;
      }
    }

    // Case 3: Screenshot is an object with data property
    if (typeof screenshot === 'object' && screenshot.data) {
      if (Buffer.isBuffer(screenshot.data)) {
        console.log('[REAL-MCP] ✅ Screenshot.data is Buffer, length:', screenshot.data.length);
        return screenshot.data;
      }
      if (typeof screenshot.data === 'string') {
        try {
          const buffer = Buffer.from(screenshot.data, 'base64');
          console.log('[REAL-MCP] ✅ Screenshot.data converted from string, length:', buffer.length);
          return buffer;
        } catch (error) {
          console.warn('[REAL-MCP] ⚠️ Invalid base64 data:', error);
          return undefined;
        }
      }
    }

    // Case 4: Screenshot has content array (MCP standard format)
    if (typeof screenshot === 'object' && Array.isArray(screenshot.content)) {
      console.log(`[REAL-MCP] 🔍 Processing content array with ${screenshot.content.length} items`);

      // Look for image content in the array
      for (const item of screenshot.content) {
        if (item.type === 'image' && item.data) {
          try {
            const buffer = Buffer.from(item.data, 'base64');
            console.log('[REAL-MCP] ✅ Found image in content array, length:', buffer.length);
            return buffer;
          } catch (error) {
            console.warn('[REAL-MCP] ⚠️ Invalid base64 in image content:', error);
          }
        }
      }
    }

    console.warn('[REAL-MCP] ⚠️ Unknown screenshot format - could not extract image data');
    return undefined;
  }

  /**
   * Cleanup REAL MCP integration
   */
  async cleanup(): Promise<void> {
    try {
      console.log('[REAL-MCP] 🧹 Cleaning up REAL MCP...');

      await this.mcpWrapper.cleanup();

      this.isInitialized = false;
      console.log('[REAL-MCP] ✅ Cleanup completed');

    } catch (error) {
      console.warn('[REAL-MCP] ⚠️ Cleanup warning:', error);
    }
  }

  /**
   * 🎯 Perform MCP interaction (click, type, etc.)
   */
  async performInteraction(action: string, element: string, ref: string, params?: any): Promise<void> {
    try {
      console.log(`[REAL-MCP] 🎯 Performing ${action} on "${element}" [ref=${ref}]`);

      switch (action) {
        case 'click':
          await this.mcpWrapper.click(element, ref, params);
          break;
        case 'type':
          await this.mcpWrapper.type(element, ref, params.text, params.options);
          break;
        default:
          throw new Error(`Unsupported interaction: ${action}`);
      }

      console.log(`[REAL-MCP] ✅ Interaction ${action} completed`);

    } catch (error) {
      console.error(`[REAL-MCP] ❌ Interaction ${action} failed:`, error);
      throw error;
    }
  }

  /**
   * 🌐 Navigate to URL using REAL MCP
   */
  async navigate(url: string): Promise<void> {
    console.log(`[REAL-MCP] 🌐 Navigating to: ${url}`);
    await this.mcpWrapper.navigate(url);
  }

  /**
   * ⏳ Wait using REAL MCP
   */
  async wait(options: { text?: string; textGone?: string; time?: number }): Promise<void> {
    console.log('[REAL-MCP] ⏳ Waiting...', options);
    await this.mcpWrapper.waitFor(options);
  }

  /**
   * 🎯 GENERIC Multi-page flow capture using MCP state comparison
   * Captures context from each page by detecting navigation through state changes
   */
  async captureMultiPageFlow(initialUrl: string, userStory: any): Promise<MultiPageContext> {
    console.log('[MULTI-PAGE] 🚀 Starting MCP-native multi-page flow capture...');

    // Store user story for OAuth flow
    this.currentUserStory = userStory;

    const contexts: PageContext[] = [];
    const navigationEvents: NavigationEvent[] = [];
    let currentPageIndex = 0;

    try {
      // Step 1: Navigate to initial URL and capture first context
      console.log(`[MULTI-PAGE] 📖 Capturing initial page state...`);
      await this.navigate(initialUrl);
      await this.wait({ time: 2000 });

      let currentSnapshot = await this.mcpWrapper.snapshot();
      let currentContext = await this.capturePageContext(currentSnapshot, 'InitialPage');
      contexts.push(currentContext);

      // Step 2: Extract action steps from user story and execute them ALL
      const actionSteps = this.extractActionSteps(userStory);
      console.log(`[MULTI-PAGE] 🎯 Found ${actionSteps.length} action steps to execute`);

      // Step 3: Execute ALL user story steps and capture real page contexts
      for (const [stepIndex, step] of actionSteps.entries()) {
        console.log(`[MULTI-PAGE] 🔄 Executing step ${stepIndex + 1}: ${step.description}`);

        // Store state before action
        const preActionState = {
          url: currentSnapshot.url || '',
          title: currentSnapshot.title || '',
          elementCount: currentSnapshot.elements.length
        };

        // Find element that matches the step - try both specific and intelligent matching
        let targetElement = this.findElementForStep(currentSnapshot, step);
        
        if (!targetElement) {
          // Try intelligent matching for common actions
          targetElement = this.findAlternativeElement(currentSnapshot, step);
        }

        if (!targetElement) {
          console.log(`[MULTI-PAGE] ⚠️ No element found for: ${step.description}`);
          console.log(`[MULTI-PAGE] 📋 Available elements:`, currentSnapshot.elements.map(el => `${el.role}:"${el.text}" [${el.ref}]`));
          
          // Try intelligent navigation - if step needs element not on page, find navigation button
          const navigationElement = this.findNavigationElement(currentSnapshot, step);
          if (navigationElement) {
            console.log(`[MULTI-PAGE] 🔄 Found navigation element for step: "${navigationElement.text}" [ref=${navigationElement.ref}]`);
            
            // Execute navigation first
            try {
              await this.executeStepAction({ ...step, action: 'click' }, navigationElement);
              console.log(`[MULTI-PAGE] ✅ Navigation executed: ${navigationElement.text}`);
              
              // Wait for navigation
              await this.wait({ time: 3000 });
              
              // Get new page state
              const newSnapshot = await this.mcpWrapper.snapshot();
              const newState = {
                url: newSnapshot.url || '',
                title: newSnapshot.title || '',
                elementCount: newSnapshot.elements.length
              };
              
              // Check if navigation occurred
              if (this.hasNavigationOccurred(preActionState, newState)) {
                console.log(`[MULTI-PAGE] 🌐 Navigation successful: ${preActionState.url} → ${newState.url}`);
                
                // Capture new page
                currentPageIndex++;
                const pageName = `Page${currentPageIndex + 1}`;
                const newContext = await this.capturePageContext(newSnapshot, pageName);
                contexts.push(newContext);
                
                navigationEvents.push({
                  stepIndex,
                  fromPage: preActionState.url,
                  toPage: newState.url,
                  action: 'click',
                  element: navigationElement.text || 'Navigation',
                  timestamp: new Date().toISOString()
                });
                
                // Update current snapshot and retry finding the original element
                currentSnapshot = newSnapshot;
                targetElement = this.findElementForStep(currentSnapshot, step) || 
                               this.findAlternativeElement(currentSnapshot, step);
                
                if (targetElement) {
                  console.log(`[MULTI-PAGE] ✅ Found element after navigation: "${targetElement.text}" [ref=${targetElement.ref}]`);
                } else {
                  console.log(`[MULTI-PAGE] ⚠️ Still no element found after navigation`);
                  continue;
                }
              } else {
                console.log(`[MULTI-PAGE] ⚠️ Navigation did not occur`);
                continue;
              }
            } catch (error) {
              console.log(`[MULTI-PAGE] ⚠️ Navigation failed:`, error instanceof Error ? error.message : String(error));
              continue;
            }
          } else {
            console.log(`[MULTI-PAGE] ⚠️ No navigation element found`);
            continue;
          }
        }

        console.log(`[MULTI-PAGE] ✅ Found element: "${targetElement.text}" [ref=${targetElement.ref}]`);

        // Execute the action
        try {
          await this.executeStepAction(step, targetElement);
          console.log(`[MULTI-PAGE] ✅ Step executed successfully: ${step.action} on "${targetElement.text}"`);
        } catch (error) {
          console.log(`[MULTI-PAGE] ⚠️ Step execution error:`, error instanceof Error ? error.message : String(error));
          // Continue anyway - navigation might have occurred
        }

        // Wait for potential navigation/changes
        await this.wait({ time: 3000 }); // Longer wait for OAuth/navigation

        // Capture new state
        const newSnapshot = await this.mcpWrapper.snapshot();
        const postActionState = {
          url: newSnapshot.url || '',
          title: newSnapshot.title || '',
          elementCount: newSnapshot.elements.length
        };

        // Always update current snapshot for next iteration
        currentSnapshot = newSnapshot;

        // Detect if navigation occurred
        if (this.hasNavigationOccurred(preActionState, postActionState)) {
          console.log(`[MULTI-PAGE] 🌐 Navigation detected: ${preActionState.url} → ${postActionState.url}`);

          // Capture new page context with generic name
          currentPageIndex++;
          const pageName = `Page${currentPageIndex + 1}`;
          const newContext = await this.capturePageContext(newSnapshot, pageName);
          contexts.push(newContext);

          // Record navigation event
          navigationEvents.push({
            stepIndex,
            fromPage: preActionState.url,
            toPage: postActionState.url,
            action: step.action,
            element: targetElement.text || 'Unknown',
            timestamp: new Date().toISOString()
          });

          console.log(`[MULTI-PAGE] 📸 Captured new page: ${pageName} (${newSnapshot.elements.length} elements)`);
        } else {
          console.log(`[MULTI-PAGE] ℹ️ No navigation detected, updating current page context`);
        }
      }

      // Return multi-page context
      return {
        contexts,
        navigationEvents,
        totalPages: contexts.length,
        userStorySteps: actionSteps,
        flowSummary: this.generateFlowSummary(contexts, navigationEvents),
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('[MULTI-PAGE] ❌ Multi-page flow capture failed:', error);

      return {
        contexts,
        navigationEvents,
        totalPages: contexts.length,
        userStorySteps: this.extractActionSteps(userStory),
        flowSummary: 'Partial capture due to error',
        timestamp: new Date().toISOString(),
        error: error as Error
      };
    }
  }

  /**
   * 📸 Capture complete page context from MCP snapshot
   */
  private async capturePageContext(snapshot: McpSnapshot, pageName: string): Promise<PageContext> {
    console.log(`[MULTI-PAGE] 📸 Capturing context for: ${pageName}`);

    // Get additional page information
    const [networkReqs, consoleMessages, screenshot] = await Promise.all([
      this.mcpWrapper.getNetworkRequests().catch(() => []),
      this.mcpWrapper.getConsoleMessages().catch(() => []),
      this.mcpWrapper.screenshot({ fullPage: true }).catch(() => null)
    ]);

    return {
      pageName,
      url: snapshot.url || 'Unknown',
      title: snapshot.title || 'Unknown',
      timestamp: snapshot.timestamp || new Date().toISOString(),
      elements: snapshot.elements,
      elementCount: snapshot.elements.length,
      yamlSnapshot: snapshot.yaml,
      networkRequests: networkReqs,
      consoleMessages: consoleMessages,
      screenshot: screenshot ? this.extractScreenshotData(screenshot) : undefined,
      interactiveElements: snapshot.elements.filter(el =>
        ['button', 'link', 'textbox', 'combobox', 'checkbox'].includes(el.role || '')
      )
    };
  }

  /**
   * 🎯 Extract actionable steps from user story
   */
  private extractActionSteps(userStory: any): ActionStep[] {
    const steps = Array.isArray(userStory.userStory) ? userStory.userStory : [userStory.userStory];
    const actionSteps: ActionStep[] = [];

    for (const [index, step] of steps.entries()) {
      // Skip initial "DADO" and final "ENTONCES"
      if (step.match(/^(DADO|GIVEN)/i)) continue;
      if (step.match(/^(ENTONCES|THEN)/i)) continue;

      const actionStep = this.parseActionStep(step, index);
      if (actionStep) {
        actionSteps.push(actionStep);
      }
    }

    return actionSteps;
  }

  /**
   * 📝 Parse a single action step
   */
  private parseActionStep(step: string, index: number): ActionStep | null {
    // Common action patterns
    const patterns = [
      { regex: /clic|click/i, action: 'click' },
      { regex: /ingreso|escribo|type|fill|enter/i, action: 'type' },
      { regex: /selecciono|select|choose/i, action: 'select' },
      { regex: /espero|wait/i, action: 'wait' }
    ];

    for (const pattern of patterns) {
      if (pattern.regex.test(step)) {
        // Extract target text (in quotes or after keywords)
        const targetMatch = step.match(/'([^']+)'|"([^"]+)"/);
        const target = targetMatch ? (targetMatch[1] || targetMatch[2]) : '';

        return {
          index,
          action: pattern.action,
          description: step.trim(),
          target,
          originalText: step
        };
      }
    }

    return null;
  }

  /**
   * 🔍 Find element in snapshot that matches the step
   */
  private findElementForStep(snapshot: McpSnapshot, step: ActionStep): McpElement | null {
    const elements = snapshot.elements;

    // First try: exact text match
    if (step.target) {
      const exactMatch = elements.find(el =>
        el.text?.toLowerCase() === step.target.toLowerCase() ||
        el.name?.toLowerCase() === step.target.toLowerCase()
      );
      if (exactMatch) return exactMatch;
    }

    // Second try: partial match
    const partialMatches = elements.filter(el => {
      const elementText = (el.text || '').toLowerCase();
      const elementName = (el.name || '').toLowerCase();
      const stepText = step.description.toLowerCase();

      // Check if element contains key terms from step
      return (
        (step.target && (elementText.includes(step.target.toLowerCase()) ||
                        elementName.includes(step.target.toLowerCase()))) ||
        this.elementMatchesStepKeywords(el, step)
      );
    });

    // Score matches and return best one
    if (partialMatches.length > 0) {
      return this.selectBestMatch(partialMatches, step);
    }

    return null;
  }

  /**
   * 🎯 Check if element matches step keywords
   */
  private elementMatchesStepKeywords(element: McpElement, step: ActionStep): boolean {
    const keywords = this.extractKeywords(step.description);
    const elementText = `${element.text || ''} ${element.name || ''} ${element.role || ''}`.toLowerCase();

    return keywords.some(keyword => elementText.includes(keyword.toLowerCase()));
  }

  /**
   * 📊 Select best matching element
   */
  private selectBestMatch(elements: McpElement[], step: ActionStep): McpElement {
    // Prefer buttons for click actions
    if (step.action === 'click') {
      const button = elements.find(el => el.role === 'button' || el.role === 'link');
      if (button) return button;
    }

    // Prefer text inputs for type actions
    if (step.action === 'type') {
      const input = elements.find(el => el.role === 'textbox' || el.role === 'combobox');
      if (input) return input;
    }

    // Return first match as fallback
    return elements[0];
  }

  /**
   * 🔤 Extract keywords from text
   */
  private extractKeywords(text: string): string[] {
    // Remove common words and extract meaningful terms
    const stopWords = ['el', 'la', 'de', 'en', 'y', 'o', 'the', 'a', 'an', 'and', 'or', 'in', 'on'];
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.includes(word));

    return [...new Set(words)];
  }

  /**
   * 🎬 Execute action for a step
   */
  private async executeStepAction(step: ActionStep, element: McpElement): Promise<void> {
    switch (step.action) {
      case 'click':
        await this.performInteraction('click', element.text || 'element', element.ref);
        break;

      case 'type':
        if (step.target) {
          await this.performInteraction('type', element.text || 'element', element.ref, { text: step.target });
        }
        break;

      case 'select':
        // TODO: Implement select action
        console.log(`[MULTI-PAGE] ⚠️ Select action not yet implemented`);
        break;

      case 'wait':
        await this.wait({ time: 3000 });
        break;
    }
  }

  /**
   * 🔄 Detect if navigation occurred by comparing states
   */
  private hasNavigationOccurred(before: PageState, after: PageState): boolean {
    // URL change is definitive navigation
    if (before.url !== after.url) {
      return true;
    }

    // Title change often indicates navigation
    if (before.title !== after.title && after.title !== 'Unknown') {
      return true;
    }

    // Significant element count change (>50% difference)
    const elementDiff = Math.abs(before.elementCount - after.elementCount);
    const percentChange = elementDiff / Math.max(before.elementCount, 1);
    if (percentChange > 0.5) {
      return true;
    }

    return false;
  }

  /**
   * 🔍 Find OAuth/SSO button in elements
   */
  private findOAuthButton(elements: McpElement[]): McpElement | null {
    const oauthPatterns = [
      'ingresa por', 'login with', 'sign in with', 'iniciar sesión con',
      'oauth', 'sso', 'single sign', 'microsoft', 'google', 'facebook',
      'ab-inbev', 'corporate', 'corporativo'
    ];

    return elements.find(element => {
      const text = (element.text || '').toLowerCase();
      const name = (element.name || '').toLowerCase();
      const role = element.role;

      return (role === 'button' || role === 'link') &&
             oauthPatterns.some(pattern => text.includes(pattern) || name.includes(pattern));
    }) || null;
  }

  /**
   * 🔐 Capture OAuth flow automatically
   */
  private async captureOAuthFlow(oauthButton: McpElement, initialSnapshot: McpSnapshot): Promise<{
    contexts: PageContext[];
    events: NavigationEvent[];
  }> {
    console.log(`[MULTI-PAGE] 🔐 Starting OAuth flow capture...`);

    const contexts: PageContext[] = [];
    const events: NavigationEvent[] = [];

    try {
      // Click OAuth button
      await this.performInteraction('click', oauthButton.text || 'OAuth button', oauthButton.ref);

      // Wait for navigation
      await this.wait({ time: 3000 });

      // Capture OAuth provider page (e.g., Microsoft)
      const oauthSnapshot = await this.mcpWrapper.snapshot();
      const oauthContext = await this.capturePageContext(oauthSnapshot, 'OAuthProvider');
      contexts.push(oauthContext);

      events.push({
        stepIndex: 0,
        fromPage: initialSnapshot.url || 'Initial',
        toPage: oauthSnapshot.url || 'OAuth',
        action: 'click',
        element: oauthButton.text || 'OAuth button',
        timestamp: new Date().toISOString()
      });

      // Look for email field in OAuth page
      const emailField = this.findEmailField(oauthSnapshot.elements);
      const email = this.extractEmailFromUserStory(this.currentUserStory);
      if (emailField && email) {
        console.log(`[MULTI-PAGE] 📧 Found email field in OAuth page`);

        // Fill email
        await this.performInteraction('type', emailField.text || 'email', emailField.ref, { text: email });
        await this.wait({ time: 1000 });

        // Look for next/submit button
        const nextButton = this.findNextOrSubmitButton(oauthSnapshot.elements);
        if (nextButton) {
          await this.performInteraction('click', nextButton.text || 'Next', nextButton.ref);
          await this.wait({ time: 2000 });

          // Capture password page
          const passwordSnapshot = await this.mcpWrapper.snapshot();
          const passwordContext = await this.capturePageContext(passwordSnapshot, 'OAuthPassword');
          contexts.push(passwordContext);

          // Look for password field
          const passwordField = this.findPasswordField(passwordSnapshot.elements);
          const password = this.extractPasswordFromUserStory(this.currentUserStory);
          if (passwordField && password) {
            await this.performInteraction('type', passwordField.text || 'password', passwordField.ref, { text: password });
            await this.wait({ time: 1000 });

            // Submit
            const submitButton = this.findSubmitButton(passwordSnapshot.elements);
            if (submitButton) {
              await this.performInteraction('click', submitButton.text || 'Submit', submitButton.ref);
              await this.wait({ time: 3000 });

              // Capture final page (dashboard/confirmation)
              const finalSnapshot = await this.mcpWrapper.snapshot();
              const finalContext = await this.capturePageContext(finalSnapshot, 'Dashboard');
              contexts.push(finalContext);
            }
          }
        }
      }

    } catch (error) {
      console.log(`[MULTI-PAGE] ⚠️ OAuth flow capture completed with possible errors`);
    }

    return { contexts, events };
  }

  /**
   * 🔍 Find alternative element for common actions
   */
  private findAlternativeElement(snapshot: McpSnapshot, step: ActionStep): McpElement | null {
    const elements = snapshot.elements;

    // For type actions, find any text input
    if (step.action === 'type') {
      if (step.description.toLowerCase().includes('email')) {
        return this.findEmailField(elements);
      }
      if (step.description.toLowerCase().includes('password') || step.description.toLowerCase().includes('contraseña')) {
        return this.findPasswordField(elements);
      }
      // Any text input
      return elements.find(el => el.role === 'textbox' || el.role === 'combobox') || null;
    }

    // For click actions, find relevant buttons
    if (step.action === 'click') {
      if (step.description.toLowerCase().includes('siguiente') || step.description.toLowerCase().includes('next')) {
        return this.findNextOrSubmitButton(elements);
      }
      if (step.description.toLowerCase().includes('iniciar') || step.description.toLowerCase().includes('sign in')) {
        return this.findSubmitButton(elements);
      }
    }

    return null;
  }

  /**
   * 📧 Find email field in elements
   */
  private findEmailField(elements: McpElement[]): McpElement | null {
    return elements.find(element => {
      const name = (element.name || '').toLowerCase();
      const text = (element.text || '').toLowerCase();
      const type = element.attributes?.type;
      const placeholder = element.attributes?.placeholder?.toLowerCase() || '';

      return (element.role === 'textbox' || type === 'email') &&
             (name.includes('email') || text.includes('email') ||
              placeholder.includes('email') || name.includes('usuario') ||
              name.includes('user') || placeholder.includes('user'));
    }) || null;
  }

  /**
   * 🔑 Find password field in elements
   */
  private findPasswordField(elements: McpElement[]): McpElement | null {
    return elements.find(element => {
      const name = (element.name || '').toLowerCase();
      const text = (element.text || '').toLowerCase();
      const type = element.attributes?.type;
      const placeholder = element.attributes?.placeholder?.toLowerCase() || '';

      return (element.role === 'textbox' || type === 'password') &&
             (name.includes('password') || text.includes('password') ||
              placeholder.includes('password') || name.includes('contraseña') ||
              type === 'password');
    }) || null;
  }

  /**
   * ⏭️ Find next or submit button
   */
  private findNextOrSubmitButton(elements: McpElement[]): McpElement | null {
    const patterns = ['next', 'siguiente', 'continue', 'continuar', 'submit', 'enviar'];

    return elements.find(element => {
      const text = (element.text || '').toLowerCase();
      const name = (element.name || '').toLowerCase();

      return element.role === 'button' &&
             patterns.some(pattern => text.includes(pattern) || name.includes(pattern));
    }) || null;
  }

  /**
   * 🎯 Find submit/sign in button
   */
  private findSubmitButton(elements: McpElement[]): McpElement | null {
    const patterns = ['sign in', 'iniciar sesión', 'login', 'submit', 'enviar', 'entrar'];

    return elements.find(element => {
      const text = (element.text || '').toLowerCase();
      const name = (element.name || '').toLowerCase();

      return element.role === 'button' &&
             patterns.some(pattern => text.includes(pattern) || name.includes(pattern));
    }) || null;
  }

  /**
   * 📧 Extract email from user story
   */
  private extractEmailFromUserStory(userStory: any): string | null {
    const storyText = Array.isArray(userStory.userStory)
      ? userStory.userStory.join(' ')
      : userStory.userStory;

    const emailMatch = storyText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    return emailMatch ? emailMatch[0] : null;
  }

  /**
   * 🔑 Extract password from user story
   */
  private extractPasswordFromUserStory(userStory: any): string | null {
    const storyText = Array.isArray(userStory.userStory)
      ? userStory.userStory.join(' ')
      : userStory.userStory;

    // Look for password in quotes after password-related keywords
    const passwordMatch = storyText.match(/(?:password|contraseña)\s*['"]([^'"]+)['"]/i);
    return passwordMatch ? passwordMatch[1] : null;
  }

  /**
   * 🔍 Find navigation element when step element is not available on current page
   */
  private findNavigationElement(snapshot: McpSnapshot, step: ActionStep): McpElement | null {
    const elements = snapshot.elements;
    
    // What type of element does the step need?
    const needsEmailField = step.description.toLowerCase().includes('email') || 
                           step.description.includes('@');
    const needsPasswordField = step.description.toLowerCase().includes('password') || 
                              step.description.toLowerCase().includes('contraseña');
    const needsLoginButton = step.description.toLowerCase().includes('iniciar') ||
                           step.description.toLowerCase().includes('sign in') ||
                           step.description.toLowerCase().includes('login');
    
    // If step needs login-related elements, look for login/auth navigation buttons
    if (needsEmailField || needsPasswordField || needsLoginButton) {
      // Find buttons that suggest login/auth navigation
      const authButtons = elements.filter(el => {
        if (el.role !== 'button' && el.role !== 'link') return false;
        
        const text = (el.text || '').toLowerCase();
        const name = (el.name || '').toLowerCase();
        
        // Generic login/auth button patterns
        const authPatterns = [
          'sign in', 'login', 'log in', 'iniciar', 'ingresar', 'entrar',
          'continue', 'continuar', 'proceed', 'siguiente', 'next',
          'authenticate', 'auth', 'sso', 'single sign',
          // Corporate/OAuth patterns (generic)
          'microsoft', 'google', 'facebook', 'github', 'apple',
          'corporate', 'corporativo', 'company', 'empresa'
        ];
        
        return authPatterns.some(pattern => 
          text.includes(pattern) || name.includes(pattern)
        );
      });
      
      if (authButtons.length > 0) {
        // Prefer more specific auth buttons first
        const specificButton = authButtons.find(btn => {
          const text = (btn.text || '').toLowerCase();
          return text.includes('sign in') || text.includes('login') || 
                 text.includes('iniciar') || text.includes('ingresar');
        });
        
        return specificButton || authButtons[0];
      }
    }
    
    // General navigation: if step needs any specific element type not on page
    if (step.action === 'type' || step.action === 'fill') {
      // Step needs input field but none available - look for navigation buttons
      const hasInputs = elements.some(el => 
        el.role === 'textbox' || el.role === 'combobox' ||
        el.attributes?.type === 'email' || el.attributes?.type === 'password'
      );
      
      if (!hasInputs) {
        // Find any button/link that might lead to a form
        const navigationButtons = elements.filter(el => {
          if (el.role !== 'button' && el.role !== 'link') return false;
          
          const text = (el.text || '').toLowerCase();
          
          // Generic navigation patterns
          const navPatterns = [
            'continue', 'continuar', 'next', 'siguiente', 'proceed',
            'start', 'comenzar', 'begin', 'empezar', 'get started'
          ];
          
          return navPatterns.some(pattern => text.includes(pattern)) ||
                 text.length > 5; // Any substantial button text
        });
        
        return navigationButtons[0] || null;
      }
    }
    
    return null;
  }

  /**
   * 📝 Generate flow summary
   */
  private generateFlowSummary(contexts: PageContext[], events: NavigationEvent[]): string {
    const pageList = contexts.map((ctx, idx) =>
      `${idx + 1}. ${ctx.pageName}: ${ctx.title} (${ctx.elementCount} elements)`
    ).join('\n');

    const navigationList = events.map(event =>
      `- ${event.action} on "${event.element}" → ${event.toPage}`
    ).join('\n');

    return `Multi-Page Flow Summary:

Pages Captured (${contexts.length}):
${pageList}

Navigation Events (${events.length}):
${navigationList}

Total Interactive Elements: ${contexts.reduce((sum, ctx) => sum + ctx.interactiveElements.length, 0)}`;
  }
}

/**
 * 🎯 USAGE EXAMPLE for Express QA AI Integration with REAL MCP:
 *
 * const stableMcp = new StableMcpService();
 * await stableMcp.initialize();
 *
 * // Get REAL context with MCP data
 * const context = await stableMcp.getRealTimeContext('https://example.com');
 *
 * // Context now includes:
 * // - Real YAML snapshot from MCP
 * // - Structured elements with refs for interactions
 * // - Network requests and console messages
 * // - Screenshots from real browser
 *
 * // Use with Express QA's IntelligentMCPLearner
 * const discovery = await intelligentLearner.discoverElementIntelligently(
 *   'searchInput',
 *   'fill',
 *   context.interactiveElements,
 *   context
 * );
 *
 * // Perform interactions using REAL MCP references
 * const loginButton = context.interactiveElements.find(el => el.text === 'Login');
 * if (loginButton) {
 *   await stableMcp.performInteraction('click', 'Login button', loginButton.ref);
 * }
 *
 * // Navigate using REAL MCP
 * await stableMcp.navigate('https://dashboard.example.com');
 *
 * // The AI can now generate perfect page objects with real MCP refs!
 */
