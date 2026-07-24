/**
 * MediaService — file uploads and image generation.
 */
import { store } from '../store/Store.js';
import { AuthService } from './AuthService.js';

export const MediaService = {
  async uploadImage(file) {
    const sigRes = await fetch('/api/media/signed-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...AuthService.headers() },
      body: JSON.stringify({ filename: file.name, folder: 'chat-images' }),
    });
    if (!sigRes.ok) throw new Error('Failed to get upload signature');
    const { signature, timestamp, folder, cloudName, apiKey } = await sigRes.json();
    const fd = new FormData();
    fd.append('file', file);
    fd.append('api_key', apiKey);
    fd.append('timestamp', timestamp);
    fd.append('signature', signature);
    fd.append('folder', folder);
    const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
      method: 'POST', body: fd,
    });
    if (!uploadRes.ok) throw new Error('Upload failed');
    const { secure_url, public_id, width, height } = await uploadRes.json();
    return { url: secure_url, publicId: public_id, width, height, name: file.name };
  },

  async generateImage(prompt) {
    store.dispatch('SET_IMAGE_GEN_LOADING', true);
    try {
      const res = await fetch('/api/chat/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      if (!res.ok) throw new Error('Image generation failed');
      return await res.json();
    } finally {
      store.dispatch('SET_IMAGE_GEN_LOADING', false);
    }
  },
};
