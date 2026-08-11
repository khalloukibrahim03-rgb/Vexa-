export interface IStorageProvider {
  /**
   * Uploads a local file to cloud object storage and returns the public file URL.
   */
  uploadFile(localFilePath: string, destinationKey: string): Promise<string>;

  /**
   * Checks if a file exists in the storage bucket.
   */
  fileExists(destinationKey: string): Promise<boolean>;

  /**
   * Deletes a file from the storage bucket.
   */
  deleteFile(destinationKey: string): Promise<boolean>;
}
