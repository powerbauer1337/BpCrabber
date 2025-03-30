import { DownloadManager } from '../src/utils/download';
import path from 'path';
import { logger } from '../src/utils/logger';

async function testDownloads() {
  const downloadManager = new DownloadManager(path.join(__dirname, '../downloads'));

  try {
    // Test case 1: Download a small test file
    logger.info('Testing small file download...');
    const testFileUrl = 'https://raw.githubusercontent.com/axios/axios/master/README.md';
    const testFileName = 'test.md';

    const filePath = await downloadManager.downloadFile(testFileUrl, testFileName);
    const isValid = await downloadManager.verifyFile(filePath);

    if (isValid) {
      logger.info(`Successfully downloaded and verified ${testFileName}`);
    } else {
      logger.error(`Failed to verify ${testFileName}`);
    }

    // Cleanup after tests
    await downloadManager.cleanupDownloads();
    logger.info('Download tests completed');
  } catch (error) {
    logger.error('Download test failed:', error);
    process.exit(1);
  }
}

testDownloads().catch(console.error);
