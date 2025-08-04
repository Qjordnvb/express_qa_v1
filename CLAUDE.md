# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Express QA v5 is an AI-powered test automation framework that generates Playwright tests from natural language user stories. The system combines traditional Page Object Model patterns with advanced AI services, real-time DOM analysis via Model Context Protocol (MCP), and machine learning-based test repair.

## Essential Development Commands

### AI Test Generation Workflow
```bash
# Generate complete test from user story (primary workflow)
npm run orchestrate -- orchestrator/user-stories/your-story.testcase.json

# Generate only Page Objects from AI assets
npm run generate:pom -- orchestrator/generated-assets/your-assets.json

# Generate only test specs from AI assets
npm run generate:spec -- orchestrator/generated-assets/your-assets.json path/to/testcase.json

# Start MCP server for real-time DOM analysis
npm run mcp:start
```

### Test Execution
```bash
# Run all tests
npm test

# Run single test file
npx playwright test tests/generated/your-test.spec.ts

# Run with UI mode for debugging
npm run test:ui

# Run in headed mode (visible browser)
npm run test:headed

# Update visual snapshots
npx playwright test --update-snapshots

# Run specific test by name pattern
npx playwright test -g "test name pattern"

# Show test report
npx playwright show-report
```

### Docker Execution
```bash
# Build and run tests (zero local dependencies)
HOST_UID=$(id -u) HOST_GID=$(id -g) docker-compose run --rm tests

# Update snapshots in Docker
HOST_UID=$(id -u) HOST_GID=$(id -g) docker-compose run --rm tests npx playwright test --update-snapshots

# Run specific test in Docker
HOST_UID=$(id -u) HOST_GID=$(id -g) docker-compose run --rm tests npx playwright test tests/generated/your-test.spec.ts
```

### Development & Code Quality
```bash
# Lint code
npm run lint

# Auto-fix linting issues
npm run lint:fix

# Format code with Prettier
npm run format
```

## Architecture Overview

### Core AI Orchestration System (`orchestrator/`)

The orchestrator is the brain of the system, coordinating AI services, real-time DOM analysis, and test generation:

- **Main Orchestrator** (`orchestrator/index.ts`): Central engine that processes user stories through AI pipeline
- **LLM Services** (`orchestrator/llms/`): Pluggable AI providers (Google Gemini, Anthropic Claude, OpenAI)
- **Context Service** (`orchestrator/services/ContextService.ts`): Combines MCP real-time analysis with Playwright inspection
- **Memory Service** (`orchestrator/services/MemoryService.ts`): ChromaDB-based learning system that remembers successful repairs
- **Learning System** (`orchestrator/learning-system.ts`): Machine learning component that improves test generation over time
- **Failure Analyzer** (`orchestrator/failure-analyzer.ts`): Intelligent diagnosis of test failures
- **UI Pattern Detector** (`orchestrator/ui-pattern-detector.ts`): Recognizes common UI patterns for smarter test generation

### Test Generation Pipeline

1. **User Story Input**: JSON files in `orchestrator/user-stories/` define test scenarios
2. **MCP Analysis**: Real-time DOM inspection provides element context to AI
3. **AI Asset Generation**: LLM creates Page Objects and test steps with multiple selector strategies
4. **Code Generation**: Scripts convert AI assets into executable TypeScript/Playwright code
5. **Execution & Learning**: Tests run with intelligent failure analysis and repair

### Enhanced Page Object Model (`pages/`)

- **BasePage** (`pages/BasePage.ts`): Foundation class with intelligent element finding using multiple selector fallbacks
- **Smart Locator Strategy**: Each element has getByRole, CSS, XPath, and other selector types for resilience
- **Generated Pages**: AI-created page objects in `pages/generated/` with context-aware selectors
- **Debug Integration**: Automatic failure debugging with screenshots and DOM snapshots

### Test Structure (`tests/`)

- **Data-Driven Tests**: JSON test data in `tests/data/`
- **Generated Tests**: AI-created specs in `tests/generated/` (currently empty, generated on demand)
- **Manual Tests**: Hand-written tests including visual regression tests
- **Multi-browser Execution**: Chromium, Firefox, WebKit with parallel workers

## Key Configuration Files

