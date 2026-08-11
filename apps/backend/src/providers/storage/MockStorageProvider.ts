import { IStorageProvider } from '../interfaces/IStorageProvider.js';
import { logger } from '../../utils/logger.js';

/**
 * MockStorageProvider — [MOCKED / SIMULATED]
 * Simulates uploading completed video assets to an S3-compatible cloud storage bucket.
 */
export class MockStorageProvider implements IStorageProvider {
  private uploadedKeys = new Set<string>();

  async uploadFile(localFilePath: string, destinationKey: string): Promise<string> {
    logger.info({ localFilePath, destinationKey }, '[MOCKED / SIMULATED] uploadFile invoked');
    this.uploadedKeys.add(destinationKey);

    // Return a simulated cloud S3 URL
    return `https://s3.vexa.ai/buckets/content/${destinationKey}`;
  }

  async fileExists(destinationKey: string): Promise<boolean> {
    return this.uploadedKeys.has(destinationKey);
  }

  async deleteFile(destinationKey: string): Promise<boolean> {
    return this.uploadedKeys.delete(destinationKey);
  }
}
export default MockStorageProvider;
