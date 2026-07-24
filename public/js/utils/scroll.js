/**
 * Scroll utilities.
 */
export function scrollToBottom(smooth = true) {
  const container = document.getElementById('messages');
  if (!container) return;
  requestAnimationFrame(() => {
    container.scrollTo({ top: container.scrollHeight, behavior: smooth ? 'smooth' : 'instant' });
  });
}

export function isNearBottom(container, threshold = 100) {
  if (!container) return false;
  return container.scrollHeight - container.scrollTop - container.clientHeight <= threshold;
}
