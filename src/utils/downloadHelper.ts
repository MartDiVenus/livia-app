/**
 * Robust file downloader utility for modern web apps running in browsers,
 * progressive web apps (PWA), and iframe environments (such as AI Studio).
 *
 * Ensures:
 * 1. Safe asynchronous DOM cleanup so the browser download manager is not aborted.
 * 2. Proper fallback to dispatching simulated MouseEvent.
 * 3. Timely revocation of blob object URLs to avoid memory leaks.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.style.display = 'none';
  document.body.appendChild(link);

  try {
    link.click();
  } catch (err) {
    const clickEvent = new MouseEvent('click', {
      view: window,
      bubbles: true,
      cancelable: true,
    });
    link.dispatchEvent(clickEvent);
  }

  // Defer removal from DOM so the browser's download manager can process the request
  setTimeout(() => {
    try {
      if (link.parentNode) {
        link.parentNode.removeChild(link);
      }
    } catch (e) {
      // Ignore cleanup error
    }
  }, 2000);

  // Defer revoking the object URL
  setTimeout(() => {
    try {
      URL.revokeObjectURL(url);
    } catch (e) {
      // Ignore cleanup error
    }
  }, 60000);
}
