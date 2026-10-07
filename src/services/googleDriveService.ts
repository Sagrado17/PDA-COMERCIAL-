import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../firebase';

// In-memory token cache (never stored in localStorage or sessionStorage as required by security guidelines)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

// Clear cached token if user logs out
onAuthStateChanged(auth, (user) => {
  if (!user) {
    cachedAccessToken = null;
  }
});

const DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.readonly'
];

/**
 * Returns GoogleAuthProvider configured with Google Drive scopes
 */
function getGoogleDriveProvider(): GoogleAuthProvider {
  const provider = new GoogleAuthProvider();
  DRIVE_SCOPES.forEach(scope => provider.addScope(scope));
  provider.setCustomParameters({
    prompt: 'select_account'
  });
  return provider;
}

/**
 * Sign in with Google requesting Google Drive access
 */
export async function signInWithGoogleDrive(): Promise<{ user: User; accessToken: string }> {
  try {
    isSigningIn = true;
    const provider = getGoogleDriveProvider();
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    
    if (!credential?.accessToken) {
      throw new Error('Não foi possível obter o token de acesso do Google.');
    }
    
    cachedAccessToken = credential.accessToken;
    return {
      user: result.user,
      accessToken: cachedAccessToken
    };
  } catch (error: any) {
    console.error('Erro na autenticação do Google Drive:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
}

/**
 * Get current in-memory access token or null
 */
export function getDriveAccessToken(): string | null {
  return cachedAccessToken;
}

/**
 * Set or refresh in-memory access token
 */
export function setDriveAccessToken(token: string | null) {
  cachedAccessToken = token;
}

/**
 * Get the direct public image URL for an uploaded Google Drive image
 */
export function getDriveDirectImageUrl(fileId: string): string {
  // lh3.googleusercontent.com/d/FILE_ID is the official, fast Google CDN direct image URL for public Drive files
  return `https://lh3.googleusercontent.com/d/${fileId}`;
}

/**
 * Find or create a specific folder in Google Drive (e.g. 'PDA Comercial - Produtos')
 */
export async function getOrCreateFolder(
  accessToken: string, 
  folderName: string = 'PDA Comercial - Fotos de Produtos'
): Promise<string> {
  try {
    // 1. Search for existing folder
    const query = encodeURIComponent(`name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)&spaces=drive`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );

    if (!searchRes.ok) {
      const err = await searchRes.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Falha ao buscar pastas no Google Drive');
    }

    const data = await searchRes.json();
    if (data.files && data.files.length > 0) {
      return data.files[0].id;
    }

    // 2. Folder does not exist, create it
    const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        description: 'Pasta oficial para fotos de produtos da PDA Comercial'
      })
    });

    if (!createRes.ok) {
      const err = await createRes.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Falha ao criar pasta no Google Drive');
    }

    const createdFolder = await createRes.json();
    return createdFolder.id;
  } catch (error) {
    console.error('Erro em getOrCreateFolder:', error);
    throw error;
  }
}

/**
 * Sets public read permission on a Google Drive file so customers can see it
 */
export async function makeFilePublic(accessToken: string, fileId: string): Promise<void> {
  try {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        role: 'reader',
        type: 'anyone'
      })
    });

    if (!res.ok) {
      console.warn('Aviso: Não foi possível definir permissão pública imediatamente (pode já estar pública).');
    }
  } catch (err) {
    console.warn('Erro ao configurar permissões do arquivo no Drive:', err);
  }
}

export interface DriveUploadedFile {
  fileId: string;
  name: string;
  directUrl: string;
  thumbnailUrl?: string;
}

/**
 * Upload an image file directly to a Google Drive folder and make it public
 */
export async function uploadImageToDrive(
  file: File,
  accessToken: string,
  folderId?: string
): Promise<DriveUploadedFile> {
  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadata: any = {
    name: file.name,
    mimeType: file.type || 'image/jpeg'
  };

  if (folderId) {
    metadata.parents = [folderId];
  }

  const metadataPart = delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata);

  // Convert File to ArrayBuffer
  const fileArrayBuffer = await file.arrayBuffer();

  // Create multipart payload
  const preBuffer = new TextEncoder().encode(metadataPart + delimiter + `Content-Type: ${file.type || 'image/jpeg'}\r\n\r\n`);
  const postBuffer = new TextEncoder().encode(closeDelimiter);

  const fullPayload = new Uint8Array(preBuffer.byteLength + fileArrayBuffer.byteLength + postBuffer.byteLength);
  fullPayload.set(preBuffer, 0);
  fullPayload.set(new Uint8Array(fileArrayBuffer), preBuffer.byteLength);
  fullPayload.set(postBuffer, preBuffer.byteLength + fileArrayBuffer.byteLength);

  const uploadRes = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,thumbnailLink,webContentLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body: fullPayload
    }
  );

  if (!uploadRes.ok) {
    const errData = await uploadRes.json().catch(() => ({}));
    throw new Error(errData.error?.message || 'Falha ao fazer upload da imagem no Google Drive.');
  }

  const uploaded = await uploadRes.json();
  const fileId = uploaded.id;

  // Make public so store visitors can view it
  await makeFilePublic(accessToken, fileId);

  const directUrl = getDriveDirectImageUrl(fileId);

  return {
    fileId,
    name: uploaded.name,
    directUrl,
    thumbnailUrl: uploaded.thumbnailLink || directUrl
  };
}

export interface DriveExistingFile {
  id: string;
  name: string;
  thumbnailLink?: string;
  createdTime?: string;
  directUrl: string;
}

/**
 * List existing images in a folder or recent Drive images
 */
export async function listDriveImages(
  accessToken: string,
  folderId?: string
): Promise<DriveExistingFile[]> {
  let query = "mimeType contains 'image/' and trashed = false";
  if (folderId) {
    query = `'${folderId}' in parents and ${query}`;
  }

  const encodedQuery = encodeURIComponent(query);
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodedQuery}&fields=files(id,name,mimeType,thumbnailLink,createdTime)&orderBy=createdTime desc&pageSize=40`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Falha ao buscar imagens do Google Drive.');
  }

  const data = await res.json();
  const files: any[] = data.files || [];

  return files.map(f => ({
    id: f.id,
    name: f.name,
    thumbnailLink: f.thumbnailLink,
    createdTime: f.createdTime,
    directUrl: getDriveDirectImageUrl(f.id)
  }));
}
