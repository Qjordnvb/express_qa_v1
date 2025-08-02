// Simple User Story Executor using MCP
import { SimpleMcpClient, McpElement, McpSnapshot } from './mcp/SimpleMcpClient';
import * as fs from 'fs';
import * as path from 'path';

interface UserStory {
  name: string;
  path: string;
  userStory: string[];
}

interface ActionStep {
  index: number;
  action: string;
  description: string;
  target?: string;
  originalText: string;
}

interface PageContext {
  pageName: string;
  url: string;
  title: string;
  timestamp: string;
  elements: McpElement[];
  elementCount: number;
  yamlSnapshot: string;
}

export class UserStoryExecutor {
  private mcpClient: SimpleMcpClient;
  private baseUrl: string;

  constructor() {
    this.mcpClient = new SimpleMcpClient();
    this.baseUrl = 'https://dev.smartcomms-abi.com';
  }

  async initialize(): Promise<void> {
    await this.mcpClient.initialize();
  }

  async executeUserStory(userStoryPath: string): Promise<void> {
    console.log('🚀 Starting user story execution...');
    
    // Load user story
    const userStory = this.loadUserStory(userStoryPath);
    console.log(`📖 Loaded: "${userStory.name}"`);
    
    // Navigate to initial page
    const fullUrl = new URL(userStory.path, this.baseUrl).toString();
    await this.mcpClient.navigate(fullUrl);
    await this.mcpClient.wait(2000);
    
    // Capture initial page (with timeout handling)
    let currentSnapshot: McpSnapshot;
    try {
      currentSnapshot = await this.mcpClient.snapshot();
      console.log(`📸 Initial page captured: ${currentSnapshot.url} (${currentSnapshot.elements.length} elements)`);
    } catch (error) {
      console.warn(`⚠️ Initial snapshot failed: ${error instanceof Error ? error.message : String(error)}`);
      console.log('🔄 Continuing with empty snapshot...');
      currentSnapshot = {
        url: fullUrl,
        title: 'Unknown',
        timestamp: new Date().toISOString(),
        yaml: '',
        elements: []
      };
    }
    
    const contexts: PageContext[] = [];
    contexts.push(this.createPageContext(currentSnapshot, 'InitialPage'));
    
    // Extract and execute action steps
    const actionSteps = this.extractActionSteps(userStory);
    console.log(`🎯 Found ${actionSteps.length} action steps to execute`);
    
    for (const [stepIndex, step] of actionSteps.entries()) {
      console.log(`\n🔄 Step ${stepIndex + 1}: ${step.description}`);
      
      const executed = await this.executeStep(step, currentSnapshot);
      
      if (executed) {
        // Wait for potential navigation
        await this.mcpClient.wait(3000);
        
        // Capture new state (with timeout handling)
        try {
          const newSnapshot = await this.mcpClient.snapshot();
          
          // Check if page changed
          if (this.hasNavigationOccurred(currentSnapshot, newSnapshot)) {
            console.log(`🌐 Navigation detected: ${currentSnapshot.url} → ${newSnapshot.url}`);
            contexts.push(this.createPageContext(newSnapshot, `Page${stepIndex + 2}`));
          }
          
          currentSnapshot = newSnapshot;
        } catch (error) {
          console.warn(`⚠️ Post-action snapshot failed: ${error instanceof Error ? error.message : String(error)}`);
          console.log('🔄 Continuing with previous snapshot...');
        }
      }
    }
    
    // Show results
    console.log(`\n✅ Execution completed! Captured ${contexts.length} pages:`);
    contexts.forEach((ctx, idx) => {
      console.log(`  ${idx + 1}. ${ctx.pageName}: ${ctx.title} (${ctx.elementCount} elements)`);
    });
    
    // Save contexts for analysis
    this.saveContexts(contexts, userStory.name);
  }

  private loadUserStory(userStoryPath: string): UserStory {
    const fullPath = path.resolve(userStoryPath);
    return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  }

  private extractActionSteps(userStory: UserStory): ActionStep[] {
    const steps = userStory.userStory;
    const actionSteps: ActionStep[] = [];

    for (const [index, step] of steps.entries()) {
      // Skip DADO and ENTONCES
      if (step.match(/^(DADO|GIVEN|ENTONCES|THEN)/i)) continue;

      const actionStep = this.parseActionStep(step, index);
      if (actionStep) {
        actionSteps.push(actionStep);
      }
    }

    return actionSteps;
  }