### `playwright.config.ts`
- Multi-browser configuration with anti-detection measures (Chromium, Firefox, WebKit)
- Base URL set to `https://admin-dev.membeers.com` (change for your target site)
- Retry strategy: 0 retries locally, 2 retries in CI
- Custom timeout configurations (60s test timeout, 10s expect timeout)
- HTML and JSON reporters for comprehensive test results
- Non-headless mode by default for better debugging and human-like behavior
- Advanced user agent spoofing and bot detection avoidance

### `orchestrator/types/types.ts`
Unified type system defining the AI-to-code contract:
- `AIResponse`: Structure for AI-generated test assets
- `PageObjectDefinition`: Schema for generated Page Objects  
- `LocatorDefinition`: Multi-selector element definitions
- `TestStep`: Individual test action definitions
- `TestAssertion`: Validation patterns (URL, text, multi-option)

## Environment Setup

### Required Environment Variables
```bash
# AI Provider API Keys (set in .env)
GOOGLE_API_KEY="your-google-ai-key"
OPENAI_API_KEY="your-openai-key" 
ANTHROPIC_API_KEY="your-anthropic-key"

# ChromaDB for memory system (local instance expected on port 8001)
# No env var needed - runs locally by default
```

### Docker Requirements
- Docker Engine 20.10.0+ required for containerized execution
- Docker Compose for simplified container management
- No local Node.js installation needed for basic test execution
- Local Node.js 18+ and npm required for AI orchestration (`npm run orchestrate`)
- User ID/Group ID mapping supported for permission handling

## Critical System Components

### MCP (Model Context Protocol) Integration
- Provides real-time DOM analysis during test generation
- Extracts interactive elements, accessibility tree, and visual context
- Runs as background service on port 3333 during orchestration
- Critical for AI to understand actual page structure vs assumptions
- Managed via `McpClientService.ts` and `ContextService.ts`

### Learning & Memory System
- **ChromaDB Integration**: Vector database stores successful test repairs
- **Failure Analysis**: AI diagnoses test failures and suggests fixes
- **Pattern Recognition**: Learns UI patterns across different sites
- **Auto-Repair**: Attempts to fix broken selectors based on learned patterns
- **Persistent Learning**: Knowledge persists across test runs

### Multi-LLM Architecture
The system dynamically selects AI providers based on environment configuration:
- Google Gemini (default if `GOOGLE_API_KEY` set)
- Anthropic Claude (if `ANTHROPIC_API_KEY` set)
- OpenAI GPT (if `OPENAI_API_KEY` set)
- Fallback chain ensures resilience if one provider fails

## Important Development Patterns

### User Story Format
Create JSON files in `orchestrator/user-stories/`:
```json
{
  "name": "Descriptive Test Name",
  "path": "/target/page/path",
  "userStory": "Natural language description of the test scenario including Given-When-Then or simple narrative format"
}
```

### Element Selector Strategy
Generated Page Objects use multiple selector types for maximum resilience:
```typescript
selectors: [
  { "type": "getByRole", "value": "button", "options": { "name": "Submit" } },
  { "type": "css", "value": "#submit-btn" },
  { "type": "xpath", "value": "//button[contains(text(), 'Submit')]" }
]
```

### Debug Information
- Test failures automatically generate debug files in `test-results/debug/`
- Screenshots captured on failures in `test-results/failures/`
- MCP analysis logs provide detailed element context
- Action logs track all Page Object interactions
- JSON test results in `test-results.json` for programmatic analysis

## Troubleshooting Common Issues

### AI Test Generation Failures
- Ensure API keys are properly set in `.env`
- Check that target URL is accessible from your network
- Verify MCP server starts correctly (watch for port 3333 availability)
- Review `orchestrator/generated-assets/*.ai-assets.json` for AI output quality
- Check console logs for specific LLM service errors

### Test Execution Issues
- Most common: Generated selectors don't match actual page elements
- The learning system will attempt auto-repair on subsequent runs
- Check `test-results/debug/` for detailed failure analysis
- Use `npm run test:headed` to visually debug element location
- Review action logs for step-by-step execution details

### MCP Connection Issues
- Ensure port 3333 is available for MCP server
- Check Docker networking if running in containers  
- MCP failures fall back to traditional screenshot analysis
- Verify Playwright MCP package is installed (`@playwright/mcp`)

### Memory System Issues
- ChromaDB expected on localhost:8001 (configure in `MemoryService.ts`)
- Memory failures are non-fatal but reduce learning capability
- Check ChromaDB logs for connection issues
- Ensure ChromaDB Docker container is running if using containerized setup

The system is designed to be resilient - most component failures result in graceful degradation rather than complete failure.