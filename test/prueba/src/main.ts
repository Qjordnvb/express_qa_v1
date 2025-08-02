// Main execution file
import { UserStoryExecutor } from './UserStoryExecutor';

async function main() {
  const userStoryPath = process.argv[2];
  
  if (!userStoryPath) {
    console.log('Usage: npm run execute -- <user-story-path>');
    console.log('Example: npm run execute -- user-stories/test-login.json');
    process.exit(1);
  }

  const executor = new UserStoryExecutor();
  
  try {
    console.log('🎬 Initializing MCP...');
    await executor.initialize();
    
    console.log('🚀 Executing user story...');
    await executor.executeUserStory(userStoryPath);
    
  } catch (error) {
    console.error('❌ Execution failed:', error);
  } finally {
    await executor.cleanup();
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down...');
  process.exit(0);
});

main().catch(console.error);