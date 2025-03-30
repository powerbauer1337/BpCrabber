import fs from 'fs';
import path from 'path';

async function globalSetup() {
  // Create test output directories if they don't exist
  const outputDir = path.join(process.cwd(), 'test-results');
  const dirs = [
    outputDir,
    path.join(outputDir, 'screenshots'),
    path.join(outputDir, 'videos'),
    path.join(outputDir, 'traces'),
    path.join(process.cwd(), 'tests/__snapshots__'),
  ];

  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

export default globalSetup;
