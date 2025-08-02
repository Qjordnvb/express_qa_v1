// Standard browser configuration for MCP
export interface BrowserConfig {
  browser: string;
  headless: boolean;
  fallbacks: string[];
  autoDetect: boolean;
  timeout: number;
}

export const BROWSER_CONFIG: BrowserConfig = {
  browser: process.env.MCP_BROWSER || 'firefox', // Default to firefox since chromium has issues
  headless: process.env.MCP_HEADLESS !== 'false',
  fallbacks: ['firefox', 'chromium', 'webkit'],
  autoDetect: true,
  timeout: 60000
};

export const MCP_LAUNCH_ARGS = [
  '@playwright/mcp@latest',
  '--headless',
  '--browser',
  BROWSER_CONFIG.browser
];

console.log(`🌐 Browser config: ${BROWSER_CONFIG.browser} (headless: ${BROWSER_CONFIG.headless})`);