import * as FileSystem from 'expo-file-system';
import { Episode, DownloadState } from '../types';

export class DownloadService {
  private static downloadsDir = `${FileSystem.documentDirectory}downloads/`;

  static async initialize() {
    // Create downloads directory if it doesn't exist
    const dirInfo = await FileSystem.getInfoAsync(this.downloadsDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(this.downloadsDir, { intermediates: true });
    }
  }

  static async downloadEpisode(
    episode: Episode,
    onProgress: (progress: number) => void
  ): Promise<string> {
    await this.initialize();

    const fileUri = `${this.downloadsDir}${episode.id}.mp3`;

    try {
      const downloadResumable = FileSystem.createDownloadResumable(
        episode.audioUrl,
        fileUri,
        {},
        (downloadProgress) => {
          const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
          onProgress(progress);
        }
      );

      const result = await downloadResumable.downloadAsync();

      if (!result) {
        throw new Error('Download failed');
      }

      return result.uri;
    } catch (error) {
      // Clean up partial download
      await this.deleteEpisode(episode.id);
      throw error;
    }
  }

  static async deleteEpisode(episodeId: string): Promise<void> {
    const fileUri = `${this.downloadsDir}${episodeId}.mp3`;

    try {
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(fileUri);
      }
    } catch (error) {
      console.error('Failed to delete episode:', error);
    }
  }

  static async getLocalUri(episodeId: string): Promise<string | null> {
    const fileUri = `${this.downloadsDir}${episodeId}.mp3`;

    try {
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      return fileInfo.exists ? fileUri : null;
    } catch (error) {
      return null;
    }
  }

  static async getDownloadedSize(episodeId: string): Promise<number> {
    const fileUri = `${this.downloadsDir}${episodeId}.mp3`;

    try {
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      return fileInfo.exists ? (fileInfo.size || 0) : 0;
    } catch (error) {
      return 0;
    }
  }

  static async getAllDownloads(): Promise<string[]> {
    await this.initialize();

    try {
      const files = await FileSystem.readDirectoryAsync(this.downloadsDir);
      return files.map((file) => file.replace('.mp3', ''));
    } catch (error) {
      console.error('Failed to read downloads directory:', error);
      return [];
    }
  }

  static async clearAllDownloads(): Promise<void> {
    await this.initialize();

    try {
      await FileSystem.deleteAsync(this.downloadsDir, { idempotent: true });
      await FileSystem.makeDirectoryAsync(this.downloadsDir, { intermediates: true });
    } catch (error) {
      console.error('Failed to clear downloads:', error);
    }
  }
}
