import { StorageAdapter } from './types';
import { MemoryStorageAdapter } from './memoryAdapter';

let storageInstance: StorageAdapter | null = null;

export function getStorage(): StorageAdapter {
  if (!storageInstance) {
    // Optional Firestore Adapter can be checked here via process.env.FIREBASE_PROJECT_ID
    storageInstance = new MemoryStorageAdapter();
  }
  return storageInstance;
}

export * from './types';
export * from './seedData';
