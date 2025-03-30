import { DownloadManager } from '../utils/download';
import path from 'path';
import fs from 'fs';
import { beforeAll, afterAll, describe, it, expect } from '@jest/globals';
import type { DownloadProgress, DownloadOptions } from '../utils/download';

describe('DownloadManager', () => {
  let downloadManager: DownloadManager;
  const testDownloadDir = path.join(__dirname, '../../test-downloads');

  beforeAll(() => {
    // Create test download directory
    if (!fs.existsSync(testDownloadDir)) {
      fs.mkdirSync(testDownloadDir, { recursive: true });
    }
    downloadManager = new DownloadManager(testDownloadDir);
  });

  afterAll(() => {
    // Cleanup test directory
    if (fs.existsSync(testDownloadDir)) {
      fs.rmSync(testDownloadDir, { recursive: true, force: true });
    }
  });

  describe('Basic Download Functionality', () => {
    it('should initialize with correct download path', () => {
      expect(downloadManager['downloadPath']).toBe(testDownloadDir);
    });

    it('should download a file successfully', async () => {
      const testUrl = 'https://raw.githubusercontent.com/axios/axios/master/README.md';
      const fileName = 'test-readme.md';

      const filePath = await downloadManager.downloadFile(testUrl, fileName);
      expect(fs.existsSync(filePath)).toBe(true);

      const fileContent = fs.readFileSync(filePath, 'utf-8');
      expect(fileContent).toContain('axios');
    });

    it('should handle download errors gracefully', async () => {
      const invalidUrl = 'https://invalid-url-that-does-not-exist.com/file.txt';
      const fileName = 'error-test.txt';

      await expect(downloadManager.downloadFile(invalidUrl, fileName)).rejects.toThrow();
    });
  });

  describe('File Verification', () => {
    it('should verify downloaded file integrity', async () => {
      const testUrl = 'https://raw.githubusercontent.com/axios/axios/master/LICENSE';
      const fileName = 'test-license.txt';

      const filePath = await downloadManager.downloadFile(testUrl, fileName);
      const isValid = await downloadManager.verifyFile(filePath);

      expect(isValid).toBe(true);
    });

    it('should detect corrupted files', async () => {
      const corruptedFilePath = path.join(testDownloadDir, 'corrupted.txt');
      // Create an empty file, which should fail verification
      fs.writeFileSync(corruptedFilePath, '');

      const isValid = await downloadManager.verifyFile(corruptedFilePath);
      expect(isValid).toBe(false);
    });
  });

  describe('Download Progress', () => {
    it('should track download progress', async () => {
      const progressUpdates: DownloadProgress[] = [];
      const testUrl = 'https://raw.githubusercontent.com/axios/axios/master/CHANGELOG.md';
      const fileName = 'test-changelog.md';

      const options: DownloadOptions = {
        onProgress: (progress: DownloadProgress) => {
          progressUpdates.push(progress);
        },
      };

      await downloadManager.downloadFile(testUrl, fileName, options);

      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates[progressUpdates.length - 1].percentage).toBe(100);
    });
  });

  describe('Concurrent Downloads', () => {
    it('should handle multiple downloads simultaneously', async () => {
      const downloads = [
        {
          url: 'https://raw.githubusercontent.com/axios/axios/master/README.md',
          name: 'readme1.md',
        },
        {
          url: 'https://raw.githubusercontent.com/axios/axios/master/LICENSE',
          name: 'license1.txt',
        },
        {
          url: 'https://raw.githubusercontent.com/axios/axios/master/CHANGELOG.md',
          name: 'changelog1.md',
        },
      ];

      const results = await Promise.all(
        downloads.map(({ url, name }) => downloadManager.downloadFile(url, name))
      );

      results.forEach(filePath => {
        expect(fs.existsSync(filePath)).toBe(true);
      });
    });
  });

  describe('Cleanup', () => {
    it('should clean up temporary files', async () => {
      const testUrl = 'https://raw.githubusercontent.com/axios/axios/master/README.md';
      const fileName = 'cleanup-test.md';

      const filePath = await downloadManager.downloadFile(testUrl, fileName);
      expect(fs.existsSync(filePath)).toBe(true);

      await downloadManager.cleanupDownloads();
      expect(fs.existsSync(filePath)).toBe(false);
    });
  });
});
