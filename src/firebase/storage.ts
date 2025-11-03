'use client';

import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { initializeFirebase } from '.';

const { storage } = initializeFirebase();

/**
 * Uploads a media file (Blob) to Firebase Storage.
 * @param file The Blob object to upload (e.g., from a file input or canvas).
 * @param path The path in Firebase Storage where the file should be stored (e.g., 'images/my-image.jpg').
 * @returns A promise that resolves with the public download URL of the uploaded file.
 */
export const uploadMedia = async (file: Blob, path: string): Promise<string> => {
  if (!file) {
    throw new Error('No file provided for upload.');
  }

  const storageRef = ref(storage, path);

  try {
    const snapshot = await uploadBytes(storageRef, file);
    console.log('Uploaded a blob or file!', snapshot);
    
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error) {
    console.error("Upload failed:", error);
    // Re-throw the error to be handled by the caller
    throw error;
  }
};
