export async function fetchRemoteMarkdown(url: string): Promise<string> {
  try {
    // We use allorigins as a proxy to bypass CORS issues for raw URLs (like GitHub, Pastebin, etc.)
    const proxyUrl = `/api/fetch-url?url=${encodeURIComponent(url)}`;
    
    const response = await fetch(proxyUrl);
    if (!response.ok) {
      throw new Error(`Errore HTTP: ${response.status}`);
    }
    
    return await response.text();
  } catch (error: any) {
    throw new Error(`Impossibile scaricare il file: ${error.message}`);
  }
}