  private parseActionStep(step: string, index: number): ActionStep | null {
    const patterns = [
      { regex: /clic|click/i, action: 'click' },
      { regex: /ingreso|escribo|type|fill|enter/i, action: 'type' },
      { regex: /hago clic/i, action: 'click' },
      { regex: /navego|navigate/i, action: 'navigate' }
    ];

    for (const pattern of patterns) {
      if (pattern.regex.test(step)) {
        // Extract target text in quotes
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

  private async executeStep(step: ActionStep, currentSnapshot: McpSnapshot): Promise<boolean> {
    // Find element for this step
    let targetElement = this.findElementForStep(step, currentSnapshot);
    
    if (!targetElement) {
      // Try intelligent navigation - find button that might lead to needed element
      targetElement = this.findNavigationElement(step, currentSnapshot);
      
      if (targetElement) {
        console.log(`🔄 Found navigation element: "${targetElement.text}" [${targetElement.ref}]`);
      } else {
        console.log(`⚠️ No element found for: ${step.description}`);
        console.log(`📋 Available elements:`, 
          currentSnapshot.elements.map(el => `${el.role}:"${el.text}" [${el.ref}]`)
        );
        return false;
      }
    } else {
      console.log(`✅ Found target element: "${targetElement.text}" [${targetElement.ref}]`);
    }

    // Execute action
    try {
      await this.executeAction(step, targetElement);
      console.log(`✅ Action executed successfully`);
      return true;
    } catch (error) {
      console.log(`⚠️ Action failed:`, error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  private findElementForStep(step: ActionStep, snapshot: McpSnapshot): McpElement | null {
    const elements = snapshot.elements;

    // If step has specific target, try to find it
    if (step.target) {
      const exactMatch = elements.find(el =>
        el.text?.toLowerCase().includes(step.target!.toLowerCase()) ||
        el.name?.toLowerCase().includes(step.target!.toLowerCase())
      );
      if (exactMatch) return exactMatch;
    }

    // Find by step context
    if (step.action === 'type') {
      if (step.description.toLowerCase().includes('email')) {
        return elements.find(el => el.role === 'textbox' && 
          (el.text?.toLowerCase().includes('email') || el.name?.toLowerCase().includes('email'))
        ) || null;
      }
      if (step.description.toLowerCase().includes('password')) {
        return elements.find(el => el.role === 'textbox' && 
          (el.text?.toLowerCase().includes('password') || el.name?.toLowerCase().includes('password'))
        ) || null;
      }
      // Any text input
      return elements.find(el => el.role === 'textbox') || null;
    }

    if (step.action === 'click') {
      // Find relevant buttons
      const buttons = elements.filter(el => el.role === 'button' || el.role === 'link');
      
      if (step.description.toLowerCase().includes('siguiente') || step.description.toLowerCase().includes('next')) {
        return buttons.find(b => b.text?.toLowerCase().includes('next') || b.text?.toLowerCase().includes('siguiente')) || null;
      }
      
      if (step.description.toLowerCase().includes('iniciar') || step.description.toLowerCase().includes('sign')) {
        return buttons.find(b => 
          b.text?.toLowerCase().includes('sign') || 
          b.text?.toLowerCase().includes('iniciar') ||
          b.text?.toLowerCase().includes('login')
        ) || null;
      }
      
      if (step.description.toLowerCase().includes('sí') || step.description.toLowerCase().includes('yes')) {
        return buttons.find(b => 
          b.text?.toLowerCase().includes('yes') || 
          b.text?.toLowerCase().includes('sí')
        ) || null;
      }
    }

    return null;
  }

  private findNavigationElement(step: ActionStep, snapshot: McpSnapshot): McpElement | null {
    const elements = snapshot.elements;
    
    // If step needs email/password but page doesn't have inputs, find auth button
    if (step.action === 'type' && (step.description.includes('email') || step.description.includes('password'))) {
      const hasInputs = elements.some(el => el.role === 'textbox');
      
      if (!hasInputs) {
        // Look for authentication/login buttons
        const authButtons = elements.filter(el => {
          if (el.role !== 'button' && el.role !== 'link') return false;
          
          const text = (el.text || '').toLowerCase();
          const authPatterns = [
            'sign in', 'login', 'iniciar', 'ingresar', 'oauth', 'sso',
            'microsoft', 'google', 'facebook', 'continue', 'continuar'
          ];
          
          return authPatterns.some(pattern => text.includes(pattern));
        });
        
        return authButtons[0] || null;
      }
    }
    
    return null;
  }

  private async executeAction(step: ActionStep, element: McpElement): Promise<void> {
    switch (step.action) {
      case 'click':
        await this.mcpClient.click(element.text || 'element', element.ref);
        break;
      case 'type':
        if (step.target) {
          await this.mcpClient.type(element.text || 'element', element.ref, step.target);
        }
        break;
      default:
        throw new Error(`Unsupported action: ${step.action}`);
    }
  }

  private hasNavigationOccurred(before: McpSnapshot, after: McpSnapshot): boolean {
    return before.url !== after.url || 
           before.title !== after.title ||
           Math.abs(before.elements.length - after.elements.length) > 2;
  }

  private createPageContext(snapshot: McpSnapshot, pageName: string): PageContext {
    return {
      pageName,
      url: snapshot.url || 'Unknown',
      title: snapshot.title || 'Unknown',
      timestamp: snapshot.timestamp || new Date().toISOString(),
      elements: snapshot.elements,
      elementCount: snapshot.elements.length,
      yamlSnapshot: snapshot.yaml
    };
  }

  private saveContexts(contexts: PageContext[], userStoryName: string): void {
    const outputDir = 'output';
    const outputFile = path.join(outputDir, `${userStoryName.replace(/\s+/g, '-').toLowerCase()}-contexts.json`);
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    fs.writeFileSync(outputFile, JSON.stringify(contexts, null, 2));
    console.log(`💾 Contexts saved: ${outputFile}`);
  }

  async cleanup(): Promise<void> {
    await this.mcpClient.cleanup();
  }
}