/**
 * IStorageProvider — Interface for Ephemeral Storage Management
 * Under VEXA's browser-centric architecture, rendered video assets reside in browser Blob memory / temp RAM
 * during generation and publishing. Rendered files are discarded immediately post-publishing.
 */
export interface IStorageProvider {
  /**
   * Registers or references an ephemeral video asset Blob URL for streaming/publishing.
   */
  uploadFile(localFilePathOrBlobUrl: string, destinationKey: string): Promise<string>;

  /**
   * Checks if an ephemeral video key exists in browser memory.
   */
  fileExists(destinationKey: string): Promise<boolean>;

  /**
   * Immediately revokes Blob memory URLs post-publishing to ensure ephemeral memory cleanup.
   */
  deleteFile(destinationKey: string): Promise<boolean>;
}
export default IStorageProvider;
