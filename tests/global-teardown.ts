import fs from 'fs';
import path from 'path';

async function globalTeardown() {
  if (!process.env.CI && process.env.CLEAN_TEST_ARTIFACTS) {
    // Clean up test artifacts in development if flag is set
    const outputDir = path.join(process.cwd(), 'test-results');
    if (fs.existsSync(outputDir)) {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  }
}

export default globalTeardown;
