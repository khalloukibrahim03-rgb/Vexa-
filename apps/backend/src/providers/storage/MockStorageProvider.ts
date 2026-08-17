import { IStorageProvider } from '../interfaces/IStorageProvider.js';
import { logger } from '../../utils/logger.js';

/**
 * MockStorageProvider — [MOCKED / SIMULATED Ephemeral Storage]
 * Tracks in-memory ephemeral Blob URLs. Automatically discarded post-publishing.
 */
export class MockStorageProvider implements IStorageProvider {
  private activeBlobKeys = new Set<string>();

  async uploadFile(localFilePathOrBlobUrl: string, destinationKey: string): Promise<string> {
    logger.info({ localFilePathOrBlobUrl, destinationKey }, '[Ephemeral Storage] Registering in-memory Blob key');
    this.activeBlobKeys.add(destinationKey);
    return `blob:vexa-ephemeral-memory/${destinationKey}`;
  }

  async fileExists(destinationKey: string): Promise<boolean> {
    return this.activeBlobKeys.has(destinationKey);
  }

  async deleteFile(destinationKey: string): Promise<boolean> {
    logger.info({ destinationKey }, '[Ephemeral Storage] Discarding in-memory Blob post-publishing');
    return this.activeBlobKeys.delete(destinationKey);
  }
}
export default MockStorageProvider;
