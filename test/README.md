# 🚀 Express QA Hybrid

## AI-Powered Test Automation with Rock-Solid MCP Integration

Express QA Hybrid combines the **advanced AI capabilities** of Express QA v1 with the **stable MCP infrastructure** of Claude Code, creating the most robust and intelligent test automation framework available.

## 🎯 Key Features

### 🧠 Advanced AI Capabilities (from Express QA)
- ✅ **Multi-LLM Support**: Google Gemini, Anthropic Claude, OpenAI
- ✅ **Intelligent Learning System**: 4 discovery strategies for auto-repair
- ✅ **Vector Memory**: ChromaDB-powered learning from past successes
- ✅ **Dynamic Selector Generation**: Resilient multi-fallback approach
- ✅ **Smart Failure Analysis**: AI-powered root cause analysis

### 💎 Stable Infrastructure (from Claude Code)
- ✅ **Rock-Solid MCP Configuration**: No manual server management
- ✅ **Native Tool Integration**: Direct `mcp__playwright__*` tools
- ✅ **Headless Reliability**: No black screen issues, CI/CD ready
- ✅ **Automatic Process Management**: Zero configuration complexity
- ✅ **Production Ready**: Enterprise-grade stability

## 📂 Project Structure

```
express_qa_hybrid/
├── core/                           # 🧠 AI & Intelligence Layer
│   ├── intelligent-learning/       # Learning system & auto-repair
│   │   ├── IntelligentMCPLearner.ts
│   │   ├── LearningSystem.ts
│   │   ├── FailureAnalyzer.ts
│   │   └── MemoryService.ts
│   ├── llm-services/              # Multi-LLM integration
│   │   ├── GoogleGeminiService.ts
│   │   ├── AnthropicClaudeService.ts
│   │   ├── OpenAIService.ts
│   │   └── ILlmService.ts
│   ├── claude-code-integration/   # Stable MCP integration
│   │   ├── StableMcpService.ts
│   │   ├── NativeToolsAdapter.ts
│   │   └── HybridOrchestrator.ts
│   └── types/                     # Type definitions
├── test-generation/               # 🧪 Test Generation Pipeline
│   ├── ai-assets/                # AI-generated test assets
│   ├── page-objects/             # Smart Page Object Model
│   ├── generated-tests/          # Auto-generated test files
│   └── user-stories/             # Input user stories
├── config/                       # ⚙️ Configuration
│   ├── playwright.config.ts      # Simplified Playwright config
│   └── environment.ts            # Environment management
├── data/                         # 📊 Knowledge & Learning
│   └── knowledge-base/           # Learned patterns & repairs
├── tools/                        # 🛠️ Code Generation Tools
│   ├── generate-pom.ts
│   └── generate-spec.ts
├── api/                          # 🌐 SaaS API (Future)
│   ├── routes/
│   ├── middleware/
│   └── websockets/
└── frontend/                     # 💻 Web Interface (Future)
    ├── components/
    ├── pages/
    └── hooks/
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Claude Code CLI installed

### Installation
```bash
# Clone or navigate to the hybrid project
cd express_qa_hybrid

# Install dependencies
npm install

# Initialize Playwright browsers
npx playwright install

# Verify Claude Code MCP integration
claude --version
```

### Configuration
1. **Claude Code Integration**: The `.claude.json` file is pre-configured for stable MCP
2. **Environment Variables**: Copy `.env.example` to `.env` and configure:
   ```bash
   # AI Provider API Keys
   GOOGLE_API_KEY=your_gemini_key
   ANTHROPIC_API_KEY=your_claude_key
   OPENAI_API_KEY=your_openai_key

   # Target Application
   BASE_URL=https://your-target-app.com
   ```

### Generate Your First AI Test
```bash
# Create a user story JSON file
# Example: test-generation/user-stories/login-test.json

# Generate complete test with AI
npm run orchestrate -- user-stories/smartcomms-login.testcase.json

# Run the generated test
npm test
```

## 🧠 How It Works

### 1. **Stable MCP Foundation**
Uses Claude Code's proven MCP configuration for reliable browser automation:
```json
"playwright": {
  "type": "stdio",
  "command": "npx",
  "args": ["@playwright/mcp@latest", "--headless", "--browser", "chromium"]
}
```

### 2. **AI-Powered Generation**
Express QA's advanced AI analyzes your user stories and generates:
- Smart Page Objects with multiple selector strategies
- Resilient test scripts with auto-repair capabilities
- Learning patterns for continuous improvement

### 3. **Intelligent Auto-Repair**
When tests fail, the AI system:
- Analyzes failure context with real-time DOM data
- Searches learned patterns for similar past failures
- Generates new selectors based on current page state
- Applies fixes and learns from the results

## 📊 Migration from Express QA v1

This hybrid version maintains **100% compatibility** with Express QA v1 assets while adding:

- ✅ **Stable MCP Integration**: No more manual server management
- ✅ **Simplified Configuration**: One `.claude.json` file vs multiple env vars
- ✅ **Enhanced Reliability**: Headless mode that actually works
- ✅ **Cloud Ready**: SaaS deployment capabilities

### Migrating Existing Tests
```bash
# Your existing AI assets work without changes
npm run generate:pom -- path/to/existing/assets.json
npm run generate:spec -- path/to/existing/assets.json path/to/testcase.json
```

## 🌐 Cloud Deployment (Future)

Express QA Hybrid is designed for cloud-native deployment:

- **Serverless Architecture**: Auto-scaling test execution
- **Container Ready**: Docker/Kubernetes deployment
- **API First**: RESTful API for integration
- **Real-time Updates**: WebSocket status notifications

## 🤝 Contributing

This project combines the best innovations from Express QA v1 with the proven stability of Claude Code. Contributions welcome!

## 📈 Roadmap

- [x] **Phase 1**: Stable MCP integration
- [x] **Phase 2**: AI system migration
- [ ] **Phase 3**: Cloud API development
- [ ] **Phase 4**: Web interface
- [ ] **Phase 5**: SaaS launch

---

**Express QA Hybrid**: Where AI intelligence meets rock-solid reliability! 🚀
