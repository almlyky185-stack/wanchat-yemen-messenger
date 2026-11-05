import { File } from 'expo-file-system';
import type { ImagePickerAsset } from 'expo-image-picker';
import { Platform } from 'react-native';
import { MEDIA_BUCKET, supabase } from '@/lib/supabase';

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);

export async function uploadImage(userId: string, asset: ImagePickerAsset, folder: 'avatars' | 'statuses') {
  const contentType = asset.mimeType ?? 'image/jpeg';
  const size = asset.fileSize ?? asset.file?.size ?? 0;
  if (!ALLOWED_TYPES.has(contentType)) throw new Error('Choose a JPEG, PNG, WebP, HEIC, or HEIF image.');
  if (size > MAX_IMAGE_BYTES) throw new Error('Images must be 8 MB or smaller.');

  const extension = asset.fileName?.split('.').pop()?.toLowerCase();
  const safeExtension = extension && /^[a-z0-9]{2,5}$/.test(extension)
    ? extension
    : contentType.split('/')[1] === 'jpeg' ? 'jpg' : contentType.split('/')[1];
  const path = `${userId}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${safeExtension}`;
  const fileData = Platform.OS === 'web'
    ? asset.file
    : await new File(asset.uri).arrayBuffer();
  if (!fileData) throw new Error('The selected photo could not be read. Choose it again.');

  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, fileData, {
    cacheControl: '31536000',
    contentType,
    upsert: false,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);
  return { publicUrl: data.publicUrl, path };
}
