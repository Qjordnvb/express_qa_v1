# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `npm run start` - Start the hybrid orchestrator using start-hybrid.ts
- `npm run orchestrate` - Run the main hybrid orchestration system
- `npm run dev` - Start API server for development

### Testing
- `npm test` - Run Playwright tests
- `npm run test:headed` - Run tests with visible browser
- `npm run test:ui` - Run tests with Playwright UI
- `npm run test:basic` - Run basic functionality tests
- `npm run test:mcp` - Test MCP integration
- `npm run test:real-mcp` - Test real MCP integration

### Code Generation
- `npm run generate:pom` - Generate Page Object Model files
- `npm run generate:spec` - Generate test specification files

### Code Quality
- `npm run build` - Compile TypeScript
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Auto-fix ESLint issues
- `npm run format` - Format code with Prettier

## Architecture Overview

This is an AI-powered test automation framework that combines Express QA's intelligent learning capabilities with Claude Code's stable MCP integration. The system uses multiple LLM providers (Google Gemini, Anthropic Claude, OpenAI) for intelligent test generation and auto-repair.

### Core Components

**HybridOrchestrator** (`core/claude-code-integration/HybridOrchestrator.ts`): Main orchestration engine that combines Express QA's AI learning system with Claude Code's stable MCP infrastructure.

**Intelligent Learning System** (`core/intelligent-learning/`):
- `learning-system.ts` - AI-powered learning from test failures
- `failure-analyzer.ts` - Analyzes test failures and suggests fixes
- `MemoryService.ts` - Vector memory using ChromaDB for pattern recognition
- `ui-pattern-detector.ts` - Detects UI patterns for reliable selectors

**MCP Integration** (`core/mcp-playwright-engine/`):
- `McpPlaywrightServer.ts` - Real browser automation server
- `BrowserAutomation.ts` - Browser control and interaction
- `DomAnalysisEngine.ts` - DOM analysis and element detection
- `ScreenshotCapture.ts` - Visual testing capabilities

**Multi-LLM Services** (`core/llm-services/`):
- Support for Google Gemini, Anthropic Claude, and OpenAI
- Intelligent provider switching based on context

### Key Features

1. **AI-Powered Test Generation**: Automatically generates Page Object Models and test specifications from user stories
2. **Intelligent Auto-Repair**: When tests fail, the system analyzes failures and attempts automatic repairs using learned patterns
3. **Vector Memory**: ChromaDB-powered learning system that remembers successful repair strategies
4. **Multi-Strategy Selector Generation**: Creates resilient selectors with multiple fallback approaches
5. **Real Browser Automation**: Uses Playwright for actual browser interactions, not simulation

### TypeScript Configuration

The project uses path aliases defined in tsconfig.json:
- `@core/*` → `core/*`
- `@test-generation/*` → `test-generation/*`
- `@config/*` → `config/*`
- `@api/*` → `api/*`
- `@tools/*` → `tools/*`

### Test Structure

- `tests/generated/` - AI-generated test files
- `user-stories/` - Input user stories in JSON format
- `pages/` - Page Object Model files
- `test-results/` - Test execution results and failure analysis

### Environment Variables

The system requires API keys for LLM providers:
- `GOOGLE_API_KEY` - For Google Gemini
- `ANTHROPIC_API_KEY` - For Anthropic Claude  
- `OPENAI_API_KEY` - For OpenAI
- `BASE_URL` - Target application URL for testing