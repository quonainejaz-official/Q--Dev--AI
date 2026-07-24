/**
 * Clipboard utilities.
 */
import { bus } from '../events/EventBus.js';

export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    bus.emit('ui:toast', { message: 'Copied to clipboard', type: 'success' });
    return true;
  } catch {
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;top:-9999px';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    bus.emit('ui:toast', { message: 'Copied to clipboard', type: 'success' });
    return true;
  }
}
