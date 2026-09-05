/**
 * Utility to copy text to the OS clipboard (Debian, Android, macOS, Windows).
 * Designed to be pure, asynchronous, and non-intrusive (no DOM focus stealing).
 * This ensures compatibility with Gboard/mobile environments and Vim modes.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;
  
  try {
    if (navigator.clipboard && window.isSecureContext) {
      // Modern asynchronous clipboard API (No DOM focus required)
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers or non-secure contexts
      // Creates a temporary, invisible textarea that doesn't trigger mobile keyboards
      const textArea = document.createElement("textarea");
      textArea.value = text;
      // Make it completely invisible and non-interactive to prevent Gboard popping up
      textArea.style.position = "fixed";
      textArea.style.top = "-999999px";
      textArea.style.left = "-999999px";
      textArea.style.opacity = "0";
      textArea.setAttribute('readonly', ''); // Crucial: prevents keyboard from appearing on mobile
      
      document.body.appendChild(textArea);
      textArea.select();
      
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    }
  } catch (err) {
    console.error('Failed to copy to clipboard:', err);
    return false;
  }
}
