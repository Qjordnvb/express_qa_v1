// example.ts - Demo of Express QA Hybrid in action
// 🚀 This file demonstrates how the hybrid system combines Express QA's AI with Claude Code's stability

import { HybridOrchestrator } from './core/claude-code-integration/HybridOrchestrator';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 🎯 DEMO: Express QA Hybrid in Action
 * 
 * This example shows how the hybrid system:
 * 1. Uses Claude Code's stable MCP infrastructure
 * 2. Leverages Express QA's advanced AI capabilities
 * 3. Generates resilient tests with auto-repair
 * 4. Learns from failures for continuous improvement
 */
async function demoHybridSystem() {
  console.log('🚀 EXPRESS QA HYBRID DEMO');
  console.log('=' .repeat(50));
  
  // Initialize hybrid orchestrator
  const orchestrator = new HybridOrchestrator();
  
  try {
    // Create a sample user story for demonstration
    const sampleUserStory = createSampleUserStory();
    console.log(`📖 Created sample user story: ${sampleUserStory.name}`);
    
    // 🎬 Generate AI-powered test with stable infrastructure
    console.log('\n🎬 GENERATING AI-POWERED TEST...');
    const result = await orchestrator.generateTest(sampleUserStory.path);
    
    if (result.success) {
      console.log('\n✅ SUCCESS: Test generated and executed!');
      console.log(`📁 Generated files: ${result.generatedFiles?.join(', ')}`);
      
      // Show what Express QA's AI learned
      if (result.aiAssets) {
        console.log(`🧠 AI generated ${result.aiAssets.pageObject.locators.length} smart locators`);
        console.log(`🎯 Test has ${result.aiAssets.testSteps?.length} intelligent steps`);
      }
      
    } else {
      console.log('\n⚠️ Test had issues, but the AI learned from them:');
      
      if (result.analysis) {
        console.log(`🔍 Failure type: ${result.analysis.failureType}`);
        console.log(`🧠 AI diagnosis: ${result.analysis.aiDiagnosis?.rootCause || 'Analyzing...'}`);
        console.log(`🔧 Suggested fixes: ${result.analysis.suggestedFixes.length} options`);
      }
      
      console.log('📚 This failure data will improve future test generation!');
    }
    
    // Demonstrate learning capabilities
    await demonstrateLearningCapabilities();
    
  } catch (error) {
    console.error('❌ Demo failed:', error);
  } finally {
    await orchestrator.cleanup();
    console.log('\n🧹 Demo cleanup completed');
  }
}

/**
 * 📚 Demonstrate Express QA's learning capabilities
 */
async function demonstrateLearningCapabilities() {
  console.log('\n📚 LEARNING SYSTEM DEMONSTRATION');
  console.log('-'.repeat(40));
  
  // Check what the AI has learned so far
  const knowledgeBasePath = 'data/knowledge-base';
  
  try {
    const intelligentPatterns = JSON.parse(
      fs.readFileSync(path.join(knowledgeBasePath, 'intelligent-patterns.json'), 'utf8')
    );
    
    console.log(`🧠 AI has learned ${Object.keys(intelligentPatterns).length} intelligent patterns`);
    
    const learningReport = JSON.parse(
      fs.readFileSync(path.join(knowledgeBasePath, 'learning-report.json'), 'utf8')
    );
    
    console.log(`📊 Success rate improvements: ${JSON.stringify(learningReport.improvements || {}, null, 2)}`);
    
  } catch (error) {
    console.log('🆕 Fresh system - no learning data yet (this is normal for first run)');
  }
  
  console.log('\n🎯 Key Learning Features:');
  console.log('  ✅ Remembers successful selector patterns');
  console.log('  ✅ Learns from failed repairs');
  console.log('  ✅ Adapts to different websites');
  console.log('  ✅ Improves over time with each test');
}

/**
 * 📝 Create a sample user story for demonstration
 */
function createSampleUserStory(): any {
  const userStory = {
    name: "Google Search Demo",
    path: "/",
    userStory: [
      "GIVEN I am on the Google homepage",
      "WHEN I search for 'Express QA Hybrid'", 
      "THEN I should see search results containing 'Express QA'"
    ]
  };
  
  // Save to file system
  const userStoryPath = 'test-generation/user-stories/google-search-demo.testcase.json';
  
  // Ensure directory exists
  fs.mkdirSync(path.dirname(userStoryPath), { recursive: true });
  
  // Write user story file
  fs.writeFileSync(userStoryPath, JSON.stringify(userStory, null, 2));
  
  return {
    ...userStory,
    path: userStoryPath
  };
}

/**
 * 🔧 Configuration demo
 */
function showConfiguration() {
  console.log('\n🔧 HYBRID CONFIGURATION');
  console.log('-'.repeat(30));
  
  console.log('📁 Project Structure:');
  console.log('  ├── core/');
  console.log('  │   ├── intelligent-learning/    # 🧠 Express QA AI');
  console.log('  │   ├── llm-services/           # 🤖 Multi-LLM support');
  console.log('  │   └── claude-code-integration/ # 💎 Stable MCP');
  console.log('  ├── test-generation/            # 🧪 AI-generated tests');
  console.log('  └── config/                     # ⚙️ Simplified config');
  
  console.log('\n⚙️ Key Benefits:');
  console.log('  ✅ Express QA intelligence + Claude Code stability');
  console.log('  ✅ No manual MCP server management');
  console.log('  ✅ Proven headless browser configuration');
  console.log('  ✅ Enterprise-grade reliability');
  console.log('  ✅ Cloud-ready SaaS architecture');
}

/**
 * 🌐 Show cloud deployment potential
 */
function showCloudPotential() {
  console.log('\n🌐 CLOUD DEPLOYMENT READY');
  console.log('-'.repeat(35));
  
  console.log('🏗️ Architecture:');
  console.log('  Frontend (React) → API Gateway → Serverless Functions');
  console.log('  → Containerized Playwright → AI Analysis → Results');
  
  console.log('\n💰 SaaS Model:');
  console.log('  📊 Pay-per-test execution');
  console.log('  🔄 Auto-scaling instances'); 
  console.log('  🌍 Global deployment');
  console.log('  👥 Team collaboration');
  console.log('  📈 Analytics & insights');
}

// 🚀 Run the demo
if (require.main === module) {
  console.log('🎯 Starting Express QA Hybrid Demo...\n');
  
  showConfiguration();
  showCloudPotential();
  
  demoHybridSystem()
    .then(() => {
      console.log('\n🎉 Demo completed successfully!');
      console.log('\nNext steps:');
      console.log('  1. Run: npm install');
      console.log('  2. Configure .env with your AI API keys');
      console.log('  3. Run: npm run orchestrate -- test-generation/user-stories/your-story.json');
      console.log('  4. Watch the AI generate and execute intelligent tests!');
    })
    .catch((error) => {
      console.error('\n❌ Demo failed:', error);
      console.log('\nThis is normal for the first run - the system needs:');
      console.log('  - npm install');
      console.log('  - API keys in .env file');
      console.log('  - Playwright browsers installed');
    });
}

export { demoHybridSystem };